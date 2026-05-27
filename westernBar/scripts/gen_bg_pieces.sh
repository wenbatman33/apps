#!/bin/bash
# 拆開生成所有背景組件（吧台、桌椅、木桶、門）
set -u
cd "$(dirname "$0")/.."

LOG="scripts/gen_bg_pieces.log"
mkdir -p public/assets/A
ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

log "==== gen bg pieces start ===="

STYLE='Pixar / Disney / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering 質感、明亮飽和色彩、圓潤無稜角'

# helper：純 text prompt 生圖（背景物件沒有 reference 圖）
gen_piece() {
  local out="$1" prompt="$2" tries=0
  if [ -f "$out" ]; then log "⏭  $(basename $out) (skip)"; return 0; fi
  while [ $tries -lt 2 ]; do
    log "▶ gen $(basename $out) (try $((tries+1)))"
    local full="請用 image_gen 工具生成一張 1024x1024 PNG。

主題：${prompt}

風格：${STYLE}。**透明背景 PNG**（用 chroma-key 產生再去背輸出 RGBA），單一物件置中，不要文字 / 編號 / 角色。

完成後複製到絕對路徑 /Users/batman_work/claude/apps/westernBar/$out 並 sips 縮放到 1024x1024。"
    echo "$full" | codex exec --skip-git-repo-check >/dev/null 2>&1
    if [ -f "$out" ] && [ -s "$out" ]; then log "✓ $(basename $out)"; return 0; fi
    tries=$((tries+1))
  done
  log "✗ $(basename $out) FAILED"
  return 1
}

# 背景元件
gen_piece "public/assets/A/A20_room_shell.png" "一張西部酒吧內部的空房間殼：只有牆面（後牆 + 左側牆）+ 木板地面，沒有任何家具、桌椅、吧台、招牌、人物。45 度俯視角，視角同酒吧場景。米色 + 棕色木紋。"
gen_piece "public/assets/A/A21_bar_counter.png" "一條長長的西部酒吧吧台檯面 + 前面板：木質質感、檯面上有少量花紋裝飾、前面板有垂直木板紋路。單獨的吧台物件、無背景、無酒瓶架。橫向長條狀，約佔畫面 80% 寬度。"
gen_piece "public/assets/A/A22_bottle_shelf.png" "一組西部酒吧酒瓶架：3 層淡藍色背板、各種顏色酒瓶整齊排列、木製外框。單獨的酒瓶架物件。"
gen_piece "public/assets/A/A23_wanted_poster.png" "一張西部酒吧 WANTED 通緝海報：奶油色紙、頂部寫 WANTED、中間是黑色牛仔頭像剪影、底部寫 \$25,000、有撕邊和釘子。"
gen_piece "public/assets/A/A24_saloon_sign.png" "一塊西部酒吧 SALOON 木製招牌：暗紅色木板背景、金色花式邊框、大寫 SALOON 字體。"
gen_piece "public/assets/A/A25_swing_door.png" "西部酒吧彈簧門：木質百葉窗式雙扇門、銅製鉸鏈、單獨無背景。"
gen_piece "public/assets/A/A26_round_table.png" "一張西部酒吧圓形小餐桌：深棕色木質、桌腿小巧、桌面有些花紋。45 度俯視角單獨物件。"
gen_piece "public/assets/A/A27_stool.png" "一張西部酒吧木椅 / 吧椅：椅背圓弧、椅墊綠色或棕色、木質椅腳。"
gen_piece "public/assets/A/A28_wooden_barrel.png" "一個西部木桶：橫紋木板、金屬箍、棕色。"
gen_piece "public/assets/A/A29_lamp_wall.png" "一盞牆掛油燈：銅製、黃色火光、復古樣式。"
gen_piece "public/assets/A/A30_barber_pole.png" "一根西部理髮店螺旋柱：紅白條紋、垂直站立。"

log "==== bg pieces DONE ===="
ls -la public/assets/A/A2*.png
