# Deprecated Assets

本文件記錄已廢棄且不得再由新程式碼載入的 Base Game 素材。

## 廢棄檔案

| 原檔案 | 已移至 | 廢棄原因 | 後續替代方向 |
|---|---|---|---|
| `assets/base_game/canonical_layers/base_game_bg_battlefield.png` | `assets/_deprecated/base_game_bg_battlefield.png` | 不是純背景素材，內含 Logo、角色、轉軸、符號、UI 等成品畫面元素，Phaser 無法獨立控制 | 重做 `assets/bg/bg_battlefield_clean.png`，只保留乾淨戰場背景 |
| `assets/base_game/canonical_layers/base_game_left_character.png` | `assets/_deprecated/base_game_left_character.png` | 從成品圖裁切而來，含背景殘留與大片空白像素，不是透明角色立繪 | 重做 `assets/characters/chu/chu_idle.png`，PNG-32 透明背景、畫布貼合角色 |
| `assets/base_game/canonical_layers/base_game_right_character.png` | `assets/_deprecated/base_game_right_character.png` | 從成品圖裁切而來，含背景殘留與大片空白像素，不是透明角色立繪 | 重做 `assets/characters/han/han_idle.png`，PNG-32 透明背景、畫布貼合角色 |

## 禁用規則

- 新程式碼不得載入 `assets/_deprecated/` 內的任何檔案。
- `base-game.png` 只能作為視覺參考，不可直接裁切成正式素材。
- 背景、角色、Logo、轉軸、符號、UI、特效必須是獨立可控圖檔。
- 角色圖必須具備 alpha channel，不得使用黑底、白底或完整畫面裁切。

