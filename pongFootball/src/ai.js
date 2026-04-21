// AI 擋板控制
import { AI_DIFFICULTY } from "./constants.js";
import { COURT_TOP, COURT_BOTTOM, PADDLE_H, LOGIC_W } from "./constants.js";

export function createAI(difficulty = "normal") {
  const cfg = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.normal;
  return {
    cfg,
    reactTimer: 0,
    targetY: (COURT_TOP + COURT_BOTTOM) / 2,
  };
}

// side: 'left' | 'right' —— AI 控制哪一邊
export function updateAI(ai, state, side, dt) {
  ai.reactTimer += dt;
  if (ai.reactTimer >= ai.cfg.reactDelay) {
    ai.reactTimer = 0;
    const b = state.ball;
    // 難度高時預測：用 vy 推算球到達擋板 X 時的 y
    const paddleX = side === "right" ? LOGIC_W - 210 : 210;
    const dist = Math.abs(paddleX - b.x);
    const speed = Math.abs(b.vx) + 1;
    const tToReach = dist / speed;
    let predictedY = b.y + b.vy * tToReach;
    // 牆反彈折返
    const range = COURT_BOTTOM - COURT_TOP;
    let y = predictedY - COURT_TOP;
    const mod = ((y % (2 * range)) + 2 * range) % (2 * range);
    predictedY = COURT_TOP + (mod > range ? 2 * range - mod : mod);

    // 只在球朝擋板來時才預測，否則慢慢回中
    const incoming = (side === "right" && b.vx > 0) || (side === "left" && b.vx < 0);
    if (incoming) {
      ai.targetY = predictedY + (Math.random() - 0.5) * 2 * ai.cfg.errorPx;
    } else {
      ai.targetY = (COURT_TOP + COURT_BOTTOM) / 2;
    }
  }

  const cur = side === "right" ? state.rightY : state.leftY;
  const diff = ai.targetY - cur;
  const step = Math.sign(diff) * Math.min(Math.abs(diff), ai.cfg.speed * dt);
  const half = PADDLE_H / 2;
  const newY = Math.max(COURT_TOP + half, Math.min(COURT_BOTTOM - half, cur + step));
  return newY;
}
