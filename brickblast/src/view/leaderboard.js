// 排行榜：本機紀錄，可依分數／最少用球／最少回合／關卡排序
import * as PIXI from '../../vendor/pixi.min.mjs';
import { WORLD, THEME, TOTAL_LEVELS } from '../config.js';
import { label, NeonButton, star } from './ui.js';
import { rankingRows, totalScore, clearedCount, totalStars } from '../store/save.js';

const ROW_H = 58;
const SORTS = [
  { key: 'score', text: '分數' },
  { key: 'balls', text: '最少球' },
  { key: 'turns', text: '最少回合' },
  { key: 'level', text: '關卡' },
];

export class Leaderboard {
  constructor(stage, hooks) {
    this.hooks = hooks;
    this.sortBy = 'score';
    this.root = new PIXI.Container();
    this.root.eventMode = 'static';
    this.root.visible = false;
    stage.addChild(this.root);

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, WORLD.W, WORLD.H).fill({ color: 0x05060f });
    this.root.addChild(bg);

    const title = label('排行榜', 46, 0xffffff);
    title.x = WORLD.W / 2; title.y = 68;
    this.root.addChild(title);

    this.summary = label('', 20, THEME.accent, '500');
    this.summary.x = WORLD.W / 2; this.summary.y = 116;
    this.root.addChild(this.summary);

    // 排序切換
    this.sortBtns = [];
    const bw = 150, gap = 10;
    const totalW = SORTS.length * bw + (SORTS.length - 1) * gap;
    SORTS.forEach((s, i) => {
      const b = new NeonButton({
        text: s.text, w: bw, h: 52, size: 19,
        color: THEME.accent,
        onClick: () => { this.sortBy = s.key; this.refresh(); },
      });
      b.x = (WORLD.W - totalW) / 2 + bw / 2 + i * (bw + gap);
      b.y = 176;
      this.root.addChild(b);
      this.sortBtns.push({ btn: b, key: s.key });
    });

    // 表頭
    this.header = new PIXI.Container();
    this.header.y = 228;
    const cols = [['關卡', 150, 0], ['分數', 432, 1], ['用球', 566, 1], ['回合', 668, 1]];
    for (const [t, x, anchor] of cols) {
      const l = label(t, 16, 0x5f7a8c, '500');
      l.anchor.set(anchor, 0.5);
      l.x = x;
      this.header.addChild(l);
    }
    const line = new PIXI.Graphics();
    line.rect(52, 18, WORLD.W - 104, 1).fill({ color: 0xffffff, alpha: 0.12 });
    this.header.addChild(line);
    this.root.addChild(this.header);

    // 捲動區
    this.viewTop = 252;
    this.viewH = WORLD.H - this.viewTop - 130;
    this.scroll = new PIXI.Container();
    this.scroll.y = this.viewTop;
    this.root.addChild(this.scroll);

    this.mask = new PIXI.Graphics();
    this.mask.rect(0, this.viewTop, WORLD.W, this.viewH).fill(0xffffff);
    this.root.addChild(this.mask);
    this.scroll.mask = this.mask;

    this.inner = new PIXI.Container();
    this.scroll.addChild(this.inner);

    this.empty = label('還沒有通關紀錄', 22, 0x5f7a8c, '500');
    this.empty.x = WORLD.W / 2; this.empty.y = this.viewTop + 100;
    this.empty.visible = false;
    this.root.addChild(this.empty);

    const back = new NeonButton({
      text: '返回', w: 300, h: 72, size: 25, color: THEME.accent, filled: true,
      onClick: () => this.hooks.onBack(),
    });
    back.x = WORLD.W / 2; back.y = WORLD.H - 66;
    this.root.addChild(back);

    this.bindScroll();
  }

  bindScroll() {
    this.offset = 0;
    this.vel = 0;
    this.dragging = false;

    const area = new PIXI.Graphics();
    area.rect(0, this.viewTop, WORLD.W, this.viewH).fill({ color: 0xffffff, alpha: 0.0001 });
    area.eventMode = 'static';
    this.root.addChild(area);
    this.area = area;

    area.on('pointerdown', (e) => { this.dragging = true; this.lastY = e.global.y; this.vel = 0; });
    area.on('globalpointermove', (e) => {
      if (!this.dragging) return;
      const dy = e.global.y - this.lastY;
      this.lastY = e.global.y;
      const sc = this.viewScale || 1;
      this.offset = clamp(this.offset - dy / sc, -60, this.maxScroll + 60);
      this.vel = -dy / sc;
    });
    const up = () => { this.dragging = false; };
    area.on('pointerup', up);
    area.on('pointerupoutside', up);

    window.addEventListener('wheel', (e) => {
      if (!this.root.visible) return;
      this.offset = clamp(this.offset + e.deltaY, -60, this.maxScroll + 60);
      this.vel = 0;
    }, { passive: true });
  }

  refresh() {
    for (const s of this.sortBtns) s.btn.setFilled(s.key === this.sortBy);

    const rows = rankingRows(this.sortBy);
    this.summary.text = `總分 ${comma(totalScore())}　·　通關 ${clearedCount()}/${TOTAL_LEVELS}　·　★ ${totalStars()}`;

    this.inner.removeChildren();
    this.empty.visible = rows.length === 0;

    rows.forEach((r, i) => {
      const row = new PIXI.Container();
      row.y = i * ROW_H + ROW_H / 2;

      if (i % 2 === 0) {
        const g = new PIXI.Graphics();
        g.roundRect(52, -ROW_H / 2 + 3, WORLD.W - 104, ROW_H - 6, 10).fill({ color: 0xffffff, alpha: 0.035 });
        row.addChild(g);
      }

      // 名次（依目前排序）
      const rank = label(`${i + 1}`, 17, i < 3 ? 0xffd453 : 0x5f7a8c, i < 3 ? '700' : '500');
      rank.anchor.set(0.5, 0.5); rank.x = 82;
      row.addChild(rank);

      const lv = label(`LV ${r.level}`, 21, 0xffffff);
      lv.anchor.set(0, 0.5); lv.x = 128;
      row.addChild(lv);

      for (let k = 0; k < 3; k++) {
        const s = star(7, k < r.stars);
        s.x = 248 + k * 19;
        row.addChild(s);
      }

      const sc = label(comma(r.score), 20, this.sortBy === 'score' ? THEME.accent : 0xffffff);
      sc.anchor.set(1, 0.5); sc.x = 432;
      const ba = label(r.balls == null ? '-' : comma(r.balls), 19, this.sortBy === 'balls' ? THEME.accent : 0xb9cddb, '500');
      ba.anchor.set(1, 0.5); ba.x = 566;
      const tu = label(r.turns == null ? '-' : String(r.turns), 19, this.sortBy === 'turns' ? THEME.accent : 0xb9cddb, '500');
      tu.anchor.set(1, 0.5); tu.x = 668;
      row.addChild(sc, ba, tu);

      this.inner.addChild(row);
    });

    this.contentH = rows.length * ROW_H + 20;
    this.maxScroll = Math.max(0, this.contentH - this.viewH);
    this.offset = Math.min(this.offset, this.maxScroll);
    if (this.offset < 0) this.offset = 0;
    this.inner.y = -this.offset;
  }

  update() {
    if (!this.dragging) {
      this.offset += this.vel;
      this.vel *= 0.92;
      if (this.offset < 0) { this.offset += (0 - this.offset) * 0.22; this.vel = 0; }
      else if (this.offset > this.maxScroll) { this.offset += (this.maxScroll - this.offset) * 0.22; this.vel = 0; }
      if (Math.abs(this.vel) < 0.05) this.vel = 0;
    }
    this.inner.y = -this.offset;
  }

  setVisible(v) {
    this.root.visible = v;
    if (v) { this.offset = 0; this.vel = 0; this.refresh(); }
  }
}

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function comma(n) { return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
