// 核心遊戲狀態、物理與繪製
import { images } from "./assets.js";
import {
  LOGIC_W, LOGIC_H, COURT_TOP, COURT_BOTTOM, GOAL_LEFT_X, GOAL_RIGHT_X,
  PADDLE_W, PADDLE_H, PADDLE_LEFT_X, PADDLE_RIGHT_X, PADDLE_SPEED,
  BALL_R, BALL_START_SPEED, BALL_MAX_SPEED, BALL_SPEEDUP,
  WIN_SCORE, NUMBER_COLS, NUMBER_ROWS, BALL_FRAMES,
} from "./constants.js";
import { playSfx } from "./audio.js";

export function createGameState() {
  return {
    leftY: (COURT_TOP + COURT_BOTTOM) / 2,
    rightY: (COURT_TOP + COURT_BOTTOM) / 2,
    leftScore: 0,
    rightScore: 0,
    ball: { x: LOGIC_W / 2, y: LOGIC_H / 2, vx: 0, vy: 0, angle: 0, frame: 0, frameTime: 0 },
    status: "playing", // playing | goal | gameover
    goalTimer: 0,
    winner: null,     // 'left' | 'right' | null
    hitEffect: 0,     // 擊球效果計時
    hitPos: null,
  };
}

export function resetBall(state, direction = 1) {
  // direction: -1 往左, 1 往右
  const angle = (Math.random() - 0.5) * 0.6; // -0.3 ~ 0.3 rad
  state.ball.x = LOGIC_W / 2;
  state.ball.y = LOGIC_H / 2;
  state.ball.vx = Math.cos(angle) * BALL_START_SPEED * direction;
  state.ball.vy = Math.sin(angle) * BALL_START_SPEED;
}

export function startRound(state) {
  state.status = "playing";
  state.goalTimer = 0;
  resetBall(state, Math.random() < 0.5 ? -1 : 1);
}

export function updatePhysics(state, dt) {
  if (state.status !== "playing") {
    state.goalTimer -= dt;
    if (state.status === "goal" && state.goalTimer <= 0) {
      if (state.leftScore >= WIN_SCORE || state.rightScore >= WIN_SCORE) {
        state.status = "gameover";
        state.winner = state.leftScore > state.rightScore ? "left" : "right";
      } else {
        startRound(state);
      }
    }
    return;
  }

  const b = state.ball;
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  // 上下牆反彈
  if (b.y - BALL_R < COURT_TOP) {
    b.y = COURT_TOP + BALL_R;
    b.vy = Math.abs(b.vy);
    playSfx("wall");
  } else if (b.y + BALL_R > COURT_BOTTOM) {
    b.y = COURT_BOTTOM - BALL_R;
    b.vy = -Math.abs(b.vy);
    playSfx("wall");
  }

  // 擋板碰撞
  collideBall(state, PADDLE_LEFT_X, state.leftY, +1);
  collideBall(state, PADDLE_RIGHT_X, state.rightY, -1);

  // 進球判定
  if (b.x < GOAL_LEFT_X - BALL_R) {
    state.rightScore++;
    triggerGoal(state, "right");
  } else if (b.x > GOAL_RIGHT_X + BALL_R) {
    state.leftScore++;
    triggerGoal(state, "left");
  }

  // 球旋轉動畫
  const speed = Math.hypot(b.vx, b.vy);
  b.frameTime += dt * (speed / 400);
  if (b.frameTime > 0.1) {
    b.frameTime = 0;
    b.frame = (b.frame + 1) % BALL_FRAMES;
  }
  b.angle = Math.atan2(b.vy, b.vx);

  if (state.hitEffect > 0) state.hitEffect -= dt;
}

function collideBall(state, px, py, sign) {
  const b = state.ball;
  const halfW = PADDLE_W / 2, halfH = PADDLE_H / 2;
  // AABB vs circle
  const cx = Math.max(px - halfW, Math.min(b.x, px + halfW));
  const cy = Math.max(py - halfH, Math.min(b.y, py + halfH));
  const dx = b.x - cx, dy = b.y - cy;
  if (dx * dx + dy * dy > BALL_R * BALL_R) return;
  // 僅當球朝擋板方向才反彈（避免黏住）
  if (sign > 0 && b.vx > 0) return;
  if (sign < 0 && b.vx < 0) return;

  // 根據擊中擋板位置改變垂直速度 — 經典 Pong 手感
  const offset = (b.y - py) / halfH; // -1..1
  const speed = Math.min(BALL_MAX_SPEED, Math.hypot(b.vx, b.vy) * BALL_SPEEDUP);
  const maxAngle = Math.PI / 3; // 60°
  const angle = offset * maxAngle;
  b.vx = Math.cos(angle) * speed * sign;
  b.vy = Math.sin(angle) * speed;
  // 推出擋板避免重疊
  b.x = px + sign * (halfW + BALL_R + 1);

  state.hitEffect = 0.3;
  state.hitPos = { x: b.x, y: b.y };
  playSfx("hit");
}

function triggerGoal(state, who) {
  state.status = "goal";
  state.goalTimer = 1.6;
  state.ball.vx = 0;
  state.ball.vy = 0;
  playSfx("goal");
}

export function clampPaddle(y) {
  const half = PADDLE_H / 2;
  return Math.max(COURT_TOP + half, Math.min(COURT_BOTTOM - half, y));
}

// ---------- 渲染 ----------

export function renderGame(ctx, state, viewW, viewH, vertical) {
  ctx.save();
  // 背景色（球場外）
  ctx.fillStyle = "#b8b37a";
  ctx.fillRect(0, 0, viewW, viewH);

  // 計算縮放：直向時把邏輯空間旋轉 90° 填滿
  let scale, offsetX, offsetY;
  if (vertical) {
    // 旋轉後邏輯寬 = LOGIC_H, 邏輯高 = LOGIC_W
    scale = Math.min(viewW / LOGIC_H, viewH / LOGIC_W);
    offsetX = (viewW - LOGIC_H * scale) / 2;
    offsetY = (viewH - LOGIC_W * scale) / 2;
    ctx.translate(offsetX + LOGIC_H * scale, offsetY);
    ctx.rotate(Math.PI / 2);
    ctx.scale(scale, scale);
  } else {
    scale = Math.min(viewW / LOGIC_W, viewH / LOGIC_H);
    offsetX = (viewW - LOGIC_W * scale) / 2;
    offsetY = (viewH - LOGIC_H * scale) / 2;
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
  }

  // 球場底圖
  if (images.courtH) ctx.drawImage(images.courtH, 0, 0, LOGIC_W, LOGIC_H);

  // 中線
  if (images.centerLine) {
    const w = 60, h = COURT_BOTTOM - COURT_TOP;
    ctx.drawImage(images.centerLine, LOGIC_W / 2 - w / 2, COURT_TOP, w, h);
  }
  // 球門柱
  drawGoalPosts(ctx);

  // 擋板
  drawPaddle(ctx, images.pudLeft, PADDLE_LEFT_X, state.leftY);
  drawPaddle(ctx, images.pudRight, PADDLE_RIGHT_X, state.rightY);

  // 球陰影（比球略下方偏移）
  const b = state.ball;
  if (images.ballShadow) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(images.ballShadow, b.x - BALL_R + 3, b.y - BALL_R + 6, BALL_R * 2, BALL_R * 2);
    ctx.globalAlpha = 1;
  }

  // 球（6 幀動畫 + 依方向旋轉）
  if (images.ballFrames) {
    const fw = images.ballFrames.width / BALL_FRAMES;
    const fh = images.ballFrames.height;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.drawImage(images.ballFrames, b.frame * fw, 0, fw, fh,
                  -BALL_R, -BALL_R, BALL_R * 2, BALL_R * 2);
    ctx.restore();
  }

  // 擊球星花
  if (state.hitEffect > 0 && state.hitPos && images.stars) {
    const a = state.hitEffect / 0.3;
    ctx.globalAlpha = a;
    const s = 120 * (1.1 - a);
    ctx.drawImage(images.stars, state.hitPos.x - s / 2, state.hitPos.y - s / 2, s, s);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // 分數與 GOAL 文字用螢幕座標繪製（不旋轉）
  drawHUD(ctx, state, viewW, viewH, vertical);
}

function drawHUD(ctx, state, viewW, viewH, vertical) {
  // 分數位置：橫向→左右邊中；直向→上下邊中（上=left、下=right，對應邏輯視角）
  let leftPos, rightPos;
  const pad = 80;
  if (vertical) {
    leftPos = { x: viewW / 2, y: pad };
    rightPos = { x: viewW / 2, y: viewH - pad };
  } else {
    leftPos = { x: pad, y: viewH / 2 };
    rightPos = { x: viewW - pad, y: viewH / 2 };
  }
  drawScore(ctx, leftPos.x, leftPos.y, state.leftScore);
  drawScore(ctx, rightPos.x, rightPos.y, state.rightScore);

  if (state.status === "goal" && images.textGoal) {
    const w = Math.min(viewW * 0.5, 400);
    const h = w * 0.5;
    ctx.drawImage(images.textGoal, viewW / 2 - w / 2, viewH / 2 - h / 2, w, h);
  }
}

function drawPaddle(ctx, img, x, y) {
  if (!img) return;
  const frames = 5;
  const fw = img.width / frames;
  const fh = img.height;
  ctx.drawImage(img, 0, 0, fw, fh,
                x - PADDLE_W / 2, y - PADDLE_H / 2, PADDLE_W, PADDLE_H);
}

function drawGoalPosts(ctx) {
  // 左球門 — 原圖 135×615，對齊球場左邊
  if (images.goalLeft) {
    const w = 60, h = COURT_BOTTOM - COURT_TOP;
    ctx.drawImage(images.goalLeft, GOAL_LEFT_X - w, COURT_TOP, w, h);
  }
  if (images.goalRight) {
    const w = 60, h = COURT_BOTTOM - COURT_TOP;
    ctx.drawImage(images.goalRight, GOAL_RIGHT_X, COURT_TOP, w, h);
  }
}

function drawScore(ctx, cx, cy, score) {
  if (!images.numbers) return;
  const img = images.numbers;
  const dw = img.width / NUMBER_COLS;
  const dh = img.height / NUMBER_ROWS;
  const digit = Math.min(9, Math.max(0, score));
  const col = digit % NUMBER_COLS;
  const row = Math.floor(digit / NUMBER_COLS);
  const size = 80;
  const dh2 = size * (dh / dw);
  ctx.drawImage(img, col * dw, row * dh, dw, dh,
                cx - size / 2, cy - dh2 / 2, size, dh2);
}
