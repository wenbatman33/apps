// 鬥地主規則驗證（node tests/verify_rules.cjs）
const C = require('../src/core/cards.js');

let passed = 0, failed = 0;

function card(rank, suit = 0) { return { id: rank * 4 + suit + Math.random(), rank, suit }; }
// 便捷建牌：'3' '10' 'J' 'Q' 'K' 'A' '2' 'SJ' 'BJ'
const R = { '3': 0, '4': 1, '5': 2, '6': 3, '7': 4, '8': 5, '9': 6, '10': 7, J: 8, Q: 9, K: 10, A: 11, '2': 12, SJ: 13, BJ: 14 };
function hand(...names) {
  const used = {};
  return names.map(n => {
    used[n] = (used[n] || 0) + 1;
    return card(R[n], used[n] - 1);
  });
}

function eq(actual, expected, msg) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { passed++; }
  else { failed++; console.log(`FAIL: ${msg}\n  expect ${JSON.stringify(expected)}\n  actual ${JSON.stringify(actual)}`); }
}
function evType(cards) {
  const ev = C.evaluate(cards);
  return ev ? { type: ev.type, len: ev.len, key: ev.key } : null;
}

// ---- 基本牌型 ----
eq(evType(hand('7')), { type: 'single', len: 1, key: R['7'] }, '單張');
eq(evType(hand('BJ')), { type: 'single', len: 1, key: R.BJ }, '單張大王');
eq(evType(hand('9', '9')), { type: 'pair', len: 1, key: R['9'] }, '對子');
eq(evType(hand('SJ', 'BJ')), { type: 'rocket', len: 1, key: 99 }, '王炸');
eq(evType(hand('SJ', 'SJ')), null, '兩張小王不存在也不合法');
eq(evType(hand('Q', 'Q', 'Q')), { type: 'triple', len: 1, key: R.Q }, '三條');
eq(evType(hand('Q', 'Q', 'Q', '3')), { type: 'triple1', len: 1, key: R.Q }, '三帶一');
eq(evType(hand('Q', 'Q', 'Q', '3', '3')), { type: 'triple2', len: 1, key: R.Q }, '三帶一對');
eq(evType(hand('Q', 'Q', 'Q', '3', '4')), null, '三帶兩張散牌不合法');
eq(evType(hand('8', '8', '8', '8')), { type: 'bomb', len: 1, key: R['8'] }, '炸彈');

// ---- 順子 / 連對 ----
eq(evType(hand('3', '4', '5', '6', '7')), { type: 'straight', len: 5, key: R['7'] }, '順子5張');
eq(evType(hand('10', 'J', 'Q', 'K', 'A')), { type: 'straight', len: 5, key: R.A }, '順子到A');
eq(evType(hand('J', 'Q', 'K', 'A', '2')), null, '順子不能含2');
eq(evType(hand('3', '4', '5', '6')), null, '順子最少5張');
eq(evType(hand('3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A')), { type: 'straight', len: 12, key: R.A }, '12張大順');
eq(evType(hand('4', '4', '5', '5', '6', '6')), { type: 'pairs', len: 3, key: R['6'] }, '連對3對');
eq(evType(hand('4', '4', '5', '5')), null, '連對最少3對');
eq(evType(hand('K', 'K', 'A', 'A', '2', '2')), null, '連對不能含2');

// ---- 飛機 ----
eq(evType(hand('7', '7', '7', '8', '8', '8')), { type: 'plane', len: 2, key: R['8'] }, '飛機不帶');
eq(evType(hand('7', '7', '7', '8', '8', '8', '3', 'K')), { type: 'plane1', len: 2, key: R['8'] }, '飛機帶單');
eq(evType(hand('7', '7', '7', '8', '8', '8', '3', '3', 'K', 'K')), { type: 'plane2', len: 2, key: R['8'] }, '飛機帶對');
eq(evType(hand('A', 'A', 'A', '2', '2', '2')), null, '飛機不能含2');
eq(evType(hand('K', 'K', 'K', 'A', 'A', 'A')), { type: 'plane', len: 2, key: R.A }, 'KA飛機');
eq(evType(hand('7', '7', '7', '9', '9', '9')), null, '不連續非飛機');
eq(evType(hand('7', '7', '7', '8', '8', '8', 'SJ', 'BJ')), null, '飛機翅膀不能是完整王炸');

// ---- 四帶二 ----
eq(evType(hand('9', '9', '9', '9', '3', '5')), { type: 'four2', len: 1, key: R['9'] }, '四帶二單');
eq(evType(hand('9', '9', '9', '9', '3', '3')), { type: 'four2', len: 1, key: R['9'] }, '四帶二（帶一對也算兩單）');
eq(evType(hand('9', '9', '9', '9', 'SJ', 'BJ')), null, '四帶二不能帶王炸');
eq(evType(hand('9', '9', '9', '9', '3', '3', '5', '5')), { type: 'four2p', len: 1, key: R['9'] }, '四帶兩對');

// ---- 壓牌 ----
function b(a, bb) { return C.beats(C.evaluate(a), C.evaluate(bb)); }
eq(b(hand('8'), hand('7')), true, '大單壓小單');
eq(b(hand('2'), hand('A')), true, '2壓A');
eq(b(hand('SJ'), hand('2')), true, '小王壓2');
eq(b(hand('BJ'), hand('SJ')), true, '大王壓小王');
eq(b(hand('8', '8'), hand('7')), false, '對子不能壓單張');
eq(b(hand('4', '4', '4', '4'), hand('BJ')), true, '炸彈壓單張大王');
eq(b(hand('4', '4', '4', '4'), hand('A', 'A', 'A', '2', '2')), true, '炸彈壓三帶一對');
eq(b(hand('5', '5', '5', '5'), hand('4', '4', '4', '4')), true, '大炸壓小炸');
eq(b(hand('SJ', 'BJ'), hand('2', '2', '2', '2')), true, '王炸壓炸彈');
eq(b(hand('2', '2', '2', '2'), hand('SJ', 'BJ')), false, '炸彈壓不過王炸');
eq(b(hand('4', '5', '6', '7', '8'), hand('3', '4', '5', '6', '7')), true, '大順壓小順');
eq(b(hand('4', '5', '6', '7', '8', '9'), hand('3', '4', '5', '6', '7')), false, '不同長度順子不能互壓');
eq(b(hand('9', '9', '9', '3'), hand('8', '8', '8', 'A')), true, '三帶一比三條點數');

// ---- 發牌 ----
const d = C.deal();
eq(d.hands.map(h => h.length), [17, 17, 17], '三家各17張');
eq(d.bottom.length, 3, '底牌3張');
const all = d.hands.flat().concat(d.bottom);
eq(new Set(all.map(c => c.id)).size, 54, '54張不重複');

// ---- 出牌列舉 ----
const h1 = hand('3', '3', '3', '4', '4', '5', '6', '7', 'SJ', 'BJ');
const moves = C.listAllMoves(h1);
const has = t => moves.some(m => m.ev.type === t);
eq(has('single'), true, '列舉含單張');
eq(has('pair'), true, '列舉含對子');
eq(has('triple1'), true, '列舉含三帶一');
eq(has('straight'), true, '列舉含順子');
eq(has('rocket'), true, '列舉含王炸');

// 跟牌：手上有炸彈時，即使牌型不同也列得出來
const h2 = hand('6', '6', '6', '6', '3');
const legal = C.listLegalMoves(h2, C.evaluate(hand('A', 'A')));
eq(legal.length >= 1 && legal[0].ev.type === 'bomb', true, '對子壓不過就出炸彈');

// 首出時列舉不會太爆炸（效能保險）
const big = C.deal().hands[0].concat();
const t0 = Date.now();
C.listLegalMoves(big, null);
eq(Date.now() - t0 < 500, true, '17張手牌列舉在500ms內');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
