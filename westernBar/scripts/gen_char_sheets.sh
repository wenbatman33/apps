#!/bin/bash
# A 路線：以 lcd_remaster_v1.png 為風格錨點，為每個角色生【單一角色 sprite sheet】
# 每張 1024x1024，2x2 grid（4 poses），品紅 #FF00FF 背景方便去背
set -u
cd "$(dirname "$0")/.."

LOG="scripts/gen_char_sheets.log"
OUTDIR="public/assets/sheets"
ANCHOR="public/assets/lcd_remaster_v1.png"
mkdir -p "$OUTDIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering、明亮飽和色彩、圓潤無稜角、Q 版大頭比例（頭佔身高 1/2）、無線稿。風格必須與附加圖中對應角色【100% 一致】（同臉、同服裝、同年紀、同比例）'

gen_sheet() {
  local name="$1" char_desc="$2" poses="$3"
  local out="$OUTDIR/${name}_sheet.png"
  if [ -f "$out" ]; then log "⏭  $name skip"; return 0; fi

  local prompt="附加圖是西部酒吧場景，內有【${name}】角色出現。

任務：請用 image_gen 工具生成一張【1024×1024】sprite sheet，2 欄 × 2 列，每格 512×512。
畫出【同一個 ${name}】的 4 個動作。

【絕對嚴格】：
- 整張只能有【1 個角色】，4 格都是【同一人】
- 不准畫任何其他角色、不准畫場景、不准畫桌椅/牆/地板
- 不准加文字、編號、紅圈

【角色設定（4 格共用、與附加圖風格一致）】：
${char_desc}

【4 格 pose】：
${poses}

【風格】：${STYLE}

【輸出規範】：
- 1024×1024，2×2 網格，【每格嚴格 512×512】
- 背景【純品紅 #FF00FF】（之後 chroma-key 去背）
- 每格角色【水平置中】、【腳底距格底 40px】、【佔格高 80%】
- 無格線、無編號、無浮水印
- 4 格朝向都【面向觀眾或微側】

完成後存到 /Users/batman_work/claude/apps/westernBar/$out
並用 sips 確認最終 1024×1024。"

  log "▶ gen $name (4 poses)"
  echo "$prompt" | codex exec --skip-git-repo-check --image "$ANCHOR" >/dev/null 2>&1
  if [ -f "$out" ] && [ -s "$out" ]; then
    log "✓ $name"
  else
    log "✗ $name 失敗"
  fi
}

log "==== A 路線：個別角色 sprite sheet ===="

# 警長：8 個 pose → 拆兩張各 4 個
gen_sheet "sheriff_A" \
"醉酒老警長 sheriff，五十多歲、瘦削、白色八字鬍（兩端翹起）、紅鼻頭、
米色寬邊 cowboy hat、紅黑格紋襯衫、棕色皮背心、左胸金色五角星徽、
藍牛仔褲、棕色皮靴、腰間左側棕色皮槍套（內含左輪手槍）" \
"左上 (idle)   ：站立、雙手垂下、面向正前方、微醺表情
右上 (walk)   ：邁左腳走路、雙手自然擺動
左下 (aim)    ：右手左輪手槍朝右側舉起瞄準、左手後甩平衡
右下 (pour)   ：手持威士忌酒瓶向地面傾倒，琥珀色液體灑出"

gen_sheet "sheriff_B" \
"醉酒老警長 sheriff，五十多歲、瘦削、白色八字鬍（兩端翹起）、紅鼻頭、
米色寬邊 cowboy hat、紅黑格紋襯衫、棕色皮背心、左胸金色五角星徽、
藍牛仔褲、棕色皮靴、腰間左側棕色皮槍套（內含左輪手槍）" \
"左上 (fire)  ：右手左輪手槍朝右上 45 度開火、槍口大 muzzle flash、煙霧
右上 (hide)  ：蹲低躲在【倒立的木桌】後面，只露頭、帽子和持槍手
左下 (hit)   ：中彈反應，頭髮帽子炸開、淚珠飛、嘴大張、雙手揮舞
右下 (down)  ：倒地、四肢攤開、星星圍繞頭頂、戰敗 KO 表情"

# 通緝犯：6 個 pose → 拆兩張各 3 個（或合一張 2x3）
gen_sheet "bandit_A" \
"西部通緝犯，三十多歲、精瘦、黑色寬邊帽（帽簷低壓）、紅色 bandana 蒙住下半臉只露眼、
髒灰白襯衫、棕色皮背心、胸前交叉黃銅子彈帶、深褐色長褲、棕靴、腰間雙槍套" \
"左上 (at_door)：站在彈簧門口、半側身、手放槍把上、警戒
右上 (enter)  ：踏步進入、一手撥開門、另一手摸槍
左下 (hide)   ：蹲低躲藏、雙手抱住膝蓋身體
右下 (peek)   ：探頭刺探、半身露出、眼神警戒"

gen_sheet "bandit_B" \
"西部通緝犯，三十多歲、精瘦、黑色寬邊帽（帽簷低壓）、紅色 bandana 蒙住下半臉只露眼、
髒灰白襯衫、棕色皮背心、胸前交叉黃銅子彈帶、深褐色長褲、棕靴、腰間雙槍套" \
"左上 (fire)   ：右手手槍朝左側開火、muzzle flash、煙霧
右上 (hit)    ：中彈反應、身體前傾、雙手揮舞、bandana 飛起
左下 (down)   ：倒地、四肢攤開、戰敗
右下 (idle)   ：站立警戒、雙手垂在槍套旁"

# 酒保
gen_sheet "barman" \
"西部酒吧酒保 bartender，四十多歲、微胖、灰白短髮中分、白襯衫長袖捲到手肘、
領結（黑色或紅色蝴蝶結）、黃金色背心、黑色長褲、白圍裙繫腰" \
"左上 (idle)    ：站立、雙手扶吧台、和藹笑容
右上 (slide)   ：右手用力推送酒杯滑向左、身體前傾
左下 (catch)   ：雙手抱住一個冒煙的炸彈、害怕表情
右下 (cheer)   ：雙手舉杯、歡呼慶祝"

# 丈夫
gen_sheet "husband" \
"西部酒吧客人丈夫，中年微胖、深棕色絡腮鬍 + 大鬍子、藍白格紋襯衫、
棕色吊帶褲、黑色長褲、棕靴、圓盤帽（深棕色）" \
"左上 (eat1)   ：坐姿、雙手持刀叉切牛排、低頭吃飯
右上 (eat2)   ：坐姿、舉杯啜飲、滿足表情
左下 (alert)  ：站起身、雙拳緊握、頭上 !! 標記、生氣表情
右下 (hide)   ：蹲低躲在桌下、雙手抱頭、害怕"

# 妻子
gen_sheet "wife" \
"西部酒吧客人妻子，中年豐腴、栗色頭髮綁包頭髮髻、粉紅色長洋裝、
白色蕾絲圍裙、白色蝴蝶結、紅色臉頰、和善豐腴的笑容" \
"左上 (eat1)   ：坐姿、雙手持叉、低頭吃飯
右上 (eat2)   ：坐姿、優雅舉茶杯、淑女表情
左下 (alert)  ：站起身、雙手叉腰、頭上 !! 標記、生氣
右下 (hide)   ：蹲低躲在桌下、雙手抱頭、害怕"

log "==== 全部完成 ===="
ls -la "$OUTDIR/"
