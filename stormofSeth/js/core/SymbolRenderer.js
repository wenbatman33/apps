/**
 * SymbolRenderer - Canvas-based symbol drawing engine
 *
 * Each symbol is drawn procedurally using canvas 2D API.
 * When a theme provides an `image` URL, that overrides the canvas drawing.
 * This allows:
 *   1. Instant playable demo without assets
 *   2. Easy swap-in of custom art by setting `image` in theme.json
 *
 * Godot equivalent: Sprite2D nodes inside a SlotSymbol scene,
 * with a SymbolAtlas resource that maps symbol IDs to textures.
 */

class SymbolRenderer {
  constructor() {
    this.imageCache = {};
    this.symbolSize = 128;
  }

  /**
   * Preload images from theme (if any image paths are set)
   */
  async preloadThemeImages(symbols) {
    const promises = symbols.map(sym => {
      if (sym.image) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { this.imageCache[sym.id] = img; resolve(); };
          img.onerror = () => resolve(); // fallback to canvas draw
          img.src = sym.image;
        });
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
  }

  /**
   * Draw a symbol onto a canvas context
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} symbolDef - symbol definition from theme.json
   * @param {number} x - center x
   * @param {number} y - center y
   * @param {number} size - symbol size
   * @param {number} alpha - opacity (0-1)
   * @param {boolean} highlighted - draw highlight glow
   */
  drawSymbol(ctx, symbolDef, x, y, size, alpha = 1, highlighted = false) {
    ctx.save();
    ctx.globalAlpha = alpha;

    // Use image if available
    if (this.imageCache[symbolDef.id]) {
      const img = this.imageCache[symbolDef.id];
      const half = size / 2;
      ctx.drawImage(img, x - half, y - half, size, size);
      if (highlighted) this._drawHighlight(ctx, x, y, size, symbolDef.colors.glow);
      ctx.restore();
      return;
    }

    // Canvas procedural drawing
    const half = size / 2;
    const pad = size * 0.08;
    const inner = half - pad;

    // Background panel
    this._drawSymbolBg(ctx, x, y, size, symbolDef.colors, highlighted);

    // Draw symbol-specific art
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

    // Type badges
    if (symbolDef.type === 'wild') this._drawWildBadge(ctx, x, y + inner * 0.7, size, symbolDef.colors);
    if (symbolDef.type === 'scatter') this._drawScatterBadge(ctx, x, y + inner * 0.7, size, symbolDef.colors);

    ctx.restore();
  }

  _drawSymbolBg(ctx, x, y, size, colors, highlighted) {
    const half = size / 2;
    const r = size * 0.08;

    // Outer glow
    if (highlighted) {
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 30;
    }

    // Background gradient
    const bg = ctx.createRadialGradient(x, y - half * 0.2, 0, x, y, half);
    bg.addColorStop(0, this._darken(colors.primary, 0.8));
    bg.addColorStop(1, this._darken(colors.primary, 0.2));

    ctx.beginPath();
    this._roundRect(ctx, x - half, y - half, size, size, r);
    ctx.fillStyle = bg;
    ctx.fill();

    // Border
    ctx.strokeStyle = highlighted ? colors.glow : colors.border;
    ctx.lineWidth = highlighted ? 3 : 1.5;
    ctx.shadowBlur = highlighted ? 20 : 0;
    ctx.shadowColor = colors.glow;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawHighlight(ctx, x, y, size, glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 40;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3;
    const half = size / 2;
    ctx.beginPath();
    this._roundRect(ctx, x - half, y - half, size, size, size * 0.08);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // --- Seth (Wild) - Jackal head silhouette ---
  _drawSeth(ctx, r, colors) {
    ctx.strokeStyle = colors.secondary;
    ctx.fillStyle = colors.secondary;
    ctx.lineWidth = 2;

    // Body
    const gr = ctx.createLinearGradient(0, -r, 0, r);
    gr.addColorStop(0, colors.secondary);
    gr.addColorStop(0.5, colors.primary);
    gr.addColorStop(1, this._darken(colors.primary, 0.5));

    // Jackal head outline
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);        // top of ears
    ctx.lineTo(-r * 0.18, -r * 0.65); // left ear tip
    ctx.lineTo(-r * 0.35, -r * 0.4); // left ear base
    ctx.lineTo(-r * 0.45, -r * 0.1); // left jaw
    ctx.lineTo(-r * 0.38, r * 0.2);  // left chin
    ctx.lineTo(0, r * 0.35);          // chin center
    ctx.lineTo(r * 0.38, r * 0.2);
    ctx.lineTo(r * 0.45, -r * 0.1);
    ctx.lineTo(r * 0.35, -r * 0.4);
    ctx.lineTo(r * 0.18, -r * 0.65);
    ctx.closePath();
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = colors.glow;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eyes - glowing
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 15;
    ctx.fillStyle = colors.glow;
    ctx.beginPath();
    ctx.ellipse(-r * 0.18, -r * 0.2, r * 0.1, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.18, -r * 0.2, r * 0.1, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Crown
    ctx.fillStyle = colors.glow;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.62);
    ctx.lineTo(0, -r * 0.95);
    ctx.lineTo(r * 0.2, -r * 0.62);
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Snout / muzzle
    ctx.fillStyle = this._darken(colors.primary, 0.6);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.22, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lightning bolt overlay
    ctx.fillStyle = colors.glow;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(r * 0.0, r * 0.5);
    ctx.lineTo(r * 0.15, r * 0.7);
    ctx.lineTo(r * 0.04, r * 0.7);
    ctx.lineTo(r * 0.12, r * 0.9);
    ctx.lineTo(-r * 0.05, r * 0.72);
    ctx.lineTo(r * 0.06, r * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // --- Storm (Scatter) - Storm cloud with lightning ---
  _drawStorm(ctx, r, colors) {
    // Storm cloud
    ctx.fillStyle = colors.primary;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 20;

    // Cloud puffs
    const puffs = [
      [0, -r * 0.2, r * 0.32],
      [-r * 0.32, -r * 0.05, r * 0.24],
      [r * 0.3, -r * 0.05, r * 0.24],
      [-r * 0.5, r * 0.1, r * 0.2],
      [r * 0.5, r * 0.1, r * 0.2],
    ];
    for (const [cx, cy, cr] of puffs) {
      const cg = ctx.createRadialGradient(cx, cy - cr * 0.3, 0, cx, cy, cr);
      cg.addColorStop(0, colors.secondary);
      cg.addColorStop(1, colors.primary);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Cloud base
    ctx.fillStyle = colors.primary;
    ctx.fillRect(-r * 0.7, r * 0.0, r * 1.4, r * 0.35);

    // Lightning bolts
    const bolts = [[-r * 0.3, r * 0.35], [r * 0.15, r * 0.35], [-r * 0.05, r * 0.45]];
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffee55';
    for (const [bx, by] of bolts) {
      const scale = 0.55;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + r * 0.12 * scale, by + r * 0.22 * scale);
      ctx.lineTo(bx + r * 0.04 * scale, by + r * 0.22 * scale);
      ctx.lineTo(bx + r * 0.14 * scale, by + r * 0.48 * scale);
      ctx.lineTo(bx - r * 0.04 * scale, by + r * 0.26 * scale);
      ctx.lineTo(bx + r * 0.04 * scale, by + r * 0.26 * scale);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // --- Pharaoh - Crown and face ---
  _drawPharaoh(ctx, r, colors) {
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, colors.secondary);
    g.addColorStop(1, colors.primary);

    // Double crown (pschent)
    ctx.fillStyle = colors.primary;
    // White crown (upper)
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, -r * 0.1);
    ctx.lineTo(-r * 0.18, -r * 0.85);
    ctx.bezierCurveTo(-r * 0.1, -r * 0.9, r * 0.1, -r * 0.9, r * 0.18, -r * 0.85);
    ctx.lineTo(r * 0.22, -r * 0.1);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Red crown base
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.1, r * 0.42, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fillStyle = this._mix(colors.primary, '#cc0000', 0.5);
    ctx.fill();
    ctx.stroke();

    // Face
    ctx.fillStyle = '#d4a84b';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.3, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Eyes - kohl style
    ctx.fillStyle = '#000';
    ctx.shadowColor = colors.secondary;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.ellipse(-r * 0.12, r * 0.12, r * 0.08, r * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.12, r * 0.12, r * 0.08, r * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye accent lines
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, r * 0.12); ctx.lineTo(-r * 0.04, r * 0.12);
    ctx.moveTo(r * 0.04, r * 0.12); ctx.lineTo(r * 0.22, r * 0.12);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Uraeus (cobra) on crown
    ctx.fillStyle = '#cc0000';
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -r * 0.28, r * 0.07, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.35); ctx.lineTo(0, -r * 0.5);
    ctx.stroke();

    // Beard
    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, r * 0.56);
    ctx.lineTo(0, r * 0.72);
    ctx.lineTo(r * 0.08, r * 0.56);
    ctx.fill();
  }

  // --- Eye of Ra ---
  _drawEye(ctx, r, colors) {
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 25;

    // Eye white
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, 0);
    ctx.bezierCurveTo(-r * 0.7, -r * 0.45, r * 0.7, -r * 0.45, r * 0.7, 0);
    ctx.bezierCurveTo(r * 0.7, r * 0.45, -r * 0.7, r * 0.45, -r * 0.7, 0);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Iris
    const ig = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.28);
    ig.addColorStop(0, '#111');
    ig.addColorStop(0.6, colors.primary);
    ig.addColorStop(1, colors.secondary);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = ig;
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Eye gleam
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(-r * 0.07, -r * 0.07, r * 0.055, 0, Math.PI * 2);
    ctx.fill();

    // Eye outline
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, 0);
    ctx.bezierCurveTo(-r * 0.7, -r * 0.45, r * 0.7, -r * 0.45, r * 0.7, 0);
    ctx.bezierCurveTo(r * 0.7, r * 0.45, -r * 0.7, r * 0.45, -r * 0.7, 0);
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eye of Ra decorations (kohl lines)
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 2.5;
    // Left kohl
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, 0);
    ctx.lineTo(-r * 0.9, r * 0.2);
    ctx.lineTo(-r * 0.7, r * 0.3);
    ctx.stroke();
    // Right kohl
    ctx.beginPath();
    ctx.moveTo(r * 0.7, 0);
    ctx.lineTo(r * 0.9, -r * 0.25);
    ctx.stroke();
    // Bottom teardrop
    ctx.beginPath();
    ctx.moveTo(0, r * 0.42);
    ctx.lineTo(r * 0.1, r * 0.7);
    ctx.lineTo(-r * 0.1, r * 0.7);
    ctx.closePath();
    ctx.fillStyle = colors.secondary;
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  // --- Ankh ---
  _drawAnkh(ctx, r, colors) {
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, colors.secondary);
    g.addColorStop(1, colors.primary);

    ctx.fillStyle = g;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;

    // Cross vertical bar
    const barW = r * 0.2;
    ctx.beginPath();
    ctx.roundRect(-barW / 2, -r * 0.15, barW, r * 0.95, barW * 0.4);
    ctx.fill();
    ctx.stroke();

    // Cross horizontal bar
    ctx.beginPath();
    ctx.roundRect(-r * 0.65, -r * 0.15 - barW / 2, r * 1.3, barW, barW * 0.4);
    ctx.fill();
    ctx.stroke();

    // Top loop
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.52, r * 0.3, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'transparent';
    ctx.strokeStyle = g;
    ctx.lineWidth = barW;
    ctx.stroke();

    // Inner loop cutout
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.52, r * 0.15, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fillStyle = this._darken(colors.primary, 0.2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Gold dots
    ctx.fillStyle = colors.border;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.55, -r * 0.15 + Math.sin(a) * r * 0.02, r * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Scarab ---
  _drawScarab(ctx, r, colors) {
    const g = ctx.createRadialGradient(0, -r * 0.1, 0, 0, 0, r);
    g.addColorStop(0, colors.secondary);
    g.addColorStop(0.6, colors.primary);
    g.addColorStop(1, this._darken(colors.primary, 0.4));

    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 15;

    // Wings - left
    ctx.beginPath();
    ctx.moveTo(-r * 0.05, -r * 0.05);
    ctx.bezierCurveTo(-r * 0.6, -r * 0.4, -r * 0.85, 0, -r * 0.7, r * 0.4);
    ctx.bezierCurveTo(-r * 0.55, r * 0.55, -r * 0.2, r * 0.4, -r * 0.05, r * 0.1);
    ctx.fillStyle = this._mix(colors.primary, '#0044aa', 0.4);
    ctx.fill();

    // Wings - right
    ctx.beginPath();
    ctx.moveTo(r * 0.05, -r * 0.05);
    ctx.bezierCurveTo(r * 0.6, -r * 0.4, r * 0.85, 0, r * 0.7, r * 0.4);
    ctx.bezierCurveTo(r * 0.55, r * 0.55, r * 0.2, r * 0.4, r * 0.05, r * 0.1);
    ctx.fillStyle = this._mix(colors.primary, '#0044aa', 0.4);
    ctx.fill();

    // Wing veins
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.05, 0);
      ctx.quadraticCurveTo(-r * (0.3 + t * 0.4), r * (-0.2 + t * 0.3), -r * (0.4 + t * 0.2), r * t * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.05, 0);
      ctx.quadraticCurveTo(r * (0.3 + t * 0.4), r * (-0.2 + t * 0.3), r * (0.4 + t * 0.2), r * t * 0.4);
      ctx.stroke();
    }

    // Body
    ctx.beginPath();
    ctx.ellipse(0, r * 0.05, r * 0.28, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.48, r * 0.2, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.secondary;
    ctx.fill();
    ctx.stroke();

    // Antennae
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, -r * 0.56);
    ctx.lineTo(-r * 0.24, -r * 0.82);
    ctx.moveTo(r * 0.08, -r * 0.56);
    ctx.lineTo(r * 0.24, -r * 0.82);
    ctx.stroke();

    // Body segments
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, r * (-0.2 + i * 0.25), r * 0.24, r * 0.04, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // --- Lotus flower ---
  _drawLotus(ctx, r, colors) {
    const petals = 8;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
      const layer = i < petals / 2 ? 0.8 : 1.0;

      ctx.save();
      ctx.rotate(a);
      const pg = ctx.createLinearGradient(0, 0, 0, -r * layer);
      pg.addColorStop(0, colors.primary);
      pg.addColorStop(1, colors.secondary);
      ctx.fillStyle = pg;
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-r * 0.2, -r * 0.3 * layer, -r * 0.18, -r * 0.7 * layer, 0, -r * 0.8 * layer);
      ctx.bezierCurveTo(r * 0.18, -r * 0.7 * layer, r * 0.2, -r * 0.3 * layer, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Center
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.2);
    cg.addColorStop(0, '#ffee88');
    cg.addColorStop(1, '#cc9900');
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = cg;
    ctx.shadowColor = '#ffee88';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Stamens
    ctx.fillStyle = '#ffcc00';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1, r * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Card symbol (A, K, Q, J) ---
  _drawCard(ctx, r, colors, label) {
    const g = ctx.createLinearGradient(-r * 0.5, -r, r * 0.5, r);
    g.addColorStop(0, colors.secondary);
    g.addColorStop(1, colors.primary);

    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12;

    // Letter
    const fontSize = r * 1.4;
    ctx.font = `bold ${fontSize}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = g;
    ctx.fillText(label, 0, 0);

    // Outline
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.strokeText(label, 0, 0);

    // Corner small labels
    ctx.font = `bold ${r * 0.3}px Cinzel, serif`;
    ctx.fillStyle = colors.secondary;
    ctx.fillText(label, -r * 0.55, -r * 0.65);
    ctx.save();
    ctx.rotate(Math.PI);
    ctx.fillText(label, -r * 0.55, -r * 0.65);
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  // --- Badges ---
  _drawWildBadge(ctx, x, y, size, colors) {
    const w = size * 0.55, h = size * 0.18;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12;
    const bg = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y);
    bg.addColorStop(0, this._darken(colors.primary, 0.6));
    bg.addColorStop(0.5, colors.secondary);
    bg.addColorStop(1, this._darken(colors.primary, 0.6));
    ctx.fillStyle = bg;
    ctx.beginPath();
    this._roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${h * 0.65}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WILD', x, y);
    ctx.shadowBlur = 0;
  }

  _drawScatterBadge(ctx, x, y, size, colors) {
    const w = size * 0.68, h = size * 0.18;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12;
    const bg = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y);
    bg.addColorStop(0, this._darken(colors.primary, 0.6));
    bg.addColorStop(0.5, colors.secondary);
    bg.addColorStop(1, this._darken(colors.primary, 0.6));
    ctx.fillStyle = bg;
    ctx.beginPath();
    this._roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${h * 0.62}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCATTER', x, y);
    ctx.shadowBlur = 0;
  }

  // --- Utilities ---
  _roundRect(ctx, x, y, w, h, r) {
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

  _darken(hex, amount) {
    const c = this._parseColor(hex);
    return `rgba(${Math.floor(c[0] * amount)},${Math.floor(c[1] * amount)},${Math.floor(c[2] * amount)},1)`;
  }

  _mix(hex1, hex2, t) {
    const a = this._parseColor(hex1), b = this._parseColor(hex2);
    return `rgba(${Math.round(a[0] * (1 - t) + b[0] * t)},${Math.round(a[1] * (1 - t) + b[1] * t)},${Math.round(a[2] * (1 - t) + b[2] * t)},1)`;
  }

  _parseColor(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
}
