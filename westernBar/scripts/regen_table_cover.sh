#!/bin/bash
# 重生夫婦圓桌 + 掩體 3 階段（側躺倒地桌、桌腳朝右、桌面朝左）
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_table_cover.log"
ANCHOR="public/assets/lcd_remaster_v1.png"
mkdir -p public/assets/{A,F}

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering、明亮飽和色彩、圓潤無稜角、無線稿'

# 夫婦圓桌
log "▶ A26 夫婦圓桌（大型用餐桌）"
mv public/assets/A/A26_round_table.png public/assets/A/A26_round_table.png.old 2>/dev/null
echo "附加圖是西部酒吧場景參考。

任務：生成 512×512 PNG，只有一張【西部酒吧大型用餐圓桌】物件置中。

【物件設計】：
- 圓形桌面、深棕色木質、桌面有少量花紋
- 4 條粗壯桌腿、向下穩固展開
- 尺寸：足夠 2 人對坐用餐（不是小酒桌）
- 45° 俯視角度、桌面清楚可見

【風格】：${STYLE}
【輸出】：512×512、物件置中佔畫面 75%、背景【純品紅 #FF00FF】、無文字無其他物件

完成後存到 /Users/batman_work/claude/apps/westernBar/public/assets/A/A26_round_table.png 並 sips 確認 512×512。" | codex exec --skip-git-repo-check --image "$ANCHOR" >/dev/null 2>&1
[ -f public/assets/A/A26_round_table.png ] && log "✓ A26" || log "✗ A26"

# 掩體 3 階段
COVER_BASE='【側躺倒地的長方形桌子】：
- 桌子翻倒側躺在地、桌腳【朝右】（4 條腿水平指向畫面右側）
- 桌面【朝左】（垂直擋板狀面對左側）
- 整體【橫向長方形】、橫向佔畫面寬 80%
- 深棕色木質、有木紋
- 45° 俯視角度可見桌子側面結構'

log "▶ F01 掩體完好"
mv public/assets/F/F01_table_intact.png public/assets/F/F01_table_intact.png.old 2>/dev/null
echo "附加圖是西部酒吧場景參考。

任務：生成 512×512 PNG，只有【倒地桌（完好）】物件置中。

${COVER_BASE}
完好狀態：桌面 3 條木板完整、桌腳 4 條都在、無損壞。

【風格】：${STYLE}
【輸出】：512×512、橫向擺放（寬>高）、品紅 #FF00FF 背景

完成後存到 /Users/batman_work/claude/apps/westernBar/public/assets/F/F01_table_intact.png 並 sips 確認 512×512。" | codex exec --skip-git-repo-check --image "$ANCHOR" >/dev/null 2>&1
[ -f public/assets/F/F01_table_intact.png ] && log "✓ F01" || log "✗ F01"

log "▶ F02 掩體破損（用 F01 當 ref 鎖方向）"
mv public/assets/F/F02_table_damaged.png public/assets/F/F02_table_damaged.png.old 2>/dev/null
echo "附加圖是【倒地桌完好版】。生成同方向的破損版。

${COVER_BASE}
破損狀態：3 條木板中中間 1 條斷裂缺口、邊角彈孔、桌腳鬆動但仍立著。
方向與附加圖完全相同。

【風格】：${STYLE}
【輸出】：512×512、品紅 #FF00FF 背景

完成後存到 /Users/batman_work/claude/apps/westernBar/public/assets/F/F02_table_damaged.png 並 sips 確認。" | codex exec --skip-git-repo-check --image "public/assets/F/F01_table_intact.png" >/dev/null 2>&1
[ -f public/assets/F/F02_table_damaged.png ] && log "✓ F02" || log "✗ F02"

log "▶ F03 掩體毀壞"
mv public/assets/F/F03_table_destroyed.png public/assets/F/F03_table_destroyed.png.old 2>/dev/null
echo "附加圖是【倒地桌完好版】。生成同方向的毀壞版。

${COVER_BASE}
毀壞狀態：只剩 1 條歪斜木板、其他散落、桌腳大部分斷、彈孔焦痕、煙霧。
方向與附加圖完全相同。

【風格】：${STYLE}
【輸出】：512×512、品紅 #FF00FF 背景

完成後存到 /Users/batman_work/claude/apps/westernBar/public/assets/F/F03_table_destroyed.png 並 sips 確認。" | codex exec --skip-git-repo-check --image "public/assets/F/F01_table_intact.png" >/dev/null 2>&1
[ -f public/assets/F/F03_table_destroyed.png ] && log "✓ F03" || log "✗ F03"

log "==== 完成 ===="
ls -la public/assets/A/A26_round_table.png public/assets/F/F0*.png
