import { Container, Graphics, Text } from '../../vendor/pixi.min.mjs';
import { loadScores, loadName, saveName } from '../store/leaderboard.js';
import { IS_TOUCH } from '../config.js';
import { SFX, unlockAudio } from '../audio/sfx.js';

const FONT = 'system-ui, "PingFang TC", "Microsoft JhengHei", sans-serif';
const st = (size, fill, weight = '800', align = 'center') => ({
  fontFamily: FONT, fontSize: size, fill, fontWeight: weight, align,
});

// 開始畫面與結算畫面（Pixi 繪製；暱稱輸入借一個透明 DOM input 以喚起手機鍵盤）
export class Menu {
  constructor(app, onStart) {
    this.app = app;
    this.onStart = onStart;
    this.root = new Container();
    this.root.zIndex = 100;
    app.stage.addChild(this.root);

    this.dim = new Graphics();
    this.panel = new Graphics();
    this.title = new Text({ text: '貪蛇進化', style: st(58, 0xffffff) });
    this.title.anchor.set(0.5);
    this.subtitle = new Text({ text: 'SLITHER EVOLUTION', style: st(15, 0x7fd4ff, '700') });
    this.subtitle.anchor.set(0.5);

    this.nameBox = new Graphics();
    this.nameText = new Text({ text: '', style: st(22, 0xffffff, '700', 'left') });
    this.nameText.anchor.set(0, 0.5);

    this.btn = new Graphics();
    this.btnText = new Text({ text: '開始遊戲', style: st(26, 0x04121f) });
    this.btnText.anchor.set(0.5);
    this.btn.eventMode = 'static'; this.btn.cursor = 'pointer';
    this.btn.on('pointertap', () => this.start());

    this.hint = new Text({ text: '', style: st(14, 0x9fb6d6, '600') });
    this.hint.anchor.set(0.5);

    this.boardTitle = new Text({ text: '本機最佳紀錄', style: st(16, 0xffd54f) });
    this.boardTitle.anchor.set(0.5);
    this.boardText = new Text({ text: '', style: st(15, 0xcfe2ff, '600') });
    this.boardText.anchor.set(0.5);

    this.statText = new Text({ text: '', style: st(18, 0xdfe9ff, '700') });
    this.statText.anchor.set(0.5);

    this.root.addChild(this.dim, this.panel, this.title, this.subtitle, this.nameBox,
      this.nameText, this.btn, this.btnText, this.hint, this.boardTitle, this.boardText, this.statText);

    this.input = document.createElement('input');
    this.input.maxLength = 12;
    this.input.value = loadName();
    Object.assign(this.input.style, {
      position: 'fixed', background: 'transparent', border: 'none', outline: 'none',
      color: 'transparent', caretColor: 'transparent', fontSize: '16px', zIndex: '5', padding: '0',
    });
    this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.start(); });
    document.body.appendChild(this.input);

    this.mode = 'start';
    this.caret = 0;
  }

  start() {
    const name = (this.input.value || '').trim().slice(0, 12) || '玩家';
    saveName(name);
    unlockAudio(); SFX.start();
    this.hide();
    this.onStart(name);
  }

  showStart() {
    this.mode = 'start';
    this.root.visible = true;
    this.input.style.display = 'block';
    this.layout();
    setTimeout(() => { if (!IS_TOUCH) this.input.focus(); }, 50);
  }

  showGameOver(stats) {
    this.mode = 'over';
    this.root.visible = true;
    this.input.style.display = 'none';
    this.stats = stats;
    this.btnText.text = '再玩一次';
    this.layout();
  }

  hide() {
    this.root.visible = false;
    this.input.style.display = 'none';
    this.input.blur();
  }

  layout() {
    const W = this.app.screen.width, H = this.app.screen.height;
    const pw = Math.min(430, W - 40), ph = this.mode === 'start' ? Math.min(520, H - 40) : Math.min(470, H - 40);
    const px = (W - pw) / 2, py = (H - ph) / 2;

    this.dim.clear().rect(0, 0, W, H).fill({ color: 0x030814, alpha: 0.68 });
    this.panel.clear()
      .roundRect(px, py, pw, ph, 22)
      .fill({ color: 0x0a1530, alpha: 0.94 })
      .stroke({ color: 0x3f7dff, width: 2, alpha: 0.55 });

    const cx = W / 2;
    if (this.mode === 'start') {
      this.title.text = '貪蛇進化';
      this.title.style.fontSize = Math.min(58, pw * 0.16);
      this.title.position.set(cx, py + 62);
      this.subtitle.visible = true;
      this.subtitle.position.set(cx, py + 104);

      const bw = pw - 76, bh = 52, bx = cx - bw / 2, by = py + 138;
      this.nameBox.visible = true;
      this.nameBox.clear().roundRect(bx, by, bw, bh, 12)
        .fill({ color: 0x061024, alpha: 0.9 })
        .stroke({ color: 0x4d8dff, width: 2, alpha: 0.7 });
      this.nameText.visible = true;
      this.nameText.position.set(bx + 16, by + bh / 2);

      const r = this.app.canvas.getBoundingClientRect();
      Object.assign(this.input.style, {
        left: `${r.left + bx + 16}px`, top: `${r.top + by}px`,
        width: `${bw - 32}px`, height: `${bh}px`,
      });

      const btw = bw, bth = 60, btx = cx - btw / 2, bty = by + bh + 22;
      this.btnText.text = '開始遊戲';
      this.drawButton(btx, bty, btw, bth);

      this.hint.visible = true;
      this.hint.style.fontSize = 14;
      this.hint.text = IS_TOUCH
        ? '單指拖曳控制方向　推到底＝衝刺\n放開手指即取消'
        : '滑鼠控制方向　按住左鍵 / 空白鍵加速\nD 鍵開啟版面微調工具';
      this.hint.position.set(cx, bty + bth + 34);

      const scores = loadScores();
      this.boardTitle.visible = true;
      this.boardTitle.position.set(cx, bty + bth + 84);
      this.boardText.visible = true;
      this.boardText.text = scores.length
        ? scores.slice(0, 5).map((s, i) => `${i + 1}. ${s.name}  ${s.score}  (擊殺 ${s.kills})`).join('\n')
        : '尚無紀錄，開一局吧！';
      this.boardText.position.set(cx, bty + bth + 118);
      this.statText.visible = false;
    } else {
      const s = this.stats || {};
      this.title.text = '被吃掉了！';
      this.title.style.fontSize = Math.min(44, pw * 0.13);
      this.title.position.set(cx, py + 56);
      this.subtitle.visible = false;
      this.nameBox.visible = false;
      this.nameText.visible = false;

      this.statText.visible = true;
      this.statText.text =
        `分數　${s.score}\n最終長度　${s.length}\n擊殺　${s.kills}\n本局名次　${s.rank} / ${s.total}\n存活　${s.time} 秒` +
        (s.recordRank >= 0 ? `\n★ 進入本機排行榜第 ${s.recordRank + 1} 名` : '');
      this.statText.position.set(cx, py + 158);

      const scores = loadScores();
      this.boardTitle.visible = true;
      this.boardTitle.text = '本機最佳紀錄';
      this.boardTitle.position.set(cx, py + 272);
      this.boardText.visible = true;
      this.boardText.text = scores.slice(0, 3)
        .map((r, i) => `${i + 1}. ${r.name}  ${r.score}  (擊殺 ${r.kills})`).join('\n');
      this.boardText.position.set(cx, py + 310);

      const bw = pw - 76, bth = 58, btx = cx - bw / 2, bty = py + ph - 82;
      this.drawButton(btx, bty, bw, bth);
      this.hint.visible = false;
    }
  }

  drawButton(x, y, w, h) {
    this.btn.clear()
      .roundRect(x, y, w, h, 14)
      .fill({ color: 0x39d0ff })
      .stroke({ color: 0xbdf0ff, width: 2, alpha: 0.8 });
    this.btn.hitArea = { contains: (mx, my) => mx >= x && mx <= x + w && my >= y && my <= y + h };
    this.btnText.position.set(x + w / 2, y + h / 2);
  }

  update(dt) {
    if (!this.root.visible || this.mode !== 'start') return;
    // 暱稱：文字由 Pixi 畫，游標自己閃
    const v = this.input.value;
    this.caret += dt;
    const blink = (this.caret % 1) < 0.55 && document.activeElement === this.input;
    this.nameText.text = (v || (document.activeElement === this.input ? '' : '點此輸入暱稱')) + (blink ? '|' : '');
    this.nameText.style.fill = v ? 0xffffff : 0x6f88ad;
  }
}
