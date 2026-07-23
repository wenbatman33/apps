/**
 * 大老二規則驗证 —— 直接載入遊戲同一份 src/core/cards.js，逐條檢查並印出結果。
 * 用法： node tests/verify_rules.cjs
 * 全部通過會 exit 0；有任何一條不符會印出 ✗ 並 exit 1。
 *
 * 規則來源：維基百科「大老二」台灣玩法、BeClass 大老二比賽規則。
 */
global.window = {};
require('../src/core/cards.js');
require('../src/core/game.js');
const C = window.BigTwoCards;

// 用文字組牌：'7c'=梅花7, 'Ts'=黑桃10, '2h'=紅心2
const R = { '3':0,'4':1,'5':2,'6':3,'7':4,'8':5,'9':6,'T':7,'J':8,'Q':9,'K':10,'A':11,'2':12 };
const S = { c:0, d:1, h:2, s:3 };           // 梅花<方塊<紅心<黑桃
const card = t => { const r=R[t[0]], s=S[t[1]]; return { id:r*4+s, rank:r, suit:s, value:r*4+s }; };
const P = str => str.split(' ').map(card);
// a 這手是否壓得過 b 這手
const beats = (a, b) => C.beats(C.evaluate(P(a)), b ? C.evaluate(P(b)) : null);

let pass = 0, fail = 0;
function check(desc, got, want) {
  const ok = got === want;
  console.log(`  ${ok ? '✓' : '✗'}  ${desc}` + (ok ? '' : `   （預期 ${want}，實得 ${got}）`));
  ok ? pass++ : fail++;
}

console.log('\n【一】牌型辨識');
check('3張同數字 = 三條', C.evaluate(P('5c 5d 5h')).type, 'triple');
check('4張同數字(裸) 非法牌型',       C.evaluate(P('5c 5d 5h 5s')), null);
check('3c 4d 5h 6s 7c = 順子',        C.evaluate(P('3c 4d 5h 6s 7c')).cat, C.CAT.STRAIGHT);
check('同花色5張 = 同花',             C.evaluate(P('3c 5c 7c 9c Jc')).cat, C.CAT.FLUSH);
check('3+2 = 葫蘆',                   C.evaluate(P('5c 5d 5h 7c 7d')).cat, C.CAT.FULL_HOUSE);
check('4+1 = 鐵支',                   C.evaluate(P('5c 5d 5h 5s 7d')).cat, C.CAT.FOUR);
check('同花色連續5張 = 同花順',       C.evaluate(P('3c 4c 5c 6c 7c')).cat, C.CAT.STRAIGHT_FLUSH);

console.log('\n【二】點數與花色大小（3最小、2最大；花色 ♠>♥>♦>♣）');
check('2 壓 A（單張）',   beats('2c', 'As'), true);
check('黑桃3 壓 紅心3',   beats('3s', '3h'), true);
check('梅花3 壓不過 紅心3', beats('3c', '3h'), false);

console.log('\n【三】跟牌張數：一般牌張數必須相同');
check('對子 壓不過 單張', beats('3c 3d', '4c'), false);
check('單張 壓不過 對子', beats('9c', '3c 3d'), false);
check('大對子 壓 小對子', beats('Kc Kd', '3c 3d'), true);

console.log('\n【四】五張牌型階級：順子<同花<葫蘆<鐵支<同花順');
check('同花 壓 順子',     beats('3c 5c 7c 9c Jc', '9c Td Jh Qs Kc'), true);
check('葫蘆 壓 同花',     beats('5c 5d 5h 7c 7d', '3c 5c 7c 9c Jc'), true);
check('鐵支 壓 葫蘆',     beats('5c 5d 5h 5s 7d', 'Kc Kd Kh Qc Qd'), true);
check('同花順 壓 鐵支',   beats('3c 4c 5c 6c 7c', 'Ac Ad Ah As Kd'), true);

console.log('\n【五】炸彈規則：鐵支/同花順「切」——不論張數都可壓過一般牌');
check('鐵支 壓 單張 3',   beats('7c 7d 7h 7s 8h', '3s'), true);
check('鐵支 壓 對子',     beats('7c 7d 7h 7s 8h', 'Kc Kd'), true);
check('鐵支 壓 三條',     beats('7c 7d 7h 7s 8h', 'Ac Ad Ah'), true);
check('同花順 壓 單張 2', beats('3c 4c 5c 6c 7c', '2s'), true);
check('同花順 壓 鐵支',   beats('3c 4c 5c 6c 7c', '9c 9d 9h 9s Td'), true);
check('大鐵支 壓 小鐵支', beats('9c 9d 9h 9s Td', '5c 5d 5h 5s 7d'), true);
check('一般單張 壓不過 鐵支', beats('2s', '7c 7d 7h 7s 8h'), false);
check('對子 壓不過 同花順',   beats('2c 2d', '3c 4c 5c 6c 7c'), false);

console.log('\n【六】首家自由出牌（檯面無牌時任何合法牌型皆可）');
check('自由出單張',   beats('3c', null), true);
check('自由出鐵支',   beats('7c 7d 7h 7s 8h', null), true);

console.log('\n【七】順子不可繞回（2 只能當最大收尾，A-2-3-4-5 非法）');
check('A 2 3 4 5 非順子', C.evaluate(P('Ac 2d 3h 4s 5c')), null);
check('T J Q K A 為順子',  C.evaluate(P('Tc Jd Qh Ks Ac')).cat, C.CAT.STRAIGHT);

console.log('\n【八】計分：剩牌分級 ×倍率，♠2/關門再×2');
// 用指定手牌算某家的罰分；hands 用「數量」表示，需要 ♠2 時放進去
function scoreOf(handStr, lastStr) {
  const g = new window.BigTwoGame();
  g.hands = [ [], [], [], [] ];
  g.hands[1] = handStr ? P(handStr) : [];  // 測第 1 家（空字串 = 0 張）
  g.last = lastStr ? { cards: P(lastStr) } : null;
  return g.settle()[1].score;
}
// 湊 n 張不含 ♠2 的雜牌
const filler = n => Array.from({length:n}, (_,k)=>['3c','4c','5c','6c','7c','8c','9c','Tc','Jc','Qc','Kc','Ac','3d'][k]).join(' ');
check('剩5張 → 5（×1）',        scoreOf(filler(5)), 5);
check('剩8張 → 16（×2）',       scoreOf(filler(8)), 16);
check('剩10張 → 30（×3）',      scoreOf(filler(10)), 30);
check('剩13張 → 52（×4）',      scoreOf(filler(13)), 52);
check('剩5張含♠2 → 10（×1再×2）', scoreOf('3c 4c 5c 6c 2s'), 10);
check('剩9張含♠2 → 36（×2再×2）', scoreOf('3c 4c 5c 6c 7c 8c 9c Tc 2s'), 36);
check('關門(贏家最後出♠2)剩6張 → 12（×1再×2關門）', scoreOf(filler(6), '2s'), 12);
check('出完(0張) → 0',          scoreOf(''), 0);

console.log(`\n結果：${pass} 通過、${fail} 失敗\n`);
process.exit(fail ? 1 : 0);
