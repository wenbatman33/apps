// 音效播放：集中管理音量、靜音（記住設定），以 key 播放
// 用法：window.SFX.play('sfx_play')；靜音切換 window.SFX.toggle()

(function () {
  // 整體音量（使用者反映太大聲，全體乘 60%）
  const MASTER = 0.6;

  // 各音效音量（牌/選取較輕、勝負較滿）
  const VOL = {
    sfx_deal: 0.5,
    sfx_play: 0.6,
    sfx_select: 0.35,
    sfx_button: 0.45,
    sfx_pass: 0.5,
    sfx_turn: 0.4,
    sfx_win: 0.6,
    sfx_lose: 0.55,
    sfx_finish: 0.7,
    sfx_coin: 0.5
  };

  let muted = window.localStorage.getItem('ddz_muted') === '1';

  function manager() {
    return window.gameInstance && window.gameInstance.sound;
  }

  function play(key, opts) {
    if (muted) return;
    const sm = manager();
    if (!sm) return;
    // 音檔還沒載入好就略過，不報錯
    if (!window.gameInstance.cache.audio.exists(key)) return;
    const vol = ((opts && opts.volume != null) ? opts.volume : (VOL[key] != null ? VOL[key] : 0.5)) * MASTER;
    try { sm.play(key, { volume: vol }); } catch (e) { /* 忽略播放失敗 */ }
  }

  function isMuted() { return muted; }

  function setMuted(v) {
    muted = !!v;
    window.localStorage.setItem('ddz_muted', muted ? '1' : '0');
    const sm = manager();
    if (sm) sm.mute = muted;   // 連同已在播的一起靜音
  }

  function toggle() { setMuted(!muted); return muted; }

  window.SFX = { play, isMuted, setMuted, toggle };
})();
