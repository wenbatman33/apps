// v4 標題頁：G_title 主視覺＋開戰
class TitleV4 extends Phaser.Scene {
  constructor() { super('TitleV4'); }

  create() {
    const W = LAYOUT_V4.W, H = LAYOUT_V4.H;
    const bg = this.add.image(W / 2, H / 2, 'bg_title');
    const s = Math.max(W / bg.width, H / bg.height);
    bg.setScale(s);

    this.add.text(W / 2, 1210, '防守特洛伊', {
      fontSize: '116px', fontStyle: 'bold', color: '#F2E9D2',
      stroke: '#1A140E', strokeThickness: 12,
    }).setOrigin(0.5);
    this.add.text(W / 2, 1310, '— 烈焰圍城 —', {
      fontSize: '44px', color: '#FFB020', stroke: '#1A140E', strokeThickness: 8,
    }).setOrigin(0.5);

    // 開戰按鈕
    const btn = this.add.container(W / 2, 1520);
    const bgR = this.add.rectangle(0, 0, 480, 140, 0xffb020).setStrokeStyle(6, 0xb97a10);
    const hi = this.add.rectangle(0, -32, 468, 64, 0xffd060);
    const label = this.add.text(0, 0, '⚔ 開 戰', { fontSize: '62px', fontStyle: 'bold', color: '#5E3A08' }).setOrigin(0.5);
    btn.add([bgR, hi, label]);
    bgR.setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: btn, scale: { from: 1, to: 1.04 }, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.inOut' });
    bgR.on('pointerdown', () => {
      this.tweens.add({
        targets: btn, scale: 0.94, yoyo: true, duration: 90,
        onComplete: () => this.scene.start('GameV4', { level: this.curLevel }),
      });
    });

    // 關卡選擇（通關解鎖）
    const save = JSON.parse(localStorage.troyV4 || '{}');
    const unlocked = save.unlocked || 0;
    this.curLevel = Math.min(unlocked, LEVELS_V4.length - 1);
    const info = this.add.text(W / 2, 1700, '', { fontSize: '30px', color: '#C9D4E4' }).setOrigin(0.5);
    const setInfo = () => {
      const d = LEVELS_V4[this.curLevel];
      let extra = '';
      if (d.endless && save.endlessBest) extra = `（最佳 ${save.endlessBest} 波）`;
      info.setText(d.name + extra + '｜' + d.story);
    };
    setInfo();
    LEVELS_V4.forEach((lvd, i) => {
      const x = W / 2 + (i - (LEVELS_V4.length - 1) / 2) * 150, y = 1630;
      const locked = i > unlocked;
      const c = this.add.circle(x, y, 46, locked ? 0x3a4152 : i <= unlocked - 1 ? 0xc9a227 : 0xff8a1a)
        .setStrokeStyle(5, locked ? 0x2a3040 : 0xffd060).setDepth(5);
      const tag = lvd.endless ? '∞' : String(i + 1);
      this.add.text(x, y, locked ? '🔒' : tag, { fontSize: '40px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5).setDepth(6);
      const st = save.stars && save.stars[i] ? '★'.repeat(save.stars[i]) : '';
      if (st) this.add.text(x, y - 62, st, { fontSize: '26px', color: '#FFD23C' }).setOrigin(0.5).setDepth(6);
      if (!locked) {
        c.setInteractive({ useHandCursor: true });
        c.on('pointerdown', () => { this.curLevel = i; setInfo(); });
      }
    });

    // 版本（連點 5 下開 DEV）
    const ver = this.add.text(W / 2, 1850, 'v4.0 M1 ·（連點 5 下開 DEV 工具）', { fontSize: '24px', color: '#7A8AA0' })
      .setOrigin(0.5).setInteractive();
    let taps = 0, timer = null;
    ver.on('pointerdown', () => {
      taps++;
      clearTimeout(timer); timer = setTimeout(() => taps = 0, 1500);
      if (taps >= 5) { taps = 0; window.DevV4 && DevV4.toggle(); }
    });
  }
}
