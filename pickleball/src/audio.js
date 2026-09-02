// ===== 音效：WebAudio 即時合成（拍擊 / 落地 / 觸網 / 哨音 / UI） =====
export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }
  _ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
      // 場館空間感：簡易回聲
      const delay = this.ctx.createDelay(0.5);
      delay.delayTime.value = 0.13;
      const fb = this.ctx.createGain(); fb.gain.value = 0.22;
      const wet = this.ctx.createGain(); wet.gain.value = 0.18;
      delay.connect(fb); fb.connect(delay);
      delay.connect(wet); wet.connect(this.master);
      this.reverbIn = delay;
    } catch (e) { return false; }
    return true;
  }
  resume() {
    if (!this._ensure()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  _noise(dur, { freq = 1200, q = 1, gain = 1, decay = 0.08 } = {}) {
    const ctx = this.ctx;
    const n = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decay));
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(bp); bp.connect(g); g.connect(this.master); g.connect(this.reverbIn);
    src.start();
  }
  _tone(freq, dur, { type = 'sine', gain = 0.3, slide = 0, attack = 0.005 } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + attack);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(this.master); g.connect(this.reverbIn);
    o.start(); o.stop(ctx.currentTime + dur + 0.05);
  }
  play(name, power = 1) {
    if (!this.enabled || !this._ensure()) return;
    switch (name) {
      case 'hit':     // 拍面擊球：清脆「啪」
        this._noise(0.12, { freq: 1800 + power * 600, q: 0.8, gain: 0.9 * power, decay: 0.03 });
        this._tone(420 + power * 120, 0.09, { type: 'triangle', gain: 0.35, slide: -200 });
        break;
      case 'bounce':  // 落地
        this._noise(0.08, { freq: 900, q: 1.2, gain: 0.35 * power, decay: 0.025 });
        this._tone(220, 0.07, { type: 'sine', gain: 0.18 * power, slide: -90 });
        break;
      case 'net':
        this._noise(0.16, { freq: 500, q: 0.7, gain: 0.5, decay: 0.06 });
        break;
      case 'wall':
        this._noise(0.12, { freq: 400, q: 0.9, gain: 0.3, decay: 0.05 });
        break;
      case 'whistle': // 得分哨音
        this._tone(2200, 0.18, { type: 'square', gain: 0.10 });
        setTimeout(() => this._tone(2600, 0.22, { type: 'square', gain: 0.10 }), 140);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, 0.35, { type: 'triangle', gain: 0.22 }), i * 120));
        break;
      case 'lose':
        [392, 330, 262].forEach((f, i) => setTimeout(() => this._tone(f, 0.4, { type: 'triangle', gain: 0.2 }), i * 160));
        break;
      case 'ui':
        this._tone(880, 0.08, { type: 'sine', gain: 0.15, slide: 200 });
        break;
      case 'swing':   // 揮空風聲
        this._noise(0.14, { freq: 700, q: 0.5, gain: 0.12, decay: 0.07 });
        break;
    }
  }
}
