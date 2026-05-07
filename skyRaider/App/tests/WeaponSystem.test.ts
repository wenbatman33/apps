import { describe, expect, it } from 'vitest';
import { WeaponSystem } from '../src/game/systems/WeaponSystem';

describe('WeaponSystem', () => {
  it('scales vulcan spread with power', () => {
    const weapon = new WeaponSystem();

    expect(weapon.tryFire(120, 200, 800, 1, 'vulcan')).toHaveLength(1);
    expect(weapon.tryFire(250, 200, 800, 3, 'vulcan')).toHaveLength(1);
    expect(weapon.tryFire(380, 200, 800, 6, 'vulcan')).toHaveLength(3);
  });

  it('respects fire rate cooldown', () => {
    const weapon = new WeaponSystem();

    expect(weapon.tryFire(120, 200, 800, 1, 'vulcan')).toHaveLength(1);
    expect(weapon.tryFire(180, 200, 800, 1, 'vulcan')).toHaveLength(0);
    expect(weapon.tryFire(250, 200, 800, 1, 'vulcan')).toHaveLength(1);
  });

  it('uses distinct patterns per weapon type', () => {
    const weapon = new WeaponSystem();

    expect(weapon.tryFire(1_000, 200, 800, 6, 'laser')[0]?.texture).toBe('bullet-laser');
    expect(weapon.tryFire(1_300, 200, 800, 6, 'plasma')).toHaveLength(0);
  });
});
