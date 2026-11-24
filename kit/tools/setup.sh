#!/usr/bin/env bash
# Creates a new short project:  bash tools/setup.sh <project_dir> [blok|card]
#   blok (default): blocky 3D cast + island/village world on a plain canvas engine. Offline, no downloads.
#   card          : the original 2D bean-head cards in a three.js world (fetches three.js r160 + toon.ts once).
# Needs: node >= 22.6, python 3 + numpy + Pillow, ffmpeg + ffprobe. Rendering uses Playwright if installed,
# otherwise an installed Edge/Chrome over the DevTools protocol. Works in Linux/macOS bash and Git Bash on Windows.
set -e
KIT="$(cd "$(dirname "$0")/.." && pwd)"; P="${1:?usage: setup.sh <project_dir> [blok|card]}"; STYLE="${2:-blok}"
case "$STYLE" in blok|card) ;; *) echo "style must be blok or card"; exit 1 ;; esac
mkdir -p "$P/web" "$P/work" "$P/stills" "$P/out"; P="$(cd "$P" && pwd)"
TMPD="${TMPDIR:-/tmp}"

# --- requirements (warn, don't stop: the user may install them after) ---
command -v node >/dev/null || { echo "MISSING: node >= 22.6"; exit 1; }
node -e "const [a,b]=process.versions.node.split('.').map(Number); process.exit(a>22||(a===22&&b>=6)?0:1)" || { echo "MISSING: node >= 22.6 (have $(node -v))"; exit 1; }
for t in ffmpeg ffprobe; do command -v $t >/dev/null || echo "WARNING: $t not found (needed for timing, audio and the final encode)"; done
PY=python3; command -v python3 >/dev/null && python3 -c "" 2>/dev/null || PY=python
$PY -c "import numpy, PIL" 2>/dev/null || echo "WARNING: python numpy/Pillow missing ($PY -m pip install numpy pillow)"

# --- tools + audio starting point ---
cp "$KIT"/tools/*.mjs "$KIT"/tools/*.py "$KIT"/tools/finish.sh "$P/"
cp "$KIT"/example/soldier/audio.py "$P/audio.py"            # synth starting point: rewrite the cue table

if [ "$STYLE" = blok ]; then
  cp "$KIT"/engine-blok/*.js "$KIT"/engine-blok/index.html "$KIT"/engine/motion.js "$P/web/"
  cp "$KIT"/example/pulau/story.js "$P/web/story.js"        # starting point: rewrite for the new story
else
  command -v git >/dev/null || echo "WARNING: git not found (needed once to fetch toon.ts)"
  mkdir -p "$P/web/lib"
  cp "$KIT"/engine/*.js "$KIT"/engine/index.html "$P/web/"
  cp "$KIT"/example/soldier/story.js "$P/web/story.js"
  # three.js r160 (module build). npm first, then a sparse git clone (works where only GitHub is reachable)
  if [ ! -f "$P/web/lib/three.module.js" ]; then
    ( cd "$TMPD" && rm -rf _three && mkdir _three && cd _three && npm pack three@0.160.0 >/dev/null 2>&1 && tar xzf three-0.160.0.tgz && cp package/build/three.module.js "$P/web/lib/" ) \
    || ( cd "$TMPD" && rm -rf _t3 && git clone -q --depth 1 --filter=blob:none --sparse --branch r160 https://github.com/mrdoob/three.js _t3 && cd _t3 && git sparse-checkout set build && cp build/three.module.js "$P/web/lib/" )
  fi
  [ -s "$P/web/lib/three.module.js" ] || { echo "FAILED: could not get three.js r160"; exit 1; }
  # toon base: the Pen / head / face library from mromidev/claude-animated-shorts (MIT), cached in kit/vendor
  if [ ! -f "$KIT/vendor/toon.ts" ]; then
    mkdir -p "$KIT/vendor"; rm -rf "$TMPD/_cas"
    git clone -q --depth 1 https://github.com/mromidev/claude-animated-shorts "$TMPD/_cas"
    cp "$TMPD/_cas/templates/bridge/toon.ts" "$KIT/vendor/toon.ts"
  fi
  # paths go in as argv (Git Bash converts /c/... to C:/... for argv, not inside -e code)
  node -e "const m=require('node:module'),fs=require('fs');fs.writeFileSync(process.argv[2],m.stripTypeScriptTypes(fs.readFileSync(process.argv[1],'utf8'),{mode:'transform'}))" \
    "$KIT/vendor/toon.ts" "$P/web/toonbase.js"
  [ -s "$P/web/toonbase.js" ] || { echo "FAILED: toonbase.js is empty"; exit 1; }
  cat "$P/web/toonbase.js" "$P/web/roman.js" > "$P/web/toon.js"
fi

# --- renderer check: Playwright is optional ---
if ( cd "$P" && node -e "import('playwright').then(()=>process.exit(0),()=>process.exit(1))" ) 2>/dev/null; then
  echo "renderer: playwright"
else
  echo "renderer: no Playwright -> render.mjs will drive an installed Edge/Chrome (set BROWSER=<path> if it is not found)"
fi
echo "ready: $P  (style: $STYLE)"
[ "$STYLE" = card ] && echo "after editing cast code run: cat web/toonbase.js web/roman.js > web/toon.js"
echo "python command on this machine: $PY"
