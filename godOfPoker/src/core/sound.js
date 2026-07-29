// 真實牌桌音效（WebAudio 取樣播放；同事件多變體隨機播、含環境音循環）
// 載入失敗時退回合成音
const Sound = {
  ctx: null,
  enabled: true,
  masterVol: 0.45,   // 音效總音量（0~1）
  buffers: {},   // key -> AudioBuffer[]
  _loading: false,
  _ambSrc: null,
  _ambWanted: false,

  // 每個事件可對應多個檔案（隨機挑一個播，聽感更自然）
  FILES: {
    shuffle: ['shuffle1.mp3', 'shuffle2.mp3'],
    deal: ['card_drop.mp3', 'card_deal.wav'],
    flip: ['card_take.mp3', 'card_flip.wav'],
    chip: ['chips_small.mp3'],
    stack: ['chips_place.mp3'],
    push: ['chips_handful.mp3', 'chip_push.wav'],
    tap: ['button_tap.wav'],
    confirm: ['bet_confirm.wav'],
    winJingle: ['blackjack_win.wav'],
    loseJingle: ['round_lose.wav'],
    ambience: ['poker_room_amb.mp3'],
  },

  _ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this._loading) { this._loading = true; this._loadAll(); }
    return this.ctx;
  },

  async _loadAll() {
    const ctx = this.ctx;
    await Promise.all(Object.entries(this.FILES).map(async ([key, files]) => {
      const arr = [];
      for (const file of files) {
        try {
          const res = await fetch(`assets/sfx/${file}`);
          const buf = await res.arrayBuffer();
          arr.push(await ctx.decodeAudioData(buf));
        } catch (e) { /* 缺檔略過 */ }
      }
      if (arr.length) this.buffers[key] = arr;
    }));
    // 音檔就緒後若已要求環境音則自動開播
    if (this._ambWanted) this._startAmbNow();
  },

  _pick(key) {
    const arr = this.buffers[key];
    if (!arr || !arr.length) return null;
    return arr[(Math.random() * arr.length) | 0];
  },

  _play(key, { vol = 0.9, rate = 1, delay = 0 } = {}) {
    if (!this.enabled) return false;
    try {
      const ctx = this._ensure();
      const buf = this._pick(key);
      if (!buf) return false;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      const g = ctx.createGain();
      g.gain.value = vol * this.masterVol;
      src.connect(g); g.connect(ctx.destination);
      src.start(ctx.currentTime + delay);
      return true;
    } catch (e) { return false; }
  },

  _vary(base, spread = 0.08) { return base + (Math.random() * 2 - 1) * spread; },

  // ===== 牌桌環境音（低音量循環）=====
  startAmbience() {
    this._ambWanted = true;
    this._ensure();
    this._startAmbNow();
  },

  _startAmbNow() {
    if (!this.enabled || this._ambSrc || !this.buffers.ambience) return;
    try {
      const ctx = this._ensure();
      const src = ctx.createBufferSource();
      src.buffer = this.buffers.ambience[0];
      src.loop = true;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.5); // 淡入（低音量墊底）
      src.connect(g); g.connect(ctx.destination);
      src.start();
      this._ambSrc = src;
      this._ambGain = g;
    } catch (e) { /* 忽略 */ }
  },

  stopAmbience() {
    this._ambWanted = false;
    if (this._ambSrc) {
      try {
        const ctx = this.ctx;
        this._ambGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        const s = this._ambSrc;
        setTimeout(() => { try { s.stop(); } catch (e) {} }, 700);
      } catch (e) { /* 忽略 */ }
      this._ambSrc = null;
      this._ambGain = null;
    }
  },

  // 合成備援
  _tone(freq, dur, type = 'sine', vol = 0.12, delay = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this._ensure();
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + dur);
    } catch (e) { /* 忽略 */ }
  },

  // ===== 遊戲事件 API =====
  shuffle() { this._play('shuffle', { vol: 0.85, rate: this._vary(1) }) || this._tone(660, 0.2, 'triangle', 0.06); },
  deal() { this._play('deal', { vol: 0.8, rate: this._vary(1, 0.12) }) || this._tone(880, 0.06, 'triangle', 0.08); },
  flip() { this._play('flip', { vol: 0.85, rate: this._vary(1) }) || this._tone(990, 0.07, 'triangle', 0.08); },
  chip() { this._play('chip', { vol: 0.9, rate: this._vary(1, 0.1) }) || this._tone(1320, 0.05, 'square', 0.06); },
  raise() { this._play('stack', { vol: 0.95, rate: this._vary(1) }) || this._tone(784, 0.1, 'square', 0.08); },
  allin() { this._play('push', { vol: 1, rate: this._vary(0.98) }) || this._tone(523, 0.2, 'square', 0.1); },
  fold() { this._play('deal', { vol: 0.45, rate: this._vary(0.8) }) || this._tone(220, 0.12, 'sine', 0.1); },
  check() { this._play('tap', { vol: 0.7, rate: this._vary(0.95) }) || this._tone(660, 0.07, 'sine', 0.08); },
  confirm() { this._play('confirm', { vol: 0.8 }) || this._tone(700, 0.1, 'sine', 0.1); },
  turn() { this._play('tap', { vol: 0.35, rate: 1.25 }) || this._tone(988, 0.05, 'sine', 0.05); },
  win() { this._play('winJingle', { vol: 0.9 }) || [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.18, 'triangle', 0.12, i * 0.12)); },
  lose() { this._play('loseJingle', { vol: 0.75 }) || [392, 330, 262].forEach((f, i) => this._tone(f, 0.22, 'sine', 0.1, i * 0.15)); },
};
