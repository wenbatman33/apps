// Ember & Slate 主選單 — 深色木紋 + 金色 serif
const S = window.__UI_SCALE__ || 1;     // HiDPI 縮放因子
const px = (n) => Math.round(n * S);    // 寫死像素值轉物理像素
const GOLD = '#d4a857';
const GOLD_HI = '#f0c878';
const INK = '#f4e8d0';
const MUTED = '#8a7560';
const AMBER = 0xff6a1a;
const SAPPHIRE = 0xe0e4f0;
const GOLD_HEX = 0xd4a857;

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  preload() {
    const v = '?v=' + (window.__BUILD__ || Date.now());
    this.load.image('bg_wood', 'assets/img/bg_wood.png' + v);
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.drawBackground(W, H);

    // 上下裝飾線 + 金色標題
    const titleSize = Math.round(Math.min(W * 0.13, H * 0.075, 64 * S));
    const titleY = H * 0.22;

    this.drawOrnamentLine(W / 2, titleY - titleSize * 0.85, Math.min(W * 0.55, 340 * S));

    const title = this.add.text(W / 2, titleY, 'DRAUGHTS', {
      fontFamily: '"Cinzel", "Cormorant Garamond", serif',
      fontSize: titleSize + 'px',
      fontStyle: '600',
      color: GOLD,
    }).setOrigin(0.5).setLetterSpacing(Math.round(titleSize * 0.18));
    title.setShadow(0, 0, '#ffcb6c', 18, true, true);

    const subSize = Math.round(Math.min(titleSize * 0.22, W * 0.035));
    this.add.text(W / 2, titleY + titleSize * 0.78, 'EMBER  ·  SLATE', {
      fontFamily: '"Cinzel", serif',
      fontSize: subSize + 'px',
      color: MUTED,
    }).setOrigin(0.5).setLetterSpacing(Math.max(2 * S, Math.round(subSize * 0.4)));

    this.drawOrnamentLine(W / 2, titleY + titleSize * 1.15, Math.min(W * 0.55, 340 * S));

    // 兩個玻璃感按鈕
    const btnW = Math.min(Math.max(W * 0.78, 200 * S), 360 * S);
    const btnH = Math.round(Math.min(H * 0.085, 76 * S));
    const gap = Math.round(btnH * 0.32);
    const startY = H * 0.50;

    this.makeJewelButton(W / 2, startY,           btnW, btnH, '對戰電腦 AI',     AMBER,    '⟁', () => {
      this.scene.start('Difficulty');
    });
    this.makeJewelButton(W / 2, startY + btnH + gap, btnW, btnH, '雙人對戰 · 同機', SAPPHIRE, '⟁', () => {
      this.scene.start('Game', { mode: 'pvp' });
    });

    // 底部 italic 提示
    const footY = H - Math.max(28 * S, H * 0.06);
    this.add.text(W / 2, footY, 'A timeless game of cunning, refined in ember and slate.', {
      fontFamily: '"Cormorant Garamond", serif',
      fontStyle: 'italic',
      fontSize: Math.round(Math.min(W * 0.032, 15 * S)) + 'px',
      color: MUTED,
    }).setOrigin(0.5);
  }

  drawBackground(W, H) {
    if (this.textures.exists('bg_wood')) {
      const bg = this.add.image(W / 2, H / 2, 'bg_wood');
      const tw = bg.width, th = bg.height;
      const scale = Math.max(W / tw, H / th);
      bg.setScale(scale);
    } else {
      // fallback：徑向漸層
      const g = this.add.graphics();
      g.fillStyle(0x14090a, 1).fillRect(0, 0, W, H);
      // 暖光暈
      for (let i = 0; i < 18; i++) {
        const r = (Math.min(W, H) * 0.6) * (1 - i / 18);
        g.fillStyle(0x4a2614, 0.05).fillCircle(W / 2, H * 0.25, r);
      }
    }
    // Vignette
    const v = this.add.graphics();
    v.fillStyle(0x000000, 0.55).fillRect(0, 0, W, H * 0.18);
    v.fillStyle(0x000000, 0.55).fillRect(0, H * 0.82, W, H * 0.18);
  }

  drawOrnamentLine(cx, y, length) {
    const g = this.add.graphics();
    const halfLen = length / 2;
    g.fillStyle(GOLD_HEX, 0.9);
    g.fillTriangle(cx, y - 4 * S, cx + 5 * S, y, cx, y + 4 * S);
    g.fillTriangle(cx, y - 4 * S, cx - 5 * S, y, cx, y + 4 * S);
    g.lineStyle(1 * S, GOLD_HEX, 0.7).beginPath();
    g.moveTo(cx + 10 * S, y); g.lineTo(cx + halfLen, y);
    g.moveTo(cx - 10 * S, y); g.lineTo(cx - halfLen, y);
    g.strokePath();
    g.fillStyle(GOLD_HEX, 0.7);
    g.fillCircle(cx + halfLen, y, 2 * S);
    g.fillCircle(cx - halfLen, y, 2 * S);
  }

  makeJewelButton(x, y, w, h, label, dotColor, glyph, onClick) {
    const g = this.add.graphics();
    const radius = 8 * S;
    const drawBtn = (hover) => {
      g.clear();
      g.fillStyle(0x1a0c0a, hover ? 0.85 : 0.7).fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
      g.lineStyle(1 * S, GOLD_HEX, hover ? 1 : 0.5).strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
      const corner = 10 * S;
      g.lineStyle(1.5 * S, GOLD_HEX, hover ? 1 : 0.7);
      const x1 = x - w / 2, x2 = x + w / 2, y1 = y - h / 2, y2 = y + h / 2;
      [[x1, y1, 1, 1], [x2, y1, -1, 1], [x1, y2, 1, -1], [x2, y2, -1, -1]].forEach(([cx, cy, dx, dy]) => {
        g.beginPath();
        g.moveTo(cx + dx * corner, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + dy * corner);
        g.strokePath();
      });
    };
    drawBtn(false);

    const dot = this.add.circle(x - w / 2 + 22 * S, y, 7 * S, dotColor);
    dot.setStrokeStyle(1 * S, 0xd4a857, 0.6);

    const fontPx = Math.round(Math.min(h * 0.35, w * 0.10));
    const t = this.add.text(x + 8 * S, y, label, {
      fontFamily: '"Cormorant Garamond", "PingFang TC", serif',
      fontSize: fontPx + 'px',
      fontStyle: '500',
      color: INK,
    }).setOrigin(0.5).setLetterSpacing(Math.max(1 * S, Math.round(fontPx * 0.1)));

    const arrow = this.add.text(x + w / 2 - 22 * S, y, '›', {
      fontFamily: 'serif', fontSize: Math.round(h * 0.55) + 'px', color: GOLD,
    }).setOrigin(0.5);

    const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { drawBtn(true); arrow.setColor(GOLD_HI); t.setColor('#fff7e0'); });
    hit.on('pointerout',  () => { drawBtn(false); arrow.setColor(GOLD); t.setColor(INK); });
    hit.on('pointerdown', onClick);
  }
}
