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

// 霸王別姬：對標戰神賽特 Pay Anywhere ≥ 8 機制，三階梯賠率（8-9 / 10-11 / 12+）
// 賠率沿用 ATG 攻略網公開數學模型，套到楚漢霸王別姬主題：
//   霸王戟（項羽）/ 赤霄劍（劉邦） ← 高分（200/500/1000）
//   收集玉片 ← Sickle 級（50/200/500）
//   鎏金圓錢 ← Ankh 級（40/100/300）
//   紅玉璧 ← Scimitar 級（30/40/240）
//   紫琉璃 ← Gem1（16/24/160）
//   藍菱玉 ← Gem2（10/20/100）
//   青方玉 ← Gem3（8/18/80）
//   白玉牌 ← Gem4（5/15/40）
//   鳳凰令 scatter ← Scarab 雙重身分（觸發虞姬覺醒 Free Game + 8+ 也付費）
//   傳國玉璽 bonus ← 覺醒符（2 顆觸發超級覺醒）
//   如意倍數珠（天命玉）← 倍數球 7 階，共用單張圖 + 程式繪製倍數字
const SYMBOLS = [
  { id: 'scatter',  label: '鳳凰令', payTable: { 8: 60,  10: 100, 12: 2000 }, weight: 4.2 },
  { id: 'bonus',    label: '玉璽',   weight: 1.0, awakened: true },
  // 高分 paying（稀有）
  { id: 'halberd',  label: '霸王戟', payTable: { 8: 200, 10: 500, 12: 1000 }, weight: 5 },
  { id: 'sword',    label: '赤霄劍', payTable: { 8: 200, 10: 500, 12: 1000 }, weight: 5 },
  { id: 'collect',  label: '玉片',   payTable: { 8: 50,  10: 200, 12: 500 },  weight: 8 },
  { id: 'coin',     label: '鎏金錢', payTable: { 8: 40,  10: 100, 12: 300 },  weight: 10 },
  // 中分
  { id: 'redbi',    label: '紅玉璧', payTable: { 8: 30,  10: 40,  12: 240 },  weight: 14 },
  { id: 'purple',   label: '紫琉璃', payTable: { 8: 16,  10: 24,  12: 160 },  weight: 18 },
  // 低分（gem 等級）— 大幅集中讓 hit rate 接近 24%
  { id: 'bluegem',  label: '藍菱玉', payTable: { 8: 10,  10: 20,  12: 100 },  weight: 22 },
  { id: 'greengem', label: '青方玉', payTable: { 8: 8,   10: 18,  12: 80 },   weight: 28 },
  { id: 'whitegem', label: '白玉牌', payTable: { 8: 5,   10: 15,  12: 40 },   weight: 36 },
  // 天命玉（如意倍數珠）7 階（戰神賽特公開值 2~500）
  // 全部共用 orb.png，倍數數字由程式繪製覆蓋
  { id: 'mult2',     label: '2x',     multiplier: 2,    weight: 6.0 },
  { id: 'mult5',     label: '5x',     multiplier: 5,    weight: 3.5 },
  { id: 'mult10',    label: '10x',    multiplier: 10,   weight: 1.8 },
  { id: 'mult25',    label: '25x',    multiplier: 25,   weight: 0.9 },
  { id: 'mult50',    label: '50x',    multiplier: 50,   weight: 0.45 },
  { id: 'mult100',   label: '100x',   multiplier: 100,  weight: 0.2 },
  { id: 'mult500',   label: '500x',   multiplier: 500,  weight: 0.05 }
];

// 將 count 對應到 payTable 階梯
function payoutFor(symbol, count) {
  if (!symbol.payTable) return 0;
  if (count >= 12) return symbol.payTable[12];
  if (count >= 10) return symbol.payTable[10];
  if (count >= 8)  return symbol.payTable[8];
  return 0;
}

// 四幕氛圍粒子（依章節切換，不再隨時間輪播）
const SEASONS = [
  { name: '初逢',     color: 0xffd27a, textColor: '#ffd27a', text: '初逢',     drift: 'firefly' }, // 暖金燈火
  { name: '爭姬',     color: 0x8fd0ff, textColor: '#8fd0ff', text: '爭姬',     drift: 'snow' },    // 青金冷光
  { name: '四面楚歌', color: 0xff7b3a, textColor: '#ff9b55', text: '四面楚歌', drift: 'maple' },   // 灰燼火星
  { name: '霸王別姬', color: 0xd8e6ff, textColor: '#d8e6ff', text: '霸王別姬', drift: 'petal' }    // 鳳羽冷月
];

// 霸王別姬：先做無聲版（不載入任何音檔）。playMusic/playSfx 皆會以 hasAudio 守門，
// 找不到 key 時自動靜默 no-op，畫面與玩法不受影響；之後接上專屬音樂只需補這裡。
const AUDIO = {
  music: {},
  sfx: {}
};

// ───────── 霸王別姬 12 分鐘四幕敘事系統 ─────────
// 一局 12 分鐘，四幕各 3 分鐘；Free Game（虞姬覺醒）插入時章節時間暫停。
const CHAPTER_MS = 3 * 60 * 1000;          // 每幕 3 分鐘
const GAME_TOTAL_MS = CHAPTER_MS * 4;      // 全局 12 分鐘
const DESTINY_MAX = 120;                   // 命數上限
const CHAPTERS = [
  { idx: 0, name: '第一幕 初逢',     bgKey: 'bg-ch-1', tint: 0x1a0a06,
    line: '烏騅踏月，虞姬於楚營初見霸王。' },
  { idx: 1, name: '第二幕 爭姬',     bgKey: 'bg-ch-2', tint: 0x06121a,
    line: '漢旗逼近，劉邦欲以玉璽改寫虞姬命局。' },
  { idx: 2, name: '第三幕 四面楚歌', bgKey: 'bg-ch-3', tint: 0x1a0604,
    line: '夜色壓城，楚歌從遠處一聲聲靠近。' },
  { idx: 3, name: '第四幕 霸王別姬', bgKey: 'bg-ch-4', tint: 0x05060f,
    line: '烏江在前，虞姬與項羽只剩最後一舞。' }
];
// 結局門檻（命數）→ 背景 key / 標題 / 內文
const ENDINGS = [
  { min: 0,   max: 41,  bgKey: 'bg-end-bad',     title: '烏江別霸王', desc: '項羽敗走烏江，與虞姬辭別。命數未足，悲劇如史。' },
  { min: 42,  max: 77,  bgKey: 'bg-end-mid',     title: '虞姬留魂',   desc: '悲劇仍在，但虞姬以鳳火留下命數，魂影不散。' },
  { min: 78,  max: 114, bgKey: 'bg-end-good',    title: '霸王歸楚',   desc: '你扭轉了悲劇，烏江潮退，項羽回首牽起虞姬，歸楚。' },
  { min: 115, max: 9999, bgKey: 'bg-end-jackpot', title: '天下改命',   desc: '玉璽改主，龍鳳齊鳴，楚漢結局就此重寫。' }
];
function endingForDestiny(d) {
  return ENDINGS.find(e => d >= e.min && d <= e.max) || ENDINGS[0];
}

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // 暫無專屬 loading 畫面素材，沿用第一幕「初逢」夜宴背景
    this.load.image('loading-bg', 'img/bg/ch1.png');
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

    // 標題以程式文字呈現（暫無專屬 logo 素材）
    const loadingTitle = this.add.text(WIDTH / 2, L.PRELOAD.titleY, '霸王別姬', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: IS_PORTRAIT ? '128px' : '108px',
      fontStyle: 'bold',
      color: '#ffe1a6',
      stroke: '#4a0a10',
      strokeThickness: 12,
      shadow: { offsetX: 0, offsetY: 8, color: '#000000', blur: 20, fill: true }
    }).setOrigin(0.5);
    this.add.text(WIDTH / 2, L.PRELOAD.titleY + (IS_PORTRAIT ? 96 : 80), '虞姬命局 · 12 分鐘命數', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: IS_PORTRAIT ? '38px' : '32px',
      color: '#f0c98a'
    }).setOrigin(0.5);

    const barOuter = this.add.rectangle(WIDTH / 2, L.PRELOAD.barY, L.PRELOAD.barW, 36, 0x130915, 0.92)
      .setStrokeStyle(3, 0xe4b84c, 1);
    const barInner = this.add.rectangle(barOuter.x - L.PRELOAD.barInnerW / 2, L.PRELOAD.barY, 0, 18, 0xffd766, 1)
      .setOrigin(0, 0.5);
    const status = this.add.text(WIDTH / 2, L.PRELOAD.statusY, '點燃楚營燈火...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: L.PRELOAD.statusFont,
      color: '#f7d889'
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      barInner.width = L.PRELOAD.barInnerW * value;
      status.setText(`載入素材 ${Math.round(value * 100)}%`);
    });

    // 主選單暫用第一幕背景
    this.load.image('menu-bg', 'img/bg/ch1.png');
    // 四幕章節背景（敘事系統依時間切換）
    this.load.image('bg-ch-1', 'img/bg/ch1.png');
    this.load.image('bg-ch-2', 'img/bg/ch2.png');
    this.load.image('bg-ch-3', 'img/bg/ch3.png');
    this.load.image('bg-ch-4', 'img/bg/ch4.png');
    // 起手畫面用第一幕；GameScene 會依章節切換
    this.load.image('gameplay-concept', 'img/bg/ch1.png');
    // Free Game 鳳火插入背景 + 四種結局背景
    this.load.image('bg-free', 'img/bg/freegame.png');
    this.load.image('bg-end-bad', 'img/bg/end_bad.png');
    this.load.image('bg-end-mid', 'img/bg/end_mid.png');
    this.load.image('bg-end-good', 'img/bg/end_good.png');
    this.load.image('bg-end-jackpot', 'img/bg/end_jackpot.png');
    // 角色：項羽（左）、劉邦（右）、虞姬（Free Game / 敘事）
    this.load.image('char-xiangyu', 'img/char/xiangyu.png');
    this.load.image('char-liubang', 'img/char/liubang.png');
    this.load.image('char-yuji', 'img/char/yuji.png');
    // 正式 UI
    this.load.image('jp-board-frame', 'img/ui/reel_frame.png');
    this.load.image('jp-bottom-panel', 'img/ui/bottom_panel.png');
    this.load.image('jp-spin-button', 'img/ui/spin.png');
    this.load.image('jp-start-button', 'img/ui/start_btn.png');
    // 正式按鈕皮（無字翼形膠囊，文字 runtime 疊上）：6 色
    ['teal', 'jade', 'red', 'purple', 'graphite', 'gold'].forEach(c =>
      this.load.image(`btn-${c}`, `img/ui/btn_${c}.png`));
    this.load.image('ui-buy-feature', 'img/ui/buy_feature.png');
    this.load.image('ui-fg-badge', 'img/ui/fg_badge.png');
    this.load.image('ui-freegame-intro', 'img/bg/freegame.png');
    // 大獎標題字（霸王別姬版）
    this.load.image('ui-title-big', 'img/ui/title_big.png');
    this.load.image('ui-title-mega', 'img/ui/title_mega.png');
    this.load.image('ui-title-epic', 'img/ui/title_jackpot.png');
    this.load.image('ui-bigwin-text', 'img/ui/title_super.png');
    this.load.image('fx-koban', 'img/fx/coin.png');
    // 無聲版：AUDIO 為空，不載入任何音檔（playSfx/playMusic 自動靜默）
    Object.entries(AUDIO.music).forEach(([key, path]) => this.load.audio(`bgm-${key}`, path));
    Object.entries(AUDIO.sfx).forEach(([key, path]) => this.load.audio(`sfx-${key}`, path));
    SYMBOLS.forEach((symbol) => {
      // 倍數球（天命玉）全部共用 orb.png，倍數字由程式繪製覆蓋
      const path = symbol.multiplier ? 'img/sym/orb.png' : `img/sym/${symbol.id}.png`;
      this.load.image(`symbol-${symbol.id}`, path);
    });
    // 角色技能序列幀（綠幕原圖，create() 時做 chroma key 去背）
    for (let i = 1; i <= 8; i += 1) this.load.image(`raw-xy-${i}`, `img/char/seq/xy_${i}.png`);
    for (let i = 1; i <= 8; i += 1) this.load.image(`raw-lb-${i}`, `img/char/seq/lb_${i}.png`);
    for (let i = 0; i <= 11; i += 1) this.load.image(`raw-yj-${i}`, `img/char/seq/yj_${String(i).padStart(2, '0')}.png`);
  }

  create() {
    // 綠幕去背：把序列幀轉成透明貼圖，並裁切到角色範圍（每幀獨立 bbox）
    const chroma = (rawKey, outKey) => {
      if (!this.textures.exists(rawKey) || this.textures.exists(outKey)) return;
      const src = this.textures.get(rawKey).getSourceImage();
      const sw = src.width, sh = src.height;
      const cv = document.createElement('canvas');
      cv.width = sw; cv.height = sh;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(src, 0, 0);
      const im = ctx.getImageData(0, 0, sw, sh);
      const d = im.data;
      let minX = sw, minY = sh, maxX = 0, maxY = 0, kept = 0;
      for (let p = 0; p < d.length; p += 4) {
        const r = d[p], g = d[p + 1], b = d[p + 2];
        // 綠幕判定：綠明顯高於紅藍
        if (g > 90 && g > r * 1.22 && g > b * 1.22) {
          d[p + 3] = 0;
        } else {
          // 邊緣去綠溢色
          if (g > r && g > b) { d[p + 1] = Math.round((r + b) / 2 + g * 0.15); }
          const idx = (p / 4);
          const x = idx % sw, y = (idx / sw) | 0;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          kept += 1;
        }
      }
      ctx.putImageData(im, 0, 0);
      if (kept === 0) { minX = 0; minY = 0; maxX = sw - 1; maxY = sh - 1; }
      const pad = 6;
      minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
      maxX = Math.min(sw - 1, maxX + pad); maxY = Math.min(sh - 1, maxY + pad);
      const cw = Math.max(1, maxX - minX + 1), ch = Math.max(1, maxY - minY + 1);
      const out = document.createElement('canvas');
      out.width = cw; out.height = ch;
      out.getContext('2d').drawImage(cv, minX, minY, cw, ch, 0, 0, cw, ch);
      this.textures.addCanvas(outKey, out);
      this.textures.remove(rawKey);
    };
    for (let i = 1; i <= 8; i += 1) chroma(`raw-xy-${i}`, `seq-xy-${i}`);
    for (let i = 1; i <= 8; i += 1) chroma(`raw-lb-${i}`, `seq-lb-${i}`);
    for (let i = 0; i <= 11; i += 1) chroma(`raw-yj-${i}`, `seq-yj-${i}`);
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

    // 主+副標（程式文字；暫無專屬 logo 素材）
    this.add.text(WIDTH / 2, L.MENU.titleY, '霸王別姬', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: L.MENU.titleFont,
      fontStyle: 'bold',
      color: '#ffe1a6',
      stroke: '#4a0a10',
      strokeThickness: 14,
      shadow: { offsetX: 0, offsetY: 10, color: '#000000', blur: 24, fill: true }
    }).setOrigin(0.5);
    this.add.text(WIDTH / 2, L.MENU.subtitleY, '虞姬命局 · 12 分鐘命數', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: L.MENU.subtitleFont,
      color: '#f0c98a',
      stroke: '#2a0608',
      strokeThickness: 5
    }).setOrigin(0.5);

    makeSkinButton(this, WIDTH / 2, L.MENU.startY, '開始遊戲', {
      color: 'jade',
      width: L.MENU.startW * 1.18,
      fontSize: L.MENU.startFont,
      depth: 10,
      onClick: () => {
        playMusic(this, 'bgm-sengoku', { volume: 0.38 });
        playSfx(this, 'sfx-ready', { volume: 0.72 });
        this.scene.start('GameScene');
      }
    });

    const hint = '6x5 盤面 · 鳳凰令 SCATTER · 天命玉倍數 · 四幕命局 · 12 分鐘改寫結局';
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
    // 敘事系統狀態
    this.chapterIndex = 0;
    this.chapterElapsed = 0;     // 目前幕已經過毫秒
    this.gameElapsed = 0;        // 全局已經過毫秒（0~12 分鐘）
    this.destiny = 0;            // 命數 0~120
    this.narrativePaused = false;// Free Game 期間暫停章節時間
    this.gameEnded = false;      // 12 分鐘結局已播放
  }

  // 命數增加：一般中獎小幅、FG/玉璽/大獎大幅
  addDestiny(amount, reason) {
    if (this.gameEnded || amount <= 0) return;
    const before = this.destiny;
    this.destiny = Math.min(DESTINY_MAX, this.destiny + amount);
    if (this.destiny !== before) {
      this.updateDestinyBar();
      this.flashDestinyGain(this.destiny - before, reason);
    }
  }

  create() {
    // 全域音量（localStorage 記憶，0~1）
    const lb = parseFloat(localStorage.getItem('sengoku_bgm'));
    const ls = parseFloat(localStorage.getItem('sengoku_sfx'));
    this.bgmVolume = Number.isFinite(lb) ? Phaser.Math.Clamp(lb, 0, 1) : 1;
    this.sfxVolume = Number.isFinite(ls) ? Phaser.Math.Clamp(ls, 0, 1) : 1;

    // 排版覆寫：?edit=1 開啟拖曳編輯器；存檔後重整自動套用
    this.layout = loadLayout();
    this.editMode = new URLSearchParams(window.location.search).has('edit');
    this._layoutNodes = [];

    this.bgImage = this.add.image(WIDTH / 2, HEIGHT / 2, 'bg-ch-1').setDepth(-2);
    coverImage(this, this.bgImage, WIDTH, HEIGHT);
    // 章節色調遮罩（依幕切換）
    this.bgDim = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, CHAPTERS[0].tint, 0.32).setDepth(-1);
    playMusic(this, 'bgm-sengoku', { volume: 0.38 });
    this.createHeader();
    this.createSeasonEffects();
    this.createSideLabels();
    this.createBoard();
    this.createBottomHud();
    this.createSpinControl();
    this.createSettingsMenu();
    this.createNarrativePanel();
    this.registerLayoutNodes();
    this.fillBoard(false);
    this.updateHud();
    this.applyChapter(0, true);
    if (this.editMode) this.setupLayoutEditor();

    if (this.devMode) window.__sengoku = this;

    // 首次進場顯示 SCATTER 說明（每次 reload 顯示一次）；編輯模式不顯示
    if (!this.editMode && !sessionStorage.getItem('sengoku_intro_shown')) {
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
    const title = this.add.text(cx, cy - 372, '虞姬覺醒 · 觸發規則', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: '60px', fontStyle: 'bold',
      color: '#ffe9a6', stroke: '#471207', strokeThickness: 8
    }).setOrigin(0.5).setDepth(91);
    layer.push(title);
    const subtitle = this.add.text(cx, cy - 312,
      '一局 12 分鐘，四幕推進。累積命數越高，越能改寫霸王別姬結局。', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif',
      fontSize: '26px', color: '#f0c98a', align: 'center',
      wordWrap: { width: WIDTH * 0.8 }
    }).setOrigin(0.5).setDepth(91);
    layer.push(subtitle);

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

    // 「我知道了」按鈕（正式金按鈕皮）
    const btnY = cy + 380;
    const close = () => {
      this.tweens.add({
        targets: layer, alpha: 0, duration: 280,
        onComplete: () => layer.forEach(n => n.destroy())
      });
    };
    const okBtn = makeSkinButton(this, cx, btnY, '我知道了', {
      color: 'gold', width: 420, fontSize: '40px', depth: 92,
      onClick: () => close()
    });
    layer.push(okBtn.img, okBtn.label, okBtn.zone);
    overlay.on('pointerup', () => { playSfx(this, 'sfx-click', { volume: 0.3 }); close(); });

    layer.forEach(n => n.setAlpha(0));
    this.tweens.add({ targets: layer, alpha: 1, duration: 320 });
  }

  createHeader() {
    const J = L.JACKPOT;
    // 天命獎池（程式繪製，無需 jackpot 圖）：四階對應四種結局命局
    const jackpots = [
      ['天下改命', '202,315.99'],
      ['霸王歸楚', '61,747.80'],
      ['虞姬留魂', '8,363.25'],
      ['烏江別姬', '2,029.09']
    ];
    const stripW = J.stripWidth;
    const stripH = IS_PORTRAIT ? 92 : 78;
    // 包成單一容器，方便排版編輯器整塊拖曳
    const strip = this.add.container(WIDTH / 2, J.stripY).setDepth(2);
    this.headerStrip = strip;
    const g = this.add.graphics();
    g.fillStyle(0x140609, 0.92);
    g.fillRoundedRect(-stripW / 2, -stripH / 2, stripW, stripH, 16);
    g.lineStyle(3, 0xc99a3c, 0.95);
    g.strokeRoundedRect(-stripW / 2, -stripH / 2, stripW, stripH, 16);
    strip.add(g);
    jackpots.forEach(([label, amount], i) => {
      const lx = J.items[i][1] - WIDTH / 2;
      if (i > 0) {
        strip.add(this.add.rectangle(-stripW / 2 + (stripW / 4) * i, 0, 2, stripH * 0.62, 0xc99a3c, 0.4));
      }
      strip.add(this.add.text(lx, -14, label, {
        fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
        fontSize: J.labelFont,
        fontStyle: 'bold',
        color: '#ffd66a'
      }).setOrigin(0.5));
      strip.add(this.add.text(lx, 13, amount, {
        fontFamily: 'Arial, sans-serif',
        fontSize: J.valueFont,
        color: '#fff3d6'
      }).setOrigin(0.5));
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
    this.message = this.add.text(0, 0, '再轉一次，等待虞姬鳳火之刻', {
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
    // 項羽（左）＝原 oda 位；劉邦（右）＝原 takeda 位。直版藏盤面框下層，金框遮裁切下緣。
    const charDepth = IS_PORTRAIT ? 0 : 4;
    this.oda = this.add.image(C.odaIdle.x, C.odaIdle.y, 'char-xiangyu').setDepth(charDepth);
    setImageHeight(this.oda, CHARACTER_HEIGHT);
    this.oda.setAlpha(0.97);
    this.takeda = this.add.image(C.takedaIdle.x, C.takedaIdle.y, 'char-liubang').setDepth(charDepth);
    setImageHeight(this.takeda, CHARACTER_HEIGHT);
    this.takeda.setAlpha(0.95);

    // 虞姬：Free Game（虞姬覺醒）期間於盤面中央演出，平時隱藏
    const ccx = (GRID_X[0] + GRID_X[GRID_X.length - 1]) / 2;
    const ccy = (GRID_Y[0] + GRID_Y[GRID_Y.length - 1]) / 2;
    const yujiKey = this.textures.exists('seq-yj-0') ? 'seq-yj-0' : 'char-yuji';
    this.yuji = this.add.image(ccx, ccy, yujiKey).setDepth(7).setAlpha(0).setVisible(false);
    this.yuji.setScale((IS_PORTRAIT ? HEIGHT * 0.34 : HEIGHT * 0.62) / this.yuji.height);

    this.freeText = null;
  }

  createBoard() {
    this.boardX = GRID_X[0] - BOARD.cell / 2;
    this.boardY = GRID_Y[0] - BOARD.cell / 2;
    this.cell = BOARD.cell;
    this.boardW = this.cols * this.cell;
    this.boardH = this.rows * this.cell;

    this.boardFrameImg = this.add.image(BOARD_FRAME.x, BOARD_FRAME.y, 'jp-board-frame')
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

    // ===== 押注量化拖曳 bar（20–1000，每級 20，共 50 個吸附點）=====
    const cx = H_.betX;
    const cy = H_.statY;
    this.betMin = 20;
    this.betMax = 1000;
    this.betStep = 20;
    const STEPS = (this.betMax - this.betMin) / this.betStep; // 49 區間
    const PILL_W = 360;
    const PILL_H = 72;
    const PILL_R = 30;                     // 圓角半徑（接近膠囊）
    const gaugeW = PILL_W - 16;            // pill 內可填寬度
    const gaugeLeft = -gaugeW / 2;         // container 本地座標
    this.betGaugeW = gaugeW;
    this.betGaugeLeft = gaugeLeft;

    this.betPanel = this.add.container(cx, cy);
    // pill 底（深色圓角 + 金邊）
    const pillBg = this.add.graphics();
    pillBg.fillStyle(0x050506, 0.92);
    pillBg.fillRoundedRect(-PILL_W / 2, -PILL_H / 2, PILL_W, PILL_H, PILL_R);
    pillBg.lineStyle(4, 0xb8923c, 1);
    pillBg.strokeRoundedRect(-PILL_W / 2, -PILL_H / 2, PILL_W, PILL_H, PILL_R);
    this.betPanel.add(pillBg);
    // 黃色拖曳量表：從左填到目前比例（仿戰神賽特），降透明度更柔和
    this.betFill = this.add.rectangle(gaugeLeft, 0, 8, PILL_H - 10, 0xf2b21a, 0.52).setOrigin(0, 0.5);
    // 量表前緣亮邊
    this.betEdge = this.add.rectangle(gaugeLeft, 0, 4, PILL_H - 10, 0xfff3c0, 0.6).setOrigin(0.5, 0.5);
    // 圓角遮罩：讓黃色量表貼合 pill 圓角（世界座標，對齊 pill 位置）
    const maskG = this.make.graphics({ add: false });
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRoundedRect(cx - PILL_W / 2 + 4, cy - PILL_H / 2 + 4, PILL_W - 8, PILL_H - 8, PILL_R - 4);
    const betMask = maskG.createGeometryMask();
    this.betFill.setMask(betMask);
    this.betEdge.setMask(betMask);
    // 數值 + 「押注」小字（疊在量表上方）
    this.betValueText = this.add.text(0, -9, String(this.bet), {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#3a2a06',
      strokeThickness: 4
    }).setOrigin(0.5);
    const betLabel = this.add.text(0, 22, '押注', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif',
      fontSize: '18px',
      color: '#ffe9a6'
    }).setOrigin(0.5);
    // -/+ 字（pill 兩端，疊在量表上）
    const minusGlyph = this.add.text(gaugeLeft + 22, 0, '−', {
      fontFamily: 'Arial Black', fontSize: '44px', color: '#ffffff'
    }).setOrigin(0.5);
    const plusGlyph = this.add.text(-gaugeLeft - 22, 0, '+', {
      fontFamily: 'Arial Black', fontSize: '42px', color: '#ffffff'
    }).setOrigin(0.5);
    this.betPanel.add([this.betFill, this.betEdge, this.betValueText, betLabel, minusGlyph, plusGlyph]);

    const setBetByIndex = (i) => {
      const idx = Phaser.Math.Clamp(Math.round(i), 0, STEPS);
      const nb = this.betMin + idx * this.betStep;
      if (nb !== this.bet) {
        this.bet = nb;
        playSfx(this, 'sfx-click', { volume: 0.26, cooldown: 60 });
      }
      this.updateHud();
    };

    // - 鈕（押注/免費遊戲時鎖定）
    this.add.rectangle(cx - 150, cy, 72, 72, 0x000000, 0.01).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      if (this.isSpinning || this.inFreeGame) return;
      setBetByIndex((this.bet - this.betMin) / this.betStep - 1);
    });
    // + 鈕
    this.add.rectangle(cx + 150, cy, 72, 72, 0x000000, 0.01).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      if (this.isSpinning || this.inFreeGame) return;
      setBetByIndex((this.bet - this.betMin) / this.betStep + 1);
    });

    // 量表拖曳區（場景座標；在 -/+ 之間拖曳或點按即跳，吸附 20 級距）
    const dragW = 260;
    const dragAbsLeft = cx - dragW / 2;
    const applyFromPointer = (p) => {
      if (this.isSpinning || this.inFreeGame) return;
      const f = Phaser.Math.Clamp((p.worldX - dragAbsLeft) / dragW, 0, 1);
      setBetByIndex(f * STEPS);
    };
    const dragZone = this.add.rectangle(cx, cy, dragW, 64, 0x000000, 0.01)
      .setInteractive({ useHandCursor: true, draggable: true });
    dragZone.on('pointerdown', applyFromPointer);
    dragZone.on('drag', (p) => applyFromPointer(p));
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

  // 全域音量 setter（即時套用 + localStorage 記憶）
  setBgmVolume(f) {
    this.bgmVolume = Phaser.Math.Clamp(f, 0, 1);
    if (this._bgm) this._bgm.setVolume((this._bgmBase ?? 0.38) * this.bgmVolume);
    try { localStorage.setItem('sengoku_bgm', String(this.bgmVolume)); } catch (e) {}
  }
  setSfxVolume(f) {
    this.sfxVolume = Phaser.Math.Clamp(f, 0, 1);
    try { localStorage.setItem('sengoku_sfx', String(this.sfxVolume)); } catch (e) {}
  }

  // 圓形設定按鈕（漢堡圖示）+ 點開的音量面板（仿戰神賽特）
  createSettingsMenu() {
    const bx = WIDTH - (IS_PORTRAIT ? 84 : 96);
    const by = IS_PORTRAIT ? 120 : 86;
    const br = IS_PORTRAIT ? 46 : 40;

    const btn = this.add.container(bx, by).setDepth(40);
    btn.add(this.add.circle(0, 0, br, 0x0c0a12, 0.82).setStrokeStyle(4, 0xb8923c, 1));
    const lineW = br * 0.92;
    [-1, 0, 1].forEach(k => btn.add(
      this.add.rectangle(0, k * (br * 0.34), lineW, br * 0.16, 0xe9dcc0, 1).setOrigin(0.5)
    ));
    this.add.circle(bx, by, br, 0x000000, 0.01)
      .setInteractive({ useHandCursor: true }).setDepth(41)
      .on('pointerup', () => { playSfx(this, 'sfx-click', { volume: 0.3, cooldown: 200 }); this.openSettings(); });

    this._settingsBuilt = false;
  }

  buildSettingsPanel() {
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const pw = IS_PORTRAIT ? 760 : 680;
    const ph = IS_PORTRAIT ? 540 : 460;
    const trackW = pw - 200;

    const root = this.add.container(0, 0).setDepth(96).setVisible(false);
    this.settingsPanel = root;

    const dim = this.add.rectangle(cx, cy, WIDTH, HEIGHT, 0x000000, 0.66)
      .setInteractive().on('pointerup', () => this.closeSettings());
    root.add(dim);

    const panelG = this.add.graphics();
    panelG.fillStyle(0x140a0c, 0.98);
    panelG.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 28);
    panelG.lineStyle(4, 0xffd76b, 1);
    panelG.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 28);
    root.add(panelG);

    root.add(this.add.text(cx, cy - ph / 2 + 56, '設定', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: IS_PORTRAIT ? '52px' : '44px', fontStyle: 'bold',
      color: '#ffe9a6', stroke: '#3a0408', strokeThickness: 5
    }).setOrigin(0.5));

    const makeSlider = (rowY, label, getV, setV) => {
      root.add(this.add.text(cx - trackW / 2, rowY - 46, label, {
        fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif',
        fontSize: IS_PORTRAIT ? '34px' : '30px', fontStyle: 'bold', color: '#ffe9a6'
      }).setOrigin(0, 0.5));
      const pct = this.add.text(cx + trackW / 2, rowY - 46, '', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: IS_PORTRAIT ? '34px' : '30px', color: '#ffd24a'
      }).setOrigin(1, 0.5);
      root.add(pct);
      // 軌道
      root.add(this.add.rectangle(cx, rowY, trackW, 12, 0x000000, 0.6).setStrokeStyle(2, 0x6b5a30, 1));
      const fill = this.add.rectangle(cx - trackW / 2, rowY, 8, 12, 0xf2b21a, 0.85).setOrigin(0, 0.5);
      root.add(fill);
      const knob = this.add.circle(cx - trackW / 2, rowY, 22, 0xffe9a6, 1).setStrokeStyle(4, 0x8a1818, 1);
      root.add(knob);

      const refresh = () => {
        const v = Phaser.Math.Clamp(getV(), 0, 1);
        knob.x = cx - trackW / 2 + v * trackW;
        fill.width = Math.max(v * trackW, 8);
        pct.setText(Math.round(v * 100) + '%');
      };
      const applyAt = (worldX) => {
        const v = Phaser.Math.Clamp((worldX - (cx - trackW / 2)) / trackW, 0, 1);
        setV(v); refresh();
      };
      const zone = this.add.rectangle(cx, rowY, trackW + 44, 64, 0x000000, 0.01)
        .setInteractive({ useHandCursor: true, draggable: true });
      zone.on('pointerdown', p => applyAt(p.worldX));
      zone.on('drag', p => applyAt(p.worldX));
      root.add(zone);
      refresh();
      return refresh;
    };

    const r1 = cy - ph / 2 + (IS_PORTRAIT ? 190 : 165);
    const r2 = r1 + (IS_PORTRAIT ? 150 : 130);
    this._refreshBgm = makeSlider(r1, '背景音樂', () => this.bgmVolume, v => this.setBgmVolume(v));
    this._refreshSfx = makeSlider(r2, '音效', () => this.sfxVolume, v => {
      this.setSfxVolume(v);
      playSfx(this, 'sfx-click', { volume: 0.5, cooldown: 90 }); // 即時試聽
    });

    // 關閉按鈕（正式石墨按鈕皮）
    const byc = cy + ph / 2 - 64;
    const closeB = makeSkinButton(this, cx, byc, '關閉', {
      color: 'graphite',
      width: IS_PORTRAIT ? 360 : 320,
      fontSize: IS_PORTRAIT ? '38px' : '32px',
      depth: 97,
      onClick: () => this.closeSettings()
    });
    root.add([closeB.img, closeB.label, closeB.zone]);

    this._settingsBuilt = true;
  }

  openSettings() {
    if (!this._settingsBuilt) this.buildSettingsPanel();
    this._refreshBgm?.();
    this._refreshSfx?.();
    this.settingsPanel.setVisible(true);
  }
  closeSettings() {
    playSfx(this, 'sfx-confirm', { volume: 0.4, cooldown: 150 });
    if (this.settingsPanel) this.settingsPanel.setVisible(false);
  }

  createBuyFeature() {
    const SC = L.SPIN_CTRL;
    // 直版：左下 280；橫版：信長那一側（避開 Oda 角色右邊）
    const x = IS_PORTRAIT ? 280 : 480;
    const y = SC.spinY;
    const w = IS_PORTRAIT ? 180 : 160;
    const h = IS_PORTRAIT ? 92 : 74;

    // 包成容器，排版編輯器整塊拖曳
    const grp = this.add.container(x, y).setDepth(9);
    this.buyGroup = grp;
    const bg = this.add.image(0, 0, 'ui-buy-feature').setDisplaySize(w, h);
    grp.add(bg);
    grp.add(this.add.text(0, -6, '購買特色', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: IS_PORTRAIT ? '24px' : '18px',
      color: '#fff1b8',
      fontStyle: 'bold',
      stroke: '#3a0408',
      strokeThickness: 4
    }).setOrigin(0.5));
    this.buyCostText = this.add.text(0, 22, `${this.buyFeatureCost}x`, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: IS_PORTRAIT ? '20px' : '16px',
      color: '#ffe27a',
      stroke: '#3a0408',
      strokeThickness: 3
    }).setOrigin(0.5);
    grp.add(this.buyCostText);
    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0.01)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.tryBuyFeature());
    grp.add(hit);
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
    const H_ = IS_PORTRAIT ? 780 : 780;
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
    makeBtn('強制 8 連白玉牌（測消除）', 160, () => this.forceCluster('whitegem'));
    makeBtn('強制 8 連玉片 + 5 顆天命玉', 190, () => this.forceCluster('collect', true));
    makeBtn('進 FG（虞姬覺醒）', 220, () => { this.startFreeGame(DEV.freeCount, true); });
    // 顯示爆獎模式：循環預覽 BIG / MEGA / EPIC 中獎儀式
    this._bigWinPreviewIdx = 0;
    makeBtn('顯示爆獎模式（循環 BIG/MEGA/EPIC）', 250, () => {
      if (this.isSpinning) return;
      const tiers = [
        { name: 'BIG',  mult: 25 },
        { name: 'MEGA', mult: 60 },
        { name: 'EPIC', mult: 150 }
      ];
      const t = tiers[this._bigWinPreviewIdx % tiers.length];
      this._bigWinPreviewIdx += 1;
      this.flashMessage(`預覽 ${t.name} WIN（${t.mult}× bet）`);
      this.showBigWinCeremony(this.bet * t.mult);
    });
    makeBtn('重置統計', 280, () => {
      this.spinCount = 0; this.totalBet = 0; this.totalWin = 0;
      this.hitCount = 0; this.maxWinSession = 0;
      this._diag = {};
      this.updateDevStats();
    });
    // 敘事控制：四幕跳轉 + 命數 / 結局
    const halfBtnW = (btnW - 8) / 2;
    const makeHalfBtn = (label, dx, dy, fn) => {
      const bx = x + dx;
      this.add.rectangle(bx, y + dy, halfBtnW, btnH, 0x113311, 0.92).setStrokeStyle(1, 0x66ff66, 1).setDepth(100);
      const txt = this.add.text(bx, y + dy, label, { fontFamily, fontSize: '12px', color: '#bbffbb' }).setOrigin(0.5).setDepth(101);
      this.add.rectangle(bx, y + dy, halfBtnW, btnH, 0x000000, 0.01).setInteractive({ useHandCursor: true }).setDepth(102)
        .on('pointerup', () => { fn(); txt.setColor('#ffff66'); this.time.delayedCall(160, () => txt.setColor('#bbffbb')); });
    };
    const qx = -(halfBtnW / 2) - 4;
    const qx2 = (halfBtnW / 2) + 4;
    makeHalfBtn('幕一 初逢', qx, 312, () => this.devJumpChapter(0));
    makeHalfBtn('幕二 爭姬', qx2, 312, () => this.devJumpChapter(1));
    makeHalfBtn('幕三 楚歌', qx, 342, () => this.devJumpChapter(2));
    makeHalfBtn('幕四 別姬', qx2, 342, () => this.devJumpChapter(3));
    makeBtn('命數 +20', 372, () => this.addDestiny(20, 'DEV'));
    makeBtn('天下改命結局（命數拉滿）', 402, () => { this.destiny = DESTINY_MAX; this.updateDestinyBar(); this.playEnding(); });
    makeBtn('重播本局（reload）', 432, () => window.location.reload());
  }

  // dev：直接跳到指定幕（重置全局時間到該幕起點）
  devJumpChapter(idx) {
    if (this.gameEnded) return;
    this.gameElapsed = idx * CHAPTER_MS;
    this.applyChapter(idx);
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
          if (oldView) this.freeSymbolView(oldView);
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
    // 鳳火插入，命局暫停（章節時間停止推進）
    this.narrativePaused = true;
    this.showFatePauseLabel();
    this.addDestiny(awakened === 'super' ? 12 : awakened === 'awaken' ? 9 : 6, '虞姬覺醒');
    // 覺醒之力：起始 sticky 倍數先給玩家
    this.stickyMultiplier = awakened === 'super' ? 5 : awakened === 'awaken' ? 3 : 0;
    this.freeGames = spins;
    this.freeGameTotalWin = 0;  // 累積整輪免費贏分
    if (withIntro) this.showFreeGameIntro(spins, awakened);
    this.showYuji();
    this.createFGStatus();
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
    const titleText = awakened === 'super' ? '超級覺醒' : awakened === 'awaken' ? '覺醒之力' : '虞姬覺醒';
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

  // 虞姬於 Free Game 中央現身（鳳火覺醒，12 幀循環）
  showYuji() {
    if (!this.yuji) return;
    const n = (this._layoutNodes || []).find(x => x.id === 'yuji');
    const ov = this.layout && this.layout.yuji;
    this.yuji.setVisible(true);
    if (!this.playCharSeq(this.yuji, 'seq-yj', [0,1,2,3,4,5,6,7,8,9,10,11], { fps: 10, loop: true,
        targetH: (IS_PORTRAIT ? HEIGHT * 0.34 : HEIGHT * 0.62) * ((ov && ov.scale) || 1) })) {
      // 無序列幀時 fallback：靜態立繪
      if (this.textures.exists('char-yuji')) this.yuji.setTexture('char-yuji');
    }
    // 套回排版覆寫位置（playCharSeq 會改 scale/origin，但不動 x/y）
    if (ov) { if (Number.isFinite(ov.x)) this.yuji.x = ov.x; if (Number.isFinite(ov.y)) this.yuji.y = ov.y; }
    this.yuji.setAlpha(0);
    this.tweens.add({ targets: this.yuji, alpha: 0.96, duration: 600, ease: 'Cubic.out' });
  }

  hideYuji() {
    if (!this.yuji) return;
    this.tweens.add({
      targets: this.yuji, alpha: 0, duration: 420,
      onComplete: () => { this.stopCharSeq(this.yuji); this.yuji.setVisible(false); }
    });
  }

  endFreeGame(lastWin) {
    this.inFreeGame = false;
    RT.inFreeGame = false;
    // 鳳火退場，命局繼續推進
    this.narrativePaused = false;
    this.hideYuji();
    this.hideFatePauseLabel();
    this.destroyFGStatus();
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

    // 1.5) 金龍橫幅背景（與爆獎儀式同款，強化結算魄力）
    if (this.textures.exists('ui-bigwin-banner')) {
      const banner = this.add.image(cx, cy - 70, 'ui-bigwin-banner').setDepth(80.2).setAlpha(0);
      const bw = (IS_PORTRAIT ? WIDTH * 1.06 : WIDTH * 0.8);
      banner.setScale(bw / banner.width);
      this.tweens.add({ targets: banner, alpha: 1, duration: 480, ease: 'Cubic.out' });
      this.tweens.add({ targets: banner, scaleX: banner.scaleX * 1.04, scaleY: banner.scaleY * 1.04, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      layer.push(banner);
    }

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

    // 5) 關閉按鈕（正式青色按鈕皮）
    const btnY = cy + 280;
    const closeSkin = makeSkinButton(this, cx, btnY, '關閉', {
      color: 'teal', width: 540, fontSize: '38px', depth: 81,
      onClick: () => close()
    });
    closeSkin.img.setAlpha(0); closeSkin.label.setAlpha(0);
    this.tweens.add({ targets: [closeSkin.img, closeSkin.label], alpha: 1, duration: 380, delay: 700 });

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
    layer.push(closeSkin.img, closeSkin.label, closeSkin.zone);

    // 6) 浮誇音效層疊：開場爆音 → 計分 tick 連發 → 結尾號角
    playSfx(this, 'sfx-clear', { volume: 0.9, rate: 0.7 });
    playSfx(this, 'sfx-cheer', { volume: 0.9 });
    playSfx(this, 'sfx-crowd', { volume: 0.7 });
    const tickStart = 500;
    const tickDuration = 1700;
    const tickInterval = 65;
    const tickCount = Math.floor(tickDuration / tickInterval);
    for (let i = 0; i < tickCount; i++) {
      this.time.delayedCall(tickStart + i * tickInterval, () => {
        playSfx(this, 'sfx-drop', {
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
    if (ratio >= 100) tier = { label: 'EPIC WIN', sub: '蓋世神威', titleKey: 'ui-title-epic', glow: 0xffe680, hold: 4200, coins: 90 };
    else if (ratio >= 40) tier = { label: 'MEGA WIN', sub: '天下無雙', titleKey: 'ui-title-mega', glow: 0xffd35c, hold: 3600, coins: 70 };
    else if (ratio >= 20) tier = { label: 'BIG WIN', sub: '大勝利', titleKey: 'ui-title-big', glow: 0xffb84a, hold: 3000, coins: 55 };
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

    // 2.5) 金龍橫幅背景（有圖才放，置中蓋住畫面寬）
    if (this.textures.exists('ui-bigwin-banner')) {
      const banner = this.add.image(cx, cy - 30, 'ui-bigwin-banner').setDepth(79).setAlpha(0);
      const bw = (IS_PORTRAIT ? WIDTH * 1.04 : WIDTH * 0.78);
      banner.setScale(bw / banner.width);
      this.tweens.add({ targets: banner, alpha: 1, duration: 460, ease: 'Cubic.out' });
      this.tweens.add({ targets: banner, scaleX: banner.scaleX * 1.04, scaleY: banner.scaleY * 1.04, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      layer.push(banner);
    }

    // 3) 不間斷撒幣 timer — 從開場到結束持續撒，無多餘特效
    const coinTimer = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => this.showerCoins(Math.floor(tier.coins * 0.3))
    });

    // 4) 中文戰國標題字（大勝利 / 天下無雙 / 蓋世神威，各 tier 專屬生成圖）
    const titleTex = this.textures.exists(tier.titleKey) ? tier.titleKey : 'ui-bigwin-text';
    const winImg = this.add.image(cx, cy - 150, titleTex).setDepth(80);
    const winDisplayW = IS_PORTRAIT ? 820 : 760;
    const winScale = winDisplayW / winImg.width;
    winImg.setScale(winScale * 0.3).setAlpha(0);
    this.tweens.add({ targets: winImg, scaleX: winScale, scaleY: winScale, alpha: 1, duration: 580, ease: 'Back.out' });
    this.tweens.add({ targets: winImg, angle: 1.5, duration: 240, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 600 });
    layer.push(winImg);

    // 6) 小字英文階級標（置於標題下，點綴用）
    const tierTag = this.add.text(cx, cy + 70, tier.label, {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#fff1b8',
      stroke: '#3a0408',
      strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 3, color: '#000000', blur: 5, fill: true }
    }).setOrigin(0.5).setDepth(80).setAlpha(0);
    this.tweens.add({ targets: tierTag, alpha: 1, duration: 380, delay: 420 });
    layer.push(tierTag);

    // 7) 金色計分器（從 0 跳到 totalWin）
    const amount = this.add.text(cx, cy + 175, '0.00', {
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
    playSfx(this, 'sfx-clear', { volume: 0.9, rate: 0.7 });   // 低沉開場爆音
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
        playSfx(this, 'sfx-drop', {
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

    // 天命玉（倍數球）共用單張圖，倍數字由程式繪製覆蓋
    if (symbol.multiplier) {
      const multText = this.add.text(x, y, `${symbol.multiplier}x`, {
        fontFamily: 'Arial Black, Impact, sans-serif',
        fontSize: IS_PORTRAIT ? '42px' : '38px',
        fontStyle: 'bold',
        color: '#fff4cf',
        stroke: '#6a2d05',
        strokeThickness: 6,
        shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true }
      }).setOrigin(0.5).setDepth(7);
      img.multText = multText;
    }

    // Scatter（鳳凰令）/ Bonus（玉璽）加標籤 — 玩家一眼可識別
    if (symbol.id === 'scatter' || symbol.id === 'bonus') {
      const isBonus = symbol.id === 'bonus';
      if (isBonus) img.setTint(0xc8e0ff); // 玉璽：青金冷光
      const labelY = y + size * 0.32;
      const ribbon = this.add.rectangle(x, labelY, size * 0.82, 24,
        isBonus ? 0x1f5f8f : 0xc4322a, 0.95)
        .setStrokeStyle(2, isBonus ? 0x9fd0ff : 0xffd76b, 1).setDepth(6);
      const label = this.add.text(x, labelY, isBonus ? '玉璽' : '鳳凰令', {
        fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif',
        fontSize: isBonus ? '16px' : '15px',
        fontStyle: 'bold',
        color: '#fff1b8',
        stroke: isBonus ? '#06223a' : '#3a0408',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(7);
      img.scatterRibbon = ribbon;
      img.scatterLabel = label;
      img.scatterOffsetY = size * 0.32;
    }
    return img;
  }

  // 安全銷毀 symbol：連同附掛的 scatter 緞帶/標籤/倍數字一起清，並移出 symbolViews
  // （避免 view 已移出陣列、syncScatterLabels 掃不到 → SCATTER 標籤變孤兒殘留）
  freeSymbolView(view) {
    if (!view) return;
    if (view.scatterRibbon) { view.scatterRibbon.destroy(); view.scatterRibbon = null; }
    if (view.scatterLabel) { view.scatterLabel.destroy(); view.scatterLabel = null; }
    if (view.multText) { view.multText.destroy(); view.multText = null; }
    this.symbolViews = this.symbolViews.filter((item) => item !== view);
    view.destroy();
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

  update(time, delta) {
    this.syncScatterLabels();
    if (this.editMode) { this.syncEditorHandles(); return; }
    this.tickNarrative(delta);
  }

  // ───────── 敘事系統 ─────────
  tickNarrative(delta) {
    if (this.gameEnded) return;
    // Free Game（鳳火插入）期間：章節時間暫停
    if (!this.narrativePaused) {
      const d = Math.min(delta || 16, 250); // 切分頁回來時 delta 會暴衝，夾住
      this.gameElapsed += d;
      const idx = Math.min(CHAPTERS.length - 1, Math.floor(this.gameElapsed / CHAPTER_MS));
      if (idx !== this.chapterIndex) this.applyChapter(idx);
      if (this.gameElapsed >= GAME_TOTAL_MS) {
        this.playEnding();
        return;
      }
    }
    // 倒數文字每 ~250ms 更新一次
    this._cdAcc = (this._cdAcc || 0) + (delta || 16);
    if (this._cdAcc >= 250) {
      this._cdAcc = 0;
      this.refreshNarrativeClock();
    }
  }

  createNarrativePanel() {
    const portrait = IS_PORTRAIT;
    const px = portrait ? 24 : 24;
    const py = portrait ? 250 : 132;
    const pw = portrait ? 470 : 430;
    const ph = portrait ? 250 : 224;
    const root = this.add.container(px, py).setDepth(30);
    this.narrativePanel = root;

    const g = this.add.graphics();
    g.fillStyle(0x140609, 0.78);
    g.fillRoundedRect(0, 0, pw, ph, 18);
    g.lineStyle(3, 0xc99a3c, 0.9);
    g.strokeRoundedRect(0, 0, pw, ph, 18);
    root.add(g);

    this.chapterBadge = this.add.text(20, 18, CHAPTERS[0].name, {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: portrait ? '34px' : '30px', fontStyle: 'bold',
      color: '#ffe1a6', stroke: '#3a0810', strokeThickness: 4
    }).setOrigin(0, 0);
    root.add(this.chapterBadge);

    this.clockText = this.add.text(pw - 20, 20, '12:00', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: portrait ? '34px' : '30px', fontStyle: 'bold',
      color: '#ffd24a', stroke: '#3a0810', strokeThickness: 4
    }).setOrigin(1, 0);
    root.add(this.clockText);

    this.chapterLine = this.add.text(20, portrait ? 66 : 60, CHAPTERS[0].line, {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif',
      fontSize: portrait ? '24px' : '21px', color: '#f0c98a',
      wordWrap: { width: pw - 40 }, lineSpacing: 4
    }).setOrigin(0, 0);
    root.add(this.chapterLine);

    // 命數條
    const barY = ph - (portrait ? 76 : 70);
    const barW = pw - 40;
    this.destinyLabel = this.add.text(20, barY - (portrait ? 30 : 27), '命數 0 / 120', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif',
      fontSize: portrait ? '24px' : '21px', fontStyle: 'bold', color: '#ffe9a6'
    }).setOrigin(0, 0);
    root.add(this.destinyLabel);
    this.endingHint = this.add.text(pw - 20, barY - (portrait ? 30 : 27), '', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif',
      fontSize: portrait ? '22px' : '19px', color: '#9fd0ff'
    }).setOrigin(1, 0);
    root.add(this.endingHint);

    const trackG = this.add.graphics();
    trackG.fillStyle(0x000000, 0.55);
    trackG.fillRoundedRect(20, barY, barW, portrait ? 26 : 22, 8);
    trackG.lineStyle(2, 0x6b5a30, 1);
    trackG.strokeRoundedRect(20, barY, barW, portrait ? 26 : 22, 8);
    root.add(trackG);

    this.destinyFill = this.add.rectangle(22, barY + (portrait ? 13 : 11), 4, portrait ? 20 : 16, 0xf2b21a, 0.95)
      .setOrigin(0, 0.5);
    root.add(this.destinyFill);
    this._destinyBarGeom = { x: 22, w: barW - 4, barY, portrait };

    this.updateDestinyBar();
    this.refreshNarrativeClock();
  }

  refreshNarrativeClock() {
    if (!this.clockText) return;
    if (this.narrativePaused) {
      this.clockText.setText('命局暫停');
      this.clockText.setColor('#ff9bd0');
      return;
    }
    const remain = Math.max(0, GAME_TOTAL_MS - this.gameElapsed);
    const mm = Math.floor(remain / 60000);
    const ss = Math.floor((remain % 60000) / 1000);
    this.clockText.setText(`${mm}:${String(ss).padStart(2, '0')}`);
    this.clockText.setColor(remain < 60000 ? '#ff7a7a' : '#ffd24a');
  }

  destinyColor(d) {
    if (d >= 115) return 0xfff2c0;       // 天下改命：白金
    if (d >= 78) return 0xffd35c;        // 霸王歸楚：紅金
    if (d >= 42) return 0xff7b3a;        // 虞姬留魂：暖紅
    return 0x6fb0ff;                     // 烏江別姬：冷藍
  }

  updateDestinyBar() {
    if (!this.destinyFill) return;
    const geom = this._destinyBarGeom;
    const frac = Phaser.Math.Clamp(this.destiny / DESTINY_MAX, 0, 1);
    this.destinyFill.width = Math.max(geom.w * frac, 4);
    this.destinyFill.fillColor = this.destinyColor(this.destiny);
    this.destinyLabel.setText(`命數 ${this.destiny} / ${DESTINY_MAX}`);
    const e = endingForDestiny(this.destiny);
    this.endingHint.setText(`▶ ${e.title}`);
  }

  flashDestinyGain(amount, reason) {
    if (!this.destinyLabel) return;
    const wx = this.narrativePanel.x + this.destinyLabel.x + 150;
    const wy = this.narrativePanel.y + this.destinyLabel.y + 8;
    const t = this.add.text(wx, wy, `命數 +${amount}`, {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif',
      fontSize: IS_PORTRAIT ? '26px' : '22px', fontStyle: 'bold',
      color: '#ffe27a', stroke: '#3a0810', strokeThickness: 4
    }).setOrigin(0, 0.5).setDepth(31);
    this.tweens.add({ targets: t, y: wy - 36, alpha: 0, duration: 900, ease: 'Cubic.out', onComplete: () => t.destroy() });
    this.tweens.add({ targets: this.destinyLabel, scale: 1.12, duration: 140, yoyo: true, ease: 'Sine.inOut' });
  }

  applyChapter(idx, immediate) {
    this.chapterIndex = idx;
    const ch = CHAPTERS[idx];
    this.setSeason(idx); // 氛圍粒子隨幕切換
    if (this.chapterBadge) this.chapterBadge.setText(ch.name);
    if (this.chapterLine) this.chapterLine.setText(ch.line);
    // 背景換幕（淡入淡出）
    if (this.bgImage && this.textures.exists(ch.bgKey)) {
      if (immediate) {
        this.bgImage.setTexture(ch.bgKey);
        coverImage(this, this.bgImage, WIDTH, HEIGHT);
        if (this.bgDim) this.bgDim.fillColor = ch.tint;
      } else {
        const next = this.add.image(WIDTH / 2, HEIGHT / 2, ch.bgKey).setDepth(-2).setAlpha(0);
        coverImage(this, next, WIDTH, HEIGHT);
        this.tweens.add({
          targets: next, alpha: 1, duration: 900, ease: 'Cubic.inOut',
          onComplete: () => { if (this.bgImage) this.bgImage.destroy(); this.bgImage = next; }
        });
        if (this.bgDim) this.tweens.add({ targets: this.bgDim, alpha: 0.32, duration: 600,
          onComplete: () => { this.bgDim.fillColor = ch.tint; } });
        this.showChapterBanner(ch);
      }
    }
  }

  showChapterBanner(ch) {
    const cx = WIDTH / 2, cy = HEIGHT * 0.36;
    const layer = [];
    const sub = this.add.text(cx, cy + 60, ch.line, {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: IS_PORTRAIT ? '34px' : '30px', color: '#f0c98a',
      stroke: '#1a0406', strokeThickness: 4, align: 'center',
      wordWrap: { width: WIDTH * 0.8 }
    }).setOrigin(0.5).setDepth(86).setAlpha(0);
    const title = this.add.text(cx, cy, ch.name, {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: IS_PORTRAIT ? '76px' : '88px', fontStyle: 'bold',
      color: '#ffe1a6', stroke: '#4a0a10', strokeThickness: 12,
      shadow: { offsetX: 0, offsetY: 8, color: '#000000', blur: 20, fill: true }
    }).setOrigin(0.5).setDepth(86).setScale(0.6).setAlpha(0);
    layer.push(title, sub);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 560, ease: 'Back.out' });
    this.tweens.add({ targets: sub, alpha: 1, duration: 520, delay: 240 });
    this.time.delayedCall(2400, () => {
      this.tweens.add({ targets: layer, alpha: 0, duration: 480, onComplete: () => layer.forEach(n => n.destroy()) });
    });
  }

  showFatePauseLabel() {
    if (this.fatePauseLabel) return;
    const t = this.add.text(WIDTH / 2, IS_PORTRAIT ? 360 : 240, '鳳火插入 · 命局暫停', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: IS_PORTRAIT ? '40px' : '36px', fontStyle: 'bold',
      color: '#ffd0ec', stroke: '#3a0820', strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 8, fill: true }
    }).setOrigin(0.5).setDepth(62);
    this.tweens.add({ targets: t, alpha: 0.4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.fatePauseLabel = t;
    this.refreshNarrativeClock();
  }

  hideFatePauseLabel() {
    if (this.fatePauseLabel) { this.fatePauseLabel.destroy(); this.fatePauseLabel = null; }
    this.refreshNarrativeClock();
  }

  playEnding() {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.autoSpin = false;
    if (this.spinZone) this.spinZone.disableInteractive();
    const e = endingForDestiny(this.destiny);
    const cx = WIDTH / 2, cy = HEIGHT / 2;

    const overlay = this.add.rectangle(cx, cy, WIDTH, HEIGHT, 0x000000, 0).setDepth(95);
    this.tweens.add({ targets: overlay, alpha: 0.5, duration: 600 });
    const bg = this.add.image(cx, cy, this.textures.exists(e.bgKey) ? e.bgKey : 'bg-ch-4').setDepth(96).setAlpha(0);
    coverImage(this, bg, WIDTH, HEIGHT);
    this.tweens.add({ targets: bg, alpha: 1, duration: 900, ease: 'Cubic.inOut' });
    const scrim = this.add.rectangle(cx, cy, WIDTH, HEIGHT, 0x05030a, 0.42).setDepth(96);

    const title = this.add.text(cx, cy - (IS_PORTRAIT ? 320 : 230), e.title, {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: IS_PORTRAIT ? '112px' : '128px', fontStyle: 'bold',
      color: '#ffe1a6', stroke: '#4a0a10', strokeThickness: 14,
      shadow: { offsetX: 0, offsetY: 10, color: '#000000', blur: 26, fill: true }
    }).setOrigin(0.5).setDepth(97).setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 760, delay: 500, ease: 'Back.out' });

    const desc = this.add.text(cx, cy - (IS_PORTRAIT ? 180 : 110), e.desc, {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
      fontSize: IS_PORTRAIT ? '34px' : '32px', color: '#f3d9a6',
      stroke: '#1a0406', strokeThickness: 4, align: 'center',
      wordWrap: { width: WIDTH * 0.78 }, lineSpacing: 8
    }).setOrigin(0.5).setDepth(97).setAlpha(0);
    this.tweens.add({ targets: desc, alpha: 1, duration: 700, delay: 1000 });

    const destinyText = this.add.text(cx, cy + (IS_PORTRAIT ? -40 : 10),
      `命數 ${this.destiny} / ${DESTINY_MAX}`, {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: IS_PORTRAIT ? '60px' : '56px', fontStyle: 'bold',
      color: '#ffd24a', stroke: '#3a0810', strokeThickness: 7
    }).setOrigin(0.5).setDepth(97).setAlpha(0);
    this.tweens.add({ targets: destinyText, alpha: 1, duration: 600, delay: 1300 });

    if (this.destiny >= 78) this.showerCoins(this.destiny >= 115 ? 90 : 50);

    const btnY = cy + (IS_PORTRAIT ? 200 : 180);
    const replayBtn = makeSkinButton(this, cx, btnY, '再來一局', {
      color: 'gold',
      width: IS_PORTRAIT ? 480 : 440,
      fontSize: IS_PORTRAIT ? '44px' : '40px',
      depth: 97,
      onClick: () => window.location.reload()
    });
    replayBtn.img.setAlpha(0); replayBtn.label.setAlpha(0);
    this.tweens.add({ targets: [replayBtn.img, replayBtn.label], alpha: 1, duration: 600, delay: 1700 });
  }

  getCellCenter(c, r) {
    // 套用排版編輯器的盤面位移/縮放（以盤面中心為基準）
    const o = (this.layout && this.layout.board) || {};
    const cs = o.scale || 1;
    const dx = o.dx || 0;
    const dy = o.dy || 0;
    const ccx = (GRID_X[0] + GRID_X[GRID_X.length - 1]) / 2;
    const ccy = (GRID_Y[0] + GRID_Y[GRID_Y.length - 1]) / 2;
    return {
      x: ccx + (GRID_X[c] - ccx) * cs + dx,
      y: ccy + (GRID_Y[r] - ccy) * cs + dy
    };
  }

  // 依目前盤面位移/縮放即時重排現有符號（編輯器拖曳時用）
  relayoutSymbols() {
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        const v = this.viewGrid?.[r]?.[c];
        if (v && v.active) {
          const { x, y } = this.getCellCenter(c, r);
          v.setPosition(x, y);
        }
      }
    }
  }

  // 註冊可調版面元件；若有存檔覆寫，立即套用
  registerNode(id, obj, opts = {}) {
    if (!obj) return;
    obj._lbBaseSX = obj.scaleX;
    obj._lbBaseSY = obj.scaleY;
    const node = { id, obj, scalable: !!opts.scalable, label: opts.label || id, baseDepth: obj.depth };
    node._sx = 1; node._sy = 1;
    this._layoutNodes.push(node);
    const ov = this.layout[id];
    if (ov) {
      if (Number.isFinite(ov.x)) obj.x = ov.x;
      if (Number.isFinite(ov.y)) obj.y = ov.y;
      if (Number.isFinite(ov.depth)) obj.setDepth(ov.depth);
      if (node.scalable) {
        // 相容舊存檔：scale（等比）→ sx/sy
        const sx = Number.isFinite(ov.sx) ? ov.sx : (Number.isFinite(ov.scale) ? ov.scale : 1);
        const sy = Number.isFinite(ov.sy) ? ov.sy : (Number.isFinite(ov.scale) ? ov.scale : 1);
        node._sx = sx; node._sy = sy;
        obj.setScale(obj._lbBaseSX * sx, obj._lbBaseSY * sy);
      }
    }
    return node;
  }

  // 套用節點目前 sx/sy（board 走 layout.board.scale 等比）
  _applyNodeScale(node) {
    if (node.isBoard) {
      const o = this.layout.board || {};
      o.scale = +(node._sx).toFixed(3);
      this.layout.board = o;
      this.relayoutSymbols();
    } else {
      node.obj.setScale(node.obj._lbBaseSX * node._sx, node.obj._lbBaseSY * node._sy);
    }
  }

  registerLayoutNodes() {
    this.registerNode('bg', this.bgImage, { scalable: true, label: '背景' });
    this.registerNode('reelFrame', this.boardFrameImg, { scalable: true, label: '盤面外框' });
    this.registerNode('headerStrip', this.headerStrip, { label: '頂部獎池條' });
    this.registerNode('spinInfo', this.spinInfoPanel, { label: '訊息列' });
    this.registerNode('winBadge', this.winBadge, { label: '贏分牌' });
    this.registerNode('narrative', this.narrativePanel, { label: '敘事面板' });
    this.registerNode('xiangyu', this.oda, { scalable: true, label: '項羽' });
    this.registerNode('liubang', this.takeda, { scalable: true, label: '劉邦' });
    this.registerNode('yuji', this.yuji, { scalable: true, label: '虞姬(FG)' });
    this.registerNode('betPanel', this.betPanel, { label: '押注列' });
    this.registerNode('spinCtrl', this.spinContainer, { scalable: true, label: 'SPIN 鈕' });
    this.registerNode('buyFeature', this.buyGroup, { scalable: true, label: '購買特色' });
    if (this.creditText) this.registerNode('creditStat', this.creditText.group, { label: '點數欄' });
    if (this.scoreText) this.registerNode('scoreStat', this.scoreText.group, { label: '贏分欄' });
    // 盤面（符號矩陣）整體位移/縮放：用虛擬節點，套到 getCellCenter
    const o = this.layout.board || {};
    const ccx = (GRID_X[0] + GRID_X[GRID_X.length - 1]) / 2;
    const ccy = (GRID_Y[0] + GRID_Y[GRID_Y.length - 1]) / 2;
    const boardHandle = this.add.container(ccx + (o.dx || 0), ccy + (o.dy || 0)).setDepth(6);
    boardHandle._isBoard = true;
    boardHandle._lbBaseSX = o.scale || 1;
    this._boardHandle = boardHandle;
    this._layoutNodes.push({
      id: 'board', obj: boardHandle, scalable: true, label: '盤面符號', isBoard: true,
      _sx: o.scale || 1, _sy: o.scale || 1
    });
  }

  // ───────── 遊戲內拖曳排版編輯器（?edit=1）─────────
  _nodeBounds(node) {
    if (node.isBoard) {
      const o = this.layout.board || {};
      const cs = o.scale || 1;
      const w = (GRID_X[GRID_X.length - 1] - GRID_X[0]) * cs + BOARD.cell;
      const h = (GRID_Y[GRID_Y.length - 1] - GRID_Y[0]) * cs + BOARD.cell;
      const ccx = (GRID_X[0] + GRID_X[GRID_X.length - 1]) / 2 + (o.dx || 0);
      const ccy = (GRID_Y[0] + GRID_Y[GRID_Y.length - 1]) / 2 + (o.dy || 0);
      return new Phaser.Geom.Rectangle(ccx - w / 2, ccy - h / 2, w, h);
    }
    const b = node.obj.getBounds();
    if (b.width < 30) { b.x -= 30; b.width += 60; }
    if (b.height < 30) { b.y -= 24; b.height += 48; }
    return b;
  }

  setupLayoutEditor() {
    this.narrativePaused = true;            // 編輯時不推進章節
    this._selNode = null;
    this._drag = null;
    // 編輯模式讓虞姬可見以便定位
    if (this.yuji) this.yuji.setVisible(true).setAlpha(0.5);

    this._layoutNodes.forEach(node => {
      const b = this._nodeBounds(node);
      const h = this.add.rectangle(b.centerX, b.centerY, b.width, b.height, 0x55ccff, 0.06)
        .setStrokeStyle(2, 0x66ccff, 0.7).setDepth(1000)
        .setInteractive({ useHandCursor: true });
      h._node = node;
      node.handle = h;
      h.on('pointerdown', () => {
        this._selNode = node;
        const p = this.input.activePointer;
        const o = this.layout.board || {};
        this._drag = {
          node, px: p.worldX, py: p.worldY,
          ox: node.obj.x, oy: node.obj.y,
          bdx: o.dx || 0, bdy: o.dy || 0
        };
        this._refreshEditorHud();
      });
    });

    // 8 個縮放控制點（選取的元件四角＋四邊；只在選取且 scalable 時顯示）
    const ROLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    this._resizeHandles = ROLES.map(role => {
      const r = this.add.rectangle(0, 0, 18, 18, 0xffd24a, 0.95)
        .setStrokeStyle(2, 0x3a2406, 1).setDepth(1160).setVisible(false)
        .setInteractive({ useHandCursor: true });
      r._role = role;
      r.on('pointerdown', () => {
        const n = this._selNode;
        if (!n || !n.scalable) return;
        const p = this.input.activePointer;
        const bnds = this._nodeBounds(n);
        this._resize = {
          node: n, role,
          cx: bnds.centerX, cy: bnds.centerY,
          hw: Math.max(8, bnds.width / 2), hh: Math.max(8, bnds.height / 2),
          sx0: n._sx, sy0: n._sy,
          dxs: Math.max(2, Math.abs(p.worldX - bnds.centerX)),
          dys: Math.max(2, Math.abs(p.worldY - bnds.centerY))
        };
      });
      return r;
    });

    this.input.on('pointermove', (p) => {
      if (this._resize) {
        const rz = this._resize, n = rz.node, role = rz.role;
        const rx = Math.max(2, Math.abs(p.worldX - rz.cx)) / rz.dxs;
        const ry = Math.max(2, Math.abs(p.worldY - rz.cy)) / rz.dys;
        const cl = v => Math.max(0.2, Math.min(3.5, v));
        if (role === 'e' || role === 'w') {
          n._sx = cl(rz.sx0 * rx);
        } else if (role === 'n' || role === 's') {
          n._sy = cl(rz.sy0 * ry);
        } else {
          const u = (rx + ry) / 2;            // 角點：等比
          n._sx = cl(rz.sx0 * u); n._sy = cl(rz.sy0 * u);
        }
        if (n.isBoard) n._sy = n._sx;          // 盤面只等比
        this._applyNodeScale(n);
        this._refreshEditorHud();
        return;
      }
      if (!this._drag) return;
      const dx = p.worldX - this._drag.px;
      const dy = p.worldY - this._drag.py;
      const n = this._drag.node;
      if (n.isBoard) {
        this.layout.board = Object.assign({}, this.layout.board, {
          dx: Math.round(this._drag.bdx + dx), dy: Math.round(this._drag.bdy + dy)
        });
        this.relayoutSymbols();
      } else {
        n.obj.x = Math.round(this._drag.ox + dx);
        n.obj.y = Math.round(this._drag.oy + dy);
      }
      this._refreshEditorHud();
    });
    this.input.on('pointerup', () => { this._drag = null; this._resize = null; });

    // 滾輪等比縮放選取元件
    this.input.on('wheel', (p, go, dxv, dyv) => {
      if (!this._selNode || !this._selNode.scalable) return;
      this._scaleSel(dyv > 0 ? -0.04 : 0.04);
    });

    // 鍵盤：方向鍵移動、[ ] 等比縮放、, . 調層級、S 存、X 匯出、R 重設、H 隱藏框
    this.input.keyboard.on('keydown', (e) => {
      const n = this._selNode;
      const big = e.shiftKey ? 10 : 1;
      if (n && !n.isBoard) {
        if (e.key === 'ArrowLeft') n.obj.x -= big;
        else if (e.key === 'ArrowRight') n.obj.x += big;
        else if (e.key === 'ArrowUp') n.obj.y -= big;
        else if (e.key === 'ArrowDown') n.obj.y += big;
      } else if (n && n.isBoard) {
        const o = this.layout.board || {};
        if (e.key === 'ArrowLeft') o.dx = (o.dx || 0) - big;
        else if (e.key === 'ArrowRight') o.dx = (o.dx || 0) + big;
        else if (e.key === 'ArrowUp') o.dy = (o.dy || 0) - big;
        else if (e.key === 'ArrowDown') o.dy = (o.dy || 0) + big;
        this.layout.board = o; this.relayoutSymbols();
      }
      if (e.key === '[') this._scaleSel(-0.04);
      else if (e.key === ']') this._scaleSel(0.04);
      else if (e.key === ',' || e.key === '<') this._changeDepth(-(e.shiftKey ? 10 : 1));
      else if (e.key === '.' || e.key === '>') this._changeDepth(e.shiftKey ? 10 : 1);
      else if (e.key.toLowerCase() === 's') this._saveLayoutNow();
      else if (e.key.toLowerCase() === 'x') this._exportLayout();
      else if (e.key.toLowerCase() === 'r') this._resetLayout();
      else if (e.key.toLowerCase() === 'h') this._editHud.setVisible(!this._editHud.visible);
      this._refreshEditorHud();
    });

    this._buildEditorHud();
  }

  // 調整選取元件的顯示層級（depth / z-order）
  _changeDepth(delta) {
    const n = this._selNode;
    if (!n || n.isBoard) return;                 // 盤面符號層級固定
    const d = Math.round((n.obj.depth || 0) + delta);
    n.obj.setDepth(d);
    this._refreshEditorHud();
  }

  _scaleSel(step) {
    const n = this._selNode;
    if (!n || !n.scalable) return;
    const cl = v => Math.max(0.2, Math.min(3.5, v));
    n._sx = cl((n._sx || 1) + step);
    n._sy = cl((n._sy || 1) + step);
    if (n.isBoard) n._sy = n._sx;
    this._applyNodeScale(n);
    this._refreshEditorHud();
  }

  syncEditorHandles() {
    if (!this._layoutNodes) return;
    this._layoutNodes.forEach(node => {
      if (!node.handle) return;
      const b = this._nodeBounds(node);
      node.handle.setPosition(b.centerX, b.centerY).setSize(b.width, b.height);
      const sel = this._selNode === node;
      node.handle.setStrokeStyle(sel ? 3 : 2, sel ? 0xffd24a : 0x66ccff, sel ? 1 : 0.55);
      node.handle.setFillStyle(sel ? 0xffd24a : 0x55ccff, sel ? 0.10 : 0.05);
    });
    // 8 點縮放控制點：跟著選取的可縮放元件外框
    const sel = this._selNode;
    const show = sel && sel.scalable && !this._handlesHidden;
    if (this._resizeHandles) {
      if (show) {
        const b = this._nodeBounds(sel);
        const L_ = b.x, R_ = b.x + b.width, T_ = b.y, B_ = b.y + b.height;
        const MX = b.centerX, MY = b.centerY;
        const pos = {
          nw: [L_, T_], n: [MX, T_], ne: [R_, T_], e: [R_, MY],
          se: [R_, B_], s: [MX, B_], sw: [L_, B_], w: [L_, MY]
        };
        this._resizeHandles.forEach(h => {
          const p = pos[h._role];
          h.setVisible(true).setPosition(p[0], p[1]);
        });
      } else {
        this._resizeHandles.forEach(h => h.setVisible(false));
      }
    }
  }

  _curLayoutOf(node) {
    if (node.isBoard) {
      const o = this.layout.board || {};
      return { dx: o.dx || 0, dy: o.dy || 0, scale: +(node._sx || 1).toFixed(3) };
    }
    const out = { x: Math.round(node.obj.x), y: Math.round(node.obj.y), depth: Math.round(node.obj.depth || 0) };
    if (node.scalable) { out.sx = +((node._sx || 1)).toFixed(3); out.sy = +((node._sy || 1)).toFixed(3); }
    return out;
  }

  _collectLayout() {
    const data = {};
    this._layoutNodes.forEach(node => {
      if (node.isBoard) data.board = this._curLayoutOf(node);
      else data[node.id] = this._curLayoutOf(node);
    });
    return data;
  }

  _saveLayoutNow() {
    const data = this._collectLayout();
    this.layout = data;
    const ok = saveLayout(data);
    this._toast(ok ? '版面已儲存（重整後自動套用）' : '儲存失敗');
  }

  _exportLayout() {
    const json = JSON.stringify(this._collectLayout(), null, 2);
    // eslint-disable-next-line no-console
    console.log('[FMC LAYOUT]\n' + json);
    if (navigator.clipboard) navigator.clipboard.writeText(json).catch(() => {});
    this._toast('版面 JSON 已輸出到 Console / 剪貼簿');
  }

  _resetLayout() {
    try { localStorage.removeItem(LAYOUT_KEY); } catch (e) {}
    this._toast('已清除版面覆寫，重整後回預設');
  }

  _toast(msg) {
    if (this._toastTxt) this._toastTxt.destroy();
    this._toastTxt = this.add.text(WIDTH / 2, HEIGHT - (IS_PORTRAIT ? 240 : 120), msg, {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif',
      fontSize: IS_PORTRAIT ? '30px' : '24px', fontStyle: 'bold',
      color: '#fff3d6', backgroundColor: '#1a0a06', padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setDepth(1200);
    this.tweens.add({ targets: this._toastTxt, alpha: 0, delay: 2200, duration: 600,
      onComplete: () => { if (this._toastTxt) { this._toastTxt.destroy(); this._toastTxt = null; } } });
  }

  _buildEditorHud() {
    const hud = this.add.container(0, 0).setDepth(1100);
    this._editHud = hud;
    const pw = IS_PORTRAIT ? WIDTH - 40 : 560;
    const ph = IS_PORTRAIT ? 250 : 210;
    const px = IS_PORTRAIT ? 20 : WIDTH - pw - 20;
    const py = IS_PORTRAIT ? HEIGHT - ph - 40 : 20;
    const bg = this.add.graphics();
    bg.fillStyle(0x07120a, 0.92); bg.fillRoundedRect(px, py, pw, ph, 14);
    bg.lineStyle(2, 0x66ff99, 0.9); bg.strokeRoundedRect(px, py, pw, ph, 14);
    hud.add(bg);
    hud.add(this.add.text(px + 16, py + 12, '排版編輯器  ?edit=1', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif',
      fontSize: '20px', fontStyle: 'bold', color: '#7CFFB0'
    }));
    this._editInfo = this.add.text(px + 16, py + 44,
      '點框選取 → 拖曳移動 ｜ 滾輪/[ ] 縮放 ｜ 方向鍵微調(Shift×10)', {
      fontFamily: '"PingFang TC", "Microsoft JhengHei", monospace',
      fontSize: '16px', color: '#bdf5d2', lineSpacing: 6,
      wordWrap: { width: pw - 32 }
    });
    hud.add(this._editInfo);

    const mkBtn = (label, i, fn) => {
      const bw = (pw - 32 - 24) / 4;
      const bx = px + 16 + i * (bw + 8);
      const byb = py + ph - 52;
      const r = this.add.rectangle(bx + bw / 2, byb + 18, bw, 38, 0x14361f, 0.95)
        .setStrokeStyle(1, 0x66ff99, 1).setInteractive({ useHandCursor: true });
      const t = this.add.text(bx + bw / 2, byb + 18, label, {
        fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif',
        fontSize: '18px', color: '#d6ffe6', fontStyle: 'bold'
      }).setOrigin(0.5);
      r.on('pointerup', fn);
      hud.add([r, t]);
    };
    mkBtn('儲存', 0, () => this._saveLayoutNow());
    mkBtn('匯出', 1, () => this._exportLayout());
    mkBtn('重設', 2, () => this._resetLayout());
    mkBtn('隱藏框', 3, () => {
      this._handlesHidden = !this._handlesHidden;
      this._layoutNodes.forEach(n => n.handle && n.handle.setVisible(!this._handlesHidden));
    });
    this._refreshEditorHud();
  }

  _refreshEditorHud() {
    if (!this._editInfo) return;
    const n = this._selNode;
    let line = '點框選取 → 拖曳移動 ｜ 拖 8 點或滾輪/[ ] 縮放 ｜ , . 調層級\n方向鍵微調(Shift×10) ｜ S 儲存  X 匯出  R 重設  H 隱藏框';
    if (n) {
      const c = this._curLayoutOf(n);
      const detail = n.isBoard
        ? `dx=${c.dx} dy=${c.dy} scale=${c.scale}`
        : `x=${c.x} y=${c.y} ｜ 層級 depth=${c.depth}` +
          (c.sx !== undefined ? `\nsx=${c.sx} sy=${c.sy}（角點等比／邊中點單軸）` : '');
      line = `選取：${n.label}\n${detail}\n拖曳移動 ｜ 8 點/滾輪/[ ] 縮放 ｜ , . 層級 ｜ S 存 X 匯 R 重設`;
    }
    this._editInfo.setText(line);
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
    this.message.setText(this.inFreeGame ? `虞姬覺醒剩餘 ${this.freeGames} 次 · 命數倍數 ${this.stickyMultiplier || 1}x` : '鳳火將動，命局重鑄...');
    this.spinZone.disableInteractive();

    // SPIN 按鈕不旋轉：改用輕微縮放回饋，維持原本節奏（520ms → 落盤 → 結算）
    this.tweens.add({
      targets: this.spinContainer,
      scaleX: 0.94,
      scaleY: 0.94,
      duration: 130,
      yoyo: true,
      ease: 'Sine.inOut'
    });
    this.time.delayedCall(520, () => {
      this.spinContainer.angle = 0;
      this.fillBoard(true);
      this.time.delayedCall(820, () => this.resolveSpin());
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
        playSfx(this, 'sfx-confirm', { volume: 0.55, rate: 0.85 + i * 0.04 });
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
    playSfx(this, 'sfx-charge', { volume: 0.65 });
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
    playSfx(this, 'sfx-crowd', { volume: 0.8 });
    playSfx(this, 'sfx-clear', { volume: 0.85, rate: 0.7 });
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
            onComplete: () => this.freeSymbolView(view)
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
        this.flashMessage(`天命玉聚！+${orbSum}x → 命數倍數 ${this.stickyMultiplier}x`);
        playSfx(this, 'sfx-confirm', { volume: 0.55 });
        this.addDestiny(Math.min(10, 1 + Math.floor(orbSum / 5)), '天命玉');
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
      this.flashMessage(`${scatters} 枚鳳凰令！虞姬覺醒，15 次免費遊戲`);
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
      this.addDestiny(Math.min(8, 1 + Math.floor(orbDelta / 8)), '天命玉');
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
        this.flashMessage(`鳳凰令獎勵 ${state.scatterBonus.toLocaleString()}`);
        playSfx(this, 'sfx-victory', { volume: 0.62, cooldown: 900 });
        state.totalWin = state.scatterBonus;
        this.score += state.scatterBonus;
        this.credits += state.scatterBonus;
        this.showerCoins(26);
      } else {
        this.message.setText('再轉一次，等待虞姬鳳火之刻');
      }
      // 命數累積：依本次贏分相對 bet 的倍率（一般小幅、爆獎大幅）
      if (state.totalWin > 0) {
        const r = state.totalWin / Math.max(this.bet, 1);
        let gain;
        if (r >= 100) gain = 14;
        else if (r >= 40) gain = 9;
        else if (r >= 20) gain = 6;
        else if (r >= 5) gain = 3;
        else gain = 1;
        if (this.inFreeGame) gain += 1; // FG 內中獎額外命數
        this.addDestiny(gain, '中獎');
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
        targets.forEach((view) => this.freeSymbolView(view));
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

    // 氛圍粒子由章節驅動（applyChapter → setSeason），不再隨時間自動輪播
    this.setSeason(0);
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

  // 序列幀播放器（綠幕去背後的 seq-xx-n 貼圖）。loop=false 播一次後回 base。
  playCharSeq(img, prefix, frames, opts = {}) {
    if (!img || !img.active) return false;
    if (!this.textures.exists(`${prefix}-${frames[0]}`)) return false;
    this.stopCharSeq(img);
    const fps = opts.fps || 14;
    const targetH = opts.targetH || CHARACTER_HEIGHT;
    let i = 0;
    const show = () => {
      const key = `${prefix}-${frames[i]}`;
      if (this.textures.exists(key) && img.active) {
        img.setTexture(key);
        img.setCrop();
        img.setOrigin(0.5, 0.5);
        img.setScale(targetH / img.height);
      }
    };
    show();
    img._seqEv = this.time.addEvent({
      delay: 1000 / fps, loop: true, callback: () => {
        i += 1;
        if (i >= frames.length) {
          if (opts.loop) { i = 0; } else {
            this.stopCharSeq(img);
            if (opts.onDone) opts.onDone();
            return;
          }
        }
        show();
      }
    });
    return true;
  }

  stopCharSeq(img) {
    if (img && img._seqEv) { img._seqEv.remove(); img._seqEv = null; }
  }

  animateWarlordsForSpin() {
    const C = L.CHARACTER;
    const FX = L.ATTACK_FX;
    playSfx(this, 'sfx-fan', { volume: 0.4, cooldown: 480 });
    // 項羽播放「上舉火球」技能序列幀（綠幕去背後）
    this.playCharSeq(this.oda, 'seq-xy', [1, 2, 3, 4, 5, 6, 7, 8], { fps: 14 });
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
      // 劉邦播放「玉璽上舉」技能序列幀
      this.playCharSeq(this.takeda, 'seq-lb', [1, 2, 3, 4, 5, 6, 7, 8], { fps: 14 });
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
      this.stopCharSeq(this.oda);
      if (this.oda.texture && this.oda.texture.key !== 'char-xiangyu') {
        this.oda.setTexture('char-xiangyu');
        setImageHeight(this.oda, CHARACTER_HEIGHT);
      }
      this.oda.setAngle(0);
      this.tweens.add({ targets: this.oda, x: C.odaIdle.x, duration: 180, ease: 'Sine.out' });
    }
    if (this.takeda?.active) {
      this.stopCharSeq(this.takeda);
      if (this.takeda.texture && this.takeda.texture.key !== 'char-liubang') {
        this.takeda.setTexture('char-liubang');
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

  // ── 免費遊戲狀態顯示（剩餘次數 + 累積倍數）──────────────
  // 結構刻意保持單純：1 個 container + 2 行文字，方便後續視覺微調
  createFGStatus() {
    if (this.fgStatus) this.fgStatus.destroy();
    const c = this.add.container(0, 0).setDepth(60);

    // ── 倍數徽章（盤面右上，像戰神賽特的 8x 圓徽）──
    const colLast = GRID_X[GRID_X.length - 1];
    const bx = colLast + (IS_PORTRAIT ? 96 : 86);
    const by = GRID_Y[0] - (IS_PORTRAIT ? 158 : 116);
    const badgeSize = IS_PORTRAIT ? 184 : 156;
    if (this.textures.exists('ui-fg-badge')) {
      const img = this.add.image(bx, by, 'ui-fg-badge');
      img.setScale(badgeSize / img.width);
      c.add(img);
    } else {
      // 無圖 fallback：程式畫的燙金圓環
      c.add(this.add.circle(bx, by, badgeSize / 2, 0x1a0d05, 0.92).setStrokeStyle(6, 0xffd76b, 1));
      c.add(this.add.circle(bx, by, badgeSize / 2 - 12, 0x000000, 0).setStrokeStyle(2, 0xffae3c, 0.8));
    }
    const multTxt = this.add.text(bx, by + 2, '', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: IS_PORTRAIT ? '60px' : '52px',
      fontStyle: 'bold',
      color: '#fff4cf',
      stroke: '#6a2d05',
      strokeThickness: 7,
      shadow: { offsetX: 0, offsetY: 3, color: '#000000', blur: 5, fill: true }
    }).setOrigin(0.5);
    c.add(multTxt);

    // ── 剩餘免費次數牌（盤面左下，像戰神賽特的 FREE GAMES）──
    const fx = GRID_X[0] - (IS_PORTRAIT ? 157 : 150);
    const fy = GRID_Y[GRID_Y.length - 1] - (IS_PORTRAIT ? 26 : 20);
    let numY = fy;
    if (this.textures.exists('ui-fg-frame')) {
      const fimg = this.add.image(fx, fy, 'ui-fg-frame');
      const fH = IS_PORTRAIT ? 260 : 240;
      fimg.setScale(fH / fimg.height);
      c.add(fimg);
      // 數字疊在卷軸匾額內框：實測內框淺色區中心位於影像 49% 高度（幾乎正中，略上 1%）
      numY = fy - fH * 0.01;
    } else {
      c.add(this.add.rectangle(fx, fy, IS_PORTRAIT ? 190 : 168, IS_PORTRAIT ? 150 : 132, 0x1a0708, 0.9).setStrokeStyle(4, 0xffd76b, 1));
      c.add(this.add.text(fx, fy - (IS_PORTRAIT ? 44 : 38), '免費遊戲', {
        fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif',
        fontSize: IS_PORTRAIT ? '26px' : '22px',
        fontStyle: 'bold',
        color: '#ffe9a6'
      }).setOrigin(0.5));
      numY = fy + (IS_PORTRAIT ? 18 : 14);
    }
    const spinsTxt = this.add.text(fx, numY, '', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: IS_PORTRAIT ? '50px' : '46px',
      fontStyle: 'bold',
      color: '#ffd24a',
      stroke: '#3a0408',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 6, fill: true }
    }).setOrigin(0.5);
    c.add(spinsTxt);

    c.spinsTxt = spinsTxt;
    c.multTxt = multTxt;
    this.fgStatus = c;
    this.updateFGStatus();
  }

  updateFGStatus() {
    if (!this.fgStatus) return;
    this.fgStatus.spinsTxt.setText(String(this.freeGames));
    this.fgStatus.multTxt.setText(`×${Math.max(this.stickyMultiplier || 0, 1)}`);
  }

  destroyFGStatus() {
    if (!this.fgStatus) return;
    this.fgStatus.destroy();
    this.fgStatus = null;
  }

  // 依目前 bet 更新拖曳 bar 的填色與拖曳鈕位置
  refreshBetBar() {
    if (!this.betFill || !this.betEdge) return;
    const frac = Phaser.Math.Clamp((this.bet - this.betMin) / (this.betMax - this.betMin), 0, 1);
    const w = Math.max(frac * this.betGaugeW, 8);
    this.betFill.width = w;
    this.betEdge.x = this.betGaugeLeft + w;
  }

  updateHud() {
    this.creditText.value.setText(this.credits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    this.scoreText.value.setText(this.score.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    this.betValueText.setText(String(this.bet));
    this.refreshBetBar();
    if (this.freeText) {
      this.freeText.setText(`${this.freeGames}\nFREE\nGAMES`);
    }
    this.updateFGStatus();
  }
}

function hasAudio(scene, key) {
  return Boolean(scene?.cache?.audio?.exists(key));
}

function playMusic(scene, key, config = {}) {
  if (!hasAudio(scene, key) || !scene.sound) return null;

  const base = config.volume ?? 0.38;
  scene._bgmBase = base;                                  // 記住原始音量，供滑桿即時調整
  const volume = base * (scene.bgmVolume ?? 1);           // 套用全域 BGM 音量
  let music = scene.sound.get(key);
  if (!music) {
    music = scene.sound.add(key, { loop: true, volume });
  }
  scene._bgm = music;
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

  const finalVol = volume * (scene.sfxVolume ?? 1);       // 套用全域音效音量
  if (finalVol <= 0.001) return;
  scene.sound.play(key, { volume: finalVol, ...soundConfig });
}

function coverImage(scene, image, targetW, targetH) {
  const scale = Math.max(targetW / image.width, targetH / image.height);
  image.setScale(scale);
  return image;
}

// 正式按鈕皮（翼形膠囊，6 色）＋ runtime 文字。回傳 { img, label, zone, setText }
// opts: { color, width, fontSize, depth, onClick }
function makeSkinButton(scene, x, y, text, opts = {}) {
  const color = opts.color || 'gold';
  const key = scene.textures.exists(`btn-${color}`) ? `btn-${color}` : 'btn-gold';
  const width = opts.width || (IS_PORTRAIT ? 460 : 400);
  const depth = opts.depth ?? 80;
  const img = scene.add.image(x, y, key).setDepth(depth);
  const baseScale = width / img.width;     // 720 寬原圖；翼端會超出，pill 本體約中央 72%
  img.setScale(baseScale);
  const fontSize = opts.fontSize || (IS_PORTRAIT ? '40px' : '34px');
  // 文字色：金/黃皮用深色字較清楚，其餘用米白
  const lightBtn = color === 'gold';
  const label = scene.add.text(x, y - img.displayHeight * 0.02, text, {
    fontFamily: '"PingFang TC", "Microsoft JhengHei", serif',
    fontSize,
    fontStyle: 'bold',
    color: lightBtn ? '#5a2206' : '#fff3d6',
    stroke: lightBtn ? '#ffe9a6' : '#2a0608',
    strokeThickness: lightBtn ? 2 : 5,
    shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true }
  }).setOrigin(0.5).setDepth(depth + 1);
  const zone = scene.add.rectangle(x, y, img.displayWidth * 0.82, img.displayHeight * 0.6, 0x000000, 0.01)
    .setInteractive({ useHandCursor: true }).setDepth(depth + 2);
  zone.on('pointerover', () => { img.setScale(baseScale * 1.035); label.setScale(1.035); });
  zone.on('pointerout', () => { img.setScale(baseScale); label.setScale(1); });
  zone.on('pointerdown', () => { img.setScale(baseScale * 0.965); label.setScale(0.965); });
  zone.on('pointerup', () => {
    img.setScale(baseScale); label.setScale(1);
    playSfx(scene, 'sfx-confirm', { volume: 0.4, cooldown: 150 });
    if (opts.onClick) opts.onClick();
  });
  return { img, label, zone, setText: (t) => label.setText(t) };
}

// ───────── 排版覆寫存儲（localStorage）─────────
// 玩家可在 ?edit=1 拖曳調整版面，存進瀏覽器，重整後自動套用，不必每次找工程師。
const LAYOUT_KEY = 'fmc_layout_v1';
function loadLayout() {
  try { return JSON.parse(localStorage.getItem(LAYOUT_KEY)) || {}; } catch (e) { return {}; }
}
function saveLayout(obj) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(obj)); return true; } catch (e) { return false; }
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
  const isCharacter = key.startsWith('char-');
  // 角色 base 立繪為全身 1400x2048；直版裁切上半身（cropRatio）當作 bust 顯示
  if (IS_PORTRAIT && isCharacter) {
    const ratio = L.CHARACTER.cropRatio;
    image.setCrop(0, 0, image.width, image.height * ratio);
    image.setOrigin(0.5, 0);
    image.setScale(height / (image.height * ratio));
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

const game = new Phaser.Game({
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
// 除錯用全域控制代碼（如 japanSengoku 的 window.__sengoku）
window.__FMC__ = game;
