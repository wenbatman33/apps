// 楚漢相爭 · 倍數連消老虎機（戰神賽特 / Gates of Olympus 機制）
// 依 mockup_pc_design / mockup_mobile_v2 設計稿 — PC 橫 + Mobile 直版自適應
import Phaser from 'phaser';

// ============================================================
// 自適應 Layout：依照啟動時視窗比例決定使用 PC 或 Mobile
// ============================================================
const COLS = 6;
const ROWS = 5;

// ---- PC 橫向 1920x1080 ----
const LAYOUT_PC = {
  mode: 'pc',
  W: 1920, H: 1080,
  // Reel（位於頁面中央，當作 1 個大漫畫格）
  reelCx: 960, reelCy: 572, reelW: 870, reelH: 580,
  // 12 個劇情漫畫格的位置（圍繞 reel 排列，由淺到深陸續解鎖）
  // 順序：左楚 4 格（上→下）→ 右漢 4 格（上→下）→ 中央上方 2 格 → 中央下方 2 格
  storyPanels: [
    // 左側 4 格（楚）
    { cx: 145, cy: 200, w: 220, h: 180, src: 'page_ch1_chu', label: '一楚' },
    { cx: 145, cy: 410, w: 220, h: 180, src: 'page_ch2_chu', label: '二楚' },
    { cx: 145, cy: 620, w: 220, h: 180, src: 'page_ch3_chu', label: '三楚' },
    { cx: 145, cy: 830, w: 220, h: 180, src: 'page_ch4_chu', label: '四楚' },
    // 右側 4 格（漢）
    { cx: 1775, cy: 200, w: 220, h: 180, src: 'page_ch1_han', label: '一漢' },
    { cx: 1775, cy: 410, w: 220, h: 180, src: 'page_ch2_han', label: '二漢' },
    { cx: 1775, cy: 620, w: 220, h: 180, src: 'page_ch3_han', label: '三漢' },
    { cx: 1775, cy: 830, w: 220, h: 180, src: 'page_ch4_han', label: '四漢' },
    // 中央上下 4 個窄格（標誌物特寫，用既有單格漫畫）
    { cx: 530, cy: 195, w: 280, h: 130, src: 'comic_ch1_chu_p1', label: '楚旗' },
    { cx: 850, cy: 195, w: 280, h: 130, src: 'comic_ch1_han_p1', label: '漢旗' },
    { cx: 1070, cy: 195, w: 280, h: 130, src: 'comic_ch2_chu_p1', label: '謀略' },
    { cx: 1390, cy: 195, w: 280, h: 130, src: 'comic_ch4_han_p2', label: '一統' },
  ],
  // 頂部
  jackpotY: 42, jackpotH: 64,
  logoX: 960, logoY: 165, logoW: 360, logoH: 100,
  topBannerY: 210, topBannerW: 720, topBannerH: 60,
  // 左右側欄漫畫頁（取代立繪）
  comicLeftX: 230, comicRightX: 1690, comicY: 540, comicSize: 420,
  chapterTextY: 215,
  // Free Game 元件（左漫畫上方）
  fgCountX: 230, fgCountY: 200, fgCountW: 180, fgCountH: 200,
  // 累計倍數圓徽（右漫畫上方）
  multBadgeX: 1690, multBadgeY: 200, multBadgeR: 80,
  // HUD 底部
  hudY: 1018, hudPanelW: 1810, hudPanelH: 129,
  avatarX: 116, avatarY: 1008,
  coinX: 468, balX: 625, betDispX: 1060,
  betMinusX: 900, betPlusX: 1220,
  autoBtnX: 1350, autoBtnY: 1018,
  // 中央 SPIN（PC 在右下）
  spinBtnX: 1670, spinBtnY: 940, spinBtnSize: 140,
  // Side buttons（PC 改成底部長按鈕，不用右側圓鈕了）
  sideBtnX: null,
  sideBtnYs: [],
  settingsBtnX: 1880, settingsBtnY: 44,
  // 8 個底部長方形按鈕（左 4 顆 + 右 4 顆，置中是 SPIN）
  bottomButtons: [
    // 左側 4 顆
    { key: 'v3_btn_buy_feature', label: '購買特色', x: 130, y: 1020, w: 180, h: 56, action: 'buy' },
    { key: 'v3_btn_menu',        label: '菜單',     x: 330, y: 1020, w: 140, h: 56, action: 'menu' },
    { key: 'v3_btn_event',       label: '活動',     x: 490, y: 1020, w: 140, h: 56, action: 'event' },
    { key: 'v3_btn_fast',        label: '快速',     x: 650, y: 1020, w: 140, h: 56, action: 'fast' },
    // 右側 4 顆
    { key: 'v3_btn_auto',        label: '自動',     x: 1130, y: 1020, w: 140, h: 56, action: 'auto' },
    { key: 'v3_btn_select',      label: '選單',     x: 1290, y: 1020, w: 140, h: 56, action: 'select' },
    { key: 'v3_btn_bet_pm',      label: '60',       x: 1480, y: 1020, w: 200, h: 56, action: 'bet_pm' },
    { key: 'v3_btn_max_bet',     label: '最大押注', x: 1720, y: 1020, w: 160, h: 56, action: 'max_bet' },
  ],
  // 音量面板
  volPanelX: 1580, volPanelY: 88, volPanelW: 280, volPanelH: 64,
};

// ---- Mobile 直向 540x960 ----
const LAYOUT_MOBILE = {
  mode: 'mobile',
  W: 540, H: 960,
  // Reel（縮小 / 置中）
  reelCx: 270, reelCy: 555, reelW: 504, reelH: 410,
  // 頂部 Jackpot 橫條
  jackpotY: 24, jackpotH: 48,
  // 頂部漫畫敘事（雙格並排在上方）
  comicLeftX: 140, comicRightX: 400, comicY: 175, comicSize: 230,
  chapterTextY: 310,
  // 「最高 N 倍」/ scatter info bar（在 reel 下方）
  logoX: 270, logoY: 335, logoW: 280, logoH: 56,
  topBannerY: 765, topBannerW: 400, topBannerH: 32,
  // Free Game 元件
  fgCountX: 50, fgCountY: 560, fgCountW: 80, fgCountH: 100,
  multBadgeX: 490, multBadgeY: 560, multBadgeR: 45,
  // HUD（scatter info 下方）
  hudY: 832, hudPanelW: 520, hudPanelH: 64,
  avatarX: 36, avatarY: 832,
  coinX: 95, balX: 145,
  betMinusX: 200, betDispX: 270, betPlusX: 340,
  autoBtnX: 480, autoBtnY: 832,
  // SPIN 居中底部
  spinBtnX: 270, spinBtnY: 905, spinBtnSize: 90,
  // Side buttons（手機隱藏）
  sideBtnX: null,
  sideBtnYs: [],
  settingsBtnX: 504, settingsBtnY: 24,
  // 購買特色（SPIN 左側，獨佔一塊）
  buyFeatureX: 90, buyFeatureY: 905, buyFeatureW: 130, buyFeatureH: 36,
  bottomButtons: [],  // mobile 暫時不用底部 8 按鈕
  // 音量面板（settings 下方）
  volPanelX: 270, volPanelY: 80, volPanelW: 380, volPanelH: 44,
};

// 在 boot 時決定（在 Phaser.Game 創建前）
function detectLayout() {
  // 依寬高比決定：< 1.0 視為手機直版
  const aspect = window.innerWidth / window.innerHeight;
  return aspect < 1.0 ? LAYOUT_MOBILE : LAYOUT_PC;
}

const L = detectLayout();
const W = L.W;
const H = L.H;
const REEL_CX = L.reelCx;
const REEL_CY = L.reelCy;
const REEL_W  = L.reelW;
const REEL_H  = L.reelH;
const CELL_W  = REEL_W / COLS;
const CELL_H  = REEL_H / ROWS;
const SYM_SIZE = Math.min(CELL_W, CELL_H) - 6;

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

// 漫畫進度條 helper：算下一格還要幾 spin
function SPINS_REMAIN(within, perPanel) {
  return within % perPanel;
}

// ============================================================
// PreloadScene
// ============================================================
class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    // 限制並行載入，避免大量 PNG 同時下載導致 loader 卡住
    this.load.maxParallelDownloads = 16;  // 加大並行載入加速
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
    this.load.image('reel_frame',        'assets/ui_new/frame_reel_6x5.png');     // ★ 新漫畫風
    this.load.image('reel_separator',    'assets/reel/reel_separator.png');

    // === UI 面板（漫畫風 v2） ===
    this.load.image('top_jackpot_panel', 'assets/ui_new/panel_top_jackpot.png');  // ★
    this.load.image('bottom_hud_panel',  'assets/ui_new/panel_bottom_hud.png');   // ★
    this.load.image('info_bar',          'assets/ui_new/panel_info_strip.png');   // ★
    this.load.image('logo_title',        'assets/logo/chuhan_logo_title.png');
    this.load.image('panel_nickname',    'assets/ui_new/panel_nickname.png');     // 新增
    this.load.image('panel_audio',       'assets/ui_new/panel_audio_strip.png');  // 新增

    // === HUD ===
    this.load.image('avatar_chu',        'assets/ui/hud/player_avatar_chu.png');
    this.load.image('icon_coin',         'assets/ui/hud/icon_coin_stack.png');
    this.load.image('btn_bet_minus',     'assets/ui/hud/btn_bet_minus.png');
    this.load.image('btn_bet_plus',      'assets/ui/hud/btn_bet_plus.png');
    this.load.image('btn_max_bet',       'assets/ui/hud/btn_max_bet.png');

    // === 主按鈕（漫畫風 v2）===
    this.load.image('btn_spin',          'assets/ui_new/btn_spin_chuhan.png');    // ★
    this.load.image('btn_settings',      'assets/ui_new/btn_round_settings.png'); // ★
    this.load.image('btn_event',         'assets/ui_new/btn_round_event.png');    // ★
    this.load.image('btn_fast',          'assets/ui_new/btn_round_fast.png');     // ★
    this.load.image('btn_auto',          'assets/ui_new/btn_round_auto.png');     // ★
    this.load.image('btn_menu',          'assets/ui_new/btn_round_menu.png');     // ★

    // === 符號（10 種，漫畫風 v3）===
    this.load.image('sym_xiang_yu',    'assets/symbols_v3/sym_xiang_yu.png');
    this.load.image('sym_liu_bang',    'assets/symbols_v3/sym_liu_bang.png');
    this.load.image('sym_jade_seal',   'assets/symbols_v3/sym_jade_seal.png');
    this.load.image('sym_halberd',     'assets/symbols_v3/sym_halberd.png');
    this.load.image('sym_tiger',       'assets/symbols_v3/sym_tiger_tally.png');
    this.load.image('gem_red',         'assets/symbols_v3/sym_gem_red.png');
    this.load.image('gem_purple',      'assets/symbols_v3/sym_gem_purple.png');
    this.load.image('gem_yellow',      'assets/symbols_v3/sym_gem_yellow.png');
    this.load.image('gem_green',       'assets/symbols_v3/sym_gem_green.png');
    this.load.image('gem_blue',        'assets/symbols_v3/sym_gem_blue.png');
    this.load.image('scatter',         'assets/symbols/special/sym_scatter_phoenix_hairpin.png');
    this.load.image('mult_orb',        'assets/symbols/special/sym_multiplier_orb.png');

    // === Win ===
    this.load.image('win_bg',          'assets/win/bg/win_bg_award_clean.png');
    this.load.image('win_coin',        'assets/win/ui/win_coin.png');

    // === 新 UI 元素（codex 生）===
    this.load.image('ui_banner_top',      'assets/ui_new/banner_top_capsule.png');
    this.load.image('ui_badge_fg',        'assets/ui_new/badge_free_games.png');
    this.load.image('ui_badge_mult',      'assets/ui_new/badge_mult.png');
    this.load.image('ui_btn_buy_feature', 'assets/ui_new/btn_buy_feature.png');
    this.load.image('ui_logo_plaque',     'assets/ui_new/logo_title_plaque.png');
    this.load.image('ui_banner_big_win',  'assets/ui_new/banner_big_win.png');

    // === v3 漫畫風 UI（依 mockup 設計）===
    this.load.image('page_pc_template',   'assets/ui_v3/page_pc_template.png');
    this.load.image('v3_bar_jackpot',     'assets/ui_v3/bar_jackpot_4seg.png');
    this.load.image('v3_bar_hud',         'assets/ui_v3/bar_hud_bottom.png');
    this.load.image('v3_banner_chapter',  'assets/ui_v3/banner_chapter_title.png');
    this.load.image('v3_btn_menu',        'assets/ui_v3/btn_rect_menu.png');
    this.load.image('v3_btn_event',       'assets/ui_v3/btn_rect_event.png');
    this.load.image('v3_btn_fast',        'assets/ui_v3/btn_rect_fast.png');
    this.load.image('v3_btn_auto',        'assets/ui_v3/btn_rect_auto.png');
    this.load.image('v3_btn_select',      'assets/ui_v3/btn_rect_select.png');
    this.load.image('v3_btn_buy_feature', 'assets/ui_v3/btn_rect_buy_feature.png');
    this.load.image('v3_btn_max_bet',     'assets/ui_v3/btn_rect_max_bet.png');
    this.load.image('v3_btn_bet_pm',      'assets/ui_v3/btn_rect_bet_pm.png');

    // === 楚漢多格漫畫頁（12 格進度系統）===
    for (let ch = 1; ch <= 4; ch++) {
      this.load.image(`page_ch${ch}_chu`, `assets/comics/page_ch${ch}_chu.png`);
      this.load.image(`page_ch${ch}_han`, `assets/comics/page_ch${ch}_han.png`);
    }
    // 中央 4 個小窄格用既有單格漫畫
    [
      ['comic_ch1_chu_p1', 'assets/comics/ch1_chu_p1.png'],
      ['comic_ch1_han_p1', 'assets/comics/ch1_han_p1.png'],
      ['comic_ch2_chu_p1', 'assets/comics/ch2_chu_p1.png'],
      ['comic_ch4_han_p2', 'assets/comics/ch4_han_p2.png'],
    ].forEach(([k, p]) => this.load.image(k, p));

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
  // 防呆：若 load 卡住超過 45 秒才強制進 Main（70 個檔案需要時間）
  init() {
    this._stuckTimer = setTimeout(() => {
      if (this.scene.isActive() && this.load.progress < 1) {
        console.warn('Preload stuck at', this.load.progress, '— forcing Main start');
        this.scene.start('Main');
      }
    }, 45000);
  }
}

// ============================================================
// MainScene
// ============================================================
class MainScene extends Phaser.Scene {
  constructor() { super('Main'); }

  create() {
    // Layout 配置（PC or Mobile，依視窗比例自動套用）
    this.L = L;
    const isMobile = L.mode === 'mobile';

    // 狀態
    this.balance = 10000;
    this.bet = 20;
    this.lastWin = 0;
    this.spinning = false;
    this.freeSpinsLeft = 0;
    this.inFreeGame = false;
    this.fgTotalWin = 0;
    this.autoMode = false;

    // === Depth 0：背景（漫畫稿紙米色 + halftone）===
    this.bg = this.add.rectangle(L.W/2, L.H/2, L.W, L.H, 0xf4ead5, 1).setDepth(0);
    // 加上微弱的網點漸層
    const overlay = this.add.graphics().setDepth(0.5).setAlpha(0.06);
    overlay.fillStyle(0x14110f, 1);
    for (let y = 0; y < L.H; y += 8) {
      for (let x = (y % 16); x < L.W; x += 16) {
        overlay.fillCircle(x, y, 1);
      }
    }
    // 保留 bg_battle 引用以便 freegame 切色（直接 tint rectangle 即可）
    this.bg.setFillStyle = (color) => this.bg.fillColor = color;

    // === 左右立繪（base game 隱藏，Free Game 切換用）===
    this.chuChar = this.add.image(L.W * 0.12, L.H, 'chu_idle').setOrigin(0.5, 1).setDepth(10).setVisible(false);
    this.fitImageHeight(this.chuChar, isMobile ? 600 : 1240);
    this.hanChar = this.add.image(L.W * 0.88, L.H, 'han_idle').setOrigin(0.5, 1).setDepth(20).setVisible(false);
    this.fitImageHeight(this.hanChar, isMobile ? 600 : 1240);

    // === 楚漢漫畫敘事面板 ===
    this.buildComicNarrator();

    // Free game 用的虞姬與鳳凰光環
    this.fgPhoenix = this.add.image(L.W/2, L.H/2, 'phoenix_back')
      .setDisplaySize(L.W * 0.73, L.H).setDepth(2).setAlpha(0).setVisible(false);
    this.yujiLeft = this.add.image(L.W * 0.12, L.H, 'yuji_idle').setOrigin(0.5, 1).setDepth(11).setVisible(false);
    this.fitImageHeight(this.yujiLeft, isMobile ? 600 : 1240);
    this.yujiRight = this.add.image(L.W * 0.88, L.H, 'yuji_idle').setOrigin(0.5, 1).setDepth(21).setVisible(false);
    this.fitImageHeight(this.yujiRight, isMobile ? 600 : 1240);
    this.yujiRight.flipX = true;
    this.fengmingLogo = this.add.image(L.W/2, L.H * 0.35, 'fengming_logo').setDepth(160).setAlpha(0).setVisible(false);

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

    // === Depth 110：reel_frame（新漫畫風包外緣，外加 ~140px 邊框）===
    this.add.image(REEL_CX, REEL_CY, 'reel_frame').setDisplaySize(REEL_W + 130, REEL_H + 130).setDepth(110);

    // === Depth 120：top_jackpot_panel ===
    this.add.image(L.W/2, L.jackpotY, 'top_jackpot_panel').setDisplaySize(L.W, L.jackpotH).setDepth(120);
    const jpFontSize = isMobile ? 14 : 27;
    const jackpotStyle = (color) => ({
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: `${jpFontSize}px`, fontStyle: '900',
      color, stroke: '#2b1334', strokeThickness: 2, resolution: 2,
    });
    // Jackpot 四級分佈（依寬度均分）
    const jpItems = [
      { label: 'GRAND', value: '250,000.00' },
      { label: 'MAJOR', value: '50,000.00'  },
      { label: 'MINOR', value: '2,000.00'   },
      { label: 'MINI',  value: '800.00'     },
    ];
    jpItems.forEach((j, i) => {
      const cx = L.W * (i + 0.5) / jpItems.length;
      const labelOffset = isMobile ? -32 : -50;
      const valueOffset = isMobile ? 32 : 50;
      this.add.text(cx + labelOffset, L.jackpotY, j.label, jackpotStyle('#ffdf55')).setOrigin(0.5).setDepth(121);
      this.add.text(cx + valueOffset, L.jackpotY, j.value, jackpotStyle('#ffffff')).setOrigin(0.5).setDepth(121);
    });

    // === Depth 125：楚漢爭霸 logo 匾額 ===
    const logoSize = isMobile ? 160 : 280;
    this.add.image(L.W/2, isMobile ? 105 : 130, 'ui_logo_plaque')
      .setDisplaySize(logoSize, logoSize * 0.85).setDepth(125);

    // === Depth 130：info_bar（Scatter 提示橫條）===
    this.add.image(L.logoX, L.topBannerY, 'info_bar').setDisplaySize(L.topBannerW, L.topBannerH).setDepth(130);
    this.infoText = this.add.text(L.logoX, L.topBannerY, '4×　鳳釵 SCATTER　贏取免費遊戲', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: isMobile ? '13px' : '24px', fontStyle: '900',
      color: '#ffe894', stroke: '#08352f', strokeThickness: 3, resolution: 2,
    }).setOrigin(0.5).setDepth(131);

    // === Depth 140：bottom_hud_panel ===
    this.add.image(L.W/2, L.hudY, 'bottom_hud_panel').setDisplaySize(L.hudPanelW, L.hudPanelH).setDepth(140);

    // === Depth 145：HUD controls ===
    const HUD_Y = L.hudY;
    const avSize = isMobile ? 40 : 74;
    const coinSize = isMobile ? 36 : 58;
    const betBtnSize = isMobile ? 40 : 58;
    const autoBtnSize = isMobile ? 56 : 72;

    this.add.image(L.avatarX, HUD_Y, 'avatar_chu').setDisplaySize(avSize, avSize).setDepth(145);
    this.add.image(L.coinX,   HUD_Y, 'icon_coin').setDisplaySize(coinSize, coinSize).setDepth(145);

    const btnMinus = this.add.image(L.betMinusX, HUD_Y, 'btn_bet_minus').setDisplaySize(betBtnSize, betBtnSize)
      .setDepth(145).setInteractive({ useHandCursor: true });
    const btnPlus  = this.add.image(L.betPlusX, HUD_Y, 'btn_bet_plus').setDisplaySize(betBtnSize, betBtnSize)
      .setDepth(145).setInteractive({ useHandCursor: true });
    btnMinus.on('pointerup', () => this.changeBet(-1));
    btnPlus.on('pointerup',  () => this.changeBet(+1));

    this.btnAutoHud = this.add.image(L.autoBtnX, L.autoBtnY, 'btn_auto').setDisplaySize(autoBtnSize, autoBtnSize)
      .setDepth(145).setInteractive({ useHandCursor: true });
    this.btnAutoHud.on('pointerup', () => this.toggleAuto());

    // === Depth 146：HUD 文字 ===
    const hudTextStyle = (size, color, opts = {}) => ({
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: `${size}px`, fontStyle: '900',
      color, stroke: opts.stroke ?? '#2a0908', strokeThickness: opts.strokeThickness ?? 3, resolution: 2,
    });
    const fsMain = isMobile ? 16 : 34;
    const fsLabel = isMobile ? 10 : 20;
    const fsName = isMobile ? 11 : 24;
    const fsLV = isMobile ? 12 : 26;
    const offBelow = isMobile ? 18 : 38;
    const offNameAbove = isMobile ? -10 : -20;
    const offLVBelow = isMobile ? 11 : 20;

    // 玩家（avatar 旁；手機版只顯示 LV 縮短佔位）
    if (!isMobile) {
      this.add.text(L.avatarX + 90, HUD_Y + offNameAbove, '玩家 漢王', hudTextStyle(fsName, '#ffffff')).setOrigin(0, 0.5).setDepth(146);
      this.add.text(L.avatarX + 90, HUD_Y + offLVBelow, 'LV. 88', hudTextStyle(fsLV, '#ffdf5a')).setOrigin(0, 0.5).setDepth(146);
    } else {
      // 手機：avatar 下方加 LV 標籤即可
      this.add.text(L.avatarX, HUD_Y + 24, 'LV.88', hudTextStyle(9, '#ffdf5a')).setOrigin(0.5).setDepth(146);
    }

    // 餘額
    this.txtBalance = this.add.text(L.balX, HUD_Y - (isMobile ? 8 : 18), '0.00', hudTextStyle(fsMain, '#ffffff', { strokeThickness: 4 })).setOrigin(0.5).setDepth(146);
    this.add.text(L.balX, HUD_Y + offBelow, '餘額', hudTextStyle(fsLabel, '#d8c399')).setOrigin(0.5).setDepth(146);

    // 押注
    this.txtBet = this.add.text(L.betDispX, HUD_Y - (isMobile ? 8 : 18), '0.00', hudTextStyle(fsMain, '#ffe55f', { strokeThickness: 4 })).setOrigin(0.5).setDepth(146);
    this.add.text(L.betDispX, HUD_Y + offBelow, '總押注', hudTextStyle(fsLabel, '#d8c399')).setOrigin(0.5).setDepth(146);

    // 自動按鈕下方標籤
    this.txtAutoLabel = this.add.text(L.autoBtnX, L.autoBtnY + (isMobile ? 35 : 45), '自動', hudTextStyle(fsLabel, '#ffe55f', { strokeThickness: 3 })).setOrigin(0.5).setDepth(146);

    // 本局贏分（疊在資訊區）
    this.txtWin = this.add.text(L.logoX, L.topBannerY, '', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: isMobile ? '18px' : '36px', fontStyle: '900',
      color: '#fff8d0', stroke: '#7f1f1b', strokeThickness: 6, resolution: 2,
    }).setOrigin(0.5).setDepth(132);

    // Free Game 計數文字（已用左側獨立 fg badge，這裡保留為備用）
    this.txtFG = this.add.text(L.W/2, isMobile ? 320 : 230, '', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: isMobile ? '16px' : '32px', fontStyle: '900',
      color: '#ffe55f', stroke: '#3a0e0a', strokeThickness: 6, resolution: 2,
    }).setOrigin(0.5).setDepth(132);

    // === Depth 150：side buttons (PC only)（手機版隱藏，用設定齒輪即可）===
    if (!isMobile && L.sideBtnYs.length === 4) {
      const sideItems = [
        { key: 'btn_event', label: '活動' },
        { key: 'btn_fast',  label: '快速' },
        { key: 'btn_auto',  label: '自動', cb: () => this.toggleAuto() },
        { key: 'btn_menu',  label: '選單' },
      ];
      sideItems.forEach((b, i) => {
        const y = L.sideBtnYs[i];
        const img = this.add.image(L.sideBtnX, y, b.key).setDisplaySize(76, 76).setDepth(150)
          .setInteractive({ useHandCursor: true });
        this.add.text(L.sideBtnX, y + 43, b.label, hudTextStyle(20, '#ffe55f', { strokeThickness: 3 }))
          .setOrigin(0.5).setDepth(156);
        if (b.cb) img.on('pointerup', b.cb);
      });
    }
    this.add.image(L.settingsBtnX, L.settingsBtnY, 'btn_settings').setDisplaySize(isMobile ? 36 : 58, isMobile ? 36 : 58).setDepth(150)
      .setInteractive({ useHandCursor: true });

    // === Depth 155：btn_spin ===
    this.btnSpin = this.add.image(L.spinBtnX, L.spinBtnY, 'btn_spin').setDisplaySize(L.spinBtnSize, L.spinBtnSize).setDepth(155)
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

    // 開發期間先不自動播 BGM（QA 完成後再開）
    // const tryPlay = () => this.sound2.playBgm();
    // tryPlay();
    // this.input.once('pointerdown', tryPlay);
    // window.addEventListener('keydown', tryPlay, { once: true });

    // 右上音量控制 UI
    this.buildVolumePanel();

    // Free Game HUD（最高倍 banner + FG 計數 + 累計倍數圓徽）
    this.buildFreeGameHUD();

    // 購買特色按鈕
    this.buildBuyFeatureButton();

    // 底部長按鈕列（PC 版漫畫風）
    this.buildBottomButtons();
  }

  // ----------------------------------------------------------
  // Free Game HUD：base game 隱藏，進 free game 後顯示
  // ----------------------------------------------------------
  buildFreeGameHUD() {
    const L = this.L;
    const isMobile = L.mode === 'mobile';

    // 1) 最高倍 banner（PC 在頂部 Logo 下方，Mobile 在 reel 下方靠 scatter info 位置）
    const bannerW = isMobile ? 360 : 720;
    const bannerH = isMobile ? 56  : 100;
    const bannerX = isMobile ? L.W / 2 : L.W / 2;
    const bannerY = isMobile ? 270    : 270;
    this.fgMaxCap = this.add.image(bannerX, bannerY, 'ui_banner_top')
      .setDisplaySize(bannerW, bannerH).setDepth(133).setVisible(false);
    this.fgMaxCapText = this.add.text(bannerX, bannerY, '最高　51000　倍', {
      fontFamily: 'Noto Serif TC, serif', fontSize: isMobile ? '20px' : '36px', fontStyle: '900',
      color: '#ffe55f', stroke: '#3a0e0a', strokeThickness: 4, resolution: 2, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(134).setVisible(false);

    // 2) FREE GAMES 計數徽章（PC 在左漫畫上方，Mobile 在左下角）
    const fgW = isMobile ? 88  : 160;
    const fgH = isMobile ? 110 : 200;
    const fgX = isMobile ? 55  : L.fgCountX;
    const fgY = isMobile ? 600 : L.fgCountY;
    this.fgCountBg = this.add.image(fgX, fgY, 'ui_badge_fg')
      .setDisplaySize(fgW, fgH).setDepth(133).setVisible(false);
    this.fgCountNum = this.add.text(fgX, fgY - (isMobile ? 10 : 20), '15', {
      fontFamily: 'Noto Serif TC, serif', fontSize: isMobile ? '32px' : '64px', fontStyle: '900',
      color: '#fff8d0', stroke: '#7f1f1b', strokeThickness: 5, resolution: 2,
    }).setOrigin(0.5).setDepth(134).setVisible(false);
    this.fgCountLabel = this.add.text(fgX, fgY + (isMobile ? 22 : 50), 'FREE\nGAMES', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: isMobile ? '10px' : '16px', fontStyle: '900',
      color: '#ffe55f', stroke: '#3a0e0a', strokeThickness: 2, resolution: 2,
      align: 'center',
    }).setOrigin(0.5).setDepth(134).setVisible(false);

    // 3) 累計倍數圓徽（PC 在右漫畫上方，Mobile 在右下角）
    const multSize = isMobile ? 100 : 180;
    const multX = isMobile ? 485 : L.multBadgeX;
    const multY = isMobile ? 600 : L.multBadgeY;
    this.fgMultBg = this.add.image(multX, multY, 'ui_badge_mult')
      .setDisplaySize(multSize, multSize).setDepth(133).setVisible(false);
    this.fgMultText = this.add.text(multX, multY - (isMobile ? 4 : 8), 'x1', {
      fontFamily: 'Noto Serif TC, serif', fontSize: isMobile ? '32px' : '60px', fontStyle: '900',
      color: '#fff8d0', stroke: '#7f1f1b', strokeThickness: 5, resolution: 2,
    }).setOrigin(0.5).setDepth(134).setVisible(false);
    this.fgMultLabel = this.add.text(multX, multY + (isMobile ? 28 : 60), '累計倍數', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: isMobile ? '10px' : '14px', fontStyle: '900',
      color: '#ffe55f', stroke: '#3a0e0a', strokeThickness: 2, resolution: 2,
    }).setOrigin(0.5).setDepth(134).setVisible(false);

    // 收集統一控制
    this.fgHudElements = [
      this.fgMaxCap, this.fgMaxCapText,
      this.fgCountBg, this.fgCountNum, this.fgCountLabel,
      this.fgMultBg, this.fgMultText, this.fgMultLabel,
    ];
  }

  // 顯示／隱藏 Free Game HUD
  showFreeGameHUD(visible) {
    if (!this.fgHudElements) return;
    this.fgHudElements.forEach(el => el?.setVisible(visible));
  }

  // 更新數值
  updateFreeGameHUD(remaining, multTotal) {
    if (this.fgCountNum) this.fgCountNum.setText(String(remaining));
    if (this.fgMultText) this.fgMultText.setText(`x${multTotal}`);
  }

  // ----------------------------------------------------------
  // 購買特色按鈕（左下 / 手機在 HUD 上方）
  // ----------------------------------------------------------
  // ----------------------------------------------------------
  // 底部長方形按鈕列（PC 漫畫風）
  // ----------------------------------------------------------
  buildBottomButtons() {
    const L = this.L;
    if (!L.bottomButtons || !L.bottomButtons.length) return;
    L.bottomButtons.forEach((b) => {
      const img = this.add.image(b.x, b.y, b.key)
        .setDisplaySize(b.w, b.h)
        .setDepth(155)
        .setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.onBottomBtn(b.action));
      // 標籤文字疊在按鈕右半（左半保留給 icon）
      if (b.label && b.action !== 'bet_pm') {
        const labelStyle = {
          fontFamily: 'Noto Serif TC, serif', fontSize: '20px', fontStyle: '900',
          color: '#fff8d0', stroke: '#3a0e0a', strokeThickness: 3, resolution: 2,
        };
        this.add.text(b.x + (b.action === 'buy' || b.action === 'max_bet' ? 0 : 10), b.y, b.label, labelStyle)
          .setOrigin(0.5).setDepth(156);
      }
      // bet_pm 中央顯示押注數字
      if (b.action === 'bet_pm') {
        this.txtBetCenter = this.add.text(b.x, b.y, String(this.bet), {
          fontFamily: 'Noto Serif TC, serif', fontSize: '28px', fontStyle: '900',
          color: '#ffe55f', stroke: '#3a0e0a', strokeThickness: 4, resolution: 2,
        }).setOrigin(0.5).setDepth(156);
        // 左右半邊各別點擊：左半 -、右半 +
        img.removeAllListeners('pointerup');
        img.on('pointerup', (p) => {
          if (p.x < b.x) this.changeBet(-1);
          else this.changeBet(+1);
          if (this.txtBetCenter) this.txtBetCenter.setText(String(this.bet));
        });
      }
    });
  }

  onBottomBtn(action) {
    switch (action) {
      case 'buy':     this.onBuyFeature(); break;
      case 'auto':    this.toggleAuto(); break;
      case 'max_bet': this.setBet(BET_STEPS[BET_STEPS.length - 1]);
                      if (this.txtBetCenter) this.txtBetCenter.setText(String(this.bet));
                      break;
      case 'fast':    this.flashText('快速模式（待實作）'); break;
      case 'menu':    this.flashText('菜單（待實作）'); break;
      case 'event':   this.flashText('活動（待實作）'); break;
      case 'select':  this.flashText('選單（待實作）'); break;
    }
  }

  buildBuyFeatureButton() {
    const L = this.L;
    // PC 版改用 bottomButtons 內的長條按鈕（含 buy_feature），這裡跳過
    if (!L.buyFeatureX) return;
    const isMobile = L.mode === 'mobile';
    const btn = this.add.image(L.buyFeatureX, L.buyFeatureY, 'ui_btn_buy_feature')
      .setDisplaySize(L.buyFeatureW, L.buyFeatureH)
      .setDepth(155).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => this.onBuyFeature());
    this.add.text(L.buyFeatureX, L.buyFeatureY, '購買特色', {
      fontFamily: 'Noto Serif TC, serif', fontSize: isMobile ? '14px' : '24px', fontStyle: '900',
      color: '#fff8d0', stroke: '#3a0e0a', strokeThickness: 3, resolution: 2, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(156);
    this.btnBuyFeature = btn;
  }

  onBuyFeature() {
    if (this.spinning || this.inFreeGame) return;
    // 簡易實作：直接觸發 free game（cost = 100x bet）
    const cost = this.bet * 100;
    if (this.balance < cost) {
      this.flashText('餘額不足');
      return;
    }
    this.balance -= cost;
    this.refreshHUD();
    this.flashText(`購買特色 -${cost.toLocaleString()}`);
    this.time.delayedCall(800, () => this.enterFreeGame());
  }

  // ----------------------------------------------------------
  // 楚漢漫畫進度系統（每 10 spin 揭 1 格、共 12 格、看完循環）
  // 整體佈局：12 格漫畫圍繞中央的 reel 大格
  // ----------------------------------------------------------
  buildComicNarrator() {
    if (!this.L.storyPanels || !this.L.storyPanels.length) {
      // 沒設定 layout（手機暫時略過）
      return;
    }
    const LS_KEY = 'chuhan_progress_v1';
    const TOTAL_PANELS = this.L.storyPanels.length;
    const SPINS_PER_PANEL = 10;

    // 讀取持久化進度
    this.progressSpins = parseInt(localStorage.getItem(LS_KEY) || '0', 10) || 0;
    this.revealedCount = Math.floor(this.progressSpins / SPINS_PER_PANEL) % (TOTAL_PANELS + 1);
    this._progressLS = LS_KEY;
    this._totalPanels = TOTAL_PANELS;
    this._spinsPerPanel = SPINS_PER_PANEL;

    // 各漫畫格的圖片 + 黑色粗墨外框 + PostFX 灰階
    this.storyPanelImgs = [];
    this.storyPanelFXs  = [];
    this.storyPanelFrames = [];
    this.L.storyPanels.forEach((p, i) => {
      // 黑色粗墨外框（漫畫風）
      const frame = this.add.rectangle(p.cx, p.cy, p.w + 12, p.h + 12, 0xf4ead5, 1)
        .setStrokeStyle(6, 0x14110f).setDepth(11);
      this.storyPanelFrames.push(frame);

      // 圖（若 texture 不存在則用空 rect）
      if (this.textures.exists(p.src)) {
        const img = this.add.image(p.cx, p.cy, p.src).setDisplaySize(p.w, p.h).setDepth(12);
        const fx = img.preFX?.addColorMatrix();
        if (fx) fx.grayscale(i < this.revealedCount ? 0 : 1);
        this.storyPanelImgs.push(img);
        this.storyPanelFXs.push(fx);
      } else {
        // fallback：用標籤文字
        const t = this.add.text(p.cx, p.cy, p.label || '?', {
          fontFamily: 'Noto Serif TC, serif', fontSize: '24px', color: '#8a6a3a',
        }).setOrigin(0.5).setDepth(12);
        this.storyPanelImgs.push(t);
        this.storyPanelFXs.push(null);
      }
    });

    // 進度條（底部，顯示總進度與目前章節）
    this.progressText = this.add.text(this.L.W/2, this.L.H - 8, '', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: '14px', fontStyle: '900',
      color: '#8a6a3a', resolution: 2,
    }).setOrigin(0.5, 1).setDepth(200);
    this.refreshProgressText();
  }

  // 更新進度條文字
  refreshProgressText() {
    if (!this.progressText) return;
    const total = this._totalPanels * this._spinsPerPanel;
    const within = this.progressSpins % total;
    this.progressText.setText(`漫畫進度　${this.revealedCount}/${this._totalPanels}　·　下一格 ${SPINS_REMAIN(within, this._spinsPerPanel)}/${this._spinsPerPanel}`);
  }

  // 每次 spin 結束後呼叫一次：推進進度，若該揭新格就揭
  advanceComicProgress() {
    if (!this._progressLS) return;
    this.progressSpins += 1;
    const total = this._totalPanels * this._spinsPerPanel;
    // 若已看完整頁，翻新頁（進度歸 0、所有 panel 回灰）
    if (this.progressSpins >= total + 1) {
      this.progressSpins = 0;
      this.revealedCount = 0;
      this.storyPanelFXs.forEach(fx => fx && fx.grayscale(1));
      this.flashText('翻新頁　新故事開始');
    } else {
      const newRevealed = Math.floor(this.progressSpins / this._spinsPerPanel);
      if (newRevealed > this.revealedCount && newRevealed <= this._totalPanels) {
        const idx = newRevealed - 1;
        this.revealStoryPanel(idx);
        this.revealedCount = newRevealed;
      }
    }
    try { localStorage.setItem(this._progressLS, String(this.progressSpins)); } catch (e) {}
    this.refreshProgressText();
  }

  // 把某格從灰階淡入彩色（含閃光提示）
  revealStoryPanel(idx) {
    const fx = this.storyPanelFXs[idx];
    const frame = this.storyPanelFrames[idx];
    const img = this.storyPanelImgs[idx];
    if (!fx || !img) return;
    // 框瞬間發光
    if (frame) {
      const orig = frame.strokeColor;
      this.tweens.add({
        targets: frame, scale: { from: 1, to: 1.08 },
        yoyo: true, repeat: 2, duration: 200,
      });
      frame.setStrokeStyle(6, 0xf5d27a);
      this.time.delayedCall(900, () => frame.setStrokeStyle(6, 0x14110f));
    }
    // grayscale 漸退
    this.tweens.addCounter({
      from: 1, to: 0, duration: 1500, ease: 'Cubic.easeInOut',
      onUpdate: (tw, target) => fx.grayscale(target.value),
    });
    this.flashText(`第 ${idx + 1} 格揭曉`);
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

    // 漫畫進度推進（每 spin += 1 點，每 10 點解鎖一格）
    if (!this.inFreeGame) this.advanceComicProgress?.();
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
      this.updateFreeGameHUD(Math.max(0, this.freeSpinsLeft), this.fgMultSum || 0);
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

    // Free Game：倍數累計
    if (this.inFreeGame && multTotal > 0) {
      this.fgMultSum = (this.fgMultSum || 0) + multTotal;
      this.updateFreeGameHUD(this.freeSpinsLeft, this.fgMultSum);
    }

    let finalWin = totalWin * this.bet / 20;
    const effectiveMult = this.inFreeGame ? (this.fgMultSum || 0) : multTotal;
    if (effectiveMult > 0 && finalWin > 0) {
      this.sound2?.playSfx('mult_total');
      this.flashText(`倍數 x${effectiveMult}`);
      finalWin *= effectiveMult;
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
    this.fgMultSum = 0;
    this.sound2?.playSfx('trans');
    this.sound2?.playSfx('fg_in');

    // 顯示 Free Game HUD
    this.updateFreeGameHUD(this.freeSpinsLeft, 0);
    this.showFreeGameHUD(true);

    // 隱藏漫畫面板（FreeGame 期間用虞姬畫面）
    this.tweens.add({
      targets: [this.comicLeft, this.comicRight, this.comicChapterText, ...this.comicLeftOverlays, ...this.comicRightOverlays],
      alpha: 0, duration: 400,
    });

    // ===== 過場：暗幕 =====
    const dim = this.add.rectangle(L.W/2, L.H/2, L.W, L.H, 0x000000, 0).setDepth(900);
    this.tweens.add({ targets: dim, alpha: 0.78, duration: 500 });

    // 鳳凰光環從中央放大（過場期間在暗幕上方，但人物會在更上層 920）
    this.fgPhoenix.setVisible(true).setAlpha(0).setScale(0.6).setPosition(L.W/2, L.H/2).setDepth(905);
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
    const heroYuji = this.add.image(L.W/2, L.H, 'yuji_idle')
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
      .setPosition(L.W/2, L.H * 0.2).setDepth(925);
    this.tweens.add({
      targets: this.fengmingLogo, alpha: 1, scale: 1, y: 280,
      duration: 700, delay: 400, ease: 'Back.easeOut',
    });

    // 15 次免費公告
    await this.delay(1100);
    const announce = this.add.text(L.W/2, L.H * 0.67, `${FREE_SPINS_INITIAL} 次免費遊戲`, {
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
    this.yujiLeft.setPosition(L.W/2, L.H).setAlpha(0).setVisible(true).setDepth(11);
    this.yujiRight.setPosition(L.W/2, L.H).setAlpha(0).setVisible(true).setDepth(21);
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
    // 隱藏 Free Game HUD
    this.showFreeGameHUD(false);

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
    const t = this.add.text(L.W/2, L.H/2, msg, {
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

    const L = this.L;
    const isMobile = L.mode === 'mobile';
    const cont = this.add.container(L.W/2, L.H/2).setDepth(2000);

    // 暗化背景
    const dim = this.add.rectangle(0, 0, L.W, L.H, 0x000000, 0).setAlpha(0);
    // 大獎旗幟
    const bannerW = isMobile ? 380 : 900;
    const bannerH = isMobile ? 280 : 660;
    const banner = this.add.image(0, 0, 'ui_banner_big_win').setDisplaySize(bannerW, bannerH).setAlpha(0).setScale(0.3);
    // 獎金文字（疊在 banner 中央留白）
    const fontSize = isMobile ? 36 : 80;
    const txt = this.add.text(0, isMobile ? 40 : 80, amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), {
      fontFamily: 'Noto Serif TC, serif', fontSize: `${fontSize}px`, fontStyle: '900',
      color: '#fff8d0', stroke: '#7f1f1b', strokeThickness: 8, resolution: 2,
    }).setOrigin(0.5).setAlpha(0);

    cont.add([dim, banner, txt]);

    // 動畫：先暗化 → banner 彈出 → 文字浮現
    this.tweens.add({ targets: dim, alpha: 0.65, duration: 400 });
    this.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 600, ease: 'Back.easeOut' });
    this.tweens.add({ targets: txt, alpha: 1, duration: 500, delay: 600 });
    // 金額數字滾動效果
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter, v: amount, duration: 1800, delay: 600, ease: 'Cubic.easeOut',
      onUpdate: () => {
        txt.setText(counter.v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      },
    });

    this.time.delayedCall(3500, () => {
      this.tweens.add({ targets: cont, alpha: 0, duration: 600, onComplete: () => cont.destroy() });
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
