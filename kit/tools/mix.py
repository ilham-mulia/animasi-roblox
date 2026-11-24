#!/usr/bin/env python3
"""Lock music + SFX to the voice level, then sum -> mix_raw.wav (mono, 48 kHz, 16-bit).

Usage:
  python mix.py voice.mp3 music.wav sfx.wav [--out mix_raw.wav] [--music-level 0.5] [--sfx-level 0.5] [--sfx-peak 0.7]

Rules (from the cartoon-audio-short skill):
- Level = gated RMS: RMS over 50 ms windows, keeping only windows within 30 dB of the loudest
  window and above -60 dBFS, so the pauses between sentences don't count.
- music gain -> gated RMS(music) = 0.5 x gated RMS(voice)   (-6.02 dB)
- sfx gain   -> gated RMS(sfx) <= 0.5 x voice AND peak(sfx) <= 0.7 x peak(voice)
- The voice is never edited or re-timed. No ducking, no compression.
- If the sum would clip, ONE linear gain goes on the whole mix (the ratios stay the same).
  Loudness to -14 LUFS + the peak limiter happen later in finish.sh.
Reads .wav directly (PCM 16/24/32-bit or float32); other formats (mp3, m4a...) go through ffmpeg.
The output is exactly as long as the voice; music/SFX are padded or trimmed to it.
"""
import argparse, struct, subprocess, sys, wave
import numpy as np

SR = 48000


def read_wav(path):
    """Minimal RIFF reader: PCM int16/24/32 and IEEE float32. Returns (mono float32, rate)."""
    with open(path, "rb") as fh:
        data = fh.read()
    if data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise ValueError("not a RIFF/WAVE file")
    pos, fmt, raw = 12, None, None
    while pos + 8 <= len(data):
        cid, size = data[pos:pos + 4], struct.unpack("<I", data[pos + 4:pos + 8])[0]
        body = data[pos + 8:pos + 8 + size]
        if cid == b"fmt ":
            tag, ch, rate, _, _, bits = struct.unpack("<HHIIHH", body[:16])
            if tag == 0xFFFE and len(body) >= 26:  # WAVE_FORMAT_EXTENSIBLE: real tag in the sub-format GUID
                tag = struct.unpack("<H", body[24:26])[0]
            fmt = (tag, ch, rate, bits)
        elif cid == b"data":
            raw = body
        pos += 8 + size + (size & 1)
    if fmt is None or raw is None:
        raise ValueError("missing fmt or data chunk")
    tag, ch, rate, bits = fmt
    if tag == 3 and bits == 32:
        x = np.frombuffer(raw[: len(raw) // 4 * 4], "<f4").astype(np.float32)
    elif tag == 1 and bits == 16:
        x = np.frombuffer(raw[: len(raw) // 2 * 2], "<i2").astype(np.float32) / 32768
    elif tag == 1 and bits == 24:
        b = np.frombuffer(raw[: len(raw) // 3 * 3], np.uint8).reshape(-1, 3).astype(np.int32)
        v = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
        x = (np.where(v >= 1 << 23, v - (1 << 24), v) / float(1 << 23)).astype(np.float32)
    elif tag == 1 and bits == 32:
        x = (np.frombuffer(raw[: len(raw) // 4 * 4], "<i4") / 2147483648.0).astype(np.float32)
    else:
        raise ValueError(f"unsupported wav format tag={tag} bits={bits}")
    x = x[: len(x) // ch * ch].reshape(-1, ch).mean(axis=1)
    return x.astype(np.float32), rate


def load(path):
    if path.lower().endswith(".wav"):
        try:
            x, rate = read_wav(path)
            if rate == SR:
                return x
        except Exception as e:  # fall through to ffmpeg
            print(f"note: {path}: {e}; trying ffmpeg", file=sys.stderr)
    try:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                             capture_output=True, check=True).stdout
        return np.frombuffer(raw, np.float32).copy()
    except FileNotFoundError:
        if path.lower().endswith(".wav"):  # no ffmpeg: resample the wav ourselves (linear, fine for a bed)
            x, rate = read_wav(path)
            n = int(round(len(x) * SR / rate))
            return np.interp(np.arange(n) * rate / SR, np.arange(len(x)), x).astype(np.float32)
        sys.exit(f"ffmpeg not found: needed to read {path}")


def gated_rms(x, win=0.05, rel_db=30.0, abs_db=-60.0):
    n = int(win * SR)
    m = len(x) // n
    if m == 0:
        return float(np.sqrt(np.mean(np.square(x)))) if len(x) else 0.0
    r = np.sqrt(np.mean(np.square(x[: m * n].reshape(m, n).astype(np.float64)), axis=1) + 1e-20)
    db = 20 * np.log10(r)
    keep = (db > db.max() - rel_db) & (db > abs_db)
    return float(np.sqrt(np.mean(np.square(r[keep])))) if keep.any() else 0.0


def fit(x, n):
    return x[:n] if len(x) >= n else np.pad(x, (0, n - len(x)))


def db(r):
    return 20 * np.log10(max(r, 1e-12))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("voice"); ap.add_argument("music"); ap.add_argument("sfx")
    ap.add_argument("--out", default="mix_raw.wav")
    ap.add_argument("--music-level", dest="music_level", type=float, default=0.5, help="music gated RMS / voice gated RMS (default 0.5 = -6 dB)")
    ap.add_argument("--sfx-level", dest="sfx_level", type=float, default=0.5, help="max SFX gated RMS / voice gated RMS (default 0.5)")
    ap.add_argument("--sfx-peak", dest="sfx_peak", type=float, default=0.7, help="max SFX peak / voice peak (default 0.7)")
    a = ap.parse_args()

    v = load(a.voice)
    N = len(v)
    mu, fx = fit(load(a.music), N), fit(load(a.sfx), N)

    rv, pv = gated_rms(v), float(np.abs(v).max())
    if rv <= 0:
        sys.exit("voice looks silent")
    rm, rs, ps = gated_rms(mu), gated_rms(fx), float(np.abs(fx).max())

    gm = a.music_level * rv / rm if rm > 0 else 0.0
    gs = a.sfx_level * rv / rs if rs > 0 else 0.0
    if ps * gs > a.sfx_peak * pv:
        gs = a.sfx_peak * pv / ps

    mix = v.astype(np.float64) + mu * gm + fx * gs
    peak = float(np.abs(mix).max())
    g_all = min(1.0, 0.98 / peak) if peak > 0 else 1.0
    mix *= g_all

    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    with wave.open(a.out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

    print(f"voice  gated RMS {db(rv):7.2f} dBFS   peak {db(pv):6.2f} dBFS   length {N / SR:.2f} s")
    print(f"music  vs voice  {db(gm * rm / rv) if rm > 0 else float('-inf'):7.2f} dB  (target {db(a.music_level):.2f})")
    print(f"sfx    vs voice  {db(gs * rs / rv) if rs > 0 else float('-inf'):7.2f} dB  (max {db(a.sfx_level):.2f})   "
          f"sfx peak / voice peak {gs * ps / pv:.2f} (max {a.sfx_peak})")
    print(f"mix gain {db(g_all):.2f} dB (one linear gain, ratios unchanged) -> {a.out}")
    if rm <= 0: print("WARNING: music stem is silent")
    if rs <= 0: print("WARNING: sfx stem is silent")


if __name__ == "__main__":
    main()
