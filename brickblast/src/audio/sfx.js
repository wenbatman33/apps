// WebAudio 即時合成音效，零音檔依賴；高頻撞擊有節流避免爆音
let ctx = null;
let master = null;
let enabled = true;
let lastHit = 0;
let hitCount = 0;

export function initAudio() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.32;
  master.connect(ctx.destination);
}

export function resumeAudio() {
  if (!ctx) initAudio();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function setMuted(m) { enabled = !m; if (master) master.gain.value = m ? 0 : 0.32; }
export function isMuted() { return !enabled; }

function tone({ freq = 440, type = 'sine', dur = 0.12, gain = 0.5, sweep = 0, delay = 0 }) {
  if (!ctx || !enabled) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + sweep), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.2, gain = 0.4, freq = 1200, q = 1, delay = 0 }) {
  if (!ctx || !enabled) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t0);
}

// 撞擊：同一幀大量命中時只發聲數次，並隨連擊升高音高
export function sfxHit(pitchStep = 0) {
  if (!ctx) return;
  const now = ctx.currentTime;
  if (now - lastHit < 0.028) return;
  if (now - lastHit > 0.35) hitCount = 0;
  lastHit = now;
  hitCount = Math.min(24, hitCount + 1);
  const f = 520 + hitCount * 26 + pitchStep * 40;
  tone({ freq: f, type: 'square', dur: 0.05, gain: 0.14, sweep: -120 });
}

export function sfxBreak() { noise({ dur: 0.16, gain: 0.2, freq: 2400, q: 0.8 }); }
export function sfxFire() { tone({ freq: 300, type: 'triangle', dur: 0.1, gain: 0.22, sweep: 420 }); }
export function sfxPlus() {
  tone({ freq: 880, type: 'sine', dur: 0.1, gain: 0.2 });
  tone({ freq: 1320, type: 'sine', dur: 0.12, gain: 0.16, delay: 0.06 });
}
export function sfxTurn() { tone({ freq: 200, type: 'sine', dur: 0.16, gain: 0.14, sweep: 60 }); }
export function sfxWin() {
  [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.26, gain: 0.2, delay: i * 0.09 }));
}
export function sfxLose() {
  [440, 349, 262].forEach((f, i) => tone({ freq: f, type: 'sawtooth', dur: 0.3, gain: 0.18, delay: i * 0.13 }));
}
export function sfxLaser() {
  tone({ freq: 1500, type: 'sawtooth', dur: 0.26, gain: 0.2, sweep: -1200 });
  noise({ dur: 0.22, gain: 0.16, freq: 3000, q: 2 });
}
export function sfxMulti() {
  [660, 880, 1180].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.2, gain: 0.18, delay: i * 0.06 }));
}
export function sfxTap() { tone({ freq: 660, type: 'sine', dur: 0.06, gain: 0.14 }); }
