// 輕量碰撞：圓 vs 軸對齊矩形（磚塊全部對齊網格，故不需通用物理引擎）

// 回傳最近點法向量與穿透深度；無碰撞回傳 null
export function circleVsRect(cx, cy, r, rx, ry, rw, rh) {
  const px = cx < rx ? rx : (cx > rx + rw ? rx + rw : cx);
  const py = cy < ry ? ry : (cy > ry + rh ? ry + rh : cy);
  let dx = cx - px, dy = cy - py;
  let d2 = dx * dx + dy * dy;

  if (d2 > r * r) return null;

  if (d2 > 1e-8) {
    const d = Math.sqrt(d2);
    return { nx: dx / d, ny: dy / d, depth: r - d };
  }

  // 圓心落在矩形內部：找最短脫出軸
  const left = cx - rx, right = rx + rw - cx;
  const top = cy - ry, bottom = ry + rh - cy;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { nx: -1, ny: 0, depth: left + r };
  if (m === right) return { nx: 1, ny: 0, depth: right + r };
  if (m === top) return { nx: 0, ny: -1, depth: top + r };
  return { nx: 0, ny: 1, depth: bottom + r };
}

// 線段上離點最近的位置
function closestOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 1e-9 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  return { x: ax + dx * t, y: ay + dy * t };
}

// 圓 vs 三角形（凸多邊形）；verts 為 [[x,y],[x,y],[x,y]]，逆時針或順時針皆可
export function circleVsTriangle(cx, cy, r, verts) {
  // 先判斷圓心是否在三角形內
  let inside = true;
  let sign = 0;
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = verts[i];
    const [bx, by] = verts[(i + 1) % 3];
    const cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (cross !== 0) {
      const s = cross > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (s !== sign) { inside = false; break; }
    }
  }

  if (inside) {
    // 圓心在內部：往最近的邊推出去
    let best = null;
    for (let i = 0; i < 3; i++) {
      const [ax, ay] = verts[i];
      const [bx, by] = verts[(i + 1) % 3];
      const p = closestOnSegment(cx, cy, ax, ay, bx, by);
      const dx = cx - p.x, dy = cy - p.y;
      const d = Math.hypot(dx, dy);
      if (!best || d < best.d) best = { d, px: p.x, py: p.y };
    }
    if (!best) return null;
    // 法線朝外（從最近邊指向圓心的反方向即為進入方向）
    let nx = cx - best.px, ny = cy - best.py;
    const n = Math.hypot(nx, ny);
    if (n < 1e-6) return { nx: 0, ny: -1, depth: r };
    return { nx: nx / n, ny: ny / n, depth: r + best.d };
  }

  // 圓心在外：找三條邊上最近的點
  let best = null;
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = verts[i];
    const [bx, by] = verts[(i + 1) % 3];
    const p = closestOnSegment(cx, cy, ax, ay, bx, by);
    const dx = cx - p.x, dy = cy - p.y;
    const d2 = dx * dx + dy * dy;
    if (!best || d2 < best.d2) best = { d2, dx, dy };
  }
  if (!best || best.d2 > r * r) return null;
  const d = Math.sqrt(best.d2);
  if (d < 1e-6) return { nx: 0, ny: -1, depth: r };
  return { nx: best.dx / d, ny: best.dy / d, depth: r - d };
}

// 直角三角形頂點：corner 指出直角所在的角落（0=左上 1=右上 2=右下 3=左下）
export function triangleVerts(x, y, s, corner) {
  const x1 = x + s, y1 = y + s;
  switch (corner & 3) {
    case 0: return [[x, y], [x1, y], [x, y1]];
    case 1: return [[x, y], [x1, y], [x1, y1]];
    case 2: return [[x1, y], [x1, y1], [x, y1]];
    default: return [[x, y], [x1, y1], [x, y1]];
  }
}

// 速度沿法向量反射（完全彈性）
export function reflect(vx, vy, nx, ny) {
  const dot = vx * nx + vy * ny;
  return { vx: vx - 2 * dot * nx, vy: vy - 2 * dot * ny };
}

// 防「幾乎水平」與「幾乎垂直」的無限彈射：夾角過小時強制修正
const MIN_RATIO = 0.22; // |vy| / speed 的下限
export function deJam(vx, vy, speed) {
  const ay = Math.abs(vy) / speed;
  if (ay >= MIN_RATIO) return { vx, vy };
  const sy = vy === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(vy);
  const sx = vx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(vx);
  const ny = MIN_RATIO * speed * sy;
  const nx = sx * Math.sqrt(Math.max(0, speed * speed - ny * ny));
  return { vx: nx, vy: ny };
}

// 依速度決定子步數，確保單步位移不超過半徑，避免穿透
export function substepCount(speed, dt, radius, max) {
  return Math.min(max, Math.max(1, Math.ceil((speed * dt) / (radius * 0.9))));
}
