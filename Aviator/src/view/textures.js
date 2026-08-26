// 用 canvas 產生漸層 / 光暈貼圖（PixiJS 的 Graphics 不方便做柔和漸層）
import { Texture } from '../../vendor/pixi.min.mjs';

const cache = new Map();

function make(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = Texture.from(c);
  cache.set(key, t);
  return t;
}

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

export function vGradient(key, top, bottom, h = 64) {
  return make(`v_${key}`, 8, h, (ctx, w, hh) => {
    const g = ctx.createLinearGradient(0, 0, 0, hh);
    g.addColorStop(0, hex(top));
    g.addColorStop(1, hex(bottom));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, hh);
  });
}

export function radialGlow(key, color, alpha = 1) {
  return make(`glow_${key}`, 256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    const c = hex(color);
    g.addColorStop(0, `${c}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
    g.addColorStop(0.45, `${c}55`);
    g.addColorStop(1, `${c}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// 曲線下方的紅色漸層填充
export function curveFill() {
  return make('curvefill', 8, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,44,85,0.55)');
    g.addColorStop(0.55, 'rgba(226,5,57,0.22)');
    g.addColorStop(1, 'rgba(226,5,57,0.02)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// 背景放射光束（旋轉用）
export function sunburst() {
  return make('sunburst', 1024, 1024, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2, R = w * 0.72;
    ctx.clearRect(0, 0, w, h);
    const blades = 26;
    for (let i = 0; i < blades; i++) {
      const a0 = (i / blades) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / blades / 2;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, 'rgba(255,255,255,0.10)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.045)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
  });
}

// 程式繪製的紅色小飛機（AI 素材載入失敗時的後備）
export function planeFallback() {
  return make('plane_fb', 512, 256, (ctx, w, h) => {
    ctx.translate(0, 10);
    // 機身
    ctx.fillStyle = '#e21c3d';
    ctx.beginPath();
    ctx.moveTo(60, 150);
    ctx.quadraticCurveTo(150, 96, 330, 104);
    ctx.quadraticCurveTo(420, 108, 452, 132);
    ctx.quadraticCurveTo(420, 160, 330, 166);
    ctx.quadraticCurveTo(150, 176, 60, 150);
    ctx.closePath();
    ctx.fill();
    // 尾翼
    ctx.fillStyle = '#b3132e';
    ctx.beginPath();
    ctx.moveTo(64, 148); ctx.lineTo(40, 74); ctx.lineTo(96, 78); ctx.lineTo(128, 128);
    ctx.closePath(); ctx.fill();
    // 主翼
    ctx.fillStyle = '#8f0f24';
    ctx.beginPath();
    ctx.moveTo(190, 150); ctx.lineTo(150, 214); ctx.lineTo(250, 208); ctx.lineTo(276, 156);
    ctx.closePath(); ctx.fill();
    // 座艙
    ctx.fillStyle = '#25272b';
    ctx.beginPath(); ctx.ellipse(300, 122, 44, 16, -0.06, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fd4ff';
    ctx.beginPath(); ctx.ellipse(300, 121, 36, 11, -0.06, 0, Math.PI * 2); ctx.fill();
    // 機鼻與螺旋槳
    ctx.fillStyle = '#2b2d31';
    ctx.beginPath(); ctx.ellipse(452, 132, 10, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(462, 132, 8, 54, 0, 0, Math.PI * 2); ctx.stroke();
  });
}

// 圓角漸層按鈕底圖（含亮邊），依尺寸與配色快取
export function roundedGradient(w, h, r, top, bottom, border = null, borderAlpha = 0.45) {
  const key = `rg_${w}x${h}_${r}_${top}_${bottom}_${border}_${borderAlpha}`;
  return make(key, Math.max(2, Math.round(w)), Math.max(2, Math.round(h)), (ctx, W, H) => {
    const rr = Math.min(r, W / 2, H / 2);
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(rr, 0);
      ctx.arcTo(W, 0, W, H, rr);
      ctx.arcTo(W, H, 0, H, rr);
      ctx.arcTo(0, H, 0, 0, rr);
      ctx.arcTo(0, 0, W, 0, rr);
      ctx.closePath();
    };
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, hex(top));
    g.addColorStop(1, hex(bottom));
    path();
    ctx.fillStyle = g;
    ctx.fill();
    if (border !== null) {
      ctx.save();
      path();
      ctx.clip();
      ctx.strokeStyle = hex(border);
      ctx.globalAlpha = borderAlpha;
      ctx.lineWidth = 3;
      path();
      ctx.stroke();
      ctx.restore();
    }
  });
}
