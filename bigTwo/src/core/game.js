// 大老二局面状态机（纯逻辑，不碰画面）
// UI 透过 on(event, handler) 订阅，所有画面更新都由事件驱动

(function () {
  const C = window.BigTwoCards;

  class BigTwoGame {
    constructor(opts = {}) {
      this.difficulty = opts.difficulty || 'normal';
      this.handlers = {};
      this.reset();
    }

    on(evt, fn) {
      (this.handlers[evt] = this.handlers[evt] || []).push(fn);
      return this;
    }

    emit(evt, payload) {
      (this.handlers[evt] || []).forEach(fn => fn(payload));
    }

    reset() {
      this.hands = [[], [], [], []];
      this.turn = 0;
      this.last = null;        // { player, cards, ev }
      this.passCount = 0;
      this.phase = 'idle';     // idle | playing | over
      this.firstTrick = true;
      this.winner = -1;
    }

    start() {
      this.reset();
      this.hands = C.deal();
      // 持梅花3者先出
      this.turn = this.hands.findIndex(h => h.some(C.isClubThree));
      this.phase = 'playing';
      this.emit('start', { hands: this.hands, turn: this.turn });
      this.emit('turn', { player: this.turn });
    }

    // 本回合是否必须包含梅花3（仅开局第一手）
    mustIncludeCard() {
      if (!this.firstTrick) return null;
      const hand = this.hands[this.turn];
      return hand.find(C.isClubThree) || null;
    }

    // 目前这家是否为自由出牌（可出任意牌型）
    isFreeLead() {
      return this.last === null;
    }

    // 验证某玩家出牌是否合法，回传 { ok, ev, reason }
    validate(player, cards) {
      if (this.phase !== 'playing') return { ok: false, reason: '牌局尚未开始' };
      if (player !== this.turn) return { ok: false, reason: '还没轮到你' };
      const ev = C.evaluate(cards);
      if (!ev) return { ok: false, reason: '不是合法牌型' };

      const must = this.mustIncludeCard();
      if (must && !cards.some(c => c.id === must.id)) {
        return { ok: false, reason: '第一手必须包含 ♣3' };
      }
      if (!C.beats(ev, this.last ? this.last.ev : null)) {
        return { ok: false, reason: this.last ? '压不过上一手' : '不是合法牌型' };
      }
      return { ok: true, ev };
    }

    play(player, cards) {
      const check = this.validate(player, cards);
      if (!check.ok) {
        this.emit('invalid', { player, reason: check.reason });
        return false;
      }

      // 从手牌移除
      const ids = new Set(cards.map(c => c.id));
      this.hands[player] = this.hands[player].filter(c => !ids.has(c.id));

      this.last = { player, cards, ev: check.ev };
      this.passCount = 0;
      this.firstTrick = false;

      this.emit('play', {
        player, cards, ev: check.ev,
        name: C.comboName(check.ev),
        remaining: this.hands[player].length
      });

      if (this.hands[player].length === 0) {
        this.phase = 'over';
        this.winner = player;
        this.emit('over', { winner: player, hands: this.hands });
        return true;
      }

      this.advance();
      return true;
    }

    pass(player) {
      if (this.phase !== 'playing' || player !== this.turn) return false;
      if (this.isFreeLead()) {
        this.emit('invalid', { player, reason: '你是首家，必须出牌' });
        return false;
      }
      this.passCount++;
      this.emit('pass', { player });

      // 其余三家都 PASS → 上一手的人重新自由出牌
      if (this.passCount >= 3) {
        this.turn = this.last.player;
        this.last = null;
        this.passCount = 0;
        this.emit('trickEnd', { leader: this.turn });
        this.emit('turn', { player: this.turn });
        return true;
      }

      this.advance();
      return true;
    }

    advance() {
      this.turn = (this.turn + 1) % 4;
      this.emit('turn', { player: this.turn });
    }

    // 其他家最少剩几张（AI 判断是否该压制用）
    minOpponentCards(self) {
      let min = 99;
      this.hands.forEach((h, i) => {
        if (i !== self) min = Math.min(min, h.length);
      });
      return min;
    }

    // 取得目前这家所有可出的牌（玩家提示 / AI 共用）
    legalMoves(player) {
      return C.listLegalMoves(
        this.hands[player],
        player === this.turn ? (this.last ? this.last.ev : null) : null,
        player === this.turn ? this.mustIncludeCard() : null
      );
    }

    // 电脑决策
    aiMove(player) {
      return window.BigTwoAI.decide({
        hand: this.hands[player],
        last: this.last ? this.last.ev : null,
        mustInclude: this.mustIncludeCard(),
        oppMinCards: this.minOpponentCards(player),
        difficulty: this.difficulty
      });
    }

    // 结算（大陆计分）：回传每家明细物件
    //   剩牌 n 的基础倍率：n<8 ×1、8~9 ×2、10~12 ×3、13 ×4
    //   手上留 ♠2 → 再 ×2；「关门」(赢家最后一手打出 ♠2) → 其余家全部再 ×2
    //   （全副只有一张 ♠2，关门与留 ♠2 不会同时发生在同一家）
    settle() {
      const SPADE2 = 12 * 4 + 3;  // 黑桃2 的 id（rank 12、suit 3）
      const closed = !!(this.last && this.last.cards.some(c => c.id === SPADE2));
      return this.hands.map(h => {
        const n = h.length;
        if (n === 0) return { score: 0, n: 0, mult: 1, spade2: false, closed: false };
        const mult = n === 13 ? 4 : (n >= 10 ? 3 : (n >= 8 ? 2 : 1));
        const spade2 = h.some(c => c.id === SPADE2);
        let score = n * mult;
        if (spade2) score *= 2;
        if (closed) score *= 2;
        return { score, n, mult, spade2, closed };
      });
    }
  }

  window.BigTwoGame = BigTwoGame;
})();
