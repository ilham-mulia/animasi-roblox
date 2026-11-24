#!/usr/bin/env python3
"""Word timings for a voiceover -> words.json + phrases.json.

Usage:
  python timing.py voice.mp3 [script.txt] [--out work] [--lang en|id] [--no-asr]

1. If faster-whisper or openai-whisper is importable (and --no-asr is not set), transcribe with
   word timestamps. Model: base.en for --lang en, small (multilingual) for other languages.
2. Otherwise needs the script text: detects speech segments by silence (ffmpeg silencedetect),
   splits the script into phrases at punctuation, and aligns phrases to segments with a DP that
   matches phrase length (syllables) to segment duration. Words inside a phrase are spread by syllables.
Always eyeball phrases.json against the audio waveform; hand-fix if a phrase landed in the wrong gap.
The script file is read as UTF-8 (curly quotes are fine, also on Windows).
"""
import argparse, functools, json, os, re, subprocess, sys

LANG = "en"


def syll(w):
    w = re.sub(r"[^a-z0-9]", "", w.lower())
    if not w: return 1
    if w.isdigit(): return 2 if LANG == "en" else 3
    if LANG == "en":
        n = len(re.findall(r"[aeiouy]+", w))
        if w.endswith("e") and n > 1 and not w.endswith("le"): n -= 1   # silent final e (English only)
    else:  # Indonesian/Malay and most phonetic spellings: y is a consonant; vowel pairs are two
        n = 0  # syllables ("di-a", "bu-ah") except the diphthongs ai/au/oi/ei ("pu-lau", "pa-kai")
        for g in re.findall(r"[aeiou]+", w):
            n += 1 + sum(1 for i in range(len(g) - 1) if g[i:i + 2] not in ("ai", "au", "oi", "ei"))
    return max(1, n)


def duration(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                                capture_output=True, text=True).stdout)


def speech_segments(path, db=-35, mind=0.12):
    err = subprocess.run(["ffmpeg", "-i", path, "-af", f"silencedetect=n={db}dB:d={mind}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", err)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    D = duration(path); segs = []; cur = 0.0
    for s, e in zip(starts, ends + [D] * (len(starts) - len(ends))):
        if s - cur > 0.08: segs.append([cur, s])
        cur = e
    if D - cur > 0.08: segs.append([cur, D])
    return segs, D


def whisper_words(path):
    model = "base.en" if LANG == "en" else "small"
    lang = None if LANG == "en" else LANG
    try:
        from faster_whisper import WhisperModel
        m = WhisperModel(model, compute_type="int8")
        segs, _ = m.transcribe(path, word_timestamps=True, language=lang)
        return [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for s in segs for w in s.words]
    except Exception:
        pass
    try:
        import whisper
        r = whisper.load_model(model).transcribe(path, word_timestamps=True, language=lang)
        return [{"w": w["word"].strip(), "s": round(w["start"], 3), "e": round(w["end"], 3)} for s in r["segments"] for w in s["words"]]
    except Exception:
        return None


def align(script, segs):
    # phrases: split after , . ; : ! ? and closing quotes
    raw = re.findall(r"[^,.;:!?]+[,.;:!?\"”']*", script.replace("\n", " "))
    phrases = [p.strip() for p in raw if p.strip()]
    P, S = len(phrases), len(segs)
    syl = [sum(syll(w) for w in p.split()) for p in phrases]
    tot_syl = sum(syl); tot_dur = sum(e - s for s, e in segs); rate = tot_syl / tot_dur
    INF = 1e9
    sys.setrecursionlimit(max(10000, 4 * (P + S) + 100))

    # dp over (phrase i, segment j): segment j holds phrases [i..k); a phrase may also span several segments (merge)
    @functools.lru_cache(None)
    def best(i, j):
        if i == P and j == S: return (0.0, ())
        if i == P or j == S: return (INF, ())
        out = (INF, ())
        for k in range(i + 1, min(P, i + 4) + 1):          # 1-3 phrases into one segment
            for l in range(j + 1, min(S, j + 3) + 1):      # or one group across 1-2 segments
                if k - i > 1 and l - j > 1: continue
                d = segs[l - 1][1] - segs[j][0]; s_ = sum(syl[i:k]) / rate
                cost = (d - s_) ** 2 / max(d, 0.3)
                # a sentence end inside a segment is unlikely (speakers pause there); a long gap inside one phrase too
                cost += sum(0.35 for m in range(i, k - 1) if re.search(r"[.!?][\"”']?$", phrases[m]))
                cost += sum(1.5 * (segs[m + 1][0] - segs[m][1]) for m in range(j, l - 1))
                sub = best(k, l)
                if sub[0] + cost < out[0]: out = (sub[0] + cost, ((i, k, j, l),) + sub[1])
        return out

    cost, plan = best(0, 0)
    words, phr = [], []
    for i, k, j, l in plan:
        a, b = segs[j][0], segs[l - 1][1]
        text = " ".join(phrases[i:k]); ws = text.split(); sy = [syll(w) for w in ws]; T = sum(sy); t = a
        phr.append({"text": text, "s": round(a, 3), "e": round(b, 3)})
        for w, s_ in zip(ws, sy):
            d = (b - a) * s_ / T; words.append({"w": w, "s": round(t, 3), "e": round(t + d, 3)}); t += d
    return words, phr, cost


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio")
    ap.add_argument("script", nargs="?", help="path to the script text (UTF-8), or the text itself")
    ap.add_argument("--out", default=".")
    ap.add_argument("--lang", default="en", help="narration language: en (default), id, ...")
    ap.add_argument("--no-asr", action="store_true", help="skip whisper even if installed; align the script instead")
    a = ap.parse_args()
    LANG = a.lang.lower()
    os.makedirs(a.out, exist_ok=True)
    script = None
    if a.script:
        script = open(a.script, encoding="utf-8-sig").read() if os.path.exists(a.script) else a.script

    words = None if a.no_asr else whisper_words(a.audio)
    segs, D = speech_segments(a.audio)
    if words:
        phr = []; cur = []
        for w in words:
            cur.append(w)
            if re.search(r"[,.;:!?]$", w["w"]): phr.append({"text": " ".join(x["w"] for x in cur), "s": cur[0]["s"], "e": cur[-1]["e"]}); cur = []
        if cur: phr.append({"text": " ".join(x["w"] for x in cur), "s": cur[0]["s"], "e": cur[-1]["e"]})
        src = f"whisper ({LANG})"
    elif script:
        words, phr, cost = align(script, segs); src = f"silence-align {LANG} (cost {cost:.2f})"
    else:
        print("NO_ASR: no whisper available and no script given. Ask the user for the script text (or install faster-whisper)."); sys.exit(2)
    with open(os.path.join(a.out, "words.json"), "w", encoding="utf-8") as fh:
        json.dump(words, fh, indent=1, ensure_ascii=False)
    with open(os.path.join(a.out, "phrases.json"), "w", encoding="utf-8") as fh:
        json.dump({"duration": D, "frames30": int(round(D * 30)), "source": src, "segments": segs, "phrases": phr}, fh, indent=1, ensure_ascii=False)
    print(f"source={src} duration={D:.2f}s frames={int(round(D*30))}")
    for p in phr: print(f"{p['s']:6.2f}-{p['e']:6.2f}  f{int(p['s']*30):4d}-{int(p['e']*30):4d}  {p['text']}")
