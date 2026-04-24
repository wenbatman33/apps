// 音效系統：Web Audio 合成 + BGM 檔案槽
// 之後使用者換 audio/bgm.mp3 / sfx/*.mp3 即可自動採用
(function(global){
  const Audio = {
    ctx: null,
    muted: false,
    bgmEl: null,
    bgmStarted: false,

    init(){
      if(this.ctx) return;
      try{
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      }catch(e){ console.warn('Web Audio unsupported', e); }
      this.bgmEl = document.getElementById('bgm');
      if(this.bgmEl){
        this.bgmEl.volume = 0.35;
        // 若使用者尚未放 mp3，會 404，這裡靜默處理
        this.bgmEl.addEventListener('error', ()=>{ /* ignore */ });
      }
      this._loadMuted();
    },

    resume(){
      if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    setMuted(v){
      this.muted = !!v;
      if(this.bgmEl){
        this.bgmEl.muted = this.muted;
      }
      localStorage.setItem('jumpup.muted', this.muted ? '1':'0');
    },
    toggleMute(){ this.setMuted(!this.muted); return this.muted; },
    _loadMuted(){
      this.muted = localStorage.getItem('jumpup.muted') === '1';
      if(this.bgmEl) this.bgmEl.muted = this.muted;
    },

    playBGM(){
      if(!this.bgmEl) return;
      this.bgmEl.muted = this.muted;
      const p = this.bgmEl.play();
      if(p && p.catch) p.catch(()=>{ /* autoplay blocked */ });
      this.bgmStarted = true;
    },
    pauseBGM(){ if(this.bgmEl) this.bgmEl.pause(); },
    stopBGM(){ if(this.bgmEl){ this.bgmEl.pause(); this.bgmEl.currentTime = 0; } },

    // ===== 合成音效 =====
    _beep({freq=440, freq2=null, type='sine', dur=0.15, vol=0.25, attack=0.005, decay=null}){
      if(this.muted || !this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if(freq2 !== null){
        osc.frequency.exponentialRampToValueAtTime(Math.max(1,freq2), t + dur);
      }
      const d = decay != null ? decay : dur;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + d + 0.02);
    },

    _noise({dur=0.15, vol=0.2, hp=200, lp=4000}){
      if(this.muted || !this.ctx) return;
      const ctx = this.ctx;
      const bufSize = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for(let i=0;i<bufSize;i++) data[i] = (Math.random()*2-1) * (1 - i/bufSize);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const hpF = ctx.createBiquadFilter(); hpF.type='highpass'; hpF.frequency.value = hp;
      const lpF = ctx.createBiquadFilter(); lpF.type='lowpass'; lpF.frequency.value = lp;
      const gain = ctx.createGain(); gain.gain.value = vol;
      src.connect(hpF).connect(lpF).connect(gain).connect(ctx.destination);
      src.start();
    },

    // 語義化 API
    jump(){ this._beep({type:'sine', freq:420, freq2:820, dur:0.16, vol:0.22, attack:0.002, decay:0.18}); },
    land(){ this._noise({dur:0.08, vol:0.15, hp:300, lp:2000}); },
    coin(){
      this._beep({type:'square', freq:988, dur:0.07, vol:0.18});
      setTimeout(()=> this._beep({type:'square', freq:1318, dur:0.12, vol:0.2}), 60);
    },
    hurt(){ this._beep({type:'sawtooth', freq:380, freq2:120, dur:0.25, vol:0.28}); },
    die(){
      this._beep({type:'sawtooth', freq:520, freq2:80, dur:0.55, vol:0.3, decay:0.6});
      setTimeout(()=> this._noise({dur:0.25, vol:0.18, hp:100, lp:900}), 120);
    },
    click(){ this._beep({type:'triangle', freq:660, dur:0.06, vol:0.15}); },
    powerup(){
      [523, 659, 784, 1046].forEach((f,i)=> setTimeout(()=> this._beep({type:'triangle', freq:f, dur:0.1, vol:0.2}), i*60));
    },
  };
  global.GameAudio = Audio;
})(window);
