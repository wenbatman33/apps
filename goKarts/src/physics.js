// 物理模组：卡丁车驾驶、漂移、坡度、碰撞与圈数
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

export function makeKartState(type, start, isPlayer, name) {
  return {
    type, isPlayer, name,
    pos: start.pos.clone(), heading: start.heading,
    speed: 0, steerS: 0,
    drift: { active: false, dir: 0, charge: 0 }, driftYawVis: 0,
    boost: 0, spinT: 0, shrinkT: 0, padCd: 0,
    idx: start.idx, frac: 0, lateral: start.lat, offroad: false,
    prevS: start.idx, lap: -1, halfFlag: true, progress: -10,
    lapStart: 0, lapTimes: [], bestLap: 0, finished: false, finishTime: 0,
    item: null, rouletteT: 0, itemCd: 0,
    rank: 1, aiSeed: Math.random() * 1000, aiOffset: 0, aiThink: 0,
    mesh: null, wheels: null,
    _crossedLine: false, _wallHit: 0, _bump: 0, _gotPad: false,
  };
}

// input: { steer:-1..1, throttle:0..1, brake:bool, drift:bool }
export function updateKart(kart, input, track, dt) {
  const st = kart.type;
  const N = track.N;
  kart._crossedLine = false; kart._wallHit = 0; kart._gotPad = false;
  kart.padCd = Math.max(0, kart.padCd - dt);
  kart.boost = Math.max(0, kart.boost - dt);
  kart.shrinkT = Math.max(0, kart.shrinkT - dt);

  // ---- 打滑（被击中）----
  if (kart.spinT > 0) {
    kart.spinT -= dt;
    kart.speed *= Math.max(0, 1 - 2.6 * dt);
    input = { steer: 0, throttle: 0, brake: false, drift: false };
  }

  // ---- 转向平滑 ----
  kart.steerS += (input.steer - kart.steerS) * Math.min(1, 8 * dt);

  // ---- 漂移 ----
  const d = kart.drift;
  if (!d.active && input.drift && kart.speed > 17 && Math.abs(kart.steerS) > 0.3 && kart.spinT <= 0) {
    d.active = true; d.dir = Math.sign(kart.steerS); d.charge = 0;
  }
  if (d.active) {
    // 持续反打方向 → 视为想离开漂移，避免转向被锁死
    if (kart.steerS * d.dir < -0.55) d.counter = (d.counter || 0) + dt;
    else d.counter = 0;
    if (!input.drift || kart.speed < 9 || d.counter > 0.35) {
      // 放开 → 依蓄力给予喷射
      if (d.charge > 2.4) { kart.boost = Math.max(kart.boost, 1.5); kart._miniTurbo = 2; }
      else if (d.charge > 1.1) { kart.boost = Math.max(kart.boost, 0.85); kart._miniTurbo = 1; }
      d.active = false; d.dir = 0; d.charge = 0; d.counter = 0;
    } else {
      d.charge += dt * (0.8 + Math.abs(kart.steerS) * 0.7) * st.drift;
    }
  }

  // ---- 极速 / 加减速 ----
  let effTop = st.topSpeed * (kart.aiTopScale || 1);
  if (kart.shrinkT > 0) effTop *= 0.62;
  if (kart.offroad && kart.boost <= 0) effTop *= 0.45;
  if (kart.boost > 0) effTop += 15;

  if (input.brake && kart.speed > 0.5) {
    kart.speed -= 34 * dt;
  } else if (input.brake) {
    kart.speed = Math.max(kart.speed - 12 * dt, -9); // 倒车
  } else if (input.throttle > 0) {
    const a = st.accel * Math.max(0.15, 1 - kart.speed / effTop) + (kart.boost > 0 ? 30 : 0);
    kart.speed += a * input.throttle * dt;
  } else {
    kart.speed -= Math.sign(kart.speed) * 9 * dt;
    if (Math.abs(kart.speed) < 0.3) kart.speed = 0;
  }
  if (kart.speed > effTop) kart.speed = Math.max(effTop, kart.speed - 26 * dt);

  // ---- 转向 ----
  let effSteer = kart.steerS;
  if (d.active) effSteer = d.dir * (0.85 + 0.65 * THREE.MathUtils.clamp(kart.steerS * d.dir, -0.8, 1));
  const spdFac = THREE.MathUtils.clamp(Math.abs(kart.speed) / 13, 0, 1) * (1 - Math.abs(kart.speed) / st.topSpeed * 0.42);
  kart.heading += effSteer * st.handling * 1.5 * spdFac * dt * Math.sign(kart.speed || 1);

  // ---- 位移（漂移时带侧滑）----
  const slip = d.active ? d.dir * 0.30 : 0;
  const mh = kart.heading - slip;
  kart.pos.x += Math.sin(mh) * kart.speed * dt;
  kart.pos.z += Math.cos(mh) * kart.speed * dt;

  // ---- 赛道查询 ----
  const q = track.query(kart.pos, kart.idx);
  kart.idx = q.idx; kart.frac = THREE.MathUtils.clamp(q.frac, 0, 1); kart.lateral = q.lateral;
  const s = track.samples[q.idx];

  // 坡度重力（上坡减速、下坡加速）
  const fDot = Math.sin(kart.heading) * s.tan.x + Math.cos(kart.heading) * s.tan.z;
  kart.speed -= s.tan.y * fDot * 20 * dt;

  // 路外判定（含路缘宽容）
  kart.offroad = Math.abs(q.lateral) > track.halfW + 1.2;

  // ---- 墙壁 ----
  const lim = track.wallD - 0.9;
  if (Math.abs(q.lateral) > lim) {
    const sign = Math.sign(q.lateral);
    const segLen = track.totalLen / N;
    const base = s.pos.clone().addScaledVector(s.tan, kart.frac * segLen);
    kart.pos.x = base.x + s.side.x * lim * sign;
    kart.pos.z = base.z + s.side.z * lim * sign;
    kart.lateral = lim * sign;
    // 撞击强度 = 侧向速度成分
    const trackH = Math.atan2(s.tan.x, s.tan.z);
    const rel = angleDiff(kart.heading, trackH);
    const impact = Math.abs(kart.speed) * Math.abs(Math.sin(rel));
    kart._wallHit = impact;
    kart.speed *= 1 - 0.45 * Math.min(1, impact / 18);
    // 只在车头仍朝墙时才把角度收回，玩家反向转向不受干扰（避免贴墙卡死）
    if (Math.sign(rel) === Math.sign(kart.lateral)) {
      kart.heading = trackH + THREE.MathUtils.clamp(rel, -0.6, 0.6) * 0.5;
    }
    if (d.active) { d.active = false; d.dir = 0; d.charge = 0; }
  }

  // 贴齐路面高度
  kart.pos.y = track.surfaceY(kart.idx, kart.frac, kart.lateral);

  // ---- 加速带 ----
  if (kart.padCd <= 0) {
    for (const pad of track.boostPads) {
      const rel = (kart.idx - pad.idx + N) % N;
      if (rel < pad.len && !kart.offroad) {
        kart.boost = Math.max(kart.boost, 1.1); kart.padCd = 1.5; kart._gotPad = true;
        break;
      }
    }
  }

  // ---- 圈数 ----
  const sNow = kart.idx + kart.frac;
  if (sNow > N * 0.4 && sNow < N * 0.6) kart.halfFlag = true;
  if (kart.prevS > N * 0.8 && sNow < N * 0.2) {
    if (kart.halfFlag) { kart.lap++; kart.halfFlag = false; kart._crossedLine = true; }
  } else if (kart.prevS < N * 0.2 && sNow > N * 0.8) {
    kart.lap--; kart.halfFlag = true; // 逆向跨线
  }
  kart.prevS = sNow;
  kart.progress = kart.lap * N + sNow;
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// ---- 车辆间碰撞 ----
const _dv = new THREE.Vector3();
export function collideKarts(karts) {
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i], b = karts[j];
      if (a.finished && b.finished) continue;
      _dv.subVectors(b.pos, a.pos); _dv.y = 0;
      const dist = _dv.length();
      if (dist > 2.15 || dist < 0.001) continue;
      _dv.normalize();
      const overlap = 2.15 - dist;
      const wa = a.type.weight, wb = b.type.weight;
      const pushA = overlap * (wb / (wa + wb)), pushB = overlap * (wa / (wa + wb));
      a.pos.addScaledVector(_dv, -pushA);
      b.pos.addScaledVector(_dv, pushB);
      const dv = Math.abs(a.speed - b.speed);
      a.speed *= 0.96; b.speed *= 0.96;
      a._bump = Math.max(a._bump, dv); b._bump = Math.max(b._bump, dv);
    }
  }
}

// ---- 视觉更新：贴合路面法线 + 车轮/漂移/缩小 ----
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _n = new THREE.Vector3(), _side3 = new THREE.Vector3();
export function updateKartVisual(kart, track, dt) {
  if (!kart.mesh) return;
  const s = track.samples[kart.idx];
  // 表面法线 = 切线 × (侧向+倾斜)
  _side3.copy(s.side); _side3.y += s.bankSlope; _side3.normalize();
  _n.crossVectors(_side3, s.tan).normalize();
  if (_n.y < 0) _n.negate();

  // 漂移视觉偏摆 & 打滑旋转
  const targetDriftYaw = kart.drift.active ? kart.drift.dir * 0.42 : 0;
  kart.driftYawVis += (targetDriftYaw - kart.driftYawVis) * Math.min(1, 8 * dt);
  const spinYaw = kart.spinT > 0 ? (1.3 - kart.spinT) * Math.PI * 4 : 0;

  _q1.setFromUnitVectors(UP, _n);
  _q2.setFromAxisAngle(UP, kart.heading + kart.driftYawVis + spinYaw);
  kart.mesh.quaternion.copy(_q1).multiply(_q2);
  kart.mesh.position.copy(kart.pos);

  // 缩小（闪电）
  const targetScale = kart.shrinkT > 0 ? 0.55 : 1;
  const sc = kart.mesh.scale.x + (targetScale - kart.mesh.scale.x) * Math.min(1, 6 * dt);
  kart.mesh.scale.setScalar(sc);

  // 车轮（userData.spin = 滚动节点、wrapper 本身做前轮转向）
  if (kart.wheels) {
    for (const w of kart.wheels) {
      for (const c of w.userData.spin || []) c.rotation.x += kart.speed * dt / 0.38;
      if (w.userData.front) w.rotation.y = kart.steerS * 0.42;
    }
  }
}
