import { enemyConfigs, stages } from '../data/stage1';
import type { EnemyConfig, EnemyKind, StageConfig } from '../types';

export class LevelLoader {
  loadStage(stageId: number): StageConfig {
    const stage = stages.find((candidate) => candidate.stageId === stageId);

    if (!stage) {
      throw new Error(`Stage ${stageId} is not available in the demo build.`);
    }

    return structuredClone(stage);
  }

  getFinalStageId(): number {
    return stages.length;
  }

  getEnemyConfig(kind: EnemyKind): EnemyConfig {
    const config = enemyConfigs[kind];

    if (!config) {
      throw new Error(`Unknown enemy kind: ${kind}`);
    }

    return { ...config };
  }
}
