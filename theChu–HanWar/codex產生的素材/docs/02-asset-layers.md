# 02. 每個畫面的圖層規劃

## 共用深度規則

| depth | 圖層類型 |
|---:|---|
| 0-99 | 背景 |
| 100-199 | 場景主體與舞台 |
| 200-299 | 轉輪、符號、角色 |
| 300-399 | 特效 |
| 400-499 | HUD |
| 500-599 | Modal / Pause / Result |
| 900+ | Debug，正式版本不顯示 |

## BootScene

| 圖層名稱 | depth | 素材 | 檔名 | 建議尺寸 | 格式 | 動畫幀 | 用途說明 |
|---|---:|---|---|---|---|---|---|
| boot_bg | 0 | 啟動底圖 | `assets/screens/boot_bg.webp` | 1920 x 1080 | WebP | 否 | 最小啟動畫面背景 |
| boot_logo | 100 | 遊戲 logo | `assets/ui/game_logo.png` | 720 x 260 | PNG | 否 | Preload 前可見品牌圖 |

## PreloadScene

| 圖層名稱 | depth | 素材 | 檔名 | 建議尺寸 | 格式 | 動畫幀 | 用途說明 |
|---|---:|---|---|---|---|---|---|
| preload_bg | 0 | 載入背景 | `assets/screens/preload_bg.webp` | 1920 x 1080 | WebP | 否 | 延續主視覺的暗紅金色背景 |
| preload_logo | 100 | 遊戲 logo | `assets/ui/game_logo.png` | 720 x 260 | PNG | 否 | 載入畫面主識別 |
| preload_bar | 200 | 進度條外框與填充 | `assets/ui/loading_bar.png` | 760 x 64 | PNG | 否 | 進度條美術切圖 |

## MainMenuScene

| 圖層名稱 | depth | 素材 | 檔名 | 建議尺寸 | 格式 | 動畫幀 | 用途說明 |
|---|---:|---|---|---|---|---|---|
| bg | 0 | 主選單背景 | `assets/screens/main_menu_bg.webp` | 1920 x 1080 | WebP | 否 | 參考 `開始畫面.png` 重製 |
| title | 120 | 遊戲標題 | `assets/ui/game_logo.png` | 720 x 260 | PNG | 否 | 主選單標題 |
| menu_buttons | 420 | 開始按鈕 | `assets/ui/button_start.png` | 360 x 120 | PNG | 否 | 開始遊戲 |
| menu_buttons | 421 | 設定按鈕 | `assets/ui/button_settings.png` | 128 x 128 | PNG | 否 | 打開設定 |
| menu_buttons | 422 | 音效按鈕 | `assets/ui/button_sound.png` | 128 x 128 | PNG | 是 | on/off 兩幀 |

## GameScene

| 圖層名稱 | depth | 素材 | 檔名 | 建議尺寸 | 格式 | 動畫幀 | 用途說明 |
|---|---:|---|---|---|---|---|---|
| bg_far | 0 | 主遊戲遠景 | `assets/screens/game_bg_far.webp` | 1920 x 1080 | WebP | 否 | 參考 `base-game.png` 拆出遠景 |
| bg_near | 50 | 前景金飾與舞台 | `assets/screens/game_bg_near.png` | 1920 x 1080 | PNG | 否 | 轉輪後方裝飾與前景 |
| reel_frame | 110 | 6 x 5 轉輪框 | `assets/ui/reel_frame.png` | 1240 x 700 | PNG | 否 | 主盤面框架，固定 6 軸 x 5 列 |
| reels | 210 | 6 x 5 轉輪符號集 | `assets/atlases/symbols.png` + `assets/atlases/symbols.json` | 2048 x 2048 | Atlas | 是 | 所有符號圖塊，顯示格固定 6 x 5 |
| win_lines | 260 | 中獎線 | `assets/fx/win_lines.png` | 1240 x 700 | PNG | 是 | 6 x 5 盤面中獎線高亮 |
| fx | 320 | 轉輪光效 | `assets/fx/reel_spin_fx.png` | 1024 x 512 | Spritesheet | 是 | 旋轉與停輪光效 |

## HUDScene

| 圖層名稱 | depth | 素材 | 檔名 | 建議尺寸 | 格式 | 動畫幀 | 用途說明 |
|---|---:|---|---|---|---|---|---|
| hud_base | 400 | 底部 HUD 面板 | `assets/ui/hud_panel.png` | 1920 x 180 | PNG | 否 | 餘額、下注、贏分底板 |
| hud_numbers | 410 | 金額數字字型 | `assets/fonts/gold_numbers.png` + `assets/fonts/gold_numbers.xml` | 1024 x 256 | Bitmap Font | 否 | 金額顯示 |
| hud_buttons | 430 | 旋轉按鈕 | `assets/ui/button_spin.png` | 180 x 180 | PNG | 是 | normal/pressed/disabled 三幀 |
| hud_buttons | 431 | 停止按鈕 | `assets/ui/button_stop.png` | 180 x 180 | PNG | 否 | 旋轉中停止 |
| hud_buttons | 432 | 下注按鈕 | `assets/ui/button_bet_step.png` | 96 x 96 | PNG | 是 | minus/plus 兩幀 |
| hud_buttons | 433 | 暫停按鈕 | `assets/ui/button_pause.png` | 96 x 96 | PNG | 否 | 開啟 PauseScene |

## PauseScene

| 圖層名稱 | depth | 素材 | 檔名 | 建議尺寸 | 格式 | 動畫幀 | 用途說明 |
|---|---:|---|---|---|---|---|---|
| pause_dim | 500 | 暗化遮罩圖 | `assets/ui/modal_dim.png` | 1920 x 1080 | PNG | 否 | 非程式色塊，使用圖片遮罩 |
| pause_panel | 510 | 暫停面板 | `assets/ui/panel_pause.png` | 820 x 620 | PNG | 否 | 暫停選單底板 |
| pause_buttons | 520 | 繼續按鈕 | `assets/ui/button_resume.png` | 320 x 100 | PNG | 否 | 回到遊戲 |
| pause_buttons | 521 | 主選單按鈕 | `assets/ui/button_main_menu.png` | 320 x 100 | PNG | 否 | 回主選單 |

## ResultScene

| 圖層名稱 | depth | 素材 | 檔名 | 建議尺寸 | 格式 | 動畫幀 | 用途說明 |
|---|---:|---|---|---|---|---|---|
| result_bg | 500 | 結算背景 | `assets/screens/result_bg.webp` | 1920 x 1080 | WebP | 否 | 可參考 `爆獎畫面.png` 的金色舞台 |
| result_panel | 520 | 結果面板 | `assets/ui/panel_result.png` | 1040 x 700 | PNG | 否 | 顯示本局結果 |
| result_numbers | 530 | 結算數字 | `assets/fonts/gold_numbers.png` + `assets/fonts/gold_numbers.xml` | 1024 x 256 | Bitmap Font | 否 | 贏分數字 |
| result_buttons | 540 | 再玩一次按鈕 | `assets/ui/button_play_again.png` | 360 x 110 | PNG | 否 | 回 GameScene |
| result_buttons | 541 | 主選單按鈕 | `assets/ui/button_main_menu.png` | 320 x 100 | PNG | 否 | 回 MainMenuScene |

## FreeGameIntroScene

| 圖層名稱 | depth | 素材 | 檔名 | 建議尺寸 | 格式 | 動畫幀 | 用途說明 |
|---|---:|---|---|---|---|---|---|
| free_intro_bg | 0 | Free Game 啟動背景 | `assets/screens/free_game_intro_bg.webp` | 1920 x 1080 | WebP | 否 | 參考 `freeGame啟動畫面.png` |
| character | 220 | 虞姬立繪 | `assets/characters/yu_ji_full.png` | 720 x 980 | PNG | 否 | 角色降臨主視覺 |
| fx | 330 | 降臨光效 | `assets/fx/yu_ji_descend_fx.png` | 1024 x 1024 | Spritesheet | 是 | 角色出場特效 |
| buttons | 540 | 繼續按鈕 | `assets/ui/button_continue.png` | 320 x 100 | PNG | 否 | 進入 FreeGameScene |

## FreeGameScene

| 圖層名稱 | depth | 素材 | 檔名 | 建議尺寸 | 格式 | 動畫幀 | 用途說明 |
|---|---:|---|---|---|---|---|---|
| bg_far | 0 | 免費遊戲遠景 | `assets/screens/free_game_bg_far.webp` | 1920 x 1080 | WebP | 否 | Free Game 專用背景 |
| bg_near | 50 | 免費遊戲前景 | `assets/screens/free_game_bg_near.png` | 1920 x 1080 | PNG | 否 | 前景裝飾 |
| reel_frame | 110 | Free Game 6 x 5 轉輪框 | `assets/ui/reel_frame_free.png` | 1240 x 700 | PNG | 否 | 特殊模式盤面，固定 6 軸 x 5 列 |
| reels | 210 | Free Game 6 x 5 符號集 | `assets/atlases/symbols.png` + `assets/atlases/symbols.json` | 2048 x 2048 | Atlas | 是 | 共用符號，顯示格固定 6 x 5 |
| hud | 430 | 免費次數面板 | `assets/ui/free_spins_panel.png` | 460 x 120 | PNG | 否 | 顯示剩餘免費次數 |

## BonusWheelScene

| 圖層名稱 | depth | 素材 | 檔名 | 建議尺寸 | 格式 | 動畫幀 | 用途說明 |
|---|---:|---|---|---|---|---|---|
| wheel_bg | 0 | Bonus 輪盤背景 | `assets/screens/bonus_wheel_bg.webp` | 1920 x 1080 | WebP | 否 | 參考 `v1-bonus-wheel-multipliers.png` |
| wheel_base | 210 | 輪盤本體 | `assets/ui/bonus_wheel.png` | 860 x 860 | PNG | 否 | 倍率輪盤 |
| wheel_pointer | 230 | 輪盤指針 | `assets/ui/bonus_wheel_pointer.png` | 160 x 240 | PNG | 否 | 指向倍率 |
| multiplier_text | 250 | 倍率文字 | `assets/atlases/multiplier_numbers.png` + `assets/atlases/multiplier_numbers.json` | 1024 x 512 | Atlas | 否 | x2、x5、x10 等倍率 |
| buttons | 540 | 啟動按鈕 | `assets/ui/button_spin_wheel.png` | 360 x 110 | PNG | 否 | 開始輪盤 |
