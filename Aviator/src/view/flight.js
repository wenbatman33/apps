// 飛行畫面：星空/放射背景 + 紅色軌跡曲線 + 飛機 + 倍數文字 + 等待動畫
import { Container, Graphics, Rectangle, Sprite } from '../../vendor/pixi.min.mjs';
import { COLORS, RULES } from '../config.js';
import { PHASE } from '../core/engine.js';
import { curveFill, sunburst, planeFallback, radialGlow } from './textures.js';
import { txt, panelBg } from './ui.js';

export class FlightView extends Container {
  constructor(engine, L, planeTexture) {
    super();
    this.engine = engine;
    this.L = L;
    this.w = 800; this.h = 500;
    this.time = 0;
    this.crashAnim = 0;
    this.shake = 0;

    // 底：圓角深色 + 放射光
    this.bgG = new Graphics();
    this.addChild(this.bgG);

    this.burst = new Sprite(sunburst());
    this.burst.anchor.set(0.5);
    this.burst.alpha = 0.5;
    this.addChild(this.burst);

    this.stars = new Graphics();
    this.addChild(this.stars);
    this._stars = Array.from({ length: 70 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.4, s: Math.random() * 0.6 + 0.25,
    }));

    // 座標軸刻度（會隨飛行滾動）
    this.axis = new Graphics();
    this.addChild(this.axis);

    // 曲線填充（用 mask 做垂直漸層）
    this.fillSprite = new Sprite(curveFill());
    this.fillMask = new Graphics();
    this.fillSprite.mask = this.fillMask;
    this.addChild(this.fillSprite, this.fillMask);

    this.curve = new Graphics();
    this.addChild(this.curve);

    this.glow = new Sprite(radialGlow('plane', 0xff3b57, 0.55));
    this.glow.anchor.set(0.5);
    this.glow.alpha = 0;
    this.addChild(this.glow);

    this.plane = new Sprite(planeTexture || planeFallback());
    this.plane.anchor.set(0.5);
    this.addChild(this.plane);

    // 中央倍數
    this.mult = txt('1.00x', 82, COLORS.text, '800');
    this.mult.anchor.set(0.5);
    this.addChild(this.mult);

    // 狀態文字（等待 / 飛走）
    this.status = txt('', 20, COLORS.text, '700');
    this.status.anchor.set(0.5);
    this.addChild(this.status);

    // 等待進度條
    this.barBg = new Graphics();
    this.bar = new Graphics();
    this.addChild(this.barBg, this.bar);

    // 等待時旋轉的螺旋槳圖示
    this.spinner = new Graphics();
    this.addChild(this.spinner);

    // DEV 拖曳提示十字
    this.devHint = new Graphics();
    this.devHint.visible = false;
    this.addChild(this.devHint);
  }

  // DEV：直接拖曳畫面決定飛機巡航點
  enableDevDrag(on, onChange) {
    this.eventMode = on ? 'static' : 'none';
    this.hitArea = on ? new Rectangle(0, 0, this.w, this.h) : null;
    this.devHint.visible = on;
    if (on && !this._devBound) {
      this._devBound = true;
      const move = (e) => {
        if (!this._devDrag) return;
        const p = e.getLocalPosition(this);
        this._onDevChange?.(
          Math.max(0.3, Math.min(0.97, p.x / this.w)),
          Math.max(0.03, Math.min(0.7, p.y / this.h)),
        );
      };
      this.on('pointerdown', (e) => { this._devDrag = true; move(e); });
      this.on('globalpointermove', move);
      this.on('pointerup', () => { this._devDrag = false; });
      this.on('pointerupoutside', () => { this._devDrag = false; });
    }
    this._onDevChange = onChange;
  }

  resize(w, h, L) {
    this.w = w; this.h = h; this.L = L;
    if (this.hitArea) this.hitArea = new Rectangle(0, 0, w, h);
    this.burst.position.set(w * L.originX, h * L.originY);
    this.burst.width = this.burst.height = Math.max(w, h) * 2.1;
    this.mult.style.fontSize = L.multSize;
    this.status.style.fontSize = L.statusSize;
    this.plane.scale.set((h / 500) * L.planeScale);
    this.glow.width = this.glow.height = h * 0.5;
    this.fillSprite.width = w;
    this.fillSprite.height = h;
    this.drawBg();
  }

  drawBg() {
    const { w, h } = this;
    panelBg(this.bgG, w, h, 12, 0x0e0e12, null);
    this.stars.clear();
    for (const s of this._stars) {
      this.stars.circle(s.x * w, s.y * h * 0.92, s.r).fill({ color: 0xffffff, alpha: 0.35 });
    }
  }

  // 飛機位置（設計座標）
  planePos(tMs, phase) {
    const { w, h, L } = this;
    const ox = w * L.originX, oy = h * L.originY;
    const tx = w * L.planeX, ty = h * L.planeY;
    const p = Math.max(0, Math.min(1, tMs / RULES.reachMs));
    const e = 1 - (1 - p) ** 2.2;
    let x = ox + (tx - ox) * e;
    let y = oy + (ty - oy) * (1 - (1 - p) ** 1.5);
    if (p >= 1) {
      // 抵達後在巡航點附近盤旋
      const t = this.time / 1000;
      x += Math.sin(t * 1.7) * w * 0.018;
      y += Math.sin(t * 2.3 + 1) * h * 0.035;
    }
    return { x, y, p };
  }

  update(dt) {
    const { engine, w, h, L } = this;
    this.time += dt;
    const phase = engine.phase;
    const flying = phase === PHASE.FLYING;
    const crashed = phase === PHASE.CRASHED;

    // 背景放射持續旋轉，飛行中加速
    this.burst.rotation += dt * (flying ? 0.00022 : 0.00007);
    this.stars.alpha = 0.6 + Math.sin(this.time / 700) * 0.15;

    // 抖動（起飛與飛走）
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 0.004);
    const sx = (Math.random() - 0.5) * this.shake * 10;
    const sy = (Math.random() - 0.5) * this.shake * 10;
    this.curve.position.set(sx, sy);
    this.fillSprite.position.set(sx, sy);
    this.plane.position.set(sx, sy);

    const showFlight = flying || crashed;
    this.curve.visible = this.fillSprite.visible = showFlight && this.crashAnim < 0.6;
    this.plane.visible = showFlight;
    this.glow.visible = showFlight;

    if (flying) {
      this.crashAnim = 0;
      const pos = this.planePos(engine.t, phase);
      this.drawCurve(pos);
      this.plane.position.set(pos.x + sx, pos.y + sy);
      const tilt = pos.p < 1 ? -0.35 * (1 - pos.p) : Math.sin(this.time / 420) * 0.05;
      this.plane.rotation = tilt;
      this.glow.position.set(pos.x, pos.y);
      this.glow.alpha = 0.35;
      this.mult.text = `${engine.mult.toFixed(2)}x`;
      this.mult.style.fill = COLORS.text;
      this.mult.scale.set(1 + Math.min(0.12, (engine.mult - 1) * 0.006));
      this.status.text = '';
      this.setWaitVisible(false);
    } else if (crashed) {
      // 飛走：飛機加速衝出畫面右上
      this.crashAnim += dt / 900;
      const k = this.crashAnim;
      const pos = this.planePos(RULES.reachMs, phase);
      this.plane.position.set(pos.x + w * 1.15 * k * k + sx, pos.y - h * 0.35 * k * k + sy);
      this.plane.rotation = -0.12 * k;
      this.plane.alpha = Math.max(0, 1 - k * 1.1);
      this.glow.alpha = Math.max(0, 0.35 - k * 0.5);
      this.mult.text = `${engine.mult.toFixed(2)}x`;
      this.mult.style.fill = COLORS.red;
      this.status.text = 'FLEW AWAY!';
      this.status.style.fill = COLORS.red;
      this.status.position.set(w / 2, h * L.multY - L.multSize * 0.82);
      this.setWaitVisible(false);
      if (this.crashAnim > 0.6) { this.curve.clear(); this.fillMask.clear(); }
    } else {
      // 等待下一回合
      this.plane.alpha = 1;
      this.curve.clear();
      this.fillMask.clear();
      this.mult.text = '';
      this.status.text = '等待下一回合';
      this.status.style.fill = COLORS.text;
      this.status.position.set(w / 2, h * L.multY + L.multSize * 0.35);
      this.setWaitVisible(true);
      this.drawWait();
    }

    this.mult.position.set(w / 2, h * L.multY);
    this.drawAxis(flying ? engine.t : 0);

    if (this.devHint.visible) {
      const hx = w * L.planeX, hy = h * L.planeY;
      this.devHint.clear();
      this.devHint.moveTo(hx - 18, hy).lineTo(hx + 18, hy).stroke({ width: 1.5, color: 0xffd60a, alpha: 0.9 });
      this.devHint.moveTo(hx, hy - 18).lineTo(hx, hy + 18).stroke({ width: 1.5, color: 0xffd60a, alpha: 0.9 });
      this.devHint.circle(hx, hy, 22).stroke({ width: 1.5, color: 0xffd60a, alpha: 0.5 });
    }
  }

  setWaitVisible(v) {
    this.barBg.visible = this.bar.visible = this.spinner.visible = v;
  }

  drawWait() {
    const { w, h, L, engine } = this;
    const bw = Math.min(w * 0.45, 340), bh = 6;
    const bx = (w - bw) / 2, by = h * L.multY + L.multSize * 0.85;
    panelBg(this.barBg, bw, bh, 3, 0x2a2b2e, null);
    this.barBg.position.set(bx, by);
    const p = 1 - engine.bettingProgress;
    this.bar.clear();
    this.bar.roundRect(0, 0, Math.max(2, bw * p), bh, 3).fill(COLORS.red);
    this.bar.position.set(bx, by);

    // 旋轉螺旋槳
    const cx = w / 2, cy = h * L.multY - L.multSize * 0.35;
    const r = L.multSize * 0.42;
    const a = this.time / 120;
    this.spinner.clear();
    for (let i = 0; i < 3; i++) {
      const ang = a + (i * Math.PI * 2) / 3;
      this.spinner.moveTo(cx, cy)
        .lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.55)
        .stroke({ width: 5, color: COLORS.red, alpha: 0.9 });
    }
    this.spinner.circle(cx, cy, r * 0.16).fill(0xffffff);
  }

  drawCurve(pos) {
    const { w, h, L } = this;
    const ox = w * L.originX, oy = h * L.originY;
    const cx = ox + (pos.x - ox) * 0.62;
    const cy = oy;

    this.curve.clear();
    this.curve.moveTo(ox, oy).quadraticCurveTo(cx, cy, pos.x, pos.y)
      .stroke({ width: 10, color: COLORS.curveFill, alpha: 0.18 });
    this.curve.moveTo(ox, oy).quadraticCurveTo(cx, cy, pos.x, pos.y)
      .stroke({ width: 4, color: COLORS.curve, alpha: 1 });

    this.fillMask.clear();
    this.fillMask.moveTo(ox, oy).quadraticCurveTo(cx, cy, pos.x, pos.y)
      .lineTo(pos.x, oy).lineTo(ox, oy).closePath().fill(0xffffff);
  }

  drawAxis(t) {
    const { w, h, L } = this;
    const ox = w * L.originX, oy = h * L.originY;
    this.axis.clear();
    // 軸線
    this.axis.moveTo(ox, oy).lineTo(w - 8, oy).stroke({ width: 1.5, color: 0x2f3033 });
    this.axis.moveTo(ox, oy).lineTo(ox, 10).stroke({ width: 1.5, color: 0x2f3033 });
    // 滾動刻度
    const off = (t / 26) % 60;
    for (let x = ox + 60 - off; x < w - 10; x += 60) {
      this.axis.moveTo(x, oy).lineTo(x, oy + 5).stroke({ width: 1.5, color: 0x3a3b3e });
    }
    for (let y = oy - 50 + ((t / 34) % 50); y > 12; y -= 50) {
      this.axis.moveTo(ox, y).lineTo(ox - 5, y).stroke({ width: 1.5, color: 0x3a3b3e });
    }
  }
}
