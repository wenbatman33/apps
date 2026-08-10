// v4 載入場景
class BootV4 extends Phaser.Scene {
  constructor() { super('BootV4'); }

  preload() {
    const W = LAYOUT_V4.W, H = LAYOUT_V4.H;
    const barBg = this.add.rectangle(W / 2, H / 2, 640, 26, 0x1a140e).setStrokeStyle(2, 0xb99c64);
    const bar = this.add.rectangle(W / 2 - 316, H / 2, 1, 16, 0xffb020).setOrigin(0, 0.5);
    this.add.text(W / 2, H / 2 - 60, '防守特洛伊', { fontSize: '56px', color: '#F2E9D2', fontStyle: 'bold' }).setOrigin(0.5);
    this.load.on('progress', p => { bar.width = 632 * p; });

    const A = 'public/assets/V4/';
    this.load.image('bg_battlefield', A + 'G_battlefield_v6.png');
    this.load.image('castle_strip', A + 'atlas/S_castle_strip.png');
    this.load.image('cityband', A + 'atlas/S_cityband.png');
    this.load.image('castle_strip_dmg', A + 'atlas/S_castle_strip_dmg.png');
    this.load.image('castle_strip_lite', A + 'atlas/S_castle_strip_lite.png');
    this.load.image('bg_title', A + 'G_title.png');
    this.load.image('ui_victory', A + 'atlas/G_victory_t.png');
    // 角色 spritesheet（atlas/ 內為 256px 正規化格）
    const sheets = ['A_archer', 'A_spear', 'A_stone', 'A_oil', 'A_hector', 'A_hector_bow',
                    'A_zeus', 'A_apollo', 'A_poseidon', 'A_athena', 'A_paris', 'E_giant',
                    'E_sword', 'E_torch', 'E_shield', 'E_ladder', 'E_achilles'];
    for (const s of sheets)
      this.load.spritesheet(s, A + 'atlas/' + s + '.png', { frameWidth: 256, frameHeight: 256 });
    // 物件
    for (const o of ['E_ram', 'E_siegetower', 'E_catapult', 'FX_crack', 'FX_hole', 'FX_scorch', 'FX_rubble'])
      this.load.image(o, A + 'atlas/' + o + '.png');
    for (const o of ['FXI_oilR', 'FXI_oilDps', 'FXI_arrows', 'FXI_cd', 'FXI_repair', 'FXI_promote',
                     'FXI_chain', 'FXI_sun', 'FXI_wave', 'FXI_holy', 'FXI_venom', 'FXI_lord'])
      this.load.image(o, A + 'atlas/' + o + '.png');
  }

  create() {
    // 動畫：我方 idle 0-3 / attack 4-7；敵方 walk 0-3 / attack 4-7 / death 8-11
    for (const s of ['A_archer', 'A_spear', 'A_stone', 'A_oil', 'A_hector', 'A_hector_bow', 'A_zeus', 'A_apollo', 'A_poseidon', 'A_athena', 'A_paris']) {
      this.anims.create({ key: s + '_idle', frames: this.anims.generateFrameNumbers(s, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: s + '_attack', frames: this.anims.generateFrameNumbers(s, { start: 4, end: 7 }), frameRate: 12, repeat: 0 });
    }
    for (const s of ['E_sword', 'E_torch', 'E_shield', 'E_ladder', 'E_achilles', 'E_giant']) {
      this.anims.create({ key: s + '_walk', frames: this.anims.generateFrameNumbers(s, { start: 0, end: 3 }), frameRate: 9, repeat: -1 });
      this.anims.create({ key: s + '_attack', frames: this.anims.generateFrameNumbers(s, { start: 4, end: 7 }), frameRate: 8, repeat: -1 });
      this.anims.create({ key: s + '_death', frames: this.anims.generateFrameNumbers(s, { start: 8, end: 11 }), frameRate: 8, repeat: 0 });
    }
    // 像素實測各兵種「腳底相對格中心」偏移（去背後最低不透明列），佈陣精準落在塔台上
    window.FEET_V4 = {};
    const measure = key => {
      try {
        const src = this.textures.get(key).getSourceImage();
        const cv = document.createElement('canvas');
        cv.width = 256; cv.height = 256;
        const c = cv.getContext('2d', { willReadFrequently: true });
        c.drawImage(src, 0, 0, 256, 256, 0, 0, 256, 256);   // 第 0 幀（待機站姿）
        const d = c.getImageData(0, 0, 256, 256).data;
        for (let y = 255; y >= 0; y--)
          for (let x = 0; x < 256; x++)
            if (d[(y * 256 + x) * 4 + 3] > 16) { window.FEET_V4[key] = y - 128 - 5; return; }
      } catch (e) { /* fallback 用預設 */ }
      window.FEET_V4[key] = 103;
    };
    ['A_archer', 'A_spear', 'A_stone', 'A_oil', 'A_hector', 'A_hector_bow',
     'A_zeus', 'A_apollo', 'A_poseidon', 'A_athena', 'A_paris'].forEach(measure);
    this.scene.start('TitleV4');
  }
}
