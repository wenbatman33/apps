// Stack 疊疊樂 — 等角立體 2.5D 疊塔遊戲（純程式繪製，無圖檔；介面為簡體中文）
// 方塊為立體箱（頂面＋左右側面陰影），每層交替沿 X / Z 兩條水平軸滑動
// 點擊鎖定 → 溢出切除掉落 → 該軸變窄 → 相機上移 → 顏色隨高度循環

const W = 450, H = 800;
const CX = 225, CY = 470;     // 等角投影螢幕原點
const THICK = 24;             // 每塊在螢幕上的立體厚度（px）
const F0 = 116;               // 初始方塊平面邊長（plan px，正方）
const PERFECT = 5;            // 完美對齊容許誤差（plan px）
const TRAVEL = 118;           // 移動方塊在該軸上的擺幅
// 三種難度：速度與背景氛圍皆不同（開場選單選擇）
// tint/topK/botK 決定背景漸層朝哪個顏色混、混多少（輕鬆最亮、挑戰偏暗夜）
const DIFFS = {
  easy: {
    key: 'easy', name: '轻松', sub: '慢速・明亮清晨・木质音色',
    speedBase: 105, speedPer: 9, speedMax: 250,
    tint: 0xffffff, topK: 0.72, botK: 0.42, sfxTheme: 'wood',
    speedLabel: '速度 ●○○', cardText: '#5a5264', sample: 2,
  },
  normal: {
    key: 'normal', name: '经典', sub: '经典手感・暖色・清脆音色',
    speedBase: 150, speedPer: 16, speedMax: 380,
    tint: 0xffffff, topK: 0.60, botK: 0.30, sfxTheme: 'classic',
    speedLabel: '速度 ●●○', cardText: '#ffffff', sample: 7,
  },
  hard: {
    key: 'hard', name: '挑战', sub: '高速・深夜霓虹・电子音色',
    speedBase: 215, speedPer: 24, speedMax: 540,
    tint: 0x120d24, topK: 0.70, botK: 0.32, sfxTheme: 'synth',
    speedLabel: '速度 ●●●', cardText: '#ffffff', sample: 13,
  },
};

// 各難度分開記錄最高分；經典難度沿用舊版 stack_best 存檔
function loadBest(key) {
  let v = parseInt(localStorage.getItem('stack_best_' + key) || '0', 10) || 0;
  if (key === 'normal' && !v) {
    v = parseInt(localStorage.getItem('stack_best') || '0', 10) || 0;
  }
  return v;
}
const CAM_SPEED = 150;        // 相機等速上升（px/s），連續無瞬跳
// 內部渲染倍率：版面/玩法數值不變，只把畫布與繪製放大 RES 倍，
// 讓斜向移動的整數像素步進 < 1 裝置像素，消除交界處抖動（低解析放大鋸齒）
const RES = 3;

// RGB sin 循環配色：相位 0/2/4、頻率 0.3、較飽和（非粉彩）
function blockColor(i) {
  const r = Math.round(Math.sin(0.3 * i + 0) * 85 + 150);
  const g = Math.round(Math.sin(0.3 * i + 2) * 85 + 150);
  const b = Math.round(Math.sin(0.3 * i + 4) * 85 + 150);
  return (r << 16) | (g << 8) | b;
}
function shade(c, f) {
  const r = Math.min(255, ((c >> 16) & 0xff) * f);
  const g = Math.min(255, ((c >> 8) & 0xff) * f);
  const b = Math.min(255, (c & 0xff) * f);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
function bgColor(i, f) { return shade(blockColor(i), f); }
// c 朝 t 色混合 k（0..1）
function mix(c, t, k) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const R = (t >> 16) & 255, G = (t >> 8) & 255, B = t & 255;
  const m = (a, bb) => Math.round(a + (bb - a) * k);
  return (m(r, R) << 16) | (m(g, G) << 8) | m(b, B);
}

// ── 高質感程序化音效引擎（WebAudio 純合成，無音檔）──
// 母線：master → 動態壓縮器 → 喇叭；另設共享殘響 bus（噪音脈衝卷積）增加空間感
// 每個音效由「琴體音＋泛音層＋攻擊噪聲」層疊而成；三種難度各一套音色主題
const Sfx = {
  init(ctx) {
    if (!ctx || this.ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    comp.attack.value = 0.003; comp.release.value = 0.25;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    // 殘響脈衝：立體聲白噪音指數衰減
    const sr = ctx.sampleRate, len = Math.floor(sr * 1.6);
    const buf = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
    }
    const verb = ctx.createConvolver();
    verb.buffer = buf;
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    this.verbBus = ctx.createGain();
    this.verbBus.connect(verb);
    verb.connect(wet);
    wet.connect(this.master);
  },
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  out(node, verbSend) {
    node.connect(this.master);
    if (verbSend > 0) {
      const s = this.ctx.createGain();
      s.gain.value = verbSend;
      node.connect(s);
      s.connect(this.verbBus);
    }
  },
  // 振盪器音：{f, f1 滑音終點, dur, type, peak, when, att, detune, lpf:{f0,f1,q} 濾波掃頻, verb 殘響量}
  tone(o) {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime + (o.when || 0);
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t0 + o.dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.peak, t0 + (o.att || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g);
    let tail = g;
    if (o.lpf) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(o.lpf.f0, t0);
      if (o.lpf.f1) f.frequency.exponentialRampToValueAtTime(o.lpf.f1, t0 + o.dur);
      f.Q.value = o.lpf.q || 0.8;
      g.connect(f);
      tail = f;
    }
    this.out(tail, o.verb || 0);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  },
  // 濾波噪聲：{dur, peak, when, ftype, freq, f1 掃頻終點, q, att, verb}
  noise(o) {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime + (o.when || 0);
    const len = Math.floor(ctx.sampleRate * o.dur) + 1;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = o.ftype || 'lowpass';
    f.frequency.setValueAtTime(o.freq, t0);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + o.dur);
    f.Q.value = o.q || 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.peak, t0 + (o.att || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f);
    f.connect(g);
    this.out(g, o.verb || 0);
    src.start(t0);
    src.stop(t0 + o.dur + 0.03);
  },
  // 完美連擊音高：七聲大調隨連擊爬升（各主題共用）
  noteFreq(combo) {
    const major = [0, 2, 4, 5, 7, 9, 11];
    const n = Math.max(0, combo - 1);
    const semi = major[n % 7] + 12 * Math.floor(n / 7);
    return 261.6 * Math.pow(2, semi / 12);
  },
  // 選單點擊（主題無關）
  ui() {
    if (!this.ctx) return;
    this.resume();
    this.tone({ f: 740, f1: 880, dur: 0.09, peak: 0.2, verb: 0.2 });
    this.noise({ dur: 0.05, peak: 0.08, ftype: 'highpass', freq: 3000 });
  },
  play(theme, kind, combo) {
    if (!this.ctx || !this[theme]) return;
    this.resume();
    this[theme](kind, combo);
  },
  // ── 輕鬆：木質溫潤（馬林巴／拇指琴）──
  wood(kind, combo) {
    if (kind === 'place') {
      this.noise({ dur: 0.03, peak: 0.10, ftype: 'bandpass', freq: 1400, q: 1.2 });
      this.tone({ f: 208, f1: 196, dur: 0.20, peak: 0.34, verb: 0.15 });
      this.tone({ f: 780, dur: 0.06, peak: 0.09 });
    } else if (kind === 'slice') {
      this.noise({ dur: 0.09, peak: 0.14, ftype: 'lowpass', freq: 1100, f1: 500 });
      this.tone({ f: 150, f1: 92, dur: 0.14, peak: 0.22 });
    } else if (kind === 'perfect') {
      const f = this.noteFreq(combo);
      this.noise({ dur: 0.025, peak: 0.07, ftype: 'highpass', freq: 2600 });
      this.tone({ f, dur: 0.55, peak: 0.34, verb: 0.35 });
      this.tone({ f: f * 2, dur: 0.30, peak: 0.12, verb: 0.3 });
      this.tone({ f: f * 4.02, dur: 0.12, peak: 0.05 });
    } else if (kind === 'over') {
      [330, 262, 196].forEach((f, i) => {
        this.tone({ f, dur: 0.4, peak: 0.3, when: i * 0.17, verb: 0.35 });
        this.tone({ f: f * 2, dur: 0.22, peak: 0.08, when: i * 0.17, verb: 0.3 });
      });
    }
  },
  // ── 經典：清脆乾淨（三角波主音＋殘響打磨）──
  classic(kind, combo) {
    if (kind === 'place') {
      this.noise({ dur: 0.04, peak: 0.08, ftype: 'lowpass', freq: 700 });
      this.tone({ f: 185, f1: 148, dur: 0.13, peak: 0.34, verb: 0.12 });
      this.tone({ f: 116.5, dur: 0.11, peak: 0.2 });
    } else if (kind === 'slice') {
      this.noise({ dur: 0.16, peak: 0.16, ftype: 'bandpass', freq: 900, f1: 350, q: 0.9 });
      this.tone({ f: 150, f1: 82, dur: 0.16, peak: 0.24 });
    } else if (kind === 'perfect') {
      const f = this.noteFreq(combo);
      this.tone({ f, dur: 0.45, type: 'triangle', peak: 0.38, verb: 0.3 });
      this.tone({ f: f * 2, dur: 0.28, peak: 0.13, verb: 0.25 });
      this.tone({ f: f * 3, dur: 0.14, peak: 0.05 });
    } else if (kind === 'over') {
      this.tone({ f: 220, dur: 0.18, peak: 0.36, verb: 0.25 });
      this.tone({ f: 146.8, dur: 0.34, peak: 0.34, when: 0.13, verb: 0.25 });
      this.tone({ f: 98, dur: 0.5, peak: 0.3, when: 0.28, verb: 0.3 });
    }
  },
  // ── 挑戰：電子霓虹（合成器 punch）──
  synth(kind, combo) {
    if (kind === 'place') {
      this.noise({ dur: 0.05, peak: 0.12, ftype: 'highpass', freq: 2200 });
      this.tone({ f: 120, f1: 50, dur: 0.20, type: 'sawtooth', peak: 0.30, att: 0.002, lpf: { f0: 900, f1: 200 }, verb: 0.1 });
      this.tone({ f: 55, dur: 0.16, peak: 0.22 });
    } else if (kind === 'slice') {
      this.tone({ f: 420, f1: 70, dur: 0.13, type: 'square', peak: 0.16, lpf: { f0: 2400, f1: 400 } });
      this.noise({ dur: 0.10, peak: 0.12, ftype: 'highpass', freq: 1500, f1: 4000 });
    } else if (kind === 'perfect') {
      const f = this.noteFreq(combo);
      this.tone({ f, dur: 0.34, type: 'sawtooth', peak: 0.16, lpf: { f0: 3600, f1: 500 }, verb: 0.3 });
      this.tone({ f, detune: 9, dur: 0.34, type: 'sawtooth', peak: 0.14, lpf: { f0: 3600, f1: 500 }, verb: 0.3 });
      this.tone({ f: f / 2, dur: 0.26, peak: 0.16 });
      this.tone({ f: f * 2, dur: 0.10, peak: 0.06, type: 'triangle' });
    } else if (kind === 'over') {
      this.tone({ f: 220, f1: 42, dur: 0.6, type: 'sawtooth', peak: 0.26, lpf: { f0: 1200, f1: 120 }, verb: 0.3 });
      this.tone({ f: 66, f1: 40, dur: 0.55, peak: 0.26 });
      this.noise({ dur: 0.5, peak: 0.08, ftype: 'lowpass', freq: 300, verb: 0.4 });
    }
  },
};

// 開場選單：選擇關卡難度（每張卡片以該難度的背景漸層做預覽）
class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }

  create() {
    // 背景：中性暖色漸層
    const base = blockColor(3);
    const bg = this.add.graphics();
    const t = mix(base, 0xffffff, 0.68), b = mix(base, 0xffffff, 0.34);
    bg.fillGradientStyle(t, t, b, b, 1);
    bg.fillRect(0, 0, W * RES, H * RES);

    // 星點粒子（與遊戲內一致的氛圍）
    this.gPart = this.add.graphics();
    this.parts = [];
    for (let i = 0; i < 26; i++) {
      this.parts.push({
        x: Math.random() * W * RES,
        y: Math.random() * H * RES,
        s: (2 + Math.random() * 5) * RES,
        spd: (6 + Math.random() * 16) * RES,
        ph: Math.random() * Math.PI * 2,
        tw: 0.8 + Math.random() * 1.6,
        a: 0.25 + Math.random() * 0.5,
      });
    }

    const font = '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    this.add.text(W * RES / 2, 110 * RES, '叠叠乐', {
      fontFamily: font, fontSize: `${62 * RES}px`, color: '#ffffff', fontStyle: '300',
    }).setOrigin(0.5).setShadow(0, 2 * RES, 'rgba(0,0,0,0.18)', 5 * RES);
    this.add.text(W * RES / 2, 158 * RES, 'S T A C K', {
      fontFamily: font, fontSize: `${20 * RES}px`, color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.8);

    this.add.text(W * RES / 2, 225 * RES, '选择关卡难度', {
      fontFamily: font, fontSize: `${22 * RES}px`, color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.9);

    ['easy', 'normal', 'hard'].forEach((k, i) => {
      this.makeCard(DIFFS[k], 320 + i * 150);
    });
  }

  makeCard(d, cy) {
    const cw = 350, ch = 122, x = (W - cw) / 2;
    const font = '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

    // 卡片底：用該難度的實際背景配方畫預覽漸層
    const sample = blockColor(d.sample);
    const top = mix(sample, d.tint, d.topK), bot = mix(sample, d.tint, d.botK);
    const g = this.add.graphics();
    g.fillGradientStyle(top, top, bot, bot, 1);
    g.fillRoundedRect(x * RES, (cy - ch / 2) * RES, cw * RES, ch * RES, 18 * RES);
    g.lineStyle(2 * RES, 0xffffff, 0.55);
    g.strokeRoundedRect(x * RES, (cy - ch / 2) * RES, cw * RES, ch * RES, 18 * RES);

    this.add.text((x + 26) * RES, (cy - 24) * RES, d.name, {
      fontFamily: font, fontSize: `${32 * RES}px`, color: d.cardText, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.add.text((x + 26) * RES, (cy + 22) * RES, d.sub, {
      fontFamily: font, fontSize: `${16 * RES}px`, color: d.cardText,
    }).setOrigin(0, 0.5).setAlpha(0.85);
    this.add.text((x + cw - 26) * RES, (cy - 24) * RES, d.speedLabel, {
      fontFamily: font, fontSize: `${17 * RES}px`, color: d.cardText,
    }).setOrigin(1, 0.5).setAlpha(0.95);
    this.add.text((x + cw - 26) * RES, (cy + 22) * RES, `最高 ${loadBest(d.key)}`, {
      fontFamily: font, fontSize: `${16 * RES}px`, color: d.cardText,
    }).setOrigin(1, 0.5).setAlpha(0.85);

    this.add.rectangle(W * RES / 2, cy * RES, cw * RES, ch * RES, 0, 0)
      .setInteractive({ useHandCursor: true })
      // 用 pointerup：場景切換後第一個 pointerdown 會被 Phaser 吞掉，up 不受影響
      .on('pointerup', () => {
        Sfx.init(this.sound && this.sound.context);
        Sfx.ui();
        this.scene.start('stack', { diff: d.key });
      });
  }

  update(_, dt) {
    const ds = dt / 1000;
    this.gPart.clear();
    const tn = this.time.now / 1000;
    for (const p of this.parts) {
      p.y -= p.spd * ds;
      if (p.y < -12) { p.y = H * RES + 12; p.x = Math.random() * W * RES; }
      const a = p.a * (0.35 + 0.65 * Math.abs(Math.sin(tn * p.tw + p.ph)));
      this.gPart.fillStyle(0xffffff, a);
      this.gPart.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
  }
}

class StackScene extends Phaser.Scene {
  constructor() { super('stack'); }

  init(data) {
    this.diff = DIFFS[(data && data.diff) || 'normal'];
  }

  create() {
    this.bg = this.add.graphics().setScrollFactor(0);
    this.gPart = this.add.graphics().setScrollFactor(0); // 閃爍小方塊星點
    this.gTower = this.add.graphics();  // 已放置的塔（重畫）
    this.gMove = this.add.graphics();   // 移動中的方塊（每幀重畫）
    this.gChip = this.add.graphics();   // 掉落的碎塊
    this.gFx = this.add.graphics();     // 完美對齊特效

    // 星點粒子：緩慢上飄、明滅閃爍
    this.parts = [];
    for (let i = 0; i < 34; i++) {
      this.parts.push({
        x: Math.random() * W * RES,
        y: Math.random() * H * RES,
        s: (2 + Math.random() * 5) * RES,
        spd: (6 + Math.random() * 16) * RES,
        ph: Math.random() * Math.PI * 2,
        tw: 0.8 + Math.random() * 1.6,
        a: 0.25 + Math.random() * 0.5,
      });
    }

    // 分數（大、細緻）
    this.scoreText = this.add.text(W * RES / 2, 150 * RES, '0', {
      fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: `${88 * RES}px`, color: '#ffffff', fontStyle: '300',
    }).setOrigin(0.5).setScrollFactor(0).setShadow(0, 2 * RES, 'rgba(0,0,0,0.18)', 5 * RES);

    // 皇冠 + 最高分
    this.crown = this.add.graphics().setScrollFactor(0);
    this.bestText = this.add.text(W * RES / 2 + 6 * RES, 232 * RES, '0', {
      fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: `${30 * RES}px`, color: '#ffffff',
    }).setOrigin(0, 0.5).setScrollFactor(0).setAlpha(0.92);
    this.best = loadBest(this.diff.key);

    // 左上返回選單、右上顯示目前難度
    this.add.text(18 * RES, 22 * RES, '‹ 菜单', {
      fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: `${20 * RES}px`, color: '#ffffff',
    }).setScrollFactor(0).setAlpha(0.85)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer, lx, ly, event) => {
        event.stopPropagation();
        this.scene.start('menu');
      });
    this.add.text((W - 18) * RES, 22 * RES, this.diff.name, {
      fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: `${20 * RES}px`, color: '#ffffff',
    }).setOrigin(1, 0).setScrollFactor(0).setAlpha(0.7);

    this.tipText = this.add.text(W * RES / 2, (H - 150) * RES, '点击放下方块', {
      fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: `${22 * RES}px`, color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0.85);

    this.input.on('pointerdown', () => this.onTap());
    this.input.keyboard.on('keydown-SPACE', () => this.onTap());

    this.resetGame();

    // 開發者模式音效測試面板：網址加 #dev 開啟（不影響正常玩家）
    if (location.hash.toLowerCase().includes('dev')) this.buildDevPanel();
  }

  buildDevPanel() {
    const ctxResume = () => {
      const c = this.sound && this.sound.context;
      if (c && c.state === 'suspended') c.resume();
    };
    const old = document.getElementById('sfx-dev-panel');
    if (old) old.remove();   // 場景重進時移除舊面板，避免重複疊加
    const wrap = document.createElement('div');
    wrap.id = 'sfx-dev-panel';
    wrap.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;' +
      'flex-wrap:wrap;gap:6px;justify-content:center;padding:8px;' +
      'background:rgba(0,0,0,.55);font:600 13px/1 -apple-system,sans-serif';
    let devCombo = 0;
    const mk = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText =
        'border:0;border-radius:8px;padding:9px 12px;color:#fff;' +
        'background:#3a7;cursor:pointer;font:inherit;-webkit-tap-highlight-color:transparent';
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        ctxResume(); fn(b);
      });
      wrap.appendChild(b);
      return b;
    };
    mk('一般放下', () => this.sfx('place'));
    mk('切除', () => this.sfx('slice'));
    mk('游戏结束', () => this.sfx('over'));
    const pb = mk('完美 +1（连击 0）', (b) => {
      devCombo++;
      this.sfx('perfect', devCombo);
      b.textContent = `完美 +1（连击 ${devCombo}）`;
    });
    mk('完美音阶 1→14', () => {
      for (let i = 1; i <= 14; i++) {
        setTimeout(() => this.sfx('perfect', i), (i - 1) * 260);
      }
    });
    mk('重置连击', () => { devCombo = 0; pb.textContent = '完美 +1（连击 0）'; });
    document.body.appendChild(wrap);
  }

  resetGame() {
    this.tower = [];                 // 已放置方塊資料
    this.level = 0;
    this.combo = 0;
    this.state = 'playing';
    this.camY = 0;                   // 相機垂直位移（px），隨高度上移
    this.camYTarget = 0;
    this.chip = null;
    this.fx = [];                    // 完美對齊特效（外框＋噴出小方塊）

    // 基座（滿尺寸，置中，不參與切除）
    const base = { cx: 0, cz: 0, fx: F0, fz: F0, lvl: 0, color: blockColor(0) };
    this.tower.push(base);
    this.below = base;

    this.gChip.clear();
    this.drawBg();
    this.drawTower();
    this.scoreText.setText('0');
    this.updateBest();
    this.tipText.setText('点击放下方块').setAlpha(0.85);
    this.spawnMovingBlock();
  }

  spawnMovingBlock() {
    this.level++;
    const axis = this.level % 2 === 1 ? 'x' : 'z'; // 交替軸
    const b = this.below;
    const blk = {
      cx: b.cx, cz: b.cz, fx: b.fx, fz: b.fz,
      lvl: this.level, color: blockColor(this.level),
    };
    blk.axis = axis;
    const center = axis === 'x' ? b.cx : b.cz;
    blk.center = center;            // 擺動中心（沿用下方中心）
    blk.m = center - TRAVEL;        // 從一端進入
    blk.dir = 1;
    if (axis === 'x') blk.cx = blk.m; else blk.cz = blk.m;
    this.moveBlk = blk;
    this.moving = true;
    this.camYTarget = this.level * THICK; // 相機目標位移，update 逐幀逼近
  }

  update(_, dt) {
    const ds = dt / 1000;

    // 星點：緩慢上飄 + 明滅閃爍（任何狀態都動）
    this.gPart.clear();
    const tn = this.time.now / 1000;
    for (const p of this.parts) {
      p.y -= p.spd * ds;
      if (p.y < -12) { p.y = H * RES + 12; p.x = Math.random() * W * RES; }
      const a = p.a * (0.35 + 0.65 * Math.abs(Math.sin(tn * p.tw + p.ph)));
      this.gPart.fillStyle(0xffffff, a);
      this.gPart.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }

    if (this.state === 'playing' && this.moveBlk && this.moving) {
      const blk = this.moveBlk;
      const d = this.diff;
      const spd = Math.min(d.speedBase + this.combo * d.speedPer, d.speedMax);
      blk.m += blk.dir * spd * ds;
      if (blk.m > blk.center + TRAVEL) { blk.m = blk.center + TRAVEL; blk.dir = -1; }
      else if (blk.m < blk.center - TRAVEL) { blk.m = blk.center - TRAVEL; blk.dir = 1; }
      if (blk.axis === 'x') blk.cx = blk.m; else blk.cz = blk.m;
    }

    // 相機等速上升（連續、位置無瞬跳），效能已證實每幀重畫亦穩定 60fps
    const step = CAM_SPEED * ds;
    const dy = this.camYTarget - this.camY;
    this.camY += Math.abs(dy) <= step ? dy : Math.sign(dy) * step;

    this.drawTower();
    if (this.moveBlk && this.state === 'playing') {
      this.gMove.clear();
      this.drawBlock(this.gMove, this.moveBlk, 0, 1);
    }
    if (this.chip) {
      const c = this.chip;
      c.vy += 2600 * ds;             // 強重力，明確加速墜落
      c.drop += c.vy * ds;
      if (c.axis === 'x') c.cx += c.vAxis * ds;  // 沿切除軸往外側翻離塔
      else c.cz += c.vAxis * ds;
      this.gChip.clear();
      this.drawBlock(this.gChip, c, c.drop, 1);   // 全程不透明，掉出畫面才銷毀
      if (c.drop > H + 220) this.chip = null;
    }
    this.updateFx(ds);
  }

  onTap() {
    const ctx = this.sound && this.sound.context;
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (this.state === 'over') { this.resetGame(); return; }
    if (this.state === 'playing' && this.moving) {
      if (this.tipText.alpha > 0) this.tipText.setAlpha(0);
      this.placeBlock();
    }
  }

  placeBlock() {
    this.moving = false;
    const blk = this.moveBlk;
    const below = this.below;
    const axis = blk.axis;
    const bc = axis === 'x' ? below.cx : below.cz;     // 下方中心
    const bf = axis === 'x' ? below.fx : below.fz;     // 下方該軸尺寸
    const mc = blk.m;                                   // 本塊中心
    const delta = mc - bc;
    const overlap = bf - Math.abs(delta);

    if (overlap <= 0) { this.gameOver(blk); return; }

    if (Math.abs(delta) <= PERFECT) {
      // 完美對齊：尺寸與下方完全相同、置中，不縮減也不放大（上層永不大於下層）
      this.applyAxis(blk, axis, bc, bf);
      this.combo++;
      this.flashPerfect(blk);
      this.playSound('perfect');
    } else {
      // 切除：保留重疊段，溢出塊掉落
      this.combo = 0;
      const newC = bc + delta / 2;                      // 重疊段中心
      const mf = axis === 'x' ? blk.fx : blk.fz;        // 本塊該軸原尺寸
      const offC = delta > 0
        ? (bc + bf / 2 + mc + mf / 2) / 2               // 外溢段中心（正向）
        : (bc - bf / 2 + mc - mf / 2) / 2;              // 外溢段中心（負向）
      const chip = {
        cx: blk.cx, cz: blk.cz, fx: blk.fx, fz: blk.fz,
        lvl: blk.lvl, color: blk.color, drop: 0, vy: 40,
        axis, vAxis: Math.sign(delta) * 230, // 往外溢方向翻離
      };
      this.applyAxis(chip, axis, offC, Math.abs(delta));
      this.chip = chip;

      this.applyAxis(blk, axis, newC, overlap);
      this.playSound('slice');
      this.playSound('place');
    }

    this.tower.push(blk);
    this.below = blk;
    this.scoreText.setText(String(this.level));
    this.drawBg();
    this.drawTower();
    this.spawnMovingBlock();
    this.moving = true;
  }

  applyAxis(b, axis, center, size) {
    if (axis === 'x') { b.cx = center; b.fx = size; }
    else { b.cz = center; b.fz = size; }
  }

  // 等角投影：plan (px,pz) 於高度 lvl → 螢幕座標
  proj(px, pz, lvl, dropPx) {
    const ux = px - pz;
    const uy = (px + pz) / 2;
    return {
      x: (CX + ux) * RES,
      y: (CY + uy - lvl * THICK + this.camY + (dropPx || 0)) * RES,
    };
  }

  drawBlock(g, b, dropPx, alpha) {
    const ax = b.fx / 2, az = b.fz / 2;
    const top = b.lvl + 1, bot = b.lvl;
    const P = (sx, sz, lv) => this.proj(b.cx + sx, b.cz + sz, lv, dropPx);
    const At = P(-ax, -az, top), Bt = P(ax, -az, top), Ct = P(ax, az, top), Dt = P(-ax, az, top);
    const Bb = P(ax, -az, bot), Cb = P(ax, az, bot), Db = P(-ax, az, bot);
    if (At.y > (H + 140) * RES && Ct.y > (H + 140) * RES) return; // 已滾出畫面下方則略過

    const a = alpha == null ? 1 : alpha;
    g.fillStyle(shade(b.color, 0.52), a);   // 左側面（前緣 C-D）最暗
    g.fillPoints([Dt, Ct, Cb, Db], true);
    g.fillStyle(shade(b.color, 0.72), a);   // 右側面（前緣 C-B）次暗
    g.fillPoints([Ct, Bt, Bb, Cb], true);
    g.fillStyle(b.color, a);                // 頂面最亮
    g.fillPoints([At, Bt, Ct, Dt], true);
  }

  drawTower() {
    this.gTower.clear();
    for (const b of this.tower) this.drawBlock(this.gTower, b, 0, 1);
  }

  flashPerfect(blk) {
    const ax = blk.fx / 2, az = blk.fz / 2, top = blk.lvl + 1;
    const P = (sx, sz) => this.proj(blk.cx + sx, blk.cz + sz, top, 0);
    const A = P(-ax, -az), B = P(ax, -az), C = P(ax, az), D = P(-ax, az);
    const cx = (A.x + B.x + C.x + D.x) / 4;
    const cy = (A.y + B.y + C.y + D.y) / 4;
    const cmb = Math.min(this.combo, 10);

    // 擴張外框：連擊越高擴越大、越亮
    this.fx.push({
      ring: [A, B, C, D], cx, cy, t: 0,
      life: 0.42, grow: 0.45 + cmb * 0.06,
    });
    // 沿頂面四周噴出小方塊，數量隨連擊增加
    const n = Math.min(28, 8 + this.combo * 3);
    for (let k = 0; k < n; k++) {
      const e = (k / n) * Math.PI * 2 + Math.random() * 0.3;
      const dx = Math.cos(e), dy = Math.sin(e) * 0.5; // 等角壓扁
      const sp = (130 + Math.random() * 170) * RES;
      this.fx.push({
        x: cx + dx * 10 * RES, y: cy + dy * 10 * RES,
        vx: dx * sp, vy: dy * sp - 70 * RES,
        s: (3 + Math.random() * 4) * RES,
        t: 0, life: 0.38 + Math.random() * 0.28,
      });
    }
  }

  updateFx(ds) {
    this.gFx.clear();
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += ds;
      const k = f.t / f.life;
      if (k >= 1) { this.fx.splice(i, 1); continue; }
      if (f.ring) {
        const g = 1 + f.grow * k, a = 1 - k;
        const pts = f.ring.map(pt => ({
          x: f.cx + (pt.x - f.cx) * g, y: f.cy + (pt.y - f.cy) * g,
        }));
        this.gFx.lineStyle(3 * RES, 0xffffff, a);
        this.gFx.strokePoints(pts, true, true);
      } else {
        f.vy += 560 * RES * ds;
        f.x += f.vx * ds; f.y += f.vy * ds;
        const sz = f.s * (1 - 0.5 * k);
        this.gFx.fillStyle(0xffffff, 1 - k);
        this.gFx.fillRect(f.x - sz / 2, f.y - sz / 2, sz, sz);
      }
    }
  }

  drawBg() {
    // 背景漸層隨高度循環色相；混色目標與比例依難度而異
    // 輕鬆/經典朝白混（明亮），挑戰朝深夜色混（上暗下有霓虹光暈）
    const base = blockColor(this.level);
    const d = this.diff;
    const top = mix(base, d.tint, d.topK);
    const bot = mix(base, d.tint, d.botK);
    this.bg.clear();
    this.bg.fillGradientStyle(top, top, bot, bot, 1);
    this.bg.fillRect(0, 0, W * RES, H * RES);
  }

  playSound(key) { this.sfx(key); }

  // 交由全域 Sfx 引擎播放：音色主題依難度而異（wood / classic / synth）
  sfx(kind, comboOverride) {
    Sfx.init(this.sound && this.sound.context);
    Sfx.play(this.diff.sfxTheme, kind, comboOverride != null ? comboOverride : this.combo);
  }

  drawCrown(cx, cy, s) {
    const g = this.crown;
    g.clear();
    g.fillStyle(0xffffff, 0.92);
    g.fillPoints([
      { x: cx - s, y: cy + s * 0.55 },
      { x: cx - s, y: cy - s * 0.15 },
      { x: cx - s * 0.45, y: cy + s * 0.12 },
      { x: cx, y: cy - s * 0.72 },
      { x: cx + s * 0.45, y: cy + s * 0.12 },
      { x: cx + s, y: cy - s * 0.15 },
      { x: cx + s, y: cy + s * 0.55 },
    ], true);
  }

  updateBest() {
    this.bestText.setText(String(this.best));
    const s = 15 * RES, gap = 11 * RES, tw = this.bestText.width, cy = 232 * RES;
    const total = s * 2 + gap + tw;
    const left = W * RES / 2 - total / 2;
    this.drawCrown(left + s, cy, s);
    this.bestText.setPosition(left + s * 2 + gap, cy);
  }

  gameOver(blk) {
    this.state = 'over';
    this.playSound('over');
    const score = this.level - 1;
    if (score > this.best) {
      this.best = score;
      localStorage.setItem('stack_best_' + this.diff.key, String(score));
      this.updateBest();
    }
    this.chip = { ...blk, drop: 0, vy: 80, axis: blk.axis, vAxis: 0 };
    this.gMove.clear();
    this.tipText.setText('点此重新开始').setAlpha(0.9);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W * RES,
  height: H * RES,
  backgroundColor: '#0c0c12',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MenuScene, StackScene],
});
