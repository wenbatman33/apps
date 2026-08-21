import { LAYOUT, IS_TOUCH } from '../config.js';

// 輸入：PC 用滑鼠指向 + 左鍵/空白鍵加速；手機單指浮動搖桿，推到底即衝刺（不另設加速鍵）
export class Input {
  constructor(app, hud) {
    this.app = app; this.hud = hud;
    this.angle = 0;
    this.boosting = false;
    this.enabled = false;
    this.keys = new Set();
    this.joystick = { active: false, ox: 0, oy: 0, x: 0, y: 0, radius: 74, id: -1, power: 0 };
    this.boostPointerId = -1;
    this.srcMouse = false;   // 滑鼠左鍵
    this.srcBtn = false;     // 觸控加速鍵
    this.onQuit = null;      // 點離開鍵 / 按 Esc
    this.mouse = { x: 0, y: 0, has: false };
    this._bind();
  }

  _bind() {
    const c = this.app.canvas;
    c.style.touchAction = 'none';
    const local = (e) => {
      const r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    c.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      c.setPointerCapture?.(e.pointerId);
      const p = local(e);
      // 離開本局
      if (this.hud.qR > 0 && Math.hypot(p.x - this.hud.qX, p.y - this.hud.qY) < this.hud.qR * 1.5) {
        this.onQuit?.(); return;
      }
      if (e.pointerType === 'mouse') { this.mouse = { ...p, has: true }; this.srcMouse = true; return; }
      // 右下加速鍵
      if (this.hud.bbR > 0 && Math.hypot(p.x - this.hud.bbX, p.y - this.hud.bbY) < this.hud.bbR * 1.35) {
        this.boostPointerId = e.pointerId; this.srcBtn = true; return;
      }
      const j = this.joystick;
      if (!j.active) {
        j.active = true; j.id = e.pointerId;
        j.radius = LAYOUT.joyR || 74;
        j.ox = p.x; j.oy = p.y; j.x = p.x; j.y = p.y; j.power = 0;
      }
    });

    c.addEventListener('pointermove', (e) => {
      if (!this.enabled) return;
      const p = local(e);
      if (e.pointerType === 'mouse') { this.mouse = { ...p, has: true }; return; }
      const j = this.joystick;
      if (j.active && e.pointerId === j.id) {
        const dx = p.x - j.ox, dy = p.y - j.oy;
        const d = Math.hypot(dx, dy);
        this.angle = Math.atan2(dy, dx);
        const clamped = Math.min(d, j.radius);
        j.x = j.ox + Math.cos(this.angle) * clamped;
        j.y = j.oy + Math.sin(this.angle) * clamped;
        j.power = d / j.radius;
      }
    });

    const up = (e) => {
      if (e.pointerType === 'mouse') { this.srcMouse = false; return; }
      if (e.pointerId === this.boostPointerId) { this.boostPointerId = -1; this.srcBtn = false; }
      const j = this.joystick;
      if (e.pointerId === j.id) { j.active = false; j.id = -1; j.power = 0; }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.srcMouse = false; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
      if (e.code === 'Escape' && this.enabled) this.onQuit?.();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.srcMouse = this.srcBtn = false; });
  }

  update(dt) {
    if (!this.enabled) { this.boosting = false; return; }
    const k = this.keys;
    // 滑鼠：朝畫面中心到游標的方向
    if (!IS_TOUCH && this.mouse.has) {
      this.angle = Math.atan2(this.mouse.y - this.app.screen.height / 2, this.mouse.x - this.app.screen.width / 2);
    }
    // 鍵盤轉向（WASD / 方向鍵）
    let kx = 0, ky = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) kx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) kx += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) ky -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) ky += 1;
    if (kx || ky) this.angle = Math.atan2(ky, kx);

    const kb = k.has('Space') || k.has('ShiftLeft') || k.has('ShiftRight');
    const joyFull = this.joystick.active && this.joystick.power > 0.88;   // 手機：推到底＝衝刺，不另設按鈕
    this.boosting = this.srcMouse || this.srcBtn || kb || joyFull;
  }
}
