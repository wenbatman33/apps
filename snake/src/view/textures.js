import { Texture } from '../../vendor/pixi.min.mjs';

function canvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return Texture.from(c);
}

// 程式生成貼圖：全部用白/灰階，實際顏色靠 sprite.tint 上色
export const TEX = {};

export function buildTextures() {
  // 蛇身球體：中心亮、邊緣暗，tint 後有立體感
  TEX.body = canvas(96, (ctx, s) => {
    const r = s / 2;
    const g = ctx.createRadialGradient(r * 0.72, r * 0.68, r * 0.08, r, r, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, '#e2e2e2');
    g.addColorStop(0.88, '#bdbdbd');
    g.addColorStop(1, '#9a9a9a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(r, r, r - 1, 0, 6.2832); ctx.fill();
  });

  // 柔光：加速拖尾與蛇身外圍輝光
  TEX.glow = canvas(128, (ctx, s) => {
    const r = s / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.28)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });

  // 食物：亮核 + 光暈
  TEX.food = canvas(64, (ctx, s) => {
    const r = s / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.42)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });

  TEX.circle = canvas(64, (ctx, s) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 1, 0, 6.2832); ctx.fill();
  });

  // 背景網格
  TEX.grid = canvas(96, (ctx, s) => {
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(90,130,220,0.16)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0.5, 0); ctx.lineTo(0.5, s);
    ctx.moveTo(0, 0.5); ctx.lineTo(s, 0.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,160,255,0.10)';
    ctx.beginPath(); ctx.arc(s / 2, s / 2, 2.2, 0, 6.2832); ctx.fill();
  });
  return TEX;
}
