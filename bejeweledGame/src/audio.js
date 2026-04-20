// 音效系統：Web Audio API 版本
// 取代先前 HTMLAudio 池（iOS Safari 同時播多個 HTMLAudio 會卡主執行緒）
// 單一 AudioContext + 預先 decode 成 AudioBuffer；每次播放新建極輕量的 BufferSource
// 對外 API 與舊版完全相同，所以 game/gameover/menu 不用改。

const BASE = "sounds/";

let ctx = null;
let masterGain = null;
const buffers = new Map();       // name -> AudioBuffer | "loading" | "failed"
const loadPromises = new Map();  // name -> Promise

let muted = false;
const sfxVolume   = 0.7;
const voiceVolume = 0.95;
const musicVolume = 0.35;

// 同時播放上限；超過直接 drop，避免 iOS 節點堆積造成卡頓
const MAX_CONCURRENT = 6;
let activeCount = 0;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
  } catch { ctx = null; }
  return ctx;
}

// 抓 + 解碼音檔，快取 AudioBuffer
function getBuffer(name) {
  const cached = buffers.get(name);
  if (cached && cached !== "loading" && cached !== "failed") return Promise.resolve(cached);
  if (cached === "loading") return loadPromises.get(name);
  if (cached === "failed") return Promise.resolve(null);
  const ac = ensureCtx();
  if (!ac) return Promise.resolve(null);
  buffers.set(name, "loading");
  const p = fetch(BASE + name)
    .then(r => r.arrayBuffer())
    .then(ab => new Promise((res, rej) => {
      // Safari 舊版 decodeAudioData 只支援 callback；新版回 Promise — 兩邊都接
      try {
        const ret = ac.decodeAudioData(ab, res, rej);
        if (ret && typeof ret.then === "function") ret.then(res, rej);
      } catch (e) { rej(e); }
    }))
    .then(buf => { buffers.set(name, buf); return buf; })
    .catch(() => { buffers.set(name, "failed"); return null; });
  loadPromises.set(name, p);
  return p;
}

function preloadAll(names) {
  for (const n of names) getBuffer(n);
}

// 熱門音效：遊戲中高頻使用，立刻開始下載解碼
const HOT = [
  "select.mp3", "badmove.mp3", "tick.mp3", "gem_shatters.mp3",
  "button_press.mp3", "button_mouseover.mp3", "nextlevel.mp3",
  "rankup.mp3", "gem_hit.mp3", "countdown_warning.mp3",
  "speedmatch1.mp3", "speedmatch3.mp3", "speedmatch5.mp3",
  "speedmatch7.mp3", "speedmatch9.mp3",
];
const VOICES = [
  "voice_good.mp3", "voice_excellent.mp3", "voice_awesome.mp3",
  "voice_spectacular.mp3", "voice_unbelievable.mp3",
  "voice_extraordinary.mp3", "voice_blazingspeed.mp3",
  "voice_gameover.mp3", "voice_timeup.mp3", "voice_nomoremoves.mp3",
  "voice_go.mp3", "voice_getready.mp3", "voice_thirtyseconds.mp3",
  "voice_welcometobejeweled.mp3", "voice_levelcomplete.mp3",
];
// 不在模組載入時就 decode（部分舊版 Safari 需要 user gesture 才允許）
// 改在第一次 unlockAudio() 時統一預載

function startBuffer(buf, opts) {
  if (activeCount >= MAX_CONCURRENT) return;
  try {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    const vol = Math.max(0, Math.min(1,
      (opts.volume ?? 1) * (opts.isVoice ? voiceVolume : sfxVolume)));
    g.gain.value = vol;
    src.connect(g).connect(masterGain);
    activeCount++;
    src.onended = () => { activeCount = Math.max(0, activeCount - 1); };
    src.start(0);
  } catch {
    activeCount = Math.max(0, activeCount - 1);
  }
}

function play(name, opts = {}) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  if (activeCount >= MAX_CONCURRENT) return;
  const cached = buffers.get(name);
  if (cached && cached !== "loading" && cached !== "failed") {
    startBuffer(cached, opts);
    return;
  }
  // 還沒載入完：先補 load，不等這次播放（避免掉滯）
  getBuffer(name).then(buf => { if (buf) startBuffer(buf, opts); });
}

// ---------- 對外 API（與舊版完全一致）----------

let preloaded = false;
export function unlockAudio() {
  const ac = ensureCtx();
  if (ac && ac.state === "suspended") ac.resume().catch(() => {});
  if (!preloaded) {
    preloaded = true;
    preloadAll(HOT);
    preloadAll(VOICES);
  }
}

export function playSwap() { play("select.mp3", { volume: 0.55 }); }

// comboIndex 從 0 起算（0=第一次配對、1=第一段連鎖、...）
export function playMatch(comboIndex = 0, gemCount = 3) {
  const raw = Math.min(9, comboIndex + 1);
  const step = raw <= 1 ? 1 : raw <= 3 ? 3 : raw <= 5 ? 5 : raw <= 7 ? 7 : 9;
  play(`speedmatch${step}.mp3`, { volume: 0.75 });
  if (gemCount >= 5) play("gem_shatters.mp3", { volume: 0.5 });
  const voice = pickComboVoice(comboIndex + 1, gemCount);
  if (voice) setTimeout(() => play(voice, { volume: 1, isVoice: true }), 120);
}

function pickComboVoice(combo, gemCount) {
  if (combo >= 8) return "voice_blazingspeed.mp3";
  if (combo >= 6) return "voice_extraordinary.mp3";
  if (combo >= 5) return "voice_unbelievable.mp3";
  if (combo >= 4) return "voice_spectacular.mp3";
  if (combo >= 3) return "voice_awesome.mp3";
  if (combo >= 2) return "voice_excellent.mp3";
  if (gemCount >= 5) return "voice_excellent.mp3";
  if (gemCount >= 4) return "voice_good.mp3";
  return null;
}

export function playInvalid() { play("badmove.mp3", { volume: 0.7 }); }
export function playDrop()    { play("gem_hit.mp3",  { volume: 0.25 }); }

export function playGameOver(reason) {
  if (reason === "time")        play("voice_timeup.mp3",      { volume: 1, isVoice: true });
  else if (reason === "nomove") play("voice_nomoremoves.mp3", { volume: 1, isVoice: true });
  else                          play("voice_gameover.mp3",    { volume: 1, isVoice: true });
}

export function playHighScore() {
  play("rankup.mp3", { volume: 0.9 });
  setTimeout(() => play("voice_levelcomplete.mp3", { volume: 1, isVoice: true }), 400);
}

export function playTick()          { play("tick.mp3", { volume: 0.5 }); }
export function playThirtySeconds() { play("voice_thirtyseconds.mp3", { volume: 1, isVoice: true }); }
export function playGetReady()      { play("voice_getready.mp3",      { volume: 1, isVoice: true }); }
export function playGo()            { play("voice_go.mp3",            { volume: 1, isVoice: true }); }
export function playButton()        { play("button_press.mp3",     { volume: 0.45 }); }
export function playHover()         { play("button_mouseover.mp3", { volume: 0.25 }); }

// ---------- 背景音樂 ----------
// 長時間 loop 的 bgm 用 HTMLAudio 即可（只有一軌、不需要重疊）
// Web Audio 得整首解碼到記憶體，反而浪費
let music = null;
let currentTrack = null;

export function playMusic(name) {
  if (muted) return;
  if (currentTrack === name && music && !music.paused) return;
  stopMusic();
  music = new Audio(BASE + name);
  music.loop = true;
  music.volume = musicVolume;
  currentTrack = name;
  const pr = music.play();
  if (pr?.catch) pr.catch(() => {});
}

export function stopMusic() {
  if (music) {
    try { music.pause(); } catch {}
    music = null;
    currentTrack = null;
  }
}

// ---------- 靜音控制 ----------
export function setMuted(m) {
  muted = m;
  try {
    if (muted && music) music.pause();
    else if (!muted && music) music.play().catch(() => {});
  } catch {}
  try { localStorage.setItem("bejeweled_muted", String(muted)); } catch {}
}

export function isMuted() { return muted; }

// 還原上次的靜音狀態
try {
  muted = localStorage.getItem("bejeweled_muted") === "true";
} catch {}
