// WebAudio 即時合成音效，零音檔依賴；高頻撞擊有節流避免爆音
let ctx = null;
let master = null;
let enabled = true;
let lastHit = 0;

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

// 撞擊：固定單一音色，不隨連擊變調；同一幀大量命中時做節流避免爆音
export function sfxHit() {
  if (!ctx) return;
  const now = ctx.currentTime;
  if (now - lastHit < 0.026) return;
  lastHit = now;
  // 木琴般的清脆點擊：基頻＋一個泛音，快速衰減，固定音高不隨連擊變調
  tone({ freq: 784, type: 'sine', dur: 0.13, gain: 0.16 });
  tone({ freq: 1568, type: 'sine', dur: 0.06, gain: 0.045 });
}

export function sfxBreak() {
  // 磚塊碎裂：一顆稍高的鈴音配上一點空氣聲，不刺耳
  tone({ freq: 1175, type: 'sine', dur: 0.16, gain: 0.11 });
  noise({ dur: 0.1, gain: 0.07, freq: 3200, q: 1.4 });
}
export function sfxFire() { tone({ freq: 392, type: 'triangle', dur: 0.12, gain: 0.16, sweep: 200 }); }
export function sfxPlus() {
  // 上行三度，像收集音
  tone({ freq: 880, type: 'sine', dur: 0.13, gain: 0.16 });
  tone({ freq: 1319, type: 'sine', dur: 0.16, gain: 0.13, delay: 0.07 });
}
export function sfxTurn() { tone({ freq: 262, type: 'sine', dur: 0.18, gain: 0.1, sweep: 40 }); }
export function sfxWin() {
  [523, 659, 784, 1047].forEach((f, i) => {
    tone({ freq: f, type: 'sine', dur: 0.32, gain: 0.18, delay: i * 0.1 });
    tone({ freq: f * 2, type: 'sine', dur: 0.16, gain: 0.05, delay: i * 0.1 });
  });
}
export function sfxLose() {
  [440, 349, 262].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.38, gain: 0.15, delay: i * 0.14 }));
}
export function sfxLaser() {
  tone({ freq: 1400, type: 'triangle', dur: 0.28, gain: 0.15, sweep: -1000 });
  noise({ dur: 0.18, gain: 0.09, freq: 2600, q: 2.5 });
}
export function sfxMulti() {
  [659, 880, 1175].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.22, gain: 0.15, delay: i * 0.07 }));
}
export function sfxTap() { tone({ freq: 660, type: 'sine', dur: 0.08, gain: 0.12 }); }
