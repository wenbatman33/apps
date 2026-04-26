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

  // 預設安全擊球：直線朝目標球（即使被擋，也保證認真攻擊最低號球，不會空桿）
  const safeDx = tx - cx, safeDz = tz - cz;
  const safeLen = Math.hypot(safeDx, safeDz) || 1;
  const safe = {
    score: -1e9,
    uCx: safeDx / safeLen,
    uCz: safeDz / safeLen,
    ccLen: safeLen,
    angle: 0,
    isSafety: true,
  };

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
      best = { score, uCx, uCz, ccLen, tpLen, angle };
    }
  }
  // 安全擊球退路：困難模式只在「兩端皆被擋」時才使用（讓 AI 仍盡量試袋）
  const safetyThreshold = difficulty === "hard" ? -1800 : -500;
  if (!best || best.score < safetyThreshold) best = safe;

  // 難度擾動
  let aimErr, powerFactor;
  if (difficulty === "easy") {
    aimErr = (Math.random() - 0.5) * 0.22;
    powerFactor = 0.45 + Math.random() * 0.4;
  } else if (difficulty === "normal") {
    aimErr = (Math.random() - 0.5) * 0.10;
    powerFactor = 0.55 + Math.random() * 0.3;
  } else {
    // 困難 = 神準（誤差近 0、力度依距離自適應，盡量小力避免白球失控）
    aimErr = (Math.random() - 0.5) * 0.004;
    // 依「母球→撞點 + 撞點→袋口」總距離決定力度（夠到就好；偏小避免母球進袋）
    const totalDist = (best.ccLen || 0) + (best.tpLen || 0);
    powerFactor = Math.max(0.26, Math.min(0.5, 0.22 + totalDist * 0.10));
  }
  // 安全擊球時降低力度（避免亂炸） + 減少誤差
  if (best.isSafety) {
    aimErr *= 0.3;
    powerFactor = difficulty === "hard" ? 0.5 : 0.35 + Math.random() * 0.2;
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
