// 寶石繪製：7 種不同形狀 + 漸層 + 高光，讓玩家一眼分辨
import { GEM_COLORS, GEM_SHAPES } from "./constants.js";

// 取得形狀多邊形頂點（以 (0,0) 為中心、外接半徑 r）
function getShapePoints(k, shape, r) {
  const v = k.vec2;
  const cos = Math.cos, sin = Math.sin, PI = Math.PI;

  switch (shape) {
    case "square": {
      // 紅寶石方形（切角）
      const s = r * 0.92;
      const c = s * 0.25;
      return [
        v(-s + c, -s), v(s - c, -s), v(s, -s + c),
        v(s, s - c),   v(s - c, s),  v(-s + c, s),
        v(-s, s - c),  v(-s, -s + c),
      ];
    }
    case "hex": {
      // 橘色六邊形
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = PI / 6 + i * PI / 3;
        pts.push(v(cos(a) * r, sin(a) * r));
      }
      return pts;
    }
    case "kite": {
      // 黃色風箏/菱形
      return [v(0, -r), v(r * 0.85, 0), v(0, r), v(-r * 0.85, 0)];
    }
    case "octagon": {
      // 綠色八邊形
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const a = PI / 8 + i * PI / 4;
        pts.push(v(cos(a) * r, sin(a) * r));
      }
      return pts;
    }
    case "gem4": {
      // 藍色橫長菱形
      return [v(0, -r * 0.7), v(r, 0), v(0, r * 0.7), v(-r, 0)];
    }
    case "triangle": {
      // 紫色三角形
      const pts = [];
      for (let i = 0; i < 3; i++) {
        const a = -PI / 2 + i * (2 * PI / 3);
        pts.push(v(cos(a) * r, sin(a) * r));
      }
      return pts;
    }
    case "circle":
    default:
      return null;  // 用 drawCircle 畫
  }
}

// 繪製一顆寶石（於目前 transform 原點）
// brightness: 0..1 發光亮度
export function drawGem(k, type, size, brightness = 0) {
  const [r, g, b] = GEM_COLORS[type];
  const shape = GEM_SHAPES[type];
  const radius = size * 0.44;

  const core = k.rgb(
    Math.min(255, r + 30 * brightness),
    Math.min(255, g + 30 * brightness),
    Math.min(255, b + 30 * brightness),
  );
  const dark = k.rgb(Math.max(0, r - 80), Math.max(0, g - 80), Math.max(0, b - 80));
  const light = k.rgb(Math.min(255, r + 80), Math.min(255, g + 80), Math.min(255, b + 80));

  // 陰影
  k.drawCircle({
    pos: k.vec2(2, 3),
    radius: radius * 1.02,
    color: k.rgb(0, 0, 0),
    opacity: 0.35,
  });

  if (shape === "circle") {
    // 白珍珠：同心圓
    k.drawCircle({ pos: k.vec2(0, 0), radius, color: core });
    k.drawCircle({ pos: k.vec2(0, 0), radius, color: dark, outline: { color: dark, width: 3 }, opacity: 0 });
    // 高光
    k.drawCircle({ pos: k.vec2(-radius * 0.3, -radius * 0.35), radius: radius * 0.35, color: light, opacity: 0.8 });
    k.drawCircle({ pos: k.vec2(radius * 0.25, radius * 0.3), radius: radius * 0.15, color: light, opacity: 0.3 });
  } else {
    const pts = getShapePoints(k, shape, radius);
    // 主體
    k.drawPolygon({
      pts,
      color: core,
      outline: { color: dark, width: 3 },
    });
    // 內部同形高光
    const inner = pts.map(p => k.vec2(p.x * 0.55 - radius * 0.12, p.y * 0.55 - radius * 0.18));
    k.drawPolygon({
      pts: inner,
      color: light,
      opacity: 0.55,
    });
    // 小高光點
    k.drawCircle({
      pos: k.vec2(-radius * 0.28, -radius * 0.32),
      radius: radius * 0.12,
      color: k.rgb(255, 255, 255),
      opacity: 0.85,
    });
  }

  // 發光邊（配對閃光時）
  if (brightness > 0.01) {
    k.drawCircle({
      pos: k.vec2(0, 0),
      radius: radius * (1 + brightness * 0.3),
      color: k.rgb(255, 255, 255),
      opacity: brightness * 0.5,
    });
  }
}

// Kaboom 組件：gem 物件
export function gemComp(k, type, size) {
  return {
    id: "gem",
    require: [],
    type,
    size,
    scale: 1,
    brightness: 0,
    rot: 0,
    update() {},
    draw() {
      k.pushTransform();
      k.pushRotate(this.rot);
      k.pushScale(this.scale, this.scale);
      drawGem(k, this.type, this.size, this.brightness);
      k.popTransform();
    },
  };
}
