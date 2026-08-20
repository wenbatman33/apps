import { Container, Sprite, TilingSprite, Graphics, Text } from '../../vendor/pixi.min.mjs';
import { TEX } from './textures.js';
import { WORLD, LAYOUT } from '../config.js';

const tmp = { x: 0, y: 0 };

// 依 0~1 位置在雙色 skin 之間插值，做出蛇身漸層
function mixColor(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (((ar + (br - ar) * t) | 0) << 16) | (((ag + (bg - ag) * t) | 0) << 8) | ((ab + (bb - ab) * t) | 0);
}

export class Renderer {
  constructor(app) {
    this.app = app;
    this.cam = { x: 0, y: 0, zoom: 1 };

    this.bg = new TilingSprite({ texture: TEX.grid, width: app.screen.width, height: app.screen.height });
    app.stage.addChild(this.bg);

    this.world = new Container();
    app.stage.addChild(this.world);

    this.border = new Graphics();
    this.world.addChild(this.border);

    this.foodLayer = new Container();
    this.glowLayer = new Container();
    this.bodyLayer = new Container();
    this.headLayer = new Container();
    this.fxLayer = new Container();
    this.labelLayer = new Container();
    this.world.addChild(this.foodLayer, this.glowLayer, this.bodyLayer, this.headLayer, this.fxLayer, this.labelLayer);

    this.foodPool = []; this.bodyPool = []; this.glowPool = []; this.headPool = []; this.fxList = [];
    this.labels = new Map();
    this.drawBorder();
  }

  drawBorder() {
    const g = this.border;
    g.clear();
    g.circle(0, 0, WORLD.radius).fill({ color: 0x0d1226, alpha: 0.55 });
    g.circle(0, 0, WORLD.radius).stroke({ color: 0xff3366, width: 14, alpha: 0.55 });
    g.circle(0, 0, WORLD.radius - 26).stroke({ color: 0xff6b9d, width: 3, alpha: 0.35 });
  }

  _get(pool, layer, tex) {
    let s = pool.__n === undefined ? null : pool[pool.__n];
    if (!s) { s = new Sprite(tex); s.anchor.set(0.5); layer.addChild(s); pool.push(s); }
    pool.__n++;
    s.visible = true;
    return s;
  }
  _begin(pool) { pool.__n = 0; }
  _end(pool) { for (let i = pool.__n; i < pool.length; i++) pool[i].visible = false; }

  resize() {
    this.bg.width = this.app.screen.width;
    this.bg.height = this.app.screen.height;
  }

  // 爆點特效（吃到大食物 / 蛇死亡）
  burst(x, y, color, count = 14, power = 1) {
    for (let i = 0; i < count; i++) {
      const s = new Sprite(TEX.food);
      s.anchor.set(0.5); s.tint = color;
      s.x = x; s.y = y;
      const a = Math.random() * Math.PI * 2, v = (80 + Math.random() * 220) * power;
      this.fxLayer.addChild(s);
      this.fxList.push({ s, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.4, age: 0, size: 14 + Math.random() * 22 * power });
    }
  }

  update(world, dt) {
    const app = this.app, cam = this.cam;
    const zoom = cam.zoom;
    const halfW = app.screen.width / 2, halfH = app.screen.height / 2;
    this.world.scale.set(zoom);
    this.world.position.set(halfW - cam.x * zoom, halfH - cam.y * zoom);
    this.bg.tileScale.set(zoom);
    this.bg.tilePosition.set(halfW - cam.x * zoom, halfH - cam.y * zoom);

    // 視野範圍（多留 120px 邊界，避免邊緣彈出）
    const vw = halfW / zoom + 140, vh = halfH / zoom + 140;
    const inView = (x, y, pad = 0) => Math.abs(x - cam.x) < vw + pad && Math.abs(y - cam.y) < vh + pad;

    // --- 食物 ---
    this._begin(this.foodPool);
    const t = world.time;
    for (const f of world.food) {
      if (!f.alive || !inView(f.x, f.y)) continue;
      const s = this._get(this.foodPool, this.foodLayer, TEX.food);
      s.texture = TEX.food;
      s.x = f.x; s.y = f.y; s.tint = f.c;
      const pulse = 1 + Math.sin(t * 3 + f.pulse) * 0.12;
      s.width = s.height = (6.2 + Math.min(f.v, 10) * 1.9) * 2.4 * pulse;
      s.alpha = 0.95;
    }
    this._end(this.foodPool);

    // --- 蛇 ---
    this._begin(this.bodyPool); this._begin(this.glowPool); this._begin(this.headPool);
    const drawSnake = (sn) => {
      if (sn.dead) return;
      const n = sn.activeSegCount, r = sn.radius, boost = sn.boosting && sn.canBoost();
      const [c0, c1] = sn.skin;
      // 由尾畫到頭，頭部才會蓋在最上面
      for (let i = n - 1; i >= 0; i--) {
        sn.segPos(i, tmp);
        if (!inView(tmp.x, tmp.y, r * 2)) continue;
        const tt = i / n;
        const sp = this._get(this.bodyPool, this.bodyLayer, TEX.body);
        sp.texture = TEX.body;
        sp.x = tmp.x; sp.y = tmp.y;
        // 身體橫向微擺動：純視覺，讓蛇看起來會蠕動
        const w = Math.sin(sn.wobble - i * 0.35) * r * 0.1;
        sp.x += Math.cos(sn.angle + Math.PI / 2) * w;
        sp.y += Math.sin(sn.angle + Math.PI / 2) * w;
        sp.width = sp.height = r * 2 * (1 - tt * 0.22);
        sp.tint = mixColor(c0, c1, (Math.sin(i * 0.18 + sn.wobble * 0.35) * 0.5 + 0.5) * 0.85);
        sp.alpha = 1;
        // 每隔幾節加一層輝光，加速時更亮
        if (i % 4 === 0) {
          const gl = this._get(this.glowPool, this.glowLayer, TEX.glow);
          gl.texture = TEX.glow;
          gl.x = sp.x; gl.y = sp.y; gl.tint = c0;
          gl.width = gl.height = r * (boost ? 6.4 : 4.2);
          gl.alpha = boost ? 0.3 : 0.13;
        }
      }
      // 頭部：眼睛
      if (inView(sn.x, sn.y, r * 3)) {
        const head = this._get(this.bodyPool, this.bodyLayer, TEX.body);
        head.texture = TEX.body;
        head.x = sn.x; head.y = sn.y; head.tint = c0;
        head.width = head.height = r * 2.16;
        for (const side of [-1, 1]) {
          const ea = sn.angle + side * 0.66;
          const ex = sn.x + Math.cos(ea) * r * 0.5, ey = sn.y + Math.sin(ea) * r * 0.5;
          const eye = this._get(this.headPool, this.headLayer, TEX.circle);
          eye.texture = TEX.circle;
          eye.x = ex; eye.y = ey; eye.tint = 0xffffff;
          eye.width = eye.height = r * 0.92;
          const pu = this._get(this.headPool, this.headLayer, TEX.circle);
          pu.texture = TEX.circle;
          pu.x = ex + Math.cos(sn.angle) * r * 0.22;
          pu.y = ey + Math.sin(sn.angle) * r * 0.22;
          pu.tint = 0x111820;
          pu.width = pu.height = r * 0.48;
        }
      }
      // 名字
      this.drawLabel(sn, inView(sn.x, sn.y, 200));
    };
    for (const sn of world.snakes) if (!sn.isPlayer) drawSnake(sn);
    if (world.player) drawSnake(world.player);
    this._end(this.bodyPool); this._end(this.glowPool); this._end(this.headPool);

    // --- 特效 ---
    for (let i = this.fxList.length - 1; i >= 0; i--) {
      const p = this.fxList[i];
      p.age += dt;
      if (p.age >= p.life) { p.s.destroy(); this.fxList.splice(i, 1); continue; }
      const k = p.age / p.life;
      p.s.x += p.vx * dt; p.s.y += p.vy * dt;
      p.vx *= 0.94; p.vy *= 0.94;
      p.s.alpha = 1 - k;
      p.s.width = p.s.height = p.size * (1 + k * 1.4);
    }
  }

  drawLabel(sn, visible) {
    let lb = this.labels.get(sn.id);
    if (!visible) { if (lb) lb.visible = false; return; }
    if (!lb) {
      lb = new Text({
        text: sn.name,
        style: { fontFamily: 'system-ui, "PingFang TC", sans-serif', fontSize: 40, fill: 0xffffff, fontWeight: '700', stroke: { color: 0x000000, width: 6 } },
      });
      lb.anchor.set(0.5);
      this.labelLayer.addChild(lb);
      this.labels.set(sn.id, lb);
    }
    lb.visible = true;
    const sc = (LAYOUT.nameSize / 40) * (1 + sn.radius / 60);
    lb.scale.set(sc);
    lb.x = sn.x; lb.y = sn.y - sn.radius - 14 * sc;
    lb.alpha = sn.isPlayer ? 1 : 0.72;
  }

  cleanupLabels(world) {
    const live = new Set(world.snakes.filter((s) => !s.dead).map((s) => s.id));
    for (const [id, lb] of this.labels) {
      if (!live.has(id)) { lb.destroy(); this.labels.delete(id); }
    }
  }
}
