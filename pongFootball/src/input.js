// 統一輸入：鍵盤 + 滑鼠 + 觸控
// 輸出：getPaddleTargetY(side) 回傳目標 Y（邏輯座標），由 game loop 用來推動玩家擋板
import { LOGIC_W, LOGIC_H, COURT_TOP, COURT_BOTTOM, PADDLE_H, PADDLE_SPEED } from "./constants.js";

const keys = { up: false, down: false, w: false, s: false };
let pointerY = null;      // 當前指標在邏輯座標的 Y（null 表示未使用）
let pointerActive = false;
let pointerSide = null;   // 'left' | 'right' — 手機直向時區分上下半區

let canvasRef = null;
let getLayout = null; // () => { vertical: bool, scale, offsetX, offsetY }

export function setupInput(canvas, layoutFn) {
  canvasRef = canvas;
  getLayout = layoutFn;

  window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp") keys.up = true;
    if (e.code === "ArrowDown") keys.down = true;
    if (e.code === "KeyW") keys.w = true;
    if (e.code === "KeyS") keys.s = true;
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp") keys.up = false;
    if (e.code === "ArrowDown") keys.down = false;
    if (e.code === "KeyW") keys.w = false;
    if (e.code === "KeyS") keys.s = false;
  });

  const onPointer = (e) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const layout = getLayout();
    // 將畫布像素座標轉回邏輯座標
    if (layout.vertical) {
      // 直向：逆時針 -90° 旋轉後反變換
      // screen (px, py) → logical (lx, ly)
      const lx = LOGIC_W - (py - layout.offsetY) / layout.scale; // 邏輯 X：下方=0（我方）
      const ly = (px - layout.offsetX) / layout.scale;            // 邏輯 Y
      pointerY = ly;
      pointerSide = lx < LOGIC_W / 2 ? "left" : "right";
    } else {
      const lx = (px - layout.offsetX) / layout.scale;
      const ly = (py - layout.offsetY) / layout.scale;
      pointerY = ly;
      pointerSide = lx < LOGIC_W / 2 ? "left" : "right";
    }
  };

  canvas.addEventListener("mousemove", (e) => { pointerActive = true; onPointer(e); });
  canvas.addEventListener("mousedown", (e) => { pointerActive = true; onPointer(e); });
  canvas.addEventListener("touchstart", (e) => {
    pointerActive = true;
    onPointer(e.touches[0]);
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => {
    onPointer(e.touches[0]);
    e.preventDefault();
  }, { passive: false });
}

export function getPaddleTargetY(side, currentY, dt) {
  // 鍵盤優先；否則滑鼠/觸控
  let useKey = false;
  let dir = 0;
  if (side === "left") {
    if (keys.w) { dir = -1; useKey = true; }
    else if (keys.s) { dir = 1; useKey = true; }
  } else {
    if (keys.up) { dir = -1; useKey = true; }
    else if (keys.down) { dir = 1; useKey = true; }
  }
  if (useKey) {
    const y = currentY + dir * PADDLE_SPEED * dt;
    return clamp(y);
  }
  if (pointerActive && pointerY != null && (pointerSide === side || !isMobileLike())) {
    return clamp(pointerY);
  }
  return currentY;
}

function clamp(y) {
  const half = PADDLE_H / 2;
  return Math.max(COURT_TOP + half, Math.min(COURT_BOTTOM - half, y));
}

function isMobileLike() {
  return "ontouchstart" in window && window.innerWidth < 900;
}
