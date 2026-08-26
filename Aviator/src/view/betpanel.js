// 單一下注面板（可同時存在兩個 = 原版的「雙押注」）
import { Container, Graphics } from '../../vendor/pixi.min.mjs';
import { COLORS, RULES } from '../config.js';
import { PHASE } from '../core/engine.js';
import { SLOT } from '../core/game.js';
import { Button, Tabs, Toggle, txt, panelBg, iconGfx, fmt } from './ui.js';

export class BetPanel extends Container {
  constructor(game, index, keypad, onToggleSecond) {
    super();
    this.game = game;
    this.engine = game.engine;
    this.slot = game.slots[index];
    this.index = index;
    this.keypad = keypad;

    this.bg = new Graphics();
    this.addChild(this.bg);

    this.tabs = new Tabs(
      [{ id: 'bet', label: '投注' }, { id: 'auto', label: '自動' }],
      120, 24, (id) => { this.slot.tab = id; this.refresh(); },
    );
    this.addChild(this.tabs);

    // 右上角 + / −（新增或移除第二個下注面板）
    this.sideBtn = new Container();
    this.sideG = new Graphics();
    this.sideIcon = iconGfx(index === 0 ? 'plus' : 'minus', 10, COLORS.text);
    this.sideBtn.addChild(this.sideG, this.sideIcon);
    this.sideBtn.eventMode = 'static';
    this.sideBtn.cursor = 'pointer';
    this.sideBtn.on('pointertap', () => onToggleSecond());
    this.addChild(this.sideBtn);

    // 金額列
    this.amtBg = new Graphics();
    this.amtText = txt('10.00', 20, COLORS.text, '800');
    this.amtText.anchor.set(0.5);
    this.amtHit = new Container();
    this.amtHit.eventMode = 'static';
    this.amtHit.cursor = 'pointer';
    this.amtHit.on('pointertap', () => this.openAmountPad());
    this.minusBtn = this.circleBtn('minus', () => this.game.setAmount(this.slot, this.slot.amount - this.step()));
    this.plusBtn = this.circleBtn('plus', () => this.game.setAmount(this.slot, this.slot.amount + this.step()));
    this.addChild(this.amtBg, this.amtText, this.amtHit, this.minusBtn, this.plusBtn);

    // 快捷金額
    this.quick = RULES.quickBets.map((v) => new Button({
      w: 60, h: 24, r: 12, top: 0x2e2f32, bottom: 0x232427, border: 0x4a4b4f, borderAlpha: 0.9,
      label: String(v), labelSize: 12, labelColor: COLORS.textDim,
      onTap: () => this.game.setAmount(this.slot, v),
    }));
    this.quick.forEach((b) => this.addChild(b));

    // 主按鈕
    this.mainBtn = new Button({
      w: 180, h: 66, r: 20, top: COLORS.greenLight, bottom: COLORS.greenDark,
      label: '投注', labelSize: 22, sub: '10.00 TWD', subSize: 14,
      onTap: () => this.onMain(),
    });
    this.addChild(this.mainBtn);

    // 自動分頁元件
    this.autoWrap = new Container();
    this.addChild(this.autoWrap);
    this.autoBetLabel = txt('自動下注', 13, COLORS.textDim, '700');
    this.autoBetToggle = new Toggle(34, 18, false, (v) => { this.slot.autoBet = v; this.refresh(); });
    this.autoCashLabel = txt('自動兌現', 13, COLORS.textDim, '700');
    this.autoCashToggle = new Toggle(34, 18, this.slot.autoCash, (v) => { this.slot.autoCash = v; this.game.save(); this.refresh(); });
    this.autoCashBg = new Graphics();
    this.autoCashText = txt('2.00x', 15, COLORS.text, '800');
    this.autoCashText.anchor.set(0.5);
    this.autoCashHit = new Container();
    this.autoCashHit.eventMode = 'static';
    this.autoCashHit.cursor = 'pointer';
    this.autoCashHit.on('pointertap', () => this.openTargetPad());
    this.autoWrap.addChild(this.autoBetLabel, this.autoBetToggle, this.autoCashLabel, this.autoCashBg, this.autoCashText, this.autoCashHit, this.autoCashToggle);

    // 兌現飄字
    this.flash = txt('', 15, COLORS.gold, '800');
    this.flash.anchor.set(0.5);
    this.flash.alpha = 0;
    this.addChild(this.flash);
    this.flashT = 0;

    this.refresh();
  }

  circleBtn(icon, onTap) {
    const c = new Container();
    const g = new Graphics();
    const ic = iconGfx(icon, 9, COLORS.textDim);
    c.addChild(g, ic);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', onTap);
    c._g = g; c._ic = ic;
    return c;
  }

  step() {
    const a = this.slot.amount;
    if (a < 10) return 1;
    if (a < 100) return 10;
    if (a < 1000) return 50;
    return 100;
  }

  openAmountPad() {
    this.keypad.open({
      title: '投注金額（3 ~ 3,000）', value: this.slot.amount.toFixed(2),
      min: RULES.minBet, max: RULES.maxBet, dec: 2,
      onDone: (v) => this.game.setAmount(this.slot, v),
    });
  }

  openTargetPad() {
    this.keypad.open({
      title: '自動兌現倍數', value: this.slot.autoCashAt.toFixed(2),
      min: 1.01, max: RULES.maxMultiplier, dec: 2,
      onDone: (v) => { this.slot.autoCashAt = Math.round(v * 100) / 100; this.game.save(); this.refresh(); },
    });
  }

  onMain() {
    const s = this.slot;
    if (s.state === SLOT.ACTIVE) this.game.cashOut(s);
    else if (s.state === SLOT.QUEUED) this.game.cancel(s);
    else this.game.place(s);
  }

  showFlash(text) {
    this.flash.text = text;
    this.flashT = 1400;
  }

  refresh() {
    const s = this.slot;
    const auto = s.tab === 'auto';
    this.tabs.value = s.tab;
    this.tabs.draw();
    this.quick.forEach((b) => { b.visible = !auto; });
    this.autoWrap.visible = auto;
    this.autoBetToggle.set(s.autoBet);
    this.autoCashToggle.set(s.autoCash);
    this.autoCashText.text = `${s.autoCashAt.toFixed(2)}x`;
    this.amtText.text = fmt(s.amount);
    this.updateMain();
  }

  updateMain() {
    const s = this.slot;
    const phase = this.engine.phase;
    const b = this.mainBtn;
    if (s.state === SLOT.ACTIVE) {
      b.setTheme(COLORS.orangeLight, COLORS.orange);
      const win = Math.min(s.amount * this.engine.mult, RULES.maxWinPerBet);
      b.setLabel('兌現', `${fmt(win)} TWD`);
      b.setEnabled(true);
    } else if (s.state === SLOT.QUEUED) {
      b.setTheme(COLORS.redLight, COLORS.red);
      b.setLabel('取消', phase === PHASE.BETTING ? `${fmt(s.amount)} TWD` : '等待下一回合');
      b.setEnabled(true);
    } else {
      b.setTheme(COLORS.greenLight, COLORS.greenDark);
      b.setLabel(phase === PHASE.FLYING ? '投注（下一回合）' : '投注', `${fmt(s.amount)} TWD`);
      b.setEnabled(this.game.balance >= s.amount && s.amount >= RULES.minBet);
    }
    const editable = s.state === SLOT.IDLE;
    [this.minusBtn, this.plusBtn, this.amtHit].forEach((c) => { c.eventMode = editable ? 'static' : 'none'; c.alpha = editable ? 1 : 0.5; });
    this.quick.forEach((q) => q.setEnabled(editable));
    this.amtText.alpha = editable ? 1 : 0.5;
  }

  update(dt) {
    if (this.slot.state === SLOT.ACTIVE) this.updateMain();
    if (this.flashT > 0) {
      this.flashT -= dt;
      this.flash.alpha = Math.min(1, this.flashT / 400);
      this.flash.y = this.flashY - (1 - Math.min(1, this.flashT / 1400)) * 14;
      if (this.flashT <= 0) this.flash.alpha = 0;
    }
  }

  resize(w, h, L, mobile) {
    this.w = w; this.h = h;
    panelBg(this.bg, w, h, 14, COLORS.panel, COLORS.panelLine);

    const tw = Math.min(130, w * 0.42);
    this.tabs.resize(tw, 24);
    this.tabs.position.set((w - tw) / 2, 8);

    const sb = 22;
    this.sideG.clear();
    this.sideG.circle(0, 0, sb / 2).fill(0x3a3b3e);
    this.sideBtn.position.set(w - sb / 2 - 10, 8 + 12);
    this.sideBtn.hitArea = { contains: (x, y) => x * x + y * y <= (sb * 0.8) ** 2 };

    const padX = 12;
    const bodyY = 40;
    const leftW = Math.min(w * 0.5, mobile ? w * 0.5 : 190);
    const amtH = L.amountH;

    panelBg(this.amtBg, leftW, amtH, amtH / 2, COLORS.panelDeep, 0x3a3b3e);
    this.amtBg.position.set(padX, bodyY);
    this.amtText.position.set(padX + leftW / 2, bodyY + amtH / 2);
    this.amtHit.position.set(padX + leftW * 0.25, bodyY);
    this.amtHit.hitArea = { contains: (x, y) => x >= 0 && x <= leftW * 0.5 && y >= 0 && y <= amtH };
    const cr = amtH * 0.36;
    this.minusBtn._g.clear(); this.minusBtn._g.circle(0, 0, cr).fill(0x3a3b3e);
    this.plusBtn._g.clear(); this.plusBtn._g.circle(0, 0, cr).fill(0x3a3b3e);
    this.minusBtn.position.set(padX + cr + 5, bodyY + amtH / 2);
    this.plusBtn.position.set(padX + leftW - cr - 5, bodyY + amtH / 2);
    const hit = (r) => ({ contains: (x, y) => x * x + y * y <= r * r });
    this.minusBtn.hitArea = hit(cr + 4);
    this.plusBtn.hitArea = hit(cr + 4);

    // 快捷金額 2x2
    const qw = (leftW - 8) / 2, qh = L.quickH;
    this.quick.forEach((b, i) => {
      b.setSize2(qw, qh);
      b.position.set(padX + (i % 2) * (qw + 8), bodyY + amtH + 8 + ((i / 2) | 0) * (qh + 6));
    });

    // 主按鈕
    const mw = w - leftW - padX * 2 - 10;
    const mh = L.betBtnH;
    this.mainBtn.setSize2(mw, mh);
    this.mainBtn.setFontSize(mobile ? 18 : 22, mobile ? 12 : 14);
    this.mainBtn.position.set(padX + leftW + 10, bodyY + (h - bodyY - mh) / 2 - 4);

    // 自動分頁
    const ay = bodyY + amtH + 10;
    this.autoBetLabel.position.set(padX, ay + 2);
    this.autoBetToggle.position.set(padX + 66, ay);
    this.autoCashLabel.position.set(padX, ay + 30);
    this.autoCashToggle.position.set(padX + 66, ay + 28);
    const cw = Math.min(72, leftW - 110);
    panelBg(this.autoCashBg, cw, 24, 12, COLORS.panelDeep, 0x3a3b3e);
    this.autoCashBg.position.set(padX + 110, ay + 25);
    this.autoCashText.position.set(padX + 110 + cw / 2, ay + 37);
    this.autoCashHit.position.set(padX + 110, ay + 25);
    this.autoCashHit.hitArea = { contains: (x, y) => x >= 0 && x <= cw && y >= 0 && y <= 24 };

    this.flashY = bodyY - 14;
    this.flash.position.set(w / 2, this.flashY);
    this.refresh();
  }
}
