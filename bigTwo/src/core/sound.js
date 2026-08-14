// 音效播放：集中管理音量、靜音（記住設定），以 key 播放
// 用法：window.SFX.play('sfx_play')；靜音切換 window.SFX.toggle()

(function () {
  // 各音效音量（牌/選取較輕、勝負較滿）
  const VOL = {
    sfx_deal: 0.55,
    sfx_play: 0.7,
    sfx_select: 0.4,
    sfx_button: 0.45,
    sfx_pass: 0.6,
    sfx_fan: 0.6,
    sfx_turn: 0.4,
    sfx_win: 0.6,
    sfx_lose: 0.55,
    sfx_finish: 0.7,
    sfx_coin: 0.6,
    sfx_chips: 0.55
  };

  // 音高隨機幅度（cents）：實體音效加一點變化才不會像複製貼上
  const DETUNE = {
    sfx_play: 120,
    sfx_select: 150,
    sfx_pass: 120,
    sfx_coin: 150,
    sfx_chips: 150,
    sfx_fan: 100
  };

  let muted = window.localStorage.getItem('bigtwo_muted') === '1';

  function manager() {
    return window.gameInstance && window.gameInstance.sound;
  }

  // 上次播的變體，連續兩次盡量不重複
  const lastPick = {};

  // 語意 key → 這次要播的實際 Phaser key（多變體隨機挑一個）
  function pick(key) {
    const pools = window.BigTwoAssets && window.BigTwoAssets.POOLS;
    const pool = pools && pools[key];
    if (!pool || pool.length === 0) return key;
    if (pool.length === 1) return pool[0];
    let k;
    do { k = pool[Math.floor(Math.random() * pool.length)]; } while (k === lastPick[key]);
    lastPick[key] = k;
    return k;
  }

  function play(key, opts) {
    if (muted) return;
    const sm = manager();
    if (!sm) return;
    const actual = pick(key);
    // 音檔還沒載入好就略過，不報錯
    if (!window.gameInstance.cache.audio.exists(actual)) return;
    const vol = (opts && opts.volume != null) ? opts.volume : (VOL[key] != null ? VOL[key] : 0.5);
    const range = (opts && opts.detune != null) ? opts.detune : (DETUNE[key] || 0);
    const detune = range ? (Math.random() * 2 - 1) * range : 0;
    try { sm.play(actual, { volume: vol, detune: detune }); } catch (e) { /* 忽略播放失敗 */ }
  }

  function isMuted() { return muted; }

  function setMuted(v) {
    muted = !!v;
    window.localStorage.setItem('bigtwo_muted', muted ? '1' : '0');
    const sm = manager();
    if (sm) sm.mute = muted;   // 連同已在播的一起靜音
  }

  function toggle() { setMuted(!muted); return muted; }

  window.SFX = { play, isMuted, setMuted, toggle };
})();
