import Phaser from 'phaser';
import { GAME_HEIGHT } from '../constants';
import type { PickupKind } from '../types';
import type { Poolable } from '../systems/ObjectPool';

const PICKUP_TEXTURES: Record<PickupKind, string> = {
  power: 'pickup-power',
  bomb: 'pickup-bomb',
  'one-up': 'pickup-1up',
  'weapon-vulcan': 'pickup-weapon-vulcan',
  'weapon-laser': 'pickup-weapon-laser',
  'weapon-plasma': 'pickup-weapon-plasma',
};

export class Pickup extends Phaser.Physics.Arcade.Image implements Poolable {
  kind: PickupKind = 'power';
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'pickup-power');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(28);
    this.label = scene.add
      .text(-100, -100, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#061229',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(13);
  }

  resetPoolItem(x: number, y: number, kind: PickupKind): void {
    this.kind = kind;
    this.setTexture(PICKUP_TEXTURES[kind]);
    this.setPosition(x, y);
    // sprite 已預縮成 ~192px，再縮成約 55px 顯示
    this.setScale(0.30);
    this.setCircle(80, this.width / 2 - 80, this.height / 2 - 80);
    this.setVelocity(0, 86);
    this.label.setText(this.getLabelText(kind));
    // label 對齊在圖示正下方（依顯示高度計算偏移）
    this.label.setPosition(x, y + this.displayHeight / 2 + 8);
    this.label.setVisible(true);
    this.label.setActive(true);
    this.setActive(true);
    this.setVisible(true);
    this.setDepth(12);
    if (this.body) {
      this.body.enable = true;
    }
  }

  deactivatePoolItem(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    this.setPosition(-100, -100);
    this.label.setActive(false);
    this.label.setVisible(false);
    this.label.setPosition(-100, -100);
    if (this.body) {
      this.body.enable = false;
    }
  }

  preUpdate(_time: number, _delta: number): void {
    // 寶物不旋轉，label 持續跟在圖示正下方
    this.label.setPosition(this.x, this.y + this.displayHeight / 2 + 8);
    if (this.y > GAME_HEIGHT + 50) {
      this.deactivatePoolItem();
    }
  }

  private getLabelText(kind: PickupKind): string {
    if (kind === 'power') return 'POWER';
    if (kind === 'bomb') return 'BOMB';
    if (kind === 'one-up') return '1UP';
    if (kind === 'weapon-laser') return 'LASER';
    if (kind === 'weapon-plasma') return 'PLASMA';
    return 'VULCAN';
  }
}
