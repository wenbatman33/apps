# 3D Casino — Royal Casino 娛樂城大廳

用 Three.js 打造的 3D 娛樂場大廳：光澤地板、紅毯走道、天花板燈格、霓虹招牌、
兩排共 12 台老虎機（動態轉輪、LED 呼吸燈條、Bloom 光暈）。
點擊機台 → 鏡頭飛到機台前 → 「進入遊戲」→ 轉址到你的 API。

## 執行

無需打包，任何靜態伺服器皆可：

```bash
python3 -m http.server 8471 -d /Users/batman_work/claude/apps/3dCasino
```

開 http://localhost:8471 （Three.js 由 CDN import map 載入，需連網）

## 設定轉址（重點）

編輯 [src/config.js](src/config.js)：

```js
export const REDIRECT = {
  base: 'https://your-api.example.com/launch',  // ← 改成你的 API 轉址頁
  openInNewTab: false,                          // true = 開新分頁
};
```

- 點機台後導向 `{base}?game=<機台id>`（例如 `?game=sengoku`）
- 個別機台要用完全自訂網址：在 `MACHINES` 該項加 `url: 'https://...'`
- 機台名稱 / 圖示 / 主題色也都在 `MACHINES` 陣列裡改

## 操作

| 操作 | 說明 |
|---|---|
| 拖曳 | 環視大廳 |
| 滾輪 / 雙指 | 縮放 |
| 點擊地板 | 走到該處 |
| 點擊機台 | 鏡頭飛到機台前，彈出「進入遊戲」 |
| `D` 或右下齒輪 | 開發者微調工具 |

## DEV 微調工具（按 D）

- 機台排列（每側台數、間距、走道寬、縮放）、相機、燈光、Bloom、霧、招牌文字/顏色、轉輪速度即時調整
- DEV 模式下可**直接拖曳機台**改位置
- 「🎉 測試中獎動畫」隨機讓一台機台爆閃
- 「💾 匯出設定」把 LAYOUT JSON 複製到剪貼簿 → 貼給 Claude 說「我調好了，鎖定」即可寫回 config.js

## 檔案結構

```
index.html        頁面外殼、彈窗 UI、import map
src/config.js     轉址設定 + 機台清單 + LAYOUT（可調參數）
src/main.js       主程式：渲染、相機、互動、音效、轉場
src/machine.js    老虎機模型（幾何 + Canvas 貼圖程序化生成）
src/casino.js     大廳場景（地板、紅毯、牆、天花板、招牌、燈光）
src/dev.js        DEV 微調工具（lil-gui）
```
