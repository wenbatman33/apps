/**
 * PopupScene — Stage Clear / Game Over / Settings
 */
class PopupScene extends Phaser.Scene {
  constructor() { super('Popup'); }
  init(data) { this.data = data || {}; }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setInteractive();

    const type = this.data.type;
    if (type === 'stage-clear') this.buildStageClear(W, H);
    else if (type === 'game-over') this.buildGameOver(W, H);
    else if (type === 'settings') this.buildSettings(W, H);
    else this.close();

    this.cameras.main.fadeIn(180, 0, 0, 0);
  }

  close(skipCallback) {
    if (!skipCallback && this.data.onClose) this.data.onClose();
    this.scene.stop();
  }

  buildStageClear(W, H) {
    this.add.image(W / 2, H * 0.45, 'wc-box').setScale((W * 0.78) / 800);
    this.add.text(W / 2, H * 0.27, `STAGE ${this.data.stage}`, {
      fontFamily: 'AlfaSlabOne, Arial', fontSize: 26, color: '#fff7c2', stroke: '#3a2400', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.32, 'CLEARED!', {
      fontFamily: 'AlfaSlabOne, Arial', fontSize: 36, color: '#6cf08a', stroke: '#003a10', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.image(W / 2, H * 0.46, 'wc-coin1').setScale((W * 0.5) / 600);
    this.add.text(W / 2, H * 0.46, '+ ' + this.data.coins, {
      fontFamily: 'AlfaSlabOne, Arial', fontSize: 36, color: '#fff7c2', stroke: '#3a2400', strokeThickness: 5,
    }).setOrigin(0.5);

    const cont = this.add.image(W / 2, H * 0.66, 'wc-btn').setInteractive({ useHandCursor: true });
    const s = (W * 0.5) / cont.width; cont.setScale(s);
    this.add.text(cont.x, cont.y, 'NEXT STAGE', {
      fontFamily: 'PassionOne, Arial', fontSize: 24, color: '#fff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    cont.on('pointerdown', () => { cont.setTexture('wc-btn-p').setScale(s); MSAudio.sfx.click(); });
    cont.on('pointerup', () => this.close());
  }

  buildGameOver(W, H) {
    this.add.image(W / 2, H * 0.45, 'wc-box').setScale((W * 0.78) / 800);
    this.add.text(W / 2, H * 0.30, 'GAME OVER', {
      fontFamily: 'AlfaSlabOne, Arial', fontSize: 38, color: '#ff8866', stroke: '#3a0d00', strokeThickness: 6,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.42, `達到 STAGE ${this.data.stage}`, {
      fontFamily: 'PassionOne, Arial', fontSize: 26, color: '#fff7c2',
    }).setOrigin(0.5);

    const cont = this.add.image(W / 2, H * 0.66, 'wc-btn').setInteractive({ useHandCursor: true });
    const s = (W * 0.5) / cont.width; cont.setScale(s);
    this.add.text(cont.x, cont.y, 'RETRY', {
      fontFamily: 'PassionOne, Arial', fontSize: 28, color: '#fff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    cont.on('pointerdown', () => { cont.setTexture('wc-btn-p').setScale(s); MSAudio.sfx.click(); });
    cont.on('pointerup', () => this.close());
  }

  buildSettings(W, H) {
    this.add.image(W / 2, H / 2, 'sp-box').setScale((W * 0.85) / 900);
    this.add.text(W / 2, H * 0.30, 'SETTINGS', {
      fontFamily: 'AlfaSlabOne, Arial', fontSize: 32, color: '#fff7c2', stroke: '#3a2400', strokeThickness: 5,
    }).setOrigin(0.5);

    const close = this.add.image(W * 0.85, H * 0.27, 'sp-close').setInteractive({ useHandCursor: true });
    close.setScale((W * 0.10) / Math.max(close.width, close.height));
    close.on('pointerup', () => this.close(true));

    // 重置存檔
    const reset = this.add.image(W / 2, H * 0.50, 'sp-btn').setInteractive({ useHandCursor: true });
    reset.setScale((W * 0.5) / reset.width);
    this.add.text(reset.x, reset.y, '重置存檔', {
      fontFamily: 'PassionOne, Arial', fontSize: 24, color: '#fff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    reset.on('pointerup', () => {
      MSSave.reset();
      MSAudio.sfx.click();
      window.location.reload();
    });

    const back = this.add.image(W / 2, H * 0.65, 'wc-btn').setInteractive({ useHandCursor: true });
    back.setScale((W * 0.5) / back.width);
    this.add.text(back.x, back.y, '繼續', {
      fontFamily: 'PassionOne, Arial', fontSize: 24, color: '#fff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    back.on('pointerup', () => this.close(true));
  }
}
