import { World } from '../core/world.js';

// 傳輸層抽象：遊戲主迴圈只認這個介面，之後要接線上多人只需換一個實作
// join(name) -> 建立自己的蛇；sendInput() -> 送出操作；tick(dt) -> 推進一格；world -> 目前世界狀態
export class LocalTransport {
  constructor() { this.world = new World(); this.isLocal = true; }
  join(name) { return this.world.spawnPlayer(name); }
  sendInput(angle, boosting) {
    const p = this.world.player;
    if (!p || p.dead) return;
    p.targetAngle = angle;
    p.boosting = boosting;
  }
  tick(dt) { this.world.update(dt); }
}

// 線上多人預留：伺服器負責權威模擬，這裡只送輸入、收快照並做內插補償。
// 待伺服器就緒時實作 connect/applySnapshot/interpolate，其餘遊戲程式碼不需更動。
export class RemoteTransport {
  constructor(url) {
    this.url = url; this.isLocal = false;
    this.world = new World();   // 用同一份世界結構承接伺服器快照
    this.ws = null;
    this.seq = 0;
  }
  async connect() { throw new Error('線上多人尚未啟用'); }
  join() { throw new Error('線上多人尚未啟用'); }
  sendInput(angle, boosting) {
    if (!this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ t: 'in', a: +angle.toFixed(3), b: boosting ? 1 : 0, n: ++this.seq }));
  }
  tick() { /* 由 applySnapshot + 內插驅動 */ }
}
