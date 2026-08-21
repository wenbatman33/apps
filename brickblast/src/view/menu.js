// 主選單與 200 關關卡選擇（垂直捲動，含慣性）
import * as PIXI from '../../vendor/pixi.min.mjs';
import { WORLD, THEME, TOTAL_LEVELS } from '../config.js';
import { label, NeonButton, star } from './ui.js';
import { texGlow } from './textures.js';
import { unlocked, starsOf, totalStars } from '../store/save.js';

const COLS = 5;
const CELL = 108;
const GAP = 16;
const ROW_H = CELL + GAP;

export class Menu {
  constructor(stage, hooks) {
    this.hooks = hooks;
    this.root = new PIXI.Container();
    stage.addChild(this.root);

    this.bg = new PIXI.Graphics();
    this.bg.rect(0, 0, WORLD.W, WORLD.H).fill({ color: 0x05060f });
    this.root.eventMode = 'static';
    this.root.addChild(this.bg);

    this.blobs = [];
    for (let i = 0; i < 4; i++) {
      const s = new PIXI.Sprite(texGlow(128));
      s.anchor.set(0.5); s.blendMode = 'add';
      s.scale.set(5 + i); s.alpha = 0.12;
      s.tint = THEME.glow;
      s.x = (i % 2 ? 0.75 : 0.25) * WORLD.W;
      s.y = 260 + i * 260;
      this.root.addChild(s);
      this.blobs.push({ s, p: Math.random() * 6, bx: s.x, by: s.y });
    }

    // ---- 標題 ----
    this.titleWrap = new PIXI.Container();
    this.root.addChild(this.titleWrap);
    const t1 = label('BRICK', 76, 0xffffff);
    t1.x = WORLD.W / 2; t1.y = 96;
    const t2 = label('BLAST', 76, 0x35f0ff);
    t2.x = WORLD.W / 2; t2.y = 172;
    const t3 = label('200 關', 22, 0x7f9bb0, '500');
    t3.x = WORLD.W / 2; t3.y = 224;
    this.titleWrap.addChild(t1, t2, t3);

    this.starTxt = label('', 21, 0xffd453, '600');
    this.starTxt.x = WORLD.W / 2; this.starTxt.y = 262;
    this.titleWrap.addChild(this.starTxt);

    // ---- 捲動區 ----
    this.viewTop = 300;
    this.viewH = WORLD.H - this.viewTop - 148;
    this.scroll = new PIXI.Container();
    this.scroll.y = this.viewTop;
    this.root.addChild(this.scroll);

    this.mask = new PIXI.Graphics();
    this.mask.rect(0, this.viewTop, WORLD.W, this.viewH).fill(0xffffff);
    this.root.addChild(this.mask);
    this.scroll.mask = this.mask;

    this.inner = new PIXI.Container();
    this.scroll.addChild(this.inner);

    this.cells = [];
    this.buildLevels();

    // ---- 底部：繼續遊戲 ----
    this.btnPlay = new NeonButton({
      text: '繼續遊戲', w: 420, h: 84, size: 29, color: THEME.accent, filled: true,
      onClick: () => this.hooks.onPlay(Math.min(TOTAL_LEVELS, unlocked())),
    });
    this.btnPlay.x = 264;
    this.btnPlay.y = WORLD.H - 78;

    this.btnRank = new NeonButton({
      text: '排行榜', w: 180, h: 84, size: 24, color: 0xffd453,
      onClick: () => this.hooks.onRanking?.(),
    });
    this.btnRank.x = 576;
    this.btnRank.y = WORLD.H - 78;
    this.root.addChild(this.btnPlay, this.btnRank);

    this.bindScroll();
  }

  buildLevels() {
    const contentW = COLS * CELL + (COLS - 1) * GAP;
    const x0 = (WORLD.W - contentW) / 2 + CELL / 2;

    for (let i = 0; i < TOTAL_LEVELS; i++) {
      const lv = i + 1;
      const cx = x0 + (i % COLS) * (CELL + GAP);
      const cy = Math.floor(i / COLS) * ROW_H + CELL / 2 + 8;
      const cell = this.makeCell(lv);
      cell.x = cx; cell.y = cy;
      this.inner.addChild(cell);
      this.cells.push(cell);
    }
    this.contentH = Math.ceil(TOTAL_LEVELS / COLS) * ROW_H + 24;
    this.maxScroll = Math.max(0, this.contentH - this.viewH);
  }

  makeCell(lv) {
    const c = new PIXI.Container();
    c.level = lv;

    const g = new PIXI.Graphics();
    c.addChild(g);
    c.g = g;

    const num = label(String(lv), 30, 0xffffff);
    num.y = -8;
    c.addChild(num);
    c.num = num;

    const stars = new PIXI.Container();
    stars.y = 30;
    c.addChild(stars);
    c.starsC = stars;

    const lock = label('🔒', 30, 0xffffff);
    lock.alpha = 0.5;
    c.addChild(lock);
    c.lock = lock;

    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = new PIXI.Rectangle(-CELL / 2, -CELL / 2, CELL, CELL);
    c.on('pointertap', () => {
      if (this.dragged) return;
      if (lv > unlocked()) { this.hooks.onLocked?.(); return; }
      this.hooks.onPlay(lv);
    });
    return c;
  }

  refresh() {
    const un = unlocked();
    for (const c of this.cells) {
      const open = c.level <= un;
      const st = starsOf(c.level);
      const col = THEME.accent;
      c.g.clear();
      if (open) {
        c.g.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 20)
          .fill({ color: 0xffffff, alpha: st ? 0.09 : 0.05 })
          .stroke({ width: 2, color: col, alpha: st ? 0.9 : 0.5 });
      } else {
        c.g.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 20)
          .fill({ color: 0xffffff, alpha: 0.03 })
          .stroke({ width: 1.5, color: 0xffffff, alpha: 0.1 });
      }
      c.num.visible = open;
      c.lock.visible = !open;
      c.num.style.fill = st === 3 ? 0xffd453 : 0xffffff;
      c.starsC.removeChildren();
      if (open && st > 0) {
        for (let i = 0; i < 3; i++) {
          const s = star(9, i < st);
          s.x = (i - 1) * 22;
          c.starsC.addChild(s);
        }
        c.num.y = -14;
      } else {
        c.num.y = -4;
      }
    }
    const ts = totalStars();
    this.starTxt.text = `★ ${ts} / ${TOTAL_LEVELS * 3}　·　已解鎖 ${Math.min(un, TOTAL_LEVELS)} 關`;
    this.btnPlay.setText(un > 1 ? `繼續遊戲 · LV ${Math.min(TOTAL_LEVELS, un)}` : '開始遊戲');
    // 自動捲到最新關卡
    this.scrollToLevel(Math.min(TOTAL_LEVELS, un));
  }

  scrollToLevel(lv) {
    const idx = this.cells.findIndex((c) => c.level === lv);
    if (idx < 0) return;
    const target = this.cells[idx].y - this.viewH / 2 + CELL / 2;
    this.offset = Math.max(0, Math.min(this.maxScroll, target));
    this.inner.y = -this.offset;
    this.vel = 0;
  }

  bindScroll() {
    this.offset = 0;
    this.vel = 0;
    this.dragging = false;
    this.dragged = false;

    const area = new PIXI.Graphics();
    area.rect(0, this.viewTop, WORLD.W, this.viewH).fill({ color: 0xffffff, alpha: 0.0001 });
    area.eventMode = 'static';
    this.root.addChildAt(area, 1);

    const down = (e) => { this.dragging = true; this.dragged = false; this.lastY = e.global.y; this.vel = 0; };
    const move = (e) => {
      if (!this.dragging) return;
      const dy = e.global.y - this.lastY;
      this.lastY = e.global.y;
      if (Math.abs(dy) > 1) this.dragged = true;
      this.offset = clamp(this.offset - dy / (this.viewScale || 1), -60, this.maxScroll + 60);
      this.vel = -dy / (this.viewScale || 1);
    };
    const up = () => { this.dragging = false; setTimeout(() => { this.dragged = false; }, 30); };

    area.on('pointerdown', down);
    area.on('globalpointermove', move);
    area.on('pointerup', up);
    area.on('pointerupoutside', up);
    for (const c of this.cells) { c.on('pointerdown', down); }

    window.addEventListener('wheel', (e) => {
      if (!this.root.visible) return;
      this.offset = clamp(this.offset + e.deltaY, -60, this.maxScroll + 60);
      this.vel = 0;
    }, { passive: true });
  }

  update(dt) {
    if (!this.dragging) {
      this.offset += this.vel;
      this.vel *= 0.92;
      if (this.offset < 0) { this.offset += (0 - this.offset) * 0.22; this.vel = 0; }
      else if (this.offset > this.maxScroll) { this.offset += (this.maxScroll - this.offset) * 0.22; this.vel = 0; }
      if (Math.abs(this.vel) < 0.05) this.vel = 0;
    }
    this.inner.y = -this.offset;

    for (const b of this.blobs) {
      b.p += dt * 0.3;
      b.s.x = b.bx + Math.cos(b.p) * 46;
      b.s.y = b.by + Math.sin(b.p * 0.7) * 34;
    }
  }

  setVisible(v) {
    this.root.visible = v;
    if (v) this.refresh();
  }
}

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
