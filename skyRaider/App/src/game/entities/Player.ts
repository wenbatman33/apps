import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../constants';

export const PLAYER_START_Y = GAME_HEIGHT - 138;

export class Player extends Phaser.Physics.Arcade.Image {
  invulnerableUntil = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, GAME_WIDTH / 2, PLAYER_START_Y, 'player-ship');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.player);
    this.setScale(0.55);
    this.setCircle(22, this.width / 2 - 22, this.height / 2 - 18);
  }

  respawn(): void {
    this.setPosition(GAME_WIDTH / 2, PLAYER_START_Y);
    this.invulnerableUntil = this.scene.time.now + 1800;
    this.setAlpha(0.45);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 120,
      repeat: 10,
      yoyo: true,
      onComplete: () => this.setAlpha(1),
    });
  }

  isInvulnerable(nowMs: number): boolean {
    return nowMs < this.invulnerableUntil;
  }

  bankToward(deltaX: number): void {
    const targetAngle = Phaser.Math.Clamp(deltaX * 0.55, -18, 18);
    this.angle = Phaser.Math.Linear(this.angle, targetAngle, 0.18);
  }
}
