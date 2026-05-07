import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.scale.setGameSize(GAME_WIDTH, GAME_HEIGHT);
    this.scene.start('PreloadScene');
  }
}
