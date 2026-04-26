// 敵人 — 純 GameObject,沒有 physics
import { ENEMY_TYPES, enemyHP, enemyGold } from '../data/stats.js';

export class Enemy {
  constructor(scene, x, y, type, stage, wave) {
    this.scene = scene;
    this.type = type;
    this.def = ENEMY_TYPES[type];
    this.stage = stage;
    this.wave = wave;
    this.maxHP = enemyHP(type, stage, wave);
    this.hp = this.maxHP;
    this.attack = this.def.attack;
    this.speed = this.def.speed;
    this.x = x;
    this.y = y;
    this.isDead = false;
    this.active = true;

    // 走路動畫 sprite
    this.sprite = scene.add.sprite(x, y, `mon${this.def.monster}_0`)
      .setScale(this.def.scale)
      .setDepth(8);
    this.sprite.play(`mon${this.def.monster}_walk`);

    // HP bar(用素材) — 跟著 sprite 一起走
    const bw = 56, bh = 8;
    this.hpBg = scene.add.image(x, y - 50, 'ui_hp_bg').setDisplaySize(bw, bh).setDepth(9);
    this.hpFg = scene.add.image(x - bw / 2, y - 50, 'ui_hp_fg').setDisplaySize(bw, bh).setOrigin(0, 0.5).setDepth(10);
    this._hpBarW = bw;
  }

  step(delta) {
    if (this.isDead || !this.active) return;
    this.y += this.speed * (delta / 1000);
    this.sprite.y = this.y;
    this.sprite.x = this.x;
    this.hpBg.x = this.x; this.hpBg.y = this.y - 50;
    this.hpFg.x = this.x - this._hpBarW / 2; this.hpFg.y = this.y - 50;
  }

  takeDamage(dmg) {
    if (this.isDead) return false;
    this.hp -= dmg;
    this.hpFg.displayWidth = this._hpBarW * Math.max(0, this.hp / this.maxHP);
    if (this.hp <= 0) { this.die(); return true; }
    return false;
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.active = false;
    // 死亡特效
    const fx = this.scene.add.sprite(this.x, this.y, 'deadfx_0').setDepth(20);
    fx.play('deadfx');
    fx.once('animationcomplete', () => fx.destroy());
    this.sprite.destroy();
    this.hpBg.destroy();
    this.hpFg.destroy();
  }

  destroyAll() {
    if (this.sprite) this.sprite.destroy();
    if (this.hpBg)   this.hpBg.destroy();
    if (this.hpFg)   this.hpFg.destroy();
    this.active = false;
  }

  getGold() {
    return enemyGold(this.type, this.stage, this.wave);
  }
}
