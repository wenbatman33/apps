// 觸控 / 滑鼠操作（支援多點觸控，各手指控各自的桿）
// 拖曳 = 移動球桿（人偶保持直立）；點擊（快按快放、幾乎沒移動）= 踢球
import { CONFIG } from './config.js';

export class InputManager {
  constructor(canvas, scene, game) {
    this.canvas = canvas; this.scene = scene; this.game = game;
    this.pointers = new Map();
    this.enabled = false;

    canvas.addEventListener('pointerdown', e => this._down(e));
    canvas.addEventListener('pointermove', e => this._move(e));
    canvas.addEventListener('pointerup', e => this._up(e));
    canvas.addEventListener('pointercancel', e => this._up(e));
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  _down(e) {
    if (!this.enabled) return;
    const local = this.scene.screenToLocal(e.clientX, e.clientY);
    if (!local) return;
    // 找最近的玩家桿
    let best = -1, bd = CONFIG.control.grabRange;
    for (const i of this.game.playerRodIndices()) {
      const d = Math.abs(local.z - this.game.rods[i].def.z);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return;
    try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* 合成事件無法 capture，忽略 */ }
    const rod = this.game.rods[best];
    rod.held = true; // 手指拖曳中，自動追球讓位
    this.pointers.set(e.pointerId, {
      rodIdx: best,
      grabDelta: rod.offset - local.x * CONFIG.control.moveSens,
      downT: performance.now(),
      downX: local.x, downZ: local.z,
      moved: 0,
    });
  }

  _move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p || !this.enabled) return;
    const local = this.scene.screenToLocal(e.clientX, e.clientY);
    if (!local) return;
    // 沿桿方向拖 = 移桿（人偶不旋轉）
    this.game.setRodTarget(p.rodIdx, local.x * CONFIG.control.moveSens + p.grabDelta);
    p.moved = Math.max(p.moved, Math.hypot(local.x - p.downX, local.z - p.downZ));
  }

  _up(e) {
    const p = this.pointers.get(e.pointerId);
    if (p) {
      this.game.rods[p.rodIdx].held = false;
      if (this.enabled) {
        const C = CONFIG.control;
        const dt = (performance.now() - p.downT) / 1000;
        // 快按快放且幾乎沒拖動 → 踢球
        if (dt < C.tapMaxTime && p.moved < C.tapMaxMove) {
          this.game.triggerKick(p.rodIdx, C.tapKickPow);
        }
      }
    }
    this.pointers.delete(e.pointerId);
  }
}
