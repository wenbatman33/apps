#!/bin/bash
# 警長全 8 pose：勇敢小牛仔 chibi（依使用者新參考圖：帽簷有金星徽、無醉漢感）
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_sheriff_brave.log"
REFDIR="動作解析圖檔們"
OUT_DIR="public/assets/sprites/sheriff"
mkdir -p "$OUT_DIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# ===== 角色設定：勇敢卡通小牛仔（chibi）=====
CHAR='美式西部 Q 版小警長 chibi 卡通角色（勇敢可愛的小男孩牛仔）：

【整體】像 Pixar / Toy Story / Disney 那種【3D 渲染 chibi 卡通風】，
頭身比【1:2】（大頭小身、短手短腳），看起來像個【活潑勇敢的小英雄】。

【臉】：
- 大圓眼睛（深棕色瞳孔 + 白色高光）、眉毛上揚
- 【嘴巴小張像「oh!」驚訝/喊話的活潑表情】
- 小巧的鼻子（粉粉的，【不是大紅鼻】）
- 兩頰一抹自然粉紅
- 【無鬍鬚、乾淨臉】
- 深棕色蓬鬆短髮從帽簷下露出一束（像胡迪的髮型）
- 【絕對不要醉漢感、不要邪笑、不要痞氣】

【帽 — 重點】寬邊【深棕色 cowboy hat】，帽簷正前方有【一顆大顆金色五角星徽】（hat star）、
帽身有皮帶飾，邊緣略有捲翹。

【上衣】：米白色長袖襯衫（袖子捲到手肘）、頸間【紅色三角領巾】、
外罩【深棕色（接近黑）皮背心】、左胸別【金色五角警長星徽】（vest star，與帽星徽相對應）。

【下身】：藍色合身牛仔褲、褲腳【反折一截】露淺色內襯、
腳踩【棕色高筒皮靴】、靴跟【金色五角馬刺】。

【腰帶】：寬棕皮帶 + 大方形金扣 + 右側【棕色皮槍套】。

【右手】：握黑色 + 木柄左輪手槍。'

NO_RULES='【嚴禁】：
- 不要醉漢、大紅鼻、半瞇眼
- 不要痞氣邪笑、壞人表情
- 不要鬍鬚（八字鬍/絡腮鬍）
- 不要寫實成年比例（不要 1:4 修長）
- 不要老人灰髮
- 不要 anime 美少女'

STYLE='3D 渲染卡通 chibi 風格（Pixar Toy Story / Mario / Disney Tsum Tsum 風）：
- 圓潤無稜角、軟陰影、subsurface scattering
- 明亮飽和色彩、無線稿
- 表面光滑像玩具
- 表情戲劇化、可愛活潑'

gen_pose() {
  local name="$1" ref="$2" desc="$3"
  local out="$OUT_DIR/$name.png"
  [ -f "$out" ] && cp "$out" "$out.bak7"
  log "▶ gen $name.png ← $(basename "$ref")"

  local prompt="附加圖是 Casio Western Bar 1984 LCD 原作場景（黑白）。請只用來看警長 pose 大概擺位（腳、身體、手臂朝向）。

任務：用 image_gen 工具生成【只有該 chibi 警長 sprite】的 512×512 PNG。

【pose 描述】${desc}

【角色設定（極度重要，逐項遵守）】：
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

log "===== 警長 8 pose：勇敢小牛仔 chibi ====="

GUN_UP='【槍】右手筆直高舉左輪手槍、槍口【垂直朝正上方 90 度】（對著天花板瞄準）'

gen_pose "action1" "$REFDIR/主角動作1.png" \
  "Zone 1（最左邊）。${GUN_UP}。【腳】右腳跨左腳前成 X 形交叉、屁股翹一邊、側身。表情活潑張嘴喊"

gen_pose "action2" "$REFDIR/主角動作2.png" \
  "Zone 2（左中）。${GUN_UP}。【腳】左腳前跨大步、右腳後彎膝、像舞步動作。表情驚訝張嘴"

gen_pose "action3" "$REFDIR/主角動作3.png" \
  "Zone 3（右中）。${GUN_UP}。【腳】兩腳誇張外八張開呈倒 V、膝蓋朝外、屁股翹後。表情用力喊"

gen_pose "action4" "$REFDIR/主角動作4.png" \
  "Zone 4（最右邊吧台前）。${GUN_UP}。【腳】一腳踮腳尖前傾、一腳後彎、像跨大步衝刺。表情興奮"

gen_pose "pour"    "$REFDIR/主角動作5 往地上澆熄炸彈.png" \
  "chibi 警長【單手高舉威士忌酒瓶（棕色玻璃）、向地面傾倒】，琥珀色液體灑出。另一手握槍。【表情專注用力】"

gen_pose "hide"    "$REFDIR/主角動作6 進入掩蔽物.png" \
  "chibi 警長【完全蹲低】躲在掩體後、只露頭頂與帽和持槍手。眼神警戒往外瞄"

gen_pose "fire"    "$REFDIR/主角動作7開槍.png" \
  "chibi 警長【側身單手持左輪手槍向畫面右方射擊】、槍口 muzzle flash + 煙、腳前後岔開射擊樁步。表情用力咬牙瞄準"

gen_pose "down"    "$REFDIR/主角動作8 失敗.png" \
  "chibi 警長【完全平躺、四肢攤開】、頭周圍小星星圍繞、KO 表情（X 眼 / 翻白眼）、舌頭吐出"

log "===== 全部完成 ====="
