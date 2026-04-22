// 核心遊戲狀態、物理與繪製
import { images } from "./assets.js";
import {
  LOGIC_W, LOGIC_H, COURT_TOP, COURT_BOTTOM, GOAL_LEFT_X, GOAL_RIGHT_X,
  GOAL_MOUTH_TOP, GOAL_MOUTH_BOTTOM,
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
  const prevX = b.x, prevY = b.y;
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

  // 擋板碰撞（含 swept 檢測避免高速穿透）
  collideBall(state, PADDLE_LEFT_X, state.leftY, +1, prevX, prevY);
  collideBall(state, PADDLE_RIGHT_X, state.rightY, -1, prevX, prevY);

  // 球門牆反彈（球門口以外的木樁/石頭區）
  if (b.x - BALL_R < GOAL_LEFT_X && b.vx < 0) {
    if (b.y < GOAL_MOUTH_TOP || b.y > GOAL_MOUTH_BOTTOM) {
      b.x = GOAL_LEFT_X + BALL_R;
      b.vx = Math.abs(b.vx);
      playSfx("wall");
    }
  } else if (b.x + BALL_R > GOAL_RIGHT_X && b.vx > 0) {
    if (b.y < GOAL_MOUTH_TOP || b.y > GOAL_MOUTH_BOTTOM) {
      b.x = GOAL_RIGHT_X - BALL_R;
      b.vx = -Math.abs(b.vx);
      playSfx("wall");
    }
  }

  // 進球判定（球中心越過進球線，且 y 在球門口範圍內）
  if (b.x < GOAL_LEFT_X - BALL_R && b.y >= GOAL_MOUTH_TOP && b.y <= GOAL_MOUTH_BOTTOM) {
    state.rightScore++;
    triggerGoal(state, "right");
  } else if (b.x > GOAL_RIGHT_X + BALL_R && b.y >= GOAL_MOUTH_TOP && b.y <= GOAL_MOUTH_BOTTOM) {
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

function collideBall(state, px, py, sign, prevX, prevY) {
  const b = state.ball;
  const halfW = PADDLE_W / 2, halfH = PADDLE_H / 2;
  // 僅當球朝擋板方向才反彈（避免黏住）
  if (sign > 0 && b.vx >= 0) return;
  if (sign < 0 && b.vx <= 0) return;

  // Swept 檢測：球的 x 邊緣是否跨過擋板平面
  // sign > 0 (左擋板)：球左緣 (x - BALL_R) 跨過 px + halfW（擋板右緣）
  // sign < 0 (右擋板)：球右緣 (x + BALL_R) 跨過 px - halfW（擋板左緣）
  const plane = sign > 0 ? (px + halfW) : (px - halfW);
  const prevEdge = sign > 0 ? (prevX - BALL_R) : (prevX + BALL_R);
  const nowEdge  = sign > 0 ? (b.x   - BALL_R) : (b.x   + BALL_R);
  const crossed = (sign > 0)
    ? (prevEdge >= plane && nowEdge <= plane)
    : (prevEdge <= plane && nowEdge >= plane);

  let hit = false;
  if (crossed) {
    // 用跨平面時的 y 做垂直區間檢查
    const denom = (nowEdge - prevEdge);
    const t = denom !== 0 ? (plane - prevEdge) / denom : 0;
    const yAtCross = prevY + (b.y - prevY) * t;
    if (yAtCross > py - halfH - BALL_R && yAtCross < py + halfH + BALL_R) {
      // 把球回拉到擋板前緣（避免穿透後下一幀判進球）
      b.y = yAtCross;
      hit = true;
    }
  }
  if (!hit) {
    // 一般 AABB vs circle（慢速或側面接觸）
    const cx = Math.max(px - halfW, Math.min(b.x, px + halfW));
    const cy = Math.max(py - halfH, Math.min(b.y, py + halfH));
    const dx = b.x - cx, dy = b.y - cy;
    if (dx * dx + dy * dy > BALL_R * BALL_R) return;
  }

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
    // 逆時針旋轉 -90°：讓左側（我方）在螢幕下方
    scale = Math.min(viewW / LOGIC_H, viewH / LOGIC_W);
    offsetX = (viewW - LOGIC_H * scale) / 2;
    offsetY = (viewH - LOGIC_W * scale) / 2;
    ctx.translate(offsetX, offsetY + LOGIC_W * scale);
    ctx.rotate(-Math.PI / 2);
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

  // Debug：顯示反彈牆（紅）與球門口（綠）
  if (typeof location !== "undefined" && location.search.includes("debug=1")) {
    drawDebugZones(ctx);
  }

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
    // 逆時針旋轉後：左側（我方）在下、右側（AI）在上
    leftPos  = { x: viewW / 2, y: viewH - pad };
    rightPos = { x: viewW / 2, y: pad };
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

function drawDebugZones(ctx) {
  const wallW = 40;
  ctx.save();
  // 反彈牆（紅半透明）— 球門兩端 + 上下石頭牆
  ctx.fillStyle = "rgba(255, 0, 0, 0.45)";
  // 左球門：上半段、下半段
  ctx.fillRect(GOAL_LEFT_X - wallW, COURT_TOP, wallW, GOAL_MOUTH_TOP - COURT_TOP);
  ctx.fillRect(GOAL_LEFT_X - wallW, GOAL_MOUTH_BOTTOM, wallW, COURT_BOTTOM - GOAL_MOUTH_BOTTOM);
  // 右球門：上半段、下半段
  ctx.fillRect(GOAL_RIGHT_X, COURT_TOP, wallW, GOAL_MOUTH_TOP - COURT_TOP);
  ctx.fillRect(GOAL_RIGHT_X, GOAL_MOUTH_BOTTOM, wallW, COURT_BOTTOM - GOAL_MOUTH_BOTTOM);
  // 上石頭牆（COURT_TOP 以上一小段）
  ctx.fillRect(0, COURT_TOP - wallW, LOGIC_W, wallW);
  // 下石頭牆（COURT_BOTTOM 以下一小段）
  ctx.fillRect(0, COURT_BOTTOM, LOGIC_W, wallW);

  // 球門口（綠半透明）
  ctx.fillStyle = "rgba(0, 255, 0, 0.35)";
  ctx.fillRect(GOAL_LEFT_X - wallW, GOAL_MOUTH_TOP, wallW, GOAL_MOUTH_BOTTOM - GOAL_MOUTH_TOP);
  ctx.fillRect(GOAL_RIGHT_X, GOAL_MOUTH_TOP, wallW, GOAL_MOUTH_BOTTOM - GOAL_MOUTH_TOP);
  ctx.restore();
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
