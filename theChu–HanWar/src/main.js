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
  // === v5 整頁漫畫版型（4 章節背景 + 中央 reel）===
  // 整張 1920×1080 為章節漫畫底圖（bg_ch1..4）；中央 1200×680 透明區放 reel；頂中央放 logo+章節文字；頂條放 jackpot；底條放 HUD
  reelCx: 960, reelCy: 690, reelW: 900, reelH: 480,
  storyPanels: [],                                        // v5：背景已含故事漫畫格，不另疊小格
  // v5 各區位置
  jackpotBarY: 30, jackpotBarH: 60,                       // bar_jackpot_h（頂部橫向 4 段）
  jackpotXs: [240, 720, 1200, 1680],                      // 4 段中心 x
  logoCx: 960, logoCy: 240, logoW: 1080, logoH: 360,       // splash_top_duel（拉滿到 reel 寬度）
  scatterBannerY: 400, scatterBannerW: 900, scatterBannerH: 55,  // splash 下方、reel 上方（與 reel 同寬）
  reelFrameW: 1240, reelFrameH: 720,                      // frame_reel_v2
  // 底部 HUD
  hudBaseY: 1020,
  bgChapterKey: 'v6_page_01',                             // 預設頁面（v6 20 頁循環）
  // v6 6 個故事漫畫格的覆蓋區域（給 fade-in mask 用）
  storyMaskRects: [
    { x: 0,    y: 0,   w: 420, h: 340 },   // 左1
    { x: 1500, y: 0,   w: 420, h: 340 },   // 右1
    { x: 0,    y: 340, w: 420, h: 320 },   // 左2
    { x: 1500, y: 340, w: 420, h: 320 },   // 右2
    { x: 0,    y: 660, w: 420, h: 320 },   // 左3
    { x: 1500, y: 660, w: 420, h: 320 },   // 右3
  ],
  // 兼容欄位（舊代碼讀取）
  splashTopY: 130, splashTopH: 260,
  sideLeftCx: -999, sideLeftCy: 0, sideLeftW: 0, sideLeftH: 0,    // v5 廢棄
  sideRightCx: -999, sideRightCy: 0, sideRightW: 0, sideRightH: 0, // v5 廢棄
  bottomPanelY: 970, bottomPanelH: 220,
  jackpotX: 215, jackpotYs: [340, 460, 580, 700], jackpotW: 260, jackpotH: 90,
  rightInfoX: 1705, rightInfoYs: [340, 460, 580, 700], rightInfoW: 260, rightInfoH: 90,
  // 舊欄位保留供其他模組讀取（無效但不致 crash）
  jackpotY: 42, jackpotH: 64,
  // 舊欄位（保留 logoX/Y 給其他模組讀；logoW/H 已上面定義為 splash 對峙圖大小，這裡不重複寫）
  logoX: 960, logoY: 60,
  topBannerY: 280, topBannerW: 1080, topBannerH: 70,
  // 左右側欄漫畫頁（取代立繪）
  comicLeftX: 230, comicRightX: 1690, comicY: 540, comicSize: 420,
  chapterTextY: 215,
  // Free Game 元件（左漫畫上方）
  fgCountX: 130, fgCountY: 540, fgCountW: 140, fgCountH: 140,    // FREE GAMES 徽（reel 左側）
  multBadgeX: 1490, multBadgeY: 460, multBadgeR: 70,             // 倍數圓徽（reel 右上角、蓋住一點）
  // HUD 底部（v5：縮小底部空間，HUD 上移）
  hudY: 1000, hudPanelW: 1810, hudPanelH: 80,
  avatarX: 96, avatarY: 1000,
  coinX: 468, balX: 625, betDispX: 1060,
  betMinusX: 900, betPlusX: 1220,
  autoBtnX: 1350, autoBtnY: 1018,
  // 中央 SPIN（PC 在右下，貼在 bottom_bigwin_panel 右側）
  spinBtnX: 1740, spinBtnY: 970, spinBtnSize: 200,
  // Side buttons（PC 改成底部長按鈕，不用右側圓鈕了）
  sideBtnX: null,
  sideBtnYs: [],
  settingsBtnX: 1880, settingsBtnY: 44,
  // v4：純文字 HUD，移除所有底部紅色按鈕
  bottomButtons: [],
  // 上方雙漫畫格（v4 splash 內的兩個故事漫畫格）
  topPanelLeftCx: 220, topPanelLeftCy: 185, topPanelLeftW: 380, topPanelLeftH: 210,
  topPanelRightCx: 1700, topPanelRightCy: 185, topPanelRightW: 380, topPanelRightH: 210,
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
  // dev 測試：高價符號權重大幅提高，方便看 BIG WIN
  sym_xiang_yu: 10, sym_liu_bang: 10, sym_jade_seal: 10,
  sym_halberd: 10,  sym_tiger: 10,
  gem_red: 10, gem_purple: 10, gem_yellow: 10, gem_green: 10, gem_blue: 10,
  scatter: 4,
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
    this.load.maxParallelDownloads = 8;
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
    this.load.image('reel_frame',        'assets/ui_v3/frame_reel_manga.png');    // ★ 漫畫黑墨邊（簡潔）
    this.load.image('reel_separator',    'assets/reel/reel_separator.png');

    // === v5 整頁漫畫底圖（4 章節 + 共用 UI 元素）===
    this.load.image('v5_bg_ch1',          'assets/ui_v5/bg_ch1.png');
    this.load.image('v5_bg_ch2',          'assets/ui_v5/bg_ch2.png');
    this.load.image('v5_bg_ch3',          'assets/ui_v5/bg_ch3.png');
    this.load.image('v5_bg_ch4',          'assets/ui_v5/bg_ch4.png');
    this.load.image('v5_logo',            'assets/ui_v5/logo_chuhan_v2.png');
    this.load.image('v5_bar_jackpot',     'assets/ui_v5/bar_jackpot_h.png');
    // 保留 v4 reel 框 + scatter 條 + SPIN（v5 已棄用 frame_reel）
    this.load.image('v4_frame_reel',      'assets/ui_v4/frame_reel_v2.png');
    this.load.image('v4_banner_scatter',  'assets/ui_v4/banner_scatter_top.png');
    this.load.image('v4_btn_spin',        'assets/ui_v4/btn_spin_v2.png');
    // v5：靜態底 + 獨立 icon
    this.load.image('v5_btn_spin_base',   'assets/ui_v5/btn_spin_base.png');
    this.load.image('v5_btn_spin_icon',   'assets/ui_v5/btn_spin_icon.png');
    // v5：對峙 splash + 新 scatter 條 + 新 auto 按鈕
    this.load.image('v5_splash_duel',     'assets/ui_v5/splash_top_duel.png');
    this.load.image('v5_banner_scatter',  'assets/ui_v5/banner_scatter_v2.png');
    this.load.image('v5_btn_auto',        'assets/ui_v5/btn_auto_v2.png');

    // v6：20 頁故事底圖
    for (let i = 1; i <= 20; i++) {
      const k = String(i).padStart(2, '0');
      this.load.image(`v6_page_${k}`, `assets/ui_v6/page_${k}.png`);
    }
    this.load.image('v6_badge_mult',     'assets/ui_v6/badge_mult_v4.png');  // ← 升級到 v4 精緻版
    this.load.image('v6_badge_mult_v2',  'assets/ui_v6/badge_mult_v2.png');
    this.load.image('v6_badge_mult_v3',  'assets/ui_v6/badge_mult_v3.png');
    this.load.image('v6_btn_sound',      'assets/ui_v6/btn_sound.png');
    this.load.image('v6_bg_freegame',    'assets/ui_v6/bg_freegame_yuji.png');

    // 金屬字：0-9 + 逗號 + FREE GAMES + BIG WIN
    for (let d = 0; d <= 9; d++) {
      this.load.image(`gold_d${d}`, `assets/gold_text/digit_${d}.png`);
    }
    this.load.image('gold_comma', 'assets/gold_text/digit_comma.png');
    this.load.image('gold_dot',   'assets/gold_text/digit_dot.png');
    this.load.image('gold_free_games', 'assets/gold_text/free_games.png');
    this.load.image('gold_big_win', 'assets/gold_text/big_win.png');
    this.load.image('logo_title',         'assets/logo/chuhan_logo_title.png');

    // === HUD ===
    this.load.image('avatar_chu',        'assets/ui/hud/player_avatar_chu.png');
    this.load.image('icon_coin',         'assets/ui/hud/icon_coin_stack.png');
    this.load.image('btn_bet_minus',     'assets/ui/hud/btn_bet_minus.png');
    this.load.image('btn_bet_plus',      'assets/ui/hud/btn_bet_plus.png');
    this.load.image('btn_max_bet',       'assets/ui/hud/btn_max_bet.png');

    // === 主按鈕（v4 漫畫風）===
    this.load.image('btn_spin',          'assets/ui_v4/btn_spin_v2.png');         // ★ v4
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

    // === 新 UI 元素（codex 生）— banner_top/big_win 已併入 v4 ===
    // 以下 alias 指向 v4 素材，避免改動所有引用
    this.load.image('ui_banner_top',      'assets/ui_v4/banner_scatter_top.png');
    this.load.image('ui_badge_fg',        'assets/ui_new/badge_free_games.png');
    this.load.image('ui_badge_mult',      'assets/ui_new/badge_mult.png');
    this.load.image('ui_btn_buy_feature', 'assets/ui_new/btn_buy_feature.png');
    this.load.image('ui_logo_plaque',     'assets/ui_new/logo_title_plaque.png');
    this.load.image('ui_banner_big_win',  'assets/ui_v4/bottom_bigwin_panel.png');

    // === B&W manga 戲劇 overlay（關鍵時刻 burst-in）===
    this.load.image('mo_fg_phoenix',  'assets/manga_overlay/fg_phoenix_descend.png');
    this.load.image('mo_bigwin',      'assets/manga_overlay/bigwin_dramatic.png');
    this.load.image('mo_mult',        'assets/manga_overlay/mult_drop.png');
    this.load.image('mo_scatter',     'assets/manga_overlay/scatter_chance.png');
    this.load.image('mo_fg_total',    'assets/manga_overlay/fg_total_dramatic.png');
    this.load.image('mo_fg_end',      'assets/manga_overlay/fg_end_dramatic.png');

    // === v3 漫畫風 UI（v4 後大部分淘汰；保留尚存的 btn_rect_* ）===
    // page_pc_template / manga_page_full / bar_jackpot_4seg / bar_hud_bottom / banner_chapter_title 已搬到 _archive
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
    // 全部 16 張單格漫畫場景（4 章 × 楚漢 × 2 頁）
    for (let ch = 1; ch <= 4; ch++) {
      for (const side of ['chu', 'han']) {
        for (let p = 1; p <= 2; p++) {
          this.load.image(`comic_ch${ch}_${side}_p${p}`, `assets/comics/ch${ch}_${side}_p${p}.png`);
        }
      }
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

    // === Depth 0：背景（漫畫稿紙米色）===
    this.bg = this.add.rectangle(L.W/2, L.H/2, L.W, L.H, 0x111111, 1).setDepth(0);
    this.bg.setFillStyle = (color) => this.bg.fillColor = color;

    // === v5 整頁漫畫底圖版型 ===
    if (L.mode === 'pc') {
      // Depth 1：整張故事頁面背景（v6 20 頁循環）— 下移 60px 避開 jackpot 條
      this._currentPageIdx = 0;
      this.chapterBg = this.add.image(L.W/2, L.H/2 + 30, L.bgChapterKey)
        .setDisplaySize(L.W, L.H - 60).setDepth(1);

      // Depth 1.5：頂部中央留白區用黑色填滿（給對峙圖背景用）
      this.add.rectangle(L.W/2, 210, 960, 420, 0x000000, 1).setDepth(1.5);
      // v6 page reel 中央區由 reel 自己的深藍底覆蓋，不需要額外黑塊

      // Depth 1.6：6 格 fade-in mask 黑色覆蓋（切換頁時暫時遮蔽再 fade out）
      this._storyPanelMasks = (L.storyMaskRects || []).map(r => {
        return this.add.rectangle(r.x + r.w/2, r.y + r.h/2, r.w, r.h, 0x000000, 0)
          .setDepth(2).setAlpha(0);
      });
      // Depth 2：底部 HUD 黑色半透明條（60% 透明）
      this.add.rectangle(L.W/2, 1020, L.W, 120, 0x000000, 0.6).setDepth(2);
      // Depth 2：頂部 jackpot 條（只覆蓋 y 0-60、章節 bg 在這留白）
      this.add.rectangle(L.W/2, 30, L.W, 60, 0x000000, 0.92).setDepth(2);

      // Depth 3：頂部橫向 jackpot 條 — 純黑底（無分隔線）
      this.add.rectangle(L.W/2, L.jackpotBarY, L.W, L.jackpotBarH, 0x000000, 1).setDepth(3);

      // Depth 4：對峙圖（直接顯示、無斜切、無白邊）
      if (this.textures.exists('v5_splash_duel')) {
        this.add.image(L.logoCx, L.logoCy, 'v5_splash_duel')
          .setDisplaySize(L.logoW, L.logoH).setDepth(4);
      } else {
        const logoKey = this.textures.exists('v5_logo') ? 'v5_logo' : 'logo_title';
        this.add.image(L.logoCx, L.logoCy, logoKey)
          .setDisplaySize(580, 200).setDepth(4);
      }

      // 章節文字暫時不顯示（會被 reel 壓到，章節由背景圖本身呈現即可）
      this.chapterText = null;

      // 兼容舊代碼
      this.topPanelLeft = null;
      this.topPanelRight = null;
      this.topPanelLeftLabel = null;
      this.topPanelRightLabel = null;
    }

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

    // v5：reel 內部實心深藍底（蓋住下層章節背景的奇怪文字）+ 細金屬邊框緊貼
    if (L.mode === 'pc') {
      // Depth 75：reel 實心底色（深藍黑、無圓角、完全填滿）
      this.add.rectangle(REEL_CX, REEL_CY, REEL_W, REEL_H, 0x0b0e2a, 1).setDepth(75);
      // Depth 110：細金屬雙線框
      const rg = this.add.graphics().setDepth(110);
      rg.lineStyle(3, 0xd4a54a, 1);
      rg.strokeRect(REEL_CX - REEL_W/2, REEL_CY - REEL_H/2, REEL_W, REEL_H);
      rg.lineStyle(1, 0x8a6b2a, 1);
      rg.strokeRect(REEL_CX - REEL_W/2 - 4, REEL_CY - REEL_H/2 - 4, REEL_W + 8, REEL_H + 8);
    }

    // === v5：頂部橫向 Jackpot 4 段（GRAND ｜ MAJOR ｜ MINOR ｜ MINI）===
    const jpFontSize = isMobile ? 14 : 22;
    const jackpotStyle = (color) => ({
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: `${jpFontSize}px`, fontStyle: '900',
      color, stroke: '#2b1334', strokeThickness: 2, resolution: 2,
    });
    const jpItems = [
      { label: 'GRAND', value: '13,498,357', color: '#ffdf55' },
      { label: 'MAJOR', value: '3,547,057',  color: '#ffdf55' },
      { label: 'MINOR', value: '626,857',    color: '#ffdf55' },
      { label: 'MINI',  value: '106,950',    color: '#ffdf55' },
    ];
    if (L.mode === 'pc') {
      jpItems.forEach((j, i) => {
        const cx = L.jackpotXs[i];
        // 同一行：左 label、右 value
        this.add.text(cx - 75, L.jackpotBarY, j.label, jackpotStyle(j.color))
          .setOrigin(0.5).setDepth(121);
        this.add.text(cx + 60, L.jackpotBarY, j.value, jackpotStyle('#ffffff'))
          .setOrigin(0.5).setDepth(121);
      });
    }

    // === Depth 130：v5 scatter 提示條（Phaser 自繪、和 reel 同款金屬框）===
    if (L.mode === 'pc') {
      const sbX = REEL_CX - L.scatterBannerW/2;
      const sbY = L.scatterBannerY - L.scatterBannerH/2;
      const sg = this.add.graphics().setDepth(130);
      sg.fillStyle(0x000000, 0.92);
      sg.fillRect(sbX, sbY, L.scatterBannerW, L.scatterBannerH);
      sg.lineStyle(3, 0xd4a54a, 1);
      sg.strokeRect(sbX, sbY, L.scatterBannerW, L.scatterBannerH);
      sg.lineStyle(1, 0x8a6b2a, 1);
      sg.strokeRect(sbX - 4, sbY - 4, L.scatterBannerW + 8, L.scatterBannerH + 8);
    }
    this.infoText = this.add.text(REEL_CX, L.scatterBannerY, '4× 鳳釵 SCATTER　贏取免費遊戲', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: isMobile ? '13px' : '26px', fontStyle: '900',
      color: '#ffe894', stroke: '#08352f', strokeThickness: 3, resolution: 2,
    }).setOrigin(0.5).setDepth(131);

    // v5：右欄資訊已併入頂部 jackpot 條 + 底部 HUD，這裡不再渲染側欄資訊框

    // === Depth 145：HUD controls ===
    const HUD_Y = L.hudY;
    const avSize = isMobile ? 40 : 74;
    const coinSize = isMobile ? 36 : 58;
    const betBtnSize = isMobile ? 40 : 58;
    const autoBtnSize = isMobile ? 56 : 72;

    // v5 極簡 HUD：avatar + 編輯暱稱 + 點數/贏分（純文字）+ 拖曳式押注 + auto + SPIN
    // avatar 圓形外框
    this.add.circle(L.avatarX, HUD_Y, avSize/2 + 3, 0xd4a54a, 1).setDepth(144);
    this.add.image(L.avatarX, HUD_Y, 'avatar_chu').setDisplaySize(avSize, avSize).setDepth(145);

    // === 押注膠囊（戰神賽特風拖曳 slider）===
    const betCapsuleW = isMobile ? 200 : 340;
    const betCapsuleH = isMobile ? 56 : 80;
    const betCapsuleX = isMobile ? L.betDispX : 1300;
    L._betCapsuleX = betCapsuleX;

    // 膠囊底（深紅 enamel + 金邊）
    const capsule = this.add.graphics().setDepth(144);
    capsule.fillStyle(0x1a0508, 0.88);
    capsule.lineStyle(3, 0xd4a54a, 1);
    capsule.fillRoundedRect(betCapsuleX - betCapsuleW/2, HUD_Y - betCapsuleH/2, betCapsuleW, betCapsuleH, betCapsuleH/2);
    capsule.strokeRoundedRect(betCapsuleX - betCapsuleW/2, HUD_Y - betCapsuleH/2, betCapsuleW, betCapsuleH, betCapsuleH/2);

    // 內部進度條 = 整個膠囊內側（從藥丸最左邊一路到最右邊）
    const innerInset = 4;  // 留 4px 給金色外邊
    const trackX0 = betCapsuleX - betCapsuleW/2 + innerInset;
    const trackX1 = betCapsuleX + betCapsuleW/2 - innerInset;
    const trackW = trackX1 - trackX0;
    const trackY = HUD_Y;
    const trackH = betCapsuleH - innerInset * 2;

    // 金色半透明填充（依下注等級、alpha 0.5）+ mask 切到藥丸形狀
    this._betFillGfx = this.add.graphics().setDepth(144);
    // mask：膠囊內側 rounded rect（用 betMaskShape 避免和 reel maskShape 衝突）
    const betMaskShape = this.make.graphics({ x: 0, y: 0, add: false });
    betMaskShape.fillStyle(0xffffff, 1);
    betMaskShape.fillRoundedRect(
      betCapsuleX - betCapsuleW/2 + innerInset,
      HUD_Y - betCapsuleH/2 + innerInset,
      betCapsuleW - innerInset * 2,
      betCapsuleH - innerInset * 2,
      (betCapsuleH - innerInset * 2) / 2,
    );
    this._betFillGfx.setMask(betMaskShape.createGeometryMask());
    const drawBetFill = () => {
      const i = BET_STEPS.indexOf(this.bet);
      const t = BET_STEPS.length > 1 ? Math.max(0, i + 1) / BET_STEPS.length : 0;
      const fillW = Math.max(6, trackW * t);
      this._betFillGfx.clear();
      this._betFillGfx.fillGradientStyle(0xffe55f, 0xffd700, 0xd4a54a, 0xb8860b, 0.5);
      this._betFillGfx.fillRect(trackX0, trackY - trackH/2, fillW, trackH);
    };
    this._updateBetKnob = drawBetFill;
    drawBetFill();

    // 點 / 拖曳 整個 track
    const setBetByPos = (x) => {
      const t = Phaser.Math.Clamp((x - trackX0) / trackW, 0, 1);
      const idx = Math.round(t * (BET_STEPS.length - 1));
      const newBet = BET_STEPS[idx];
      if (newBet !== this.bet) {
        this.bet = newBet;
        this.refreshHUD();
      }
    };
    const trackHit = this.add.rectangle(betCapsuleX, trackY, trackW, trackH, 0xffffff, 0)
      .setDepth(145).setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(trackHit);
    trackHit.on('pointerdown', (p) => setBetByPos(p.x));
    trackHit.on('drag', (p) => setBetByPos(p.x));

    // − / + 文字按鈕
    const sideFs = isMobile ? 28 : 42;
    const btnMinusText = this.add.text(betCapsuleX - betCapsuleW/2 + 24, HUD_Y, '−',
      { fontFamily: 'Noto Sans TC, sans-serif', fontSize: `${sideFs}px`, fontStyle: '900',
        color: '#ffdf55', stroke: '#000', strokeThickness: 3, resolution: 2 })
      .setOrigin(0.5).setDepth(146).setInteractive({ useHandCursor: true });
    const btnPlusText = this.add.text(betCapsuleX + betCapsuleW/2 - 24, HUD_Y, '＋',
      { fontFamily: 'Noto Sans TC, sans-serif', fontSize: `${sideFs}px`, fontStyle: '900',
        color: '#ffdf55', stroke: '#000', strokeThickness: 3, resolution: 2 })
      .setOrigin(0.5).setDepth(146).setInteractive({ useHandCursor: true });
    btnMinusText.on('pointerup', () => this.changeBet(-1));
    btnPlusText.on('pointerup', () => this.changeBet(+1));

    // === 自動按鈕（大一點、無文字標籤、啟動時有金光環效果）===
    const autoBtnKey = this.textures.exists('v5_btn_auto') ? 'v5_btn_auto' : 'btn_auto';
    const autoSize = isMobile ? 70 : 120;
    const autoX = L.spinBtnX - L.spinBtnSize * 0.72;
    const autoY = L.spinBtnY;
    // 啟動光環（金色脈衝、預設隱藏）
    this.btnAutoRing = this.add.circle(autoX, autoY, autoSize * 0.55, 0xffdf55, 0)
      .setStrokeStyle(4, 0xffdf55, 1).setDepth(144).setVisible(false);
    // 按鈕本體
    this.btnAutoHud = this.add.image(autoX, autoY, autoBtnKey)
      .setDisplaySize(autoSize, autoSize).setDepth(145)
      .setInteractive({ useHandCursor: true });
    this.btnAutoHud.on('pointerup', () => this.toggleAuto());
    L.autoBtnX = autoX;
    L.autoBtnY = autoY;
    this._autoRingTween = null;

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

    // 編輯暱稱（avatar 右邊）+ 鉛筆 icon（純文字 emoji）
    const nickX = L.avatarX + (isMobile ? 24 : 48);
    if (!isMobile) {
      const nickText = this.add.text(nickX, HUD_Y, '編輯暱稱', hudTextStyle(20, '#ffffff'))
        .setOrigin(0, 0.5).setDepth(146).setInteractive({ useHandCursor: true });
      this.add.text(nickX + 110, HUD_Y, '✎', hudTextStyle(22, '#ffdf55'))
        .setOrigin(0, 0.5).setDepth(146);
      // 點 → 開暱稱編輯（暫時 prompt）
      nickText.on('pointerup', () => {
        const cur = localStorage.getItem('chuhan_nick') || '玩家漢王';
        const v = prompt('輸入新暱稱：', cur);
        if (v && v.trim()) { localStorage.setItem('chuhan_nick', v.trim()); nickText.setText(v.trim()); }
      });
      const savedNick = localStorage.getItem('chuhan_nick'); if (savedNick) nickText.setText(savedNick);
    } else {
      this.add.text(L.avatarX, HUD_Y + 24, 'LV.88', hudTextStyle(9, '#ffdf5a')).setOrigin(0.5).setDepth(146);
    }

    // 點數（大數字 + 下方標籤『點數』）
    const pointsX = isMobile ? L.balX : 580;
    this.txtBalance = this.add.text(pointsX, HUD_Y - (isMobile ? 8 : 12), '0.00',
      hudTextStyle(fsMain + 4, '#ffffff', { strokeThickness: 4 }))
      .setOrigin(0.5).setDepth(146);
    this.add.text(pointsX, HUD_Y + (isMobile ? 18 : 30), '點數',
      hudTextStyle(fsLabel - 2, '#a8967a')).setOrigin(0.5).setDepth(146);

    // 贏分（大數字 + 下方標籤『贏分』）
    const winX = isMobile ? L.betDispX - 80 : 880;
    this.txtWinHud = this.add.text(winX, HUD_Y - (isMobile ? 8 : 12), '0.00',
      hudTextStyle(fsMain + 4, '#ffffff', { strokeThickness: 4 }))
      .setOrigin(0.5).setDepth(146);
    this.add.text(winX, HUD_Y + (isMobile ? 18 : 30), '贏分',
      hudTextStyle(fsLabel - 2, '#a8967a')).setOrigin(0.5).setDepth(146);

    // 押注（顯示在膠囊中央，下方標籤『押注』）
    const _betX = L._betCapsuleX ?? L.betDispX;
    this.txtBet = this.add.text(_betX, HUD_Y - (isMobile ? 6 : 10), '60',
      hudTextStyle(fsMain + 4, '#ffe55f', { strokeThickness: 4 }))
      .setOrigin(0.5).setDepth(146);
    this.add.text(_betX, HUD_Y + (isMobile ? 18 : 28), '押注',
      hudTextStyle(fsLabel - 2, '#d8c399')).setOrigin(0.5).setDepth(146);

    // 自動按鈕無文字標籤（用啟動光環判斷）
    this.txtAutoLabel = null;

    // === Free Game 大金屬字 15 FREE GAMES（在玩家名字上方一點）===
    if (!isMobile) {
      const fgX = 150, fgY = 890;  // HUD 玩家名字上方一點
      // 金屬字 15（縮小一點，因放在 HUD 上方）
      this.fgBigNum = this.buildGoldNumber(fgX, fgY - 22, '15', {
        digitW: 50, digitH: 72, gap: -6, depth: 146, origin: 0.5,
      });
      this.fgBigNum.setVisible(false);
      // FREE GAMES 金屬字圖
      if (this.textures.exists('gold_free_games')) {
        this.fgBigLabel = this.add.image(fgX, fgY + 36, 'gold_free_games')
          .setDisplaySize(140, 70).setDepth(146).setVisible(false);
      } else {
        this.fgBigLabel = this.add.text(fgX, fgY + 36, 'FREE\nGAMES', {
          fontFamily: 'Noto Serif TC, serif', fontSize: '20px', fontStyle: '900',
          color: '#ffdf55', stroke: '#000', strokeThickness: 4, align: 'center', resolution: 2,
        }).setOrigin(0.5).setDepth(146).setVisible(false);
      }

      // === 購買特色按鈕（base game 用、HUD 上方小金字膠囊）===
      const bfX = 130, bfY = HUD_Y - 75;
      const bfW = 200, bfH = 56;
      this.btnBuyFeatureBg = this.add.graphics().setDepth(144);
      this.btnBuyFeatureBg.fillStyle(0x0a2e3a, 0.9);
      this.btnBuyFeatureBg.lineStyle(3, 0xd4a54a, 1);
      this.btnBuyFeatureBg.fillRoundedRect(bfX - bfW/2, bfY - bfH/2, bfW, bfH, bfH/2);
      this.btnBuyFeatureBg.strokeRoundedRect(bfX - bfW/2, bfY - bfH/2, bfW, bfH, bfH/2);
      this.btnBuyFeatureTxt1 = this.add.text(bfX, bfY - 10, '購買特色', {
        fontFamily: 'Noto Serif TC, serif', fontSize: '20px', fontStyle: '900',
        color: '#ffdf55', stroke: '#000', strokeThickness: 3, resolution: 2,
      }).setOrigin(0.5).setDepth(146);
      this.btnBuyFeatureTxt2 = this.add.text(bfX, bfY + 12, '15 次 Free Game', {
        fontFamily: 'Noto Sans TC, sans-serif', fontSize: '11px', fontStyle: '700',
        color: '#fff8d0', resolution: 2,
      }).setOrigin(0.5).setDepth(146);
      const bfHit = this.add.rectangle(bfX, bfY, bfW, bfH, 0xffffff, 0)
        .setDepth(147).setInteractive({ useHandCursor: true });
      bfHit.on('pointerup', () => this.onBuyFeature());
    }

    // 本局贏分（顯示在 scatter 條中央，取代 scatter 提示文字）
    this.txtWin = this.add.text(L.W/2, L.scatterBannerY, '', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: isMobile ? '18px' : '32px', fontStyle: '900',
      color: '#fff8d0', stroke: '#7f1f1b', strokeThickness: 6, resolution: 2,
    }).setOrigin(0.5).setDepth(132);

    // Free Game 計數文字（顯示在 scatter 條內，跟 infoText 互斥）
    this.txtFG = this.add.text(L.W/2, L.scatterBannerY, '', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: isMobile ? '16px' : '26px', fontStyle: '900',
      color: '#ffe55f', stroke: '#3a0e0a', strokeThickness: 4, resolution: 2,
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
    // v6：設定按鈕（紅金徽）移除 — 沒實際功能且擋章節 bg
    // this.add.image(L.settingsBtnX, L.settingsBtnY, 'btn_settings').setDisplaySize(isMobile ? 36 : 58, isMobile ? 36 : 58).setDepth(150)
    //   .setInteractive({ useHandCursor: true });

    // === Depth 155：btn_spin（v5：靜態底 + 獨立旋轉 icon）===
    const useV5Spin = this.textures.exists('v5_btn_spin_base') && this.textures.exists('v5_btn_spin_icon');
    if (useV5Spin) {
      // 靜態底（按鈕本體絕不旋轉）
      this.btnSpin = this.add.image(L.spinBtnX, L.spinBtnY, 'v5_btn_spin_base')
        .setDisplaySize(L.spinBtnSize, L.spinBtnSize).setDepth(155)
        .setInteractive({ useHandCursor: true });
      this.btnSpin.on('pointerup', () => this.onSpin());
      // 旋轉 icon（疊在底上方、只有它在轉）
      this.btnSpinIcon = this.add.image(L.spinBtnX, L.spinBtnY, 'v5_btn_spin_icon')
        .setDisplaySize(L.spinBtnSize * 0.5, L.spinBtnSize * 0.5).setDepth(156);
    } else {
      // fallback：用 v4 整顆按鈕（會整個轉）
      this.btnSpin = this.add.image(L.spinBtnX, L.spinBtnY, 'btn_spin')
        .setDisplaySize(L.spinBtnSize, L.spinBtnSize).setDepth(155)
        .setInteractive({ useHandCursor: true });
      this.btnSpin.on('pointerup', () => this.onSpin());
      this.btnSpinIcon = null;
    }
    // idle 呼吸光（只縮底、不旋轉）
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

    // BGM 自動播放（瀏覽器 autoplay policy：第一次互動才能播）
    const tryPlay = () => this.sound2.playBgm();
    tryPlay();
    this.input.once('pointerdown', tryPlay);
    window.addEventListener('keydown', tryPlay, { once: true });

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

    // v5/v6：取消「最高 51000 倍」獨立 banner（資訊統一在 scatter 條內顯示）
    this.fgMaxCap = this.add.rectangle(0, 0, 1, 1, 0x000000, 0).setVisible(false);
    this.fgMaxCapText = this.add.text(0, 0, '', { fontSize: '1px' }).setVisible(false);

    // 2) FREE GAMES 計數徽章（PC 在左漫畫上方，Mobile 在左下角）
    const fgW = isMobile ? 88  : 160;
    const fgH = isMobile ? 110 : 200;
    const fgX = isMobile ? 55  : L.fgCountX;
    const fgY = isMobile ? 600 : L.fgCountY;
    // v6：取消 FREE GAMES 紅金框底圖（醜），只留金屬字
    this.fgCountBg = this.add.rectangle(fgX, fgY, 1, 1, 0x000000, 0).setVisible(false);
    // 15 FREE GAMES 數字 — 用 0-9 金屬字組合
    const fgDigitW = isMobile ? 30 : 64;
    const fgDigitH = isMobile ? 40 : 90;
    this.fgCountNum = this.buildGoldNumber(fgX, fgY - (isMobile ? 8 : 16), '15', {
      digitW: fgDigitW, digitH: fgDigitH, gap: -8, depth: 134, origin: 0.5,
    });
    this.fgCountNum.setVisible(false);
    // 提供 setText 介面相容舊代碼
    this.fgCountNum.setText = (s) => this.updateGoldNumber(this.fgCountNum, s, {
      digitW: fgDigitW, digitH: fgDigitH, gap: -8, origin: 0.5,
    });
    // FREE GAMES 標籤 — 使用金屬字圖
    if (this.textures.exists('gold_free_games')) {
      this.fgCountLabel = this.add.image(fgX, fgY + (isMobile ? 22 : 55), 'gold_free_games')
        .setDisplaySize(isMobile ? 60 : 130, isMobile ? 30 : 65).setDepth(134).setVisible(false);
    } else {
      this.fgCountLabel = this.add.text(fgX, fgY + (isMobile ? 22 : 50), 'FREE\nGAMES', {
        fontFamily: 'Noto Sans TC, sans-serif', fontSize: isMobile ? '10px' : '16px', fontStyle: '900',
        color: '#ffe55f', stroke: '#3a0e0a', strokeThickness: 2, resolution: 2,
        align: 'center',
      }).setOrigin(0.5).setDepth(134).setVisible(false);
    }

    // 3) 累計倍數圓徽（PC 在右漫畫上方，Mobile 在右下角）
    const multSize = isMobile ? 100 : 180;
    const multX = isMobile ? 485 : L.multBadgeX;
    const multY = isMobile ? 600 : L.multBadgeY;
    const multBadgeKey = this.textures.exists('v6_badge_mult') ? 'v6_badge_mult' : 'ui_badge_mult';
    this.fgMultBg = this.add.image(multX, multY, multBadgeKey)
      .setDisplaySize(multSize, multSize).setDepth(133).setVisible(false);
    this.fgMultText = this.add.text(multX, multY - (isMobile ? 4 : 8), 'x1', {
      fontFamily: 'Noto Serif TC, serif', fontSize: isMobile ? '32px' : '60px', fontStyle: '900',
      color: '#fff8d0', stroke: '#7f1f1b', strokeThickness: 5, resolution: 2,
    }).setOrigin(0.5).setDepth(134).setVisible(false);
    // v6：累計倍數不再寫字標籤，圓徽中央 x 倍數就夠了
    this.fgMultLabel = this.add.text(multX, multY + 9999, '', {
      fontFamily: 'Noto Sans TC, sans-serif', fontSize: isMobile ? '10px' : '14px', fontStyle: '900',
      color: '#ffe55f', stroke: '#3a0e0a', strokeThickness: 2, resolution: 2,
    }).setOrigin(0.5).setDepth(134).setVisible(false);

    // 收集統一控制（v6：舊 fgCountBg/Num/Label 不再顯示、改用 fgBigNum + fgBigLabel）
    this.fgHudElements = [
      this.fgMaxCap, this.fgMaxCapText,
      this.fgMultBg, this.fgMultText, this.fgMultLabel,
    ];
    // 永久隱藏舊的 FREE GAMES 計數元件（避免和大金屬字重疊）
    if (this.fgCountBg) this.fgCountBg.setVisible(false);
    if (this.fgCountNum) this.fgCountNum.setVisible(false);
    if (this.fgCountLabel) this.fgCountLabel.setVisible(false);
  }

  // 顯示／隱藏 Free Game HUD
  showFreeGameHUD(visible) {
    if (!this.fgHudElements) return;
    this.fgHudElements.forEach(el => el?.setVisible(visible));
    // v6：大金屬字 15 FREE GAMES 與 購買特色按鈕互斥
    if (this.fgBigNum) this.fgBigNum.setVisible(visible);
    if (this.fgBigLabel) this.fgBigLabel.setVisible(visible);
    // base game 顯示購買特色，free game 隱藏
    const buyVis = !visible;
    if (this.btnBuyFeatureBg) this.btnBuyFeatureBg.setVisible(buyVis);
    if (this.btnBuyFeatureTxt1) this.btnBuyFeatureTxt1.setVisible(buyVis);
    if (this.btnBuyFeatureTxt2) this.btnBuyFeatureTxt2.setVisible(buyVis);
  }

  // 更新數值
  updateFreeGameHUD(remaining, multTotal) {
    if (this.fgCountNum) this.fgCountNum.setText(String(remaining));
    if (this.fgMultText) this.fgMultText.setText(`x${multTotal}`);
    // v6：更新大金屬字 15 FREE GAMES 的數字
    if (this.fgBigNum && this.fgBigNum.removeAll) {
      this.updateGoldNumber(this.fgBigNum, String(remaining), {
        digitW: 70, digitH: 100, gap: -10, origin: 0.5,
      });
    }
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
    this.storyPanelLocks = [];
    this.L.storyPanels.forEach((p, i) => {
      // 底圖 manga_page_full 已提供連體黑邊，這裡只放圖內容（無額外框）
      const frame = null;
      this.storyPanelFrames.push(frame);

      // 圖（若 texture 不存在則用空 rect）
      if (this.textures.exists(p.src)) {
        const img = this.add.image(p.cx, p.cy, p.src).setDisplaySize(p.w, p.h).setDepth(12);
        const revealed = i < this.revealedCount;
        const fx = img.preFX?.addColorMatrix();
        if (fx) fx.grayscale(revealed ? 0 : 0.85);
        img.setAlpha(revealed ? 1 : 0.55);
        this.storyPanelImgs.push(img);
        this.storyPanelFXs.push(fx);
        // 鎖 icon（未揭時可見、揭開後隱藏）
        const lock = this.add.text(p.cx, p.cy, '🔒', { fontSize: '40px' })
          .setOrigin(0.5).setDepth(13).setAlpha(revealed ? 0 : 0.55);
        this.storyPanelLocks.push(lock);
      } else {
        // fallback：用標籤文字
        const t = this.add.text(p.cx, p.cy, p.label || '?', {
          fontFamily: 'Noto Serif TC, serif', fontSize: '24px', color: '#8a6a3a',
        }).setOrigin(0.5).setDepth(12);
        this.storyPanelImgs.push(t);
        this.storyPanelFXs.push(null);
        this.storyPanelLocks.push(null);
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

  // v6：每 N 轉切換故事頁面（20 頁循環），6 格依序 L1→R1→L2→R2→L3→R3 fade-in
  advanceTopStoryPanels() {
    if (!this.chapterBg) return;
    this._topStorySpins = (this._topStorySpins ?? 0) + 1;
    const SPINS_PER_PAGE = 8; // 每頁 8 轉
    if (this._topStorySpins % SPINS_PER_PAGE !== 0) return;

    this._currentPageIdx = ((this._currentPageIdx ?? 0) + 1) % 20;
    const pageNum = String(this._currentPageIdx + 1).padStart(2, '0');
    const newKey = `v6_page_${pageNum}`;
    if (!this.textures.exists(newKey)) return;

    // 1) 6 個故事格瞬間覆蓋黑色
    const masks = this._storyPanelMasks || [];
    masks.forEach(m => m.setAlpha(1));

    // 2) 切換背景圖
    this.chapterBg.setTexture(newKey).setDisplaySize(this.L.W, this.L.H - 60);

    // 3) 6 格依序 fade-out（揭開新故事）— L1, R1, L2, R2, L3, R3
    const order = [0, 1, 2, 3, 4, 5]; // 已按 L1,R1,L2,R2,L3,R3 排列
    order.forEach((idx, i) => {
      this.time.delayedCall(i * 220, () => {
        if (masks[idx]) {
          this.tweens.add({ targets: masks[idx], alpha: 0, duration: 350, ease: 'Cubic.easeOut' });
        }
      });
    });

    // 章節提示
    const chapterMap = ['章一 起兵', '章二 鴻門', '章三 彭城', '章四 烏江'];
    const chapter = chapterMap[Math.floor(this._currentPageIdx / 5)];
    const subPage = (this._currentPageIdx % 5) + 1;
    this.flashText?.(`${chapter} P${subPage}`);
  }

  // 取出 0-9 / 逗號 / 小數點的金屬字 texture key
  _goldDigitKey(ch) {
    if (ch === ',') return 'gold_comma';
    if (ch === '.') return 'gold_dot';
    if (ch >= '0' && ch <= '9') return `gold_d${ch}`;
    return null;
  }

  // 用金屬字組合一個數字字串（回 container）
  buildGoldNumber(x, y, text, opts = {}) {
    const digitW = opts.digitW ?? 28;
    const digitH = opts.digitH ?? 40;
    const gap    = opts.gap ?? -4;        // 字間距（可負數讓字緊靠）
    const depth  = opts.depth ?? 200;
    const origin = opts.origin ?? 0.5;    // 0=左、0.5=置中、1=右
    const str = String(text);
    const cont = this.add.container(x, y).setDepth(depth);
    // 先計算總寬
    const totalW = str.length * digitW + (str.length - 1) * gap;
    let cx = -totalW * origin + digitW / 2;
    for (const ch of str) {
      const key = this._goldDigitKey(ch);
      if (key && this.textures.exists(key)) {
        const img = this.add.image(cx, 0, key).setDisplaySize(digitW, digitH);
        cont.add(img);
      }
      cx += digitW + gap;
    }
    return cont;
  }
  // 更新金屬字 container 的內容
  updateGoldNumber(cont, text, opts = {}) {
    if (!cont) return;
    cont.removeAll(true);
    const digitW = opts.digitW ?? 28;
    const digitH = opts.digitH ?? 40;
    const gap    = opts.gap ?? -4;
    const origin = opts.origin ?? 0.5;
    const str = String(text);
    const totalW = str.length * digitW + (str.length - 1) * gap;
    let cx = -totalW * origin + digitW / 2;
    for (const ch of str) {
      const key = this._goldDigitKey(ch);
      if (key && this.textures.exists(key)) {
        const img = this.add.image(cx, 0, key).setDisplaySize(digitW, digitH);
        cont.add(img);
      }
      cx += digitW + gap;
    }
  }

  // 每次 spin 結束後呼叫一次：推進進度，若該揭新格就揭
  advanceComicProgress() {
    // v4：先推進上方雙漫畫格
    this.advanceTopStoryPanels();
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

  // 把某格從灰階+半透明 → 全色（含閃光提示 + 鎖頭淡出）
  revealStoryPanel(idx) {
    const fx = this.storyPanelFXs[idx];
    const frame = this.storyPanelFrames[idx];
    const img = this.storyPanelImgs[idx];
    const lock = this.storyPanelLocks[idx];
    if (!img) return;
    // 框瞬間發光
    if (frame) {
      this.tweens.add({
        targets: frame, scale: { from: 1, to: 1.08 },
        yoyo: true, repeat: 2, duration: 200,
      });
      frame.setStrokeStyle(8, 0xf5d27a);
      this.time.delayedCall(900, () => frame.setStrokeStyle(8, 0x14110f));
    }
    // 圖片 alpha 從 0.55 → 1
    this.tweens.add({
      targets: img, alpha: 1, duration: 1500, ease: 'Cubic.easeInOut',
    });
    // grayscale 0.85 → 0
    if (fx) {
      this.tweens.addCounter({
        from: 0.85, to: 0, duration: 1500, ease: 'Cubic.easeInOut',
        onUpdate: (tw, target) => fx.grayscale(target.value),
      });
    }
    // 鎖頭淡出
    if (lock) {
      this.tweens.add({
        targets: lock, alpha: 0, duration: 800, ease: 'Cubic.easeIn',
      });
    }
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

    // 將整組音量元件收集成 array、預設隱藏，由右上小按鈕展開
    this._volPanelObjs = [];
    const trackObj = (o) => { this._volPanelObjs.push(o); return o; };

    // 底板
    trackObj(this.add.rectangle(baseX + panelW/2, baseY + panelH/2, panelW, panelH, 0x0a0604, 0.92)
      .setStrokeStyle(2, 0xd4a54a).setDepth(950));
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
      const g = trackObj(this.add.graphics({ x, y }).setDepth(953));
      drawIcon(g, initMuted);
      // 命中區
      const hit = trackObj(this.add.circle(x, y, 14, 0xffffff, 0)
        .setDepth(954).setInteractive({ useHandCursor: true }));
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
      trackObj(this.add.text(baseX + 38, y, label, labelStyle(13, '#ffe55f')).setOrigin(0, 0.5).setDepth(951));
      const trackX = baseX + 92;
      const trackW = 150;
      const track = trackObj(this.add.rectangle(trackX, y, trackW, 6, 0x3a2418, 1).setOrigin(0, 0.5).setDepth(951)
        .setInteractive({ useHandCursor: true }));
      const fill = trackObj(this.add.rectangle(trackX, y, trackW * initVol, 6, 0xf5d27a, 1).setOrigin(0, 0.5).setDepth(952));
      const knob = trackObj(this.add.circle(trackX + trackW * initVol, y, 8, 0xfff8d0).setDepth(953)
        .setStrokeStyle(2, 0x7f1f1b).setInteractive({ useHandCursor: true, draggable: true }));
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

    // === 預設隱藏整組音量介面 ===
    this._volPanelVisible = false;
    this._setVolPanelVisible = (v) => {
      this._volPanelVisible = v;
      this._volPanelObjs.forEach(o => o.setVisible(v));
    };
    this._setVolPanelVisible(false);

    // === 右上角開關按鈕（v6 漫畫風小圓鈕 icon、和 jackpot 條同高）===
    const toggleX = this.L.W - 40;
    const toggleY = 30;
    const toggleSize = 56;
    // 若有 v6 圖則用，否則 fallback 到 Graphics
    let toggleImg, glowRing;
    if (this.textures.exists('v6_btn_sound')) {
      toggleImg = this.add.image(toggleX, toggleY, 'v6_btn_sound')
        .setDisplaySize(toggleSize, toggleSize).setDepth(960);
      glowRing = this.add.circle(toggleX, toggleY, toggleSize/2 + 4, 0xfff8d0, 0)
        .setStrokeStyle(3, 0xfff8d0, 1).setDepth(959).setVisible(false);
    } else {
      const tg = this.add.graphics({ x: toggleX, y: toggleY }).setDepth(960);
      tg.fillStyle(0x1a0e08, 0.92);
      tg.fillCircle(0, 0, toggleSize/2);
      tg.lineStyle(2, 0xd4a54a, 1);
      tg.strokeCircle(0, 0, toggleSize/2);
    }
    const updateGlow = () => {
      if (glowRing) glowRing.setVisible(!!this._volPanelVisible);
    };
    updateGlow();
    const toggleHit = this.add.circle(toggleX, toggleY, toggleSize/2 + 4, 0xffffff, 0)
      .setDepth(961).setInteractive({ useHandCursor: true });
    toggleHit.on('pointerup', () => {
      this._setVolPanelVisible(!this._volPanelVisible);
      updateGlow();
    });
    // 點面板外自動收合
    this.input.on('pointerdown', (p) => {
      if (!this._volPanelVisible) return;
      const inBtn = Phaser.Math.Distance.Between(p.x, p.y, toggleX, toggleY) <= toggleSize/2 + 6;
      const inPanel = p.x >= baseX && p.x <= baseX + panelW && p.y >= baseY && p.y <= baseY + panelH;
      if (!inBtn && !inPanel) {
        this._setVolPanelVisible(false);
        updateGlow();
      }
    });
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
    this.txtBet.setText(String(this.bet));
    this._updateBetKnob?.();
    // v5：HUD 上的贏分文字（與上方資訊條的 txtWin 分離）
    if (this.txtWinHud) {
      this.txtWinHud.setText(this.lastWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
    if (this.lastWin > 0) {
      this.txtWin.setText(`本局贏分　${this.lastWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      this.infoText.setAlpha(0);
    } else {
      this.txtWin.setText('');
      this.infoText.setAlpha(1);
    }
    if (this.inFreeGame) {
      this.txtFG.setText(`免費遊戲 ${this.freeSpinsLeft}　累計 ${this.fgTotalWin.toFixed(2)}`);
      this.infoText.setVisible(false);
      this.txtFG.setVisible(true);
    } else {
      this.txtFG.setText('');
      this.txtFG.setVisible(false);
      this.infoText.setVisible(true);
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
    // 自動按鈕視覺反饋（金色脈衝光環）
    if (this.btnAutoHud) {
      this.btnAutoHud.setTint(this.autoMode ? 0xffe55f : 0xffffff);
    }
    if (this.btnAutoRing) {
      this.btnAutoRing.setVisible(this.autoMode);
      if (this._autoRingTween) { this._autoRingTween.stop(); this._autoRingTween = null; }
      if (this.autoMode) {
        // 啟動：金色光環脈衝 + 旋轉
        this.btnAutoRing.setAlpha(1).setScale(1);
        this._autoRingTween = this.tweens.add({
          targets: this.btnAutoRing,
          scale: { from: 1, to: 1.25 },
          alpha: { from: 1, to: 0.3 },
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
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
    // v5：只旋轉 icon，按鈕底不轉
    const rotateTarget = this.btnSpinIcon ?? this.btnSpin;
    this.spinRotateTween = this.tweens.add({
      targets: rotateTarget, angle: '+=360',
      duration: 700, repeat: -1, ease: 'Linear',
    });
    this.refreshHUD();

    await this.spinAnimation();
    await this.runTumbleCycle();

    // 停止旋轉、回到原角度（只回 icon）
    this.spinRotateTween?.stop();
    this.spinRotateTween = null;
    const resetTarget = this.btnSpinIcon ?? this.btnSpin;
    this.tweens.add({ targets: resetTarget, angle: 0, duration: 280, ease: 'Back.easeOut' });

    const scatterCount = this.countScatters();
    if (scatterCount >= 2) {
      this.sound2?.playSfx('scatter_in');
      // 漫畫戲劇 burst：scatter 多顆時
      if (scatterCount >= 3) {
        this.showMangaOverlay('mo_scatter', { text: `${scatterCount}`, textX: -300, textY: -310, holdMs: 900 });
      }
    }
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
      const prevTotal = this.fgTotalWin;
      this.fgTotalWin += this.lastWin;
      this.updateFreeGameHUD(Math.max(0, this.freeSpinsLeft), this.fgMultSum || 0);
      // v6：累計超過 bet*100 門檻時觸發累計連發 overlay
      const milestone = this.bet * 100;
      if (Math.floor(prevTotal / milestone) < Math.floor(this.fgTotalWin / milestone) && this.lastWin > 0) {
        const totalStr = this.fgTotalWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        this.showMangaOverlay('mo_fg_total', { text: totalStr, textY: 50, holdMs: 1500 });
      }
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
      // 6 直行各自的時間差（毫秒）— 由左至右逐欄落定
      const COL_DELAY = 90;        // 每欄延遲
      const FALL_OUT_MS = 220;     // 舊符號掉出時長
      const SETTLE_MS = 700;       // 新符號落定後等待

      // 1) 舊符號逐欄掉出
      for (let c = 0; c < COLS; c++) {
        const colSymbols = [];
        for (let r = 0; r < ROWS; r++) {
          if (this.grid[c][r]) { colSymbols.push(this.grid[c][r]); this.grid[c][r] = null; }
        }
        if (colSymbols.length) {
          this.tweens.add({
            targets: colSymbols,
            y: REEL_CY + REEL_H, alpha: 0,
            duration: FALL_OUT_MS, ease: 'Cubic.easeIn',
            delay: c * COL_DELAY,
            onComplete: () => colSymbols.forEach(s => s.destroy()),
          });
        }
      }

      // 清掉舊倍數球
      this.multOrbs.forEach(o => o.container.destroy());
      this.multOrbs = [];

      // 2) 新符號逐欄落入（每欄相對前一欄延遲 COL_DELAY ms）
      const lastColEndTime = (COLS - 1) * COL_DELAY + FALL_OUT_MS + 40;
      for (let c = 0; c < COLS; c++) {
        this.time.delayedCall(c * COL_DELAY + FALL_OUT_MS + 40, () => {
          for (let r = 0; r < ROWS; r++) {
            this.placeSymbol(c, r, pickSymbol(true), true);
          }
        });
      }

      // 最後一欄落定後再等 SETTLE_MS 才 resolve
      this.time.delayedCall(lastColEndTime + SETTLE_MS, resolve);
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

    if (finalWin >= this.bet * 3) this.bigWin(finalWin);   // dev 測試：降低門檻 20→3
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
    // 高倍數時觸發 manga 戲劇 burst
    if (value >= 50) {
      this.showMangaOverlay('mo_mult', { text: `x${value}`, textY: -50, holdMs: 700 });
    }
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
    // v6：切到虞姬 Free Game 背景
    if (this.chapterBg && this.textures.exists('v6_bg_freegame')) {
      this._savedChapterTexture = this.chapterBg.texture.key;
      this.tweens.add({
        targets: this.chapterBg, alpha: 0, duration: 400,
        onComplete: () => {
          this.chapterBg.setTexture('v6_bg_freegame').setDisplaySize(this.L.W, this.L.H - 60);
          this.tweens.add({ targets: this.chapterBg, alpha: 1, duration: 400 });
        },
      });
    }
    this.fgTotalWin = 0;
    this.fgMultSum = 0;
    this.sound2?.playSfx('trans');
    this.sound2?.playSfx('fg_in');

    // B&W manga 戲劇 burst：鳳鳴九霄!!
    this.showMangaOverlay('mo_fg_phoenix', { holdMs: 1800 });
    await this.delay(2400);

    // 顯示 Free Game HUD
    this.updateFreeGameHUD(this.freeSpinsLeft, 0);
    this.showFreeGameHUD(true);

    // 隱藏漫畫面板（FreeGame 期間用虞姬畫面）— 用 filter 過濾 null
    const comicTargets = [this.comicLeft, this.comicRight, this.comicChapterText,
      ...(this.comicLeftOverlays || []), ...(this.comicRightOverlays || [])].filter(Boolean);
    if (comicTargets.length) {
      this.tweens.add({ targets: comicTargets, alpha: 0, duration: 400 });
    }

    // ===== 過場：暗幕 =====
    const dim = this.add.rectangle(L.W/2, L.H/2, L.W, L.H, 0x000000, 0).setDepth(900);
    this.tweens.add({ targets: dim, alpha: 0.78, duration: 500 });

    // v6：彩色鳳凰廢案、不在 Free Game 過場顯示（只用 mo_fg_phoenix 漫畫 burst）
    this.fgPhoenix.setVisible(false);
    this.fgPhoenixTween = null;

    // v6：彩色虞姬廢案、不在 Free Game 過場中央顯示（只用 mo_fg_phoenix 漫畫 burst）
    const heroYuji = { destroy: () => {}, setAlpha: () => {}, setScale: () => {} };

    // v6：彩色鳳鳴九霄 logo 廢案、不顯示（用 mo_fg_phoenix B&W 漫畫 burst 替代）
    this.fengmingLogo.setVisible(false);

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

    // v6：彩色虞姬廢案，不再兩側分身飛出（章節 bg 已有虞姬漫畫格）
    this.yujiLeft.setVisible(false);
    this.yujiRight.setVisible(false);
    // 中央 hero 已廢案，只 fade 項羽劉邦立繪
    this.tweens.add({ targets: [this.chuChar, this.hanChar], alpha: 0, duration: 500 });

    // v6：彩色鳳凰廢案，跳過縮回動畫

    // 暗幕退場、背景換色
    this.tweens.add({
      targets: dim, alpha: 0, duration: 700,
      onComplete: () => dim.destroy(),
    });
    // v6：bg 是 Rectangle，用 fillColor 不用 setTint
    if (this.bg.setFillStyle) this.bg.setFillStyle(0x553a78);

    await this.delay(900);

    // v6：自動觸發第一次 free spin（不管從 scatter 或 buy feature 進來）
    if (this.inFreeGame && this.freeSpinsLeft > 0 && !this.spinning) {
      this.onSpin();
    }
  }

  async exitFreeGame() {
    this.sound2?.playSfx('fg_out');
    // bg 是 Rectangle 不用 clearTint
    if (this.bg.setFillStyle) this.bg.setFillStyle(0x111111);
    // v6：先 reset inFreeGame（避免阻擋 buy feature 重新點擊）
    const totalWin = this.fgTotalWin;
    this.inFreeGame = false;

    // v6：戰罷凱旋戲劇 overlay + 金屬字金額
    const totalWinStr = totalWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    this.showMangaOverlay('mo_fg_end', { text: totalWinStr, textY: 0, holdMs: 2500, useGoldDigits: true });
    this.sound2?.playSfx('fireworks', { volume: 0.6 });
    await this.delay(2800);

    // 隱藏 Free Game HUD
    this.showFreeGameHUD(false);

    // v6：切回原章節 bg
    if (this.chapterBg && this._savedChapterTexture && this.textures.exists(this._savedChapterTexture)) {
      const restoreKey = this._savedChapterTexture;
      this.tweens.add({
        targets: this.chapterBg, alpha: 0, duration: 400,
        onComplete: () => {
          this.chapterBg.setTexture(restoreKey).setDisplaySize(this.L.W, this.L.H);
          this.tweens.add({ targets: this.chapterBg, alpha: 1, duration: 400 });
        },
      });
    }

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
    // inFreeGame 已在開頭 reset，這裡不重複
    await this.delay(1500);
  }

  // ----------------------------------------------------------
  // 飄字 / Big Win
  // ----------------------------------------------------------
  // ----------------------------------------------------------
  // B&W manga overlay 戲劇 burst（關鍵時刻 1.5s 全屏動態彈出）
  // ----------------------------------------------------------
  showMangaOverlay(key, opts = {}) {
    if (!this.textures.exists(key)) return;
    const L = this.L;
    const cont = this.add.container(L.W/2, L.H/2).setDepth(2500);
    // 暗背景
    const dim = this.add.rectangle(0, 0, L.W * 1.5, L.H * 1.5, 0x000000, 0).setAlpha(0);
    // 圖片（從 0.3 縮放彈入）
    const size = Math.min(L.W * 0.6, L.H * 0.7);
    const img = this.add.image(0, 0, key).setDisplaySize(size, size).setScale(0.3).setAlpha(0);
    // 可選疊加文字（如倍數值、金額）— 金額用金屬字數字
    let extra = null;
    if (opts.text) {
      if (opts.useGoldDigits) {
        extra = this.buildGoldNumber(opts.textX ?? 0, opts.textY ?? 100, opts.text, {
          digitW: 60, digitH: 90, gap: -8, depth: 2510, origin: 0.5,
        });
        extra.setAlpha(0);
      } else {
        extra = this.add.text(opts.textX ?? 0, opts.textY ?? 100, opts.text, {
          fontFamily: 'Noto Serif TC, serif', fontSize: '64px', fontStyle: '900',
          color: '#fff8d0', stroke: '#000000', strokeThickness: 8, resolution: 2,
        }).setOrigin(0.5).setAlpha(0);
      }
    }
    cont.add([dim, img]);
    if (extra) cont.add(extra);

    // 動畫：暗化 → 圖爆入 → 停留 → 整體淡出
    this.tweens.add({ targets: dim, alpha: 0.6, duration: 250 });
    this.tweens.add({
      targets: img, scale: 1.0, alpha: 1, duration: 350, ease: 'Back.easeOut',
    });
    if (extra) this.tweens.add({ targets: extra, alpha: 1, duration: 400, delay: 350 });

    const holdMs = opts.holdMs ?? 1100;
    this.time.delayedCall(350 + holdMs, () => {
      this.tweens.add({
        targets: cont, alpha: 0, scale: 1.15, duration: 500, ease: 'Cubic.easeIn',
        onComplete: () => cont.destroy(),
      });
    });
  }

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
    // B&W manga 戲劇 burst：大獎降臨!!
    this.showMangaOverlay('mo_bigwin', {
      text: amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      textY: 80, holdMs: 1500,
    });

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
    // v4：BIG WIN 移到上方 splash 區（取代楚漢爭霸標題位置）
    const cy = isMobile ? L.H * 0.18 : (L.splashTopY ?? 130);
    const cont = this.add.container(L.W/2, cy).setDepth(2000);

    // 暗化背景
    const dim = this.add.rectangle(L.W/2 - L.W/2, L.H/2 - cy, L.W, L.H, 0x000000, 0).setAlpha(0);
    // BIG WIN 金屬字圖
    let title;
    if (this.textures.exists('gold_big_win')) {
      title = this.add.image(0, isMobile ? -36 : -80, 'gold_big_win')
        .setDisplaySize(isMobile ? 360 : 680, isMobile ? 140 : 260)
        .setAlpha(0).setScale(0.3);
    } else {
      const titleSize = isMobile ? 56 : 110;
      title = this.add.text(0, isMobile ? -36 : -60, 'BIG WIN!!', {
        fontFamily: 'Noto Serif TC, serif', fontSize: `${titleSize}px`, fontStyle: '900',
        color: '#ffdf55', stroke: '#000000', strokeThickness: 10, resolution: 2,
      }).setOrigin(0.5).setAlpha(0).setScale(0.3);
    }
    // 獎金文字
    const fontSize = isMobile ? 44 : 100;
    const txt = this.add.text(0, isMobile ? 30 : 60, amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), {
      fontFamily: 'Noto Serif TC, serif', fontSize: `${fontSize}px`, fontStyle: '900',
      color: '#fff8d0', stroke: '#7f1f1b', strokeThickness: 8, resolution: 2,
    }).setOrigin(0.5).setAlpha(0);
    const banner = title; // 沿用變數名給後續 tween

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
  type: Phaser.WEBGL,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0a0604',
  // 最高品質渲染：抗鋸齒 + 線性過濾 + 高 DPI + 不取整 + mipmap
  antialias: true,
  antialiasGL: true,
  roundPixels: false,
  pixelArt: false,
  // 全圖預設 LINEAR filter（去除像素硬邊、避免縮放鋸齒）
  resolution: Math.max(1, window.devicePixelRatio || 1),
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false,
    mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    transparent: false,
    desynchronized: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloadScene, MainScene],
  callbacks: {
    postBoot: (g) => {
      // 確保全 game 的 texture filter 為 LINEAR（高品質縮放）
      try {
        g.textures.list && Object.values(g.textures.list).forEach(t => {
          if (t && t.source) t.source.forEach(s => { try { s.setFilter && s.setFilter(Phaser.Textures.FilterMode.LINEAR); } catch (e) {} });
        });
      } catch (e) {}
    },
  },
});
window.__game = game;
