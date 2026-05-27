#!/bin/bash
# 重生 A26 為「圓桌 + 椅子（左右各一）+ 桌上食物」整套圖
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_couple_table.log"
ANCHOR="public/assets/lcd_remaster_v1.png"
OUT="public/assets/A/A26_round_table.png"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

mv "$OUT" "$OUT.old" 2>/dev/null

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、明亮飽和色彩、圓潤無稜角'

log "▶ 重生 A26 — 圓桌 + 椅子 + 食物"
PROMPT="附加圖是西部酒吧場景參考。

任務：生成 512×512 PNG，畫一組【西部酒吧用餐套組】物件置中。

【內容必須齊全】：
1. 中央一張【大型圓形木餐桌】（深棕色木質、4 條粗腿、桌面有花紋）
2. 桌子左側一張【小木椅】，【椅子面向桌子】：椅背在【最左外側】、座位開口朝右（朝桌子），人坐下時面朝右向桌子
3. 桌子右側一張【小木椅】，【椅子面向桌子】：椅背在【最右外側】、座位開口朝左（朝桌子），人坐下時面朝左向桌子
   ✗ 不准椅背在內側（朝桌子）— 那會變成人背對桌子吃飯，邏輯錯誤
4. 桌面上擺著【豐盛食物】：
   - 中央一大盤【牛排 + 馬鈴薯】
   - 左前方一個【陶瓷馬克啤酒杯 + 啤酒泡沫】
   - 右前方一個【高腳酒杯（裝紅酒）】
   - 一小籃【麵包】
5. 整組構圖：桌子在中心、左右椅子對稱、桌上食物擺整齊

【視角】：45° 俯視，可看到桌面、椅背、食物全貌

【風格】：${STYLE}
【輸出】：
- 512×512 PNG
- 物件置中、佔畫面 80%
- 背景【純品紅 #FF00FF】(chroma-key)
- 無文字、無人物

完成後存到 /Users/batman_work/claude/apps/westernBar/$OUT 並用 sips 縮放確認 512×512。"
echo "$PROMPT" | codex exec --skip-git-repo-check --image "$ANCHOR" >/dev/null 2>&1
[ -f "$OUT" ] && log "✓ A26" || log "✗ A26 失敗"

log "去背"
python3 scripts/chroma_all.py 2>&1 | grep A26 | tee -a "$LOG"
