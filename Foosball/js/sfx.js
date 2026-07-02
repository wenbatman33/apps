// 極簡 WebAudio 音效（不用外部音檔）
// 碰撞聲走「噪音打擊 + 低頻掃頻」合成，音量隨撞擊速度
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._last = {}; // 各音效節流
  }
  _ac() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  unlock() { try { this._ac(); } catch (e) { /* 無音效環境 */ } }

  _throttle(key, ms) {
    const now = performance.now();
    if (this._last[key] && now - this._last[key] < ms) return true;
    this._last[key] = now;
    return false;
  }

  // 掃頻音（f0→f1），打擊感的主體
  _sweep(f0, f1, dur, gain = 0.3, type = 'sine', when = 0) {
    if (this.muted || !this.ctx) return;
    const ac = this.ctx, t = ac.currentTime + when;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // 濾波噪音（皮革/木頭的「啪、扣」質感）
  _thud(dur, freq, gain = 0.3, q = 1, when = 0) {
    if (this.muted || !this.ctx) return;
    const ac = this.ctx, t = ac.currentTime + when;
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = ac.createBufferSource(); s.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(ac.destination);
    s.start(t);
  }

  // 揮桿（沒踢到球也會有，輕的咻聲）
  swing() {
    if (this._throttle('swing', 60)) return;
    this._thud(0.06, 2400, 0.05, 2);
  }
  // 踢中球：厚實的「砰」
  strike(pow = 30) {
    const v = Math.min(1, pow / 45);
    this._thud(0.05, 700 + v * 500, 0.4 + v * 0.3, 0.8);
    this._sweep(110 + v * 40, 45, 0.13, 0.45 + v * 0.25);
  }
  // 撞牆：木框的「扣」
  wall(sp = 10) {
    if (this._throttle('wall', 50)) return;
    const v = Math.min(1, sp / 40);
    this._thud(0.03, 1800, 0.12 + v * 0.2, 2);
    this._sweep(260, 130, 0.05, 0.1 + v * 0.18, 'triangle');
  }
  // 被人偶擋下：悶一點的「篤」
  block(sp = 10) {
    if (this._throttle('block', 70)) return;
    const v = Math.min(1, sp / 40);
    this._thud(0.035, 900, 0.1 + v * 0.15, 1);
    this._sweep(180, 90, 0.06, 0.08 + v * 0.12);
  }

  goal() {
    [523, 659, 784, 1047].forEach((f, i) => this._sweep(f, f, 0.22, 0.2, 'triangle', i * 0.09));
    this._thud(0.4, 3000, 0.15, 1);
  }
  whistle() { this._sweep(2200, 2100, 0.35, 0.06, 'square'); this._sweep(2600, 2500, 0.3, 0.04, 'square', 0.05); }
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this._sweep(f, f, 0.3, 0.18, 'triangle', i * 0.12)); }
  lose() { [400, 350, 300, 250].forEach((f, i) => this._sweep(f, f * 0.95, 0.25, 0.1, 'sawtooth', i * 0.14)); }
}
