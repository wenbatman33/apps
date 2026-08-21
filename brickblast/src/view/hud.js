// 遊戲內 HUD 與結算面板（全 PixiJS 繪製）
import * as PIXI from '../../vendor/pixi.min.mjs';
import { LAYOUT, WORLD, THEME } from '../config.js';
import { label, NeonButton, panel, star, Bar } from './ui.js';
import { bestOf } from '../store/save.js';
import { texGlow, texBall } from './textures.js';

export class HUD {
  constructor(stage, hooks) {
    this.hooks = hooks;
    this.root = new PIXI.Container();
    stage.addChild(this.root);

    this.title = label('LEVEL 1', LAYOUT.hudTitleSize);
    this.title.x = WORLD.W / 2; this.title.y = LAYOUT.hudTitleY;
    this.sub = label('', LAYOUT.hudSubSize, 0x8fb8cc, '500');
    this.sub.x = WORLD.W / 2; this.sub.y = LAYOUT.hudSubY;

    this.bar = new Bar(LAYOUT.progressW, LAYOUT.progressH, 0x35f0ff);
    this.bar.x = WORLD.W / 2; this.bar.y = LAYOUT.progressY;

    // 球數（發射點下方）
    this.ballIcon = new PIXI.Sprite(texBall(16));
    this.ballIcon.anchor.set(0.5);
    this.ballIcon.blendMode = 'add';
    this.ballIcon.width = 30; this.ballIcon.height = 30;
    this.ballCount = label('×1', LAYOUT.ballCountSize);
    this.ballCount.x = WORLD.W / 2 + 6; this.ballCount.y = LAYOUT.ballCountY;
    this.ballIcon.x = WORLD.W / 2 - 40; this.ballIcon.y = LAYOUT.ballCountY;

    // 左上：返回；右上：靜音 / 加速
    this.btnBack = new NeonButton({ text: '‹', w: 62, h: 62, size: 34, onClick: () => this.hooks.onBack?.() });
    this.btnBack.x = 60; this.btnBack.y = 54;
    this.btnSound = new NeonButton({ text: '♪', w: 62, h: 62, size: 28, onClick: () => this.hooks.onSound?.() });
    this.btnSound.x = WORLD.W - 60; this.btnSound.y = 54;
    this.btnSpeed = new NeonButton({ text: '»', w: 78, h: 60, size: 28, color: 0xffd453, onClick: () => this.hooks.onSpeed?.() });
    this.btnSpeed.x = LAYOUT.btnSpeedX; this.btnSpeed.y = LAYOUT.btnBottomY;
    this.btnSpeed.visible = false;

    // 一鍵收球：發射中才出現
    this.btnRecall = new NeonButton({ text: '收球', w: 112, h: 60, size: 24, color: 0x9dff6b, onClick: () => this.hooks.onRecall?.() });
    this.btnRecall.x = LAYOUT.btnRecallX; this.btnRecall.y = LAYOUT.btnBottomY;
    this.btnRecall.visible = false;

    this.turnInfo = label('', 17, 0x6f8b9e, '500');
    this.turnInfo.x = WORLD.W / 2; this.turnInfo.y = LAYOUT.turnInfoY;

    this.root.addChild(this.title, this.sub, this.bar, this.ballIcon, this.ballCount,
      this.btnBack, this.btnSound, this.btnSpeed, this.btnRecall, this.turnInfo);

    this.overlay = new PIXI.Container();
    this.overlay.visible = false;
    stage.addChild(this.overlay);
  }

  layout() {
    this.title.y = LAYOUT.hudTitleY;
    this.title.style.fontSize = LAYOUT.hudTitleSize;
    this.sub.y = LAYOUT.hudSubY;
    this.sub.style.fontSize = LAYOUT.hudSubSize;
    this.bar.y = LAYOUT.progressY;
    this.turnInfo.y = LAYOUT.turnInfoY;
    this.ballCount.style.fontSize = LAYOUT.ballCountSize;
    this.btnSpeed.x = LAYOUT.btnSpeedX; this.btnSpeed.y = LAYOUT.btnBottomY;
    this.btnRecall.x = LAYOUT.btnRecallX; this.btnRecall.y = LAYOUT.btnBottomY;
  }

  setLevel(def) {
    this.title.text = `LEVEL ${def.level}`;
    this.sub.visible = false;
    this.accent = THEME.accent;
    this.title.style.fill = 0xffffff;
    this.sub.style.fill = 0xff45d0;
    this.ballIcon.tint = THEME.accent;
    this.bar.color = THEME.accent;
  }

  update(game) {
    const total = game.ballsTotal;
    const pending = game.phase === 'firing' ? game.pendingFire : total;
    this.ballCount.text = `×${pending}`;
    this.ballCount.x = WORLD.W / 2 + 6;
    this.ballCount.y = LAYOUT.ballCountY;
    this.ballIcon.x = WORLD.W / 2 - 28 - this.ballCount.width / 2;
    this.ballIcon.y = LAYOUT.ballCountY;

    const remainWaves = Math.max(0, game.def.waves - game.turn);
    this.bar.set(1 - remainWaves / game.def.waves, this.accent);
    this.turnInfo.text = remainWaves > 0
      ? `回合 ${game.turn} · 尚有 ${remainWaves} 波新磚`
      : `最後階段 · 清光所有磚塊`;

    const firing = game.phase === 'firing';
    this.btnSpeed.visible = firing;
    this.btnRecall.visible = firing;
    this.btnRecall.setEnabled(firing && !game.recalling);
  }

  setSoundIcon(muted) { this.btnSound.setText(muted ? '✕' : '♪'); }
  setSpeedIcon(x) { this.btnSpeed.setText(x >= 3 ? '»»' : '»'); }

  // ---- 結算 ----
  showResult({ win, level, stars, stats, score, records, onNext, onRetry, onMenu, accent }) {
    this.overlay.removeChildren();
    this.overlay.visible = true;

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, WORLD.W, WORLD.H).fill({ color: 0x02030a, alpha: 0.8 });
    dim.eventMode = 'static';
    this.overlay.addChild(dim);

    const p = panel(620, 760, accent);
    p.x = WORLD.W / 2; p.y = WORLD.H / 2;
    this.overlay.addChild(p);

    const head = label(win ? 'LEVEL CLEAR' : 'GAME OVER', 42, win ? accent : 0xff4d63);
    head.y = -312;
    p.addChild(head);

    const lv = label(`LEVEL ${level}`, 21, 0x8fb8cc, '500');
    lv.y = -268;
    p.addChild(lv);

    if (win) {
      for (let i = 0; i < 3; i++) {
        const s = star(34, i < stars);
        s.x = (i - 1) * 88;
        s.y = -206;
        s.scale.set(0.2);
        p.addChild(s);
        setTimeout(() => this.popIn(s), i * 140);
      }
    } else {
      const tip = label('磚塊已抵達底線', 21, 0xff9aa6, '500');
      tip.y = -206;
      p.addChild(tip);
    }

    // 分數
    const scoreCap = label('分數', 18, 0x7f9bb0, '500');
    scoreCap.y = -140;
    const scoreTxt = label(comma(score), 56, 0xffffff);
    scoreTxt.y = -98;
    p.addChild(scoreCap, scoreTxt);

    if (win && records?.score) {
      const nr = label('★ 新高分', 18, 0xffd453);
      nr.y = -58;
      p.addChild(nr);
    }

    // 明細（右側附上個人最佳）
    const best = bestOf(level);
    const rows = [
      ['使用球數', comma(stats.ballsFired), best && isFinite(best.balls) ? `最少 ${comma(best.balls)}` : '', records?.balls],
      ['使用回合', String(stats.shots), best && isFinite(best.turns) ? `最少 ${best.turns}` : '', records?.turns],
      ['破壞磚塊', comma(stats.broken), '', false],
      ['拾取道具', String(stats.picked), '', false],
    ];
    rows.forEach(([k, v, sub, isNew], i) => {
      const y = -8 + i * 46;
      const a = label(k, 19, 0x7f9bb0, '500');
      a.anchor.set(0, 0.5); a.x = -244; a.y = y;
      const b = label(v, 22, isNew && win ? 0xffd453 : 0xffffff);
      b.anchor.set(1, 0.5); b.x = 100; b.y = y;
      p.addChild(a, b);
      if (sub) {
        const c = label(sub, 16, 0x5f7a8c, '500');
        c.anchor.set(1, 0.5); c.x = 244; c.y = y;
        p.addChild(c);
      }
      if (isNew && win) {
        const n = label('NEW', 14, 0xffd453);
        n.anchor.set(1, 0.5); n.x = 150; n.y = y;
        p.addChild(n);
      }
    });

    const btnMain = new NeonButton({
      text: win ? '下一關' : '再試一次',
      w: 300, h: 74, size: 26, color: accent, filled: true,
      onClick: () => (win ? onNext() : onRetry()),
    });
    btnMain.y = 246;
    p.addChild(btnMain);

    const btnMenu = new NeonButton({ text: '關卡選單', w: 300, h: 62, size: 21, color: 0x7f9bb0, onClick: onMenu });
    btnMenu.y = 322;
    p.addChild(btnMenu);

    p.scale.set(0.8);
    p.alpha = 0;
    this.popIn(p, 1);
  }

  popIn(obj, target = 1) {
    let t = 0;
    const tick = () => {
      t += 1 / 60;
      const k = Math.min(1, t / 0.32);
      const e = 1 - Math.pow(1 - k, 3);
      obj.scale.set(target * (0.72 + e * 0.28) * (1 + Math.sin(e * Math.PI) * 0.06));
      obj.alpha = e;
      if (k < 1) requestAnimationFrame(tick);
      else obj.scale.set(target);
    };
    tick();
  }

  hideResult() { this.overlay.visible = false; this.overlay.removeChildren(); }
  setVisible(v) { this.root.visible = v; if (!v) this.hideResult(); }
}

// 千分位
function comma(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
