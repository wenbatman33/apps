// 主選單 — 純素材 + canvas 文字
import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import { clearSave } from '../utils/SaveManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const cx = GAME_WIDTH / 2;

    // 背景
    const bg = this.add.image(cx, GAME_HEIGHT / 2, 'ld_bg');
    bg.setScale(Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height));

    // 標題
    this.add.image(cx, 200, 'ld_title_bg').setScale(0.5);
    this.add.image(cx, 200, 'ld_title').setScale(0.5);

    // cover box(放於下半部)
    const BOX_Y = 670;
    this.add.image(cx, BOX_Y, 'ld_box').setScale(0.55);

    // START GAME 按鈕(置中於 cover box)
    const playBtn = this.add.image(cx, BOX_Y, 'ld_play').setScale(0.6).setInteractive({ useHandCursor: true });
    const playLbl = this.add.text(cx, BOX_Y - 4, 'START GAME', {
      fontFamily: 'AlfaSlabOne, Arial Black, Arial', fontSize: '30px',
      color: '#ffffff', stroke: '#5b3b00', strokeThickness: 5
    }).setOrigin(0.5);
    playBtn.on('pointerdown', () => { playBtn.setTexture('ld_play_p'); playLbl.setY(BOX_Y); });
    playBtn.on('pointerout',  () => { playBtn.setTexture('ld_play');   playLbl.setY(BOX_Y - 4); });
    playBtn.on('pointerup', () => {
      playBtn.setTexture('ld_play'); playLbl.setY(BOX_Y - 4);
      this.scene.start('Game');
    });

    // 清除存檔(右上)
    const clr = this.add.text(GAME_WIDTH - 12, 12, '清除存檔', {
      fontFamily: 'NotoTC, Arial', fontSize: '16px', color: '#ffffff',
      backgroundColor: '#00000088', padding: { x: 8, y: 4 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    clr.on('pointerup', () => {
      clearSave();
      this.cameras.main.flash(200, 255, 80, 80);
    });
  }
}
