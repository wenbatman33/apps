// WebAudio 合成音效（不外部載檔）：引擎聲、兌現、飛走、按鍵
export class Sfx {
  constructor() {
    this.enabled = localStorage.getItem('av_sfx') !== '0';
    this.ctx = null;
    this.engineNodes = null;
  }

  setEnabled(v) {
    this.enabled = v;
    localStorage.setItem('av_sfx', v ? '1' : '0');
    if (!v) this.stopEngine();
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  blip(freq = 660, dur = 0.08, type = 'sine', vol = 0.25) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  click() { this.blip(420, 0.05, 'square', 0.14); }
  tick() { this.blip(880, 0.04, 'sine', 0.10); }

  cashOut() {
    if (!this.enabled || !this.ctx) return;
    [784, 1047, 1319].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'sine', 0.22), i * 70));
  }

  bet() { this.blip(520, 0.09, 'triangle', 0.18); }

  startEngine() {
    if (!this.enabled || !this.ctx || this.engineNodes) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 68;
    o2.type = 'square'; o2.frequency.value = 102;
    f.type = 'lowpass'; f.frequency.value = 520;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.10, t + 0.4);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o2.start(t);
    this.engineNodes = { o, o2, g, f };
  }

  setEngine(mult) {
    if (!this.engineNodes) return;
    const k = Math.min(3, Math.log(Math.max(1, mult)) / 1.4);
    this.engineNodes.o.frequency.value = 68 + k * 52;
    this.engineNodes.o2.frequency.value = 102 + k * 78;
    this.engineNodes.f.frequency.value = 520 + k * 700;
  }

  stopEngine() {
    if (!this.engineNodes || !this.ctx) return;
    const { o, o2, g } = this.engineNodes;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.stop(t + 0.3); o2.stop(t + 0.3);
    this.engineNodes = null;
  }

  crash() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    // 白噪音爆音
    const len = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.value = 0.35;
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    this.blip(180, 0.35, 'sawtooth', 0.18);
  }
}
