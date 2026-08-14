// ===== WebAudio 合成音效 + 簡易 BGM（無需外部素材檔） =====
export const AudioSys = {
  ctx: null, master: null, sfxGain: null, bgmGain: null,
  enabled: true, bgmTimer: null, bgmStep: 0, bgmKind: null,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.enabled ? 1 : 0;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.9; this.sfxGain.connect(this.master);
    this.bgmGain = this.ctx.createGain(); this.bgmGain.gain.value = 0.32; this.bgmGain.connect(this.master);
  },

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 1 : 0;
  },

  // ---- 基本合成器 ----
  _tone({ freq = 440, freqEnd, type = 'sine', dur = 0.15, vol = 0.5, attack = 0.004, when = 0, dest }) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  },

  _noise({ dur = 0.2, vol = 0.4, hp = 800, lp = 8000, when = 0, dest }) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + when;
    const len = Math.max(1, (dur * this.ctx.sampleRate) | 0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f1 = this.ctx.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp;
    const f2 = this.ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f1); f1.connect(f2); f2.connect(g); g.connect(dest || this.sfxGain);
    src.start(t); src.stop(t + dur);
  },

  // 同名音效的最短間隔（毫秒），避免高頻碰撞時聲音疊成噪音
  _minGap: { bounce: 55, hitEnemy: 70, bumper: 70, sling: 70, target: 60, flipper: 45, ui: 40, type: 18 },
  _last: {},

  // ---- 具名音效 ----
  sfx(name, p = 1) {
    if (!this.ctx || !this.enabled) return;
    const gap = this._minGap[name];
    if (gap) {
      const now = performance.now();
      if (now - (this._last[name] ?? -1e9) < gap) return;
      this._last[name] = now;
    }
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    switch (name) {
      case 'launch': // 發射：上滑嗖聲 + 噪音
        this._tone({ freq: 220, freqEnd: 900, type: 'sawtooth', dur: 0.22, vol: 0.35 });
        this._noise({ dur: 0.18, vol: 0.3, hp: 1200 });
        break;
      case 'bounce': { // 撞牆：強度決定音高
        const k = clamp(p, 0, 1);
        this._tone({ freq: 180 + 320 * k, freqEnd: 120, type: 'triangle', dur: 0.09, vol: 0.22 + 0.2 * k });
        break; }
      case 'hitEnemy': { // 打中敵人：金屬叮 + 噪音
        const k = clamp(p, 0, 1);
        this._tone({ freq: 520 + 500 * k, freqEnd: 300, type: 'square', dur: 0.1, vol: 0.3 });
        this._noise({ dur: 0.08, vol: 0.22, hp: 2500 });
        break; }
      case 'friend': // 羈絆共鳴：雙音上行
        this._tone({ freq: 660, type: 'sine', dur: 0.12, vol: 0.3 });
        this._tone({ freq: 990, type: 'sine', dur: 0.16, vol: 0.3, when: 0.07 });
        break;
      case 'bumper': // 彈射器：電子彈簧
        this._tone({ freq: 300, freqEnd: 1400, type: 'square', dur: 0.12, vol: 0.32 });
        this._tone({ freq: 150, freqEnd: 700, type: 'sawtooth', dur: 0.12, vol: 0.2, when: 0.02 });
        break;
      case 'enemyDie': // 敵人消滅：下墜爆裂
        this._noise({ dur: 0.35, vol: 0.45, hp: 400, lp: 6000 });
        this._tone({ freq: 800, freqEnd: 80, type: 'sawtooth', dur: 0.3, vol: 0.3 });
        break;
      case 'bossDie':
        this._noise({ dur: 0.9, vol: 0.55, hp: 200 });
        this._tone({ freq: 1200, freqEnd: 50, type: 'sawtooth', dur: 0.85, vol: 0.4 });
        this._tone({ freq: 600, freqEnd: 40, type: 'square', dur: 0.9, vol: 0.3, when: 0.1 });
        break;
      case 'enemyAtk': // 敵人攻擊：低吼 + 撞擊
        this._tone({ freq: 200, freqEnd: 60, type: 'sawtooth', dur: 0.3, vol: 0.4 });
        this._noise({ dur: 0.2, vol: 0.3, hp: 300, lp: 3000, when: 0.08 });
        break;
      case 'skillReady': // 必殺充能完成
        [523, 659, 784].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.14, vol: 0.26, when: i * 0.07 }));
        break;
      case 'skillFire': // 必殺發動
        this._tone({ freq: 200, freqEnd: 1600, type: 'sawtooth', dur: 0.4, vol: 0.4 });
        this._noise({ dur: 0.35, vol: 0.3, hp: 900 });
        break;
      case 'missile':
        this._tone({ freq: 900, freqEnd: 300, type: 'square', dur: 0.14, vol: 0.2 });
        this._noise({ dur: 0.1, vol: 0.18, hp: 2000 });
        break;
      case 'gunshot':
        this._noise({ dur: 0.09, vol: 0.4, hp: 1500 });
        this._tone({ freq: 350, freqEnd: 120, type: 'square', dur: 0.07, vol: 0.25 });
        break;
      case 'nova':
        this._tone({ freq: 400, freqEnd: 1800, type: 'sine', dur: 0.3, vol: 0.35 });
        this._noise({ dur: 0.3, vol: 0.3, hp: 600 });
        break;
      case 'waveIn': // 新一波敵人
        this._tone({ freq: 300, freqEnd: 150, type: 'sawtooth', dur: 0.3, vol: 0.3 });
        this._tone({ freq: 450, freqEnd: 220, type: 'sawtooth', dur: 0.3, vol: 0.2, when: 0.1 });
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.3, when: i * 0.13 }));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.34, vol: 0.3, when: i * 0.16 }));
        break;
      case 'flipper': // 彈射板：厚實 thock
        this._tone({ freq: 140, freqEnd: 90, type: 'square', dur: 0.07, vol: 0.35 });
        this._noise({ dur: 0.05, vol: 0.2, hp: 500, lp: 3500 });
        break;
      case 'plungerPull': // 拉彈簧：棘輪喀噠
        this._tone({ freq: 320 + 200 * clamp(p, 0, 1), type: 'square', dur: 0.03, vol: 0.12 });
        break;
      case 'plungerLaunch': // 發射：彈簧 + 嗖
        this._tone({ freq: 120, freqEnd: 60, type: 'square', dur: 0.12, vol: 0.4 });
        this._tone({ freq: 300, freqEnd: 1200, type: 'sawtooth', dur: 0.25, vol: 0.3, when: 0.03 });
        this._noise({ dur: 0.2, vol: 0.28, hp: 1000 });
        break;
      case 'sling': // 彈弓：啪
        this._tone({ freq: 500, freqEnd: 200, type: 'square', dur: 0.07, vol: 0.3 });
        this._noise({ dur: 0.06, vol: 0.25, hp: 1800 });
        break;
      case 'target': { // 目標靶：清脆 ding
        const f = 880 + 220 * clamp(p, 0, 1);
        this._tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.32 });
        this._tone({ freq: f * 1.5, type: 'sine', dur: 0.2, vol: 0.18, when: 0.02 });
        break; }
      case 'drain': // 落球：下墜 womp
        this._tone({ freq: 300, freqEnd: 45, type: 'sawtooth', dur: 0.6, vol: 0.4 });
        this._noise({ dur: 0.3, vol: 0.2, hp: 200, lp: 2000, when: 0.1 });
        break;
      case 'saved': // 球保護救回
        [659, 880].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.3, when: i * 0.09 }));
        break;
      case 'vuln': // 棋主破防
        [440, 554, 659, 880].forEach((f, i) => this._tone({ freq: f, type: 'sawtooth', dur: 0.18, vol: 0.2, when: i * 0.08 }));
        this._noise({ dur: 0.4, vol: 0.2, hp: 800 });
        break;
      case 'ui':
        this._tone({ freq: 700, type: 'sine', dur: 0.06, vol: 0.2 });
        break;
      case 'type':
        this._tone({ freq: 900 + Math.random() * 300, type: 'sine', dur: 0.03, vol: 0.06 });
        break;
    }
  },

  // ---- BGM：16 步進音序器（戰鬥 / Boss 兩種） ----
  startBgm(kind = 'battle') {
    if (!this.ctx) return;
    if (this.bgmKind === kind && this.bgmTimer) return;
    this.stopBgm();
    this.bgmKind = kind;
    const boss = kind === 'boss';
    const bpm = boss ? 148 : 122;
    const stepDur = 60 / bpm / 2; // 8 分音符
    // A 小調五聲音階
    const bass = boss ? [110, 110, 0, 110, 98, 0, 110, 130.8] : [110, 0, 110, 0, 87.3, 0, 98, 0];
    const arp = boss
      ? [440, 523, 659, 523, 440, 587, 659, 880, 440, 523, 659, 523, 494, 587, 740, 880]
      : [440, 0, 523, 659, 0, 523, 440, 0, 392, 0, 523, 587, 0, 523, 440, 0];
    this.bgmStep = 0;
    this.bgmTimer = setInterval(() => {
      if (!this.enabled) { this.bgmStep++; return; }
      const s = this.bgmStep % 16;
      const b = bass[s % 8];
      if (b) this._tone({ freq: b, type: 'triangle', dur: stepDur * 0.9, vol: 0.5, dest: this.bgmGain });
      const a = arp[s];
      if (a) this._tone({ freq: a, type: 'square', dur: stepDur * 0.55, vol: 0.11, dest: this.bgmGain });
      if (s % 4 === 2) this._noise({ dur: 0.04, vol: 0.1, hp: 6000, dest: this.bgmGain }); // hi-hat
      if (boss && s % 8 === 0) this._noise({ dur: 0.12, vol: 0.22, hp: 100, lp: 400, dest: this.bgmGain }); // kick
      this.bgmStep++;
    }, stepDur * 1000);
  },

  stopBgm() {
    if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; }
    this.bgmKind = null;
  },
};
