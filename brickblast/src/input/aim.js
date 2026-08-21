// 瞄準輸入：滑鼠與觸控共用同一套（方向 = 指標位置 − 發射點），另支援鍵盤微調
import { LAYOUT } from '../config.js';

export class AimInput {
  constructor(canvas, renderer, hooks) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.hooks = hooks;         // { canAim(), onAim(dir), onFire(dir), onCancel() }
    this.active = false;
    this.dir = null;
    this.keyAngle = -Math.PI / 2;
    this.keyMode = false;
    this.bind();
  }

  bind() {
    const c = this.canvas;
    const opts = { passive: false };
    c.addEventListener('pointerdown', this.onDown = (e) => this.down(e), opts);
    window.addEventListener('pointermove', this.onMove = (e) => this.move(e), opts);
    window.addEventListener('pointerup', this.onUp = (e) => this.up(e), opts);
    window.addEventListener('pointercancel', this.onUp, opts);
    window.addEventListener('keydown', this.onKey = (e) => this.key(e));
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    window.removeEventListener('keydown', this.onKey);
  }

  pos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return this.renderer.toWorld(e.clientX - rect.left, e.clientY - rect.top);
  }

  down(e) {
    if (!this.hooks.canAim()) return;
    const rect = this.canvas.getBoundingClientRect();
    if (this.hooks.blocked?.(e.clientX - rect.left, e.clientY - rect.top)) return;
    e.preventDefault();
    this.active = true;
    this.keyMode = false;
    this.update(e);
  }

  move(e) {
    if (!this.active) return;
    e.preventDefault();
    this.update(e);
  }

  update(e) {
    const p = this.pos(e);
    const origin = this.hooks.origin();
    let dx = p.x - origin.x;
    let dy = p.y - origin.y;
    // 指標落在發射點下方：視為取消
    if (dy > -8) {
      this.dir = null;
      this.hooks.onAim(null);
      return;
    }
    this.dir = this.hooks.onAim({ x: dx, y: dy });
  }

  up(e) {
    if (!this.active) return;
    this.active = false;
    if (this.dir) this.hooks.onFire(this.dir);
    else this.hooks.onCancel?.();
    this.dir = null;
  }

  // PC 鍵盤：←→ 微調角度，空白／↑ 發射
  key(e) {
    if (!this.hooks.canAim()) return;
    const step = e.shiftKey ? 0.008 : 0.03;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      this.keyMode = true;
      this.keyAngle += (e.key === 'ArrowLeft' ? -step : step);
      this.keyAngle = Math.max(-Math.PI + 0.12, Math.min(-0.12, this.keyAngle));
      this.dir = this.hooks.onAim({ x: Math.cos(this.keyAngle), y: Math.sin(this.keyAngle) });
    } else if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') && this.keyMode && this.dir) {
      e.preventDefault();
      this.hooks.onFire(this.dir);
      this.dir = null;
    }
  }
}
