#!/bin/bash
# 連續生成所有遊戲 sprite，以 lcd_remaster_v1.png 為風格錨點
# 所有 sprite 統一品紅 #FF00FF 背景，方便 chroma-key 去背
set -u
cd "$(dirname "$0")/.."

LOG="scripts/gen_all_sprites.log"
ANCHOR="public/assets/lcd_remaster_v1.png"
SHEETS_DIR="public/assets/sheets"
mkdir -p "$SHEETS_DIR" public/assets/{A,B,C,D,E,F,G,H,I,J,L}

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering、明亮飽和色彩、圓潤無稜角、無線稿。風格與附加圖中對應角色/物件 100% 一致'

# 通用生圖函數：給 output 路徑 + prompt，以 ANCHOR 為 ref
gen_one() {
  local out="$1" prompt="$2" tries=0
  if [ -f "$out" ]; then log "⏭  $(basename $out) skip"; return 0; fi
  while [ $tries -lt 2 ]; do
    log "▶ $(basename $out) (try $((tries+1)))"
    echo "$prompt" | codex exec --skip-git-repo-check --image "$ANCHOR" >/dev/null 2>&1
    if [ -f "$out" ] && [ -s "$out" ]; then
      log "✓ $(basename $out)"
      return 0
    fi
    tries=$((tries+1))
  done
  log "✗ $(basename $out) FAILED"
  return 1
}

# 標準 sprite sheet prompt 模板（4 個 pose、2x2 grid、品紅背景）
make_sheet_prompt() {
  local out="$1" subject="$2" poses="$3"
  cat <<EOF
附加圖是西部酒吧場景參考（${subject} 出現在其中）。

任務：請用 image_gen 工具生成一張【1024×1024】sprite sheet，2 欄 × 2 列，每格 512×512，
畫【同一個 ${subject}】的 4 個動作。

【絕對嚴格】：
- 整張只能有 1 個角色 / 1 種物件，4 格都是同一人 / 同一物
- 不准畫場景、桌椅、地板、其他角色
- 不准加文字、編號、紅圈

【4 格內容】：
${poses}

【風格】：${STYLE}

【輸出規範】：
- 1024×1024，2×2 網格，每格嚴格 512×512
- 背景【純品紅 #FF00FF】(chroma-key 去背用)
- 每格主體水平置中、腳底距格底 40px、佔格高 80%

完成後存到 /Users/batman_work/claude/apps/westernBar/$out 並用 sips 縮放確認 1024×1024。
EOF
}

# 物件 prompt 模板（單一物件、置中、品紅背景、512x512）
make_item_prompt() {
  local out="$1" subject="$2" detail="$3"
  cat <<EOF
附加圖是西部酒吧場景參考。

任務：請用 image_gen 工具生成一張【512×512 PNG】，只有【1 個 ${subject}】物件置中。

【物件描述】：
${detail}

【風格】：${STYLE}（與附加圖內同類物件風格一致）

【輸出規範】：
- 512×512，物件置中、佔畫面 70%
- 背景【純品紅 #FF00FF】(chroma-key 去背用)
- 不要文字、不要其他物件、不要陰影投影到背景

完成後存到 /Users/batman_work/claude/apps/westernBar/$out 並用 sips 縮放確認 512×512。
EOF
}

log "==== START: 連續生成全部 sprite ===="

# ============ 1. 彈簧門（左牆 sprite） ============
log "---- [1/7] 彈簧門 ----"
gen_one "public/assets/A/A11_swing_door.png" "$(make_item_prompt \
  "public/assets/A/A11_swing_door.png" \
  "西部酒吧彈簧門 swing door（單一物件）" \
  "百葉窗式雙扇門、深棕色木質、銅製鉸鏈、磨損痕跡、稍微半開狀態、能看到木紋細節。
   從 45° 俯視角度繪製，符合附加圖左牆門洞的尺寸與比例。")"

# ============ 2. 警長 sheet A & B ============
log "---- [2/7] 警長 sheet (8 poses 拆 2 張) ----"
SHERIFF_DESC="醉酒老警長 sheriff：五十多歲、瘦削、白色八字鬍（兩端翹起）、紅鼻頭、米色寬邊 cowboy hat、紅黑格紋襯衫、棕色皮背心、左胸金色五角星徽、藍牛仔褲、棕色皮靴、腰間左側棕色皮槍套（內含左輪手槍）"
gen_one "$SHEETS_DIR/sheriff_A_sheet.png" "$(make_sheet_prompt \
  "$SHEETS_DIR/sheriff_A_sheet.png" "$SHERIFF_DESC" \
"左上 idle ：站立、雙手垂下、面向正前方、微醺
右上 walk ：邁左腳走路、雙手自然擺動
左下 aim  ：右手左輪手槍朝右側舉起瞄準
右下 pour ：手持威士忌酒瓶向地面傾倒，琥珀色液體灑出")"

gen_one "$SHEETS_DIR/sheriff_B_sheet.png" "$(make_sheet_prompt \
  "$SHEETS_DIR/sheriff_B_sheet.png" "$SHERIFF_DESC" \
"左上 fire ：右手左輪朝右上 45 度開火、muzzle flash、煙霧
右上 hide ：蹲低躲在倒立木桌後面，只露頭、帽子、持槍手
左下 hit  ：中彈反應，頭髮帽子炸開、淚珠飛、嘴大張、雙手揮舞
右下 down ：倒地、四肢攤開、星星圍繞頭頂、KO 表情")"

# ============ 3. 通緝犯 sheet A & B ============
log "---- [3/7] 通緝犯 sheet ----"
BANDIT_DESC="西部通緝犯：三十多歲、精瘦、黑色寬邊帽（帽簷低壓）、紅色 bandana 蒙住下半臉只露眼、髒灰白襯衫、棕色皮背心、胸前交叉黃銅子彈帶、深褐色長褲、棕靴、腰間雙槍套"

gen_one "$SHEETS_DIR/bandit_A_sheet.png" "$(make_sheet_prompt \
  "$SHEETS_DIR/bandit_A_sheet.png" "$BANDIT_DESC" \
"左上 at_door：站門口、半側身、手放槍把上、警戒
右上 enter ：踏步進入、撥開門、摸槍
左下 hide  ：蹲低躲藏、雙手抱膝
右下 peek  ：探頭刺探、半身露出、警戒")"

gen_one "$SHEETS_DIR/bandit_B_sheet.png" "$(make_sheet_prompt \
  "$SHEETS_DIR/bandit_B_sheet.png" "$BANDIT_DESC" \
"左上 fire ：右手手槍朝左側開火、muzzle flash、煙霧
右上 hit  ：中彈反應、身體前傾、雙手揮舞、bandana 飛起
左下 down ：倒地、四肢攤開、戰敗
右下 idle ：站立警戒、雙手垂在槍套旁")"

# ============ 4. 酒保 + 夫婦 sheet ============
log "---- [4/7] 酒保 + 夫婦 sheet ----"
gen_one "$SHEETS_DIR/barman_sheet.png" "$(make_sheet_prompt \
  "$SHEETS_DIR/barman_sheet.png" \
  "西部酒吧酒保：四十多歲、微胖、灰白短髮中分、白襯衫長袖捲到手肘、黑色領結蝴蝶結、黃金色背心、黑色長褲、白圍裙繫腰" \
"左上 idle  ：站立、雙手扶吧台、和藹笑容
右上 slide ：右手推送酒杯滑向左、身體前傾
左下 catch ：雙手抱住冒煙炸彈、害怕表情
右下 cheer ：雙手舉杯歡呼")"

gen_one "$SHEETS_DIR/husband_sheet.png" "$(make_sheet_prompt \
  "$SHEETS_DIR/husband_sheet.png" \
  "西部酒吧客人丈夫：中年微胖、深棕色絡腮鬍 + 大鬍子、藍白格紋襯衫、棕色吊帶褲、棕靴、圓盤帽" \
"左上 eat1  ：坐姿、雙手持刀叉切牛排、低頭吃
右上 eat2  ：坐姿、舉杯啜飲、滿足
左下 alert ：站起身、雙拳緊握、頭上 !! 標記、生氣
右下 hide  ：蹲低躲桌下、雙手抱頭、害怕")"

gen_one "$SHEETS_DIR/wife_sheet.png" "$(make_sheet_prompt \
  "$SHEETS_DIR/wife_sheet.png" \
  "西部酒吧客人妻子：中年豐腴、栗色頭髮綁包頭髮髻、粉紅色長洋裝、白色蕾絲圍裙、白色蝴蝶結、紅臉頰、和善豐腴笑容" \
"左上 eat1  ：坐姿、雙手持叉低頭吃
右上 eat2  ：坐姿、優雅舉茶杯
左下 alert ：站起身、雙手叉腰、頭上 !! 標記、生氣
右下 hide  ：蹲低躲桌下、雙手抱頭、害怕")"

# ============ 5. 物品 items ============
log "---- [5/7] 物品 ----"
gen_one "public/assets/G/G01_cup_intact.png" "$(make_item_prompt \
  "public/assets/G/G01_cup_intact.png" "西部馬克啤酒杯" \
  "厚實淺米色陶瓷馬克杯（mug），把手在右側、杯內盛滿琥珀色啤酒、白色泡沫頂、3D 立體陰影")"

gen_one "public/assets/G/G02_cup_broken.png" "$(make_item_prompt \
  "public/assets/G/G02_cup_broken.png" "破裂的馬克杯" \
  "陶瓷馬克杯破成 4-6 個碎片散在地上、啤酒灑出、Q 版誇張碎裂效果")"

gen_one "public/assets/G/G03_bottle_intact.png" "$(make_item_prompt \
  "public/assets/G/G03_bottle_intact.png" "綠色玻璃酒瓶" \
  "深綠色玻璃酒瓶、長頸、棕色軟木塞、瓶身有米色標籤、立體高光")"

gen_one "public/assets/G/G04_bottle_broken.png" "$(make_item_prompt \
  "public/assets/G/G04_bottle_broken.png" "破裂酒瓶" \
  "綠色玻璃酒瓶破成尖銳碎片散在地上、液體灑出、Q 版誇張")"

gen_one "public/assets/G/G05_plate_intact.png" "$(make_item_prompt \
  "public/assets/G/G05_plate_intact.png" "盤裝食物" \
  "米色陶瓷圓盤、上面有牛排 + 馬鈴薯 + 蔬菜配菜、立體俯視角度")"

gen_one "public/assets/G/G06_plate_broken.png" "$(make_item_prompt \
  "public/assets/G/G06_plate_broken.png" "破裂盤子" \
  "米色陶瓷盤破成碎片、食物散落、Q 版誇張")"

gen_one "public/assets/G/G07_bonus_bottle.png" "$(make_item_prompt \
  "public/assets/G/G07_bonus_bottle.png" "金色獎金酒瓶" \
  "閃亮金色香檳酒瓶、有閃光特效、星星圍繞、bonus 道具感、亮金色高光")"

gen_one "public/assets/H/H01_apple.png" "$(make_item_prompt \
  "public/assets/H/H01_apple.png" "紅蘋果" \
  "鮮紅色蘋果、頂端有綠色葉子和棕色梗、Q 版圓潤、高光")"

gen_one "public/assets/H/H02_ashtray.png" "$(make_item_prompt \
  "public/assets/H/H02_ashtray.png" "菸灰缸" \
  "深灰色圓形玻璃菸灰缸、內有菸灰、立體俯視")"

gen_one "public/assets/J/J01_whiskey_bottle.png" "$(make_item_prompt \
  "public/assets/J/J01_whiskey_bottle.png" "威士忌酒瓶" \
  "棕色玻璃威士忌瓶、長方瓶身、米色標籤上印威士忌字樣、軟木塞、立體高光")"

# ============ 6. 桌椅 + 掩體 ============
log "---- [6/7] 桌椅 + 掩體 ----"
gen_one "public/assets/A/A26_round_table.png" "$(make_item_prompt \
  "public/assets/A/A26_round_table.png" "圓桌" \
  "西部酒吧圓形小餐桌、深棕色木質、桌腿小巧、桌面有少量花紋、45° 俯視")"

gen_one "public/assets/A/A27_stool.png" "$(make_item_prompt \
  "public/assets/A/A27_stool.png" "木椅" \
  "西部酒吧木椅 / 吧椅、椅背圓弧、椅墊綠色或棕色、木質椅腳")"

gen_one "public/assets/F/F01_table_intact.png" "$(make_item_prompt \
  "public/assets/F/F01_table_intact.png" "倒立木桌（掩體第一段）" \
  "倒翻過來的長方形木桌、3 條木板拼接、深棕木質、堅固完好、警長躲藏用、45° 俯視")"

gen_one "public/assets/F/F02_table_damaged.png" "$(make_item_prompt \
  "public/assets/F/F02_table_damaged.png" "破損木桌（掩體第二段）" \
  "倒翻木桌已破損、1 塊木板缺裂、剩 2 塊、有彈孔焦痕、Q 版誇張")"

gen_one "public/assets/F/F03_table_destroyed.png" "$(make_item_prompt \
  "public/assets/F/F03_table_destroyed.png" "毀壞木桌（掩體第三段）" \
  "倒翻木桌只剩 1 塊歪斜木板、其他散落周圍、燒焦彈孔、Q 版")"

# ============ 7. 炸彈 + 爆炸 + 子彈 ============
log "---- [7/7] 炸彈 + 爆炸 + 子彈 ----"
gen_one "public/assets/I/I01_dynamite_lit.png" "$(make_item_prompt \
  "public/assets/I/I01_dynamite_lit.png" "飛行中的紅白炸藥棒" \
  "紅白條紋炸藥棒 dynamite stick、頂端引信點燃、火花閃爍、Q 版圓潤")"

gen_one "public/assets/I/I02_dynamite_ground.png" "$(make_item_prompt \
  "public/assets/I/I02_dynamite_ground.png" "地上的炸彈" \
  "黑色圓形炸彈球（傳統卡通炸彈）、頂端引信點燃火花、Q 版")"

gen_one "public/assets/I/I03_explosion.png" "$(make_item_prompt \
  "public/assets/I/I03_explosion.png" "爆炸特效" \
  "Q 版橘黃色爆炸雲、星形光芒、煙霧、Pow! 卡通漫畫風格爆炸")"

gen_one "public/assets/L/L01_bullet_player.png" "$(make_item_prompt \
  "public/assets/L/L01_bullet_player.png" "玩家子彈" \
  "金黃色尖頭子彈、垂直方向、輕微拖尾光、Q 版")"

gen_one "public/assets/L/L02_bullet_bandit.png" "$(make_item_prompt \
  "public/assets/L/L02_bullet_bandit.png" "敵人子彈" \
  "紅色尖頭子彈、水平方向、輕微拖尾光、Q 版")"

log "==== ALL DONE ===="
log "Sprite sheets:"
ls -la "$SHEETS_DIR/" | tee -a "$LOG"
log ""
log "Items by category:"
for cat in A B C D E F G H I J L; do
  count=$(ls public/assets/$cat/*.png 2>/dev/null | wc -l | tr -d ' ')
  log "  $cat: $count PNGs"
done
