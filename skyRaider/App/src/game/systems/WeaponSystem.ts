import type { WeaponType } from '../types';

// 武器威力倍率（以 vulcan 為基準 1.0）
// 目標：laser ≈ 1.5×、plasma ≈ 0.25×（DPS 比較）
// 因 vulcan/laser cooldown 接近，直接乘以倍率以調整 laser
// 倍率為「1.5 ÷ 原本 laser/vulcan DPS 比值（≈ 2.82）」≈ 0.53
export const VULCAN_DAMAGE_SCALE = 1.0;
export const LASER_DAMAGE_SCALE = 0.53;
// plasma 倍率：目標 0.4× vulcan DPS（0.4 ÷ 0.445 ≈ 0.9）
export const PLASMA_DAMAGE_SCALE = 0.9;

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
    const lv = Math.max(1, Math.min(5, level));
    const shots: WeaponShot[] = [];
    // 依等級遞增：1 / 2 / 3 / 4 / 5 顆子彈
    if (lv === 1) {
      shots.push({ x, y: y - 28, vx: 0, vy: -860, damage: damage * 1.4, texture: 'bullet-vulcan', radius: 3 });
    } else if (lv === 2) {
      // 雙併排
      shots.push({ x: x - 8, y: y - 26, vx: 0, vy: -860, damage: damage * 1.0, texture: 'bullet-vulcan', radius: 3 });
      shots.push({ x: x + 8, y: y - 26, vx: 0, vy: -860, damage: damage * 1.0, texture: 'bullet-vulcan', radius: 3 });
    } else if (lv === 3) {
      // 中央 + 兩翼微張
      shots.push({ x, y: y - 30, vx: 0, vy: -880, damage: damage * 1.2, texture: 'bullet-vulcan', radius: 3 });
      shots.push({ x: x - 14, y: y - 22, vx: -38, vy: -820, damage: damage * 0.85, texture: 'bullet-vulcan', radius: 3 });
      shots.push({ x: x + 14, y: y - 22, vx: 38, vy: -820, damage: damage * 0.85, texture: 'bullet-vulcan', radius: 3 });
    } else if (lv === 4) {
      // 4 顆對稱
      shots.push({ x: x - 8, y: y - 28, vx: -10, vy: -870, damage: damage * 1.0, texture: 'bullet-vulcan', radius: 3 });
      shots.push({ x: x + 8, y: y - 28, vx: 10, vy: -870, damage: damage * 1.0, texture: 'bullet-vulcan', radius: 3 });
      shots.push({ x: x - 22, y: y - 18, vx: -56, vy: -800, damage: damage * 0.8, texture: 'bullet-vulcan', radius: 3 });
      shots.push({ x: x + 22, y: y - 18, vx: 56, vy: -800, damage: damage * 0.8, texture: 'bullet-vulcan', radius: 3 });
    } else {
      // 5 顆扇形
      shots.push({ x, y: y - 30, vx: 0, vy: -900, damage: damage * 1.25, texture: 'bullet-vulcan', radius: 3 });
      shots.push({ x: x - 12, y: y - 24, vx: -28, vy: -860, damage: damage * 0.95, texture: 'bullet-vulcan', radius: 3 });
      shots.push({ x: x + 12, y: y - 24, vx: 28, vy: -860, damage: damage * 0.95, texture: 'bullet-vulcan', radius: 3 });
      shots.push({ x: x - 24, y: y - 16, vx: -68, vy: -780, damage: damage * 0.75, texture: 'bullet-vulcan', radius: 3 });
      shots.push({ x: x + 24, y: y - 16, vx: 68, vy: -780, damage: damage * 0.75, texture: 'bullet-vulcan', radius: 3 });
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
