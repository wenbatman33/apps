# Phase X - Base Game 主遊戲畫面素材規劃

## 前提資訊

- 遊戲類型：老虎機 / Slot。
- 解析度：1920x1080 橫向。
- 美術風格：沿用 `docs/01-screens.md` 已定義風格，2D 豪華寫實卡牌感 Slot，楚漢戰場、宮廷金飾、漆器紅黑、青銅與玉石質感。
- 核心玩法：玩家按下旋轉按鈕，等待固定 6 x 5 轉動元素停止後顯示本局中獎結果。
- 題材世界觀：秦末漢初楚漢爭霸，戰場軍帳、宮廷金飾、青銅兵器與玉璽符號組成主遊戲盤面。

## 1. 畫面分鏡概念

GameScene 是固定鏡頭的 16:9 正面舞台畫面，不跟隨玩家，也不做關卡捲動。畫面中央是固定 6 軸 x 5 列的 Slot 玩法區，轉輪框位於安全區中央偏上；下方保留 HUD 與主要操作按鈕；左右兩側與上方用楚漢戰場、宮殿柱飾、金屬雕花與戰旗作為裝飾。現有 `base-game.png` 作為主畫面構圖參考，但正式素材應拆成可載入的背景、前景、轉輪框、符號 atlas、特效與 HUD 圖層。

- 鏡頭視角：固定正面鏡頭，無玩家跟隨，無世界攝影機捲動。
- 畫面分區：
  - 中央玩法區：固定 6 x 5 轉動元素，建議位置 x=340-1580、y=160-860。
  - 下方 HUD 區：餘額、下注、贏分、旋轉、停止、加減注，建議 y=860-1080。
  - 左右裝飾區：楚漢戰旗、青銅柱、宮廷金飾，避免放互動元素。
  - 上方裝飾區：標題、光效、戰場遠景，避免放高頻互動元素。
- 安全區與邊界：
  - 基準安全區：中央 1600x900，從 x=160 到 x=1760，y=90 到 y=990。
  - 互動元素不可放在外框 80px 內。
  - 旋轉按鈕、下注按鈕、停止按鈕必須在 y=860-1010 且保留 32px 以上點擊間距。
  - 轉輪符號不可被 HUD 遮住；轉輪可視區底部應高於 y=830。
- 配色主調：
  - `#120c0a` 深黑漆底
  - `#7f1f1b` 漆器暗紅
  - `#d4a54a` 古金色
  - `#2f5d55` 青銅綠
  - `#f5d27a` 獎勵暖金光

## 2. 圖層拆解（z-index 由低到高）

本作為固定畫面 Slot，不使用平台、敵人、玩家、投射物等動作遊戲層。保留並調整為 Slot 主遊戲需要的舞台、轉輪、符號、HUD 與獎勵特效層。

| Depth | 層級名稱 | 用途 | 是否會動 |
|-------|---------|------|---------|
| 0 | bg_sky | 最遠背景，暗紅天空與戰場氛圍 | 靜態 |
| 10 | bg_far | 遠景宮殿、戰旗、火光剪影 | 輕微呼吸光效，可靜態 |
| 20 | bg_mid | 中景青銅柱、軍帳、側邊裝飾 | 靜態 |
| 30 | bg_near | 近景金飾舞台與前景遮擋 | 靜態 |
| 40 | tilemap / platform | 本作不使用 | 本作不使用 |
| 50 | interactive_static | 本作不使用；主互動集中於 HUD 按鈕 | 本作不使用 |
| 60 | items | 本作不使用；可拾取道具不屬於 Slot 主畫面 | 本作不使用 |
| 70 | enemies | 本作不使用 | 本作不使用 |
| 80 | player | 本作不使用 | 本作不使用 |
| 90 | projectiles | 本作不使用 | 本作不使用 |
| 100 | reel_frame | 6 x 5 轉輪框、格線、遮罩邊框 | 靜態 |
| 120 | reels | 6 軸 x 5 列符號容器與轉動符號 | 旋轉動畫 |
| 130 | reel_mask_overlay | 轉輪上方遮罩、反光與框內陰影 | 靜態 |
| 150 | symbol_highlight | 單格符號中獎框與高亮 | 動畫 |
| 170 | win_lines | 中獎線、連線光束 | 動畫 |
| 190 | fx_world | 轉輪火花、金光、停輪衝擊 | 動畫 |
| 200 | hud_bg | HUD 底板與下方金屬面板 | 靜態 |
| 210 | hud_elements | 餘額、下注、贏分、按鈕 | 數值更新 / 按鈕狀態 |
| 220 | hud_fx | 贏分飄字、按鈕發光、combo 提示 | 動畫 |
| 900 | overlay | 暗化遮罩、轉場遮罩 | 偶爾顯示 |
| 1000 | modal | 本輪 GameScene 不規劃彈窗；Result/Pause 另屬其他 Scene | 本作不使用 |

## 3. 每層素材明細

### Layer: bg_sky (Depth 0)

asset: `game_bg_sky`

- 檔案：`assets/bg/game_bg_sky.webp`
- 尺寸：1920x1080
- 格式：WebP，無透明
- 用途：最底層暗紅戰場天空與遠方煙塵，提供主畫面整體色溫。
- 建議來源：Midjourney 或 SD + ControlNet，確保構圖中央不搶轉輪視覺。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "dark crimson ancient Chinese battlefield sky at dusk, distant smoke and warm fire glow, Chu Han war atmosphere, luxury slot game background base layer, cinematic 2D rendered art, no characters, no text, no UI, central area kept low contrast, 1920x1080"
- 製作備註：中央 x=440-1480、y=220-820 必須低細節，避免干擾轉輪符號。

### Layer: bg_far (Depth 10)

asset: `game_bg_far_palace`

- 檔案：`assets/bg/game_bg_far_palace.webp`
- 尺寸：1920x1080
- 格式：WebP，無透明
- 用途：遠景宮殿輪廓、戰旗剪影與火光，疊在天空上方。
- 建議來源：Midjourney 或 SD + ControlNet。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "distant ancient Chinese palace silhouettes and war banners, Chu Han dynasty battlefield ambience, bronze rooftops, subtle orange firelight, premium realistic 2D slot game background layer, low contrast center, no text, no UI, no foreground objects, 1920x1080"
- 製作備註：如果無法獨立去背，允許與 `game_bg_sky` 合成為單張背景；但 GameScene 載入 key 仍應保留明確命名。

asset: `game_bg_far_flags`

- 檔案：`assets/bg/game_bg_far_flags.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：遠方楚漢戰旗與煙霧剪影，可做極輕微 alpha 呼吸動畫。
- 建議來源：SD + 後製去背。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "transparent layer of distant ancient Chinese war banners and smoky silhouettes, Chu Han battlefield, dark red and bronze palette, subtle backlit flags, premium 2D game art, no ground, no text, transparent background, 1920x1080"
- 製作備註：旗幟不可進入轉輪主要可視區，以左右與上方裝飾為主。

### Layer: bg_mid (Depth 20)

asset: `game_bg_mid_columns`

- 檔案：`assets/bg/game_bg_mid_columns.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：左右青銅柱、宮廷梁柱、主舞台中景裝飾。
- 建議來源：SD + ControlNet 或 Figma/Photoshop 後製。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "ornate bronze and black lacquer Chinese palace columns on left and right edges, Chu Han war luxury slot game frame decoration, jade accents, gold trim, transparent center for reel area, no text, transparent background, 1920x1080"
- 製作備註：中央 x=390-1530 應保持透明或低遮擋。

asset: `game_bg_mid_battle_drums`

- 檔案：`assets/bg/game_bg_mid_battle_drums.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：左右下方戰鼓、兵器架與軍帳裝飾，增加楚漢戰場感。
- 建議來源：SD 物件生成 + 手工排版。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "ancient Chinese battle drums, bronze weapon racks and military tent ornaments arranged along lower left and lower right edges, Chu Han war theme, premium realistic 2D slot game decoration, transparent background, no text, 1920x1080"
- 製作備註：不得覆蓋 HUD 操作按鈕，y=860-1080 的按鈕區要保留清楚對比。

### Layer: bg_near (Depth 30)

asset: `game_bg_near_gold_stage`

- 檔案：`assets/bg/game_bg_near_gold_stage.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：近景金色舞台、下緣前景、轉輪外圍裝飾。
- 建議來源：Midjourney 或 SD 生成後 Photoshop 去背整理。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "foreground luxury gold lacquer stage frame for ancient Chinese slot game, Chu Han dynasty motifs, black red enamel, bronze carvings, jade inlays, transparent center and transparent upper area, premium 2D rendered UI decoration, no text, 1920x1080"
- 製作備註：需與 HUD 底板分離，避免日後按鈕狀態更新時重切整張圖。

asset: `game_bg_near_side_ornaments`

- 檔案：`assets/bg/game_bg_near_side_ornaments.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：左右前景金飾、龍紋、青銅邊飾，壓住背景邊界。
- 建議來源：Recraft 或 SD + 手工修邊。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "left and right foreground ornaments for luxury ancient Chinese slot machine, gold dragon patterns, bronze green patina, black lacquer red details, transparent middle area, no buttons, no text, transparent background, 1920x1080"
- 製作備註：邊飾不得遮住旋轉與下注按鈕的點擊區。

### Layer: reel_frame (Depth 100)

asset: `reel_frame_base`

- 檔案：`assets/ui/reel_frame_base.png`
- 尺寸：1240x700
- 格式：PNG，透明
- 用途：固定 6 軸 x 5 列轉輪主框，包含外框、內框、格線與底座。
- 建議來源：Figma 手做或 Recraft，避免純 AI 造成格線不準。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "six reel five row slot machine frame, ornate ancient Chinese gold and bronze border, black lacquer inner panels, precise rectangular reel windows, premium casino UI, transparent background, no symbols, no text, 1240x700"
- 製作備註：六個 reel window 尺寸必須一致，盤面固定 6 x 5，不得改為 5 x 3 或其他規格；建議單格可視區約 170px x 120px。

asset: `reel_frame_dividers`

- 檔案：`assets/ui/reel_frame_dividers.png`
- 尺寸：1240x700
- 格式：PNG，透明
- 用途：轉輪分隔線、格線高光，可獨立調整 depth。
- 建議來源：Figma 手做。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "precise six by five slot reel divider overlay, thin ornate gold vertical and horizontal grid lines for 6 columns and 5 rows, ancient Chinese bronze details, transparent background, no symbols, no text, 1240x700"
- 製作備註：需與 `reel_frame_base` 完全對齊，方便中獎效果疊加。

### Layer: reels (Depth 120)

asset: `symbols_base_atlas`

- 檔案：`assets/atlases/symbols_base.png`
- 尺寸：2048x2048
- 格式：PNG Atlas，透明
- 用途：Base Game 全部轉輪符號圖塊。
- 建議來源：SD 物件 prompt + 人工修圖 + TexturePacker。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "complete set of premium slot symbols for Chu Han war theme, Xiang Yu portrait icon, Liu Bang portrait icon, Yu Ji portrait icon, jade imperial seal, bronze sword, war drum, wild emblem, scatter emblem, bonus coin, A K Q J 10 card symbols, consistent gold red bronze palette, transparent background, high detail 2D rendered game icons, 2048x2048"
- 製作備註：AI 可先生成單張符號，再由 TexturePacker 打包；不要直接依賴 AI 排好的 atlas。

asset: `symbol_xiang_yu`

- 檔案：`assets/symbols/symbol_xiang_yu.png`
- 尺寸：240x240
- 格式：PNG，透明
- 用途：高倍率角色符號，項羽。
- 建議來源：SD + character consistency 後製。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "slot symbol icon of Xiang Yu, heroic ancient Chinese warlord portrait, black armor, gold trim, intense expression, Chu Han war theme, premium 2D rendered game icon, transparent background, no text, centered, 240x240"
- 製作備註：臉部要清楚，縮到 160px 仍可辨識。

asset: `symbol_liu_bang`

- 檔案：`assets/symbols/symbol_liu_bang.png`
- 尺寸：240x240
- 格式：PNG，透明
- 用途：高倍率角色符號，劉邦。
- 建議來源：SD + character consistency 後製。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "slot symbol icon of Liu Bang, noble ancient Chinese ruler portrait, dark red and gold robes, confident calm expression, Chu Han war theme, premium 2D rendered game icon, transparent background, no text, centered, 240x240"
- 製作備註：和項羽區分清楚，輪廓與配色不可太接近。

asset: `symbol_yu_ji`

- 檔案：`assets/symbols/symbol_yu_ji.png`
- 尺寸：240x240
- 格式：PNG，透明
- 用途：高倍率角色符號，虞姬。
- 建議來源：SD + character LoRA 或人工修圖。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "slot symbol icon of Yu Ji, elegant ancient Chinese noblewoman portrait, flowing silk hair ornament, jade and gold accessories, gentle dramatic expression, Chu Han war theme, premium 2D rendered game icon, transparent background, no text, centered, 240x240"
- 製作備註：可參考既有虞姬 Free Game 舊稿，但正式檔名需小寫底線。

asset: `symbol_jade_seal`

- 檔案：`assets/symbols/symbol_jade_seal.png`
- 尺寸：240x240
- 格式：PNG，透明
- 用途：中高倍率符號，玉璽。
- 建議來源：SD 物件 prompt 或 Recraft。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "slot symbol icon of ancient Chinese jade imperial seal, green jade with gold base, soft glow, premium casino game object icon, Chu Han dynasty theme, transparent background, no text, centered, 240x240"
- 製作備註：保留厚實輪廓，避免透明玉石在深色背景上消失。

asset: `symbol_bronze_sword`

- 檔案：`assets/symbols/symbol_bronze_sword.png`
- 尺寸：240x240
- 格式：PNG，透明
- 用途：中倍率符號，青銅劍。
- 建議來源：SD 物件 prompt。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "slot symbol icon of ancient Chinese bronze sword, gold bronze blade, red tassel, dramatic rim light, premium 2D rendered game item, Chu Han war theme, transparent background, no text, centered, 240x240"
- 製作備註：劍身角度建議 30 度斜放，增加符號辨識度。

asset: `symbol_war_drum`

- 檔案：`assets/symbols/symbol_war_drum.png`
- 尺寸：240x240
- 格式：PNG，透明
- 用途：中倍率符號，戰鼓。
- 建議來源：SD 物件 prompt。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "slot symbol icon of ancient Chinese war drum, red lacquer drum body, gold bronze studs, crossed drumsticks, premium 2D rendered game item, Chu Han battlefield theme, transparent background, no text, centered, 240x240"
- 製作備註：鼓面不要出現文字或不可控符號。

asset: `symbol_wild`

- 檔案：`assets/symbols/symbol_wild.png`
- 尺寸：240x240
- 格式：PNG，透明
- 用途：Wild 特殊符號。
- 建議來源：Figma 字牌設計 + Recraft 裝飾。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "wild slot symbol emblem, ornate ancient Chinese gold frame, black lacquer red center, powerful bronze dragon motif, premium casino UI icon, transparent background, no readable text, centered, 240x240"
- 製作備註：是否放英文 WILD 需再確認；若要文字建議後製手排，避免 AI 亂字。

asset: `symbol_scatter`

- 檔案：`assets/symbols/symbol_scatter.png`
- 尺寸：240x240
- 格式：PNG，透明
- 用途：Scatter / Free Game 觸發符號。
- 建議來源：Figma 字牌設計 + SD 物件。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "scatter slot symbol emblem, glowing jade pendant and golden silk ribbon, ancient Chinese luxury slot game icon, Chu Han theme, transparent background, no readable text, centered, 240x240"
- 製作備註：需與 Wild 色彩區分，建議偏青玉綠。

asset: `symbol_bonus`

- 檔案：`assets/symbols/symbol_bonus.png`
- 尺寸：240x240
- 格式：PNG，透明
- 用途：Bonus Wheel 觸發符號。
- 建議來源：SD 物件 prompt。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "bonus slot symbol icon, golden ancient Chinese coin wheel emblem, red lacquer glow, bronze ornaments, premium 2D rendered casino game icon, transparent background, no readable text, centered, 240x240"
- 製作備註：外型需暗示輪盤，和一般金幣區分。

asset: `symbol_low_cards`

- 檔案：`assets/symbols/symbol_low_cards.png`
- 尺寸：1200x240
- 格式：Spritesheet 或 atlas source，透明
- 用途：低倍率 A、K、Q、J、10 符號。
- 建議來源：Figma 手做，AI 只供裝飾參考。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "set of five low value slot card symbols A K Q J 10, ancient Chinese gold calligraphy style, black red lacquer fill, bronze frame, consistent premium casino UI, transparent background, no extra letters, 1200x240"
- 製作備註：文字必須人工校正，避免 AI 字形錯誤。

### Layer: reel_mask_overlay (Depth 130)

asset: `reel_mask_overlay`

- 檔案：`assets/ui/reel_mask_overlay.png`
- 尺寸：1240x700
- 格式：PNG，透明
- 用途：轉輪窗口上方暗角、玻璃反光與上下遮罩邊緣。
- 建議來源：Figma / Photoshop 手做。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "transparent glass reflection and soft shadow overlay for six reel five row slot window, subtle gold highlights, black vignette edges, premium casino UI polish, transparent background, no symbols, no text, 1240x700"
- 製作備註：避免過度遮蓋符號，中心透明度建議低於 18%。

### Layer: symbol_highlight (Depth 150)

asset: `symbol_highlight_gold`

- 檔案：`assets/fx/symbol_highlight_gold.png`
- 尺寸：960x192
- 格式：Spritesheet，透明
- 用途：單格符號中獎外框，5 幀循環發光。
- 建議來源：After Effects / Spine / SD 特效素材後製。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "animated slot symbol highlight frame spritesheet, five frames horizontal, ornate gold glow rectangle, ancient Chinese luxury UI, transparent background, no text, 960x192"
- 製作備註：單幀 192x192，5 幀，需可疊在 180x180 符號上。

asset: `symbol_highlight_jade`

- 檔案：`assets/fx/symbol_highlight_jade.png`
- 尺寸：960x192
- 格式：Spritesheet，透明
- 用途：Scatter / Bonus 特殊符號高亮，5 幀青玉光。
- 建議來源：After Effects / SD 特效素材後製。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "animated jade green slot symbol highlight frame spritesheet, five frames horizontal, gold and jade glow rectangle, ancient Chinese premium game effect, transparent background, no text, 960x192"
- 製作備註：與一般金色中獎框明顯區分。

### Layer: win_lines (Depth 170)

asset: `win_line_horizontal`

- 檔案：`assets/fx/win_line_horizontal.png`
- 尺寸：1240x700
- 格式：Spritesheet 或 PNG 序列，透明
- 用途：橫向中獎線光束。
- 建議來源：After Effects 或現成光效 sprite sheet。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "horizontal winning payline glow for six reel five row slot machine, bright gold energy beam with sparks, ancient Chinese premium casino effect, transparent background, no text, 1240x700"
- 製作備註：需支援 5 列橫線位置，建議由同素材在程式中定位。

asset: `win_line_diagonal`

- 檔案：`assets/fx/win_line_diagonal.png`
- 尺寸：1240x700
- 格式：Spritesheet 或 PNG 序列，透明
- 用途：斜線中獎線光束。
- 建議來源：After Effects 或現成光效 sprite sheet。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "diagonal winning payline glow for six reel five row slot machine, bright gold curved energy beam, red sparks, ancient Chinese premium casino effect, transparent background, no text, 1240x700"
- 製作備註：左右斜線可共用素材翻轉，但需確認光源方向是否可接受。

### Layer: fx_world (Depth 190)

asset: `reel_stop_burst`

- 檔案：`assets/fx/reel_stop_burst.png`
- 尺寸：1536x256
- 格式：Spritesheet，透明
- 用途：單軸停止時的金色衝擊光。
- 建議來源：After Effects / SD 特效素材後製。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "six frame horizontal spritesheet of golden burst impact effect, slot reel stop sparkle, ancient Chinese casino game, transparent background, no text, 1536x256"
- 製作備註：單幀 256x256，6 幀，播放一次不循環。

asset: `coin_sparkle`

- 檔案：`assets/fx/coin_sparkle.png`
- 尺寸：2048x256
- 格式：Spritesheet，透明
- 用途：贏分時沿轉輪框飄出的金幣火花。
- 建議來源：After Effects 或現成粒子 sprite sheet。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "eight frame horizontal spritesheet of small golden coin sparkles and glitter particles, premium slot win effect, ancient Chinese gold palette, transparent background, no text, 2048x256"
- 製作備註：若後續使用 Phaser ParticleEmitter，仍需使用此圖作為粒子貼圖，不用 Graphics 繪製。

asset: `anticipation_glow`

- 檔案：`assets/fx/anticipation_glow.png`
- 尺寸：1024x512
- 格式：Spritesheet，透明
- 用途：差一格觸發 Scatter / Bonus 時的轉輪期待光。
- 建議來源：After Effects / SD 特效後製。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "animated anticipation glow effect for slot reels, gold and jade vertical light sweep, suspenseful premium casino effect, transparent background, no text, 1024x512"
- 製作備註：Phase 1 可先不使用，Phase 2 或 Phase 3 補。

### Layer: hud_bg (Depth 200)

asset: `hud_panel_base`

- 檔案：`assets/ui/hud_panel_base.png`
- 尺寸：1920x220
- 格式：PNG，透明
- 用途：底部 HUD 黑紅金屬底板，承載餘額、下注、贏分與按鈕。
- 建議來源：Figma 手做或 Recraft。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "bottom HUD panel for luxury ancient Chinese slot game, black lacquer base, ornate gold trim, bronze green jade accents, transparent top edge, no text, no buttons, transparent background, 1920x220"
- 製作備註：HUD 高度建議 y=860-1080，保留按鈕熱區。

asset: `hud_value_plate`

- 檔案：`assets/ui/hud_value_plate.png`
- 尺寸：360x92
- 格式：PNG，透明
- 用途：餘額、下注、贏分數值底板，可重複使用三次。
- 建議來源：Figma 手做。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "small value display plate for slot HUD, black lacquer rectangle with gold bronze border and jade accent, ancient Chinese luxury UI, transparent background, no text, 360x92"
- 製作備註：文字與數字後續用 bitmap font 或文字系統疊加，不烘在圖裡。

### Layer: hud_elements (Depth 210)

asset: `button_spin`

- 檔案：`assets/ui/button_spin.png`
- 尺寸：540x180
- 格式：Spritesheet，透明
- 用途：旋轉按鈕，normal / pressed / disabled 三幀。
- 建議來源：Figma 手做或 Recraft，狀態需人工校正。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "three frame horizontal spritesheet of ornate circular spin button, ancient Chinese luxury slot UI, red lacquer center, gold bronze frame, normal pressed disabled states, transparent background, no readable text, 540x180"
- 製作備註：單幀 180x180，若要文字建議由程式文字或後製文字另外處理。

asset: `button_stop`

- 檔案：`assets/ui/button_stop.png`
- 尺寸：180x180
- 格式：PNG，透明
- 用途：旋轉中停止按鈕。
- 建議來源：Figma 手做或 Recraft。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "ornate circular stop button for luxury ancient Chinese slot UI, deep red lacquer center, gold bronze rim, strong pressed look, transparent background, no readable text, 180x180"
- 製作備註：可和 `button_spin` 共用外框語言，但中心色彩需更緊急。

asset: `button_bet_minus`

- 檔案：`assets/ui/button_bet_minus.png`
- 尺寸：96x96
- 格式：PNG，透明
- 用途：減少下注按鈕。
- 建議來源：Figma 手做。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "small minus bet button for ancient Chinese luxury slot HUD, circular bronze gold frame, black lacquer center, clear minus icon, transparent background, no text, 96x96"
- 製作備註：符號必須人工確認是清楚的 minus。

asset: `button_bet_plus`

- 檔案：`assets/ui/button_bet_plus.png`
- 尺寸：96x96
- 格式：PNG，透明
- 用途：增加下注按鈕。
- 建議來源：Figma 手做。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "small plus bet button for ancient Chinese luxury slot HUD, circular bronze gold frame, black lacquer center, clear plus icon, transparent background, no text, 96x96"
- 製作備註：符號必須人工確認是清楚的 plus。

asset: `button_menu`

- 檔案：`assets/ui/button_menu.png`
- 尺寸：96x96
- 格式：PNG，透明
- 用途：HUD 選單或暫停入口。
- 建議來源：Figma 手做。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "small menu button for ancient Chinese luxury slot HUD, circular bronze gold frame, black lacquer center, three horizontal line icon, transparent background, no text, 96x96"
- 製作備註：若後續 PauseScene 使用同一顆，保持 key 不變。

asset: `hud_gold_numbers`

- 檔案：`assets/fonts/hud_gold_numbers.png`
- 尺寸：1024x256
- 格式：Bitmap Font PNG，透明
- 用途：餘額、下注、贏分數字顯示。
- 建議來源：Figma / BMFont / Glyph Designer，不建議 AI 直接生成字型。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "gold embossed numeric bitmap font style reference, digits zero to nine, comma, dot, plus, minus, ancient Chinese luxury slot UI, black shadow, transparent background, clean readable shapes, 1024x256"
- 製作備註：實際 bitmap font 需輸出 `.xml` 或 `.fnt` metadata。

### Layer: hud_fx (Depth 220)

asset: `win_count_up_glow`

- 檔案：`assets/fx/win_count_up_glow.png`
- 尺寸：1024x256
- 格式：Spritesheet，透明
- 用途：贏分數字跳動時的底部金光。
- 建議來源：After Effects。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "four frame horizontal spritesheet of golden glow behind win amount numbers, luxury slot HUD effect, ancient Chinese gold sparkles, transparent background, no text, 1024x256"
- 製作備註：單幀 256x256，可跟隨贏分數字中心定位。

asset: `button_spin_glow`

- 檔案：`assets/fx/button_spin_glow.png`
- 尺寸：1024x256
- 格式：Spritesheet，透明
- 用途：旋轉按鈕可點擊時的呼吸光。
- 建議來源：After Effects 或 SD 特效後製。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "four frame horizontal spritesheet of circular golden button glow, premium slot spin button idle pulse, red gold sparkles, transparent background, no text, 1024x256"
- 製作備註：單幀 256x256，中心與 180x180 按鈕對齊。

### Layer: overlay (Depth 900)

asset: `scene_transition_wipe`

- 檔案：`assets/fx/scene_transition_wipe.png`
- 尺寸：1920x1080
- 格式：PNG，透明
- 用途：GameScene 進入 ResultScene 或特殊模式前的短暫轉場遮罩。
- 建議來源：After Effects / Figma。
- 生圖 Prompt（英文，可直接餵 Midjourney / SD）：
  "transparent scene transition wipe overlay, ancient Chinese red silk and gold dust sweeping across screen edges, premium slot game transition effect, no text, transparent background, 1920x1080"
- 製作備註：Phase 1 可不使用；若使用必須是圖片遮罩，不用程式色塊代替。

## 4. Spritesheet / Atlas 規劃

### 轉輪符號 Atlas

- atlas key：`symbols_base`
- 圖檔：`assets/atlases/symbols_base.png`
- JSON：`assets/atlases/symbols_base.json`
- JSON 格式：Phaser 3 multi-atlas。
- 推薦工具：TexturePacker。
- 素材來源：先輸出獨立 PNG，再人工校色、清邊、統一陰影，最後打包 atlas。

| frame key | 單幀尺寸 | 類型 | 動作 / 狀態 | 幀數 | 播放速度 |
|---|---:|---|---|---:|---:|
| `symbol_xiang_yu` | 240x240 | 圖示 | static | 1 | 0 fps |
| `symbol_liu_bang` | 240x240 | 圖示 | static | 1 | 0 fps |
| `symbol_yu_ji` | 240x240 | 圖示 | static | 1 | 0 fps |
| `symbol_jade_seal` | 240x240 | 圖示 | static | 1 | 0 fps |
| `symbol_bronze_sword` | 240x240 | 圖示 | static | 1 | 0 fps |
| `symbol_war_drum` | 240x240 | 圖示 | static | 1 | 0 fps |
| `symbol_wild` | 240x240 | 圖示 | static | 1 | 0 fps |
| `symbol_scatter` | 240x240 | 圖示 | static | 1 | 0 fps |
| `symbol_bonus` | 240x240 | 圖示 | static | 1 | 0 fps |
| `symbol_a` | 240x240 | 低倍率 | static | 1 | 0 fps |
| `symbol_k` | 240x240 | 低倍率 | static | 1 | 0 fps |
| `symbol_q` | 240x240 | 低倍率 | static | 1 | 0 fps |
| `symbol_j` | 240x240 | 低倍率 | static | 1 | 0 fps |
| `symbol_10` | 240x240 | 低倍率 | static | 1 | 0 fps |

### 符號高亮 Spritesheet

- 推薦工具：After Effects / TexturePacker。
- JSON 格式：若單列 spritesheet 可不用 JSON；若多效果合併，使用 Phaser 3 atlas。

| key | 檔案 | 動作清單 | 單幀尺寸 | 幀數 | 播放速度 |
|---|---|---|---:|---:|---:|
| `symbol_highlight_gold` | `assets/fx/symbol_highlight_gold.png` | pulse | 192x192 | 5 | 12 fps |
| `symbol_highlight_jade` | `assets/fx/symbol_highlight_jade.png` | pulse | 192x192 | 5 | 12 fps |

### 轉輪與贏分特效 Spritesheet

| key | 檔案 | 動作清單 | 單幀尺寸 | 幀數 | 播放速度 |
|---|---|---|---:|---:|---:|
| `reel_stop_burst` | `assets/fx/reel_stop_burst.png` | burst | 256x256 | 6 | 18 fps |
| `coin_sparkle` | `assets/fx/coin_sparkle.png` | sparkle_loop | 256x256 | 8 | 16 fps |
| `anticipation_glow` | `assets/fx/anticipation_glow.png` | sweep_loop | 256x512 | 4 | 10 fps |
| `win_count_up_glow` | `assets/fx/win_count_up_glow.png` | glow_loop | 256x256 | 4 | 12 fps |
| `button_spin_glow` | `assets/fx/button_spin_glow.png` | pulse_loop | 256x256 | 4 | 8 fps |

### HUD Button Spritesheet

- 推薦工具：Figma 匯出狀態圖，再用 TexturePacker 或固定格 spritesheet。

| key | 檔案 | 動作清單 | 單幀尺寸 | 幀數 | 播放速度 |
|---|---|---|---:|---:|---:|
| `button_spin` | `assets/ui/button_spin.png` | normal / pressed / disabled | 180x180 | 3 | 0 fps |
| `button_bet_step` | `assets/ui/button_bet_step.png` | minus / plus | 96x96 | 2 | 0 fps |

## 5. 視差捲動參數表

本作 GameScene 是固定 Slot 主畫面，不是捲軸遊戲，因此不做真正的橫向或縱向 parallax。若後續希望背景有微幅鏡頭動態，只做非常小的 idle drift 或 alpha 呼吸，不使用攝影機追蹤。

| 層級名稱 | scrollFactorX | scrollFactorY | 備註 |
|---|---:|---:|---|
| bg_sky | 0 | 0 | 固定背景 |
| bg_far | 0 | 0 | 固定背景，可做 alpha 呼吸 |
| bg_mid | 0 | 0 | 固定裝飾 |
| bg_near | 0 | 0 | 固定前景 |
| reel_frame | 0 | 0 | UI 舞台固定 |
| reels | 0 | 0 | Slot 符號由容器動畫控制，不靠 camera scroll |
| fx_world | 0 | 0 | 跟隨轉輪與舞台定位 |
| hud_bg | 0 | 0 | 固定 HUD |
| hud_elements | 0 | 0 | 固定 HUD |

## 6. 生圖工作流建議

- 背景大圖：`game_bg_sky`、`game_bg_far_palace` 建議使用 Midjourney 先定整體氛圍，再用 SD + ControlNet 控制中央留白；輸出後裁切到 1920x1080。
- 分層裝飾：`game_bg_mid_columns`、`game_bg_near_gold_stage` 建議 SD 生成局部素材後在 Photoshop 或 Figma 排版去背，確保中央轉輪不被遮擋。
- 轉輪符號：角色與物件符號可用 SD + character LoRA / 物件 prompt，之後人工統一外框、陰影、尺寸與亮度；最後用 TexturePacker 打包 Phaser 3 multi-atlas。
- UI / HUD 元件：`reel_frame_base`、`hud_panel_base`、`button_spin`、`button_bet_minus`、`button_bet_plus` 建議 Figma 手做或 Recraft 生成基礎造型後人工調整，不建議完全依賴 AI 生圖。
- 粒子 / 特效：可以使用 Phaser ParticleEmitter，但粒子必須使用 `coin_sparkle` 等實際貼圖；不可用 Graphics 或 Canvas 動態畫點。大型特效建議 After Effects 輸出 spritesheet。
- 字型與數字：`hud_gold_numbers` 建議用字型工具或 Figma 生成可讀數字，再匯出 bitmap font；AI 只能當風格參考。
- 檔案整理：單張來源圖先放在 `assets/symbols/`、`assets/bg/`、`assets/ui/`、`assets/fx/`，打包輸出放 `assets/atlases/`。

## 7. 待確認清單

- 視差層數是否符合預期：目前建議固定畫面 4 層背景 / 裝飾層，不做真正捲動。
- 角色動作清單是否完整：本作 GameScene 沒有玩家角色動作，只有 Slot 符號靜態圖示與特效動畫；是否需要角色符號有中獎動態版本？
- 是否需要日夜 / 天氣變化版本的背景：目前只規劃暗紅黃昏戰場版本。
- 是否需要多個關卡的場景變體：目前只規劃 Base Game 一套主場景，不含 Free Game 與 Bonus Wheel。
- HUD 風格是否與場景風格一致或刻意對比：目前規劃 HUD 與場景一致，都是黑紅金青銅豪華楚漢風。
