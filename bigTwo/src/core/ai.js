// 电脑玩家决策逻辑
// 原则：能收尾就收尾 → 有人快出完就压制 → 平常出最小可压的牌，且尽量不拆大牌型

(function () {
  const C = window.BigTwoCards;

  // 拆牌成本：出这手之后，手牌里原本成形的大牌型被破坏得多严重
  // 数字越大代表越舍不得出
  function breakCost(hand, cards) {
    const ids = new Set(cards.map(c => c.id));
    const rest = hand.filter(c => !ids.has(c.id));
    const before = countStructures(hand);
    const after = countStructures(rest);
    let cost = 0;
    cost += (before.four - after.four) * 8;      // 拆铁支代价最高
    cost += (before.triple - after.triple) * 3;
    cost += (before.pair - after.pair) * 1;
    return cost;
  }

  // 统计手牌中成形的对子/三条/铁支数量
  function countStructures(hand) {
    const m = new Map();
    hand.forEach(c => m.set(c.rank, (m.get(c.rank) || 0) + 1));
    let pair = 0, triple = 0, four = 0;
    m.forEach(n => {
      if (n === 4) four++;
      else if (n === 3) triple++;
      else if (n === 2) pair++;
    });
    return { pair, triple, four };
  }

  // 这手牌有多「珍贵」（越大越舍不得用掉）
  function moveWeight(move) {
    // 五张牌型本身带有分类权重，单张则直接看数值
    return move.ev.size * 10 + move.ev.cat * 20 + move.ev.key * 0.1;
  }

  // 难度参数
  const PROFILE = {
    easy:   { holdBig: 0.15, breakWeight: 0.5, pressure: 0 },
    normal: { holdBig: 0.35, breakWeight: 1.0, pressure: 2 },
    hard:   { holdBig: 0.55, breakWeight: 1.6, pressure: 4 }
  };

  // 主决策：回传要出的牌（阵列）或 null 代表 PASS
  // ctx = { hand, last, mustInclude, oppMinCards, difficulty }
  function decide(ctx) {
    const { hand, last, mustInclude } = ctx;
    const diff = PROFILE[ctx.difficulty] || PROFILE.normal;
    const moves = C.listLegalMoves(hand, last, mustInclude);
    if (moves.length === 0) return null;

    // 1) 这手出完就赢 → 直接出
    const finisher = moves.find(m => m.cards.length === hand.length);
    if (finisher) return finisher.cards;

    // 2) 首手（必含梅花3）不能 PASS，选最小的
    if (mustInclude) return moves[0].cards;

    // 3) 自由出牌：主动打出最小的一手，但避免拆散大牌型
    if (!last) {
      let best = null, bestScore = Infinity;
      moves.forEach(m => {
        // 自由出牌时倾向出短牌型（留著五张大牌收尾）
        const score = moveWeight(m) + breakCost(hand, m.cards) * diff.breakWeight;
        if (score < bestScore) { bestScore = score; best = m; }
      });
      return best.cards;
    }

    // 4) 跟牌：对手快出完时全力压制，否则出最小可压且不拆牌的一手
    const urgent = ctx.oppMinCards <= 2;
    if (urgent) {
      // 出最大的一手把牌权抢下来
      return moves[moves.length - 1].cards;
    }

    let best = null, bestScore = Infinity;
    moves.forEach(m => {
      const score = moveWeight(m) + breakCost(hand, m.cards) * diff.breakWeight;
      if (score < bestScore) { bestScore = score; best = m; }
    });

    // 5) 保留大牌：如果最划算的一手仍然很贵（例如只能用 2 或铁支去压），就 PASS
    const tooExpensive = bestScore > 30 + diff.pressure * 10;
    if (tooExpensive && Math.random() < diff.holdBig) return null;

    return best.cards;
  }

  window.BigTwoAI = { decide, countStructures };
})();
