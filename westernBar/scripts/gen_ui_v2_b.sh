#!/bin/bash
set -u
cd "$(dirname "$0")/.."
OUT="public/assets/clean_v2"
LOG="scripts/gen_ui_v2.log"
mkdir -p "$OUT"

gen() {
  local name="$1"
  local size="$2"
  local prompt_body="$3"
  local out_path="$OUT/$name.png"
  if [ -f "$out_path" ]; then echo "[skip] $name"; return; fi
  echo "[$(date +%H:%M:%S)] ▶ $name"
  local full="Generate a ${size} PNG with image_gen.

${prompt_body}

PNG ${size}. Save to /Users/batman_work/claude/apps/westernBar/${out_path}"
  echo "$full" | codex exec --skip-git-repo-check >>"$LOG" 2>&1
  if [ -f "$out_path" ]; then
    echo "[$(date +%H:%M:%S)] ✓ $name"
  else
    echo "[$(date +%H:%M:%S)] ✗ $name"
  fi
}

gen "btn_right" "1024x1024" \
"A square Western saloon UI button on transparent background. Dark walnut wood, brass corner studs, embossed golden arrow pointing RIGHT centered. Pixar 3D cartoon style. Transparent PNG."

gen "btn_fire" "1024x1024" \
"A round Western FIRE button on transparent background. Glossy red enamel surface with brass ring border, central engraving of a chibi revolver pointing up and 'FIRE' text below in bold western typography. Pixar 3D cartoon style. Transparent PNG circular button."

gen "loading_bg_pc" "1536x1024" \
"Cinematic Western saloon panorama background. Warm wood plank wall, brass oil lamps on both sides, small wanted poster centered on wall, dust particles floating in golden afternoon light. Pixar 3D cartoon style. Lower 30% darker/blurred for loading bar overlay. No characters, no text. Wide landscape composition."

gen "loading_bg_mobile" "1024x1536" \
"Vertical Western saloon background for portrait mobile screen. Upper half: warm wood plank wall with small wanted poster and hanging brass lantern. Middle: empty wood area. Lower third: wooden plank floor receding. Pixar 3D cartoon style. Soft warm amber light, dust motes. No characters, no text. Portrait composition 2:3."

gen "wanted_poster" "1024x768" \
"Weathered Western WANTED poster on transparent background, parchment paper with torn distressed edges, two metal tacks pinning corners. Top text 'WANTED' in bold western blackletter. Center: circular brown frame containing a chibi cartoon outlaw face (mustache, eyepatch, bandana, smirk) in Pixar 3D style. Middle small text 'DEAD OR ALIVE'. Bottom bold text '\$10,000'. Tan/sepia color palette. Transparent PNG."

echo "==== all done ===="
