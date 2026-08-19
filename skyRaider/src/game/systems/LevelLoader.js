import { enemyConfigs, stages } from '../data/stage1.js';
export class LevelLoader {
    loadStage(stageId) {
        const stage = stages.find((candidate) => candidate.stageId === stageId);
        if (!stage) {
            throw new Error(`Stage ${stageId} is not available in the demo build.`);
        }
        return structuredClone(stage);
    }
    getFinalStageId() {
        return stages.length;
    }
    getEnemyConfig(kind) {
        const config = enemyConfigs[kind];
        if (!config) {
            throw new Error(`Unknown enemy kind: ${kind}`);
        }
        return { ...config };
    }
}
