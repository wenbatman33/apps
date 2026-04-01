/**
 * 小瑪莉 — Phaser.js Edition
 * 跑馬燈水果機，使用 Phaser 3 遊戲引擎
 */

const GAME_W = 420;
const GAME_H = 820;

/* ===== 符號定義 ===== */
const SYM_DEF = {
  apple:  { emoji: '🍎', color: 0xcc0000 },
  melon:  { emoji: '🍉', color: 0x228800 },
  star:   { emoji: '⭐', color: 0xccaa00 },
  seven:  { emoji: '7',  color: 0xff0000, isText: true },
  bar:    { emoji: 'BAR', color: 0x880000, isText: true },
  bell:   { emoji: '🔔', color: 0xcc8800 },
  plum:   { emoji: '🍇', color: 0x6600aa },
  orange: { emoji: '🍊', color: 0xdd6600 },
  cherry: { emoji: '🍒', color: 0xcc0044 },
  once:   { emoji: 'ONCE\nMORE', color: 0x886600, isText: true },
};

/* 邊框 24 格 (順時針) */
const BORDER = [
  'orange','bell','cherry','bar','apple','plum','melon',
  'cherry','orange','apple','bell','once',
  'orange','seven','bell','apple','melon','cherry','plum',
  'once','melon','star','cherry','plum',
];
const BORDER_LEN = 24;

/* 賠率表 9 欄 */
const PAYTABLE = [
  { sid:'apple',  mult:5,   label:'5'   },
  { sid:'melon',  mult:20,  label:'20'  },
  { sid:'star',   mult:30,  label:'30'  },
  { sid:'seven',  mult:40,  label:'40'  },
  { sid:'bar',    mult:100, label:'100' },
  { sid:'bell',   mult:20,  label:'20'  },
  { sid:'plum',   mult:15,  label:'15'  },
  { sid:'orange', mult:10,  label:'10'  },
  { sid:'cherry', mult:2,   label:'2'   },
];

/* ===== localStorage ===== */
const SAVE_KEY = 'xiaomali_credits';
function loadCredits() {
  const v = localStorage.getItem(SAVE_KEY);
  return v !== null ? Math.max(0, parseInt(v, 10) || 0) : 100;
}
function saveCredits(val) {
  localStorage.setItem(SAVE_KEY, String(val));
}

/* ===== Main Scene ===== */
class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.credits = loadCredits();
    this.winPool = 0;
    this.bets = new Array(9).fill(0);
    this.spinning = false;
    this.chasePos = 0;
    this.chaseTimer = null;
    this.freeSpinPending = false;
    this.autoPlay = false;
    this.autoBetPattern = new Array(9).fill(0);

    this.drawMachineBody();
    this.drawTopPanel();
    this.drawBorderFrame();
    this.drawCenterArea();
    this.drawPaytable();
    this.drawControlPanel();
    this.drawActionButtons();
    this.drawCoinTray();

    this.updateCreditDisplay();
    this.updateWinDisplay();
    this.startIdleLights();
    this.startIdleSymbolCycle();
  }

  /* ===== Machine Body ===== */
  drawMachineBody() {
    const g = this.add.graphics();
    // Metal body
    g.fillStyle(0xc0c0c0);
    g.fillRoundedRect(0, 0, GAME_W, GAME_H, 10);
    // Inner shadow
    g.fillStyle(0xb0b0b0);
    g.fillRoundedRect(2, 2, GAME_W - 4, GAME_H - 4, 8);
    // Top highlight
    g.fillStyle(0xd8d8d8);
    g.fillRect(4, 4, GAME_W - 8, 3);

    // Screws
    [{ x: 14, y: 14 }, { x: GAME_W - 14, y: 14 },
     { x: 14, y: GAME_H - 14 }, { x: GAME_W - 14, y: GAME_H - 14 }].forEach(p => {
      g.fillStyle(0xaaaaaa);
      g.fillCircle(p.x, p.y, 6);
      g.fillStyle(0x888888);
      g.fillCircle(p.x, p.y, 4);
      g.lineStyle(1.5, 0x666666);
      g.lineBetween(p.x - 3, p.y - 3, p.x + 3, p.y + 3);
      g.lineBetween(p.x - 3, p.y + 3, p.x + 3, p.y - 3);
    });
  }

  /* ===== Top Panel (WIN / CREDIT LEDs) ===== */
  drawTopPanel() {
    const g = this.add.graphics();
    g.fillStyle(0x0a0000);
    g.fillRoundedRect(10, 28, GAME_W - 20, 52, 6);

    // WIN label
    this.add.text(GAME_W * 0.25, 34, 'WIN', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#ff9944',
    }).setOrigin(0.5, 0);

    // CREDIT label
    this.add.text(GAME_W * 0.75, 34, 'CREDIT', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#ff9944',
      letterSpacing: 2,
    }).setOrigin(0.5, 0);

    // LED backgrounds
    const ledStyle = { fontSize: '22px', fontFamily: 'Courier New', color: '#ff2200', fontStyle: 'bold' };

    g.fillStyle(0x050000);
    g.fillRoundedRect(GAME_W * 0.25 - 45, 48, 90, 28, 4);
    g.fillRoundedRect(GAME_W * 0.75 - 45, 48, 90, 28, 4);

    this.winText = this.add.text(GAME_W * 0.25, 62, '0000', ledStyle).setOrigin(0.5, 0.5);
    this.creditText = this.add.text(GAME_W * 0.75, 62, '0000', ledStyle).setOrigin(0.5, 0.5);
  }

  updateCreditDisplay() {
    this.creditText.setText(String(this.credits).padStart(4, '0').slice(-4));
    saveCredits(this.credits);
  }

  updateWinDisplay() {
    this.winText.setText(String(this.winPool).padStart(4, '0').slice(-4));
  }

  transferWinToCredit() {
    if (this.winPool <= 0 || this.spinning) return;
    this.playCoin();
    this.credits += this.winPool;
    this.winPool = 0;
    this.updateCreditDisplay();
    this.updateWinDisplay();
  }

  /* ===== Border Frame (24 tiles) ===== */
  drawBorderFrame() {
    const frameX = 14;
    const frameY = 88;
    const tileSize = Math.floor((GAME_W - frameX * 2 - 4) / 7);
    this.tileSize = tileSize;
    this.frameX = frameX;
    this.frameY = frameY;
    const cols = 7;
    const rows = 5;
    const frameW = cols * tileSize;
    const frameH = rows * tileSize + tileSize * 2;
    this.frameBottom = frameY + frameH + 12; // Y position below the frame

    // Gold frame border
    const g = this.add.graphics();
    g.fillStyle(0x8a0808);
    g.fillRect(frameX - 4, frameY - 4, GAME_W - (frameX - 4) * 2, frameH + 8);
    g.fillStyle(0xcc9900);
    g.fillRect(frameX, frameY, GAME_W - frameX * 2, frameH);

    this.tiles = [];
    this.tileBgs = [];
    this.tileTexts = [];
    this.tileLeds = [];

    // Calculate tile positions for all 24 border slots
    const positions = this._calcBorderPositions(frameX, frameY, tileSize);

    positions.forEach((pos, i) => {
      const sym = SYM_DEF[BORDER[i]];
      // Tile background
      const bg = this.add.graphics();
      if (sym.isText && BORDER[i] === 'bar') {
        bg.fillStyle(0x880000);
      } else if (sym.isText && BORDER[i] === 'once') {
        bg.fillStyle(0xfff0c0);
      } else {
        bg.fillStyle(0xf5efe0);
      }
      bg.fillRect(pos.x, pos.y, tileSize - 2, tileSize - 2);
      bg.lineStyle(1.5, 0xcc9900);
      bg.strokeRect(pos.x, pos.y, tileSize - 2, tileSize - 2);
      this.tileBgs.push(bg);

      // Symbol text
      let txt;
      if (BORDER[i] === 'seven') {
        txt = this.add.text(pos.x + (tileSize - 2) / 2, pos.y + (tileSize - 2) / 2, '7', {
          fontSize: '28px', fontFamily: 'Arial Black', color: '#ff2222', fontStyle: 'italic bold',
        }).setOrigin(0.5);
      } else if (BORDER[i] === 'bar') {
        txt = this.add.text(pos.x + (tileSize - 2) / 2, pos.y + (tileSize - 2) / 2, 'BAR', {
          fontSize: '10px', fontFamily: 'Arial Black', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
      } else if (BORDER[i] === 'once') {
        txt = this.add.text(pos.x + (tileSize - 2) / 2, pos.y + (tileSize - 2) / 2, 'ONCE\nMORE', {
          fontSize: '8px', fontFamily: 'Arial Black', color: '#886600', fontStyle: 'bold',
          align: 'center',
        }).setOrigin(0.5);
      } else {
        txt = this.add.text(pos.x + (tileSize - 2) / 2, pos.y + (tileSize - 2) / 2, sym.emoji, {
          fontSize: '22px',
        }).setOrigin(0.5);
      }
      this.tileTexts.push(txt);

      // Red LED dot
      const led = this.add.graphics();
      led.fillStyle(0x660000);
      led.fillCircle(pos.x + tileSize - 6, pos.y + tileSize - 6, 3);
      this.tileLeds.push(led);

      this.tiles.push({ x: pos.x, y: pos.y, w: tileSize - 2, h: tileSize - 2, sym: BORDER[i] });
    });

    // Chase highlight overlay (reused)
    this.chaseHighlight = this.add.graphics();
    this.chaseHighlight.setDepth(5);
  }

  _calcBorderPositions(fx, fy, s) {
    const positions = [];
    const innerX = fx + 2;
    const innerY = fy + 2;
    const frameInnerW = GAME_W - fx * 2 - 4;

    // Top row: 7 tiles (0-6)
    for (let i = 0; i < 7; i++) {
      positions.push({ x: innerX + i * s, y: innerY });
    }
    // Right col: 5 tiles (7-11)
    for (let i = 0; i < 5; i++) {
      positions.push({ x: innerX + 6 * s, y: innerY + (i + 1) * s });
    }
    // Bottom row: 7 tiles (12-18) reversed
    for (let i = 6; i >= 0; i--) {
      positions.push({ x: innerX + i * s, y: innerY + 6 * s });
    }
    // Left col: 5 tiles (19-23) reversed
    for (let i = 4; i >= 0; i--) {
      positions.push({ x: innerX, y: innerY + (i + 1) * s });
    }
    return positions;
  }

  setChaseHighlight(pos) {
    this.chaseHighlight.clear();
    // Current tile: bright yellow glow
    const t = this.tiles[pos];
    this.chaseHighlight.fillStyle(0xffee44, 0.7);
    this.chaseHighlight.fillRect(t.x, t.y, t.w, t.h);
    // Glow effect
    this.chaseHighlight.lineStyle(3, 0xffdd00, 0.8);
    this.chaseHighlight.strokeRect(t.x - 2, t.y - 2, t.w + 4, t.h + 4);

    // Trail 1
    const t1Idx = (pos - 1 + BORDER_LEN) % BORDER_LEN;
    const t1 = this.tiles[t1Idx];
    this.chaseHighlight.fillStyle(0xffee44, 0.3);
    this.chaseHighlight.fillRect(t1.x, t1.y, t1.w, t1.h);

    // Trail 2
    const t2Idx = (pos - 2 + BORDER_LEN) % BORDER_LEN;
    const t2 = this.tiles[t2Idx];
    this.chaseHighlight.fillStyle(0xffee44, 0.15);
    this.chaseHighlight.fillRect(t2.x, t2.y, t2.w, t2.h);
  }

  clearChaseHighlight() {
    this.chaseHighlight.clear();
  }

  /* ===== Center Area ===== */
  drawCenterArea() {
    const tileSize = this.tileSize;
    const cx = this.frameX + 2 + tileSize;
    const cy = this.frameY + 2 + tileSize;
    const cw = 5 * tileSize;
    const ch = 5 * tileSize;
    const midX = cx + cw / 2;

    const bg = this.add.graphics();
    // 1. Deep base gradient — dark navy to purple
    bg.fillStyle(0x060e24);
    bg.fillRect(cx, cy, cw, ch);
    // Layered colour zones for depth
    bg.fillStyle(0x0a1a44, 0.9);
    bg.fillRect(cx, cy, cw, ch * 0.5);
    bg.fillStyle(0x120830, 0.6);
    bg.fillRect(cx, cy + ch * 0.5, cw, ch * 0.5);

    // 2. Radial glow circles (concentric halos)
    const cyCtr = cy + ch / 2;
    const haloColors = [
      { r: cw * 0.72, c: 0x1a4488, a: 0.18 },
      { r: cw * 0.52, c: 0x2266cc, a: 0.22 },
      { r: cw * 0.34, c: 0x44aaff, a: 0.18 },
      { r: cw * 0.18, c: 0x88ddff, a: 0.15 },
    ];
    haloColors.forEach(h => {
      bg.fillStyle(h.c, h.a);
      bg.fillCircle(midX, cyCtr, h.r);
    });

    // 3. Gold decorative corner coins
    const coinPositions = [
      { x: cx + 18, y: cy + 18 }, { x: cx + cw - 18, y: cy + 18 },
      { x: cx + 18, y: cy + ch - 18 }, { x: cx + cw - 18, y: cy + ch - 18 },
    ];
    coinPositions.forEach(p => {
      bg.fillStyle(0xcc8800, 0.8);
      bg.fillCircle(p.x, p.y, 10);
      bg.fillStyle(0xffdd44, 0.9);
      bg.fillCircle(p.x, p.y, 7);
      bg.fillStyle(0xffe88a, 0.7);
      bg.fillCircle(p.x, p.y, 4);
    });

    // 4. Decorative horizontal shimmer bars
    [[cy + ch * 0.18, 0x2255bb, 0.15], [cy + ch * 0.82, 0x2255bb, 0.15]].forEach(([y, c, a]) => {
      bg.fillStyle(c, a);
      bg.fillRect(cx, y - 4, cw, 8);
      bg.fillStyle(0x88ccff, 0.08);
      bg.fillRect(cx, y - 1, cw, 2);
    });

    // 5. Rotating ray burst — warm golden tones
    const rays = this.add.graphics().setDepth(1);
    const numRays = 20;
    for (let r = 0; r < numRays; r++) {
      const angle = (r / numRays) * Math.PI * 2;
      const nextAngle = ((r + 0.35) / numRays) * Math.PI * 2;
      const dist = cw * 0.8;
      const col = r % 2 === 0 ? 0xffdd88 : 0xffaa44;
      rays.fillStyle(col, 0.04);
      rays.fillTriangle(
        midX, cyCtr,
        midX + Math.cos(angle) * dist, cyCtr + Math.sin(angle) * dist,
        midX + Math.cos(nextAngle) * dist, cyCtr + Math.sin(nextAngle) * dist
      );
    }
    this.tweens.add({ targets: rays, angle: 360, duration: 12000, repeat: -1, ease: 'Linear' });

    // 6. Small sparkle dots scattered in bg
    const sparks = this.add.graphics().setDepth(1);
    const sparkPos = [
      {x: cx+30, y: cy+40}, {x: cx+cw-35, y: cy+55}, {x: cx+50, y: cy+ch-45},
      {x: cx+cw-28, y: cy+ch-38}, {x: cx+22, y: cy+ch/2-20}, {x: cx+cw-20, y: cy+ch/2+25},
      {x: cx+cw/2-55, y: cy+22}, {x: cx+cw/2+50, y: cy+28},
    ];
    sparkPos.forEach(p => {
      sparks.fillStyle(0xffffff, 0.6);
      sparks.fillCircle(p.x, p.y, 1.5);
      sparks.fillStyle(0xaaddff, 0.3);
      sparks.fillCircle(p.x, p.y, 3.5);
    });
    // Twinkle animation
    this.tweens.add({ targets: sparks, alpha: 0.15, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 7. Decorative fruit scatter (bg layer, semi-transparent)
    const bgFruits = ['🍒', '🍊', '🍉', '🔔', '🍇'];
    const bgFruitPos = [
      {x: cx+14, y: cy+ch*0.35, f:0}, {x: cx+cw-14, y: cy+ch*0.35, f:1},
      {x: cx+14, y: cy+ch*0.65, f:2}, {x: cx+cw-14, y: cy+ch*0.65, f:3},
      {x: cx+cw/2, y: cy+ch-14, f:4},
    ];
    bgFruitPos.forEach(p => {
      this.add.text(p.x, p.y, bgFruits[p.f], { fontSize: '16px' })
        .setOrigin(0.5).setDepth(1).setAlpha(0.25);
    });

    // 8. Inner border glow rim
    const rim = this.add.graphics().setDepth(1);
    rim.lineStyle(2, 0x4499ff, 0.35);
    rim.strokeRect(cx + 4, cy + 4, cw - 8, ch - 8);
    rim.lineStyle(1, 0xaaddff, 0.2);
    rim.strokeRect(cx + 7, cy + 7, cw - 14, ch - 14);

    // 9. Side star decorations (keep from before, on top of bg)
    const starX1 = cx + tileSize * 0.35;
    const starX2 = cx + cw - tileSize * 0.35;
    const starY = cy + ch / 2;
    this.starLeft  = this.add.text(starX1, starY, '⭐', { fontSize: '28px' }).setOrigin(0.5).setDepth(2);
    this.starRight = this.add.text(starX2, starY, '⭐', { fontSize: '28px' }).setOrigin(0.5).setDepth(2);
    [this.starLeft, this.starRight].forEach((s, i) => {
      this.tweens.add({ targets: s, scaleX: 1.25, scaleY: 1.25, duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 475 });
    });

    // Title
    this.add.text(midX, cy + 18, '小瑪莉', {
      fontSize: '22px', fontFamily: 'Arial Black', color: '#ffcc00', fontStyle: 'italic bold',
      stroke: '#886600', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(2);

    // ===== Reel Card =====
    const cardW = 78, cardH = 78;
    const cardX = midX - cardW / 2;
    const cardY = cy + ch / 2 - cardH / 2 - 6;

    this.reelCardGfx = this.add.graphics().setDepth(2);
    this._drawReelCard(cardX, cardY, cardW, cardH, false);

    // Symbol text inside card — start with first idle symbol
    this.centerSymText = this.add.text(midX, cardY + cardH / 2, SYM_DEF['apple'].emoji, {
      fontSize: '40px',
    }).setOrigin(0.5).setDepth(3);
    this._centerCardX = cardX; this._centerCardY = cardY;
    this._centerCardW = cardW; this._centerCardH = cardH;

    // JP row
    const jpY = cy + ch - 36;
    this.add.text(midX - 22, jpY, 'J·P', {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#ff3333', fontStyle: 'italic bold',
      stroke: '#660000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(2);

    const jpBoxG = this.add.graphics().setDepth(2);
    jpBoxG.fillStyle(0xffcc00);
    jpBoxG.fillRoundedRect(midX, jpY - 10, 44, 20, 3);
    jpBoxG.lineStyle(2, 0xaa6600);
    jpBoxG.strokeRoundedRect(midX, jpY - 10, 44, 20, 3);

    this.jpCountText = this.add.text(midX + 22, jpY, '0', {
      fontSize: '13px', fontFamily: 'Courier New', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);

    // Game message
    this.gameMsgText = this.add.text(midX, cy + ch - 10, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#ffffff',
      stroke: '#000033', strokeThickness: 1, align: 'center',
    }).setOrigin(0.5, 1).setDepth(3);
  }

  _drawReelCard(x, y, w, h, winGlow) {
    const g = this.reelCardGfx;
    g.clear();
    // Card background
    g.fillStyle(0xffd030);
    g.fillRoundedRect(x, y, w, h, 10);
    g.fillStyle(0xfff8e0, 0.9);
    g.fillRoundedRect(x + 2, y + 2, w - 4, h * 0.55, 8);
    // Border
    g.lineStyle(3, 0xcc8800);
    g.strokeRoundedRect(x, y, w, h, 10);
    // Highlight shimmer
    g.fillStyle(0xffffff, 0.45);
    g.fillRoundedRect(x + 7, y + 5, w - 14, h * 0.25, 5);
    // Win glow
    if (winGlow) {
      for (let i = 3; i >= 1; i--) {
        g.lineStyle(i * 4, 0xffee00, 0.3 / i);
        g.strokeRoundedRect(x - i * 2, y - i * 2, w + i * 4, h + i * 4, 10 + i * 2);
      }
    }
  }

  updateCenterSymbol(symId) {
    if (!this.centerSymText) return;
    const cardX = this._centerCardX, cardY = this._centerCardY;
    const cardW = this._centerCardW, cardH = this._centerCardH;
    const midX = cardX + cardW / 2;
    const midY = cardY + cardH / 2;

    if (symId === null) {
      this.centerSymText.setText(SYM_DEF['apple'].emoji);
      this.centerSymText.setStyle({ fontSize: '40px' });
      this.centerSymText.setPosition(midX, midY);
      this._drawReelCard(cardX, cardY, cardW, cardH, false);
      return;
    }
    const sym = SYM_DEF[symId];
    if (!sym) return;

    if (symId === 'bar') {
      this.centerSymText.setText('BAR');
      this.centerSymText.setStyle({ fontSize: '18px', fontFamily: 'Arial Black', color: '#ffffff', fontStyle: 'bold' });
    } else if (symId === 'seven') {
      this.centerSymText.setText('7');
      this.centerSymText.setStyle({ fontSize: '40px', fontFamily: 'Arial Black', color: '#ff2222', fontStyle: 'italic bold' });
    } else if (symId === 'once') {
      this.centerSymText.setText('ONCE\nMORE');
      this.centerSymText.setStyle({ fontSize: '11px', fontFamily: 'Arial Black', color: '#886600', fontStyle: 'bold', align: 'center' });
    } else {
      this.centerSymText.setText(sym.emoji);
      this.centerSymText.setStyle({ fontSize: '42px' });
    }
    this.centerSymText.setPosition(midX, midY);
  }

  startIdleSymbolCycle() {
    const order = ['apple','melon','star','seven','bar','bell','plum','orange','cherry'];
    let idx = 0;
    this.time.addEvent({
      delay: 950,
      loop: true,
      callback: () => {
        if (!this.spinning) {
          idx = (idx + 1) % order.length;
          this.updateCenterSymbol(order[idx]);
        }
      },
    });
  }

  showMsg(msg, duration = 2000) {
    this.gameMsgText.setText(msg);
    if (duration > 0) {
      this.time.delayedCall(duration, () => {
        if (this.gameMsgText.text === msg) this.gameMsgText.setText('');
      });
    }
  }

  /* ===== Paytable ===== */
  drawPaytable() {
    const py = this.frameBottom;
    const colW = (GAME_W - 20) / 9;

    const g = this.add.graphics();
    g.fillStyle(0x111111);
    g.fillRoundedRect(10, py, GAME_W - 20, 68, 4);

    this.payLedTexts = [];

    PAYTABLE.forEach((pt, i) => {
      const cx = 10 + i * colW + colW / 2;
      const sym = SYM_DEF[pt.sid];

      // Separator
      if (i > 0) {
        g.lineStyle(1, 0x333333);
        g.lineBetween(10 + i * colW, py, 10 + i * colW, py + 68);
      }

      // Multiplier
      const multColor = i === 4 ? '#ff4444' : '#e8c030';
      this.add.text(cx, py + 8, pt.label, {
        fontSize: '11px', fontFamily: 'Arial Black', color: multColor,
      }).setOrigin(0.5);

      // Symbol tile
      const tileG = this.add.graphics();
      if (pt.sid === 'bar') {
        tileG.fillStyle(0x880000);
      } else {
        tileG.fillStyle(0xf5efe0);
      }
      tileG.fillRect(10 + i * colW + 2, py + 20, colW - 4, 22);

      if (sym.isText) {
        const fontSize = pt.sid === 'bar' ? '8px' : pt.sid === 'seven' ? '16px' : '10px';
        const fontColor = pt.sid === 'bar' ? '#ffffff' : '#ff2222';
        this.add.text(cx, py + 31, sym.emoji, {
          fontSize, fontFamily: 'Arial Black', color: fontColor, fontStyle: 'bold',
          align: 'center',
        }).setOrigin(0.5);
      } else {
        this.add.text(cx, py + 31, sym.emoji, { fontSize: '14px' }).setOrigin(0.5);
      }

      // LED bet display
      const ledBg = this.add.graphics();
      ledBg.fillStyle(0x000000);
      ledBg.fillRect(10 + i * colW, py + 46, colW, 22);

      const ledTxt = this.add.text(cx, py + 57, '00', {
        fontSize: '13px', fontFamily: 'Courier New', color: '#550000', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.payLedTexts.push(ledTxt);
    });
  }

  updatePayLed(colIdx, val, isWin) {
    const txt = this.payLedTexts[colIdx];
    txt.setText(String(val).padStart(2, '0').slice(-2));
    if (isWin) {
      txt.setColor('#ff2200');
    } else if (val > 0) {
      txt.setColor('#ff8800');
    } else {
      txt.setColor('#550000');
    }
  }

  updateAllPayLeds() {
    for (let i = 0; i < 9; i++) {
      this.updatePayLed(i, this.bets[i], false);
    }
  }

  /* ===== Control Panel ===== */
  drawControlPanel() {
    const py = this.frameBottom + 76;
    this._autoBtnPy = py;
    const g = this.add.graphics();
    g.fillStyle(0x0a2a0a);
    g.fillRoundedRect(10, py, GAME_W - 20, 48, 4);

    // Total available: GAME_W - 28 = 392px; 6 gaps × 4px = 24px → 368px for 7 buttons
    const btns = [
      { label: '儲值',      w: 50, color: 0xc8b070, textColor: '#442200', action: 'addCredit' },
      { label: 'WIN→\nCR', w: 50, color: 0xd06010, textColor: '#ffffff', action: 'winCredit', fontSize: '9px' },
      { label: '左\n1-4',  w: 54, color: 0xd06010, textColor: '#ffffff', action: 'betLeft' },
      { label: 'DOUBLE\nIN BET', w: 44, color: null, textColor: '#ffee88', action: null, fontSize: '7px' },
      { label: '右\n6-9',  w: 54, color: 0xd06010, textColor: '#ffffff', action: 'betRight' },
      { label: 'AUTO',     w: 54, color: 0x2a2a2a, textColor: '#aaaaaa', action: 'auto', fontSize: '11px', id: 'autoBtn' },
      { label: '開始',     w: 62, color: 0x1030c0, textColor: '#ffffff', action: 'start' },
    ];

    let bx = 14;
    btns.forEach(btn => {
      if (btn.color !== null) {
        const btnG = this.add.graphics();
        btnG.fillStyle(btn.color);
        btnG.fillRoundedRect(bx, py + 4, btn.w, 40, 5);
        btnG.fillStyle(0x000000, 0.3);
        btnG.fillRoundedRect(bx, py + 40, btn.w, 4, { bl: 5, br: 5 });

        if (btn.id === 'autoBtn') { this.autoBtnGfx = btnG; this._autoBtnX = bx; }

        const zone = this.add.zone(bx + btn.w / 2, py + 24, btn.w, 40).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => this.onControlBtn(btn.action));
      }

      const txt = this.add.text(bx + btn.w / 2, py + 24, btn.label, {
        fontSize: btn.fontSize || '12px', fontFamily: 'Arial Black',
        color: btn.textColor, fontStyle: 'bold', align: 'center',
        lineSpacing: -2,
      }).setOrigin(0.5);
      if (btn.id === 'autoBtn') this.autoBtnText = txt;

      bx += btn.w + 4;
    });
  }

  onControlBtn(action) {
    this.playClick();
    switch (action) {
      case 'leave':
        if (this.spinning) return;
        this.clearBets();
        const total = this.credits;
        this.credits = 0;
        this.updateCreditDisplay();
        this.showMsg('兌換 ' + total + ' 分！謝謝光臨！');
        this.time.delayedCall(2500, () => {
          this.credits = 100;
          this.updateCreditDisplay();
          this.showMsg('已投幣 100 分！');
        });
        break;
      case 'addCredit':
        if (this.spinning) return;
        this.credits += 100;
        this.updateCreditDisplay();
        this.playCoin();
        this.showMsg('儲值 +100 分！');
        break;
      case 'winCredit':
        this.transferWinToCredit();
        break;
      case 'betLeft':
        if (this.spinning) return;
        for (let i = 0; i <= 3; i++) {
          if (this.credits <= 0) break;
          this.credits--;
          this.bets[i]++;
        }
        this.updateCreditDisplay();
        this.updateAllPayLeds();
        this.showMsg('左注：押 🍎🍉⭐7 各1分');
        break;
      case 'betRight':
        if (this.spinning) return;
        for (let i = 5; i <= 8; i++) {
          if (this.credits <= 0) break;
          this.credits--;
          this.bets[i]++;
        }
        this.updateCreditDisplay();
        this.updateAllPayLeds();
        this.showMsg('右注：押 🔔🍇🍊🍒 各1分');
        break;
      case 'start':
        this.startSpin();
        break;
      case 'auto':
        this.toggleAuto();
        break;
    }
  }

  toggleAuto() {
    if (this.autoPlay) {
      // Turn off — current spin finishes, next one won't start
      this.autoPlay = false;
      this._setAutoBtnStyle(false);
      if (!this.spinning) this.showMsg('AUTO 已停止');
      return;
    }
    if (this.spinning) return; // can only turn ON when not spinning
    if (!this.bets.some(b => b > 0)) {
      this.playError();
      this.showMsg('請先下注再開啟AUTO！');
      return;
    }
    this.autoBetPattern = [...this.bets];
    this.autoPlay = true;
    this._setAutoBtnStyle(true);
    this.startSpin();
  }

  _setAutoBtnStyle(active) {
    if (!this.autoBtnGfx) return;
    const w = 54; // matches btn w in drawControlPanel
    this.autoBtnGfx.clear();
    if (active) {
      this.autoBtnGfx.fillStyle(0x009933);
      this.autoBtnGfx.fillRoundedRect(this._autoBtnX, this._autoBtnPy + 4, w, 40, 5);
      this.autoBtnGfx.fillStyle(0x000000, 0.2);
      this.autoBtnGfx.fillRoundedRect(this._autoBtnX, this._autoBtnPy + 40, w, 4, { bl: 5, br: 5 });
      this.autoBtnText && this.autoBtnText.setColor('#ffffff');
    } else {
      this.autoBtnGfx.fillStyle(0x2a2a2a);
      this.autoBtnGfx.fillRoundedRect(this._autoBtnX, this._autoBtnPy + 4, w, 40, 5);
      this.autoBtnGfx.fillStyle(0x000000, 0.3);
      this.autoBtnGfx.fillRoundedRect(this._autoBtnX, this._autoBtnPy + 40, w, 4, { bl: 5, br: 5 });
      this.autoBtnText && this.autoBtnText.setColor('#aaaaaa');
    }
  }

  /* ===== Action Buttons (1-9) ===== */
  drawActionButtons() {
    const py = this.frameBottom + 132;
    const btnW = (GAME_W - 28) / 9;

    // Symbol row
    const symG = this.add.graphics();
    symG.fillStyle(0xf5efe0);
    symG.fillRect(10, py, GAME_W - 20, 28);
    symG.lineStyle(2, 0x999999);
    symG.strokeRect(10, py, GAME_W - 20, 28);

    PAYTABLE.forEach((pt, i) => {
      const cx = 14 + i * btnW + btnW / 2;
      const sym = SYM_DEF[pt.sid];

      // Separator
      if (i > 0) {
        symG.lineStyle(1, 0xcccccc);
        symG.lineBetween(14 + i * btnW, py, 14 + i * btnW, py + 28);
      }

      if (sym.isText) {
        const fs = pt.sid === 'bar' ? '7px' : pt.sid === 'seven' ? '16px' : '10px';
        const fc = pt.sid === 'bar' ? '#ffffff' : '#ff2222';
        if (pt.sid === 'bar') {
          const barBg = this.add.graphics();
          barBg.fillStyle(0x880000);
          barBg.fillRect(14 + i * btnW, py, btnW, 28);
        }
        this.add.text(cx, py + 14, sym.emoji, {
          fontSize: fs, fontFamily: 'Arial Black', color: fc, fontStyle: 'bold', align: 'center',
        }).setOrigin(0.5);
      } else {
        this.add.text(cx, py + 14, sym.emoji, { fontSize: '14px' }).setOrigin(0.5);
      }
    });

    // Button row
    const btnY = py + 32;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x222222);
    btnBg.fillRoundedRect(10, btnY, GAME_W - 20, 48, { bl: 4, br: 4 });

    this.actionBtnGraphics = [];

    for (let i = 0; i < 9; i++) {
      const bx = 14 + i * btnW + 2;
      const bw = btnW - 4;

      // Button
      const btnG = this.add.graphics();
      btnG.fillStyle(0xe0e0e0);
      btnG.fillRoundedRect(bx, btnY + 4, bw, 38, 4);
      // Top highlight
      btnG.fillStyle(0xf4f4f4);
      btnG.fillRoundedRect(bx + 2, btnY + 6, bw - 4, 16, 3);
      // Shadow
      btnG.fillStyle(0x666666);
      btnG.fillRoundedRect(bx, btnY + 38, bw, 4, { bl: 4, br: 4 });
      this.actionBtnGraphics.push(btnG);

      // Number label
      this.add.text(bx + bw / 2, btnY + 22, String(i + 1), {
        fontSize: '14px', fontFamily: 'Arial Black', color: '#555555',
      }).setOrigin(0.5);

      // Interactive zone
      const zone = this.add.zone(bx + bw / 2, btnY + 22, bw, 38).setInteractive({ useHandCursor: true });
      const colIdx = i;
      zone.on('pointerdown', () => this.onBetBtn(colIdx));
    }
  }

  onBetBtn(colIdx) {
    this.playClick();
    if (this.spinning) return;
    if (this.credits <= 0) {
      this.playError();
      this.shakeCredit();
      return;
    }
    this.credits--;
    this.bets[colIdx]++;
    this.updateCreditDisplay();
    this.updatePayLed(colIdx, this.bets[colIdx], false);

    // Flash feedback
    const btnG = this.actionBtnGraphics[colIdx];
    this.tweens.add({
      targets: btnG, alpha: 0.5, duration: 80, yoyo: true,
    });
  }

  clearBets() {
    this.bets.fill(0);
    this.updateAllPayLeds();
  }

  /* ===== Coin Tray ===== */
  drawCoinTray() {
    const g = this.add.graphics();
    const ty = this.frameBottom + 218;
    g.fillStyle(0xaaaaaa);
    g.fillRoundedRect(30, ty, GAME_W - 60, 26, { bl: 8, br: 8 });
    g.fillStyle(0x888888);
    g.fillRoundedRect(38, ty + 4, GAME_W - 76, 18, { bl: 6, br: 6 });
  }

  /* ===== Idle Lights ===== */
  startIdleLights() {
    this.idlePhase = 0;
    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        if (this.spinning) return;
        this.idlePhase = (this.idlePhase + 1) % BORDER_LEN;
        this.tileLeds.forEach((led, i) => {
          led.clear();
          const isLit = (i === this.idlePhase || i === (this.idlePhase + 12) % BORDER_LEN);
          led.fillStyle(isLit ? 0xcc3300 : 0x660000);
          const pos = this.tiles[i];
          led.fillCircle(pos.x + pos.w - 4, pos.y + pos.h - 4, 3);
        });
      },
    });
  }

  /* ===== Spin Logic ===== */
  startSpin() {
    if (this.spinning) return;

    if (!this.freeSpinPending) {
      if (!this.bets.some(b => b > 0)) {
        this.playError();
        this.showMsg('請先下注！');
        return;
      }
    }

    this.spinning = true;
    this.freeSpinPending = false;
    this.gameMsgText.setText('');
    this.playSpinStart();
    // Start card spin animation
    if (this.centerSymText) {
      this.tweens.killTweensOf(this.centerSymText);
      this.centerSymTween = this.tweens.add({
        targets: this.centerSymText, scaleY: 0.15, duration: 45, yoyo: true, repeat: -1,
      });
      this._drawReelCard(this._centerCardX, this._centerCardY, this._centerCardW, this._centerCardH, false);
    }

    const finalPos = this.pickStopPosition();
    const minLoops = 2;
    const baseSteps = minLoops * BORDER_LEN;
    const stepsToTarget = (finalPos - this.chasePos + BORDER_LEN) % BORDER_LEN;
    const totalSteps = baseSteps + stepsToTarget + Phaser.Math.Between(0, BORDER_LEN - 1);

    let step = 0;
    const startInterval = 35;
    const endInterval = 300;

    const doStep = () => {
      this.chasePos = (this.chasePos + 1) % BORDER_LEN;
      step++;
      this.setChaseHighlight(this.chasePos);
      this.updateCenterSymbol(BORDER[this.chasePos]);
      this.playTick();

      if (step >= totalSteps) {
        this.onChaseStopped(this.chasePos);
        return;
      }

      const progress = step / totalSteps;
      const ease = progress * progress;
      const interval = startInterval + (endInterval - startInterval) * ease;

      this.chaseTimer = this.time.delayedCall(interval, doStep);
    };

    this.chaseTimer = this.time.delayedCall(startInterval, doStep);
  }

  pickStopPosition() {
    const weights = BORDER.map(sym => {
      if (sym === 'once') return 3;
      if (sym === 'bar') return 1;
      if (sym === 'seven') return 1;
      if (sym === 'star') return 2;
      return 5;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < BORDER_LEN; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return 0;
  }

  onChaseStopped(pos) {
    this.spinning = false;
    this.clearChaseHighlight();

    // Stop card spin tween
    if (this.centerSymTween) { this.centerSymTween.stop(); this.centerSymTween = null; }
    if (this.centerSymText) { this.centerSymText.setScale(1); }

    // Winning tile flash
    const t = this.tiles[pos];
    this.winFlashTween = this.tweens.add({
      targets: { alpha: 0 }, alpha: 1, duration: 300, yoyo: true, repeat: -1,
      onUpdate: (tween) => {
        this.chaseHighlight.clear();
        this.chaseHighlight.fillStyle(0xffee44, tween.getValue() * 0.7);
        this.chaseHighlight.fillRect(t.x, t.y, t.w, t.h);
      },
    });

    this.playReelStop();
    const landedSym = BORDER[pos];
    this.updateCenterSymbol(landedSym);

    // ONCE MORE
    if (landedSym === 'once') {
      this._drawReelCard(this._centerCardX, this._centerCardY, this._centerCardW, this._centerCardH, true);
      this.showMsg('★ ONCE MORE! ★', 0);
      this.cameras.main.flash(500, 255, 255, 100);
      this.time.delayedCall(2000, () => {
        this.stopWinFlash();
        this._drawReelCard(this._centerCardX, this._centerCardY, this._centerCardW, this._centerCardH, false);
        this.freeSpinPending = true;
        this.showMsg('免費再轉一次！按開始', 0);
        if (this.autoPlay) this.time.delayedCall(1200, () => this.startSpin());
      });
      return;
    }

    // Evaluate wins
    let totalWin = 0;
    let isJackpot = false;

    for (let i = 0; i < 9; i++) {
      if (this.bets[i] > 0 && PAYTABLE[i].sid === landedSym) {
        const win = this.bets[i] * PAYTABLE[i].mult;
        totalWin += win;
        this.updatePayLed(i, PAYTABLE[i].mult, true);
        if (i === 4) isJackpot = true;
      }
    }

    if (totalWin > 0) {
      // Accumulate in WIN pool
      this.winPool += totalWin;
      this.updateWinDisplay();
      this._drawReelCard(this._centerCardX, this._centerCardY, this._centerCardW, this._centerCardH, true);

      if (isJackpot) {
        this.showMsg('🎰 JACKPOT!! +' + totalWin + ' 🎰', 0);
        this.cameras.main.flash(1000, 255, 200, 0);
        this.playJackpot();
      } else {
        this.showMsg('★ WIN! +' + totalWin + ' ★', 0);
        this.cameras.main.flash(500, 255, 255, 100);
        this.playWin();
      }
    } else {
      this.showMsg('再試一次！');
    }

    const delay = totalWin > 0 ? 3000 : 1500;
    this.time.delayedCall(delay, () => {
      this.stopWinFlash();
      this._drawReelCard(this._centerCardX, this._centerCardY, this._centerCardW, this._centerCardH, false);
      this.clearBets();
      this.gameMsgText.setText('');
      this.updateCenterSymbol(null);

      if (this.autoPlay) {
        const totalBet = this.autoBetPattern.reduce((a, b) => a + b, 0);
        if (totalBet <= 0 || this.credits < totalBet) {
          this.autoPlay = false;
          this._setAutoBtnStyle(false);
          if (totalBet > 0) this.showMsg('餘額不足，AUTO停止');
        } else {
          for (let i = 0; i < 9; i++) this.bets[i] = this.autoBetPattern[i];
          this.credits -= totalBet;
          this.updateCreditDisplay();
          this.updateAllPayLeds();
          this.gameMsgText.setText('');
          this.startSpin();
        }
      }
    });
  }

  stopWinFlash() {
    if (this.winFlashTween) {
      this.winFlashTween.stop();
      this.winFlashTween = null;
    }
    this.clearChaseHighlight();
  }

  shakeCredit() {
    this.tweens.add({
      targets: this.creditText, x: this.creditText.x - 3,
      duration: 50, yoyo: true, repeat: 2,
    });
  }

  /* ===== Audio (Web Audio API) ===== */
  initAudio() {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.audioCtx.destination);
  }

  _osc(type, freq, start, dur, gain = 0.3, endGain = 0.0001) {
    if (!this.audioCtx) return;
    const g = this.audioCtx.createGain();
    g.connect(this.masterGain);
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(Math.max(endGain, 0.0001), start + dur);
    const o = this.audioCtx.createOscillator();
    o.type = type; o.frequency.value = freq; o.connect(g);
    o.start(start); o.stop(start + dur + 0.01);
  }

  _noise(start, dur, gain = 0.2) {
    if (!this.audioCtx) return;
    const bufLen = this.audioCtx.sampleRate * dur;
    const buf = this.audioCtx.createBuffer(1, bufLen, this.audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = this.audioCtx.createBufferSource(); src.buffer = buf;
    const f = this.audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.8;
    const g = this.audioCtx.createGain(); g.gain.setValueAtTime(gain, start); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f); f.connect(g); g.connect(this.masterGain); src.start(start); src.stop(start + dur + 0.01);
  }

  _ensureAudio() {
    this.initAudio();
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
  }

  playClick() {
    this._ensureAudio();
    const t = this.audioCtx.currentTime;
    this._osc('sine', 1600, t, 0.02, 0.25);
    this._osc('sine', 800, t + 0.01, 0.03, 0.15);
    this._osc('triangle', 300, t + 0.02, 0.03, 0.1);
    this._noise(t, 0.02, 0.08);
  }

  playCoin() {
    this._ensureAudio();
    const t = this.audioCtx.currentTime;
    this._osc('sine', 1200, t, 0.05, 0.4);
    this._osc('sine', 900, t + 0.02, 0.08, 0.25);
    this._osc('sine', 600, t + 0.04, 0.12, 0.2);
    this._noise(t, 0.04, 0.15);
  }

  playSpinStart() {
    this._ensureAudio();
    const t = this.audioCtx.currentTime;
    this._osc('sawtooth', 80, t, 0.3, 0.3);
    this._osc('sawtooth', 120, t + 0.05, 0.25, 0.2);
    this._noise(t, 0.15, 0.08);
  }

  playTick() {
    this._ensureAudio();
    const t = this.audioCtx.currentTime;
    this._osc('sine', 1800, t, 0.025, 0.2);
    this._osc('sine', 1200, t, 0.02, 0.1);
    this._osc('triangle', 3000, t, 0.015, 0.08);
  }

  playReelStop() {
    this._ensureAudio();
    const t = this.audioCtx.currentTime;
    this._osc('sine', 150, t, 0.08, 0.5);
    this._osc('sine', 80, t + 0.02, 0.1, 0.4);
    this._noise(t, 0.06, 0.25);
  }

  playWin() {
    this._ensureAudio();
    const t = this.audioCtx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => this._osc('sine', f, t + i * 0.1, 0.15, 0.35));
    this._osc('triangle', 261, t, 0.4, 0.2);
  }

  playJackpot() {
    this._ensureAudio();
    const t = this.audioCtx.currentTime;
    [261, 329, 392, 523, 659, 784, 1047, 1319].forEach((f, i) => {
      this._osc('sine', f, t + i * 0.08, 0.2, 0.5);
      this._osc('triangle', f * 2, t + i * 0.08, 0.2, 0.15);
    });
    [523, 659, 784, 1047].forEach(f => this._osc('sine', f, t + 0.8, 1.2, 0.3));
  }

  playError() {
    this._ensureAudio();
    const t = this.audioCtx.currentTime;
    this._osc('square', 200, t, 0.1, 0.25);
    this._osc('square', 150, t + 0.1, 0.1, 0.25);
  }
}

/* ===== Phaser Config ===== */
const config = {
  type: Phaser.AUTO,          // prefers WebGL — sharper text rendering
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: 2,                  // canvas buffer = 840×1640 → 2× pixel density
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  scene: [GameScene],
  input: {
    keyboard: true,
  },
};

const game = new Phaser.Game(config);
