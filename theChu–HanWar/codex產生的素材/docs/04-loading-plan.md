# 04. Phaser 載入策略

## 原則

- 所有可視素材都必須來自實際圖檔：`image`、`spritesheet`、`atlas`、`bitmapFont`。
- 禁止使用 Phaser Graphics、Canvas 或動態幾何形狀產生角色、道具、UI、背景或 placeholder。
- Phase 1 若素材尚未完成，實作階段才允許依使用者確認的規則放 1x1 透明 PNG；本規劃階段不建立 placeholder 圖檔。
- 場景專屬大型背景採延遲載入，避免一次載入所有 Phase 3 素材。

## BootScene 載入

BootScene 只載入進入 PreloadScene 必需的最小素材：

| key | 路徑 | 類型 | 理由 |
|---|---|---|---|
| boot_bg | `assets/screens/boot_bg.webp` | image | 啟動底圖 |
| game_logo | `assets/ui/game_logo.png` | image | PreloadScene 需要先顯示 logo |
| loading_bar | `assets/ui/loading_bar.png` | image | PreloadScene 進度條 |

預估大小：1.2MB - 2.5MB。

## PreloadScene 載入

PreloadScene 載入 Phase 1 必需的全域共用素材：

| 類別 | 素材 | 載入方式 |
|---|---|---|
| 主選單 | `main_menu_bg`、`button_start`、`button_settings`、`button_sound` | `this.load.image`、`this.load.spritesheet` |
| 主遊戲背景 | `game_bg_far`、`game_bg_near` | `this.load.image` |
| 轉輪 | `reel_frame`、`symbols` | `this.load.image`、`this.load.atlas` |
| HUD | `hud_panel`、`button_spin`、`button_stop`、`button_bet_step`、`button_pause` | `this.load.image`、`this.load.spritesheet` |
| 結算 | `result_bg`、`panel_result`、`button_play_again`、`button_main_menu` | `this.load.image` |
| 字型 | `gold_numbers` | `this.load.bitmapFont` |

預估大小：10MB - 20MB，視 WebP 壓縮與 atlas 品質而定。

## 各 GameScene 專屬載入

### GameScene

Phase 1 的 GameScene 素材已在 PreloadScene 預載，避免首次點擊開始時等待。Phase 2 起可在 GameScene `preload()` 補載：

- `win_lines`
- `reel_spin_fx`

### PauseScene

PauseScene 屬 Phase 2，可在第一次開啟前載入：

- `modal_dim`
- `panel_pause`
- `button_resume`
- `button_main_menu`

### FreeGameIntroScene / FreeGameScene

Free Game 屬 Phase 3，使用 Scene preload 延遲載入：

- `free_game_intro_bg`
- `yu_ji_full`
- `yu_ji_descend_fx`
- `button_continue`
- `free_game_bg_far`
- `free_game_bg_near`
- `reel_frame_free`
- `free_spins_panel`

### BonusWheelScene

Bonus Wheel 屬 Phase 3，使用 Scene preload 延遲載入：

- `bonus_wheel_bg`
- `bonus_wheel`
- `bonus_wheel_pointer`
- `multiplier_numbers`
- `button_spin_wheel`

## Atlas / 獨立圖檔策略

| 素材類型 | 建議方式 | 原因 |
|---|---|---|
| 轉輪符號 | Atlas | 同時頻繁顯示，減少 draw call，方便符號 key 管理 |
| 倍率數字 | Atlas | Bonus Wheel 會重複顯示多個倍率 |
| 按鈕多狀態 | Spritesheet | normal / pressed / disabled 狀態尺寸一致 |
| 大型背景 | 獨立 WebP | 壓縮效率高，不適合塞進 atlas |
| 透明 UI 面板 | 獨立 PNG | 保留 alpha 邊緣與九宮格切分彈性 |
| 特效序列 | Spritesheet | 幀序列固定，便於播放動畫 |
| 金額數字 | Bitmap Font | 效能穩定，數字對齊容易 |

## 預期素材大小

| Phase | 素材範圍 | 預估大小 |
|---|---|---:|
| Phase 1 | Boot、Preload、MainMenu、Game、HUD、Result 基礎素材 | 12MB - 24MB |
| Phase 2 | Pause、Win Lines、Spin FX、按鈕狀態補齊 | 4MB - 8MB |
| Phase 3 | Free Game、Bonus Wheel、角色事件、倍率 atlas | 16MB - 32MB |
| 完整版 | 全部素材 | 32MB - 64MB |

## 待確認清單

1. 美術風格是否同意：2D 豪華寫實卡牌感 Slot，楚漢戰場 + 宮廷金飾 + 黑紅金青銅配色。
2. Scene 拆分是否合理：Phase 1 包含 Boot、Preload、MainMenu、Game、HUD、Result；Pause 延到 Phase 2；Free Game 與 Bonus Wheel 延到 Phase 3。
3. 素材來源如何分工：哪些素材你會自己準備、哪些走 AI 生圖、哪些找 itch.io / Kenney / OpenGameArt 現成資源。
4. Phase 切分是否符合預期：Phase 1 先完成可玩最小版本，Phase 2 補主遊戲表現，Phase 3 補特殊模式。

