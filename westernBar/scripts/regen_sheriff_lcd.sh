#!/bin/bash
# 用 LCD 8 張動作解析圖當 ref，每張生成對應的警長 sprite
# 每張先用 LCD 動作圖鎖定 pose，第一張用 lcd_remaster_v1 補角色細節
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_sheriff_lcd.log"
REFDIR="動作解析圖檔們"
OUT_DIR="public/assets/sprites/sheriff"
mkdir -p "$OUT_DIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

CHAR='美式西部警長（醉漢），35-42 歲【中年壯漢，絕對不是阿公】：
精壯、有酒肚、深棕色頭髮、【深棕色八字鬍】（絕對不准灰白）、紅鼻頭、
米色寬邊 cowboy hat、紅黑格紋襯衫（短袖捲起）、棕色皮背心、
左胸金色五角警長星徽、藍牛仔褲、棕色皮靴、腰間左輪手槍套'

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering、明亮飽和色彩、圓潤無稜角、無線稿。Q 版頭身比 1:2.2'

gen_pose() {
  local name="$1" ref="$2" desc="$3" anchor_ref="${4:-}"
  local out="$OUT_DIR/$name.png"
  [ -f "$out" ] && mv "$out" "$out.old"
  log "▶ gen $name.png ← $(basename "$ref")"

  local prompt="附加圖是 Casio Western Bar 1984 LCD 原作場景圖。
請辨識圖中【主角警長】的位置與【該 pose 的精確姿勢、手腳擺位、持物、朝向】。

任務：請用 image_gen 工具生成【只有該警長 sprite】的 512×512 PNG，
精確復刻原作中該警長的 pose（手腳位置、身體傾斜角度、持物、朝向）。

【pose 描述（依原作）】：
${desc}

【警長角色設定（強制鎖定，不准變）】：
${CHAR}

【風格】：${STYLE}

【輸出規範】：
- 512×512 PNG
- 警長【腳底距底邊 30px、佔畫面高 80%】、置中
- 背景【純品紅 #FF00FF】（chroma-key 去背用）
- 不要場景、桌椅、地板、其他角色、文字、編號

完成後存到 /Users/batman_work/claude/apps/westernBar/$out 並用 sips 縮放確認 512×512。"

  echo "$prompt" | codex exec --skip-git-repo-check --image "$ref" >/dev/null 2>&1
  [ -f "$out" ] && log "✓ $name" || log "✗ $name 失敗"
}

log "==== 用 LCD 8 動作解析圖逐張生成 ===="

# 第一張先做出來，之後不再 sheet — 直接個別生
gen_pose "action1" "$REFDIR/主角動作1.png" "主角動作 1：站立/移動的基本姿勢（看 LCD 圖中主角的位置與肢體擺位）"
gen_pose "action2" "$REFDIR/主角動作2.png" "主角動作 2：另一個基本姿勢"
gen_pose "action3" "$REFDIR/主角動作3.png" "主角動作 3：另一個基本姿勢"
gen_pose "action4" "$REFDIR/主角動作4.png" "主角動作 4：另一個基本姿勢"
gen_pose "pour"    "$REFDIR/主角動作5 往地上澆熄炸彈.png" "主角動作 5：往地上澆熄炸彈 — 站立、單手高舉威士忌酒瓶、向地面傾倒、琥珀色液體灑出"
gen_pose "hide"    "$REFDIR/主角動作6 進入掩蔽物.png"       "主角動作 6：進入掩蔽物 — 蹲低躲在倒地桌後面、只露頭和持槍手"
gen_pose "fire"    "$REFDIR/主角動作7開槍.png"               "主角動作 7：開槍 — 站立、單手左輪手槍向右側射擊、muzzle flash + 煙霧"
gen_pose "down"    "$REFDIR/主角動作8 失敗.png"               "主角動作 8：失敗 — 倒地、四肢攤開、星星圍頭、KO 表情"

log "==== 完成 ===="
ls -la "$OUT_DIR/"
