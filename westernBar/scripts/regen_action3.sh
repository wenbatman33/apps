#!/bin/bash
# 重生警長 action3，明確要求手持槍可見
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_action3.log"
ANCHOR="public/assets/sprites/sheriff/action1.png"  # 用 action1 當風格錨點
OUT="public/assets/sprites/sheriff/action3.png"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

mv "$OUT" "$OUT.old" 2>/dev/null

CHAR='美式西部警長中年壯漢：35-42 歲、精壯、有酒肚、深棕色頭髮、深棕色八字鬍（絕對不准灰白）、紅鼻頭、米色寬邊 cowboy hat、紅黑格紋襯衫、棕色皮背心、左胸金色五角警長星徽、藍牛仔褲、棕色皮靴'

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering、明亮飽和色彩、圓潤無稜角'

log "▶ 重生 action3 — 手持左輪手槍向上舉"
PROMPT="附加圖是同一個警長角色的標準姿勢參考。

任務：生成 512×512 PNG，畫【同一位警長】的【持槍站立姿勢】。

【極度重要 — 手中必須清楚拿著左輪手槍】：
- 右手【高舉左輪手槍朝右上 45 度】，槍口清楚向上
- 槍身銀色金屬光澤、有木製握把
- 左手垂在身側自然狀態
- 雙腳並肩站立、身體微側朝右
- 表情警戒、眼神專注
- 警長【絕對要看得到槍】，不能藏起來

【角色設定】：${CHAR}

【風格】：${STYLE}（與附加圖風格一致）

【輸出】：
- 512×512、警長置中佔畫面 80%、腳底距底邊 30px
- 背景【純品紅 #FF00FF】（chroma-key 去背用）
- 無場景、桌椅、其他物件、文字

完成後存到 /Users/batman_work/claude/apps/westernBar/$OUT 並用 sips 縮放確認 512×512。"
echo "$PROMPT" | codex exec --skip-git-repo-check --image "$ANCHOR" >/dev/null 2>&1
[ -f "$OUT" ] && log "✓ action3" || log "✗ action3 失敗"

log "==== 去背 + 切完成 ===="
python3 scripts/chroma_all.py 2>&1 | grep "action3" | tee -a "$LOG"
