#!/bin/bash
# 主角 sprite sheet 兩階段生成：A 用 LCD 全圖當 ref，B 用 A 當 ref 保持風格一致
set -u
cd "$(dirname "$0")/.."

LOG="scripts/gen_player_sheet.log"
OUTDIR="public/assets/sheets"
mkdir -p "$OUTDIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# 統一角色設定（A、B 兩張都用同一份）
CHAR='醉酒老警長 sheriff：
- 五十多歲、瘦削有酒肚
- 大八字「白」鬍子（兩端翹起）、紅鼻頭（酒鬼特徵）
- 米色寬邊 cowboy hat（帽帶咖啡色）
- 紅黑格紋襯衫、棕色皮背心、左胸金色五角警長星徽
- 藍色牛仔褲、棕色皮靴、腰間左側棕色皮槍套（內含左輪手槍）
- Q 版頭身比 1:2（大頭、短腿）'

STYLE='Pixar / Disney / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering、明亮飽和色彩、圓潤無稜角、無線稿'

# ====== Sheet A：idle / walk1 / walk2 / walk3 ======
OUT_A="$OUTDIR/player_sheet_A.png"
if [ ! -f "$OUT_A" ]; then
  log "▶ gen player_sheet_A.png (4 poses, ref=全部物件.png)"
  PROMPT_A="附加圖是 Casio Western Bar 1984 LCD 原作完整解析圖，標示主角各個動作位置。

任務：請用 image_gen 工具生成一張【1024×1024 PNG】sprite sheet，2 欄 × 2 列，
每格 512×512，畫出主角警長的 4 個基本動作。

【極度重要：4 格內必須是「完全同一個角色」】
- 同一張臉、同一個鬍子形狀、同一個髮型、同一套服裝、同一個體型
- 想像是同一個演員拍 4 張定裝照，只有 pose 不同，角色本身一模一樣
- 顏色、配件、比例 100% 一致

【角色設定（4 格共用）】：
${CHAR}

【格子內容】：
左上 (idle)   ：站立、雙手垂下、面向正前方、表情微醺
右上 (walk1)  ：左腳邁出、右手前擺，走路第 1 frame
左下 (walk2)  ：雙腳交叉中間、手臂自然擺動
右下 (walk3)  ：右腳邁出、左手前擺，走路第 3 frame

【風格】：${STYLE}

【輸出規範 — 嚴格遵守】：
- 1024×1024 整張，2×2 網格，【每格嚴格 512×512】
- 背景【純品紅 #FF00FF】（之後 chroma-key 去背）
- 每格主角【水平置中】、【腳底距格底 40px】、【全身入鏡】
- 無格線、無編號、無文字、無浮水印
- 4 格主角朝向一律【面向觀眾或微側】，不要背面
- 主角佔格高約 80%（~410px）

完成後存到 /Users/batman_work/claude/apps/westernBar/$OUT_A
並用 sips 確認最終為 1024×1024。"
  echo "$PROMPT_A" | codex exec --skip-git-repo-check --image "動作解析圖檔們/全部物件.png" >/dev/null 2>&1
  if [ -f "$OUT_A" ]; then log "✓ A 完成"; else log "✗ A 失敗"; exit 1; fi
else
  log "⏭  A 已存在，跳過"
fi

# ====== Sheet B：pour / hide / fire / hit — 用 A 當 ref 保持風格 ======
OUT_B="$OUTDIR/player_sheet_B.png"
if [ ! -f "$OUT_B" ]; then
  log "▶ gen player_sheet_B.png (4 poses, ref=player_sheet_A.png)"
  PROMPT_B="附加圖是剛剛生成的主角警長 sprite sheet（4 個基本動作）。

任務：請用 image_gen 工具生成一張【1024×1024 PNG】sprite sheet，2 欄 × 2 列，
每格 512×512，畫出【同一位主角】的另外 4 個動作。

【極度重要：與附加圖內 4 格主角必須完全同一人】
- 100% 沿用附加圖中主角的：臉型、鬍子（白色八字）、紅鼻頭、cowboy hat、紅黑格紋衫、皮背心、星徽、牛仔褲、皮靴、槍套
- 想像是同一個演員，這是第 5–8 張定裝照
- 任何顏色、比例、配件都不可變

【角色設定（再次強調）】：
${CHAR}

【格子內容】：
左上 (pour whiskey)：手持「威士忌酒瓶」向地面傾倒，琥珀色液體灑下，表情專注
右上 (hide table) ：蹲低躲在【倒立的木桌】後面，只露頭、帽子和持槍手，手槍伸出桌緣
左下 (fire)       ：右手左輪手槍朝右上 45 度開火，槍口大 muzzle flash、煙霧，左手反作用力後甩
右下 (hit)        ：中彈反應 — 頭髮帽子炸開、淚珠四濺、嘴大張、雙手揮舞、滑稽 Q 版痛感

【風格】：${STYLE}（與附加圖完全相同的風格 / 色調 / 比例）

【輸出規範 — 嚴格遵守】：
- 1024×1024 整張，2×2 網格，【每格嚴格 512×512】
- 背景【純品紅 #FF00FF】（與附加圖相同）
- 每格主角【水平置中】、【腳底/底部距格底 40px】
- 無格線、無編號、無文字、無浮水印
- 主角佔格高約 80%

完成後存到 /Users/batman_work/claude/apps/westernBar/$OUT_B
並用 sips 確認最終為 1024×1024。"
  echo "$PROMPT_B" | codex exec --skip-git-repo-check --image "$OUT_A" >/dev/null 2>&1
  if [ -f "$OUT_B" ]; then log "✓ B 完成"; else log "✗ B 失敗"; exit 1; fi
else
  log "⏭  B 已存在，跳過"
fi

log "==== 完成 ===="
ls -la "$OUTDIR/"
