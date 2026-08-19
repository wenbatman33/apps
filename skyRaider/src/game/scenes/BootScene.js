import Phaser from '../../../vendor/phaser.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants.js';
export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }
    create() {
        this.scale.setGameSize(GAME_WIDTH, GAME_HEIGHT);
        this.scene.start('PreloadScene');
    }
}
