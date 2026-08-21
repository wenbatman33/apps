// 主渲染：背景 / 磚塊 / 球 / 瞄準線，全部走 PixiJS 批次繪製
import * as PIXI from '../../vendor/pixi.min.mjs';
import { GRID, LAYOUT, RULES, WORLD, THEME } from '../config.js';
import { T } from '../core/level.js';
import { cellX, cellY, brickX, brickY, brickSize, wallLeft, wallRight, wallTop } from '../core/game.js';
import { texBall, texBrick, texTriangle, texPlusRing, texLaserOrb, texGlow, texPixel, hpColor, labelColor } from './textures.js';
import { circleVsRect, circleVsTriangle, triangleVerts, reflect } from '../core/physics.js';
import { FX } from './fx.js';

// 數字用點陣字型，磚塊血量每幀變動也不會重建貼圖
let NUM_FONT = null;
export function initFonts() {
  if (NUM_FONT) return NUM_FONT;
  try {
    PIXI.BitmapFont.install({
      name: 'bbNum',
      style: { fontFamily: 'Arial, sans-serif', fontSize: 56, fontWeight: '700', fill: 0xffffff },
      chars: [['0', '9'], 'KM.+x×'],
      resolution: 2,
    });
    NUM_FONT = 'bbNum';
  } catch (e) {
    NUM_FONT = null; // 退回一般 Text
  }
  return NUM_FONT;
}

function numText(str, size) {
  if (NUM_FONT) {
    const t = new PIXI.BitmapText({ text: str, style: { fontFamily: NUM_FONT, fontSize: size } });
    t.anchor = { x: 0.5, y: 0.5 };
    return t;
  }
  const t = new PIXI.Text({ text: str, style: { fontFamily: 'Arial', fontSize: size, fontWeight: '700', fill: 0xffffff } });
  t.anchor.set(0.5);
  return t;
}

export function fmtNum(n) {
  if (!isFinite(n)) return '';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n | 0);
}

export class Renderer {
  constructor(app) {
    this.app = app;
    initFonts();

    this.root = new PIXI.Container();       // 受震屏影響
    this.world = new PIXI.Container();      // 邏輯 720×1280 空間
    app.stage.addChild(this.root);
    this.root.addChild(this.world);

    this.bg = new PIXI.Container();
    this.brickLayer = new PIXI.Container();
    this.aimLayer = new PIXI.Container();
    this.ballLayer = new PIXI.Container();
    this.ballLayer.blendMode = 'add';
    this.world.addChild(this.bg, this.brickLayer, this.aimLayer, this.ballLayer);

    this.fx = new FX(this.world);

    this.texBallT = texBall(16);
    this.texGlowT = texGlow(128);
    this.texPxT = texPixel();
    this.texBrickT = texBrick(90);
    this.texTriT = [0, 1, 2, 3].map((c) => texTriangle(90, c));
    this.texLaserOrbT = texLaserOrb(76);
    this.texRingT = texPlusRing(72);

    this.ballSprites = [];
    this.brickViews = [];
    this.accent = 0x35f0ff;

    this.buildBackground();
    this.buildBrickViews();
    this.buildAim();
    this.buildLauncher();
  }

  // ---- 背景 ----
  buildBackground() {
    this.bgFill = new PIXI.Graphics();
    this.bg.addChild(this.bgFill);

    // 背景光斑
    this.blobs = [];
    for (let i = 0; i < 2; i++) {
      const s = new PIXI.Sprite(this.texGlowT);
      s.anchor.set(0.5);
      s.blendMode = 'add';
      s.alpha = 0.05;
      s.scale.set(4 + Math.random() * 2);
      s.x = Math.random() * WORLD.W;
      s.y = 200 + Math.random() * (WORLD.H - 400);
      this.bg.addChild(s);
      this.blobs.push({ s, phase: Math.random() * Math.PI * 2, baseY: s.y, baseX: s.x });
    }

    this.frame = new PIXI.Graphics();
    this.bg.addChild(this.frame);
    this.deadLineG = new PIXI.Graphics();
    this.bg.addChild(this.deadLineG);
    this.redrawFrame();
  }

  redrawFrame() {
    const L = wallLeft(), R = wallRight(), TOPY = wallTop();
    const g = this.frame;
    g.clear();
    const H = LAYOUT.deadLine - TOPY;
    // 場地底
    g.rect(L, TOPY, R - L, H).fill({ color: 0x000000, alpha: 0.12 });
    // 完整格線
    for (let c = 1; c < GRID.COLS; c++) {
      g.rect(L + c * GRID.CELL - 0.5, TOPY, 1, H).fill({ color: THEME.grid, alpha: 0.9 });
    }
    for (let r = 1; r * GRID.CELL < H; r++) {
      g.rect(L, TOPY + r * GRID.CELL - 0.5, R - L, 1).fill({ color: THEME.grid, alpha: 0.9 });
    }
    // 外框
    g.rect(L - 3, TOPY - 3, R - L + 6, 3).fill({ color: this.accent, alpha: 0.8 });
    g.rect(L - 3, TOPY - 3, 3, H + 6).fill({ color: this.accent, alpha: 0.55 });
    g.rect(R, TOPY - 3, 3, H + 6).fill({ color: this.accent, alpha: 0.55 });

    const d = this.deadLineG;
    d.clear();
    for (let x = L; x < R; x += 24) {
      d.rect(x, LAYOUT.deadLine, 14, 3).fill({ color: 0xff3b52, alpha: 0.55 });
    }
  }

  setTheme(theme) {
    this.accent = theme.accent;
    this.bgFill.clear();
    this.bgFill.rect(0, 0, WORLD.W, WORLD.H).fill(theme.bg);
    for (const b of this.blobs) b.s.tint = theme.glow;
    this.redrawFrame();
    this.launchGlow.tint = theme.accent;
    this.app.renderer.background.color = theme.bg;
  }

  // ---- 磚塊 ----
  buildBrickViews() {
    for (let r = 0; r < GRID.ROWS; r++) {
      const row = [];
      for (let c = 0; c < GRID.COLS; c++) {
        const cont = new PIXI.Container();
        cont.x = cellX(c) + GRID.CELL / 2;
        cont.y = cellY(r) + GRID.CELL / 2;
        cont.visible = false;

        const glow = new PIXI.Sprite(this.texGlowT);
        glow.anchor.set(0.5);
        glow.blendMode = 'add';
        glow.scale.set(0.78);
        glow.alpha = 0.22;

        const body = new PIXI.Sprite(this.texBrickT);
        body.anchor.set(0.5);
        body.width = brickSize(); body.height = brickSize();

        const icon = new PIXI.Sprite(this.texGlowT);
        icon.anchor.set(0.5);
        icon.visible = false;

        const label = numText('', 19);

        cont.addChild(glow, body, icon, label);
        this.brickLayer.addChild(cont);
        row.push({ cont, glow, body, icon, label, key: '', cell: null, pop: 0 });
      }
      this.brickViews.push(row);
    }
  }

  syncBricks(game) {
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const cell = game.grid[r][c];
        const v = this.brickViews[r][c];
        if (!cell) {
          if (v.cont.visible) { v.cont.visible = false; v.key = ''; }
          continue;
        }
        const key = `${cell.t}:${cell.hp}:${cell.corner ?? ''}`;
        if (key === v.key) { this.animBrick(v); continue; }
        v.key = key;
        v.cont.visible = true;
        this.styleBrick(v, cell);
      }
    }
  }

  styleBrick(v, cell) {
    v.cell = cell;
    v.pop = 1;
    v.body.rotation = 0;
    v.label.x = 0; v.label.y = 0;
    v.icon.visible = false;

    // 道具：空心圓環，與實心方磚明確區隔
    if (cell.t === T.PLUS || cell.t === T.LASER || cell.t === T.MULTI) {
      const col = cell.t === T.PLUS ? 0x4ade80 : (cell.t === T.LASER ? 0xfacc15 : 0xc084fc);
      v.body.texture = this.texRingT;
      v.body.width = 48; v.body.height = 48;
      v.body.tint = col;
      v.glow.visible = true;
      v.glow.tint = col;
      v.glow.alpha = 0.22;
      v.glow.scale.set(0.6);
      if (cell.t === T.LASER) {
        v.body.texture = this.texLaserOrbT;
        v.label.text = '';
      } else {
        v.label.text = cell.t === T.PLUS ? '+1' : '×3';
        v.label.scale.set(0.78);
        v.label.tint = 0xffffff;
      }
      return;
    }

    const col = hpColor(cell.hp);
    v.glow.visible = false;
    v.body.tint = col;
    v.label.scale.set(1);
    v.label.text = fmtNum(cell.hp);
    v.label.tint = labelColor(cell.hp);

    if (cell.t === T.TRI) {
      // 四種朝向各有自己的貼圖，光源方向才不會跟著轉
      v.body.texture = this.texTriT[cell.corner & 3];
      v.body.width = brickSize(); v.body.height = brickSize();
      v.body.rotation = 0;
      // 數字放在三角形重心，避免壓到斜邊外
      const k = brickSize() / 7.5;
      const cx = (cell.corner === 1 || cell.corner === 2) ? k : -k;
      const cy = (cell.corner === 2 || cell.corner === 3) ? k : -k;
      v.label.x = cx; v.label.y = cy;
      return;
    }

    v.body.texture = this.texBrickT;
    v.body.width = brickSize(); v.body.height = brickSize();
  }

  animBrick(v) {
    if (v.pop > 0) {
      v.pop = Math.max(0, v.pop - 0.12);
      v.cont.scale.set(1 + v.pop * 0.09);
    } else if (v.cont.scale.x !== 1) {
      v.cont.scale.set(1);
    }
  }

  // ---- 發射器 ----
  buildLauncher() {
    this.launchGlow = new PIXI.Sprite(this.texGlowT);
    this.launchGlow.anchor.set(0.5);
    this.launchGlow.blendMode = 'add';
    this.launchGlow.alpha = 0.28;
    this.launchGlow.scale.set(0.42);
    this.aimLayer.addChild(this.launchGlow);

    this.launchCore = new PIXI.Sprite(this.texBallT);
    this.launchCore.anchor.set(0.5);
    this.launchCore.blendMode = 'add';
    this.launchCore.width = 22; this.launchCore.height = 22;
    this.aimLayer.addChild(this.launchCore);

    this.landMark = new PIXI.Sprite(this.texPxT);
    this.landMark.anchor.set(0.5, 0);
    this.landMark.width = 2; this.landMark.height = 26;
    this.landMark.alpha = 0;
    this.aimLayer.addChild(this.landMark);
  }

  // ---- 瞄準線 ----
  buildAim() {
    this.aimHighlight = new PIXI.Graphics();   // 會被打到的磚塊外框
    this.aimLine = new PIXI.Graphics();        // 連續預測線
    this.aimLine.blendMode = 'add';
    this.aimLayer.addChild(this.aimHighlight, this.aimLine);

    // 撞擊點標記
    this.aimHits = [];
    for (let i = 0; i < 6; i++) {
      const s = new PIXI.Sprite(this.texBallT);
      s.anchor.set(0.5);
      s.width = 26; s.height = 26;
      s.blendMode = 'add';
      s.visible = false;
      this.aimLayer.addChild(s);
      this.aimHits.push(s);
    }
  }

  // 唯讀模擬球的飛行路徑：一路反射到打中第 N 塊磚為止
  predictPath(game, dir, maxBrickHits = 2, maxLen = 5000) {
    const r = RULES.ballRadius;
    const L = wallLeft() + r, R = wallRight() - r, TOPY = wallTop() + r;
    const bs = brickSize();
    const STEP = 5;

    let x = game.launchX, y = LAYOUT.launchY;
    let vx = dir.x, vy = dir.y;
    const pts = [{ x, y }];
    const hits = [];
    const marks = [];
    let travelled = 0;
    let brickHits = 0;

    while (travelled < maxLen && brickHits < maxBrickHits) {
      x += vx * STEP; y += vy * STEP;
      travelled += STEP;

      let bounced = false;
      if (x < L) { x = L; vx = Math.abs(vx); bounced = true; }
      else if (x > R) { x = R; vx = -Math.abs(vx); bounced = true; }
      if (y < TOPY) { y = TOPY; vy = Math.abs(vy); bounced = true; }
      if (y > LAYOUT.launchY) break;
      if (bounced) pts.push({ x, y });

      // 找出這一步碰到的磚
      const c0 = Math.floor((x - r - LAYOUT.playLeft) / GRID.CELL) - 1;
      const c1 = Math.floor((x + r - LAYOUT.playLeft) / GRID.CELL) + 1;
      const r0 = Math.floor((y - r - LAYOUT.playTop) / GRID.CELL) - 1;
      const r1 = Math.floor((y + r - LAYOUT.playTop) / GRID.CELL) + 1;
      let best = null, bR = -1, bC = -1;
      for (let rr = r0; rr <= r1; rr++) {
        for (let cc = c0; cc <= c1; cc++) {
          const cell = game.cellAt(rr, cc);
          if (!cell || cell.t === T.PLUS || cell.t === T.LASER || cell.t === T.MULTI) continue;
          const hit = cell.t === T.TRI
            ? circleVsTriangle(x, y, r, triangleVerts(brickX(cc), brickY(rr), bs, cell.corner))
            : circleVsRect(x, y, r, brickX(cc), brickY(rr), bs, bs);
          if (!hit) continue;
          if (!best || hit.depth > best.depth) { best = hit; bR = rr; bC = cc; }
        }
      }
      if (best) {
        x += best.nx * best.depth;
        y += best.ny * best.depth;
        pts.push({ x, y });
        marks.push({ x, y });
        hits.push({ r: bR, c: bC });
        const rv = reflect(vx, vy, best.nx, best.ny);
        vx = rv.vx; vy = rv.vy;
        brickHits++;
      }
    }
    pts.push({ x, y });
    return { pts, hits, marks };
  }

  drawAim(game, dir) {
    const line = this.aimLine, hl = this.aimHighlight;
    if (!dir || !game) {
      line.clear(); hl.clear();
      for (const s of this.aimHits) s.visible = false;
      return;
    }

    const { pts, hits, marks } = this.predictPath(game, dir);

    // 連續實線：外層粗一點做出光暈，內層細白線
    line.clear();
    if (pts.length > 1) {
      const draw = (width, color, alpha) => {
        line.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) line.lineTo(pts[i].x, pts[i].y);
        line.stroke({ width, color, alpha, cap: 'round', join: 'round' });
      };
      draw(10, 0xffd24a, 0.18);
      draw(4.5, 0xffd24a, 0.5);
      draw(1.8, 0xffffff, 0.92);
    }

    // 會被打到的磚塊：外框高亮
    hl.clear();
    const bs = brickSize();
    for (const h of hits) {
      hl.rect(brickX(h.c) - 3, brickY(h.r) - 3, bs + 6, bs + 6)
        .stroke({ width: 3, color: 0xffd24a, alpha: 0.95 });
    }

    // 撞擊點標記
    for (let i = 0; i < this.aimHits.length; i++) {
      const s = this.aimHits[i];
      const m = marks[i];
      if (!m) { s.visible = false; continue; }
      s.visible = true;
      s.x = m.x; s.y = m.y;
      s.tint = 0xffd24a;
      s.alpha = 0.95 - i * 0.25;
    }
  }

  // ---- 球 ----
  syncBalls(game) {
    const balls = game.balls;
    while (this.ballSprites.length < balls.length) {
      const s = new PIXI.Sprite(this.texBallT);
      s.anchor.set(0.5);
      s.width = RULES.ballRadius * 3.2;
      s.height = RULES.ballRadius * 3.2;
      this.ballLayer.addChild(s);
      this.ballSprites.push(s);
    }
    for (let i = 0; i < this.ballSprites.length; i++) {
      const s = this.ballSprites[i];
      const b = balls[i];
      if (!b) { s.visible = false; continue; }
      s.visible = true;
      s.x = b.x; s.y = b.y;
      s.tint = 0xffffff;
    }
  }

  update(dt, game, t) {
    this.fx.update(dt);
    this.root.x = this.fx.shake.x;
    this.root.y = this.fx.shake.y;

    for (const b of this.blobs) {
      b.phase += dt * 0.25;
      b.s.x = b.baseX + Math.cos(b.phase) * 40;
      b.s.y = b.baseY + Math.sin(b.phase * 0.8) * 30;
      b.s.alpha = 0.04 + Math.sin(b.phase * 1.3) * 0.02;
    }

    this.launchGlow.x = game.launchX;
    this.launchGlow.y = LAYOUT.launchY;
    this.launchCore.x = game.launchX;
    this.launchCore.y = LAYOUT.launchY;
    this.launchGlow.scale.set(0.4 + Math.sin(t * 3) * 0.04);

    if (game.nextLaunchX !== null && game.phase === 'firing') {
      this.landMark.x = game.nextLaunchX;
      this.landMark.y = LAYOUT.launchY + 4;
      this.landMark.tint = this.accent;
      this.landMark.alpha = 0.65;
    } else this.landMark.alpha = 0;

    this.syncBricks(game);
    this.syncBalls(game);
  }

  resize(w, h) {
    const scale = Math.min(w / WORLD.W, h / WORLD.H);
    this.world.scale.set(scale);
    this.world.x = (w - WORLD.W * scale) / 2;
    this.world.y = (h - WORLD.H * scale) / 2;
    this.viewScale = scale;
    this.viewOffset = { x: this.world.x, y: this.world.y };
  }

  // 螢幕座標 → 世界座標
  toWorld(sx, sy) {
    return { x: (sx - this.world.x) / this.viewScale, y: (sy - this.world.y) / this.viewScale };
  }

  clearFx() { this.fx.clear(); }
}
