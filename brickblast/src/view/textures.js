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
// 實心磚塊：整塊填色（供 tint），頂部帶一道淡高光做出立體感
export function texBrick(size = 90, radius = 0) {
  return make(`brick${size}_${radius}`, size, size, (ctx, w, h) => {
    const pad = 5;
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);
    // 上緣高光
    ctx.save();
    ctx.clip();
    const g = ctx.createLinearGradient(0, pad, 0, h * 0.55);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
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

// 三角磚：實心直角三角形，直角在左上，其餘朝向靠旋轉
export function texTriangle(size = 90) {
  return make(`tri${size}`, size, size, (ctx, w, h) => {
    const pad = 5;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(w - pad, pad);
    ctx.lineTo(pad, h - pad);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fill();
    ctx.save();
    ctx.clip();
    const g = ctx.createLinearGradient(0, pad, 0, h * 0.6);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  });
}

// 雷射道具圖示：左右雙向箭頭
export function texLaserIcon(size = 54) {
  return make(`lasericon${size}`, size, size, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(255,255,255,1)';
    // 中央粗光束
    ctx.fillRect(w * 0.16, h * 0.4, w * 0.68, h * 0.2);
    // 兩端箭頭
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5); ctx.lineTo(w * 0.26, h * 0.16); ctx.lineTo(w * 0.26, h * 0.84);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w, h * 0.5); ctx.lineTo(w * 0.74, h * 0.16); ctx.lineTo(w * 0.74, h * 0.84);
    ctx.closePath(); ctx.fill();
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
const HP_COLOR_MAX = 150;  // 血量色階上限（實戰最高約 160），超過一律最深的紫
export function hpColor(hp) {
  const t = Math.min(1, Math.log(Math.max(1, hp)) / Math.log(HP_COLOR_MAX));
  const hue = (165 - t * 240 + 360) % 360;
  // 紫紅段稍微降亮度，避免在深色底上過曝
  const l = 0.46 - Math.max(0, t - 0.72) * 0.1;
  return hsl2hex(hue, 0.92, l);
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
