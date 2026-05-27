#!/bin/bash
# 警長：Toy Story 搞笑感老牛仔 chibi，槍朝正上，腳每個 zone 不同搞笑姿態
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_sheriff_toy.log"
REFDIR="動作解析圖檔們"
OUT_DIR="public/assets/sprites/sheriff"
mkdir -p "$OUT_DIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# ===== 角色設定：Toy Story 搞笑風醉漢小牛仔 chibi =====
CHAR='美式西部 Q 版小警長（Toy Story 玩具總動員風格的搞笑老牛仔，喝醉的痞子）：

【整體調性 — 最重要】玩具總動員胡迪、Buzz 那種【誇張卡通搞笑感】，
這警長【會喝酒、是個痞子醉漢】，看起來【鬆鬆垮垮、隨便擺爛、有點蠢萌】，
絕對【不是模範生、不是兒童繪本陽光主角、不是有朝氣的小英雄】。

【頭身比 1:2】（大頭小身、像 Disney Tsum Tsum 那種短身體）。

【臉】：
- 圓圓的【大紅鼻子】（喝酒紅鼻頭，像 Toy Story 的酒鬼角色）
- 圓眼睛但【眼神有點呆滯渙散】（醉醺醺的樣子，不是閃亮閃亮）
- 【嘴巴張開像「哇～」或「呵～」傻笑表情】（驚訝、傻氣、不是 eager 的「ya!」笑容）
- 【臉頰微紅】（酒上臉）
- 深棕色蓬鬆短髮從帽簷下露出一束（像胡迪的髮型）
- 【無鬍鬚】乾淨臉
- 整體看起來像一個喝醉的傻氣老牛仔玩具

【帽】：寬邊棕色 cowboy hat（帽簷上翻有點歪）、帽身有深棕色帶子。

【上衣】：米白色長袖襯衫（袖子捲到手肘）、頸間【紅色三角領巾】、
外罩【深棕色皮背心】、左胸別【金色五角警長星徽】。

【下身】：藍色合身牛仔褲、褲腳【反折一截】露出灰色內襯、
腳踩【棕色高筒皮靴】、靴跟【金色五角馬刺】。

【腰帶】：寬皮帶 + 大方扣 + 右側棕色皮槍套。'

NO_RULES='【嚴禁】：
- 不要畫成寫實成年比例（不要 1:4）
- 不要畫成阿公或老人灰髮
- 不要畫成兒童繪本主角的有朝氣陽光形象
- 不要畫成 anime 美少女
- 不要畫成痞氣邪笑壞人臉
- 不要畫八字鬍、大鬍子
- 不要過度寫實'

STYLE='【風格】3D 渲染、Pixar 玩具總動員（Toy Story）/Tsum Tsum 風格：
圓潤無稜角、軟陰影、subsurface scattering、明亮飽和色彩、無線稿。
誇張卡通、搞笑、表情戲劇化'

gen_pose() {
  local name="$1" ref="$2" desc="$3"
  local out="$OUT_DIR/$name.png"
  [ -f "$out" ] && cp "$out" "$out.bak5"
  log "▶ gen $name.png ← $(basename "$ref")"

  local prompt="附加圖是 Casio Western Bar 1984 LCD 原作場景（黑白）。請只用來看警長【腳擺位】。

任務：用 image_gen 工具生成【只有該 chibi 警長 sprite】的 512×512 PNG。

【pose 描述 — 必須照做】：${desc}

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

log "===== 警長 8 pose 重畫：Toy Story 搞笑醉漢 chibi 版 ====="

# === 槍朝上 + 每個 zone 不同搞笑腳擺位 ===
GUN='【槍 — 絕對】右手筆直高舉左輪手槍、槍口【垂直朝正上方 90 度】（對天花板瞄準）'

gen_pose "action1" "$REFDIR/主角動作1.png" \
  "Zone 1 站姿。$GUN。【腳】右腳跨在左腳前面成 X 形交叉、屁股翹一邊、像走貓步跩跩的搞笑樣。身體微歪、表情傻氣張嘴"

gen_pose "action2" "$REFDIR/主角動作2.png" \
  "Zone 2 站姿。$GUN。【腳】左腳往前跨大步、右腳留後膝蓋微彎、像跳舞舞步那種搞笑樣。表情張嘴傻笑"

gen_pose "action3" "$REFDIR/主角動作3.png" \
  "Zone 3 站姿。$GUN。【腳】兩腳【誇張外八張開】呈倒 V 形（像被狙擊手射中蹲低瞬間），膝蓋朝外彎、屁股翹後。搞笑誇張"

gen_pose "action4" "$REFDIR/主角動作4.png" \
  "Zone 4 站姿。$GUN。【腳】一腳踮腳尖向前、一腳後彎像跌倒中。【整體有點站不穩搖晃感】（喝醉的樣子）。表情更傻"

gen_pose "pour"    "$REFDIR/主角動作5 往地上澆熄炸彈.png" \
  "chibi 醉漢警長【單手高舉威士忌酒瓶、往地面傾倒】，琥珀色液體灑出。【表情滿足傻笑】（澆酒對他來說很開心）。腳隨便站搖搖"

gen_pose "hide"    "$REFDIR/主角動作6 進入掩蔽物.png" \
  "chibi 警長【完全蹲低】躲在掩體後，只露頭頂與帽和持槍手。【表情驚慌張嘴】，眼神警戒往外瞄"

gen_pose "fire"    "$REFDIR/主角動作7開槍.png" \
  "chibi 警長【側身單手持左輪手槍向畫面右方射擊】，槍口有 muzzle flash + 煙。腳呈射擊樁步（一前一後）。表情用力咬牙"

gen_pose "down"    "$REFDIR/主角動作8 失敗.png" \
  "chibi 警長【完全平躺、四肢攤開】，頭周圍小星星圍繞、KO 表情（X 眼或翻白眼）、舌頭吐出。搞笑誇張倒地樣"

log "===== 完成 ====="
