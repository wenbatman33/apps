# Aviator 飛行員（Crash 即時下注）

以 **PixiJS v8** 重製 SPRIBE《Aviator》玩法的網頁遊戲，PC 與手機皆可遊玩。
全部 UI（HUD、下注面板、清單、彈窗、數字鍵盤、DEV 工具）都由引擎繪製，沒有任何 DOM 元件。

> 純技術展示 Demo，不涉及任何真實金流。

## 玩法（對齊原作規則）

| 項目 | 數值 |
| --- | --- |
| RTP | 97% |
| 最大倍率 | 100,000x |
| 最小 / 最大投注 | NT$3 / NT$3,000 |
| 每注獎金上限 | NT$300,000 |
| 同時下注 | 雙押注 |
| 公平機制 | Provably Fair（SHA-256） |

- **投注**：回合起飛前輸入金額或用快捷鈕（10 / 20 / 50 / 100），按「投注」；起飛前可按「取消」收回。飛行中下注則排入下一回合。
- **兌現**：飛機飛走前按「兌現」，獎金 = 兌現倍數 × 投注額；沒兌現就歸零。
- **雙押注**：面板右上角 `+` / `−` 可新增或收起第二個下注面板。
- **自動**：「自動」分頁可開自動下注、自動兌現（目標倍數點一下用內建數字鍵盤輸入）。
- **即時投注**：PC 在左側、手機在下方，列出本回合所有玩家的下注與兌現，另有「我的下注」「最高」分頁。
- **斷線處理**：投注生效中若離開頁面，會以當下倍數自動兌現（對齊原作斷線規則）。

## Provably Fair

- 每回合開始前先產生 `serverSeed`，只公布其 SHA-256 **承諾雜湊**。
- 倍數由 `SHA-256(serverSeed:clientSeed:nonce)` 決定，**開局前就已定案**。
- 回合結束後公開 `serverSeed`，選單 →「Provably Fair 公平驗證」可一鍵重算比對。
- 分佈：`P(倍數 ≥ m) = RTP / m`，因此期望回報率恰為 97%；`clientSeed` 可自行更換。

驗證分佈與 RTP：

```bash
node tools/simrtp.mjs
```

## DEV 微調工具

遊戲中按 **D** 開啟（或選單內說明）：

- 版面滑桿：topbar / history / 側欄寬 / 間距 / 下注面板高、飛機巡航點與縮放、原點、倍數字級與位置、按鈕高度、列高……即時預覽
- 🎯 **拖曳畫面直接設定飛機巡航點**
- 節奏參數：`growth`（倍數成長速度）、`reachMs`、`bettingMs`、`crashedMs`
- 狀態測試：立即飛走、下一回合鎖 1.00x / 2.00x / 10.00x / 100.00x
- PC / Mobile 版型切換、重設數值
- 💾 匯出 JSON（複製到剪貼簿，貼回 `src/config.js` 的 `LAYOUT_PC` / `LAYOUT_MOBILE` 即可鎖定）

## 本機執行

```bash
python3 -m http.server 5190
```

開 http://localhost:5190 。

## 自動測試

```bash
python3 scripts/test_ui.py
```

用 Playwright 實際點擊 canvas 上的按鈕，驗證下注 → 兌現 → 餘額、分頁切換、數字鍵盤、選單與 Provably Fair 重算。

## 結構

```
index.html / styles.css
src/
  config.js          規則、色票、PC/Mobile 版面
  core/  fair.js     Provably Fair 與崩盤倍數分佈
         engine.js   回合狀態機（下注 → 飛行 → 飛走）
         game.js     餘額、雙押注、自動下注/兌現
         bots.js     即時投注列表的線上玩家
  view/  scene.js    版面組裝與事件連結
         flight.js   曲線、飛機、倍數、等待動畫
         betpanel.js 下注面板
         feed.js     即時投注清單（虛擬列表）
         chrome.js   頂列與歷史倍數列
         modals.js   選單 / 玩法 / 公平驗證
         keypad.js   引擎渲染的數字鍵盤
         ui.js       按鈕、分頁、開關、捲動容器
         textures.js canvas 產生的漸層與程式繪製飛機
  audio/ sfx.js      WebAudio 合成音效
  dev/   devtools.js DEV 微調工具
assets/images/plane.png   AI 生成的飛機素材
tools/simrtp.mjs          RTP / 分佈驗證
scripts/                  截圖與 UI 自測腳本
```
