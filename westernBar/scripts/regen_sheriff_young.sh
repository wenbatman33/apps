#!/bin/bash
# 警長全 8 pose 重畫：年輕精瘦痞氣版（不要老不要胖）
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_sheriff_young.log"
REFDIR="動作解析圖檔們"
OUT_DIR="public/assets/sprites/sheriff"
mkdir -p "$OUT_DIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# ===== 角色設定（年輕精瘦版）=====
CHAR='美式西部年輕警長（帥氣痞子），【25-30 歲、絕對年輕】：
【精瘦修長體型】（fit、athletic、slim build，不准胖、不准酒肚、不准壯漢、不准老人）
劍眉、邃利眼神、稜角分明的臉、深棕色短髮（從帽簷露出一點點）、
【精緻的深棕色小八字鬍】（薄薄一條，不要濃密大鬍子）、
表情【自信邪笑、痞痞玩世不恭】（half-smile、smug、cocky）、
高鼻樑、薄唇、年輕帥氣英氣的臉龐（像 young Clint Eastwood / 年輕版西部硬漢）、
米色寬邊 cowboy hat 略歪戴、紅黑格紋襯衫（短袖捲到手肘、扣子半解）、
棕色皮背心、左胸金色五角警長星徽、藍牛仔褲（合身不寬鬆）、棕色皮靴、腰間左輪手槍套'

NO_RULES='【嚴禁】：
- 不准畫成阿公、老人、白鬍子、灰髮
- 不准畫成胖子、酒肚、圓臉、雙下巴
- 不准畫成 chibi 矮胖頭身比（不要 Q 版 1:2 那種短腿胖娃娃）
- 不准畫成大鬍子滿臉鬍鬚的山賊樣'

STYLE='3D 渲染卡通插畫風（Pixar / Sky Children of the Light 那種感覺），
【頭身比 1:4 ~ 1:4.5】（標準成年比例，不要 Q 版矮短），
軟陰影、明亮飽和色彩、無線稿、表面有 subsurface scattering'

gen_pose() {
  local name="$1" ref="$2" desc="$3" extra="${4:-}"
  local out="$OUT_DIR/$name.png"
  [ -f "$out" ] && cp "$out" "$out.bak3"
  log "▶ gen $name.png ← $(basename "$ref")"

  local prompt="附加圖是 Casio Western Bar 1984 LCD 原作場景圖。
請辨識圖中警長的【腳擺位、身體傾斜、手臂朝向、持物方向】，準確復刻。

任務：用 image_gen 工具生成【只有該警長 sprite】的 512×512 PNG，精確復刻附加圖的 pose，
但角色【必須是年輕精瘦帥氣的痞子】。

【pose 描述】：${desc}

${extra}

【角色設定（強制鎖定）】：${CHAR}

${NO_RULES}

【風格】：${STYLE}

【輸出規範】：
- 512×512 PNG
- 警長【腳底距底邊 30px、佔畫面高 80%】、置中
- 背景【純品紅 #FF00FF】（chroma-key 去背用）
- 不要場景、桌椅、地板、其他角色、文字、編號

完成後存到 /Users/batman_work/claude/apps/westernBar/$out 並 sips 縮放確認 512×512。"

  echo "$prompt" | codex exec --skip-git-repo-check --image "$ref" >>"$LOG" 2>&1
  if [ -f "$out" ]; then
    log "✓ $name.png 完成 ($(du -h "$out" | cut -f1))"
  else
    log "✗ $name.png 失敗"
  fi
}

log "===== 警長全 8 pose 重畫：年輕精瘦痞氣版 ====="

GUN_UP='【槍口方向 — 最重要】右手筆直高舉手槍、槍口【垂直朝正上方 90 度】（對著天花板的杯/瓶/盤射擊）。槍不可斜、不可朝側、不可朝下'
LEGS='【腳】兩腳必須【誇張外八張開】（倒 V，膝蓋朝外）或【交叉成 X】，絕不平行併攏'

gen_pose "action1" "$REFDIR/主角動作1.png" "Zone 1（最左邊）。年輕警長站姿，右手持槍高舉朝正上方" "$GUN_UP\n$LEGS"
gen_pose "action2" "$REFDIR/主角動作2.png" "Zone 2（左中）。年輕警長另一個誇張腳擺位"                "$GUN_UP\n$LEGS"
gen_pose "action3" "$REFDIR/主角動作3.png" "Zone 3（右中）。年輕警長另一個誇張腳擺位"                "$GUN_UP\n$LEGS"
gen_pose "action4" "$REFDIR/主角動作4.png" "Zone 4（最右邊吧台前）。年輕警長最誇張的劈腿/外八站姿"   "$GUN_UP\n$LEGS"

gen_pose "pour"    "$REFDIR/主角動作5 往地上澆熄炸彈.png" \
  "往地上澆熄炸彈：年輕警長站立、單手高舉威士忌酒瓶、向地面傾倒，琥珀色液體灑出"

gen_pose "hide"    "$REFDIR/主角動作6 進入掩蔽物.png" \
  "進入掩蔽物：年輕警長【蹲低】躲在倒地桌後、只露頭和持槍手"

gen_pose "fire"    "$REFDIR/主角動作7開槍.png" \
  "對決開槍：年輕警長站立、單手左輪手槍向【右側】（畫面右方）射擊、muzzle flash + 煙霧"

gen_pose "down"    "$REFDIR/主角動作8 失敗.png" \
  "失敗倒地：年輕警長【完全平躺】、四肢攤開、頭周圍星星圍繞、KO 表情（X 眼或翻白眼）"

log "===== 完成 ====="
