#!/bin/bash
# 警長 action1-4：強制【槍口朝正上方 + 腳誇張外八/交叉】LCD 原作姿態
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_sheriff_lcd_strict.log"
REFDIR="動作解析圖檔們"
OUT_DIR="public/assets/sprites/sheriff"
mkdir -p "$OUT_DIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

CHAR='美式西部警長（喝醉的痞子），35-45 歲【中年壯漢，絕對不是老人】：
精壯、酒肚、深棕色頭髮、【深棕色八字鬍】（不准灰白）、紅鼻頭、半瞇眼邪笑表情、
米色寬邊 cowboy hat、紅黑格紋襯衫（短袖捲起）、棕色皮背心、左胸金色五角警長星徽、
藍牛仔褲、棕色皮靴'

GUN_RULE='【槍口方向 — 最重要！】
警長【右手持單管左輪手槍、手臂筆直高舉、槍口垂直向上指天】。
槍身必須【完全垂直】（90 度朝上），絕對不是斜的、不是朝側面、不是朝下。
警長正在【對著天花板上的吧台用品（杯/瓶/盤）射擊】，所以槍永遠朝正上方。
這是 LCD 原作標誌性動作，務必嚴格遵守。'

LEG_RULE='【腳的姿態 — 第二重要！】
這是 LCD 原作的「醉漢痞氣站姿」，雙腳【必須誇張】：
- 兩腳【明顯張開外八】（呈倒 V 字形，膝蓋朝外）
- 或【一隻腳跨在另一隻前面交叉】（X 形）
- 膝蓋微彎、屁股翹一邊、肩膀略歪
- 整體姿態散漫、痞氣
雙腳【絕對不可以平行、不可以併攏、不可以正常站立】。
請完全仿照附加圖中 LCD 原作那個誇張腳步擺位'

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering、明亮飽和色彩、圓潤無稜角、無線稿、Q 版頭身比 1:2.2'

gen_pose() {
  local name="$1" ref="$2" desc="$3"
  local out="$OUT_DIR/$name.png"
  [ -f "$out" ] && cp "$out" "$out.bak2"
  log "▶ gen $name.png ← $(basename "$ref")"

  local prompt="附加圖是 Casio Western Bar 1984 LCD 原作場景圖。
請辨識圖中【主角警長】的【腳的擺位（外八？交叉？哪隻在前？）】、身體傾斜角度、手臂朝向。

任務：用 image_gen 工具生成【只有該警長 sprite】的 512×512 PNG，
精確復刻 LCD 原作該 pose 的【腳擺位】+ 警長【右手持槍高舉、槍口正上方】。

【pose 描述】：${desc}

${GUN_RULE}

${LEG_RULE}

【角色設定（強制鎖定）】：${CHAR}

【風格】：${STYLE}

【輸出規範】：
- 512×512 PNG
- 警長【腳底距底邊 30px、佔畫面高 80%】、置中
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

log "===== 警長 action1-4 重畫：槍朝正上 + 腳外八/交叉 ====="

gen_pose "action1" "$REFDIR/主角動作1.png" "Zone 1：最左邊。右手筆直高舉槍朝正上方，兩腳【誇張外八張開】或交叉，身體往左微歪"
gen_pose "action2" "$REFDIR/主角動作2.png" "Zone 2：左中。右手筆直高舉槍朝正上方，兩腳【另一個誇張外八/交叉擺位】"
gen_pose "action3" "$REFDIR/主角動作3.png" "Zone 3：右中。右手筆直高舉槍朝正上方，兩腳【另一個誇張外八/交叉擺位】"
gen_pose "action4" "$REFDIR/主角動作4.png" "Zone 4：最右邊吧台前。右手筆直高舉槍朝正上方，兩腳【誇張外八張開】或交叉"

log "===== 完成 ====="
