// 載入所有資源 + loading 畫面
import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';

const A = 'assets';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // loading 進度條(只是兩個 rect,結束後就 destroy,非 DOM)
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const bg = this.add.rectangle(cx, cy, 360, 16, 0x202840).setStrokeStyle(2, 0x4060ff);
    const fg = this.add.rectangle(cx - 178, cy, 0, 12, 0x4ba3ff).setOrigin(0, 0.5);
    const lbl = this.add.text(cx, cy - 36, 'Loading...', {
      fontFamily: 'Arial', fontSize: '20px', color: '#cfe0ff'
    }).setOrigin(0.5);
    this.load.on('progress', v => fg.width = 356 * v);
    this.load.on('complete', () => { bg.destroy(); fg.destroy(); lbl.destroy(); });

    // ========== Gameplay area ==========
    this.load.image('bg_gameArea', `${A}/Png/Gameplay Area/gameArea.png`);
    this.load.image('bg_wall',     `${A}/Png/Gameplay Area/wall.png`);

    // ========== Guns (Lv01~10, idle 1f, shoot 10f) ==========
    for (let g = 1; g <= 10; g++) {
      const gn = String(g).padStart(2, '0');
      this.load.image(`gun${g}_idle`, `${A}/Png/Guns/Gun${gn}/Idle/Gun${gn}-Idle_0.png`);
      for (let f = 0; f < 10; f++) {
        const fn = String(f).padStart(2, '0');
        this.load.image(`gun${g}_shoot_${f}`, `${A}/Png/Guns/Gun${gn}/Shoot/Gun${gn}-Shoot_${fn}.png`);
      }
    }

    // ========== Monsters (1~10, walk 20f) ==========
    for (let m = 1; m <= 10; m++) {
      const mn = String(m).padStart(2, '0');
      for (let f = 0; f < 20; f++) {
        const fn = String(f).padStart(2, '0');
        this.load.image(`mon${m}_${f}`, `${A}/Png/Monster/Monster${mn}/Monster${mn}-animation_${fn}.png`);
      }
    }

    // ========== Bullets ==========
    for (let b = 1; b <= 4; b++) {
      this.load.image(`bullet_${b}`, `${A}/Png/Bullets/${b}.png`);
    }

    // ========== Effects ==========
    for (let f = 0; f < 15; f++) {
      this.load.image(`shootfx_${f}`, `${A}/Png/Shoot fx/Shoot fx-animation_${String(f).padStart(2,'0')}.png`);
    }
    for (let f = 0; f < 20; f++) {
      this.load.image(`deadfx_${f}`, `${A}/Png/Dead fx/EnemyDieFx-EnemyDieFx_${String(f).padStart(2,'0')}.png`);
    }

    // ========== UI ==========
    const ui = `${A}/Png/User interfaces`;
    // game play area
    const g = `${ui}/game play area Ui`;
    this.load.image('ui_btn01',    `${g}/btn01.png`);
    this.load.image('ui_btn01_p',  `${g}/btn01 pressed.png`);
    this.load.image('ui_btn02',    `${g}/btn02.png`);
    this.load.image('ui_btn02_p',  `${g}/btn02 pressed.png`);
    this.load.image('ui_btn04',    `${g}/btn 04.png`);
    this.load.image('ui_btn04_p',  `${g}/btn04 pressed.png`);
    this.load.image('ui_btn05',    `${g}/btn05.png`);
    this.load.image('ui_btn05_p',  `${g}/btn05 pressed.png`);
    this.load.image('ui_money_bar',`${g}/money bar.png`);
    this.load.image('ui_bin',      `${g}/bin icon.png`);
    this.load.image('ui_shield',   `${g}/shield icon.png`);
    this.load.image('ui_sound_on', `${g}/sound on.png`);
    this.load.image('ui_sound_off',`${g}/sound off .png`);
    // back arrow(用 free upgrade popup 內的黃箭頭翻面)
    this.load.image('ui_arrow_side', `${ui}/free upgrade popup/upgrade arrow side.png`);
    // hp bar(備用,敵人血條)
    this.load.image('ui_hp_bg', `${ui}/enemy hp bar/enemy hp bar bg.png`);
    this.load.image('ui_hp_fg', `${ui}/enemy hp bar/enemy hp bar fg.png`);

    // landing
    const ls = `${ui}/landing Screen`;
    this.load.image('ld_bg',        `${ls}/cover background.png`);
    this.load.image('ld_box',       `${ls}/cover box .png`);
    this.load.image('ld_title',     `${ls}/game title.png`);
    this.load.image('ld_title_bg',  `${ls}/game title bg.png`);
    this.load.image('ld_play',      `${ls}/start game btn.png`);
    this.load.image('ld_play_p',    `${ls}/start game btn pressed.png`);

    // wave cleared popup
    const wc = `${ui}/wave cleared popup`;
    this.load.image('pop_dim',     `${wc}/dark background.png`);
    this.load.image('pop_box',     `${wc}/wave cleared box.png`);
    this.load.image('pop_coin01',  `${wc}/wave cleared coin box 01.png`);
  }

  create() {
    // 動畫註冊
    for (let g = 1; g <= 10; g++) {
      this.anims.create({
        key: `gun${g}_shoot`,
        frames: Array.from({ length: 10 }, (_, i) => ({ key: `gun${g}_shoot_${i}` })),
        frameRate: 30, repeat: 0
      });
    }
    for (let m = 1; m <= 10; m++) {
      this.anims.create({
        key: `mon${m}_walk`,
        frames: Array.from({ length: 20 }, (_, i) => ({ key: `mon${m}_${i}` })),
        frameRate: 18, repeat: -1
      });
    }
    this.anims.create({
      key: 'shootfx',
      frames: Array.from({ length: 15 }, (_, i) => ({ key: `shootfx_${i}` })),
      frameRate: 30, repeat: 0
    });
    this.anims.create({
      key: 'deadfx',
      frames: Array.from({ length: 20 }, (_, i) => ({ key: `deadfx_${i}` })),
      frameRate: 30, repeat: 0
    });

    this.scene.start('Menu');
  }
}
