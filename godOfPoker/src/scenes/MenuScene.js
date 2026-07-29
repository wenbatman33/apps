// 主菜單：金綠賭場質感 — 書法標題 / 金環人物章 / 名牌膠囊 / 漸層按鈕
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const W = GAME_W, H = GAME_H;
    this.add.image(W / 2, H / 2, 'bg');

    // ---- 標題區 ----
    const deco = this.add.graphics();
    deco.lineStyle(1, COLORS.gold, 0.55);
    deco.lineBetween(W / 2 - 250, 96, W / 2 + 250, 96);
    this.add.text(W / 2, 96, '♠ ♥ ♦ ♣', {
      fontFamily: 'serif', fontSize: '22px', color: '#caa23f', backgroundColor: COLORS.bgLight, padding: { x: 16, y: 2 },
    }).setOrigin(0.5);

    const title = this.add.text(W / 2, 182, '賭 神 撲 克', {
      fontFamily: FONT_TITLE, fontSize: '88px', color: '#f3d27a', fontStyle: 'bold',
    }).setOrigin(0.5);
    title.setShadow(0, 6, 'rgba(0,0,0,0.55)', 14);
    this.add.text(W / 2, 258, 'GOD OF POKER · 德州撲克', {
      fontFamily: FONT_UI, fontSize: '22px', color: '#8ba79b', letterSpacing: 4,
    }).setOrigin(0.5);
    deco.lineBetween(W / 2 - 250, 300, W / 2 + 250, 300);

    // ---- 四位對手（2x2 金環章）----
    const chars = [
      { key: 'char_dushen_toon', name: '賭神', stars: '★★★', desc: '深不可測' },
      { key: 'char_duxia_toon', name: '賭俠', stars: '★★', desc: '穩健老練' },
      { key: 'char_long5_toon', name: '龍五', stars: '★★', desc: '沉默是金' },
      { key: 'char_dusheng_toon', name: '賭聖', stars: '★', desc: '特異功能?' },
    ];
    const cx = [185, 535, 185, 535];
    const cy = [432, 432, 704, 704];
    chars.forEach((c, i) => {
      const x = cx[i], y = cy[i];
      // 底影 + 金色雙環
      this.add.circle(x, y + 4, 88, 0x000000, 0.35);
      this.add.circle(x, y, 86, 0x143c2f);
      if (this.textures.exists(c.key)) {
        const img = this.add.image(x, y, c.key).setDisplaySize(168, 168);
        const maskG = this.make.graphics().fillCircle(x, y, 84);
        img.setMask(maskG.createGeometryMask());
      } else {
        this.add.text(x, y, c.name[0], { fontFamily: FONT_TITLE, fontSize: '60px', color: '#e8c766', fontStyle: 'bold' }).setOrigin(0.5);
      }
      this.add.circle(x, y, 85, 0x000000, 0).setStrokeStyle(4, 0x0a1812, 0.9);
      this.add.circle(x, y, 88, 0x000000, 0).setStrokeStyle(1.6, COLORS.gold, 0.85);
      // 名牌膠囊
      const g = this.add.graphics();
      g.fillStyle(0x0c1a14, 0.85).fillRoundedRect(x - 78, y + 98, 156, 62, 14);
      g.lineStyle(1.2, COLORS.gold, 0.35).strokeRoundedRect(x - 78, y + 98, 156, 62, 14);
      this.add.text(x, y + 114, c.name, {
        fontFamily: FONT_UI, fontSize: '25px', color: '#f2f6f0', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(x, y + 142, `${c.stars}  ${c.desc}`, {
        fontFamily: FONT_UI, fontSize: '16px', color: '#caa23f',
      }).setOrigin(0.5);
    });

    // ---- 規則說明 ----
    this.add.text(W / 2, 928, `你將以 $${RULES.startChips.toLocaleString()} 挑戰四大高手（每人同額）`, {
      fontFamily: FONT_UI, fontSize: '22px', color: '#c8d8d0',
    }).setOrigin(0.5);
    this.add.text(W / 2, 964, `盲注 ${RULES.smallBlind}/${RULES.bigBlind} ・ 把所有人打到破產就是你的勝利`, {
      fontFamily: FONT_UI, fontSize: '19px', color: '#7d998c',
    }).setOrigin(0.5);

    // ---- 開始按鈕 ----
    const btnKey = makeBtnTexture(this, 'gold', 340, 92);
    const btn = this.add.container(W / 2, 1074);
    btn.add(this.add.image(0, 0, btnKey).setDisplaySize(368, 120));
    btn.add(this.add.text(0, 0, '開 始 對 戰', {
      fontFamily: FONT_UI, fontSize: '38px', color: '#33240a', fontStyle: 'bold',
    }).setOrigin(0.5));
    btn.setSize(340, 92).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      Sound.chip();
      this.tweens.add({ targets: btn, scale: 0.95, duration: 70, yoyo: true, onComplete: () => this.scene.start('Game') });
    });

  }
}
