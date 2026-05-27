#!/bin/bash
# 通緝犯 7 個 pose：嚴格復刻 LCD 原作姿態（腳擺位、槍方向、身體傾斜）
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_bandit_lcd_strict.log"
REFDIR="動作解析圖檔們"
OUT_DIR="public/assets/sprites/bandit"
mkdir -p "$OUT_DIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

CHAR='美式西部通緝犯（兇惡歹徒），25-35 歲、瘦長體型：
窄臉、深邃眼神、絡腮鬍或山羊鬍、黑色或深色頭髮、
【黑色寬邊牛仔帽（比警長帽深、可帶羽毛）】、深色長袖襯衫、黑皮背心、
左胸或袖口可見強盜風格紋章/彈藥袋、深色長褲、黑皮靴、腰間左輪手槍套、
表情兇狠/邪笑、姿態凶悍'

LEG_GENERIC='【腳的姿態】嚴格仿照附加 LCD 原圖那個誇張擺位（外八、交叉、蹲、開、傾斜），
雙腳【絕對不可以平行併攏正常站立】，必須是 LCD 那種誇張歪斜姿態'

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering、明亮飽和色彩、圓潤無稜角、無線稿、Q 版頭身比 1:2.2'

gen_pose() {
  local name="$1" ref="$2" desc="$3" extra="${4:-}"
  local out="$OUT_DIR/$name.png"
  [ -f "$out" ] && cp "$out" "$out.bak2"
  log "▶ gen $name.png ← $(basename "$ref")"

  local prompt="附加圖是 Casio Western Bar 1984 LCD 原作場景圖。
請仔細辨識圖中【通緝犯（穿黑帽的反派）】的：
- 腳的擺位（外八？交叉？蹲？哪隻腳前哪隻後？）
- 身體傾斜角度、肩膀方向
- 手臂位置、有沒有持槍、槍口朝哪
- 頭朝向、表情

任務：用 image_gen 工具生成【只有該通緝犯 sprite】的 512×512 PNG，
精確復刻 LCD 原作該 pose 的所有細節。

【pose 描述】：${desc}

${extra}

${LEG_GENERIC}

【角色設定（強制鎖定）】：${CHAR}

【風格】：${STYLE}

【輸出規範】：
- 512×512 PNG
- 通緝犯【腳底距底邊 30px、佔畫面高 80%】、置中
- 背景【純品紅 #FF00FF】（chroma-key 去背用）
- 不要場景、桌椅、地板、其他角色、文字、編號

完成後存到 /Users/batman_work/claude/apps/westernBar/$out 並用 sips 縮放確認 512×512。"

  echo "$prompt" | codex exec --skip-git-repo-check --image "$ref" >>"$LOG" 2>&1
  if [ -f "$out" ]; then
    log "✓ $name.png 完成 ($(du -h "$out" | cut -f1))"
  else
    log "✗ $name.png 失敗"
  fi
}

log "===== 通緝犯 7 pose 重畫：嚴格復刻 LCD 姿態 ====="

gen_pose "at_door" "$REFDIR/通緝犯動作1 站在門口.png" \
  "站在酒吧木門口剛探頭進來，半身藏在門後，只露出上半身與帽" \
  "【特徵】身體大部分還在門外，只露上半身（腰部以上）。一手扶門框、表情邪笑"

gen_pose "enter" "$REFDIR/通緝犯動作2 進場.png" \
  "完全進場走入酒吧內部，全身入鏡" \
  "【特徵】跨步走路，一腳前一腳後（不平行）、身體略前傾、手臂自然甩動"

gen_pose "hide" "$REFDIR/通緝犯動作3 躲避動作.png" \
  "蹲低躲在吧台/掩體後，整個人壓低、只露頭頂與帽" \
  "【特徵】完全蹲下、雙膝彎曲、屁股壓低、身體壓成一團、頭埋低"

gen_pose "peek" "$REFDIR/通緝犯動作4 刺探動作.png" \
  "從掩體探出頭觀察，半蹲半起的探頭姿態" \
  "【特徵】半蹲、一腳跨開、上半身傾向一側探出、眼神警戒、可能單手扶物"

gen_pose "fire" "$REFDIR/通緝犯動作5 開槍.png" \
  "舉槍開槍 — 看 LCD 原作槍是朝哪個方向（很可能朝右上向警長）" \
  "【特徵 — 最重要】右手筆直伸出持槍、槍口【朝右方斜上】（瞄準畫面右側的警長），不是垂直、不是側面。雙腳呈射擊樁步（前腳彎後腳直），身體略後傾"

gen_pose "hit"  "$REFDIR/通緝犯動作6 被擊中.png" \
  "中槍反應 — 身體後仰、四肢張開、痛苦表情" \
  "【特徵】身體仰後、雙手張開、單腳離地或踉蹌、表情扭曲（眼睛 X 或張嘴慘叫）"

log "===== 完成 ====="
