#!/bin/bash
# 只跑 action1 試樣態
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_sheriff_toy_one.log"
REFDIR="動作解析圖檔們"
OUT="public/assets/sprites/sheriff/action1.png"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

CHAR='美式西部 Q 版小警長（Toy Story 玩具總動員風格的搞笑老牛仔，喝醉的痞子）：

【整體調性 — 最重要】玩具總動員胡迪、Buzz 那種【誇張卡通搞笑感】，
這警長【會喝酒、是個痞子醉漢】，看起來【鬆鬆垮垮、隨便擺爛、有點蠢萌】，
絕對【不是模範生、不是兒童繪本陽光主角、不是有朝氣的小英雄】。

【頭身比 1:2】（大頭小身、像 Disney Tsum Tsum 那種短身體）。

【臉】：
- 圓圓的【大紅鼻子】（喝酒紅鼻頭，像 Toy Story 的酒鬼角色）
- 圓眼睛但【眼神有點呆滯渙散】（醉醺醺的樣子，不是閃亮閃亮）
- 【嘴巴張開像「哇～」或「呵～」傻笑表情】
- 【臉頰微紅】（酒上臉）
- 深棕色蓬鬆短髮從帽簷下露出一束
- 【無鬍鬚】乾淨臉

【帽】寬邊棕色 cowboy hat 微歪
【上衣】米白長袖襯衫（袖口捲） + 紅三角領巾 + 深棕色皮背心 + 左胸金色五角警長星徽
【下身】藍色合身牛仔褲褲腳反折 + 棕色高筒皮靴 + 金色五角馬刺
【腰帶】寬皮帶 + 大方扣 + 右側棕色皮槍套'

NO='【嚴禁】不要寫實成年比例、不要老人、不要有朝氣陽光小英雄感、不要 anime 美少女、不要邪笑壞人臉、不要鬍鬚'

STYLE='3D 渲染 Toy Story / Tsum Tsum 風格：圓潤無稜角、軟陰影、明亮飽和、無線稿、誇張卡通搞笑'

log "▶ gen action1.png (toy story style) ← 主角動作1.png"
[ -f "$OUT" ] && cp "$OUT" "$OUT.bak6"

PROMPT="附加圖是 Casio Western Bar 1984 LCD 原作場景（黑白）。請只用來看警長 pose 大概擺位。

任務：用 image_gen 工具生成【只有該 chibi 警長 sprite】的 512×512 PNG。

【pose】Zone 1 站姿。【槍 — 絕對】右手筆直高舉左輪手槍、槍口【垂直朝正上方 90 度】。
【腳】右腳跨在左腳前面成 X 形交叉、屁股翹一邊、像走貓步跩跩的搞笑樣。
身體微歪、表情張開嘴傻氣笑。

【角色】${CHAR}
${NO}
${STYLE}

【輸出】512×512 PNG，chibi 警長腳底距底邊 30px、佔畫面高 80%、置中，背景純品紅 #FF00FF。
完成後存到 /Users/batman_work/claude/apps/westernBar/$OUT 並 sips 縮放確認 512×512。"

echo "$PROMPT" | codex exec --skip-git-repo-check --image "$REFDIR/主角動作1.png" >>"$LOG" 2>&1

if [ -f "$OUT" ]; then
  log "✓ action1.png 完成 ($(du -h "$OUT" | cut -f1))"
else
  log "✗ action1.png 失敗"
fi
