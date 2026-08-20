# 貪蛇進化 Slither Evolution

slither.io 玩法的大逃殺蛇遊戲，PixiJS v8（WebGL）渲染，**瀏覽器直跑的純 ESM 專案，無需建置**。

## 玩法

- 吃地上的光點變長，長度就是分數
- **誰的頭撞到別人的身體，誰就死** —— 跟體型無關，小蛇繞到大蛇前面切一刀就能翻盤
- 頭對頭相撞＝雙方一起死；撞到世界邊界（紅圈）也會死
- 死亡的蛇會沿身體撒成一地食物
- 加速會持續消耗長度，並在尾巴掉出食物

## 操作

| | PC | 手機 |
|---|---|---|
| 轉向 | 滑鼠指向（或 WASD／方向鍵） | 按住畫面任意處出現浮動搖桿 |
| 加速 | 按住滑鼠左鍵 / 空白鍵 / Shift | 右下「衝」鍵，或搖桿推到底 |
| 離開本局 | Esc | 左上 ✕ |
| DEV 工具 | D 鍵 或 右上齒輪 | 右上齒輪 |

## 執行

```bash
python3 -m http.server 5180
```

開 http://localhost:5180 。也可用 `.claude/launch.json` 直接啟動。

## 排行榜

- **遊戲內即時榜**：畫面右上顯示當局前 10 名（玩家自己會標成黃字），左上顯示自己的即時名次
- **本機紀錄榜**：分數存 localStorage（前 10 筆），開始畫面與結算畫面都看得到

## DEV 微調工具

按 `D` 或右上齒輪開啟，所有數值**即時生效**：

- 玩法手感（速度、轉向、加速消耗、成長曲線、鏡頭縮放、AI 攻擊性…）
- 世界（半徑、食物數、AI 數量）
- 版面（分數／排行榜／小地圖／加速鍵的位置、大小、透明度），可切 **PC / Mobile 分別調整**
- **直接用滑鼠拖曳 HUD 元件**改位置（面板擋到時按「⇄ 面板換邊」）
- 狀態測試：＋100 分數、召喚 AI、觸發死亡結算、重開一局
- **💾 匯出**：輸出目前所有數值的 JSON（同時複製到剪貼簿），貼回來就能 baked 進 `src/config.js`

## 架構

```
index.html          入口（無建置，直接 <script type="module">）
vendor/pixi.min.mjs  PixiJS v8（本地檔，不依賴 CDN）
src/
  config.js         所有可調參數：WORLD / TUNING / LAYOUT_PC / LAYOUT_MOBILE
  core/             純邏輯層，不碰渲染
    world.js        世界模擬：蛇、食物、碰撞、死亡、重生、排行榜
    snake.js        蛇：頭部前進並記錄軌跡，身體沿軌跡等距取樣
    bot.js          AI：對候選方向評分（安全 > 食物 > 攻擊 > 邊界）
    spatial.js      均勻空間網格（碰撞加速）
  net/transport.js  傳輸層抽象：LocalTransport（本地模擬）／RemoteTransport（線上多人預留）
  view/             Pixi 渲染：renderer / hud / menu / textures（貼圖全程式生成）
  input/controls.js 滑鼠、鍵盤、觸控搖桿
  audio/sfx.js      WebAudio 合成音效，無音檔
  store/leaderboard.js  本機紀錄（localStorage）
  dev/devtools.js   DEV 微調工具
tools/              測試腳本（Node 模擬 + Playwright 端對端）
```

### 線上多人預留

遊戲主迴圈只依賴 `transport` 介面（`join / sendInput / tick / world`）。要開線上多人時，實作 `RemoteTransport`（WebSocket 連線、套用伺服器快照、內插補償）並在 `main.js` 換掉 `LocalTransport` 即可，其餘遊戲程式碼不需更動。

## 測試

```bash
node tools/simtest.mjs      # 60 秒世界模擬：成長、AI、碰撞、效能
node tools/soaktest.mjs     # 5 分鐘穩定性：物件池、記憶體
python3 tools/e2e.py        # PC + 手機端對端（需 playwright）
python3 tools/devtest.py    # DEV 工具功能
```
