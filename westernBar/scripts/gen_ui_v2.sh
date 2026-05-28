#!/bin/bash
# 重新生 Loading bg + mobile UI 按鈕 + Wanted Poster
# 風格：與遊戲內 3D chibi 卡通 saloon 場景一致（暖木紋、黃銅、復古海報）

set -u
cd "$(dirname "$0")/.."

OUT="public/assets/clean_v2"
LOG="scripts/gen_ui_v2.log"
mkdir -p "$OUT"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

gen() {
  local name="$1"
  local size="$2"
  local prompt="$3"
  local out_path="$OUT/$name.png"
  if [ -f "$out_path" ]; then log "skip $name (exists)"; return; fi
  log "▶ $name ($size)"
  local full_prompt="Generate a ${size} PNG with image_gen.

${prompt}

3D Pixar/chibi cartoon style, warm western saloon aesthetic, polished smooth surfaces, soft volumetric lighting. ${size} PNG. Save to /Users/batman_work/claude/apps/westernBar/${out_path} and confirm size with sips."
  echo "$full_prompt" | codex exec --skip-git-repo-check >>"$LOG" 2>&1
  if [ -f "$out_path" ]; then
    log "✓ $name done"
  else
    log "✗ $name failed"
  fi
}

# ============================================================
# 1. PC Loading 背景（橫向 1920x1080）
# ============================================================
gen "loading_bg_pc" "1920x1080" \
"A cinematic Western saloon scene panorama, warm tones. Wooden plank back wall, brass oil lamps glowing softly on both sides, a wanted poster of an outlaw centered on the wall (small, decorative). Dust particles floating in golden afternoon light. Wide saloon vibe, panoramic composition. Leave the lower 30% relatively darker / blurred for loading bar overlay text. No characters, no center title text, just atmosphere. Letterboxed wide.

Color palette: amber, dark wood brown, brass gold, off-white. Slight vignette."

# ============================================================
# 2. Mobile Loading 背景（直向 1080x1920）
# ============================================================
gen "loading_bg_mobile" "1080x1920" \
"Vertical Western saloon poster style background. Upper 50%: warm wood plank wall with a small wanted poster, brass lantern hanging. Middle 20%: empty space (will overlay loading bar). Lower 30%: wooden plank floor receding to a vanishing point. Soft warm light, dust motes. No characters, no text on the image itself.

Color palette: amber, brown wood, brass gold. Composition designed for portrait mobile screen 9:16."

# ============================================================
# 3. 手機左方向鍵
# ============================================================
gen "btn_left" "512x512" \
"A square Western saloon UI button on transparent background. Dark walnut wood texture surface with brass corner studs at all 4 corners, beveled inner edge. A bold engraved golden arrow pointing LEFT (◀) in the center, embossed metal effect. Soft inner shadow. Transparent PNG. Square aspect.

Color: dark brown wood + brass/gold accents. No text. Polished, slight glow on edges."

# ============================================================
# 4. 手機右方向鍵
# ============================================================
gen "btn_right" "512x512" \
"A square Western saloon UI button on transparent background. Dark walnut wood texture surface with brass corner studs at all 4 corners, beveled inner edge. A bold engraved golden arrow pointing RIGHT (▶) in the center, embossed metal effect. Soft inner shadow. Transparent PNG. Square aspect.

Color: dark brown wood + brass/gold accents. No text. Polished, slight glow on edges."

# ============================================================
# 5. 手機開槍按鈕（紅色圓鈕 + 手槍 + FIRE）
# ============================================================
gen "btn_fire" "512x512" \
"A round red Western FIRE button on transparent background. Glossy deep red metal/enamel surface, brass ring border, slight 3D bulge. Central engraving: a silhouette of a revolver (chibi cartoon style) pointing up, and below it the word \"FIRE\" in bold western typography (white/gold). Soft glow / highlight on top edge. Transparent PNG circular button. Square aspect 512x512.

Color: cardinal red + brass + white text. Polished saloon-bar look."

# ============================================================
# 6. Wanted Poster（手機版面頂端用）
# ============================================================
gen "wanted_poster_v2" "1024x600" \
"A weathered Western WANTED poster, parchment / aged paper texture with torn distressed edges. Top text: \"WANTED\" in bold western blackletter / wood-block typography. Middle: a circular brown frame with a chibi cartoon outlaw face (mustache, eyepatch, bandana, smirk) — Pixar 3D cartoon style. Below the portrait: \"DEAD OR ALIVE\" small text. Bottom large bold text: \"\$10,000\". Pinned to wood wall with two metal tacks visible. Wider than tall.

Color: tan parchment, brown ink, weathered. Cohesive with 3D chibi saloon game."

log "==== all done ===="
