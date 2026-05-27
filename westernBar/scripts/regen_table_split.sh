#!/bin/bash
# 拆解夫婦用餐區為 4 個獨立 sprite：圓桌、左椅、右椅、食物
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_table_split.log"
ANCHOR="public/assets/lcd_remaster_v1.png"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

STYLE='Pixar / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、明亮飽和色彩、圓潤無稜角'

gen_one() {
  local out="$1" desc="$2"
  mv "$out" "$out.old" 2>/dev/null
  log "▶ $(basename $out)"
  PROMPT="附加圖是西部酒吧場景參考。

任務：生成 512×512 PNG，畫一個【${desc}】物件置中。

【風格】：${STYLE}
【視角】：45° 俯視
【輸出】：
- 512×512、物件置中佔畫面 70%
- 背景【純品紅 #FF00FF】(chroma-key)
- 無文字、無其他物件、無人物

完成後存到 /Users/batman_work/claude/apps/westernBar/$out 並 sips 確認 512×512。"
  echo "$PROMPT" | codex exec --skip-git-repo-check --image "$ANCHOR" >/dev/null 2>&1
  [ -f "$out" ] && log "✓ $(basename $out)" || log "✗ $(basename $out) 失敗"
}

gen_one "public/assets/A/A26_round_table.png" \
  "西部酒吧大型圓形木餐桌（無任何椅子、無食物、無人）：深棕色木質、4 條粗腳、桌面有少量花紋雕刻、桌面乾淨空白"

gen_one "public/assets/A/A27_chair_left.png" \
  "西部酒吧木椅【左側用】：椅背在【最左邊】、座位開口朝右，深棕色木質、單一椅子物件，可被人坐下面朝右"

gen_one "public/assets/A/A28_chair_right.png" \
  "西部酒吧木椅【右側用】：椅背在【最右邊】、座位開口朝左，深棕色木質、單一椅子物件，可被人坐下面朝左"

gen_one "public/assets/A/A29_food_set.png" \
  "桌上食物組合（俯視擺盤）：中央一個米色陶瓷大圓盤上有【烤牛排 + 馬鈴薯塊 + 蔬菜】、左前一個陶瓷馬克啤酒杯（裝啤酒 + 泡沫）、右前一個高腳紅酒杯、前方一個小麵包籃裝麵包。整組擺成一個圓形構圖（可放在圓桌上）"

log "去背"
python3 scripts/chroma_all.py 2>&1 | grep -E "A2[6789]" | tee -a "$LOG"
