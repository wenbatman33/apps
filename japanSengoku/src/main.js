import Phaser from 'phaser';
import './styles.css';

// 依視窗方向自動切換橫版 / 直版（手機）佈局
const IS_PORTRAIT = window.innerHeight > window.innerWidth;

// 橫版（PC）座標
const LANDSCAPE = {
  W: 1920,
  H: 1080,
  BOARD: { cell: 132 },
  GRID_X: [574, 727, 880, 1033, 1186, 1339],
  GRID_Y: [365, 489, 613, 737, 861],
  BOARD_FRAME: { x: 960, y: 583, width: 1188, height: 766 },
  WIN_FRAME: { size: 118, hold: 620 },
  CHARACTER: {
    height: 650,
    odaIdle: { x: 235, y: 610 },
    odaActive: { x: 255 },
    odaAttack: { x: 275 },
    takedaIdle: { x: 1695, y: 610 },
    takedaActive: { x: 1730 },
    takedaHeightActive: 520
  },
  JACKPOT: {
    stripY: 82,
    stripWidth: 1450,
    // 從 jackpot-strip.png 量測：4 個方框中心位於圖檔 13.1% / 36.0% / 63.3% / 86.9%
    // canvas x = (WIDTH - stripWidth)/2 + stripWidth × ratio
    items: [
      ['GRAND', 425],
      ['MAJOR', 757],
      ['MINOR', 1153],
      ['MINI', 1495]
    ],
    labelOffset: -110,
    valueOffset: 110,
    labelFont: '20px',
    valueFont: '19px'
  },
  SPIN_INFO: { y: 164, width: 720, innerWidth: 688, gemOffset: 372, fontSize: '27px', textWidth: 660 },
  WIN_BADGE: { y: 218, width: 410, innerWidth: 388, fontSize: '34px' },
  HUD: {
    barY: 1014,
    creditX: 690,
    scoreX: 960,
    betX: 1230,
    betMinusX: 1130,
    betPlusX: 1330,
    statY: 1004
  },
  SPIN_CTRL: {
    spinX: 1584, spinY: 900, spinSize: 242, spinRadius: 112,
    smallControls: [
      ['AUTO', 1492, 824, 56, '23px']
    ]
  },
  MENU: {
    titleY: 150, titleFont: '118px',
    subtitleY: 258, subtitleFont: '58px',
    startY: 822, startW: 540, startH: 158, startFont: '46px',
    hintY: 963, hintFont: '31px'
  },
  PRELOAD: {
    titleY: 138, titleFont: '80px',
    barY: 885, barW: 780, barInnerW: 744, statusY: 942, statusFont: '30px'
  },
  ATTACK_FX: {
    odaFlash: { x: 270, y: 350 },
    odaSlashA: { x: 310, y: 354 },
    odaSlashB: { x: 358, y: 406 },
    takedaFanA: { x: 1506, y: 360 },
    takedaFanB: { x: 1540, y: 430 },
    spinSlash: { x: 248, y: 382 },
    spinFan: { x: 1508, y: 366 }
  },
  COIN_RANGE: { x: [850, 1070], y: [145, 235], fallY: [520, 860] }
};

// 直版（手機）座標 — 1080×1920
// GRID 對齊 board-frame.png 實際 6×5 格中心（從圖檔金色格線量測得 col%、row%）
// 人物採上半身裁切（top-anchored，CROP_RATIO 控制裁切比例）
const PORTRAIT = {
  W: 1080,
  H: 1920,
  BOARD: { cell: 130 },
  GRID_X: [219, 347, 473, 599, 725, 854],
  GRID_Y: [755, 899, 1031, 1163, 1290],
  BOARD_FRAME: { x: 540, y: 1000, width: 980, height: 830 },
  WIN_FRAME: { size: 120, hold: 620 },
  CHARACTER: {
    height: 480,
    cropRatio: 0.5,
    odaIdle: { x: 240, y: 260 },
    odaActive: { x: 260 },
    odaAttack: { x: 280 },
    takedaIdle: { x: 840, y: 260 },
    takedaActive: { x: 860 },
    takedaHeightActive: 420
  },
  JACKPOT: {
    stripY: 70,
    stripWidth: 1040,
    // 從 jackpot-strip.png 量測精準位置（13.1% / 36% / 63.3% / 86.9%）
    items: [
      ['GRAND', 156],
      ['MAJOR', 394],
      ['MINOR', 678],
      ['MINI', 924]
    ],
    labelOffset: -78,
    valueOffset: 78,
    labelFont: '22px',
    valueFont: '21px'
  },
  SPIN_INFO: { y: 158, width: 1000, innerWidth: 960, gemOffset: 510, fontSize: '32px', textWidth: 920 },
  WIN_BADGE: { y: 1475, width: 540, innerWidth: 518, fontSize: '38px' },
  HUD: {
    barY: 1560,
    creditX: 250,
    scoreX: 540,
    betX: 830,
    betMinusX: 730,
    betPlusX: 930,
    statY: 1560,
    barH: 132
  },
  SPIN_CTRL: {
    spinX: 540, spinY: 1740, spinSize: 240, spinRadius: 116,
    smallControls: [
      ['AUTO', 800, 1740, 60, '24px']
    ]
  },
  MENU: {
    titleY: 360, titleFont: '128px',
    subtitleY: 500, subtitleFont: '70px',
    startY: 1320, startW: 620, startH: 180, startFont: '54px',
    hintY: 1540, hintFont: '34px'
  },
  PRELOAD: {
    titleY: 320, titleFont: '110px',
    barY: 1500, barW: 880, barInnerW: 844, statusY: 1580, statusFont: '36px'
  },
  ATTACK_FX: {
    odaFlash: { x: 280, y: 320 },
    odaSlashA: { x: 320, y: 326 },
    odaSlashB: { x: 360, y: 380 },
    takedaFanA: { x: 800, y: 320 },
    takedaFanB: { x: 832, y: 400 },
    spinSlash: { x: 250, y: 380 },
    spinFan: { x: 820, y: 380 }
  },
  COIN_RANGE: { x: [380, 700], y: [80, 200], fallY: [1500, 1800] }
};

const L = IS_PORTRAIT ? PORTRAIT : LANDSCAPE;
const WIDTH = L.W;
const HEIGHT = L.H;
const BOARD = L.BOARD;
const GRID_X = L.GRID_X;
const GRID_Y = L.GRID_Y;
const BOARD_FRAME = L.BOARD_FRAME;
const WIN_FRAME = L.WIN_FRAME;
const CHARACTER_HEIGHT = L.CHARACTER.height;

// 戰神賽特對標：Pay Anywhere ≥ 8 算中，三階梯賠率（8-9 / 10-11 / 12+）
// 賠率對應 ATG 攻略網公開資料，套用到戰國武將主題：
//   信長/信玄 ← Eye of Horus 等級（200/500/1000）
//   兜 ← Sickle（50/200/500）
//   軍配 ← Ankh（40/100/300）
//   刀 ← Scimitar（30/40/240）
//   槍 ← Gem1（16/24/160）
//   火繩槍 ← Gem2（10/20/100）
//   太鼓 ← Gem3（8/18/80）
//   鳥居/櫻/楓/雪/花火 ← Gem4（5/15/40）
//   小判 scatter ← Scarab 雙重身分（觸發 FG + 8+ 也付費）
// 戰神賽特風格：少量 symbol 但高集中度，達 hit rate ~23%（與 SoS 2 公開值一致）
// 賠率對標 ATG 攻略網
const SYMBOLS = [
  { id: 'scatter',   label: '小判',   payTable: { 8: 60,  10: 100, 12: 2000 }, weight: 4.2 },
  { id: 'bonus',     label: '覺醒',   weight: 1.0, awakened: true },
  // 高分 paying（稀有）
  { id: 'oda',       label: '信長',   payTable: { 8: 200, 10: 500, 12: 1000 }, weight: 5 },
  { id: 'takeda',    label: '信玄',   payTable: { 8: 200, 10: 500, 12: 1000 }, weight: 5 },
  { id: 'kabuto',    label: '兜',     payTable: { 8: 50,  10: 200, 12: 500 },  weight: 8 },
  { id: 'gunbai',    label: '軍配',   payTable: { 8: 40,  10: 100, 12: 300 },  weight: 10 },
  // 中分
  { id: 'katana',    label: '刀',     payTable: { 8: 30,  10: 40,  12: 240 },  weight: 14 },
  { id: 'yari',      label: '槍',     payTable: { 8: 16,  10: 24,  12: 160 },  weight: 18 },
  // 低分（gem 等級）— 大幅集中讓 hit rate 接近 24%
  { id: 'rifle',     label: '火繩槍', payTable: { 8: 10,  10: 20,  12: 100 },  weight: 22 },
  { id: 'taiko',     label: '太鼓',   payTable: { 8: 8,   10: 18,  12: 80 },   weight: 26 },
  { id: 'torii',     label: '鳥居',   payTable: { 8: 5,   10: 15,  12: 40 },   weight: 30 },
  { id: 'sakura',    label: '櫻',     payTable: { 8: 5,   10: 15,  12: 40 },   weight: 34 },
  { id: 'snowflake', label: '雪',     payTable: { 8: 5,   10: 15,  12: 40 },   weight: 36 },
  // 倍數球 7 階（戰神賽特公開值 2~500）
  // 每顆使用獨立 PNG（mult2.png ~ mult500.png），圖內已嵌入倍數數字
  { id: 'mult2',     label: '2x',     multiplier: 2,    weight: 6.0 },
  { id: 'mult5',     label: '5x',     multiplier: 5,    weight: 3.5 },
  { id: 'mult10',    label: '10x',    multiplier: 10,   weight: 1.8 },
  { id: 'mult25',    label: '25x',    multiplier: 25,   weight: 0.9 },
  { id: 'mult50',    label: '50x',    multiplier: 50,   weight: 0.45 },
  { id: 'mult100',   label: '100x',   multiplier: 100,  weight: 0.2 },
  { id: 'mult500',   label: '500x',   multiplier: 500,  weight: 0.05 }
];
// 註：移除 momiji/hanabi（圖檔保留可作為節慶/特殊版本）— 集中到 13 → 11 symbol 提高 hit rate

// 將 count 對應到 payTable 階梯
function payoutFor(symbol, count) {
  if (!symbol.payTable) return 0;
  if (count >= 12) return symbol.payTable[12];
  if (count >= 10) return symbol.payTable[10];
  if (count >= 8)  return symbol.payTable[8];
  return 0;
}

const SEASONS = [
  { name: '春', color: 0xffb7d5, textColor: '#ffb7d5', text: '春櫻', drift: 'petal' },
  { name: '夏', color: 0xffe27a, textColor: '#ffe27a', text: '夏祭', drift: 'firefly' },
  { name: '秋', color: 0xff7b24, textColor: '#ff9b55', text: '秋楓', drift: 'maple' },
  { name: '冬', color: 0xd8f6ff, textColor: '#d8f6ff', text: '冬雪', drift: 'snow' }
];

const AUDIO = {
  music: {
    sengoku: 'assets/BGM/newBGM.mp3'
  },
  sfx: {
    ready: 'assets/sound/ready.mp3',
    victory: 'assets/sound/victory.mp3',
    crowd: 'assets/sound/crowd.mp3',
    charge: 'assets/sound/charge.mp3',
    click: 'assets/sound/click.mp3',
    confirm: 'assets/sound/confirm.mp3',
    spin: 'assets/sound/spin.mp3',
    clear: 'assets/sound/clear.mp3',
    fan: 'assets/sound/fan.mp3',
    drop: 'assets/sound/drop.mp3',
    rifle: 'assets/sound/rifle.mp3',
    cheer: 'assets/sound/cheer.mp3'
  }
};

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('loading-bg', 'assets/images/screens/sengoku-loading-background.png');
    // 標題圖在 BootScene 先載，讓 PreloadScene 的 loading 畫面也能使用
    this.load.image('jp-title', 'assets/images/ui/title-Photoroom.png');
  }

  create() {
    this.scene.start('PreloadScene');
  }
}

class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    coverImage(this, this.add.image(WIDTH / 2, HEIGHT / 2, 'loading-bg'), WIDTH, HEIGHT);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x05020a, 0.42);

    // 用同一張標題 logo 取代純文字
    const loadingTitle = this.add.image(WIDTH / 2, L.PRELOAD.titleY, 'jp-title').setOrigin(0.5);
    const targetW = IS_PORTRAIT ? WIDTH * 0.78 : WIDTH * 0.38;
    loadingTitle.setScale(targetW / loadingTitle.width);

    const barOuter = this.add.rectangle(WIDTH / 2, L.PRELOAD.barY, L.PRELOAD.barW, 36, 0x130915, 0.92)
      .setStrokeStyle(3, 0xe4b84c, 1);
    const barInner = this.add.rectangle(barOuter.x - L.PRELOAD.barInnerW / 2, L.PRELOAD.barY, 0, 18, 0xffd766, 1)
      .setOrigin(0, 0.5);
    const status = this.add.text(WIDTH / 2, L.PRELOAD.statusY, '點亮安土桃山城...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: L.PRELOAD.statusFont,
      color: '#f7d889'
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      barInner.width = L.PRELOAD.barInnerW * value;
      status.setText(`載入素材 ${Math.round(value * 100)}%`);
    });

    this.load.image('menu-bg', 'assets/images/screens/sengoku-main-menu-background.png');
    this.load.image('gameplay-concept', IS_PORTRAIT
      ? 'assets/images/layers/clean-background-mobile.png'
      : 'assets/images/layers/clean-background.png');
    this.load.image('oda-stand', 'assets/images/characters/poses/oda-stand.png');
    this.load.image('oda-fire', 'assets/images/characters/poses/oda-fire.png');
    this.load.image('takeda-stand', 'assets/images/characters/poses/takeda-stand.png');
    this.load.image('takeda-wave', 'assets/images/characters/poses/takeda-wave.png');
    this.load.image('jp-jackpot-strip', 'assets/images/layers/jackpot-strip.png');
    this.load.image('jp-board-frame', 'assets/images/layers/board-frame.png');
    this.load.image('jp-spin-button', 'assets/images/layers/spin-button.png');
    this.load.image('jp-start-button', 'assets/images/ui/start-button.png');
    // 商業化新素材
    this.load.image('ui-bigwin-text', 'assets/images/ui/bigwin-text.png');
    this.load.image('ui-bigwin-bg', 'assets/images/ui/bigwin-banner-bg.png');
    this.load.image('ui-buy-feature', 'assets/images/ui/buy-feature-button.png');
    this.load.image('ui-auto', 'assets/images/ui/auto-button.png');
    this.load.image('ui-freegame-intro', 'assets/images/ui/freegame-intro-bg.png');
    this.load.image('oda-bust', 'assets/images/characters/oda-bust.png');
    this.load.image('takeda-bust', 'assets/images/characters/takeda-bust.png');
    this.load.image('oda-bigwin', 'assets/images/characters/poses/oda-bigwin.png');
    this.load.image('takeda-bigwin', 'assets/images/characters/poses/takeda-bigwin.png');
    this.load.image('fx-koban', 'assets/images/fx/koban-coin.png');
    for (let i = 1; i <= 4; i++) {
      this.load.image(`scatter-glow-${i}`, `assets/images/symbols/scatter-glow-0${i}.png`);
    }
    this.load.audio('bgm-sengoku', AUDIO.music.sengoku);
    Object.entries(AUDIO.sfx).forEach(([key, path]) => {
      this.load.audio(`sfx-${key}`, path);
    });
    SYMBOLS.forEach((symbol) => {
      // 每個 symbol 用對應同名 png（mult2, mult5, ..., mult500 各有自己的圖）
      let path;
      if (symbol.id === 'scatter') path = 'assets/images/symbols/scatter-glow-01.png';
      else if (symbol.id === 'bonus') path = 'assets/images/symbols/scatter-glow-04.png';
      else path = `assets/images/symbols/${symbol.id}.png`;
      this.load.image(`symbol-${symbol.id}`, path);
    });
  }

  create() {
    this.scene.start('MenuScene');
  }
}

class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    coverImage(this, this.add.image(WIDTH / 2, HEIGHT / 2, 'menu-bg'), WIDTH, HEIGHT);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x09030c, 0.2);
    this.input.once('pointerdown', () => playMusic(this, 'bgm-sengoku', { volume: 0.34 }));

    // 主+副標 logo 圖（天下布武 + 長篠の戦い）
    const titleImg = this.add.image(WIDTH / 2, L.MENU.subtitleY, 'jp-title').setOrigin(0.5);
    const titleTargetW = IS_PORTRAIT ? WIDTH * 0.82 : WIDTH * 0.42;
    titleImg.setScale(titleTargetW / titleImg.width);

    const button = this.add.image(WIDTH / 2, L.MENU.startY, 'jp-start-button').setDisplaySize(L.MENU.startW, L.MENU.startH);
    // 圖檔頂部花飾突出造成幾何中心偏上，文字下移到紅色橫條視覺中心
    const textOffsetY = Math.round(L.MENU.startH * 0.08);
    const buttonText = this.add.text(WIDTH / 2, L.MENU.startY + textOffsetY, '開始遊戲', {
      fontFamily: 'Yu Mincho, Hiragino Mincho ProN, Georgia, serif',
      fontSize: L.MENU.startFont,
      fontStyle: 'bold',
      color: '#fff1b8',
      stroke: '#3a0804',
      strokeThickness: 6
    }).setOrigin(0.5);
    const startZone = this.add.rectangle(WIDTH / 2, L.MENU.startY, L.MENU.startW, L.MENU.startH, 0x000000, 0.01).setInteractive({ useHandCursor: true });
    startZone.on('pointerover', () => {
      playSfx(this, 'sfx-click', { volume: 0.24, cooldown: 220 });
      button.setScale(button.scaleX * 1.025, button.scaleY * 1.025);
      buttonText.setScale(1.025);
    });
    startZone.on('pointerout', () => {
      button.setDisplaySize(L.MENU.startW, L.MENU.startH);
      buttonText.setScale(1);
    });
    startZone.on('pointerup', () => {
      playMusic(this, 'bgm-sengoku', { volume: 0.38 });
      playSfx(this, 'sfx-ready', { volume: 0.72 });
      this.scene.start('GameScene');
    });

    const hint = '6x5 盤面 · 小判 SCATTER · 倍數球 · 四季變換 · 金幣雨';
    this.add.text(WIDTH / 2, L.MENU.hintY, hint, {
      fontFamily: 'Arial, sans-serif',
      fontSize: L.MENU.hintFont,
      color: '#f8db8a'
    }).setOrigin(0.5);
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.cols = 6;
    this.rows = 5;
    this.cell = BOARD.cell;
    this.grid = [];
    this.symbolViews = [];
    this.viewGrid = [];
    this.credits = 64000;  // 起始 400 spin（bet 160）
    this.score = 63608;
    this.bet = 160;
    this.freeGames = 0;
    this.isSpinning = false;
    this.spinCount = 0;
    this.seasonIndex = 0;
    this.autoSpin = false;
    this.autoButton = null;
    this.autoLabel = null;
    this.inFreeGame = false;
    this.stickyMultiplier = 0;
    this.buyFeatureCost = 100;
    this.devMode = new URLSearchParams(window.location.search).has('dev');
    this.devForceScatter = false;
    this.devForceMult = false;
    this.totalBet = 0;
    this.totalWin = 0;
  }

  create() {
    this.bgImage = this.add.image(WIDTH / 2, HEIGHT / 2, 'gameplay-concept');
    coverImage(this, this.bgImage, WIDTH, HEIGHT);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x10040a, 0.28);
    playMusic(this, 'bgm-sengoku', { volume: 0.38 });
    this.createHeader();
    this.createSeasonEffects();
    this.createSideLabels();
    this.createBoard();
    this.createBottomHud();
    this.createSpinControl();
    this.fillBoard(false);
    this.updateHud();

    if (this.devMode) window.__sengoku = this;

    // 首次進場顯示 SCATTER 說明（每次 reload 顯示一次）
    if (!sessionStorage.getItem('sengoku_intro_shown')) {
      this.time.delayedCall(600, () => this.showScatterRulesIntro());
      sessionStorage.setItem('sengoku_intro_shown', '1');
    }
  }

  devForceCluster() {
    if (this.isSpinning) return;
    // 在中央區域 (2 行 × 4 格) 強制塞同一個 paying symbol
    const sym = SYMBOLS.find(s => s.id === 'sakura');
    const startR = Math.floor(this.rows / 2) - 1;
    const startC = Math.floor(this.cols / 2) - 2;
    for (let dr = 0; dr < 2; dr += 1) {
      for (let dc = 0; dc < 4; dc += 1) {
        const r = startR + dr;
        const c = startC + dc;
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;
        const oldView = this.viewGrid[r][c];
        if (oldView) {
          if (oldView.scatterRibbon) oldView.scatterRibbon.destroy();
          if (oldView.scatterLabel) oldView.scatterLabel.destroy();
          if (oldView.multText) oldView.multText.destroy();
          this.symbolViews = this.symbolViews.filter(v => v !== oldView);
          oldView.destroy();
        }
        this.grid[r][c] = sym;
        this.viewGrid[r][c] = this.createSymbol(sym, c, r);
      }
    }
    this.flashMessage('Dev: 強制塞入 8 連櫻花群集');
    this.time.delayedCall(250, () => {
      this.resolveCascade({
        cascade: 1,
        multiplier: 1,
        scatterBonus: 0,
        totalWin: 0,
        lastOrbSum: 0
      });
    });
  }

  showScatterRulesIntro() {
    const cx = WIDTH / 2, cy = HEIGHT / 2;
    const layer = [];
    const overlay = this.add.rectangle(cx, cy, WIDTH, HEIGHT, 0x000000, 0.88).setDepth(90).setInteractive();
    layer.push(overlay);

    // 標題（縮小）
    const title = this.add.text(cx, cy - 360, '觸發規則', {
      fontFamily: 'Yu Mincho, Hiragino Mincho ProN, Georgia, serif',
      fontSize: '64px', fontStyle: 'bold',
      color: '#ffe9a6', stroke: '#471207', strokeThickness: 8
    }).setOrigin(0.5).setDepth(91);
    layer.push(title);

    // 3 條規則：每條只用 1~2 個 icon + ×N 寫法 + 簡短結果
    const rules = [
      { icons: [['scatter', 4]],                  result: '15 次免費' },
      { icons: [['scatter', 3], ['bonus', 1]],    result: '覺醒之力\n15 次 · 3×' },
      { icons: [['bonus', 2]],                    result: '超級覺醒\n20 次 · 5×' }
    ];

    const rowStartY = cy - 200;
    const rowSpacing = 180;
    rules.forEach((row, i) => {
      const ry = rowStartY + i * rowSpacing;

      // 左側 icon 區（最多 2 組）
      const leftCenter = cx - 220;
      let ix = leftCenter - (row.icons.length - 1) * 80;
      row.icons.forEach(([symId, count], idx) => {
        const icon = this.add.image(ix, ry, `symbol-${symId}`)
          .setDisplaySize(96, 96).setDepth(92);
        if (symId === 'bonus') icon.setTint(0xb47dff);
        layer.push(icon);
        // ×N 角標
        const badge = this.add.text(ix + 32, ry + 32, `×${count}`, {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '32px', fontStyle: 'bold',
          color: '#ffe27a', stroke: '#3a0408', strokeThickness: 4
        }).setOrigin(0.5).setDepth(93);
        layer.push(badge);
        // 多組之間用「+」
        if (idx < row.icons.length - 1) {
          const plus = this.add.text(ix + 90, ry, '+', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '52px', color: '#ffd76b', fontStyle: 'bold'
          }).setOrigin(0.5).setDepth(92);
          layer.push(plus);
        }
        ix += 160;
      });

      // 箭頭
      const arrow = this.add.text(cx - 20, ry, '→', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '54px', color: '#ffd76b'
      }).setOrigin(0.5).setDepth(92);
      layer.push(arrow);

      // 結果文字（簡短，多行）
      const resultText = this.add.text(cx + 60, ry, row.result, {
        fontFamily: 'Yu Mincho, Hiragino Mincho ProN, Georgia, serif',
        fontSize: '36px', fontStyle: 'bold',
        color: '#fff1b8',
        stroke: '#240606', strokeThickness: 5,
        align: 'left', lineSpacing: 6
      }).setOrigin(0, 0.5).setDepth(92);
      layer.push(resultText);
    });

    // 「我知道了」按鈕
    const btnY = cy + 380;
    const btnBg = this.add.image(cx, btnY, 'ui-buy-feature').setDisplaySize(360, 96).setDepth(92);
    const btnText = this.add.text(cx, btnY, '我知道了', {
      fontFamily: 'Yu Mincho, Hiragino Mincho ProN, Georgia, serif',
      fontSize: '40px', fontStyle: 'bold',
      color: '#fff1b8', stroke: '#3a0408', strokeThickness: 5
    }).setOrigin(0.5).setDepth(93);
    layer.push(btnBg, btnText);

    const close = () => {
      this.tweens.add({
        targets: layer, alpha: 0, duration: 280,
        onComplete: () => layer.forEach(n => n.destroy())
      });
    };
    this.add.rectangle(cx, btnY, 360, 96, 0x000000, 0.01)
      .setInteractive({ useHandCursor: true }).setDepth(94)
      .on('pointerup', () => { playSfx(this, 'sfx-confirm', { volume: 0.5 }); close(); });
    overlay.on('pointerup', () => { playSfx(this, 'sfx-click', { volume: 0.3 }); close(); });

    layer.forEach(n => n.setAlpha(0));
    this.tweens.add({ targets: layer, alpha: 1, duration: 320 });
  }

  createHeader() {
    const J = L.JACKPOT;
    const jackpots = [
      ['巨獎', '202,315.99'],
      ['大獎', '61,747.80'],
      ['中獎', '8,363.25'],
      ['小獎', '2,029.09']
    ];

    const jackpotStrip = this.add.image(WIDTH / 2, J.stripY, 'jp-jackpot-strip').setDepth(2);
    jackpotStrip.setScale(J.stripWidth / jackpotStrip.width);
    jackpots.forEach(([label, amount], i) => {
      const x = J.items[i][1];
      // 上下兩行佈局：標題在上、金額在下，皆水平置中於各自獎金框
      this.add.text(x, J.stripY - 14, label, {
        fontFamily: 'Yu Mincho, Hiragino Mincho ProN, "PingFang TC", "Microsoft JhengHei", serif',
        fontSize: J.labelFont,
        fontStyle: 'bold',
        color: '#ffd66a'
      }).setOrigin(0.5).setDepth(3);
      this.add.text(x, J.stripY + 12, amount, {
        fontFamily: 'Arial, sans-serif',
        fontSize: J.valueFont,
        color: '#fff3d6'
      }).setOrigin(0.5).setDepth(3);
    });

    this.createSpinInfoPanel();
  }

  createSpinInfoPanel() {
    const SI = L.SPIN_INFO;
    this.spinInfoPanel = this.add.container(WIDTH / 2, SI.y).setDepth(9);
    const shadow = this.add.rectangle(0, 8, SI.width, 56, 0x030205, 0.62);
    const body = this.add.rectangle(0, 0, SI.width, 56, 0x11070a, 0.94)
      .setStrokeStyle(4, 0xd7a339, 0.96);
    const inner = this.add.rectangle(0, 0, SI.innerWidth, 36, 0x3b0b13, 0.72)
      .setStrokeStyle(1, 0xffe6a0, 0.42);
    const leftGem = this.add.polygon(-SI.gemOffset, 0, [0, -11, 11, 0, 0, 11, -11, 0], 0xf1c65a, 0.95)
      .setStrokeStyle(2, 0x5a2706, 1);
    const rightGem = this.add.polygon(SI.gemOffset, 0, [0, -11, 11, 0, 0, 11, -11, 0], 0xf1c65a, 0.95)
      .setStrokeStyle(2, 0x5a2706, 1);
    this.message = this.add.text(0, 0, '再轉一次，等待天下布武之刻', {
      fontFamily: 'Arial, sans-serif',
      fontSize: SI.fontSize,
      color: '#fff0b3',
      stroke: '#240606',
      strokeThickness: 4,
      align: 'center',
      fixedWidth: SI.textWidth
    }).setOrigin(0.5);
    this.spinInfoPanel.add([shadow, body, inner, leftGem, rightGem, this.message]);
  }

  createSideLabels() {
    const C = L.CHARACTER;
    // 直版人物藏在盤面框下層，讓金框遮住裁切下緣；直版改用專屬 bust 圖（無需 setCrop）
    const charDepth = IS_PORTRAIT ? 0 : 4;
    const odaKey = IS_PORTRAIT ? 'oda-bust' : 'oda-stand';
    const takedaKey = IS_PORTRAIT ? 'takeda-bust' : 'takeda-stand';
    this.oda = this.add.image(C.odaIdle.x, C.odaIdle.y, odaKey).setDepth(charDepth);
    setImageHeight(this.oda, CHARACTER_HEIGHT);
    this.oda.setAlpha(0.96);
    this.takeda = this.add.image(C.takedaIdle.x, C.takedaIdle.y, takedaKey).setDepth(charDepth);
    setImageHeight(this.takeda, CHARACTER_HEIGHT);
    this.takeda.setAlpha(0.95);

    this.freeText = null;
  }

  createBoard() {
    this.boardX = GRID_X[0] - BOARD.cell / 2;
    this.boardY = GRID_Y[0] - BOARD.cell / 2;
    this.cell = BOARD.cell;
    this.boardW = this.cols * this.cell;
    this.boardH = this.rows * this.cell;

    this.add.image(BOARD_FRAME.x, BOARD_FRAME.y, 'jp-board-frame')
      .setDisplaySize(BOARD_FRAME.width, BOARD_FRAME.height)
      .setDepth(1);

    const WB = L.WIN_BADGE;
    this.winBadge = this.add.container(WIDTH / 2, WB.y).setDepth(8);
    this.winBadge.add(this.add.rectangle(0, 6, WB.width, 54, 0x030205, 0.52));
    this.winBadge.add(this.add.rectangle(0, 0, WB.width, 54, 0x11070a, 0.86).setStrokeStyle(4, 0xd7a339, 0.85));
    this.winBadge.add(this.add.rectangle(0, 0, WB.innerWidth, 34, 0x281017, 0.6).setStrokeStyle(1, 0xffe6a0, 0.3));
    this.winText = this.add.text(0, 0, '64.00', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: WB.fontSize,
      color: '#ffe680',
      stroke: '#4d1700',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.winBadge.add(this.winText);
  }

  createBottomHud() {
    const H_ = L.HUD;
    this.add.rectangle(WIDTH / 2, H_.barY, WIDTH, 132, 0x02030a, 0.72);
    this.creditText = statText(this, H_.creditX, H_.statY, '點數', '640.03');
    this.scoreText = statText(this, H_.scoreX, H_.statY, '贏分', '63,608.00');

    this.betPanel = this.add.container(H_.betX, H_.statY);
    // 加寬到 300，-/+ 按鈕不再壓邊
    this.betPanel.add(this.add.rectangle(0, 0, 300, 72, 0x050506, 0.86).setStrokeStyle(4, 0x6b6070, 1));
    this.betValueText = this.add.text(0, 0, String(this.bet), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '36px',
      color: '#f5f0ea'
    }).setOrigin(0.5);
    this.betPanel.add(this.betValueText);

    this.add.text(H_.betMinusX, H_.statY, '-', {
      fontFamily: 'Arial Black', fontSize: '48px', color: '#d9d4dc'
    }).setOrigin(0.5);
    this.add.text(H_.betPlusX, H_.statY, '+', {
      fontFamily: 'Arial Black', fontSize: '46px', color: '#d9d4dc'
    }).setOrigin(0.5);

    this.add.rectangle(H_.betMinusX, H_.statY, 72, 72, 0x000000, 0.01).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      playSfx(this, 'sfx-click', { volume: 0.32, cooldown: 140 });
      this.bet = Math.max(20, this.bet - 20);
      this.updateHud();
    });
    this.add.rectangle(H_.betPlusX, H_.statY, 72, 72, 0x000000, 0.01).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      playSfx(this, 'sfx-click', { volume: 0.32, cooldown: 140 });
      this.bet = Math.min(1000, this.bet + 20);
      this.updateHud();
    });
  }

  createSpinControl() {
    const SC = L.SPIN_CTRL;
    const spin = this.add.container(SC.spinX, SC.spinY);
    spin.add(this.add.image(0, 0, 'jp-spin-button').setDisplaySize(SC.spinSize, SC.spinSize));
    spin.setDepth(8);

    this.spinZone = this.add.circle(SC.spinX, SC.spinY, SC.spinRadius, 0x000000, 0.01).setInteractive({ useHandCursor: true });
    this.spinZone.on('pointerup', () => this.spin());
    this.spinContainer = spin;

    SC.smallControls.forEach(([label, x, y, radius, fontSize]) => {
      const circle = this.add.circle(x, y, radius, 0x05060c, 0.82).setStrokeStyle(4, 0x374052, 1).setDepth(9);
      const text = this.add.text(x, y, label, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize,
        color: '#d8dcff'
      }).setOrigin(0.5).setDepth(10);
      const hit = this.add.circle(x, y, radius, 0x000000, 0.01)
        .setInteractive({ useHandCursor: true })
        .setDepth(11);
      if (label === 'AUTO') {
        this.autoButton = circle;
        this.autoLabel = text;
        hit.on('pointerup', () => this.toggleAutoSpin());
      } else {
        hit.on('pointerup', () => playSfx(this, 'sfx-confirm', { volume: 0.34, cooldown: 180 }));
      }
    });

    this.createBuyFeature();
    if (this.devMode) this.createDevPanel();
  }

  createBuyFeature() {
    const SC = L.SPIN_CTRL;
    // 直版：左下 280；橫版：信長那一側（避開 Oda 角色右邊）
    const x = IS_PORTRAIT ? 280 : 480;
    const y = SC.spinY;
    const w = IS_PORTRAIT ? 180 : 160;
    const h = IS_PORTRAIT ? 92 : 74;

    const bg = this.add.image(x, y, 'ui-buy-feature').setDisplaySize(w, h).setDepth(9);
    this.add.text(x, y - 6, '購買特色', {
      fontFamily: 'Yu Mincho, Hiragino Mincho ProN, Georgia, serif',
      fontSize: IS_PORTRAIT ? '24px' : '18px',
      color: '#fff1b8',
      fontStyle: 'bold',
      stroke: '#3a0408',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(10);
    this.buyCostText = this.add.text(x, y + 22, `${this.buyFeatureCost}x`, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: IS_PORTRAIT ? '20px' : '16px',
      color: '#ffe27a',
      stroke: '#3a0408',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    this.add.rectangle(x, y, w, h, 0x000000, 0.01)
      .setInteractive({ useHandCursor: true })
      .setDepth(11)
      .on('pointerup', () => this.tryBuyFeature());
    this.buyBg = bg;
  }

  tryBuyFeature() {
    if (this.isSpinning || this.inFreeGame) return;
    const cost = this.bet * this.buyFeatureCost;  // Buy Feature 100x bet
    if (this.credits < cost) {
      this.flashMessage('點數不足，無法購買');
      return;
    }
    playSfx(this, 'sfx-confirm', { volume: 0.5 });
    this.credits -= cost;
    this.startFreeGame(15, true);
  }

  createDevPanel() {
    const W_ = IS_PORTRAIT ? 300 : 400;
    const H_ = IS_PORTRAIT ? 560 : 580;
    const x = 20 + W_ / 2;
    const y = IS_PORTRAIT ? 60 + H_ / 2 : HEIGHT - H_ / 2 - 60;
    this.add.rectangle(x, y, W_, H_, 0x000000, 0.85).setStrokeStyle(2, 0x66ff66, 1).setDepth(99);
    const fontFamily = '"PingFang TC", "Microsoft JhengHei", sans-serif';

    // 1) Title
    this.add.text(x, y - H_ / 2 + 16, '開發者模式', { fontFamily, fontSize: '16px', color: '#66ff66', fontStyle: 'bold' }).setOrigin(0.5).setDepth(100);

    // 2) Stats
    this.devStatsText = this.add.text(x - W_ / 2 + 14, y - H_ / 2 + 36, '', { fontFamily: '"PingFang TC", "Microsoft JhengHei", monospace', fontSize: '13px', color: '#aaffaa', align: 'left', lineSpacing: 4 }).setOrigin(0, 0).setDepth(100);

    const btnW = W_ - 24;
    const btnH = 28;
    const makeBtn = (label, dy, fn) => {
      this.add.rectangle(x, y + dy, btnW, btnH, 0x113311, 0.92).setStrokeStyle(1, 0x66ff66, 1).setDepth(100);
      const txt = this.add.text(x, y + dy, label, { fontFamily, fontSize: '13px', color: '#bbffbb' }).setOrigin(0.5).setDepth(101);
      this.add.rectangle(x, y + dy, btnW, btnH, 0x000000, 0.01).setInteractive({ useHandCursor: true }).setDepth(102).on('pointerup', () => { fn(); txt.setColor('#ffff66'); this.time.delayedCall(160, () => txt.setColor('#bbffbb')); });
      return txt;
    };

    // 3) 中獎率 / RTP 雙滑桿 — 連續 0.1 ~ 3.0
    const trackX = x - W_ / 2 + 30;
    const trackW = W_ - 60;
    const ticks = [0.5, 1, 1.5, 2, 3];
    const makeSlider = (sliderY, label, getter, setter) => {
      this.add.text(x - W_ / 2 + 14, sliderY - 18, label, { fontFamily, fontSize: '13px', color: '#bbffbb' }).setOrigin(0, 0.5).setDepth(100);
      const valTxt = this.add.text(x + W_ / 2 - 14, sliderY - 18, `${getter().toFixed(3)}`, { fontFamily, fontSize: '13px', color: '#ffff66', fontStyle: 'bold' }).setOrigin(1, 0.5).setDepth(100);
      this.add.rectangle(trackX, sliderY, trackW, 6, 0x113311, 1).setOrigin(0, 0.5).setStrokeStyle(1, 0x66ff66, 1).setDepth(100);
      ticks.forEach(v => {
        const tx = trackX + (v - 0.1) / 2.9 * trackW;
        this.add.rectangle(tx, sliderY, 1, 8, 0x66ff66, 0.6).setDepth(100);
        this.add.text(tx, sliderY + 8, `${v}x`, { fontFamily, fontSize: '9px', color: '#669966' }).setOrigin(0.5, 0).setDepth(100);
      });
      const initPct = (getter() - 0.1) / 2.9;
      const handle = this.add.circle(trackX + initPct * trackW, sliderY, 10, 0xffff66, 1).setStrokeStyle(2, 0x66ff66, 1).setDepth(101).setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(handle);
      handle.on('drag', (pointer, dragX) => {
        const clampedX = Phaser.Math.Clamp(dragX, trackX, trackX + trackW);
        handle.x = clampedX;
        const pct = (clampedX - trackX) / trackW;
        const newVal = Phaser.Math.RoundTo(0.1 + pct * 2.9, -2);
        setter(newVal);
        valTxt.setText(`${newVal.toFixed(3)}`);
      });
    };
    makeSlider(y - 90, '中獎率倍率 (1=正常)', () => DEV.hitRate, v => { DEV.hitRate = v; });
    makeSlider(y - 38, 'RTP校正係數 (0.237 ≈ 96.89%RTP)', () => DEV.rtpScale, v => { DEV.rtpScale = v; });

    // 群集門檻滑桿 — 整數 4~10
    const clusterY = y + 14;
    this.add.text(x - W_ / 2 + 14, clusterY - 18, '群集門檻', { fontFamily, fontSize: '13px', color: '#bbffbb' }).setOrigin(0, 0.5).setDepth(100);
    const clusterValTxt = this.add.text(x + W_ / 2 - 14, clusterY - 18, `${DEV.clusterMin}+`, { fontFamily, fontSize: '13px', color: '#ffff66', fontStyle: 'bold' }).setOrigin(1, 0.5).setDepth(100);
    this.add.rectangle(trackX, clusterY, trackW, 6, 0x113311, 1).setOrigin(0, 0.5).setStrokeStyle(1, 0x66ff66, 1).setDepth(100);
    const clusterTicks = [3, 4, 5, 6, 7, 8, 9, 10];
    clusterTicks.forEach(v => {
      const tx = trackX + (v - 3) / 7 * trackW;
      this.add.rectangle(tx, clusterY, 1, 8, 0x66ff66, 0.6).setDepth(100);
      this.add.text(tx, clusterY + 8, String(v), { fontFamily, fontSize: '9px', color: '#669966' }).setOrigin(0.5, 0).setDepth(100);
    });
    const clusterInitPct = (DEV.clusterMin - 3) / 7;
    const clusterHandle = this.add.circle(trackX + clusterInitPct * trackW, clusterY, 10, 0xffff66, 1).setStrokeStyle(2, 0x66ff66, 1).setDepth(101).setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(clusterHandle);
    clusterHandle.on('drag', (pointer, dragX) => {
      const clampedX = Phaser.Math.Clamp(dragX, trackX, trackX + trackW);
      const pct = (clampedX - trackX) / trackW;
      const intVal = Phaser.Math.Clamp(Math.round(3 + pct * 7), 3, 10);
      DEV.clusterMin = intVal;
      clusterHandle.x = trackX + (intVal - 3) / 7 * trackW;
      clusterValTxt.setText(`${intVal}+`);
    });

    // 4) 免費次數 +/- 計數器
    const fgY = y + 64;
    this.add.text(x - W_ / 2 + 14, fgY, '免費次數', { fontFamily, fontSize: '13px', color: '#bbffbb' }).setOrigin(0, 0.5).setDepth(100);
    const makeCounterBtn = (cx, label, fn) => {
      this.add.rectangle(cx, fgY, 28, 28, 0x113311, 0.95).setStrokeStyle(1, 0x66ff66, 1).setDepth(100);
      this.add.text(cx, fgY, label, { fontFamily: 'Arial Black', fontSize: '18px', color: '#bbffbb' }).setOrigin(0.5).setDepth(101);
      this.add.rectangle(cx, fgY, 28, 28, 0x000000, 0.01).setInteractive({ useHandCursor: true }).setDepth(102).on('pointerup', fn);
    };
    const minusX = x + W_ / 2 - 90;
    const numX = x + W_ / 2 - 55;
    const plusX = x + W_ / 2 - 20;
    const numTxt = this.add.text(numX, fgY, String(DEV.freeCount), { fontFamily, fontSize: '15px', color: '#ffff66', fontStyle: 'bold' }).setOrigin(0.5).setDepth(101);
    makeCounterBtn(minusX, '-', () => {
      DEV.freeCount = Math.max(5, DEV.freeCount - 5);
      numTxt.setText(String(DEV.freeCount));
    });
    makeCounterBtn(plusX, '+', () => {
      DEV.freeCount = Math.min(200, DEV.freeCount + 5);
      numTxt.setText(String(DEV.freeCount));
    });

    // 5) 切換按鈕 + 啟動免費 + 免費旋轉一次
    // 切換按鈕特別處理：背景與文字顏色都隨狀態變化
    const makeToggleBtn = (label, dy, getter, setter) => {
      const bg = this.add.rectangle(x, y + dy, btnW, btnH, 0x113311, 0.92).setStrokeStyle(1, 0x66ff66, 1).setDepth(100);
      const txt = this.add.text(x, y + dy, `${label}：${getter() ? '開' : '關'}`, { fontFamily, fontSize: '13px', color: '#bbffbb', fontStyle: 'bold' }).setOrigin(0.5).setDepth(101);
      const update = () => {
        const on = getter();
        bg.setFillStyle(on ? 0x447722 : 0x113311, on ? 0.95 : 0.92);
        bg.setStrokeStyle(2, on ? 0xffff66 : 0x66ff66, 1);
        txt.setText(`${label}：${on ? '開' : '關'}`);
        txt.setColor(on ? '#ffff66' : '#bbffbb');
      };
      this.add.rectangle(x, y + dy, btnW, btnH, 0x000000, 0.01).setInteractive({ useHandCursor: true }).setDepth(102)
        .on('pointerup', () => { setter(!getter()); update(); });
      return { update };
    };
    makeToggleBtn('強制 SCATTER', 100, () => DEV.forceScatter, v => DEV.forceScatter = v);
    makeToggleBtn('強制倍數球', 130, () => DEV.forceMult, v => DEV.forceMult = v);
    makeBtn('強制 8 連櫻花（測消除）', 160, () => this.forceCluster('sakura'));
    makeBtn('強制 8 連兜 + 5 顆 orb', 190, () => this.forceCluster('kabuto', true));
    makeBtn('啟動免費遊戲', 220, () => { this.startFreeGame(DEV.freeCount, true); });
    makeBtn('重置統計', 250, () => {
      this.spinCount = 0; this.totalBet = 0; this.totalWin = 0;
      this.hitCount = 0; this.maxWinSession = 0;
      this._diag = {};
      this.updateDevStats();
    });
  }

  // dev tool: 強制塞入指定 symbol 的 8 連群集到中央，並直接觸發消除
  forceCluster(symId, withOrbs) {
    if (this.isSpinning) return;
    const sym = SYMBOLS.find(s => s.id === symId);
    if (!sym) return;
    // 中央 2×4 = 8 格
    const startR = Math.floor(this.rows / 2) - 1;
    const startC = Math.floor(this.cols / 2) - 2;
    for (let dr = 0; dr < 2; dr += 1) {
      for (let dc = 0; dc < 4; dc += 1) {
        const r = startR + dr;
        const c = startC + dc;
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;
        const oldView = this.viewGrid[r][c];
        if (oldView) {
          if (oldView.scatterRibbon) oldView.scatterRibbon.destroy();
          if (oldView.scatterLabel) oldView.scatterLabel.destroy();
          if (oldView.multText) oldView.multText.destroy();
          this.symbolViews = this.symbolViews.filter(v => v !== oldView);
          oldView.destroy();
        }
        this.grid[r][c] = sym;
        this.viewGrid[r][c] = this.createSymbol(sym, c, r);
      }
    }
    // 額外塞 orb
    if (withOrbs) {
      const orbIds = ['mult2', 'mult5', 'mult10', 'mult25', 'mult50'];
      let placed = 0;
      for (let r = 0; r < this.rows && placed < 5; r += 1) {
        for (let c = 0; c < this.cols && placed < 5; c += 1) {
          if (r >= startR && r < startR + 2 && c >= startC && c < startC + 4) continue;
          const orbSym = SYMBOLS.find(s => s.id === orbIds[placed]);
          const oldView = this.viewGrid[r][c];
          if (oldView) { oldView.destroy(); this.symbolViews = this.symbolViews.filter(v => v !== oldView); }
          this.grid[r][c] = orbSym;
          this.viewGrid[r][c] = this.createSymbol(orbSym, c, r);
          placed += 1;
        }
      }
    }
    this.flashMessage(`Dev: 強制 8 連 ${sym.label || symId}${withOrbs ? ' + 5 orb' : ''}`);
    this.isSpinning = true;
    this.time.delayedCall(300, () => {
      const orbSum = this.grid.flat().filter(s => s?.multiplier).reduce((a, b) => a + b.multiplier, 0);
      this.resolveCascade({
        cascade: 1,
        multiplier: orbSum || 1,
        scatterBonus: 0,
        totalWin: 0,
        lastOrbSum: orbSum
      });
    });
  }

  updateDevStats() {
    if (!this.devStatsText) return;
    const rtp = this.totalBet > 0 ? ((this.totalWin / this.totalBet) * 100).toFixed(2) : '—';
    const hitRate = this.spinCount > 0 ? ((this.hitCount || 0) / this.spinCount * 100).toFixed(1) : '—';
    const fgStatus = this.inFreeGame
      ? `免費中(orb×2 付費×1.6)`
      : '主遊戲';
    const d = this._diag || {};
    const diagLine = (d.lastPopWinningCells !== undefined)
      ? `消除診斷：勝出${d.lastPopWinningCells} / 命中${d.lastPopViewGridHits}+備援${d.lastPopFallbackHits} / 失敗${d.lastPopFailed}`
      : '消除診斷：(尚未旋轉)';
    this.devStatsText.setText(
      `旋轉：${this.spinCount}  下注：${this.totalBet.toFixed(0)}\n` +
      `贏分：${this.totalWin.toFixed(2)}  RTP：${rtp}%\n` +
      `命中率：${hitRate}%  最大贏：${(this.maxWinSession || 0).toFixed(0)}\n` +
      `FG剩：${this.freeGames}  累積倍：${this.stickyMultiplier}x\n` +
      `狀態：${fgStatus}\n` +
      diagLine
    );
  }

  startFreeGame(spins, withIntro, awakened) {
    this.inFreeGame = true;
    RT.inFreeGame = true;  // 通知 weightedSymbol 啟動 FG 機率加成
    // 覺醒之力：起始 sticky 倍數先給玩家
    this.stickyMultiplier = awakened === 'super' ? 5 : awakened === 'awaken' ? 3 : 0;
    this.freeGames = spins;
    this.freeGameTotalWin = 0;  // 累積整輪免費贏分
    if (withIntro) this.showFreeGameIntro(spins, awakened);
    this.updateHud();
    this.time.delayedCall(withIntro ? 1800 : 200, () => {
      if (!this.isSpinning) this.spin();
    });
  }

  showFreeGameIntro(spins, awakened) {
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x05030a, 0.78).setDepth(80);
    const introBg = this.add.image(WIDTH / 2, HEIGHT / 2, 'ui-freegame-intro').setDepth(80.5).setAlpha(0);
    const introScale = Math.max(WIDTH / introBg.width, HEIGHT / introBg.height);
    introBg.setScale(introScale);
    if (awakened === 'super') introBg.setTint(0xff66ff);
    else if (awakened === 'awaken') introBg.setTint(0xb47dff);
    this.tweens.add({ targets: introBg, alpha: 0.65, duration: 380 });
    const titleText = awakened === 'super' ? '超級覺醒' : awakened === 'awaken' ? '覺醒之力' : '免費遊戲';
    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 60, titleText, {
      fontFamily: 'Yu Mincho, Hiragino Mincho ProN, Georgia, serif',
      fontSize: '110px',
      color: '#ffe9a6',
      stroke: '#471207',
      strokeThickness: 12,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(81).setScale(0.4).setAlpha(0);
    const subText = awakened
      ? `${spins} 次免費旋轉 · 起始倍數 ${awakened === 'super' ? 5 : 3}x`
      : `獲得 ${spins} 次免費旋轉`;
    const sub = this.add.text(WIDTH / 2, HEIGHT / 2 + 60, subText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '42px',
      color: '#fff1b8',
      stroke: '#240606',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(81).setAlpha(0);
    playSfx(this, 'sfx-cheer', { volume: 0.7 });
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 420, ease: 'Back.out' });
    this.tweens.add({ targets: sub, alpha: 1, duration: 420, delay: 200 });
    this.time.delayedCall(1500, () => {
      this.tweens.add({ targets: [overlay, introBg, title, sub], alpha: 0, duration: 280, onComplete: () => { overlay.destroy(); introBg.destroy(); title.destroy(); sub.destroy(); } });
    });
  }

  endFreeGame(lastWin) {
    this.inFreeGame = false;
    RT.inFreeGame = false;
    // 贏分 0 就不顯示結算畫面，直接清狀態 + 接續 AUTO
    if (!lastWin || lastWin <= 0) {
      this.stickyMultiplier = 0;
      this.updateHud();
      if (this.autoSpin) {
        if (this.credits < this.bet) {
          this.setAutoSpin(false);
          this.message.setText('點數不足，自動停止');
        } else {
          this.time.delayedCall(420, () => {
            if (this.autoSpin && !this.isSpinning) this.spin();
          });
        }
      }
      return;
    }
    const cx = WIDTH / 2, cy = HEIGHT / 2;
    const layer = [];

    // 計算本次免費遊戲總贏分
    const totalFreeWin = lastWin > 0 ? lastWin : 0;

    // 1) 半透黑底
    const overlay = this.add.rectangle(cx, cy, WIDTH, HEIGHT, 0x05030a, 0.72).setDepth(80);
    layer.push(overlay);

    // 2) 中央橫向閃電束（多層 zigzag + 厚實光暈 + 高速閃爍）
    const lightningLayers = [
      { color: 0x9a3dff, thickness: 22, range: 60, alpha: 0.5 },   // 紫色外光暈
      { color: 0x6fb0ff, thickness: 14, range: 48, alpha: 0.7 },   // 藍色中層
      { color: 0xffffff, thickness: 6,  range: 36, alpha: 1.0 }    // 白色高亮核心
    ];
    const lightningGraphics = [];
    const drawLightning = (g, yMid, color, thickness, range) => {
      g.clear();
      g.lineStyle(thickness, color, 1);
      const segments = 40;
      const totalW = WIDTH * 1.6;
      const startX = cx - totalW / 2;
      const step = totalW / segments;
      g.beginPath();
      g.moveTo(startX, yMid + Phaser.Math.Between(-range / 3, range / 3));
      let lastY = yMid;
      for (let i = 1; i <= segments; i++) {
        const nx = startX + i * step;
        // 隨機但限制變化幅度，避免過於跳躍
        const delta = Phaser.Math.Between(-range, range);
        const ny = yMid + delta * (i % 2 === 0 ? 1 : -1) * 0.7 + Phaser.Math.Between(-12, 12);
        g.lineTo(nx, ny);
        lastY = ny;
      }
      g.strokePath();
    };
    lightningLayers.forEach(({ color, thickness, range, alpha }) => {
      const g = this.add.graphics().setDepth(80.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      drawLightning(g, cy, color, thickness, range);
      this.tweens.add({ targets: g, alpha, duration: 320 });
      layer.push(g);
      lightningGraphics.push({ g, color, thickness, range });
    });
    // 每 50ms 重畫，更激烈的閃爍
    const lightningTimer = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        lightningGraphics.forEach(({ g, color, thickness, range }) => drawLightning(g, cy, color, thickness, range));
      }
    });
    // 只保留純閃電 — 移除白色亮帶與紫色光暈

    // 3) 標題「贏得獎金」— 金字 + 厚邊 + 陰影
    const title = this.add.text(cx, cy - 230, '贏得獎金', {
      fontFamily: 'Yu Mincho, Hiragino Mincho ProN, Georgia, serif',
      fontSize: '140px',
      fontStyle: 'bold',
      color: '#ffe27a',
      stroke: '#5a2706',
      strokeThickness: 14,
      shadow: { offsetX: 0, offsetY: 10, color: '#000000', blur: 22, fill: true }
    }).setOrigin(0.5).setDepth(81).setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 560, ease: 'Back.out' });
    layer.push(title);

    // 4) 大金字數字
    const amount = this.add.text(cx, cy + 30, '0.00', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '180px',
      fontStyle: 'bold',
      color: '#ffd35c',
      stroke: '#5a2706',
      strokeThickness: 16,
      shadow: { offsetX: 0, offsetY: 12, color: '#000000', blur: 20, fill: true }
    }).setOrigin(0.5).setDepth(81).setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: amount, scale: 1, alpha: 1, duration: 520, delay: 240, ease: 'Back.out' });
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter,
      v: totalFreeWin,
      duration: 1800,
      delay: 500,
      ease: 'Cubic.out',
      onUpdate: () => amount.setText(counter.v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    });
    layer.push(amount);

    // 5) 關閉按鈕 — 用首頁「開始遊戲」按鈕底圖，戰國感統一
    const btnY = cy + 280;
    const btnBg = this.add.image(cx, btnY, 'jp-start-button').setDisplaySize(520, 160).setDepth(81).setAlpha(0);
    // 圖檔頂部花飾突出，文字下移補正視覺中心
    const btnLabel = this.add.text(cx, btnY + 6, '關閉', {
      fontFamily: 'Yu Mincho, Hiragino Mincho ProN, Georgia, serif',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#fff1b8',
      stroke: '#3a0408',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(82).setAlpha(0);
    this.tweens.add({ targets: [btnBg, btnLabel], alpha: 1, duration: 380, delay: 700 });

    // 持續撒幣：每 600ms 撒一波，直到玩家按關閉
    const initialShower = Math.min(80, 30 + Math.floor(totalFreeWin / 50));
    this.showerCoins(initialShower);
    const loopAmount = Math.max(14, Math.min(36, Math.floor(initialShower * 0.4)));
    const coinTimer = this.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => this.showerCoins(loopAmount)
    });

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      coinTimer.remove();
      lightningTimer.remove();
      this.tweens.add({
        targets: layer,
        alpha: 0,
        duration: 300,
        onComplete: () => layer.forEach(n => n.destroy())
      });
      this.stickyMultiplier = 0;
      this.updateHud();
      // 如果關閉前 AUTO 仍開著，繼續執行下一輪
      if (this.autoSpin) {
        if (this.credits < this.bet) {
          this.setAutoSpin(false);
          this.message.setText('點數不足，自動停止');
        } else {
          this.time.delayedCall(420, () => {
            if (this.autoSpin && !this.isSpinning) this.spin();
          });
        }
      }
    };
    const hit = this.add.rectangle(cx, btnY, 520, 160, 0x000000, 0.01)
      .setInteractive({ useHandCursor: true }).setDepth(83)
      .on('pointerup', () => { playSfx(this, 'sfx-confirm', { volume: 0.5 }); close(); });
    layer.push(btnBg, btnLabel, hit);

    // 6) 浮誇音效層疊：開場爆音 → 計分 tick 連發 → 結尾號角
    this.sound.play('sfx-clear', { volume: 0.9, rate: 0.7 });
    playSfx(this, 'sfx-cheer', { volume: 0.9 });
    playSfx(this, 'sfx-crowd', { volume: 0.7 });
    const tickStart = 500;
    const tickDuration = 1700;
    const tickInterval = 65;
    const tickCount = Math.floor(tickDuration / tickInterval);
    for (let i = 0; i < tickCount; i++) {
      this.time.delayedCall(tickStart + i * tickInterval, () => {
        this.sound.play('sfx-drop', {
          volume: 0.55 - (i / tickCount) * 0.25,
          rate: 1.4 + (i % 4) * 0.05
        });
      });
    }
    this.time.delayedCall(tickStart + tickDuration + 100, () => {
      playSfx(this, 'sfx-victory', { volume: 0.95 });
    });
  }

  spawnFireParticle(centerX, tier) {
    // 從底部隨機位置噴出大型火焰粒子，往上飄升並淡出
    const x = centerX + Phaser.Math.Between(-WIDTH * 0.48, WIDTH * 0.48);
    const y = HEIGHT - Phaser.Math.Between(-40, 60);
    const size = Phaser.Math.Between(120, 260);  // 放大 4 倍
    // 火焰顏色由內到外
    const palette = [0xffffff, 0xfff3a0, 0xffb84a, 0xff5b1a, tier.glow];
    const color = palette[Phaser.Math.Between(0, palette.length - 1)];
    const flame = this.add.ellipse(x, y, size * 0.55, size, color, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(78.5 + Math.random() * 0.4);
    const driftX = Phaser.Math.Between(-100, 100);
    const riseY = -Phaser.Math.Between(HEIGHT * 0.4, HEIGHT * 0.9);
    const duration = Phaser.Math.Between(680, 1200);

    this.tweens.add({
      targets: flame,
      x: x + driftX,
      y: y + riseY,
      scaleX: 0.35,
      scaleY: 0.15,
      alpha: 0,
      duration,
      ease: 'Cubic.out',
      onComplete: () => flame.destroy()
    });
    // 抖動感（橫向晃）
    this.tweens.add({
      targets: flame,
      scaleX: flame.scaleX * 1.15,
      duration: 75,
      yoyo: true,
      repeat: Math.floor(duration / 150)
    });
  }

  showBigWinCeremony(totalWin) {
    const ratio = totalWin / Math.max(this.bet, 0.01);
    let tier = null;
    if (ratio >= 100) tier = { label: 'EPIC WIN', sub: '蓋世神威', glow: 0xffe680, hold: 4200, coins: 90 };
    else if (ratio >= 40) tier = { label: 'MEGA WIN', sub: '天下無雙', glow: 0xffd35c, hold: 3600, coins: 70 };
    else if (ratio >= 20) tier = { label: 'BIG WIN', sub: '大勝利', glow: 0xffb84a, hold: 3000, coins: 55 };
    if (!tier) return;

    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const layer = []; // 收集所有節點便於最後一起 fade

    // 1) 螢幕白閃 + 微震
    const flash = this.add.rectangle(cx, cy, WIDTH, HEIGHT, 0xffffff, 0.92).setDepth(77);
    this.tweens.add({ targets: flash, alpha: 0, duration: 380, ease: 'Cubic.out', onComplete: () => flash.destroy() });
    this.cameras.main.shake(360, 0.006);

    // 2) 半透黑底
    const overlay = this.add.rectangle(cx, cy, WIDTH, HEIGHT, 0x05030a, 0.62).setDepth(78);
    layer.push(overlay);

    // 3) 不間斷撒幣 timer — 從開場到結束持續撒，無多餘特效
    const coinTimer = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => this.showerCoins(Math.floor(tier.coins * 0.3))
    });

    // 4) BIG WIN 圖檔 — 不同 tier 用 tint 區分
    const winImg = this.add.image(cx, cy - 80, 'ui-bigwin-text').setDepth(80);
    const winDisplayW = IS_PORTRAIT ? 760 : 720;
    const winScale = winDisplayW / winImg.width;
    winImg.setScale(winScale * 0.3).setAlpha(0);
    // 全部維持金色調，僅亮度區分 tier（BIG=原色 / MEGA=暖金 / EPIC=亮金白）
    if (tier.label === 'MEGA WIN') winImg.setTint(0xffd76b);
    if (tier.label === 'EPIC WIN') winImg.setTint(0xfff3c0);
    this.tweens.add({ targets: winImg, scaleX: winScale, scaleY: winScale, alpha: 1, duration: 580, ease: 'Back.out' });
    this.tweens.add({ targets: winImg, angle: 2, duration: 220, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 600 });
    layer.push(winImg);

    // 6) 階級小標（BIG WIN / MEGA WIN / EPIC WIN）+ 中文副標
    const tierTag = this.add.text(cx, cy + 95, tier.label, {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '54px',
      fontStyle: 'bold',
      color: '#fff1b8',
      stroke: '#3a0408',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 6, fill: true }
    }).setOrigin(0.5).setDepth(80).setAlpha(0);
    const sub = this.add.text(cx, cy + 150, tier.sub, {
      fontFamily: 'Yu Mincho, Hiragino Mincho ProN, Georgia, serif',
      fontSize: '42px',
      color: '#ffe9a6',
      stroke: '#240606',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(80).setAlpha(0);
    this.tweens.add({ targets: [tierTag, sub], alpha: 1, duration: 380, delay: 380 });
    layer.push(tierTag, sub);

    // 7) 金色計分器（從 0 跳到 totalWin）
    const amount = this.add.text(cx, cy + 240, '0.00', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '128px',
      fontStyle: 'bold',
      color: '#ffd35c',
      stroke: '#5a2706',
      strokeThickness: 12,
      shadow: { offsetX: 0, offsetY: 8, color: '#000000', blur: 16, fill: true }
    }).setOrigin(0.5).setDepth(80).setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: amount, scale: 1, alpha: 1, duration: 420, delay: 560, ease: 'Back.out' });
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter,
      v: totalWin,
      duration: tier.hold - 1200,
      delay: 700,
      ease: 'Cubic.out',
      onUpdate: () => amount.setText(counter.v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    });
    layer.push(amount);

    // 8) 浮誇音效堆疊：開場爆音 → 持續歡呼 → 計分 tick 連發 → 結尾號角
    this.sound.play('sfx-clear', { volume: 0.9, rate: 0.7 });   // 低沉開場爆音
    playSfx(this, 'sfx-crowd', { volume: 0.85 });
    playSfx(this, 'sfx-cheer', { volume: 0.95 });
    this.time.delayedCall(180, () => playSfx(this, 'sfx-fan', { volume: 0.7 }));
    this.time.delayedCall(420, () => playSfx(this, 'sfx-charge', { volume: 0.55 }));

    // 計分期間連續 tick（噠噠噠數錢聲）
    const tickStart = 700;
    const tickDuration = tier.hold - 1500;
    const tickInterval = 70;
    const tickCount = Math.floor(tickDuration / tickInterval);
    for (let i = 0; i < tickCount; i++) {
      this.time.delayedCall(tickStart + i * tickInterval, () => {
        // 隨機微變調 + 衰減音量讓不死板
        this.sound.play('sfx-drop', {
          volume: 0.5 - (i / tickCount) * 0.2,
          rate: 1.4 + (i % 4) * 0.05
        });
      });
    }
    // 計分完成爆音
    this.time.delayedCall(tier.hold - 700, () => {
      playSfx(this, 'sfx-victory', { volume: 0.95 });
      playSfx(this, 'sfx-cheer', { volume: 0.85 });
    });

    // 9) 開場一次大撒幣
    this.showerCoins(tier.coins);

    // 10) 結束 fade out — 停止持續撒幣 timer
    this.time.delayedCall(tier.hold, () => {
      coinTimer.remove();
      this.tweens.add({
        targets: layer,
        alpha: 0,
        duration: 420,
        onComplete: () => layer.forEach(node => node.destroy())
      });
    });
  }

  fillBoard(animated) {
    this.symbolViews.forEach((item) => {
      if (item.scatterRibbon) item.scatterRibbon.destroy();
      if (item.scatterLabel) item.scatterLabel.destroy();
      if (item.multText) item.multText.destroy();
      item.destroy();
    });
    this.symbolViews = [];
    this.viewGrid = [];
    this.grid = [];

    for (let r = 0; r < this.rows; r += 1) {
      this.grid[r] = [];
      this.viewGrid[r] = [];
      for (let c = 0; c < this.cols; c += 1) {
        const symbol = weightedSymbol();
        this.grid[r][c] = symbol;
        const view = this.createSymbol(symbol, c, r);
        this.viewGrid[r][c] = view;
        if (animated) {
          view.y = GRID_Y[0] - 360 - r * 24;
          view.setAlpha(0);
          // 動態模糊：垂直拉長落下，抵達時恢復原尺寸
          const originalScaleY = view.scaleY;
          view.scaleY = originalScaleY * 1.7;
          this.tweens.add({
            targets: view,
            y: this.getCellCenter(c, r).y,
            alpha: 1,
            scaleY: originalScaleY,
            duration: 360,
            delay: c * 42 + r * 34,
            ease: 'Back.out'
          });
        }
      }
    }
  }

  createSymbol(symbol, c, r) {
    const { x, y } = this.getCellCenter(c, r);
    const size = IS_PORTRAIT ? 110 : 98;
    const img = this.add.image(x, y, `symbol-${symbol.id}`).setDisplaySize(size, size).setDepth(5);

    img.setData('symbolId', symbol.id);
    img.setData('row', r);
    img.setData('col', c);
    this.symbolViews.push(img);

    // 倍數球的數字已內嵌在圖檔，不再用程式文字覆蓋

    // Scatter / Bonus 加標籤 — 玩家一眼可識別
    if (symbol.id === 'scatter' || symbol.id === 'bonus') {
      const isBonus = symbol.id === 'bonus';
      if (isBonus) img.setTint(0xb47dff); // 紫色覺醒 tint
      const labelY = y + size * 0.32;
      const ribbon = this.add.rectangle(x, labelY, size * 0.82, 24,
        isBonus ? 0x5a2bbf : 0xc4322a, 0.95)
        .setStrokeStyle(2, isBonus ? 0xc8a3ff : 0xffd76b, 1).setDepth(6);
      const label = this.add.text(x, labelY, isBonus ? '覺醒' : 'SCATTER', {
        fontFamily: isBonus
          ? 'Yu Mincho, Hiragino Mincho ProN, Georgia, serif'
          : 'Arial Black, Arial, sans-serif',
        fontSize: isBonus ? '16px' : '14px',
        fontStyle: 'bold',
        color: isBonus ? '#fff1b8' : '#fff1b8',
        stroke: isBonus ? '#1a0535' : '#3a0408',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(7);
      img.scatterRibbon = ribbon;
      img.scatterLabel = label;
      img.scatterOffsetY = size * 0.32;
    }
    return img;
  }

  syncScatterLabels() {
    this.symbolViews.forEach(view => {
      // SCATTER / 覺醒 標籤
      if (view.scatterLabel) {
        if (!view.active) {
          view.scatterRibbon.destroy();
          view.scatterLabel.destroy();
          view.scatterRibbon = null;
          view.scatterLabel = null;
        } else {
          const yPos = view.y + view.scatterOffsetY;
          view.scatterRibbon.setPosition(view.x, yPos);
          view.scatterLabel.setPosition(view.x, yPos);
          view.scatterRibbon.setAlpha(view.alpha);
          view.scatterLabel.setAlpha(view.alpha);
        }
      }
      // 倍數球文字覆蓋
      if (view.multText) {
        if (!view.active) {
          view.multText.destroy();
          view.multText = null;
        } else {
          view.multText.setPosition(view.x, view.y);
          view.multText.setAlpha(view.alpha);
        }
      }
    });
  }

  update() {
    this.syncScatterLabels();
  }

  getCellCenter(c, r) {
    return {
      x: GRID_X[c],
      y: GRID_Y[r]
    };
  }

  spin() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.spinCount += 1;
    playSfx(this, 'sfx-spin', { volume: 0.62, cooldown: 420 });
    playSfx(this, 'sfx-charge', { volume: 0.2, cooldown: 1800 });
    this.animateWarlordsForSpin();
    if (!this.inFreeGame && !this.skipNextSpinCost) {
      this.credits = Math.max(0, this.credits - this.bet);
      this.totalBet += this.bet;
    }
    this.skipNextSpinCost = false;  // 用完即清
    this.message.setText(this.inFreeGame ? `免費遊戲剩餘 ${this.freeGames} 次 · 累積倍數 ${this.stickyMultiplier || 1}x` : '戰國鼓聲響起，盤面重鑄...');
    this.spinZone.disableInteractive();

    this.tweens.add({
      targets: this.spinContainer,
      angle: 360,
      duration: 520,
      ease: 'Cubic.inOut',
      onComplete: () => {
        this.spinContainer.angle = 0;
        this.fillBoard(true);
        this.time.delayedCall(820, () => this.resolveSpin());
      }
    });
  }

  highlightScatters() {
    // 找出 scatter 位置，給每顆加金光脈動 + 旋轉光環
    const scatterViews = [];
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        if (this.grid[r]?.[c]?.id === 'scatter') {
          const view = this.viewGrid[r][c];
          if (view) scatterViews.push(view);
        }
      }
    }
    if (!scatterViews.length) return scatterViews.length;

    scatterViews.forEach((view, i) => {
      this.time.delayedCall(i * 180, () => {
        if (!view.active) return;
        // 金光環
        const ring = this.add.circle(view.x, view.y, 30, 0xffd76b, 0)
          .setStrokeStyle(6, 0xffd76b, 0.95)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(view.depth + 1);
        this.tweens.add({
          targets: ring,
          radius: 90,
          alpha: 0,
          duration: 520,
          ease: 'Cubic.out',
          onComplete: () => ring.destroy()
        });
        // 內層星芒
        const star = this.add.star(view.x, view.y, 8, 12, 56, 0xfff2a4, 0.85)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(view.depth + 2);
        this.tweens.add({
          targets: star,
          angle: 90,
          scale: 1.6,
          alpha: 0,
          duration: 480,
          ease: 'Cubic.out',
          onComplete: () => star.destroy()
        });
        // symbol 自身脈動
        const sx = view.scaleX, sy = view.scaleY;
        this.tweens.add({
          targets: view,
          scaleX: sx * 1.18,
          scaleY: sy * 1.18,
          duration: 220,
          yoyo: true,
          ease: 'Sine.inOut'
        });
        // 單顆 scatter 落地音
        this.sound.play('sfx-confirm', { volume: 0.55, rate: 0.85 + i * 0.04 });
      });
    });
    return scatterViews.length;
  }

  showNearMissAnimation() {
    const cx = WIDTH / 2, cy = HEIGHT / 2;
    // 紅色全屏脈動 + 訊息
    const flash = this.add.rectangle(cx, cy, WIDTH, HEIGHT, 0xff1a1a, 0).setDepth(76);
    this.tweens.add({ targets: flash, alpha: 0.25, duration: 220, yoyo: true, repeat: 2, onComplete: () => flash.destroy() });
    const text = this.add.text(cx, cy, '差一個！', {
      fontFamily: 'Yu Mincho, Hiragino Mincho ProN, Georgia, serif',
      fontSize: '120px',
      fontStyle: 'bold',
      color: '#ffe27a',
      stroke: '#8a0000',
      strokeThickness: 12,
      shadow: { offsetX: 0, offsetY: 8, color: '#000', blur: 18, fill: true }
    }).setOrigin(0.5).setDepth(77).setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: text, scale: 1, alpha: 1, duration: 320, ease: 'Back.out' });
    this.cameras.main.shake(280, 0.004);
    this.sound.play('sfx-charge', { volume: 0.65 });
    this.time.delayedCall(1100, () => {
      this.tweens.add({ targets: text, alpha: 0, duration: 280, onComplete: () => text.destroy() });
    });
  }

  showScatterTrigger(onComplete) {
    // 4+ scatter 觸發前的儀式：把 scatter 拉到中央炸裂
    const cx = WIDTH / 2, cy = HEIGHT / 2;
    const flash = this.add.rectangle(cx, cy, WIDTH, HEIGHT, 0xffd76b, 0).setDepth(76);
    this.tweens.add({ targets: flash, alpha: 0.55, duration: 600, yoyo: true, onComplete: () => flash.destroy() });
    this.cameras.main.shake(700, 0.008);

    const scatterViews = [];
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        if (this.grid[r]?.[c]?.id === 'scatter') {
          const v = this.viewGrid[r][c];
          if (v) scatterViews.push(v);
        }
      }
    }
    this.sound.play('sfx-crowd', { volume: 0.8 });
    this.sound.play('sfx-clear', { volume: 0.85, rate: 0.7 });
    scatterViews.forEach((view, i) => {
      view.setDepth(85);
      this.tweens.add({
        targets: view,
        x: cx,
        y: cy,
        scaleX: view.scaleX * 1.8,
        scaleY: view.scaleY * 1.8,
        angle: 360,
        duration: 700,
        delay: i * 60,
        ease: 'Cubic.in',
        onComplete: () => {
          this.addBurst(cx, cy);
          this.tweens.add({
            targets: view,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 220,
            onComplete: () => view.destroy()
          });
        }
      });
    });
    this.time.delayedCall(900 + scatterViews.length * 60, onComplete);
  }

  resolveSpin() {
    const flat = this.grid.flat();
    const scatters = flat.filter((symbol) => symbol.id === 'scatter').length;
    const multipliers = flat.filter((symbol) => symbol.multiplier).map((symbol) => symbol.multiplier);
    const orbSum = multipliers.length ? multipliers.reduce((sum, item) => sum + item, 0) : 0;

    // Scatter 視覺：1+ 個就有金光脈動
    if (scatters > 0) this.highlightScatters();
    // 3 個 scatter = Near Miss 全屏紅閃（僅主遊戲，避免免費遊戲內干擾）
    if (!this.inFreeGame && scatters === 3) {
      this.time.delayedCall(scatters * 180 + 100, () => this.showNearMissAnimation());
    }

    if (this.inFreeGame) {
      // Free Game: 倍數球累積（sticky）、3+ scatter 加 5 次（retrigger）
      if (orbSum > 0) {
        this.stickyMultiplier += orbSum;
        this.flashMessage(`倍數球累積！+${orbSum}x → 共 ${this.stickyMultiplier}x`);
        playSfx(this, 'sfx-confirm', { volume: 0.55 });
      }
      let scatterBonus = 0;
      if (scatters >= 3) {
        this.freeGames = Math.min(this.freeGames + 5, 100);  // 戰神賽特：FG 累積上限 100
        playSfx(this, 'sfx-cheer', { volume: 0.7 });
        this.flashMessage(`再觸發！+5 次免費遊戲`);
      }
      if (this.freeGames > 0) this.freeGames -= 1;
      this.updateHud();
      this.resolveCascade({
        cascade: 1,
        multiplier: this.stickyMultiplier || 1,
        scatterBonus,
        totalWin: 0,
        lastOrbSum: orbSum  // 標記初始 orb 已計入，避免 cascade 1 重複累加
      });
      return;
    }

    // 主遊戲
    const bonusCount = flat.filter((symbol) => symbol.id === 'bonus').length;
    const totalTrigger = scatters + bonusCount;
    const multiplier = orbSum > 0 ? orbSum : 1;
    const scatterBonus = scatters >= 4 ? this.bet * scatters : 0;

    // 雙層觸發：
    //   2+ 個覺醒 → 超級覺醒（20 次 free + 起始 sticky 5x）
    //   3 普通 + 1 覺醒（共 4） → 覺醒之力（15 次 free + 起始 sticky 3x）
    //   4+ 普通 → 一般 Free Game（15 次）
    if (bonusCount >= 2) {
      playSfx(this, 'sfx-cheer', { volume: 0.8 });
      this.flashMessage(`超級覺醒觸發！20 次免費遊戲，起始倍數 5x`);
      this.pendingFreeGame = 20;
      this.pendingAwakened = 'super';
    } else if (bonusCount === 1 && totalTrigger >= 4) {
      playSfx(this, 'sfx-cheer', { volume: 0.7 });
      this.flashMessage(`覺醒之力啟動！15 次免費遊戲，起始倍數 3x`);
      this.pendingFreeGame = 15;
      this.pendingAwakened = 'awaken';
    } else if (scatters >= 4) {
      playSfx(this, 'sfx-crowd', { volume: 0.48, cooldown: 1600 });
      playSfx(this, 'sfx-cheer', { volume: 0.55, cooldown: 1000 });
      this.flashMessage(`${scatters} 枚小判 SCATTER！觸發 15 次免費遊戲`);
      this.pendingFreeGame = 15;
      this.pendingAwakened = false;
    }
    this.updateHud();
    this.resolveCascade({
      cascade: 1,
      multiplier,
      scatterBonus,
      totalWin: 0,
      lastOrbSum: orbSum
    });
  }

  resolveCascade(state) {
    const matches = scoreMatches(this.grid);
    // 戰神賽特賠率公式：payout × (bet/20) × Σorb_multiplier
    // baseWin = Σ payoutFor(symbol, count)，後面再乘 bet/20 和 multiplier
    const baseWin = matches.reduce((sum, match) => sum + payoutFor(match.symbol, match.count) * (this.bet / 20), 0);

    // 戰神賽特：每次 cascade 用 delta 追蹤新落下的 orb（避免重複累加）
    const currentOrbSum = this.grid.flat()
      .filter(s => s?.multiplier).map(s => s.multiplier).reduce((a, b) => a + b, 0);
    const orbDelta = currentOrbSum - (state.lastOrbSum || 0);
    if (orbDelta > 0) {
      if (this.inFreeGame) {
        this.stickyMultiplier += orbDelta;
        state.multiplier = this.stickyMultiplier;
      } else {
        // 主遊戲：multiplier 從 1（無 orb）變成累加 delta
        state.multiplier = (state.multiplier === 1 ? 0 : state.multiplier) + orbDelta;
      }
      state.lastOrbSum = currentOrbSum;
    }
    // RTP 滑桿：縮放贏分
    const cascadeWin = Math.round((baseWin * state.multiplier * DEV.rtpScale + (state.cascade === 1 ? state.scatterBonus : 0)) * 100) / 100;

    // 連消安全上限 30（戰神賽特實務也不會超過 30，超過代表權重設計失衡）
    if (!matches.length || state.cascade > 30) {
      if (state.totalWin > 0) {
        this.flashMessage(`連鎖完成 ${state.totalWin.toLocaleString()} · 倍數 ${state.multiplier}x`);
        playSfx(this, 'sfx-victory', { volume: 0.65, cooldown: 900 });
        if (state.totalWin >= this.bet * 2) {
          playSfx(this, 'sfx-cheer', { volume: 0.58, cooldown: 1200 });
        }
        this.showerCoins(Math.min(42, 12 + Math.floor(state.totalWin / 30)));
      } else if (state.scatterBonus > 0) {
        this.flashMessage(`小判 SCATTER 獎勵 ${state.scatterBonus.toLocaleString()}`);
        playSfx(this, 'sfx-victory', { volume: 0.62, cooldown: 900 });
        state.totalWin = state.scatterBonus;
        this.score += state.scatterBonus;
        this.credits += state.scatterBonus;
        this.showerCoins(26);
      } else {
        this.message.setText('再轉一次，等待天下布武之刻');
      }
      this.winText.setText(state.totalWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      this.updateHud();
      if (state.totalWin > 0) {
        this.totalWin += state.totalWin;
        this.hitCount = (this.hitCount || 0) + 1;
        if (state.totalWin > (this.maxWinSession || 0)) this.maxWinSession = state.totalWin;
      }
      this.updateDevStats();
      // Big Win 儀式：依與 bet 真實點數比例（bet/100）判定，≥ 20x 進 BIG / 40x MEGA / 100x EPIC
      const ratio = state.totalWin / Math.max(this.bet, 0.01);
      if (!this.inFreeGame && ratio >= 20) {
        this.showBigWinCeremony(state.totalWin);
      }
      this.time.delayedCall(380, () => {
        this.isSpinning = false;
        this.spinZone.setInteractive({ useHandCursor: true });

        // 處理主遊戲觸發的 free game：先播 scatter 飛中央炸裂儀式，再進 Free Game intro
        if (this.pendingFreeGame) {
          const n = this.pendingFreeGame;
          const awaken = this.pendingAwakened;
          this.pendingFreeGame = 0;
          this.pendingAwakened = false;
          this.showScatterTrigger(() => this.startFreeGame(n, true, awaken));
          return;
        }

        // free game 中：累積整輪贏分；還有次數 → 繼續轉；沒了 → outro
        if (this.inFreeGame) {
          this.freeGameTotalWin = (this.freeGameTotalWin || 0) + state.totalWin;
          if (this.freeGames > 0) {
            this.time.delayedCall(720, () => { if (!this.isSpinning) this.spin(); });
          } else {
            // 傳整輪累積贏分到結算畫面
            this.endFreeGame(this.freeGameTotalWin);
          }
          return;
        }

        if (this.autoSpin) {
          if (this.credits < this.bet) {
            this.setAutoSpin(false);
            this.message.setText('點數不足，自動停止');
          } else {
            this.time.delayedCall(520, () => {
              if (this.autoSpin && !this.isSpinning) this.spin();
            });
          }
        }
      });
      return;
    }

    state.totalWin += cascadeWin;
    this.score += cascadeWin;
    this.credits += cascadeWin;
    this.winText.setText(state.totalWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    this.flashMessage(`第 ${state.cascade} 次消除 +${cascadeWin.toLocaleString()} · ${state.multiplier}x`);
    this.updateHud();

    // 真群集：取勝出格子（座標集合），只消這些 cell，不是同 id 的所有 cell
    const winningCells = new Set();
    matches.forEach(m => m.cells.forEach(([r, c]) => winningCells.add(`${r},${c}`)));
    const coinAmount = Math.min(18, 6 + Math.floor(cascadeWin / 120));
    this.previewWinningSymbols(winningCells, () => {
      this.showerCoins(coinAmount);
      this.animateWarlordsForWin(state.cascade);
      this.popWinningSymbols(winningCells, () => {
        this.dropAndRefill(() => {
          this.time.delayedCall(260, () => {
            this.resolveCascade({
              cascade: state.cascade + 1,
              multiplier: state.multiplier,
              scatterBonus: 0,
              totalWin: state.totalWin,
              lastOrbSum: state.lastOrbSum
            });
          });
        });
      });
    });
  }

  previewWinningSymbols(winningCells, onComplete) {
    // 先清除前一波殘留的浮動贏分文字，避免疊字
    if (this._activeWinLabels && this._activeWinLabels.length) {
      this._activeWinLabels.forEach(l => { if (l && l.scene) l.destroy(); });
    }
    this._activeWinLabels = [];
    const targets = [];
    const frames = [];

    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        const symbol = this.grid[r][c];
        const view = this.viewGrid[r][c];
        if (winningCells.has(`${r},${c}`) && view) {
          targets.push(view);
          view.setDepth(9);
          view.setTint(0xfff1b0);  // 金色高亮
          frames.push(this.createWinningFrame(view.x, view.y));
        }
      }
    }

    // 移除格內浮動贏分文字（上方已有總贏分顯示，避免重複干擾）
    const winLabels = [];

    if (!targets.length) {
      onComplete();
      return;
    }

    playSfx(this, 'sfx-confirm', { volume: 0.42, cooldown: 160 });
    targets.forEach((view, index) => {
      const baseScaleX = view.scaleX;
      const baseScaleY = view.scaleY;
      this.tweens.add({
        targets: view,
        scaleX: baseScaleX * 1.08,
        scaleY: baseScaleY * 1.08,
        duration: 180,
        delay: index * 18,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.inOut'
      });
    });

    frames.forEach((frame, index) => {
      frame.setAlpha(0);
      frame.setScale(0.92);
      this.tweens.add({
        targets: frame,
        alpha: 1,
        scale: 1.05,
        duration: 210,
        delay: index * 18,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.inOut'
      });
    });

    this.time.delayedCall(WIN_FRAME.hold, () => {
      targets.forEach((view) => view.clearTint());
      frames.forEach((frame) => frame.destroy());
      // 浮動贏分淡出
      winLabels.forEach(lbl => {
        this.tweens.add({ targets: lbl, alpha: 0, duration: 200, onComplete: () => lbl.destroy() });
      });
      onComplete();
    });
  }

  createWinningFrame(x, y) {
    const frame = this.add.container(x, y).setDepth(8);
    const glow = this.add.rectangle(0, 0, WIN_FRAME.size + 20, WIN_FRAME.size + 20, 0xffd76b, 0.12)
      .setStrokeStyle(6, 0xffd76b, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD);
    const outer = this.add.rectangle(0, 0, WIN_FRAME.size, WIN_FRAME.size, 0x000000, 0)
      .setStrokeStyle(4, 0xffed9d, 1);
    const inner = this.add.rectangle(0, 0, WIN_FRAME.size - 14, WIN_FRAME.size - 14, 0x000000, 0)
      .setStrokeStyle(2, 0xa42214, 0.95);
    const top = this.add.rectangle(0, -WIN_FRAME.size / 2, 44, 5, 0xffd35c, 0.95);
    const bottom = this.add.rectangle(0, WIN_FRAME.size / 2, 44, 5, 0xffd35c, 0.95);
    const left = this.add.rectangle(-WIN_FRAME.size / 2, 0, 5, 44, 0xffd35c, 0.95);
    const right = this.add.rectangle(WIN_FRAME.size / 2, 0, 5, 44, 0xffd35c, 0.95);
    frame.add([glow, outer, inner, top, bottom, left, right]);
    return frame;
  }

  popWinningSymbols(winningCells, onComplete) {
    const targets = [];
    const missing = [];
    // 策略 1：viewGrid[r][c] 反查
    winningCells.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      const view = this.viewGrid?.[r]?.[c];
      if (view && view.active !== false) {
        targets.push(view);
        this.addBurst(view.x, view.y);
        this.grid[r][c] = null;
        this.viewGrid[r][c] = null;
      } else {
        missing.push({ r, c });
      }
    });
    // 策略 2 (備援)：viewGrid 反查不到 → 用 symbolViews 找 r/c metadata 匹配
    if (missing.length) {
      const stillMissing = [];
      missing.forEach(({ r, c }) => {
        const view = this.symbolViews.find(v => v.active !== false && v.getData('row') === r && v.getData('col') === c);
        if (view) {
          targets.push(view);
          this.addBurst(view.x, view.y);
          if (this.grid[r]) this.grid[r][c] = null;
          if (this.viewGrid[r]) this.viewGrid[r][c] = null;
        } else {
          stillMissing.push({ r, c });
        }
      });
      // 診斷紀錄（給 dev 面板顯示）
      this._diag = this._diag || {};
      this._diag.lastPopWinningCells = winningCells.size;
      this._diag.lastPopViewGridHits = targets.length - (missing.length - stillMissing.length);
      this._diag.lastPopFallbackHits = missing.length - stillMissing.length;
      this._diag.lastPopFailed = stillMissing.length;
    } else {
      this._diag = this._diag || {};
      this._diag.lastPopWinningCells = winningCells.size;
      this._diag.lastPopViewGridHits = targets.length;
      this._diag.lastPopFallbackHits = 0;
      this._diag.lastPopFailed = 0;
    }

    if (!targets.length) {
      onComplete();
      return;
    }

    playSfx(this, 'sfx-clear', { volume: 0.36, cooldown: 180 });
    this.tweens.add({
      targets,
      alpha: 0,
      scaleX: 1.38,
      scaleY: 1.38,
      angle: 22,
      duration: 280,
      ease: 'Back.in',
      onComplete: () => {
        targets.forEach((view) => {
          this.symbolViews = this.symbolViews.filter((item) => item !== view);
          view.destroy();
        });
        onComplete();
      }
    });
  }

  addBurst(x, y) {
    const burst = this.add.circle(x, y, 10, 0xffdf72, 0.95).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: burst,
      radius: 44,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.out',
      onComplete: () => burst.destroy()
    });

    for (let i = 0; i < 6; i += 1) {
      const spark = this.add.rectangle(x, y, 5, 13, 0xfff0a8, 0.9).setBlendMode(Phaser.BlendModes.ADD);
      const angle = (Math.PI * 2 * i) / 6;
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 34,
        y: y + Math.sin(angle) * 34,
        alpha: 0,
        duration: 260,
        ease: 'Cubic.out',
        onComplete: () => spark.destroy()
      });
    }
  }

  dropAndRefill(onComplete) {
    const moving = [];
    const oldGrid = this.grid;
    const oldViewGrid = this.viewGrid;
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    this.viewGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));

    for (let c = 0; c < this.cols; c += 1) {
      const survivors = [];
      for (let r = this.rows - 1; r >= 0; r -= 1) {
        const symbol = oldGrid[r][c];
        const view = oldViewGrid[r][c];
        if (symbol && view) survivors.push({ symbol, view });
      }

      let targetRow = this.rows - 1;
      survivors.forEach(({ symbol, view }) => {
        this.grid[targetRow][c] = symbol;
        this.viewGrid[targetRow][c] = view;
        // 同步更新 view 上的 r/c metadata，方便後續反查
        view.setData('row', targetRow);
        view.setData('col', c);
        const targetY = this.getCellCenter(c, targetRow).y;
        moving.push(view);
        this.tweens.add({
          targets: view,
          y: targetY,
          duration: 300,
          ease: 'Bounce.out'
        });
        targetRow -= 1;
      });

      for (let r = targetRow; r >= 0; r -= 1) {
        const symbol = weightedSymbol();
        const view = this.createSymbol(symbol, c, r);
        view.y = GRID_Y[0] - (targetRow - r + 1) * BOARD.cell;
        view.setAlpha(0);
        // 動態模糊：補洞下落時垂直拉長
        const originalScaleY = view.scaleY;
        view.scaleY = originalScaleY * 1.7;
        this.grid[r][c] = symbol;
        this.viewGrid[r][c] = view;
        moving.push(view);
        this.tweens.add({
          targets: view,
          y: this.getCellCenter(c, r).y,
          alpha: 1,
          scaleY: originalScaleY,
          duration: 360,
          delay: (targetRow - r) * 44,
          ease: 'Back.out'
        });
      }
    }

    if (moving.length) {
      playSfx(this, 'sfx-drop', { volume: 0.42, cooldown: 260 });
    }

    this.time.delayedCall(moving.length ? 720 : 80, onComplete);
  }

  createSeasonEffects() {
    this.seasonLayer = this.add.container(0, 0);
    this.seasonText = null;

    this.setSeason(0);
    this.time.addEvent({
      delay: 8500,
      loop: true,
      callback: () => this.setSeason((this.seasonIndex + 1) % SEASONS.length)
    });
    this.time.addEvent({
      delay: 180,
      loop: true,
      callback: () => this.spawnSeasonParticle()
    });
  }

  setSeason(index) {
    this.seasonIndex = index;
  }

  spawnSeasonParticle() {
    const season = SEASONS[this.seasonIndex];
    const x = Phaser.Math.Between(10, WIDTH - 10);
    const y = Phaser.Math.Between(-40, -8);
    let particle;

    if (season.drift === 'firefly') {
      particle = this.add.circle(x, Phaser.Math.Between(88, 600), Phaser.Math.Between(2, 4), season.color, 0.85);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: particle,
        x: x + Phaser.Math.Between(-70, 70),
        y: particle.y + Phaser.Math.Between(-28, 32),
        alpha: 0,
        duration: Phaser.Math.Between(900, 1500),
        ease: 'Sine.inOut',
        onComplete: () => particle.destroy()
      });
      return;
    }

    if (season.drift === 'snow') {
      particle = this.add.circle(x, y, Phaser.Math.Between(2, 4), season.color, 0.76);
    } else if (season.drift === 'maple') {
      particle = this.add.star(x, y, 5, 3, 9, season.color, 0.82);
    } else {
      particle = this.add.ellipse(x, y, 9, 15, season.color, 0.76);
    }

    this.seasonLayer.add(particle);
    this.tweens.add({
      targets: particle,
      x: x + Phaser.Math.Between(-120, 120),
      y: HEIGHT + 60,
      angle: Phaser.Math.Between(120, 520),
      alpha: 0,
      duration: Phaser.Math.Between(5200, 8200),
      ease: 'Sine.inOut',
      onComplete: () => particle.destroy()
    });
  }

  convergeCoins(targetX, targetY, amount = 24) {
    // 從畫面邊緣往目標點飛入的「吸金」效果，使用同樣的 koban 圖
    playSfx(this, 'sfx-drop', { volume: 0.45, rate: 1.5, cooldown: 200 });
    for (let i = 0; i < amount; i += 1) {
      // 從四周外緣隨機點生成
      const angle = (Math.PI * 2 * i) / amount + Phaser.Math.FloatBetween(-0.2, 0.2);
      const radius = Phaser.Math.Between(Math.max(WIDTH, HEIGHT) * 0.55, Math.max(WIDTH, HEIGHT) * 0.75);
      const spawnX = targetX + Math.cos(angle) * radius;
      const spawnY = targetY + Math.sin(angle) * radius;

      const coin = this.add.image(spawnX, spawnY, 'fx-koban').setDepth(81);
      const sizeRoll = Math.random();
      const baseSize = sizeRoll < 0.6
        ? Phaser.Math.Between(80, 110)
        : sizeRoll < 0.9
          ? Phaser.Math.Between(120, 150)
          : Phaser.Math.Between(160, 200);
      coin.setDisplaySize(baseSize * 0.62, baseSize).setAlpha(0);

      const initScale = coin.scaleX;
      const delay = i * 22 + Phaser.Math.Between(0, 80);
      const flyDuration = Phaser.Math.Between(620, 900);

      // 淡入
      this.tweens.add({
        targets: coin, alpha: 1, duration: 180, delay
      });
      // 飛向目標 + 收縮 + 旋轉
      this.tweens.add({
        targets: coin,
        x: targetX + Phaser.Math.Between(-20, 20),
        y: targetY + Phaser.Math.Between(-20, 20),
        angle: Phaser.Math.Between(-540, 540),
        duration: flyDuration,
        delay,
        ease: 'Cubic.in'
      });
      this.tweens.add({
        targets: coin,
        scaleX: initScale * 0.25,
        scaleY: initScale * 0.25,
        duration: flyDuration,
        delay,
        ease: 'Cubic.in'
      });
      // 抵達後閃光 + 銷毀
      this.tweens.add({
        targets: coin,
        alpha: 0,
        duration: 140,
        delay: delay + flyDuration - 60,
        onComplete: () => {
          // 抵達時的小爆閃
          const flash = this.add.circle(coin.x, coin.y, 18, 0xffe680, 0.9)
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(82);
          this.tweens.add({
            targets: flash, radius: 40, alpha: 0, duration: 220, ease: 'Cubic.out',
            onComplete: () => flash.destroy()
          });
          coin.destroy();
        }
      });
    }
  }

  showerCoins(amount = 18) {
    playSfx(this, 'sfx-drop', { volume: 0.4, rate: 1.3, cooldown: 240 });
    const centerX = WIDTH / 2;
    for (let i = 0; i < amount; i += 1) {
      // 從中央底部噴發，向左右兩側扇形散開；大小不一
      const spawnX = centerX + Phaser.Math.Between(-WIDTH * 0.1, WIDTH * 0.1);
      const spawnY = HEIGHT + 60;
      const coin = this.add.image(spawnX, spawnY, 'fx-koban').setDepth(50);
      // 大小變化：60% 小、25% 中、15% 大（製造遠近層次）
      const sizeRoll = Math.random();
      let baseSize, depthTint, depthAlpha;
      if (sizeRoll < 0.6) {
        // 小幣 — 偏暗、半透，模擬遠處
        baseSize = Phaser.Math.Between(60, 88);
        depthTint = 0x6e5020;  // 深古銅
        depthAlpha = 0.65;
      } else if (sizeRoll < 0.85) {
        // 中幣 — 微暗
        baseSize = Phaser.Math.Between(95, 130);
        depthTint = 0xb89860;  // 半亮
        depthAlpha = 0.85;
      } else {
        // 大幣 — 全亮，模擬近處
        baseSize = Phaser.Math.Between(140, 180);
        depthTint = 0xffffff;  // 原色
        depthAlpha = 1.0;
      }
      coin.setDisplaySize(baseSize * 0.62, baseSize)
        .setTint(depthTint).setAlpha(0);
      const initScale = coin.scaleX;
      coin.setScale(initScale * 0.35);
      coin.setData('depthAlpha', depthAlpha);
      // 用 setData 暫存目標 alpha 給後續 tween 使用

      // 終點散佈整個畫面寬度
      const sideBias = Phaser.Math.FloatBetween(-1, 1);
      const targetX = centerX + sideBias * Phaser.Math.Between(WIDTH * 0.35, WIDTH * 0.6);
      const peakY = Phaser.Math.Between(HEIGHT * 0.12, HEIGHT * 0.55);
      const duration = Phaser.Math.Between(520, 820);
      const finalScale = Phaser.Math.FloatBetween(0.9, 1.25);

      this.tweens.add({
        targets: coin,
        x: targetX,
        y: peakY,
        angle: Phaser.Math.Between(280, 720) * (sideBias >= 0 ? 1 : -1),
        duration,
        ease: 'Quad.out',
        delay: i * 9
      });
      this.tweens.add({
        targets: coin,
        scaleX: initScale * finalScale,
        scaleY: initScale * finalScale,
        duration: duration * 0.55,
        ease: 'Back.out',
        delay: i * 9
      });
      // 淡入到 depthAlpha（依大小區分亮度）
      this.tweens.add({
        targets: coin,
        alpha: depthAlpha,
        duration: 180,
        delay: i * 9
      });
      this.tweens.add({
        targets: coin,
        alpha: 0,
        scaleX: initScale * 0.7,
        scaleY: initScale * 0.7,
        duration: duration * 0.35,
        ease: 'Cubic.in',
        delay: i * 9 + duration * 0.7,
        onComplete: () => coin.destroy()
      });
    }
  }

  animateWarlordsForSpin() {
    const C = L.CHARACTER;
    const FX = L.ATTACK_FX;
    playSfx(this, 'sfx-fan', { volume: 0.4, cooldown: 480 });
    // 直版用 bust 圖、不切換動作姿勢避免閃爍
    if (!IS_PORTRAIT) {
      this.oda.setTexture('oda-fire');
      setImageHeight(this.oda, CHARACTER_HEIGHT);
      this.takeda.setTexture('takeda-wave');
      setImageHeight(this.takeda, C.takedaHeightActive);
    }
    this.tweens.add({
      targets: this.oda,
      x: C.odaActive.x,
      angle: -1,
      duration: 180,
      yoyo: true,
      ease: 'Sine.inOut'
    });
    this.tweens.add({
      targets: this.takeda,
      x: C.takedaActive.x,
      angle: 1,
      duration: 180,
      yoyo: true,
      ease: 'Sine.inOut'
    });
    this.addSlash(FX.spinSlash.x, FX.spinSlash.y, 0xffd06b, -18);
    this.addThunderFan(FX.spinFan.x, FX.spinFan.y);
    this.time.delayedCall(520, () => this.resetWarlordPoses());
  }

  animateWarlordsForWin(cascade) {
    const C = L.CHARACTER;
    const FX = L.ATTACK_FX;
    if (cascade % 2 === 1) {
      if (!IS_PORTRAIT) {
        this.oda.setTexture('oda-fire');
        setImageHeight(this.oda, CHARACTER_HEIGHT);
      }
      this.tweens.add({
        targets: this.oda,
        x: C.odaAttack.x,
        duration: 140,
        yoyo: true,
        ease: 'Back.out'
      });
      this.addMuzzleFlash(FX.odaFlash.x, FX.odaFlash.y);
      this.addSlash(FX.odaSlashA.x, FX.odaSlashA.y, 0xfff0a3, -24);
      this.addSlash(FX.odaSlashB.x, FX.odaSlashB.y, 0xff4550, -18);
    } else {
      playSfx(this, 'sfx-fan', { volume: 0.42, cooldown: 480 });
      if (!IS_PORTRAIT) {
        this.takeda.setTexture('takeda-wave');
        setImageHeight(this.takeda, C.takedaHeightActive);
      }
      this.tweens.add({
        targets: this.takeda,
        x: C.takedaActive.x,
        duration: 140,
        yoyo: true,
        ease: 'Back.out'
      });
      this.addThunderFan(FX.takedaFanA.x, FX.takedaFanA.y);
      this.addThunderFan(FX.takedaFanB.x, FX.takedaFanB.y);
    }
    this.time.delayedCall(620, () => this.resetWarlordPoses());
  }

  resetWarlordPoses() {
    const C = L.CHARACTER;
    if (this.oda?.active) {
      if (!IS_PORTRAIT) {
        this.oda.setTexture('oda-stand');
        setImageHeight(this.oda, CHARACTER_HEIGHT);
      }
      this.oda.setAngle(0);
      this.tweens.add({ targets: this.oda, x: C.odaIdle.x, duration: 180, ease: 'Sine.out' });
    }
    if (this.takeda?.active) {
      if (!IS_PORTRAIT) {
        this.takeda.setTexture('takeda-stand');
        setImageHeight(this.takeda, CHARACTER_HEIGHT);
      }
      this.takeda.setAngle(0);
      this.tweens.add({ targets: this.takeda, x: C.takedaIdle.x, duration: 180, ease: 'Sine.out' });
    }
  }

  addMuzzleFlash(x, y) {
    playSfx(this, 'sfx-rifle', { volume: 0.5, cooldown: 700 });
    const flash = this.add.star(x, y, 8, 10, 48, 0xfff2a4, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(48);
    const smoke = this.add.circle(x - 12, y + 4, 18, 0xd9d0c3, 0.42).setDepth(47);
    this.tweens.add({
      targets: flash,
      scale: 1.7,
      alpha: 0,
      angle: 90,
      duration: 240,
      ease: 'Cubic.out',
      onComplete: () => flash.destroy()
    });
    this.tweens.add({
      targets: smoke,
      x: x + 36,
      y: y - 18,
      scale: 2.2,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.out',
      onComplete: () => smoke.destroy()
    });
  }

  addSlash(x, y, color, angle) {
    const slash = this.add.rectangle(x, y, 190, 14, color, 0.92)
      .setAngle(angle)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(45);
    const core = this.add.rectangle(x, y, 130, 5, 0xffffff, 0.95)
      .setAngle(angle)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(46);
    this.tweens.add({
      targets: [slash, core],
      x: x + 120,
      alpha: 0,
      scaleX: 1.45,
      duration: 300,
      ease: 'Cubic.out',
      onComplete: () => {
        slash.destroy();
        core.destroy();
      }
    });
  }

  addThunderFan(x, y) {
    const ring = this.add.circle(x, y, 18, 0x69e8ff, 0.15)
      .setStrokeStyle(5, 0xffe27a, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(45);
    this.tweens.add({
      targets: ring,
      radius: 78,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.out',
      onComplete: () => ring.destroy()
    });

    for (let i = 0; i < 4; i += 1) {
      const bolt = this.add.rectangle(x, y, 8, 72, i % 2 ? 0xffdf70 : 0x8cefff, 0.88)
        .setAngle(Phaser.Math.Between(-38, 38))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(46);
      this.tweens.add({
        targets: bolt,
        x: x + Phaser.Math.Between(-50, 50),
        y: y + Phaser.Math.Between(-44, 44),
        alpha: 0,
        scaleY: 0.25,
        duration: 320,
        ease: 'Cubic.out',
        onComplete: () => bolt.destroy()
      });
    }
  }

  toggleAutoSpin() {
    playSfx(this, 'sfx-confirm', { volume: 0.34, cooldown: 180 });
    this.setAutoSpin(!this.autoSpin);
    if (this.autoSpin && !this.isSpinning) this.spin();
  }

  setAutoSpin(enabled) {
    this.autoSpin = enabled;
    if (!this.autoButton || !this.autoLabel) return;
    if (enabled) {
      this.autoButton.setFillStyle(0xc4322a, 0.9);
      this.autoButton.setStrokeStyle(4, 0xffe27a, 1);
      this.autoLabel.setColor('#ffe9a6');
      this.autoLabel.setText('STOP');
    } else {
      this.autoButton.setFillStyle(0x05060c, 0.82);
      this.autoButton.setStrokeStyle(4, 0x374052, 1);
      this.autoLabel.setColor('#d8dcff');
      this.autoLabel.setText('AUTO');
    }
  }

  flashMessage(text) {
    this.message.setText(text);
    this.tweens.add({
      targets: this.message,
      scale: 1.08,
      duration: 160,
      yoyo: true,
      ease: 'Sine.inOut'
    });
  }

  updateHud() {
    this.creditText.value.setText(this.credits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    this.scoreText.value.setText(this.score.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    this.betValueText.setText(String(this.bet));
    if (this.freeText) {
      this.freeText.setText(`${this.freeGames}\nFREE\nGAMES`);
    }
  }
}

function hasAudio(scene, key) {
  return Boolean(scene?.cache?.audio?.exists(key));
}

function playMusic(scene, key, config = {}) {
  if (!hasAudio(scene, key) || !scene.sound) return null;

  const volume = config.volume ?? 0.38;
  let music = scene.sound.get(key);
  if (!music) {
    music = scene.sound.add(key, { loop: true, volume });
  }

  music.setVolume(volume);
  if (!music.isPlaying) {
    music.play({ loop: true, volume });
  }
  return music;
}

function playSfx(scene, key, config = {}) {
  if (!hasAudio(scene, key) || !scene.sound) return;

  const { volume = 0.55, cooldown = 0, ...soundConfig } = config;
  const now = scene.time?.now ?? 0;
  if (cooldown > 0) {
    scene.audioCooldowns ??= new Map();
    const lastPlayed = scene.audioCooldowns.get(key) ?? -Infinity;
    if (now - lastPlayed < cooldown) return;
    scene.audioCooldowns.set(key, now);
  }

  scene.sound.play(key, { volume, ...soundConfig });
}

function coverImage(scene, image, targetW, targetH) {
  const scale = Math.max(targetW / image.width, targetH / image.height);
  image.setScale(scale);
  return image;
}

function statText(scene, x, y, label, value) {
  const group = scene.add.container(x, y);
  const valueText = scene.add.text(0, -10, value, {
    fontFamily: 'Arial, sans-serif',
    fontSize: '29px',
    color: '#ffffff'
  }).setOrigin(0.5);
  const labelText = scene.add.text(0, 24, label, {
    fontFamily: 'Arial, sans-serif',
    fontSize: '20px',
    color: '#c7c4cc'
  }).setOrigin(0.5);
  group.add([valueText, labelText]);
  return { group, value: valueText, label: labelText };
}

function setImageHeight(image, height) {
  const key = image.texture?.key ?? '';
  const isCharacter = key.startsWith('oda') || key.startsWith('takeda');
  const isBust = key.endsWith('-bust') || key.endsWith('-bigwin');
  // 直版且非 bust（fire / wave 等動作圖）才裁切；bust 圖本身就是上半身，不需 crop
  if (IS_PORTRAIT && isCharacter && !isBust) {
    const ratio = L.CHARACTER.cropRatio;
    image.setCrop(0, 0, image.width, image.height * ratio);
    image.setOrigin(0.5, 0);
    image.setScale(height / (image.height * ratio));
  } else if (IS_PORTRAIT && isBust) {
    image.setCrop();
    image.setOrigin(0.5, 0);
    image.setScale(height / image.height);
  } else {
    image.setScale(height / image.height);
  }
}

// 模組級 dev flags（由 scene 設定）
// 戰神賽特標準預設：clusterMin=8、hitRate=1、rtpScale=0.237（100k spin 模擬校準）
// 模擬結果：RTP 96.42%、Hit 21.92%、FG 1/214、Max 1365× （ATG 目標 96.89% / 1/200-250）
const DEV = { forceScatter: false, forceMult: false, hitRate: 1.0, rtpScale: 0.237, clusterMin: 8, freeCount: 15 };
// runtime 狀態（scene 同步）
const RT = { inFreeGame: false };

function weightedSymbol() {
  if (DEV.forceScatter && Math.random() < 0.25) return SYMBOLS.find(s => s.id === 'scatter');
  if (DEV.forceMult && Math.random() < 0.08) return SYMBOLS.find(s => s.id === 'mult100');

  // 中獎率 hitRate + Free Game 加成
  const fgOrbBoost = RT.inFreeGame ? 2.0 : 1.0;       // FG 時 orb / scatter ×2
  const fgPayingBoost = RT.inFreeGame ? 1.6 : 1.0;    // FG 時常見 paying ×1.6（集中度上升）
  const adjusted = SYMBOLS.map(s => {
    let w = s.weight;
    const isLuckSymbol = s.id === 'scatter' || s.id === 'bonus' || s.multiplier;
    if (isLuckSymbol) {
      w *= DEV.hitRate * fgOrbBoost;
    } else if (s.weight >= 14) {
      w *= Math.pow(DEV.hitRate, 3) * fgPayingBoost;
    } else if (s.weight >= 9) {
      w *= Math.pow(DEV.hitRate, 2) * fgPayingBoost;
    }
    return { sym: s, w };
  });
  const total = adjusted.reduce((sum, item) => sum + item.w, 0);
  let roll = Math.random() * total;
  for (const item of adjusted) {
    roll -= item.w;
    if (roll <= 0) return item.sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function scoreMatches(grid) {
  // 戰神賽特機制：Pay Anywhere — 任意位置同 symbol ≥ DEV.clusterMin 即算中，不需相鄰
  // 來源：atg-games.com「land 8 or more identical symbols anywhere on the grid」
  const symbolCells = new Map();
  for (let r = 0; r < grid.length; r += 1) {
    for (let c = 0; c < grid[r].length; c += 1) {
      const sym = grid[r][c];
      if (!sym || !sym.payTable) continue;  // 只有 payTable 的 symbol 才算付費
      if (!symbolCells.has(sym.id)) {
        symbolCells.set(sym.id, { symbol: sym, cells: [] });
      }
      symbolCells.get(sym.id).cells.push([r, c]);
    }
  }
  const clusters = [];
  for (const { symbol, cells } of symbolCells.values()) {
    if (cells.length >= DEV.clusterMin) {
      clusters.push({ symbol, count: cells.length, cells });
    }
  }
  return clusters;
}

// 方向變更時重新載入，套用對應佈局
let orientationTimer = null;
window.addEventListener('resize', () => {
  const nowPortrait = window.innerHeight > window.innerWidth;
  if (nowPortrait !== IS_PORTRAIT) {
    clearTimeout(orientationTimer);
    orientationTimer = setTimeout(() => window.location.reload(), 350);
  }
});

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#05030a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: IS_PORTRAIT ? Phaser.Scale.CENTER_HORIZONTALLY : Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene]
});
