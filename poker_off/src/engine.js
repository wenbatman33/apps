// ===========================================================================
// 德州撲克核心引擎（純邏輯，無 Phaser 依賴）
// 牌組 / 牌型評估 / 下注流程狀態機 / 邊池 / AI 決策
// ===========================================================================

const SUITS = ['c', 'd', 'h', 's'];      // 梅花 方塊 紅心 黑桃
const SUIT_SYMBOL = { c: '♣', d: '♦', h: '♥', s: '♠' };
const RED_SUITS = { d: true, h: true };
const RANK_STR = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

// 牌型名稱（由低到高）
const HAND_NAMES = [
  'High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight',
  'Flush', 'Full House', 'Four of a Kind', 'Straight Flush',
];

function rankLabel(r) { return RANK_STR[r] || String(r); }

// ---- 牌組 ----------------------------------------------------------------
function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) deck.push({ r, s });
  return deck;
}

function shuffle(deck, rng = Math.random) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ---- 牌型評估（7 取 5 最佳）---------------------------------------------
// 回傳可比較分數：[category, ...tiebreakers]，category 0..8
function evaluate7(cards) {
  // cards: [{r,s}]，2~7 張皆可（評估時取最佳 5 張）
  const ranks = cards.map(c => c.r);
  const counts = {};            // rank -> 數量
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;

  const bySuit = { c: [], d: [], h: [], s: [] };
  for (const c of cards) bySuit[c.s].push(c.r);

  // 同花偵測
  let flushSuit = null;
  for (const s of SUITS) if (bySuit[s].length >= 5) flushSuit = s;

  // 順子偵測工具
  const straightHigh = (rankSet) => {
    // rankSet: Set of ranks。A 可當 1（A2345）
    const present = new Set(rankSet);
    if (present.has(14)) present.add(1);
    let run = 0, best = 0;
    for (let r = 14; r >= 1; r--) {
      if (present.has(r)) { run++; if (run >= 5) { best = r + 4; break; } }
      else run = 0;
    }
    return best; // 0 表示沒有；否則回傳順子最高張
  };

  // 同花順
  if (flushSuit) {
    const sh = straightHigh(bySuit[flushSuit]);
    if (sh) return [8, sh];
  }

  // 依數量分組
  const groups = Object.keys(counts).map(r => ({ r: +r, n: counts[r] }));
  groups.sort((a, b) => b.n - a.n || b.r - a.r);

  const four = groups.find(g => g.n === 4);
  if (four) {
    const kicker = Math.max(...ranks.filter(r => r !== four.r));
    return [7, four.r, kicker];
  }

  const trips = groups.filter(g => g.n === 3);
  const pairs = groups.filter(g => g.n === 2);
  // 葫蘆（含兩組三條取較大當 trips、另一三條當 pair）
  if (trips.length >= 1 && (pairs.length >= 1 || trips.length >= 2)) {
    const t = trips[0].r;
    const pairRank = trips.length >= 2 ? trips[1].r : pairs[0].r;
    return [6, t, pairRank];
  }

  // 同花
  if (flushSuit) {
    const top5 = bySuit[flushSuit].slice().sort((a, b) => b - a).slice(0, 5);
    return [5, ...top5];
  }

  // 順子
  const sh = straightHigh(new Set(ranks));
  if (sh) return [4, sh];

  // 三條
  if (trips.length >= 1) {
    const t = trips[0].r;
    const kick = ranks.filter(r => r !== t).sort((a, b) => b - a).slice(0, 2);
    return [3, t, ...kick];
  }

  // 兩對
  if (pairs.length >= 2) {
    const [p1, p2] = [pairs[0].r, pairs[1].r];
    const kick = Math.max(...ranks.filter(r => r !== p1 && r !== p2));
    return [2, p1, p2, kick];
  }

  // 一對
  if (pairs.length === 1) {
    const p = pairs[0].r;
    const kick = ranks.filter(r => r !== p).sort((a, b) => b - a).slice(0, 3);
    return [1, p, ...kick];
  }

  // 高牌
  const top5 = ranks.slice().sort((a, b) => b - a).slice(0, 5);
  return [0, ...top5];
}

function compareScore(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function handName(score) { return HAND_NAMES[score[0]]; }

// ===========================================================================
// 下注流程狀態機
// ===========================================================================
const STREETS = ['preflop', 'flop', 'turn', 'river', 'showdown'];

class PokerGame {
  // players: [{id,name,emoji,stack,isHuman}]
  constructor(players, { smallBlind = 8, bigBlind = 16, rng = Math.random } = {}) {
    this.players = players.map(p => ({
      ...p, hole: [], folded: false, allIn: false, out: false,
      bet: 0, committed: 0, hasActed: false, lastAction: null,
    }));
    this.sb = smallBlind;
    this.bb = bigBlind;
    this.rng = rng;
    this.button = 0;
    this.community = [];
    this.pot = 0;
    this.street = 'idle';
    this.currentBet = 0;
    this.minRaise = bigBlind;
    this.toAct = -1;
    this.deck = [];
    this.lastAggressor = -1;
    this.handNo = 0;
    this.log = [];
  }

  activePlayers() { return this.players.filter(p => !p.out); }
  inHand() { return this.players.filter(p => !p.folded && !p.out); }
  canAct() { return this.players.filter(p => !p.folded && !p.allIn && !p.out); }

  // 找下一個還在場（未 out）的座位
  nextSeat(i) {
    const n = this.players.length;
    for (let k = 1; k <= n; k++) {
      const idx = (i + k) % n;
      if (!this.players[idx].out) return idx;
    }
    return i;
  }

  startHand() {
    this.handNo++;
    this.log = [];
    // 重置玩家狀態
    for (const p of this.players) {
      p.hole = []; p.folded = false; p.allIn = false;
      p.bet = 0; p.committed = 0; p.hasActed = false; p.lastAction = null;
      if (p.stack <= 0) p.out = true;
    }
    this.community = [];
    this.pot = 0;
    this.currentBet = 0;
    this.minRaise = this.bb;
    this.deck = shuffle(makeDeck(), this.rng);

    // 移動按鈕到下一個在場玩家
    this.button = this.nextSeat(this.button);

    const live = this.activePlayers();
    const heads = live.length === 2;

    // 小盲 / 大盲位置
    let sbSeat, bbSeat;
    if (heads) {
      sbSeat = this.button;                 // 單挑：按鈕即小盲
      bbSeat = this.nextSeat(this.button);
    } else {
      sbSeat = this.nextSeat(this.button);
      bbSeat = this.nextSeat(sbSeat);
    }
    this.postBlind(sbSeat, this.sb);
    this.postBlind(bbSeat, this.bb);
    this.currentBet = this.bb;
    this.minRaise = this.bb;
    this.lastAggressor = bbSeat;

    // 發底牌（每人 2 張）
    for (let d = 0; d < 2; d++)
      for (const p of this.activePlayers()) p.hole.push(this.deck.pop());

    this.street = 'preflop';
    // 第一個行動者：大盲之後
    this.toAct = this.nextActable(bbSeat);
    this._roundStartActed();
    return this;
  }

  postBlind(seat, amount) {
    const p = this.players[seat];
    const pay = Math.min(amount, p.stack);
    p.stack -= pay; p.bet = pay; p.committed += pay; this.pot += pay;
    if (p.stack === 0) p.allIn = true;
  }

  // 標記本輪需重新行動者（下注輪開始）
  _roundStartActed() {
    for (const p of this.players) if (!p.folded && !p.out) p.hasActed = false;
  }

  // 從 seat 之後找下一個可行動（未棄、未 all-in、未 out）
  nextActable(seat) {
    const n = this.players.length;
    for (let k = 1; k <= n; k++) {
      const idx = (seat + k) % n;
      const p = this.players[idx];
      if (!p.folded && !p.allIn && !p.out) return idx;
    }
    return -1;
  }

  // 取得目前行動者的合法動作
  legalActions(seat = this.toAct) {
    const p = this.players[seat];
    if (!p || p.folded || p.allIn || p.out) return null;
    const toCall = this.currentBet - p.bet;
    const actions = { fold: true };
    if (toCall <= 0) {
      actions.check = true;
    } else {
      actions.call = Math.min(toCall, p.stack);
    }
    // 加注 / 下注
    const maxRaiseTotal = p.bet + p.stack;          // 全下後的總注
    const minRaiseTotal = this.currentBet + this.minRaise;
    if (p.stack > toCall) {
      actions.raise = {
        min: Math.min(minRaiseTotal, maxRaiseTotal),
        max: maxRaiseTotal,
        isBet: this.currentBet === 0,                // 無人下注時叫 Bet
      };
    }
    actions.toCall = Math.max(0, toCall);
    actions.pot = this.pot;
    return actions;
  }

  // 執行動作：type in {fold,check,call,raise}; amount=加注後的「總下注額」
  act(type, amount) {
    const seat = this.toAct;
    const p = this.players[seat];
    if (!p) return;
    p.hasActed = true;

    if (type === 'fold') {
      p.folded = true; p.lastAction = 'Fold';
    } else if (type === 'check') {
      p.lastAction = 'Check';
    } else if (type === 'call') {
      const pay = Math.min(this.currentBet - p.bet, p.stack);
      p.stack -= pay; p.bet += pay; p.committed += pay; this.pot += pay;
      if (p.stack === 0) p.allIn = true;
      p.lastAction = 'Call';
    } else if (type === 'raise') {
      const wasBet = this.currentBet === 0;             // 套用前判斷：無人下注時叫 Bet
      const target = Math.min(amount, p.bet + p.stack);
      const inc = target - p.bet;
      const raiseSize = target - this.currentBet;
      if (raiseSize >= this.minRaise) this.minRaise = raiseSize; // 更新最小加注幅度
      p.stack -= inc; p.bet = target; p.committed += inc; this.pot += inc;
      this.currentBet = target;
      this.lastAggressor = seat;
      if (p.stack === 0) p.allIn = true;
      p.lastAction = wasBet ? 'Bet' : 'Raise';
      // 有人加注 → 其他人需重新行動
      for (const q of this.players)
        if (q !== p && !q.folded && !q.allIn && !q.out) q.hasActed = false;
    }

    this._advance();
  }

  // 判斷本下注輪是否結束
  _bettingClosed() {
    const actable = this.canAct();
    // 只剩 0/1 人能行動且都已對齊 → 結束
    for (const p of actable) {
      if (!p.hasActed) return false;
      if (p.bet !== this.currentBet) return false;
    }
    return true;
  }

  _advance() {
    // 只剩一人未棄 → 直接結束本手
    if (this.inHand().length === 1) { this._goShowdown(); return; }

    if (this._bettingClosed()) {
      this._nextStreet();
      return;
    }
    // 找下一個可行動者
    let next = this.nextActable(this.toAct);
    // 跳過已對齊且已行動者
    let guard = 0;
    while (next !== -1 && guard++ < 20) {
      const p = this.players[next];
      if (!p.hasActed || p.bet !== this.currentBet) break;
      next = this.nextActable(next);
    }
    this.toAct = next;
    if (this.toAct === -1) this._nextStreet();
  }

  _collectBets() {
    for (const p of this.players) p.bet = 0;
    this.currentBet = 0;
    this.minRaise = this.bb;
  }

  _nextStreet() {
    this._collectBets();
    if (this.canAct().length <= 1 && this.inHand().length > 1) {
      // 大家都 all-in，直接發完剩餘公共牌
      this._dealRemaining();
      this._goShowdown();
      return;
    }
    if (this.street === 'preflop') { this._deal(3); this.street = 'flop'; }
    else if (this.street === 'flop') { this._deal(1); this.street = 'turn'; }
    else if (this.street === 'turn') { this._deal(1); this.street = 'river'; }
    else if (this.street === 'river') { this._goShowdown(); return; }

    this._roundStartActed();
    // 翻牌後由按鈕後第一個可行動者開始
    this.toAct = this.nextActable(this.button);
    this.lastAggressor = -1;
  }

  _deal(n) {
    this.deck.pop(); // burn
    for (let i = 0; i < n; i++) this.community.push(this.deck.pop());
  }

  _dealRemaining() {
    while (this.community.length < 5) {
      if (this.community.length === 0) this._deal(3);
      else this._deal(1);
    }
  }

  _goShowdown() {
    this._collectBets();
    this.street = 'showdown';
    this.toAct = -1;
    this.result = this._settle();
  }

  // 邊池結算
  _settle() {
    const contenders = this.inHand();
    // 若只剩一人，直接拿走全部
    if (contenders.length === 1) {
      const w = contenders[0];
      w.stack += this.pot;
      const res = { pots: [{ amount: this.pot, winners: [w.id] }], hands: {}, uncontested: true };
      this.pot = 0;
      return res;
    }

    // 計算各玩家最終牌力
    const hands = {};
    for (const p of contenders) {
      const score = evaluate7(p.hole.concat(this.community));
      hands[p.id] = { score, name: handName(score) };
    }

    // 依 committed 切邊池
    const all = this.players.filter(p => p.committed > 0);
    const levels = [...new Set(all.map(p => p.committed))].sort((a, b) => a - b);
    let prev = 0;
    const pots = [];
    for (const lvl of levels) {
      const layer = lvl - prev;
      const participants = all.filter(p => p.committed >= lvl);
      const amount = layer * participants.length;
      // 此池有資格分配者：未棄牌且 committed>=lvl
      const eligible = participants.filter(p => !p.folded);
      pots.push({ amount, eligibleIds: eligible.map(p => p.id) });
      prev = lvl;
    }

    // 分配每個池
    const payout = {};
    const potResults = [];
    for (const pot of pots) {
      if (pot.amount <= 0 || pot.eligibleIds.length === 0) continue;
      let best = null, winners = [];
      for (const id of pot.eligibleIds) {
        const sc = hands[id].score;
        if (!best || compareScore(sc, best) > 0) { best = sc; winners = [id]; }
        else if (compareScore(sc, best) === 0) winners.push(id);
      }
      const share = Math.floor(pot.amount / winners.length);
      let rem = pot.amount - share * winners.length;
      for (const id of winners) {
        payout[id] = (payout[id] || 0) + share + (rem-- > 0 ? 1 : 0);
      }
      potResults.push({ amount: pot.amount, winners });
    }

    for (const p of this.players) if (payout[p.id]) p.stack += payout[p.id];
    this.pot = 0;
    return { pots: potResults, hands, payout, uncontested: false };
  }

  // 場上是否只剩一人有籌碼（遊戲結束）
  gameOver() {
    return this.activePlayers().length <= 1;
  }
}

// ===========================================================================
// AI 決策
// ===========================================================================

// 估算當前手牌強度 0..1（粗略）
function handStrength(game, p) {
  const community = game.community;
  if (community.length === 0) {
    // 翻牌前：以兩張底牌粗估
    const [a, b] = p.hole;
    const hi = Math.max(a.r, b.r), lo = Math.min(a.r, b.r);
    const pair = a.r === b.r;
    const suited = a.s === b.s;
    const gap = hi - lo;
    let s = (hi - 2) / 12 * 0.4 + (lo - 2) / 12 * 0.2;
    if (pair) s = 0.5 + (a.r - 2) / 12 * 0.5;
    else {
      if (suited) s += 0.08;
      if (gap === 1) s += 0.06;
      else if (gap <= 3) s += 0.03;
      if (hi >= 13) s += 0.05;
    }
    return Math.max(0.05, Math.min(0.98, s));
  }
  // 翻牌後：用成手牌型 category 對照
  const score = evaluate7(p.hole.concat(community));
  const cat = score[0];
  const base = [0.18, 0.42, 0.6, 0.72, 0.82, 0.88, 0.93, 0.98, 1][cat];
  // 高牌時用最高張微調
  let adj = 0;
  if (cat === 0) adj = (score[1] - 7) / 30;
  if (cat === 1) adj = (score[1] - 7) / 40;
  return Math.max(0.05, Math.min(0.999, base + adj));
}

// 回傳 {type, amount}
function aiDecide(game, seat) {
  const p = game.players[seat];
  const legal = game.legalActions(seat);
  if (!legal) return { type: 'check' };
  const rng = game.rng;
  const strength = handStrength(game, p);
  const toCall = legal.toCall || 0;
  const pot = game.pot;
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

  // 隨機性與虛張聲勢
  const noise = (rng() - 0.5) * 0.12;
  const eff = Math.max(0, Math.min(1, strength + noise));
  const bluff = rng() < 0.08;

  // 無人下注（可過牌）
  if (legal.check && !legal.call) {
    if ((eff > 0.55 || bluff) && legal.raise) {
      const size = Math.round((0.4 + eff * 0.8) * Math.max(pot, game.bb));
      const amt = clampRaise(legal.raise, game.currentBet + Math.max(game.bb, size));
      return { type: 'raise', amount: amt };
    }
    return { type: 'check' };
  }

  // 面對下注
  if (legal.call != null) {
    // 強牌 → 加注
    if (eff > 0.78 && legal.raise && rng() < 0.7) {
      const size = Math.round((0.6 + eff) * pot);
      const amt = clampRaise(legal.raise, game.currentBet + Math.max(game.minRaise, size));
      return { type: 'raise', amount: amt };
    }
    // 虛張
    if (bluff && legal.raise && eff < 0.4) {
      const amt = clampRaise(legal.raise, game.currentBet + Math.max(game.minRaise, Math.round(pot * 0.6)));
      return { type: 'raise', amount: amt };
    }
    // 跟注判斷：手牌強度需勝過底池賠率（加一點容忍）
    if (eff + 0.12 >= potOdds || (toCall <= game.bb && eff > 0.3)) {
      return { type: 'call' };
    }
    return { type: 'fold' };
  }
  return { type: 'check' };
}

function clampRaise(raise, target) {
  return Math.max(raise.min, Math.min(raise.max, Math.round(target)));
}

// ---- 掛上全域（供非 module 的 main.js 使用，雙擊 file:// 即可運行）----
window.Engine = {
  SUITS, SUIT_SYMBOL, RED_SUITS, RANK_STR, HAND_NAMES, rankLabel,
  makeDeck, shuffle, evaluate7, compareScore, handName, STREETS,
  PokerGame, aiDecide,
};
