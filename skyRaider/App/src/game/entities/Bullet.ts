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
    const tex = owner === 'player' ? (texture ?? 'bullet-vulcan') : (texture ?? 'bullet-enemy');
    this.setTexture(tex);
    this.setPosition(x, y);
    // 預設 scale 1.0；只有大圖紋理才縮小（tracking-missile 預縮為 55×256）
    const scaleMap: Record<string, number> = {
      'tracking-missile': 0.18,
    };
    const sc = scaleMap[tex] ?? 1;
    this.setScale(sc);
    const hitRadius = owner === 'enemy' ? 5 : radius;
    const collRadius = sc < 1 ? Math.max(hitRadius / sc, hitRadius) : hitRadius;
    this.setCircle(collRadius, this.width / 2 - collRadius, this.height / 2 - collRadius);
    this.setActive(true);
    this.setVisible(true);
    if (this.body) {
      this.body.enable = true;
    }
    this.setVelocity(vx, vy);
    this.setDepth(owner === 'player' ? 20 : 21);
    // 全部子彈用 NORMAL blend（SVG 已自帶光暈漸層；避免 ADD 在 SVG 抗鋸齒邊緣產生白框）
    this.setBlendMode(Phaser.BlendModes.NORMAL);
    // 預設不旋轉（避免上一次池複用時殘留旋轉）
    this.setRotation(0);
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
