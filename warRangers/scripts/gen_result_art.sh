#!/bin/bash
# 用 Codex 內建 image_gen 產出勝利／失敗結算畫面，風格對齊 assets/concepts/home_direction_v1.png
cd "$(dirname "$0")/.."
OUT="$PWD/assets/ui/screens"

codex exec --skip-git-repo-check "請用內建 image_gen 工具產生一張直式 PNG。主題：三國題材手繪卡通 3D 遊戲美術風格（與《三國爭鋒》首頁一致：厚塗、飽和、電影感光影、Q版比例但不幼稚），畫面內容為【勝利】結算背景：蜀軍少年將領高舉綠色軍旗站在攻下的城樓上歡呼，身後士兵舉矛慶祝，金色晨光穿透雲層灑落，飄落的綠色與金色彩帶，遠方城牆插滿綠旗。構圖重點：畫面中央偏下要留出大片較暗、低對比的空間放結算文字，上方三分之一是主視覺。不要有任何文字、字母或數字。完成後把產出複製到絕對路徑 ${OUT}/result_win_v1.png 並用 sips 縮放到 720x1280。回報 OK 即可。" > scripts/gen_win.out 2>&1

codex exec --skip-git-repo-check "請用內建 image_gen 工具產生一張直式 PNG。主題：三國題材手繪卡通 3D 遊戲美術風格（與《三國爭鋒》首頁一致：厚塗、飽和、電影感光影、Q版比例但不幼稚），畫面內容為【失敗】結算背景：蜀軍少年將領單膝跪地拄著長槍低頭，破損的綠色軍旗倒在泥地上，背景是被攻破燃燒的城門與陰雨灰藍色調的天空，殘兵在遠處撤退，氣氛沉重但不血腥。構圖重點：畫面中央偏下要留出大片較暗、低對比的空間放結算文字，上方三分之一是主視覺。不要有任何文字、字母或數字。完成後把產出複製到絕對路徑 ${OUT}/result_lose_v1.png 並用 sips 縮放到 720x1280。回報 OK 即可。" > scripts/gen_lose.out 2>&1

echo "DONE $(ls -la $OUT)"
