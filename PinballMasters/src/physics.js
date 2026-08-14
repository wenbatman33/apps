// ===== 彈珠台物理：斜面重力 + 線段/圓形碰撞 + 動態 Flipper（capsule + 桿面速度） =====
// 座標系：x 左右、z 前後（z 正方向 = 畫面下方/玩家側，重力往 +z 拉）、y 垂直（視覺用）

export const TABLE = {
  W: 6.4, L: 13.2,           // 檯面寬 / 長
  TOP: -6.6, BOTTOM: 6.6,    // z 範圍
  HALF_W: 3.2,
  LANE_X: 2.55,              // 發射軌道內牆 x
  LANE_CENTER: 2.875,        // 發射軌道中心 x
  DRAIN_Z: 5.95,             // 超過此 z（且在檯面區）= 落球
};

export class PinballWorld {
  constructor(tune) {
    this.tune = tune;
    this.balls = [];     // {x,z,y,vx,vz,vy,r}
    this.segments = [];  // {ax,az,bx,bz,e,kind,ref,active,draw}
    this.circles = [];   // {x,z,r,kind,ref,alive,e}
    this.flippers = [];  // {side, px,pz, ang, angVel, pressed}
    this.events = [];
  }

  addBall(b) { b.y = 0; b.vy = 0; this.balls.push(b); return b; }
  // 感應器：不阻擋球，球進入時回報一次 enter 事件（離開後才能再次觸發）
  addSensor(s) {
    s.inside = false; s.active = s.active ?? true;
    (this.sensors ??= []).push(s);
    return s;
  }
  // 吸球洞：球進入後被固定住，由遊戲層決定何時彈出
  addSaucer(s) {
    s.active = s.active ?? true;
    (this.saucers ??= []).push(s);
    return s;
  }

  // 高架軌道（ramp）：球以足夠速度撞入口就會爬上軌道，沿路徑行進到出口。
  // 速度不足會在半途倒退滑回入口——跟真實彈珠台一樣。
  // r: { id, entry:{x,z}, entryR, minSpeed, samples:[{x,y,z}], length, exitSpeed, climbDrag }
  addRamp(r) {
    r.active = r.active ?? true;
    (this.ramps ??= []).push(r);
    return r;
  }

  _checkRampEntry(b) {
    if (!this.ramps || b.onRamp || b.held) return false;
    const speed = Math.hypot(b.vx, b.vz);
    for (const r of this.ramps) {
      if (!r.active || r.cool > 0) continue;
      const dx = b.x - r.entry.x, dz = b.z - r.entry.z;
      if (dx * dx + dz * dz > r.entryR * r.entryR) continue;
      // 必須夠快，且行進方向大致朝軌道爬升方向
      if (speed < r.minSpeed) continue;
      const dot = (b.vx * r.entryDir.x + b.vz * r.entryDir.z) / (speed || 1);
      if (dot < 0.35) continue;
      b.onRamp = { ramp: r, dist: 0, speed };
      this.events.push({ type: 'rampEnter', ref: r, speed });
      return true;
    }
    return false;
  }

  _stepRamp(b, h) {
    const P = this.tune.physics;
    const st = b.onRamp;
    const r = st.ramp;
    // 沿軌道的重力分量：爬升時減速、倒退時加速
    st.speed -= P.gravity * r.climbDrag * h;
    st.dist += st.speed * h;

    if (st.dist <= 0) {
      // 沒力氣爬完 → 滑回入口，回到一般物理
      b.onRamp = null;
      r.cool = 0.35;
      b.x = r.entry.x; b.z = r.entry.z; b.y = 0;
      b.vx = -r.entryDir.x * 3; b.vz = -r.entryDir.z * 3;
      this.events.push({ type: 'rampFail', ref: r });
      return;
    }
    if (st.dist >= r.length) {
      // 到達出口，帶著出口方向的速度回到檯面
      b.onRamp = null;
      r.cool = 0.35;
      const p = r.samples[r.samples.length - 1];
      b.x = p.x; b.z = p.z; b.y = 0;
      const sp = Math.max(r.exitSpeed, Math.abs(st.speed));
      b.vx = r.exitDir.x * sp; b.vz = r.exitDir.z * sp;
      this.events.push({ type: 'rampExit', ref: r, speed: sp });
      return;
    }
    // 取樣路徑位置（含高度，視覺上球會爬升）
    const t = st.dist / r.length;
    const fi = t * (r.samples.length - 1);
    const i = Math.min(r.samples.length - 2, Math.floor(fi));
    const f = fi - i;
    const a = r.samples[i], c = r.samples[i + 1];
    b.x = a.x + (c.x - a.x) * f;
    b.y = a.y + (c.y - a.y) * f;
    b.z = a.z + (c.z - a.z) * f;
    b.vx = 0; b.vz = 0; b.vy = 0;
  }
  addSegment(ax, az, bx, bz, opts = {}) {
    const s = { ax, az, bx, bz, e: opts.e ?? null, kind: opts.kind ?? 'wall',
      ref: opts.ref ?? null, active: opts.active ?? true, draw: opts.draw ?? true };
    this.segments.push(s); return s;
  }
  addCircle(c) { c.alive = true; this.circles.push(c); return c; }
  addFlipper(side) {
    const f = { side, ang: 0, angVel: 0, pressed: false };
    this.flippers.push(f); return f;
  }

  // Flipper 幾何（隨 TUNE 即時變化）
  flipperPose(f) {
    const F = this.tune.flipper;
    const px = F.pivotX * (f.side === 'L' ? -1 : 1);
    const pz = F.pivotZ;
    return { px, pz, len: F.len, r: F.r };
  }
  flipperAngles(f) {
    const F = this.tune.flipper;
    const rest = F.restDeg * Math.PI / 180, up = -F.upDeg * Math.PI / 180;
    // 左：rest=+32° → 壓下時轉到 -26°；右鏡像
    if (f.side === 'L') return { rest, target: f.pressed ? up : rest };
    return { rest: Math.PI - rest, target: f.pressed ? Math.PI - up : Math.PI - rest };
  }

  step(dt) {
    this.events.length = 0;
    this.time = (this.time ?? 0) + dt;   // 供碰撞事件冷卻用
    // 吸球洞冷卻：球射出後短時間內不再吸球，否則會在洞內被反覆吸住
    if (this.saucers) for (const s of this.saucers) if (s.cool > 0) s.cool -= dt;
    if (this.ramps) for (const r of this.ramps) if (r.cool > 0) r.cool -= dt;
    const n = Math.max(1, this.tune.physics.substeps | 0);
    const h = dt / n;
    for (let i = 0; i < n; i++) this._substep(h);
    return this.events;
  }

  _substep(h) {
    const P = this.tune.physics;
    const F = this.tune.flipper;

    // ---- Flipper 角度動畫（速度式，記錄角速度供碰撞用） ----
    for (const f of this.flippers) {
      const { target } = this.flipperAngles(f);
      const spd = F.speed * Math.PI / 180; // deg/s → rad/s
      const d = target - f.ang;
      const maxStep = spd * h;
      const stepA = Math.abs(d) <= maxStep ? d : Math.sign(d) * maxStep;
      f.angVel = stepA / h;
      f.ang += stepA;
      if (Math.abs(d) <= maxStep) f.angVel = Math.abs(d) > 1e-4 ? f.angVel : 0;
    }

    for (const b of this.balls) {
      // 被吸球洞固定住的球不參與物理
      if (b.held) continue;
      // 在高架軌道上：走軌道邏輯，跳過檯面碰撞
      if (b.onRamp) { this._stepRamp(b, h); continue; }
      // 記錄移動前位置，供 flipper 掃掠碰撞（CCD）使用
      b.px = b.x; b.pz = b.z;
      // 重力（斜面）＋積分
      b.vz += P.gravity * h;
      // 極速限制
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > P.maxSpeed) { const k = P.maxSpeed / sp; b.vx *= k; b.vz *= k; }
      b.x += b.vx * h; b.z += b.vz * h;
      // 微小滾動阻尼
      const damp = Math.pow(P.rollDamp, h);
      b.vx *= damp; b.vz *= damp;
      // 視覺垂直彈跳
      if (b.y > 0 || b.vy !== 0) {
        b.y += b.vy * h; b.vy -= 30 * h;
        if (b.y <= 0) { b.y = 0; b.vy = 0; }
      }

      this._collideSegments(b);
      this._collideCircles(b);
      this._collideFlippers(b, h);
      this._checkSensors(b);
      if (this._checkRampEntry(b)) continue;
      this._checkSaucers(b);
    }
  }

  _checkSensors(b) {
    if (!this.sensors) return;
    for (const s of this.sensors) {
      if (!s.active) continue;
      const d2 = (b.x - s.x) ** 2 + (b.z - s.z) ** 2;
      const inside = d2 < s.r * s.r;
      if (inside && !s.inside) {
        s.inside = true;
        // 冷卻：球在感應器邊緣抖動時不重複觸發
        if (this.time - (s.lastHit ?? -99) >= 0.2) {
          s.lastHit = this.time;
          this.events.push({
            type: 'sensor', kind: s.kind, ref: s, x: s.x, z: s.z,
            speed: Math.hypot(b.vx, b.vz), dirX: b.vx, dirZ: b.vz,
          });
        }
      } else if (!inside && s.inside) {
        s.inside = false;
      }
    }
  }

  _checkSaucers(b) {
    if (!this.saucers || b.held) return;
    for (const s of this.saucers) {
      if (!s.active || s.cool > 0) continue;
      const d2 = (b.x - s.x) ** 2 + (b.z - s.z) ** 2;
      if (d2 < s.r * s.r) {
        b.held = s;
        b.x = s.x; b.z = s.z;
        b.vx = 0; b.vz = 0; b.vy = 0;
        this.events.push({ type: 'saucer', ref: s, x: s.x, z: s.z });
        break;
      }
    }
  }

  // 由遊戲層呼叫：把被吸住的球以指定角度/速度射出
  ejectBall(b, angleRad, speed) {
    if (!b.held) return;
    b.held.cool = 0.7;
    b.held = null;
    b.vx = Math.cos(angleRad) * speed;
    b.vz = Math.sin(angleRad) * speed;
  }

  _collideSegments(b) {
    const P = this.tune.physics;
    for (const s of this.segments) {
      if (!s.active) continue;
      const dxs = s.bx - s.ax, dzs = s.bz - s.az;
      const len2 = dxs * dxs + dzs * dzs;
      let t = len2 ? ((b.x - s.ax) * dxs + (b.z - s.az) * dzs) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const cx = s.ax + dxs * t, cz = s.az + dzs * t;
      const dx = b.x - cx, dz = b.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= b.r * b.r || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d, nz = dz / d;
      b.x = cx + nx * b.r; b.z = cz + nz * b.r;
      const vn = b.vx * nx + b.vz * nz;
      if (vn < 0) {
        const e = s.e ?? P.wallRestitution;
        b.vx -= (1 + e) * vn * nx;
        b.vz -= (1 + e) * vn * nz;
        const segGap = this.time - (s.lastHit ?? -99) >= 0.14;
        if (s.kind === 'sling' && -vn > 1.2) {
          // Slingshot 主動彈射
          const kick = this.tune.physics.slingKick;
          const cur = b.vx * nx + b.vz * nz;
          if (cur < kick) { b.vx += (kick - cur) * nx; b.vz += (kick - cur) * nz; }
          b.vy = Math.max(b.vy, 1.5);
          if (segGap) { s.lastHit = this.time; this.events.push({ type: 'sling', ref: s.ref, impact: -vn, x: cx, z: cz }); }
        } else if (-vn > 1.4 && segGap) {
          s.lastHit = this.time;
          this.events.push({ type: 'wall', kind: s.kind, ref: s.ref, impact: -vn, x: cx, z: cz });
        }
      }
    }
  }

  _collideCircles(b) {
    const P = this.tune.physics;
    for (const c of this.circles) {
      if (!c.alive) continue;
      const dx = b.x - c.x, dz = b.z - c.z;
      const rr = b.r + c.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d, nz = dz / d;
      b.x = c.x + nx * rr; b.z = c.z + nz * rr;
      const vn = b.vx * nx + b.vz * nz;
      if (vn < 0) {
        const speed = Math.hypot(b.vx, b.vz);
        const e = c.e ?? P.wallRestitution;
        b.vx -= (1 + e) * vn * nx;
        b.vz -= (1 + e) * vn * nz;
        if (c.kind === 'bumper') {
          // Pop bumper：往外強彈
          const cur = Math.hypot(b.vx, b.vz);
          const target = Math.max(cur, P.bumperBoost);
          const k = target / (cur || 1);
          b.vx *= k; b.vz *= k;
          b.vy = Math.max(b.vy, 2.2);
        }
        // 計分事件需要冷卻與最小衝擊，否則球貼著物件低速滾動時
        // 每個物理步都會觸發一次，造成 combo 與分數暴衝
        const gap = c.hitGap ?? 0.14;
        if (-vn >= (c.minImpact ?? 0.8) && this.time - (c.lastHit ?? -99) >= gap) {
          c.lastHit = this.time;
          this.events.push({ type: 'circle', kind: c.kind, ref: c.ref, impact: -vn, speed, x: c.x, z: c.z });
        }
      }
    }
  }

  // Flipper 碰撞：對高速球做掃掠檢查（把這一步的位移拆成數段插值），
  // 否則球在單步內可能直接穿過彈射板
  _collideFlippers(b, h) {
    const P = this.tune.physics;
    const speed = Math.hypot(b.vx, b.vz);
    const near = this._nearAnyFlipper(b);
    const steps = near ? (speed > P.ccdSpeed ? 6 : 4) : (speed > P.ccdSpeed ? 3 : 1);
    const px0 = b.px ?? b.x, pz0 = b.pz ?? b.z;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const sx = px0 + (b.x - px0) * t;
      const sz = pz0 + (b.z - pz0) * t;
      if (this._flipperContact(b, sx, sz)) return; // 命中就結束，避免同幀重複彈
    }
  }

  _nearAnyFlipper(b) {
    const F = this.tune.flipper;
    const reach = F.len + F.r + b.r + 0.12;
    for (const f of this.flippers) {
      const { px, pz } = this.flipperPose(f);
      if ((b.x - px) ** 2 + (b.z - pz) ** 2 < reach * reach) return true;
    }
    return false;
  }

  // 以指定位置 (sx,sz) 檢查與 flipper 的接觸；命中回傳 true
  _flipperContact(b, sx, sz) {
    const F = this.tune.flipper;
    for (const f of this.flippers) {
      const { px, pz, len, r } = this.flipperPose(f);
      const ca = Math.cos(f.ang), sa = Math.sin(f.ang);
      const tx = px + ca * len, tz = pz + sa * len;
      const dxs = tx - px, dzs = tz - pz;
      const len2 = dxs * dxs + dzs * dzs;
      let t = len2 ? ((sx - px) * dxs + (sz - pz) * dzs) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const cx = px + dxs * t, cz = pz + dzs * t;
      // 楔形：根部粗、尖端細（真實 flipper 的形狀，打尖端彈得更斜）
      const rAt = r * (1 - 0.32 * t);
      const dx = sx - cx, dz = sz - cz;
      const rr = b.r + rAt;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d, nz = dz / d;
      b.x = cx + nx * rr; b.z = cz + nz * rr;
      // 桿面速度：Q = P + s(cos,sin) → dQ/dt = s·ω·(-sin, cos)
      const s = t * len;
      const ux = s * f.angVel * -sa, uz = s * f.angVel * ca;
      const rvx = b.vx - ux, rvz = b.vz - uz;
      const vn = rvx * nx + rvz * nz;
      if (vn < 0) {
        const e = F.restitution;
        b.vx = rvx - (1 + e) * vn * nx + ux;
        b.vz = rvz - (1 + e) * vn * nz + uz;
        b.vy = Math.max(b.vy, Math.min(2.5, Math.abs(f.angVel) * 0.05));
        if (-vn > 1.2 || Math.abs(f.angVel) > 1)
          this.events.push({ type: 'flipper', impact: -vn, x: cx, z: cz });
        return true;
      }
    }
    return false;
  }
}
