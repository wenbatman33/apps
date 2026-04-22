// 用 Web Audio API 合成音效（不需外部檔案）
let ctx = null;
let enabled = true;

function ensureCtx() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function setEnabled(v) { enabled = v; }

// 使用者互動後解鎖 AudioContext
export function unlock() {
  const c = ensureCtx();
  if (c.state === "suspended") c.resume();
}

// 兩球撞擊：噪音短促 + 高頻衰減
export function playClack(intensity = 1) {
  if (!enabled) return;
  const c = ensureCtx();
  const t = c.currentTime;
  const vol = Math.min(0.6, 0.12 + intensity * 0.35);
  // 高頻咔聲：filtered noise
  const buf = c.createBuffer(1, 512, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = "bandpass";
  bp.frequency.value = 2200 + intensity * 1500; bp.Q.value = 6;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  src.connect(bp); bp.connect(g); g.connect(c.destination);
  src.start(t); src.stop(t + 0.1);
}

// 球撞枱邊：較低沉、比較軟
export function playCushion(intensity = 1) {
  if (!enabled) return;
  const c = ensureCtx();
  const t = c.currentTime;
  const vol = Math.min(0.5, 0.08 + intensity * 0.3);
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(240, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + 0.16);
}

// 進袋：低沉「咚」聲 + 回音
export function playPocket() {
  if (!enabled) return;
  const c = ensureCtx();
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
  const g = c.createGain();
  g.gain.setValueAtTime(0.45, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + 0.4);
}

// 擊球瞬間（較實心）
export function playCueStrike(intensity = 1) {
  if (!enabled) return;
  const c = ensureCtx();
  const t = c.currentTime;
  // 短噪音 + 木質感
  const buf = c.createBuffer(1, 1024, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = "bandpass";
  bp.frequency.value = 1200; bp.Q.value = 3;
  const g = c.createGain();
  g.gain.setValueAtTime(0.15 + intensity * 0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  src.connect(bp); bp.connect(g); g.connect(c.destination);
  src.start(t); src.stop(t + 0.12);
}

// 獲勝短旋律
export function playWin() {
  if (!enabled) return;
  const c = ensureCtx();
  const t = c.currentTime;
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const g = c.createGain();
    const ts = t + i * 0.12;
    g.gain.setValueAtTime(0.0001, ts);
    g.gain.exponentialRampToValueAtTime(0.3, ts + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ts + 0.18);
    o.connect(g); g.connect(c.destination);
    o.start(ts); o.stop(ts + 0.22);
  });
}
