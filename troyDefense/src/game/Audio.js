/* 程序合成音效與動態分層 BGM（純 WebAudio，不需音檔）
 * BGM 三層：弦樂底 → 戰鼓 → 銅管尖鳴，依緊張度即時混音
 */
window.TD = window.TD || {};

TD.Audio = class TDAudio {
  constructor() {
    this.ready = false;
    this.enabled = true;
    this.tension = 0;      // 0~1，由 GameScene 餵
  }

  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.42;
    this.master.connect(this.ctx.destination);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.55;
    this.sfxBus.connect(this.master);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.16;
    this.musicBus.connect(this.master);

    this.noiseBuf = this._makeNoise(2);
    this.ready = true;
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setEnabled(v) { this.enabled = v; if (this.master) this.master.gain.value = v ? 0.42 : 0; }

  _makeNoise(sec) {
    const n = this.ctx.sampleRate * sec;
    const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  _env(node, t, a, d, peak = 1) {
    const g = node.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + a);
    g.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  _tone({ freq = 440, type = 'sine', a = 0.005, d = 0.2, gain = 0.3, slideTo = null, bus = null }) {
    if (!this.ready || !this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + a + d);
    this._env(g, t, a, d, gain);
    o.connect(g).connect(bus || this.sfxBus);
    o.start(t); o.stop(t + a + d + 0.05);
  }

  _noise({ a = 0.004, d = 0.18, gain = 0.3, lp = 4000, hp = 120, slideLp = null }) {
    if (!this.ready || !this.enabled) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const lpf = this.ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.setValueAtTime(lp, t);
    if (slideLp) lpf.frequency.exponentialRampToValueAtTime(slideLp, t + a + d);
    const hpf = this.ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = hp;
    const g = this.ctx.createGain();
    this._env(g, t, a, d, gain);
    s.connect(hpf).connect(lpf).connect(g).connect(this.sfxBus);
    s.start(t); s.stop(t + a + d + 0.05);
  }

  // ── 音效庫 ──
  shootArrow() { this._noise({ a: .002, d: .09, gain: .10, hp: 900, lp: 7000, slideLp: 2200 }); }
  shootSpear() { this._tone({ freq: 320, type: 'sawtooth', d: .12, gain: .09, slideTo: 140 }); }
  shootStone() { this._tone({ freq: 90, type: 'triangle', d: .25, gain: .04, slideTo: 55 }); }
  shootOil()   { this._noise({ a: .01, d: .3, gain: .04, hp: 300, lp: 2600 }); }

  hit()   { this._noise({ a: .001, d: .06, gain: .09, hp: 1200, lp: 9000 }); }
  crit()  { this._tone({ freq: 1400, type: 'square', d: .12, gain: .09, slideTo: 700 });
            this._noise({ a: .001, d: .1, gain: .11, hp: 2000, lp: 12000 }); }
  kill()  { this._noise({ a: .002, d: .16, gain: .11, hp: 200, lp: 3200, slideLp: 600 }); }
  killBig() {
    this._noise({ a: .003, d: .5, gain: .10, hp: 40, lp: 1800, slideLp: 200 });
    this._tone({ freq: 130, type: 'triangle', d: .45, gain: .15, slideTo: 45 });
  }
  explode() {
    this._noise({ a: .002, d: .38, gain: .15, hp: 60, lp: 2400, slideLp: 300 });
    this._tone({ freq: 70, type: 'sine', d: .4, gain: .08, slideTo: 32 });
  }
  coin()  { this._tone({ freq: 1180, type: 'triangle', d: .09, gain: .06 });
            this._tone({ freq: 1760, type: 'triangle', a: .02, d: .1, gain: .04 }); }

  merge(lv) {
    const base = 420 + lv * 90;
    [0, 0.06, 0.12].forEach((dt, i) => setTimeout(() =>
      this._tone({ freq: base * (1 + i * 0.28), type: 'triangle', d: .22, gain: .10 }), dt * 1000));
  }
  fuse() {
    [0, .07, .14, .22].forEach((dt, i) => setTimeout(() =>
      this._tone({ freq: 300 * Math.pow(1.32, i), type: 'sawtooth', d: .3, gain: .15 }), dt * 1000));
    this._noise({ a: .02, d: .5, gain: .08, hp: 500, lp: 6000 });
  }
  place() { this._tone({ freq: 220, type: 'square', d: .1, gain: .08, slideTo: 320 }); }
  deny()  { this._tone({ freq: 160, type: 'square', d: .12, gain: .04, slideTo: 110 }); }

  wallHit() {
    this._noise({ a: .003, d: .55, gain: .20, hp: 30, lp: 1200, slideLp: 140 });
    this._tone({ freq: 58, type: 'sine', d: .6, gain: .10, slideTo: 26 });
  }
  heartbeat(fast) {
    const g = fast ? .16 : .10;
    this._tone({ freq: 62, type: 'sine', a: .01, d: .16, gain: g });
    setTimeout(() => this._tone({ freq: 52, type: 'sine', a: .01, d: .2, gain: g * .8 }), 165);
  }
  horn() {   // BOSS 出場號角
    [0, .18].forEach((dt, i) => setTimeout(() => {
      this._tone({ freq: i ? 196 : 147, type: 'sawtooth', a: .04, d: .8, gain: .11 });
      this._tone({ freq: (i ? 196 : 147) * 1.5, type: 'sawtooth', a: .05, d: .7, gain: .04 });
    }, dt * 1000));
  }
  skill() {
    this._tone({ freq: 880, type: 'sine', a: .02, d: .6, gain: .11, slideTo: 2400 });
    this._noise({ a: .04, d: .7, gain: .09, hp: 800, lp: 9000 });
  }
  bell() { this._tone({ freq: 780, type: 'sine', a: .003, d: .9, gain: .10 });
           this._tone({ freq: 1170, type: 'sine', a: .003, d: .7, gain: .09 }); }
  win()  { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() =>
             this._tone({ freq: f, type: 'triangle', a: .02, d: .5, gain: .11 }), i * 130)); }
  lose() { [392, 349, 294, 220].forEach((f, i) => setTimeout(() =>
             this._tone({ freq: f, type: 'sawtooth', a: .03, d: .8, gain: .10 }), i * 240)); }

  // ── 動態 BGM ──
  startBGM(mode = 'battle') {
    if (!this.ready || this.bgmOn) return;
    this.bgmOn = true;
    this.bgmMode = mode;

    // 三層增益
    this.layerA = this.ctx.createGain(); this.layerA.gain.value = 0.5;  // 弦樂
    this.layerB = this.ctx.createGain(); this.layerB.gain.value = 0.0;  // 鼓
    this.layerC = this.ctx.createGain(); this.layerC.gain.value = 0.0;  // 銅管
    [this.layerA, this.layerB, this.layerC].forEach(l => l.connect(this.musicBus));

    // A：持續弦樂 pad（小調）
    this.padOscs = [];
    const root = 110; // A2
    [1, 1.2, 1.5, 2].forEach((r, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.value = root * r;
      g.gain.value = 0.038 / (i + 1);
      lfo.frequency.value = 0.13 + i * 0.05; lg.gain.value = 1.6;
      lfo.connect(lg).connect(o.frequency);
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 380;
      o.connect(f).connect(g).connect(this.layerA);
      o.start(); lfo.start();
      this.padOscs.push(o, lfo);
    });

    // B/C：節奏循環
    this.step = 0;
    this.bgmTimer = setInterval(() => this._tick(), 620);
  }

  _tick() {
    if (!this.bgmOn || !this.enabled) return;
    const t = this.ctx.currentTime;
    const s = this.step++ % 8;

    // 戰鼓（layerB）
    if (s === 0 || s === 4) this._drum(this.layerB, 62, 0.30, s === 0 ? 0.55 : 0.34);
    if (s === 6) this._drum(this.layerB, 88, 0.18, 0.22);

    // 銅管尖鳴（layerC）
    if (s === 0 || s === 4) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(330, t + 0.5);
      this._env(g, t, 0.10, 0.7, 0.05);
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      o.connect(f).connect(g).connect(this.layerC);
      o.start(t); o.stop(t + 0.8);
    }
  }

  _drum(bus, freq, dur, gain) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 2.2, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
    this._env(g, t, 0.004, dur, gain * 0.5);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + dur + 0.05);

    const n = this.ctx.createBufferSource(); n.buffer = this.noiseBuf;
    const ng = this.ctx.createGain(); this._env(ng, t, 0.002, dur * 0.4, gain * 0.16);
    const nf = this.ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 1400;
    n.connect(nf).connect(ng).connect(bus);
    n.start(t); n.stop(t + dur);
  }

  /** 緊張度 0~1：控制鼓與銅管進場、以及整體明亮度 */
  setTension(v) {
    if (!this.bgmOn) return;
    this.tension = Phaser.Math.Clamp(v, 0, 1);
    const t = this.ctx.currentTime;
    const drum = Phaser.Math.Clamp((this.tension - 0.15) / 0.5, 0, 1);
    const horn = Phaser.Math.Clamp((this.tension - 0.62) / 0.38, 0, 1);
    this.layerB.gain.linearRampToValueAtTime(drum * 0.55, t + 0.8);
    this.layerC.gain.linearRampToValueAtTime(horn * 0.40, t + 0.8);
    if (this.bgmTimer) {
      const want = Math.round(620 - this.tension * 180);
      if (Math.abs(want - (this._interval || 460)) > 24) {
        this._interval = want;
        clearInterval(this.bgmTimer);
        this.bgmTimer = setInterval(() => this._tick(), want);
      }
    }
  }

  stopBGM() {
    if (!this.bgmOn) return;
    this.bgmOn = false;
    clearInterval(this.bgmTimer); this.bgmTimer = null;
    const t = this.ctx.currentTime;
    [this.layerA, this.layerB, this.layerC].forEach(l => l.gain.linearRampToValueAtTime(0, t + 0.5));
    const oscs = this.padOscs || [];
    setTimeout(() => oscs.forEach(o => { try { o.stop(); } catch (e) {} }), 700);
    this.padOscs = [];
  }
};

TD.audio = new TD.Audio();
