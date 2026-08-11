# 《防守特洛伊》新版素材狀態與待補清單

目前已完成新版可玩骨架所需的正式 PNG：封面、主城、單人 3×5 棋盤與環形路徑戰場、赫克托耳大型英雄立繪、五種兵種、兩種普通敵軍、首領替代圖、投射物與命中特效。十個年份目前都能進入相同的正式戰鬥機械，但第 2～10 年仍共用第一年棋盤；下列年度專屬美術與事件演出不能用程式圖形假造。

所有遊戲視覺仍必須來自 PNG、JPG、WebP 或 spritesheet／atlas。禁止用 Phaser Graphics、Canvas、幾何色塊、程式生成圖形或 SVG 充當角色、道具、UI、場景或暫時 placeholder。

## 已完成並由新版載入

- `backgrounds/royale-cover-v2.png`
- `backgrounds/royale-home-v2.png`
- `backgrounds/year1-royale-arena-v2.png`
- `backgrounds/troy-coastal-battle-3x5-dual-road-v5.png`
- `heroes/hector-commander-v2.png`
- `units/paris-archer.png`（新版用途：特洛伊弓手）
- `units/hector-guard.png`（新版用途：王城禁衛）
- `units/cassandra-oracle.png`（新版用途：阿波羅祭司）
- `units/ida-hunter-v2.png`
- `units/stone-engineer-v2.png`
- `enemies/achaean-raider.png`
- `enemies/achaean-shield.png`
- `bosses/achilles.png`
- `bosses/trojan-horse.png`
- `projectiles/sun-arrow.png`
- `projectiles/javelin.png`
- `projectiles/oracle-bolt.png`
- `effects/bronze-impact.png`
- `effects/oracle-impact.png`
- `units/attack_sheets/archer-attack-v1.png`
- `units/attack_sheets/guard-attack-v1.png`
- `units/attack_sheets/priest-attack-v1.png`
- `units/attack_sheets/hunter-attack-v1.png`
- `units/attack_sheets/engineer-attack-v1.png`
- `ui/unit-role-ring-v1.png`

## 下一階段必須補齊

| 檔案建議名稱 | 尺寸／格式 | 用途 |
| --- | --- | --- |
| `heroes/paris-commander.png` | 1024×1536 透明 PNG | 第 2 年解鎖英雄、主城與大招切入 |
| `heroes/andromache-commander.png` | 1024×1536 透明 PNG | 第 4 年治療英雄 |
| `heroes/cassandra-commander.png` | 1024×1536 透明 PNG | 第 6 年預警英雄與木馬事件 |
| `heroes/aeneas-commander.png` | 1024×1536 透明 PNG | 第 7 年火盾英雄 |
| `heroes/priam-commander.png` | 1024×1536 透明 PNG | 第 9 年法力經濟英雄 |
| `bosses/protesilaus.png` | 1024×1024 透明 PNG | 取代第一年暫由銅盾兵放大的首領畫面 |
| `backgrounds/year2-gate-board.png` ～ `year9-dawn-board.png` | 941×1672 PNG/WebP | 第 2～9 年各自單人 3×5 棋盤與環形路徑戰場 |
| `backgrounds/year10-horse-board.png` | 941×1672 PNG/WebP | 木馬入城、夜間內城與王宮三段背景 |
| `ui/rank-stars.png` | 128×128 PNG atlas | 取代引擎文字星號的正式星階徽章 |
| `ui/status-icons.png` | 128×128 PNG atlas | 分數、時間、城門、法力、暫停與速度圖示 |
| `effects/fusion-bronze.png` | 12 格透明 PNG sheet | 合成光柱與日輪徽記 |
| `effects/hector-wall.png` | 12 格透明 PNG sheet | 不破城牆大招序列 |
| `projectiles/stone.png` | 128×128 透明 PNG | 投石手獨立石彈，不再借用命中特效作彈體 |

## 完整十年內容需求

- 每年各一張直屏單人戰場；盤面固定三排五格，敵軍路徑必須環繞盤面且不可穿過棋格。
- 六名英雄各需主城立繪、戰鬥肖像、大招切入與至少一組技能序列幀。
- 普通敵軍需補弓兵、槍兵、攀城兵、火炬兵、祭司、密探、攻城槌與投石車。
- 首領需補阿伽門農、大埃阿斯、狄俄墨得斯、阿基里斯、奧德修斯與木馬突擊隊長。
- 第十年需有木馬完整、暗門開啟、燃燒破損、內城突擊與兩種結局劇情圖。
- 仍缺備戰、壓力、首領三層音樂，以及召喚、合成、升階、英雄技能、受擊、勝敗音效。

## 統一美術規格

- 手機直屏、簡潔明亮、圓潤低細節的 2D 卡通風；不使用寫實厚重或暗黑史詩表現。
- 戰場與兵種採固定俯視三分之四角度；兵種在 100～120 像素仍須看清頭部、武器與職業色。
- 特洛伊使用青銅、赭紅、深藍與日輪金；希臘使用冷鐵、海藍與灰白。
- 英雄是唯一人物，不得作為可重複召喚或合成兵種。
- 背景不含文字；繁體中文由引擎文字層顯示。
- 不得產生或載入 SVG。
