# XenoTactic — AI 復刻提示詞

## 一、遊戲概述

製作一個格基（Grid-based）塔防網頁遊戲「XenoTactic」。
目標裝置：桌面優先，純靜態 HTML + Phaser 3.60.0，不需要後端。

---

## 二、視覺規格

- 整體風格：科幻暗色（深藍黑色）
- 背景色：`#050a14`（極深藍黑）
- 格子深色：`#090e1a`，淺色：`#0c1222`（交替棋盤）
- 網格線：`#182840`
- 路徑顏色：入口為綠，出口為紅，中間漸變
- 塔樓：各色圓形/多邊形（依類型區分）
- 敵人：橙/紅色帶血條
- 子彈：小圓點，依塔樓顏色
- HUD 字體：等寬字體，綠色（`#00ff88`）

---

## 三、遊戲版面

```
┌──────────────────────────────────────────┐
│  HUD 條：資源 💰  生命 ❤️  波次 🌊  速度 ⚡│ ← 頂部
├──────────────────────────────────────────┤
│                          │               │
│   遊戲主網格              │  塔樓選擇面板 │
│   (GRID_COLS × GRID_ROWS) │              │
│                          │  [塔樓A] $xx  │
│   IN ──→ 路徑 ──→ OUT    │  [塔樓B] $xx  │
│                          │  [塔樓C] $xx  │
│                          │               │
│                          │ [START WAVE]  │
└──────────────────────────────────────────┘
```

---

## 四、核心常數（config.js）

```javascript
const CELL_SIZE = 48;        // 每格像素
const GRID_COLS = 20;        // 網格列數
const GRID_ROWS = 14;        // 網格行數
const GRID_OFFSET_X = 0;     // 網格左上 X
const GRID_OFFSET_Y = 60;    // 網格左上 Y（HUD 高度）
const PANEL_WIDTH = 160;     // 右側面板寬度
const HUD_HEIGHT = 60;       // 頂部 HUD 高度
const GAME_WIDTH = GRID_COLS * CELL_SIZE + PANEL_WIDTH;
const GAME_HEIGHT = GRID_ROWS * CELL_SIZE + HUD_HEIGHT;
const ENTRY = { col: 0, row: 6 };   // 敵人入口
const EXIT  = { col: 19, row: 6 };  // 敵人出口
```

---

## 五、遊戲機制

### 玩家目標
- 在網格上放置塔樓，阻擋並消滅沿路徑前進的敵人
- 所有波次清完 → 勝利
- 敵人到達出口時扣生命，生命歸零 → 失敗

### 資源系統
```
初始金幣：150
初始生命：20
消滅敵人 → 獲得金幣
放置塔樓 → 消耗金幣
```

### 路徑系統（A* 動態尋路）
- 敵人每次移動都重新計算最短路徑（從 ENTRY → EXIT）
- 放置塔樓阻擋格子後，若路徑仍可通則允許放置，否則禁止
- 路徑以漸變色繪製（入口綠 → 出口紅），並有方向箭頭

### 波次系統
```javascript
waves = [
  { count: 10, type: 'basic', interval: 1000 },
  { count: 15, type: 'fast',  interval: 700  },
  { count: 8,  type: 'tank',  interval: 1500 },
  // ...
]
```
- `START WAVE` 按鈕觸發下一波
- 波次內敵人依 interval 間隔依序生成
- 所有敵人消滅 → 波次完成，可開始下一波

---

## 六、塔樓系統

每種塔樓定義：
```javascript
{
  key: 'basic',
  name: '基礎塔',
  cost: 50,
  damage: 20,
  range: 3,       // 攻擊格距
  fireRate: 1000, // 毫秒
  color: 0x44aaff,
  bulletSpeed: 300,
  bulletColor: 0x88ccff,
}
```

**建議塔樓種類（最少 3 種）：**

| 名稱 | 費用 | 特色 |
|------|------|------|
| 基礎塔 | 50 | 平衡型 |
| 速射塔 | 80 | 攻速快，傷害低 |
| 重炮塔 | 120 | 傷害高，攻速慢，範圍大 |
| 減速塔 | 70 | 傷害低，敵人減速 |

---

## 七、敵人系統

每種敵人定義：
```javascript
{
  type: 'basic',
  hp: 100,
  speed: 80,     // 像素/秒
  reward: 10,    // 消滅後獲得金幣
  color: 0xff6600,
  size: 12,
}
```

**建議敵人種類：**

| 名稱 | 特色 |
|------|------|
| basic | 標準型 |
| fast | 速度 x2，HP 低 |
| tank | HP x5，速度慢 |
| flying | 不走路徑（直線飛行） |

**敵人顯示：**
- 圓形主體（依類型上色）
- 頭上血條（紅色底，綠色當前血量）
- 沿路徑格子中心移動

---

## 八、子彈系統

- 塔樓鎖定最近敵人（在攻擊範圍內）
- 發射子彈，子彈直線飛向目標
- 命中時扣 HP，未命中時（目標死亡）子彈消失
- 子彈為小圓點（radius 4-6px）

---

## 九、畫面層次（Depth）

```
Depth 0  Background：棋盤底色、網格線、IN/OUT 標記
Depth 1  Path：路徑漸變色 + 方向箭頭
Depth 2  Towers：已放置塔樓
Depth 3  Dynamic（每幀清除重繪）：
         - 敵人（含血條）
         - 子彈
         - 幽靈塔預覽（放置前預覽）
Depth 9  HUD：頂部資源列 + 右側塔樓面板
Depth 20 Overlay：勝利/失敗畫面、訊息文字
```

---

## 十、HUD 詳細規格

**頂部條（GRID_OFFSET_Y 高度的區域）：**
```
💰 資源：[數值]   ❤️ 生命：[數值]   🌊 波次：[當前]/[總數]   ⚡ x[速度]
```

**右側面板（PANEL_WIDTH 寬）：**
```
┌─────────────┐
│ 選擇塔樓：  │
│ [塔樓A] $50 │
│ [塔樓B] $80 │
│ [塔樓C] $120│
├─────────────┤
│ [START WAVE]│
└─────────────┘
```
- 選中的塔樓按鈕高亮（金色邊框）
- 金幣不足的塔樓按鈕灰色
- START WAVE 在波次進行中禁用

---

## 十一、互動邏輯

1. 點擊右側面板選擇塔樓類型（`selectedTowerKey`）
2. 滑鼠移入網格 → 顯示幽靈塔預覽（半透明）
3. 點擊有效格子 → 放置塔樓，扣除金幣，重新計算路徑
4. 無效位置（已有塔樓、路徑被封死）→ 不放置
5. 按 START WAVE → 開始生成敵人

---

## 十二、遊戲結束畫面

**勝利：**
```
半透明金色覆蓋
「VICTORY!」大字
「完成所有 X 波次！」
[PLAY AGAIN] 按鈕
```

**失敗：**
```
半透明紅色覆蓋
「GAME OVER」大字
[PLAY AGAIN] 按鈕
```

---

## 十三、場景結構

```
MenuScene（主選單）
└─ GameScene（主遊戲）
   ├─ create()
   │  ├─ initGrid()
   │  ├─ drawBackground()
   │  ├─ drawPath()
   │  ├─ setupInput()
   │  └─ setupHUD()
   ├─ update(time, delta)
   │  ├─ updateSpawn(dt)
   │  ├─ updateEnemies(dt)
   │  ├─ updateTowers(time)
   │  ├─ updateBullets(dt)
   │  ├─ checkWaveComplete()
   │  └─ redrawDynamic()
   └─ 工具方法
      ├─ placeTower(col, row)
      ├─ findPath() → A*
      ├─ generateWaves()
      └─ startWave(index)
```

---

## 十四、技術規格

```
框架：Phaser 3.60.0（CDN）
場景系統：class extends Phaser.Scene
渲染：Graphics API（不使用 Sprite/Texture）
尋路：自訂 AStar 類，參數 (GRID_COLS, GRID_ROWS, blockedCells)
輸入：Phaser 指針事件（pointerdown, pointermove）+ 鍵盤
手機支援：viewport user-scalable=no + touch 事件阻擋
禁止縮放：gesturestart/gesturechange/touchmove preventDefault
音效：可選（Web Audio API 程序生成）
存檔：無
```

---

## 十五、A* 尋路介面

```javascript
class AStar {
  constructor(cols, rows) {}

  findPath(startCol, startRow, endCol, endRow, blocked) {
    // blocked: Set of "col,row" strings
    // 返回 [{col, row}, ...] 路徑陣列，或 null（無路徑）
  }
}
```

---

## 十六、複製或改造建議

1. **換地圖**：修改 `ENTRY`、`EXIT` 座標，初始 `blockedCells`（預設障礙）
2. **加塔樓種類**：在 config.js 的 TOWERS 物件新增定義
3. **加敵人種類**：在 config.js 的 ENEMIES 物件新增定義，波次陣列引用
4. **加減速效果**：在敵人物件加 `slowFactor`，updateEnemies 時套用
5. **加升級系統**：點擊已放置塔樓顯示升級面板，消耗金幣提升 damage/range
6. **改 UI 主題**：修改 config 中的 color 常數與 HUD 文字顏色
