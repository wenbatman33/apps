// 大老二核心牌型逻辑（纯函式，不依赖 Phaser，方便单独测试）
// 花色由小到大：♣(0) < ♦(1) < ♥(2) < ♠(3)
// 点数由小到大：3,4,5,6,7,8,9,10,J,Q,K,A,2 → rank 0..12
// 单张数值 value = rank * 4 + suit，可直接比大小

const SUITS = ['♣', '♦', '♥', '♠'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

// 牌型分类（五张牌用，数字越大越强）
const CAT = {
  STRAIGHT: 1,      // 顺子
  FLUSH: 2,         // 同花
  FULL_HOUSE: 3,    // 葫芦
  FOUR: 4,          // 铁支
  STRAIGHT_FLUSH: 5 // 同花顺
};

// 产生一副 52 张牌
function makeDeck() {
  const deck = [];
  for (let rank = 0; rank < 13; rank++) {
    for (let suit = 0; suit < 4; suit++) {
      deck.push({ id: rank * 4 + suit, rank, suit, value: rank * 4 + suit });
    }
  }
  return deck;
}

// Fisher-Yates 洗牌（可传入 rng 以便重现牌局）
function shuffle(deck, rng = Math.random) {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 发牌：4 家各 13 张，各自由小到大排序
function deal(rng = Math.random) {
  const deck = shuffle(makeDeck(), rng);
  const hands = [[], [], [], []];
  for (let i = 0; i < 52; i++) hands[i % 4].push(deck[i]);
  hands.forEach(h => h.sort((a, b) => a.value - b.value));
  return hands;
}

function cardLabel(card) {
  return RANKS[card.rank] + SUITS[card.suit];
}

// 是否为梅花3（开局第一手必须包含）
function isClubThree(card) {
  return card.rank === 0 && card.suit === 0;
}

// ---------- 牌型辨识 ----------

// 回传 { type, size, cat, key } 或 null（不合法牌型）
// type: 'single' | 'pair' | 'triple' | 'five'
// key: 同型比大小用的排序键（数字，越大越强）
function evaluate(cards) {
  if (!cards || cards.length === 0) return null;
  const sorted = cards.slice().sort((a, b) => a.value - b.value);
  const n = sorted.length;

  if (n === 1) {
    return { type: 'single', size: 1, cat: 0, key: sorted[0].value };
  }

  if (n === 2) {
    if (sorted[0].rank !== sorted[1].rank) return null;
    // 对子比最大的那张（含花色）
    return { type: 'pair', size: 2, cat: 0, key: sorted[1].value };
  }

  if (n === 3) {
    if (sorted[0].rank !== sorted[1].rank || sorted[1].rank !== sorted[2].rank) return null;
    return { type: 'triple', size: 3, cat: 0, key: sorted[0].rank };
  }

  if (n === 5) return evaluateFive(sorted);

  return null;
}

function evaluateFive(sorted) {
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);
  // 顺子：rank 连续。不接受绕回（例如 A-2-3-4-5），2 只能当最大的收尾
  let isStraight = true;
  for (let i = 1; i < 5; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) { isStraight = false; break; }
  }

  // 统计每个 rank 出现次数
  const counts = {};
  ranks.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const groups = Object.keys(counts)
    .map(r => ({ rank: Number(r), n: counts[r] }))
    .sort((a, b) => (b.n - a.n) || (b.rank - a.rank));

  if (isStraight && isFlush) {
    // 同花顺：比最大牌
    return { type: 'five', size: 5, cat: CAT.STRAIGHT_FLUSH, key: sorted[4].value };
  }
  if (groups[0].n === 4) {
    // 铁支：比四张的点数
    return { type: 'five', size: 5, cat: CAT.FOUR, key: groups[0].rank };
  }
  if (groups[0].n === 3 && groups[1] && groups[1].n === 2) {
    // 葫芦：比三条的点数
    return { type: 'five', size: 5, cat: CAT.FULL_HOUSE, key: groups[0].rank };
  }
  if (isFlush) {
    // 同花：比最大牌
    return { type: 'five', size: 5, cat: CAT.FLUSH, key: sorted[4].value };
  }
  if (isStraight) {
    // 顺子：比最大牌
    return { type: 'five', size: 5, cat: CAT.STRAIGHT, key: sorted[4].value };
  }
  return null;
}

// 炸弹：铁支、同花顺。可在任何情况打出，不论对方是单张/对子/三条/五张
function isBomb(ev) {
  return ev && (ev.cat === CAT.FOUR || ev.cat === CAT.STRAIGHT_FLUSH);
}

// a 是否能压过 b（两者皆为 evaluate 结果）
function beats(a, b) {
  if (!a) return false;
  if (!b) return true;                       // 自由出牌（首家）
  const aBomb = isBomb(a), bBomb = isBomb(b);
  if (aBomb || bBomb) {
    // 只要有一方是炸弹：炸弹压任何非炸弹（不看张数）；两个炸弹比大小
    if (aBomb && !bBomb) return true;        // 炸弹压一般牌
    if (!aBomb && bBomb) return false;       // 一般牌压不过炸弹
    if (a.cat !== b.cat) return a.cat > b.cat; // 同花顺 > 铁支
    return a.key > b.key;                    // 同类炸弹比点数
  }
  // 都是一般牌：张数必须相同，再比牌型/点数
  if (a.size !== b.size) return false;
  if (a.cat !== b.cat) return a.cat > b.cat;
  return a.key > b.key;
}

// 牌型中文名称（给 UI 显示用）
function comboName(ev) {
  if (!ev) return '';
  switch (ev.type) {
    case 'single': return '单张';
    case 'pair': return '对子';
    case 'triple': return '三条';
    case 'five':
      switch (ev.cat) {
        case CAT.STRAIGHT_FLUSH: return '同花顺';
        case CAT.FOUR: return '铁支';
        case CAT.FULL_HOUSE: return '葫芦';
        case CAT.FLUSH: return '同花';
        case CAT.STRAIGHT: return '顺子';
      }
      return '五张';
  }
  return '';
}

// ---------- 手牌组合列举（AI 与提示功能共用） ----------

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

// 依 rank 分组
function groupByRank(hand) {
  const m = new Map();
  hand.forEach(c => {
    if (!m.has(c.rank)) m.set(c.rank, []);
    m.get(c.rank).push(c);
  });
  return m;
}

// 列出手牌中所有合法的单/对/三条
function listSmallCombos(hand) {
  const res = [];
  hand.forEach(c => res.push([c]));
  groupByRank(hand).forEach(cards => {
    if (cards.length >= 2) combinations(cards, 2).forEach(c => res.push(c));
    if (cards.length >= 3) combinations(cards, 3).forEach(c => res.push(c));
  });
  return res;
}

// 列出手牌中所有合法的五张牌型（用结构化列举，避免 C(13,5) 全扫）
function listFiveCombos(hand) {
  const res = [];
  const byRank = groupByRank(hand);
  const ranks = [...byRank.keys()].sort((a, b) => a - b);

  // 顺子 / 同花顺：每个起始 rank 各取一张的笛卡儿积
  for (let i = 0; i + 4 < ranks.length; i++) {
    const seq = [];
    let ok = true;
    for (let k = 0; k < 5; k++) {
      const r = ranks[i] + k;
      if (!byRank.has(r)) { ok = false; break; }
      seq.push(byRank.get(r));
    }
    if (!ok) continue;
    // 展开所有花色组合
    let acc = [[]];
    seq.forEach(cards => {
      const next = [];
      acc.forEach(prefix => cards.forEach(c => next.push(prefix.concat([c]))));
      acc = next;
    });
    acc.forEach(c => res.push(c));
  }

  // 同花：同花色中任取 5 张
  const bySuit = new Map();
  hand.forEach(c => {
    if (!bySuit.has(c.suit)) bySuit.set(c.suit, []);
    bySuit.get(c.suit).push(c);
  });
  bySuit.forEach(cards => {
    if (cards.length >= 5) combinations(cards, 5).forEach(c => res.push(c));
  });

  // 葫芦：三条 + 对子
  byRank.forEach((three, r3) => {
    if (three.length < 3) return;
    byRank.forEach((two, r2) => {
      if (r2 === r3 || two.length < 2) return;
      combinations(three, 3).forEach(t => {
        combinations(two, 2).forEach(p => res.push(t.concat(p)));
      });
    });
  });

  // 铁支：四张 + 任一张
  byRank.forEach((four, r4) => {
    if (four.length < 4) return;
    hand.forEach(c => {
      if (c.rank !== r4) res.push(four.concat([c]));
    });
  });

  // 去重（同花顺会同时被顺子与同花列举到）
  const seen = new Set();
  return res.filter(combo => {
    const key = combo.map(c => c.id).sort((a, b) => a - b).join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 列出手牌中所有合法出牌（含 evaluate 结果）
function listAllMoves(hand) {
  const raw = listSmallCombos(hand).concat(listFiveCombos(hand));
  const moves = [];
  raw.forEach(cards => {
    const ev = evaluate(cards);
    if (ev) moves.push({ cards, ev });
  });
  return moves;
}

// 列出所有「能压过 last」的出牌；last 为 null 表示自由出牌
// mustInclude：开局第一手必须包含的牌（梅花3）
function listLegalMoves(hand, last, mustInclude = null) {
  let moves = listAllMoves(hand).filter(m => beats(m.ev, last));
  if (mustInclude) {
    moves = moves.filter(m => m.cards.some(c => c.id === mustInclude.id));
  }
  // 由弱到强排序，方便 AI 与提示采用「最小可压」
  moves.sort((a, b) => (a.ev.size - b.ev.size) || (a.ev.cat - b.ev.cat) || (a.ev.key - b.ev.key));
  return moves;
}

window.BigTwoCards = {
  SUITS, RANKS, CAT,
  makeDeck, shuffle, deal, cardLabel, isClubThree,
  evaluate, beats, comboName,
  listAllMoves, listLegalMoves, combinations
};
