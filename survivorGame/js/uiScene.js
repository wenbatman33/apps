// HUD：HP、等級、XP 條、計時、擊殺數（全 Phaser 繪製）
class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  init(data) { this.gameRef = data.game; }

  create() {
    const { width: W } = this.scale.gameSize;

    // 頂部 HP 條
    this.hpBarBg = this.add.rectangle(W / 2, 26, W - 40, 18, 0x000000, 0.5)
      .setStrokeStyle(1, 0x333344);
    this.hpBar = this.add.rectangle(20, 26, W - 40, 14, 0xff5577).setOrigin(0, 0.5);
    this.hpText = this.add.text(W / 2, 26, '100 / 100', {
      fontSize: '12px', color: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5);

    // XP 條
    this.xpBarBg = this.add.rectangle(W / 2, 48, W - 40, 10, 0x000000, 0.5)
      .setStrokeStyle(1, 0x333344);
    this.xpBar = this.add.rectangle(20, 48, 0, 6, 0x77ff77).setOrigin(0, 0.5);

    // 等級
    this.lvText = this.add.text(12, 66, 'Lv.1', {
      fontSize: '16px', color: '#ffd84d', fontStyle: 'bold'
    });

    // 時間
    this.timeText = this.add.text(W - 12, 66, '00:00', {
      fontSize: '16px', color: '#fff'
    }).setOrigin(1, 0);
  }

  update() {
    const p = this.gameRef.player;
    if (!p) return;
    const W = this.scale.gameSize.width;
    const barW = W - 40;

    // HP
    const hpPct = Math.max(0, p.hp / p.maxHp);
    this.hpBar.width = barW * hpPct;
    this.hpText.setText(`${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`);

    // XP
    this.xpBar.width = barW * (p.xp / p.xpNext);
    this.lvText.setText(`Lv.${p.level}`);

    // Time
    const sec = Math.floor(this.gameRef.elapsed / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    this.timeText.setText(`${mm}:${ss}`);
  }
}
