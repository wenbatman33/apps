import type { EnemyKind, PickupKind, WeaponType } from '../types';

type Wave = OscillatorType;

// MP3 音效路徑（檔名為中文，需 URI 編碼）
const SFX_BASE = 'assets/sound/mp3/';
const SFX_FILES = {
  enemyExplode1: '敵機爆炸聲音_1.mp3',
  enemyExplode2: '敵機爆炸聲音_2.mp3',
  bossExplode1: 'boss爆炸聲音_1.mp3',
  bossExplode2: 'boss爆炸聲音_2.mp3',
  playerDeath: '自身飛機爆炸音效.mp3',
  levelup: 'levelup.mp3',
} as const;

type SfxKey = keyof typeof SFX_FILES;

const POOL_SIZE = 4;

export class AudioSystem {
  private context?: AudioContext;
  private master?: GainNode;
  private lastPlayed = new Map<string, number>();
  // HTMLAudioElement 池，每個音效預先建立多份以支援重疊播放
  private sfxPools = new Map<SfxKey, HTMLAudioElement[]>();

  unlock(): void {
    const context = this.getContext();
    void context?.resume();
  }

  shoot(_weapon: WeaponType, _now: number): void {
    // 射擊音效已移除，僅保留爆炸聲
  }

  enemyHit(now: number): void {
    if (!this.canPlay('enemy-hit', now, 38)) return;
    // 兩段式打擊聲：高頻短促 click + 中頻 zap
    this.tone(1500, 900, 0.03, 'square', 0.06);
    this.tone(620, 360, 0.06, 'triangle', 0.05, 0.005);
    this.noise(0.04, 0.03, 4200, 0);
  }

  explosion(kind: EnemyKind): void {
    const large = kind === 'boss' || kind === 'midboss';
    if (large) {
      const key: SfxKey = Math.random() < 0.5 ? 'bossExplode1' : 'bossExplode2';
      this.playSfx(key, 0.4);
    } else {
      const key: SfxKey = Math.random() < 0.5 ? 'enemyExplode1' : 'enemyExplode2';
      this.playSfx(key, 0.4);
    }
  }

  pickup(kind: PickupKind): void {
    if (kind === 'bomb') {
      this.tone(410, 820, 0.16, 'triangle', 0.06);
      this.tone(820, 1260, 0.12, 'sine', 0.035, 0.04);
      return;
    }
    // power / weapon 升級皆使用 levelup.mp3
    if (kind === 'power' || kind.startsWith('weapon-')) {
      this.playSfx('levelup');
      return;
    }
    this.tone(720, 1080, 0.11, 'sine', 0.045);
    this.tone(1080, 1440, 0.09, 'triangle', 0.025, 0.035);
  }

  bomb(): void {
    this.noise(0.58, 0.22, 420, 0.22);
    this.tone(70, 34, 0.52, 'sine', 0.24);
    this.tone(360, 80, 0.4, 'sawtooth', 0.08, 0.025);
  }

  playerDeath(): void {
    this.playSfx('playerDeath', 0.4);
  }

  stageClear(): void {
    // 過關使用 levelup.mp3
    this.playSfx('levelup');
  }

  flyAway(): void {
    this.noise(0.9, 0.09, 900, 0);
    this.noise(0.75, 0.055, 2400, 0.08);
    this.tone(120, 520, 0.86, 'sawtooth', 0.07);
    this.tone(420, 1180, 0.62, 'triangle', 0.035, 0.08);
    this.tone(980, 1800, 0.38, 'sine', 0.028, 0.18);
  }

  // 取得（或初始化）SFX 池
  private getSfxPool(key: SfxKey): HTMLAudioElement[] {
    let pool = this.sfxPools.get(key);
    if (pool) return pool;
    pool = [];
    const url = SFX_BASE + encodeURIComponent(SFX_FILES[key]);
    for (let i = 0; i < POOL_SIZE; i += 1) {
      const audio = new Audio(url);
      audio.preload = 'auto';
      pool.push(audio);
    }
    this.sfxPools.set(key, pool);
    return pool;
  }

  // 播放 mp3 音效（找閒置或最舊的實例）。所有音效統一使用 0.5 音量
  private playSfx(key: SfxKey, volume = 0.5): void {
    try {
      const pool = this.getSfxPool(key);
      const audio = pool.find((a) => a.paused || a.ended) ?? pool[0];
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.currentTime = 0;
      const result = audio.play();
      if (result && typeof result.catch === 'function') {
        result.catch(() => undefined);
      }
    } catch {
      // 若播放失敗（例如使用者尚未互動），靜默忽略
    }
  }

  private canPlay(key: string, now: number, minGapMs: number): boolean {
    const previous = this.lastPlayed.get(key) ?? -Infinity;
    if (now - previous < minGapMs) return false;
    this.lastPlayed.set(key, now);
    return true;
  }

  private getContext(): AudioContext | undefined {
    if (this.context) return this.context;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return undefined;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.context.destination);
    return this.context;
  }

  private tone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    wave: Wave,
    volume: number,
    delay = 0,
  ): void {
    const context = this.getContext();
    if (!context || !this.master) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noise(duration: number, volume: number, lowpassFrequency: number, delay = 0): void {
    const context = this.getContext();
    if (!context || !this.master) return;
    const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowpassFrequency, start);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
