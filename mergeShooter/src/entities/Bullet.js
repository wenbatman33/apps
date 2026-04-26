// 子彈 — 自動追蹤目標,純手動位置更新
export class Bullet {
  constructor(scene, x, y, level, damage, speed, target) {
    this.scene = scene;
    this.damage = damage;
    this.speed = speed;
    this.target = target;
    this.x = x;
    this.y = y;
    this.active = true;
    const tex = `bullet_${1 + ((level - 1) % 4)}`;
    this.sprite = scene.add.image(x, y, tex).setScale(0.5).setDepth(15);
  }

  step(delta) {
    if (!this.active) return;
    if (!this.target || !this.target.active || this.target.isDead) {
      this.destroy();
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const dt = delta / 1000;
    this.x += (dx / len) * this.speed * dt;
    this.y += (dy / len) * this.speed * dt;
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.rotation = Math.atan2(dy, dx) + Math.PI / 2;

    if (Math.hypot(dx, dy) < 22) {
      const killed = this.target.takeDamage(this.damage);
      this.scene.events.emit('bullet-hit', { target: this.target, killed });
      this.destroy();
    }
  }

  destroy() {
    this.active = false;
    if (this.sprite) this.sprite.destroy();
  }
}
