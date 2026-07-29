// 德州撲克遊戲引擎（4 人桌、盲注、邊池、狀態機）
// 使用方式：engine = new HoldemGame(players); events = engine.startHand(); events = engine.act(action, amount)
// 事件由 GameScene 逐一動畫呈現

class HoldemGame {
  constructor(playerDefs) {
    // playerDefs: [{id, name, level(0=人類,1~3=AI強度)}]
    this.players = playerDefs.map((p, i) => ({
      idx: i,
      id: p.id,
      name: p.name,
      level: p.level,
      style: p.style,
      chips: RULES.startChips,
      hand: [],
      folded: false,
      allIn: false,
      out: false,          // 已淘汰
      bet: 0,              // 本輪已下注
      paidTotal: 0,        // 本手總投入（算邊池用）
      needAction: false,
    }));
    this.dealerIdx = -1;
    this.handCount = 0;
    this.stage = 'idle'; // idle | preflop | flop | turn | river | showdown | over
    this.community = [];
    this.deck = [];
    this.currentBet = 0;
    this.minRaise = RULES.bigBlind;
    this.actorIdx = -1;
  }

  alivePlayers() { return this.players.filter(p => !p.out); }

  nextAlive(from) {
    const n = this.players.length;
    for (let d = 1; d <= n; d++) {
      const i = (from + d) % n;
      if (!this.players[i].out) return i;
    }
    return -1;
  }

  // 下一位還需要行動的人（未棄牌、未 all-in、needAction）
  nextActor(from) {
    const n = this.players.length;
    for (let d = 1; d <= n; d++) {
      const i = (from + d) % n;
      const p = this.players[i];
      if (!p.out && !p.folded && !p.allIn && p.needAction) return i;
    }
    return -1;
  }

  inHandPlayers() { return this.players.filter(p => !p.out && !p.folded); }

  potTotal() { return this.players.reduce((s, p) => s + p.paidTotal, 0); }

  // ===== 開新一手 =====
  startHand() {
    if (this.stage !== 'idle') return []; // 防重入：非閒置狀態不可開新局
    const ev = [];
    const alive = this.alivePlayers();
    if (alive.length < 2) { this.stage = 'over'; return [{ type: 'gameOver' }]; }

    this.handCount++;
    this.deck = shuffle(makeDeck());
    this.community = [];
    for (const p of this.players) {
      p.hand = []; p.folded = p.out; p.allIn = false;
      p.bet = 0; p.paidTotal = 0; p.needAction = !p.out;
    }
    this.dealerIdx = this.nextAlive(this.dealerIdx < 0 ? this.players.length - 1 : this.dealerIdx);

    // 盲注（兩人單挑時莊家=小盲）
    const headsUp = alive.length === 2;
    const sbIdx = headsUp ? this.dealerIdx : this.nextAlive(this.dealerIdx);
    const bbIdx = this.nextAlive(sbIdx);
    ev.push({ type: 'handStart', hand: this.handCount, dealerIdx: this.dealerIdx });
    this._pay(sbIdx, Math.min(RULES.smallBlind, this.players[sbIdx].chips));
    ev.push({ type: 'blind', idx: sbIdx, amount: this.players[sbIdx].bet, blind: 'SB' });
    this._pay(bbIdx, Math.min(RULES.bigBlind, this.players[bbIdx].chips));
    ev.push({ type: 'blind', idx: bbIdx, amount: this.players[bbIdx].bet, blind: 'BB' });

    this.currentBet = RULES.bigBlind;
    this.minRaise = RULES.bigBlind;

    // 發手牌（兩張）
    for (let round = 0; round < 2; round++) {
      let i = this.nextAlive(this.dealerIdx);
      for (let k = 0; k < alive.length; k++) {
        this.players[i].hand.push(this.deck.pop());
        i = this.nextAlive(i);
      }
    }
    ev.push({ type: 'dealHole' });

    this.stage = 'preflop';
    this.actorIdx = this.nextActor(bbIdx);
    // 大盲仍有選擇權（別人只跟注時）
    if (this.actorIdx === -1) return ev.concat(this._advanceStreet());
    ev.push({ type: 'turnTo', idx: this.actorIdx });
    return ev;
  }

  _pay(idx, amount) {
    const p = this.players[idx];
    const real = Math.min(amount, p.chips);
    p.chips -= real; p.bet += real; p.paidTotal += real;
    if (p.chips === 0) p.allIn = true;
    return real;
  }

  callAmount(idx) {
    const p = this.players[idx];
    return Math.min(this.currentBet - p.bet, p.chips);
  }

  // ===== 玩家/AI 行動 =====
  // action: 'fold' | 'check' | 'call' | 'raise'（amount = 本輪加注到的總額）
  act(action, amount = 0) {
    const ev = [];
    const idx = this.actorIdx;
    const p = this.players[idx];
    p.needAction = false;

    if (action === 'fold') {
      p.folded = true;
      ev.push({ type: 'action', idx, action: 'fold' });
    } else if (action === 'check') {
      ev.push({ type: 'action', idx, action: 'check' });
    } else if (action === 'call') {
      const paid = this._pay(idx, this.currentBet - p.bet);
      ev.push({ type: 'action', idx, action: 'call', amount: paid, allIn: p.allIn });
    } else if (action === 'raise') {
      // amount = 加注到的本輪總額
      const target = Math.min(amount, p.bet + p.chips);
      const raiseBy = target - this.currentBet;
      this._pay(idx, target - p.bet);
      if (target > this.currentBet) {
        if (raiseBy >= this.minRaise) this.minRaise = raiseBy;
        this.currentBet = target;
        // 其他人需要重新行動
        for (const q of this.players)
          if (q.idx !== idx && !q.out && !q.folded && !q.allIn) q.needAction = true;
      }
      ev.push({ type: 'action', idx, action: 'raise', amount: target, allIn: p.allIn });
    }

    // 只剩一人未棄牌 → 直接贏
    const inHand = this.inHandPlayers();
    if (inHand.length === 1) {
      return ev.concat(this._awardUncontested(inHand[0]));
    }

    const next = this.nextActor(idx);
    if (next === -1) return ev.concat(this._advanceStreet());
    this.actorIdx = next;
    ev.push({ type: 'turnTo', idx: next });
    return ev;
  }

  // ===== 進入下一街 =====
  _advanceStreet() {
    const ev = [];
    // 本輪下注歸零
    for (const p of this.players) { p.bet = 0; p.needAction = !p.out && !p.folded && !p.allIn; }
    this.currentBet = 0;
    this.minRaise = RULES.bigBlind;

    const canAct = this.players.filter(p => !p.out && !p.folded && !p.allIn);
    const fastForward = canAct.length <= 1; // 全 all-in（或僅一人有籌碼）→ 直接開完剩下的牌

    const dealNext = () => {
      if (this.stage === 'preflop') {
        this.community.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
        this.stage = 'flop';
        ev.push({ type: 'street', stage: 'flop', cards: this.community.slice() });
      } else if (this.stage === 'flop') {
        this.community.push(this.deck.pop());
        this.stage = 'turn';
        ev.push({ type: 'street', stage: 'turn', cards: this.community.slice() });
      } else if (this.stage === 'turn') {
        this.community.push(this.deck.pop());
        this.stage = 'river';
        ev.push({ type: 'street', stage: 'river', cards: this.community.slice() });
      } else {
        return false; // river 結束 → 攤牌
      }
      return true;
    };

    if (fastForward) {
      while (dealNext()) { /* 連續開牌到河牌 */ }
      return ev.concat(this._showdown());
    }

    if (!dealNext()) return ev.concat(this._showdown());

    this.actorIdx = this.nextActor(this.dealerIdx);
    if (this.actorIdx === -1) return ev.concat(this._advanceStreet());
    ev.push({ type: 'turnTo', idx: this.actorIdx });
    return ev;
  }

  // ===== 無人跟注直接獲勝 =====
  _awardUncontested(winner) {
    const ev = [];
    const pot = this.potTotal();
    winner.chips += pot;
    ev.push({ type: 'winUncontested', idx: winner.idx, pot });
    return ev.concat(this._endHand());
  }

  // ===== 攤牌與邊池分配 =====
  _showdown() {
    const ev = [];
    this.stage = 'showdown';
    const contenders = this.inHandPlayers();
    const results = contenders.map(p => ({
      idx: p.idx,
      hand: p.hand.slice(),
      ...evaluate7(p.hand.concat(this.community)),
    }));
    ev.push({ type: 'showdown', results });

    // 邊池計算：依投入額分層
    const levels = [...new Set(this.players.filter(p => p.paidTotal > 0).map(p => p.paidTotal))].sort((a, b) => a - b);
    let prev = 0;
    const potAwards = []; // {amount, winners:[idx]}
    for (const lv of levels) {
      let slice = 0;
      for (const p of this.players) slice += Math.max(0, Math.min(p.paidTotal, lv) - prev);
      const eligible = results.filter(r => this.players[r.idx].paidTotal >= lv);
      if (slice > 0 && eligible.length > 0) {
        const bestScore = Math.max(...eligible.map(r => r.score));
        const winners = eligible.filter(r => r.score === bestScore).map(r => r.idx);
        const share = Math.floor(slice / winners.length);
        let remainder = slice - share * winners.length;
        for (const w of winners) {
          const give = share + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;
          this.players[w].chips += give;
        }
        potAwards.push({ amount: slice, winners });
      }
      prev = lv;
    }
    ev.push({ type: 'payout', pots: potAwards, results });
    return ev.concat(this._endHand());
  }

  // ===== 一手結束：淘汰檢查 =====
  _endHand() {
    const ev = [];
    for (const p of this.players) {
      if (!p.out && p.chips <= 0) {
        p.out = true;
        ev.push({ type: 'eliminated', idx: p.idx });
      }
    }
    const alive = this.alivePlayers();
    const human = this.players[0];
    if (human.out || alive.length === 1) {
      this.stage = 'over';
      ev.push({ type: 'gameOver', winnerIdx: alive.length === 1 ? alive[0].idx : -1, humanOut: human.out });
    } else {
      this.stage = 'idle';
      ev.push({ type: 'handEnd' });
    }
    return ev;
  }
}
