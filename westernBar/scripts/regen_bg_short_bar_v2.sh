#!/bin/bash
# v2: 改用 .bak_v13 當 ref（避免 codex 卡住 same in/out）
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_bg_short_bar_v2.log"
OUT="public/assets/A/A00_empty_bg.png"
REF="public/assets/A/A00_empty_bg.png.bak_v13"

if [ ! -f "$REF" ]; then
  echo "ref not found: $REF"
  exit 1
fi

# 複製成獨立 .png 檔當 ref
REF_PNG="public/assets/A/_bg_ref.png"
cp "$REF" "$REF_PNG"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

log "==== v2 縮短吧台右端 ===="

PROMPT="附加圖是西部酒吧空場景。任務：生成完全相同視角/透視/牆/地板/酒瓶架/招牌/海報/門洞/邊框的版本，唯一差異是把吧台右端往左縮 8-10%，右側空出木地板。

嚴格保留：相機 45 度俯視、綠色 LCD 邊框、左側門洞與街景、WANTED 海報、SALOON 招牌、酒保走道、Pixar 3D 風格軟陰影