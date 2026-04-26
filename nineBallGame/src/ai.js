import { BALL_R, MAX_SHOT_IMPULSE } from "./constants.js";
import { lowestBallOnTable } from "./rules.js";

// AI 在桌面 XZ 平面（Y 是高度）
// world: {
//   balls: [{ number, pocketed, pos:{x,z} }...],
//   cue:   { pos:{x,z} },
//   pockets: [{ x, z }...],
// }
// simulate(ux, uz, impMag, spinY=0, spinX=0) → 影子物理模擬結果（hard 用）
//   { firstHit, pocketed:[number...], cuePocketed, cueFinal:{x,z}|null, finalPositions:{n:{x,z}} }
export function planAIShot(world, difficulty = "normal", simulate = null) {
  const targetNum = lowestBallOnTable(world.balls);
  if (targetNum == null) return null;
  const target = world.balls.find(b => b.number === targetNum && !b.pocketed);
  if (!target) return null;

  // hard 模式：候選擊球 × 模擬 × 走位評分
  if (difficulty === "hard" && simulate) {
    const plan = planHardShot(world, target, simulate);
    if (plan) return plan;
    // 模擬找不到好球時退回幾何法
  }

  // easy / normal：原本的純幾何
  return planGeometricShot(world, target, difficulty);
}

// ---------- HARD：用影子模擬挑最佳擊球 ----------
function planHardShot(world, target, simulate) {
  const { x: cx, z: cz } = world.cue.pos;
  const { x: tx, z: tz } = target.pos;
  // 下一顆目標（清台時用來評估走位）
  const nextNum = nextLowest(world.balls, target.number);
  const nextBall = nextNum != null ? world.balls.find(b => b.number === nextNum && !b.pocketed) : null;

  const candidates = [];

  // 對每個袋口建立基本瞄準方向（接觸點 = 目標球延長線往母球方向退 2R）
  for (const p of world.pockets) {
    const tpx = p.x - tx, tpz = p.z - tz;
    const tpLen = Math.hypot(tpx, tpz);
    if (tpLen < 1e-4) continue;
    const uTx = tpx / tpLen, uTz = tpz / tpLen;
    const contactX = tx - uTx * BALL_R * 2;
    const contactZ = tz - uTz * BALL_R * 2;
    const ccx = contactX - cx, ccz = contactZ - cz;
    const ccLen = Math.hypot(ccx, ccz);
    if (ccLen < 1e-4) continue;
    const uCx = ccx / ccLen, uCz = ccz / ccLen;

    // 切角過大（cut > 75°）就跳過
    const cutCos = uCx * uTx + uCz * uTz;
    if (cutCos < 0.26) continue;
    // 幾何預篩：母球→接觸點 / 目標球→袋口 任一被擋就跳過
    if (isBlocked(world, cx, cz, contactX, contactZ, target)) continue;
    if (isBlocked(world, tx, tz, p.x, p.z, target)) continue;

    // 兩種力度 + 兩種旋轉（中/拉桿，控制母球停在哪）
    const powers = [0.45, 0.65];
    const spins = [
      { y:  0.0, x: 0 }, // 中
      { y: -0.5, x: 0 }, // 拉桿（母球退）
    ];
    for (const pw of powers) {
      for (const sp of spins) {
        const imp = MAX_SHOT_IMPULSE * pw;
        candidates.push({ ux: uCx, uz: uCz, imp, spinY: sp.y, spinX: sp.x,
                          targetPocket: p, cutCos });
      }
    }
  }

  if (candidates.length === 0) return null;

  let best = null;
  for (const c of candidates) {
    const sim = simulate(c.ux, c.uz, c.imp, c.spinY, c.spinX);
    if (!sim) continue;

    let score = 0;
    // 第一顆撞到的必須是目標球（不算合法擊打 → 重罰）
    if (sim.firstHit !== target.number) score -= 800;
    // 目標球進袋大加分
    if (sim.pocketed.includes(target.number)) score += 1000;
    else continue; // 沒進袋直接淘汰
    // 母球進袋（白球失誤）扣分
    if (sim.cuePocketed) { score -= 1500; continue; }
    // 不該進袋的球誤入扣分（如 9 號球太早進）
    for (const n of sim.pocketed) {
      if (n === target.number) continue;
      if (n === 9 && target.number !== 9) score -= 500; // 9 號球太早進
      else score += 50; // 其他球順便落袋小加分
    }
    // 走位：母球停下後距離下一顆目標越近越好
    if (nextBall && sim.cueFinal) {
      const d = Math.hypot(sim.cueFinal.x - nextBall.pos.x,
                           sim.cueFinal.z - nextBall.pos.z);
      // 距離 0.3m 內滿分（300）、0.3~1.5m 線性遞減
      const goodPos = Math.max(0, 300 * (1 - Math.max(0, d - 0.3) / 1.2));
      score += goodPos;
    }

    if (!best || score > best.score) best = { ...c, score, sim };
  }

  if (!best || best.score < 0) return null;

  // 模擬結果太完美會讓人類失去樂趣 → 留 15% 失誤率（隨機微擾動）
  // 平均 85% 命中
  const MISS_RATE = 0.15;
  let ux = best.ux, uz = best.uz, imp = best.imp;
  if (Math.random() < MISS_RATE) {
    // 大誤差：±3°
    const err = (Math.random() - 0.5) * 0.105;
    const c = Math.cos(err), s = Math.sin(err);
    [ux, uz] = [ux * c - uz * s, ux * s + uz * c];
  } else {
    // 小誤差：±0.5°（模擬真實微小偏差）
    const err = (Math.random() - 0.5) * 0.018;
    const c = Math.cos(err), s = Math.sin(err);
    [ux, uz] = [ux * c - uz * s, ux * s + uz * c];
  }
  return { ix: ux * imp, iz: uz * imp };
}

function nextLowest(balls, currentNum) {
  let lowest = null;
  for (const b of balls) {
    if (b.pocketed || b.number === 0) continue;
    if (b.number <= currentNum) continue;
    if (lowest == null || b.number < lowest) lowest = b.number;
  }
  return lowest;
}

// ---------- EASY / NORMAL：純幾何（原版邏輯） ----------
function planGeometricShot(world, target, difficulty) {
  const { x: cx, z: cz } = world.cue.pos;
  const { x: tx, z: tz } = target.pos;

  let best = null;
  for (const p of world.pockets) {
    const tpx = p.x - tx, tpz = p.z - tz;
    const tpLen = Math.hypot(tpx, tpz);
    if (tpLen < 1e-4) continue;
    const uTx = tpx / tpLen, uTz = tpz / tpLen;

    const contactX = tx - uTx * BALL_R * 2;
    const contactZ = tz - uTz * BALL_R * 2;

    const ccx = contactX - cx, ccz = contactZ - cz;
    const ccLen = Math.hypot(ccx, ccz);
    if (ccLen < 1e-4) continue;
    const uCx = ccx / ccLen, uCz = ccz / ccLen;

    const blockedCue = isBlocked(world, cx, cz, contactX, contactZ, target);
    const blockedTarget = isBlocked(world, tx, tz, p.x, p.z, target);

    const dot = uCx * uTx + uCz * uTz;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    let score = 0;
    if (blockedCue) score -= 1000;
    if (blockedTarget) score -= 1000;
    score -= angle * 100;
    score -= tpLen * 20;
    score -= ccLen * 10;

    if (!best || score > best.score) {
      best = { score, uCx, uCz, ccLen, angle };
    }
  }
  if (!best) return null;

  let aimErr, powerFactor;
  if (difficulty === "easy") {
    aimErr = (Math.random() - 0.5) * 0.22;
    powerFactor = 0.45 + Math.random() * 0.4;
  } else {
    aimErr = (Math.random() - 0.5) * 0.10;
    powerFactor = 0.55 + Math.random() * 0.3;
  }
  const c = Math.cos(aimErr), s = Math.sin(aimErr);
  const ux = best.uCx * c - best.uCz * s;
  const uz = best.uCx * s + best.uCz * c;
  const imp = MAX_SHOT_IMPULSE * powerFactor;
  return { ix: ux * imp, iz: uz * imp };
}

function isBlocked(world, x1, z1, x2, z2, ignore) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const steps = Math.max(10, Math.floor(len / (BALL_R * 0.5)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t, pz = z1 + dz * t;
    for (const b of world.balls) {
      if (b.pocketed) continue;
      if (b === ignore) continue;
      if (b.number === 0) continue;
      const d = Math.hypot(px - b.pos.x, pz - b.pos.z);
      if (d < BALL_R * 2.1) return true;
    }
  }
  return false;
}
