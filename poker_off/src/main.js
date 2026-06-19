// ===========================================================================
// Offsuit · 德州撲克 — Phaser 3 UI（PC / Mobile 自適應）
// 極簡黑底風格，參照 offsuit.mp4 編排
// ===========================================================================
// 包進 IIFE，避免與 engine.js 的全域名稱（PokerGame 等）衝突
(function () {
// 從全域取用引擎（非 module，雙擊 file:// 也能跑）
const { PokerGame, aiDecide, evaluate7, handName, rankLabel, SUIT_SYMBOL, RED_SUITS } = window.Engine;

// ---- 邏輯解析度（直式手機比例；PC 以 FIT 置中放大）-----------------------
const W = 440, H = 920;

// ---- 配色 ----------------------------------------------------------------
const COLOR = {
  bg: 0x000000,
  card: 0xffffff,
  cardInk: '#0b0b0c',
  red: '#e23b3b',
  back: 0xf4f4f6,
  backLine: 0xcfcfd6,
  textDim: '#7c7c83',
  textMid: '#b9b9c0',
  white: '#ffffff',
  gold: '#e8d44d',
  green: 0x34c759,
  btnBorder: 0x303036,
  pillBg: 0x2a2616,
};
const FONT = '-apple-system, "SF Pro Display", "Inter", system-ui, "PingFang TC", sans-serif';

// ---- 可微調 LAYOUT（DEV 工具會改這裡；export 後 baked 回來）---------------
const LAYOUT = {
  seatY: 188,            // 對手座位列 Y
  seatGap: 84,           // 座位水平間距（5 座位置中）
  seatAvatar: 27,        // 頭像半徑
  seatStartX: 52,        // 第一個座位 X
  communityY: 452,       // 公共牌中心 Y
  communityGap: 4,       // 公共牌間距
  cardW: 60, cardH: 84,  // 公共牌尺寸
  potY: 524,             // 底池數字 Y
  actionY: 648,          // 動作按鈕列 Y
  holeY: 800,            // 底牌中心 Y
  holeX: 92,             // 底牌左側 X
  holeCardW: 84, holeCardH: 112,
  panelX: 318, panelY: 800, panelW: 188, panelH: 124, // 右下手牌面板
  titleY: 96,            // 返回鍵 / 標題 Y
};

// ---- 對手名單池 ----------------------------------------------------------
const BOT_POOL = [
  { name: 'han', emoji: '🧑' },
  { name: 'kakarot', emoji: '💀' },
  { name: 'frog', emoji: '🐸' },
  { name: 'neo', emoji: '🤖' },
  { name: 'luna', emoji: '🐱' },
  { name: 'rex', emoji: '🦖' },
];
const START_STACK = 2000;

// ===========================================================================
class Card {
  constructor(scene, w, h) {
    this.scene = scene;
    this.w = w; this.h = h;
    this.c = scene.add.container(0, 0);
    this.faceUp = false;
    this.card = null;

    this.bg = scene.add.graphics();
    this.c.add(this.bg);
    this.rankT = scene.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: `${Math.round(h * 0.28)}px`, fontStyle: '700', color: COLOR.cardInk,
    }).setOrigin(0, 0);
    this.suitT = scene.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: `${Math.round(h * 0.26)}px`, color: COLOR.cardInk,
    }).setOrigin(0, 1);
    this.c.add(this.rankT); this.c.add(this.suitT);
    this.showBack();
  }
  drawRound(g, fill) {
    g.clear();
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, Math.round(this.w * 0.16));
  }
  setFace(rank, suit) {
    this.rank = rank; this.suit = suit;
  }
  showFace() {
    this.faceUp = true;
    const g = this.bg;
    this.drawRound(g, COLOR.card);
    const red = RED_SUITS[this.suit];
    const col = red ? COLOR.red : COLOR.cardInk;
    const pad = this.w * 0.14;
    this.rankT.setText(rankLabel(this.rank)).setColor(col).setVisible(true)
      .setPosition(-this.w / 2 + pad, -this.h / 2 + pad * 0.7);
    this.suitT.setText(SUIT_SYMBOL[this.suit]).setColor(col).setVisible(true)
      .setPosition(-this.w / 2 + pad, this.h / 2 - pad * 0.7);
  }
  showBack() {
    this.faceUp = false;
    this.drawHatch();
    this.rankT.setVisible(false); this.suitT.setVisible(false);
  }
  drawHatch() {
    // 乾淨淺色卡背：圓角填色 + 細斜紋（縮在內框，不依賴遮罩）
    const g = this.bg;
    const r = Math.round(this.w * 0.16);
    this.drawRound(g, COLOR.back);
    const inset = Math.max(5, r * 0.55);
    const x0 = -this.w / 2 + inset, x1 = this.w / 2 - inset;
    const y0 = -this.h / 2 + inset, y1 = this.h / 2 - inset;
    const bw = x1 - x0, bh = y1 - y0;
    g.lineStyle(2, COLOR.backLine, 1);
    g.beginPath();
    for (let d = 0; d <= bw + bh; d += 8) {
      // 斜線 (45°) 與內矩形求交，裁進框內
      let ax = x0 + d, ay = y0;
      if (ax > x1) { ay = y0 + (ax - x1); ax = x1; }
      let bx = x0, by = y0 + d;
      if (by > y1) { bx = x0 + (by - y1); by = y1; }
      if (ay <= y1 && bx <= x1) { g.moveTo(ax, ay); g.lineTo(bx, by); }
    }
    g.strokePath();
    // 內框
    g.lineStyle(1.5, COLOR.backLine, 0.6);
    g.strokeRoundedRect(-this.w / 2 + 3, -this.h / 2 + 3, this.w - 6, this.h - 6, r - 2);
  }
  flipToFace(delay = 0, dur = 260) {
    return new Promise(res => {
      this.scene.tweens.add({
        targets: this.c, scaleX: 0, duration: dur / 2, delay, ease: 'Quad.easeIn',
        onComplete: () => {
          this.showFace();
          this.scene.tweens.add({ targets: this.c, scaleX: 1, duration: dur / 2, ease: 'Quad.easeOut', onComplete: res });
        },
      });
    });
  }
  setPos(x, y) { this.c.setPosition(x, y); return this; }
  destroy() { this.c.destroy(); }
}

// ===========================================================================
class Table extends Phaser.Scene {
  constructor() { super('Table'); }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    this.layers = {
      bg: this.add.container(0, 0),
      seats: this.add.container(0, 0),
      community: this.add.container(0, 0),
      pot: this.add.container(0, 0),
      hole: this.add.container(0, 0),
      panel: this.add.container(0, 0),
      action: this.add.container(0, 0),
      fx: this.add.container(0, 0),
    };
    this.seatViews = [];
    this.communityCards = [];
    this.holeCards = [];

    this.buildStatic();
    this.setupDev();

    // 初始：你 + 5 個 bot（上方 5 人模式）
    this.numBots = 5;
    this.newGame();
  }

  // ---- 靜態元件 ----------------------------------------------------------
  buildStatic() {
    // 返回鍵（重新開局）
    this.backBtn = this.add.text(20, LAYOUT.titleY, '‹', {
      fontFamily: FONT, fontSize: '34px', color: COLOR.textMid,
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    this.backBtn.on('pointerdown', () => this.confirmNewGame());
    this.layers.bg.add(this.backBtn);

    this.title = this.add.text(W / 2, LAYOUT.titleY, 'OFFSUIT', {
      fontFamily: FONT, fontSize: '13px', fontStyle: '700', color: COLOR.textDim,
    }).setOrigin(0.5).setAlpha(0.8);
    this.layers.bg.add(this.title);

    // 靜音切換（右上角）
    this.muteBtn = this.add.text(W - 22, LAYOUT.titleY, '🔊', { fontSize: '20px' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', () => {
      const m = window.SFX ? window.SFX.toggle() : true;
      this.muteBtn.setText(m ? '🔇' : '🔊').setAlpha(m ? 0.5 : 1);
    });
    this.layers.bg.add(this.muteBtn);

    // 底池數字
    this.potText = this.add.text(W - 26, LAYOUT.potY, '0', {
      fontFamily: FONT, fontSize: '30px', fontStyle: '700', color: COLOR.white,
    }).setOrigin(1, 0.5);
    this.layers.pot.add(this.potText);

    // 你的手牌面板（右下）
    const p = LAYOUT;
    this.panelBg = this.add.graphics();
    this.layers.panel.add(this.panelBg);
    this.handNameText = this.add.text(p.panelX, p.panelY - p.panelH / 2 + 22, '', {
      fontFamily: FONT, fontSize: '13px', color: COLOR.textDim,
    }).setOrigin(0.5);
    this.handEmoji = this.add.text(p.panelX, p.panelY + 2, '🐸', { fontSize: '34px' }).setOrigin(0.5);
    this.youStackText = this.add.text(p.panelX, p.panelY + p.panelH / 2 - 22, '0', {
      fontFamily: FONT, fontSize: '20px', fontStyle: '700', color: COLOR.white,
    }).setOrigin(0.5);
    this.layers.panel.add(this.handNameText);
    this.layers.panel.add(this.handEmoji);
    this.layers.panel.add(this.youStackText);
    this.drawPanel();

    // 動作按鈕（3 顆：左 / 中 / 加注▲）
    this.btns = {
      left: this.makeButton(0, 0, 132, 'Check', () => this.onLeftBtn()),
      mid: this.makeButton(0, 0, 132, 'Bet', () => this.onMidBtn()),
      raise: this.makeButton(0, 0, 50, '↑', () => this.toggleRaise()),
    };
    // 整列訊息按鈕（等待 / 結算）
    this.statusBtn = this.makeButton(0, 0, 300, 'Wait for the next hand', () => this.onStatusBtn());
    this.statusBtn.setVisible(false);

    this.layoutActionButtons();

    // 加注滑桿（預設隱藏）
    this.buildRaiseSlider();

    // 往上推底牌 = 棄牌 的手勢
    this.setupHoleDrag();

    // 手勢提示（輪到你時顯示）
    this.foldHint = this.add.text(LAYOUT.holeX + LAYOUT.holeCardW / 2 + 3, LAYOUT.holeY - LAYOUT.holeCardH / 2 - 16,
      '往上推 = 蓋牌', { fontFamily: FONT, fontSize: '11px', color: COLOR.textDim }).setOrigin(0.5).setAlpha(0);
    this.layers.hole.add(this.foldHint);
  }

  // 拖曳底牌往上超過門檻即 fold
  setupHoleDrag() {
    const w = LAYOUT.holeCardW * 2 + 6, h = LAYOUT.holeCardH + 20;
    const cx = LAYOUT.holeX + LAYOUT.holeCardW / 2 + 3;
    this.holeZone = this.add.zone(cx, LAYOUT.holeY, w, h).setOrigin(0.5)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(this.holeZone);
    const FOLD_DIST = 80;

    this.holeZone.on('dragstart', (pointer) => {
      if (!this.humanTurn) { this._dragging = false; return; }
      this._dragging = true; this._dragStartY = pointer.y;
    });
    this.holeZone.on('drag', (pointer) => {
      if (!this._dragging) return;
      const off = Math.min(0, pointer.y - this._dragStartY);   // 只取往上
      this.holeCards.forEach(c => {
        c.c.y = c.baseY + off;
        c.c.rotation = off * 0.0006;
        c.c.alpha = Phaser.Math.Clamp(1 + off / 260, 0.35, 1);
      });
      // 接近門檻時提示變亮
      const near = -off >= FOLD_DIST;
      this.foldHint.setText(near ? '放開棄牌' : '往上推 = 蓋牌')
        .setColor(near ? COLOR.gold : COLOR.textDim).setAlpha(1);
    });
    this.holeZone.on('dragend', (pointer) => {
      if (!this._dragging) return;
      this._dragging = false;
      const off = Math.min(0, pointer.y - this._dragStartY);
      if (-off >= FOLD_DIST && this.humanTurn) this.foldByGesture();
      else this.snapHoleBack();
    });
  }

  snapHoleBack() {
    this.holeCards.forEach(c => {
      this.tweens.add({ targets: c.c, y: c.baseY, rotation: 0, alpha: 1, duration: 180, ease: 'Quad.easeOut' });
    });
    if (this.humanTurn) this.foldHint.setAlpha(1).setColor(COLOR.textDim).setText('往上推 = 蓋牌');
  }

  foldByGesture() {
    const g = this.game_;
    const ps = g.street, pc = g.community.length;
    this.humanTurn = false;
    this.foldHint.setAlpha(0);
    window.SFX?.fold();
    // 牌往上飛出淡出
    this.holeCards.forEach((c, i) => {
      this.tweens.add({
        targets: c.c, y: c.baseY - 220, alpha: 0, rotation: (i ? 0.12 : -0.12),
        duration: 280, ease: 'Quad.easeIn',
      });
    });
    g.act('fold');
    this.hideRaise();
    this.afterAction(ps, pc);
  }

  drawPanel() {
    const p = LAYOUT;
    this.panelBg.clear();
    this.panelBg.lineStyle(1.5, COLOR.btnBorder, 1);
    this.panelBg.strokeRoundedRect(p.panelX - p.panelW / 2, p.panelY - p.panelH / 2, p.panelW, p.panelH, 16);
  }

  makeButton(x, y, w, label, cb) {
    const h = 50;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const t = this.add.text(0, 0, label, {
      fontFamily: FONT, fontSize: '16px', fontStyle: '500', color: COLOR.white,
    }).setOrigin(0.5);
    c.add(g); c.add(t);
    c.bg = g; c.label = t; c.w = w; c.h = h; c.enabled = true;
    const redraw = () => {
      g.clear();
      g.lineStyle(1.5, COLOR.btnBorder, c.enabled ? 1 : 0.5);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    };
    c.redraw = (nw) => { if (nw) { w = nw; c.w = nw; } redraw(); };
    redraw();
    c.setSize(w, h);
    c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => { if (c.enabled) { window.SFX?.click(); this.tweens.add({ targets: c, scale: 0.95, duration: 70, yoyo: true }); cb(); } });
    c.setLabel = (s) => t.setText(s);
    c.setEnabled = (on) => { c.enabled = on; t.setAlpha(on ? 1 : 0.35); redraw(); };
    this.layers.action.add(c);
    return c;
  }

  layoutActionButtons() {
    const y = LAYOUT.actionY;
    const gap = 8;
    const lw = this.btns.left.w, mw = this.btns.mid.w, rw = this.btns.raise.w;
    const total = lw + mw + rw + gap * 2;
    let x = W / 2 - total / 2;
    this.btns.left.setPosition(x + lw / 2, y); x += lw + gap;
    this.btns.mid.setPosition(x + mw / 2, y); x += mw + gap;
    this.btns.raise.setPosition(x + rw / 2, y);
    this.statusBtn.setPosition(W / 2, y);
  }

  // ---- 新局 --------------------------------------------------------------
  confirmNewGame() {
    this.numBots = 5;
    this.newGame();
  }

  newGame() {
    const players = [{ id: 'you', name: 'You', emoji: '🙂', stack: START_STACK, isHuman: true }];
    for (let i = 0; i < this.numBots; i++) {
      const b = BOT_POOL[i];
      players.push({ id: 'b' + i, name: b.name, emoji: b.emoji, stack: START_STACK });
    }
    this.game_ = new PokerGame(players, { smallBlind: 8, bigBlind: 16 });
    this.busy = false;
    this.rebuildSeats();
    this.startHand();
  }

  // 對手座位（不含 you；上方 5 個座位 + 「+」空位）
  rebuildSeats() {
    this.seatViews.forEach(s => s.c.destroy());
    this.seatViews = [];
    const maxSeats = 5; // you 之外最多 5 個
    const opp = this.game_.players.filter(p => !p.isHuman);
    for (let i = 0; i < maxSeats; i++) {
      const x = LAYOUT.seatStartX + i * LAYOUT.seatGap;
      const v = this.makeSeat(x, LAYOUT.seatY, opp[i], i);
      this.seatViews.push(v);
    }
  }

  makeSeat(x, y, player, idx) {
    const c = this.add.container(x, y);
    const r = LAYOUT.seatAvatar;
    const ring = this.add.graphics();
    c.add(ring);
    const v = { c, ring, player, idx };

    if (player) {
      const av = this.add.text(0, 0, player.emoji, { fontSize: `${r * 1.3}px` }).setOrigin(0.5);
      const name = this.add.text(0, r + 8, player.name, {
        fontFamily: FONT, fontSize: '11px', color: COLOR.textDim,
      }).setOrigin(0.5, 0);
      const stack = this.add.text(0, r + 22, fmt(player.stack), {
        fontFamily: FONT, fontSize: '13px', fontStyle: '600', color: COLOR.textMid,
      }).setOrigin(0.5, 0);
      // 動作文字（上方）
      const action = this.add.text(0, -r - 14, '', {
        fontFamily: FONT, fontSize: '12px', color: COLOR.textMid,
      }).setOrigin(0.5, 1);
      // 下注 pill（下方）
      const pill = this.add.container(0, r + 44);
      const pillBg = this.add.graphics();
      const pillT = this.add.text(0, 0, '', {
        fontFamily: FONT, fontSize: '11px', fontStyle: '700', color: COLOR.gold,
      }).setOrigin(0.5);
      pill.add(pillBg); pill.add(pillT); pill.setVisible(false);
      // 行動綠點
      const dot = this.add.graphics(); dot.fillStyle(COLOR.green, 1); dot.fillCircle(0, -r - 16, 4); dot.setVisible(false);
      // 兩張小牌（攤牌時顯示）
      c.add([av, name, stack, action, pill, dot]);
      Object.assign(v, { av, name, stack, action, pill, pillBg, pillT, dot, holeMini: [] });
    } else {
      // 空位「+」
      ring.lineStyle(1.5, 0x303036, 1); ring.strokeCircle(0, 0, r);
      const plus = this.add.text(0, 0, '+', {
        fontFamily: FONT, fontSize: '26px', color: '#48484e',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      plus.on('pointerdown', () => this.addBot());
      c.add(plus);
      v.plus = plus;
    }
    this.layers.seats.add(c);
    return v;
  }

  addBot() {
    if (this.busy) return;
    if (this.game_ && this.game_.players.length >= 6) return;
    this.numBots = Math.min(5, this.numBots + 1);
    this.flash('下一手加入新對手');
    this.pendingNewGame = true; // 下一手生效
  }

  // ---- 一手流程 ----------------------------------------------------------
  startHand() {
    if (this.pendingNewGame) { this.pendingNewGame = false; this.newGame(); return; }
    // 清掉舊牌
    this.communityCards.forEach(c => c.destroy()); this.communityCards = [];
    this.holeCards.forEach(c => c.destroy()); this.holeCards = [];
    this.seatViews.forEach(s => { if (s.holeMini) { s.holeMini.forEach(m => m.destroy()); s.holeMini = []; } });

    if (this.game_.gameOver()) { this.showGameOver(); return; }

    this.game_.startHand();
    this.lastShownStreet = 'preflop';

    this.dealAnimation();
  }

  dealAnimation() {
    window.SFX?.deal();
    // 公共牌位（5 張背面）
    const total = 5 * LAYOUT.cardW + 4 * LAYOUT.communityGap;
    let cx = W / 2 - total / 2 + LAYOUT.cardW / 2;
    for (let i = 0; i < 5; i++) {
      const card = new Card(this, LAYOUT.cardW, LAYOUT.cardH);
      card.setPos(cx, LAYOUT.communityY);
      card.showBack();
      card.c.setScale(0);
      this.layers.community.add(card.c);
      this.communityCards.push(card);
      this.tweens.add({ targets: card.c, scale: 1, duration: 220, delay: 60 + i * 45, ease: 'Back.easeOut' });
      cx += LAYOUT.cardW + LAYOUT.communityGap;
    }

    // 你的底牌
    const you = this.game_.players.find(p => p.isHuman);
    const gap = 6;
    const hx = LAYOUT.holeX;
    for (let i = 0; i < 2; i++) {
      const card = new Card(this, LAYOUT.holeCardW, LAYOUT.holeCardH);
      const tx = hx + i * (LAYOUT.holeCardW + gap);
      card.setPos(tx, LAYOUT.holeY + 40);
      card.setFace(you.hole[i].r, you.hole[i].s);
      card.c.setAlpha(0);
      card.baseX = tx; card.baseY = LAYOUT.holeY;   // 拖曳手勢基準
      this.layers.hole.add(card.c);
      this.holeCards.push(card);
      this.tweens.add({
        targets: card.c, y: LAYOUT.holeY, alpha: 1, duration: 280, delay: 260 + i * 90, ease: 'Quad.easeOut',
        onComplete: () => { if (i === 0) card.showFace(); else { card.showFace(); } },
      });
    }
    // 立即顯示正面（底牌一律亮給玩家看）
    this.holeCards.forEach(c => c.showFace());

    this.time.delayedCall(560, () => { this.render(); this.proceed(); });
  }

  // 驅動流程：人類則等待，AI 則自動
  proceed() {
    this.render();
    const g = this.game_;
    if (g.street === 'showdown') { this.onShowdown(); return; }
    if (g.toAct < 0) return;
    const p = g.players[g.toAct];
    if (p.isHuman) {
      this.busy = false;
      this.enableHumanActions();
    } else {
      this.busy = true;
      this.disableActions();
      this.time.delayedCall(650 + Math.random() * 500, () => this.runAI());
    }
  }

  runAI() {
    const g = this.game_;
    const seat = g.toAct;
    if (seat < 0 || g.street === 'showdown') return;
    const prevStreet = g.street;
    const prevCommunity = g.community.length;
    const d = aiDecide(g, seat);
    g.act(d.type, d.amount);
    this.sfxAction(d.type);
    this.afterAction(prevStreet, prevCommunity);
  }

  // 動作音效（call/raise=籌碼，check=敲桌，fold=咻聲）
  sfxAction(type) {
    const s = window.SFX; if (!s) return;
    if (type === 'fold') s.fold();
    else if (type === 'check') s.check();
    else s.chip();
  }

  // 人類動作 ---------------------------------------------------------------
  onLeftBtn() {
    const g = this.game_, legal = g.legalActions();
    if (!legal) return;
    const prevStreet = g.street, prevC = g.community.length;
    if (legal.check) { g.act('check'); this.sfxAction('check'); }
    else if (legal.call != null) { g.act('call'); this.sfxAction('call'); }
    this.hideRaise();
    this.afterAction(prevStreet, prevC);
  }

  onMidBtn() {
    // Bet/Raise：直接以「最小加注」或滑桿值送出
    const g = this.game_, legal = g.legalActions();
    if (!legal || !legal.raise) return;
    const prevStreet = g.street, prevC = g.community.length;
    const amt = this.raiseOpen ? this.raiseValue : legal.raise.min;
    g.act('raise', amt);
    this.sfxAction('raise');
    this.hideRaise();
    this.afterAction(prevStreet, prevC);
  }

  onStatusBtn() {
    const g = this.game_;
    if (g.street === 'showdown') this.startHand();
  }

  afterAction(prevStreet, prevC) {
    this.busy = true;
    this.disableActions();
    const g = this.game_;
    this.render();
    // 街道推進 → 翻公共牌
    if (g.community.length > prevC) {
      this.revealCommunity(prevC, g.community.length).then(() => {
        this.time.delayedCall(280, () => this.proceed());
      });
    } else {
      this.time.delayedCall(340, () => this.proceed());
    }
  }

  revealCommunity(from, to) {
    const proms = [];
    for (let i = from; i < to; i++) {
      const card = this.communityCards[i];
      const cd = this.game_.community[i];
      card.setFace(cd.r, cd.s);
      this.time.delayedCall((i - from) * 120 + 130, () => window.SFX?.flip());
      proms.push(card.flipToFace((i - from) * 120));
    }
    return Promise.all(proms);
  }

  // ---- 攤牌 --------------------------------------------------------------
  onShowdown() {
    const g = this.game_;
    this.busy = true;
    this.disableActions();
    // 補翻尚未翻開的公共牌
    const need = [];
    for (let i = 0; i < g.community.length; i++) {
      if (!this.communityCards[i].faceUp) need.push(i);
    }
    const reveal = need.length ? this.revealCommunity(need[0], g.community.length) : Promise.resolve();

    reveal.then(() => {
      // 攤開對手底牌（非棄牌者）
      const res = g.result;
      if (!res.uncontested) {
        for (const v of this.seatViews) {
          if (!v.player) continue;
          const pl = g.players.find(p => p.id === v.player.id);
          if (pl && !pl.folded) this.showSeatHole(v, pl);
        }
      }
      this.render();
      this.showResult(res);
    });
  }

  showSeatHole(v, pl) {
    v.holeMini = v.holeMini || [];
    const w = 26, h = 36, gap = 3;
    for (let i = 0; i < 2; i++) {
      const card = new Card(this, w, h);
      card.setFace(pl.hole[i].r, pl.hole[i].s);
      card.setPos(-w / 2 - gap / 2 + i * (w + gap), LAYOUT.seatAvatar + 60);
      card.showFace();
      v.c.add(card.c);
      v.holeMini.push({ destroy: () => card.destroy() });
    }
  }

  showResult(res) {
    const g = this.game_;
    let msg = '';
    if (res.uncontested) {
      const wid = res.pots[0].winners[0];
      const w = g.players.find(p => p.id === wid);
      msg = `${w.name} wins ${fmt(res.pots[0].amount)}`;
    } else {
      const main = res.pots[res.pots.length - 1] || res.pots[0];
      const names = main.winners.map(id => g.players.find(p => p.id === id).name);
      const hn = res.hands[main.winners[0]] ? res.hands[main.winners[0]].name : '';
      msg = `${names.join(', ')} — ${hn}`;
      // 高亮贏家
      for (const v of this.seatViews) {
        if (v.player && main.winners.includes(v.player.id)) this.pulseSeat(v);
      }
    }
    // 勝負音效：你贏播勝利音、否則播輸音
    const allWinners = res.pots.flatMap(p => p.winners);
    if (allWinners.includes('you')) window.SFX?.win();
    else window.SFX?.lose();

    this.flash(msg, 2200);
    this.showStatus('Wait for the next hand', g.gameOver() ? 'New game' : 'Next hand');
    this.render();
  }

  pulseSeat(v) {
    this.tweens.add({ targets: v.c, scale: 1.12, duration: 260, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
  }

  showGameOver() {
    const g = this.game_;
    const alive = g.players.filter(p => !p.out && p.stack > 0);
    const winner = alive[0];
    this.flash(`${winner ? winner.name : '—'} 贏得全部籌碼 🏆`, 99999);
    this.showStatus(winner && winner.isHuman ? '你贏了！再來一局' : 'New game', 'New game');
  }

  // ---- UI 同步 -----------------------------------------------------------
  render() {
    const g = this.game_;
    this.potText.setText(fmt(g.pot));
    const you = g.players.find(p => p.isHuman);
    this.youStackText.setText(fmt(you.stack));
    // 你目前最佳牌型
    if (you.hole.length === 2) {
      const sc = evaluate7(you.hole.concat(g.community));
      this.handNameText.setText(handName(sc));
    }

    // 座位
    for (const v of this.seatViews) {
      if (!v.player) continue;
      const pl = g.players.find(p => p.id === v.player.id);
      if (!pl) continue;
      v.stack.setText(fmt(pl.stack));
      const isTurn = g.toAct === g.players.indexOf(pl) && g.street !== 'showdown';
      v.dot.setVisible(isTurn);
      // 動作文字
      v.action.setText(pl.lastAction || (isTurn ? '…' : ''));
      v.action.setColor(isTurn ? COLOR.white : COLOR.textDim);
      // 下注 pill
      if (pl.bet > 0 && !pl.folded) {
        v.pillT.setText(fmt(pl.bet));
        const pw = v.pillT.width + 16;
        v.pillBg.clear(); v.pillBg.fillStyle(COLOR.pillBg, 1);
        v.pillBg.fillRoundedRect(-pw / 2, -10, pw, 20, 10);
        v.pill.setVisible(true);
      } else v.pill.setVisible(false);
      // 棄牌變暗
      v.c.setAlpha(pl.folded ? 0.32 : 1);
    }
  }

  // ---- 動作按鈕狀態 ------------------------------------------------------
  enableHumanActions() {
    const g = this.game_, legal = g.legalActions();
    if (!legal) { this.disableActions(); return; }
    this.statusBtn.setVisible(false);
    [this.btns.left, this.btns.mid, this.btns.raise].forEach(b => b.setVisible(true));

    if (legal.check) { this.btns.left.setLabel('Check'); this.btns.left.setEnabled(true); }
    else if (legal.call != null) { this.btns.left.setLabel(`Call ${fmt(legal.call)}`); this.btns.left.setEnabled(true); }
    else this.btns.left.setEnabled(false);

    if (legal.raise) {
      this.btns.mid.setEnabled(true);
      this.btns.raise.setEnabled(true);
      this.raiseMin = legal.raise.min;
      this.raiseMax = legal.raise.max;
      this.raiseValue = Phaser.Math.Clamp(this.raiseValue || legal.raise.min, legal.raise.min, legal.raise.max);
      this.updateMidLabel(legal);
    } else {
      this.btns.mid.setEnabled(false);
      this.btns.raise.setEnabled(false);
    }
    // 棄牌 = 往上推底牌（手勢）。輪到你就啟用並顯示提示。
    if (!this.humanTurn) window.SFX?.turn();   // 剛輪到你
    this.humanTurn = true;
    this.snapHoleBack();
    this.foldHint.setAlpha(1).setColor(COLOR.textDim).setText('往上推 = 蓋牌');
  }

  updateMidLabel(legal) {
    if (!legal.raise) return;
    const label = legal.raise.isBet ? 'Bet' : 'Raise';
    const amt = this.raiseOpen ? this.raiseValue : legal.raise.min;
    this.btns.mid.setLabel(`${label} ${fmt(amt)}`);
  }

  disableActions() {
    [this.btns.left, this.btns.mid, this.btns.raise].forEach(b => b.setEnabled(false));
    this.humanTurn = false;
    if (this.foldHint) this.foldHint.setAlpha(0);
    this.hideRaise();
  }

  showStatus(text, btnLabel) {
    [this.btns.left, this.btns.mid, this.btns.raise].forEach(b => b.setVisible(false));
    this.humanTurn = false;
    if (this.foldHint) this.foldHint.setAlpha(0);
    this.statusBtn.setVisible(true);
    this.statusBtn.setLabel(btnLabel || text);
    this.statusBtn.setEnabled(true);
  }

  // ---- 加注滑桿 ----------------------------------------------------------
  buildRaiseSlider() {
    const c = this.add.container(W / 2, LAYOUT.actionY - 64);
    const wbar = 300, hbar = 6;
    const track = this.add.graphics();
    track.fillStyle(0x2a2a30, 1); track.fillRoundedRect(-wbar / 2, -hbar / 2, wbar, hbar, 3);
    const fill = this.add.graphics();
    const knob = this.add.circle(0, 0, 12, 0xffffff).setInteractive({ draggable: true, useHandCursor: true });
    const valT = this.add.text(0, -26, '', { fontFamily: FONT, fontSize: '15px', fontStyle: '700', color: COLOR.gold }).setOrigin(0.5);
    c.add([track, fill, knob, valT]);
    c.setVisible(false);
    this.raiseSlider = { c, track, fill, knob, valT, wbar };

    this.input.setDraggable(knob);
    knob.on('drag', (p, dx) => {
      const x = Phaser.Math.Clamp(dx, -wbar / 2, wbar / 2);
      const t = (x + wbar / 2) / wbar;
      this.raiseValue = Math.round((this.raiseMin + t * (this.raiseMax - this.raiseMin)) / 2) * 2;
      this.raiseValue = Phaser.Math.Clamp(this.raiseValue, this.raiseMin, this.raiseMax);
      this.refreshRaiseSlider();
    });
    // 快捷：點 knob 區外? 加 1/2 pot、pot、all-in 快捷鈕
    const mk = (label, frac, ox) => {
      const b = this.add.text(ox, 28, label, { fontFamily: FONT, fontSize: '12px', color: COLOR.textDim }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => {
        const g = this.game_;
        if (frac === 'allin') this.raiseValue = this.raiseMax;
        else this.raiseValue = Phaser.Math.Clamp(Math.round(g.currentBet + g.pot * frac), this.raiseMin, this.raiseMax);
        this.refreshRaiseSlider();
      });
      c.add(b); return b;
    };
    mk('½ pot', 0.5, -90); mk('pot', 1, 0); mk('all-in', 'allin', 90);
  }

  refreshRaiseSlider() {
    const s = this.raiseSlider;
    const t = (this.raiseValue - this.raiseMin) / Math.max(1, this.raiseMax - this.raiseMin);
    const x = -s.wbar / 2 + t * s.wbar;
    s.knob.setPosition(x, 0);
    s.fill.clear(); s.fill.fillStyle(COLOR.gold, 1);
    s.fill.fillRoundedRect(-s.wbar / 2, -3, t * s.wbar, 6, 3);
    s.valT.setPosition(x, -26).setText(fmt(this.raiseValue));
    const legal = this.game_.legalActions();
    if (legal) this.updateMidLabel(legal);
  }

  toggleRaise() {
    if (this.raiseOpen) this.hideRaise(); else this.showRaise();
  }
  showRaise() {
    const legal = this.game_.legalActions();
    if (!legal || !legal.raise) return;
    this.raiseOpen = true;
    this.raiseValue = Phaser.Math.Clamp(this.raiseValue || legal.raise.min, this.raiseMin, this.raiseMax);
    this.raiseSlider.c.setVisible(true);
    this.refreshRaiseSlider();
  }
  hideRaise() {
    this.raiseOpen = false;
    if (this.raiseSlider) this.raiseSlider.c.setVisible(false);
    const legal = this.game_?.legalActions?.();
    if (legal && legal.raise) this.updateMidLabel(legal);
  }

  // ---- 提示 flash --------------------------------------------------------
  flash(text, dur = 1400) {
    if (this.flashT) this.flashT.destroy();
    this.flashT = this.add.text(W / 2, LAYOUT.communityY - 90, text, {
      fontFamily: FONT, fontSize: '14px', fontStyle: '600', color: COLOR.white,
      backgroundColor: 'rgba(20,20,22,0.0)',
    }).setOrigin(0.5).setAlpha(0);
    this.layers.fx.add(this.flashT);
    this.tweens.add({ targets: this.flashT, alpha: 1, duration: 200 });
    this.time.delayedCall(dur, () => {
      if (this.flashT) this.tweens.add({ targets: this.flashT, alpha: 0, duration: 300 });
    });
  }

  // ===========================================================================
  // DEV 微調工具
  // ===========================================================================
  setupDev() {
    const panel = document.getElementById('dev');
    const body = document.getElementById('devBody');
    const tip = document.getElementById('devTip');
    const ranges = {
      seatY: [80, 300], seatGap: [50, 110], seatAvatar: [18, 44], seatStartX: [40, 160],
      communityY: [300, 600], communityGap: [0, 16], cardW: [40, 90], cardH: [56, 120],
      potY: [400, 640], actionY: [520, 760], holeY: [680, 900], holeX: [50, 200],
      holeCardW: [56, 120], holeCardH: [70, 160], panelX: [200, 420], panelY: [680, 900],
      panelW: [120, 240], panelH: [80, 180], titleY: [40, 160],
    };
    body.innerHTML = '';
    for (const key of Object.keys(ranges)) {
      const [min, max] = ranges[key];
      const row = document.createElement('div'); row.className = 'row';
      row.innerHTML = `<label title="${key}">${key}</label>
        <input type="range" min="${min}" max="${max}" step="1" value="${LAYOUT[key]}" data-k="${key}">
        <span class="val">${LAYOUT[key]}</span>`;
      const input = row.querySelector('input');
      const val = row.querySelector('.val');
      input.addEventListener('input', () => {
        LAYOUT[key] = +input.value; val.textContent = input.value;
        this.applyLayout();
      });
      body.appendChild(row);
    }
    document.getElementById('devExport').addEventListener('click', () => {
      const json = JSON.stringify(LAYOUT, null, 2);
      navigator.clipboard?.writeText(json);
      console.log('LAYOUT =', json);
      alert('已複製 LAYOUT JSON 到剪貼簿（也印在 console）。貼給 Claude baked 進原始碼。');
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        panel.classList.toggle('open');
        tip.style.display = panel.classList.contains('open') ? 'none' : 'block';
      }
    });
  }

  // 重畫所有受 LAYOUT 影響的元件
  applyLayout() {
    this.title.setY(LAYOUT.titleY); this.backBtn.setY(LAYOUT.titleY);
    this.potText.setPosition(W - 26, LAYOUT.potY);
    // 面板
    const p = LAYOUT;
    this.handNameText.setPosition(p.panelX, p.panelY - p.panelH / 2 + 22);
    this.handEmoji.setPosition(p.panelX, p.panelY + 2);
    this.youStackText.setPosition(p.panelX, p.panelY + p.panelH / 2 - 22);
    this.drawPanel();
    this.layoutActionButtons();
    this.raiseSlider?.c.setPosition(W / 2, LAYOUT.actionY - 64);
    // 座位
    for (const v of this.seatViews) {
      v.c.setPosition(LAYOUT.seatStartX + v.idx * LAYOUT.seatGap, LAYOUT.seatY);
    }
    // 公共牌
    const total = 5 * LAYOUT.cardW + 4 * LAYOUT.communityGap;
    let cx = W / 2 - total / 2 + LAYOUT.cardW / 2;
    for (const c of this.communityCards) { c.setPos(cx, LAYOUT.communityY); cx += LAYOUT.cardW + LAYOUT.communityGap; }
    // 底牌
    this.holeCards.forEach((c, i) => c.setPos(LAYOUT.holeX + i * (LAYOUT.holeCardW + 6), LAYOUT.holeY));
  }
}

// ---- 工具 ----------------------------------------------------------------
function fmt(n) { return Number(n).toLocaleString('en-US'); }

// ---- 啟動 ----------------------------------------------------------------
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W, height: H,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Table],
});

})();
