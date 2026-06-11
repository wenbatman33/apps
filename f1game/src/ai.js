// AI 賽車：沿賽道線行駛，依前方曲率煞車，含閃避與個體差異
import * as THREE from 'three';
import { PARAMS } from './params.js';

export class AICar {
  constructor(path, seed) {
    this.path = path;
    this.s = 0;
    this.lat = 0;
    this.targetLat = 0;
    this.speed = 0;
    this.pos = new THREE.Vector3();
    this.heading = 0;
    // 個體差異：快慢、過彎膽量、走線偏好
    const r = (k) => { seed = (seed * 16807 + k) % 2147483647; return (seed / 2147483647); };
    this.skill = 0.955 + r(1) * 0.055;       // 0.955 ~ 1.01
    this.latBias = (r(2) - 0.5) * 2.2;
    this.aggression = 0.9 + r(3) * 0.2;
    this.frozen = true;
    this.lap = 0;
    this.prevS = 0;
  }

  placeAt(s, lat) {
    this.s = s; this.prevS = s; this.lat = lat; this.targetLat = lat; this.speed = 0;
    this._sync();
  }

  _sync() {
    const sm = this.path.sample(this.s);
    this.pos.copy(sm.pos).addScaledVector(sm.nor, this.lat);
    this.heading = Math.atan2(-sm.tan.z, sm.tan.x);
    this._sm = sm;
  }

  update(dt, others) {
    if (this.frozen) { this._sync(); return; }
    const A = PARAMS.ai;
    const scale = A.speedScale * this.skill;

    // --- 目標速度：前方多個距離點的曲率限速取最嚴格值（含煞車距離） ---
    let allow = PARAMS.physics.topSpeed * scale;
    for (let d = 0; d <= 170; d += 14) {
      const c = this.path.maxCurvAhead(this.s + d, 16);
      const vCorner = Math.sqrt((A.gripLatA * this.aggression) / Math.max(c, 0.0008)) * scale;
      const vBrake = Math.sqrt(vCorner * vCorner + 2 * A.brake * d);
      allow = Math.min(allow, vBrake);
    }

    // --- 前車閃避 ---
    for (const o of others) {
      if (o === this) continue;
      let ds = o.progress() - this.progress();
      if (ds > 0 && ds < 16 && Math.abs(o.latPos() - this.lat) < 2.4) {
        if (ds < 7) allow = Math.min(allow, o.speedVal() * 0.92);
        else allow = Math.min(allow, o.speedVal() + 2);
        // 嘗試變線超車
        this.targetLat = this.lat + (this.lat > o.latPos() ? 2.6 : -2.6);
      }
    }

    // --- 加減速 ---
    if (this.speed < allow) this.speed = Math.min(allow, this.speed + A.accel * scale * Math.max(0.25, 1 - Math.pow(this.speed / (PARAMS.physics.topSpeed * scale), 3)) * dt);
    else this.speed = Math.max(allow, this.speed - A.brake * dt);

    // --- 走線：朝彎內側 + 個體偏好 ---
    const cAhead = this.path.sample(this.path.wrap(this.s + 55)).curv;
    const sm = this.path.sample(this.s);
    const room = Math.min(sm.wl, sm.wr) - 2.2;
    let ideal = THREE.MathUtils.clamp(Math.sign(cAhead) * Math.min(Math.abs(cAhead) * 260, room) + this.latBias, -room, room);
    this.targetLat += (ideal - this.targetLat) * Math.min(1, dt * 1.2);
    this.lat += THREE.MathUtils.clamp(this.targetLat - this.lat, -4.5 * dt, 4.5 * dt) * Math.min(1, this.speed / 8);

    // --- 前進 ---
    this.prevS = this.s;
    this.s = this.path.wrap(this.s + this.speed * dt);
    if (this.prevS > this.path.total * 0.9 && this.s < this.path.total * 0.1) this.lap++;
    this._sync();
    // 車頭朝行進方向再加一點走線橫移的角度
    this.heading = Math.atan2(-this._sm.tan.z, this._sm.tan.x);
  }

  progress() { return this.lap * this.path.total + this.s; }
  latPos() { return this.lat; }
  speedVal() { return this.speed; }
}
