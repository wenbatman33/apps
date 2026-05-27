#!/bin/bash
# 用現有 A00 為 ref，把吧台右端縮短，右邊改為延伸的木地板
set -u
cd "$(dirname "$0")/.."

LOG="scripts/regen_bg_short_bar.log"
OUT="public/assets/A/A00_empty_bg.png"
REF="public/assets/A/A00_empty_bg.png"  # 用自己當 ref 改

# 先備份
[ -f "$OUT" ] && cp "$OUT" "$OUT.bak_v13"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

log "==== 縮短吧台右端 — 重生背景 ===="

PROMPT="附加圖是目前的西部酒吧空場景背景。

任務：請用 image_gen 工具生成【完全相同視角 / 透視 / 牆面 / 地板 / 酒瓶架 / SALOON 招牌 / WANTED 海報 / 門洞 / 邊框】的版本，
【唯一差異】：把【吧台檯面 + 吧台前面板 + 酒瓶架】整體【右端往左縮短約 8%-10% 寬度】，
讓畫面右側多出一段【純木地板（與下方客人地板相同的水平延伸木板）】。

【嚴格保留】：
✓ 相機 45° 俯視角度
✓ 綠色 LCD 圓角邊框
✓ 左側門洞 + 門框 + 透出的室外景象
✓ WANTED 海報、SALOON 招牌、油燈、風景畫等所有牆上裝飾
✓ 後牆酒瓶架的木紋、層架結構（但寬度跟著縮短）
✓ 吧台後方的【酒保走道】（吧台與酒瓶架之間透出地板的縫）
✓ 吧台檯面【深核桃木光澤面】、木紋細節
✓ 整片地板的【木板平行縫線】方向、由近到遠延伸
✓ Pixar 3D 風格、軟陰影、暖色調

【唯一改變】：
- 吧台右端【截斷往左】：原本吧台幾乎延伸到畫面右緣，現在【右端截在約畫面寬度 85-87% 位置】
- 截斷處【自然收尾】：吧台右側木板側面可見（有厚度的截斷面）、可能有一根小立柱或木牆收邊
- 吧台右側到畫面右邊框【空出一段木地板】（與下方地板無縫銜接、木紋延伸方向一致）
- 酒瓶架也跟著【右端縮短】到相同位置（不要懸空在地板上方）

【絕對禁止】：
✗ 不准更改視角、透視、邊框、門洞、海報位置
✗ 不准加入任何角色、桌椅、物品
✗ 不准改變整體色調、光線方向

【輸出規範】：
- 1536×1024 PNG
- 整張就是 LCD 螢幕畫面內容

完成後存到 /Users/batman_work/claude/apps/westernBar/$OUT 並 sips 確認 1536×1024。"

log "▶ 開始生圖（3-5 分鐘）"
echo "$PROMPT" | codex exec --skip-git-repo-check --image "$REF" 2>&1 | tail -20 >> "$LOG"

if [ -f "$OUT" ] && [ -s "$OUT" ]; then
  log "✓ 完成: $OUT"
  sips -g pixelWidth -g pixelHeight "$OUT" 2>/dev/null | grep pixel | tee -a "$LOG"
else
  log "✗ 失敗"
fi
