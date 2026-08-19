import { MASTER_VOLUME } from '../constants';
import type { EnemyKind, PickupKind, WeaponType } from '../types';

type Wave = OscillatorType;

// MP3 音效路徑（部分檔名為中文，需 URI 編碼）
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

// 短音效（射擊 / 命中 / 警報）改走 WebAudio buffer，
// 避免 HTMLAudioElement 在高速連射時的延遲與重播卡頓
const SHOT_FILES = {
  vulcan: 'assets/sound/sfx/shot-vulcan.mp3',
  laser: 'assets/sound/sfx/shot-laser.mp3',
  plasma: 'assets/sound/sfx/shot-plasma.mp3',
  missile: 'assets/sound/sfx/shot-missile.mp3',
  bossWarning: 'assets/sound/sfx/boss-warning.mp3',
  bossHit: 'assets/sound/mp3/子彈打到boos的聲音.mp3',
  pickupBomb: 'assets/sound/sfx/pickup-bomb.mp3',
  pickupOneUp: 'assets/sound/sfx/pickup-1up.mp3',
  vulcanLoop: 'assets/sound/sfx/shot-vulcan-loop.mp3',
  enemyHit: 'assets/sound/sfx/hit-enemy.mp3',
} as const;

type ShotKey = keyof typeof SHOT_FILES;

// 各武器音效參數：音量、基礎播放速率、速率隨機抖動、最小間隔（ms）
const WEAPON_SFX: Record<WeaponType, { volume: number; rate: number; jitter: number; minGapMs: number }> = {
  // 機炮：Kenney laserSmall_004，原速播放、略帶隨機音高，連射才不會像機械複製
  vulcan: { volume: 0.3, rate: 1.0, jitter: 0.06, minGapMs: 90 },
  // 雷射：Kenney laserLarge_001，原速播放（先前 0.9 倍速會把尾音拉長到與下一發重疊）
  laser: { volume: 0.5, rate: 1.0, jitter: 0.03, minGapMs: 120 },
  // 電漿：持續電流 tick，因為一直在響所以壓低一點避免疲勞
  plasma: { volume: 0.33, rate: 1.0, jitter: 0.12, minGapMs: 300 },
};

// 程序合成音（tone / noise）的統一增益。
// BGM 提高到 MASTER_VOLUME 後，原本偏小的合成音會被蓋掉，故一併等比放大。
const SFX_GAIN = 2.5;

// 機炮播放模式：
//   'shot' = 每輪播一次單發素材（目前使用 Kenney laserSmall_004）
//   'loop' = 開火期間循環播放連續掃射素材（重機関銃を乱射2）
// 兩種素材都保留在 sfx/ 底下，改這個常數即可切換。
type VulcanMode = 'shot' | 'loop';
const VULCAN_MODE: VulcanMode = 'shot';

// 以下為 'loop' 模式的參數
const VULCAN_LOOP_VOLUME = 0.34;
const VULCAN_LOOP_FADE_IN = 0.05;
const VULCAN_LOOP_FADE_OUT = 0.12;
// 距離上次開火超過這個時間就判定為停火
const VULCAN_LOOP_IDLE_MS = 260;

const POOL_SIZE = 4;

export class AudioSystem {
  private context?: AudioContext;
  private master?: GainNode;
  private lastPlayed = new Map<string, number>();
  // HTMLAudioElement 池，每個音效預先建立多份以支援重疊播放
  private sfxPools = new Map<SfxKey, HTMLAudioElement[]>();
  // WebAudio 解碼後的短音效快取
  private buffers = new Map<ShotKey, AudioBuffer>();
  private loading = new Set<ShotKey>();
  // 機炮掃射循環
  private vulcanSource?: AudioBufferSourceNode;
  private vulcanGain?: GainNode;
  private vulcanLastFireAt = 0;

  unlock(): void {
    const context = this.getContext();
    void context?.resume();
    // 首次互動時預先解碼短音效，避免第一發射擊沒聲音
    (Object.keys(SHOT_FILES) as ShotKey[]).forEach((key) => void this.loadBuffer(key));
  }

  // 射擊音效：依武器種類使用不同素材與音高
  shoot(weapon: WeaponType, now: number, power = 1): void {
    // 機炮 loop 模式：持續掃射循環，火力越高音量與音高略升
    if (weapon === 'vulcan' && VULCAN_MODE === 'loop') {
      this.vulcanLastFireAt = now;
      this.startVulcanLoop(power);
      return;
    }
    const config = WEAPON_SFX[weapon];
    if (!config) return;
    if (!this.canPlay(`shoot-${weapon}`, now, config.minGapMs)) return;
    const rate = config.rate * (1 + (Math.random() * 2 - 1) * config.jitter);
    this.playBuffer(weapon as ShotKey, config.volume, rate);
  }

  // 開火期間維持掃射循環（重複呼叫是安全的）
  private startVulcanLoop(power: number): void {
    const context = this.getContext();
    if (!context || !this.master) return;
    const buffer = this.buffers.get('vulcanLoop');
    if (!buffer) {
      void this.loadBuffer('vulcanLoop');
      return;
    }
    // 火力越高，掃射越急促、音量略升
    const rate = 1 + Math.min(5, power) * 0.02;
    const volume = VULCAN_LOOP_VOLUME * (0.86 + Math.min(5, power) * 0.03);
    if (this.vulcanSource && this.vulcanGain) {
      this.vulcanSource.playbackRate.value = rate;
      this.vulcanGain.gain.cancelScheduledValues(context.currentTime);
      this.vulcanGain.gain.setTargetAtTime(volume, context.currentTime, 0.04);
      return;
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = rate;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.linearRampToValueAtTime(volume, context.currentTime + VULCAN_LOOP_FADE_IN);
    source.connect(gain);
    gain.connect(this.master);
    source.start();
    this.vulcanSource = source;
    this.vulcanGain = gain;
  }

  // 每幀呼叫：停火超過 VULCAN_LOOP_IDLE_MS 就淡出
  tickWeaponLoop(now: number): void {
    if (!this.vulcanSource) return;
    if (now - this.vulcanLastFireAt > VULCAN_LOOP_IDLE_MS) {
      this.stopWeaponLoop();
    }
  }

  // 停止掃射循環（停火、暫停、死亡、離開關卡都要呼叫）
  stopWeaponLoop(): void {
    const source = this.vulcanSource;
    const gain = this.vulcanGain;
    this.vulcanSource = undefined;
    this.vulcanGain = undefined;
    if (!source || !gain || !this.context) return;
    const stopAt = this.context.currentTime + VULCAN_LOOP_FADE_OUT;
    gain.gain.cancelScheduledValues(this.context.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, stopAt);
    try {
      source.stop(stopAt + 0.02);
    } catch {
      // 已停止則忽略
    }
  }

  // 電漿光束為持續傷害，另外以固定節奏播放電流聲
  plasmaBeam(now: number): void {
    this.shoot('plasma', now);
  }

  // 追蹤導彈發射
  missile(now: number): void {
    if (!this.canPlay('missile', now, 220)) return;
    this.playBuffer('missile', 0.35, 1.18);
  }

  enemyHit(now: number, isLarge = false): void {
    if (isLarge) {
      // 打到 boss / 中 boss：使用專屬金屬撞擊音
      if (!this.canPlay('boss-hit', now, 70)) return;
      this.playBuffer('bossHit', 0.7, 1 + (Math.random() * 2 - 1) * 0.05);
      return;
    }
    // 一般敵機：金屬撞擊素材（原本的合成 click 太電子、不像打中東西）。
    // 連射時每秒可觸發十幾次，因此間隔拉到 55ms、音量壓在開火音之下
    if (!this.canPlay('enemy-hit', now, 55)) return;
    this.playBuffer('enemyHit', 0.26, 1 + (Math.random() * 2 - 1) * 0.08);
  }

  // Boss 登場警報
  bossWarning(): void {
    this.playBuffer('bossWarning', 1, 1);
  }

  explosion(kind: EnemyKind): void {
    const large = kind === 'boss' || kind === 'midboss';
    if (large) {
      const key: SfxKey = Math.random() < 0.5 ? 'bossExplode1' : 'bossExplode2';
      this.playSfx(key);
    } else {
      const key: SfxKey = Math.random() < 0.5 ? 'enemyExplode1' : 'enemyExplode2';
      this.playSfx(key);
    }
  }

  pickup(kind: PickupKind): void {
    // 撿到炸彈：原本只有極小聲的合成音，實戰中被爆炸與 BGM 蓋掉，改用素材
    if (kind === 'bomb') {
      this.playBuffer('pickupBomb', 0.7);
      return;
    }
    // 1UP 最稀有，用最華麗的一顆
    if (kind === 'one-up') {
      this.playBuffer('pickupOneUp', 0.8);
      return;
    }
    // power / weapon 升級皆使用 levelup.mp3
    this.playSfx('levelup');
  }

  bomb(): void {
    this.noise(0.58, 0.22, 420, 0.22);
    this.tone(70, 34, 0.52, 'sine', 0.24);
    this.tone(360, 80, 0.4, 'sawtooth', 0.08, 0.025);
  }

  playerDeath(): void {
    this.playSfx('playerDeath');
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

  // 非同步載入並解碼短音效
  private async loadBuffer(key: ShotKey): Promise<void> {
    if (this.buffers.has(key) || this.loading.has(key)) return;
    const context = this.getContext();
    if (!context) return;
    this.loading.add(key);
    try {
      const response = await fetch(SHOT_FILES[key]);
      const raw = await response.arrayBuffer();
      const decoded = await context.decodeAudioData(raw);
      this.buffers.set(key, decoded);
    } catch {
      // 載入失敗時靜默忽略，遊戲仍可正常進行
    } finally {
      this.loading.delete(key);
    }
  }

  // 播放已解碼的短音效（可調音量與播放速率）
  private playBuffer(key: ShotKey, volume: number, rate = 1): void {
    const context = this.getContext();
    if (!context || !this.master) return;
    const buffer = this.buffers.get(key);
    if (!buffer) {
      void this.loadBuffer(key);
      return;
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = Math.max(0.25, rate);
    gain.gain.value = Math.max(0, volume);
    source.connect(gain);
    gain.connect(this.master);
    source.start();
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

  // 播放 mp3 音效（找閒置或最舊的實例）。HTMLAudio 不經過 master gain，
  // 因此直接以全域音量 MASTER_VOLUME 播放
  private playSfx(key: SfxKey, volume = MASTER_VOLUME): void {
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
    // 全域音量統一 60%（所有程序音與 buffer 音效都經過這個 gain）
    this.master.gain.value = MASTER_VOLUME;
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
    const level = Math.min(1, volume * SFX_GAIN);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), start + 0.008);
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
    gain.gain.setValueAtTime(Math.max(0.0001, Math.min(1, volume * SFX_GAIN)), start);
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
