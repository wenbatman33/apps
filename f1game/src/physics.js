// 玩家車物理（街機調性但有抓地極限、滑移與草地懲罰）
import * as THREE from 'three';
import { PARAMS } from './params.js';

export class PlayerCar {
  constructor(path) {
    this.path = path;
    this.pos = new THREE.Vector3();
    this.heading = 0;        // 車頭方向（xz 平面，atan2(-z, x)）
    this.velAngle = 0;       // 實際速度方向
    this.speed = 0;
    this.steer = 0;          // 平滑後的轉向輸入 [-1,1]
    this.steerAngle = 0;     // 實際前輪角
    this.hintIdx = 0;
    this.onGrass = false;
    this.lapS = 0;           // 目前弧長位置
    this.frozen = true;      // 起跑前鎖定
  }

  placeAt(s, lat) {
    const sm = this.path.sample(s);
    this.pos.copy(sm.pos).addScaledVector(sm.nor, lat);
    this.heading = Math.atan2(-sm.tan.z, sm.tan.x);
    this.velAngle = this.heading;
    this.speed = 0;
    this.hintIdx = this.path.idx(s);
    this.lapS = s;
  }

  update(dt, input) {
    const P = PARAMS.physics;
    if (this.frozen) { this.speed = 0; return; }

    // --- 輸入平滑：按下漸進（不畫龍）、放開快速回正；高速自動降低轉向靈敏度 ---
    const highSpeedCalm = 0.72 + 0.28 / (1 + this.speed * 0.045);
    const steerTarget = input.steer * highSpeedCalm;
    const k = Math.abs(steerTarget) > Math.abs(this.steer) ? 5.5 : 13;
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * k);

    // --- 縱向（speed 可為負 = 倒車，卡牆時長按煞車即可倒出來） ---
    const grassMul = this.onGrass ? PARAMS.physics.grassGrip : 1;
    let a = 0;
    if (input.throttle > 0) a += input.throttle * P.accel * Math.max(0, 1 - Math.pow(Math.max(this.speed, 0) / P.topSpeed, 3)) * grassMul;
    else a -= P.engineBrake * Math.sign(this.speed);
    if (input.brake > 0) {
      if (this.speed > 0.5) a -= input.brake * P.brakeDecel * (0.4 + 0.6 * grassMul);
      else a -= 11; // 近停止時化為倒車推力
    }
    // 草地阻力隨速度遞減：低速時小於引擎推力，確保不會永久卡死在草地
    if (this.onGrass) a -= P.grassDrag * Math.min(1, Math.abs(this.speed) / 14 + 0.12) * Math.sign(this.speed || 0);
    this.speed = THREE.MathUtils.clamp(this.speed + a * dt, -8, P.topSpeed * 1.02);
    if (input.brake === 0 && input.throttle === 0 && Math.abs(this.speed) < 0.3) this.speed = 0;

    // --- 隱性轉向輔助：車頭往賽道前方輕微吸附（街機標配，玩家無感但顯著減少出彎失誤） ---
    let assist = 0;
    if (this.speed > 8 && !this.onGrass) {
      const aheadSm = this.path.sample(this.path.wrap(this.lapS + 10 + this.speed * 0.35));
      const roadH = Math.atan2(-aheadSm.tan.z, aheadSm.tan.x);
      let dRoad = roadH - this.heading;
      while (dRoad > Math.PI) dRoad -= Math.PI * 2;
      while (dRoad < -Math.PI) dRoad += Math.PI * 2;
      assist = THREE.MathUtils.clamp(dRoad, -0.5, 0.5) * P.steerAssist;
    }

    // --- 轉向（單車模型 + 側向抓地極限） ---
    const lock = P.steerLock / (1 + this.speed * P.steerFalloff);
    this.steerAngle += ((this.steer + assist) * lock - this.steerAngle) * Math.min(1, dt * 10);
    const wheelbase = 3.3;
    let yawRate = this.speed / wheelbase * Math.tan(this.steerAngle);
    const maxLat = (P.gripLatA + this.speed * this.speed * P.downforce) * grassMul;
    const latA = Math.abs(this.speed * yawRate);
    let slipping = false;
    if (latA > maxLat && this.speed > 1) {
      yawRate = Math.sign(yawRate) * maxLat / this.speed;
      this.speed -= (latA - maxLat) * 0.18 * dt * this.speed * 0.05; // 推頭時微洗速度
      slipping = true;
    }
    this.heading += yawRate * dt;

    // --- 速度方向往車頭收斂（滑移感） ---
    let dA = this.heading - this.velAngle;
    while (dA > Math.PI) dA -= Math.PI * 2;
    while (dA < -Math.PI) dA += Math.PI * 2;
    const recov = P.gripRecover * grassMul * (slipping ? 0.7 : 1);
    this.velAngle += dA * Math.min(1, recov * dt);

    // --- 位移 ---
    this.pos.x += Math.cos(this.velAngle) * this.speed * dt;
    this.pos.z += -Math.sin(this.velAngle) * this.speed * dt;

    // --- 對齊賽道：高度、草地判定、隱形牆 ---
    const near = this.path.nearest(this.pos.x, this.pos.z, this.hintIdx);
    this.hintIdx = near.idx;
    this.lapS = near.s;
    const sm = this.path.sample(near.s);
    this.pos.y = sm.pos.y;
    this.latNow = near.lat; // 目前橫向偏移（AI 閃避用）
    const edge = near.lat > 0 ? sm.wl : sm.wr;
    this.onGrass = Math.abs(near.lat) > edge + 0.6;
    const LIMIT = 8; // 略小於視覺護欄（路緣外 8.5m），避免穿牆
    if (Math.abs(near.lat) > edge + LIMIT) { // 隱形牆：往內推回 0.15m 脫離牆面，溫和減速
      const clamped = Math.sign(near.lat) * (edge + LIMIT - 0.15);
      this.pos.copy(sm.pos).addScaledVector(sm.nor, clamped);
      this.pos.y = sm.pos.y;
      this.speed *= 0.99;
      this.velAngle = Math.atan2(-sm.tan.z, sm.tan.x);
      this.heading += (this.velAngle - this.heading) * 0.2;
    }
    this.slipping = slipping;
  }
}
