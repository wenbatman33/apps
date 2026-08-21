// 測試用 AI：以唯讀彈道模擬評估候選角度，挑命中效益最高的方向
import { LAYOUT, RULES, GRID } from '../src/config.js';
import { circleVsRect, circleVsTriangle, triangleVerts, reflect, deJam } from '../src/core/physics.js';
import { T, isPowerup } from '../src/core/level.js';

const SPEED = () => RULES.ballSpeed;

// 模擬 n 顆球沿同一角度發射，回傳評分（命中 / 破壞 / 拾取道具）
export function evalAngle(game, angle, opts = {}) {
  const nBalls = opts.balls ?? 3;
  const maxTime = opts.maxTime ?? 2.6;
  const dt = opts.dt ?? 1 / 120;
  const r = RULES.ballRadius;
  const L = LAYOUT.playLeft + r;
  const R = LAYOUT.playLeft + GRID.COLS * GRID.CELL - r;
  const TOPY = LAYOUT.playTop + r;

  // 影子血量表：模擬破壞但不動到真實盤面
  const hp = new Map();
  const gone = new Set();
  const cellOf = (rr, cc) => {
    if (rr < 0 || rr >= GRID.ROWS || cc < 0 || cc >= GRID.COLS) return null;
    const c = game.grid[rr][cc];
    if (!c || gone.has(c)) return null;
    return c;
  };

  let hits = 0, breaks = 0, plus = 0, lowestBreakRow = -1;

  for (let n = 0; n < nBalls; n++) {
    let x = game.launchX, y = LAYOUT.launchY;
    let vx = Math.cos(angle) * SPEED(), vy = Math.sin(angle) * SPEED();
    let t = 0;
    while (t < maxTime) {
      t += dt;
      const steps = 3;
      const h = dt / steps;
      for (let s = 0; s < steps; s++) {
        x += vx * h; y += vy * h;
        if (x < L) { x = L; vx = Math.abs(vx); }
        else if (x > R) { x = R; vx = -Math.abs(vx); }
        if (y < TOPY) { y = TOPY; vy = Math.abs(vy); }

        const c0 = Math.floor((x - r - LAYOUT.playLeft) / GRID.CELL);
        const c1 = Math.floor((x + r - LAYOUT.playLeft) / GRID.CELL);
        const r0 = Math.floor((y - r - LAYOUT.playTop) / GRID.CELL);
        const r1 = Math.floor((y + r - LAYOUT.playTop) / GRID.CELL);
        let best = null, bR = -1, bC = -1, bCell = null;
        for (let rr = r0; rr <= r1; rr++) {
          for (let cc = c0; cc <= c1; cc++) {
            const cell = cellOf(rr, cc);
            if (!cell) continue;
            const bx0 = LAYOUT.playLeft + cc * GRID.CELL, by0 = LAYOUT.playTop + rr * GRID.CELL;
            const hit = cell.t === T.TRI
              ? circleVsTriangle(x, y, r, triangleVerts(bx0, by0, GRID.CELL, cell.corner))
              : circleVsRect(x, y, r, bx0, by0, GRID.CELL, GRID.CELL);
            if (!hit) continue;
            if (isPowerup(cell.t)) { gone.add(cell); plus++; continue; }
            if (!best || hit.depth > best.depth) { best = hit; bR = rr; bC = cc; bCell = cell; }
          }
        }
        if (best) {
          x += best.nx * best.depth; y += best.ny * best.depth;
          const rv = reflect(vx, vy, best.nx, best.ny);
          const dj = deJam(rv.vx, rv.vy, SPEED());
          vx = dj.vx; vy = dj.vy;
          hits++;
          const cur = (hp.has(bCell) ? hp.get(bCell) : bCell.hp) - 1;
          hp.set(bCell, cur);
          if (cur <= 0) {
            gone.add(bCell);
            breaks++;
            if (bR > lowestBreakRow) lowestBreakRow = bR;
          }
        }
        if (y >= LAYOUT.launchY) { t = maxTime; break; }
      }
    }
  }

  // 優先破壞、其次命中；打掉靠下方的磚特別有價值（延緩觸底）
  return hits + breaks * 6 + plus * 12 + (lowestBreakRow + 1) * 2;
}

// 掃描候選角度，回傳最佳方向
export function bestAngle(game, opts = {}) {
  const n = opts.samples ?? 40;
  let best = -Infinity, bestA = -Math.PI / 2;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI + 0.12 + (i / (n - 1)) * (Math.PI - 0.24);
    const score = evalAngle(game, a, opts);
    if (score > best) { best = score; bestA = a; }
  }
  return { angle: bestA, score: best };
}
