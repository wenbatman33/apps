/**
 * 音效與背景音樂系統
 * - 素材包未附音檔，因此 SFX 使用 WebAudio 即時合成做 placeholder
 * - 使用者日後可把音檔放到 audio/ 資料夾，命名見下方 EXTERNAL_AUDIO 對照表
 *   有檔案就會自動使用，沒檔案則 fallback 到合成音
 */
window.MSAudio = (function () {
  const VOL_KEY = 'mergeShooterVolume_v1';
  let ctx = null;
  let masterGain = null;
  let bgmEl = null;
  let bgmStarted = false;

  // 從 localStorage 載入使用者上次設定（音量 0~1、是否靜音）
  let prefs = { muted: false, masterVol: 0.6, bgmVol: 0.40 };
  try {
    const raw = localStorage.getItem(VOL_KEY);
    if (raw) prefs = Object.assign(prefs, JSON.parse(raw));
  } catch (e) {}
  let muted = !!prefs.muted;
  function persistPrefs() {
    try { localStorage.setItem(VOL_KEY, JSON.stringify(prefs)); } catch (e) {}
  }

  // 使用者之後可把這些檔案放進 audio/ 資料夾即會自動套用
  const EXTERNAL_AUDIO = {
    bgm:        'audio/bgm.mp3',
    shoot:      'audio/shoot.mp3',
    hit:        'audio/hit.mp3',
    enemyDie:   'audio/enemy_die.mp3',
    merge:      'audio/merge.mp3',
    coin:       'audio/coin.mp3',
    waveClear:  'audio/wave_clear.mp3',
    click:      'audio/click.mp3',
    upgrade:    'audio/upgrade.mp3',
    gameOver:   'audio/game_over.mp3',
  };

  // 偵測檔案是否存在
  const externalAvailable = {};
  function probe() {
    Object.entries(EXTERNAL_AUDIO).forEach(([k, url]) => {
      const a = new Audio();
      a.addEventListener('canplaythrough', () => { externalAvailable[k] = url; }, { once: true });
      a.addEventListener('error', () => { externalAvailable[k] = null; }, { once: true });
      a.src = url;
      a.load();
    });
  }
  probe();

  function ensureCtx() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      ctx = new C();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : prefs.masterVol;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, type = 'sine', dur = 0.1, vol = 0.3, attack = 0.005, release = 0.05, sweepTo = null }) {
    if (muted) return;
    ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (sweepTo !== null) osc.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.linearRampToValueAtTime(0, t + dur + release);
    osc.connect(g).connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + release + 0.02);
  }

  function noiseBurst({ dur = 0.08, vol = 0.25, hp = 800 }) {
    if (muted) return;
    ensureCtx();
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass'; filt.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filt).connect(g).connect(masterGain);
    src.start(t);
  }

  function playExternal(name) {
    if (muted || !externalAvailable[name]) return false;
    const a = new Audio(externalAvailable[name]);
    a.volume = 0.6;
    a.play().catch(() => {});
    return true;
  }

  // SFX presets
  const sfx = {
    shoot()     { if (!playExternal('shoot'))    { tone({ freq: 720, type: 'square', dur: 0.05, vol: 0.18, sweepTo: 320 }); noiseBurst({ dur: 0.04, vol: 0.1 }); } },
    hit()       { if (!playExternal('hit'))      { tone({ freq: 200, type: 'sawtooth', dur: 0.06, vol: 0.18, sweepTo: 80 }); } },
    enemyDie()  { if (!playExternal('enemyDie')) { tone({ freq: 350, type: 'square', dur: 0.18, vol: 0.2, sweepTo: 60 }); noiseBurst({ dur: 0.12, vol: 0.18, hp: 200 }); } },
    merge()     { if (!playExternal('merge'))    { tone({ freq: 520, type: 'triangle', dur: 0.08, vol: 0.22 }); setTimeout(() => tone({ freq: 780, type: 'triangle', dur: 0.12, vol: 0.22 }), 70); setTimeout(() => tone({ freq: 1040, type: 'triangle', dur: 0.16, vol: 0.22 }), 140); } },
    coin()      { if (!playExternal('coin'))     { tone({ freq: 880, type: 'square', dur: 0.05, vol: 0.18 }); setTimeout(() => tone({ freq: 1320, type: 'square', dur: 0.08, vol: 0.18 }), 50); } },
    waveClear() { if (!playExternal('waveClear')){ [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.25 }), i * 110)); } },
    click()     { if (!playExternal('click'))    { tone({ freq: 600, type: 'square', dur: 0.04, vol: 0.18 }); } },
    upgrade()   { if (!playExternal('upgrade'))  { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone({ freq: f, type: 'sine', dur: 0.12, vol: 0.25 }), i * 60)); } },
    gameOver()  { if (!playExternal('gameOver')) { [440, 350, 280, 220, 170].forEach((f, i) => setTimeout(() => tone({ freq: f, type: 'sawtooth', dur: 0.22, vol: 0.28 }), i * 140)); } },
  };

  // BGM — 若 audio/bgm.mp3 存在用真音檔，否則合成 ambient pad
  let bgmNodes = [];
  function startBgm() {
    if (bgmStarted || muted) return;
    bgmStarted = true;
    if (externalAvailable.bgm) {
      bgmEl = new Audio(externalAvailable.bgm);
      bgmEl.loop = true;
      bgmEl.volume = prefs.bgmVol;
      bgmEl.muted = muted;
      bgmEl.play().catch(() => { bgmStarted = false; });
      return;
    }
    // 合成簡單迴圈 BGM (placeholder)
    ensureCtx();
    const baseFreqs = [261.63, 329.63, 392.00, 523.25];
    const padGain = ctx.createGain();
    padGain.gain.value = 0.06;
    padGain.connect(masterGain);
    baseFreqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1 + i * 0.4);
      o.connect(g).connect(padGain);
      o.start();
      bgmNodes.push(o);
    });
    // 節拍 LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.25;
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain).connect(padGain.gain);
    lfo.start();
    bgmNodes.push(lfo);
  }
  function stopBgm() {
    if (bgmEl) { bgmEl.pause(); bgmEl = null; }
    bgmNodes.forEach(n => { try { n.stop(); } catch (e) {} });
    bgmNodes = [];
    bgmStarted = false;
  }

  function setMuted(v) {
    muted = !!v;
    prefs.muted = muted;
    persistPrefs();
    if (bgmEl) bgmEl.muted = muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : prefs.masterVol;
  }
  function isMuted() { return muted; }
  function toggleMuted() { setMuted(!muted); return muted; }

  // 設定整體音量 0~1（會持久化）
  function setMasterVolume(v) {
    prefs.masterVol = Math.max(0, Math.min(1, v));
    persistPrefs();
    if (!muted && masterGain) masterGain.gain.value = prefs.masterVol;
  }
  // 設定 BGM 音量 0~1（會持久化）
  function setBgmVolume(v) {
    prefs.bgmVol = Math.max(0, Math.min(1, v));
    persistPrefs();
    if (bgmEl) bgmEl.volume = prefs.bgmVol;
  }
  function getMasterVolume() { return prefs.masterVol; }
  function getBgmVolume() { return prefs.bgmVol; }

  return { ensureCtx, sfx, startBgm, stopBgm, setMuted, isMuted, toggleMuted,
           setMasterVolume, setBgmVolume, getMasterVolume, getBgmVolume };
})();
