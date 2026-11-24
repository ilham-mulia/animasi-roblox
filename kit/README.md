# cartoon-short-kit
Audio in, finished vertical cartoon short out, with a synthesized music bed and SFX.

Two looks:
- **blok** (default): original blocky 3D characters in an inked island/village world, drawn by a plain canvas engine
  (`engine-blok/`: blok.js cast + meshes + decals, world.js sky/sea/islands/props, render.js renderer, main.js driver).
  Offline, no three.js, no GPU. Example story: `example/pulau/story.js`. `bash tools/setup.sh <dir>`.
- **card**: 2D bean-head cards in an inked, painted three.js world (the original engine, below). `bash tools/setup.sh <dir> card`.
  Guide: `engine/GAYA-CARD.md`.

`tools/render.mjs` uses Playwright when installed, otherwise an installed Edge/Chrome over the DevTools protocol.

- `engine/` renderer: world helpers, cards, ink pass, lens blur, grade (`main.js`), painted textures (`paint.js`),
  cast drawing (`roman.js` on top of the Pen library from mromidev/claude-animated-shorts, fetched by setup),
  motion helpers (`motion.js`).
- `example/soldier/` the worked example "The Soldier Who Never Left" (story.js shot plan + audio.py cue table).
- `tools/` setup.sh (new project), timing.py (word timings, `--lang en|id`), render.mjs (frames), sheet.py (contact sheets),
  mix.py (music + SFX locked at 50 % of the voice), finish.sh (linear loudness gain + limiter, encode, QA).
- Audio flow: `audio.py` writes stems (music.wav, sfx.wav) -> `mix.py` writes mix_raw.wav -> `finish.sh`.

Quick start: `bash tools/setup.sh ~/shorts/my-short && cd ~/shorts/my-short && python3 timing.py voice.mp3 script.txt --out work`
(on Windows/Git Bash use `python` instead of `python3`). Needs internet the first time: three.js r160 and toon.ts are fetched.
Built on github.com/mromidev/claude-animated-shorts (MIT): toon.ts, look values and readability rules.
