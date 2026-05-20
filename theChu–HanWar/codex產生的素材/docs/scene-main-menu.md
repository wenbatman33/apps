# Phase X - Main Menu 開始畫面素材規劃

## 前提資訊

- 遊戲類型：老虎機 / Slot。
- 解析度：1920x1080 橫向。
- 美術風格：沿用 `docs/01-screens.md` 已定義風格，2D 豪華寫實卡牌感 Slot，楚漢戰場、宮廷金飾、漆器紅黑、青銅與玉石質感。
- 核心玩法：玩家從開始畫面進入一局楚漢爭霸 Slot，之後按下旋轉按鈕取得 6 x 5 轉輪結果。
- 題材世界觀：秦末漢初楚漢爭霸，以項羽、劉邦、虞姬三名核心角色與楚漢對決氛圍建立主視覺。
- 參考稿：`開始畫面.png`，僅作構圖、色彩與角色站位參考；正式素材需拆分為可載入圖檔。

## 1. 畫面分鏡概念

MainMenuScene 是固定鏡頭的正面主視覺畫面，不跟隨玩家，也不做世界捲動。畫面上方中央放置遊戲標題，左側是項羽，中央是劉邦，右側是虞姬，三名角色形成楚、漢與 Free Game 角色的視覺對照。背景以宮殿拱門、戰旗、火光、青藍冷光與粉紫羽翼能量構成三分區舞台。底部保留主要互動區，放置開始按鈕、設定按鈕、音效切換與短標語。

- 鏡頭視角：固定正面鏡頭，角色立繪以半身到全身的舞台式構圖呈現。
- 畫面分區：
  - 上方品牌區：遊戲 logo 與金屬標題框，建議 x=560-1360、y=40-220。
  - 中央角色區：項羽在左、劉邦在中、虞姬在右，角色主要輪廓不得被互動按鈕遮擋。
  - 下方互動區：開始按鈕置中，設定與音效按鈕置右下或左下，底部標語與版本資訊靠近安全區內緣。
  - 背景裝飾區：戰旗、宮殿、火光、羽翼能量與煙塵，只服務氛圍，不承載可點擊元素。
- 安全區與邊界：
  - 基準安全區：中央 1600x900，從 x=160 到 x=1760，y=90 到 y=990。
  - 主要按鈕不可放在外框 80px 內；開始按鈕建議位於 x=780-1140、y=820-960。
  - 設定與音效按鈕需保留至少 32px 點擊間距，避免靠近底部裁切。
  - 角色臉部、logo 文字與開始按鈕不得落在 16:9 螢幕裁切邊界。
  - 若手機橫向或瀏覽器縮放，logo 與開始按鈕優先保留在安全區內，角色外側可被輕微裁切。
- 配色主調：
  - `#120c0a` 深黑漆底
  - `#8b1f1b` 楚方暗紅
  - `#14385c` 漢方深藍
  - `#d9a441` 古金色
  - `#d837b5` 虞姬粉紫能量光

## 2. 圖層拆解（z-index 由低到高）

本作開始畫面是 Slot 主選單，不使用 tilemap、平台、玩家操作角色、敵人與投射物。保留背景、角色立繪、標題、按鈕、UI 特效與遮罩層。

| Depth | 層級名稱 | 用途 | 是否會動 |
|-------|---------|------|---------|
| 0 | bg_sky | 最遠背景，暗紅與青藍戰場天空、宮殿暗部 | 靜態 |
| 10 | bg_far | 遠景宮殿拱門、楚漢戰旗、火光與煙塵 | 靜態或極慢呼吸光 |
| 20 | bg_mid | 中景柱飾、戰旗布面、角色背後光暈 | 靜態 |
| 30 | character_back_fx | 角色背後火焰、藍光、粉紫羽翼能量 | 動畫或序列幀 |
| 40 | characters | 項羽、劉邦、虞姬三名主角色立繪 | 靜態，可做微幅 idle |
| 50 | character_nameplates | 三名角色姓名牌與身份牌 | 靜態 |
| 60 | title_logo | 遊戲標題與金屬標題框 | 靜態，可做閃光 |
| 70 | foreground_fx | 前景火花、粉紫光帶、金色閃點 | 動畫 |
| 100 | menu_buttons | 開始、設定、音效按鈕 | 按鈕狀態更新 |
| 110 | menu_hint | 底部標語、版本資訊、提示文字底板 | 靜態或呼吸 |
| 120 | hud_fx | 按鈕 hover、logo 閃光、點擊回饋 | 動畫 |
| 900 | overlay | 進入遊戲前淡入淡出遮罩、設定面板暗化圖 | 偶爾顯示 |
| 1000 | modal | 設定彈窗或音效確認面板 | 偶爾顯示 |

## 3. 每層素材明細

### Layer: bg_sky (Depth 0)

#### asset: main_menu_bg_sky

- 檔案：`assets/main_menu/bg/main_menu_bg_sky.webp`
- 尺寸：1920x1080
- 格式：WebP，無透明
- 用途：開始畫面最底層天空與宮殿暗部，提供黑紅、青藍、粉紫三分區色溫。
- 建議來源：Midjourney 或 SD + ControlNet。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "wide 16:9 ancient Chinese Chu Han war main menu background base, dark palace interior, crimson left side, deep blue center, magenta purple right side, smoky battlefield atmosphere, luxury slot game style, no characters, no text, no UI, low contrast center, 1920x1080"
- 製作備註：需保留中央 logo 與角色立繪可疊加的低細節區，不可出現 AI 亂字。

### Layer: bg_far (Depth 10)

#### asset: main_menu_bg_palace_arches

- 檔案：`assets/main_menu/bg/main_menu_bg_palace_arches.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：遠景宮殿拱門、梁柱與舞台縱深，疊在 sky 上方。
- 建議來源：SD + ControlNet 或 Photoshop 手工拆層。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "transparent layer of ancient Chinese palace arches and tall columns, Chu Han dynasty luxury stage backdrop, black lacquer shadows, bronze gold trim, symmetrical slot game main menu composition, no characters, no text, transparent background, 1920x1080"
- 製作備註：拱門線條不得穿過 logo 主要文字區，透明邊緣需乾淨。

#### asset: main_menu_bg_banners

- 檔案：`assets/main_menu/bg/main_menu_bg_banners.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：左側楚旗與右側漢旗，建立楚漢對決陣營感。
- 建議來源：SD 物件生成 + 後製去背。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "transparent layer of ancient Chinese war banners for Chu and Han factions, red banner on the left, blue banner on the right, gold calligraphy style emblem shapes without readable text, battlefield smoke, premium 2D slot game art, transparent background, 1920x1080"
- 製作備註：若需要旗上中文字，建議後製手排，不交給 AI 生成可讀文字。

#### asset: main_menu_bg_fire_smoke

- 檔案：`assets/main_menu/bg/main_menu_bg_fire_smoke.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：遠景火光、煙塵與戰場暖色氛圍。
- 建議來源：SD 或現成特效素材後製。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "transparent atmospheric layer of distant battlefield fire glow and smoke, ancient Chinese war mood, warm orange sparks, dark red haze, subtle cinematic lighting, no foreground objects, no text, transparent background, 1920x1080"
- 製作備註：火光亮度不可壓過角色臉部與開始按鈕。

### Layer: bg_mid (Depth 20)

#### asset: main_menu_mid_stage_columns

- 檔案：`assets/main_menu/bg/main_menu_mid_stage_columns.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：中景左右柱飾與金屬框線，讓開始畫面有豪華 Slot 舞台感。
- 建議來源：Recraft 或 Figma/Photoshop 手工整理。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "ornate ancient Chinese stage columns and side frame decorations, black lacquer, antique gold, bronze green patina, luxury slot game main menu UI frame, transparent center, no buttons, no text, transparent background, 1920x1080"
- 製作備註：不可覆蓋角色臉部；左右邊框可接近畫面邊緣但需保留安全區。

#### asset: main_menu_mid_character_glows

- 檔案：`assets/main_menu/bg/main_menu_mid_character_glows.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：三名角色背後分色光暈，左紅橙、中青藍、右粉紫。
- 建議來源：Photoshop / After Effects / SD 特效生成。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "transparent layer of three soft magical backlights for character portraits, orange red glow on left, cool blue glow in center, magenta purple glow on right, luxury fantasy slot game lighting, no characters, no text, transparent background, 1920x1080"
- 製作備註：光暈需要柔和，不可形成硬邊色塊。

### Layer: character_back_fx (Depth 30)

#### asset: xiang_yu_fire_fx

- 檔案：`assets/main_menu/fx/xiang_yu_fire_fx.png`
- 尺寸：512x512
- 格式：PNG Spritesheet，透明，4x4 幀
- 用途：項羽手部或身後火焰循環特效。
- 建議來源：現成火焰 sprite sheet 或 SD + 後製序列。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "loopable sprite sheet of heroic orange red magical flame, ancient Chinese warlord power effect, premium 2D game VFX, transparent background, no text, 16 frames, 512x512"
- 製作備註：單幀 128x128，播放時不可遮住角色臉部。

#### asset: liu_bang_blue_orb_fx

- 檔案：`assets/main_menu/fx/liu_bang_blue_orb_fx.png`
- 尺寸：512x512
- 格式：PNG Spritesheet，透明，4x4 幀
- 用途：劉邦玉璽或手中青藍能量光循環。
- 建議來源：SD 特效生成或 After Effects 製作。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "loopable sprite sheet of blue jade magical orb glow, ancient Chinese imperial seal energy, cyan particles, premium 2D slot game VFX, transparent background, no text, 16 frames, 512x512"
- 製作備註：光效要偏玉石青藍，避免和虞姬粉紫能量混淆。

#### asset: yu_ji_phoenix_wing_fx

- 檔案：`assets/main_menu/fx/yu_ji_phoenix_wing_fx.png`
- 尺寸：1024x1024
- 格式：PNG Spritesheet，透明，4x4 幀
- 用途：虞姬背後粉紫鳳凰羽翼與流光特效。
- 建議來源：SD + ControlNet 或手工特效序列。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "loopable sprite sheet of magenta phoenix wing energy and silk light trails, elegant ancient Chinese fantasy effect for Yu Ji, premium 2D game VFX, transparent background, no text, 16 frames, 1024x1024"
- 製作備註：單幀 256x256 或依實際構圖裁切；羽翼不可擋住 logo。

### Layer: characters (Depth 40)

#### asset: character_xiang_yu_menu

- 檔案：`assets/main_menu/characters/character_xiang_yu_menu.png`
- 尺寸：760x980
- 格式：PNG，透明
- 用途：開始畫面左側項羽主立繪，楚方英雄角色。
- 建議來源：SD + character consistency + 人工修圖。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "full body main menu character art of Xiang Yu, heroic ancient Chinese warlord, muscular armored warrior, black and dark green armor with antique gold trim, red cape, holding a halberd, dramatic firelight, premium realistic 2D slot game illustration, transparent background, no text, 760x980"
- 製作備註：武器可超出角色圖寬，但正式輸出需保留完整透明邊界；縮放到 70% 時臉部仍需清楚。

#### asset: character_liu_bang_menu

- 檔案：`assets/main_menu/characters/character_liu_bang_menu.png`
- 尺寸：640x900
- 格式：PNG，透明
- 用途：開始畫面中央劉邦主立繪，漢方帝王角色。
- 建議來源：SD + character consistency + 人工修圖。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "full body main menu character art of Liu Bang, noble ancient Chinese ruler, blue and purple imperial robes, antique gold armor accents, holding a jade imperial seal and bamboo scroll, calm confident expression, premium realistic 2D slot game illustration, transparent background, no text, 640x900"
- 製作備註：中央角色需讓出上方 logo 空間，頭頂不可碰到標題框。

#### asset: character_yu_ji_menu

- 檔案：`assets/main_menu/characters/character_yu_ji_menu.png`
- 尺寸：760x980
- 格式：PNG，透明
- 用途：開始畫面右側虞姬主立繪，Free Game 角色提示。
- 建議來源：SD + character LoRA + 人工修圖。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "full body main menu character art of Yu Ji, elegant ancient Chinese noblewoman, white and crimson silk dress, gold and jade jewelry, flowing hair ribbons, graceful magical pose, magenta phoenix light, premium realistic 2D slot game illustration, transparent background, no text, 760x980"
- 製作備註：服飾與姿態需符合遊戲尺度規範；右側粉紫光不可讓輪廓過曝。

### Layer: character_nameplates (Depth 50)

#### asset: nameplate_xiang_yu

- 檔案：`assets/main_menu/ui/nameplate_xiang_yu.png`
- 尺寸：420x130
- 格式：PNG，透明
- 用途：項羽姓名牌與 Base Game 角色標籤底板。
- 建議來源：Figma 手做；文字建議後製排版。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "ornate red and antique gold nameplate UI frame for a heroic Chu faction character, luxury ancient Chinese slot game style, black lacquer inset, gemstone corners, transparent background, no text, 420x130"
- 製作備註：AI 只生成底板，不生成文字；中文字由正式字體後製。

#### asset: nameplate_liu_bang

- 檔案：`assets/main_menu/ui/nameplate_liu_bang.png`
- 尺寸：420x130
- 格式：PNG，透明
- 用途：劉邦姓名牌與 Base Game 角色標籤底板。
- 建議來源：Figma 手做；文字建議後製排版。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "ornate deep blue and antique gold nameplate UI frame for a Han faction ruler character, luxury ancient Chinese slot game style, black lacquer inset, cyan gemstone corners, transparent background, no text, 420x130"
- 製作備註：需和項羽名牌同尺寸，方便排版對齊。

#### asset: nameplate_yu_ji

- 檔案：`assets/main_menu/ui/nameplate_yu_ji.png`
- 尺寸：420x130
- 格式：PNG，透明
- 用途：虞姬姓名牌與 Free Game 角色標籤底板。
- 建議來源：Figma 手做；文字建議後製排版。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "ornate magenta and antique gold nameplate UI frame for an elegant free game heroine character, luxury ancient Chinese slot game style, black lacquer inset, purple gemstone corners, transparent background, no text, 420x130"
- 製作備註：需明顯區分 Free Game 顏色，不可與主開始按鈕混淆。

### Layer: title_logo (Depth 60)

#### asset: game_logo_main_menu

- 檔案：`assets/main_menu/ui/game_logo_main_menu.png`
- 尺寸：820x260
- 格式：PNG，透明
- 用途：開始畫面主標題「楚漢爭霸」與金屬標題外框。
- 建議來源：Figma / Photoshop 手做，AI 僅可生成裝飾框草圖。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "ornate title logo frame for Chu Han Contention slot game, antique gold embossed Chinese war motif, black lacquer backing, jade gemstones, premium casino game logo style, transparent background, no readable text, 820x260"
- 製作備註：正式中文字需使用可控字型或手工描字，避免 AI 生成錯字；現有 `text/chuhan_logo_title.png` 可作參考或整理來源。

#### asset: title_logo_shine_fx

- 檔案：`assets/main_menu/fx/title_logo_shine_fx.png`
- 尺寸：1024x256
- 格式：PNG Spritesheet，透明，8x1 幀
- 用途：logo 金邊掃光循環。
- 建議來源：After Effects / Photoshop 手工製作。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "horizontal sprite sheet of golden shine sweep effect for ornate casino title logo, bright gold highlight streak, soft particles, transparent background, no text, 8 frames, 1024x256"
- 製作備註：單幀 128x256，掃光只疊在 logo 金屬邊與字面，不應照亮整個畫面。

### Layer: foreground_fx (Depth 70)

#### asset: main_menu_foreground_sparks

- 檔案：`assets/main_menu/fx/main_menu_foreground_sparks.png`
- 尺寸：1024x512
- 格式：PNG Spritesheet，透明，8x4 幀
- 用途：前景金色火花與粒子閃點，增加豪華感。
- 建議來源：現成粒子序列或 After Effects。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "sprite sheet of golden foreground sparks and tiny ember particles, luxury ancient Chinese slot game VFX, warm fire glow, transparent background, no text, 32 frames, 1024x512"
- 製作備註：雖可由 ParticleEmitter 即時播放粒子，但粒子貼圖本身仍需使用實際 PNG。

#### asset: yu_ji_pink_ribbon_overlay

- 檔案：`assets/main_menu/fx/yu_ji_pink_ribbon_overlay.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：右側前景粉紫絲帶光效，呼應虞姬與 Free Game。
- 建議來源：SD 特效生成 + 手工遮罩。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "transparent overlay of elegant magenta silk light ribbons sweeping across the right foreground, ancient Chinese fantasy slot game main menu effect, soft glow, no characters, no text, transparent background, 1920x1080"
- 製作備註：不得覆蓋開始按鈕文字或主要操作區。

### Layer: menu_buttons (Depth 100)

#### asset: button_start

- 檔案：`assets/main_menu/ui/button_start.png`
- 尺寸：1080x180
- 格式：PNG Spritesheet，透明，3x1 幀
- 用途：開始遊戲按鈕，包含 normal / pressed / disabled 三種狀態。
- 建議來源：Figma 手做或 Recraft，文字後製。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "three state horizontal sprite sheet of a large luxury start button frame, ancient Chinese black lacquer and antique gold border, red gemstone accent, premium slot game UI, transparent background, no text, normal pressed disabled, 1080x180"
- 製作備註：單幀 360x180；正式「開始遊戲」文字需後製排版，不使用 AI 亂字。

#### asset: button_settings

- 檔案：`assets/main_menu/ui/button_settings.png`
- 尺寸：384x128
- 格式：PNG Spritesheet，透明，3x1 幀
- 用途：設定按鈕，包含 normal / pressed / disabled 三種狀態。
- 建議來源：Figma 手做。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "three state horizontal sprite sheet of circular settings icon button, antique gold bronze frame, black lacquer center, gear symbol, ancient Chinese luxury slot UI, transparent background, no text, normal pressed disabled, 384x128"
- 製作備註：單幀 128x128；齒輪 icon 必須清楚，不使用 Phaser 幾何繪製。

#### asset: button_sound

- 檔案：`assets/main_menu/ui/button_sound.png`
- 尺寸：512x128
- 格式：PNG Spritesheet，透明，4x1 幀
- 用途：音效切換按鈕，包含 on_normal / on_pressed / off_normal / off_pressed。
- 建議來源：Figma 手做。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "four frame horizontal sprite sheet of sound toggle circular icon button, speaker on and speaker off states, antique gold bronze frame, black lacquer center, ancient Chinese luxury slot UI, transparent background, no text, 512x128"
- 製作備註：單幀 128x128；off 狀態建議以斜線圖示呈現。

### Layer: menu_hint (Depth 110)

#### asset: main_menu_tagline_panel

- 檔案：`assets/main_menu/ui/main_menu_tagline_panel.png`
- 尺寸：1240x92
- 格式：PNG，透明
- 用途：底部標語底板，例如楚漢對決、英雄爭鋒、虞姬降臨、扭轉乾坤。
- 建議來源：Figma 手做；文字後製。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "long bottom tagline panel for luxury ancient Chinese slot game main menu, black lacquer center, antique gold border, red and purple gemstone ends, transparent background, no text, 1240x92"
- 製作備註：正式標語用文字系統或獨立字圖，不讓 AI 生成文字。

#### asset: main_menu_version_plate

- 檔案：`assets/main_menu/ui/main_menu_version_plate.png`
- 尺寸：280x56
- 格式：PNG，透明
- 用途：版本號、版權或伺服器提示的小底板。
- 建議來源：Figma 手做。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "small version information plate for luxury ancient Chinese slot game UI, dark translucent lacquer panel, thin antique gold border, transparent background, no text, 280x56"
- 製作備註：若 Phase 1 不顯示版本資訊，可暫不製作此素材。

### Layer: hud_fx (Depth 120)

#### asset: button_hover_glow

- 檔案：`assets/main_menu/fx/button_hover_glow.png`
- 尺寸：512x256
- 格式：PNG Spritesheet，透明，4x2 幀
- 用途：開始按鈕 hover 或可點擊狀態的金光呼吸。
- 建議來源：After Effects / Photoshop。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "loopable sprite sheet of soft golden button hover glow, premium casino UI highlight, subtle particles, transparent background, no text, 8 frames, 512x256"
- 製作備註：單幀 128x128 或依按鈕寬度後製拉伸；亮度不可刺眼。

### Layer: overlay (Depth 900)

#### asset: main_menu_transition_dim

- 檔案：`assets/main_menu/ui/main_menu_transition_dim.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：點擊開始後的淡出暗化圖、設定面板背後遮罩。
- 建議來源：Figma / Photoshop 手做。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "semi transparent dark red black vignette overlay for ancient Chinese slot game menu transition, subtle lacquer texture, no text, 1920x1080 PNG"
- 製作備註：不可用 Phaser Graphics 畫半透明矩形；需載入這張實際圖檔。

### Layer: modal (Depth 1000)

#### asset: panel_settings

- 檔案：`assets/main_menu/ui/panel_settings.png`
- 尺寸：760x560
- 格式：PNG，透明
- 用途：開始畫面的設定彈窗底板，可放音量、語言、返回按鈕。
- 建議來源：Figma 手做。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "settings modal panel for luxury ancient Chinese slot game, black lacquer center, antique gold ornate border, jade accents, transparent background, no text, 760x560"
- 製作備註：本輪只規劃開始畫面素材，設定面板內容若要互動細項需另行拆分按鈕與滑桿圖。

## 4. Spritesheet / Atlas 規劃

### 角色立繪

開始畫面三名角色建議先用獨立 PNG 立繪，不打入 atlas，因為單張尺寸大、載入後常駐且位置固定。若 Phase 2 要做角色 idle，可額外製作局部特效 spritesheet，不建議把全身角色拆成逐幀大圖，以免檔案過大。

| 角色 | 基礎圖 | 建議 idle | 幀數 | 單幀尺寸 | 播放速度 |
|---|---|---|---:|---|---:|
| 項羽 | `character_xiang_yu_menu.png` | 火焰與披風光影用獨立 fx 疊加 | 16 | 128x128 fx | 12 fps |
| 劉邦 | `character_liu_bang_menu.png` | 玉璽青藍光與衣緣金光用獨立 fx 疊加 | 16 | 128x128 fx | 10 fps |
| 虞姬 | `character_yu_ji_menu.png` | 鳳凰羽翼與粉紫絲帶用獨立 fx 疊加 | 16 | 256x256 fx | 12 fps |

### UI 按鈕 Spritesheet

| 素材 | 狀態 / 動作清單 | 幀數 | 單幀尺寸 | 播放速度 | 打包方式 |
|---|---|---:|---|---:|---|
| `button_start` | normal / pressed / disabled | 3 | 360x180 | 狀態切換，不循環 | spritesheet |
| `button_settings` | normal / pressed / disabled | 3 | 128x128 | 狀態切換，不循環 | spritesheet |
| `button_sound` | on_normal / on_pressed / off_normal / off_pressed | 4 | 128x128 | 狀態切換，不循環 | spritesheet |
| `title_logo_shine_fx` | shine_01 至 shine_08 | 8 | 128x256 | 8 fps | spritesheet |
| `button_hover_glow` | glow_01 至 glow_08 | 8 | 128x128 | 10 fps | spritesheet |

### Atlas 建議

- 大型角色與背景不打包 atlas，使用獨立 PNG / WebP。
- 小型 UI 狀態圖可在 Phase 2 之後打包成 `assets/main_menu/atlases/main_menu_ui.png` 與 `assets/main_menu/atlases/main_menu_ui.json`。
- 推薦工具：Aseprite 製作序列幀，TexturePacker 打包 UI atlas。
- atlas json 格式：Phaser 3 multi-atlas。

## 5. 視差捲動參數表

開始畫面不是捲軸遊戲，不需要跟隨攝影機視差。若後續要做滑鼠或裝置傾斜的微視差，可使用以下保守參數作為美術動態規劃參考。

| 層級名稱 | scrollFactorX | scrollFactorY | 備註 |
|---|---:|---:|---|
| bg_sky | 0.00 | 0.00 | 固定底圖 |
| bg_far | 0.02 | 0.00 | 只做極輕微水平漂移 |
| bg_mid | 0.04 | 0.00 | 柱飾與戰旗可比遠景略明顯 |
| character_back_fx | 0.00 | 0.00 | 使用 alpha / scale 循環，不做捲動 |
| characters | 0.00 | 0.00 | 角色固定，避免點擊區錯位 |
| foreground_fx | 0.06 | 0.00 | 可做前景粒子輕微漂移 |
| menu_buttons | 0.00 | 0.00 | UI 必須固定 |

## 6. 生圖工作流建議

- 背景大圖：Midjourney 先產整體氣氛圖，SD + ControlNet 或 Photoshop 拆成 `bg_sky`、`bg_palace_arches`、`bg_banners`、`fire_smoke`。
- 角色立繪：SD + character consistency / LoRA 生成項羽、劉邦、虞姬，再人工修臉、手、武器與透明邊緣。
- UI / HUD 元件：Figma 手做優先，Recraft 可用於金屬框、寶石與裝飾底板；正式文字必須後製排版。
- 粒子 / 特效：使用實際 PNG spritesheet 或現成 VFX 素材；可以用 Phaser ParticleEmitter 播放，但粒子貼圖不得由程式繪製生成。
- 文字素材：中文 logo、姓名牌文字與標語建議用 Photoshop / Figma 以可控字型製作，輸出透明 PNG 或 bitmap font。
- 檔名整理：正式圖檔一律小寫底線命名；現有中文參考圖只保留在根目錄作 reference，不作正式載入路徑。

## 7. 待確認清單

1. 開始畫面是否維持三角色構圖：左項羽、中劉邦、右虞姬。
2. 開始按鈕要放在底部中央，還是讓玩家點擊任意處進入 GameScene。
3. 角色姓名牌是否需要保留「BASE GAME 角色 / FREE GAME 角色」這類副標。
4. 主標題正式字樣是否固定為「楚漢爭霸」，或需要加入英文副標。
5. 是否需要 MainMenuScene 的角色 idle 動畫，還是 Phase 1 先用靜態立繪與特效即可。
6. 設定面板是否在本階段拆完整 UI，或先只規劃設定按鈕圖示。
7. 是否需要日夜、節慶或活動版本的開始畫面背景。
