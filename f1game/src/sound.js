// 引擎音效（WebAudio 合成，無外部音檔）
export class EngineSound {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('f1_muted') === '1'; // 記憶上次靜音狀態
  }
  _init() {
    if (this.ctx) return;
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // 兩個鋸齒波 + 失諧，過低通濾波
    this.osc1 = ctx.createOscillator(); this.osc1.type = 'sawtooth';
    this.osc2 = ctx.createOscillator(); this.osc2.type = 'square';
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass'; this.filter.frequency.value = 900; this.filter.Q.value = 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    this.osc1.connect(this.filter);
    this.osc2.connect(g2); g2.connect(this.filter);
    this.filter.connect(this.master);
    this.osc1.start(); this.osc2.start();
  }
  resume() { this._init(); if (this.ctx.state === 'suspended') this.ctx.resume(); }
  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('f1_muted', this.muted ? '1' : '0');
    return this.muted;
  }
  // rpm01: 0~1（檔位內轉速），speed01: 0~1
  update(rpm01, speed01, throttle) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const f = 70 + rpm01 * 430 + speed01 * 120;
    this.osc1.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.03);
    this.osc2.frequency.setTargetAtTime(f * 1.5 + 6, this.ctx.currentTime, 0.03);
    this.filter.frequency.setTargetAtTime(500 + rpm01 * 2600 + throttle * 800, this.ctx.currentTime, 0.05);
    const vol = this.muted ? 0 : 0.05 + speed01 * 0.075 + throttle * 0.05;
    this.master.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.08);
  }
  beep(freq, dur, vol = 0.25) { // 起跑燈音
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(this.ctx.destination);
    o.start();
    g.gain.setTargetAtTime(0, this.ctx.currentTime + dur, 0.03);
    o.stop(this.ctx.currentTime + dur + 0.15);
  }
}
