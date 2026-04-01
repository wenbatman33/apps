# Football Animation Live - 實作計畫

## 目標
用 StatsBomb Open Data 建立足球比賽動畫即時展示頁面，類似飛鯨大數據的視覺效果。

## 數據來源
- **StatsBomb Open Data** (GitHub 免費 JSON)
- 座標系統：120 x 80，攻擊方向向 x=120
- 事件類型含座標：Pass、Carry、Shot、Ball Receipt、Dribble 等
- 360 數據：所有可見球員位置（部分比賽）
- 預設比賽：2022 FIFA World Cup Final（Argentina vs France, match_id: 3869685）

## 技術方案
- **純前端**：單一 HTML + CSS + JavaScript（Canvas 繪圖）
- **無需後端**：直接從 GitHub raw URL 讀取 JSON
- **動畫引擎**：requestAnimationFrame + 事件插值

## 頁面結構（上下排列，類似截圖）

### 上半部：球場動畫區
- Canvas 繪製俯視球場（綠色條紋、白線、球門）
- 球的移動動畫（Pass/Carry/Shot 的座標插值）
- 球員點位顯示（利用 360 freeze-frame 數據）
- 控球隊伍標示（「巴西 控球」→ 改為實際隊名）
- 球場上方：觀眾席背景

### 下半部：比賽資訊區
1. **比分列**：隊徽 + 隊名 + 比分 + 比賽時間
2. **事件時間軸**：
   - 橫向 0'-90' 時間軸
   - 上方主隊事件（⚽ 進球、🟨 黃牌、🟥 紅牌、🔄 換人、🚩 角球）
   - 下方客隊事件
   - 控球率波形圖（每 5 分鐘段的控球比例）
3. **統計數據列**：
   - 控球率（從 possession 事件計算）
   - 進攻次數 / 危險進攻
   - 射門 / 射正 / 射偏

## 動畫邏輯

### 球移動插值
1. 按 `index` 順序播放事件
2. 有座標的事件類型：
   - **Pass**: location → pass.end_location（畫弧線）
   - **Carry**: location → carry.end_location（直線移動）
   - **Shot**: location → shot.end_location（快速直線）
   - **Ball Receipt**: 球停在 location
3. 用 `timestamp` 計算事件間隔，控制動畫速度
4. 支援 1x / 2x / 4x / 8x 加速播放

### 座標轉換
- StatsBomb: 120x80 → Canvas 像素
- 下半場自動翻轉座標（確保兩隊攻守方向正確）
- `canvasX = (x / 120) * pitchWidth`
- `canvasY = (y / 80) * pitchHeight`

## 檔案結構
```
footballAnimationLive/
  index.html          # 主頁面（所有 HTML/CSS/JS 內嵌）
```

## 實作步驟

1. **建立球場繪製** - Canvas 畫足球場（條紋草皮、線條、球門）
2. **載入 StatsBomb 數據** - fetch 比賽/事件/陣容/360 JSON
3. **計算比賽統計** - 從事件數據算出控球率、射門等
4. **事件時間軸** - 繪製時間軸 + 事件圖標
5. **球移動動畫** - 事件插值 + requestAnimationFrame
6. **360 球員顯示** - 顯示 freeze-frame 球員位置
7. **播放控制** - 播放/暫停、速度控制、時間拖曳
8. **整體 UI 美化** - 深色主題、觀眾席背景、隊徽
