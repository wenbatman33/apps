/* ============================================================
 * 程式合成音效（WebAudio，免素材）
 * ============================================================ */
(function (H) {
  'use strict';

  var ctx = null, master = null;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(opt) {
    var c = ac(); if (!c || !H.Save.get().sound) return;
    var t = c.currentTime;
    var o = c.createOscillator(), g = c.createGain();
    o.type = opt.type || 'square';
    o.frequency.setValueAtTime(opt.f0, t);
    if (opt.f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.f1), t + opt.d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(opt.v || 0.2, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opt.d);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + opt.d + 0.02);
  }

  function noise(opt) {
    var c = ac(); if (!c || !H.Save.get().sound) return;
    var t = c.currentTime, d = opt.d || 0.2;
    var len = Math.floor(c.sampleRate * d);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var ch = buf.getChannelData(0);
    for (var i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, opt.decay || 2);
    var src = c.createBufferSource(); src.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = opt.filter || 'lowpass';
    f.frequency.setValueAtTime(opt.freq || 1200, t);
    if (opt.freq1) f.frequency.exponentialRampToValueAtTime(opt.freq1, t + d);
    var g = c.createGain(); g.gain.value = opt.v || 0.3;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  H.Sfx = {
    unlock: function () { ac(); },
    shoot: function () { tone({ type: 'square', f0: 720, f1: 180, d: 0.07, v: 0.10 }); noise({ d: 0.06, freq: 3000, v: 0.10 }); },
    hit: function () { tone({ type: 'triangle', f0: 320, f1: 120, d: 0.06, v: 0.10 }); },
    kill: function () { noise({ d: 0.22, freq: 900, freq1: 120, v: 0.22, decay: 2.5 }); tone({ type: 'sawtooth', f0: 160, f1: 50, d: 0.2, v: 0.12 }); },
    hurt: function () { tone({ type: 'sawtooth', f0: 220, f1: 70, d: 0.28, v: 0.22 }); },
    explode: function () { noise({ d: 0.45, freq: 1400, freq1: 80, v: 0.34, decay: 1.6 }); tone({ type: 'sine', f0: 110, f1: 32, d: 0.4, v: 0.2 }); },
    coin: function () { tone({ type: 'square', f0: 980, d: 0.05, v: 0.10 }); setTimeout(function () { tone({ type: 'square', f0: 1460, d: 0.09, v: 0.09 }); }, 45); },
    heal: function () { tone({ type: 'sine', f0: 520, f1: 900, d: 0.22, v: 0.16 }); },
    click: function () { tone({ type: 'square', f0: 620, f1: 880, d: 0.05, v: 0.12 }); },
    levelup: function () {
      [523, 659, 784, 1046].forEach(function (f, i) {
        setTimeout(function () { tone({ type: 'triangle', f0: f, d: 0.18, v: 0.16 }); }, i * 80);
      });
    },
    win: function () {
      [523, 659, 784, 1046, 1318].forEach(function (f, i) {
        setTimeout(function () { tone({ type: 'triangle', f0: f, d: 0.24, v: 0.18 }); }, i * 110);
      });
    },
    lose: function () {
      [392, 330, 262, 196].forEach(function (f, i) {
        setTimeout(function () { tone({ type: 'sawtooth', f0: f, d: 0.32, v: 0.16 }); }, i * 150);
      });
    },
    boss: function () { tone({ type: 'sawtooth', f0: 90, f1: 40, d: 0.9, v: 0.28 }); noise({ d: 0.7, freq: 400, v: 0.2 }); },
  };
})(window.HABBY);
