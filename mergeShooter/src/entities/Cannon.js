// 砲塔 — 用 Container 包貼圖+徽章+數字,可拖曳
import {
  cannonDamage, cannonFireRate, cannonRange, cannonProjSpeed,
  cannonGunIndex, cannonTint, MAX_CANNON_LEVEL
} from '../data/stats.js';
import { Bullet } from './Bullet.js';

export class Cannon extends Phaser.GameObjects.Container {
  constructor(scene, x, y, level, slotInfo) {
    super(scene, x, y);
    scene.add.existing(this);

    this.level = level;
    this.slotInfo = slotInfo;
    this.lastShot = 0;

    const gunIdx = cannonGunIndex(level);
    // origin (0.5, 0.7) — 砲塔貼圖砲身偏下,把 origin 拉低讓視覺中心對齊 slot
    this.sprite = scene.add.sprite(0, 0, `gun${gunIdx}_idle`)
      .setScale(0.55)
      .setOrigin(0.5, 0.7);
    if (level % 2 === 0) this.sprite.setTint(cannonTint(level));
    this.add(this.sprite);

    // 等級徽章 — shield + 數字,放在砲塔右下
    this.badge = scene.add.image(20, 22, 'ui_shield').setScale(0.4);
    this.add(this.badge);
    this.lvlText = scene.add.text(20, 24, `${level}`, {
      fontFamily: 'PassionOne, Arial Black, Arial', fontSize: '17px',
      color: '#ffffff', stroke: '#231a4a', strokeThickness: 3
    }).setOrigin(0.5);
    this.add(this.lvlText);

    // 拖曳互動
    this.setSize(70, 80);
    this.setInteractive({ draggable: true, useHandCursor: true });
    scene.input.setDraggable(this);
    this.setDepth(11);
  }

  setLevel(level) {
    this.level = level;
    const gunIdx = cannonGunIndex(level);
    if (this.sprite.anims) this.sprite.anims.stop();
    this.sprite.setTexture(`gun${gunIdx}_idle`);
    this.sprite.clearTint();
    if (level % 2 === 0) this.sprite.setTint(cannonTint(level));
    this.lvlText.setText(`${level}`);
  }

  get damage()    { return cannonDamage(this.level); }
  get fireRate()  { return cannonFireRate(this.level); }
  get range()     { return cannonRange(this.level); }
  get projSpeed() { return cannonProjSpeed(this.level); }
  get isMax()     { return this.level >= MAX_CANNON_LEVEL; }

  // 由 GameScene.update 呼叫
  tryShoot(now, enemies) {
    if (this.slotInfo.type !== 'front') return;

    // 找最近的敵人(範圍內)
    let nearest = null, nd = this.range;
    for (const e of enemies) {
      if (!e.active || e.isDead) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d < nd) { nd = d; nearest = e; }
    }
    if (!nearest) {
      // 沒目標 → 保持當前角度,不動(避免無目標↔有目標切換造成的抖動)
      return;
    }

    // 計算朝向目標的角度
    // 砲塔貼圖原本砲口朝上(−Y),atan2(dx, -dy) 讓砲口指向 (dx, dy)
    const dx = nearest.x - this.x;
    const dy = nearest.y - this.y;
    const targetAngle = Math.atan2(dx, -dy);

    // 平滑旋轉:用最短角度差 × damping,避開 RotateTo 在接近目標時的 snap-to 跳動
    const cur = this.sprite.rotation;
    const diff = Phaser.Math.Angle.ShortestBetween(
      Phaser.Math.RadToDeg(cur),
      Phaser.Math.RadToDeg(targetAngle)
    );
    // diff 是角度,轉回弧度,再乘 damping (0.12 較穩,不會過衝)
    this.sprite.rotation = cur + Phaser.Math.DegToRad(diff) * 0.12;

    // 冷卻判定
    const interval = 1000 / this.fireRate;
    if (now - this.lastShot < interval) return;
    this.lastShot = now;

    // 發射動畫:只在未播放時觸發,避免高射速下重置動畫造成視覺跳動
    const gunIdx = cannonGunIndex(this.level);
    const shootKey = `gun${gunIdx}_shoot`;
    const playing = this.sprite.anims.isPlaying && this.sprite.anims.currentAnim?.key === shootKey;
    if (!playing) {
      this.sprite.play({ key: shootKey, frameRate: 30 });
      this.sprite.once('animationcomplete', () => {
        if (this.sprite && this.sprite.active) this.sprite.setTexture(`gun${gunIdx}_idle`);
      });
    }

    // 砲口世界座標 — 沿砲管方向,距砲塔中心 62px
    const ang = this.sprite.rotation;
    const muzzleX = this.x + 62 * Math.sin(ang);
    const muzzleY = this.y - 62 * Math.cos(ang);

    // 槍口閃光
    const fx = this.scene.add.sprite(muzzleX, muzzleY, 'shootfx_0').setScale(0.55).setDepth(12);
    fx.rotation = ang;
    fx.play('shootfx');
    fx.once('animationcomplete', () => fx.destroy());

    // 子彈
    const b = new Bullet(this.scene, muzzleX, muzzleY, this.level, this.damage, this.projSpeed, nearest);
    this.scene.bullets.push(b);
  }
}
