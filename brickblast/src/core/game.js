// 回合制核心邏輯：瞄準 → 連射 → 回收 → 磚塊下移，與渲染完全解耦
import { GRID, LAYOUT, RULES, WORLD } from '../config.js';
import { circleVsRect, circleVsTriangle, triangleVerts, reflect, scatter, deJam, substepCount } from './physics.js';
import { makeLevel, buildInitialGrid, buildRow, hpForTurn, waveHpTarget, mulberry32, isPowerup, T } from './level.js';

export const PHASE = { AIM: 'aim', FIRING: 'firing', SHIFT: 'shift', WIN: 'win', LOSE: 'lose' };

export function cellX(c) { return LAYOUT.playLeft + c * GRID.CELL; }
export function cellY(r) { return LAYOUT.playTop + r * GRID.CELL; }
// 磚塊實體比格子小一圈，磚與磚之間留出真正的縫隙讓球能鑽進去彈跳
export function brickX(c) { return cellX(c) + GRID.INSET; }
export function brickY(r) { return cellY(r) + GRID.INSET; }
export function brickSize() { return GRID.CELL - GRID.INSET * 2; }
export function wallLeft() { return LAYOUT.playLeft; }
export function wallRight() { return LAYOUT.playLeft + GRID.COLS * GRID.CELL; }
export function wallTop() { return LAYOUT.playTop; }

export class Game {
  constructor(level, events = {}) {
    this.ev = events;
    this.load(level);
  }

  load(level) {
    const def = makeLevel(level);
    this.def = def;
    this.grid = buildInitialGrid(def);
    this.rng = mulberry32(def.seed ^ 0xC0FFEE);
    this.turn = 0;
    this.phase = PHASE.AIM;
    this.ballsTotal = def.startBalls;
    this.launchX = WORLD.W / 2;
    this.nextLaunchX = null;
    this.balls = [];
    this.pendingFire = 0;
    this.fireTimer = 0;
    this.fireDir = { x: 0, y: -1 };
    this.turnTime = 0;
    this.speedScale = 1;
    this.recalling = false;
    this.multiBonus = 0;      // ×3 道具本回合追加的球數，回合結束歸還
    this.stats = { shots: 0, hits: 0, broken: 0, picked: 0, ballsFired: 0 };
    this.aimDir = null;
    this.resultStars = 0;
  }

  get aliveBalls() { return this.balls.length; }
  get ballsLeftToFire() { return this.pendingFire; }

  // ---- 盤面查詢 ----
  cellAt(r, c) {
    if (r < 0 || r >= GRID.ROWS || c < 0 || c >= GRID.COLS) return null;
    return this.grid[r][c];
  }

  countBreakable() {
    let n = 0;
    const seen = new Set();
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const cell = this.grid[r][c];
        if (!cell || isPowerup(cell.t)) continue;
        if (seen.has(cell)) continue;
        seen.add(cell);
        n++;
      }
    }
    return n;
  }

  // ---- 發射 ----
  aim(dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    let ny = dy / len, nx = dx / len;
    if (ny > -0.12) { // 不允許往下或水平射
      ny = -0.12;
      const s = Math.sign(nx) || 1;
      nx = s * Math.sqrt(Math.max(0.0001, 1 - ny * ny));
    }
    this.aimDir = { x: nx, y: ny };
    return this.aimDir;
  }

  fire() {
    if (this.phase !== PHASE.AIM || !this.aimDir) return false;
    this.phase = PHASE.FIRING;
    this.fireDir = { ...this.aimDir };
    this.pendingFire = this.ballsTotal;
    this.fireTimer = 0;
    this.turnTime = 0;
    this.speedScale = 1;
    this.recalling = false;
    this.multiBonus = 0;
    this.nextLaunchX = null;
    this.stats.shots++;
    this.ev.onFire?.(this.fireDir);
    return true;
  }

  // offsetTime：這顆球「早該出發」的時間，用來補上位置，
  // 否則同一幀生成的多顆球會完全重疊，球流看起來斷斷續續
  spawnBall(offsetTime = 0) {
    const sp = RULES.ballSpeed;
    const r = RULES.ballRadius;
    const L = wallLeft() + r, R = wallRight() - r;
    let x = this.launchX + this.fireDir.x * sp * offsetTime;
    let y = LAYOUT.launchY + this.fireDir.y * sp * offsetTime;
    x = clamp(x, L, R);
    this.balls.push({
      x, y,
      vx: this.fireDir.x * sp,
      vy: this.fireDir.y * sp,
      px: x, py: y, fx: x, fy: y,
    });
    this.pendingFire--;
    this.stats.ballsFired++;
  }

  // 一鍵收球：停止未發射的球，場上的球直接吸回發射點，立刻結束回合
  recall() {
    if (this.phase !== PHASE.FIRING || this.recalling) return false;
    this.recalling = true;
    this.pendingFire = 0;
    if (this.nextLaunchX === null) this.nextLaunchX = this.launchX;
    this.ev.onRecall?.(this.balls.length);
    return true;
  }

  // ---- 每幀更新 ----
  update(dt) {
    if (this.phase === PHASE.FIRING) {
      this.turnTime += dt;
      if (this.turnTime > RULES.turboAfter) {
        this.speedScale = Math.min(RULES.turboScale, 1 + (this.turnTime - RULES.turboAfter) * 0.8);
      }
      // 連射節奏：球越多射速越快，維持「一整條球流」的視覺
      if (this.pendingFire > 0) {
        this.fireTimer += dt;
        const iv = Math.max(RULES.fireIntervalMin, Math.min(RULES.fireInterval, RULES.fireBurst / this.ballsTotal)) / this.speedScale;
        while (this.pendingFire > 0 && this.fireTimer >= iv) {
          this.fireTimer -= iv;
          this.spawnBall(this.fireTimer);
        }
      }
      // 記錄本幀起點，供渲染拖尾使用
      for (const b of this.balls) { b.fx = b.x; b.fy = b.y; }
      // 超時保底：逐步把球導向下方，確保回合一定收得回來（速度大小不變）
      if (this.turnTime > RULES.forceRecallAfter && this.balls.length) {
        const k = Math.min(1, (this.turnTime - RULES.forceRecallAfter) * 0.22) * dt * 5;
        for (const b of this.balls) {
          const sp = Math.hypot(b.vx, b.vy) || RULES.ballSpeed;
          b.vx += (0 - b.vx) * k;
          b.vy += (sp - b.vy) * k;
          const n = Math.hypot(b.vx, b.vy) || 1;
          b.vx = b.vx / n * sp;
          b.vy = b.vy / n * sp;
        }
      }

      this.stepBalls(dt * this.speedScale);

      if (this.pendingFire === 0 && this.balls.length === 0) this.endTurn();
    }
  }

  stepBalls(dt) {
    if (this.recalling) { this.stepRecall(dt); return; }
    const sp = RULES.ballSpeed;
    const steps = substepCount(sp * this.speedScale, dt, RULES.ballRadius, RULES.substepMax);
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      for (let i = this.balls.length - 1; i >= 0; i--) {
        const b = this.balls[i];
        b.px = b.x; b.py = b.y;
        b.x += b.vx * h;
        b.y += b.vy * h;
        this.collideWalls(b);
        this.collideBricks(b);
        if (b.y >= LAYOUT.launchY) {
          if (this.nextLaunchX === null) this.nextLaunchX = clamp(b.x, wallLeft() + RULES.ballRadius, wallRight() - RULES.ballRadius);
          this.ev.onLand?.(b, this.nextLaunchX);
          this.balls.splice(i, 1);
        }
      }
    }
  }

  // 收球動畫：所有球以固定速度直線飛向落點，抵達即回收
  stepRecall(dt) {
    const tx = this.nextLaunchX, ty = LAYOUT.launchY;
    const sp = RULES.recallSpeed;
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.px = b.x; b.py = b.y;
      const dx = tx - b.x, dy = ty - b.y;
      const d = Math.hypot(dx, dy);
      const step = sp * dt;
      if (d <= step + 1) { this.ev.onLand?.(b, tx); this.balls.splice(i, 1); continue; }
      b.x += (dx / d) * step;
      b.y += (dy / d) * step;
      b.vx = (dx / d) * sp;
      b.vy = (dy / d) * sp;
    }
  }

  collideWalls(b) {
    const r = RULES.ballRadius;
    const L = wallLeft() + r, R = wallRight() - r, TOPY = wallTop() + r;
    if (b.x < L) { b.x = L; b.vx = Math.abs(b.vx); this.ev.onWall?.(b, 'l'); }
    else if (b.x > R) { b.x = R; b.vx = -Math.abs(b.vx); this.ev.onWall?.(b, 'r'); }
    if (b.y < TOPY) { b.y = TOPY; b.vy = Math.abs(b.vy); this.ev.onWall?.(b, 't'); }
  }

  collideBricks(b) {
    const r = RULES.ballRadius;
    const cSize = GRID.CELL;
    const c0 = Math.floor((b.x - r - LAYOUT.playLeft) / cSize) - 1;
    const c1 = Math.floor((b.x + r - LAYOUT.playLeft) / cSize) + 1;
    const r0 = Math.floor((b.y - r - LAYOUT.playTop) / cSize) - 1;
    const r1 = Math.floor((b.y + r - LAYOUT.playTop) / cSize) + 1;

    let best = null, bestR = -1, bestC = -1;
    for (let rr = r0; rr <= r1; rr++) {
      for (let cc = c0; cc <= c1; cc++) {
        const cell = this.cellAt(rr, cc);
        if (!cell) continue;
        const bs = brickSize();
        const hit = cell.t === T.TRI
          ? circleVsTriangle(b.x, b.y, r, triangleVerts(brickX(cc), brickY(rr), bs, cell.corner))
          : circleVsRect(b.x, b.y, r, brickX(cc), brickY(rr), bs, bs);
        if (!hit) continue;
        if (isPowerup(cell.t)) { // 道具不反彈，碰到即觸發
          this.collectPowerup(rr, cc, cell);
          continue;
        }
        if (!best || hit.depth > best.depth) { best = hit; bestR = rr; bestC = cc; }
      }
    }
    if (!best) return;

    // 推出穿透並反射
    b.x += best.nx * best.depth;
    b.y += best.ny * best.depth;
    const rv0 = reflect(b.vx, b.vy, best.nx, best.ny);
    const rv = scatter(rv0.vx, rv0.vy, RULES.scatter);
    const dj = deJam(rv.vx, rv.vy, RULES.ballSpeed);
    b.vx = dj.vx; b.vy = dj.vy;

    this.stats.hits++;
    this.damage(bestR, bestC, 1, 'ball', b);
  }

  // ---- 道具 ----
  collectPowerup(r, c, cell) {
    this.grid[r][c] = null;
    this.stats.picked++;
    if (cell.t === T.PLUS) {
      this.ballsTotal = Math.min(RULES.maxBalls, this.ballsTotal + RULES.ballGrowth);
      this.ev.onPlus?.(r, c, this.ballsTotal);
      return;
    }
    if (cell.t === T.MULTI) {
      // 本回合球數 ×3，額外的球在回合結束時歸還（不會跨回合滾雪球）
      const before = this.ballsTotal;
      const add = Math.min(RULES.maxBalls - before, before * 2);
      this.ballsTotal = before + add;
      this.pendingFire += add;
      this.multiBonus += add;
      this.ev.onMulti?.(r, c, this.ballsTotal);
      return;
    }
    if (cell.t === T.LASER) {
      // 清除整行與整列（道具本身不受影響，已先移除）
      const power = hpForTurn(this.def.level, this.turn) * 4;
      this.ev.onLaser?.(r, c);
      for (let cc = 0; cc < GRID.COLS; cc++) if (cc !== c) this.damage(r, cc, power, 'laser');
      for (let rr = 0; rr < GRID.ROWS; rr++) if (rr !== r) this.damage(rr, c, power, 'laser');
    }
  }

  // ---- 傷害與連鎖 ----
  damage(r, c, dmg, cause, ball) {
    const queue = [[r, c, dmg, cause]];
    while (queue.length) {
      const [rr, cc, dd, cz] = queue.shift();
      const cell = this.cellAt(rr, cc);
      if (!cell) continue;
      if (isPowerup(cell.t)) continue;

      cell.hp -= dd;
      this.ev.onHit?.(rr, cc, cell, cz, ball);

      if (cell.hp > 0) continue;

      // 破壞
      this.grid[rr][cc] = null;
      this.stats.broken++;
      this.ev.onBreak?.(rr, cc, cell);
    }
  }

  // ---- 回合結算 ----
  endTurn() {
    // 收回 ×3 道具的臨時球數
    if (this.multiBonus > 0) {
      this.ballsTotal = Math.max(1, this.ballsTotal - this.multiBonus);
      this.multiBonus = 0;
    }
    this.turn++;
    if (this.nextLaunchX !== null) this.launchX = this.nextLaunchX;

    if (this.checkWin()) return;

    // 磚塊下移一行
    const lastRow = this.grid[GRID.ROWS - 1];
    if (lastRow.some(Boolean)) { this.lose(); return; }

    for (let r = GRID.ROWS - 1; r > 0; r--) this.grid[r] = this.grid[r - 1];
    this.grid[0] = new Array(GRID.COLS).fill(null);

    // 補生新行（波次未用盡時）
    if (this.turn < this.def.waves) {
      this.grid[0] = buildRow(this.def, this.turn, this.rng, { row: 0, rows: 1, hpTarget: waveHpTarget(this.def.level, this.turn) });
    }

    // 補生後若已頂到底線也算失敗
    if (this.grid[GRID.ROWS - 1].some(Boolean)) { this.lose(); return; }

    this.phase = PHASE.AIM;
    this.ev.onTurn?.(this.turn);
    if (this.checkWin()) return;
  }

  checkWin() {
    const remaining = this.countBreakable();
    const noMoreWaves = this.turn >= this.def.waves;
    if (remaining === 0 && noMoreWaves) { this.win(); return true; }
    return false;
  }

  win() {
    if (this.phase === PHASE.WIN) return;
    this.phase = PHASE.WIN;
    this.resultStars = this.starsFor();
    this.score = this.computeScore(true);
    this.ev.onWin?.(this.resultStars, this.stats, this.score);
  }

  lose() {
    if (this.phase === PHASE.LOSE) return;
    this.phase = PHASE.LOSE;
    this.score = this.computeScore(false);
    this.ev.onLose?.(this.stats, this.score);
  }

  // 分數：破壞與命中為底，關卡越高倍率越大，過關另計效率獎勵
  computeScore(cleared) {
    const lv = this.def.level;
    const base = this.stats.broken * 20 + this.stats.hits * 2 + this.stats.picked * 60;
    let score = Math.round(base * (1 + lv * 0.05));
    if (cleared) {
      const par = this.def.waves + 4;
      score += 1000 + Math.max(0, par - this.turn) * 250;
    }
    return score;
  }

  // 星等：回合數越少越高
  starsFor() {
    const par = this.def.waves + 4;
    if (this.turn <= par) return 3;
    if (this.turn <= par + 4) return 2;
    return 1;
  }
}

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
