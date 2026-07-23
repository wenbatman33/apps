// 鬥地主核心牌型邏輯（純函式，不依賴 Phaser，方便單獨測試）
// 比大小只看點數，花色無關
// 點數由小到大：3,4,5,6,7,8,9,10,J,Q,K,A,2,小王,大王 → rank 0..14
// 順子/連對/飛機只能用 3..A（rank ≤ 11），2 與王不能入鏈

const SUITS = ['♣', '♦', '♥', '♠'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', '小王', '大王'];

const RANK_2 = 12;        // 2
const RANK_SJ = 13;       // 小王
const RANK_BJ = 14;       // 大王
const MAX_CHAIN = 11;     // 鏈型（順子/連對/飛機）最大點數 A

// 牌型 type：
//   single 單張 | pair 對子 | triple 三條 | triple1 三帶一 | triple2 三帶一對
//   straight 順子 | pairs 連對 | plane 飛機 | plane1 飛機帶單 | plane2 飛機帶對
//   four2 四帶二單 | four2p 四帶兩對 | bomb 炸彈 | rocket 王炸

// 產生一副 54 張牌（52 + 大小王）
function makeDeck() {
  const deck = [];
  for (let rank = 0; rank < 13; rank++) {
    for (let suit = 0; suit < 4; suit++) {
      deck.push({ id: rank * 4 + suit, rank, suit });
    }
  }
  deck.push({ id: 52, rank: RANK_SJ, suit: -1 });   // 小王
  deck.push({ id: 53, rank: RANK_BJ, suit: -1 });   // 大王
  return deck;
}

// Fisher-Yates 洗牌（可傳入 rng 以便重現牌局）
function shuffle(deck, rng = Math.random) {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 發牌：3 家各 17 張 + 3 張底牌
function deal(rng = Math.random) {
  const deck = shuffle(makeDeck(), rng);
  const hands = [[], [], []];
  for (let i = 0; i < 51; i++) hands[i % 3].push(deck[i]);
  const bottom = deck.slice(51);
  hands.forEach(h => sortHand(h));
  return { hands, bottom };
}

// 手牌排序：由大到小（鬥地主慣例，大牌在左）
function sortHand(hand) {
  hand.sort((a, b) => (b.rank - a.rank) || (b.suit - a.suit));
  return hand;
}

function cardLabel(card) {
  if (card.rank >= RANK_SJ) return RANKS[card.rank];
  return RANKS[card.rank] + SUITS[card.suit];
}

// 點數出現次數 Map<rank, count>
function countRanks(cards) {
  const m = new Map();
  cards.forEach(c => m.set(c.rank, (m.get(c.rank) || 0) + 1));
  return m;
}

// ---------- 牌型辨識 ----------

// 回傳 { type, size, len, key } 或 null（不合法牌型）
//   size：總張數　len：鏈長（順子張數 / 連對對數 / 飛機組數，非鏈型為 1）
//   key：同型比大小用的主點數
function evaluate(cards) {
  if (!cards || cards.length === 0) return null;
  const n = cards.length;
  const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
  const counts = countRanks(cards);

  // 王炸
  if (n === 2 && ranks[0] === RANK_SJ && ranks[1] === RANK_BJ) {
    return { type: 'rocket', size: 2, len: 1, key: 99 };
  }
  if (n === 1) return { type: 'single', size: 1, len: 1, key: ranks[0] };
  if (n === 2 && ranks[0] === ranks[1] && ranks[0] <= RANK_2) {
    return { type: 'pair', size: 2, len: 1, key: ranks[0] };
  }
  if (n === 3 && counts.size === 1) return { type: 'triple', size: 3, len: 1, key: ranks[0] };

  if (n === 4) {
    if (counts.size === 1) return { type: 'bomb', size: 4, len: 1, key: ranks[0] };
    // 三帶一（帶的那張不能是拆開的王炸——單王可以）
    for (const [r, c] of counts) {
      if (c === 3) return { type: 'triple1', size: 4, len: 1, key: r };
    }
    return null;
  }

  if (n === 5) {
    // 三帶一對
    let three = -1, two = -1;
    for (const [r, c] of counts) {
      if (c === 3) three = r;
      else if (c === 2) two = r;
    }
    if (three >= 0 && two >= 0) return { type: 'triple2', size: 5, len: 1, key: three };
  }

  // 順子：5 張以上、點數連續、全單張、最大到 A
  if (n >= 5 && counts.size === n && isConsecutive(ranks) && ranks[n - 1] <= MAX_CHAIN) {
    return { type: 'straight', size: n, len: n, key: ranks[n - 1] };
  }

  // 連對：3 對以上、點數連續、全對子、最大到 A
  if (n >= 6 && n % 2 === 0 && counts.size === n / 2 && ranks[n - 1] <= MAX_CHAIN) {
    const rs = [...counts.keys()].sort((a, b) => a - b);
    if ([...counts.values()].every(c => c === 2) && isConsecutive(rs)) {
      return { type: 'pairs', size: n, len: n / 2, key: rs[rs.length - 1] };
    }
  }

  // 四帶二單（6 張）/ 四帶兩對（8 張）
  if (n === 6) {
    for (const [r, c] of counts) {
      if (c === 4) {
        // 帶的兩張不能是完整王炸
        const rest = ranks.filter(x => x !== r);
        if (!(rest.length === 2 && rest[0] === RANK_SJ && rest[1] === RANK_BJ)) {
          return { type: 'four2', size: 6, len: 1, key: r };
        }
      }
    }
  }
  if (n === 8) {
    const four = [...counts.entries()].find(([r, c]) => c === 4);
    if (four) {
      const rest = [...counts.entries()].filter(([r]) => r !== four[0]);
      if (rest.length === 2 && rest.every(([r, c]) => c === 2)) {
        return { type: 'four2p', size: 8, len: 1, key: four[0] };
      }
    }
  }

  // 飛機（含帶翼）
  const plane = tryPlane(n, counts);
  if (plane) return plane;

  return null;
}

function isConsecutive(sortedRanks) {
  for (let i = 1; i < sortedRanks.length; i++) {
    if (sortedRanks[i] !== sortedRanks[i - 1] + 1) return false;
  }
  return true;
}

// 飛機：k 組連續三條（k≥2、點數 ≤A），可帶 k 張單 或 k 個對
function tryPlane(n, counts) {
  for (let k = Math.floor(n / 3); k >= 2; k--) {
    if (n !== 3 * k && n !== 4 * k && n !== 5 * k) continue;
    // 找出所有可能的 k 連續三條窗口（由大到小試，優先取最大的主體）
    const trip = [];
    for (const [r, c] of counts) if (c >= 3 && r <= MAX_CHAIN) trip.push(r);
    trip.sort((a, b) => a - b);
    for (let s = trip.length - k; s >= 0; s--) {
      const win = trip.slice(s, s + k);
      if (win.length < k || !isConsecutive(win)) continue;
      // 主體之外剩下的牌
      const rest = new Map();
      for (const [r, c] of counts) {
        const used = win.includes(r) ? 3 : 0;
        if (c - used > 0) rest.set(r, c - used);
      }
      const restTotal = [...rest.values()].reduce((a, b) => a + b, 0);
      if (n === 3 * k && restTotal === 0) {
        return { type: 'plane', size: n, len: k, key: win[k - 1] };
      }
      if (n === 4 * k && restTotal === k) {
        // 帶單：翅膀不能含完整王炸
        if (!(rest.get(RANK_SJ) && rest.get(RANK_BJ))) {
          return { type: 'plane1', size: n, len: k, key: win[k - 1] };
        }
      }
      if (n === 5 * k && restTotal === 2 * k) {
        // 帶對：剩牌必須恰好組成 k 個對子
        if ([...rest.values()].every(c => c % 2 === 0)) {
          return { type: 'plane2', size: n, len: k, key: win[k - 1] };
        }
      }
    }
  }
  return null;
}

function isBomb(ev) {
  return ev && (ev.type === 'bomb' || ev.type === 'rocket');
}

// a 是否能壓過 b（兩者皆為 evaluate 結果；b 為 null 表示自由出牌）
function beats(a, b) {
  if (!a) return false;
  if (!b) return true;
  if (a.type === 'rocket') return true;
  if (b.type === 'rocket') return false;
  if (a.type === 'bomb' && b.type !== 'bomb') return true;
  if (b.type === 'bomb' && a.type !== 'bomb') return false;
  // 同型且同長度才能比
  if (a.type !== b.type || a.len !== b.len) return false;
  return a.key > b.key;
}

// 牌型中文名稱（給 UI 顯示用）
// UI 顯示文字沿用大老二的簡體介面
const TYPE_NAMES = {
  single: '单张', pair: '对子', triple: '三条',
  triple1: '三带一', triple2: '三带一对',
  straight: '顺子', pairs: '连对',
  plane: '飞机', plane1: '飞机带单', plane2: '飞机带对',
  four2: '四带二', four2p: '四带两对',
  bomb: '炸弹', rocket: '王炸'
};

function comboName(ev) {
  return ev ? (TYPE_NAMES[ev.type] || '') : '';
}

// ---------- 手牌組合列舉（AI 與提示功能共用） ----------

function combinations(arr, k) {
  const out = [];
  const pick = (start, cur) => {
    if (cur.length === k) { out.push(cur.slice()); return; }
    for (let i = start; i < arr.length; i++) {
      cur.push(arr[i]);
      pick(i + 1, cur);
      cur.pop();
    }
  };
  pick(0, []);
  return out;
}

// 依 rank 分組（rank 由小到大）
function groupByRank(hand) {
  const m = new Map();
  hand.slice().sort((a, b) => a.rank - b.rank).forEach(c => {
    if (!m.has(c.rank)) m.set(c.rank, []);
    m.get(c.rank).push(c);
  });
  return m;
}

// 列出手牌中所有值得考慮的出牌（同點數只取一種花色組合，避免重複）
function listAllMoves(hand) {
  const res = [];
  const byRank = groupByRank(hand);
  const rankList = [...byRank.keys()].sort((a, b) => a - b);

  // 單張 / 對子 / 三條 / 炸彈
  byRank.forEach((cards, r) => {
    res.push([cards[0]]);
    if (cards.length >= 2) res.push(cards.slice(0, 2));
    if (cards.length >= 3) res.push(cards.slice(0, 3));
    if (cards.length === 4) res.push(cards.slice());
  });

  // 王炸
  if (byRank.has(RANK_SJ) && byRank.has(RANK_BJ)) {
    res.push([byRank.get(RANK_SJ)[0], byRank.get(RANK_BJ)[0]]);
  }

  // 三帶一 / 三帶一對
  byRank.forEach((cards, r) => {
    if (cards.length < 3) return;
    byRank.forEach((wing, wr) => {
      if (wr === r) return;
      res.push(cards.slice(0, 3).concat([wing[0]]));
      if (wing.length >= 2) res.push(cards.slice(0, 3).concat(wing.slice(0, 2)));
    });
  });

  // 順子（長度 5..12）
  for (let len = 5; len <= 12; len++) {
    for (let start = 0; start <= MAX_CHAIN - len + 1; start++) {
      let ok = true;
      const combo = [];
      for (let r = start; r < start + len; r++) {
        if (!byRank.has(r)) { ok = false; break; }
        combo.push(byRank.get(r)[0]);
      }
      if (ok) res.push(combo);
    }
  }

  // 連對（3..10 對）
  for (let len = 3; len <= 10; len++) {
    for (let start = 0; start <= MAX_CHAIN - len + 1; start++) {
      let ok = true;
      const combo = [];
      for (let r = start; r < start + len; r++) {
        if (!byRank.has(r) || byRank.get(r).length < 2) { ok = false; break; }
        combo.push(...byRank.get(r).slice(0, 2));
      }
      if (ok) res.push(combo);
    }
  }

  // 飛機（2..5 組），帶單 / 帶對的翅膀從其餘點數挑最小的
  for (let len = 2; len <= 5; len++) {
    for (let start = 0; start <= MAX_CHAIN - len + 1; start++) {
      let ok = true;
      const body = [];
      const bodyRanks = new Set();
      for (let r = start; r < start + len; r++) {
        if (!byRank.has(r) || byRank.get(r).length < 3) { ok = false; break; }
        body.push(...byRank.get(r).slice(0, 3));
        bodyRanks.add(r);
      }
      if (!ok) continue;
      res.push(body.slice());
      // 帶單：其餘點數各取一張，由小到大挑 len 張
      const singles = [];
      const pairsW = [];
      rankList.forEach(r => {
        if (bodyRanks.has(r)) return;
        const cs = byRank.get(r);
        singles.push(cs[0]);
        if (cs.length >= 2) pairsW.push(cs.slice(0, 2));
      });
      if (singles.length >= len) {
        res.push(body.concat(singles.slice(0, len)));
      }
      if (pairsW.length >= len) {
        res.push(body.concat(pairsW.slice(0, len).flat()));
      }
    }
  }

  // 四帶二單 / 四帶兩對
  byRank.forEach((cards, r) => {
    if (cards.length < 4) return;
    const singles = [];
    const pairsW = [];
    rankList.forEach(or => {
      if (or === r) return;
      const cs = byRank.get(or);
      singles.push(cs[0]);
      if (cs.length >= 2) pairsW.push(cs.slice(0, 2));
    });
    if (singles.length >= 2) res.push(cards.slice(0, 4).concat(singles.slice(0, 2)));
    if (pairsW.length >= 2) res.push(cards.slice(0, 4).concat(pairsW.slice(0, 2).flat()));
  });

  const moves = [];
  res.forEach(cards => {
    const ev = evaluate(cards);
    if (ev) moves.push({ cards, ev });
  });
  return moves;
}

// 列出所有「能壓過 last」的出牌；last 為 null 表示自由出牌
function listLegalMoves(hand, last) {
  const moves = listAllMoves(hand).filter(m => beats(m.ev, last));
  // 由弱到強排序：一般牌 → 炸彈 → 王炸，同類比張數再比點數
  const order = ev => (ev.type === 'rocket' ? 2 : (ev.type === 'bomb' ? 1 : 0));
  moves.sort((a, b) =>
    (order(a.ev) - order(b.ev)) || (a.ev.size - b.ev.size) || (a.ev.key - b.ev.key));
  return moves;
}

const DdzCards = {
  SUITS, RANKS, RANK_2, RANK_SJ, RANK_BJ,
  makeDeck, shuffle, deal, sortHand, cardLabel,
  evaluate, beats, isBomb, comboName,
  listAllMoves, listLegalMoves, combinations, groupByRank, countRanks
};

if (typeof window !== 'undefined') window.DdzCards = DdzCards;
if (typeof module !== 'undefined') module.exports = DdzCards;
