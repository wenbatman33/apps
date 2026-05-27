#!/bin/bash
# 警長全 8 pose 重畫：Q 版 chibi 3D 卡通可愛風（依使用者參考圖描述）
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_sheriff_chibi.log"
REFDIR="動作解析圖檔們"
OUT_DIR="public/assets/sprites/sheriff"
mkdir -p "$OUT_DIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# ===== 角色設定（Q 版 chibi 可愛勇敢小牛仔）=====
CHAR='美式西部 Q 版小警長 chibi 角色：
【頭身比 1:2】（大頭、小身體、短手短腳，像 Pixar / Disney Tsum Tsum / Mario 那種可愛 chibi）。

【臉】：大圓眼睛（黑色閃亮瞳孔）、小巧鼻子（紅紅圓圓）、嘴巴小張開帶活潑表情、
胖嘟嘟圓臉、【無鬍鬚 — 乾淨年輕娃娃臉】、深棕色蓬鬆短髮從帽簷下露出一束。

【帽】：寬邊棕色 cowboy hat（帽簷向上微捲）、帽身有深棕色帶子。

【上衣】：米白色長袖襯衫（袖子捲到手肘）、頸間繫【紅色三角領巾】、
外罩【深棕色（接近黑）皮背心】、左胸別【金色五角警長星徽（大顆顯眼）】。

【下身】：藍色合身牛仔褲、褲腳【反折一截】露出白色內襯、
腳踩棕色高筒皮靴、靴跟【金色五角馬刺】。

【腰帶】：寬皮帶 + 金色大方扣 + 右側棕色皮槍套。

【右手】：握黑色左輪手槍。
【表情】：可愛勇敢、興奮、嘴巴張開喊「ha!」的活潑狀，不是痞氣不是邪笑。'

NO_RULES='【嚴禁】：
- 不准畫成寫實成年人比例（不要 1:4 修長體型）
- 不准畫成阿公、老人、胖子、酒肚、雙下巴
- 不准畫成痞氣邪笑、半瞇眼壞人臉
- 不准畫八字鬍、大鬍子、絡腮鬍
- 不准畫成 anime 美少女、不是日系風'

STYLE='【風格 — 嚴格鎖定】3D 渲染卡通 chibi 風格，
像 Pixar Toy Story 玩具總動員、Mario Odyssey 超級瑪利歐、Disney Tsum Tsum 那種：
- 圓潤無稜角、軟陰影、subsurface scattering
- 明亮飽和色彩、粉色頰紅一抹
- 無線稿、無漫畫線
- 整體可愛 cute，不要寫實'

gen_pose() {
  local name="$1" ref="$2" desc="$3" extra="${4:-}"
  local out="$OUT_DIR/$name.png"
  [ -f "$out" ] && cp "$out" "$out.bak4"
  log "▶ gen $name.png ← $(basename "$ref")"

  local prompt="附加圖是 Casio Western Bar 1984 LCD 原作場景圖（黑白），用來看警長【pose 擺位】。
請辨識圖中警長的腳、身體、手臂朝向，但角色【外觀風格】完全照下面文字描述（不要照 LCD 黑白風）。

任務：用 image_gen 工具生成【只有該警長 Q 版 chibi sprite】的 512×512 PNG。

【pose 描述】：${desc}

${extra}

【角色設定（極度重要 — 逐項都要遵守）】：
${CHAR}

${NO_RULES}

${STYLE}

【輸出規範】：
- 512×512 PNG
- chibi 警長【腳底距底邊 30px、佔畫面高 80%】、置中
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

log "===== 警長全 8 pose 重畫：Q 版 chibi 可愛風 ====="

GUN_UP='【槍方向】右手筆直高舉手槍、槍口【垂直朝正上方 90 度】'
LEGS='【腳】兩腳【誇張外八張開】（呈倒 V，膝蓋朝外）或【交叉成 X】，可彎一膝。絕對不平行併攏'

gen_pose "action1" "$REFDIR/主角動作1.png" "Zone 1（最左邊）chibi 小警長站姿"     "$GUN_UP\n$LEGS"
gen_pose "action2" "$REFDIR/主角動作2.png" "Zone 2（左中）chibi 小警長另一誇張腳擺位" "$GUN_UP\n$LEGS"
gen_pose "action3" "$REFDIR/主角動作3.png" "Zone 3（右中）chibi 小警長另一誇張腳擺位" "$GUN_UP\n$LEGS"
gen_pose "action4" "$REFDIR/主角動作4.png" "Zone 4（最右邊）chibi 小警長劈腿/外八站姿" "$GUN_UP\n$LEGS"

gen_pose "pour"    "$REFDIR/主角動作5 往地上澆熄炸彈.png" \
  "chibi 小警長【單手高舉威士忌酒瓶、向地面傾倒】，琥珀色液體灑出"

gen_pose "hide"    "$REFDIR/主角動作6 進入掩蔽物.png" \
  "chibi 小警長【蹲低】躲在掩體後，只露頭和持槍手，眼神警戒"

gen_pose "fire"    "$REFDIR/主角動作7開槍.png" \
  "chibi 小警長【側身單手持左輪手槍向畫面右側射擊】、muzzle flash + 煙霧，腳前後岔開射擊樁步"

gen_pose "down"    "$REFDIR/主角動作8 失敗.png" \
  "chibi 小警長【完全平躺、四肢攤開】、頭周圍星星圍繞、KO 表情（X 眼/翻白眼）"

log "===== 完成 ====="
