// MP3 音效系統：使用原版 Bejeweled 音檔
// 保持與舊 Web Audio 版本一致的 API，讓 game/gameover 場景幾乎不用改

const BASE = "sounds/";
const pools = new Map();
let muted = false;

let sfxVolume = 0.7;
let voiceVolume = 0.95;
let musicVolume = 0.35;

// 預先建立每個音效 N 份副本，支援重疊播放
function preload(name, count = 3) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    const a = new Audio(BASE + name);
    a.preload = "auto";
    arr.push(a);
  }
  pools.set(name, { arr, idx: 0 });
}

// 熱門音效預載（需要快速重疊）
const HOT = [
  "select.mp3", "badmove.mp3", "tick.mp3", "gem_shatters.mp3",
  "button_press.mp3", "button_mouseover.mp3", "nextlevel.mp3",
  "rankup.mp3", "gem_hit.mp3", "countdown_warning.mp3",
];
for (let i = 1; i <= 9; i++) HOT.push(`speedmatch${i}.mp3`);
HOT.forEach(n => preload(n, 3));

// 語音（每個單一副本即可）
const VOICES = [
  "voice_good.mp3", "voice_excellent.mp3", "voice_awesome.mp3",
  "voice_spectacular.mp3", "voice_unbelievable.mp3",
  "voice_extraordinary.mp3", "voice_blazingspeed.mp3",
  "voice_gameover.mp3", "voice_timeup.mp3", "voice_nomoremoves.mp3",
  "voice_go.mp3", "voice_getready.mp3", "voice_thirtyseconds.mp3",
  "voice_welcometobejeweled.mp3", "voice_levelcomplete.mp3",
];
VOICES.forEach(n => preload(n, 1));

function play(name, opts = {}) {
  if (muted) return null;
  let p = pools.get(name);
  if (!p) {
    preload(name, 1);
    p = pools.get(name);
  }
  const a = p.arr[p.idx];
  p.idx = (p.idx + 1) % p.arr.length;
  try {
    a.currentTime = 0;
    a.volume = Math.max(0, Math.min(1, (opts.volume ?? 1) * (opts.isVoice ? voiceVolume : sfxVolume)));
    const pr = a.play();
    if (pr?.catch) pr.catch(() => {});
  } catch {}
  return a;
}

// ---------- 對外 API（保留原名）----------

export function unlockAudio() {
  // HTMLAudio 在使用者事件後即可播放；此處僅做 marker
}

export function playSwap() {
  play("select.mp3", { volume: 0.55 });
}

// comboIndex 從 0 起算（0=第一次配對、1=第一段連鎖、...）
export function playMatch(comboIndex = 0, gemCount = 3) {
  const step = Math.min(9, comboIndex + 1);
  play(`speedmatch${step}.mp3`, { volume: 0.75 });
  if (gemCount >= 5) play("gem_shatters.mp3", { volume: 0.5 });

  const voice = pickComboVoice(comboIndex + 1, gemCount);
  if (voice) {
    // 小延遲讓碰撞音與語音不會完全重疊
    setTimeout(() => play(voice, { volume: 1, isVoice: true }), 120);
  }
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

export function playInvalid() {
  play("badmove.mp3", { volume: 0.7 });
}

export function playDrop() {
  play("gem_hit.mp3", { volume: 0.25 });
}

export function playGameOver(reason) {
  // reason: "time" | "nomove" | undefined
  if (reason === "time") {
    play("voice_timeup.mp3", { volume: 1, isVoice: true });
  } else if (reason === "nomove") {
    play("voice_nomoremoves.mp3", { volume: 1, isVoice: true });
  } else {
    play("voice_gameover.mp3", { volume: 1, isVoice: true });
  }
}

export function playHighScore() {
  play("rankup.mp3", { volume: 0.9 });
  setTimeout(() => play("voice_levelcomplete.mp3", { volume: 1, isVoice: true }), 400);
}

export function playTick() {
  play("tick.mp3", { volume: 0.5 });
}

export function playThirtySeconds() {
  play("voice_thirtyseconds.mp3", { volume: 1, isVoice: true });
}

export function playGetReady() {
  play("voice_getready.mp3", { volume: 1, isVoice: true });
}

export function playGo() {
  play("voice_go.mp3", { volume: 1, isVoice: true });
}

export function playButton() {
  play("button_press.mp3", { volume: 0.45 });
}

export function playHover() {
  play("button_mouseover.mp3", { volume: 0.25 });
}

// ---------- 背景音樂 ----------
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
