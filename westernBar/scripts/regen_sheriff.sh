#!/bin/bash
# 重生警長 sprite sheet — 中年壯漢版（不再是老人）
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_sheriff.log"
ANCHOR="public/assets/lcd_remaster_v1.png"
OUT_A="public/assets/sheets/sheriff_A_sheet.png"
OUT_B="public/assets/sheets/sheriff_B_sheet.png"
mkdir -p public/assets/sheets

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# 移除舊版（強制重生）
[ -f "$OUT_A" ] && mv "$OUT_A" "${OUT_A}.old"
[ -f "$OUT_B" ] && mv "$OUT_B" "${OUT_B}.old"

# 新版角色描述：中年壯漢、不是阿公
SHERIFF_NEW='美式西部警長（醉漢路線），約 35-42 歲【中年壯漢，絕對不是阿公 / 老人 / 灰白頭髮】：
- 體型：精壯、肩寬、有酒肚但仍結實
- 髮色：【深棕色或黑色頭髮】，鬢角短而清爽，**完全不准灰白頭髮**
- 鬍子：【深棕色或黑色】八字鬍（俐落、不是亂蓬蓬白鬍），**完全不准白鬍**
- 臉部：方臉、堅毅輪廓、紅鼻頭（喝酒紅，不是老人紅）、有點微醺笑容
- 服裝：米色寬邊 cowboy hat、紅黑格紋襯衫（短袖捲起露肌肉手臂）、棕色皮背心、左胸金色五角星徽
- 下身：藍色牛仔褲、棕色皮靴、腰間左側棕色皮槍套（含左輪手槍）
- Q 版頭身比 1:2.2（頭佔身體 1/2，比上一版略小頭）
- 整體氣質：英勇但喝多了的中年男警長，像漫畫裡的硬漢醉俠

【再次強調】：不是 70 歲老頭、不是聖誕老人、不是灰鬍阿公、不是退休老警長。
是【正值壯年的中年警長】，35-42 歲，黑色 / 深棕色頭髮和鬍子。'

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering、明亮飽和色彩、圓潤無稜角、無線稿'

make_prompt() {
  local out="$1" poses="$2"
  cat <<EOF
附加圖是西部酒吧場景參考。

任務：請用 image_gen 工具生成一張【1024×1024】sprite sheet，2 欄 × 2 列，每格 512×512，
畫【同一個中年警長】的 4 個動作。

【絕對嚴格 — 4 格內角色必須完全一致】：
- 同一張臉、同一個鬍子、同一個髮色、同一套服裝、同一個體型
- 想像是同一個演員拍 4 張定裝照

【角色設定】：
${SHERIFF_NEW}

【4 格 pose】：
${poses}

【風格】：${STYLE}

【輸出規範】：
- 1024×1024，2×2 網格，每格嚴格 512×512
- 背景【純品紅 #FF00FF】（chroma-key 去背用）
- 每格主體水平置中、腳底距格底 40px、佔格高 80%
- 不准場景、桌椅、地板、其他角色、文字

完成後存到 /Users/batman_work/claude/apps/westernBar/$out 並用 sips 縮放確認 1024×1024。
EOF
}

log "▶ 重生 sheriff_A_sheet (idle/walk/aim/pour)"
echo "$(make_prompt "$OUT_A" "左上 idle：站立、雙手垂下、面向正前方、微醺笑容
右上 walk：邁左腳走路、雙手自然擺動
左下 aim ：右手左輪手槍朝右側舉起瞄準、左手後甩平衡
右下 pour：手持威士忌酒瓶向地面傾倒，琥珀色液體灑出")" | codex exec --skip-git-repo-check --image "$ANCHOR" >/dev/null 2>&1
[ -f "$OUT_A" ] && log "✓ A" || log "✗ A 失敗"

log "▶ 重生 sheriff_B_sheet (fire/hide/hit/down)"
echo "$(make_prompt "$OUT_B" "左上 fire：右手左輪朝右上 45 度開火、muzzle flash、煙霧
右上 hide：蹲低躲在倒立木桌後面、只露頭、帽子、持槍手
左下 hit ：中彈反應、頭髮帽子炸開、淚珠飛、嘴大張、雙手揮舞
右下 down：倒地、四肢攤開、星星圍繞頭頂、KO 表情")" | codex exec --skip-git-repo-check --image "$OUT_A" >/dev/null 2>&1
[ -f "$OUT_B" ] && log "✓ B" || log "✗ B 失敗"

log "==== 完成 ===="
log "重切 sprite..."
python3 scripts/slice_sheets.py 2>&1 | grep -E "sheriff" | tee -a "$LOG"
