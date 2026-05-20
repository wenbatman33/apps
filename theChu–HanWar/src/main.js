// 楚漢相爭 · 倍數連消老虎機（Pragmatic Play 戰神賽特 / Gates of Olympus 機制）
// 版型完全參照 codex 既有 game.js 的座標與圖層
import Phaser from 'phaser';

// ============================================================
// Layout：直接沿用 codex 的數字（畫布 1920x1080）
// ============================================================
const W = 1920;
const H = 1080;
const REEL_CX = 960;
const REEL_CY = 572;
const REEL_W = 984;
const REEL_H = 632;
const COLS = 6;
const ROWS = 5;
const CELL_W = REEL_W / COLS;           // 164
const CELL_H = REEL_H / ROWS;           // 126.4
const SYM_SIZE = Math.min(CELL_W, CELL_H) - 6;

// 格子中心
const gridX0 = REEL_CX - REEL_W / 2 + CELL_W / 2;
const gridY0 = REEL_CY - REEL_H / 2 + CELL_H / 2;
const cellX = (c) => gridX0 + c * CELL_W;
const cellY = (r) => gridY0 + r * CELL_H;

// ============================================================
// 符號 & 機率
// ============================================================
const SYMBOLS = [
  { key: 'sym_xiang_yu',    pay: [10,  25,  50]  },
  { key: 'sym_liu_bang',    pay: [5,   15,  30]  },
  { key: 'sym_jade_seal',   pay: [4,   10,  25]  },
  { key: 'sym_halberd',     pay: [2,    5,  15]  },
  { key: 'sym_tiger',       pay: [1.5,  4,  10]  },
  { key: 'gem_red',         pay: [1.0,  2,   5]  },
  { key: 'gem_purple',      pay: [0.8,  1.5, 4]  },
  { key: 'gem_yellow',      pay: [0.5,  1.0, 3]  },
  { key: 'gem_green',       pay: [0.4,  0.8, 2]  },
  { key: 'gem_blue',        pay: [0.3,  0.5, 1.5]},
];

const SYMBOL_WEIGHTS = {
  sym_xiang_yu: 3, sym_liu_bang: 4, sym_jade_seal: 5,
  sym_halberd: 7,  sym_tiger: 8,
  gem_red: 10, gem_purple: 11, gem_yellow: 12, gem_green: 13, gem_blue: 14,
  scatter: 2,
};

const MULT_VALUES  = [2,3,4,5,6,8,10,12,15,20,25,50,100,250,500];
const MULT_WEIGHTS = [40,32,25,22,20,15,12,10,8,5,4,2,1,0.5,0.2];

const FREE_SPIN_TRIGGER = 4;
const FREE_SPINS_INITIAL = 15;
const BET_STEPS = [10, 20, 40, 80, 160, 400, 800, 2000, 4000];

// ============================================================
// 音效對照（btm_*.mp3 → 邏輯 key）
// ============================================================
const SFX_FILES = {
  spin:        'btm_spin.mp3',
  fall_a:      'btm_fall_normal_1.mp3',
  fall_b:      'btm_fall_normal_2.mp3',
  tumble_a:    'btm_fall_auto_1.mp3',
  tumble_b:    'btm_fall_auto_2.mp3',
  scatter_in:  'btm_scatter_in.mp3',
  scatter_x2:  'btm_scatter_in_x2.mp3',
  scatter_win: 'btm_scatter_win.mp3',
  symbol_fx:   'btm_fx_symbol_function.mp3',
  symbol_frame:'btm_fx_symbol_frame.mp3',
  mult_land:   'btm_muti_function_1.mp3',
  mult_total:  'btm_muti_total.mp3',
  mult_up:     'btm_muti_upgrade.mp3',
  score:       'btm_score.mp3',
  score_plus:  'btm_score_plus.mp3',
  counting:    'btm_counting.mp3',
  fg_in:       'btm_fg_in_loop.mp3',
  fg_out:      'btm_fg_out.mp3',
  trans:       'btm_transitions.mp3',
  big_vocal:   'btm_w_big_vocal.mp3',
  super_vocal: 'btm_w_super_vocal.mp3',
  mega_vocal:  'btm_w_mega_vocal.mp3',
  ultra_vocal: 'btm_w_ultra_vocal.mp3',
  legend_vocal:'btm_w_legendary_vocal.mp3',
  fireworks:   'btm_w_fireworks.mp3',
  win_loop:    'btm_w_loop.mp3',
  prize_in:    'btm_w_in_prize_s.mp3',
  ch_male:     'btm_ch_male.mp3',
  ch_female:   'btm_ch_female.mp3',
  open:        'btm_open.mp3',
};

// ============================================================
// SoundManager：原生 Audio pool，獨立 BGM / SFX 音量
// ============================================================
const LS_KEY = 'chuhan_audio_v1';
class SoundManager {
  constructor() {
    // 從 localStorage 讀回記憶
    const saved = SoundManager._loadSettings();
    this.bgmVol   = saved.bgmVol ?? 0.4;
    this.sfxVol   = saved.sfxVol ?? 0.7;
    this.bgmMuted = !!saved.bgmMuted;
    this.sfxMuted = !!saved.sfxMuted;
    this.bgmAudio = null;
    this.sfxCache = new Map();   // key → HTMLAudioElement 模板
  }

  static _loadSettings() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  _save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        bgmVol: this.bgmVol, sfxVol: this.sfxVol,
        bgmMuted: this.bgmMuted, sfxMuted: this.sfxMuted,
      }));
    } catch (e) {}
  }

  loadSfx() {
    for (const [k, file] of Object.entries(SFX_FILES)) {
      const a = new Audio(`audio/sfx/${file}`);
      a.preload = 'auto';
      this.sfxCache.set(k, a);
    }
  }

  initBgm(src = 'audio/bgm_main.mp3') {
    if (!this.bgmAudio) {
      const a = new Audio(src);
      a.loop = true;
      a.volume = this.bgmMuted ? 0 : this.bgmVol;
      a.preload = 'auto';
      this.bgmAudio = a;
    }
  }

  playBgm() {
    if (!this.bgmAudio) return;
    if (this.bgmAudio.paused) {
      const p = this.bgmAudio.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  // 一次播放：clone 後播；不阻擋其他音
  playSfx(key, opts = {}) {
    if (this.sfxMuted) return;
    const src = this.sfxCache.get(key);
    if (!src) return;
    try {
      const a = src.cloneNode(true);
      a.volume = (opts.volume ?? 1) * this.sfxVol;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  setBgmVolume(v) {
    this.bgmVol = Phaser.Math.Clamp(v, 0, 1);
    if (this.bgmAudio) this.bgmAudio.volume = this.bgmMuted ? 0 : this.bgmVol;
    this._save();
  }
  setSfxVolume(v) {
    this.sfxVol = Phaser.Math.Clamp(v, 0, 1);
    this._save();
  }

  toggleBgmMute() {
    this.bgmMuted = !this.bgmMuted;
    if (this.bgmAudio) this.bgmAudio.volume = this.bgmMuted ? 0 : this.bgmVol;
    this._save();
  }
  toggleSfxMute() {
    this.sfxMuted = !this.sfxMuted;
    this._save();
  }
}

function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    if (r < weights[i]) return items[i];
    r -= weights[i];
  }
  return items[items.length - 1];
}
function pickSymbol(allowScatter = true) {
  const keys = Object.keys(SYMBOL_WEIGHTS);
  const filtered = allowScatter ? keys : keys.filter(k => k !== 'scatter');
  return weightedPick(filtered, filtered.map(k => SYMBOL_WEIGHTS[k]));
}
function pickMultiplier() { return weightedPick(MULT_VALUES, MULT_WEIGHTS); }

// ============================================================
// PreloadScene
// ============================================================
class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    // 限制並行載入，避免大量 PNG 同時下載導致 loader 卡住
    this.load.maxParallelDownloads = 6;
    // Loading 顯示
    this.cameras.main.setBackgroundColor('#0a0604');
    const t = this.add.text(W/2, H/2 - 80, '楚漢相爭 · 載入中', {
      fontFamily: 'Noto Serif TC, serif', fontSize: '48px', color: '#f5d27a',
    }).setOrigin(0.5);
    const barBg = this.add.rectangle(W/2, H/2, 800, 24, 0x2a1a10).setStrokeStyle(2, 0xd4a54a);
    const bar = this.add.rectangle(W/2 - 398, H/2, 4, 18, 0xf5d27a).setOrigin(0, 0.5);
    this.load.on('progress', p => { if (bar?.active) bar.width = 4 + 792 * p; });
    this.load.on('complete', () => {
      t?.destroy(); barBg?.destroy(); bar?.destroy();
    });

    // === 背景 / 人物（依 codex 座標） ===
    this.load.image('bg_battle',         'assets/bg/bg_battlefield_clean.png');
    this.load.image('chu_idle',          'assets/characters/chu/chu_idle.png');
    this.load.image('han_idle',          'assets/characters/han/han_idle.png');
    this.load.image('yuji_idle',         'assets/free_game/characters/yuji_idle.png');
    this.load.image('phoenix_back',      'assets/free_game/fx/phoenix_back.png');
    this.load.image('fengming_logo',     'assets/free_game/ui/fengming_jiuxiao_logo.png');

    // === Reel ===
    this.load.image('reel_bg',           'assets/reel/reel_bg.png');
    this.load.image('reel_frame',        'assets/reel/reel_frame.png');
    this.load.image('reel_separator',    'assets/reel/reel_separator.png');

    // === UI 面板 ===
    this.load.image('top_jackpot_panel', 'assets/ui/panels/top_jackpot_panel.png');
    this.load.image('bottom_hud_panel',  'assets/ui/panels/bottom_hud_panel.png');
    this.load.image('info_bar',          'assets/logo/info_bar.png');
    this.load.image('logo_title',        'assets/logo/chuhan_logo_title.png');

    // === HUD ===
    this.load.image('avatar_chu',        'assets/ui/hud/player_avatar_chu.png');
    this.load.image('icon_coin',         'assets/ui/hud/icon_coin_stack.png');
    this.load.image('btn_bet_minus',     'assets/ui/hud/btn_bet_minus.png');
    this.load.image('btn_bet_plus',      'assets/ui/hud/btn_bet_plus.png');
    this.load.image('btn_max_bet',       'assets/ui/hud/btn_max_bet.png');

    // === 主按鈕 ===
    this.load.image('btn_spin',          'assets/ui/buttons/btn_spin_normal.png');
    this.load.image('btn_settings',      'assets/ui/buttons/btn_settings_normal.png');
    this.load.image('btn_event',         'assets/ui/buttons/btn_event_normal.png');
    this.load.image('btn_fast',          'assets/ui/buttons/btn_fast_normal.png');
    this.load.image('btn_auto',          'assets/ui/buttons/btn_auto_normal.png');
    this.load.image('btn_menu',          'assets/ui/buttons/btn_menu_normal.png');

    // === 符號（10 種，無 wild）===
    this.load.image('sym_xiang_yu',    'assets/symbols/high/sym_xiang_yu.png');
    this.load.image('sym_liu_bang',    'assets/symbols/high/sym_liu_bang.png');
    this.load.image('sym_jade_seal',   'assets/symbols/high/sym_jade_seal.png');
    this.load.image('sym_halberd',     'assets/symbols/high/sym_halberd.png');
    this.load.image('sym_tiger',       'assets/symbols/high/sym_tiger_tally.png');
    this.load.image('gem_red',         'assets/symbols/low/sym_gem_red.png');
    this.load.image('gem_purple',      'assets/symbols/low/sym_gem_purple.png');
    this.load.image('gem_yellow',      'assets/symbols/low/sym_gem_yellow.png');
    this.load.image('gem_green',       'assets/symbols/low/sym_gem_green.png');
    this.load.image('gem_blue',        'assets/symbols/low/sym_gem_blue.png');
    this.load.image('scatter',         'assets/symbols/special/sym_scatter_phoenix_hairpin.png');
    this.load.image('mult_orb',        'assets/symbols/special/sym_multiplier_orb.png');

    // === Win ===
    this.load.image('win_bg',          'assets/win/bg/win_bg_award_clean.png');
    this.load.image('win_coin',        'assets/win/ui/win_coin.png');

    // === 楚漢多格漫畫頁（左右側欄輪播）===
    for (let ch = 1; ch <= 4; ch++) {
      this.load.image(`page_ch${ch}_chu`, `assets/comics/page_ch${ch}_chu.png`);
      this.load.image(`page_ch${ch}_han`, `assets/comics/page_ch${ch}_han.png`);
    }

    // BGM 改用原生 Audio 載入（避免 Phaser preload 卡住）
  }

  create() {
    // 把所有貼圖切成線性過濾，避免縮放鋸齒
    this.textures.each((tex) => {
      try {
        tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
      } catch (e) {}
    }, this);
    this.scene.start('Main');
  }
  // 防呆：若 load 卡住超過 8 秒，強制進 Main（避免使用者永遠卡在 Loading）
  init() {
    this._stuckTimer = setTimeout(() => {
      if (this.scene.isActive() && this.load.progress < 1) {
        console.warn('Preload stuck at', this.load.progress, '— forcing Main start');
        this.scene.start('Main');
      }
    }, 8000);
  }
}

// ============================================================
// MainScene
// ============================================================
class MainScene extends Phaser.Scene {
  constructor() { super('Main'); }

  create() {
    // 狀態
    this.balance = 10000;
    this.bet = 20;
    this.lastWin = 0;
    this.spinning = false;
    this.freeSpinsLeft = 0;
    this.inFreeGame = false;
    this.fgTotalWin = 0;
    this.autoMode = false;

    // === Depth 0：背景 ===
    this.bg = this.add.image(960, 540, 'bg_battle').setDisplaySize(W, H).setDepth(0);

    // === Depth 10/20：左右人物（base game：項羽 / 劉邦）===
    // 注意：base game 預設改用漫畫敘事面板；立繪保留實例但不顯示，
    // 之後 Free Game 退出時若需要可再顯示
    this.chuChar = this.add.image(238, 1311, 'chu_idle').setOrigin(0.5, 1).setDepth(10).setVisible(false);
    this.fitImageHeight(this.chuChar, 1240);
    this.hanChar = this.add.image(1690, 1360, 'han_idle').setOrigin(0.5, 1).setDepth(20).setVisible(false);
    this.fitImageHeight(this.hanChar, 1240);

    // === 楚漢漫畫敘事面板（左右側欄）===
    this.buildComicNarrator();

    // Free game 用的虞姬（兩側），預設隱藏；鳳凰光環當背景底
    // 注意：鳳凰 depth 必須比兩位虞姬還低，才不會蓋住人物
    this.fgPhoenix = this.add.image(960, 540, 'phoenix_back')
      .setDisplaySize(1400, 1080).setDepth(2).setAlpha(0).setVisible(false);
    this.yujiLeft = this.add.image(238, 1311, 'yuji_idle').setOrigin(0.5, 1).setDepth(11).setVisible(false);
    this.fitImageHeight(this.yujiLeft, 1240);
    this.yujiRight = this.add.image(1690, 1360, 'yuji_idle').setOrigin(0.5, 1).setDepth(21).setVisible(false);
    this.fitImageHeight(this.yujiRight, 1240);
    this.yujiRight.flipX = true; // 右側鏡像
    this.fengmingLogo = this.add.image(960, 380, 'fengming_logo').setDepth(160).setAlpha(0).setVisible(false);

    // === Depth 80：reel_bg ===
    this.add.image(REEL_CX, REEL_CY, 'reel_bg').setDisplaySize(REEL_W, REEL_H).setDepth(80);

    // === Depth 90：reel 直線分隔（用 codex 的 reel_separator.png）===
    const startX = REEL_CX - REEL_W / 2;
    for (let c = 1; c < COLS; c++) {
      this.add.image(startX + c * CELL_W, REEL_CY, 'reel_separator')
        .setDisplaySize(18, REEL_H).setDepth(90);
    }

    // === Depth 100：符號（容器 + 遮罩）===
    this.gridContainer = this.add.container(0, 0).setDepth(100);
    const maskShape = this.make.graphics().fillRect(
      REEL_CX - REEL_W/2, REEL_CY - REEL_H/2, REEL_W, REEL_H
    );
    this.gridContainer.setMask(maskShape.createGeometryMask());

    this.grid = Array.from({ length: COLS }, () => Array(ROWS).fill(null));
    this.multOrbs = [];

    // === Depth 110：reel_frame ===
    this.add.image(REEL_CX, REEL_CY, 'reel_frame').setDisplaySize(1018, 676).setDepth(110).setAlpha(0.95);

    // === Depth 120：top_jackpot_panel ===
    this.add.image(960, 42, 'top_jackpot_panel').setDisplaySize(1920, 76).setDepth(120);
    const jackpotStyle = (color) => ({
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: '27px', fontStyle: '900',
      color, stroke: '#2b1334', strokeThickness: 3, resolution: 2,
    });
    const jackpots = [
      { label: 'GRAND', value: '250,000.00', x: 250 },
      { label: 'MAJOR', value: '50,000.00',  x: 960 },
      { label: 'MINOR', value: '2,000.00',   x: 1520 },
    ];
    jackpots.forEach(j => {
      this.add.text(j.x - 92, 44, j.label, jackpotStyle('#ffdf55')).setOrigin(0.5).setDepth(121);
      this.add.text(j.x + 112, 44, j.value, jackpotStyle('#ffffff')).setOrigin(0.5).setDepth(121);
    });

    // === Depth 125-130：logo + info_bar ===
    this.add.image(960, 142, 'info_bar').setDisplaySize(720, 91).setDepth(130);
    this.infoText = this.add.text(960, 143, '楚河漢界　倍數連消　鳳鳴九霄', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: '32px', fontStyle: '900',
      color: '#ffe894', stroke: '#08352f', strokeThickness: 5, resolution: 2,
    }).setOrigin(0.5).setDepth(131);

    // === Depth 140：bottom_hud_panel ===
    this.add.image(960, 1018, 'bottom_hud_panel').setDisplaySize(1810, 129).setDepth(140);

    // === Depth 145：HUD controls（對齊 bottom_hud_panel y=1018）===
    const HUD_Y = 1018;
    this.add.image(116, HUD_Y, 'avatar_chu').setDisplaySize(74, 74).setDepth(145);
    this.add.image(468, HUD_Y, 'icon_coin').setDisplaySize(58, 58).setDepth(145);

    // 押注 -／+：左右各一顆，置中於 1060（總押注數字位置）
    const btnMinus = this.add.image(900, HUD_Y, 'btn_bet_minus').setDisplaySize(58, 58)
      .setDepth(145).setInteractive({ useHandCursor: true });
    const btnPlus  = this.add.image(1220, HUD_Y, 'btn_bet_plus').setDisplaySize(58, 58)
      .setDepth(145).setInteractive({ useHandCursor: true });
    btnMinus.on('pointerup', () => this.changeBet(-1));
    btnPlus.on('pointerup',  () => this.changeBet(+1));

    // 把「最大押注」換成「自動」按鈕（圓形外觀）
    this.btnAutoHud = this.add.image(1350, HUD_Y, 'btn_auto').setDisplaySize(72, 72)
      .setDepth(145).setInteractive({ useHandCursor: true });
    this.btnAutoHud.on('pointerup', () => this.toggleAuto());

    // === Depth 146：HUD 文字 ===
    const hudTextStyle = (size, color, opts = {}) => ({
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: `${size}px`, fontStyle: '900',
      color, stroke: opts.stroke ?? '#2a0908', strokeThickness: opts.strokeThickness ?? 3, resolution: 2,
    });
    // 玩家資訊（avatar 右側）
    this.add.text(210, 998, '玩家 漢王', hudTextStyle(24, '#ffffff')).setOrigin(0.5).setDepth(146);
    this.add.text(210, 1038, 'LV. 88', hudTextStyle(26, '#ffdf5a')).setOrigin(0.5).setDepth(146);

    // 餘額（coin icon 右側）
    this.txtBalance = this.add.text(625, 1000, '0.00', hudTextStyle(34, '#ffffff', { strokeThickness: 4 })).setOrigin(0.5).setDepth(146);
    this.add.text(625, 1038, '餘額', hudTextStyle(20, '#d8c399')).setOrigin(0.5).setDepth(146);

    // 押注（-+ 之間置中）
    this.txtBet = this.add.text(1060, 1000, '0.00', hudTextStyle(34, '#ffe55f', { strokeThickness: 4 })).setOrigin(0.5).setDepth(146);
    this.add.text(1060, 1038, '總押注', hudTextStyle(20, '#d8c399')).setOrigin(0.5).setDepth(146);

    // 自動按鈕下方標籤
    this.txtAutoLabel = this.add.text(1350, 1063, '自動', hudTextStyle(20, '#ffe55f', { strokeThickness: 3 })).setOrigin(0.5).setDepth(146);

    // 本局贏分（疊在資訊區）
    this.txtWin = this.add.text(960, 143, '', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: '36px', fontStyle: '900',
      color: '#fff8d0', stroke: '#7f1f1b', strokeThickness: 6, resolution: 2,
    }).setOrigin(0.5).setDepth(132);

    // Free Game 計數
    this.txtFG = this.add.text(960, 230, '', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: '32px', fontStyle: '900',
      color: '#ffe55f', stroke: '#3a0e0a', strokeThickness: 6, resolution: 2,
    }).setOrigin(0.5).setDepth(132);

    // === Depth 150：side buttons ===
    [
      { key: 'btn_event', y: 452, label: '活動' },
      { key: 'btn_fast',  y: 562, label: '快速' },
      { key: 'btn_auto',  y: 672, label: '自動', cb: () => this.toggleAuto() },
      { key: 'btn_menu',  y: 832, label: '選單' },
    ].forEach(b => {
      const img = this.add.image(1826, b.y, b.key).setDisplaySize(76, 76).setDepth(150)
        .setInteractive({ useHandCursor: true });
      this.add.text(1826, b.y + 43, b.label, hudTextStyle(20, '#ffe55f', { strokeThickness: 3 }))
        .setOrigin(0.5).setDepth(156);
      if (b.cb) img.on('pointerup', b.cb);
    });
    this.add.image(1868, 44, 'btn_settings').setDisplaySize(58, 58).setDepth(150)
      .setInteractive({ useHandCursor: true });

    // === Depth 155：btn_spin（縮小到 140 並上移避免壓 HUD）===
    this.btnSpin = this.add.image(1670, 940, 'btn_spin').setDisplaySize(140, 140).setDepth(155)
      .setInteractive({ useHandCursor: true });
    this.btnSpin.on('pointerup', () => this.onSpin());
    // idle 呼吸光（依 setDisplaySize 後的 scale 微幅縮放）
    const baseScale = this.btnSpin.scaleX;
    this.btnSpinIdleTween = this.tweens.add({
      targets: this.btnSpin, scale: { from: baseScale * 0.97, to: baseScale * 1.03 },
      duration: 900, yoyo: true, repeat: -1,
    });
    this.spinRotateTween = null;

    // 初始填盤（不中獎）
    this.populateInitial();
    this.refreshHUD();

    // === 音效系統 ===
    if (!window.__chuhanSound) {
      window.__chuhanSound = new SoundManager();
      window.__chuhanSound.initBgm();
      window.__chuhanSound.loadSfx();
    }
    // HMR 重用時：從 localStorage 重新同步音量（避免舊 instance 的 in-memory 狀態）
    const saved = SoundManager._loadSettings();
    if (saved.bgmVol !== undefined) window.__chuhanSound.setBgmVolume(saved.bgmVol);
    if (saved.sfxVol !== undefined) window.__chuhanSound.setSfxVolume(saved.sfxVol);
    this.sound2 = window.__chuhanSound;
    this.bgm = this.sound2.bgmAudio;

    const tryPlay = () => this.sound2.playBgm();
    tryPlay();
    this.input.once('pointerdown', tryPlay);
    window.addEventListener('keydown', tryPlay, { once: true });

    // 右上音量控制 UI
    this.buildVolumePanel();
  }

  // ----------------------------------------------------------
  // 楚漢漫畫敘事系統：3 分鐘 4 章 × 2 頁 × 左楚右漢
  // 流程：page B&W 淡入 → 左 panel 一格格染色 → 右 panel 染色 → 換頁
  // ----------------------------------------------------------
  buildComicNarrator() {
    // 4 章節（每章一頁多格漫畫頁）
    this.comicChapters = [
      { ch: 1, title: '第一章　起兵反秦' },
      { ch: 2, title: '第二章　鴻門宴' },
      { ch: 3, title: '第三章　楚河漢界' },
      { ch: 4, title: '第四章　垓下烏江' },
    ];

    // 左右側欄漫畫頁的位置與尺寸
    const PANEL_SIZE = 420;
    const LEFT_X  = 230;
    const RIGHT_X = 1690;
    const PANEL_Y = 540;
    this.COMIC_PANEL_SIZE = PANEL_SIZE;
    this.COMIC_LEFT_X = LEFT_X;
    this.COMIC_RIGHT_X = RIGHT_X;
    this.COMIC_PANEL_Y = PANEL_Y;

    // 漫畫格底板與金邊外框
    const makeFrame = (x) => this.add.rectangle(x, PANEL_Y, PANEL_SIZE + 20, PANEL_SIZE + 20, 0x0a0604, 0.85)
      .setStrokeStyle(4, 0xd4a54a).setDepth(12);
    makeFrame(LEFT_X);
    makeFrame(RIGHT_X);

    // 漫畫頁 image holder
    this.comicLeft  = this.add.image(LEFT_X,  PANEL_Y, '__DEFAULT')
      .setDisplaySize(PANEL_SIZE, PANEL_SIZE).setDepth(13).setVisible(false);
    this.comicRight = this.add.image(RIGHT_X, PANEL_Y, '__DEFAULT')
      .setDisplaySize(PANEL_SIZE, PANEL_SIZE).setDepth(13).setVisible(false);

    // 章節標題（置中於上方）
    this.comicChapterText = this.add.text(960, 215, '', {
      fontFamily: 'Noto Serif TC, serif', fontSize: '24px', fontStyle: '900',
      color: '#ffe55f', stroke: '#3a0e0a', strokeThickness: 4, resolution: 2,
    }).setOrigin(0.5).setDepth(135).setAlpha(0);

    // 5 個子格的相對區域（百分比，依照 codex prompt 的 5 格佈局）
    // A 左上大格、B 右上窄格、C 中央橫跨、D 左下傾斜、E 右下窄
    const ZONES = [
      { x: 0.00, y: 0.00, w: 0.50, h: 0.33 }, // A
      { x: 0.50, y: 0.00, w: 0.50, h: 0.33 }, // B
      { x: 0.00, y: 0.33, w: 1.00, h: 0.33 }, // C
      { x: 0.00, y: 0.66, w: 0.50, h: 0.34 }, // D
      { x: 0.50, y: 0.66, w: 0.50, h: 0.34 }, // E
    ];
    const makeOverlays = (centerX) => {
      const half = PANEL_SIZE / 2;
      const left = centerX - half;
      const top  = PANEL_Y - half;
      return ZONES.map(z => this.add.rectangle(
        left + (z.x + z.w / 2) * PANEL_SIZE,
        top  + (z.y + z.h / 2) * PANEL_SIZE,
        z.w * PANEL_SIZE, z.h * PANEL_SIZE,
        0x111111, 0.88,
      ).setDepth(14).setVisible(false));
    };
    this.comicLeftOverlays  = makeOverlays(LEFT_X);
    this.comicRightOverlays = makeOverlays(RIGHT_X);

    // 啟動敘事流程
    this.comicIndex = 0;
    this.time.delayedCall(1500, () => this.playComicSequence());
  }

  // 播放單章節：左楚 + 右漢一頁多格漫畫，10 格依序揭色（左右交錯）
  playComicSequence() {
    if (this.inFreeGame) {
      this.time.delayedCall(2000, () => this.playComicSequence());
      return;
    }
    const c = this.comicChapters[this.comicIndex];
    const leftKey  = `page_ch${c.ch}_chu`;
    const rightKey = `page_ch${c.ch}_han`;

    if (!this.textures.exists(leftKey) || !this.textures.exists(rightKey)) {
      this.comicIndex = (this.comicIndex + 1) % this.comicChapters.length;
      this.time.delayedCall(500, () => this.playComicSequence());
      return;
    }

    // 章節標題
    this.comicChapterText.setText(c.title).setAlpha(0);
    this.tweens.add({ targets: this.comicChapterText, alpha: 1, duration: 600 });

    // 換貼圖
    const SZ = this.COMIC_PANEL_SIZE;
    this.comicLeft.setTexture(leftKey).setDisplaySize(SZ, SZ).setVisible(true).setAlpha(0);
    this.comicRight.setTexture(rightKey).setDisplaySize(SZ, SZ).setVisible(true).setAlpha(0);

    // 全部 overlay 重新蓋上（B&W 狀態）
    [...this.comicLeftOverlays, ...this.comicRightOverlays].forEach(o => o.setVisible(true).setAlpha(0.88));

    // 漫畫頁淡入
    this.tweens.add({
      targets: [this.comicLeft, this.comicRight],
      alpha: 1, duration: 700, ease: 'Cubic.easeOut',
    });

    // 揭色：左右各 5 格依序揭開（左右交錯）
    // 整章節 ~45 秒（4 章 × 45 = 180 秒 = 3 分鐘）
    const REVEAL_START = 3000;        // 3s 後開始揭色
    const REVEAL_GAP   = 3500;        // 每格間隔 3.5s
    const REVEAL_DUR   = 1200;        // 單格揭色淡出時間
    const seq = [];
    for (let i = 0; i < 5; i++) {
      seq.push(this.comicLeftOverlays[i]);
      seq.push(this.comicRightOverlays[i]);
    }
    seq.forEach((ovr, idx) => {
      this.time.delayedCall(REVEAL_START + idx * REVEAL_GAP, () => {
        this.tweens.add({ targets: ovr, alpha: 0, duration: REVEAL_DUR, ease: 'Cubic.easeOut' });
      });
    });

    // 全部揭完後欣賞 5 秒 → 淡出 → 下一章
    const total = REVEAL_START + seq.length * REVEAL_GAP + 5000;
    this.time.delayedCall(total, () => {
      this.tweens.add({
        targets: [this.comicLeft, this.comicRight, this.comicChapterText,
                  ...this.comicLeftOverlays, ...this.comicRightOverlays],
        alpha: 0, duration: 1500,
        onComplete: () => {
          this.comicIndex = (this.comicIndex + 1) % this.comicChapters.length;
          this.playComicSequence();
        },
      });
    });
  }

  // ----------------------------------------------------------
  // 右上角音量控制 UI（BGM / SFX 各一條 slider）
  // ----------------------------------------------------------
  buildVolumePanel() {
    // 放在 jackpot panel 與 reel_frame 之間（不擋 MINOR 與設定按鈕）
    const baseX = 1580;
    const baseY = 88;
    const panelW = 280;
    const panelH = 64;
    // 底板
    this.add.rectangle(baseX + panelW/2, baseY + panelH/2, panelW, panelH, 0x0a0604, 0.78)
      .setStrokeStyle(2, 0xd4a54a).setDepth(950);
    const labelStyle = (size, color) => ({
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: `${size}px`,
      color, stroke: '#2a0908', strokeThickness: 2, resolution: 2,
    });

    // 靜音切換按鈕：圓形底 + 喇叭/靜音圖標（用 Graphics 自繪確保跨平台一致）
    const drawIcon = (g, muted) => {
      g.clear();
      // 圓底
      g.fillStyle(muted ? 0x551a18 : 0x2e5d55, 1);
      g.fillCircle(0, 0, 11);
      g.lineStyle(2, 0xd4a54a, 1);
      g.strokeCircle(0, 0, 11);
      // 喇叭主體
      g.fillStyle(0xf5d27a, 1);
      g.fillTriangle(-5, -4, -5, 4, -1, 4);
      g.fillRect(-5, -2, 3, 4);
      g.fillTriangle(-1, -6, -1, 6, 4, 4);
      g.fillTriangle(-1, -6, 4, -4, 4, 4);
      // 靜音時打個叉
      if (muted) {
        g.lineStyle(2, 0xff5050, 1);
        g.lineBetween(-7, -7, 7, 7);
        g.lineBetween(7, -7, -7, 7);
      }
    };

    const makeMuteBtn = (x, y, initMuted, onToggle) => {
      const g = this.add.graphics({ x, y }).setDepth(953);
      drawIcon(g, initMuted);
      // 命中區
      const hit = this.add.circle(x, y, 14, 0xffffff, 0)
        .setDepth(954).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        const m = onToggle();
        drawIcon(g, m);
      });
      return { setMuted: (m) => drawIcon(g, m) };
    };

    // 兩條 slider：BGM、SFX
    const makeSlider = (yOffset, label, initVol, initMuted, onChange, onMute) => {
      const y = baseY + yOffset;
      // 靜音按鈕在左
      const muteBtn = makeMuteBtn(baseX + 18, y, initMuted, onMute);
      // 標籤
      this.add.text(baseX + 38, y, label, labelStyle(13, '#ffe55f')).setOrigin(0, 0.5).setDepth(951);
      const trackX = baseX + 92;
      const trackW = 150;
      const track = this.add.rectangle(trackX, y, trackW, 6, 0x3a2418, 1).setOrigin(0, 0.5).setDepth(951)
        .setInteractive({ useHandCursor: true });
      const fill = this.add.rectangle(trackX, y, trackW * initVol, 6, 0xf5d27a, 1).setOrigin(0, 0.5).setDepth(952);
      const knob = this.add.circle(trackX + trackW * initVol, y, 8, 0xfff8d0).setDepth(953)
        .setStrokeStyle(2, 0x7f1f1b).setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(knob);

      const setVal = (v) => {
        v = Phaser.Math.Clamp(v, 0, 1);
        knob.x = trackX + trackW * v;
        fill.width = trackW * v;
        onChange(v);
      };
      knob.on('drag', (_, dx) => setVal((dx - trackX) / trackW));
      track.on('pointerdown', (p) => setVal((p.x - trackX) / trackW));

      return { setVal, setMuted: muteBtn.setMuted };
    };

    this.bgmSlider = makeSlider(17, 'BGM', this.sound2.bgmVol, this.sound2.bgmMuted,
      v => this.sound2.setBgmVolume(v),
      () => { this.sound2.toggleBgmMute(); return this.sound2.bgmMuted; });
    this.sfxSlider = makeSlider(43, 'SFX', this.sound2.sfxVol, this.sound2.sfxMuted,
      v => this.sound2.setSfxVolume(v),
      () => { this.sound2.toggleSfxMute(); return this.sound2.sfxMuted; });
  }

  // 把圖片以保持比例方式對齊到目標高度
  fitImageHeight(img, targetH) {
    const ratio = img.width / img.height;
    img.setDisplaySize(targetH * ratio, targetH);
  }

  // ----------------------------------------------------------
  // HUD
  // ----------------------------------------------------------
  refreshHUD() {
    this.txtBalance.setText(this.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    this.txtBet.setText(this.bet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    if (this.lastWin > 0) {
      this.txtWin.setText(`本局贏分　${this.lastWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      this.infoText.setAlpha(0);
    } else {
      this.txtWin.setText('');
      this.infoText.setAlpha(1);
    }
    if (this.inFreeGame) {
      this.txtFG.setText(`免費遊戲 ${this.freeSpinsLeft}　累計 ${this.fgTotalWin.toFixed(2)}`);
    } else {
      this.txtFG.setText('');
    }
  }

  changeBet(dir) {
    if (this.spinning || this.inFreeGame) return;
    const i = BET_STEPS.indexOf(this.bet);
    const ni = Phaser.Math.Clamp(i + dir, 0, BET_STEPS.length - 1);
    this.bet = BET_STEPS[ni];
    this.refreshHUD();
  }
  setBet(v) {
    if (this.spinning || this.inFreeGame) return;
    this.bet = v;
    this.refreshHUD();
  }
  toggleAuto() {
    if (this.spinning && !this.autoMode) return;
    this.autoMode = !this.autoMode;
    // 自動按鈕視覺反饋
    if (this.btnAutoHud) {
      this.btnAutoHud.setTint(this.autoMode ? 0xffe55f : 0xffffff);
    }
    if (this.txtAutoLabel) {
      this.txtAutoLabel.setText(this.autoMode ? '自動中' : '自動');
    }
    if (this.autoMode && !this.spinning) this.onSpin();
  }

  // ----------------------------------------------------------
  // 盤面
  // ----------------------------------------------------------
  populateInitial() {
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++)
        this.placeSymbol(c, r, pickSymbol(false), false);
  }

  placeSymbol(c, r, key, animateDrop) {
    const x = cellX(c);
    const y = cellY(r);
    const startY = animateDrop ? y - REEL_H - CELL_H * r : y;
    const sp = this.add.image(x, startY, key);
    sp.setDisplaySize(SYM_SIZE, SYM_SIZE);
    sp.symKey = key;
    sp.col = c;
    sp.row = r;
    this.gridContainer.add(sp);
    this.grid[c][r] = sp;
    if (animateDrop) {
      this.tweens.add({
        targets: sp, y, duration: 280 + r * 25,
        ease: 'Cubic.easeOut',
      });
    }
    return sp;
  }

  // ----------------------------------------------------------
  // 旋轉 / Tumble
  // ----------------------------------------------------------
  async onSpin() {
    if (this.spinning) return;
    if (!this.inFreeGame) {
      if (this.balance < this.bet) return;
      this.balance -= this.bet;
      this.lastWin = 0;
    } else {
      this.lastWin = 0;
    }
    this.sound2?.playSfx('spin');
    this.spinning = true;
    this.btnSpin.setAlpha(0.7);
    this.btnSpinIdleTween?.pause();
    // 啟動旋轉
    this.spinRotateTween = this.tweens.add({
      targets: this.btnSpin, angle: '+=360',
      duration: 700, repeat: -1, ease: 'Linear',
    });
    this.refreshHUD();

    await this.spinAnimation();
    await this.runTumbleCycle();

    // 停止旋轉、回到原角度
    this.spinRotateTween?.stop();
    this.spinRotateTween = null;
    this.tweens.add({ targets: this.btnSpin, angle: 0, duration: 280, ease: 'Back.easeOut' });

    const scatterCount = this.countScatters();
    if (scatterCount >= 2) this.sound2?.playSfx('scatter_in');
    if (!this.inFreeGame && scatterCount >= FREE_SPIN_TRIGGER) {
      this.sound2?.playSfx('scatter_win');
      await this.enterFreeGame();
    } else if (this.inFreeGame && scatterCount >= 3) {
      this.sound2?.playSfx('scatter_win');
      this.freeSpinsLeft += 5;
      this.flashText('+5 次免費遊戲');
    }

    if (this.inFreeGame) {
      this.freeSpinsLeft--;
      this.fgTotalWin += this.lastWin;
      if (this.freeSpinsLeft <= 0) {
        await this.exitFreeGame();
      }
    }

    this.spinning = false;
    this.btnSpin.setAlpha(1);
    this.btnSpinIdleTween?.resume();
    this.refreshHUD();

    if (this.inFreeGame && this.freeSpinsLeft > 0) {
      this.time.delayedCall(700, () => this.onSpin());
    } else if (this.autoMode) {
      this.time.delayedCall(500, () => this.onSpin());
    }
  }

  spinAnimation() {
    return new Promise(resolve => {
      const old = [];
      for (let c = 0; c < COLS; c++)
        for (let r = 0; r < ROWS; r++)
          if (this.grid[c][r]) { old.push(this.grid[c][r]); this.grid[c][r] = null; }
      if (old.length) {
        this.tweens.add({
          targets: old, y: REEL_CY + REEL_H, alpha: 0, duration: 220, ease: 'Cubic.easeIn',
          onComplete: () => old.forEach(s => s.destroy()),
        });
      }
      // 清掉舊倍數球
      this.multOrbs.forEach(o => o.container.destroy());
      this.multOrbs = [];

      this.time.delayedCall(260, () => {
        for (let c = 0; c < COLS; c++)
          for (let r = 0; r < ROWS; r++)
            this.placeSymbol(c, r, pickSymbol(true), true);
        this.time.delayedCall(700, resolve);
      });
    });
  }

  async runTumbleCycle() {
    let totalWin = 0;
    let cycle = 0;
    while (true) {
      const wins = this.findWins();
      if (wins.length === 0) break;
      cycle++;
      const cycleWin = wins.reduce((a, w) => a + w.payout, 0);
      totalWin += cycleWin;
      this.sound2?.playSfx('symbol_frame', { volume: 0.8 });
      this.sound2?.playSfx(cycle === 1 ? 'score' : 'score_plus');
      this.flashWinSymbols(wins);
      await this.delay(550);
      await this.removeWinSymbols(wins);
      this.maybeDropMultiplier();
      await this.delay(120);
      this.sound2?.playSfx(cycle % 2 === 0 ? 'tumble_a' : 'tumble_b', { volume: 0.7 });
      await this.cascadeFill();
      await this.delay(180);
    }

    let multTotal = 0;
    this.multOrbs.forEach(o => multTotal += o.value);

    let finalWin = totalWin * this.bet / 20;
    if (multTotal > 0 && finalWin > 0) {
      this.sound2?.playSfx('mult_total');
      this.flashText(`倍數 x${multTotal}`);
      finalWin *= multTotal;
      await this.delay(900);
    }

    finalWin = Math.round(finalWin * 100) / 100;
    this.balance = Math.round((this.balance + finalWin) * 100) / 100;
    this.lastWin = finalWin;
    this.refreshHUD();

    if (finalWin >= this.bet * 20) this.bigWin(finalWin);
  }

  findWins() {
    const groups = {};
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) {
        const s = this.grid[c][r];
        if (!s || s.symKey === 'scatter') continue;
        (groups[s.symKey] = groups[s.symKey] || []).push(s);
      }
    const wins = [];
    for (const k in groups) {
      const arr = groups[k];
      if (arr.length < 8) continue;
      const def = SYMBOLS.find(s => s.key === k);
      if (!def) continue;
      const payIdx = arr.length >= 12 ? 2 : arr.length >= 10 ? 1 : 0;
      const payout = def.pay[payIdx] * arr.length / 8;
      wins.push({ key: k, sprites: arr, count: arr.length, payout });
    }
    return wins;
  }

  countScatters() {
    let n = 0;
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++)
        if (this.grid[c][r] && this.grid[c][r].symKey === 'scatter') n++;
    return n;
  }

  flashWinSymbols(wins) {
    // 清掉上一輪殘留中獎框
    if (this._winFrames) this._winFrames.forEach(f => f.destroy());
    this._winFrames = [];

    wins.forEach(w => w.sprites.forEach(s => {
      // 1) 符號本身脈動放大
      this.tweens.add({
        targets: s, scale: { from: s.scale, to: s.scale * 1.20 },
        yoyo: true, repeat: 2, duration: 140,
      });

      // 2) 金色發光圓框
      const size = SYM_SIZE * 1.05;
      const frame = this.add.graphics().setDepth(150);
      const drawFrame = (alpha, lineWidth, glow) => {
        frame.clear();
        // 外發光（半透明大圈）
        frame.lineStyle(lineWidth + glow, 0xf5d27a, alpha * 0.35);
        frame.strokeRoundedRect(-size/2 - glow/2, -size/2 - glow/2, size + glow, size + glow, 12);
        // 主框
        frame.lineStyle(lineWidth, 0xffe55f, alpha);
        frame.strokeRoundedRect(-size/2, -size/2, size, size, 10);
      };
      frame.setPosition(s.x, s.y);
      drawFrame(1, 4, 10);
      this.gridContainer.add(frame);
      this._winFrames.push(frame);

      // 框脈動：alpha + glow 大小
      let t = 0;
      this.tweens.addCounter({
        from: 0, to: 1, duration: 600, yoyo: true, repeat: -1,
        onUpdate: (tw, target) => {
          const v = target.value;
          drawFrame(0.55 + v * 0.45, 4, 8 + v * 14);
        },
      });

      // 3) 四角金色光點（快閃）
      const corners = [
        [-size/2, -size/2], [size/2, -size/2],
        [-size/2,  size/2], [size/2,  size/2],
      ];
      corners.forEach(([cx, cy]) => {
        const dot = this.add.circle(s.x + cx, s.y + cy, 5, 0xfff8d0, 1)
          .setDepth(151);
        this.gridContainer.add(dot);
        this._winFrames.push(dot);
        this.tweens.add({
          targets: dot, scale: { from: 0.5, to: 1.8 }, alpha: { from: 1, to: 0 },
          duration: 600, yoyo: false, repeat: -1, ease: 'Cubic.easeOut',
        });
      });
    }));
  }

  removeWinSymbols(wins) {
    return new Promise(resolve => {
      const all = [];
      wins.forEach(w => w.sprites.forEach(s => all.push(s)));
      if (!all.length) return resolve();
      // 框框一起淡出消失
      const frames = this._winFrames || [];
      this.tweens.add({
        targets: frames, alpha: 0, duration: 200,
        onComplete: () => { frames.forEach(f => f.destroy()); this._winFrames = []; },
      });
      this.tweens.add({
        targets: all, alpha: 0, scale: 0.1,
        duration: 240, ease: 'Cubic.easeIn',
        onComplete: () => {
          all.forEach(s => { this.grid[s.col][s.row] = null; s.destroy(); });
          resolve();
        },
      });
    });
  }

  cascadeFill() {
    return new Promise(resolve => {
      const tweens = [];
      for (let c = 0; c < COLS; c++) {
        let write = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (this.grid[c][r]) {
            if (write !== r) {
              const s = this.grid[c][r];
              s.row = write;
              this.grid[c][write] = s;
              this.grid[c][r] = null;
              tweens.push({ s, toY: cellY(write) });
            }
            write--;
          }
        }
        for (let nr = write; nr >= 0; nr--) {
          const sp = this.placeSymbol(c, nr, pickSymbol(true), false);
          sp.y = cellY(0) - CELL_H * (write - nr + 1);
          tweens.push({ s: sp, toY: cellY(nr) });
        }
      }
      if (!tweens.length) return resolve();
      let done = 0;
      tweens.forEach(t => {
        this.tweens.add({
          targets: t.s, y: t.toY, duration: 280, ease: 'Cubic.easeOut',
          onComplete: () => { done++; if (done === tweens.length) resolve(); }
        });
      });
    });
  }

  // ----------------------------------------------------------
  // 倍數球（不在 grid，而是覆蓋在格子上的特效）
  // ----------------------------------------------------------
  maybeDropMultiplier() {
    const chance = this.inFreeGame ? 0.18 : 0.09;
    if (Math.random() > chance) return;
    this.sound2?.playSfx('mult_land');
    const c = Phaser.Math.Between(0, COLS - 1);
    const r = Phaser.Math.Between(0, ROWS - 1);
    const value = pickMultiplier();
    const x = cellX(c);
    const y = cellY(r);

    const cont = this.add.container(x, y - 200).setDepth(105);
    const ball = this.add.image(0, 0, 'mult_orb').setDisplaySize(SYM_SIZE * 1.05, SYM_SIZE * 1.05);
    const ring = this.add.circle(0, 0, SYM_SIZE * 0.55, 0xd4a54a, 0).setStrokeStyle(4, 0xf5d27a);
    const txt = this.add.text(0, 0, `x${value}`, {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: '38px', fontStyle: '900',
      color: '#fff8d0', stroke: '#7f1f1b', strokeThickness: 6, resolution: 2,
    }).setOrigin(0.5);
    cont.add([ball, ring, txt]);
    cont.setAlpha(0);
    this.tweens.add({ targets: cont, y, alpha: 1, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({ targets: ring, alpha: 0.9, scale: 1.15, yoyo: true, repeat: -1, duration: 700 });

    this.multOrbs.push({ container: cont, value, col: c, row: r });
  }

  // ----------------------------------------------------------
  // Free Game
  // ----------------------------------------------------------
  async enterFreeGame() {
    this.inFreeGame = true;
    this.freeSpinsLeft = FREE_SPINS_INITIAL;
    this.fgTotalWin = 0;
    this.sound2?.playSfx('trans');
    this.sound2?.playSfx('fg_in');

    // 隱藏漫畫面板（FreeGame 期間用虞姬畫面）
    this.tweens.add({
      targets: [this.comicLeft, this.comicRight, this.comicChapterText, ...this.comicLeftOverlays, ...this.comicRightOverlays],
      alpha: 0, duration: 400,
    });

    // ===== 過場：暗幕 =====
    const dim = this.add.rectangle(960, 540, W, H, 0x000000, 0).setDepth(900);
    this.tweens.add({ targets: dim, alpha: 0.78, duration: 500 });

    // 鳳凰光環從中央放大（過場期間在暗幕上方，但人物會在更上層 920）
    this.fgPhoenix.setVisible(true).setAlpha(0).setScale(0.6).setPosition(960, 540).setDepth(905);
    this.tweens.add({
      targets: this.fgPhoenix, alpha: 0.85, scale: 1.0,
      duration: 900, ease: 'Cubic.easeOut',
    });
    // 鳳凰光環持續呼吸（後面切換用）
    this.fgPhoenixTween = this.tweens.add({
      targets: this.fgPhoenix, scale: 1.06,
      yoyo: true, repeat: -1, duration: 1800, delay: 900,
    });

    // 虞姬中央現身（一顆大尺寸，使用 yujiLeft 暫時當作 hero pose）
    const heroYuji = this.add.image(960, 1080, 'yuji_idle')
      .setOrigin(0.5, 1).setDepth(920).setAlpha(0);
    this.fitImageHeight(heroYuji, 1100);
    this.tweens.add({
      targets: heroYuji, alpha: 1, y: 1060,
      duration: 700, ease: 'Cubic.easeOut',
    });
    // 細微浮動
    this.tweens.add({
      targets: heroYuji, y: 1050,
      yoyo: true, repeat: -1, duration: 2200, ease: 'Sine.easeInOut',
    });

    // 鳳鳴九霄 logo 從上方飛入
    this.fengmingLogo.setVisible(true).setAlpha(0).setScale(0.3)
      .setPosition(960, 200).setDepth(925);
    this.tweens.add({
      targets: this.fengmingLogo, alpha: 1, scale: 1, y: 280,
      duration: 700, delay: 400, ease: 'Back.easeOut',
    });

    // 15 次免費公告
    await this.delay(1100);
    const announce = this.add.text(960, 720, `${FREE_SPINS_INITIAL} 次免費遊戲`, {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: '88px', fontStyle: '900',
      color: '#fff8d0', stroke: '#7f1f1b', strokeThickness: 12, resolution: 2,
    }).setOrigin(0.5).setDepth(930).setAlpha(0).setScale(0.5);
    this.tweens.add({
      targets: announce, alpha: 1, scale: 1,
      duration: 500, ease: 'Back.easeOut',
    });

    // 停留欣賞
    await this.delay(1800);

    // ===== 退場：虞姬「分身」飛到兩側 =====
    // 公告與 logo 退場
    this.tweens.add({ targets: [announce, this.fengmingLogo], alpha: 0, duration: 500,
      onComplete: () => { announce.destroy(); this.fengmingLogo.setVisible(false); } });

    // 場上兩側虞姬出現在 chu/han 位置，從中央 hero 飛過去
    this.yujiLeft.setPosition(960, 1311).setAlpha(0).setVisible(true).setDepth(11);
    this.yujiRight.setPosition(960, 1360).setAlpha(0).setVisible(true).setDepth(21);
    this.fitImageHeight(this.yujiLeft, 1240);
    this.fitImageHeight(this.yujiRight, 1240);
    this.yujiRight.flipX = true;
    this.tweens.add({
      targets: this.yujiLeft, x: 238, alpha: 1,
      duration: 800, ease: 'Cubic.easeInOut',
    });
    this.tweens.add({
      targets: this.yujiRight, x: 1690, alpha: 1,
      duration: 800, ease: 'Cubic.easeInOut',
    });
    // 中央 hero 與項羽劉邦淡出
    this.tweens.add({
      targets: heroYuji, alpha: 0, scale: 0.9,
      duration: 600, onComplete: () => heroYuji.destroy(),
    });
    this.tweens.add({ targets: [this.chuChar, this.hanChar], alpha: 0, duration: 500 });

    // 鳳凰光環縮回背景，並把 depth 降到人物下方（不蓋虞姬）
    this.fgPhoenix.setDepth(2);
    this.tweens.add({
      targets: this.fgPhoenix, alpha: 0.45, scale: 1.3,
      duration: 800, ease: 'Cubic.easeOut',
    });

    // 暗幕退場、背景換色
    this.tweens.add({
      targets: dim, alpha: 0, duration: 700,
      onComplete: () => dim.destroy(),
    });
    this.bg.setTint(0x553a78);

    await this.delay(900);
  }

  async exitFreeGame() {
    this.sound2?.playSfx('fg_out');
    this.flashText(`免費遊戲結束　共贏 ${this.fgTotalWin.toFixed(2)}`);
    this.bg.clearTint();

    // 鳳凰光環停止 & 虞姬退場
    this.fgPhoenixTween?.stop();
    this.fgPhoenixTween = null;
    this.tweens.add({
      targets: [this.yujiLeft, this.yujiRight, this.fgPhoenix, this.fengmingLogo],
      alpha: 0, duration: 600,
      onComplete: () => {
        this.yujiLeft.setVisible(false);
        this.yujiRight.setVisible(false);
        this.fgPhoenix.setVisible(false);
        this.fengmingLogo.setVisible(false).setY(380).setScale(1);
      },
    });
    // 項羽劉邦不回來（已永久隱藏，改用漫畫敘事）
    // 漫畫面板淡入（exit 後 inFreeGame 為 false，下次 playComicSequence 會自動恢復）
    this.inFreeGame = false;
    await this.delay(1500);
  }

  // ----------------------------------------------------------
  // 飄字 / Big Win
  // ----------------------------------------------------------
  flashText(msg) {
    const t = this.add.text(960, 540, msg, {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: '72px', fontStyle: '900',
      color: '#f5d27a', stroke: '#3a0e0a', strokeThickness: 10, resolution: 2,
    }).setOrigin(0.5).setDepth(1000).setAlpha(0).setScale(0.5);
    this.tweens.add({
      targets: t, alpha: 1, scale: 1, duration: 380, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({
        targets: t, alpha: 0, duration: 600, delay: 900,
        onComplete: () => t.destroy(),
      }),
    });
  }

  bigWin(amount) {
    // 依贏分倍數決定 vocal
    const ratio = amount / this.bet;
    if      (ratio >= 1000) this.sound2?.playSfx('legend_vocal');
    else if (ratio >= 500)  this.sound2?.playSfx('ultra_vocal');
    else if (ratio >= 200)  this.sound2?.playSfx('mega_vocal');
    else if (ratio >= 100)  this.sound2?.playSfx('super_vocal');
    else                    this.sound2?.playSfx('big_vocal');
    this.sound2?.playSfx('fireworks', { volume: 0.6 });

    const cont = this.add.container(960, 540).setDepth(2000);
    const bg = this.add.image(0, 0, 'win_bg').setDisplaySize(1400, 800).setAlpha(0);
    const coin = this.add.image(0, -120, 'win_coin').setScale(0.6);
    const txt = this.add.text(0, 100, `大　獎\n${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: '88px', fontStyle: '900',
      color: '#fff8d0', stroke: '#7f1f1b', strokeThickness: 12, align: 'center', resolution: 2,
    }).setOrigin(0.5);
    cont.add([bg, coin, txt]);
    this.tweens.add({ targets: bg, alpha: 0.95, duration: 400 });
    this.tweens.add({ targets: coin, angle: 360, duration: 1400 });
    this.time.delayedCall(2400, () => {
      this.tweens.add({ targets: cont, alpha: 0, duration: 500, onComplete: () => cont.destroy() });
    });
  }

  delay(ms) { return new Promise(r => this.time.delayedCall(ms, r)); }
}

// ============================================================
// 啟動（處理 vite HMR：先銷毀舊 game 實例避免堆疊）
// ============================================================
if (window.__game) {
  try { window.__game.destroy(true); } catch (e) {}
  window.__game = null;
}
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0a0604',
  // 高品質渲染：抗鋸齒 + 線性過濾 + 高 DPI
  antialias: true,
  antialiasGL: true,
  roundPixels: false,
  pixelArt: false,
  resolution: window.devicePixelRatio || 1,
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false,
    mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
    powerPreference: 'high-performance',
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloadScene, MainScene],
});
window.__game = game;
