import { BALL_R, MAX_SHOT_IMPULSE } from "./constants.js";
import { lowestBallOnTable } from "./rules.js";

// AI 在桌面 XZ 平面（Y 是高度）
// world: {
//   balls: [{ number, pocketed, pos:{x,z} }...],
//   cue:   { pos:{x,z} },
//   pockets: [{ x, z }...],
// }
export function planAIShot(world, difficulty = "normal") {
  const targetNum = lowestBallOnTable(world.balls);
  if (targetNum == null) return null;
  const target = world.balls.find(b => b.number === targetNum && !b.pocketed);
  if (!target) return null;

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

  // 難度擾動
  let aimErr, powerFactor;
  if (difficulty === "easy") {
    aimErr = (Math.random() - 0.5) * 0.22;
    powerFactor = 0.45 + Math.random() * 0.4;
  } else if (difficulty === "normal") {
    aimErr = (Math.random() - 0.5) * 0.10;
    powerFactor = 0.55 + Math.random() * 0.3;
  } else {
    aimErr = (Math.random() - 0.5) * 0.03;
    powerFactor = 0.65 + Math.random() * 0.25;
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
