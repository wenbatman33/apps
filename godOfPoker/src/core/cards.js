// 撲克牌核心：牌組、洗牌、牌型評估（7 取 5 最佳）
// 牌表示法：{ r: 2..14 (14=A), s: 0..3 (0♠ 1♥ 2♦ 3♣) }

const SUIT_CHARS = ['♠', '♥', '♦', '♣'];
const SUIT_RED = [false, true, true, false];
const RANK_CHARS = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

const HAND_NAMES = ['高牌', '一對', '兩對', '三條', '順子', '同花', '葫蘆', '四條', '同花順', '皇家同花順'];

function makeDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
  return d;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cardKey(c) { return c.r * 4 + c.s; }

// 評估 5 張牌 → 數值分數（越大越強），可直接比大小
// 編碼：cat * 15^5 + k1*15^4 + k2*15^3 + ...
function evaluate5(cs) {
  const rs = cs.map(c => c.r).sort((a, b) => b - a);
  const flush = cs.every(c => c.s === cs[0].s);
  // 順子判斷（A 可作 5432A 的低順）
  let straightHigh = 0;
  const uniq = [...new Set(rs)];
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straightHigh = 5; // A2345
  }
  // 相同點數統計
  const cnt = {};
  for (const r of rs) cnt[r] = (cnt[r] || 0) + 1;
  const groups = Object.entries(cnt)
    .map(([r, n]) => ({ r: +r, n }))
    .sort((a, b) => b.n - a.n || b.r - a.r);

  let cat, kick;
  if (flush && straightHigh) { cat = straightHigh === 14 ? 9 : 8; kick = [straightHigh]; }
  else if (groups[0].n === 4) { cat = 7; kick = [groups[0].r, groups[1].r]; }
  else if (groups[0].n === 3 && groups[1].n === 2) { cat = 6; kick = [groups[0].r, groups[1].r]; }
  else if (flush) { cat = 5; kick = rs; }
  else if (straightHigh) { cat = 4; kick = [straightHigh]; }
  else if (groups[0].n === 3) { cat = 3; kick = [groups[0].r, groups[1].r, groups[2].r]; }
  else if (groups[0].n === 2 && groups[1].n === 2) { cat = 2; kick = [groups[0].r, groups[1].r, groups[2].r]; }
  else if (groups[0].n === 2) { cat = 1; kick = [groups[0].r, groups[1].r, groups[2].r, groups[3].r]; }
  else { cat = 0; kick = rs; }

  let score = cat;
  for (let i = 0; i < 5; i++) score = score * 15 + (kick[i] || 0);
  return { score, cat };
}

// 7 張取 5 最佳（C(7,5)=21 組合）
const COMBOS_7C5 = (() => {
  const out = [];
  for (let a = 0; a < 7; a++)
    for (let b = a + 1; b < 7; b++) {
      const combo = [];
      for (let i = 0; i < 7; i++) if (i !== a && i !== b) combo.push(i);
      out.push(combo);
    }
  return out;
})();

function evaluate7(cards) {
  let best = null;
  for (const idxs of COMBOS_7C5) {
    const five = idxs.map(i => cards[i]);
    const ev = evaluate5(five);
    if (!best || ev.score > best.score) best = ev;
  }
  return { score: best.score, cat: best.cat, name: HAND_NAMES[best.cat] };
}

// 蒙地卡羅勝率估算：hole(2) + community(0~5) 對 nOpp 個未知對手
function estimateEquity(hole, community, nOpp, nSims) {
  const known = new Set([...hole, ...community].map(cardKey));
  const base = makeDeck().filter(c => !known.has(cardKey(c)));
  let win = 0, tie = 0;
  const needCommunity = 5 - community.length;
  for (let s = 0; s < nSims; s++) {
    // 部分洗牌：只抽需要的張數
    const deck = base.slice();
    const need = needCommunity + nOpp * 2;
    for (let i = 0; i < need; i++) {
      const j = i + ((Math.random() * (deck.length - i)) | 0);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const comm = community.concat(deck.slice(0, needCommunity));
    const mine = evaluate7(hole.concat(comm)).score;
    let best = -1, bestCount = 0;
    for (let o = 0; o < nOpp; o++) {
      const oppHole = deck.slice(needCommunity + o * 2, needCommunity + o * 2 + 2);
      const sc = evaluate7(oppHole.concat(comm)).score;
      if (sc > best) { best = sc; bestCount = 1; }
      else if (sc === best) bestCount++;
    }
    if (mine > best) win++;
    else if (mine === best) tie++;
  }
  return (win + tie * 0.5) / nSims;
}
