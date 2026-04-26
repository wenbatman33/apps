/**
 * LandingScene — 開場畫面（依素材設計圖）：
 *   1. 遊戲場景（GameScene + UIScene）已經在背景跑
 *   2. 上面疊一層半透明遮罩
 *   3. 中央彈出 cover-box 含 MERGE SHOOTER 標題、START GAME、F/G/訪客
 *   4. 玩家按 START GAME → 關閉這層 overlay，遊戲繼續
 */
class LandingScene extends Phaser.Scene {
  constructor() { super('Landing'); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    // 啟動底層 Game/UI（讓背景顯示遊戲畫面）
    if (!this.scene.isActive('Game')) {
      this.scene.launch('Game');
      this.scene.launch('UI');
      this.scene.bringToTop('Landing');
    }

    // 半透明遮罩
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x1a1538, 0.55).setInteractive();

    // 中央 cover box
    const box = this.add.image(W / 2, H * 0.5, 'cover-box');
    const boxScale = (W * 0.78) / box.width;
    box.setScale(boxScale);

    // 標題（疊在 box 上方）
    const titleBg = this.add.image(W / 2, H * 0.30, 'game-title-bg');
    titleBg.setScale((W * 0.7) / titleBg.width);
    const title = this.add.image(W / 2, H * 0.30, 'game-title');
    title.setScale((W * 0.7) / title.width);
    this.tweens.add({ targets: [title], y: H * 0.30 - 6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // START GAME 按鈕
    const startBtn = this.add.image(W / 2, H * 0.5, 'start-btn').setInteractive({ useHandCursor: true });
    const sScale = (W * 0.5) / startBtn.width;
    startBtn.setScale(sScale);
    startBtn.on('pointerdown', () => { startBtn.setTexture('start-btn-pressed').setScale(sScale); MSAudio.ensureCtx(); MSAudio.sfx.click(); });
    startBtn.on('pointerup', () => {
      startBtn.setTexture('start-btn').setScale(sScale);
      MSAudio.startBgm();
      this.cameras.main.fadeOut(220, 0, 0, 0);
      this.time.delayedCall(240, () => {
        this.scene.stop('Landing');
      });
    });
    startBtn.on('pointerout', () => startBtn.setTexture('start-btn').setScale(sScale));

    // LOGIN 標題
    this.add.text(W / 2, H * 0.6, 'LOGIN', {
      fontFamily: 'AlfaSlabOne, Arial', fontSize: 22, color: '#3a2a76',
    }).setOrigin(0.5);

    // F / G / 訪客 三鈕
    const loginY = H * 0.66;
    const fb = this.add.image(W * 0.36, loginY, 'fb-btn').setInteractive({ useHandCursor: true });
    fb.setScale((W * 0.18) / fb.width);
    fb.on('pointerup', () => MSAudio.sfx.click());

    const gg = this.add.image(W * 0.5, loginY, 'google-btn').setInteractive({ useHandCursor: true });
    gg.setScale((W * 0.18) / gg.width);
    gg.on('pointerup', () => MSAudio.sfx.click());

    const guest = this.add.image(W * 0.64, loginY, 'guest-btn').setInteractive({ useHandCursor: true });
    guest.setScale((W * 0.18) / guest.width);
    guest.on('pointerdown', () => guest.setTexture('guest-btn-pressed').setScale((W * 0.18) / guest.width));
    guest.on('pointerup', () => guest.setTexture('guest-btn').setScale((W * 0.18) / guest.width));

    this.cameras.main.fadeIn(280, 0, 0, 0);
  }
}
