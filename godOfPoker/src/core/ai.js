// AI 決策：四種風格
// god    = 賭神（蒙地卡羅高精度 + 詐唬 + 慢打陷阱，最強）
// knight = 賭俠（賠率導向、穩健）
// rock   = 龍五（極緊：牌差就棄，牌強就狠）
// saint  = 賭聖（鬆散搞笑、愛跟注、偶爾亂加注，最弱）

const AI = {
  decide(game, idx) {
    const p = game.players[idx];
    const style = p.style || 'knight';
    const nOpp = game.inHandPlayers().length - 1;
    const sims = { god: 300, knight: 110, rock: 150, saint: 40 }[style];
    const eq = estimateEquity(p.hand, game.community, Math.max(1, nOpp), sims);

    const callCost = game.callAmount(idx);
    const pot = game.potTotal();
    const potOdds = callCost > 0 ? callCost / (pot + callCost) : 0;
    // 這次跟注佔身家比例（大注需更高勝率才跟，避免亂 all-in）
    const commit = callCost / Math.max(1, p.chips + callCost);
    const minRaiseTo = game.currentBet + game.minRaise;
    const maxTo = p.bet + p.chips; // all-in 上限（本輪總額）
    const rnd = Math.random();

    const raiseTo = (mult) => {
      let target = game.currentBet + Math.max(game.minRaise, Math.round(pot * mult));
      target = Math.max(minRaiseTo, target);
      target = Math.min(target, maxTo);
      target = Math.max(500, Math.round(target / 500) * 500);
      return Math.min(target, maxTo);
    };

    const ctx = { eq, callCost, potOdds, commit, rnd, raiseTo, game };
    if (style === 'god') return this._god(ctx);
    if (style === 'rock') return this._rock(ctx);
    if (style === 'saint') return this._saint(ctx);
    return this._knight(ctx);
  },

  // 賭神：精算 + 心理戰（詐唬與慢打只在人少時使用）
  _god({ eq, callCost, potOdds, commit, rnd, raiseTo, game }) {
    const few = game.inHandPlayers().length <= 3; // 人少才玩心理戰
    if (callCost === 0) {
      if (eq > 0.82) return (few && rnd < 0.3) ? { action: 'check' } : { action: 'raise', amount: raiseTo(0.8) }; // 慢打陷阱
      if (eq > 0.58) return rnd < 0.65 ? { action: 'raise', amount: raiseTo(0.55) } : { action: 'check' };
      if (eq > 0.42) return rnd < 0.25 ? { action: 'raise', amount: raiseTo(0.5) } : { action: 'check' };
      return (few && rnd < 0.12 && game.community.length >= 3) ? { action: 'raise', amount: raiseTo(0.55) } : { action: 'check' }; // 詐唬
    }
    if (commit > 0.4 && eq < 0.55) return { action: 'fold' }; // 大注需真材實料
    if (eq > 0.85) return (few && rnd < 0.25) ? { action: 'call' } : { action: 'raise', amount: raiseTo(0.9) }; // 偶爾埋伏
    if (eq > potOdds + 0.15) return rnd < 0.65 ? { action: 'raise', amount: raiseTo(0.7) } : { action: 'call' };
    if (eq > potOdds + 0.02) return { action: 'call' };
    if (eq > potOdds - 0.05 && rnd < 0.3) return { action: 'call' }; // 淺賠率防守
    if (few && rnd < 0.06 && commit < 0.15 && game.community.length >= 3) return { action: 'raise', amount: raiseTo(0.85) }; // 小注詐唬
    return { action: 'fold' };
  },

  // 賭俠：穩健賠率派
  _knight({ eq, callCost, potOdds, commit, rnd, raiseTo }) {
    if (callCost === 0) {
      if (eq > 0.72) return { action: 'raise', amount: raiseTo(0.6) };
      if (eq > 0.52 && rnd < 0.45) return { action: 'raise', amount: raiseTo(0.5) };
      return { action: 'check' };
    }
    if (commit > 0.4 && eq < 0.62) return { action: 'fold' };
    if (eq > potOdds + 0.25) return { action: 'raise', amount: raiseTo(0.55) };
    if (eq > potOdds + 0.03) return { action: 'call' };
    if (eq > potOdds - 0.03 && rnd < 0.2) return { action: 'call' };
    return { action: 'fold' };
  },

  // 龍五：極緊，垃圾牌不碰、強牌毫不手軟
  _rock({ eq, callCost, potOdds, commit, rnd, raiseTo }) {
    if (callCost === 0) {
      if (eq > 0.7) return { action: 'raise', amount: raiseTo(0.6) };
      return { action: 'check' };
    }
    if (commit > 0.35 && eq < 0.66) return { action: 'fold' };
    if (eq > potOdds + 0.22) return { action: 'raise', amount: raiseTo(0.6) };
    if (eq > potOdds + 0.1) return { action: 'call' };
    return { action: 'fold' };
  },

  // 賭聖：鬆散愛跟、隨性加注、太離譜才棄
  _saint({ eq, callCost, potOdds, commit, rnd, raiseTo }) {
    if (callCost === 0) {
      if (rnd < 0.18) return { action: 'raise', amount: raiseTo(0.4 + Math.random() * 0.5) };
      return { action: 'check' };
    }
    if (commit > 0.5 && eq < 0.5 && rnd < 0.75) return { action: 'fold' }; // 半數身家以上收斂點
    if (eq > 0.6 && rnd < 0.3) return { action: 'raise', amount: raiseTo(0.7) };
    if (eq < potOdds - 0.28 && rnd < 0.55) return { action: 'fold' };
    if (rnd < 0.08) return { action: 'raise', amount: raiseTo(0.5) };
    return { action: 'call' };
  },
};
