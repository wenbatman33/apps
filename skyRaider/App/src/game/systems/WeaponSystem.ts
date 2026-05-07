import type { WeaponType } from '../types';

// 武器威力倍率（以 vulcan 為基準 1.0）
// 目標：laser ≈ 1.5×、plasma ≈ 0.25×（DPS 比較）
// 因 vulcan/laser cooldown 接近，直接乘以倍率以調整 laser
// 倍率為「1.5 ÷ 原本 laser/vulcan DPS 比值（≈ 2.82）」≈ 0.53
export const VULCAN_DAMAGE_SCALE = 1.0;
export const LASER_DAMAGE_SCALE = 0.53;
// plasma 倍率：「0.25 ÷ 原本 plasma/vulcan DPS 比值（≈ 0.445）」≈ 0.56
export const PLASMA_DAMAGE_SCALE = 0.56;

export interface WeaponShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  texture: string;
  radius: number;
}

export class WeaponSystem {
  private lastShotAt = 0;

  tryFire(nowMs: number, x: number, y: number, power: number, weapon: WeaponType): WeaponShot[] {
    if (weapon === 'plasma') {
      return [];
    }

    const cooldown = weapon === 'laser' ? 150 : 178;
    if (nowMs - this.lastShotAt < cooldown) {
      return [];
    }

    this.lastShotAt = nowMs;
    const level = Math.max(1, Math.min(6, power));
    if (weapon === 'laser') {
      return this.fireLaser(x, y, level);
    }

    return this.fireVulcan(x, y, level);
  }

  private fireVulcan(x: number, y: number, level: number): WeaponShot[] {
    const damage = (10 + level * 2.2) * VULCAN_DAMAGE_SCALE;
    const shots: WeaponShot[] = [
      { x, y: y - 28, vx: 0, vy: -860, damage: damage * 1.45, texture: 'bullet-vulcan', radius: 3 },
    ];

    if (level >= 4) {
      shots.push({
        x: x - 18,
        y: y - 20,
        vx: -52,
        vy: -810,
        damage: damage * 0.75,
        texture: 'bullet-vulcan',
        radius: 3,
      });
      shots.push({
        x: x + 18,
        y: y - 20,
        vx: 52,
        vy: -810,
        damage: damage * 0.75,
        texture: 'bullet-vulcan',
        radius: 3,
      });
    }

    return shots;
  }

  private fireLaser(x: number, y: number, level: number): WeaponShot[] {
    const damage = (34 + level * 8) * LASER_DAMAGE_SCALE;
    const shots: WeaponShot[] = [
      { x, y: y - 48, vx: 0, vy: -760, damage, texture: 'bullet-laser', radius: 7 },
    ];

    if (level >= 3) {
      shots.push({
        x: x - 18,
        y: y - 34,
        vx: -18,
        vy: -720,
        damage: damage * 0.6,
        texture: 'bullet-laser',
        radius: 6,
      });
      shots.push({
        x: x + 18,
        y: y - 34,
        vx: 18,
        vy: -720,
        damage: damage * 0.6,
        texture: 'bullet-laser',
        radius: 6,
      });
    }

    return shots;
  }

}
