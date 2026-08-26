// 即時投注面板：全部下注 / 我的下注 / 最高（虛擬列表，只渲染可見列）
import { Container, Graphics } from '../../vendor/pixi.min.mjs';
import { COLORS } from '../config.js';
import { multColor } from '../config.js';
import { Tabs, ScrollBox, txt, panelBg, fmt } from './ui.js';

class Row extends Container {
  constructor() {
    super();
    this.bg = new Graphics();
    this.dot = new Graphics();
    this.name = txt('', 12, COLORS.textDim, '600');
    this.amount = txt('', 12, COLORS.text, '700');
    this.mult = txt('', 12, COLORS.textDim, '800');
    this.win = txt('', 12, COLORS.text, '700');
    this.amount.anchor.set(1, 0.5);
    this.mult.anchor.set(0.5, 0.5);
    this.win.anchor.set(1, 0.5);
    this.name.anchor.set(0, 0.5);
    this.addChild(this.bg, this.dot, this.name, this.amount, this.mult, this.win);
  }
}

export class Feed extends Container {
  constructor(game, bots, mobile) {
    super();
    this.game = game;
    this.engine = game.engine;
    this.bots = bots;
    this.tab = 'all';
    this.bg = new Graphics();
    this.addChild(this.bg);

    this.tabs = new Tabs([
      { id: 'all', label: '全部下注' },
      { id: 'mine', label: '我的下注' },
      { id: 'top', label: '最高' },
    ], 280, 26, (id) => { this.tab = id; this.scroll.content.y = 0; this.render(); });
    this.addChild(this.tabs);

    this.summary = txt('', 12, COLORS.textDim, '700');
    this.addChild(this.summary);

    this.head = new Container();
    this.headBg = new Graphics();
    this.h1 = txt('玩家', 11, COLORS.textFaint, '700');
    this.h2 = txt('下注', 11, COLORS.textFaint, '700');
    this.h3 = txt('倍數', 11, COLORS.textFaint, '700');
    this.h4 = txt('贏得', 11, COLORS.textFaint, '700');
    this.h2.anchor.set(1, 0); this.h3.anchor.set(0.5, 0); this.h4.anchor.set(1, 0);
    this.head.addChild(this.headBg, this.h1, this.h2, this.h3, this.h4);
    this.addChild(this.head);

    this.scroll = new ScrollBox(280, 300);
    this.addChild(this.scroll);
    this.pool = [];
    this.rowH = 30;
    this.data = [];
  }

  setRowCount(n) {
    while (this.pool.length < n) {
      const r = new Row();
      this.pool.push(r);
      this.scroll.content.addChild(r);
    }
    this.pool.forEach((r, i) => { r.visible = i < n; });
  }

  collect() {
    if (this.tab === 'all') return this.bots.list;
    if (this.tab === 'mine') {
      return this.game.myBets.map((b) => ({
        name: new Date(b.t).toLocaleTimeString('zh-TW', { hour12: false }),
        color: 0xffd60a, amount: b.amount, m: b.m, win: b.win, cashed: b.win > 0, lost: b.win === 0, mine: true,
      }));
    }
    return [...this.engine.history]
      .map((h, i) => ({ name: `#${h.nonce ?? i}`, color: multColor(h.m), amount: 0, m: h.m, win: 0, cashed: true, top: true }))
      .sort((a, b) => b.m - a.m);
  }

  render() {
    this.data = this.collect();
    this.scroll.contentHeight = this.data.length * this.rowH;
    const visible = Math.min(this.data.length, Math.ceil(this.scroll.h / this.rowH) + 2);
    this.setRowCount(visible);
    const first = Math.max(0, Math.floor(-this.scroll.content.y / this.rowH));
    const w = this.scroll.w;
    for (let i = 0; i < visible; i++) {
      const idx = first + i;
      const r = this.pool[i];
      const d = this.data[idx];
      if (!d) { r.visible = false; continue; }
      r.visible = true;
      r.y = idx * this.rowH;
      const hi = d.cashed && !d.top;
      panelBg(r.bg, w, this.rowH - 3, 7, hi ? 0x123a12 : (d.mine ? 0x2a2416 : 0x1f2023), hi ? 0x2f7a2f : null);
      r.dot.clear();
      r.dot.circle(12, this.rowH / 2 - 1.5, 6).fill(d.color);
      r.name.text = d.name;
      r.name.position.set(24, this.rowH / 2 - 1.5);
      r.amount.text = d.amount ? fmt(d.amount) : '—';
      r.amount.position.set(w * 0.56, this.rowH / 2 - 1.5);
      r.mult.text = d.m ? `${d.m.toFixed(2)}x` : (d.lost ? '—' : '');
      r.mult.style.fill = d.m ? multColor(d.m) : COLORS.textFaint;
      r.mult.position.set(w * 0.70, this.rowH / 2 - 1.5);
      r.win.text = d.win ? fmt(d.win) : (d.top ? '' : '—');
      r.win.style.fill = d.win ? COLORS.green : COLORS.textFaint;
      r.win.position.set(w - 10, this.rowH / 2 - 1.5);
    }
    const st = this.bots.stats;
    this.summary.text = this.tab === 'all'
      ? `本回合 ${st.total} 人下注 · 已兌現 ${st.cashed} 人 · 總押注 ${fmt(st.totalBet, 0)}`
      : (this.tab === 'mine' ? `我的紀錄 ${this.data.length} 筆` : `近 ${this.data.length} 回合最高倍數`);
  }

  update() {
    this.scroll.update();
    const y = this.scroll.content.y;
    if (y !== this._lastY) { this._lastY = y; this.render(); }
  }

  resize(w, h, L) {
    panelBg(this.bg, w, h, 12, COLORS.panelDeep, COLORS.panelLine);
    const pad = 8;
    const tw = w - pad * 2;
    this.tabs.resize(tw, 26);
    this.tabs.position.set(pad, pad);
    this.summary.position.set(pad + 2, pad + 34);
    this.rowH = L.feedRowH;

    const hy = pad + 54;
    panelBg(this.headBg, tw, 18, 4, 0x1a1b1e, null);
    this.head.position.set(pad, hy);
    this.h1.position.set(6, 3);
    this.h2.position.set(tw * 0.56, 3);
    this.h3.position.set(tw * 0.70, 3);
    this.h4.position.set(tw - 10, 3);

    this.scroll.position.set(pad, hy + 22);
    this.scroll.resize(tw, h - (hy + 22) - pad);
    this.pool.forEach((r) => { r.visible = false; });
    this.render();
  }
}
