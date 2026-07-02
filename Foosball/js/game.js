// 遊戲核心：2D 物理（球在桌面平面上）、桿件、進球規則、AI
import { CONFIG, RODS, rodHalfTravel } from './config.js';

const FIG_HALF = 0.55;   // 人偶碰撞半寬（x）
const FIG_DEPTH = 0.42;  // 人偶碰撞半深（z）
const STRIKE_REACH = 2.45; // 踢擊觸球距離（揮擊方向）；需 > 中場桿距的一半，中線才不會有死區
const STRIKE_BACK = 1.0;  // 踢擊觸球距離（反方向容忍）
const KICK_MAX = 2.0;     // AI 踢擊動畫最大擺幅（弧度）
const TILT_PASS = 0.9;    // 人偶傾倒超過此角度就不擋球（球從腳下過）

export class Game {
  constructor() {
    this.rods = RODS.map(def => {
      const facing = def.side === 'P' ? -1 : 1; // 玩家往 -z 攻擊
      const rels = [];
      for (let i = 0; i < def.count; i++) rels.push((i - (def.count - 1) / 2) * def.spacing);
      return {
        def, facing, rels, halfTravel: rodHalfTravel(def),
        offset: 0, targetOffset: 0, lateralVel: 0,
        // angle 語意：正值 = 腳朝自己的攻擊方向擺（前踢），負值 = 向後擺
        angle: 0, targetAngle: 0, angVel: 0, held: false,
        kickT: -1, kickDir: 1, kickPow: 0, kickAimVx: null, struck: false,
        cooldown: 0, aiReact: 0, aiTarget: 0,
      };
    });
    this.ball = { x: 0, z: 0, vx: 0, vz: 0, spin: 0 };
    this.scoreP = 0; this.scoreA = 0;
    this.phase = 'idle'; // idle | play | goal | end
    this.pauseT = 0; this.stuckT = 0; this.pendingServe = null;
    this.aiCfg = CONFIG.ai.normal;
    this._ev = {};
  }

  on(name, fn) { (this._ev[name] = this._ev[name] || []).push(fn); }
  emit(name, ...a) {
    for (const f of this._ev[name] || []) {
      try { f(...a); } catch (e) { console.error('[game event]', name, e); }
    }
  }
  setDifficulty(d) { this.aiCfg = CONFIG.ai[d] || CONFIG.ai.normal; }

  startMatch() {
    this.scoreP = 0; this.scoreA = 0;
    this.rods.forEach(r => { r.offset = 0; r.targetOffset = 0; r.angle = 0; r.kickT = -1; });
    this.serve(null);
    this.phase = 'play';
  }

  // conceder: 'P'|'A'|null（null = 中圈開球）
  serve(conceder) {
    const b = this.ball;
    if (conceder) {
      const rod = this.rods.find(r => r.def.side === conceder && r.def.kind === 'MID');
      b.z = rod.def.z + rod.facing * 1.3;
      b.x = (Math.random() - 0.5) * 4;
      b.vx = (Math.random() - 0.5) * 2; b.vz = rod.facing * 1.5;
    } else {
      b.x = 0; b.z = 0;
      const a = Math.random() * Math.PI * 2;
      b.vx = Math.cos(a) * 3; b.vz = Math.sin(a) * 3;
    }
    this.stuckT = 0;
  }

  setRodTarget(idx, x) {
    const r = this.rods[idx];
    r.targetOffset = Math.max(-r.halfTravel, Math.min(r.halfTravel, x));
  }

  // 玩家直接控制旋轉角（正 = 前踢方向）
  setRodAngle(idx, a) {
    const m = CONFIG.control.maxSwing;
    this.rods[idx].targetAngle = Math.max(-m, Math.min(m, a));
  }

  // AI 用的踢擊動畫；dir: 1 前踢 / -1 後踢
  triggerKick(idx, power, aimVx = null, dir = 1) {
    const r = this.rods[idx];
    if (r.cooldown > 0) return false;
    r.kickT = 0; r.struck = false; r.kickAimVx = aimVx; r.kickDir = dir;
    r.kickPow = Math.min(CONFIG.control.kickPowMax, power);
    r.cooldown = CONFIG.control.kickCooldown;
    this.emit('kick', r);
    return true;
  }

  playerRodIndices() {
    return this.rods.map((r, i) => r.def.side === 'P' ? i : -1).filter(i => i >= 0);
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    for (const r of this.rods) this._updateRod(r, dt);
    if (this.phase === 'play') {
      this._updateAI(dt);
      this._slope(dt);
      this._physics(dt);
      this._checkStuck(dt);
    } else if (this.phase === 'goal') {
      this.pauseT -= dt;
      if (this.pauseT <= 0) {
        if (this.scoreP >= CONFIG.rules.winScore || this.scoreA >= CONFIG.rules.winScore) {
          this.phase = 'end';
          this.emit('end', this.scoreP > this.scoreA ? 'P' : 'A');
        } else {
          this.serve(this.pendingServe);
          this.phase = 'play';
        }
      }
    }
  }

  _updateRod(r, dt) {
    // 側移（緩動追目標）
    const prev = r.offset;
    r.offset += (r.targetOffset - r.offset) * Math.min(1, 28 * dt);
    r.lateralVel = (r.offset - prev) / dt;
    if (r.cooldown > 0) r.cooldown -= dt;

    const prevAngle = r.angle;
    if (r.kickT >= 0) {
      // AI 踢擊動畫：0→1，前 40% 揮出、後 60% 收回
      r.kickT += dt / 0.3;
      const t = Math.min(r.kickT, 1);
      const swing = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
      r.angle = r.kickDir * swing * KICK_MAX;
      if (r.kickT >= 1) { r.kickT = -1; r.angle = 0; }
      if (!r.struck && t < 0.75) this._tryStrike(r, r.kickDir, r.kickPow, r.kickAimVx);
    } else {
      // 非踢擊時人偶回正保持直立（拖曳只移動不旋轉）
      r.angle += (r.targetAngle - r.angle) * Math.min(1, 22 * dt);
    }
    r.angVel = (r.angle - prevAngle) / dt;
  }

  _nearestFig(r, x) {
    let best = 0, bd = 1e9;
    for (const rel of r.rels) {
      const fx = r.offset + rel, d = Math.abs(x - fx);
      if (d < bd) { bd = d; best = fx; }
    }
    return { fx: best, dx: x - best };
  }

  // dir: 1 = 朝自己攻擊方向踢，-1 = 向後踢（回傳/解圍）
  _tryStrike(r, dir, power, aimVx) {
    const b = this.ball;
    const dzf = (b.z - r.def.z) * r.facing * dir; // 球在揮擊方向前方為正
    if (dzf < -STRIKE_BACK || dzf > STRIKE_REACH) return false;
    const { dx } = this._nearestFig(r, b.x);
    if (Math.abs(dx) > FIG_HALF + CONFIG.table.ballR + 0.8) return false;
    r.struck = true;
    r.kickPow = power; // 音效依力道取用
    b.vz = r.facing * dir * power;
    b.vx = aimVx !== null && aimVx !== undefined
      ? aimVx
      : dx * 3.2 + r.lateralVel * 0.45;
    b.spin = 1;
    this.stuckT = 0;
    this.emit('strike', r);
    return true;
  }

  _physics(dt) {
    const b = this.ball, T = CONFIG.table, P = CONFIG.physics;
    // 摩擦
    const decay = Math.exp(-P.friction * dt);
    b.vx *= decay; b.vz *= decay;
    const sp = Math.hypot(b.vx, b.vz);
    if (sp > P.maxSpeed) { b.vx *= P.maxSpeed / sp; b.vz *= P.maxSpeed / sp; }
    if (sp < 0.05) { b.vx = 0; b.vz = 0; }
    // 子步進防穿透
    const steps = Math.max(1, Math.ceil(sp * dt / 0.22));
    const sdt = dt / steps;
    for (let s = 0; s < steps; s++) {
      b.x += b.vx * sdt; b.z += b.vz * sdt;
      this._collideWalls();
      this._collideRods();
      if (this._checkGoal()) return;
    }
  }

  _collideWalls() {
    const b = this.ball, T = CONFIG.table, P = CONFIG.physics;
    const R = T.cornerR;
    const cx = T.width / 2 - R, cz = T.length / 2 - R;
    // 四角圓弧牆：球沿弧面反彈導回場內
    if (Math.abs(b.x) > cx && Math.abs(b.z) > cz) {
      const sx = Math.sign(b.x), sz = Math.sign(b.z);
      const dx = b.x - sx * cx, dz = b.z - sz * cz;
      const d = Math.hypot(dx, dz), maxD = R - T.ballR;
      if (d > maxD && d > 1e-6) {
        const nx = dx / d, nz = dz / d;
        b.x = sx * cx + nx * maxD;
        b.z = sz * cz + nz * maxD;
        const vn = b.vx * nx + b.vz * nz;
        if (vn > 0) {
          b.vx -= (1 + P.wallRest) * vn * nx;
          b.vz -= (1 + P.wallRest) * vn * nz;
          this._wallHit();
        }
      }
      return;
    }
    const xMax = T.width / 2 - T.ballR;
    if (b.x > xMax) { b.x = xMax; if (b.vx > 0) { b.vx *= -P.wallRest; this._wallHit(); } }
    if (b.x < -xMax) { b.x = -xMax; if (b.vx < 0) { b.vx *= -P.wallRest; this._wallHit(); } }
    // 端牆（球門開口外）
    const zMax = T.length / 2 - T.ballR;
    if (Math.abs(b.x) >= T.goalHalf - T.ballR * 0.3) {
      if (b.z > zMax) { b.z = zMax; if (b.vz > 0) { b.vz *= -P.wallRest; this._wallHit(); } }
      if (b.z < -zMax) { b.z = -zMax; if (b.vz < 0) { b.vz *= -P.wallRest; this._wallHit(); } }
    }
  }

  _wallHit() {
    const sp = Math.hypot(this.ball.vx, this.ball.vz);
    if (sp > 2) this.emit('wall', sp);
  }

  _collideRods() {
    const b = this.ball, r0 = CONFIG.table.ballR;
    for (const r of this.rods) {
      // 人偶傾倒（前踢或後仰）→ 不擋球，球從腳下通過
      if (Math.abs(r.angle) > TILT_PASS) continue;
      const dz = b.z - r.def.z;
      if (Math.abs(dz) > r0 + FIG_DEPTH) continue;
      const { dx } = this._nearestFig(r, b.x);
      if (Math.abs(dx) > r0 + FIG_HALF) continue;
      // 依較淺的穿透軸推出
      const penZ = r0 + FIG_DEPTH - Math.abs(dz);
      const penX = r0 + FIG_HALF - Math.abs(dx);
      if (penZ <= penX) {
        const dir = dz >= 0 ? 1 : -1;
        b.z = r.def.z + dir * (r0 + FIG_DEPTH + 0.01);
        if (b.vz * dir < 0) b.vz = -b.vz * CONFIG.physics.blockRest;
        b.vx += r.lateralVel * 0.5;
      } else {
        const dir = dx >= 0 ? 1 : -1;
        b.x += dir * (penX + 0.01);
        if (b.vx * dir < 0) b.vx = -b.vx * CONFIG.physics.blockRest;
        b.vx += r.lateralVel * 0.6;
      }
      this.emit('block', Math.hypot(b.vx, b.vz));
    }
  }

  _checkGoal() {
    const b = this.ball, T = CONFIG.table;
    // 球心過端線就算進球（門檻放太深會讓慢速球卡在門口死區，誰都踢不到）
    if (Math.abs(b.x) < T.goalHalf && Math.abs(b.z) > T.length / 2 + 0.15) {
      const scorer = b.z < 0 ? 'P' : 'A';
      if (scorer === 'P') this.scoreP++; else this.scoreA++;
      this.phase = 'goal';
      this.pauseT = 1.8;
      this.pendingServe = scorer === 'P' ? 'A' : 'P';
      b.vx = 0; b.vz = 0;
      this.emit('goal', scorer);
      return true;
    }
    return false;
  }

  // 死區隱形斜坡：球不會停留在沒有任何桿踢得到的區域（仿真實足球檯的斜坡底板）
  // 桿覆蓋範圍：各桿前方 STRIKE_REACH、後方 STRIKE_BACK → 縫隙在 |z|≈2.65~3.95 與 |z|>12.55
  _slope(dt) {
    const b = this.ball, P = CONFIG.physics, T = CONFIG.table;
    const az = Math.abs(b.z), s = Math.sign(b.z) || 1;
    if (az > 2.62 && az < 3.98) {
      // 中場桿與對方前鋒桿之間的縫 → 往中線滾
      b.vz -= s * P.slopeMid * dt;
    } else if (az > 12.4 || (az > 9.2 && Math.abs(b.x) > 5.8)) {
      // 球門區與側邊角落死區（GK 側向搆不到的貼牆帶）：
      // 往「守門員正前方」的吸引點匯集——方向永遠背離球門線，不會把球帶進門（避免自殺球）
      const entering = Math.abs(b.x) < T.goalHalf && az > 14.2 && b.vz * s > 0;
      if (!entering) {
        const tz = s * 10.3;
        const dx = 0 - b.x, dz = tz - b.z;
        const d = Math.hypot(dx, dz) || 1;
        b.vx += dx / d * P.slopeGoal * dt;
        b.vz += dz / d * P.slopeGoal * dt;
      }
    }
  }

  _checkStuck(dt) {
    const b = this.ball, P = CONFIG.physics;
    const sp = Math.hypot(b.vx, b.vz);
    if (sp < 0.6) this.stuckT += dt; else this.stuckT = 0;
    if (this.stuckT > P.stuckReset) {
      this.serve(null);
      this.emit('reserve');
    } else if (this.stuckT > P.stuckNudge && (this.stuckT % 1) < dt * 1.5) {
      // 每秒推一次，隨機送到其中一隊中場桿前（不推正中央，那裡是死區）
      const mid = this.rods[Math.random() < 0.5 ? 3 : 4]; // P MID / A MID
      const tx = (Math.random() - 0.5) * 6;
      const tz = mid.def.z + mid.facing * 1.1;
      const dx = tx - b.x, dz = tz - b.z;
      const d = Math.hypot(dx, dz) || 1;
      const imp = 3.4;
      b.vx += dx / d * imp + (Math.random() - 0.5) * 1.2;
      b.vz += dz / d * imp + (Math.random() - 0.5) * 1.2;
    }
  }

  _updateAI(dt) {
    const b = this.ball, cfg = this.aiCfg, T = CONFIG.table;
    for (const r of this.rods) {
      if (r.def.side !== 'A') continue;
      r.aiReact -= dt;
      if (r.aiReact <= 0) {
        r.aiReact = cfg.react;
        // 預測球到桿位置時的 x
        let px = b.x;
        const dz = r.def.z - b.z;
        if (Math.abs(b.vz) > 0.5 && dz * b.vz > 0) {
          const t = dz / b.vz;
          if (t < 2.5) {
            px = b.x + b.vx * t;
            const half = T.width / 2 - T.ballR;
            while (Math.abs(px) > half) px = px > 0 ? 2 * half - px : -2 * half - px;
          }
        }
        r.aiTarget = b.x + (px - b.x) * cfg.aim + (Math.random() - 0.5) * (1 - cfg.aim) * 2.5;
      }
      // 挑一個最省移動的人偶去對位
      let bestOff = r.offset, bd = 1e9;
      for (const rel of r.rels) {
        const want = Math.max(-r.halfTravel, Math.min(r.halfTravel, r.aiTarget - rel));
        const d = Math.abs(want - r.offset) + Math.abs((want + rel) - r.aiTarget) * 3;
        if (d < bd) { bd = d; bestOff = want; }
      }
      const dir = Math.sign(bestOff - r.offset);
      const step = Math.min(Math.abs(bestOff - r.offset), cfg.speed * dt);
      r.targetOffset = r.offset + dir * step;
      // 踢擊判斷
      if (this.phase === 'play' && r.cooldown <= 0 && r.kickT < 0) {
        const dzf = (b.z - r.def.z) * r.facing;
        const { dx } = this._nearestFig(r, b.x);
        // 出腳範圍 = 實際觸球範圍（略縮以免空踢）；範圍縮太窄會產生 AI 發呆口袋
        if (dzf > -STRIKE_BACK + 0.05 && dzf < STRIKE_REACH - 0.05 && Math.abs(dx) < 1.7) {
          // 瞄準玩家球門（z=+15）左右角落，依 aim 品質混入誤差
          const distZ = T.length / 2 - b.z;
          const targetX = (Math.random() < 0.5 ? -1 : 1) * (T.goalHalf - 1.2);
          const idealVx = (targetX - b.x) * cfg.kickPow / Math.max(4, distZ);
          const aimVx = idealVx * cfg.aim + dx * 3 * (1 - cfg.aim) + (Math.random() - 0.5) * (1 - cfg.aim) * 8;
          if (this.triggerKick(this.rods.indexOf(r), cfg.kickPow, aimVx)) r.cooldown = cfg.kickCd || 0.6;
        }
      }
    }
  }
}
