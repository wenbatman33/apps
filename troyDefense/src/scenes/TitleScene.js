/* v2 標題 — 燃燒的城門前選關 */
window.TD = window.TD || {};

TD.TitleScene = class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const W = TD.GAME_W, H = TD.GAME_H;
    this.add.rectangle(W / 2, H / 2, W, H, 0x14100C);
    this.fx = new TD.Fx(this);

    // 背景城門＋火光
    const gate = this.add.image(W / 2, H * 0.42, 'G_gate_1').setAlpha(0.95);
    gate.setScale(640 / gate.width);
    this.fx.flame(W / 2 - 210, H * 0.42 + 150, 1.3);
    this.fx.flame(W / 2 + 190, H * 0.42 + 170, 1.1);
    this.add.image(W / 2, H * 0.42, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setScale(6).setAlpha(0.5);

    this.add.text(W / 2, 200, '防守特洛伊', {
      fontFamily: TD.FONT, fontSize: '110px', color: TD.CSS.gold,
      stroke: TD.STROKE, strokeThickness: 12, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(W / 2, 300, '— 烈焰圍城 · TROY DEFENSE —', {
      fontFamily: TD.FONT, fontSize: '34px', color: TD.CSS.fire,
    }).setOrigin(0.5);

    // 選關
    const unlocked = TD.save.data.unlocked || 1;
    const names = { 1: '黑船臨岸', 2: '城下之圍', 3: '呂卡翁的哀嚎' };
    TD.LEVELS.forEach((lv, i) => {
      const y = H * 0.66 + i * 150;
      const open = lv.id <= unlocked;
      const stars = TD.save.starsOf(lv.id);
      const g = this.add.graphics();
      g.fillStyle(open ? 0x3A2410 : 0x241A10, 0.95).fillRoundedRect(W / 2 - 330, y - 58, 660, 116, 20);
      g.lineStyle(3, open ? TD.PALETTE.gold : TD.PALETTE.uiEdge, open ? 0.9 : 0.4)
        .strokeRoundedRect(W / 2 - 330, y - 58, 660, 116, 20);
      this.add.text(W / 2 - 290, y, `第${lv.id}年`, {
        fontFamily: TD.FONT, fontSize: '40px', color: open ? TD.CSS.gold : '#5A4A38', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      this.add.text(W / 2 - 110, y, open ? (names[lv.id] || lv.name) : '？？？', {
        fontFamily: TD.FONT, fontSize: '38px', color: open ? TD.CSS.marble : '#5A4A38',
      }).setOrigin(0, 0.5);
      this.add.text(W / 2 + 290, y, '★'.repeat(stars) + '☆'.repeat(3 - stars), {
        fontSize: '34px', color: TD.CSS.gold,
      }).setOrigin(1, 0.5);
      if (open) {
        const z = this.add.zone(W / 2, y, 660, 116).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => {
          TD.audio.init(); TD.audio.resume(); TD.audio.coin();
          this.scene.start('Game', { level: lv.id });
        });
      }
    });

    this.add.text(W / 2, H - 60, 'v2 烈焰圍城 · 按 D 開發者工具', {
      fontFamily: TD.FONT, fontSize: '24px', color: '#6A5A48',
    }).setOrigin(0.5);
  }

  update(t, dt) {
    this.fx.updateAmbient(this.time.now, dt);
  }
};
