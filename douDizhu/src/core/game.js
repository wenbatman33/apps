// 鬥地主局面狀態機（純邏輯，不碰畫面）
// UI 透過 on(event, handler) 訂閱，所有畫面更新都由事件驅動
// 流程：deal → bidding（叫分 0~3）→ playing → over

(function () {
  const C = window.DdzCards;

  class DdzGame {
    constructor(opts = {}) {
      this.difficulty = opts.difficulty || 'normal';
      this.firstBidder = opts.firstBidder != null ? opts.firstBidder : 0;
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
      this.hands = [[], [], []];
      this.bottom = [];
      this.landlord = -1;
      this.bid = 0;             // 目前最高叫分
      this.bidWinner = -1;
      this.bidsDone = 0;        // 已叫分人數
      this.turn = 0;
      this.last = null;         // { player, cards, ev }
      this.passCount = 0;
      this.phase = 'idle';      // idle | bidding | playing | over
      this.winner = -1;         // 勝方任一玩家（地主 或 先出完的農民）
      this.mult = 1;            // 倍數（炸彈/王炸/春天翻倍）
      this.playsBy = [0, 0, 0]; // 各家出牌次數（判定春天用）
    }

    start() {
      this.reset();
      const d = C.deal();
      this.hands = d.hands;
      this.bottom = d.bottom;
      this.phase = 'bidding';
      this.turn = this.firstBidder;
      this.emit('start', { hands: this.hands, turn: this.turn });
      this.emit('bidTurn', { player: this.turn });
    }

    // 叫分：score 0=不叫、1~3 分，必須高於目前最高
    callBid(player, score) {
      if (this.phase !== 'bidding' || player !== this.turn) return false;
      if (score > 0 && score <= this.bid) return false;

      this.bidsDone++;
      if (score > this.bid) {
        this.bid = score;
        this.bidWinner = player;
      }
      this.emit('bid', { player, score });

      // 叫3分直接定地主；三家都表態後最高者當地主
      if (score === 3 || this.bidsDone >= 3) {
        if (this.bidWinner < 0) {
          // 全不叫 → 重新發牌
          this.emit('redeal', {});
          const d = C.deal();
          this.hands = d.hands;
          this.bottom = d.bottom;
          this.bid = 0;
          this.bidWinner = -1;
          this.bidsDone = 0;
          this.firstBidder = (this.firstBidder + 1) % 3;
          this.turn = this.firstBidder;
          this.emit('start', { hands: this.hands, turn: this.turn });
          this.emit('bidTurn', { player: this.turn });
          return true;
        }
        this.becomeLandlord(this.bidWinner);
        return true;
      }

      this.turn = (this.turn + 1) % 3;
      this.emit('bidTurn', { player: this.turn });
      return true;
    }

    becomeLandlord(player) {
      this.landlord = player;
      this.hands[player] = this.hands[player].concat(this.bottom);
      C.sortHand(this.hands[player]);
      this.phase = 'playing';
      this.turn = player;
      this.emit('landlord', { player, bottom: this.bottom, bid: this.bid });
      this.emit('turn', { player });
    }

    isFreeLead() {
      return this.last === null;
    }

    // player 是否與 other 同隊（兩個農民同隊）
    sameTeam(a, b) {
      return (a === this.landlord) === (b === this.landlord);
    }

    validate(player, cards) {
      if (this.phase !== 'playing') return { ok: false, reason: '牌局尚未開始' };
      if (player !== this.turn) return { ok: false, reason: '還沒輪到你' };
      const ev = C.evaluate(cards);
      if (!ev) return { ok: false, reason: '不是合法牌型' };
      if (!C.beats(ev, this.last ? this.last.ev : null)) {
        return { ok: false, reason: '壓不過上一手' };
      }
      return { ok: true, ev };
    }

    play(player, cards) {
      const check = this.validate(player, cards);
      if (!check.ok) {
        this.emit('invalid', { player, reason: check.reason });
        return false;
      }

      const ids = new Set(cards.map(c => c.id));
      this.hands[player] = this.hands[player].filter(c => !ids.has(c.id));
      this.last = { player, cards, ev: check.ev };
      this.passCount = 0;
      this.playsBy[player]++;

      // 炸彈 / 王炸 → 倍數翻倍
      if (C.isBomb(check.ev)) {
        this.mult *= 2;
        this.emit('bomb', { player, mult: this.mult });
      }

      this.emit('play', {
        player, cards, ev: check.ev,
        name: C.comboName(check.ev),
        remaining: this.hands[player].length
      });

      if (this.hands[player].length === 0) {
        this.phase = 'over';
        this.winner = player;
        // 春天：農民全程沒出過牌 → 地主春天；地主只出過那一手（首手）→ 農民反春
        const landlordWin = player === this.landlord;
        let spring = false;
        if (landlordWin) {
          spring = this.playsBy.every((n, i) => i === this.landlord || n === 0);
        } else {
          spring = this.playsBy[this.landlord] === 1;
        }
        if (spring) this.mult *= 2;
        this.emit('over', { winner: player, landlordWin, spring, mult: this.mult, hands: this.hands });
        return true;
      }

      this.advance();
      return true;
    }

    pass(player) {
      if (this.phase !== 'playing' || player !== this.turn) return false;
      if (this.isFreeLead()) {
        this.emit('invalid', { player, reason: '你是首家，必須出牌' });
        return false;
      }
      this.passCount++;
      this.emit('pass', { player });

      // 其餘兩家都不要 → 上一手的人重新自由出牌
      if (this.passCount >= 2) {
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
      this.turn = (this.turn + 1) % 3;
      this.emit('turn', { player: this.turn });
    }

    minOpponentCards(self) {
      let min = 99;
      this.hands.forEach((h, i) => {
        if (i !== self && !this.sameTeam(self, i)) min = Math.min(min, h.length);
      });
      return min;
    }

    legalMoves(player) {
      return C.listLegalMoves(
        this.hands[player],
        player === this.turn && this.last ? this.last.ev : null
      );
    }

    aiBid(player) {
      return window.DdzAI.decideBid({
        hand: this.hands[player],
        currentBid: this.bid,
        difficulty: this.difficulty
      });
    }

    aiMove(player) {
      return window.DdzAI.decide({
        hand: this.hands[player],
        last: this.last ? this.last.ev : null,
        lastPlayer: this.last ? this.last.player : -1,
        self: player,
        landlord: this.landlord,
        hands: this.hands,
        oppMinCards: this.minOpponentCards(player),
        difficulty: this.difficulty
      });
    }

    // 結算：底分 = 叫分 ×10，輸贏 = 底分 × 倍數；地主對兩個農民各結一份
    settle() {
      const pts = this.bid * 10 * this.mult;
      const landlordWin = this.winner === this.landlord;
      return { pts, landlordWin, landlord: this.landlord, bid: this.bid, mult: this.mult };
    }
  }

  window.DdzGame = DdzGame;
})();
