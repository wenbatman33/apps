# 03. 完整素材清單

## 狀態說明

- ✅ 已有：專案中已有參考圖或可整理來源。
- 🟡 需生成：需求明確，可直接進入 AI 生圖或切圖。
- 🔴 待設計：仍需確認版型、功能或細節。

## Manifest

| key | 檔案路徑 | 尺寸 | 類型 | 所屬 Scene | 圖層 | 狀態 | 生圖 Prompt |
|---|---|---|---|---|---|---|---|
| reference_base_game | `base-game.png` | 1660 x 948 | PNG | GameScene | reference | ✅ 已有 | Existing reference image, use as layout and color direction only. |
| reference_main_menu | `開始畫面.png` | 1672 x 941 | PNG | MainMenuScene | reference | ✅ 已有 | Existing reference image, use as main menu visual direction only. |
| reference_free_game_intro | `freeGame啟動畫面.png` | 1672 x 941 | PNG | FreeGameIntroScene | reference | ✅ 已有 | Existing reference image, use as free game intro direction only. |
| reference_yu_ji_descend_old | `v1-chuhan-yuji-descends-freegame.old.png` | 1672 x 941 | PNG | FreeGameIntroScene | reference | ✅ 已有 | Existing older reference, use as character event direction only. |
| reference_bonus_wheel | `v1-bonus-wheel-multipliers.png` | 1672 x 941 | PNG | BonusWheelScene | reference | ✅ 已有 | Existing reference image, use as bonus wheel direction only. |
| reference_ui_components | `v1-ui-components.png` | 1672 x 941 | PNG | HUDScene | reference | ✅ 已有 | Existing reference image, use as UI component direction only. |
| reference_result | `爆獎畫面.png` | 1672 x 941 | PNG | ResultScene | reference | ✅ 已有 | Existing reference image, use as result and big win direction only. |
| boot_bg | `assets/screens/boot_bg.webp` | 1920 x 1080 | WebP | BootScene | boot_bg | 🟡 需生成 | Dark red and black ancient Chinese battlefield abstract background, subtle bronze texture, luxury slot game style, no text, 1920x1080. |
| preload_bg | `assets/screens/preload_bg.webp` | 1920 x 1080 | WebP | PreloadScene | preload_bg | 🟡 需生成 | Ancient Chu Han war themed loading screen background, dark lacquer red, gold trim, cinematic 2D game UI, no text, 1920x1080. |
| game_logo | `assets/ui/game_logo.png` | 720 x 260 | PNG | BootScene, PreloadScene, MainMenuScene | title | 🔴 待設計 | Chu Han Contention game logo, ornate gold Chinese war emblem, transparent background, premium slot game title, 720x260. |
| loading_bar | `assets/ui/loading_bar.png` | 760 x 64 | PNG | PreloadScene | preload_bar | 🟡 需生成 | Ornate gold and jade loading progress bar UI, ancient Chinese lacquer style, transparent background, 760x64. |
| main_menu_bg | `assets/screens/main_menu_bg.webp` | 1920 x 1080 | WebP | MainMenuScene | bg | 🟡 需生成 | Heroic Chu Han war slot game main menu background, palace and battlefield blend, black red gold palette, front-facing composition, no text, 1920x1080. |
| button_start | `assets/ui/button_start.png` | 360 x 120 | PNG | MainMenuScene | menu_buttons | 🟡 需生成 | Luxury ancient Chinese gold red start button, polished jade highlights, transparent background, no text, 360x120. |
| button_settings | `assets/ui/button_settings.png` | 128 x 128 | PNG | MainMenuScene | menu_buttons | 🟡 需生成 | Ornate circular settings gear button, bronze gold ancient Chinese UI, transparent background, 128x128. |
| button_sound | `assets/ui/button_sound.png` | 256 x 128 | Spritesheet | MainMenuScene | menu_buttons | 🟡 需生成 | Two-frame sound on off button spritesheet, gold bronze circular icons, transparent background, 256x128. |
| game_bg_far | `assets/screens/game_bg_far.webp` | 1920 x 1080 | WebP | GameScene | bg_far | 🟡 需生成 | Chu Han battlefield palace distant background for slot game, dark red sky, bronze architecture, no UI, no text, 1920x1080. |
| game_bg_near | `assets/screens/game_bg_near.png` | 1920 x 1080 | PNG | GameScene | bg_near | 🟡 需生成 | Foreground decorative stage frame, gold lacquer ancient Chinese slot machine ornaments, transparent center, transparent background, 1920x1080. |
| reel_frame | `assets/ui/reel_frame.png` | 1240 x 700 | PNG | GameScene | reel_frame | 🟡 需生成 | Six reel five row slot machine frame, ornate gold bronze Chinese war motif, transparent reel windows, transparent background, 1240x700. |
| symbols | `assets/atlases/symbols.png` | 2048 x 2048 | Atlas | GameScene, FreeGameScene | reels | 🔴 待設計 | Slot symbol atlas for a fixed 6x5 Chu Han war slot grid: Xiang Yu, Liu Bang, Yu Ji, sword, jade seal, war drum, wild, scatter, bonus, premium 2D rendered icons, transparent background, 2048x2048. |
| symbols_json | `assets/atlases/symbols.json` | atlas metadata | JSON | GameScene, FreeGameScene | reels | 🔴 待設計 | Atlas metadata generated after symbols are finalized. |
| win_lines | `assets/fx/win_lines.png` | 1240 x 700 | Spritesheet | GameScene | win_lines | 🟡 需生成 | Animated winning paylines glow, gold energy lines for six reel five row slot grid, transparent background, 1240x700. |
| reel_spin_fx | `assets/fx/reel_spin_fx.png` | 1024 x 512 | Spritesheet | GameScene | fx | 🟡 需生成 | Reel spin light streak effects, gold sparks and motion blur, transparent background, 1024x512. |
| hud_panel | `assets/ui/hud_panel.png` | 1920 x 180 | PNG | HUDScene | hud_base | 🟡 需生成 | Bottom HUD panel for luxury Chinese slot game, black lacquer, gold trim, transparent upper edge, 1920x180. |
| gold_numbers | `assets/fonts/gold_numbers.png` | 1024 x 256 | Bitmap Font | HUDScene, ResultScene | hud_numbers | 🔴 待設計 | Gold embossed number bitmap font, digits 0-9 and punctuation, ancient Chinese slot UI, transparent background, 1024x256. |
| gold_numbers_xml | `assets/fonts/gold_numbers.xml` | font metadata | XML | HUDScene, ResultScene | hud_numbers | 🔴 待設計 | Bitmap font metadata generated after font artwork is finalized. |
| button_spin | `assets/ui/button_spin.png` | 540 x 180 | Spritesheet | HUDScene | hud_buttons | 🟡 需生成 | Three-frame spin button spritesheet, normal pressed disabled, ornate red gold circular slot button, transparent background, 540x180. |
| button_stop | `assets/ui/button_stop.png` | 180 x 180 | PNG | HUDScene | hud_buttons | 🟡 需生成 | Stop button, ornate red gold circular UI button, transparent background, 180x180. |
| button_bet_step | `assets/ui/button_bet_step.png` | 192 x 96 | Spritesheet | HUDScene | hud_buttons | 🟡 需生成 | Minus and plus bet step buttons, ancient Chinese gold UI, transparent background, 192x96. |
| button_pause | `assets/ui/button_pause.png` | 96 x 96 | PNG | HUDScene | hud_buttons | 🟡 需生成 | Pause icon button, bronze gold circular frame, transparent background, 96x96. |
| modal_dim | `assets/ui/modal_dim.png` | 1920 x 1080 | PNG | PauseScene | pause_dim | 🟡 需生成 | Semi transparent dark modal overlay image with subtle red vignette, 1920x1080 PNG. |
| panel_pause | `assets/ui/panel_pause.png` | 820 x 620 | PNG | PauseScene | pause_panel | 🟡 需生成 | Pause menu panel, ornate black lacquer and gold border, transparent background, 820x620. |
| button_resume | `assets/ui/button_resume.png` | 320 x 100 | PNG | PauseScene | pause_buttons | 🟡 需生成 | Resume button, ancient Chinese red gold UI, transparent background, no text, 320x100. |
| button_main_menu | `assets/ui/button_main_menu.png` | 320 x 100 | PNG | PauseScene, ResultScene | pause_buttons, result_buttons | 🟡 需生成 | Main menu button, ancient Chinese red gold UI, transparent background, no text, 320x100. |
| result_bg | `assets/screens/result_bg.webp` | 1920 x 1080 | WebP | ResultScene | result_bg | 🟡 需生成 | Big win result stage background, gold palace lights, Chu Han war luxury slot game, no text, 1920x1080. |
| panel_result | `assets/ui/panel_result.png` | 1040 x 700 | PNG | ResultScene | result_panel | 🟡 需生成 | Result panel, ornate gold black lacquer frame, transparent background, 1040x700. |
| button_play_again | `assets/ui/button_play_again.png` | 360 x 110 | PNG | ResultScene | result_buttons | 🟡 需生成 | Play again button, luxury Chinese slot UI, red and gold, transparent background, no text, 360x110. |
| free_game_intro_bg | `assets/screens/free_game_intro_bg.webp` | 1920 x 1080 | WebP | FreeGameIntroScene | free_intro_bg | 🟡 需生成 | Yu Ji descends free game intro background, ethereal palace, gold light, dark red silk, no text, 1920x1080. |
| yu_ji_full | `assets/characters/yu_ji_full.png` | 720 x 980 | PNG | FreeGameIntroScene | character | 🟡 需生成 | Yu Ji full body character art, elegant ancient Chinese noblewoman, flowing silk, gold and jade accessories, premium 2D game art, transparent background, 720x980. |
| yu_ji_descend_fx | `assets/fx/yu_ji_descend_fx.png` | 1024 x 1024 | Spritesheet | FreeGameIntroScene | fx | 🟡 需生成 | Magical descend effect for Yu Ji, gold petals, silk light trails, transparent background spritesheet, 1024x1024. |
| button_continue | `assets/ui/button_continue.png` | 320 x 100 | PNG | FreeGameIntroScene | buttons | 🟡 需生成 | Continue button, ancient Chinese gold red UI, transparent background, no text, 320x100. |
| free_game_bg_far | `assets/screens/free_game_bg_far.webp` | 1920 x 1080 | WebP | FreeGameScene | bg_far | 🟡 需生成 | Free game special background, moonlit Chu Han palace battlefield, gold mist, no UI, no text, 1920x1080. |
| free_game_bg_near | `assets/screens/free_game_bg_near.png` | 1920 x 1080 | PNG | FreeGameScene | bg_near | 🟡 需生成 | Free game foreground ornate gold frame, silk and jade accents, transparent center, transparent background, 1920x1080. |
| reel_frame_free | `assets/ui/reel_frame_free.png` | 1240 x 700 | PNG | FreeGameScene | reel_frame | 🟡 需生成 | Free game six reel five row slot frame, gold jade ornate Chinese design, transparent reel windows, 1240x700. |
| free_spins_panel | `assets/ui/free_spins_panel.png` | 460 x 120 | PNG | FreeGameScene | hud | 🟡 需生成 | Free spins counter panel, gold jade Chinese UI, transparent background, 460x120. |
| bonus_wheel_bg | `assets/screens/bonus_wheel_bg.webp` | 1920 x 1080 | WebP | BonusWheelScene | wheel_bg | 🟡 需生成 | Bonus wheel background, dramatic ancient Chinese treasury, gold light, red lacquer, no text, 1920x1080. |
| bonus_wheel | `assets/ui/bonus_wheel.png` | 860 x 860 | PNG | BonusWheelScene | wheel_base | 🟡 需生成 | Large ornate bonus multiplier wheel, gold bronze Chinese motif, empty multiplier segments, transparent background, 860x860. |
| bonus_wheel_pointer | `assets/ui/bonus_wheel_pointer.png` | 160 x 240 | PNG | BonusWheelScene | wheel_pointer | 🟡 需生成 | Bonus wheel pointer, jade and gold arrow ornament, transparent background, 160x240. |
| multiplier_numbers | `assets/atlases/multiplier_numbers.png` | 1024 x 512 | Atlas | BonusWheelScene | multiplier_text | 🔴 待設計 | Multiplier number atlas x2 x3 x5 x8 x10 x20, gold embossed text, transparent background, 1024x512. |
| multiplier_numbers_json | `assets/atlases/multiplier_numbers.json` | atlas metadata | JSON | BonusWheelScene | multiplier_text | 🔴 待設計 | Atlas metadata generated after multiplier artwork is finalized. |
| button_spin_wheel | `assets/ui/button_spin_wheel.png` | 360 x 110 | PNG | BonusWheelScene | buttons | 🟡 需生成 | Spin wheel button, luxury Chinese slot UI, gold red, transparent background, no text, 360x110. |
