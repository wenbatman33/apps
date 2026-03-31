class SymbolRenderer {
  constructor() {
    this.imageCache = {};
    this.symbolSize = 128;
  }

  async preloadThemeImages(symbols) {
    const promises = symbols.map(sym => {
      if (sym.image) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { this.imageCache[sym.id] = img; resolve(); };
          img.onerror = () => resolve();
          img.src = sym.image;
        });
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
  }

  drawSymbol(ctx, symbolDef, x, y, size, alpha = 1, highlighted = false) {
    ctx.save();
    ctx.globalAlpha = alpha;

    if (this.imageCache[symbolDef.id]) {
      const img = this.imageCache[symbolDef.id];
      const half = size / 2;
      ctx.drawImage(img, x - half, y - half, size, size);
      if (highlighted) this._drawHighlight(ctx, x, y, size, symbolDef.colors.glow);
      ctx.restore();
      return;
    }

    const half = size / 2;
    const pad = size * 0.06;
    const inner = half - pad;

    this._drawSymbolBg(ctx, x, y, size, symbolDef.colors, highlighted);

    ctx.save();
    ctx.translate(x, y);
    switch (symbolDef.drawStyle) {
      case 'seth':    this._drawSeth(ctx, inner, symbolDef.colors); break;
      case 'storm':   this._drawStorm(ctx, inner, symbolDef.colors); break;
      case 'pharaoh': this._drawPharaoh(ctx, inner, symbolDef.colors); break;
      case 'eye':     this._drawEye(ctx, inner, symbolDef.colors); break;
      case 'ankh':    this._drawAnkh(ctx, inner, symbolDef.colors); break;
      case 'scarab':  this._drawScarab(ctx, inner, symbolDef.colors); break;
      case 'lotus':   this._drawLotus(ctx, inner, symbolDef.colors); break;
      case 'card':    this._drawCard(ctx, inner, symbolDef.colors, symbolDef.cardLabel); break;
    }
    ctx.restore();

    if (symbolDef.type === 'wild')    this._drawWildBadge(ctx, x, y + inner * 0.72, size, symbolDef.colors);
    if (symbolDef.type === 'scatter') this._drawScatterBadge(ctx, x, y + inner * 0.72, size, symbolDef.colors);

    ctx.restore();
  }

  _drawSymbolBg(ctx, x, y, size, colors, highlighted) {
    const half = size / 2;
    const r = size * 0.1;

    // Deep background
    const bg = ctx.createRadialGradient(x - half * 0.2, y - half * 0.3, 0, x, y, half * 1.3);
    bg.addColorStop(0, this._lighten(colors.primary, 0.2));
    bg.addColorStop(0.5, this._darken(colors.primary, 0.4));
    bg.addColorStop(1, this._darken(colors.primary, 0.15));

    ctx.beginPath();
    this._roundRect(ctx, x - half, y - half, size, size, r);
    ctx.fillStyle = bg;
    ctx.fill();

    // Subtle diagonal texture
    ctx.save();
    ctx.beginPath();
    this._roundRect(ctx, x - half, y - half, size, size, r);
    ctx.clip();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = -size; i < size * 2; i += 9) {
      ctx.beginPath();
      ctx.moveTo(x - half, y - half + i);
      ctx.lineTo(x + half, y - half + i - size * 0.18);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Outer gold border
    ctx.shadowColor = highlighted ? colors.glow : '#c8a84b';
    ctx.shadowBlur = highlighted ? 35 : 10;
    ctx.strokeStyle = highlighted ? colors.glow : '#c8a84b';
    ctx.lineWidth = highlighted ? 3.5 : 2.5;
    ctx.beginPath();
    this._roundRect(ctx, x - half, y - half, size, size, r);
    ctx.stroke();

    // Inner border line
    ctx.shadowBlur = 0;
    ctx.strokeStyle = highlighted ? colors.secondary : '#6a4a10';
    ctx.lineWidth = 1;
    const ins = 5;
    ctx.beginPath();
    this._roundRect(ctx, x - half + ins, y - half + ins, size - ins * 2, size - ins * 2, r - 2);
    ctx.stroke();

    // Corner diamond ornaments
    const ornS = size * 0.11;
    const corners = [
      [x - half, y - half],
      [x + half, y - half],
      [x - half, y + half],
      [x + half, y + half],
    ];
    ctx.shadowColor = highlighted ? colors.glow : '#ffdd88';
    ctx.shadowBlur = highlighted ? 12 : 5;
    ctx.fillStyle = highlighted ? colors.glow : '#c8a84b';
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - ornS * 0.55);
      ctx.lineTo(cx + ornS * 0.55, cy);
      ctx.lineTo(cx, cy + ornS * 0.55);
      ctx.lineTo(cx - ornS * 0.55, cy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  _drawHighlight(ctx, x, y, size, glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 55;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 4;
    const half = size / 2;
    ctx.beginPath();
    this._roundRect(ctx, x - half, y - half, size, size, size * 0.1);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── SETH (Wild) ─────────────────────────────────────────────
  _drawSeth(ctx, r, colors) {
    // Atmospheric halo
    const halo = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
    halo.addColorStop(0, this._alpha(colors.glow, 0.18));
    halo.addColorStop(1, this._alpha(colors.glow, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r, 0, 0, Math.PI * 2);
    ctx.fill();

    // Robe body
    const robeGr = ctx.createLinearGradient(-r * 0.45, r * 0.05, r * 0.45, r * 0.92);
    robeGr.addColorStop(0, '#8a1500');
    robeGr.addColorStop(0.5, '#550800');
    robeGr.addColorStop(1, '#220200');
    ctx.beginPath();
    ctx.moveTo(-r * 0.38, r * 0.08);
    ctx.lineTo(-r * 0.55, r * 0.92);
    ctx.lineTo(r * 0.55, r * 0.92);
    ctx.lineTo(r * 0.38, r * 0.08);
    ctx.closePath();
    ctx.fillStyle = robeGr;
    ctx.fill();

    // Gold collar
    const colGr = ctx.createLinearGradient(-r * 0.42, r * 0.04, r * 0.42, r * 0.2);
    colGr.addColorStop(0, '#6a4a00');
    colGr.addColorStop(0.5, '#ffd700');
    colGr.addColorStop(1, '#6a4a00');
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.4, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = colGr;
    ctx.fill();
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(i * r * 0.11, r * 0.1, r * 0.038, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#ff4400' : '#ffd700';
      ctx.fill();
    }

    // Neck
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.1, r * 0.16, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c07840';
    ctx.fill();

    // Seth's distinctive tall square ears
    const headGr = ctx.createLinearGradient(-r * 0.4, -r * 0.95, r * 0.4, -r * 0.1);
    headGr.addColorStop(0, '#cc3300');
    headGr.addColorStop(0.4, '#882200');
    headGr.addColorStop(1, '#440e00');

    // Left ear
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, -r * 0.44);
    ctx.lineTo(-r * 0.36, -r * 0.96);
    ctx.lineTo(-r * 0.15, -r * 0.9);
    ctx.lineTo(-r * 0.11, -r * 0.44);
    ctx.closePath();
    ctx.fillStyle = headGr;
    ctx.fill();
    ctx.strokeStyle = colors.glow; ctx.lineWidth = 1; ctx.stroke();
    // Ear inner
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, -r * 0.5);
    ctx.lineTo(-r * 0.32, -r * 0.88);
    ctx.lineTo(-r * 0.18, -r * 0.84);
    ctx.lineTo(-r * 0.14, -r * 0.5);
    ctx.closePath();
    ctx.fillStyle = this._alpha(colors.glow, 0.25);
    ctx.fill();

    // Right ear
    ctx.beginPath();
    ctx.moveTo(r * 0.26, -r * 0.44);
    ctx.lineTo(r * 0.36, -r * 0.96);
    ctx.lineTo(r * 0.15, -r * 0.9);
    ctx.lineTo(r * 0.11, -r * 0.44);
    ctx.closePath();
    ctx.fillStyle = headGr;
    ctx.fill();
    ctx.strokeStyle = colors.glow; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.25, -r * 0.5);
    ctx.lineTo(r * 0.32, -r * 0.88);
    ctx.lineTo(r * 0.18, -r * 0.84);
    ctx.lineTo(r * 0.14, -r * 0.5);
    ctx.closePath();
    ctx.fillStyle = this._alpha(colors.glow, 0.25);
    ctx.fill();

    // Main face
    ctx.beginPath();
    ctx.moveTo(-r * 0.36, -r * 0.44);
    ctx.bezierCurveTo(-r * 0.44, -r * 0.25, -r * 0.46, -r * 0.02, -r * 0.4, r * 0.06);
    ctx.bezierCurveTo(-r * 0.28, r * 0.14, -r * 0.14, r * 0.16, 0, r * 0.14);
    ctx.bezierCurveTo(r * 0.14, r * 0.16, r * 0.28, r * 0.14, r * 0.4, r * 0.06);
    ctx.bezierCurveTo(r * 0.46, -r * 0.02, r * 0.44, -r * 0.25, r * 0.36, -r * 0.44);
    ctx.closePath();
    ctx.fillStyle = headGr;
    ctx.fill();
    ctx.strokeStyle = this._darken(colors.glow, 0.5);
    ctx.lineWidth = 1.5; ctx.stroke();

    // Elongated jackal snout
    const snoutGr = ctx.createLinearGradient(0, -r * 0.12, 0, r * 0.1);
    snoutGr.addColorStop(0, '#aa3300');
    snoutGr.addColorStop(1, '#550e00');
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, -r * 0.16);
    ctx.bezierCurveTo(-r * 0.32, r * 0.0, -r * 0.26, r * 0.14, -r * 0.1, r * 0.18);
    ctx.bezierCurveTo(-r * 0.04, r * 0.22, r * 0.04, r * 0.22, r * 0.1, r * 0.18);
    ctx.bezierCurveTo(r * 0.26, r * 0.14, r * 0.32, r * 0.0, r * 0.25, -r * 0.16);
    ctx.closePath();
    ctx.fillStyle = snoutGr;
    ctx.fill();
    ctx.strokeStyle = colors.glow; ctx.lineWidth = 1; ctx.stroke();

    // Glowing eyes
    ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 22;
    const mkEye = (ex, ey) => {
      const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, r * 0.1);
      eg.addColorStop(0, '#ffffff');
      eg.addColorStop(0.3, '#ffcc00');
      eg.addColorStop(1, '#ff4400');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.11, r * 0.072, ex < 0 ? -0.2 : 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(ex, ey, r * 0.042, 0, Math.PI * 2); ctx.fill();
    };
    mkEye(-r * 0.2, -r * 0.27);
    mkEye(r * 0.2, -r * 0.27);

    // Kohl lines
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.33, -r * 0.27); ctx.lineTo(-r * 0.09, -r * 0.27);
    ctx.moveTo(r * 0.09, -r * 0.27);  ctx.lineTo(r * 0.33, -r * 0.27);
    ctx.stroke();

    // Was scepter
    ctx.strokeStyle = '#c8a84b'; ctx.lineWidth = 2;
    ctx.shadowColor = '#c8a84b'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(r * 0.36, r * 0.18); ctx.lineTo(r * 0.36, r * 0.84); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.36, r * 0.18); ctx.lineTo(r * 0.28, r * 0.06);
    ctx.moveTo(r * 0.36, r * 0.18); ctx.lineTo(r * 0.44, r * 0.06);
    ctx.moveTo(r * 0.36, r * 0.84); ctx.lineTo(r * 0.28, r * 0.92);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Lightning on chest
    ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffee44';
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, r * 0.3);
    ctx.lineTo(r * 0.06, r * 0.54);
    ctx.lineTo(-r * 0.02, r * 0.54);
    ctx.lineTo(r * 0.12, r * 0.8);
    ctx.lineTo(-r * 0.06, r * 0.58);
    ctx.lineTo(r * 0.02, r * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── STORM (Scatter) ─────────────────────────────────────────
  _drawStorm(ctx, r, colors) {
    const atm = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    atm.addColorStop(0, this._alpha(colors.glow, 0.28));
    atm.addColorStop(1, this._alpha(colors.primary, 0));
    ctx.fillStyle = atm;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

    const puffs = [
      { x: 0,       y: -r * 0.22, rx: r * 0.38, ry: r * 0.28, l: 0.45 },
      { x: -r * 0.38, y: -r * 0.08, rx: r * 0.28, ry: r * 0.22, l: 0.35 },
      { x:  r * 0.36, y: -r * 0.08, rx: r * 0.28, ry: r * 0.22, l: 0.35 },
      { x: -r * 0.6,  y:  r * 0.06, rx: r * 0.22, ry: r * 0.18, l: 0.25 },
      { x:  r * 0.58, y:  r * 0.06, rx: r * 0.22, ry: r * 0.18, l: 0.25 },
    ];
    for (const p of puffs) {
      const cg = ctx.createRadialGradient(p.x, p.y - p.ry * 0.3, 0, p.x, p.y, Math.max(p.rx, p.ry));
      cg.addColorStop(0, this._lighten(colors.secondary, p.l));
      cg.addColorStop(0.6, colors.primary);
      cg.addColorStop(1, this._darken(colors.primary, 0.4));
      ctx.shadowColor = colors.glow; ctx.shadowBlur = 14;
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Dark underside
    const baseGr = ctx.createLinearGradient(0, r * 0.08, 0, r * 0.28);
    baseGr.addColorStop(0, this._darken(colors.primary, 0.5));
    baseGr.addColorStop(1, '#030008');
    ctx.fillStyle = baseGr;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.16, r * 0.76, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main lightning bolt (white)
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 22;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-r * 0.06, r * 0.3);
    ctx.lineTo(r * 0.18, r * 0.56);
    ctx.lineTo(r * 0.04, r * 0.56);
    ctx.lineTo(r * 0.2, r * 0.88);
    ctx.lineTo(-r * 0.12, r * 0.62);
    ctx.lineTo(r * 0.02, r * 0.62);
    ctx.closePath();
    ctx.fill();

    // Side bolts (purple)
    ctx.shadowColor = colors.glow; ctx.shadowBlur = 12;
    ctx.fillStyle = colors.secondary;
    const bolt = (ox) => {
      ctx.beginPath();
      ctx.moveTo(ox,           r * 0.3);
      ctx.lineTo(ox + r * 0.12, r * 0.52);
      ctx.lineTo(ox + r * 0.04, r * 0.52);
      ctx.lineTo(ox + r * 0.14, r * 0.72);
      ctx.lineTo(ox - r * 0.08, r * 0.55);
      ctx.lineTo(ox,            r * 0.55);
      ctx.closePath();
      ctx.fill();
    };
    bolt(-r * 0.42);
    bolt(r * 0.3);
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = colors.border || '#cc88ff';
    ctx.font = `bold ${r * 0.22}px Cinzel, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = colors.glow; ctx.shadowBlur = 8;
    ctx.fillText('STORM', 0, -r * 0.7);
    ctx.shadowBlur = 0;
  }

  // ── PHARAOH ─────────────────────────────────────────────────
  _drawPharaoh(ctx, r, colors) {
    const nemesGr = ctx.createLinearGradient(-r * 0.5, 0, r * 0.5, 0);
    nemesGr.addColorStop(0, '#6a4a00');
    nemesGr.addColorStop(0.5, '#ffd700');
    nemesGr.addColorStop(1, '#6a4a00');

    // Nemes flaps
    const drawFlap = (sign) => {
      ctx.beginPath();
      ctx.moveTo(sign * r * 0.26, -r * 0.56);
      ctx.bezierCurveTo(sign * r * 0.52, -r * 0.3, sign * r * 0.58, r * 0.1, sign * r * 0.44, r * 0.52);
      ctx.lineTo(sign * r * 0.2, r * 0.52);
      ctx.bezierCurveTo(sign * r * 0.26, r * 0.1, sign * r * 0.22, -r * 0.18, sign * r * 0.16, -r * 0.36);
      ctx.closePath();
      ctx.fillStyle = nemesGr; ctx.fill();
    };
    drawFlap(-1); drawFlap(1);

    // Nemes stripes
    ctx.strokeStyle = '#6a4a00'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * (0.3 - t * 0.5)); ctx.lineTo(-r * 0.22, -r * (0.36 - t * 0.5)); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * (0.3 - t * 0.5));  ctx.lineTo(r * 0.22, -r * (0.36 - t * 0.5));  ctx.stroke();
    }

    // Red crown (Deshret)
    const redGr = ctx.createLinearGradient(-r * 0.28, -r * 0.38, r * 0.28, -r * 0.62);
    redGr.addColorStop(0, '#aa0000'); redGr.addColorStop(1, '#ff3300');
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, -r * 0.38);
    ctx.bezierCurveTo(-r * 0.32, -r * 0.5, -r * 0.28, -r * 0.6, -r * 0.2, -r * 0.62);
    ctx.lineTo(r * 0.2, -r * 0.62);
    ctx.bezierCurveTo(r * 0.28, -r * 0.6, r * 0.32, -r * 0.5, r * 0.26, -r * 0.38);
    ctx.closePath();
    ctx.fillStyle = redGr; ctx.fill();
    ctx.strokeStyle = '#880000'; ctx.lineWidth = 1; ctx.stroke();

    // White crown (Hedjet)
    const whiteGr = ctx.createLinearGradient(-r * 0.18, -r * 0.6, r * 0.18, -r * 0.94);
    whiteGr.addColorStop(0, '#d0d0b8'); whiteGr.addColorStop(0.5, '#f8f8e8'); whiteGr.addColorStop(1, '#b0b09a');
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, -r * 0.6);
    ctx.bezierCurveTo(-r * 0.2, -r * 0.76, -r * 0.14, -r * 0.88, 0, -r * 0.93);
    ctx.bezierCurveTo(r * 0.14, -r * 0.88, r * 0.2, -r * 0.76, r * 0.18, -r * 0.6);
    ctx.closePath();
    ctx.fillStyle = whiteGr; ctx.fill();
    ctx.strokeStyle = '#b0b098'; ctx.lineWidth = 1; ctx.stroke();

    // Face
    const faceGr = ctx.createLinearGradient(-r * 0.26, -r * 0.36, r * 0.26, r * 0.36);
    faceGr.addColorStop(0, '#e8c068'); faceGr.addColorStop(0.5, '#d4a84a'); faceGr.addColorStop(1, '#b08028');
    ctx.beginPath();
    ctx.moveTo(-r * 0.24, -r * 0.36);
    ctx.bezierCurveTo(-r * 0.3, -r * 0.2, -r * 0.3, r * 0.18, -r * 0.22, r * 0.36);
    ctx.bezierCurveTo(-r * 0.1, r * 0.45, r * 0.1, r * 0.45, r * 0.22, r * 0.36);
    ctx.bezierCurveTo(r * 0.3, r * 0.18, r * 0.3, -r * 0.2, r * 0.24, -r * 0.36);
    ctx.closePath();
    ctx.fillStyle = faceGr; ctx.fill();
    ctx.strokeStyle = '#aa8830'; ctx.lineWidth = 1.5; ctx.stroke();

    // Eyes
    ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 6;
    [['-', -r * 0.13], ['+', r * 0.13]].forEach(([, ex]) => {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, -r * 0.05, r * 0.09, r * 0.055, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0044aa'; ctx.beginPath(); ctx.arc(ex, -r * 0.05, r * 0.048, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, -r * 0.05, r * 0.025, 0, Math.PI * 2); ctx.fill();
    });
    ctx.strokeStyle = '#000033'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.24, -r * 0.05); ctx.lineTo(-r * 0.04, -r * 0.05);
    ctx.moveTo(-r * 0.22, -r * 0.05); ctx.lineTo(-r * 0.25, r * 0.02);
    ctx.moveTo(r * 0.04, -r * 0.05);  ctx.lineTo(r * 0.24, -r * 0.05);
    ctx.moveTo(r * 0.22, -r * 0.05);  ctx.lineTo(r * 0.25, r * 0.02);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Nose & mouth
    ctx.strokeStyle = '#aa8830'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, r * 0.02); ctx.lineTo(-r * 0.04, r * 0.1); ctx.lineTo(r * 0.04, r * 0.1); ctx.stroke();
    ctx.strokeStyle = '#7a5820'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.09, 0.2, Math.PI - 0.2); ctx.stroke();

    // Uraeus
    ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(0, -r * 0.39, r * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cc0000'; ctx.beginPath(); ctx.arc(0, -r * 0.44, r * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Royal beard
    const beardGr = ctx.createLinearGradient(0, r * 0.38, 0, r * 0.68);
    beardGr.addColorStop(0, '#aa8830'); beardGr.addColorStop(1, '#6a5818');
    ctx.beginPath();
    ctx.moveTo(-r * 0.09, r * 0.38);
    ctx.bezierCurveTo(-r * 0.11, r * 0.54, -r * 0.05, r * 0.62, 0, r * 0.66);
    ctx.bezierCurveTo(r * 0.05, r * 0.62, r * 0.11, r * 0.54, r * 0.09, r * 0.38);
    ctx.closePath();
    ctx.fillStyle = beardGr; ctx.fill();
    ctx.strokeStyle = '#8a6a00'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = '#c8a84b'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      const ty = r * (0.43 + i * 0.05);
      ctx.beginPath(); ctx.moveTo(-r * 0.08, ty); ctx.lineTo(r * 0.08, ty); ctx.stroke();
    }
  }

  // ── EYE OF RA ───────────────────────────────────────────────
  _drawEye(ctx, r, colors) {
    // Aura
    ctx.shadowColor = colors.glow; ctx.shadowBlur = 35;
    ctx.fillStyle = this._alpha(colors.glow, 0.1);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.88, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Eye white
    ctx.shadowColor = colors.glow; ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(-r * 0.72, 0);
    ctx.bezierCurveTo(-r * 0.72, -r * 0.42, r * 0.72, -r * 0.42, r * 0.72, 0);
    ctx.bezierCurveTo(r * 0.72, r * 0.42, -r * 0.72, r * 0.42, -r * 0.72, 0);
    ctx.fillStyle = '#f8f4e8'; ctx.fill();

    // Iris
    const iGr = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
    iGr.addColorStop(0, '#001144'); iGr.addColorStop(0.4, colors.primary);
    iGr.addColorStop(0.85, colors.secondary); iGr.addColorStop(1, this._darken(colors.secondary, 0.6));
    ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = iGr; ctx.fill();

    // Pupil
    ctx.fillStyle = '#000011'; ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(-r * 0.06, -r * 0.06, r * 0.055, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(r * 0.06, r * 0.04, r * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Kohl outline
    ctx.strokeStyle = '#0a0820'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.72, 0);
    ctx.bezierCurveTo(-r * 0.72, -r * 0.42, r * 0.72, -r * 0.42, r * 0.72, 0);
    ctx.bezierCurveTo(r * 0.72, r * 0.42, -r * 0.72, r * 0.42, -r * 0.72, 0);
    ctx.stroke();
    ctx.strokeStyle = colors.secondary; ctx.lineWidth = 1.5;
    ctx.shadowColor = colors.glow; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;

    // Kohl extension marks
    const drawKohl = (path) => {
      ctx.strokeStyle = '#0a0820'; ctx.lineWidth = 3.5; ctx.beginPath(); path(); ctx.stroke();
      ctx.strokeStyle = colors.secondary; ctx.lineWidth = 1.5;
      ctx.shadowColor = colors.glow; ctx.shadowBlur = 5; ctx.beginPath(); path(); ctx.stroke(); ctx.shadowBlur = 0;
    };
    drawKohl(() => {
      ctx.moveTo(-r * 0.72, 0);
      ctx.bezierCurveTo(-r * 0.84, r * 0.1, -r * 0.88, r * 0.24, -r * 0.78, r * 0.32);
      ctx.bezierCurveTo(-r * 0.7, r * 0.4, -r * 0.65, r * 0.45, -r * 0.72, r * 0.38);
    });
    drawKohl(() => { ctx.moveTo(r * 0.72, 0); ctx.lineTo(r * 0.88, -r * 0.22); });
    drawKohl(() => {
      ctx.moveTo(0, r * 0.42);
      ctx.bezierCurveTo(-r * 0.04, r * 0.56, -r * 0.14, r * 0.64, -r * 0.08, r * 0.72);
      ctx.bezierCurveTo(-r * 0.02, r * 0.78, r * 0.1, r * 0.72, r * 0.06, r * 0.62);
    });

    // Sun disc (Ra element)
    ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 22;
    const sunGr = ctx.createRadialGradient(0, -r * 0.7, 0, 0, -r * 0.7, r * 0.17);
    sunGr.addColorStop(0, '#ffffff'); sunGr.addColorStop(0.35, '#ffee44');
    sunGr.addColorStop(0.75, '#ff8800'); sunGr.addColorStop(1, '#cc4400');
    ctx.fillStyle = sunGr; ctx.beginPath(); ctx.arc(0, -r * 0.7, r * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.21, -r * 0.7 + Math.sin(a) * r * 0.21);
      ctx.lineTo(Math.cos(a) * r * 0.3, -r * 0.7 + Math.sin(a) * r * 0.3);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // ── ANKH ────────────────────────────────────────────────────
  _drawAnkh(ctx, r, colors) {
    const barW = r * 0.22;
    ctx.shadowColor = colors.glow; ctx.shadowBlur = 22;

    const goldGr = ctx.createLinearGradient(-r * 0.5, -r, r * 0.5, r);
    goldGr.addColorStop(0, '#fff4a0'); goldGr.addColorStop(0.25, '#ffd700');
    goldGr.addColorStop(0.5, '#c89820'); goldGr.addColorStop(0.75, '#ffd700'); goldGr.addColorStop(1, '#c89820');

    // Vertical bar
    ctx.fillStyle = goldGr; ctx.strokeStyle = colors.border; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-barW / 2, -r * 0.12, barW, r * 1.0, barW * 0.4); ctx.fill(); ctx.stroke();

    // Horizontal bar
    ctx.beginPath(); ctx.roundRect(-r * 0.68, -r * 0.12 - barW / 2, r * 1.36, barW, barW * 0.4); ctx.fill(); ctx.stroke();

    // Loop
    ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.32, r * 0.42, 0, 0, Math.PI * 2);
    ctx.strokeStyle = goldGr; ctx.lineWidth = barW; ctx.stroke();
    ctx.strokeStyle = colors.border; ctx.lineWidth = 1; ctx.stroke();

    // Inner loop cutout
    ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.12, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = this._darken(colors.primary, 0.25); ctx.fill();
    ctx.shadowBlur = 0;

    // Metallic sheen
    const sheenGr = ctx.createLinearGradient(-barW / 2, 0, barW / 2, 0);
    sheenGr.addColorStop(0, this._alpha('#ffffff', 0)); sheenGr.addColorStop(0.3, this._alpha('#ffffff', 0.38)); sheenGr.addColorStop(1, this._alpha('#ffffff', 0));
    ctx.fillStyle = sheenGr;
    ctx.beginPath(); ctx.roundRect(-barW / 2, -r * 0.12, barW * 0.4, r * 1.0, barW * 0.4); ctx.fill();

    // Gem at intersection
    ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.arc(0, -r * 0.12, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(0, -r * 0.12, r * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Decorative gems
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      ctx.shadowColor = colors.glow; ctx.shadowBlur = 5;
      ctx.fillStyle = i % 2 === 0 ? '#ff3300' : '#ffd700';
      ctx.beginPath(); ctx.arc(i * r * 0.25, -r * 0.12, r * 0.044, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Mini wings at loop top
    ctx.fillStyle = goldGr; ctx.strokeStyle = colors.border; ctx.lineWidth = 1;
    [-1, 1].forEach(s => {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.12, -r * 0.9);
      ctx.bezierCurveTo(s * r * 0.38, -r * 0.82, s * r * 0.46, -r * 0.7, s * r * 0.36, -r * 0.62);
      ctx.bezierCurveTo(s * r * 0.28, -r * 0.58, s * r * 0.18, -r * 0.62, s * r * 0.12, -r * 0.68);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
  }

  // ── SCARAB ──────────────────────────────────────────────────
  _drawScarab(ctx, r, colors) {
    ctx.shadowColor = colors.glow; ctx.shadowBlur = 16;

    const wingL = ctx.createLinearGradient(-r, 0, 0, 0);
    wingL.addColorStop(0, this._darken(colors.primary, 0.5)); wingL.addColorStop(0.5, colors.primary); wingL.addColorStop(1, colors.secondary);
    const wingR = ctx.createLinearGradient(0, 0, r, 0);
    wingR.addColorStop(0, colors.secondary); wingR.addColorStop(0.5, colors.primary); wingR.addColorStop(1, this._darken(colors.primary, 0.5));

    // Wings
    const drawWing = (s, gr) => {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.08, -r * 0.15);
      ctx.bezierCurveTo(s * r * 0.5, -r * 0.55, s * r * 0.88, -r * 0.25, s * r * 0.88, r * 0.15);
      ctx.bezierCurveTo(s * r * 0.88, r * 0.55, s * r * 0.5, r * 0.6, s * r * 0.08, r * 0.38);
      ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
      ctx.strokeStyle = colors.border; ctx.lineWidth = 1; ctx.stroke();
    };
    drawWing(-1, wingL); drawWing(1, wingR);

    // Wing veins
    ctx.globalAlpha = 0.65; ctx.strokeStyle = colors.secondary; ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      [-1, 1].forEach(s => {
        ctx.beginPath();
        ctx.moveTo(s * r * 0.08, r * (-0.05 + t * 0.2));
        ctx.bezierCurveTo(s * r * (0.2 + t * 0.45), r * (-0.1 + t * 0.1), s * r * (0.4 + t * 0.3), r * t * 0.4, s * r * (0.5 + t * 0.25), r * (0.1 + t * 0.2));
        ctx.stroke();
      });
    }
    ctx.globalAlpha = 1;

    // Solar disc held by scarab
    ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 20;
    const discGr = ctx.createRadialGradient(0, -r * 0.65, 0, 0, -r * 0.65, r * 0.2);
    discGr.addColorStop(0, '#ffffff'); discGr.addColorStop(0.3, '#ffee55');
    discGr.addColorStop(0.7, '#ff8800'); discGr.addColorStop(1, '#cc4400');
    ctx.fillStyle = discGr; ctx.beginPath(); ctx.arc(0, -r * 0.65, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Front legs gripping disc
    ctx.strokeStyle = colors.secondary; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.14, -r * 0.38); ctx.bezierCurveTo(-r * 0.28, -r * 0.52, -r * 0.18, -r * 0.62, -r * 0.1, -r * 0.68); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.14, -r * 0.38); ctx.bezierCurveTo(r * 0.28, -r * 0.52, r * 0.18, -r * 0.62, r * 0.1, -r * 0.68); ctx.stroke();

    // Body
    const bodyGr = ctx.createRadialGradient(0, r * 0.05, 0, 0, r * 0.05, r * 0.45);
    bodyGr.addColorStop(0, this._lighten(colors.secondary, 0.5)); bodyGr.addColorStop(0.5, colors.primary); bodyGr.addColorStop(1, this._darken(colors.primary, 0.4));
    ctx.shadowColor = colors.glow; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.3, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyGr; ctx.fill(); ctx.strokeStyle = colors.border; ctx.lineWidth = 1.5; ctx.stroke();

    // Body segments
    ctx.strokeStyle = this._lighten(colors.secondary, 0.3); ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath(); ctx.ellipse(0, r * (-0.2 + i * 0.18), r * (0.28 - i * 0.02), r * 0.04, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // Head
    ctx.beginPath(); ctx.ellipse(0, -r * 0.38, r * 0.2, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fillStyle = this._lighten(colors.secondary, 0.3); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Middle & back legs
    ctx.strokeStyle = colors.secondary; ctx.lineWidth = 1.5;
    [[r * 0.28, r * 0.05, r * 0.7, r * 0.0, r * 0.8, r * 0.12],
     [r * 0.28, r * 0.35, r * 0.68, r * 0.45, r * 0.75, r * 0.6]].forEach(([x1,y1,x2,y2,x3,y3]) => {
      [-1, 1].forEach(s => {
        ctx.beginPath();
        ctx.moveTo(s * x1, y1); ctx.lineTo(s * x2, y2);
        ctx.moveTo(s * x2, y2); ctx.lineTo(s * x3, y3);
        ctx.stroke();
      });
    });
  }

  // ── LOTUS ───────────────────────────────────────────────────
  _drawLotus(ctx, r, colors) {
    // Outer petals
    for (let i = 0; i < 6; i++) {
      ctx.save(); ctx.rotate((i / 6) * Math.PI * 2 + Math.PI / 6);
      const pg = ctx.createLinearGradient(0, 0, 0, -r * 0.85);
      pg.addColorStop(0, this._darken(colors.primary, 0.5));
      pg.addColorStop(0.6, this._darken(colors.secondary, 0.3));
      pg.addColorStop(1, this._darken(colors.secondary, 0.55));
      ctx.fillStyle = pg; ctx.strokeStyle = this._darken(colors.secondary, 0.5); ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.12);
      ctx.bezierCurveTo(-r * 0.22, -r * 0.25, -r * 0.2, -r * 0.7, 0, -r * 0.82);
      ctx.bezierCurveTo(r * 0.2, -r * 0.7, r * 0.22, -r * 0.25, 0, r * 0.12);
      ctx.fill(); ctx.stroke(); ctx.restore();
    }

    // Middle petals
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.rotate((i / 5) * Math.PI * 2 - Math.PI / 2);
      const pg = ctx.createLinearGradient(0, 0, 0, -r * 0.78);
      pg.addColorStop(0, colors.primary); pg.addColorStop(0.4, colors.secondary); pg.addColorStop(1, this._lighten(colors.secondary, 0.3));
      ctx.fillStyle = pg; ctx.strokeStyle = colors.border || colors.secondary; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.08);
      ctx.bezierCurveTo(-r * 0.18, -r * 0.2, -r * 0.16, -r * 0.62, 0, -r * 0.75);
      ctx.bezierCurveTo(r * 0.16, -r * 0.62, r * 0.18, -r * 0.2, 0, r * 0.08);
      ctx.fill(); ctx.stroke(); ctx.restore();
    }

    // Inner petals
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate((i / 4) * Math.PI * 2 - Math.PI / 4);
      const pg = ctx.createLinearGradient(0, 0, 0, -r * 0.52);
      pg.addColorStop(0, this._lighten(colors.primary, 0.2)); pg.addColorStop(1, this._lighten(colors.secondary, 0.5));
      ctx.fillStyle = pg; ctx.strokeStyle = this._lighten(colors.secondary, 0.4); ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.05);
      ctx.bezierCurveTo(-r * 0.1, -r * 0.1, -r * 0.1, -r * 0.4, 0, -r * 0.5);
      ctx.bezierCurveTo(r * 0.1, -r * 0.4, r * 0.1, -r * 0.1, 0, r * 0.05);
      ctx.fill(); ctx.stroke(); ctx.restore();
    }

    // Golden center
    ctx.shadowColor = '#ffee44'; ctx.shadowBlur = 18;
    const cGr = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.22);
    cGr.addColorStop(0, '#ffffa0'); cGr.addColorStop(0.4, '#ffdd00');
    cGr.addColorStop(0.8, '#cc9900'); cGr.addColorStop(1, '#8a6200');
    ctx.fillStyle = cGr; ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

    // Stamens
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 4;
      ctx.fillStyle = i % 2 === 0 ? '#ffdd00' : '#ff8800';
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.13, Math.sin(a) * r * 0.13, r * 0.034, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

    // Stem
    const stemGr = ctx.createLinearGradient(0, r * 0.25, 0, r * 0.88);
    stemGr.addColorStop(0, '#226622'); stemGr.addColorStop(1, '#0a3a0a');
    ctx.strokeStyle = stemGr; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r * 0.25); ctx.lineTo(0, r * 0.82); ctx.stroke();

    // Water ripples
    ctx.strokeStyle = this._alpha(colors.secondary, 0.28); ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath(); ctx.ellipse(0, r * 0.82, r * i * 0.22, r * 0.055, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // ── CARD SYMBOLS ────────────────────────────────────────────
  _drawCard(ctx, r, colors, label) {
    // Stone tablet
    const stoneGr = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 0, 0, 0, r * 0.9);
    stoneGr.addColorStop(0, this._lighten(colors.primary, 0.28));
    stoneGr.addColorStop(0.6, colors.primary);
    stoneGr.addColorStop(1, this._darken(colors.primary, 0.3));
    const w = r * 1.1, h = r * 1.35;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r * 0.15);
    ctx.fillStyle = stoneGr; ctx.fill();
    ctx.strokeStyle = colors.secondary; ctx.lineWidth = 2; ctx.stroke();
    const ins = r * 0.1;
    ctx.strokeStyle = this._darken(colors.secondary, 0.5); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.roundRect(-w / 2 + ins, -h / 2 + ins, w - ins * 2, h - ins * 2, r * 0.1); ctx.stroke();

    // Main letter
    const lGr = ctx.createLinearGradient(-r * 0.3, -r * 0.5, r * 0.3, r * 0.5);
    lGr.addColorStop(0, '#ffffa0'); lGr.addColorStop(0.3, colors.secondary);
    lGr.addColorStop(0.6, colors.primary); lGr.addColorStop(1, this._darken(colors.secondary, 0.5));
    ctx.shadowColor = colors.glow; ctx.shadowBlur = 18;
    const fs = r * 1.28;
    ctx.font = `bold ${fs}px Cinzel Decorative, Cinzel, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = this._darken(colors.secondary, 0.4); ctx.lineWidth = 4; ctx.strokeText(label, 0, -r * 0.05);
    ctx.fillStyle = lGr; ctx.fillText(label, 0, -r * 0.05);
    ctx.shadowBlur = 0;

    // Corner diamonds
    const cS = r * 0.18;
    const crns = [[-w/2+ins*0.5,-h/2+ins*0.5],[w/2-ins*0.5,-h/2+ins*0.5],[-w/2+ins*0.5,h/2-ins*0.5],[w/2-ins*0.5,h/2-ins*0.5]];
    ctx.fillStyle = colors.secondary; ctx.shadowColor = colors.glow; ctx.shadowBlur = 5;
    for (const [cx, cy] of crns) {
      ctx.beginPath(); ctx.moveTo(cx, cy - cS * 0.5); ctx.lineTo(cx + cS * 0.5, cy); ctx.lineTo(cx, cy + cS * 0.5); ctx.lineTo(cx - cS * 0.5, cy); ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Small corner label
    ctx.font = `bold ${r * 0.28}px Cinzel, serif`;
    ctx.fillStyle = colors.secondary; ctx.shadowColor = colors.glow; ctx.shadowBlur = 4;
    ctx.fillText(label, -w / 2 + r * 0.32, -h / 2 + r * 0.3);
    ctx.save(); ctx.rotate(Math.PI); ctx.fillText(label, -w / 2 + r * 0.32, -h / 2 + r * 0.3); ctx.restore();
    ctx.shadowBlur = 0;
  }

  // ── BADGES ──────────────────────────────────────────────────
  _drawWildBadge(ctx, x, y, size, colors) {
    const w = size * 0.6, h = size * 0.2, rh = h / 2;
    ctx.shadowColor = colors.glow; ctx.shadowBlur = 15;
    const bg = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y);
    bg.addColorStop(0, '#5a0a00'); bg.addColorStop(0.3, colors.secondary);
    bg.addColorStop(0.5, '#ff6600'); bg.addColorStop(0.7, colors.secondary); bg.addColorStop(1, '#5a0a00');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(x - w/2 + rh, y - rh); ctx.lineTo(x + w/2 - rh, y - rh);
    ctx.lineTo(x + w/2, y);           ctx.lineTo(x + w/2 - rh, y + rh);
    ctx.lineTo(x - w/2 + rh, y + rh); ctx.lineTo(x - w/2, y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff9e0'; ctx.font = `bold ${h * 0.62}px Cinzel, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('WILD', x, y);
    ctx.shadowBlur = 0;
  }

  _drawScatterBadge(ctx, x, y, size, colors) {
    const w = size * 0.72, h = size * 0.2, rh = h / 2;
    ctx.shadowColor = colors.glow; ctx.shadowBlur = 15;
    const bg = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y);
    bg.addColorStop(0, '#1a0044'); bg.addColorStop(0.3, colors.secondary);
    bg.addColorStop(0.5, colors.primary); bg.addColorStop(0.7, colors.secondary); bg.addColorStop(1, '#1a0044');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(x - w/2 + rh, y - rh); ctx.lineTo(x + w/2 - rh, y - rh);
    ctx.lineTo(x + w/2, y);            ctx.lineTo(x + w/2 - rh, y + rh);
    ctx.lineTo(x - w/2 + rh, y + rh); ctx.lineTo(x - w/2, y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = colors.border || '#cc88ff'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff0ff'; ctx.font = `bold ${h * 0.58}px Cinzel, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SCATTER', x, y);
    ctx.shadowBlur = 0;
  }

  // ── UTILITIES ───────────────────────────────────────────────
  _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  }

  _darken(hex, amount) {
    const c = this._parseColor(hex);
    return `rgba(${Math.floor(c[0]*amount)},${Math.floor(c[1]*amount)},${Math.floor(c[2]*amount)},1)`;
  }

  _lighten(hex, amount) {
    const c = this._parseColor(hex);
    return `rgba(${Math.min(255,Math.floor(c[0]+(255-c[0])*amount))},${Math.min(255,Math.floor(c[1]+(255-c[1])*amount))},${Math.min(255,Math.floor(c[2]+(255-c[2])*amount))},1)`;
  }

  _mix(hex1, hex2, t) {
    const a = this._parseColor(hex1), b = this._parseColor(hex2);
    return `rgba(${Math.round(a[0]*(1-t)+b[0]*t)},${Math.round(a[1]*(1-t)+b[1]*t)},${Math.round(a[2]*(1-t)+b[2]*t)},1)`;
  }

  _alpha(hex, a) {
    const c = this._parseColor(hex);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  _parseColor(hex) {
    if (!hex || !hex.startsWith('#')) return [128, 128, 128];
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
}
