// ============================================================
// 多人德州撲克 — Boardgame.io 遊戲定義
// ============================================================

const { INVALID_MOVE, Stage } = require('boardgame.io/core');

const SUITS = ['Hearts', 'Diamonds', 'Club', 'Spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ suit: s, rank: r });
  return d;
}
function shuffleDeck(d) {
  const a = [...d];
  for (let i = a.length - 1; i > 0; i--) {
    const j = 0 | Math.random() * (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── 手牌評估 ──
function combo(a, k) {
  const r = [];
  (function c(s, co) {
    if (co.length === k) { r.push([...co]); return; }
    for (let i = s; i < a.length; i++) { co.push(a[i]); c(i + 1, co); co.pop(); }
  })(0, []);
  return r;
}
function chkSt(r) {
  const s = [...new Set(r)].sort((a, b) => b - a);
  if (s.length < 5) return false;
  return (s[0] - s[4] === 4 && s.length === 5) ||
    (s[0] === 12 && s[1] === 3 && s[2] === 2 && s[3] === 1 && s[4] === 0);
}
function eval5(cards) {
  const rk = cards.map(c => RANKS.indexOf(c.rank)).sort((a, b) => b - a);
  const su = cards.map(c => c.suit);
  const fl = su.every(s => s === su[0]);
  const st = chkSt(rk);
  const rc = {};
  for (const r of rk) rc[r] = (rc[r] || 0) + 1;
  const ct = Object.entries(rc)
    .map(([r, c]) => ({ rank: +r, count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  if (fl && st && rk[0] === 12 && rk[4] === 8) return { score: 9e6, name: '皇家同花順' };
  if (fl && st) return { score: 8e6 + rk[0], name: '同花順' };
  if (ct[0].count === 4) return { score: 7e6 + ct[0].rank * 100 + ct[1].rank, name: '四條' };
  if (ct[0].count === 3 && ct[1].count === 2) return { score: 6e6 + ct[0].rank * 100 + ct[1].rank, name: '葫蘆' };
  if (fl) return { score: 5e6 + rk[0] * 1e4 + rk[1] * 1e3 + rk[2] * 100 + rk[3] * 10 + rk[4], name: '同花' };
  if (st) { const h = (rk[0] === 12 && rk[1] === 3) ? 3 : rk[0]; return { score: 4e6 + h, name: '順子' }; }
  if (ct[0].count === 3) return { score: 3e6 + ct[0].rank * 1e4 + ct[1].rank * 100 + ct[2].rank, name: '三條' };
  if (ct[0].count === 2 && ct[1].count === 2) {
    const hp = Math.max(ct[0].rank, ct[1].rank), lp = Math.min(ct[0].rank, ct[1].rank);
    return { score: 2e6 + hp * 1e4 + lp * 100 + ct[2].rank, name: '兩對' };
  }
  if (ct[0].count === 2) return { score: 1e6 + ct[0].rank * 1e4 + ct[1].rank * 100 + ct[2].rank * 10 + ct[3].rank, name: '一對' };
  return { score: rk[0] * 1e4 + rk[1] * 1e3 + rk[2] * 100 + rk[3] * 10 + rk[4], name: '高牌' };
}
function evalHand(cards) {
  if (!cards || cards.length < 2) return { score: 0, name: '高牌' };
  const validCards = cards.filter(c => c && c.suit && c.rank);
  if (validCards.length < 5) return { score: 0, name: '高牌' };
  const cs = combo(validCards, 5);
  let bs = 0, bn = '高牌';
  for (const co of cs) {
    const r = eval5(co);
    if (r.score > bs) { bs = r.score; bn = r.name; }
  }
  return { score: bs, name: bn };
}

function dealHands(G) {
  for (let round = 0; round < 2; round++) {
    for (const pid of G.players) {
      if (!G.hands[pid]) G.hands[pid] = [];
      const card = G.deck.pop();
      G.hands[pid].push(card);
    }
  }
}
function dealCommunity(G, n) {
  G.deck.pop(); // burn
  for (let i = 0; i < n; i++) G.community.push(G.deck.pop());
}
function isBettingRoundDone(G) {
  const active = G.players.filter(pid => !G.folded[pid] && !G.allIn[pid] && G.chips[pid] >= 0);
  if (active.length === 0) return true;
  for (const pid of active) {
    if ((G.bets[pid] || 0) < G.currentBet) return false;
    if (!G.actedThisRound[pid]) return false;
  }
  return true;
}
function findNextPlayer(G, fromPid) {
  const idx = G.players.indexOf(fromPid);
  for (let i = 1; i <= G.players.length; i++) {
    const pid = G.players[(idx + i) % G.players.length];
    if (!G.folded[pid] && !G.allIn[pid] && G.chips[pid] > 0) return pid;
  }
  return null;
}
function advanceTurn(G, currentPid) {
  if (isBettingRoundDone(G)) { nextPhase(G); return; }
  const next = findNextPlayer(G, currentPid);
  if (next) G.activePlayer = next;
}
function nextPhase(G) {
  for (const pid of G.players) G.bets[pid] = 0;
  G.currentBet = 0;
  G.lastRaiser = null;
  G.actionsThisRound = 0;
  for (const pid of G.players) G.actedThisRound[pid] = false;

  const activePlayers = G.players.filter(p => !G.folded[p]);

  if (G.phase === 'preflop')      { G.phase = 'flop';  dealCommunity(G, 3); }
  else if (G.phase === 'flop')    { G.phase = 'turn';  dealCommunity(G, 1); }
  else if (G.phase === 'turn')    { G.phase = 'river'; dealCommunity(G, 1); }
  else if (G.phase === 'river')   { G.phase = 'showdown'; doShowdown(G); return; }
  else return;

  // 設定第一個行動玩家
  const dealerIdx = G.players.indexOf(String(G.dealer));
  for (let i = 1; i <= G.players.length; i++) {
    const pid = G.players[(dealerIdx + i) % G.players.length];
    if (!G.folded[pid] && G.chips[pid] > 0) { G.activePlayer = pid; break; }
  }
  // 若都 all-in 直接到結局
  const canAct = activePlayers.filter(p => !G.allIn[p] && G.chips[p] > 0);
  if (canAct.length <= 1 && G.phase !== 'showdown') {
    if (G.phase === 'flop')  { dealCommunity(G, 1); dealCommunity(G, 1); }
    else if (G.phase === 'turn') { dealCommunity(G, 1); }
    G.phase = 'showdown';
    doShowdown(G);
  }
}
function doShowdown(G) {
  const active = G.players.filter(p => !G.folded[p]);
  let best = -1, winner = null, winnerHandName = '高牌';
  for (const pid of active) {
    const allCards = [...(G.hands[pid] || []), ...G.community].filter(c => c && c.suit);
    const result = evalHand(allCards);
    if (result.score > best) { best = result.score; winner = pid; winnerHandName = result.name; }
  }
  if (winner) {
    G.winner = winner;
    G.winnerHand = winnerHandName;
    G.chips[winner] += G.pot;
    G.pot = 0;
  }
}

// ── 遊戲定義 ──
const PokerGame = {
  name: 'poker',

  setup: ({ ctx }) => ({
    deck: [],
    hands: {},
    community: [],
    pot: 0,
    bets: {},
    chips: {},
    folded: {},
    allIn: {},
    dealer: 0,
    currentBet: 0,
    phase: 'waiting',
    playerNames: {},
    lastActions: {},
    winner: null,
    winnerHand: null,
    handNumber: 0,
    bigBlind: 100,
    smallBlind: 50,
    actionsThisRound: 0,
    lastRaiser: null,
    players: [],
    actedThisRound: {},
    activePlayer: null,   // 當前該行動的玩家 ID（我們自己管理，非 boardgame.io 的 ctx）
  }),

  // 隱藏其他玩家手牌
  playerView: ({ G, ctx, playerID }) => {
    if (!playerID) return G;
    const hands = {};
    for (const pid of Object.keys(G.hands)) {
      if (pid === playerID || G.phase === 'showdown') {
        hands[pid] = G.hands[pid];
      } else {
        hands[pid] = G.hands[pid] ? G.hands[pid].map(() => ({ hidden: true })) : [];
      }
    }
    return { ...G, hands };
  },

  // ── 關鍵修正：使用 activePlayers + stages，讓所有玩家都能發動 moves ──
  turn: {
    activePlayers: { all: 'action' },
    stages: {
      action: {
        moves: {

          // 設定名字（任何人都能呼叫）
          setName: ({ G, ctx, playerID }, name) => {
            const pid = playerID;
            if (!pid) return INVALID_MOVE;
            G.playerNames[pid] = name || ('玩家' + pid);
            if (!G.players.includes(pid)) {
              G.players.push(pid);
              G.chips[pid] = 5000;
              G.bets[pid] = 0;
              G.folded[pid] = false;
              G.allIn[pid] = false;
              G.hands[pid] = [];
              G.actedThisRound[pid] = false;
            }
          },

          // 房主開始遊戲
          startGame: ({ G, ctx, playerID }) => {
            const pid = playerID;
            if (pid !== '0') return INVALID_MOVE;
            if (G.players.length < 2) return INVALID_MOVE;
            if (G.phase !== 'waiting') return INVALID_MOVE;

            G.handNumber = 1;
            G.deck = shuffleDeck(createDeck());
            G.community = [];
            G.pot = 0;
            G.currentBet = G.bigBlind;
            G.lastRaiser = null;
            G.winner = null;
            G.winnerHand = null;
            G.phase = 'preflop';

            for (const p of G.players) {
              G.bets[p] = 0;
              G.folded[p] = false;
              G.allIn[p] = false;
              G.hands[p] = [];
              G.actedThisRound[p] = false;
            }

            G.dealer = 0;
            dealHands(G);

            const sbIdx = G.dealer % G.players.length;
            const bbIdx = (G.dealer + 1) % G.players.length;
            const sbPid = G.players[sbIdx];
            const bbPid = G.players[bbIdx];

            const sbAmt = Math.min(G.smallBlind, G.chips[sbPid]);
            G.chips[sbPid] -= sbAmt; G.bets[sbPid] = sbAmt; G.pot += sbAmt;

            const bbAmt = Math.min(G.bigBlind, G.chips[bbPid]);
            G.chips[bbPid] -= bbAmt; G.bets[bbPid] = bbAmt; G.pot += bbAmt;

            G.lastActions[sbPid] = '小盲';
            G.lastActions[bbPid] = '大盲';

            const firstIdx = (G.dealer + 2) % G.players.length;
            G.activePlayer = G.players[firstIdx];
            G.actionsThisRound = 0;
          },

          // 棄牌
          fold: ({ G, ctx, playerID }) => {
            const pid = playerID;
            if (G.phase === 'waiting' || G.phase === 'showdown') return INVALID_MOVE;
            if (pid !== G.activePlayer) return INVALID_MOVE;
            G.folded[pid] = true;
            G.lastActions[pid] = '棄牌';
            const active = G.players.filter(p => !G.folded[p]);
            if (active.length === 1) {
              const winner = active[0];
              G.winner = winner;
              G.winnerHand = '對手棄牌';
              G.chips[winner] += G.pot;
              G.pot = 0;
              G.phase = 'showdown';
              return;
            }
            advanceTurn(G, pid);
          },

          // 過牌
          check: ({ G, ctx, playerID }) => {
            const pid = playerID;
            if (G.phase === 'waiting' || G.phase === 'showdown') return INVALID_MOVE;
            if (pid !== G.activePlayer) return INVALID_MOVE;
            if ((G.bets[pid] || 0) < G.currentBet) return INVALID_MOVE;
            G.actedThisRound[pid] = true;
            G.lastActions[pid] = '過牌';
            G.actionsThisRound++;
            advanceTurn(G, pid);
          },

          // 跟注
          call: ({ G, ctx, playerID }) => {
            const pid = playerID;
            if (G.phase === 'waiting' || G.phase === 'showdown') return INVALID_MOVE;
            if (pid !== G.activePlayer) return INVALID_MOVE;
            const diff = G.currentBet - (G.bets[pid] || 0);
            if (diff <= 0) return INVALID_MOVE;
            const actual = Math.min(diff, G.chips[pid]);
            G.chips[pid] -= actual;
            G.bets[pid] = (G.bets[pid] || 0) + actual;
            G.pot += actual;
            if (G.chips[pid] === 0) G.allIn[pid] = true;
            G.actedThisRound[pid] = true;
            G.lastActions[pid] = '跟注';
            G.actionsThisRound++;
            advanceTurn(G, pid);
          },

          // 加注
          raise: ({ G, ctx, playerID }, amount) => {
            const pid = playerID;
            if (G.phase === 'waiting' || G.phase === 'showdown') return INVALID_MOVE;
            if (pid !== G.activePlayer) return INVALID_MOVE;
            if (!amount || amount <= G.currentBet) return INVALID_MOVE;
            const diff = amount - (G.bets[pid] || 0);
            if (diff <= 0) return INVALID_MOVE;
            const actual = Math.min(diff, G.chips[pid]);
            G.chips[pid] -= actual;
            G.bets[pid] = (G.bets[pid] || 0) + actual;
            G.pot += actual;
            G.currentBet = Math.max(G.currentBet, G.bets[pid]);
            G.lastRaiser = pid;
            G.lastActions[pid] = '加注 $' + G.bets[pid];
            G.actionsThisRound++;
            if (G.chips[pid] === 0) G.allIn[pid] = true;
            for (const p of G.players) { if (p !== pid) G.actedThisRound[p] = false; }
            G.actedThisRound[pid] = true;
            advanceTurn(G, pid);
          },

          // 下一局（showdown 後任意玩家可觸發）
          nextHand: ({ G, ctx }) => {
            if (G.phase !== 'showdown') return INVALID_MOVE;

            G.handNumber++;
            G.deck = shuffleDeck(createDeck());
            G.community = [];
            G.pot = 0;
            G.currentBet = G.bigBlind;
            G.lastRaiser = null;
            G.winner = null;
            G.winnerHand = null;
            G.phase = 'preflop';
            G.actionsThisRound = 0;

            // 移除籌碼歸零的玩家
            G.players = G.players.filter(p => G.chips[p] > 0);

            for (const p of G.players) {
              G.bets[p] = 0;
              G.folded[p] = false;
              G.allIn[p] = false;
              G.hands[p] = [];
              G.actedThisRound[p] = false;
              G.lastActions[p] = '';
            }

            G.dealer = (G.dealer + 1) % G.players.length;
            dealHands(G);

            const sbIdx = G.dealer % G.players.length;
            const bbIdx = (G.dealer + 1) % G.players.length;
            const sbPid = G.players[sbIdx];
            const bbPid = G.players[bbIdx];

            const sbAmt = Math.min(G.smallBlind, G.chips[sbPid]);
            G.chips[sbPid] -= sbAmt; G.bets[sbPid] = sbAmt; G.pot += sbAmt;

            const bbAmt = Math.min(G.bigBlind, G.chips[bbPid]);
            G.chips[bbPid] -= bbAmt; G.bets[bbPid] = bbAmt; G.pot += bbAmt;

            G.lastActions[sbPid] = '小盲';
            G.lastActions[bbPid] = '大盲';

            const firstIdx = (G.dealer + 2) % G.players.length;
            G.activePlayer = G.players[firstIdx];
          },
        },
      },
    },
  },
};

module.exports = { PokerGame };
