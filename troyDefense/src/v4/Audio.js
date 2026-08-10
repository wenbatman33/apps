// v4 音效層：WebAudio 程序合成（零音檔）。首次點擊後啟動；M 鍵或暫停選單開關。
const AudioV4 = {
  ctx: null, master: null, enabled: true, bgmTimer: null, _last: {},

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
      const save = JSON.parse(localStorage.troyV4 || '{}');
      if (save.sfx === false) this.enabled = false;
    } catch (e) { /* 無 WebAudio 環境 */ }
  },

  setEnabled(on) {
    this.enabled = on;
    const save = JSON.parse(localStorage.troyV4 || '{}');
    save.sfx = on; localStorage.troyV4 = JSON.stringify(save);
    if (!on) this.stopBgm(); else this.startBgm();
  },

  // 節流：同名音效最小間隔
  gate(name, ms) {
    const t = performance.now();
    if (this._last[name] && t - this._last[name] < ms) return false;
    this._last[name] = t; return true;
  },

  // ── 基礎合成器 ──
  tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, attack = 0.005, delay = 0 } = {}) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },

  noise(dur, { vol = 0.3, freq = 1200, q = 1, type = 'bandpass', slide = 0, delay = 0 } = {}) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t0);
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  },

  // ── 遊戲音效 ──
  shoot()    { if (this.gate('shoot', 70))  this.noise(0.12, { vol: 0.12, freq: 2600, slide: -1800, q: 2 }); },
  hit()      { if (this.gate('hit', 45))   { this.noise(0.05, { vol: 0.14, freq: 1800 }); this.tone(220, 0.08, { type: 'triangle', vol: 0.1 }); } },
  crit()     { this.noise(0.08, { vol: 0.2, freq: 2200 }); this.tone(660, 0.16, { type: 'square', vol: 0.12, slide: -300 }); },
  thud()     { if (this.gate('thud', 90))  { this.tone(90, 0.22, { type: 'sine', vol: 0.3, slide: -50 }); this.noise(0.1, { vol: 0.15, freq: 300, type: 'lowpass' }); } },
  kill()     { if (this.gate('kill', 60))  this.tone(300, 0.12, { type: 'triangle', vol: 0.1, slide: -180 }); },
  zap()      { if (this.gate('zap', 80))   { this.tone(1400, 0.14, { type: 'sawtooth', vol: 0.14, slide: -1100 }); this.noise(0.1, { vol: 0.1, freq: 4200, q: 0.6 }); } },
  fireCast() { this.noise(0.4, { vol: 0.18, freq: 700, slide: 500, type: 'lowpass' }); },
  poison()   { if (this.gate('poison', 120)) this.noise(0.3, { vol: 0.1, freq: 5200, q: 4, slide: -2600 }); },
  wave()     { this.noise(0.5, { vol: 0.22, freq: 500, slide: 900, type: 'lowpass' }); },
  holy()     { this.tone(880, 0.3, { vol: 0.1 }); this.tone(1320, 0.35, { vol: 0.07, delay: 0.03 }); },
  gateHit()  { if (this.gate('gateHit', 140)) { this.tone(70, 0.3, { type: 'sine', vol: 0.32, slide: -30 }); this.noise(0.08, { vol: 0.12, freq: 500, type: 'lowpass' }); } },
  wallBreak(){ this.noise(0.9, { vol: 0.4, freq: 220, type: 'lowpass', slide: -140 }); this.tone(55, 0.8, { vol: 0.3, slide: -25 }); },
  explode()  { this.noise(0.6, { vol: 0.38, freq: 400, type: 'lowpass', slide: -300 }); this.tone(60, 0.5, { vol: 0.35, slide: -35 }); },
  volley()   { for (let i = 0; i < 5; i++) this.noise(0.1, { vol: 0.08, freq: 2600, slide: -1600, q: 2, delay: i * 0.05 }); },
  chime()    { this.tone(660, 0.14, { vol: 0.12 }); this.tone(990, 0.2, { vol: 0.1, delay: 0.08 }); },
  pick()     { this.tone(523, 0.1, { vol: 0.14 }); this.tone(784, 0.16, { vol: 0.12, delay: 0.07 }); },
  horn()     { this.tone(196, 0.5, { type: 'sawtooth', vol: 0.16 }); this.tone(294, 0.5, { type: 'sawtooth', vol: 0.12, delay: 0.02 }); this.tone(392, 0.7, { type: 'sawtooth', vol: 0.1, delay: 0.18 }); },
  victory()  { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, { vol: 0.16, delay: i * 0.14 })); },
  defeat()   { [392, 311, 233, 196].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', vol: 0.16, delay: i * 0.22 })); },

  // ── 戰鼓 BGM：低頻心跳鼓循環 ──
  startBgm() {
    if (!this.ctx || !this.enabled || this.bgmTimer) return;
    let beat = 0;
    this.bgmTimer = setInterval(() => {
      if (!this.enabled) return;
      beat++;
      if (beat % 4 === 1) { this.tone(58, 0.25, { vol: 0.2, slide: -18 }); }               // 大鼓
      else if (beat % 4 === 3) { this.tone(58, 0.18, { vol: 0.13, slide: -18 });
        this.tone(88, 0.12, { vol: 0.07, slide: -20, delay: 0.09 }); }                     // 雙擊
      if (beat % 16 === 9) this.noise(0.25, { vol: 0.05, freq: 900, type: 'lowpass' });    // 偶發鑔
    }, 430);
  },
  stopBgm() { if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; } },
};
window.AudioV4 = AudioV4;
// 首次互動啟動（瀏覽器限制）
window.addEventListener('pointerdown', () => { AudioV4.init(); if (AudioV4.ctx && AudioV4.ctx.state === 'suspended') AudioV4.ctx.resume(); }, { once: false });
window.addEventListener('keydown', e => { if (e.key === 'm' || e.key === 'M') AudioV4.setEnabled(!AudioV4.enabled); });
