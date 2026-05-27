#!/bin/bash
# Western Bar v6 夜間批次 — 所有元件用 LCD 參考圖做 image-to-image 轉 Pixar 3D
# 用法: ./scripts/batch_v6.sh (背景跑) 或 bash scripts/batch_v6.sh
set -u
cd "$(dirname "$0")/.."

LOG="scripts/batch_v6.log"
mkdir -p public/assets/{A,B,C,D,E,F,G,H,I,J,K,L,M} 2>/dev/null

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

log "==== v6 batch start ===="

# ---------------- helper: gen + verify + retry ----------------
gen_with_ref() {
  local out="$1" ref="$2" prompt="$3" tries=0
  while [ $tries -lt 2 ]; do
    log "▶ gen $out (try $((tries+1)))"
    echo "$prompt" | codex exec --skip-git-repo-check --image "$ref" >/dev/null 2>&1
    if [ -f "$out" ] && [ -s "$out" ]; then
      log "✓ $out generated"
      return 0
    fi
    tries=$((tries+1))
  done
  log "✗ $out FAILED after $tries tries"
  return 1
}

gen_no_ref() {
  local out="$1" prompt="$2" tries=0
  while [ $tries -lt 2 ]; do
    log "▶ gen $out (no-ref, try $((tries+1)))"
    codex exec --skip-git-repo-check "$prompt" >/dev/null 2>&1
    if [ -f "$out" ] && [ -s "$out" ]; then
      log "✓ $out generated"
      return 0
    fi
    tries=$((tries+1))
  done
  log "✗ $out FAILED"
  return 1
}

# ---------------- Pixar 風格 prompt 模板 ----------------
STYLE='Pixar / Disney / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering 質感、明亮飽和色彩、圓潤無稜角、Q 版大頭比例。'

# ============================================================
# 1) 通緝犯 sprite sheet (3x2 = 6 poses)
# ============================================================
log "==== 1/7 bandit sprite sheet ===="
gen_with_ref \
  "public/assets/E/bandit_spritesheet.png" \
  "analysis/reference/bandit_duel.png" \
  "請用 image_gen 工具產一張 1536x1024 PNG。

附加的參考圖是 Casio Western Bar (1984 LCD 遊戲) 原作的通緝犯（壞人）動作 reference。

任務：把這些黑白 LCD 動作完整轉換成 ${STYLE}的彩色 sprite sheet。

【角色設定】兇悍的西部通緝犯：戴黑色寬邊帽、紅色 bandana 蓋下半臉、髒兮兮灰白襯衫 + 棕色皮背心、子彈帶、深色褲、棕靴、手持手槍。Q版 chibi 比例但兇狠表情。

【sprite sheet 排版】嚴格 3 列 × 2 行 = 6 格網格，每格內一個彩色 Pixar 風通緝犯：
- (1,1) 進場走入（從左門進來的姿勢）
- (1,2) 探頭高 peek (head up high, looking around)
- (1,3) 探頭低 peek (crouched low, peeking)
- (2,1) 舉槍瞄準 (aim, gun raised, focused face)
- (2,2) 中槍反應 (recoiling, arms flailing, surprised)
- (2,3) 倒地敗北 (fallen, X eyes, hat off)

純白色背景、格間用淡白色細直線分隔。不要文字、不要編號。

完成後複製到 /Users/batman_work/claude/apps/westernBar/public/assets/E/bandit_spritesheet.png 並 sips 縮放到 1536x1024。"

# ============================================================
# 2) 夫婦 sprite sheet (3x2 = 6 poses)
# ============================================================
log "==== 2/7 couple sprite sheet ===="
gen_with_ref \
  "public/assets/D/couple_spritesheet.png" \
  "analysis/reference/couple_lcd.png" \
  "請用 image_gen 工具產一張 1536x1024 PNG。

附加的參考圖是 Casio Western Bar 原作的夫婦客人動作 reference（一對在酒吧桌邊吃飯的男女客人）。

任務：${STYLE} 轉換成彩色 sprite sheet。

【角色設定】坐在酒吧桌邊的夫婦：
- 男：中年大鬍子、藍色格紋衫、吊帶褲、棕色帽
- 女：包頭髮型、洋裝（粉色或紫色）、圍裙

【sprite sheet 排版】嚴格 3 列 × 2 行 = 6 格，男與女各 3 個狀態：
- (1,1) 男 eat — 低頭吃東西、安靜
- (1,2) 男 alert — 抬頭瞪眼、生氣、頭上 !! 標記
- (1,3) 男 throw — 站起、手往前丟蘋果
- (2,1) 女 eat — 低頭吃、平靜
- (2,2) 女 alert — 抬頭、憤怒、頭上 !! 標記
- (2,3) 女 throw — 站起手往前丟蘋果

純白背景、格間細直線、不要文字編號。

完成後複製到 /Users/batman_work/claude/apps/westernBar/public/assets/D/couple_spritesheet.png 並 sips 縮放到 1536x1024。"

# ============================================================
# 3) 酒保 sprite sheet (3x1 = 3 poses)
# ============================================================
log "==== 3/7 barman sprite sheet ===="
gen_with_ref \
  "public/assets/C/barman_spritesheet.png" \
  "analysis/reference/barman_lcd.png" \
  "請用 image_gen 工具產一張 1536x512 PNG。

附加的參考圖是 Casio Western Bar 原作的酒保 reference。

任務：${STYLE} 轉換成彩色 sprite sheet。

【角色設定】友善大叔型酒保：白髮 / 灰白八字鬍、白襯衫 + 棕色背心 + 領結、白圍裙、站在吧台後。

【sprite sheet 排版】3 列 × 1 行 = 3 格：
- (1) idle — 站在吧台後擦杯子、平常待機
- (2) throw — 手往左丟杯子的姿勢（throwing mug/bottle leftward）
- (3) catch bomb — 手往前接住點燃的炸彈、緊張表情

純白背景、格間細直線、不要文字。

完成後複製到 /Users/batman_work/claude/apps/westernBar/public/assets/C/barman_spritesheet.png 並 sips 縮放到 1536x512。"

# ============================================================
# 4) 物品 sprite sheet (酒杯/瓶/盤 完整+碎裂)
# ============================================================
log "==== 4/7 items sprite sheet ===="
gen_with_ref \
  "public/assets/G/items_spritesheet.png" \
  "analysis/reference/items_lcd_top.png" \
  "請用 image_gen 工具產一張 1024x1024 PNG。

附加的參考圖是 Casio Western Bar 原作的酒吧物品 reference（杯/瓶/盤 等酒保拋出的物件）。

任務：${STYLE} 轉換成 sprite sheet。

【sprite sheet 排版】嚴格 4 列 × 2 行 = 8 格，每格 ~256x512 px，西部酒吧物品：
- (1,1) cup 完整啤酒杯
- (1,2) cup_broken 碎裂啤酒杯（陶瓷碎片）
- (1,3) bottle 完整威士忌綠瓶
- (1,4) bottle_broken 碎裂綠瓶（玻璃碎片）
- (2,1) plate 完整白盤
- (2,2) plate_broken 碎裂白盤
- (2,3) bonus_bottle 特殊金色獎勵酒瓶（閃亮）
- (2,4) apple 紅蘋果（顧客丟的）

每格單一物品置中、純白背景、格間細直線。不要文字。

完成後複製到 /Users/batman_work/claude/apps/westernBar/public/assets/G/items_spritesheet.png 並 sips 縮放到 1024x1024。"

# ============================================================
# 5) 桌子掩體 sprite sheet (3 個耐久階段)
# ============================================================
log "==== 5/7 table cover sprite sheet ===="
gen_no_ref \
  "public/assets/F/table_spritesheet.png" \
  "請用 image_gen 工具產一張 1536x512 PNG。

${STYLE} 風格、3 個西部木桌（倒立用作掩體的桌子，3 節木板組成）的不同毀損階段。

【sprite sheet 排版】3 列 × 1 行 = 3 格：
- (1) intact — 完整無損的橫向倒立木桌、3 節木板都在
- (2) damaged — 中間 1 節木板已破洞 / 子彈孔
- (3) destroyed — 桌子完全碎裂、木屑散落地上

純白背景、格間細直線、單張物件置中。不要文字。

完成後複製到 /Users/batman_work/claude/apps/westernBar/public/assets/F/table_spritesheet.png 並 sips 縮放到 1536x512。"

# ============================================================
# 6) 炸彈 + 效果 sprite sheet
# ============================================================
log "==== 6/7 dynamite + effects sprite sheet ===="
gen_with_ref \
  "public/assets/I/effects_spritesheet.png" \
  "analysis/reference/dynamite_lcd.png" \
  "請用 image_gen 工具產一張 1536x512 PNG。

附加的參考圖是 Casio Western Bar 原作的炸彈 reference。

任務：${STYLE} 轉換成 sprite sheet。

【sprite sheet 排版】4 列 × 1 行 = 4 格：
- (1) dynamite_lit — 紅色炸藥筒 + 點燃的引信、火花
- (2) dynamite_ground — 炸藥落地、引信熊熊燃燒、地上煙霧
- (3) explosion — 漫畫風 BOOM 爆炸星型、黃橙紅
- (4) whiskey_pour — 棕色酒瓶傾倒中、琥珀色液體噴湧而下

純白背景、格間細直線、單張物件。

完成後複製到 /Users/batman_work/claude/apps/westernBar/public/assets/I/effects_spritesheet.png 並 sips 縮放到 1536x512。"

# ============================================================
# 7) 純空背景 (L1-L10) — 用 prompt 直接生，嚴格禁止人物
# ============================================================
log "==== 7/7 empty backgrounds (10 levels) ===="

BG_STYLE="${STYLE} 視角：45° 俯視，門在左側牆面（不是後牆上方），後牆有 WANTED \$25,000 海報、SALOON 招牌、酒瓶架，中段有圓桌 + 椅子 + 木桶（empty），下方木板地板透視。**ABSOLUTELY NO PEOPLE, NO CHARACTERS, NO HUMANS, NO COWBOYS, NO FIGURES in the scene** — completely empty saloon interior。"

declare -a BG_LEVELS=(
  "A01_bg_L1_day:晴天白晝、溫暖陽光從門外灑入"
  "A02_bg_L2_afternoon:午後橘黃陽光、影子拉長"
  "A03_bg_L3_dusk:黃昏粉紫天色、油燈點亮"
  "A04_bg_L4_night:夜晚深藍背景、燈籠暖光"
  "A05_bg_L5_rain:雨夜、窗外雨絲、冷藍色調"
  "A06_bg_L6_dust:沙塵暴外景、土黃灰塵感"
  "A07_bg_L7_minetown:礦鎮酒吧、牆掛十字鎬燈籠"
  "A08_bg_L8_abandoned:廢棄破敗、蜘蛛網、灰塵"
  "A09_bg_L9_storm:暴風雨夜、閃電從窗外打入"
  "A10_bg_L10_final:頭目決戰、紅天鵝絨帷幕、戲劇打光"
)

for entry in "${BG_LEVELS[@]}"; do
  IFS=':' read -r id desc <<< "$entry"
  out="public/assets/A/${id}.png"
  if [ -f "$out" ] && [ -s "$out" ]; then
    log "⏭  $id (exists)"
    continue
  fi
  gen_no_ref "$out" \
    "請用 image_gen 工具產一張 1536x1024 PNG。

主題：**完全空的西部酒吧內部場景**（${desc}）。${BG_STYLE}

完成後複製到 /Users/batman_work/claude/apps/westernBar/${out} 並 sips 縮放到 1536x1024。"
done

log "==== v6 sheets done, slicing... ===="
python3 scripts/slice_v6.py 2>&1 | tee -a "$LOG"

log "==== v6 batch ALL DONE ===="
log "Generated PNGs:"
find public/assets -name '*.png' | sort | tee -a "$LOG"
