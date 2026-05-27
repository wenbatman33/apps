#!/bin/bash
# 把 G05/G06 (盤子) 重生成 鏢靶 dart board
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_dartboard.log"
ANCHOR="public/assets/lcd_remaster_v1.png"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、明亮飽和色彩、圓潤無稜角'

log "▶ G05 鏢靶完好"
mv public/assets/G/G05_plate_intact.png public/assets/G/G05_plate_intact.png.old 2>/dev/null
echo "附加圖是西部酒吧場景參考。

任務：生成 512×512 PNG，只有一個【西部酒吧傳統圓形鏢靶 dart board】物件置中。

【物件設計】：
- 圓形鏢靶、傳統款式
- 同心圓配色：紅綠交替分區（標準鏢靶）
- 中心紅色 bull's eye + 外圈黑色
- 木框邊緣
- 立體 3D 質感，可掛在牆上的鏢靶
- 大小與盤子相當（可被丟擲飛行）

【風格】：${STYLE}
【輸出】：512×512、置中佔 70%、背景【純品紅 #FF00FF】(chroma-key)、無文字無其他物件

完成後存到 /Users/batman_work/claude/apps/westernBar/public/assets/G/G05_plate_intact.png 並 sips 縮放確認 512×512。" | codex exec --skip-git-repo-check --image "$ANCHOR" >/dev/null 2>&1
[ -f public/assets/G/G05_plate_intact.png ] && log "✓ G05" || log "✗ G05 失敗"

log "▶ G06 鏢靶破裂"
mv public/assets/G/G06_plate_broken.png public/assets/G/G06_plate_broken.png.old 2>/dev/null
echo "附加圖是【鏢靶完好版】。生成它的【破裂版】。

任務：512×512 PNG，畫【相同設計的鏢靶 dart board 被擊碎】。

【破裂狀態】：
- 鏢靶被擊中破成數塊扇形碎片散在地上
- 紅綠分區色仍可辨識
- Q 版誇張碎裂效果、有彈孔焦痕

【風格】：${STYLE}
【輸出】：512×512、置中、品紅 #FF00FF 背景

完成後存到 /Users/batman_work/claude/apps/westernBar/public/assets/G/G06_plate_broken.png 並 sips 確認。" | codex exec --skip-git-repo-check --image "public/assets/G/G05_plate_intact.png" >/dev/null 2>&1
[ -f public/assets/G/G06_plate_broken.png ] && log "✓ G06" || log "✗ G06 失敗"

log "==== 完成 ===="
python3 scripts/chroma_all.py 2>&1 | grep -E "G0[56]" | tee -a "$LOG"
