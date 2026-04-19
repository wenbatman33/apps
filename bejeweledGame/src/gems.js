// 寶石繪製：7 種不同形狀 + 漸層 + 高光
// 為降低手機負擔，在啟動時把 7 張寶石預繪到離屏 Canvas，註冊為 sprite；
// 每幀只需 1 個 drawSprite，而非原本每顆 ~4 個 drawPolygon/drawCircle。
import { GEM_COLORS, GEM_SHAPES, CELL } from "./constants.js";

// --- 形狀頂點（Canvas 2D 使用，不依賴 Kaboom） ---
function getShapePoints2D(shape, r) {
  const cos = Math.cos, sin = Math.sin, PI = Math.PI;
  switch (shape) {
    case "square": {
      const s = r * 0.92;
      const c = s * 0.25;
      return [
        [-s + c, -s], [s - c, -s], [s, -s + c],
        [s, s - c],   [s - c, s],  [-s + c, s],
        [-s, s - c],  [-s, -s + c],
      ];
    }
    case "hex": {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = PI / 6 + i * PI / 3;
        pts.push([cos(a) * r, sin(a) * r]);
      }
      return pts;
    }
    case "kite":
      return [[0, -r], [r * 0.85, 0], [0, r], [-r * 0.85, 0]];
    case "octagon": {
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const a = PI / 8 + i * PI / 4;
        pts.push([cos(a) * r, sin(a) * r]);
      }
      return pts;
    }
    case "gem4":
      return [[0, -r * 0.7], [r, 0], [0, r * 0.7], [-r, 0]];
    case "triangle": {
      const pts = [];
      for (let i = 0; i < 3; i++) {
        const a = -PI / 2 + i * (2 * PI / 3);
        pts.push([cos(a) * r, sin(a) * r]);
      }
      return pts;
    }
    case "circle":
    default:
      return null;
  }
}

function fillPolygon(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

function strokePolygon(ctx, pts, width) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.lineWidth = width;
  ctx.stroke();
}

// 把一顆寶石繪製到離屏 Canvas（使用兩倍尺寸以維持高解析度）
function renderGemToCanvas(type) {
  const size = CELL;
  const SCALE = 2;  // 預繪時放大 2 倍避免縮放糊掉
  const c = document.createElement("canvas");
  c.width = size * SCALE;
  c.height = size * SCALE;
  const ctx = c.getContext("2d");
  ctx.scale(SCALE, SCALE);

  const [r, g, b] = GEM_COLORS[type];
  const shape = GEM_SHAPES[type];
  const radius = size * 0.44;
  const core  = `rgb(${r},${g},${b})`;
  const dark  = `rgb(${Math.max(0, r - 80)},${Math.max(0, g - 80)},${Math.max(0, b - 80)})`;
  const light = `rgb(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)})`;

  ctx.translate(size / 2, size / 2);

  // 陰影
  ctx.save();
  ctx.translate(2, 3);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (shape === "circle") {
    // 白珍珠
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3;
    ctx.stroke();
    // 高光
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(-radius * 0.3, -radius * 0.35, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(radius * 0.25, radius * 0.3, radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    const pts = getShapePoints2D(shape, radius);
    // 主體
    ctx.fillStyle = core;
    fillPolygon(ctx, pts);
    ctx.strokeStyle = dark;
    strokePolygon(ctx, pts, 3);
    // 內部同形高光
    const inner = pts.map(p => [p[0] * 0.55 - radius * 0.12, p[1] * 0.55 - radius * 0.18]);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = light;
    fillPolygon(ctx, inner);
    ctx.globalAlpha = 1;
    // 小高光點
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.beginPath();
    ctx.arc(-radius * 0.28, -radius * 0.32, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  return c;
}

// 把離屏 canvas 轉成 dataURL 再交給 Kaboom loadSprite
// Kaboom 的 loadSprite 回傳 Asset 物件（含 .onLoad / .loaded），不一定是標準 Promise；
// 把它們包成 Promise 後回傳，讓 main.js 等全部完成再進 menu。
export function preloadGemSprites(k) {
  return Promise.all(
    GEM_COLORS.map((_, i) => {
      const canvas = renderGemToCanvas(i);
      const asset = k.loadSprite(`gem-${i}`, canvas.toDataURL());
      return new Promise((resolve) => {
        if (!asset) return resolve();
        if (typeof asset.then === "function") {
          asset.then(resolve).catch(resolve);
        } else if (typeof asset.onLoad === "function") {
          asset.onLoad(resolve);
          if (asset.loaded) resolve();
        } else {
          resolve();
        }
      });
    }),
  );
}

// Kaboom 組件：每幀貼 sprite + 偶爾疊一層發光
export function gemComp(k, type, size) {
  return {
    id: "gem",
    require: [],
    type,
    size,
    scale: 1,
    brightness: 0,
    rot: 0,
    draw() {
      k.pushTransform();
      k.pushRotate(this.rot);
      k.pushScale(this.scale, this.scale);
      k.drawSprite({
        sprite: `gem-${this.type}`,
        anchor: "center",
        width: size,
        height: size,
      });
      if (this.brightness > 0.01) {
        k.drawCircle({
          pos: k.vec2(0, 0),
          radius: size * 0.44 * (1 + this.brightness * 0.3),
          color: k.rgb(255, 255, 255),
          opacity: this.brightness * 0.5,
        });
      }
      k.popTransform();
    },
  };
}
