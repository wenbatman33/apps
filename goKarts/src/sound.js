// 音效模组：WebAudio 程序化音效 + 每赛道专属背景音乐
const midi = m => 440 * Math.pow(2, (m - 69) / 12);

// 每个主题的 BGM 音序（midi 音高，null = 休止）
const MUSIC = {
  meadow: {
    bpm: 128, leadType: 'square', bassType: 'triangle',
    bass: [36, null, 36, null, 43, null, 36, null, 41, null, 41, null, 43, null, 43, null],
    lead: [72, 74, 76, null, 79, null, 76, 74, 72, null, 69, null, 67, null, 69, 71,
           72, 74, 76, 79, 81, null, 79, 76, 74, null, 72, null, 74, 76, 74, null],
  },
  canyon: {
    bpm: 140, leadType: 'sawtooth', bassType: 'square',
    bass: [40, 40, null, 40, 41, null, 40, null, 43, 43, null, 43, 41, null, 40, null],
    lead: [76, null, 74, 76, null, 79, 76, null, 74, null, 72, 74, null, 76, 74, null,
           71, null, 72, 74, 76, null, 74, 72, 71, 69, null, 71, 72, null, 71, null],
  },
  neon: {
    bpm: 122, leadType: 'square', bassType: 'sawtooth',
    bass: [33, null, 33, 33, null, 33, null, 33, 31, null, 31, 31, null, 31, null, 31],
    lead: [69, 72, 76, 79, 76, 72, 69, 72, 67, 71, 74, 79, 74, 71, 67, 71,
           69, 72, 76, 81, 76, 72, 69, 72, 71, 74, 77, 81, 77, 74, 71, 74],
  },
};

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('gokarts_mute') === '1';
    this.engineOn = false;
    this.musicTimer = null;
    this.musicSrc = null;
    this._musicToken = 0;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.15; this.musicBus.connect(this.master);

    // 共用噪音 buffer
    const len = this.ctx.sampleRate * 1.2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('gokarts_mute', this.muted ? '1' : '0');
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }

  // ============ 引擎 & 漂移 ============
  startEngine() {
    this.ensure();
    if (this.engineOn) return;
    const c = this.ctx;
    this.engOsc = c.createOscillator(); this.engOsc.type = 'sawtooth'; this.engOsc.frequency.value = 58;
    this.engSub = c.createOscillator(); this.engSub.type = 'square'; this.engSub.frequency.value = 29;
    this.engLP = c.createBiquadFilter(); this.engLP.type = 'lowpass'; this.engLP.frequency.value = 480;
    this.engGain = c.createGain(); this.engGain.gain.value = 0;
    const subG = c.createGain(); subG.gain.value = 0.5;
    this.engOsc.connect(this.engLP); this.engSub.connect(subG); subG.connect(this.engLP);
    this.engLP.connect(this.engGain); this.engGain.connect(this.sfx);
    this.engOsc.start(); this.engSub.start();
    // 漂移噪音
    this.skidSrc = c.createBufferSource(); this.skidSrc.buffer = this.noiseBuf; this.skidSrc.loop = true;
    this.skidBP = c.createBiquadFilter(); this.skidBP.type = 'bandpass'; this.skidBP.frequency.value = 950; this.skidBP.Q.value = 0.9;
    this.skidGain = c.createGain(); this.skidGain.gain.value = 0;
    this.skidSrc.connect(this.skidBP); this.skidBP.connect(this.skidGain); this.skidGain.connect(this.sfx);
    this.skidSrc.start();
    this.engineOn = true;
  }

  stopEngine() {
    if (!this.engineOn) return;
    try { this.engOsc.stop(); this.engSub.stop(); this.skidSrc.stop(); } catch (e) {}
    this.engineOn = false;
  }

  // speed01: 0..1  throttle: 0..1
  setEngine(speed01, throttle, boosting, drifting) {
    if (!this.engineOn) return;
    const t = this.ctx.currentTime;
    const f = 55 + speed01 * 165 + (boosting ? 35 : 0);
    this.engOsc.frequency.setTargetAtTime(f, t, 0.06);
    this.engSub.frequency.setTargetAtTime(f / 2, t, 0.06);
    this.engLP.frequency.setTargetAtTime(420 + speed01 * 1700 + (boosting ? 700 : 0), t, 0.08);
    this.engGain.gain.setTargetAtTime(0.05 + speed01 * 0.05 + throttle * 0.045, t, 0.09);
    this.skidGain.gain.setTargetAtTime(drifting ? 0.10 + speed01 * 0.06 : 0, t, 0.05);
  }

  // ============ 基础合成 ============
  tone(freq, dur, type = 'square', vol = 0.2, when = 0, glideTo = null) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + when;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g); g.connect(this.sfx);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  noise(dur, filterType, freq, vol = 0.3, when = 0, freqEnd = null) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + when;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = filterType; f.frequency.setValueAtTime(freq, t0);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.sfx);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  // ============ 一次性音效 ============
  uiClick()      { this.ensure(); this.tone(880, 0.07, 'square', 0.12); }
  countBeep()    { this.tone(740, 0.14, 'square', 0.25); }
  goBeep()       { this.tone(1120, 0.5, 'square', 0.28); this.tone(560, 0.5, 'square', 0.15); }
  itemBox()      { [660, 880, 1150].forEach((f, i) => this.tone(f, 0.09, 'square', 0.16, i * 0.055)); }
  itemGot()      { this.tone(520, 0.1, 'triangle', 0.2); this.tone(780, 0.16, 'triangle', 0.2, 0.08); }
  itemThrow()    { this.noise(0.28, 'bandpass', 350, 0.3, 0, 1600); }
  shellBounce()  { this.tone(310, 0.09, 'square', 0.2, 0, 170); }
  hit(loud)      {
    this.noise(0.35, 'lowpass', 1400, loud ? 0.5 : 0.3, 0, 200);
    this.tone(380, 0.45, 'sawtooth', loud ? 0.3 : 0.18, 0, 70);
  }
  bump()         { this.tone(130, 0.1, 'sine', 0.24, 0, 70); this.noise(0.08, 'lowpass', 600, 0.14); }
  wallHit(str)   { const v = Math.min(0.45, 0.12 + str * 0.02); this.noise(0.22, 'lowpass', 900, v, 0, 150); this.tone(95, 0.2, 'sine', v, 0, 55); }
  boost()        { this.tone(220, 0.5, 'sawtooth', 0.22, 0, 950); this.noise(0.45, 'highpass', 900, 0.13); }
  miniTurbo(lv)  { this.tone(900, 0.1, 'square', 0.2); if (lv > 1) this.tone(1250, 0.14, 'square', 0.2, 0.09); }
  driftTick()    { this.tone(1500, 0.04, 'square', 0.08); }
  lightning()    {
    this.noise(0.8, 'highpass', 2600, 0.4);
    this.noise(1.1, 'lowpass', 300, 0.5, 0.05, 60);
    this.tone(70, 1.0, 'sawtooth', 0.3, 0, 38);
  }
  lapJingle()    { [660, 830, 990].forEach((f, i) => this.tone(f, 0.14, 'square', 0.2, i * 0.09)); }
  bestLapJingle(){ [660, 830, 990, 1320].forEach((f, i) => this.tone(f, 0.16, 'square', 0.22, i * 0.08)); }
  finishWin()    {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, i >= 4 ? 0.5 : 0.18, 'square', 0.24, i * 0.16));
    this.noise(1.2, 'highpass', 1200, 0.1, 0.6);
  }
  finishLose()   { [523, 440, 349, 262].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.22, i * 0.22)); }

  // ============ 背景音乐 ============
  // 优先播放 assets/audio/bgm-<theme>.m4a（MusicGen 生成），没有档案时退回程序化音序器
  startMusic(theme) {
    this.ensure();
    this.stopMusic();
    const token = ++this._musicToken;
    this.loadBgm(theme).then(buf => {
      if (token !== this._musicToken) return; // 期间已停止或切歌
      if (buf) {
        if (!this.bgmGain) {
          this.bgmGain = this.ctx.createGain();
          this.bgmGain.gain.value = 0.32;
          this.bgmGain.connect(this.master);
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        src.connect(this.bgmGain); src.start();
        this.musicSrc = src;
      } else {
        this.startSequencer(theme);
      }
    });
  }

  loadBgm(theme) {
    this.bgmCache = this.bgmCache || {};
    if (this.bgmCache[theme] !== undefined) return Promise.resolve(this.bgmCache[theme]);
    return fetch(`assets/audio/bgm-${theme}.m4a`)
      .then(r => { if (!r.ok) throw new Error('no bgm file'); return r.arrayBuffer(); })
      .then(ab => this.ctx.decodeAudioData(ab))
      .then(b => (this.bgmCache[theme] = b))
      .catch(() => (this.bgmCache[theme] = null));
  }

  startSequencer(theme) {
    const m = MUSIC[theme]; if (!m) return;
    const stepDur = 60 / m.bpm / 2; // 八分音符
    let step = 0;
    let nextT = this.ctx.currentTime + 0.1;
    const tick = () => {
      const c = this.ctx;
      while (nextT < c.currentTime + 0.18) {
        const t0 = nextT;
        const b = m.bass[step % m.bass.length];
        if (b !== null) this.mtone(midi(b), stepDur * 0.9, m.bassType, 0.30, t0);
        const l = m.lead[step % m.lead.length];
        if (l !== null) this.mtone(midi(l), stepDur * 0.85, m.leadType, 0.16, t0);
        if (step % 2 === 1) this.mhat(t0, 0.05);
        step++; nextT += stepDur;
      }
    };
    this.musicTimer = setInterval(tick, 55);
  }

  mtone(freq, dur, type, vol, t0) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.musicBus);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  mhat(t0, vol) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);
    src.connect(f); f.connect(g); g.connect(this.musicBus);
    src.start(t0); src.stop(t0 + 0.06);
  }

  stopMusic() {
    this._musicToken++;
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    if (this.musicSrc) {
      try { this.musicSrc.stop(); } catch (e) {}
      this.musicSrc = null;
    }
  }
}
