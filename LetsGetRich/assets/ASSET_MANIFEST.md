# ImageGen 資產清單

本專案的點陣美術皆使用 Codex 內建 ImageGen 生成，採原創角色、場景與建築，不含 LINE、旅遊大亨或其他既有遊戲的商標、角色與 UI 素材。

## `special-tile-faces-v1.png`

- 用途：Three.js 3D 棋盤上的 8 種特殊格完整方形格面：起點、機會、命運、高鐵、監獄、輪盤、世界巡遊與骰子工坊。
- 生成方式：Codex 內建 ImageGen，`precise-object-edit` 模式；將第一輪站立物件圖集重做為嚴格 4×2、每格完整滿版的方形棋盤材質，成品重採樣為可整除的 1768×884 RGB PNG。原始檔保存在 `art-source/generated-iterations/special-tile-faces-v1-original.png`。
- 最終 Prompt：`Use case: precise-object-edit. Asset type: production board-cell texture atlas for direct UV mapping onto flat Three.js board tiles. Redesign the eight subjects into an exact 4 columns by 2 rows atlas of eight complete square tile-face textures. Every cell is a perfect equal square, full-bleed, edge-to-edge, pale ivory enamel background, restrained gold inner keyline, and one centered low-relief emblem. Strict straight-down orthographic top view; no standing object, horizon, transparency, perspective tilt, text, people, logos or watermark.`
- 遊戲效果：每個特殊格由 Three.js 以圖集 UV 裁切一個完整正方形格面，直接平貼在 3D 格子表面並跟隨四邊方向旋轉。

## `ui-setup-panel-v2.png`、`ui-option-card-v2.png`、`ui-character-card-v2.png` 与 `ui-amount-pill-v2.png`

- 用途：高分辨率角色选择页主面板、模式选项卡、角色卡与棋盘金额白底；替换旧版将 128×128 卡面直接拉伸造成的模糊与圆角变形。
- 生成方式：Codex 内建 ImageGen，`stylized-concept` 模式；先生成 941×1672 直屏面板，再以 imagegen skill 的 `remove_chroma_key.py` 去除绿幕。三个衍生卡面只对这份点阵素材进行九宫格重采样，不使用 Phaser Graphics、Canvas 或 SVG 生成图案。
- 最终 Prompt：`Use case: stylized-concept. Asset type: high-resolution portrait setup-screen panel for a premium mobile board game. Create exactly one large clean portrait interface panel with no text and no controls. Perfectly flat solid #00ff00 chroma-key background outside the panel. One tall 9:16 rounded-rectangle panel, perfectly front-on and centered, with an airy white-to-pale-ice-blue vertical gradient, subtle pearlescent texture, thin crisp cool blue-gray outer border and narrow cyan inner highlight. Polished high-end casual mobile-game raster UI, precise and sharp at Retina phone resolution. No text, letters, numbers, icons, buttons, cards, characters, gold, ornaments, dark navy center, watermark or logo.`
- 游戏效果：主面板直接使用接近实际 2× 画布尺寸的高分辨率 PNG；模式卡、角色卡与金额底分别使用 760×256、384×616 与 208×72 RGBA PNG。金额只显示 `$金额`，地名直接显示在下方。

## `ui-hud-card-v2.png`

- 用途：四位玩家的深蓝渐层状态卡，恢复上一版的细亮边与层次，不再用白色卡面染色冒充深蓝卡。
- 生成方式：Codex 内建 ImageGen，`stylized-concept` 模式；绿幕去背后裁切，并以点阵三段式重采样为 840×224 RGBA PNG，对应游戏内 210×56 逻辑尺寸与 2× 画布。
- 最终 Prompt：`Use case: stylized-concept. Asset type: high-resolution wide player status card background for a premium portrait mobile board game. Create exactly one clean wide rounded rectangular HUD card background. Perfectly flat solid #00ff00 chroma-key background outside the card. Rich deep navy-to-royal-blue vertical gradient center, slightly brighter blue along the top, thin crisp pale-blue outer border, narrow cyan inner highlight, restrained dark-blue lower depth and a soft premium glass-enamel finish. Perfectly front-on, sharp Retina-quality edges. No text, letters, numbers, icons, portraits, badges, coins, gold frame, ornaments, watermark or logo.`
- 游戏效果：四张卡分别以玩家颜色产生细微边缘强调，当前玩家加亮；现金黄色、资产浅蓝。多人金额并列时不显示“首富／现金王”。

## `ui-card-clean-v1.png`、`ui-button-primary-v1.png` 与 `ui-button-positive-v1.png`

- 用途：Phaser 引擎内的九宫格缩放卡面，以及独立横向主按钮；用于恢复上一版的浅蓝白／深蓝配色，避免粗金框与边角拉伸。游戏界面不再用 DOM 组件绘制。
- 生成方式：Codex 内建 ImageGen，`stylized-concept` 模式；分别生成干净浅蓝白卡面与亮蓝渐变按钮，再以 imagegen skill 的 `remove_chroma_key.py` 去除纯绿背景。
- 卡面 Prompt：`One clean modern rounded-square mobile board-game UI card with no text: soft white-to-pale-ice-blue vertical gradient, thin cool blue-gray outline, subtle inner white highlight, very gentle depth and shadow, crisp symmetrical rounded corners, no gold, no ornament, no dark center, isolated on a perfectly flat #00ff00 chroma-key background.`
- 按钮 Prompt：`Exactly one premium wide rounded rectangular button with no text: bright cyan top highlight, saturated sky-blue-to-royal-blue vertical gradient, dark navy raised lower lip, thin white glossy inner highlight, softly beveled rounded corners, clean modern silhouette, isolated on a perfectly flat #00ff00 chroma-key background; no ornate gold scrollwork.`
- 后制：卡面裁切后缩为 128×128 RGBA PNG，并由 Phaser NineSlice 保持边角比例；按钮裁切后缩为 740×160 RGBA PNG。文字由 Phaser Text 以高分辨率纹理渲染，不烘焙进图片。
- 绿色按钮用途：买地、建造、使用免租券等正向确认操作；使用独立绿色 PNG，不对蓝色按钮进行运行时染色。
- 绿色按钮生成方式：Codex 内建 ImageGen，`precise-object-edit` 模式；以原蓝色按钮作为几何参考，生成均匀洋红幕版本，再用 imagegen skill 的 `remove_chroma_key.py` 去背并缩放为 740×160 RGBA PNG。
- 绿色按钮最终 Prompt：`Use case: precise-object-edit. Asset type: production green action-button raster asset for a premium portrait mobile board game. Input image: exact edit target and geometry reference. Primary request: preserve the source button's exact wide rounded silhouette, aspect ratio, bevel geometry, glossy upper highlight, thin white inner highlight, border thickness, bottom raised lip, padding and sharp Retina-quality edges. Change only its blue palette to a polished emerald-green palette: mint-green top highlight, vivid emerald body, deep forest-green lower lip. Scene/backdrop: place the isolated button on a perfectly flat uniform solid #ff00ff chroma-key background for background removal. The background must contain no checkerboard, transparency preview, gradient, texture, shadow, reflection or lighting variation. Composition: one button, perfectly front-on and centered, fully visible with generous equal magenta padding on every side. Constraints: no text, letters, numbers, icons, symbols, logos, watermark, gold, decoration, cropping, resizing or shape change. No cast shadow outside the button. Do not use #ff00ff anywhere in the button.`

## `coin-token.png`

- 用途：玩家付款、收租、強買及事件轉帳時的金幣飛行粒子。
- 生成方式：Codex 內建 ImageGen，單枚高質感 3D 金幣置於均勻綠幕；中心為原創四芒房產星徽，不含文字、數字或品牌符號。
- 綠幕原始檔：`art-source/generated-iterations/coin-token-chroma.png`。
- 去背：使用 imagegen skill 的 `remove_chroma_key.py`，採 border auto-key、soft matte、despill，縮放為 256×256 RGBA PNG。
- 最終 Prompt：`Use case: stylized-concept. Asset type: mobile board-game money-transfer particle sprite. One premium stylized 3D gold coin token, readable at 20 to 48 pixels, slightly tilted three-quarter view, thick beveled rim, embossed simple four-point property-star emblem, bright warm golden metal, playful high-end casual mobile game quality. Perfectly flat solid #00ff00 chroma-key background, no floor, shadow, gradient, texture or reflection. Exactly one centered coin, fully visible with generous padding. No text, numbers, currency symbols, brands or watermark.`

## `sky-board-china-v7-8-series.png`

- 用途：選角準備頁的低透明度中國場景背景；正式對局棋盤已改由 `src/map3d.js` 即時建立 32 個等尺寸 3D 格子，不再把本圖當成棋盤碰撞或定位基準。
- 生成方式：Codex 內建 ImageGen，`precise-object-edit` 模式；先將 v5 從每邊 5 個普通格擴為 7 格，再精準編輯為 8 組各三格的獨立色帶。
- 原始檔：`art-source/generated-iterations/sky-board-china-32-eight-series-original.png`；成品為 941×1672 PNG。
- 最終 Prompt：`Use case: precise-object-edit. Keep the exact 32-cell geometry, exact seven ordinary cells per side, Chinese scenery, camera, borders, blank center, lighting and composition. Change only the region-color grouping and the four middle special cells. On every side use exactly three adjacent property cells of one color, one gold special-event cell, then three adjacent property cells of a different color. Bottom left-to-right: sapphire x3, gold, turquoise x3. Right bottom-to-top: coral x3, gold, orange x3. Top right-to-left: jade x3, gold, cyan x3. Left top-to-bottom: violet x3, gold, magenta x3. Keep property interiors cream and blank; stop each narrow enamel color inlay at the end of its three-cell group. Preserve four colored corner cells. No text, labels, numbers, characters, dice, houses, UI, logos or watermark; do not add, remove, merge or subdivide cells.`
- 狀態：僅作準備頁氣氛背景，不參與正式對局的格子對位、所有權顯示或碰撞判定。

## `board-ground-china-3d-v1.png`

- 用途：Three.js 真 3D 棋盤下方的高畫質中國園林地表材質；圖中不包含棋盤格、房屋、棋子、文字或互動區域。
- 生成方式：Codex 內建 ImageGen，全新點陣環境素材；1254×1254 PNG。原始檔保留在 `art-source/generated-iterations/board-ground-china-3d-v1-original.png`。
- Three.js 用法：貼在水平 `PlaneGeometry` 上並啟用各向異性過濾、陰影接收與 45 度相機透視；32 個格子、房屋、地標、角色與命中座標仍全部由即時 3D 場景產生。
- 最終 Prompt：`Use case: game-environment-texture. Asset type: production high-resolution square raster ground artwork used as a horizontal floor texture beneath a real-time 3D property board in a premium portrait mobile game. Primary request: create an original luxurious Chinese imperial garden courtyard and floating-island landscape viewed from a strict straight-down orthographic top view, designed to remain convincing when a Three.js camera later views the horizontal plane at 45 degrees. Scene: large warm ivory stone plaza at the center with subtle carved cloud and compass patterns; around it are symmetrical blue-tile Chinese pavilions, red columns, stone lions, ornamental ponds, winding garden paths, plum blossoms, bamboo, red lantern clusters, waterfalls flowing off the floating-island rim, soft clouds beyond the island, and distant hints of the Great Wall. The central 65 percent must stay relatively calm and uncluttered so a real 3D board can be placed above it. Style/medium: extremely polished high-end stylized 3D casual mobile-game environment render, rich but clean materials, crisp stone, glazed ceramic roof tiles, warm gold accents, jade foliage, cinematic daylight, excellent small-screen readability, premium commercial game quality. Composition/framing: exact square, perfectly centered and symmetrical, seamless-feeling outer landscape, straight-down orthographic projection only, no horizon and no perspective tilt. Constraints: no board track, no playable cells, no rectangles resembling board cells, no dice, no characters, no tokens, no houses on the central plaza, no UI, no text, letters, numbers, logos or watermark. Do not create a mockup or device frame. The artwork is a backdrop/floor texture only.`

## `property-landmarks-extra-china.png`

- 用途：補足新增四區的中國地標：福建土樓、黃鶴樓、哈爾濱冰雪大世界與樂山大佛；與既有天壇、東方明珠、大雁塔、廣州塔合計 8 種地標。
- 生成方式：Codex 內建 ImageGen，2×2 綠幕點陣圖集；以 `property-buildings-china.png` 作為玩具感 3D 材質與視角參考。
- 綠幕原始檔：`art-source/generated-iterations/property-landmarks-extra-chroma.png`。
- 最終 Prompt：`Use case: stylized-concept. Production 2x2 raster sprite atlas. Match the supplied cute polished 3D toy-like isometric landmark style. Uniform solid #00ff00 chroma-key background. Exact 2 columns by 2 rows: top-left circular Fujian Tulou, top-right Yellow Crane Tower, bottom-left compact blue Harbin Ice and Snow World palace, bottom-right front-facing Leshan Giant Buddha. One isolated object per equal cell with generous padding, uniform scale and baseline. No extra buildings, people, text, labels, logos, watermark, grid lines, shadows, scenery or green on the landmarks.`
- 去背：使用 imagegen skill 的 `remove_chroma_key.py`，採 border auto-key、soft matte、despill；輸出 1254×1254 RGBA PNG，已驗證透明邊緣。

## `sky-board-china-v5.png`

- 用途：舊版 24 格小型格子中國主題棋盤；目前遊戲不再載入。
- 生成方式：Codex 內建 ImageGen，`precise-object-edit` 模式；以 `sky-board-china-v3.png` 作為編輯目標。第一輪成功縮小格子但左右各多出一格，因此未採用；第二輪以第一輪為目標，強制修正為左右各 5 個非角格，最終總數 24 格。
- 最終原始檔：`art-source/generated-iterations/sky-board-china-24-small-cells-final-original.png`；最終縮放為 900×1600 PNG。
- 第一輪 Prompt：`Use case: precise-object-edit\nAsset type: final portrait mobile board-game board background\nInput image: the supplied 24-cell Chinese floating-island board is the edit target.\nPrimary request: keep the exact same Chinese floating-island scenery, visual quality, portrait framing, outer board footprint, exact 24-cell topology, and clockwise cell order, but make every playable cell visibly smaller and the board track thinner.\nGeometry change: reduce the radial depth of every non-corner cell by about 25 percent while keeping adjacent cells connected edge-to-edge. Reduce each corner cell by about 15 percent. Keep exactly 7 cells across the top including corners, exactly 7 across the bottom including corners, exactly 5 non-corner cells on the left, and exactly 5 non-corner cells on the right: 24 total. Enlarge the empty central courtyard created by the thinner track. All four straight sides must be parallel, symmetrical, near-orthographic, and free of perspective skew.\nCell construction: every purchasable cell must have one crisp cream-colored inset panel with a thin dark inner outline and a raised gold outer frame. Make the cream inset rectangles uniform in size on the same side. Use small clean bevels only at the corners. No overlapping borders and no ambiguous decorative shapes that resemble extra cells.\nRegion markers: keep only a narrow permanent region stripe along the outer edge of each side: sapphire blue bottom, coral red right, jade green top, royal violet left. The stripe must never fill or cover the cream cell panel. Retain one gold special-event cell at the exact middle of each side and the four colored corner special cells.\nScene/backdrop: preserve the premium Chinese garden city above clouds, blue-tile pavilions, red lanterns, stone lions, plum blossoms, Great Wall, waterfall, and daylight.\nStyle/medium: high-end stylized 3D casual mobile-game render, refined gold, enamel, stone and glazed-tile materials, excellent small-screen readability.\nComposition/framing: portrait 9:16, centered, near-orthographic top-down, all 24 cells fully visible inside safe margins, large uncluttered central courtyard for 3D dice.\nConstraints: change only the board-track geometry described above; preserve the scenery and art direction. Exactly 24 cells, no extra panels, no merged cells. No text, letters, numbers, logos, watermarks, characters, tokens, buildings on cells, dice, UI, labels, icons, ownership color fills, or translucent overlays.`
- 最終修正 Prompt：`Use case: precise-object-edit\nAsset type: final portrait mobile board-game board background\nInput image: the supplied thin-track Chinese floating-island board is the edit target.\nPrimary request: correct only the cell count on the LEFT and RIGHT vertical sides while preserving the smaller-cell proportions, thin board track, large central courtyard, scenery, lighting, materials, and all horizontal geometry.\nMandatory topology: EXACTLY 24 playable cells around one loop. TOP: exactly 7 cells total including 2 corners and 5 cells between corners. BOTTOM: exactly 7 cells total including 2 corners and 5 cells between corners. LEFT SIDE: exactly 5 non-corner cells strictly between the two corners, arranged as exactly 2 blank cream property cells above, exactly 1 gold special-event cell in the geometric middle, and exactly 2 blank cream property cells below. RIGHT SIDE: exactly 5 non-corner cells strictly between the two corners, arranged as exactly 2 blank cream property cells above, exactly 1 gold special-event cell in the geometric middle, and exactly 2 blank cream property cells below. Count 7 + 7 + 5 + 5 = 24. Remove the extra blank vertical cell from each side and evenly redistribute the five remaining vertical cells.\nCell scale: keep the board track thin. Keep every non-corner cell about 25 percent shallower than the earlier thick-track design and each corner about 15 percent smaller. All cream inset panels on the same side must be identical in size.\nRegion markers: narrow jade green stripe only along the outer top edge, coral red only along the outer right edge, sapphire blue only along the outer bottom edge, royal violet only along the outer left edge. Stripes never cover cream panels.\nInvariants: preserve the four colored corner special cells, centered gold special cell on each side, near-orthographic symmetry, raised gold borders, dark inner outlines, premium Chinese floating-island scenery, and empty center.\nConstraints: no extra cells, no subdivided cells, no merged cells, no decorative panels resembling cells. No text, letters, numbers, logos, watermarks, characters, tokens, buildings on cells, dice, UI, labels, icons, or ownership fills.`
- 對位方式：以最終 900×1600 PNG 的米白格面逐格取樣，為 16 個房產格建立各自的八角 `clip-path`；所有權層位於人物、3D 房屋與棋子下方。

## `sky-board-china-v3.png`

- 用途：舊版厚格 24 格棋盤與 v5 風格參考；目前遊戲不再載入。
- 生成方式：Codex 內建 ImageGen，`stylized-concept` 模式；以 `sky-board-china-v2.png` 作為中國建築風格與品質參考，重新生成棋盤幾何。
- 原始生成檔：`art-source/generated-iterations/sky-board-china-24-cells-original.png`；最終縮放為 900×1600 PNG。
- 最終 Prompt：`Use case: stylized-concept\nAsset type: final portrait mobile board-game board background\nPrimary request: redesign the provided Chinese floating-island real-estate board into a larger, clearly structured Monopoly-style loop with EXACTLY 24 playable cells.\nInput image: use the provided board only as the style, Chinese architectural mood, rendering quality, and portrait composition reference. Rebuild the board geometry.\nScene/backdrop: premium floating Chinese garden city above clouds, blue-tile pavilions, red lanterns, stone lions, plum blossoms, subtle Great Wall scenery, bright daylight.\nBoard geometry: a single rectangular outer loop with a large empty central courtyard for dice. EXACTLY 24 cells total. The TOP edge has exactly 7 cells including its two corner cells and exactly 5 rectangular cells between them. The BOTTOM edge has exactly 7 cells including its two corner cells and exactly 5 rectangular cells between them. The LEFT edge has exactly 5 rectangular cells strictly between the two corners. The RIGHT edge has exactly 5 rectangular cells strictly between the two corners. Count: 7 + 7 + 5 + 5 = 24, with no extra cells, subdivisions, hidden cells, double cells, or decorative panels that resemble cells.\nRegion clarity: the four sets of purchasable cells must be visually grouped with permanent narrow color inlays inside the cell borders: sapphire blue region along the bottom edge, coral red region along the right edge, jade green region along the top edge, royal violet region along the left edge. Use exactly four consecutive purchasable cells per colored region; each edge's fifth non-corner cell is a visually distinct gold special-event cell. The four large corner cells are also special-event cells with unique jewel colors.\nCell surfaces: every playable cell has a clean blank cream inset surface with a crisp dark inner outline and a raised gold outer frame. Colored inlays must stay inside the gold frame and must never cover the blank center.\nCamera/composition: portrait 9:16, centered, near-orthographic top-down with only a subtle premium 3D tilt; all four sides and all 24 cells fully visible inside safe margins. Symmetrical layout. Large uncluttered central courtyard.\nStyle/medium: high-end stylized 3D casual mobile-game render, refined gold, enamel, stone and glazed-tile materials, excellent small-screen readability.\nConstraints: no text, no letters, no numbers, no logos, no watermarks, no characters, no tokens, no buildings on cells, no dice, no UI, no labels, no icons. Do not merge neighboring cells. The gold frame intersections must clearly separate all 24 cells.`
- 遊戲效果：所有權層使用每格專屬裁切座標，位於角色與房屋 PNG／3D 棋子層下方；不覆蓋人物或房屋。

## `roulette-wheel.png` 與 `roulette-pointer.png`

- 用途：真正可旋轉的五色命運輪盤圓盤，以及保持固定不旋轉的獨立金色指針。
- 生成方式：Codex 內建 ImageGen，`stylized-concept` 模式；以 `special-events-atlas.png` 作為金玉材質語言參考。圓盤使用洋紅幕、指針使用綠幕生成，再以 imagegen skill 內建 chroma-key helper 轉為 RGBA PNG。
- 圓盤原始檔：`art-source/generated-iterations/roulette-wheel-magenta.png`。
- 圓盤最終 Prompt：`Use case: stylized-concept\nAsset type: final animation-ready raster sprite for a premium portrait mobile board game\nPrimary request: one isolated perfectly circular five-segment destiny roulette wheel disk, with no pointer.\nScene/backdrop: perfectly flat solid #ff00ff chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.\nSubject: one large front-facing roulette wheel disk with five exactly equal wedges colored emerald green, deep indigo-violet, sapphire blue, warm gold, and coral red. Fine embossed gold outer rim, small gold jewel dividers, centered gold axle. The wheel is a self-contained rotating disk only.\nStyle/medium: polished high-end stylized 3D casual mobile-game render, Chinese gold-and-jade material language matching the supplied reference.\nComposition/framing: exact orthographic front view, axle precisely at image center, mathematically circular, fills about 82% of the square image, generous equal padding on all sides.\nConstraints: no external pointer, no stand, no roof, no lions, no stairs, no scenery, no text, letters, numbers, logos, watermark, characters, buttons, cast shadow, contact shadow, reflection, translucent material, or perspective distortion. Do not use #ff00ff anywhere in the wheel. Crisp separated edges.`
- 指針來源最終 Prompt：`Use case: stylized-concept\nAsset type: animation-ready raster sprite source for a premium portrait mobile board game\nPrimary request: create exactly two separate opaque objects in a strict left/right two-column sprite sheet for a real spinning destiny roulette.\nInput image: use the provided special-event atlas only as the visual style and material-quality reference.\nScene/backdrop: perfectly flat solid #00ff00 chroma-key background across the entire image, with no gradients, texture, shadows, floor, reflections, scenery, frames, or lighting variation.\nLEFT HALF: one large perfectly circular five-segment roulette wheel disk, viewed straight-on, centered, nearly filling the left cell with generous equal padding. Five equal wedges in emerald green, royal purple, sapphire blue, warm gold, and coral red. Fine embossed gold rim and small jewel dividers. No central pointer and no external stand, roof, lions, stairs, scenery, or base.\nRIGHT HALF: one standalone ornate gold downward-pointing arrow pointer, viewed straight-on and centered in the right cell. It must be a separate object with generous empty green space around it, suitable for placing above the wheel.\nStyle/medium: polished high-end stylized 3D casual mobile-game render, matching the Chinese gold-and-jade material language of the reference.\nComposition/framing: exact orthographic front view; vertical split exactly at 50%; objects never cross the split; wheel must remain a mathematically circular disk with its axle precisely centered.\nConstraints: no words, letters, numbers, logos, watermarks, characters, UI buttons, mockup device, cast shadow, contact shadow, translucent pixels, or perspective distortion. The background must remain uniform #00ff00 and #00ff00 must not appear in either object.`
- 遊戲效果：只旋轉 `roulette-wheel.png`；`roulette-pointer.png` 固定不動，旋轉停止後才依指針所在扇區套用結果。

## `sky-board-china-v2.png`

- 用途：舊版 18 格棋盤風格參考；目前遊戲不再載入。
- 生成方式：Codex 內建 ImageGen 精準編輯，以舊棋盤為幾何與畫風參考。
- 最終 Prompt：保留原有立體浮島、視角傾角、中央擲骰空間、四個彩色角格與金色邊框；精確保留 18 格，上下各 5 格、左右中段各 4 格；格子外圍改為中式牌樓、長城剪影、藍瓦亭頂、紅燈籠、石獅、梅花與祥雲；米白格面全部留空；無文字、Logo、角色、骰子或 UI。
- 後製：縮放為固定 900×1600 PNG；遊戲內載入實際圖檔，不使用 Phaser Graphics、Canvas 或 SVG 畫棋盤。

## `character-roster-fun.png`

- 用途：8 位可選全身 Q 版棋子。
- Prompt：嚴格 4×2 人物圖集；拿反超大指南針的飛行員、疊著搖晃房屋的房仲、拿巨型算盤的房仲婆婆、抱雲朵枕頭的瞌睡富豪、房屋蛋糕廚師、被租單追著跑的倒楣魔術師、舉迷你盆栽的肌肉園丁、把望遠鏡拿反的白髮教授；高級 3D 公仔渲染；每人完整頭到腳、姿勢與色彩不同。
- 去背：ImageGen 生成均勻綠幕來源，再以 skill 內建 chroma-key helper 轉成帶 Alpha 的 PNG，保留抗鋸齒與頭髮邊緣。

## `home-key-art-fun.png`

- 用途：「房產大亨」首頁主視覺。
- Prompt：以上 8 位喜劇角色齊聚彩色房產城市棋盤；錯誤指南針、搖晃房屋、算盤、雲朵枕頭、房屋蛋糕、飛舞租單、盆栽與反向望遠鏡都清晰可見；9:16；頂部留標題區、底部留按鈕區；無文字、Logo 或既有品牌元素。

## `property-buildings-china.png`

- 用途：購地後的第 1、2、3 棟簡易住宅，以及天壇、東方明珠、大雁塔、廣州塔四種中國地標。純土地階段不顯示建築圖。
- 生成方式：Codex 內建 ImageGen。
- 最終 Prompt：嚴格 4×2 玩具感 3D 房產圖集；上排依序為恰好 1 棟、2 棟、3 棟藍頂奶油牆簡易住宅與施工吊車；下排依序為天壇、東方明珠、大雁塔、廣州塔；同一等角視角、比例與柔和棚拍光；40–55px 仍可辨識；無人物、文字、Logo、陰影、地面或多餘道具。背景為均勻 `#00ff00` 綠幕，物件不使用該色。
- 去背：使用 imagegen skill 內建 chroma-key helper，以 border auto-key、soft matte 與 despill 轉為帶 Alpha 的 PNG；已驗證 RGBA 與透明邊緣。
- 遊戲效果：Phaser 只載入這份實際 PNG，在建造或升級時播放落地、彈跳與縮放動畫。

## `bankruptcy-art.png`

- 用途：玩家破產淘汰畫面。
- Prompt：紫色雨雲下的小型房產浮島、空錢袋、最後一枚金幣、裂開的房產牌與離去飛艇；輕鬆戲劇感、不恐怖；預留角色棋子疊加位置；無文字與人物。

## `victory-art.png`

- 用途：遊戲結束與四人排名畫面。
- Prompt：日出天空城頒獎台、中央水晶獎盃、四個可放角色與名次的台座、金色彩紙；高級 3D 手遊結算插畫；無文字、人物或品牌元素。

## `chance-fate-card-art.png`

- 用途：機會卡與命運卡翻牌流程的 2 欄點陣插畫圖集。
- 生成方式：Codex 內建 ImageGen，以本專案中國棋盤作為一致畫風參考。
- 模式：參考既有中國棋盤美術的 ImageGen 點陣生成。
- 最終 Prompt：`Create a premium mobile board-game UI asset atlas containing exactly two full illustrated event-card fronts side by side in one horizontal 2-column layout, equal width, no gap, no outer margin. Original Chinese travel-and-real-estate tycoon theme, polished high-end casual game quality, stylized 3D illustration, rich material rendering, readable at small phone size, portrait cards inside a square atlas. LEFT CARD: "chance" visual identity only, jade turquoise and warm gold palette, auspicious clouds, glowing gold coin, compass rose, fast train ribbon, red envelope, optimistic lucky energy. RIGHT CARD: "fate" visual identity only, royal violet, coral and gold palette, dramatic storm cloud, wheel of fortune, balanced scale, red thread, mysterious but playful energy. Both cards share the same ornate Chinese architectural border language with subtle roof-eave geometry and embossed gold trim. Leave a calm darker lower-middle area on each card where HTML title and body copy can overlay legibly. Strong centered emblem, clean silhouette, soft cinematic lighting, refined depth, no characters. IMPORTANT: no words, no letters, no numbers, no logos, no watermarks, no mockup device, no tilted cards, no perspective distortion. Exact straight-on orthographic front view. The dividing line must be exactly at 50% width so CSS background-position can crop each half. Output a single square raster image atlas.`
- 游戏效果：Phaser 载入实际 PNG，中文标题、效果与关闭按钮全部由引擎内高分辨率文字和输入对象呈现。

## `chance-event-cards-v1.png`

- 用途：机会卡的七种独立卡面与统一卡背；严格 4×2 点阵图集，依序为幸运红包、高铁直达、城市建设补助、免租券、邀请函、观光收入、精准骰子与卡背。
- 生成方式：Codex 内建 ImageGen；原始生成档保存在 `art-source/generated-iterations/chance-event-cards-v1-original.png`。
- Prompt 摘要：生成高质感中国房产旅行桌游卡片，严格 4×2 等分、正面正投影、统一金色卡框与下方留白说明带；每格用清楚且互不重复的物件场景表现指定效果，不含文字、Logo、人物或装置框。
- 游戏效果：Phaser 以 texture frame 裁切真实 PNG；先显示卡背，玩家点击后播放水平翻牌动画并切换至对应卡面。

## `fate-event-cards-v1.png`

- 用途：命运卡的五种独立卡面、统一卡背与两格预留卡面；严格 4×2 点阵图集，依序为暴雨改道、紧急维修、全民旅游季、财富调节令、过路费加成、卡背、预留 A、预留 B。
- 生成方式：Codex 内建 ImageGen；原始生成档保存在 `art-source/generated-iterations/fate-event-cards-v1-original.png`。
- Prompt 摘要：生成高质感中国房产旅行桌游命运卡，严格 4×2 等分、正面正投影、紫金卡框与下方留白说明带；以暴雨棋子、维修工具、旅游庆典、财富天平与租金增长场景清楚表达效果，不含文字、Logo、人物或装置框。
- 游戏效果：与机会卡共用玩家控制的翻牌流程，结果不会自动消失。

## `special-event-cards-v1.png`

- 用途：高铁、骰控、世界巡游赛、监狱、双数脱困、绕圈奖金、特殊卡背与预留卡面；严格 4×2 点阵图集。
- 生成方式：Codex 内建 ImageGen；原始生成档保存在 `art-source/generated-iterations/special-event-cards-v1-original.png`。
- Prompt 摘要：生成高质感中国房产旅行桌游特殊事件卡，严格 4×2 等分、正面正投影、统一金蓝卡框与下方留白说明带；以高铁、精密骰子装置、地球奖杯、监狱门、开锁逃脱与起点奖金分别表现流程，不含文字、Logo、人物或装置框。
- 游戏效果：特殊格会显示与实际玩法一一对应的真实卡面，不再共用一张无法辨识的插画。

## `special-events-atlas.png`

- 用途：世界巡遊賽、高鐵旅遊與監獄判定三種趣味流程；左上舊輪盤插畫僅保留在來源圖集中，目前不再載入。
- 生成方式：Codex 內建 ImageGen，以本專案中國棋盤作為一致畫風參考。
- 模式：參考既有中國棋盤美術的 ImageGen 點陣生成。
- 最終 Prompt：`Create one premium mobile board-game UI illustration atlas in an exact 2x2 grid, four equal rectangular panels, no gaps, no outer margin, straight-on orthographic framing. Original Chinese travel-and-real-estate tycoon theme, polished high-end casual game quality, stylized 3D illustration, refined materials, bold clean silhouettes, readable at small phone size, consistent gold-and-jade Chinese architectural frame language. No characters. TOP LEFT: destiny roulette, a large colorful gold-rimmed wheel with five jewel-toned wedges and a glowing pointer, celebratory sparks, dramatic but playful. TOP RIGHT: world travel tournament, luminous globe with intercontinental routes, trophy, colorful pennants, grand festive energy. BOTTOM LEFT: high-speed rail travel, sleek modern Chinese-style bullet train leaving a golden station portal, motion trails, adventurous teal sky. BOTTOM RIGHT: jail / detention stop, playful fantasy stone gate with crossed golden keys, hourglass, soft storm cloud, non-threatening humorous mood. IMPORTANT: no words, no letters, no numbers, no logos, no watermarks, no buttons, no mockup devices. Exact panel boundaries at 50% width and 50% height so CSS background-position can crop each quadrant. Each icon centered with safe padding. Single square raster atlas.`
- 遊戲效果：依流程裁切實際 PNG 的世界巡遊賽、高鐵與監獄象限；輪盤已改用上方兩份獨立 RGBA PNG。
