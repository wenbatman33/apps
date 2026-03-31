/**
 * SoundManager - Web Audio API procedural sound synthesis
 *
 * All sounds are generated in real-time — no external audio files required.
 * Every public method is wrapped in try/catch so audio failures never
 * propagate to the game engine.
 *
 * Sounds:
 *   playClick()         — button press tick
 *   startSpin()         — continuous spinning rumble loop
 *   stopSpin()          — fade-out spinning rumble
 *   playReelStop(i)     — per-reel clunk (pitch varies by reel index)
 *   playWin(amt, bet)   — ascending arpeggio scaled to win size
 *   playBigWin(type)    — fanfare for big/mega/epic wins
 *   playFreeSpins()     — rising sweep + bell chord
 *   toggle()            — mute / unmute; returns new enabled state
 */
class SoundManager {
  constructor() {
    this._actx = null;
    this._spinSource = null;
    this._spinLfo = null;
    this._spinGainNode = null;
    this.enabled = true;
  }

  // ── AudioContext (lazy, survives browser autoplay policy) ──────────────
  _ctx() {
    if (!this._actx) {
      this._actx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._actx.state === 'suspended') this._actx.resume();
    return this._actx;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stopSpin();
    return this.enabled;
  }

  // ── Click / button press ────────────────────────────────────────────────
  playClick() {
    if (!this.enabled) return;
    try {
      const ctx = this._ctx();
      const now = ctx.currentTime;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (_) { /* audio unavailable */ }
  }

  // ── Spinning rumble loop ────────────────────────────────────────────────
  startSpin() {
    if (!this.enabled) return;
    try {
      if (this._spinSource) this.stopSpin();
      const ctx = this._ctx();
      const now = ctx.currentTime;

      const bufLen = Math.floor(ctx.sampleRate * 0.5);
      const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data   = buffer.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

      const noiseSource  = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop   = true;

      const bpf = ctx.createBiquadFilter();
      bpf.type  = 'bandpass';
      bpf.frequency.value = 130;
      bpf.Q.value = 1.8;

      const lfo     = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 14;
      lfoGain.gain.value  = 55;
      lfo.connect(lfoGain);
      lfoGain.connect(bpf.frequency);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.14, now + 0.35);

      noiseSource.connect(bpf);
      bpf.connect(masterGain);
      masterGain.connect(ctx.destination);

      noiseSource.start(now);
      lfo.start(now);

      this._spinSource   = noiseSource;
      this._spinLfo      = lfo;
      this._spinGainNode = masterGain;
    } catch (_) { /* audio unavailable */ }
  }

  stopSpin() {
    if (!this._spinSource) return;
    try {
      const ctx = this._ctx();
      const now = ctx.currentTime;
      this._spinGainNode.gain.setValueAtTime(this._spinGainNode.gain.value, now);
      this._spinGainNode.gain.linearRampToValueAtTime(0, now + 0.22);
      this._spinSource.stop(now + 0.22);
      this._spinLfo.stop(now + 0.22);
    } catch (_) { /* already stopped */ }
    this._spinSource   = null;
    this._spinLfo      = null;
    this._spinGainNode = null;
  }

  // ── Per-reel stop "clunk" ───────────────────────────────────────────────
  playReelStop(reelIndex = 0) {
    if (!this.enabled) return;
    try {
      const ctx  = this._ctx();
      const now  = ctx.currentTime;
      const base = 200 - reelIndex * 18;

      const osc     = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 0.38, now + 0.13);
      oscGain.gain.setValueAtTime(0.42, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);

      const clickLen = Math.floor(ctx.sampleRate * 0.025);
      const clickBuf = ctx.createBuffer(1, clickLen, ctx.sampleRate);
      const d        = clickBuf.getChannelData(0);
      for (let i = 0; i < clickLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / clickLen);
      const ns     = ctx.createBufferSource();
      ns.buffer    = clickBuf;
      const nsGain = ctx.createGain();
      nsGain.gain.value = 0.18;
      ns.connect(nsGain);
      nsGain.connect(ctx.destination);
      ns.start(now);
    } catch (_) { /* audio unavailable */ }
  }

  // ── Win arpeggio ────────────────────────────────────────────────────────
  playWin(amount = 0, bet = 1) {
    if (!this.enabled) return;
    try {
      const ctx  = this._ctx();
      const now  = ctx.currentTime;
      const mult = bet > 0 ? amount / bet : 1;
      const noteCount = Math.min(3 + Math.floor(mult / 6), 8);
      const scale = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];

      for (let i = 0; i < noteCount; i++) {
        const t    = now + i * 0.11;
        const freq = scale[i % scale.length];
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    } catch (_) { /* audio unavailable */ }
  }

  // ── Big win fanfare ────────────────────────────────────────────────────
  playBigWin(type = 'big') {
    if (!this.enabled) return;
    try {
      const ctx = this._ctx();
      const now = ctx.currentTime;
      const sequences = {
        big:  [523.25, 659.25, 783.99, 1046.5],
        mega: [523.25, 659.25, 783.99, 1046.5, 1318.51],
        epic: [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
      };
      const seq = sequences[type] || sequences.big;

      seq.forEach((freq, i) => {
        const t       = now + i * 0.14;
        const osc     = ctx.createOscillator();
        const gain    = ctx.createGain();
        const lfo     = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        lfo.frequency.value = 6;
        lfoGain.gain.value  = freq * 0.015;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);  lfo.start(t);
        osc.stop(t + 0.45); lfo.stop(t + 0.45);
      });
    } catch (_) { /* audio unavailable */ }
  }

  // ── Free spins trigger ─────────────────────────────────────────────────
  playFreeSpins() {
    if (!this.enabled) return;
    try {
      const ctx = this._ctx();
      const now = ctx.currentTime;

      const sweep     = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweep.type = 'sawtooth';
      sweep.frequency.setValueAtTime(180, now);
      sweep.frequency.exponentialRampToValueAtTime(1800, now + 0.65);
      sweepGain.gain.setValueAtTime(0.13, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      sweep.connect(sweepGain);
      sweepGain.connect(ctx.destination);
      sweep.start(now);
      sweep.stop(now + 0.72);

      [1046.5, 1318.51, 1567.98].forEach((freq, i) => {
        const t    = now + 0.55 + i * 0.1;
        const bell = ctx.createOscillator();
        const bg   = ctx.createGain();
        bell.type  = 'sine';
        bell.frequency.value = freq;
        bg.gain.setValueAtTime(0.2, t);
        bg.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        bell.connect(bg);
        bg.connect(ctx.destination);
        bell.start(t);
        bell.stop(t + 0.95);
      });
    } catch (_) { /* audio unavailable */ }
  }
}
