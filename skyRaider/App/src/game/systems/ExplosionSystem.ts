import Phaser from 'phaser';
import { DEPTH } from '../constants';
import type { ExplosionSize } from '../types';

export class ExplosionSystem {
  private particles: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: Phaser.Scene) {
    this.particles = scene.add.particles(0, 0, 'fragment', {
      speed: { min: 80, max: 360 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      lifespan: { min: 260, max: 780 },
      gravityY: 120,
      blendMode: 'ADD',
      emitting: false,
    });
    this.particles.setDepth(DEPTH.vfx);
  }

  burst(x: number, y: number, size: ExplosionSize): void {
    const frameCount = size === 'large' ? 2 : 1;
    const quantity = size === 'large' ? 170 : size === 'medium' ? 88 : 34;
    const shake = size === 'large' ? 0.012 : size === 'medium' ? 0.006 : 0.002;
    const stop = size === 'large' ? 42 : 0;

    if (size !== 'small') {
      for (let index = 0; index < frameCount; index += 1) {
        const sprite = this.scene.add.sprite(x, y, 'explosion-0');
        sprite.setDepth(DEPTH.vfx + 1);
        sprite.setScale(size === 'large' ? 1.35 + index * 0.22 : 0.82);
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        sprite.play('explosion-burst');
        sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
      }
    }

    this.particles.explode(quantity, x, y);
    this.scene.cameras.main.shake(size === 'large' ? 260 : 120, shake);
    if (size === 'large') {
      this.flash(x, y, size);
    }

    if (stop > 0) {
      this.hitStop(stop);
    }
  }

  bombFlash(): void {
    const flash = this.scene.add.rectangle(216, 468, 520, 1040, 0xeaf7ff, 0.82);
    flash.setDepth(DEPTH.vfx + 4);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 260,
      onComplete: () => flash.destroy(),
    });
    this.scene.cameras.main.shake(360, 0.018);
  }

  playerDeath(x: number, y: number): void {
    const sprite = this.scene.add.sprite(x, y, 'player-death-explosion-0');
    sprite.setDepth(DEPTH.vfx + 2);
    sprite.setScale(1.45);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    sprite.play('player-death-burst');
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
    this.particles.explode(220, x, y);
    this.scene.cameras.main.shake(330, 0.016);
    this.hitStop(70);
  }

  private flash(x: number, y: number, size: ExplosionSize): void {
    const radius = size === 'large' ? 96 : size === 'medium' ? 42 : 22;
    const flash = this.scene.add.circle(x, y, radius, 0xfff2ad, size === 'large' ? 0.2 : 0.12);
    flash.setDepth(DEPTH.vfx);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: size === 'large' ? 1.35 : 1.18,
      duration: size === 'large' ? 260 : 120,
      onComplete: () => flash.destroy(),
    });
  }

  private hitStop(durationMs: number): void {
    const world = this.scene.physics.world;
    world.pause();
    this.scene.time.timeScale = 0.15;
    this.scene.time.delayedCall(durationMs, () => {
      world.resume();
      this.scene.time.timeScale = 1;
    });
  }
}
