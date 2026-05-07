import { describe, expect, it } from 'vitest';
import { DDA } from '../src/game/systems/DDA';

describe('DDA', () => {
  it('softens pressure after repeated deaths', () => {
    const dda = new DDA();
    dda.recordDeath(1_000);
    dda.recordDeath(20_000);

    expect(dda.getState(21_000).densityMultiplier).toBe(0.9);
    expect(dda.getState(21_000).enemyHpMultiplier).toBe(0.9);
  });

  it('adds power drop bonus after a clean run', () => {
    const dda = new DDA();
    dda.recordHit(1_000);

    expect(dda.getState(91_500).powerDropBonus).toBe(0.2);
  });
});
