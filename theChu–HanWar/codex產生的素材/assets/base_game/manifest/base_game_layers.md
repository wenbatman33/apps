# Base Game Active Phaser Layer Manifest

目前 Base Game 重新接入第一批真正可控素材：純背景、楚人物透明 PNG、漢人物透明 PNG。先前三張 canonical 裁切圖已判定為不可用素材，移至 `assets/_deprecated/`，新程式碼不得載入。

盤面規格固定為 6 x 5，不得任意改動。

| 顯示順序 | Depth | Layer Key | 圖檔路徑 | 來源裁切範圍 x1,y1,x2,y2 | 用途 | 狀態 |
|---:|---:|---|---|---|---|---|
| 1 | 0 | `bg_battlefield_clean` | `assets/bg/bg_battlefield_clean.png` | 新生成 1920x1080 | 純戰場背景，不含 Logo、角色、轉軸、符號、UI | 已接入 Phaser |
| 2 | 10 | `chu_idle` | `assets/characters/chu/chu_idle.png` | 新生成去背裁切 | 楚人物透明立繪 | 已接入 Phaser |
| 3 | 20 | `han_idle` | `assets/characters/han/han_idle.png` | 新生成去背裁切 | 漢人物透明立繪 | 已接入 Phaser |
| 4 | 80 | `reel_bg` | `assets/reel/reel_bg.png` | 新生成去背裁切 | 中央 6 x 5 轉輪內部暗色底板，不含外框、分隔線、符號 | 已接入 Phaser |
| 5 | 90 | `reel_separator` | `assets/reel/reel_separator.png` | 新生成去背裁切 | 轉輪欄位分隔線，同一張圖在 Phaser 中放置 5 條 | 已接入 Phaser |
| 6 | 100 | `symbols_6x5` | `assets/symbols/**/*.png` | 10 張既有 RGBA symbol 圖整理到正式路徑 | 固定 6 x 5 共 30 格 symbol layer | 已接入 Phaser |
| 7 | 110 | `reel_frame` | `assets/reel/reel_frame.png` | 新生成去背裁切 | 中央轉輪金色外框，透明中心，不含底板、符號、分隔線 | 已接入 Phaser |

## 目前理解修正

- `base-game.png` 只能作為視覺參考，不可直接裁切後當正式素材。
- 背景、角色、轉軸、Logo、HUD、按鈕、符號都必須拆成獨立圖檔。
- 下一步只允許接入符合 `docs/slot-asset-breakdown.md` 的素材，例如 Logo、轉軸框或 6 x 5 symbols。
