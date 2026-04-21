// Web Audio 小音效（無音效檔，純合成）
let ctx = null;
let enabled = true;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setAudioEnabled(v) { enabled = v; }

export function playSfx(type) {
  if (!enabled) return;
  const ac = ensureCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain).connect(ac.destination);

  if (type === "hit") {
    osc.type = "square"; osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } else if (type === "wall") {
    osc.type = "triangle"; osc.frequency.setValueAtTime(360, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now); osc.stop(now + 0.08);
  } else if (type === "goal") {
    osc.type = "sawtooth"; osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.start(now); osc.stop(now + 0.5);
  } else if (type === "click") {
    osc.type = "sine"; osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now); osc.stop(now + 0.05);
  }
}
