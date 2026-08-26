// 菜单 / 玩法说明 / Provably Fair 验证（全部以引擎渲染）
import { Container, Graphics } from '../../vendor/pixi.min.mjs';
import { COLORS, RULES } from '../config.js';
import { verify, randomSeed } from '../core/fair.js';
import { Button, ScrollBox, Toggle, txt, panelBg, iconGfx, fmt } from './ui.js';

const HELP = [
  ['飞行员 Aviator 怎么玩', ''],
  ['① 投注', '回合起飞前输入金额或用快捷钮（10 / 20 / 50 / 100），按「投注」。起飞前都可以按「取消」收回。'],
  ['② 见证', '飞机起飞，倍数从 1.00x 开始往上爬，撑得越久倍数越高。'],
  ['③ 兑现', '在飞机飞走前按「兑现」，锁定当下倍数。奖金 = 兑现倍数 × 投注额。'],
  ['没兑现就归零', '飞机在你兑现前飞走，这一注全部失去。建议先设好目标倍数，到点就走。'],
  ['双押注', '按面板右上角的加号会多出第二个下注面板，可一注求稳、一注冲高倍。'],
  ['自动游戏与自动兑现', '「自动」分页可打开自动下注；再开自动兑现并设置目标倍数，到点自动帮你收。'],
  ['Provably Fair', '每回合倍数在开局前就由 SHA-256 产生并公布承诺哈希，回合结束后可自行验证。'],
  ['限额', `最小投注 NT$${RULES.minBet}、最大投注 NT$${fmt(RULES.maxBet, 0)}、每注奖金上限 NT$${fmt(RULES.maxWinPerBet, 0)}、最大倍率 ${fmt(RULES.maxMultiplier, 0)}x、RTP ${RULES.rtp * 100}%。`],
];

export class Modal extends Container {
  constructor(app) {
    super();
    this.app = app;
    this.visible = false;
    this.dim = new Graphics();
    this.dim.eventMode = 'static';
    this.dim.on('pointertap', () => this.close());
    this.addChild(this.dim);

    this.box = new Container();
    this.box.eventMode = 'static';
    this.addChild(this.box);
    this.bg = new Graphics();
    this.title = txt('', 16, COLORS.text, '800');
    this.closeBtn = new Container();
    this.closeG = new Graphics();
    this.closeBtn.addChild(this.closeG, iconGfx('close', 12, COLORS.textDim));
    this.closeBtn.eventMode = 'static';
    this.closeBtn.cursor = 'pointer';
    this.closeBtn.on('pointertap', () => this.close());
    this.scroll = new ScrollBox(300, 300);
    this.box.addChild(this.bg, this.title, this.closeBtn, this.scroll);
  }

  close() { this.visible = false; }

  open(kind, ctx) {
    this.kind = kind;
    this.ctx = ctx;
    this.visible = true;
    this.build();
    this.layout();
  }

  clearContent() {
    this.scroll.content.removeChildren();
    this._y = 0;
  }

  addText(str, size = 13, color = COLORS.textDim, weight = '600') {
    const t = txt(str, size, color, weight);
    t.style.wordWrap = true;
    t.style.breakWords = true; // 中文没有空格，需强制断行才不会溢出面板
    t.style.wordWrapWidth = this.scroll.w - 8;
    t.position.set(4, this._y);
    this.scroll.content.addChild(t);
    this._y += t.height + 8;
    return t;
  }

  addRow(label, value, valueColor = COLORS.text) {
    const g = new Graphics();
    g.position.set(4, this._y);
    const l = txt(label, 11, COLORS.textFaint, '700');
    l.position.set(12, this._y + 6);
    const v = txt(value, 12, valueColor, '700');
    v.style.wordWrap = true;
    v.style.breakWords = true; // 哈希是无空格长字符串，需强制断行
    v.style.wordWrapWidth = this.scroll.w - 32;
    v.position.set(12, this._y + 20);
    panelBg(g, this.scroll.w - 8, Math.max(40, v.height + 26), 8, 0x151618, COLORS.panelLine);
    g.position.set(4, this._y);
    this.scroll.content.addChild(g, l, v);
    this._y += Math.max(46, v.height + 32);
    return v;
  }

  addButton(label, onTap, color = [COLORS.greenLight, COLORS.greenDark], w = null) {
    const b = new Button({
      w: w || this.scroll.w - 8, h: 40, r: 20, top: color[0], bottom: color[1],
      label, labelSize: 14, onTap,
    });
    b.position.set(4, this._y);
    this.scroll.content.addChild(b);
    this._y += 48;
    return b;
  }

  addToggleRow(label, value, onChange) {
    const g = new Graphics();
    panelBg(g, this.scroll.w - 8, 38, 8, 0x151618, COLORS.panelLine);
    g.position.set(4, this._y);
    const l = txt(label, 13, COLORS.text, '700');
    l.position.set(12, this._y + 12);
    const t = new Toggle(34, 18, value, onChange);
    t.position.set(this.scroll.w - 50, this._y + 10);
    this.scroll.content.addChild(g, l, t);
    this._y += 44;
  }

  build() {
    this.clearContent();
    const { kind, ctx } = this;
    if (kind === 'menu') {
      this.title.text = '菜单';
      this.addButton('游戏规则与玩法', () => this.open('help', ctx), [0x3a3b3e, 0x2a2b2e]);
      this.addButton('Provably Fair 公平验证', () => this.open('fair', ctx), [0x3a3b3e, 0x2a2b2e]);
      this.addToggleRow('音效', ctx.sfx.enabled, (v) => ctx.sfx.setEnabled(v));
      this.addToggleRow('动画背景', ctx.settings.bgAnim, (v) => { ctx.settings.bgAnim = v; });
      this.addText('DEV 微调工具：按键盘 D 打开（可即时调整版面并导出 JSON）', 11, COLORS.textFaint);
      this.addButton(`重置余额为 ${fmt(RULES.startBalance, 0)}`, () => {
        ctx.game.balance = RULES.startBalance;
        ctx.game.save();
        ctx.game.emit('change');
        this.close();
      }, [COLORS.orangeLight, COLORS.orange]);
      this.addText('本作为 SPRIBE《Aviator》玩法的技术重制 Demo，纯娱乐展示，不涉及任何真实金流。', 11, COLORS.textFaint);
    } else if (kind === 'help') {
      this.title.text = '如何游玩';
      HELP.forEach(([h, b], i) => {
        if (i === 0) return;
        this.addText(h, 14, COLORS.text, '800');
        this._y -= 4;
        this.addText(b, 12, COLORS.textDim);
      });
    } else if (kind === 'fair') {
      this.title.text = 'Provably Fair 公平验证';
      const e = ctx.engine;
      const last = e.history.find((h) => h.serverSeed); // 略过首次加载的示范历史
      this.addText('每回合的倍数在开局前就已由 SHA-256 决定，并先公布承诺哈希；回合结束后公开 Server Seed，任何人都能重算验证。', 12, COLORS.textDim);
      this.addRow('Client Seed（可修改）', e.clientSeed, COLORS.cyan);
      this.addButton('产生新的 Client Seed', () => {
        e.setClientSeed(randomSeed(8));
        this.build();
        this.layout();
      }, [0x3a3b3e, 0x2a2b2e]);
      if (e.next) this.addRow('下一回合承诺哈希 (SHA-256)', e.next.commit, COLORS.gold);
      if (last) {
        this.addText('上一回合', 14, COLORS.text, '800');
        this.addRow('Nonce', String(last.nonce));
        this.addRow('Server Seed', last.serverSeed);
        this.addRow('结果哈希', last.hash);
        this.addRow('崩盘倍数', `${last.m.toFixed(2)}x`, COLORS.red);
        const res = this.addRow('验证结果', '尚未验证', COLORS.textDim);
        this.addButton('重新计算并验证', async () => {
          const v = await verify(last.serverSeed, last.clientSeed, last.nonce);
          const ok = v.hash === last.hash && Math.abs(v.crash - last.m) < 1e-9;
          res.text = ok ? `✓ 验证通过：重算结果同为 ${v.crash.toFixed(2)}x` : `✗ 不一致（${v.crash.toFixed(2)}x）`;
          res.style.fill = ok ? COLORS.green : COLORS.red;
        });
      }
      this.addText(`分布公式：P(倍数 ≥ m) = RTP / m，RTP = ${RULES.rtp * 100}%`, 11, COLORS.textFaint);
    }
    this.scroll.contentHeight = this._y;
  }

  layout() {
    const W = this.app.screen.width / this.app.stage.scale.x;
    const H = this.app.screen.height / this.app.stage.scale.y;
    this.dim.clear();
    this.dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.7 });
    const bw = Math.min(420, W - 32);
    const bh = Math.min(560, H - 60);
    this.box.position.set((W - bw) / 2, (H - bh) / 2);
    panelBg(this.bg, bw, bh, 14, COLORS.panel, COLORS.panelLine);
    this.title.position.set(16, 14);
    this.closeG.clear();
    this.closeG.circle(0, 0, 14).fill(0x2a2b2e);
    this.closeBtn.position.set(bw - 24, 26);
    this.closeBtn.hitArea = { contains: (x, y) => x * x + y * y <= 18 * 18 };
    this.scroll.position.set(12, 48);
    this.scroll.resize(bw - 24, bh - 60);
    if (this.visible) this.build();
  }

  update() { if (this.visible) this.scroll.update(); }
}
