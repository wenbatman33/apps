// 共用 UI 元件（全部走 PixiJS 繪製，不使用 DOM）
import * as PIXI from '../../vendor/pixi.min.mjs';
import { texGlow } from './textures.js';

export function label(text, size, color = 0xffffff, weight = '700') {
  const t = new PIXI.Text({
    text,
    style: {
      fontFamily: '"Noto Sans TC","PingFang TC","Microsoft JhengHei",Arial,sans-serif',
      fontSize: size, fontWeight: weight, fill: color, align: 'center',
      letterSpacing: 1,
    },
  });
  t.anchor.set(0.5);
  t.resolution = 2;
  return t;
}

// 霓虹按鈕：圓角外框 + 發光底，支援 disabled 與 pressed 狀態
export class NeonButton extends PIXI.Container {
  constructor({ text, w = 260, h = 74, color = 0x35f0ff, size = 26, onClick, filled = false, icon = null }) {
    super();
    this.w = w; this.h = h; this.color = color; this.filled = filled;
    this.enabled = true;

    this.glow = new PIXI.Sprite(texGlow(128));
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.width = w * 1.5; this.glow.height = h * 2.4;
    this.glow.alpha = 0.1;
    this.glow.tint = color;
    this.addChild(this.glow);

    this.bg = new PIXI.Graphics();
    this.addChild(this.bg);

    this.txt = label(text ?? '', size, filled ? 0x05060f : 0xffffff);
    if (icon) { this.txt.x = 14; icon.x = -w / 2 + 34; this.addChild(icon); this.icon = icon; }
    this.addChild(this.txt);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new PIXI.Rectangle(-w / 2, -h / 2, w, h);
    this.onClick = onClick;

    this.on('pointerdown', () => { if (this.enabled) { this.pressed = true; this.redraw(); } });
    this.on('pointerupoutside', () => { this.pressed = false; this.redraw(); });
    this.on('pointerup', () => {
      if (!this.enabled) return;
      this.pressed = false; this.redraw();
      this.onClick?.();
    });
    this.on('pointerover', () => { this.hover = true; this.redraw(); });
    this.on('pointerout', () => { this.hover = false; this.pressed = false; this.redraw(); });

    this.redraw();
  }

  setText(t) { this.txt.text = t; }

  setFilled(v) {
    if (this.filled === v) return;
    this.filled = v;
    this.txt.style.fill = v ? 0x05060f : 0xffffff;
    this.redraw();
  }

  setEnabled(v) {
    this.enabled = v;
    this.alpha = v ? 1 : 0.36;
    this.cursor = v ? 'pointer' : 'default';
    this.redraw();
  }

  redraw() {
    const { w, h, color } = this;
    const g = this.bg;
    const k = this.pressed ? 0.94 : (this.hover ? 1.03 : 1);
    this.scale.set(k);
    g.clear();
    const r = h / 2;
    if (this.filled) {
      g.roundRect(-w / 2, -h / 2, w, h, r).fill({ color, alpha: this.hover ? 1 : 0.92 });
    } else {
      g.roundRect(-w / 2, -h / 2, w, h, r).fill({ color: 0xffffff, alpha: this.hover ? 0.12 : 0.06 });
      g.roundRect(-w / 2, -h / 2, w, h, r).stroke({ width: 2.5, color, alpha: 0.95 });
    }
    this.glow.alpha = this.hover ? 0.18 : 0.09;
  }
}

// 半透明面板（結算、暫停共用）
export function panel(w, h, color = 0x35f0ff) {
  const c = new PIXI.Container();
  const g = new PIXI.Graphics();
  g.roundRect(-w / 2, -h / 2, w, h, 28).fill({ color: 0x080b16, alpha: 0.94 });
  g.roundRect(-w / 2, -h / 2, w, h, 28).stroke({ width: 2.5, color, alpha: 0.7 });
  const glow = new PIXI.Sprite(texGlow(128));
  glow.anchor.set(0.5);
  glow.blendMode = 'add';
  glow.width = w * 1.3; glow.height = h * 1.3;
  glow.alpha = 0.08; glow.tint = color;
  c.addChild(glow, g);
  return c;
}

// 星星（結算用）
export function star(size, filled, color = 0xffd453) {
  const g = new PIXI.Graphics();
  const spikes = 5, outer = size, inner = size * 0.46;
  let rot = -Math.PI / 2;
  g.moveTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
  for (let i = 0; i < spikes; i++) {
    rot += Math.PI / spikes;
    g.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
    rot += Math.PI / spikes;
    g.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
  }
  g.closePath();
  if (filled) g.fill({ color }).stroke({ width: 2, color: 0xfff2c2, alpha: 0.9 });
  else g.fill({ color: 0xffffff, alpha: 0.07 }).stroke({ width: 2, color: 0xffffff, alpha: 0.22 });
  return g;
}

// 進度條
export class Bar extends PIXI.Container {
  constructor(w, h, color) {
    super();
    this.w = w; this.h = h; this.color = color;
    this.g = new PIXI.Graphics();
    this.addChild(this.g);
    this.set(0);
  }
  set(ratio, color) {
    if (color !== undefined) this.color = color;
    const r = Math.max(0, Math.min(1, ratio));
    const { w, h } = this;
    this.g.clear();
    this.g.roundRect(-w / 2, -h / 2, w, h, h / 2).fill({ color: 0xffffff, alpha: 0.1 });
    if (r > 0) this.g.roundRect(-w / 2, -h / 2, w * r, h, h / 2).fill({ color: this.color, alpha: 0.95 });
  }
}
