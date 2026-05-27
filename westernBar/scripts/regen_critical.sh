#!/bin/bash
# 重生 3 個關鍵：警長 sheets（pose 誇張差異）+ 夫婦圓桌 + 掩體 3 階段（側躺倒地桌）
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_critical.log"
ANCHOR="public/assets/lcd_remaster_v1.png"
mkdir -p public/assets/{sheets,A,F}

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering、明亮飽和色彩、圓潤無稜角、無線稿'

# ============ 1. 警長 — pose 誇張差異 ============
SHERIFF_DESC='美式西部警長，35-42 歲【中年壯漢，不是阿公】：精壯肩寬、有酒肚、深棕色或黑色頭髮 + 深棕色八字鬍（絕對不准灰白）、紅鼻頭、米色寬邊 cowboy hat、紅黑格紋襯衫（短袖捲起）、棕色皮背心、金色五角星徽、藍牛仔褲、棕色皮靴、腰間左輪手槍套'

# 移除舊版強制重生
mv public/assets/sheets/sheriff_A_sheet.png public/assets/sheets/sheriff_A_sheet.png.old 2>/dev/null
mv public/assets/sheets/sheriff_B_sheet.png public/assets/sheets/sheriff_B_sheet.png.old 2>/dev/null

log "▶ sheriff_A_sheet — pose 必須誇張不同"
PROMPT_A="附加圖是西部酒吧場景參考。

任務：生成 1024×1024 sprite sheet，2×2 grid 每格 512×512，畫【同一個中年警長】的 4 個動作。

【4 格人物必須完全一致】（同臉同鬍同服裝）：${SHERIFF_DESC}

【4 格 pose 必須【極度誇張不同】】（不准每格都類似站立）：
左上 idle：直立、雙腳併攏、雙手垂在身側、面向正前方、表情微醺笑容
右上 walk：【明顯奔跑姿態】！前腳大跨步、後腳離地、雙臂前後大幅擺動、身體前傾 15 度、像漫畫衝刺
左下 aim ：【深蹲半跪姿】！單膝跪地、上半身前傾、雙手握槍向右側水平瞄準、眼神專注
右下 pour：【側身彎腰】！身體傾斜 30 度、右手高舉威士忌酒瓶向地面傾倒、琥珀色液體大量灑出

【風格】：${STYLE}
【輸出】：1024×1024、2×2 網格嚴格 512×512、品紅 #FF00FF 背景、每格主體置中、佔格高 75-85%、不准場景/桌椅/其他角色/文字

完成後存到 /Users/batman_work/claude/apps/westernBar/public/assets/sheets/sheriff_A_sheet.png 並 sips 確認 1024×1024。"
echo "$PROMPT_A" | codex exec --skip-git-repo-check --image "$ANCHOR" >/dev/null 2>&1
[ -f public/assets/sheets/sheriff_A_sheet.png ] && log "✓ A" || log "✗ A 失敗"

log "▶ sheriff_B_sheet — 用 A 當 ref 保持角色一致，pose 誇張不同"
PROMPT_B="附加圖是剛生成的警長 sprite sheet（4 個基本動作）。

任務：生成 1024×1024 sprite sheet，畫【同一個警長】的另外 4 個動作。

【絕對嚴格】：與附加圖中的警長【完全同一人】，臉、鬍、髮色、服裝、體型 100% 一致。
角色設定：${SHERIFF_DESC}

【4 格 pose 必須【極度誇張不同】】：
左上 fire：【向右側躍起射擊】！雙腳離地、雙手前伸握槍向右水平射擊、muzzle flash + 煙霧、帽簷飛揚
右上 hide：【蹲低於倒地桌後】！只露出帽頂 + 一隻持槍手從桌後伸出、身體被桌遮住、警戒看正前方
左下 hit ：【中彈飛起向後翻】！身體騰空向後翻倒 45 度、雙臂亂舞、淚珠飛濺、嘴大張驚恐、帽子脫飛
右下 down：【完全平躺地面 KO】！四肢攤開呈大字、頭頂星星轉、眼睛變 X、舌頭吐出、戰敗投降

【風格】：${STYLE}
【輸出】：1024×1024、2×2 網格嚴格 512×512、品紅 #FF00FF 背景、佔格高 75-85%、不准場景

完成後存到 /Users/batman_work/claude/apps/westernBar/public/assets/sheets/sheriff_B_sheet.png 並 sips 確認。"
echo "$PROMPT_B" | codex exec --skip-git-repo-check --image "public/assets/sheets/sheriff_A_sheet.png" >/dev/null 2>&1
[ -f public/assets/sheets/sheriff_B_sheet.png ] && log "✓ B" || log "✗ B 失敗"

# ============ 2. 夫婦圓桌 ============
log "▶ 夫婦圓桌（大型用餐桌、可坐 2 人）"
mv public/assets/A/A26_round_table.png public/assets/A/A26_round_table.png.old 2>/dev/null
PROMPT_TABLE="附加圖是西部酒吧場景參考。

任務：生成 512×512 PNG，只有一張【西部酒吧大型用餐圓桌】物件置中。

【物件設計】：
- 圓形桌面、深棕色木質、桌面有紋路雕花
- 4 條粗壯桌腿、桌腿向下展開穩固
- 尺寸：足夠 2 人對坐用餐
- 桌面 45° 俯視可看見、桌邊微微傾斜
- 高品質 3D 質感，與附加圖內桌椅風格一致

【風格】：${STYLE}
【輸出】：512×512、物件置中佔畫面 75%、背景【純品紅 #FF00FF】、無文字、無其他物件

完成後存到 /Users/batman_work/claude/apps/westernBar/public/assets/A/A26_round_table.png 並 sips 確認 512×512。"
echo "$PROMPT_TABLE" | codex exec --skip-git-repo-check --image "$ANCHOR" >/dev/null 2>&1
[ -f public/assets/A/A26_round_table.png ] && log "✓ 圓桌" || log "✗ 圓桌失敗"

# ============ 3. 掩體 3 階段（側躺倒地桌） ============
COVER_BASE='【極為重要 — 倒在地上的長方形桌子】：
桌子側躺翻倒在木地板上，
- 桌腳【朝右側】（即 4 條腿水平指向畫面右側）
- 桌面【朝左側】（垂直桌面平面面對畫面左側，呈擋板狀）
- 桌子整體是【橫向長方形】，水平擺放在地上
- 警長躲在桌子【右側】（即桌腳那一面，從桌腿之間探頭）
- 開槍時警長跳到【左側】（即桌面那一面）
深棕色木質、3D 質感、45° 俯視角'

log "▶ cover F01 完好"
mv public/assets/F/F01_table_intact.png public/assets/F/F01_table_intact.png.old 2>/dev/null
PROMPT_F1="附加圖是西部酒吧場景參考。

任務：生成 512×512 PNG，只有【倒地桌（完好）】物件置中。

${COVER_BASE}

完好狀態：桌面 3 條木板完整、桌腳 4 條都在、無傷痕。

【風格】：${STYLE}
【輸出】：512×512、物件置中佔畫面 80%、橫向擺放（寬>高）、背景【純品紅 #FF00FF】

完成後存到 /Users/batman_work/claude/apps/westernBar/public/assets/F/F01_table_intact.png 並 sips 確認 512×512。"
echo "$PROMPT_F1" | codex exec --skip-git-repo-check --image "$ANCHOR" >/dev/null 2>&1
[ -f public/assets/F/F01_table_intact.png ] && log "✓ F01" || log "✗ F01 失敗"

log "▶ cover F02 破損（用 F01 當 ref）"
mv public/assets/F/F02_table_damaged.png public/assets/F/F02_table_damaged.png.old 2>/dev/null
PROMPT_F2="附加圖是【倒地桌（完好版）】，請依此設計畫【相同方向、相同位置的破損版】。

${COVER_BASE}

【破損狀態】：桌面 3 條木板中【中間 1 條斷裂缺一塊】、邊角有彈孔焦痕、桌腳鬆動但仍立著。
方向與附加圖完全一致（桌腳朝右、桌面朝左、橫向）。

【風格】：${STYLE}
【輸出】：512×512、品紅 #FF00FF 背景

完成後存到 /Users/batman_work/claude/apps/westernBar/public/assets/F/F02_table_damaged.png 並 sips 確認。"
echo "$PROMPT_F2" | codex exec --skip-git-repo-check --image "public/assets/F/F01_table_intact.png" >/dev/null 2>&1
[ -f public/assets/F/F02_table_damaged.png ] && log "✓ F02" || log "✗ F02 失敗"

log "▶ cover F03 毀壞（用 F01 當 ref）"
mv public/assets/F/F03_table_destroyed.png public/assets/F/F03_table_destroyed.png.old 2>/dev/null
PROMPT_F3="附加圖是【倒地桌（完好版）】，請依此設計畫【毀壞版】。

${COVER_BASE}

【毀壞狀態】：桌面 3 條木板【只剩 1 條斜歪木板】、其他散落周圍、桌腳大部分斷裂、燒焦彈孔遍布、煙霧繚繞。
方向與附加圖完全一致（桌腳朝右、桌面朝左）。

【風格】：${STYLE}
【輸出】：512×512、品紅 #FF00FF 背景

完成後存到 /Users/batman_work/claude/apps/westernBar/public/assets/F/F03_table_destroyed.png 並 sips 確認。"
echo "$PROMPT_F3" | codex exec --skip-git-repo-check --image "public/assets/F/F01_table_intact.png" >/dev/null 2>&1
[ -f public/assets/F/F03_table_destroyed.png ] && log "✓ F03" || log "✗ F03 失敗"

log "==== 完成，重切 sheriff ===="
python3 scripts/slice_sheets.py 2>&1 | grep sheriff | tee -a "$LOG"
log "DONE"
