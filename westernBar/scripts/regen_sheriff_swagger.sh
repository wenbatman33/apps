#!/bin/bash
# 重畫警長 action1-4：強化 LCD 原作的「痞痞、腳張開/交叉」走路風格
# 依照「動作解析圖檔們/主角動作1-4.png」LCD 原圖逐一仿製
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_sheriff_swagger.log"
REFDIR="動作解析圖檔們"
OUT_DIR="public/assets/sprites/sheriff"
mkdir -p "$OUT_DIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

CHAR='美式西部警長（喝醉的痞痞風格），35-45 歲【中年壯漢，絕對不是阿公】：
精壯、有酒肚、深棕色頭髮、【深棕色八字鬍】（絕對不准灰白）、紅鼻頭（喝醉樣）、
半瞇眼/邪笑表情（痞氣）、米色寬邊 cowboy hat 微歪戴、紅黑格紋襯衫（短袖捲起、扣子半解開）、
棕色皮背心、左胸金色五角警長星徽、藍牛仔褲、棕色皮靴、腰間左輪手槍套。
姿態散漫、肩膀略歪、神情玩世不恭'

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering、明亮飽和色彩、圓潤無稜角、無線稿、Q版頭身比 1:2.2'

LEG_RULE='【腳步動作極重要 — 必須像 LCD 原作那樣誇張交叉或張開】
這是醉漢搖搖晃晃走路的痞氣姿態，雙腳【絕對不可以平行併攏站好】：
- 兩腳必須【明顯交叉】（一腳跨在另一腳前面、形成 X 型）
- 或【誇張外八張開】（兩腳呈倒 V，膝蓋朝外）
- 膝蓋微彎、重心歪一邊、屁股翹一邊
- 整體姿態散漫、玩世不恭，像痞子警長
請完全照附加圖中 LCD 原作那個誇張腳步擺位復刻，不要改回正常站姿'

gen_pose() {
  local name="$1" ref="$2" desc="$3"
  local out="$OUT_DIR/$name.png"
  [ -f "$out" ] && cp "$out" "$out.bak"
  log "▶ gen $name.png ← $(basename "$ref")"

  local prompt="附加圖是 Casio Western Bar 1984 LCD 原作場景圖。
請辨識圖中【主角警長】的【腳的位置擺位 — 交叉？外八？哪隻腳前哪隻腳後？】、身體傾斜角度、手臂位置、頭朝向。

任務：用 image_gen 工具生成【只有該警長 sprite】的 512×512 PNG，
【精確復刻原作該 pose 的腳步擺位】（這是這次重畫的核心）。

【pose 描述】：
${desc}

${LEG_RULE}

【角色設定（強制鎖定）】：
${CHAR}

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

log "===== 警長 action1-4 重畫（痞痞風 + 腳交叉/張開）====="

gen_pose "action1" "$REFDIR/主角動作1.png" "Zone 1：站在最左邊 — 看 LCD 原作那隻腳跨在哪、身體往哪歪"
gen_pose "action2" "$REFDIR/主角動作2.png" "Zone 2：往右走一格 — 另一個誇張腳步擺位"
gen_pose "action3" "$REFDIR/主角動作3.png" "Zone 3：再往右一格 — 另一個誇張腳步擺位"
gen_pose "action4" "$REFDIR/主角動作4.png" "Zone 4：站在最右邊吧台前 — 醉漢叉腰或痞氣站姿，腳要交叉或外八"

log "===== 完成 ====="
log "請在遊戲中查看，覺得不對再 cp *.bak 還原"
