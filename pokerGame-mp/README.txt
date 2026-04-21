Poker Royale MP — 多人德州撲克
================================

技術棧：Node.js + Boardgame.io 0.50.2 + PixiJS 7.3.2 + Parcel

本地開發
--------
1. 安裝依賴：
   npm install

2. 打包前端：
   npm run build:client
   (分別打包: npm run build:lobby / npm run build:game)

3. 啟動 Server：
   npm start
   (開發模式: npm run dev)

4. 開啟瀏覽器 http://localhost:8000

檔案結構
--------
pokerGame-mp/
├── package.json
├── server.js              # Boardgame.io + koa-static 服務
├── src/
│   └── poker.js           # 遊戲邏輯（CJS）
├── public/
│   ├── index.html         # 首頁（姓名輸入 + 大廳 + 等待室）
│   ├── game.html          # 遊戲畫面（PixiJS）
│   └── dist/              # Parcel 打包輸出（.gitignore）
│       ├── lobby/lobby.js
│       └── game/game-client.js
├── client/
│   ├── lobby.js           # 大廳邏輯
│   └── game-client.js     # PixiJS 渲染 + boardgame.io client
└── .gitignore

遊戲流程
--------
1. 輸入名字 → 進入大廳
2. 建立房間（取得 6 位邀請碼）或輸入碼加入
3. 等待室：最少 2 人，最多 6 人
4. 房主點「開始遊戲」
5. 遊戲開始，每人只看到自己的牌

操作
----
- 棄牌（Fold）：放棄本局
- 過牌（Check）：不加注直接過（需無人跟注）
- 跟注（Call）：跟上目前最高注額
- 加注（Raise）：拖拉滑桿設定金額

API 端點
--------
GET    /games/poker                   列出所有房間
POST   /games/poker/create            建立新房間 { numPlayers: 6 }
GET    /games/poker/:matchID          取得房間資訊
POST   /games/poker/:matchID/join     加入房間 { playerID, playerName }

Railway 部署
-----------
1. 將 repo push 到 GitHub
2. 在 Railway 建立新 Project，連接 GitHub repo
3. 設定環境：
   - Build Command:  npm install && npm run build:client
   - Start Command:  npm start
4. 環境變數 PORT 由 Railway 自動注入（server.js 已讀取 process.env.PORT）
5. 部署完成後訪問 Railway 提供的網址即可

注意事項
--------
- boardgame.io 0.50.x Server 使用 Koa，app 是 Koa instance
- 靜態服務使用 koa-static 掛載 public/ 目錄
- Parcel 打包時需分開目錄（避免與 boardgame.io 內部 server.js chunk 衝突）
  前端輸出到 public/dist/lobby/ 和 public/dist/game/
