// 電腦玩家決策邏輯（叫分 + 出牌）
// 出牌原則：能收尾就收尾 → 對手快出完就壓制 → 農民不壓隊友的大牌 → 平常出最小可壓且不拆牌

(function () {
  const C = window.DdzCards;

  // ---------- 叫分 ----------
  // 手牌強度：王炸 / 炸彈 / 2 / 王 / A 越多越敢叫
  function handStrength(hand) {
    const counts = C.countRanks(hand);
    let s = 0;
    const hasSJ = counts.has(C.RANK_SJ), hasBJ = counts.has(C.RANK_BJ);
    if (hasSJ && hasBJ) s += 7;
    else if (hasBJ) s += 3;
    else if (hasSJ) s += 2;
    counts.forEach((n, r) => {
      if (r <= C.RANK_2 && n === 4) s += 6;                 // 炸彈
      if (r === C.RANK_2) s += n * 2;                        // 每張 2
      if (r === 11) s += n;                                  // 每張 A
      if (n === 3) s += 1;                                   // 三條略加分
    });
    return s;
  }

  const BID_PROFILE = {
    easy:   { t1: 7, t2: 11, t3: 15 },
    normal: { t1: 6, t2: 10, t3: 14 },
    hard:   { t1: 5, t2: 9,  t3: 13 }
  };

  // 回傳 0~3；必須高於 currentBid 才有意義，否則回 0（不叫）
  function decideBid(ctx) {
    const p = BID_PROFILE[ctx.difficulty] || BID_PROFILE.normal;
    const s = handStrength(ctx.hand);
    let want = 0;
    if (s >= p.t3) want = 3;
    else if (s >= p.t2) want = 2;
    else if (s >= p.t1) want = 1;
    return want > ctx.currentBid ? want : 0;
  }

  // ---------- 出牌 ----------

  // 拆牌成本：出這手之後，手牌裡原本成形的結構被破壞得多嚴重
  function breakCost(hand, cards) {
    const ids = new Set(cards.map(c => c.id));
    const rest = hand.filter(c => !ids.has(c.id));
    const before = countStructures(hand);
    const after = countStructures(rest);
    let cost = 0;
    cost += (before.four - after.four) * 8;      // 拆炸彈代價最高
    cost += (before.rocket - after.rocket) * 10; // 拆王炸更捨不得
    cost += (before.triple - after.triple) * 3;
    cost += (before.pair - after.pair) * 1;
    return cost;
  }

  function countStructures(hand) {
    const m = C.countRanks(hand);
    let pair = 0, triple = 0, four = 0;
    m.forEach((n, r) => {
      if (r > C.RANK_2) return;
      if (n === 4) four++;
      else if (n === 3) triple++;
      else if (n === 2) pair++;
    });
    const rocket = (m.has(C.RANK_SJ) && m.has(C.RANK_BJ)) ? 1 : 0;
    return { pair, triple, four, rocket };
  }

  // 這手牌有多「珍貴」（越大越捨不得用掉）
  function moveWeight(move) {
    const bombBonus = move.ev.type === 'rocket' ? 400 : (move.ev.type === 'bomb' ? 200 : 0);
    return bombBonus + move.ev.key * 3 + move.ev.size;
  }

  const PROFILE = {
    easy:   { holdBig: 0.15, breakWeight: 0.5, pressure: 0 },
    normal: { holdBig: 0.35, breakWeight: 1.0, pressure: 2 },
    hard:   { holdBig: 0.55, breakWeight: 1.6, pressure: 4 }
  };

  // 主決策：回傳要出的牌（陣列）或 null 代表不要
  // ctx = { hand, last, lastPlayer, self, landlord, hands, oppMinCards, difficulty }
  function decide(ctx) {
    const { hand, last } = ctx;
    const diff = PROFILE[ctx.difficulty] || PROFILE.normal;
    const moves = C.listLegalMoves(hand, last);
    if (moves.length === 0) return null;

    const isFarmer = ctx.self !== ctx.landlord;
    const teammate = isFarmer ? [0, 1, 2].find(i => i !== ctx.self && i !== ctx.landlord) : -1;

    // 1) 這手出完就贏 → 直接出
    const finisher = moves.find(m => m.cards.length === hand.length);
    if (finisher) return finisher.cards;

    // 2) 自由出牌：主動打出最小的一手，但避免拆散大牌型
    if (!last) {
      let best = null, bestScore = Infinity;
      moves.forEach(m => {
        if (C.isBomb(m.ev)) return;   // 自由出牌不主動丟炸彈
        const score = moveWeight(m) + breakCost(hand, m.cards) * diff.breakWeight
          - m.cards.length * 2;       // 傾向一次多出幾張，快速減手牌
        if (score < bestScore) { bestScore = score; best = m; }
      });
      if (best) return best.cards;
      return moves[0].cards;
    }

    // 3) 農民合作：隊友出的牌且地主已不要 → 讓隊友繼續走，不互壓
    //    （只有在隊友的牌已經夠大、或自己壓上去要花大代價時讓牌）
    if (isFarmer && ctx.lastPlayer === teammate) {
      const mateBig = last.key >= 10;   // K 以上算大
      const mateFew = ctx.hands[teammate].length <= 4;
      if (mateBig || mateFew) return null;
    }

    // 4) 壓制：對頭快出完（地主視角=農民、農民視角=地主）→ 全力壓
    const urgent = ctx.oppMinCards <= 2;
    if (urgent) {
      // 先試最大的非炸彈，不夠再上炸彈
      const normal = moves.filter(m => !C.isBomb(m.ev));
      if (normal.length) return normal[normal.length - 1].cards;
      return moves[moves.length - 1].cards;
    }

    // 5) 跟牌：出最小可壓且不拆牌的一手
    let best = null, bestScore = Infinity;
    moves.forEach(m => {
      const score = moveWeight(m) + breakCost(hand, m.cards) * diff.breakWeight;
      if (score < bestScore) { bestScore = score; best = m; }
    });

    // 6) 保留大牌：最划算的一手仍然很貴（要動用 2 / 王 / 炸彈）就考慮不要
    //    地主壓農民時稍微更積極一點
    const threshold = 34 + diff.pressure * 10 + (isFarmer ? 0 : 8);
    if (bestScore > threshold && Math.random() < diff.holdBig) return null;

    return best.cards;
  }

  window.DdzAI = { decide, decideBid, handStrength, countStructures };
})();
