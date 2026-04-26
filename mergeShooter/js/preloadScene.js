/**
 * PreloadScene — 載入素材包內所有 PNG
 */
class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const W = this.scale.width, H = this.scale.height;

    // 進度條
    const bg = this.add.rectangle(W / 2, H / 2, W * 0.7, 28, 0x222a44).setStrokeStyle(2, 0x4cc9f0);
    const bar = this.add.rectangle(W / 2 - W * 0.35 + 2, H / 2, 0, 22, 0x4cc9f0).setOrigin(0, 0.5);
    const txt = this.add.text(W / 2, H / 2 - 50, 'Loading...', { fontFamily: 'Arial', fontSize: 28, color: '#ffffff' }).setOrigin(0.5);
    this.load.on('progress', p => { bar.width = (W * 0.7 - 4) * p; txt.setText('Loading... ' + Math.floor(p * 100) + '%'); });

    const A = 'assets/Png/';

    // ====== 背景與場地 ======
    this.load.image('bg-cover', A + 'User interfaces/landing Screen/cover background.png');
    this.load.image('cover-box', A + 'User interfaces/landing Screen/cover box .png');
    this.load.image('cover-login-bg', A + 'User interfaces/landing Screen/cover login bg.png');
    this.load.image('game-title', A + 'User interfaces/landing Screen/game title.png');
    this.load.image('game-title-bg', A + 'User interfaces/landing Screen/game title bg.png');
    this.load.image('start-btn', A + 'User interfaces/landing Screen/start game btn.png');
    this.load.image('start-btn-pressed', A + 'User interfaces/landing Screen/start game btn pressed.png');
    this.load.image('guest-btn', A + 'User interfaces/landing Screen/guest btn.png');
    this.load.image('guest-btn-pressed', A + 'User interfaces/landing Screen/guest btn pressed.png');
    this.load.image('fb-btn', A + 'User interfaces/landing Screen/fb btn.png');
    this.load.image('google-btn', A + 'User interfaces/landing Screen/google btn.png');

    this.load.image('game-area', A + 'Gameplay Area/game area.png');
    this.load.image('top-gradient', A + 'Gameplay Area/top gradient.png');
    this.load.image('wall', A + 'Gameplay Area/wall.png');

    // ====== 遊戲畫面 UI ======
    const UI = A + 'User interfaces/game play area Ui/';
    this.load.image('btn01', UI + 'btn01.png');
    this.load.image('btn01-p', UI + 'btn01 pressed.png');
    this.load.image('btn02', UI + 'btn02.png');
    this.load.image('btn02-p', UI + 'btn02 pressed.png');
    this.load.image('btn03', UI + 'btn03.png');
    this.load.image('btn03-p', UI + 'btn03 pressed.png');
    this.load.image('btn04', UI + 'btn 04.png');
    this.load.image('btn04-p', UI + 'btn04 pressed.png');
    this.load.image('btn05', UI + 'btn05.png');
    this.load.image('btn05-p', UI + 'btn05 pressed.png');
    this.load.image('btn06', UI + 'btn06.png');
    this.load.image('btn06-p', UI + 'btn06 pressed.png');
    this.load.image('money-bar', UI + 'money bar.png');
    this.load.image('store-icon', UI + 'store icon.png');
    this.load.image('shield-icon', UI + 'shield icon.png');
    this.load.image('bin-icon', UI + 'bin icon.png');
    this.load.image('sound-on', UI + 'sound on.png');
    this.load.image('sound-on-p', UI + 'sound on pressed.png');
    this.load.image('sound-off', UI + 'sound off .png');
    this.load.image('sound-off-p', UI + 'sound off pressed.png');

    // 敵人血條
    this.load.image('hpbar-bg', A + 'User interfaces/enemy hp bar/enemy hp bar bg.png');
    this.load.image('hpbar-fg', A + 'User interfaces/enemy hp bar/enemy hp bar fg.png');

    // wave cleared popup
    const WC = A + 'User interfaces/wave cleared popup/';
    this.load.image('wc-dim', WC + 'dark background.png');
    this.load.image('wc-box', WC + 'wave cleared box.png');
    this.load.image('wc-coin1', WC + 'wave cleared coin box 01.png');
    this.load.image('wc-coin2', WC + 'wave cleared coin box 02.png');
    this.load.image('wc-btn', WC + 'btn05.png');
    this.load.image('wc-btn-p', WC + 'btn05 pressed.png');
    this.load.image('wc-video', WC + 'video btn.png');
    this.load.image('wc-video-p', WC + 'video btn pressed.png');
    this.load.image('wc-video-icon', WC + 'video icon.png');

    // shopping popup
    const SP = A + 'User interfaces/Shopping popup/';
    this.load.image('sp-dim', SP + 'dark background.png');
    this.load.image('sp-store-bar', SP + 'bg icon store bar.png');
    this.load.image('sp-bg1', SP + 'bg icon 01.png');
    this.load.image('sp-bg2', SP + 'bg icon 02.png');
    this.load.image('sp-bg3', SP + 'bg icon 03.png');
    this.load.image('sp-bg4', SP + 'bg icon 04.png');
    this.load.image('sp-box', SP + 'store box bg.png');
    this.load.image('sp-close', SP + 'close btn pressed.png');
    this.load.image('sp-btn', SP + 'btn store pressed.png');
    this.load.image('sp-coin', SP + 'coin store icon.png');
    this.load.image('sp-shield', SP + 'shield icon.png');
    this.load.image('sp-arrow', SP + 'upgrade arrow.png');
    this.load.image('sp-bin', SP + 'bin icon.png');
    this.load.image('sp-star-on', SP + 'star on.png');
    this.load.image('sp-star-off', SP + 'star off.png');
    this.load.image('sp-scroll-bg', SP + 'scroll bg.png');
    this.load.image('sp-scroll-on', SP + 'scroll btn on.png');
    this.load.image('sp-scroll-p', SP + 'scroll btn preessed.png');

    // free upgrade popup
    const FU = A + 'User interfaces/free upgrade popup/';
    this.load.image('fu-dim', FU + 'dark background.png');
    this.load.image('fu-box', FU + 'upgrade pop up box.png');
    this.load.image('fu-arrow', FU + 'upgrade arrow side.png');
    this.load.image('fu-video', FU + 'video btn.png');
    this.load.image('fu-video-p', FU + 'video btn pressed.png');
    this.load.image('fu-close', FU + 'close btn pressed.png');

    // offline earning popup
    const OE = A + 'User interfaces/offline earning popup/';
    this.load.image('oe-dim', OE + 'dark background.png');
    this.load.image('oe-box', OE + 'offline pop up box.png');
    this.load.image('oe-chest', OE + 'coin chest.png');
    this.load.image('oe-bonus', OE + 'coin bonus icon.png');
    this.load.image('oe-video', OE + 'video btn.png');
    this.load.image('oe-video-p', OE + 'video btn pressed.png');
    this.load.image('oe-video-icon', OE + 'video icon.png');

    // ====== 子彈 ======
    for (let i = 1; i <= 4; i++) this.load.image('bullet' + i, A + 'Bullets/' + i + '.png');

    // ====== 砲塔 (10種, Idle 1幀, Shoot 10幀) ======
    for (let g = 1; g <= 10; g++) {
      const id = 'Gun' + String(g).padStart(2, '0');
      this.load.image(`gun${g}-idle`, `${A}Guns/${id}/Idle/${id}-Idle_0.png`);
      for (let f = 0; f < 10; f++) {
        this.load.image(`gun${g}-shoot-${f}`, `${A}Guns/${id}/Shoot/${id}-Shoot_${String(f).padStart(2, '0')}.png`);
      }
    }
    this.load.image('shield', A + 'Guns/Shield.png');

    // ====== 怪物 (10種, 20幀走路動畫) ======
    for (let m = 1; m <= 10; m++) {
      const id = 'Monster' + String(m).padStart(2, '0');
      for (let f = 0; f < 20; f++) {
        this.load.image(`mon${m}-${f}`, `${A}Monster/${id}/${id}-animation_${String(f).padStart(2, '0')}.png`);
      }
    }

    // ====== 射擊特效 (15幀) ======
    for (let f = 0; f < 15; f++) {
      this.load.image(`shootfx-${f}`, `${A}Shoot fx/Shoot fx-animation_${String(f).padStart(2, '0')}.png`);
    }
    // 死亡特效 (20幀)
    for (let f = 0; f < 20; f++) {
      this.load.image(`deadfx-${f}`, `${A}Dead fx/EnemyDieFx-EnemyDieFx_${String(f).padStart(2, '0')}.png`);
    }
  }

  create() {
    // gun alias：data.js 用 'gunN' 而 preload 已用 'gunN-idle'
    for (let g = 1; g <= 10; g++) {
      if (this.textures.exists('gun' + g + '-idle')) {
        this.textures.addImage('gun' + g, this.textures.get('gun' + g + '-idle').source[0].image);
      }
    }
    // 建立怪物走路動畫
    for (let m = 1; m <= 10; m++) {
      const frames = [];
      for (let f = 0; f < 20; f++) frames.push({ key: `mon${m}-${f}` });
      this.anims.create({ key: `mon${m}-walk`, frames, frameRate: 18, repeat: -1 });
    }
    // 砲塔射擊動畫
    for (let g = 1; g <= 10; g++) {
      const frames = [];
      for (let f = 0; f < 10; f++) frames.push({ key: `gun${g}-shoot-${f}` });
      this.anims.create({ key: `gun${g}-shoot`, frames, frameRate: 30, repeat: 0 });
    }
    // 射擊特效
    {
      const frames = [];
      for (let f = 0; f < 15; f++) frames.push({ key: `shootfx-${f}` });
      this.anims.create({ key: 'shoot-fx', frames, frameRate: 30, repeat: 0 });
    }
    // 死亡特效
    {
      const frames = [];
      for (let f = 0; f < 20; f++) frames.push({ key: `deadfx-${f}` });
      this.anims.create({ key: 'dead-fx', frames, frameRate: 30, repeat: 0 });
    }

    this.scene.start('Landing');
  }
}
