// ============ WebAudio 合成音效 ============
let ctx = null, master = null, noiseBuf = null;
let lastClink = 0;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    // 白噪音 buffer（爆炸/搖晃用）
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.25, decay = true, delay = 0 } = {}) {
  const c = ac(), t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  if (decay) g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.3, freq = 800, q = 0.6, delay = 0 } = {}) {
  const c = ac(), t = c.currentTime + delay;
  const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t); s.stop(t + dur + 0.02);
}

export const Sound = {
  unlock() { ac(); },
  // 硬幣碰撞（節流）
  clink(strength = 1) {
    const now = performance.now();
    if (now - lastClink < 55) return;
    lastClink = now;
    const v = Math.min(0.16, 0.05 + strength * 0.04);
    tone(2200 + Math.random() * 900, 0.06, { type: 'triangle', vol: v });
    tone(3400 + Math.random() * 1200, 0.04, { type: 'sine', vol: v * 0.6 });
  },
  insert() { tone(920, 0.08, { type: 'square', vol: 0.1 }); tone(1380, 0.1, { type: 'sine', vol: 0.12, delay: 0.04 }); },
  score(combo = 0) {
    const base = 620 * Math.pow(1.06, Math.min(combo, 20));
    tone(base, 0.1, { type: 'sine', vol: 0.2 });
    tone(base * 1.5, 0.14, { type: 'sine', vol: 0.14, delay: 0.05 });
  },
  bigScore() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { vol: 0.18, delay: i * 0.07 })); },
  badScore() { tone(220, 0.25, { type: 'sawtooth', vol: 0.15 }); tone(160, 0.3, { type: 'sawtooth', vol: 0.12, delay: 0.1 }); },
  explosion(big = false) {
    noise(big ? 0.7 : 0.4, { vol: big ? 0.5 : 0.32, freq: big ? 500 : 900 });
    tone(big ? 55 : 80, big ? 0.6 : 0.35, { type: 'sine', vol: 0.4 });
  },
  laser() { const c = ac(), t = c.currentTime; const o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(2800, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.25);
    g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.32); },
  shake() { noise(0.5, { vol: 0.25, freq: 300 }); },
  buy() { tone(880, 0.09, { vol: 0.16 }); tone(1320, 0.12, { vol: 0.16, delay: 0.07 }); },
  error() { tone(200, 0.15, { type: 'square', vol: 0.1 }); },
  ticket() { tone(1560, 0.07, { type: 'triangle', vol: 0.13 }); },
  wheelTick() { tone(1900, 0.03, { type: 'square', vol: 0.07 }); },
  wheelWin() { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.2, { vol: 0.2, delay: i * 0.09 })); },
  roundWin() { [523, 659, 784, 1046, 1319].forEach((f, i) => tone(f, 0.25, { vol: 0.2, delay: i * 0.11 })); },
  fail() { [440, 370, 311, 233].forEach((f, i) => tone(f, 0.3, { type: 'sawtooth', vol: 0.14, delay: i * 0.16 })); },
  spawnPop() { tone(700 + Math.random() * 500, 0.06, { type: 'triangle', vol: 0.08 }); },
  grow() { const c = ac(), t = c.currentTime; const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.4);
    g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5); },
};
