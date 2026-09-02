// ===== 匹克球：物理積分、球網/牆面/地面碰撞、軌跡預測、出手速度求解 =====
import * as THREE from 'three';
import { COURT, TUNE } from './tune.js';
import { makeBallTexture } from './textures.js';
import { ROOM } from './arena.js';

export function netHeightAt(x) {
  const t = Math.min(1, Math.abs(x) / COURT.postX);
  return COURT.netCenter + (COURT.netPost - COURT.netCenter) * t * t;
}

export class Ball {
  constructor(scene) {
    const r = TUNE.physics.ballRadius;
    const mat = new THREE.MeshStandardMaterial({ map: makeBallTexture(), roughness: 0.5, metalness: 0 });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), mat);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.mat = mat;
    this.pos = new THREE.Vector3(0, 1, 5);
    this.vel = new THREE.Vector3();
    this.active = false;      // 是否受物理驅動
    this.lastHitter = null;   // 'p' | 'a'
    this.bounces = 0;         // 自上次擊球後落地次數
    this.netHit = false;
    this.spinAxis = new THREE.Vector3(1, 0, 0);
    this.trail = [];
    this._trailMesh = this._makeTrail(scene);
  }

  _makeTrail(scene) {
    const N = 14;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const mat = new THREE.LineBasicMaterial({ color: 0xe9ff5a, transparent: true, opacity: 0.35 });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    scene.add(line);
    this.trailN = N;
    return line;
  }

  place(x, y, z) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.active = false;
    this.bounces = 0;
    this.netHit = false;
    this.lastHitter = null;
    this.trail.length = 0;
    this.mesh.position.copy(this.pos);
    this._trailMesh.visible = false;
  }

  launch(v, hitter) {
    this.vel.copy(v);
    this.active = true;
    this.bounces = 0;
    this.netHit = false;
    this.lastHitter = hitter;
    this.trail.length = 0;
  }

  /**
   * 物理步進；events: { onBounce(pos), onNet(), onWall() }
   */
  step(dt, events) {
    if (!this.active) { this.mesh.position.copy(this.pos); return; }
    const P = TUNE.physics;
    const r = P.ballRadius;
    const sub = 4;
    const h = dt / sub;
    for (let i = 0; i < sub; i++) {
      const prevZ = this.pos.z;
      // 重力 + 阻力
      this.vel.y -= P.gravity * h;
      const sp = this.vel.length();
      const dragK = Math.max(0, 1 - P.drag * sp * h);
      this.vel.multiplyScalar(dragK);
      this.pos.addScaledVector(this.vel, h);

      // 球網
      if (Math.sign(prevZ) !== Math.sign(this.pos.z) && prevZ !== 0) {
        const t = prevZ / (prevZ - this.pos.z);
        const xc = this.pos.x - this.vel.x * h * (1 - t);
        const yc = this.pos.y - this.vel.y * h * (1 - t);
        if (Math.abs(xc) < COURT.postX + 0.05 && yc - r < netHeightAt(xc)) {
          const side = Math.sign(prevZ) || 1;
          this.pos.z = side * (r + 0.01);
          this.vel.z = -this.vel.z * 0.18;
          this.vel.x *= 0.5;
          this.vel.y = Math.min(this.vel.y, 0) * 0.3;
          this.netHit = true;
          events?.onNet?.();
        }
      }
      // 地面
      if (this.pos.y - r < 0) {
        this.pos.y = r;
        if (this.vel.y < 0) {
          const speedDown = -this.vel.y;
          this.vel.y = speedDown * P.restitution;
          this.vel.x *= P.friction;
          this.vel.z *= P.friction;
          if (speedDown > 0.9) {
            this.bounces++;
            events?.onBounce?.(this.pos, speedDown);
          } else {
            this.vel.y = 0; // 滾動
          }
        }
      }
      // 牆面（遠處保底）
      const WX = ROOM.halfW - 0.15, WZ = ROOM.halfL - 0.15;
      if (Math.abs(this.pos.x) > WX) { this.pos.x = Math.sign(this.pos.x) * WX; this.vel.x = -this.vel.x * P.wallRestitution; events?.onWall?.(); }
      if (Math.abs(this.pos.z) > WZ) { this.pos.z = Math.sign(this.pos.z) * WZ; this.vel.z = -this.vel.z * P.wallRestitution; events?.onWall?.(); }
    }
    // 滾動摩擦
    if (this.pos.y <= r + 1e-4 && this.vel.y === 0) {
      this.vel.x *= Math.max(0, 1 - 1.6 * dt);
      this.vel.z *= Math.max(0, 1 - 1.6 * dt);
    }
    this.mesh.position.copy(this.pos);
    // 自轉
    const sp = this.vel.length();
    if (sp > 0.05) {
      this.spinAxis.set(-this.vel.z, 0, this.vel.x).normalize();
      this.mesh.rotateOnWorldAxis(this.spinAxis, (sp / r) * dt * 0.35);
    }
    // 尾跡
    this.trail.push(this.pos.clone());
    if (this.trail.length > this.trailN) this.trail.shift();
    const arr = this._trailMesh.geometry.attributes.position;
    for (let i = 0; i < this.trailN; i++) {
      const p = this.trail[Math.max(0, this.trail.length - 1 - (this.trailN - 1 - i))] || this.pos;
      arr.setXYZ(i, p.x, p.y, p.z);
    }
    arr.needsUpdate = true;
    this._trailMesh.visible = sp > 7;
    this._trailMesh.material.opacity = THREE.MathUtils.clamp((sp - 7) / 10, 0, 0.5);
  }

  get speed() { return this.vel.length(); }

  /**
   * 預測軌跡（含反彈），回傳 { samples:[{p,t,bounced}], firstBounce:{p,t}|null }
   * maxT 秒、以 hStep 步長積分（不含球網碰撞：呼叫端自行判斷）
   */
  predict(maxT = 3, hStep = 1 / 60, fromPos = this.pos, fromVel = this.vel) {
    const P = TUNE.physics;
    const r = P.ballRadius;
    const p = fromPos.clone(), v = fromVel.clone();
    const samples = [];
    let firstBounce = null;
    let bounced = 0;
    for (let t = 0; t < maxT; t += hStep) {
      v.y -= P.gravity * hStep;
      const sp = v.length();
      v.multiplyScalar(Math.max(0, 1 - P.drag * sp * hStep));
      p.addScaledVector(v, hStep);
      if (p.y - r < 0) {
        p.y = r;
        if (v.y < 0) {
          bounced++;
          if (!firstBounce) firstBounce = { p: p.clone(), t };
          v.y = -v.y * P.restitution;
          v.x *= P.friction; v.z *= P.friction;
          if (bounced >= 2) break;
        }
      }
      samples.push({ p: p.clone(), t, bounced });
    }
    return { samples, firstBounce };
  }
}

/**
 * 求出由 from 飛到 to、飛行時間 T 的初速度（忽略阻力的拋體，阻力由呼叫端以 T 調整補償）
 */
export function solveLaunch(from, to, T, g = TUNE.physics.gravity) {
  const v = new THREE.Vector3(
    (to.x - from.x) / T,
    (to.y - from.y + 0.5 * g * T * T) / T,
    (to.z - from.z) / T
  );
  return v;
}

/**
 * 依「落點目標」求擊球初速：自動確保過網、限制速度。
 * opts: { speed(水平速度期望), netClear, minFlight, maxFlight }
 */
export function planShot(from, target, opts = {}) {
  const S = TUNE.shot;
  const speed = opts.speed ?? S.driveSpeed;
  const g = TUNE.physics.gravity;
  const dx = target.x - from.x, dz = target.z - from.z;
  const dist = Math.hypot(dx, dz);
  let T = THREE.MathUtils.clamp(dist / speed, opts.minFlight ?? S.minFlight, opts.maxFlight ?? S.maxFlight);
  // 阻力補償：飛行越久損失越多，稍微縮短理論 T（等於加快初速）
  const drag = TUNE.physics.drag;
  const tgt = new THREE.Vector3(target.x, TUNE.physics.ballRadius, target.z);
  let v = null;
  for (let i = 0; i < 8; i++) {
    const Tc = T * (1 - drag * speed * T * 0.55);
    v = solveLaunch(from, tgt, Tc, g);
    // 過網檢查
    if (Math.sign(from.z) !== Math.sign(tgt.z) && from.z !== 0) {
      const tn = -from.z / v.z;
      const yn = from.y + v.y * tn - 0.5 * g * tn * tn;
      const xn = from.x + v.x * tn;
      const need = netHeightAt(xn) + (opts.netClear ?? S.netClear);
      if (yn < need) { T *= 1.10; continue; }
    }
    break;
  }
  return v;
}
