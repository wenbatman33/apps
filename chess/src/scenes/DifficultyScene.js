const S = window.__UI_SCALE__ || 1;
const px = (n) => Math.round(n * S);
const GOLD = '#d4a857';
const GOLD_HI = '#f0c878';
const INK = '#f4e8d0';
const MUTED = '#8a7560';
const GOLD_HEX = 0xd4a857;

export default class DifficultyScene extends Phaser.Scene {
  constructor() { super('Difficulty'); }

  init(data) {
    this.firstPlayer = data?.firstPlayer || 1;  // 1=人先手 2=電腦先手
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.drawBackground(W, H);

    const titleSize = Math.round(Math.min(W * 0.075, H * 0.045, 38 * S));
    this.add.text(W / 2, H * 0.20, '選擇對手', {
      fontFamily: '"Cinzel", "PingFang TC", serif',
      fontSize: titleSize + 'px',
      color: GOLD,
    }).setOrigin(0.5).setLetterSpacing(Math.round(titleSize * 0.3));

    this.add.text(W / 2, H * 0.20 + titleSize, '挑一位與你旗鼓相當的棋手', {
      fontFamily: '"Cormorant Garamond", "PingFang TC", serif',
      fontStyle: 'italic',
      fontSize: Math.round(titleSize * 0.45) + 'px',
      color: MUTED,
    }).setOrigin(0.5);

    const opts = [
      { key: 'easy',   label: '初心',  subtitle: '三回合的展望',     tone: 0x6f9b6a },
      { key: 'normal', label: '守局',  subtitle: '五回合的盤算',     tone: 0xc78a3a },
      { key: 'hard',   label: '宗師',  subtitle: '七回合的算度',     tone: 0xb83c4a },
    ];

    const btnW = Math.min(Math.max(W * 0.78, 200 * S), 380 * S);
    const btnH = Math.round(Math.min(H * 0.10, 88 * S));
    const gap = Math.round(btnH * 0.25);
    const startY = H * 0.42;

    opts.forEach((opt, i) => {
      this.makeCard(W / 2, startY + (btnH + gap) * i, btnW, btnH, opt.label, opt.subtitle, opt.tone, () => {
        this.scene.start('Game', { mode: 'ai', difficulty: opt.key, firstPlayer: this.firstPlayer });
      });
    });

    // 返回
    this.makeBackButton(W / 2, H - Math.max(40 * S, H * 0.07));
  }

  drawBackground(W, H) {
    if (this.textures.exists('bg_wood')) {
      const bg = this.add.image(W / 2, H / 2, 'bg_wood');
      const scale = Math.max(W / bg.width, H / bg.height);
      bg.setScale(scale);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x14090a, 1).fillRect(0, 0, W, H);
    }
    const v = this.add.graphics();
    v.fillStyle(0x000000, 0.5).fillRect(0, 0, W, H * 0.15);
    v.fillStyle(0x000000, 0.5).fillRect(0, H * 0.85, W, H * 0.15);
  }

  makeCard(x, y, w, h, label, subtitle, tone, onClick) {
    const g = this.add.graphics();
    const r = 8 * S;
    const draw = (hover) => {
      g.clear();
      g.fillStyle(0x1a0c0a, hover ? 0.88 : 0.7).fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
      g.lineStyle(1 * S, GOLD_HEX, hover ? 1 : 0.45).strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
      g.fillStyle(tone, 0.85).fillRoundedRect(x - w / 2 + 1 * S, y - h / 2 + 1 * S, 4 * S, h - 2 * S, 2 * S);
    };
    draw(false);

    const labelText = this.add.text(x - w / 2 + 24 * S, y - h * 0.18, label, {
      fontFamily: '"Cinzel", "PingFang TC", serif',
      fontSize: Math.round(h * 0.30) + 'px',
      color: INK,
    }).setOrigin(0, 0.5).setLetterSpacing(4 * S);

    const sub = this.add.text(x - w / 2 + 24 * S, y + h * 0.22, subtitle, {
      fontFamily: '"Cormorant Garamond", "PingFang TC", serif',
      fontStyle: 'italic',
      fontSize: Math.round(h * 0.20) + 'px',
      color: MUTED,
    }).setOrigin(0, 0.5);

    const arrow = this.add.text(x + w / 2 - 22 * S, y, '›', {
      fontFamily: 'serif', fontSize: Math.round(h * 0.55) + 'px', color: GOLD,
    }).setOrigin(0.5);

    const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { draw(true); arrow.setColor(GOLD_HI); labelText.setColor('#fff7e0'); });
    hit.on('pointerout',  () => { draw(false); arrow.setColor(GOLD); labelText.setColor(INK); });
    hit.on('pointerdown', onClick);
  }

  makeBackButton(x, y) {
    const t = this.add.text(x, y, '‹  返回', {
      fontFamily: '"Cormorant Garamond", "PingFang TC", serif',
      fontStyle: 'italic',
      fontSize: px(18) + 'px',
      color: MUTED,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setColor(GOLD));
    t.on('pointerout', () => t.setColor(MUTED));
    t.on('pointerdown', () => this.scene.start('Menu'));
  }
}
