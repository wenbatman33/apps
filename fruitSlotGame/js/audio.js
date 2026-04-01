/**
 * FruitSlot Audio Engine
 * 使用 Web Audio API 程序生成所有音效，不需要外部音效檔案
 */
const Audio = (() => {
  let ctx = null;
  let enabled = true;
  let masterGain = null;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.7;
      masterGain.connect(ctx.destination);
    } catch(e) {
      console.warn('Web Audio not supported');
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setEnabled(v) { enabled = v; if (masterGain) masterGain.gain.value = v ? 0.7 : 0; }
  function isEnabled()   { return enabled; }

  // ---- helpers ----
  function osc(type, freq, start, dur, gainVal = 0.3, gainEnd = 0, detune = 0) {
    if (!ctx || !enabled) return;
    const g = ctx.createGain();
    g.connect(masterGain);
    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), start + dur);

    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    o.connect(g);
    o.start(start);
    o.stop(start + dur + 0.01);
  }

  function noise(start, dur, gainVal = 0.2) {
    if (!ctx || !enabled) return;
    const bufLen = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.8;

    const g = ctx.createGain();
    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    src.start(start);
    src.stop(start + dur + 0.01);
  }

  // ---- 音效 ----

  /** 投幣音：金屬撞擊聲 */
  function coin() {
    if (!ctx || !enabled) return;
    resume();
    const t = ctx.currentTime;
    // 高頻金屬 click
    osc('sine', 1200, t,       0.05, 0.4, 0.001);
    osc('sine',  900, t+0.02,  0.08, 0.25, 0.001);
    osc('sine',  600, t+0.04,  0.12, 0.2,  0.001);
    noise(t, 0.04, 0.15);
  }

  /** 滾輪開始旋轉：機械聲 */
  function spinStart() {
    if (!ctx || !enabled) return;
    resume();
    const t = ctx.currentTime;
    // 低沉馬達聲
    osc('sawtooth', 80,  t,      0.3, 0.3, 0.0001);
    osc('sawtooth', 120, t+0.05, 0.25, 0.2, 0.0001);
    noise(t, 0.15, 0.08);
  }

  /** 滾輪滾動中的嗒嗒聲（每格） */
  function tick() {
    if (!ctx || !enabled) return;
    resume();
    const t = ctx.currentTime;
    osc('square', 220, t, 0.04, 0.18, 0.001);
    noise(t, 0.03, 0.1);
  }

  /** 滾輪停止：重擊聲 */
  function reelStop() {
    if (!ctx || !enabled) return;
    resume();
    const t = ctx.currentTime;
    osc('sine',  150, t,      0.08, 0.5, 0.001);
    osc('sine',   80, t+0.02, 0.1,  0.4, 0.001);
    noise(t, 0.06, 0.25);
  }

  /** 一般中獎：歡快的上行音階 */
  function win() {
    if (!ctx || !enabled) return;
    resume();
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((f, i) => {
      osc('sine', f, t + i*0.1, 0.15, 0.35, 0.001);
    });
    // 和弦底
    osc('triangle', 261, t, 0.4, 0.2, 0.001);
  }

  /** 大獎中獎：豐富的多層音效 */
  function bigWin() {
    if (!ctx || !enabled) return;
    resume();
    const t = ctx.currentTime;
    const melody = [523, 659, 784, 1047, 1319, 1568, 2093];
    melody.forEach((f, i) => {
      osc('sine',     f,   t + i*0.12, 0.2, 0.4, 0.001);
      osc('triangle', f/2, t + i*0.12, 0.2, 0.2, 0.001);
    });
    // 打擊聲
    [0, 0.36, 0.72].forEach(delay => {
      noise(t + delay, 0.05, 0.3);
      osc('sine', 200, t + delay, 0.05, 0.5, 0.001);
    });
  }

  /** JACKPOT：壯觀的音效序列 */
  function jackpot() {
    if (!ctx || !enabled) return;
    resume();
    const t = ctx.currentTime;

    // 上行琶音
    const arp = [261, 329, 392, 523, 659, 784, 1047, 1319];
    arp.forEach((f, i) => {
      osc('sine',     f,   t + i*0.08, 0.2, 0.5, 0.001);
      osc('square',   f,   t + i*0.08, 0.2, 0.08, 0.001);
      osc('triangle', f*2, t + i*0.08, 0.2, 0.15, 0.001);
    });

    // 勝利和弦
    const chord = [523, 659, 784, 1047];
    chord.forEach(f => {
      osc('sine',     f, t+0.8, 1.2, 0.3, 0.001);
      osc('triangle', f, t+0.8, 1.2, 0.1, 0.001);
    });

    // 鼓點
    for (let i = 0; i < 6; i++) {
      noise(t + 0.8 + i*0.2, 0.08, 0.4);
      osc('sine', 80, t + 0.8 + i*0.2, 0.08, 0.6, 0.001);
    }
  }

  /** 押注按鈕點擊聲 */
  function click() {
    if (!ctx || !enabled) return;
    resume();
    const t = ctx.currentTime;
    osc('sine', 800, t, 0.04, 0.15, 0.001);
    osc('sine', 400, t + 0.02, 0.03, 0.1, 0.001);
  }

  /** 連續出幣計數聲 */
  function coinCount() {
    if (!ctx || !enabled) return;
    resume();
    const t = ctx.currentTime;
    osc('sine', 1400, t,      0.025, 0.2, 0.001);
    osc('sine',  700, t+0.01, 0.025, 0.15, 0.001);
  }

  /** 無法操作（餘額不足等）*/
  function error() {
    if (!ctx || !enabled) return;
    resume();
    const t = ctx.currentTime;
    osc('square', 200, t,      0.1, 0.25, 0.001);
    osc('square', 150, t+0.1,  0.1, 0.25, 0.001);
  }

  return { init, resume, setEnabled, isEnabled, coin, spinStart, tick, reelStop, win, bigWin, jackpot, click, coinCount, error };
})();
