import { Container, Graphics, Text, Sprite } from '../../vendor/pixi.min.mjs';
import { WORLD, LAYOUT, IS_TOUCH } from '../config.js';
import { TEX } from './textures.js';
import { bestScore } from '../store/leaderboard.js';

const FONT = 'system-ui, "PingFang TC", "Microsoft JhengHei", sans-serif';
const txt = (size, fill, weight = '700', align = 'left') => ({
  fontFamily: FONT, fontSize: size, fill, fontWeight: weight, align,
  stroke: { color: 0x000814, width: Math.max(3, size * 0.18) },
});

// 遊戲中的 HUD：分數、即時排行榜、小地圖、觸控按鈕（全部用 Pixi 繪製，不用 DOM）
export class HUD {
  constructor(app) {
    this.app = app;
    this.root = new Container();
    app.stage.addChild(this.root);

    this.scoreLabel = new Text({ text: '', style: txt(22, 0xffffff) });
    this.bestLabel = new Text({ text: '', style: txt(14, 0x9fd0ff, '600') });
    this.rankLabel = new Text({ text: '', style: txt(14, 0xffd54f, '600') });

    this.boardBg = new Graphics();
    this.boardTitle = new Text({ text: '排行榜', style: txt(16, 0xffffff) });
    this.boardRows = [];
    for (let i = 0; i < 10; i++) {
      this.boardRows.push(new Text({ text: '', style: txt(15, 0xdfe9ff, '600') }));
    }

    this.minimap = new Graphics();

    // 觸控：加速按鈕 + 搖桿
    this.boostBtn = new Graphics();
    this.boostIcon = new Text({ text: '衝', style: txt(22, 0xdff6ff) });
    this.boostIcon.anchor.set(0.5);
    this.joy = new Graphics();
    this.quitBtn = new Graphics();
    this.quitIcon = new Text({ text: '✕', style: txt(15, 0xffb4c0) });
    this.quitIcon.anchor.set(0.5);

    this.root.addChild(this.boardBg, this.boardTitle, ...this.boardRows,
      this.scoreLabel, this.bestLabel, this.rankLabel, this.minimap, this.joy, this.boostBtn, this.boostIcon, this.quitBtn, this.quitIcon);
    this.layout();
  }

  // 負數座標代表從右／下邊界回推
  px(v, size) { return v >= 0 ? v : this.app.screen.width + v - size; }
  py(v, size) { return v >= 0 ? v : this.app.screen.height + v - size; }

  layout() {
    const L = LAYOUT, W = this.app.screen.width, H = this.app.screen.height;
    const k = L.hudScale;
    this.scoreLabel.style.fontSize = L.scoreSize * k;
    this.scoreLabel.position.set(this.px(L.scoreX, 0), this.py(L.scoreY, 0));
    this.bestLabel.style.fontSize = 13 * k;
    this.bestLabel.position.set(this.scoreLabel.x, this.scoreLabel.y + L.scoreSize * k + 6);
    this.rankLabel.style.fontSize = 13 * k;
    this.rankLabel.position.set(this.scoreLabel.x, this.bestLabel.y + 18 * k);

    const bw = 172 * k, rows = L.boardRows;
    const bx = L.boardX >= 0 ? L.boardX : W + L.boardX - bw;
    const by = this.py(L.boardY, 0);
    this.boardTitle.style.fontSize = 16 * k;
    this.boardTitle.position.set(bx + 10 * k, by + 8 * k);
    this.boardBg.clear()
      .roundRect(bx, by, bw, (rows + 1) * (L.boardSize * k + 6) + 14 * k, 12)
      .fill({ color: 0x081226, alpha: 0.45 * L.boardAlpha })
      .stroke({ color: 0x4d7dff, width: 1.5, alpha: 0.35 });
    this.boardRows.forEach((r, i) => {
      r.visible = i < rows;
      r.style.fontSize = L.boardSize * k;
      r.position.set(bx + 10 * k, by + 30 * k + i * (L.boardSize * k + 6));
    });
    this.boardBg.alpha = L.boardAlpha;

    const ms = L.minimapSize * k;
    this.mmX = this.px(L.minimapX, ms); this.mmY = this.py(L.minimapY, ms); this.mmS = ms;

    // 離開本局按鈕（手機用；PC 用 Esc）
    this.qR = (L.quitR || 0) * k;
    if (this.qR > 0) {
      this.qX = this.px(L.quitX, 0); this.qY = this.py(L.quitY, 0);
      this.quitBtn.clear().circle(this.qX, this.qY, this.qR)
        .fill({ color: 0x2a0d18, alpha: 0.5 }).stroke({ color: 0xff6b8b, width: 1.6, alpha: 0.5 });
      this.quitIcon.position.set(this.qX, this.qY);
      this.quitIcon.style.fontSize = 15 * k;
      this.quitBtn.visible = this.quitIcon.visible = true;
    } else {
      this.quitBtn.visible = this.quitIcon.visible = false;
    }

    if (L.boostBtnR > 0) {
      const r = L.boostBtnR * k;
      this.bbX = this.px(L.boostBtnX, 0); this.bbY = this.py(L.boostBtnY, 0);
      this.bbR = r;
      this.boostIcon.style.fontSize = 24 * k;
      this.boostIcon.position.set(this.bbX, this.bbY);
      this.boostBtn.visible = this.boostIcon.visible = true;
    } else {
      this.boostBtn.visible = this.boostIcon.visible = false;
      this.bbR = 0;
    }
  }

  update(world, dt, input) {
    const p = world.player;
    const score = p && !p.dead ? p.score : 0;
    this.scoreLabel.text = `分數 ${score}`;
    this.bestLabel.text = `最高 ${Math.max(bestScore(), score)}`;

    // 即時排行榜
    const board = world.board;
    let myRank = -1;
    for (let i = 0; i < board.length; i++) if (board[i] === p) myRank = i + 1;
    if (myRank < 0 && p && !p.dead) {
      const all = world.snakes.filter((s) => !s.dead).sort((a, b) => b.mass - a.mass);
      myRank = all.indexOf(p) + 1;
      this.rankLabel.text = `名次 ${myRank} / ${all.length}`;
    } else this.rankLabel.text = myRank > 0 ? `名次 ${myRank}` : '';

    for (let i = 0; i < this.boardRows.length; i++) {
      const row = this.boardRows[i];
      if (!row.visible) continue;
      const s = board[i];
      if (!s) { row.text = ''; continue; }
      const name = s.name.length > 7 ? s.name.slice(0, 7) : s.name;
      row.text = `${i + 1}. ${name}  ${s.score}`;
      row.style.fill = s === p ? 0xffe066 : 0xdfe9ff;
    }

    this.drawMinimap(world);
    if (this.bbR > 0) {
      const on = input?.boosting;
      this.boostBtn.clear()
        .circle(this.bbX, this.bbY, this.bbR)
        .fill({ color: on ? 0x39d0ff : 0x0d2a4d, alpha: on ? 0.4 : 0.32 })
        .stroke({ color: on ? 0x9ff0ff : 0x5fbcff, width: on ? 4 : 2.5, alpha: on ? 0.95 : 0.55 });
      this.boostIcon.alpha = on ? 1 : 0.75;
    }
    this.drawJoystick(input);
    this.updateToast(dt);
  }

  // DEV 拖曳用：回傳被點到的 HUD 元件與其對應的 LAYOUT 座標鍵
  hitTest(x, y) {
    const inRect = (rx, ry, rw, rh) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
    if (this.qR > 0 && Math.hypot(x - this.qX, y - this.qY) < this.qR) return { kx: 'quitX', ky: 'quitY' };
    if (this.bbR > 0 && Math.hypot(x - this.bbX, y - this.bbY) < this.bbR) return { kx: 'boostBtnX', ky: 'boostBtnY' };
    if (inRect(this.mmX, this.mmY, this.mmS, this.mmS)) return { kx: 'minimapX', ky: 'minimapY' };
    const b = this.boardBg.getLocalBounds();
    if (inRect(b.x, b.y, b.width, b.height)) return { kx: 'boardX', ky: 'boardY' };
    if (inRect(this.scoreLabel.x - 6, this.scoreLabel.y - 6, this.scoreLabel.width + 12, this.scoreLabel.height + 40)) {
      return { kx: 'scoreX', ky: 'scoreY' };
    }
    return null;
  }

  // 擊殺 / 提示飄字
  toast(text, color = 0xffe066) {
    if (!this._toast) {
      this._toast = new Text({ text: '', style: txt(26, color) });
      this._toast.anchor.set(0.5);
      this.root.addChild(this._toast);
    }
    this._toast.text = text;
    this._toast.style.fill = color;
    this._toast.alpha = 1;
    this._toastLife = 1.4;
  }

  updateToast(dt) {
    if (!this._toast || this._toastLife <= 0) { if (this._toast) this._toast.alpha = 0; return; }
    this._toastLife -= dt;
    const k = Math.max(0, this._toastLife / 1.4);
    this._toast.alpha = Math.min(1, k * 2);
    this._toast.position.set(this.app.screen.width / 2, this.app.screen.height * 0.26 - (1 - k) * 40);
  }

  drawMinimap(world) {
    const g = this.minimap, s = this.mmS, x = this.mmX, y = this.mmY, r = s / 2;
    const cx = x + r, cy = y + r;
    g.clear();
    g.circle(cx, cy, r).fill({ color: 0x061024, alpha: 0.55 }).stroke({ color: 0x4d7dff, width: 1.5, alpha: 0.5 });
    const k = r / WORLD.radius;
    for (const sn of world.snakes) {
      if (sn.dead) continue;
      const d = Math.min(1, Math.hypot(sn.x, sn.y) / WORLD.radius);
      const a = Math.atan2(sn.y, sn.x);
      const px = cx + Math.cos(a) * d * r, py = cy + Math.sin(a) * d * r;
      if (sn.isPlayer) {
        g.circle(px, py, 4).fill({ color: 0xffe066 });
        g.circle(px, py, 8).stroke({ color: 0xffe066, width: 1.4, alpha: 0.55 });
      } else {
        g.circle(px, py, 1.8 + Math.min(2.6, sn.mass / 160)).fill({ color: sn.skin[0], alpha: 0.8 });
      }
    }
    g.alpha = LAYOUT.minimapAlpha;
  }

  drawJoystick(input) {
    const g = this.joy;
    g.clear();
    if (!input?.joystick?.active) return;
    const j = input.joystick;
    g.circle(j.ox, j.oy, j.radius).fill({ color: 0xffffff, alpha: 0.08 }).stroke({ color: 0x9fd0ff, width: 2, alpha: 0.35 });
    g.circle(j.x, j.y, j.radius * 0.42).fill({ color: 0x9fd0ff, alpha: 0.35 }).stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
  }
}
