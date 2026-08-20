import { TUNING } from '../config.js';

const PATH_STEP = 3.5; // 頭部軌跡取樣間距（px）

// 一條蛇：頭部持續前進並記錄軌跡，身體節點沿軌跡等距取樣（slither 的經典做法）
export class Snake {
  constructor(opts) {
    this.id = opts.id;
    this.name = opts.name;
    this.isPlayer = !!opts.isPlayer;
    this.isBot = !!opts.isBot;
    this.skin = opts.skin;
    this.x = opts.x; this.y = opts.y;
    this.angle = opts.angle ?? Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.mass = opts.mass ?? TUNING.startMass;
    this.boosting = false;
    this.dead = false;
    this.speed = TUNING.baseSpeed;
    this._boostAcc = 0;      // 加速消耗累計
    this._stepAcc = 0;       // 軌跡取樣累計
    this._trimCounter = 0;
    this.kills = 0;
    // 軌跡：扁平陣列 [x0,y0,...]，最新的頭部在陣列尾端
    this.path = [];
    this.wobble = Math.random() * 100; // 身體擺動相位（純視覺）
    for (let i = 60; i >= 0; i--) {
      this.path.push(this.x - Math.cos(this.angle) * i * PATH_STEP, this.y - Math.sin(this.angle) * i * PATH_STEP);
    }
  }

  get radius() {
    const r = TUNING.baseRadius + Math.sqrt(this.mass) * TUNING.radiusGrowth * 3.2;
    return Math.min(r, TUNING.maxRadius);
  }
  get segSpacing() { return this.radius * TUNING.segSpacingRatio; }
  get segCount() { return Math.max(8, Math.floor(this.mass / TUNING.massPerSegment) + 8); }
  // 軌跡還沒長夠時，只畫／只判定實際存在的節數，避免尾巴堆成一團
  get activeSegCount() {
    const avail = Math.floor(((this.path.length / 2) - 1) * PATH_STEP / this.segSpacing) + 1;
    return Math.max(4, Math.min(this.segCount, avail));
  }
  get score() { return Math.floor(this.mass * 10); }

  canBoost() { return this.mass > TUNING.boostMinMass; }

  // 依 targetAngle 轉向 + 前進，並更新軌跡
  update(dt, onDropFood) {
    // 轉向：蛇越粗轉得越慢
    const fat = Math.min(1, (this.radius - TUNING.baseRadius) / (TUNING.maxRadius - TUNING.baseRadius));
    const maxTurn = TUNING.turnRate * (1 - fat * TUNING.turnRateFatPenalty) * dt;
    let diff = this.targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));

    // 加速：吃 mass 並在尾部掉食物
    const boosting = this.boosting && this.canBoost();
    this.speed += ((boosting ? TUNING.boostSpeed : TUNING.baseSpeed) - this.speed) * Math.min(1, dt * 10);
    if (boosting) {
      this._boostAcc += TUNING.boostDrainPerSec * dt;
      while (this._boostAcc >= 1 && this.mass > TUNING.boostMinMass) {
        this._boostAcc -= 1; this.mass -= 1;
        const t = this.tailPos();
        onDropFood?.(t.x + (Math.random() - 0.5) * 8, t.y + (Math.random() - 0.5) * 8, 0.8);
      }
    } else this._boostAcc = 0;

    const dist = this.speed * dt;
    this.x += Math.cos(this.angle) * dist;
    this.y += Math.sin(this.angle) * dist;
    this.wobble += dt * (boosting ? 14 : 8);

    // 軌跡取樣：每前進 PATH_STEP 就記一點（一幀可能記多點）
    this._stepAcc += dist;
    const px = this.path[this.path.length - 2], py = this.path[this.path.length - 1];
    let d = Math.hypot(this.x - px, this.y - py);
    while (d >= PATH_STEP) {
      const lx = this.path[this.path.length - 2], ly = this.path[this.path.length - 1];
      const dd = Math.hypot(this.x - lx, this.y - ly);
      if (dd < PATH_STEP) break;
      this.path.push(lx + (this.x - lx) / dd * PATH_STEP, ly + (this.y - ly) / dd * PATH_STEP);
      d = Math.hypot(this.x - this.path[this.path.length - 2], this.y - this.path[this.path.length - 1]);
    }

    // 定期裁掉用不到的舊軌跡（攤平成本，不要每幀 splice）
    if (++this._trimCounter > 30) {
      this._trimCounter = 0;
      const need = Math.ceil(this.segCount * this.segSpacing / PATH_STEP) + 8;
      const have = this.path.length / 2;
      if (have > need + 60) this.path.splice(0, (have - need) * 2);
    }
  }

  // 取第 i 節身體的座標（0 = 緊接頭部）
  segPos(i, out) {
    const back = Math.round(i * this.segSpacing / PATH_STEP);
    let idx = this.path.length / 2 - 1 - back;
    if (idx < 0) idx = 0;
    out.x = this.path[idx * 2];
    out.y = this.path[idx * 2 + 1];
    return out;
  }
  tailPos() { return this.segPos(this.activeSegCount - 1, { x: 0, y: 0 }); }
}
