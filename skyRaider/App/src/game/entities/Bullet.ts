import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import type { BulletOwner } from '../types';
import type { Poolable } from '../systems/ObjectPool';

export class Bullet extends Phaser.Physics.Arcade.Image implements Poolable {
  owner: BulletOwner = 'player';
  damage = 1;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'bullet-player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(5);
  }

  resetPoolItem(
    x: number,
    y: number,
    vx: number,
    vy: number,
    owner: BulletOwner,
    damage: number,
    texture?: string,
    radius = 5,
  ): void {
    this.owner = owner;
    this.damage = damage;
    this.setTexture(owner === 'player' ? (texture ?? 'bullet-vulcan') : (texture ?? 'bullet-enemy'));
    this.setPosition(x, y);
    const hitRadius = owner === 'enemy' ? 5 : radius;
    this.setCircle(hitRadius, this.width / 2 - hitRadius, this.height / 2 - hitRadius);
    this.setActive(true);
    this.setVisible(true);
    if (this.body) {
      this.body.enable = true;
    }
    this.setVelocity(vx, vy);
    this.setDepth(owner === 'player' ? 20 : 21);
    this.setBlendMode(Phaser.BlendModes.ADD);
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

  preUpdate(_time: number, _delta: number): void {
    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const maxStep = this.owner === 'player' ? 58 : 42;
      body.deltaMax.set(maxStep, maxStep);
    }

    if (
      this.active &&
      (this.x < -48 || this.x > GAME_WIDTH + 48 || this.y < -80 || this.y > GAME_HEIGHT + 80)
    ) {
      this.deactivatePoolItem();
    }
  }
}
