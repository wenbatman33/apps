// 程式合成音效（WebAudio），不需外部音檔
let ctx = null;
let master = null;
export const audio = { enabled: true };

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function unlockAudio() { try { ac(); } catch {} }

function tone({ freq = 440, to = freq, dur = 0.12, type = 'sine', vol = 0.4, delay = 0 }) {
  if (!audio.enabled) return;
  try {
    const c = ac(), t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch {}
}

let eatPitch = 0;
export const SFX = {
  eat() {
    eatPitch = Math.min(eatPitch + 1, 12);
    clearTimeout(SFX._et);
    SFX._et = setTimeout(() => { eatPitch = 0; }, 700);
    tone({ freq: 520 + eatPitch * 26, to: 760 + eatPitch * 30, dur: 0.07, type: 'triangle', vol: 0.16 });
  },
  boost() { tone({ freq: 180, to: 420, dur: 0.18, type: 'sawtooth', vol: 0.12 }); },
  kill() {
    tone({ freq: 300, to: 900, dur: 0.14, type: 'square', vol: 0.2 });
    tone({ freq: 700, to: 1400, dur: 0.18, type: 'triangle', vol: 0.16, delay: 0.07 });
  },
  die() {
    tone({ freq: 420, to: 70, dur: 0.7, type: 'sawtooth', vol: 0.28 });
    tone({ freq: 220, to: 45, dur: 0.9, type: 'sine', vol: 0.22, delay: 0.05 });
  },
  click() { tone({ freq: 640, to: 880, dur: 0.07, type: 'triangle', vol: 0.22 }); },
  start() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, to: f * 1.02, dur: 0.16, type: 'triangle', vol: 0.2, delay: i * 0.07 }));
  },
};
