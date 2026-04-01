# Storm of Seth — AI 復刻提示詞

## 一、遊戲概述

製作一個埃及主題現代老虎機網頁遊戲「Storm of Seth」。
目標裝置：桌面 + 手機，純靜態 HTML/CSS/JS（Canvas 2D），不需要後端。

---

## 二、視覺規格

- 整體風格：埃及神廟暗金配色
- 背景：深色（`#1a0a00` 或類似深褐）
- 強調色：金色（`#c8922a`）、暗金（`#8b6914`）
- 網格底色：深棕
- 符號：高品質圖示風格（可用 emoji 或 Canvas 繪製）
- 特效：粒子系統（贏分時金粒子飄落）
- 字體：Arial Black / serif 混合，金色文字

---

## 三、遊戲版面（由上到下）

```
┌──────────────────────────────────────┐
│  LOGO + 主題切換按鈕                   │  ← Header
├──────────────────────────────────────┤
│  免費轉動資訊條（Free Spins + Multiplier）│  ← Bonus Bar
├──────────────────────────────────────┤
│                                      │
│   ┌──┬──┬──┬──┬──┐                  │
│   │  │  │  │  │  │                  │
│   ├──┼──┼──┼──┼──┤                  │
│   │  │  │  │  │  │  ← 5×3 主網格    │
│   ├──┼──┼──┼──┼──┤                  │
│   │  │  │  │  │  │                  │
│   └──┴──┴──┴──┴──┘                  │
│   訊息欄（中獎提示）                   │
├──────────────────────────────────────┤
│  餘額  |  下注 − [值] +  |  MAX BET  │
│        |  SPIN    AUTO10            │
│        |  上次贏分                   │
├──────────────────────────────────────┤
│  Seth Wild | Storm Scatter | 20 Lines│  ← 功能說明 Chips
├──────────────────────────────────────┤
│  [📜賠率表]  [🔊音效]  [⚙RTP面板]    │  ← 工具列
└──────────────────────────────────────┘
```

---

## 四、核心機制

### 5×3 旋轉軸

- 5 軸 × 3 行，共 15 個位置
- 每軸獨立旋轉，順序稍微延遲（cascade）
- 符號從上方滑入，動畫約 600-1000ms
- 旋轉結束後評估支付線

### 20 條支付線

- 預設 20 條固定支付線
- 支付線形狀：橫線、Z 形、N 形等標準老虎機線型
- 中獎時高亮顯示對應支付線

### Seth Wild（擴展 Wild）

- 停在軸上時，整軸擴展為 Wild
- 擴展後贈送 1 次重新旋轉（Re-spin）
- 重旋期間 Wild 軸鎖定，其他軸重轉
- 動畫：Wild 符號從小變大填滿整軸

### Storm Scatter（散點）

- 出現在任意位置計算（不需在支付線上）
- 3 個 → 觸發免費轉動（Free Spins）
- 免費轉動場次：預設 10 次，可疊加
- 免費轉動期間有倍數（Multiplier）加成

---

## 五、符號系統

| 符號名稱 | 類型 | 說明 |
|---------|------|------|
| Seth Wild | Wild | 可替代所有非散點符號，停落時擴展整軸 |
| Storm Scatter | Scatter | 3+ 觸發免費轉動 |
| 高價值符號 A | 常規 | 埃及主題圖案（眼睛/鷹神/太陽等）|
| 高價值符號 B | 常規 | 埃及主題圖案 |
| 中價值符號 C | 常規 | 埃及主題圖案 |
| 低價值符號 D/E | 常規 | 撲克牌字母（A/K/Q/J/10）|

**賠率結構（每種符號）：**
- 3 個同符號 → 賠率 × 下注
- 4 個同符號 → 賠率 × 下注 × 2
- 5 個同符號 → 賠率 × 下注 × 5

---

## 六、下注系統

```javascript
const BET_OPTIONS = [0.20, 0.40, 0.60, 0.80, 1, 2, 5, 10, 20, 50];
let betLevel = 4;   // 預設 index，值 = 1
let balance = 1000; // 初始餘額
```

- `−` / `+`：調整 betLevel（不可超出陣列邊界）
- `MAX BET`：設定為最高下注
- 按 SPIN：扣除 `BET_OPTIONS[betLevel]`

---

## 七、狀態機

```
idle → spinning → evaluating → win_show → idle
         ↓
    (有 Wild 擴展)
    re_spin_intro → spinning → evaluating → ...
         ↓
    (有 Scatter)
    freespin_intro → freespin（循環 N 次）→ freespin_outro → idle
```

---

## 八、AUTO 自動旋轉

- `AUTO 10`：連續旋轉 10 次
- 按鈕文字從「AUTO 10」變為「STOP」
- 中途可按 STOP 中斷
- 贏分仍正常結算

---

## 九、大獎疊加顯示（Big Win Overlay）

觸發條件：贏分 > 下注額的 X 倍（例如 10 倍以上）

```
全螢幕半透明黑底
中央大字：「BIG WIN!」或「MEGA WIN!」
贏分數字計數器動畫（由 0 滾動至最終值）
粒子特效
點擊任意處關閉
```

---

## 十、賠率表 Modal（📜按鈕）

- 點擊打開，顯示所有符號賠率
- 可滑動瀏覽
- 顯示 Wild 和 Scatter 說明

---

## 十一、RTP / 開發者面板（按 ` 鍵）

```
殺率控制開關（開/關）
中獎率滑塊（0-100%）
上次結果：WIN / LOSS
```
- 僅開發環境使用
- 中文介面

---

## 十二、主題系統

支援多主題切換（Egyptian / Fantasy 等），每個主題包含：
```javascript
{
  name: '主題名',
  grid: { rows: 3, cols: 5 },
  symbols: [...],   // 符號定義
  paylines: [...],  // 支付線座標
  colors: { bg, tile, highlight, ... },
  sounds: { spin, win, bigwin, ... }
}
```

---

## 十三、架構設計（子系統）

```
SlotGame（主控）
├─ ThemeManager       → 加載/切換主題設定
├─ SymbolRenderer     → Canvas 符號繪製
├─ ReelManager        → 軸旋轉動畫與符號陣列
├─ PaylineEngine      → 支付線評估與中獎計算
├─ BonusEngine        → Wild 擴展、Scatter、Free Spins、重旋
├─ SoundManager       → 音效播放（Web Audio API）
└─ UIManager          → 按鈕回調、數值更新
```

**主要回調介面：**
```javascript
onBalanceChange(balance)
onWinChange(win)
onBetChange(bet)
onStateChange(state)
onFreeSpinsChange(count)
onMultiplierChange(mult)
onMessage(text)
onBigWin(amount)
```

---

## 十四、技術規格

```
框架：Canvas 2D + 原生 JS 類系統
渲染：requestAnimationFrame 主循環
音效：Web Audio API 程序生成
存檔：無（每次刷新重置）
粒子系統：重力 + 速度衰減（0.99）
手機支援：viewport user-scalable=no + touch 事件
禁止縮放：gesturestart/gesturechange/touchmove preventDefault
```

---

## 十五、複製或改造建議

1. **換主題**：複製 themes/egyptian.js 建立新主題檔，修改 symbols/colors/paylines
2. **換符號**：修改 SYM_DEF 並重新實作 SymbolRenderer 繪製方法
3. **調整支付線**：修改 paylines 陣列（每條線為 5 個 row index）
4. **改變特殊機制**：在 BonusEngine 裡調整 Wild 擴展觸發條件
5. **增加 Free Spins 次數**：修改 BonusEngine.triggerFreeSpins(count)
