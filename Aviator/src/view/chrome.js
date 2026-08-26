// 顶列（Logo / 余额 / 菜单）与历史倍数列
import { Container, Graphics } from '../../vendor/pixi.min.mjs';
import { COLORS, multColor } from '../config.js';
import { txt, panelBg, iconGfx, fmt } from './ui.js';

export class TopBar extends Container {
  constructor(game, onMenu, onHelp) {
    super();
    this.game = game;
    this.bg = new Graphics();
    this.addChild(this.bg);

    this.logo = new Container();
    const mark = new Graphics();
    // 红色机翼标志
    mark.moveTo(0, 8).lineTo(16, 0).lineTo(13, 8).lineTo(22, 8).lineTo(6, 14).lineTo(8, 8).closePath().fill(COLORS.red);
    const name = txt('Aviator', 20, COLORS.red, '800');
    name.position.set(26, -4);
    this.logo.addChild(mark, name);
    this.addChild(this.logo);

    this.help = txt('如何游玩', 12, COLORS.textDim, '700');
    this.help.eventMode = 'static';
    this.help.cursor = 'pointer';
    this.help.on('pointertap', onHelp);
    this.addChild(this.help);

    this.balBg = new Graphics();
    this.bal = txt('0.00', 15, COLORS.green, '800');
    this.cur = txt('TWD', 11, COLORS.textFaint, '700');
    this.bal.anchor.set(1, 0.5);
    this.cur.anchor.set(0, 0.5);
    this.addChild(this.balBg, this.bal, this.cur);

    this.menuBtn = new Container();
    const mg = new Graphics();
    const mi = iconGfx('menu', 14, COLORS.textDim);
    this.menuBtn.addChild(mg, mi);
    this.menuBtn.eventMode = 'static';
    this.menuBtn.cursor = 'pointer';
    this.menuBtn.on('pointertap', onMenu);
    this.menuBtn._g = mg;
    this.addChild(this.menuBtn);
  }

  refresh() {
    this.bal.text = fmt(this.game.balance);
  }

  resize(w, h, mobile) {
    panelBg(this.bg, w, h, 0, 0x1b1c1d, null);
    this.logo.position.set(12, h / 2 - 7);
    this.logo.scale.set(mobile ? 0.82 : 1);
    this.help.position.set(mobile ? 130 : 160, h / 2 - 7);
    this.help.visible = !mobile || w > 380;

    const bw = mobile ? 128 : 160;
    const bx = w - bw - 42;
    panelBg(this.balBg, bw, h - 12, (h - 12) / 2, 0x101112, 0x2c2d30);
    this.balBg.position.set(bx, 6);
    this.bal.position.set(bx + bw - 44, h / 2);
    this.cur.position.set(bx + bw - 40, h / 2);

    this.menuBtn._g.clear();
    this.menuBtn._g.circle(0, 0, 14).fill(0x2a2b2e);
    this.menuBtn.position.set(w - 22, h / 2);
    this.menuBtn.hitArea = { contains: (x, y) => x * x + y * y <= 18 * 18 };
    this.refresh();
  }
}

export class HistoryBar extends Container {
  constructor(engine) {
    super();
    this.engine = engine;
    this.bg = new Graphics();
    this.addChild(this.bg);
    this.wrap = new Container();
    this.maskG = new Graphics();
    this.wrap.mask = this.maskG;
    this.addChild(this.wrap, this.maskG);
    this.pills = [];
    this.expanded = false;

    this.moreBtn = new Container();
    this.moreG = new Graphics();
    this.moreIcon = txt('▾', 12, COLORS.textDim, '800');
    this.moreIcon.anchor.set(0.5);
    this.moreBtn.addChild(this.moreG, this.moreIcon);
    this.moreBtn.eventMode = 'static';
    this.moreBtn.cursor = 'pointer';
    this.moreBtn.on('pointertap', () => { this.expanded = !this.expanded; this.layout(); });
    this.addChild(this.moreBtn);
  }

  pill(m) {
    const c = new Container();
    const g = new Graphics();
    const t = txt(`${m.toFixed(2)}x`, 12, multColor(m), '800');
    t.anchor.set(0.5);
    const w = t.width + 16, h = 20;
    panelBg(g, w, h, h / 2, 0x121316, null);
    g.roundRect(0.5, 0.5, w - 1, h - 1, h / 2).stroke({ width: 1, color: multColor(m), alpha: 0.35 });
    t.position.set(w / 2, h / 2);
    c.addChild(g, t);
    c._w = w;
    return c;
  }

  refresh() {
    this.wrap.removeChildren();
    this.pills = this.engine.history.map((h) => this.pill(h.m));
    this.pills.forEach((p) => this.wrap.addChild(p));
    this.layout();
  }

  layout() {
    const w = this.w || 600, h = this.h || 40;
    const rows = this.expanded ? 4 : 1;
    const boxH = this.expanded ? h * 4 : h;
    panelBg(this.bg, w, boxH, 10, 0x1b1c1d, null);
    this.maskG.clear();
    this.maskG.rect(0, 0, w - 34, boxH).fill(0xffffff);
    let x = 8, y = (h - 20) / 2, row = 0;
    for (const p of this.pills) {
      if (x + p._w > w - 40) {
        row += 1;
        if (row >= rows) { p.visible = false; continue; }
        x = 8; y += 24;
      }
      p.visible = true;
      p.position.set(x, y);
      x += p._w + 6;
    }
    this.moreG.clear();
    this.moreG.circle(0, 0, 12).fill(0x2a2b2e);
    this.moreBtn.position.set(w - 20, h / 2);
    this.moreBtn.hitArea = { contains: (px, py) => px * px + py * py <= 16 * 16 };
    this.moreIcon.text = this.expanded ? '▴' : '▾';
    this.boxH = boxH;
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.refresh();
  }
}
