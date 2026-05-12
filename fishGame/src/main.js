import Phaser from 'phaser';
import './styles.css';

const GAME_WIDTH = 1080;
const GAME_HEIGHT = 1920;
const CENTER_X = GAME_WIDTH / 2;
const CENTER_Y = GAME_HEIGHT / 2;
// 砲台改放右下角
const CANNON_ORIGIN = new Phaser.Math.Vector2(880, 1750);
const BULLET_SPEED = 1700;          // 子彈速度 px/s
const BULLET_COOLDOWN = 140;        // 連射間隔 ms
const BULLET_LIFETIME = 1600;       // 子彈存活 ms
const RTP = 0.92;                   // 抽水率（理論回報率）

// odds = 魚倍率；擊殺後 reward = bet × odds（市售捕魚機標準公式）
// 12 張獨立 PNG（已用 PIL 裁掉透明 padding），texKey 對應檔名
// 拆分後每隻魚的 displayWidth/Height 就是實際魚身範圍，不再有 frame 中心 vs 視覺中心錯位
const FISH_TEX_KEYS = [
  'fish_clown', 'fish_tang', 'fish_stripe', 'fish_bubble',
  'fish_puffer', 'fish_ray', 'fish_shark', 'fish_gold',
  'fish_jelly', 'fish_angler', 'fish_crab', 'fish_turtle'
];
const FISH_TEX_FILES = [
  '00_clown', '01_tang', '02_stripe', '03_bubble',
  '04_puffer', '05_ray', '06_shark', '07_gold',
  '08_jelly', '09_angler', '10_crab', '11_turtle'
];

const fishData = [
  { frame: 0,  name: '小丑魚', odds: 2,   speed: 80,  scale: 0.38, class: 'small'  },
  { frame: 1,  name: '神仙魚', odds: 3,   speed: 105, scale: 0.36, class: 'small'  },
  { frame: 2,  name: '斑馬魚', odds: 4,   speed: 92,  scale: 0.40, class: 'small'  },
  { frame: 3,  name: '泡泡魚', odds: 6,   speed: 74,  scale: 0.43, class: 'medium' },
  { frame: 4,  name: '河豚',   odds: 8,   speed: 60,  scale: 0.45, class: 'medium' },
  { frame: 5,  name: '魟魚',   odds: 20,  speed: 66,  scale: 0.50, class: 'large'  },
  { frame: 6,  name: '鯊魚',   odds: 30,  speed: 72,  scale: 0.56, class: 'large'  },
  { frame: 7,  name: '金魚',   odds: 50,  speed: 120, scale: 0.43, class: 'bonus'  },
  { frame: 8,  name: '水母',   odds: 8,   speed: 82,  scale: 0.40, class: 'medium' },
  { frame: 9,  name: 'Boss',  odds: 120, speed: 58,  scale: 0.58, class: 'boss'   },
  { frame: 10, name: '螃蟹',   odds: 10,  speed: 54,  scale: 0.39, class: 'medium' },
  { frame: 11, name: '烏龜',   odds: 25,  speed: 64,  scale: 0.48, class: 'large'  }
];

const MIN_BET = 1;
const MAX_BET = 7;

const asset = (path) => path;

// 把 spritesheet 中每個 frame 的取樣矩形往內縮 `inset` 像素，避免鄰格殘影
function insetTextureFrames(texture, inset) {
  if (!texture || !texture.frames) return;
  Object.keys(texture.frames).forEach((key) => {
    const frame = texture.frames[key];
    if (!frame || key === '__BASE') return;
    if (frame.cutWidth <= inset * 2 || frame.cutHeight <= inset * 2) return;
    frame.cutX += inset;
    frame.cutY += inset;
    frame.cutWidth -= inset * 2;
    frame.cutHeight -= inset * 2;
    frame.width = frame.cutWidth;
    frame.height = frame.cutHeight;
    frame.updateUVs();
  });
}

class LoadingScene extends Phaser.Scene {
  constructor() { super('LoadingScene'); }

  preload() {
    this.load.image('loadingScreen', asset('assets/ui/loading_screen.png'));
    this.load.image('mainMenu', asset('assets/ui/main_menu.png'));
    this.load.image('gameplayBg', asset('assets/backgrounds/gameplay_bg.png'));
    // 12 隻魚改用獨立 PNG（已自動裁切透明 padding），徹底解決 sprite frame 中心 vs 視覺中心錯位問題
    FISH_TEX_KEYS.forEach((key, i) => {
      this.load.image(key, asset(`assets/sprites/fish/${FISH_TEX_FILES[i]}.png`));
    });
    this.load.spritesheet('cannonEffects', asset('assets/sprites/cannon_effects_sheet.png'), {
      frameWidth: 362, frameHeight: 362
    });
    this.load.spritesheet('gameUi', asset('assets/ui/ui_sheet.png'), {
      frameWidth: 320, frameHeight: 320
    });
    // 音效
    this.load.audio('sfx_fish_kill', asset('assets/sound/sfx/fish_kill.mp3'));
    this.load.audio('sfx_fish_kill2', asset('assets/sound/sfx/fish_kill2.mp3'));
    this.load.audio('sfx_boss_kill', asset('assets/sound/sfx/boss_kill.mp3'));
    this.load.audio('sfx_hit_no_kill', asset('assets/sound/sfx/hit_no_kill.mp3'));
    this.load.audio('sfx_big_win', asset('assets/sound/sfx/big_win.mp3'));
    this.load.audio('sfx_coin', asset('assets/sound/sfx/coin.wav'));
    this.load.audio('sfx_big_fish_warning', asset('assets/sound/sfx/大魚警告音.mp3'));
    this.load.audio('sfx_laser', asset('assets/sound/sfx/雷射炮聲音.mp3'));
  }

  create() {
    this.add.image(CENTER_X, CENTER_Y, 'loadingScreen').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    const barBack = this.add.rectangle(CENTER_X, 1656, 620, 34, 0x061a2e, 0.72)
      .setStrokeStyle(4, 0xf5d475, 0.9);
    const barFill = this.add.rectangle(CENTER_X - 300, 1656, 0, 22, 0x58e2ff, 1)
      .setOrigin(0, 0.5);
    const label = this.add.text(CENTER_X, 1712, 'LOADING', {
      fontFamily: 'Arial', fontSize: '34px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#09334f', strokeThickness: 5
    }).setOrigin(0.5);

    this.tweens.addCounter({
      from: 0, to: 1, duration: 1100, ease: 'Sine.easeInOut',
      onUpdate: (tween) => { barFill.width = 600 * tween.getValue(); },
      onComplete: () => {
        barBack.destroy();
        label.destroy();
        this.scene.start('MenuScene');
      }
    });
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    // 魚已改用獨立 PNG，無 spritesheet 鄰格殘影問題。cannonEffects 仍是 sheet，需內縮。
    insetTextureFrames(this.textures.get('cannonEffects'), 1);

    this.add.image(CENTER_X, CENTER_Y, 'mainMenu').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.createMenuAmbience();

    this.add.text(CENTER_X, 210, '深海捕魚機', {
      fontFamily: 'Arial', fontSize: '92px', fontStyle: 'bold',
      color: '#fff7c7', stroke: '#7c3f05', strokeThickness: 14,
      shadow: { offsetY: 8, color: '#112240', blur: 6, fill: true }
    }).setOrigin(0.5);

    this.createMenuButton(CENTER_X, 1378, '開始遊戲', () => this.scene.start('GameScene'));
    this.createMenuButton(CENTER_X, 1512, '玩法預覽', () => this.showRules());
    this.createMenuButton(CENTER_X, 1646, '全螢幕', () => this.scale.startFullscreen());

    this.rulesPanel = null;
  }

  createMenuAmbience() {
    this.time.addEvent({ delay: 260, loop: true, callback: () => this.spawnMenuBubble() });
    for (let i = 0; i < 18; i += 1) {
      this.time.delayedCall(i * 90, () => this.spawnMenuBubble(true));
    }
    [
      [166, 1292], [900, 1308], [530, 1632], [114, 1224],
      [940, 1190], [216, 1548], [856, 1518], [496, 594],
      [614, 712], [750, 1014], [340, 1060]
    ].forEach(([x, y], index) => this.createPearlSparkle(x, y, index * 140));
  }

  spawnMenuBubble(initial = false) {
    const sideBias = Phaser.Math.Between(0, 100);
    const x = sideBias < 36
      ? Phaser.Math.Between(24, 210)
      : sideBias > 64
        ? Phaser.Math.Between(870, 1056)
        : Phaser.Math.Between(160, 920);
    const y = initial ? Phaser.Math.Between(260, 1880) : Phaser.Math.Between(1780, 2020);
    const radius = Phaser.Math.Between(8, 24);
    const bubble = this.add.circle(x, y, radius, 0xffffff, 0.08)
      .setStrokeStyle(2, 0xb9f6ff, 0.46)
      .setDepth(4);

    this.tweens.add({
      targets: bubble,
      x: x + Phaser.Math.Between(-54, 54),
      y: y - Phaser.Math.Between(520, 980),
      alpha: 0,
      scale: Phaser.Math.FloatBetween(1.08, 1.45),
      duration: Phaser.Math.Between(3600, 6400),
      ease: 'Sine.easeOut',
      onComplete: () => bubble.destroy()
    });
  }

  createPearlSparkle(x, y, delay) {
    const sparkle = this.add.star(x, y, 4, 5, 20, 0xffffff, 0.86)
      .setStrokeStyle(2, 0xfff1a6, 0.78)
      .setDepth(5)
      .setAlpha(0)
      .setScale(0.25);

    this.tweens.add({
      targets: sparkle,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.25, to: 1.28 },
      angle: 180,
      duration: 760,
      yoyo: true,
      repeat: -1,
      repeatDelay: Phaser.Math.Between(900, 2100),
      delay,
      ease: 'Sine.easeInOut'
    });
  }

  createMenuButton(x, y, text, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.sprite(0, 0, 'gameUi', 4).setDisplaySize(470, 118);
    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial', fontSize: '42px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#073b62', strokeThickness: 7
    }).setOrigin(0.5);
    container.add([bg, label]);
    container.setSize(470, 118).setInteractive({ useHandCursor: true });
    container.on('pointerover', () => container.setScale(1.04));
    container.on('pointerout', () => container.setScale(1));
    container.on('pointerdown', () => {
      this.cameras.main.flash(90, 255, 240, 160);
      onClick();
    });
    return container;
  }

  showRules() {
    if (this.rulesPanel) {
      this.rulesPanel.destroy(true);
      this.rulesPanel = null;
      return;
    }

    const panel = this.add.container(CENTER_X, 960);
    const bg = this.add.rectangle(0, 0, 880, 640, 0x062844, 0.92)
      .setStrokeStyle(6, 0xf1c95b);
    const title = this.add.text(0, -246, '玩法', {
      fontFamily: 'Arial', fontSize: '54px', fontStyle: 'bold',
      color: '#fff0a8', stroke: '#08243a', strokeThickness: 6
    }).setOrigin(0.5);
    const body = this.add.text(0, 14, [
      '拖曳畫面瞄準砲台',
      '按住畫面 = 連續發射子彈',
      '+ / - 切換下注倍率（1 ~ 7）',
      '每發子彈消耗 = 下注金額',
      '擊中魚 → 依「下注 / 魚倍率」判定捕獲',
      '擊殺獎金 = 下注 × 魚倍率',
      '小魚倍率低易抓、Boss 高倍率難抓',
      '連續捕獲累積 COMBO 加成'
    ], {
      fontFamily: 'Arial', fontSize: '36px', color: '#ffffff',
      align: 'center', lineSpacing: 16
    }).setOrigin(0.5);
    const close = this.add.text(0, 272, '點擊關閉', {
      fontFamily: 'Arial', fontSize: '30px', color: '#86f1ff'
    }).setOrigin(0.5);
    panel.add([bg, title, body, close]);
    panel.setSize(880, 640).setInteractive({ useHandCursor: true });
    panel.on('pointerdown', () => {
      panel.destroy(true);
      this.rulesPanel = null;
    });
    this.rulesPanel = panel;
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    this.add.image(CENTER_X, CENTER_Y, 'gameplayBg').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // 預建每張魚圖的 alpha bitmap，做像素級命中判定（避免空氣牆）
    this.cacheFishAlphaMaps();

    this.coins = 1500;
    this.score = 0;
    this.combo = 0;
    this.bet = 1;
    this.powerMode = false;       // 強力砲模式：消耗高、發射慢、傷害大
    this.fireCooldown = 0;
    this.isFiring = false;
    this.aimPoint = new Phaser.Math.Vector2(CENTER_X, 760);
    this.lastCatchAt = 0;
    this.displayCoins = this.coins;
    this.displayScore = this.score;
    this.isDevMode = new URLSearchParams(window.location.search).get('dev') === '1';
    // ?debug=1 開啟物理 body 可視化（驗證碰撞圈是否對齊魚／子彈視覺中心）
    if (new URLSearchParams(window.location.search).get('debug') === '1') {
      this.physics.world.createDebugGraphic();
      this.physics.world.drawDebug = true;
    }

    this.createBulletTexture();

    this.fishGroup = this.physics.add.group();
    this.bulletGroup = this.physics.add.group();
    this.laserOrbGroup = this.add.group();  // 雷射道具掉落容器

    // 不用 physics.add.overlap — body offset 算錯時會造成空氣牆。
    // 改成每幀手動以「視覺中心 + 視覺半徑」做距離判定，徹底繞過 Phaser body 計算。

    this.createHud();
    if (this.isDevMode) this.createDevPanel();
    this.createCannon();
    this.createInput();
    this.createFishWaves();
    this.scheduleNextBigFishWave(12000); // 第一波 12 秒後，讓玩家先暖機
  }

  // -------------------- HUD --------------------
  createHud() {
    this.add.rectangle(CENTER_X, 72, 1000, 104, 0x03243d, 0.68)
      .setStrokeStyle(4, 0xf4d37a, 0.7);
    this.coinText = this.add.text(68, 43, '', {
      fontFamily: 'Arial', fontSize: '34px', fontStyle: 'bold',
      color: '#fff3b0', stroke: '#06223b', strokeThickness: 5
    });
    this.scoreText = this.add.text(386, 43, '', {
      fontFamily: 'Arial', fontSize: '34px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#06223b', strokeThickness: 5
    });
    this.comboText = this.add.text(750, 43, '', {
      fontFamily: 'Arial', fontSize: '34px', fontStyle: 'bold',
      color: '#86f1ff', stroke: '#06223b', strokeThickness: 5
    });

    this.createBetSelector();
    this.createPowerButton();
    this.updateHud();
  }

  createPowerButton() {
    const x = CENTER_X;
    const y = 1810;
    this.powerButton = this.add.container(x, y).setDepth(2500);
    this.powerButtonBg = this.add.circle(0, 0, 52, 0x1a0a3a, 0.9).setStrokeStyle(4, 0x9966ff);
    this.powerButtonIcon = this.add.text(0, -2, '⚡', {
      fontSize: '38px', color: '#cc99ff', stroke: '#3a1a6a', strokeThickness: 4
    }).setOrigin(0.5);
    this.powerButtonLabel = this.add.text(0, 36, '強力', {
      fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold',
      color: '#cc99ff', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);
    this.powerButton.add([this.powerButtonBg, this.powerButtonIcon, this.powerButtonLabel]);
    this.powerButton.setSize(104, 104).setInteractive({ useHandCursor: true });
    this.powerButton.on('pointerdown', (pointer) => {
      pointer.event.stopPropagation();
      this.togglePowerMode();
    });
  }

  togglePowerMode() {
    this.powerMode = !this.powerMode;
    // 確保有 graphics 物件可畫光束
    if (!this.beamGraphics) {
      this.beamGraphics = this.add.graphics().setDepth(4500);
      this.beamDamageTimer = 0;
    }
    if (!this.powerMode) {
      this.beamGraphics.clear();
      this.beamActive = false;
    }
    if (this.powerMode) {
      this.powerButtonBg.setFillStyle(0x9966ff, 1).setStrokeStyle(4, 0xfff1a5);
      this.powerButtonIcon.setColor('#ffffff');
      this.powerButtonLabel.setColor('#fff1a5').setText('強力 ON');
    } else {
      this.powerButtonBg.setFillStyle(0x1a0a3a, 0.9).setStrokeStyle(4, 0x9966ff);
      this.powerButtonIcon.setColor('#cc99ff');
      this.powerButtonLabel.setColor('#cc99ff').setText('強力');
    }
  }

  createBetSelector() {
    // 倍率介面改放左下角：− [下注] +
    const BET_CENTER_X = 230;
    this.minusButton = this.createBetButton(80, 1810, '-', () => this.changeBet(-1));
    this.plusButton = this.createBetButton(380, 1810, '+', () => this.changeBet(1));
    this.betBack = this.add.rectangle(BET_CENTER_X, 1810, 220, 74, 0x031a2c, 0.72)
      .setStrokeStyle(3, 0xf0cf72, 0.76)
      .setDepth(2400);
    this.betText = this.add.text(BET_CENTER_X, 1810, '', {
      fontFamily: 'Arial', fontSize: '28px', fontStyle: 'bold',
      color: '#fff3b0', stroke: '#09243d', strokeThickness: 5
    }).setOrigin(0.5).setDepth(2500);
  }

  createBetButton(x, y, label, onClick) {
    const c = this.add.container(x, y).setDepth(2500);
    const bg = this.add.circle(0, 0, 54, 0x0a4e78, 0.9).setStrokeStyle(6, 0xf3cf6c);
    const t = this.add.text(0, -4, label, {
      fontFamily: 'Arial', fontSize: '58px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#05233b', strokeThickness: 4
    }).setOrigin(0.5);
    c.add([bg, t]);
    c.setSize(108, 108).setInteractive({ useHandCursor: true });
    c.on('pointerdown', (pointer) => {
      pointer.event.stopPropagation();
      onClick();
    });
    return c;
  }

  createDevPanel() {
    const panel = this.add.container(CENTER_X, 174).setDepth(9000);
    const bg = this.add.rectangle(0, 0, 940, 118, 0x250b00, 0.78)
      .setStrokeStyle(4, 0xffcf5a, 0.9);
    const label = this.add.text(-416, -38, 'DEV 大獎測試', {
      fontFamily: 'Arial', fontSize: '26px', fontStyle: 'bold',
      color: '#fff3b0', stroke: '#2a0900', strokeThickness: 4
    }).setOrigin(0, 0.5);

    const big = this.createDevButton(-246, 24, 'BIG', () => this.triggerDevPrize('BIG WIN'));
    const mega = this.createDevButton(0, 24, 'MEGA', () => this.triggerDevPrize('MEGA WIN'));
    const jackpot = this.createDevButton(246, 24, 'JACKPOT', () => this.triggerDevPrize('JACKPOT'));

    panel.add([bg, label, big, mega, jackpot]);
  }

  createDevButton(x, y, text, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 210, 54, 0x8a3f00, 0.92)
      .setStrokeStyle(3, 0xffdf7c, 0.95);
    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial', fontSize: '25px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#3c1300', strokeThickness: 4
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(210, 54).setInteractive({ useHandCursor: true });
    container.on('pointerdown', (pointer) => {
      pointer.event.stopPropagation();
      onClick();
    });
    return container;
  }

  triggerDevPrize(tier) {
    const rewardMap = { 'BIG WIN': 320, 'MEGA WIN': 680, JACKPOT: 1280 };
    const reward = rewardMap[tier];
    const previousCoins = this.coins;
    const previousScore = this.score;
    this.coins += reward;
    this.score += reward;
    this.playBigWin(CENTER_X, 760, reward, previousCoins, previousScore, tier);
    this.updateHud();
  }

  // -------------------- 砲台 / 輸入 --------------------
  // 把每張魚 PNG 的 alpha 通道抽出來，做成 Uint8Array 表（1=不透明、0=透明）
  // 命中判定時直接 O(1) 查表，徹底避免「視覺上沒魚卻被判命中」
  cacheFishAlphaMaps() {
    this.fishAlphaMaps = {};
    FISH_TEX_KEYS.forEach((key) => {
      const tex = this.textures.get(key);
      const src = tex && tex.getSourceImage();
      if (!src) return;
      const w = src.width;
      const h = src.height;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(src, 0, 0);
      const data = ctx.getImageData(0, 0, w, h).data;
      const alpha = new Uint8Array(w * h);
      for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
        alpha[p] = data[i + 3] > 24 ? 1 : 0;  // alpha > 24 算實體
      }
      this.fishAlphaMaps[key] = { w, h, alpha };
    });
  }

  // 把世界座標 (wx, wy) 換算回魚的紋理像素位置，查 alpha 是否不透明
  pixelHitsFish(fish, wx, wy) {
    const map = this.fishAlphaMaps && this.fishAlphaMaps[fish.texture.key];
    if (!map) return false;
    // 反向魚的旋轉，把 (wx, wy) 轉到魚的本地座標
    const cos = Math.cos(-fish.rotation);
    const sin = Math.sin(-fish.rotation);
    const dx = wx - fish.x;
    const dy = wy - fish.y;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    // 反向 scale + origin(0.5)，轉到紋理像素座標
    const px = Math.floor(localX / fish.scaleX + map.w / 2);
    const py = Math.floor(localY / fish.scaleY + map.h / 2);
    if (px < 0 || px >= map.w || py < 0 || py >= map.h) return false;
    return map.alpha[py * map.w + px] === 1;
  }

  // 在子彈中心 + 周邊 8 個取樣點檢查像素命中（容許子彈半徑容差）
  // 回傳實際觸發命中的世界座標（用於 debug 標記）；沒命中回傳 null
  bulletHitsFish(bullet, fish) {
    const br = bullet.getData('hitRadius');
    const r = br * 0.7;
    const offsets = [
      [0, 0],
      [br, 0], [-br, 0], [0, br], [0, -br],
      [r, r], [r, -r], [-r, r], [-r, -r]
    ];
    for (let i = 0; i < offsets.length; i += 1) {
      const wx = bullet.x + offsets[i][0];
      const wy = bullet.y + offsets[i][1];
      if (this.pixelHitsFish(fish, wx, wy)) {
        return { x: wx, y: wy };
      }
    }
    return null;
  }

  // 大魚 / Boss 進場警告：橫幅 + 螢幕邊框閃紅 + 震動
  showBigFishWarning(data, isBoss) {
    const color = isBoss ? '#ff3344' : '#ffa040';
    const borderColor = isBoss ? 0xff2233 : 0xff9933;
    const title = isBoss ? '⚠ BOSS 來襲 ⚠' : '⚠ 大魚來襲';
    const subtitle = isBoss
      ? `${data.name}　x${data.odds}　強力倍率`
      : `${data.name}　x${data.odds}`;

    // 螢幕邊框閃紅（4 條邊）
    const W = 22;
    const top = this.add.rectangle(CENTER_X, W / 2, GAME_WIDTH, W, borderColor, 0.85).setDepth(9000);
    const bottom = this.add.rectangle(CENTER_X, GAME_HEIGHT - W / 2, GAME_WIDTH, W, borderColor, 0.85).setDepth(9000);
    const left = this.add.rectangle(W / 2, CENTER_Y, W, GAME_HEIGHT, borderColor, 0.85).setDepth(9000);
    const right = this.add.rectangle(GAME_WIDTH - W / 2, CENTER_Y, W, GAME_HEIGHT, borderColor, 0.85).setDepth(9000);
    [top, bottom, left, right].forEach((b) => {
      this.tweens.add({
        targets: b, alpha: { from: 0.85, to: 0 },
        duration: 1800, repeat: 0, ease: 'Sine.easeOut',
        onComplete: () => b.destroy()
      });
      // 閃爍
      this.tweens.add({
        targets: b, alpha: 0.2,
        duration: 280, yoyo: true, repeat: 3
      });
    });

    // 中央橫幅背板
    const bannerBg = this.add.rectangle(CENTER_X, 340, 880, 200, 0x1a0500, 0.85)
      .setStrokeStyle(6, borderColor)
      .setDepth(9100)
      .setScale(0.4)
      .setAlpha(0);
    const titleText = this.add.text(CENTER_X, 300, title, {
      fontFamily: 'Arial', fontSize: isBoss ? '76px' : '64px', fontStyle: 'bold',
      color, stroke: '#000', strokeThickness: 10,
      shadow: { offsetY: 4, color: '#400', blur: 6, fill: true }
    }).setOrigin(0.5).setDepth(9200).setScale(0.4).setAlpha(0);
    const subText = this.add.text(CENTER_X, 376, subtitle, {
      fontFamily: 'Arial', fontSize: '36px', fontStyle: 'bold',
      color: '#ffe0a5', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(9200).setScale(0.4).setAlpha(0);

    this.tweens.add({
      targets: [bannerBg, titleText, subText],
      scale: 1, alpha: 1,
      duration: 260, ease: 'Back.easeOut'
    });
    this.tweens.add({
      targets: [bannerBg, titleText, subText],
      alpha: 0, y: '-=40',
      delay: 1200, duration: 480, ease: 'Sine.easeIn',
      onComplete: () => {
        bannerBg.destroy(); titleText.destroy(); subText.destroy();
      }
    });

    // 螢幕震動 + 微閃
    this.cameras.main.shake(isBoss ? 260 : 160, isBoss ? 0.008 : 0.005);
    if (isBoss) this.cameras.main.flash(220, 255, 80, 80);
    this.playSfx('sfx_big_fish_warning', { volume: isBoss ? 0.9 : 0.55 });
  }

  // 強力模式持續光束：每幀更新閃電視覺 + 每 BEAM_TICK 結算消耗 / 命中
  updateBeam(delta) {
    const BEAM_TICK = 90;  // ms，每 90ms 一次結算
    const startX = CANNON_ORIGIN.x;
    const startY = CANNON_ORIGIN.y - 40;
    const endX = this.aimPoint.x;
    const endY = this.aimPoint.y;
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    // 延長到螢幕外
    const farX = startX + ux * 2400;
    const farY = startY + uy * 2400;

    // 閃電視覺：折線 + 隨機抖動
    const g = this.beamGraphics;
    g.clear();
    const segments = 18;
    const segLen = 2400 / segments;
    const points = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const cx = startX + ux * (segLen * i);
      const cy = startY + uy * (segLen * i);
      // 垂直方向抖動，靠近砲口和遠端抖動較小
      const fade = Math.sin(t * Math.PI);
      const jitter = (Math.random() - 0.5) * 60 * fade;
      points.push({ x: cx + (-uy) * jitter, y: cy + ux * jitter });
    }
    // 外層橙黃光暈
    g.lineStyle(46, 0xff9933, 0.35);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) g.lineTo(points[i].x, points[i].y);
    g.strokePath();
    // 中層金黃
    g.lineStyle(24, 0xffd040, 0.85);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) g.lineTo(points[i].x, points[i].y);
    g.strokePath();
    // 內層白熱
    g.lineStyle(8, 0xffffff, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) g.lineTo(points[i].x, points[i].y);
    g.strokePath();

    // 起點爆閃 + 雷射音效（只在 beam 啟動瞬間播一次）
    if (!this.beamActive) {
      this.cameras.main.shake(80, 0.003);
      this.beamActive = true;
      this.playSfx('sfx_laser', { volume: 0.8 });
    }

    // 結算
    this.beamDamageTimer -= delta;
    if (this.beamDamageTimer > 0) return;
    this.beamDamageTimer = BEAM_TICK;

    const cost = this.bet * 3;  // 每 tick 消耗 bet × 3
    if (this.coins < cost) {
      this.flashFloatingText(CENTER_X, 1620, '金幣不足', '#ff7777');
      this.isFiring = false;
      return;
    }
    this.coins -= cost;
    this.displayCoins = this.coins;

    // 對光柱範圍內的魚做命中判定
    const cos = ux;
    const sin = uy;
    const previousCoins = this.coins + cost;
    const previousScore = this.score;
    const bet = this.bet;
    let killCount = 0;
    let totalReward = 0;
    this.fishGroup.children.each((fish) => {
      if (!fish.active) return;
      const fdx = fish.x - startX;
      const fdy = fish.y - startY;
      const along = fdx * cos + fdy * sin;
      if (along < 0) return;
      const perpDist = Math.abs(fdx * (-sin) + fdy * cos);
      const fishR = Math.min(fish.displayWidth, fish.displayHeight) / 2;
      if (perpDist > 60 + fishR * 0.6) return;
      // 光束擊殺機率：每 tick (bet / odds) × 0.92 × 1.6
      const odds = fish.getData('odds');
      const chance = Phaser.Math.Clamp((bet / odds) * 0.92 * 1.6, 0.01, 0.95);
      if (Math.random() < chance) {
        const reward = bet * odds * 2;  // 光束擊殺 2 倍獎金
        totalReward += reward;
        killCount += 1;
        const burst = this.add.sprite(fish.x, fish.y, 'cannonEffects', 10)
          .setScale(0.36).setDepth(5000);
        this.tweens.add({
          targets: burst, scale: 0.9, alpha: 0, duration: 320,
          onComplete: () => burst.destroy()
        });
        this.flashFloatingText(fish.x, fish.y - 38, `+${reward}`, '#ffe071');
        fish.setActive(false);
        if (fish.body) fish.body.enable = false;
        this.tweens.add({
          targets: fish,
          scale: fish.getData('baseScale') * 1.5,
          alpha: 0, duration: 260, ease: 'Back.easeIn',
          onComplete: () => fish.destroy()
        });
      } else {
        // 沒擊殺也閃白光
        fish.setTintFill(0xffffff);
        this.time.delayedCall(60, () => { if (fish.active) fish.clearTint(); });
      }
    });

    if (totalReward > 0) {
      this.score += totalReward;
      this.combo += killCount;
      this.lastCatchAt = this.time.now;
      if (totalReward >= bet * 200) {
        this.playBigWin(CENTER_X, 760, totalReward, previousCoins, previousScore, null, bet);
      } else {
        this.displayCoins = this.coins;
        this.displayScore = this.score;
      }
    }
    this.updateHud();
  }

  // 雷射道具：從 Gold/Boss 掉落，玩家點擊後從砲台射出穿透光束
  spawnLaserOrb(x, y) {
    const orb = this.add.container(x, y).setDepth(6000);
    // 外層脈動光暈
    const aura = this.add.circle(0, 0, 38, 0xff4477, 0.4).setStrokeStyle(3, 0xffaadd, 0.8);
    // 內核
    const core = this.add.circle(0, 0, 22, 0xffffff, 1).setStrokeStyle(3, 0xff77aa, 1);
    // 雷電圖示文字
    const icon = this.add.text(0, 0, '⚡', {
      fontSize: '28px', color: '#ff2266', stroke: '#fff', strokeThickness: 4
    }).setOrigin(0.5);
    orb.add([aura, core, icon]);
    orb.setSize(80, 80).setInteractive({ useHandCursor: true });
    this.laserOrbGroup.add(orb);

    // 脈動動畫
    this.tweens.add({
      targets: aura,
      scale: { from: 1, to: 1.5 },
      alpha: { from: 0.6, to: 0.2 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    // 慢慢上浮
    this.tweens.add({
      targets: orb,
      y: y - 60,
      duration: 4000,
      ease: 'Sine.easeOut'
    });

    // 8 秒後消失
    const expireTimer = this.time.delayedCall(8000, () => {
      this.tweens.add({
        targets: orb,
        alpha: 0, scale: 0.5, duration: 320,
        onComplete: () => orb.destroy()
      });
    });

    orb.on('pointerdown', (pointer) => {
      pointer.event.stopPropagation();
      expireTimer.remove();
      const targetX = orb.x;
      const targetY = orb.y;
      // 道具被吸收動畫
      this.tweens.add({
        targets: orb,
        scale: 1.6, alpha: 0,
        duration: 180,
        onComplete: () => orb.destroy()
      });
      this.fireLaser(targetX, targetY);
    });

    this.flashFloatingText(x, y - 60, '⚡ 雷射道具', '#ff77aa');
  }

  // 雷射發射：從砲台沿著「砲台→目標點」方向射出穿透光柱，路徑上的魚全部高機率擊殺
  fireLaser(targetX, targetY) {
    const cannonX = CANNON_ORIGIN.x;
    const cannonY = CANNON_ORIGIN.y - 40;
    const angle = Phaser.Math.Angle.Between(cannonX, cannonY, targetX, targetY);
    // 光柱終點：延長到螢幕外
    const farX = cannonX + Math.cos(angle) * 2600;
    const farY = cannonY + Math.sin(angle) * 2600;

    // 視覺：寬光柱 + 中心白熱 + 外層青粉
    const beamBg = this.add.line(0, 0, cannonX, cannonY, farX, farY, 0xff77aa, 0.45)
      .setLineWidth(54).setDepth(4500).setOrigin(0, 0);
    const beamMid = this.add.line(0, 0, cannonX, cannonY, farX, farY, 0xff2266, 0.85)
      .setLineWidth(28).setDepth(4501).setOrigin(0, 0);
    const beamCore = this.add.line(0, 0, cannonX, cannonY, farX, farY, 0xffffff, 1)
      .setLineWidth(12).setDepth(4502).setOrigin(0, 0);
    // 砲口大爆閃
    const flash = this.add.circle(cannonX, cannonY, 90, 0xffaadd, 0.9).setDepth(4600);
    this.tweens.add({
      targets: flash,
      scale: 2.4, alpha: 0,
      duration: 380, ease: 'Sine.easeOut',
      onComplete: () => flash.destroy()
    });

    // 螢幕震動 + 閃白 + 雷射音
    this.cameras.main.shake(420, 0.018);
    this.cameras.main.flash(180, 255, 200, 230);
    this.playSfx('sfx_laser', { volume: 1 });

    // 光柱淡出
    this.tweens.add({
      targets: [beamBg, beamMid, beamCore],
      alpha: 0, duration: 420, delay: 180, ease: 'Cubic.easeIn',
      onComplete: () => { beamBg.destroy(); beamMid.destroy(); beamCore.destroy(); }
    });

    // 命中判定：光柱沿 angle 方向，寬度 ~80 game px。逐魚檢查「魚中心到光柱直線」距離
    const previousCoins = this.coins;
    const previousScore = this.score;
    const bet = this.bet;
    let killCount = 0;
    let totalReward = 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.fishGroup.children.each((fish) => {
      if (!fish.active) return;
      // 投影到光柱方向
      const dx = fish.x - cannonX;
      const dy = fish.y - cannonY;
      const along = dx * cos + dy * sin;   // 沿光柱方向的距離
      if (along < 0) return;                // 在砲台後方
      const perpDist = Math.abs(dx * (-sin) + dy * cos);  // 垂直光柱距離
      const hitWidth = 80 + Math.min(fish.displayWidth, fish.displayHeight) / 2;
      if (perpDist > hitWidth) return;
      // 雷射 90% 機率擊殺
      if (Math.random() < 0.9) {
        const odds = fish.getData('odds');
        const reward = bet * odds * 2;  // 雷射雙倍獎金
        totalReward += reward;
        killCount += 1;
        // 連續爆炸
        this.time.delayedCall(killCount * 40, () => {
          if (!fish.active) return;
          const burst = this.add.sprite(fish.x, fish.y, 'cannonEffects', 10)
            .setScale(0.42).setDepth(5000);
          this.tweens.add({
            targets: burst, scale: 1.2, alpha: 0, duration: 360,
            onComplete: () => burst.destroy()
          });
          this.flashFloatingText(fish.x, fish.y - 38, `+${reward}`, '#ffe071');
          fish.setActive(false);
          if (fish.body) fish.body.enable = false;
          this.tweens.add({
            targets: fish,
            scale: fish.getData('baseScale') * 1.6,
            alpha: 0,
            duration: 280,
            ease: 'Back.easeIn',
            onComplete: () => fish.destroy()
          });
        });
      }
    });

    // 結算
    if (totalReward > 0) {
      this.coins += totalReward;
      this.score += totalReward;
      this.combo += killCount;
      this.lastCatchAt = this.time.now;
      this.flashFloatingText(CENTER_X, 460, `雷射 ${killCount} 連殺 +${totalReward}`, '#ff77aa');
      if (totalReward >= bet * 150) {
        this.playBigWin(CENTER_X, 760, totalReward, previousCoins, previousScore, null, bet);
      } else {
        this.tweenPrizeCounters(previousCoins, previousScore);
      }
      this.updateHud();
    }
  }

  // 子彈飛出螢幕時的小水花，明確表示「離場」(不是停住)
  spawnExitSplash(x, y) {
    // 把座標夾在螢幕邊緣，水花顯示在邊界上
    const cx = Phaser.Math.Clamp(x, 8, GAME_WIDTH - 8);
    const cy = Phaser.Math.Clamp(y, 8, GAME_HEIGHT - 8);
    const splash = this.add.circle(cx, cy, 18, 0xaff3ff, 0.7)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setDepth(4000);
    this.tweens.add({
      targets: splash,
      scale: 2,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.easeOut',
      onComplete: () => splash.destroy()
    });
  }

  // Debug：在 HIT 觸發的「實際像素位置」畫綠色實心圓，停留 3 秒
  // 綠點在魚身 = 正確；綠點在空水 = bug
  markHitPoint(x, y) {
    const dot = this.add.circle(x, y, 6, 0x00ff44, 1).setStrokeStyle(2, 0xffffff).setDepth(9600);
    this.time.delayedCall(3000, () => dot.destroy());
  }

  // (已移除) 紅色 HIT debug 標記
  markBulletDeath() {}

  // 程式繪製金色砲彈貼圖
  createBulletTexture() {
    const size = 48;
    const g = this.add.graphics();
    // 外層光暈
    g.fillStyle(0xfff1a5, 0.35);
    g.fillCircle(size / 2, size / 2, size / 2);
    // 中層金色
    g.fillStyle(0xffd447, 1);
    g.fillCircle(size / 2, size / 2, size / 2 - 6);
    // 內核白熱
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size / 2 - 3, size / 2 - 3, 6);
    // 金色描邊
    g.lineStyle(2, 0xffb830, 1);
    g.strokeCircle(size / 2, size / 2, size / 2 - 6);
    g.generateTexture('bulletTex', size, size);
    g.destroy();
  }

  createCannon() {
    // 瞄準線在魚之上、HUD 之下
    this.aimLine = this.add.line(0, 0, CANNON_ORIGIN.x, CANNON_ORIGIN.y, CANNON_ORIGIN.x, 1080, 0x7ee9ff, 0.25)
      .setLineWidth(3, 1)
      .setDepth(2200);
    // 砲台拉到最上層，避免畫面下半部的魚游過時遮住砲台
    this.cannonBase = this.add.circle(CANNON_ORIGIN.x, CANNON_ORIGIN.y + 32, 132, 0x072a43, 0.82)
      .setStrokeStyle(8, 0xf3cc62)
      .setDepth(3400);
    this.cannon = this.add.sprite(CANNON_ORIGIN.x, CANNON_ORIGIN.y, 'cannonEffects', 0)
      .setScale(0.88)
      .setOrigin(0.5, 0.72)
      .setDepth(3500);
  }

  createInput() {
    this.input.on('pointermove', (pointer) => {
      if (pointer.y > 1720) return;
      this.aimPoint.set(pointer.x, Math.min(pointer.y, 1670));
    });

    this.input.on('pointerdown', (pointer) => {
      if (pointer.y > 1720) return;
      this.aimPoint.set(pointer.x, Math.min(pointer.y, 1670));
      this.isFiring = true;
    });

    this.input.on('pointerup', () => {
      this.isFiring = false;
    });

    this.input.on('pointerupoutside', () => {
      this.isFiring = false;
    });
  }

  // -------------------- 魚波次 --------------------
  createFishWaves() {
    this.time.addEvent({ delay: 720, loop: true, callback: () => this.spawnFish() });
    for (let i = 0; i < 8; i += 1) {
      this.time.delayedCall(i * 180, () => this.spawnFish());
    }
  }

  // 波次大魚進場：每 25~40 秒一波，一波出 3~6 隻（含 1~2 Boss/large 混合）
  scheduleNextBigFishWave(delayMs) {
    this.time.delayedCall(delayMs, () => this.runBigFishWave());
  }

  runBigFishWave() {
    const count = Phaser.Math.Between(2, 4);          // 一波 2~4 隻
    const includeBoss = Phaser.Math.Between(0, 100) < 45; // 45% 波次有 Boss
    const pool = fishData.filter((f) => f.class === 'large' || (includeBoss && f.class === 'boss'));
    for (let i = 0; i < count; i += 1) {
      this.time.delayedCall(i * Phaser.Math.Between(700, 1400), () => {
        const data = Phaser.Utils.Array.GetRandom(pool);
        this.createFish(data, true);
      });
    }
    // 下一波 50~80 秒後
    this.scheduleNextBigFishWave(Phaser.Math.Between(50000, 80000));
  }

  // 播放音效（用 try/catch 避免某些瀏覽器沒解鎖前報錯）
  playSfx(key, config = {}) {
    try { this.sound.play(key, { volume: 0.7, ...config }); } catch (e) {}
  }


  spawnFish() {
    const data = Phaser.Utils.Array.GetRandom(fishData.filter((f) => f.class !== 'boss' && f.class !== 'large'));
    this.createFish(data, false);
  }

  spawnLargeFish(force = false) {
    if (!force && Phaser.Math.Between(0, 100) > 80) return;  // 80% 機率出現
    const data = Phaser.Utils.Array.GetRandom(fishData.filter((f) => f.class === 'large' || f.class === 'boss'));
    this.createFish(data, true);
  }

  createFish(data, isLargeVariant) {
    const route = this.getFishRoute(isLargeVariant);
    // 使用獨立 PNG（已裁切，sprite 中心 = 視覺中心）
    const fish = this.fishGroup.create(route.x, route.y, FISH_TEX_KEYS[data.frame]);
    // Boss 偶爾巨大化（占畫面 1/2 以上），large 中型大魚正常加成
    let scaleBoost = 1;
    if (isLargeVariant) {
      if (data.class === 'boss') {
        scaleBoost = Phaser.Math.FloatBetween(2.4, 3.2);  // 巨型 Boss
      } else {
        scaleBoost = Phaser.Math.FloatBetween(1.7, 2.3);
      }
    }
    const scale = data.scale * scaleBoost;

    fish.setScale(scale);
    fish.setData('odds', data.odds);
    fish.setData('name', data.name);
    fish.setData('class', data.class);
    fish.setData('baseScale', scale);
    fish.setData('swimPhase', Phaser.Math.FloatBetween(0, Math.PI * 2));
    fish.setData('swimAmp', isLargeVariant ? Phaser.Math.FloatBetween(0.025, 0.045) : Phaser.Math.FloatBetween(0.035, 0.07));
    fish.setData('swimRate', Phaser.Math.FloatBetween(0.004, 0.0075));
    // 拆分後每張 PNG 已是裁切過的魚身範圍，sprite 中心 = 視覺中心
    // 用橢圓而非圓形做碰撞：長條魚（鯊魚、烏龜）才能完整罩到頭尾
    fish.setData('visOffsetX', 0);
    fish.setData('visOffsetY', 0);
    fish.setData('hitHalfW', fish.displayWidth / 2 * 0.85);
    fish.setData('hitHalfH', fish.displayHeight / 2 * 0.85);
    // 仍保留 hitRadius（用大邊）給衝擊環視覺尺寸用
    fish.setData('hitRadius', Math.max(fish.displayWidth, fish.displayHeight) / 2 * 0.5);
    fish.body.setCircle(2); // body 縮極小、僅留物理 velocity 用

    const routeAngle = Phaser.Math.Angle.Between(route.x, route.y, route.targetX, route.targetY);
    const speedPenalty = isLargeVariant ? 0.7 : 1;
    const speed = data.speed * speedPenalty * Phaser.Math.FloatBetween(0.78, 1.24);
    const velocityX = Math.cos(routeAngle) * speed;
    const velocityY = Math.sin(routeAngle) * speed;

    fish.setPosition(route.x, route.y);
    fish.setVelocity(velocityX, velocityY);
    fish.setData('baseVelocityX', velocityX);
    fish.setData('baseVelocityY', velocityY);
    fish.setData('baseAngle', routeAngle);
    fish.rotation = routeAngle;
    // depth 跟著當前 y 走、最低 10，避免「上方生成」的魚 depth 為負而被背景遮住
    fish.setDepth(Math.max(10, route.y));

    if (data.class === 'boss') {
      fish.setTint(0xffe0a5);
      this.showBigFishWarning(data, true);
    } else if (data.class === 'bonus') {
      fish.setTint(0xfff19a);
    } else if (isLargeVariant) {
      // 大型 large 魚也有警告
      this.showBigFishWarning(data, false);
    }

    fish.setData('wakeTimer', 0);
  }

  getFishRoute(isLargeVariant) {
    const margin = isLargeVariant ? 280 : 190;
    // 魚的活動範圍下限：留出砲台底座的空間（砲台中心 1750、半徑 132）
    const FISH_AREA_BOTTOM = 1580;
    // 只用三條路徑：頂部下游、左→右、右→左；不再從畫面底部生成
    const edge = Phaser.Math.Between(0, 2);
    const route = { x: 0, y: 0, targetX: 0, targetY: 0 };

    if (edge === 0) {
      // 從上方游進，目標在砲台之上消失
      route.x = Phaser.Math.Between(120, GAME_WIDTH - 120);
      route.y = -margin;
      route.targetX = Phaser.Math.Between(90, GAME_WIDTH - 90);
      route.targetY = FISH_AREA_BOTTOM + margin;
    } else if (edge === 1) {
      // 右側進入，往左游出
      route.x = GAME_WIDTH + margin;
      route.y = Phaser.Math.Between(180, FISH_AREA_BOTTOM);
      route.targetX = -margin;
      route.targetY = Phaser.Math.Between(180, FISH_AREA_BOTTOM);
    } else {
      // 左側進入，往右游出
      route.x = -margin;
      route.y = Phaser.Math.Between(180, FISH_AREA_BOTTOM);
      route.targetX = GAME_WIDTH + margin;
      route.targetY = Phaser.Math.Between(180, FISH_AREA_BOTTOM);
    }

    return route;
  }

  // -------------------- 主迴圈 --------------------
  update(time, delta) {
    this.fireCooldown -= delta;
    this.updateAim();

    if (this.isFiring && this.fireCooldown <= 0) {
      this.fireBullet();
    }

    // 強力模式：按住時持續發射雷射光束
    if (this.powerMode && this.isFiring && !this.bigWinLock) {
      this.updateBeam(delta);
    } else if (this.beamGraphics) {
      this.beamGraphics.clear();
      this.beamActive = false;
    }

    this.fishGroup.children.each((fish) => {
      this.animateFishSwim(fish, time, delta);
      // depth 每幀根據當前 y 更新，且最低 10，徹底避免「魚被背景遮住但仍可命中」
      fish.setDepth(Math.max(10, fish.y));
      // 魚在任何 y 都可被命中（像素級判定保證視覺準確）；body 保持 enabled 讓魚正常游動
      if (fish.x < -360 || fish.x > GAME_WIDTH + 360 || fish.y < -360 || fish.y > GAME_HEIGHT + 360) {
        fish.destroy();
      }
    });

    this.bulletGroup.children.each((bullet) => {
      if (!bullet.active) return;
      bullet.setData('life', bullet.getData('life') - delta);
      // 持續拖尾：每幀在子彈當前位置畫一個小光點，快速淡出
      const tailDot = this.add.circle(bullet.x, bullet.y, 6, 0xfff1a5, 0.7).setDepth(3150);
      this.tweens.add({
        targets: tailDot, alpha: 0, scale: 0.2,
        duration: 320, ease: 'Cubic.easeOut',
        onComplete: () => tailDot.destroy()
      });
      if (bullet.getData('life') <= 0) {
        this.markBulletDeath(bullet.x, bullet.y, 'LIFE');
        bullet.destroy();
        return;
      }
      if (bullet.x < -60 || bullet.x > GAME_WIDTH + 60
          || bullet.y < -60 || bullet.y > GAME_HEIGHT + 60) {
        // 離場小水花：明確標示子彈飛出螢幕（不是「停在空中」）
        this.spawnExitSplash(bullet.x, bullet.y);
        this.markBulletDeath(bullet.x, bullet.y, 'OFF');
        bullet.destroy();
        return;
      }
      // 手動命中判定：純粹用視覺中心 + 視覺半徑做距離測試（不依賴 Phaser body offset）
      const br = bullet.getData('hitRadius');
      let hitFish = null;
      this.fishGroup.children.each((fish) => {
        if (hitFish) return;
        if (!fish.active) return;
        if (fish.body && !fish.body.enable) return;
        // 先用 AABB 快速剔除（橢圓粗篩），再做像素級判定
        const dx = bullet.x - fish.x;
        const dy = bullet.y - fish.y;
        const halfW = fish.getData('hitHalfW') / 0.85;  // 完整顯示半寬
        const halfH = fish.getData('hitHalfH') / 0.85;
        if (Math.abs(dx) > halfW + br || Math.abs(dy) > halfH + br) return;
        // 像素級判定（最精準）：只在魚的「實體像素」上才算命中
        if (this.bulletHitsFish(bullet, fish)) {
          hitFish = fish;
        }
      });
      if (hitFish) {
        this.markBulletDeath(bullet.x, bullet.y, `HIT ${hitFish.getData('name')}`);
        this.onBulletHitFish(bullet, hitFish);
      }
    });

    if (time - this.lastCatchAt > 2200 && this.combo > 0) {
      this.combo = 0;
      this.updateHud();
    }
  }

  animateFishSwim(fish, time, delta) {
    const phase = fish.getData('swimPhase') + time * fish.getData('swimRate');
    const amp = fish.getData('swimAmp');
    const baseScale = fish.getData('baseScale');
    const baseAngle = fish.getData('baseAngle');
    const sway = Math.sin(phase);
    const glide = Math.cos(phase * 0.55);

    fish.rotation = baseAngle + sway * amp * 2.6;
    fish.scaleX = baseScale * (1 + Math.abs(sway) * amp);
    fish.scaleY = baseScale * (1 - Math.abs(sway) * amp * 0.45);

    const normalX = -Math.sin(baseAngle);
    const normalY = Math.cos(baseAngle);
    const drift = sway * 14;
    fish.body.velocity.x = fish.getData('baseVelocityX') + normalX * drift + glide * 2;
    fish.body.velocity.y = fish.getData('baseVelocityY') + normalY * drift;

    const wakeTimer = fish.getData('wakeTimer') - delta;
    if (wakeTimer <= 0 && fish.displayWidth > 115) {
      this.spawnFishWake(fish);
      fish.setData('wakeTimer', Phaser.Math.Between(520, 980));
    } else {
      fish.setData('wakeTimer', wakeTimer);
    }
  }

  spawnFishWake(fish) {
    const wake = this.add.circle(fish.x, fish.y, Phaser.Math.Between(5, 11), 0xbdf6ff, 0.12)
      .setStrokeStyle(1, 0xd9fbff, 0.28)
      .setDepth(Math.max(1, fish.depth - 1));

    this.tweens.add({
      targets: wake,
      scale: 2.2,
      alpha: 0,
      duration: 520,
      ease: 'Sine.easeOut',
      onComplete: () => wake.destroy()
    });
  }

  updateAim() {
    const angle = Phaser.Math.Angle.Between(CANNON_ORIGIN.x, CANNON_ORIGIN.y, this.aimPoint.x, this.aimPoint.y);
    this.cannon.rotation = angle + Math.PI / 2;
    this.aimLine.setTo(CANNON_ORIGIN.x, CANNON_ORIGIN.y - 40, this.aimPoint.x, this.aimPoint.y);
  }

  // -------------------- 開火 --------------------
  fireBullet() {
    if (this.bigWinLock) return;
    if (this.powerMode) return;  // 強力模式不發射子彈，改由 updateBeam() 處理光束
    const cost = this.bet;
    if (this.coins < cost) {
      this.flashFloatingText(CENTER_X, 1620, '金幣不足', '#ff7777');
      this.isFiring = false;
      return;
    }

    this.coins -= cost;
    this.displayCoins = this.coins;
    this.fireCooldown = this.powerMode ? 360 : BULLET_COOLDOWN;

    const angle = Phaser.Math.Angle.Between(CANNON_ORIGIN.x, CANNON_ORIGIN.y, this.aimPoint.x, this.aimPoint.y);
    const muzzleX = CANNON_ORIGIN.x + Math.cos(angle) * 110;
    const muzzleY = CANNON_ORIGIN.y + Math.sin(angle) * 110;

    const bullet = this.bulletGroup.create(muzzleX, muzzleY, 'bulletTex');
    const bulletScale = (0.9 + this.bet * 0.12) * (this.powerMode ? 1.9 : 1);  // 強力砲砲彈大
    bullet.setScale(bulletScale)
      .setDepth(3200);
    if (this.powerMode) bullet.setTint(0xff5555);  // 強力砲彈染紅
    bullet.body.setCircle(2, 22, 22);
    bullet.setData('hitRadius', 16 * bulletScale);
    bullet.setData('powerMode', this.powerMode);
    bullet.setVelocity(Math.cos(angle) * BULLET_SPEED, Math.sin(angle) * BULLET_SPEED);

    // 拖尾效果，讓子彈軌跡更明顯
    const trail = this.add.circle(muzzleX, muzzleY, 18 * bulletScale, 0xffd447, 0.55)
      .setDepth(3150);
    this.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 0.4,
      duration: 240,
      ease: 'Sine.easeOut',
      onComplete: () => trail.destroy()
    });
    bullet.setData('bet', this.bet);
    bullet.setData('life', BULLET_LIFETIME);

    const muzzleFlash = this.add.circle(muzzleX, muzzleY, 36 + this.bet * 4, 0xfff1a5, 0.75)
      .setDepth(3300);
    this.tweens.add({
      targets: muzzleFlash,
      scale: 1.8,
      alpha: 0,
      duration: 160,
      ease: 'Sine.easeOut',
      onComplete: () => muzzleFlash.destroy()
    });

    this.cameras.main.shake(28, 0.0008 + this.bet * 0.00012);
    this.updateHud();
  }

  // -------------------- 命中判定 --------------------
  onBulletHitFish(bullet, fish) {
    if (!bullet.active || !fish.active) return;

    const bet = bullet.getData('bet');
    const odds = fish.getData('odds');

    // 爆炸畫在魚的「視覺中心」(不是 frame 中心)，避免偏離魚身
    const fishVisX = fish.x + fish.getData('visOffsetX');
    const fishVisY = fish.y + fish.getData('visOffsetY');
    const burst = this.add.sprite(fishVisX, fishVisY, 'cannonEffects', 10)
      .setScale(0.18 + bet * 0.012)
      .setDepth(5000);
    this.tweens.add({
      targets: burst,
      scale: 0.5 + bet * 0.04,
      alpha: 0,
      duration: 220,
      ease: 'Sine.easeOut',
      onComplete: () => burst.destroy()
    });
    bullet.destroy();

    // 命中閃光（強化：讓玩家清楚知道「子彈確實打到魚」即使沒擊殺）
    fish.setTintFill(0xffffff);
    this.tweens.add({
      targets: fish,
      scaleX: fish.getData('baseScale') * 1.22,
      scaleY: fish.getData('baseScale') * 1.22,
      duration: 130,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    this.time.delayedCall(160, () => {
      if (fish.active) fish.clearTint();
    });
    // 魚周圍快速擴散青色衝擊環（畫在視覺中心，不是 frame 中心）
    const impactRing = this.add.circle(fishVisX, fishVisY, fish.getData('hitRadius') * 0.6, 0, 0)
      .setStrokeStyle(5, 0xfff1a5, 1)
      .setDepth(4800);
    this.tweens.add({
      targets: impactRing,
      scale: 2.4,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => impactRing.destroy()
    });

    // 擊殺機率 = (下注 / 魚倍率) * RTP，強力砲彈 ×2.5
    const isPower = bullet.getData('powerMode');
    const powerMult = isPower ? 2.5 : 1;
    const chance = Phaser.Math.Clamp((bet / odds) * RTP * powerMult, 0.005, 0.98);
    if (Math.random() < chance) {
      this.catchFish(fish, isPower ? bet * 3 : bet);
    } else {
      this.playSfx('sfx_hit_no_kill', { volume: 0.35 }); // 命中沒擊殺
    }
  }

  catchFish(fish, bet) {
    fish.setActive(false);
    if (fish.body) fish.body.enable = false;
    const odds = fish.getData('odds');
    const cls = fish.getData('class');
    // 擊殺音效
    if (cls === 'boss') this.playSfx('sfx_boss_kill');
    else if (cls === 'large' || cls === 'bonus') this.playSfx('sfx_fish_kill2');
    else this.playSfx('sfx_fish_kill', { volume: 0.5 });
    const baseReward = bet * odds;
    this.combo += 1;
    this.lastCatchAt = this.time.now;
    const comboBonus = Math.floor(baseReward * Math.min(this.combo, 8) * 0.05);
    const reward = baseReward + comboBonus;
    const previousCoins = this.coins;
    const previousScore = this.score;
    this.coins += reward;
    this.score += reward;

    const burst = this.add.sprite(fish.x, fish.y, 'cannonEffects', 10)
      .setScale(0.32)
      .setDepth(5000);
    this.tweens.add({
      targets: burst,
      scale: 0.92,
      alpha: 0,
      duration: 380,
      ease: 'Sine.easeOut',
      onComplete: () => burst.destroy()
    });

    this.flashFloatingText(fish.x, fish.y - 42, `+${reward}`, '#fff1a5');
    this.flashFloatingText(fish.x, fish.y + 14, `x${odds}`, '#86f1ff');

    // 雷射道具掉落：Gold 50% / Boss 100% / 其他 large 大魚 15%
    let dropChance = 0;
    if (cls === 'boss') dropChance = 1.0;
    else if (cls === 'bonus') dropChance = 0.5;
    else if (cls === 'large') dropChance = 0.15;
    if (Math.random() < dropChance) {
      this.spawnLaserOrb(fish.x, fish.y);
    }

    if (this.shouldTriggerBigWin(fish, reward, bet)) {
      this.playBigWin(fish.x, fish.y, reward, previousCoins, previousScore, null, bet);
    } else {
      this.displayCoins = this.coins;
      this.displayScore = this.score;
    }

    this.tweens.killTweensOf(fish);
    this.tweens.add({
      targets: fish,
      scale: fish.getData('baseScale') * 1.45,
      alpha: 0,
      angle: fish.flipX ? 20 : -20,
      duration: 260,
      ease: 'Back.easeIn',
      onComplete: () => fish.destroy()
    });

    this.updateHud();
  }

  shouldTriggerBigWin(fish, reward, bet) {
    // Boss 一定演；其他用「獎金 ÷ 下注 ≥ 50 倍」判定
    if (fish.getData('class') === 'boss') return true;
    return reward >= bet * 50;
  }

  // -------------------- 大獎演出 --------------------
  playBigWin(x, y, reward, previousCoins, previousScore, forcedTier = null, bet = 1) {
    // 用「獎金 ÷ 下注」決定大獎層級，不受下注大小左右
    const multiple = reward / Math.max(bet, 1);
    const tier = forcedTier ?? (multiple >= 400 ? 'JACKPOT' : multiple >= 150 ? 'MEGA WIN' : 'BIG WIN');
    const color = tier === 'JACKPOT' ? '#fff6ba' : tier === 'MEGA WIN' ? '#ffe071' : '#ffd04f';
    const coinCount = tier === 'JACKPOT' ? 150 : tier === 'MEGA WIN' ? 110 : 72;

    // 慢動作期間鎖住開火，避免子彈被 timeScale 拖慢看起來像撞到空氣牆
    this.physics.world.timeScale = 0.45;
    this.bigWinLock = true;
    this.time.delayedCall(580, () => {
      this.physics.world.timeScale = 1;
      this.bigWinLock = false;
    });

    this.cameras.main.flash(260, 255, 224, 96);
    this.cameras.main.shake(420, tier === 'JACKPOT' ? 0.012 : 0.007);
    this.playSfx('sfx_big_win', { volume: 0.9 });

    const glow = this.add.circle(x, y, 90, 0xffd65a, 0.18)
      .setStrokeStyle(8, 0xfff1a3, 0.72)
      .setDepth(7200);
    this.tweens.add({
      targets: glow, scale: 4.2, alpha: 0, duration: 880, ease: 'Sine.easeOut',
      onComplete: () => glow.destroy()
    });

    const banner = this.add.text(CENTER_X, 560, tier, {
      fontFamily: 'Arial',
      fontSize: tier === 'JACKPOT' ? '106px' : '92px',
      fontStyle: 'bold', color, stroke: '#6f2800', strokeThickness: 16,
      shadow: { offsetY: 8, color: '#1a0600', blur: 8, fill: true }
    }).setOrigin(0.5).setDepth(8000).setScale(0.35);

    const rewardText = this.add.text(CENTER_X, 668, `+${reward}`, {
      fontFamily: 'Arial', fontSize: '64px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#804000', strokeThickness: 10
    }).setOrigin(0.5).setDepth(8000).setAlpha(0);

    this.tweens.add({ targets: banner, scale: 1, duration: 280, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: rewardText, alpha: 1, y: 648,
      duration: 300, delay: 120, ease: 'Sine.easeOut'
    });
    this.tweens.add({
      targets: [banner, rewardText], alpha: 0, y: '-=70',
      duration: 420, delay: 1700, ease: 'Sine.easeIn',
      onComplete: () => { banner.destroy(); rewardText.destroy(); }
    });

    this.spawnCoinRain(coinCount);
    this.tweenPrizeCounters(previousCoins, previousScore);
  }

  spawnCoinRain(count) {
    // 金幣雨期間穿插播放金幣音（每 8 顆播一次，避免過吵）
    const coinSoundSpacing = 8;
    for (let i = 0; i < count; i += 1) {
      this.time.delayedCall(i * 10, () => {
        if (i % coinSoundSpacing === 0) {
          this.playSfx('sfx_coin', { volume: 0.45, detune: Phaser.Math.Between(-200, 200) });
        }
        const coin = this.add.ellipse(
          Phaser.Math.Between(-40, GAME_WIDTH + 40),
          Phaser.Math.Between(-260, -40),
          Phaser.Math.Between(24, 38),
          Phaser.Math.Between(24, 34),
          0xffd447, 0.96
        )
          .setStrokeStyle(3, 0xfff2a2, 0.95)
          .setDepth(7600)
          .setAngle(Phaser.Math.Between(0, 180));

        const shine = this.add.ellipse(coin.x - 4, coin.y - 3, 8, 4, 0xffffff, 0.62)
          .setDepth(7601)
          .setAngle(coin.angle);

        const fallDistance = GAME_HEIGHT + Phaser.Math.Between(160, 420);
        const fallDuration = Phaser.Math.Between(1350, 2500);
        this.tweens.add({
          targets: [coin, shine],
          y: `+=${fallDistance}`,
          x: `+=${Phaser.Math.Between(-80, 80)}`,
          angle: `+=${Phaser.Math.Between(360, 960)}`,
          duration: fallDuration,
          ease: 'Quad.easeIn',
          onComplete: () => { coin.destroy(); shine.destroy(); }
        });
      });
    }
  }

  tweenPrizeCounters(previousCoins, previousScore) {
    this.displayCoins = previousCoins;
    this.displayScore = previousScore;

    this.tweens.addCounter({
      from: 0, to: 1, duration: 1300, ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        const progress = tween.getValue();
        this.displayCoins = Math.floor(Phaser.Math.Linear(previousCoins, this.coins, progress));
        this.displayScore = Math.floor(Phaser.Math.Linear(previousScore, this.score, progress));
        this.updateHud();
      },
      onComplete: () => {
        this.displayCoins = this.coins;
        this.displayScore = this.score;
        this.updateHud();
      }
    });
  }

  flashFloatingText(x, y, value, color) {
    const text = this.add.text(x, y, value, {
      fontFamily: 'Arial', fontSize: '42px', fontStyle: 'bold',
      color, stroke: '#082238', strokeThickness: 7
    }).setOrigin(0.5).setDepth(6000);

    this.tweens.add({
      targets: text, y: y - 86, alpha: 0,
      duration: 820, ease: 'Sine.easeOut',
      onComplete: () => text.destroy()
    });
  }

  changeBet(delta) {
    this.bet = Phaser.Math.Clamp(this.bet + delta, MIN_BET, MAX_BET);
    this.cannon.setFrame(Math.min(3, Math.floor((this.bet - 1) / 2)));
    this.updateHud();
  }

  updateHud() {
    this.coinText.setText(`金幣 ${this.displayCoins}`);
    this.scoreText.setText(`分數 ${this.displayScore}`);
    this.comboText.setText(`COMBO ${this.combo}`);
    this.betText.setText(`x${this.bet} ・ ${this.bet}金/發`);
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#020b18',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [LoadingScene, MenuScene, GameScene]
};

new Phaser.Game(config);
