# 小瑪莉（Fruit Slot Machine）— AI 復刻提示詞

## 一、遊戲概述

製作一個台灣傳統「小瑪莉」水果機網頁遊戲。
目標裝置：手機優先，直向顯示，純靜態 HTML/CSS/JS，不需要後端。
存在兩個版本：
- **HTML 版**：`index.html` + `css/style.css` + `js/game.js` + `js/audio.js`
- **Phaser 版**：`phaser-version/index.html` + `phaser-version/game.js`（Phaser 3.80.1）

---

## 二、視覺規格

- 整體寬度：固定 420px，手機置中
- 機台外框：暗紅色金屬質感（`#8a0808`），金色邊框
- 格子底色：米白（`#f5efe0`），金色邊框（`#cc8800`）
- LED 顯示器：黑底紅字，等寬字體
- 中央區塊：深藍底（`#060e24`），旋轉光芒、金色卡片、星星裝飾
- 按鈕：橙色主色（`#d06010`），開始按鈕深藍（`#1030c0`）
- 符號大小：44px emoji

---

## 三、遊戲版面（由上到下）

```
┌─────────────────────────────┐
│  WIN: 0000    CREDIT: 0092  │  ← LED 顯示器
├─────────────────────────────┤
│ ┌───┬───┬───┬───┬───┬───┬───┐ │
│ │   │   │   │BAR│   │   │   │ │  ← 頂部 7 格
│ ├───┼───────────────────┼───┤ │
│ │   │  中央顯示區塊      │   │ │  ← 左 5 格 + 中央 5×5 + 右 5 格
│ │   │  ┌─────────────┐  │   │ │
│ │   │  │   小瑪莉     │  │   │ │
│ │   │  │  [🍎 卡片]  │  │   │ │
│ │   │  │  J·P  [0]   │  │   │ │
│ │   │  └─────────────┘  │   │ │
│ ├───┼───────────────────┼───┤ │
│ │   │   │   │   │   │   │   │ │  ← 底部 7 格
│ └───┴───┴───┴───┴───┴───┴───┘ │
├─────────────────────────────┤
│  賠率表（9欄，各對應 1-9 鍵） │
│  倍數 / 符號圖示 / 下注金額   │
├─────────────────────────────┤
│ [儲值][WIN→CR][左1-4][DOUBLE][右6-9][AUTO][開始] │ ← 控制按鈕
├─────────────────────────────┤
│  符號列（9個符號名稱）        │
│  [1][2][3][4][5][6][7][8][9] │ ← 數字下注按鈕
└─────────────────────────────┘
```

---

## 四、邊框格子系統（24 格跑馬燈）

邊框共 24 格，順時針排列：
- 頂部：7 格（左→右，含角落）
- 右側：5 格（上→下，不含角落）
- 底部：7 格（右→左，含角落）
- 左側：5 格（下→上，不含角落）

每格包含：符號 emoji、LED 指示燈（角落格有 2 顆）。
特殊格：ONCE MORE（左側邊中間、右側邊中間）

**跑馬燈邏輯：**
- 開始時快速跑（間隔 60ms），逐漸減速，最後 ease-out 停止
- 同時顯示主燈 + 2 格拖影（透明度遞減）
- 停止後，中央卡片顯示對應格的符號
- 停在「ONCE MORE」格：免費再轉一次

---

## 五、符號系統（10 種）

| 鍵值 | 符號 | Emoji | 賠率 |
|------|------|-------|------|
| apple | 蘋果 | 🍎 | 5 |
| watermelon | 西瓜 | 🍉 | 20 |
| star | 星星 | ⭐ | 30 |
| seven | 7 | 7（紅色） | 40 |
| bar | BAR | BAR（白底） | 100（JACKPOT）|
| bell | 鈴鐺 | 🔔 | 20 |
| grape | 葡萄 | 🍇 | 15 |
| orange | 橙 | 🍊 | 10 |
| cherry | 櫻桃 | 🍒 | 2 |
| oncemore | ONCE MORE | ONCE MORE | 免費轉 |

**邊框格子分布（24 格順序）：**
`cherry, apple, watermelon, bar, apple, grape, watermelon,`（頂 7）
`cherry, orange, bell, apple, orange,`（右 5）
`watermelon, bell, apple, oncemore, apple, cherry, grape,`（底 7）
`bell, oncemore, orange, cherry, grape`（左 5）

---

## 六、下注系統（9 鍵）

- 按鈕 1-9 各自對應賠率表第 1-9 欄的符號
- 每按一次對應按鈕：下注 +1，CREDIT -1
- 每欄最大下注：不限（或設上限 9）
- 開始前至少需有 1 欄下注 > 0
- `DOUBLE IN BET` 按鈕：全部下注欄 ×2（CREDIT 扣減）
- `左1-4` / `右6-9`：批次調整左半/右半按鈕下注

**贏分計算：**
```
totalWin = 下注欄對應符號賠率 × 該欄下注數
```
停在哪格符號，就結算對應下注欄的贏分。

---

## 七、WIN → CREDIT 機制

- 贏分累積在 `winPool`（WIN 顯示器）
- 不自動轉入 CREDIT
- 玩家按「WIN→CREDIT」按鈕才轉入，有計數動畫（每 30ms +1）

---

## 八、AUTO 自動模式

- 按下 AUTO 開啟：記錄當前下注模式（`autoBetPattern`），切換按鈕為綠色脈衝狀態
- 開啟後每輪結束自動重新下注並開始
- AUTO 可在旋轉中途關閉（不可在旋轉中途開啟）
- 積分不足時自動關閉 AUTO

---

## 九、中央顯示區塊

- 深藍底 + 旋轉光芒（20 條三角形）
- 4 個角落金色硬幣裝飾
- 左右各一顆 ⭐ 星星（有縮放動畫）
- 標題「小瑪莉」（金色斜體）
- 金色圓角卡片（78×78px）顯示當前符號
- J·P 積分（JACKPOT 計數器）
- 遊戲訊息文字區
- **中央遮罩**：所有背景元素需加 GeometryMask 裁切在區塊內，不得溢出到邊框格子

**Idle 狀態**：每 900ms 輪播符號順序 `cherry→apple→watermelon→bell→grape→orange→seven→bar`

---

## 十、技術規格

```
框架：原生 JS（HTML 版）/ Phaser 3.80.1（Phaser 版）
音效：Web Audio API 程序生成（不使用外部音檔）
存檔：localStorage，key = "xiaomali_credits"，預設 100
禁止縮放：viewport user-scalable=no + gesturestart/gesturechange/touchmove preventDefault
禁止選取：user-select:none + -webkit-touch-callout:none + contextmenu preventDefault
Phaser 版解析度：zoom:2（固定 2x）+ Phaser.Scale.FIT + autoCenter CENTER_BOTH
Phaser 版防模糊：type: Phaser.AUTO（WebGL 優先）+ antialias:true
```

---

## 十一、按鈕列完整規格

| 按鈕 | 文字 | 功能 | 鍵盤 |
|------|------|------|------|
| 儲值 | 儲值 | +100 CREDIT | - |
| WIN→CR | WIN→CREDIT | winPool 轉入 credits | - |
| 左1-4 | 左1-4 | 欄 1-4 下注 +1 | - |
| DOUBLE | DOUBLE IN BET | 所有下注 ×2 | - |
| 右6-9 | 右6-9 | 欄 6-9 下注 +1 | - |
| AUTO | AUTO | 開啟/關閉自動模式 | A |
| 開始 | 開始 | 開始旋轉 | Space / Enter |

數字鍵 1-9 = 快捷下注對應欄位

---

## 十二、音效設計（Web Audio API）

- 跑馬燈跑動音：每格 tick 聲（短促 sine wave）
- 停止音：下滑音效
- 贏分音：上升音階
- JACKPOT 音：連續上升音階 + 震動

---

## 十三、複製或改造建議

1. 換符號：修改 `SYM_DEF` 物件（emoji + 賠率）
2. 換配色：修改 CSS 變數（`:root` 區塊）
3. 換邊框格子分布：修改 `BORDER` 陣列（24 個符號鍵值）
4. 新增特殊格：在 `onChaseStopped` 判斷 `stopSym === 'xxx'` 加處理邏輯
5. Phaser 版中央背景：在 `drawCenterArea()` 修改圖形繪製

---

## 十四、已知問題與修正記錄

- **旋轉軸心偏移**：Phaser Graphics 旋轉以物件 position 為軸心，需先 `setPosition(midX, cyCtr)` 再以相對 (0,0) 繪製三角形
- **中央元素溢出**：背景圓形光暈半徑 > 區塊半寬，需加 GeometryMask 裁切
- **Phaser 模糊**：使用 `type: Phaser.AUTO` + `zoom: 2`，避免 `resolution: DPR` 與 `zoom: DPR` 混用
- **複雜 Emoji 在 Canvas 顯示異常**：避免使用 🎰 等複雜 Emoji 作為主顯示符號
