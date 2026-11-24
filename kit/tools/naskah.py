#!/usr/bin/env python3
"""Expression tags in a narration script -> versions for recording + a quick check.

Usage:  python naskah.py script.txt [--lang id|en]

Tag syntax (square brackets, anywhere between words):
  [kaget]          narrator delivery + face of the shot's main character
  [Kakek: kaget]   face of that character only (left out of the voice version)
Prints: the master script (with tags), the ElevenLabs v3 version (English audio tags; v3 reads them as delivery,
other models would SAY them), the clean version (no tags, for other TTS models / reading), word count and length estimate.
timing.py uses the same table to turn tags into timed expression cues (work/cues.json, web/cues.js).
"""
import re, sys

# tag (lowercase) -> (engine face expression or None for voice-only, ElevenLabs v3 audio tag)
TAGS = {
    'senang': ('happy', 'happy'), 'gembira': ('happy', 'happy'), 'tersenyum': ('happy', 'smiling'), 'antusias': ('happy', 'excited'),
    'tertawa': ('laugh', 'laughs'), 'ketawa': ('laugh', 'laughs'), 'terkekeh': ('laugh', 'chuckles'),
    'kaget': ('surprised', 'surprised'), 'terkejut': ('surprised', 'surprised'), 'heran': ('surprised', 'curious'), 'takjub': ('surprised', 'amazed'),
    'marah': ('angry', 'angry'), 'kesal': ('angry', 'annoyed'), 'geram': ('angry', 'frustrated'),
    'sedih': ('sad', 'sad'), 'menangis': ('sad', 'crying'), 'kecewa': ('sad', 'disappointed'),
    'ngotot': ('stubborn', 'determined'), 'keras kepala': ('stubborn', 'stubborn'), 'yakin': ('stubborn', 'confident'),
    'ngantuk': ('sleep', 'sleepy'), 'tidur': ('sleep', 'sleepy'),
    'datar': ('neutral', 'calm'), 'tenang': ('neutral', 'calm'), 'serius': ('neutral', 'serious'),
    'bicara': ('talk', None),
    # voice only: the face stays as it is
    'berbisik': (None, 'whispers'), 'misterius': (None, 'mysterious'), 'tegang': (None, 'nervous'),
    'menghela napas': (None, 'sighs'), 'sarkastis': (None, 'sarcastic'), 'dramatis': (None, 'dramatic'),
}
EN = {v: (e, v) for e, v in TAGS.values() if v}  # English v3 tags may be written directly too
TAG_RE = re.compile(r"\[([^\[\]]+)\]")
RATE = {'en': 3.7, 'id': 2.4}


def lookup(tag):
    t = tag.strip().lower()
    if t in TAGS: return TAGS[t]
    if t in EN: return EN[t]
    return None


def parse_tags(text):
    """-> (clean text, tags). tags: [{i: index of the next word in the clean text, who, tag, expr, voice, known}]"""
    parts = re.split(r"(\[[^\[\]]+\])", text)
    clean, tags, n = [], [], 0
    for p in parts:
        m = TAG_RE.fullmatch(p.strip()) if p.strip().startswith('[') else None
        if m:
            body, who = m.group(1).strip(), None
            if ':' in body: who, body = [x.strip() for x in body.split(':', 1)]
            hit = lookup(body)
            tags.append({'i': n, 'who': who.lower() if who else None, 'tag': body.lower(),
                         'expr': hit[0] if hit else None, 'voice': hit[1] if hit else body.lower(), 'known': bool(hit)})
        else:
            clean.append(p); n += len(p.split())
    return re.sub(r"\s+", " ", " ".join(clean)).strip(), tags


def versions(text):
    """master text -> (v3 text, clean text). Character-targeted tags stay out of the voice version."""
    def v3(m):
        body = m.group(1).strip()
        if ':' in body: return ''
        hit = lookup(body)
        return f"[{hit[1]}]" if hit and hit[1] else ('' if hit else f"[{body}]")
    tidy = lambda s: re.sub(r"[ \t]+", " ", re.sub(r" +([,.!?;:])", r"\1", s)).strip()
    return tidy(TAG_RE.sub(v3, text)), tidy(TAG_RE.sub('', text))


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    lang = sys.argv[sys.argv.index('--lang') + 1] if '--lang' in sys.argv else 'id'
    if lang in args: args.remove(lang)
    if not args: print(__doc__); sys.exit(1)
    src = open(args[0], encoding='utf-8-sig').read().strip()
    clean, tags = parse_tags(src)
    v3, plain = versions(src)
    words = len(clean.split())
    print('== Naskah bertag (master) ==\n' + src + '\n')
    print('== Versi ElevenLabs v3 (tag suara; hanya untuk model v3) ==\n' + v3 + '\n')
    print('== Versi bersih (tanpa tag; model lain / dibaca sendiri) ==\n' + plain + '\n')
    faces = sum(1 for t in tags if t['expr'])
    print(f"kata: {words}   perkiraan durasi: {words / RATE.get(lang, 2.4):.1f} dtk ({lang})   tag: {len(tags)} (mengubah wajah: {faces})")
    for t in tags:
        if not t['known']: print(f"peringatan: tag [{t['tag']}] tidak ada di tabel -> hanya jadi arahan suara, wajah tidak berubah")
    if words and len(tags) > max(2, words // 6): print('peringatan: tag terlalu rapat; pakai 1 tag per kalimat atau lebih jarang')
