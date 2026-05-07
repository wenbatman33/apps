import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import type { StageResult } from '../types';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(result: StageResult): void {
    const backgroundKey = `stage-${result.stageId}-gpt2-long`;
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, backgroundKey).setAlpha(0.75);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050816, 0.55);
    this.add
      .text(GAME_WIDTH / 2, 250, result.cleared ? 'STAGE CLEAR' : 'MISSION FAILED', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '38px',
        color: result.cleared ? '#fff4b8' : '#ff9a9a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        352,
        `Stage ${result.stageId}\nScore ${result.score}\nMax Combo ${result.combo}\nLives ${result.lives}   Bombs ${result.bombs}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          color: '#f8fbff',
          align: 'center',
          lineSpacing: 14,
        },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 670, result.cleared ? `Tap for Stage ${result.nextStageId}` : 'Tap to retry', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#bfe8ff',
      })
      .setOrigin(0.5);

    this.input.once('pointerdown', () =>
      this.scene.start('GameScene', {
        stageId: result.cleared ? result.nextStageId : result.stageId,
        score: result.cleared ? result.score : 0,
        lives: result.cleared ? Math.max(1, result.lives) : 3,
        bombs: result.cleared ? result.bombs : 3,
        power: result.cleared ? result.power : 1,
        weapon: result.cleared ? result.weapon : 'vulcan',
      }),
    );
  }
}
