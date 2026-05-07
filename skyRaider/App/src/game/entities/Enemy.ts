import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import type { EnemyConfig, EnemyKind } from '../types';
import type { Poolable } from '../systems/ObjectPool';

export class Enemy extends Phaser.Physics.Arcade.Image implements Poolable {
  kind: EnemyKind = 'scout';
  hp = 1;
  maxHp = 1;
  score = 0;
  fireRateMs = 1000;
  bulletSpeed = 140;
  lastFireAt = 0;
  movement = 'line';
  spawnTime = 0;
  private baseX = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'enemy-scout');
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  resetPoolItem(x: number, y: number, config: EnemyConfig, movement: string, hpMultiplier = 1): void {
    this.kind = config.kind;
    this.hp = Math.round(config.hp * hpMultiplier);
    this.maxHp = this.hp;
    this.score = config.score;
    this.fireRateMs = config.fireRateMs;
    this.bulletSpeed = config.bulletSpeed;
    this.lastFireAt = 0;
    this.movement = movement;
    this.spawnTime = this.scene.time.now;
    this.baseX = x;
    this.setTexture(config.texture);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setDepth(10);
    this.setAngle(180);
    // boss / midboss 快速進場到舞台上方就定位
    const enterSpeed = config.kind === 'boss' ? 320 : config.kind === 'midboss' ? 280 : config.speed;
    this.setVelocity(0, enterSpeed);
    this.setScale(config.scale);
    this.setCircle(config.radius, this.width / 2 - config.radius, this.height / 2 - config.radius);
    if (this.body) {
      this.body.enable = true;
    }
  }

  deactivatePoolItem(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    this.setPosition(-100, -100);
    if (this.body) {
      this.body.enable = false;
    }
  }

  applyDamage(damage: number): boolean {
    this.hp -= damage;
    return this.hp <= 0;
  }

  preUpdate(time: number, _delta: number): void {
    if (!this.active) return;

    const age = (time - this.spawnTime) / 1000;
    if (this.movement === 'sine') {
      this.x = Phaser.Math.Clamp(this.baseX + Math.sin(age * 3.2) * 60, 48, GAME_WIDTH - 48);
    }

    if (this.movement === 'zigzag') {
      this.x = Phaser.Math.Clamp(this.baseX + Math.sin(age * 4.8) * 86, 48, GAME_WIDTH - 48);
    }

    if (this.movement === 'cross') {
      const direction = this.baseX < GAME_WIDTH / 2 ? 1 : -1;
      this.x = Phaser.Math.Clamp(this.baseX + age * 72 * direction + Math.sin(age * 3.5) * 22, 48, GAME_WIDTH - 48);
    }

    if (this.kind === 'boss') {
      const targetY = GAME_HEIGHT / 3;
      if (this.y >= targetY) {
        this.y = targetY;
        this.setVelocityY(0);
      }
      this.x = Phaser.Math.Clamp(GAME_WIDTH / 2 + Math.sin(age * 1.3) * 64, 72, GAME_WIDTH - 72);
    }

    if (this.kind === 'midboss') {
      const targetY = 190;
      if (this.y >= targetY) {
        this.y = targetY;
        this.setVelocityY(0);
      }
      this.x = Phaser.Math.Clamp(GAME_WIDTH / 2 + Math.sin(age * 1.8) * 46, 68, GAME_WIDTH - 68);
    }

    if (this.y > GAME_HEIGHT + 80) {
      this.deactivatePoolItem();
    }
  }
}
