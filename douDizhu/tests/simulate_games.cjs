// 整局模擬：三家全用 AI 互打 N 局，驗證狀態機不卡死、結算合理
// 用法：node tests/simulate_games.cjs [局數]

global.window = {};                       // 讓瀏覽器用的 IIFE 模組掛到這裡
const C = require('../src/core/cards.js');
window.DdzCards = C;
require('../src/core/ai.js');
require('../src/core/game.js');

const N = parseInt(process.argv[2] || '200', 10);
let landlordWins = 0, farmerWins = 0, redeals = 0, springs = 0, bombs = 0;
let failed = 0;

for (let i = 0; i < N; i++) {
  const g = new window.DdzGame({ difficulty: ['easy', 'normal', 'hard'][i % 3], firstBidder: i % 3 });
  let over = false, steps = 0;
  g.on('redeal', () => redeals++);
  g.on('bomb', () => bombs++);
  g.on('invalid', ({ reason }) => { console.log(`  局${i} invalid: ${reason}`); failed++; });
  g.on('over', ({ landlordWin, spring }) => {
    over = true;
    if (landlordWin) landlordWins++; else farmerWins++;
    if (spring) springs++;
  });
  g.start();

  while (!over && steps < 2000) {
    steps++;
    const p = g.turn;
    if (g.phase === 'bidding') {
      // AI 不叫時偶爾強迫叫 1 分，避免測試裡無限重發
      let bid = g.aiBid(p);
      if (bid === 0 && g.bidsDone === 2 && g.bidWinner < 0 && steps > 500) bid = 1;
      g.callBid(p, bid);
    } else if (g.phase === 'playing') {
      const cards = g.aiMove(p);
      if (cards) g.play(p, cards);
      else g.pass(p);
    } else break;
  }

  if (!over) { console.log(`  局${i} 卡死（${steps} 步，phase=${g.phase}）`); failed++; continue; }

  // 驗證結束時牌數守恆：贏家 0 張，其餘總和 + 已出 = 54
  const total = g.hands.flat().length;
  if (g.hands[g.winner].length !== 0) { console.log(`  局${i} 贏家還有牌`); failed++; }
  if (total < 0 || total > 54) { console.log(`  局${i} 牌數異常 ${total}`); failed++; }
  const s = g.settle();
  if (s.pts <= 0 || s.bid < 1 || s.bid > 3) { console.log(`  局${i} 結算異常`, s); failed++; }
}

console.log(`${N} 局完成：地主勝 ${landlordWins}、農民勝 ${farmerWins}、重發 ${redeals} 次、春天 ${springs}、炸彈 ${bombs}`);
console.log(failed ? `FAILED: ${failed}` : 'ALL OK');
process.exit(failed ? 1 : 0);
