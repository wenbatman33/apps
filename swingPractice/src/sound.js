// ============ WebAudio 合成音效（免外部檔案） ============
let ctx = null, master = null;
let enabled = true;

function ac(){
  if (!ctx){
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = .9; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function noiseBuffer(sec = 1){
  const c = ac(), n = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, n, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function env(g, t0, a, d, peak){
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

export const Sound = {
  setEnabled(v){ enabled = v; if (master) master.gain.value = v ? .9 : 0; },
  isEnabled(){ return enabled; },
  unlock(){ ac(); },

  // 木棒擊球：quality 0~1（越高越清脆）
  crack(quality = 1){
    if (!enabled) return; const c = ac(), t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = noiseBuffer(.25);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = 900 + quality * 2100; bp.Q.value = 2.4;
    const g = c.createGain(); env(g, t, .002, .13 + quality * .1, .55 + quality * .35);
    src.connect(bp).connect(g).connect(master); src.start(t); src.stop(t + .4);
    // 木頭共鳴
    const o = c.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(280 + quality * 240, t);
    o.frequency.exponentialRampToValueAtTime(120, t + .16);
    const og = c.createGain(); env(og, t, .003, .16, .25 + quality * .25);
    o.connect(og).connect(master); o.start(t); o.stop(t + .3);
  },

  // 揮空
  whoosh(){
    if (!enabled) return; const c = ac(), t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = noiseBuffer(.4);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(380, t); bp.frequency.exponentialRampToValueAtTime(1800, t + .17);
    const g = c.createGain(); env(g, t, .05, .18, .28);
    src.connect(bp).connect(g).connect(master); src.start(t); src.stop(t + .45);
  },

  // 捕手接球
  mitt(){
    if (!enabled) return; const c = ac(), t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = noiseBuffer(.2);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = c.createGain(); env(g, t, .003, .1, .42);
    src.connect(lp).connect(g).connect(master); src.start(t); src.stop(t + .3);
  },

  // 投球出手
  release(){
    if (!enabled) return; const c = ac(), t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(620, t); o.frequency.exponentialRampToValueAtTime(220, t + .1);
    const g = c.createGain(); env(g, t, .004, .09, .1);
    o.connect(g).connect(master); o.start(t); o.stop(t + .2);
  },

  // 全壘打：清脆的上行勝利音（純樂音，不用噪音合成歡呼——那個聽起來像雜訊）
  cheer(big = false){
    if (!enabled) return; const c = ac(), t = c.currentTime;
    const notes = big ? [523.3, 659.3, 784, 1046.5, 1318.5] : [523.3, 659.3, 784, 1046.5];
    notes.forEach((f, i) => {
      const at = t + i * .095;
      for (const [type, det, vol] of [['triangle', 1, .17], ['sine', 2.005, .085]]){
        const o = c.createOscillator(); o.type = type; o.frequency.value = f * det;
        const g = c.createGain(); env(g, at, .012, .38, vol);
        o.connect(g).connect(master); o.start(at); o.stop(at + .55);
      }
    });
    if (big){                                     // 尾音：最高音多敲一次 + 亮鈴
      const at = t + notes.length * .095 + .06;
      [1046.5, 1568].forEach((f, i) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = c.createGain(); env(g, at + i * .04, .01, .85, .13);
        o.connect(g).connect(master); o.start(at + i * .04); o.stop(at + 1.1);
      });
    }
  },

  // 失手：柔和的下行兩音
  sigh(){
    if (!enabled) return; const c = ac(), t = c.currentTime;
    [392, 294].forEach((f, i) => {
      const at = t + i * .13;
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = c.createGain(); env(g, at, .02, .3, .1);
      o.connect(g).connect(master); o.start(at); o.stop(at + .45);
    });
  },

  ui(hi = false){
    if (!enabled) return; const c = ac(), t = c.currentTime;
    const o = c.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(hi ? 880 : 520, t);
    o.frequency.exponentialRampToValueAtTime(hi ? 1320 : 660, t + .07);
    const g = c.createGain(); env(g, t, .005, .08, .16);
    o.connect(g).connect(master); o.start(t); o.stop(t + .2);
  },

  // 球場環境底噪：預設關閉（持續的濾波噪音聽起來像雜訊，不像人聲）
  ambient(){ /* no-op */ },
};
