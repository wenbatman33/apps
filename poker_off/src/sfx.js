// ===========================================================================
// 音效（WebAudio 即時合成，免外部音檔、離線可用）
// 掛到 window.SFX，由 main.js 在對應事件呼叫
// ===========================================================================
(function () {
  let ctx = null;
  let muted = false;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    return ctx;
  }
  // 瀏覽器自動播放限制：首次使用者互動時喚醒音訊
  function resume() { const c = ac(); if (c.state === 'suspended') c.resume(); }
  window.addEventListener('pointerdown', resume);
  window.addEventListener('keydown', resume);

  // 單音
  function blip(freq, dur, type = 'sine', vol = 0.18, slideTo = null, delay = 0) {
    if (muted) return;
    const c = ac(); const t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  // 雜訊爆破（卡牌摩擦 / 棄牌咻聲）
  function noise(dur, vol, lpStart, lpEnd = null, delay = 0) {
    if (muted) return;
    const c = ac(); const t0 = c.currentTime + delay;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(lpStart, t0);
    if (lpEnd) f.frequency.exponentialRampToValueAtTime(lpEnd, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0); src.stop(t0 + dur + 0.03);
  }

  const SFX = {
    get muted() { return muted; },
    set muted(v) { muted = v; },
    toggle() { muted = !muted; if (!muted) resume(); return muted; },

    click() { blip(520, 0.04, 'square', 0.05); },          // 按鈕
    deal() { noise(0.07, 0.16, 5000); },                    // 發牌
    flip() { noise(0.06, 0.13, 6000); blip(880, 0.04, 'sine', 0.05); }, // 翻牌
    chip() {                                                 // 下注 / 跟注（疊籌碼）
      blip(1200, 0.045, 'sine', 0.10);
      blip(1700, 0.05, 'sine', 0.08, null, 0.05);
    },
    check() { blip(200, 0.09, 'sine', 0.16, 140); noise(0.04, 0.06, 1500); }, // 敲桌過牌
    fold() { noise(0.28, 0.20, 2200, 280); },               // 棄牌咻聲
    turn() { blip(740, 0.09, 'sine', 0.09, 880); },         // 輪到你
    win() {                                                  // 贏牌小琶音
      blip(523, 0.12, 'triangle', 0.16, null, 0);
      blip(659, 0.12, 'triangle', 0.16, null, 0.11);
      blip(784, 0.20, 'triangle', 0.18, null, 0.22);
    },
    lose() { blip(330, 0.18, 'sine', 0.12, 196); },         // 輸牌
  };

  window.SFX = SFX;
})();
