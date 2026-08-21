// 特效：粒子池 + 光波 + 震屏，全部共用貼圖以維持批次繪製
import * as PIXI from '../../vendor/pixi.min.mjs';
import { texShard, texGlow, texPixel } from './textures.js';
import { LAYOUT } from '../config.js';

const MAX_PARTICLES = 900;

export class FX {
  constructor(parent) {
    this.layer = new PIXI.Container();
    this.layer.blendMode = 'add';
    parent.addChild(this.layer);

    this.pool = [];
    this.active = [];
    this.waves = [];
    this.shake = { x: 0, y: 0, mag: 0, t: 0 };

    this.texShard = texShard(12);
    this.texGlow = texGlow(128);
    this.texPx = texPixel();
  }

  obtain(tex) {
    let s = this.pool.pop();
    if (!s) {
      s = new PIXI.Sprite(tex);
      s.anchor.set(0.5);
      this.layer.addChild(s);
    } else {
      s.texture = tex;
      s.visible = true;
    }
    return s;
  }

  release(p) {
    p.sprite.visible = false;
    this.pool.push(p.sprite);
  }

  emit(x, y, count, color, opts = {}) {
    const speed = opts.speed ?? 260;
    const life = opts.life ?? 0.45;
    const size = opts.size ?? 1;
    const tex = opts.glow ? this.texGlow : this.texShard;
    const budget = Math.max(0, MAX_PARTICLES - this.active.length);
    const n = Math.min(count, budget);
    for (let i = 0; i < n; i++) {
      const a = opts.angle !== undefined
        ? opts.angle + (Math.random() - 0.5) * (opts.spread ?? 1.6)
        : Math.random() * Math.PI * 2;
      const sp = speed * (0.45 + Math.random() * 0.85);
      const sprite = this.obtain(tex);
      sprite.tint = color;
      sprite.alpha = 1;
      sprite.x = x; sprite.y = y;
      const sc = (opts.glow ? 0.18 : 0.9) * size * (0.6 + Math.random() * 0.8);
      sprite.scale.set(sc);
      sprite.rotation = Math.random() * Math.PI;
      this.active.push({
        sprite, x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life, maxLife: life, sc,
        spin: (Math.random() - 0.5) * 12,
        grav: opts.grav ?? 520,
        drag: opts.drag ?? 1.6,
      });
    }
  }

  // 環狀衝擊波
  wave(x, y, color, radius = 180, life = 0.42) {
    const s = new PIXI.Sprite(this.texGlow);
    s.anchor.set(0.5);
    s.tint = color;
    s.x = x; s.y = y;
    s.alpha = 0.85;
    s.scale.set(0.12);
    this.layer.addChild(s);
    this.waves.push({ sprite: s, t: 0, life, radius });
  }

  // 雷射掃過的光束（水平或垂直），快速淡出
  laserFlash(x, y, w, h, color, vertical = false) {
    const s = new PIXI.Sprite(this.texPx);
    s.anchor.set(0, 0.5);
    if (vertical) s.anchor.set(0.5, 0);
    s.tint = color;
    s.x = x; s.y = y;
    s.width = w; s.height = h;
    s.alpha = 0.95;
    this.layer.addChild(s);
    this.waves.push({ sprite: s, t: 0, life: 0.3, beam: true, w, h, vertical });
  }

  addShake(mag) {
    this.shake.mag = Math.min(26, this.shake.mag + mag * (LAYOUT.shakeScale ?? 1));
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) { this.release(p); this.active.splice(i, 1); continue; }
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.life / p.maxLife;
      p.sprite.x = p.x; p.sprite.y = p.y;
      p.sprite.alpha = k;
      p.sprite.scale.set(p.sc * (0.35 + k * 0.75));
      p.sprite.rotation += p.spin * dt;
    }

    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.t += dt;
      const k = w.t / w.life;
      if (k >= 1) { w.sprite.destroy(); this.waves.splice(i, 1); continue; }
        w.sprite.alpha = (1 - k) * 0.85;
        w.sprite.scale.set(0.12 + k * (w.radius / 64));
    }

    // 震屏衰減
    if (this.shake.mag > 0.05) {
      this.shake.mag *= Math.max(0, 1 - 9 * dt);
      this.shake.x = (Math.random() - 0.5) * this.shake.mag * 2;
      this.shake.y = (Math.random() - 0.5) * this.shake.mag * 2;
    } else {
      this.shake.mag = 0; this.shake.x = 0; this.shake.y = 0;
    }
  }

  clear() {
    for (const p of this.active) this.release(p);
    this.active.length = 0;
    for (const w of this.waves) w.sprite.destroy();
    this.waves.length = 0;
    this.shake.mag = 0;
  }
}
