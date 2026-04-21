// ============================================================
// 多人德州撲克 — Boardgame.io Server + Express 靜態檔案
// ============================================================
const { Server, Origins } = require('boardgame.io/server');
const { PokerGame } = require('./src/poker');
const path = require('path');

// 允許所有 origins（部署後 Railway 會給隨機子網域，用 regex 最保險）
const server = Server({
  games: [PokerGame],
  origins: [Origins.LOCALHOST, /.*/],
});

// 靜態檔案（public 目錄）
server.app.use(require('koa-static')(path.join(__dirname, 'public')));

// 固定 3000（對齊 Railway 預設的 Target Port），本地也用 3000
const PORT = 3000;

// 啟動錯誤一定要印出來，否則 Railway 只會回 502
process.on('uncaughtException', (err) => {
  console.error('[Poker-MP] uncaughtException:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[Poker-MP] unhandledRejection:', err);
});

server.run(PORT, () => {
  console.log(`[Poker-MP] Server listening on 0.0.0.0:${PORT}`);
  console.log(`[Poker-MP] API: /games/poker`);
  console.log(`[Poker-MP] Listening on port ${PORT}`); // 讓 Railway 自動偵測
});
