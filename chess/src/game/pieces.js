// 程式繪製寶石棋子紋理（取代 codex 出的有黑塊版本）

function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }
function lighten(rgb, amt) {
  const r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = rgb & 0xff;
  return `rgb(${Math.min(255, r + 255 * amt) | 0}, ${Math.min(255, g + 255 * amt) | 0}, ${Math.min(255, b + 255 * amt) | 0})`;
}
function darken(rgb, amt) {
  const r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = rgb & 0xff;
  return `rgb(${(r * (1 - amt)) | 0}, ${(g * (1 - amt)) | 0}, ${(b * (1 - amt)) | 0})`;
}

// 畫一顆寶石棋子到 canvas
function drawJewelPiece(ctx, size, colorHex, isKing) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.40;

  // 1. 底下投影（柔和橢圓）
  ctx.save();
  ctx.globalAlpha = 0.42;
  const shadowGrad = ctx.createRadialGradient(cx, cy + r * 0.85, 0, cx, cy + r * 0.85, r * 1.1);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
  shadowGrad.addColorStop(0.6, 'rgba(0,0,0,0.35)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.85, r * 1.05, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. 寶石暗底（最外圈最暗）
  const body = ctx.createRadialGradient(
    cx - r * 0.25, cy - r * 0.30, r * 0.05,    // 內亮點
    cx + r * 0.10, cy + r * 0.20, r * 1.05     // 外暗
  );
  body.addColorStop(0.00, lighten(colorHex, 0.55));
  body.addColorStop(0.18, lighten(colorHex, 0.30));
  body.addColorStop(0.55, hex(colorHex));
  body.addColorStop(0.82, darken(colorHex, 0.35));
  body.addColorStop(1.00, darken(colorHex, 0.65));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // 3. 內側暗環（rim 加深，凸顯立體）
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const rim = ctx.createRadialGradient(cx, cy, r * 0.78, cx, cy, r);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(0.6, 'rgba(0,0,0,0.10)');
  rim.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // 4. 底部反光（顯出透明寶石感）
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
  ctx.clip();
  const innerGlow = ctx.createRadialGradient(cx + r * 0.15, cy + r * 0.35, 0, cx + r * 0.15, cy + r * 0.35, r * 0.7);
  innerGlow.addColorStop(0, lighten(colorHex, 0.25));
  innerGlow.addColorStop(0.5, 'rgba(0,0,0,0)');
  innerGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = innerGlow;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // 5. 大鏡面高光（左上柔光斑）
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
  ctx.clip();
  const spec = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.42, 0, cx - r * 0.32, cy - r * 0.42, r * 0.7);
  spec.addColorStop(0, 'rgba(255,255,255,0.85)');
  spec.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  spec.addColorStop(0.6, 'rgba(255,255,255,0.10)');
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spec;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // 6. 上方細鏡面條（眉狀亮條，質感關鍵）
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-0.35);
  const brow = ctx.createLinearGradient(0, -r * 0.78, 0, -r * 0.50);
  brow.addColorStop(0, 'rgba(255,255,255,0)');
  brow.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  brow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = brow;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.65, r * 0.55, r * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 7. 金色細邊（外圈）
  ctx.save();
  ctx.lineWidth = Math.max(1, size * 0.008);
  ctx.strokeStyle = 'rgba(212, 168, 87, 0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, r - ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 8. 王冠（可選）
  if (isKing) {
    drawCrown(ctx, cx, cy, r);
  }
}

function drawCrown(ctx, cx, cy, r) {
  ctx.save();
  const cw = r * 0.85;
  const ch = r * 0.55;
  const baseY = cy + ch * 0.20;
  const topY = cy - ch * 0.35;

  // 冠座
  const baseGrad = ctx.createLinearGradient(0, baseY - ch * 0.15, 0, baseY + ch * 0.15);
  baseGrad.addColorStop(0, '#f7d780');
  baseGrad.addColorStop(0.5, '#d4a857');
  baseGrad.addColorStop(1, '#8a6a30');
  ctx.fillStyle = baseGrad;
  const baseH = ch * 0.30;
  roundRect(ctx, cx - cw / 2, baseY - baseH / 2, cw, baseH, baseH * 0.3);
  ctx.fill();

  // 三個尖角
  const peakGrad = ctx.createLinearGradient(0, topY, 0, baseY);
  peakGrad.addColorStop(0, '#fce8a8');
  peakGrad.addColorStop(0.45, '#e8c068');
  peakGrad.addColorStop(1, '#a07020');

  ctx.fillStyle = peakGrad;
  ctx.beginPath();
  // 中央尖角（最高）
  ctx.moveTo(cx - cw * 0.18, baseY - baseH * 0.4);
  ctx.lineTo(cx, topY);
  ctx.lineTo(cx + cw * 0.18, baseY - baseH * 0.4);
  ctx.closePath();
  ctx.fill();
  // 左尖角
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.50, baseY - baseH * 0.4);
  ctx.lineTo(cx - cw * 0.34, topY + ch * 0.15);
  ctx.lineTo(cx - cw * 0.18, baseY - baseH * 0.4);
  ctx.closePath();
  ctx.fill();
  // 右尖角
  ctx.beginPath();
  ctx.moveTo(cx + cw * 0.18, baseY - baseH * 0.4);
  ctx.lineTo(cx + cw * 0.34, topY + ch * 0.15);
  ctx.lineTo(cx + cw * 0.50, baseY - baseH * 0.4);
  ctx.closePath();
  ctx.fill();

  // 尖角頂端的寶石點
  ctx.fillStyle = '#ffcb6c';
  [cx, cx - cw * 0.34, cx + cw * 0.34].forEach((tx, i) => {
    const ty = i === 0 ? topY : topY + ch * 0.15;
    ctx.beginPath();
    ctx.arc(tx, ty, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  });

  // 冠座上的細高光
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  roundRect(ctx, cx - cw / 2 + r * 0.02, baseY - baseH * 0.35, cw - r * 0.04, baseH * 0.18, baseH * 0.1);
  ctx.fill();

  // 描邊
  ctx.lineWidth = Math.max(1, r * 0.015);
  ctx.strokeStyle = '#5a3a14';
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.50, baseY - baseH * 0.4);
  ctx.lineTo(cx - cw * 0.34, topY + ch * 0.15);
  ctx.lineTo(cx - cw * 0.18, baseY - baseH * 0.4);
  ctx.lineTo(cx, topY);
  ctx.lineTo(cx + cw * 0.18, baseY - baseH * 0.4);
  ctx.lineTo(cx + cw * 0.34, topY + ch * 0.15);
  ctx.lineTo(cx + cw * 0.50, baseY - baseH * 0.4);
  ctx.stroke();

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

// 把四顆棋子註冊成 Phaser 紋理（取代 codex 載入的圖檔）
export function installPieceTextures(scene, size = 256, onlyKeys = null) {
  const AMBER = 0xff6a1a;
  const SAPPHIRE = 0xe0e4f0;
  const all = [
    { key: 'piece_p1',      color: AMBER,    king: false },
    { key: 'piece_p2',      color: SAPPHIRE, king: false },
    { key: 'piece_p1_king', color: AMBER,    king: true },
    { key: 'piece_p2_king', color: SAPPHIRE, king: true },
  ];
  const items = onlyKeys ? all.filter(x => onlyKeys.includes(x.key)) : all;
  for (const it of items) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    drawJewelPiece(ctx, size, it.color, it.king);
    if (scene.textures.exists(it.key)) scene.textures.remove(it.key);
    scene.textures.addCanvas(it.key, c);
  }
}
