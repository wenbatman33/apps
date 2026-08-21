// 全部貼圖以 Canvas 2D 程式生成（零美術素材），白色底圖搭配 tint 上色
import * as PIXI from '../../vendor/pixi.min.mjs';

const cache = new Map();

function make(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas');
  const dpr = 2;
  cv.width = Math.ceil(w * dpr);
  cv.height = Math.ceil(h * dpr);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  draw(ctx, w, h);
  const tex = PIXI.Texture.from(cv);
  cache.set(key, tex);
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 發光小球：中心亮白 → 外圈透明
export function texBall(r = 16) {
  return make(`ball${r}`, r * 2, r * 2, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.42, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.68, 'rgba(255,255,255,0.42)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// 柔光光暈（爆炸／拖尾／背景光斑共用）
export function texGlow(size = 128) {
  return make(`glow${size}`, size, size, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.42)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// 磚塊：霓虹描邊 + 半透明內填（白色，供 tint）
// 立體方磚：貼圖本身帶明暗（tint 是乘法，全白疊全白不會有明暗差），
// 主面中灰、上斜面全白、左次亮、右偏暗、下最暗，tint 上色後就是浮凸的方塊
const FACE = { main: 224, top: 255, left: 244, right: 176, bottom: 138 };
const gray = (v) => `rgb(${v},${v},${v})`;

export function texBrick(size = 90) {
  return make(`brick${size}`, size, size, (ctx, w, h) => {
    const b = size * 0.16;
    ctx.fillStyle = gray(FACE.main);
    ctx.fillRect(0, 0, w, h);
    const faces = [
      [[0, 0], [w, 0], [w - b, b], [b, b], FACE.top],
      [[0, 0], [b, b], [b, h - b], [0, h], FACE.left],
      [[w, 0], [w, h], [w - b, h - b], [w - b, b], FACE.right],
      [[0, h], [b, h - b], [w - b, h - b], [w, h], FACE.bottom],
    ];
    for (const f of faces) {
      ctx.beginPath();
      ctx.moveTo(f[0][0], f[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(f[i][0], f[i][1]);
      ctx.closePath();
      ctx.fillStyle = gray(f[4]);
      ctx.fill();
    }
  });
}

// 道具：空心圓環（磚塊是實心方塊，道具是空心圓，一眼就能分辨）
export function texPlusRing(size = 76) {
  return make(`ring${size}`, size, size, (ctx, w, h) => {
    const r = w / 2 - 6;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.stroke();
  });
}

// 立體三角磚：每種朝向各畫一張，光源固定從左上（用旋轉的話光會跟著轉，立體感就錯了）
// corner: 0=直角左上 1=直角右上 2=直角右下 3=直角左下
export function texTriangle(size = 90, corner = 0) {
  return make(`tri${size}_${corner}`, size, size, (ctx, w, h) => {
    const b = size * 0.16;
    const verts = [
      [[0, 0], [w, 0], [0, h]],
      [[0, 0], [w, 0], [w, h]],
      [[w, 0], [w, h], [0, h]],
      [[0, 0], [w, h], [0, h]],
    ][corner & 3];

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(verts[0][0], verts[0][1]);
    ctx.lineTo(verts[1][0], verts[1][1]);
    ctx.lineTo(verts[2][0], verts[2][1]);
    ctx.closePath();
    ctx.fillStyle = gray(FACE.main);
    ctx.fill();
    ctx.clip();

    // 逐邊畫斜面：亮度由該邊的外法線與左上光源的夾角決定
    const cx = (verts[0][0] + verts[1][0] + verts[2][0]) / 3;
    const cy = (verts[0][1] + verts[1][1] + verts[2][1]) / 3;
    ctx.lineWidth = b * 2;
    for (let i = 0; i < 3; i++) {
      const [ax, ay] = verts[i];
      const [bx, by] = verts[(i + 1) % 3];
      let nx = by - ay, ny = ax - bx;         // 邊的法線
      const len = Math.hypot(nx, ny) || 1;
      nx /= len; ny /= len;
      // 讓法線朝外（背離重心）
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
      const d = (-nx - ny) / Math.SQRT2;      // 與左上光源的夾角
      ctx.strokeStyle = gray(Math.round(192 + d * 62));
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.restore();
  });
}

// 雷射道具：圓環與符號畫在同一張貼圖，避免疊圖時比例跑掉
export function texLaserOrb(size = 76) {
  return make(`laserorb${size}`, size, size, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2, r = w / 2 - 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.stroke();

    // 內部：一道水平光束，兩端收成箭頭
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,1)';
    const bw = r * 1.05, bh = h * 0.11;
    ctx.fillRect(cx - bw, cy - bh / 2, bw * 2, bh);
    ctx.beginPath();
    ctx.moveTo(cx - bw - r * 0.28, cy);
    ctx.lineTo(cx - bw, cy - bh * 1.9);
    ctx.lineTo(cx - bw, cy + bh * 1.9);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + bw + r * 0.28, cy);
    ctx.lineTo(cx + bw, cy - bh * 1.9);
    ctx.lineTo(cx + bw, cy + bh * 1.9);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });
}

// 方形粒子碎片
export function texShard(size = 12) {
  return make(`shard${size}`, size, size, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(255,255,255,1)';
    roundRect(ctx, 1, 1, w - 2, h - 2, 3);
    ctx.fill();
  });
}

// 1×1 白點（拉伸成線段用）
export function texPixel() {
  return make('px', 4, 4, (ctx, w, h) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
  });
}

// 磚塊顏色：血量越高越往紅／紫走（青綠 → 綠 → 黃 → 橘 → 紅 → 洋紅 → 紫）
// 血量即時反映，被打到掉血就會往綠色回退
// 血量 → 色相分段表：讓同一群數字有同一個顏色，分群才看得出來
const HUE_STOPS = [[1, 208], [40, 196], [46, 140], [78, 118], [88, 42], [150, 26], [230, 4], [360, 336], [700, 288]];

function hueForHp(hp) {
  const v = Math.max(1, hp);
  if (v <= HUE_STOPS[0][0]) return HUE_STOPS[0][1];
  for (let i = 1; i < HUE_STOPS.length; i++) {
    const [h1, u1] = HUE_STOPS[i - 1];
    const [h2, u2] = HUE_STOPS[i];
    if (v <= h2) {
      const t = (Math.log(v) - Math.log(h1)) / (Math.log(h2) - Math.log(h1));
      let du = u2 - u1;
      if (du > 180) du -= 360; else if (du < -180) du += 360;
      return (u1 + du * t + 360) % 360;
    }
  }
  return HUE_STOPS[HUE_STOPS.length - 1][1];
}

export function hpColor(hp) {
  const hue = hueForHp(hp);
  // 貼圖主面只有 224/255 的灰，tint 是相乘 → 飽和與亮度都要先加足
  return hsl2hex(hue, 0.9, 0.63);
}

// 磚上數字用的深色，同色系但壓暗
export function labelColor(hp) {
  return hsl2hex(hueForHp(hp), 0.72, 0.19);
}

export function hsl2hex(h, s, l) {
  h /= 360;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}
function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
