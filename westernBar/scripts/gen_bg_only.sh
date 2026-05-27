#!/bin/bash
# 只生背景（提前出爐，不用等所有 sprite）
set -u
cd "$(dirname "$0")/.."

OUT="public/assets/lcd_color/background.png"
LOG="scripts/gen_bg_only.log"
mkdir -p "$(dirname "$OUT")"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

log "▶ background"
PROMPT="Generate a 1536x1024 PNG with image_gen.

A 45-degree top-down view of an empty old west saloon interior, Pixar 3D chibi cartoon style. Strict vertical layout from top to bottom:
- Y 0-22%: Cream wooden plank back wall. On the wall: a wooden shelf holding a few whiskey bottles, a wooden WANTED poster with stylized old-time text and small portrait sketch, a SALOON wooden signboard with curly gold ornament, a brass oil lamp.
- Y 22-32%: Visible wooden floor strip (the bartender walkway) between the back shelf wall and the bar counter.
- Y 32-50%: Long horizontal polished dark walnut wooden bar counter top, viewed from above as a flat oval-rectangle running left to right across the screen.
- Y 50-58%: The vertical front panel of the bar counter, dark wood with small decorative trim.
- Y 58-100%: Large open area of pine wood plank floor, all planks running parallel from near to far, receding to a vanishing point on the right.
- Left side: an arched opening in the wall showing bright sky and a distant small mountain town visible through it (no swing door panels, just the opening).

No characters, no chairs in the open floor, no items on the bar, no swing door panels. Just the empty room interior, ready for sprites to be placed on top.

Pixar 3D cartoon style, soft global illumination, warm afternoon lighting, saturated colors, smooth surfaces. 1536x1024 PNG. Save to /Users/batman_work/claude/apps/westernBar/$OUT and confirm 1536x1024 with sips."

echo "$PROMPT" | codex exec --skip-git-repo-check >>"$LOG" 2>&1

if [ -f "$OUT" ]; then
  log "✓ done"
  sips -g pixelWidth -g pixelHeight "$OUT" 2>/dev/null | grep pixel | tee -a "$LOG"
else
  log "✗ failed"
fi
