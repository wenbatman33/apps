export type EnemyKind = 'scout' | 'drone' | 'gunship' | 'midboss' | 'boss';
export type BulletOwner = 'player' | 'enemy';
export type WeaponType = 'vulcan' | 'laser' | 'plasma';
export type PickupKind = 'power' | 'bomb' | `weapon-${WeaponType}`;
export type ExplosionSize = 'small' | 'medium' | 'large';

export interface WaveConfig {
  time: number;
  spawn: EnemyKind;
  count: number;
  pattern: 'line' | 'vee' | 'sine' | 'zigzag' | 'cross' | 'ambush' | 'boss';
  intervalMs?: number;
  x?: number;
}

export interface StageConfig {
  stageId: number;
  name: string;
  subtitle: string;
  duration: number;
  backgroundKey: string;
  background: string[];
  waves: WaveConfig[];
}

export interface EnemyConfig {
  kind: EnemyKind;
  hp: number;
  score: number;
  speed: number;
  fireRateMs: number;
  bulletSpeed: number;
  radius: number;
  texture: string;
  scale: number;
}

export interface PlayerStats {
  lives: number;
  bombs: number;
  power: number;
  weapon: WeaponType;
  score: number;
  combo: number;
}

export interface StageResult {
  stageId: number;
  nextStageId: number;
  score: number;
  combo: number;
  lives: number;
  bombs: number;
  power: number;
  weapon: WeaponType;
  cleared: boolean;
}
