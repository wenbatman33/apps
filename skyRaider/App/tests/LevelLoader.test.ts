import { describe, expect, it } from 'vitest';
import { LevelLoader } from '../src/game/systems/LevelLoader';

describe('LevelLoader', () => {
  it('loads stage 1 as a data-driven stage', () => {
    const loader = new LevelLoader();
    const stage = loader.loadStage(1);

    expect(stage.stageId).toBe(1);
    expect(stage.waves.length).toBeGreaterThanOrEqual(6);
    expect(stage.waves.at(-1)?.spawn).toBe('boss');
  });

  it('loads stage 2 with a different visual background', () => {
    const loader = new LevelLoader();
    const stage = loader.loadStage(2);

    expect(stage.stageId).toBe(2);
    expect(stage.backgroundKey).toBe('stage-2-gpt2-long');
    expect(stage.waves.at(-1)?.spawn).toBe('boss');
  });

  it('exposes the full eight-stage route', () => {
    const loader = new LevelLoader();

    expect(loader.getFinalStageId()).toBe(8);
    expect(loader.loadStage(8).backgroundKey).toBe('stage-8-gpt2-long');
  });

  it('returns isolated enemy config copies', () => {
    const loader = new LevelLoader();
    const scout = loader.getEnemyConfig('scout');
    scout.hp = 0;

    expect(loader.getEnemyConfig('scout').hp).toBeGreaterThan(0);
  });
});
