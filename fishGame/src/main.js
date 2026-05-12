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
    this.load.spritesheet('fish', asset('assets/sprites/fish_sheet.png'), {
      frameWidth: 362, frameHeight: 362
    });
    this.load.spritesheet('cannonEffects', asset('assets/sprites/cannon_effects_sheet.png'), {
      frameWidth: 362, frameHeight: 362
    });
    this.load.spritesheet('gameUi', asset('assets/ui/ui_sheet.png'), {
      frameWidth: 320, frameHeight: 320
    });
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
    // sprite sheet 沒有預留 padding，雙線性過濾會把鄰格像素拉進來造成殘影。
    // 把每個 frame 往內縮 1px（左/上/右/下各 1），裁掉邊緣的鄰格殘像但保留平滑過濾。
    insetTextureFrames(this.textures.get('fish'), 1);
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

    this.coins = 1500;
    this.score = 0;
    this.combo = 0;
    this.bet = 1;
    this.fireCooldown = 0;
    this.isFiring = false;
    this.aimPoint = new Phaser.Math.Vector2(CENTER_X, 760);
    this.lastCatchAt = 0;
    this.displayCoins = this.coins;
    this.displayScore = this.score;
    this.isDevMode = new URLSearchParams(window.location.search).get('dev') === '1';

    this.createBulletTexture();

    this.fishGroup = this.physics.add.group();
    this.bulletGroup = this.physics.add.group();

    this.physics.add.overlap(this.bulletGroup, this.fishGroup, this.onBulletHitFish, null, this);

    this.createHud();
    if (this.isDevMode) this.createDevPanel();
    this.createCannon();
    this.createInput();
    this.createFishWaves();

    this.spawnLargeFish(true);
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
    this.updateHud();
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
  // 程式繪製明亮砲彈貼圖（取代原本半透明的網狀 cannonEffects 第 8/9 frame）
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
    this.time.addEvent({ delay: 5600, loop: true, callback: () => this.spawnLargeFish() });
    for (let i = 0; i < 8; i += 1) {
      this.time.delayedCall(i * 180, () => this.spawnFish());
    }
  }

  spawnFish() {
    const data = Phaser.Utils.Array.GetRandom(fishData.filter((f) => f.class !== 'boss' && f.class !== 'large'));
    this.createFish(data, false);
  }

  spawnLargeFish(force = false) {
    if (!force && Phaser.Math.Between(0, 100) > 68) return;
    const data = Phaser.Utils.Array.GetRandom(fishData.filter((f) => f.class === 'large' || f.class === 'boss'));
    this.createFish(data, true);
  }

  createFish(data, isLargeVariant) {
    const route = this.getFishRoute(isLargeVariant);
    const fish = this.fishGroup.create(route.x, route.y, 'fish', data.frame);
    const scaleBoost = isLargeVariant ? Phaser.Math.FloatBetween(1.2, 1.5) : 1;
    const scale = data.scale * scaleBoost;

    fish.setScale(scale);
    fish.setData('odds', data.odds);
    fish.setData('name', data.name);
    fish.setData('class', data.class);
    fish.setData('baseScale', scale);
    fish.setData('swimPhase', Phaser.Math.FloatBetween(0, Math.PI * 2));
    fish.setData('swimAmp', isLargeVariant ? Phaser.Math.FloatBetween(0.025, 0.045) : Phaser.Math.FloatBetween(0.035, 0.07));
    fish.setData('swimRate', Phaser.Math.FloatBetween(0.004, 0.0075));
    // body 半徑須隨視覺縮放（Phaser arcade body radius 不會跟 sprite scale 自動縮）
    // 取視覺半徑的 0.7 倍當碰撞圈，留一點寬鬆但不會像空氣牆那麼大
    const visualHalf = (362 * scale) / 2;
    const bodyRadius = visualHalf * 0.7;
    const bodyOffset = 181 - bodyRadius / scale;
    fish.body.setCircle(bodyRadius, bodyOffset, bodyOffset);

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
    fish.setDepth(10 + route.y);

    if (data.class === 'boss') {
      fish.setTint(0xffe0a5);
      this.flashFloatingText(CENTER_X, 250, `Boss x${data.odds} 出現`, '#fff1a5');
    } else if (data.class === 'bonus') {
      fish.setTint(0xfff19a);
    }

    fish.setData('wakeTimer', 0);
  }

  getFishRoute(isLargeVariant) {
    const margin = isLargeVariant ? 280 : 190;
    // 砲台在畫面下方（CANNON_ORIGIN.y = 1750），魚的活動上限抓 1450 避免穿過砲台
    const FISH_AREA_BOTTOM = 1450;
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

    this.fishGroup.children.each((fish) => {
      this.animateFishSwim(fish, time, delta);
      if (fish.x < -360 || fish.x > GAME_WIDTH + 360 || fish.y < -360 || fish.y > GAME_HEIGHT + 360) {
        fish.destroy();
      }
    });

    this.bulletGroup.children.each((bullet) => {
      bullet.setData('life', bullet.getData('life') - delta);
      if (bullet.getData('life') <= 0
          || bullet.x < -60 || bullet.x > GAME_WIDTH + 60
          || bullet.y < -60 || bullet.y > GAME_HEIGHT + 60) {
        bullet.destroy();
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
    if (this.coins < this.bet) {
      this.flashFloatingText(CENTER_X, 1620, '金幣不足', '#ff7777');
      this.isFiring = false;
      return;
    }

    this.coins -= this.bet;
    this.displayCoins = this.coins;
    this.fireCooldown = BULLET_COOLDOWN;

    const angle = Phaser.Math.Angle.Between(CANNON_ORIGIN.x, CANNON_ORIGIN.y, this.aimPoint.x, this.aimPoint.y);
    const muzzleX = CANNON_ORIGIN.x + Math.cos(angle) * 110;
    const muzzleY = CANNON_ORIGIN.y + Math.sin(angle) * 110;

    const bullet = this.bulletGroup.create(muzzleX, muzzleY, 'bulletTex');
    const bulletScale = 0.9 + this.bet * 0.12;  // 下注越高砲彈越大顆
    bullet.setScale(bulletScale)
      .setDepth(3200);
    // bulletTex 是 48px 圓形，body 對齊紋理中心
    const bodyRadius = 16;
    bullet.body.setCircle(bodyRadius, 24 - bodyRadius, 24 - bodyRadius);
    bullet.setVelocity(Math.cos(angle) * BULLET_SPEED, Math.sin(angle) * BULLET_SPEED);

    // 拖尾效果，讓子彈軌跡更明顯
    const trail = this.add.circle(muzzleX, muzzleY, 18 * bulletScale, 0xffd447, 0.45)
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

    const muzzleFlash = this.add.circle(muzzleX, muzzleY, 36 + this.bet * 4, 0xfff1a5, 0.7)
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

    // 子彈消耗
    const burst = this.add.sprite(bullet.x, bullet.y, 'cannonEffects', 10)
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

    // 命中閃光
    this.tweens.add({
      targets: fish,
      scaleX: fish.getData('baseScale') * 1.12,
      scaleY: fish.getData('baseScale') * 1.12,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    fish.setTintFill(0xffffff);
    this.time.delayedCall(50, () => {
      if (fish.active) fish.clearTint();
    });

    // 擊殺機率 = (下注 / 魚倍率) * RTP，含微量保底與封頂
    const chance = Phaser.Math.Clamp((bet / odds) * RTP, 0.005, 0.95);
    if (Math.random() < chance) {
      this.catchFish(fish, bet);
    }
  }

  catchFish(fish, bet) {
    const odds = fish.getData('odds');
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
    for (let i = 0; i < count; i += 1) {
      this.time.delayedCall(i * 10, () => {
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
