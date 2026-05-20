# 素材整理清單（2026-05-20）

依「檔案保護準則」**完全沒有刪除任何檔案**，僅做分類。確認後請告訴我要刪哪幾類。

---

## A. 明確廢棄／可安全刪除（約 60 MB）

這些是 codex 自己標記為「廢棄」或開發過程留下的暫存／中繼檔。

### A1. `assets/_deprecated/`（4.4 MB · 3 檔）
| 檔案 | 廢棄原因（出自 `docs/deprecated-assets.md`） |
|---|---|
| `base_game_bg_battlefield.png` | 含 Logo/角色/UI 烘在一起 |
| `base_game_left_character.png` | 不是透明立繪 |
| `base_game_right_character.png` | 不是透明立繪 |

### A2. `tmp/imagegen/`（47 MB · 17 個 `*_src.png`）
每張正式素材的 AI 原始生圖中繼檔。正式版已存在 `assets/` 之下，原圖只是備份。

### A3. 中介 `*_src.png` 散落在 assets 各處（12 MB · 7 檔）
- `assets/base_game/ui/button_spin_src.png`、`hud_panel_base_src.png`、`reel_frame_base_src.png`
- `assets/base_game/bg/game_bg_far_flags_src.png`、`game_bg_mid_columns_src.png`、`game_bg_near_gold_stage_src.png`

### A4. 明確 `*_deprecated.png`（約 1.5 MB · 5 檔）
- `assets/reel/reel_frame_complex_deprecated.png`
- `assets/ui/panels/top_jackpot_panel_ornate_deprecated.png`
- `assets/ui/panels/top_jackpot_panel_gem_ends_deprecated.png`
- `assets/ui/panels/top_jackpot_panel_with_lines_deprecated.png`
- `assets/ui/panels/top_jackpot_panel_with_dividers_deprecated.png`

### A5. 接觸表 / debug sheet（約 850 KB · 3 檔）
- `tmp_existing_ui_sheet.jpg`
- `tmp_generated_contact_sheet.png`
- `tmp_new_assets_contact_sheet.png`

### A6. 舊版主畫面 reference（2.7 MB · 1 檔）
- `v1-chuhan-yuji-descends-freegame.old.png`

---

## B. 參考稿（保留，不影響專案）

開發初期當 layout reference 用，**正式 Phaser 程式沒載入**，但留著當風格指南無妨。

- `base-game.png`
- `開始畫面.png`
- `freeGame啟動畫面.png`
- `爆獎畫面.png`
- `v1-bonus-wheel-multipliers.png`
- `v1-ui-components.png`
- `coin_fx_sprites_preview-Photoroom.png`

---

## C. Codex 預覽程式本體（**不要動**）

這些就是 http://127.0.0.1:8000/ 的網頁本體，刪了你就看不到那個預覽頁。

- `index.html`
- `styles.css`
- `game.js`

---

## D. 目前 Phaser 主程式 **正在使用** 的素材（請保留）

`src/main.js` 已載入這些 key：

- `assets/bg/bg_battlefield_clean.png`
- `assets/characters/chu/chu_idle.png`、`han/han_idle.png`
- `assets/free_game/characters/yuji_idle.png`
- `assets/free_game/fx/phoenix_back.png`
- `assets/free_game/ui/fengming_jiuxiao_logo.png`
- `assets/reel/reel_bg.png`、`reel_frame.png`、`reel_separator.png`
- `assets/ui/panels/top_jackpot_panel.png`、`bottom_hud_panel.png`
- `assets/logo/info_bar.png`、`chuhan_logo_title.png`、`title_plaque.png`
- `assets/ui/hud/player_avatar_chu.png`、`icon_coin_stack.png`、`btn_bet_minus.png`、`btn_bet_plus.png`
- `assets/ui/buttons/btn_spin_normal.png`、`btn_settings_normal.png`、`btn_event_normal.png`、`btn_fast_normal.png`、`btn_auto_normal.png`、`btn_menu_normal.png`
- `assets/symbols/special/sym_bonus_han_seal.png`、`sym_scatter_phoenix_hairpin.png`、`sym_wild_dragon_jade.png`
- `assets/symbols/high/sym_halberd.png`、`sym_tiger_tally.png`
- `assets/symbols/low/sym_gem_red.png`、`sym_gem_purple.png`、`sym_gem_yellow.png`、`sym_gem_green.png`、`sym_gem_blue.png`
- `assets/win/bg/win_bg_award_clean.png`、`assets/win/ui/win_coin.png`

---

## E. 暫時沒用但未來會接的（建議保留）

| 路徑 | 用途規劃 |
|---|---|
| `assets/main_menu/` 全部 | 製作 Main Menu 場景時要用 |
| `assets/free_game/ui/fengming_jiuxiao_logo.png` | 已用 |
| `assets/free_game/ui/free_games_15_vertical.png`、`free_word_metal.png`、`game_word_metal.png`、`free_multiplier_x_metal.png` | Free Game 入場/HUD 字片 |
| `text/win_text_big.png`、`win_text_super.png`、`win_text_mega.png`、`win_text_jackpot.png` | Big/Super/Mega/Jackpot Win 招牌 |
| `text/fengming_jiuxiao_feature_logo.png`、`free_games_text_gold.png` | Free Game 招牌 |
| `text/title_text_frame_shell.png` | 標題框 |
| `numbers_gold/num_0~9.png` | 金字 bitmap font，未來換掉系統字型 |
| `assets/base_game/canonical_layers/` (6 檔) | Codex baked 圖、構圖參考 |
| `assets/base_game/bg/game_bg_*.png`（3 檔不含 _src） | 都帶綠幕底，需要去背才可用，可考慮保留或刪 |
| `assets/ui/buttons/btn_max_bet.png`、`assets/ui/hud/btn_max_bet.png` | 已被「自動」取代，**可刪** |
| `symbols/`（根目錄 10 檔） | 跟 `assets/symbols/` 內容近似但命名不同，**重複，可刪** |
| `data/main_menu_text.json` | Main Menu 文案 |
| `text/title_text_frame_shell.png` | 標題框 |

---

## 建議刪除清單（如果你同意）

**第一波（純安全，約 65 MB）：** A1 + A2 + A3 + A4 + A5 + A6

**第二波（重複/已替換，約 1 MB）：** E 段裡的兩個 max_bet + 根目錄 `symbols/`

請告訴我「**刪 A**」「**刪 A+第二波**」或「**先看更細的清單**」。
