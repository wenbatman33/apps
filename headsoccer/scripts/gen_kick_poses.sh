#!/bin/bash
# 為八位球員各生一張「踢腳」姿勢圖(以現有站姿為參考，同角色同風格，只改動作)
cd /Users/batman_work/claude/apps/headsoccer
PLAYERS="messi ronaldo neymar mbappe haaland vinicius bellingham salah"
for id in $PLAYERS; do
  SRC="/Users/batman_work/claude/apps/headsoccer/assets/players/${id}.png"
  OUT="/Users/batman_work/claude/apps/headsoccer/assets/players/${id}_kick.png"
  if [ -f "$OUT" ]; then echo "skip $id (exists)"; continue; fi
  echo "=== gen $id kick ==="
  codex exec --skip-git-repo-check "請用內建 image_gen 工具，以這張參考圖為基準：${SRC} 。這是一個 3D 卡通 chibi 大頭風格的足球員、面朝右、透明背景、512x512。請產生【同一個球員】的另一個姿勢圖，要求：(1) 完全保留同一個角色——相同的臉、髮型、鬍子、膚色、球衣顏色與隊徽、球鞋、3D 卡通 chibi 大頭比例與畫風，面朝右、透明背景、512x512，跟參考圖一模一樣；(2) 唯一改變是【姿勢換成踢球動作】：一隻腳明顯往前方(右方)伸直踢出去、腳尖朝前，另一隻腳當支撐腳微彎，身體略微前傾、雙臂自然張開保持平衡；(3) 整體大小、頭身比例、站立高度、在畫面中的位置要跟參考圖盡量一致，讓這張踢腳圖能跟原站姿圖無縫切換(身體與頭部位置不要跑掉)。完成後用 sips 確保 512x512 並複製到絕對路徑 ${OUT} 。回報 OK。"
done
echo "ALL DONE"
