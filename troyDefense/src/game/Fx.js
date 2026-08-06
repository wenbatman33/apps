/* 特效系統 — 華麗攻擊表現與打擊感 */
window.TD = window.TD || {};

TD.Fx = class Fx {
  constructor(scene) {
    this.s = scene;
    this.layer = scene.add.container(0, 0).setDepth(TD.DEPTH.FX);
    this.top = scene.add.container(0, 0).setDepth(TD.DEPTH.FX_TOP);
    this.shakeUntil = 0;
  }

  // ── 螢幕震動（強度可疊加但有上限）──
  shake(power = 0.006, dur = 120) {
    this.s.cameras.main.shake(dur, Math.min(power, 0.02));
  }

  flash(color = 0xffffff, dur = 90, alpha = 0.5) {
    const r = this.s.add.rectangle(TD.GAME_W / 2, TD.GAME_H / 2, TD.GAME_W, TD.GAME_H, color, alpha)
      .setDepth(TD.DEPTH.FLASH);
    this.s.tweens.add({ targets: r, alpha: 0, duration: dur, onComplete: () => r.destroy() });
  }

  // ── 命中火花 ──
  hit(x, y, tint = 0xFFE066, n = 8) {
    const p = this.s.add.particles(x, y, 'px_spark', {
      speed: { min: 90, max: 260 }, lifespan: { min: 180, max: 380 },
      scale: { start: 0.5, end: 0 }, quantity: n, tint,
      blendMode: 'ADD', emitting: false,
    }).setDepth(TD.DEPTH.FX);
    p.explode(n);
    this.s.time.delayedCall(600, () => p.destroy());
  }

  // ── 擊殺爆裂：碎片 + 血霧 + 環波 ──
  kill(x, y, big = false) {
    const n = big ? 22 : 12;
    const shard = this.s.add.particles(x, y, 'px_shard', {
      speed: { min: 120, max: big ? 420 : 260 }, lifespan: { min: 300, max: 700 },
      scale: { start: big ? 1.2 : 0.8, end: 0 }, rotate: { start: 0, end: 360 },
      gravityY: 420, quantity: n, tint: [0xFFF6E0, 0xFF8A3C, 0xE0A64B], emitting: false,
    }).setDepth(TD.DEPTH.FX);
    shard.explode(n);

    const blood = this.s.add.particles(x, y, 'px_blood', {
      speed: { min: 60, max: 200 }, lifespan: { min: 250, max: 500 },
      scale: { start: big ? 1.0 : 0.6, end: 0 }, gravityY: 300,
      quantity: n, alpha: { start: 0.85, end: 0 }, emitting: false,
    }).setDepth(TD.DEPTH.FX);
    blood.explode(n);

    this.ring(x, y, big ? 200 : 96, big ? 0xFF6E40 : 0xFF8A3C, big ? 420 : 260);
    this.s.time.delayedCall(900, () => { shard.destroy(); blood.destroy(); });
    if (big) this.shake(0.010, 220);
  }

  // ── 擴散環波 ──
  ring(x, y, r = 120, tint = 0xFFFFFF, dur = 300) {
    const img = this.s.add.image(x, y, 'px_ring').setTint(tint)
      .setDepth(TD.DEPTH.FX).setBlendMode(Phaser.BlendModes.ADD).setScale(0.15);
    this.s.tweens.add({
      targets: img, scale: r / 48, alpha: 0, duration: dur,
      ease: 'Cubic.Out', onComplete: () => img.destroy(),
    });
  }

  // ── 傷害數字 ──
  dmgText(x, y, val, opt = {}) {
    const crit = opt.crit, real = opt.real;
    const t = this.s.add.text(x, y, (real ? '' : '') + Math.round(val), {
      fontFamily: TD.FONT,
      fontSize: crit ? '58px' : '36px',
      color: crit ? '#FFE066' : (real ? '#FFF9C4' : '#FFF6E0'),
      stroke: '#5E3A18', strokeThickness: crit ? 8 : 5,
    }).setOrigin(0.5).setDepth(TD.DEPTH.FX_TOP);
    const dx = Phaser.Math.Between(-30, 30);
    this.s.tweens.add({
      targets: t, y: y - (crit ? 120 : 78), x: x + dx,
      alpha: 0, scale: crit ? 1.3 : 1,
      duration: crit ? 780 : 560, ease: 'Cubic.Out',
      onComplete: () => t.destroy(),
    });
    if (crit) {
      this.s.cameras.main.zoomTo(1.02, 60, 'Sine.Out', true);
      this.s.time.delayedCall(90, () => this.s.cameras.main.zoomTo(1, 120, 'Sine.Out', true));
    }
  }

  // ── 金幣飛出 ──
  coin(x, y, amount) {
    const c = this.s.add.image(x, y, 'U_coin').setDepth(TD.DEPTH.FX_TOP).setScale(0.06);
    const tx = TD.LAYOUT.bottom.coinX, ty = TD.LAYOUT.bottom.y;
    this.s.tweens.add({
      targets: c, x: tx, y: ty, scale: 0.03, duration: 520,
      ease: 'Cubic.In', onComplete: () => c.destroy(),
    });
  }

  // ── 燃燒（掛在敵人身上）──
  burnAura(target) {
    const p = this.s.add.particles(0, 0, 'px_spark', {
      speed: { min: 20, max: 70 }, lifespan: 420, frequency: 45,
      scale: { start: 0.35, end: 0 }, tint: [0xFF7043, 0xFFE066],
      blendMode: 'ADD', follow: target, followOffset: { x: 0, y: -10 },
    }).setDepth(TD.DEPTH.FX);
    return p;
  }

  // ── 地面火池 ──
  firePool(x, y, r, dur) {
    const p = this.s.add.particles(x, y, 'px_spark', {
      speed: { min: 10, max: 60 }, lifespan: 620, frequency: 22,
      scale: { start: 0.7, end: 0 }, tint: [0x69F0AE, 0xFFE066, 0xFF7043],
      blendMode: 'ADD', emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, r) },
    }).setDepth(TD.DEPTH.FX);
    const smoke = this.s.add.particles(x, y, 'px_smoke', {
      speed: { min: 10, max: 40 }, lifespan: 1100, frequency: 90,
      scale: { start: 0.8, end: 2.2 }, alpha: { start: 0.35, end: 0 },
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, r) },
    }).setDepth(TD.DEPTH.FX);
    this.s.time.delayedCall(dur, () => { p.stop(); smoke.stop(); });
    this.s.time.delayedCall(dur + 1400, () => { p.destroy(); smoke.destroy(); });
  }

  // ── 爆炸（投石命中）──
  explode(x, y, r) {
    this.ring(x, y, r * 2, 0xFFE066, 340);
    const p = this.s.add.particles(x, y, 'px_spark', {
      speed: { min: 120, max: r * 4 }, lifespan: { min: 200, max: 480 },
      scale: { start: 0.9, end: 0 }, quantity: 18,
      tint: [0xFFE066, 0xFF7043], blendMode: 'ADD', emitting: false,
    }).setDepth(TD.DEPTH.FX);
    p.explode(18);
    const d = this.s.add.particles(x, y, 'px_smoke', {
      speed: { min: 40, max: 160 }, lifespan: 900, scale: { start: 0.6, end: 2.0 },
      alpha: { start: 0.5, end: 0 }, quantity: 10, emitting: false,
    }).setDepth(TD.DEPTH.FX);
    d.explode(10);
    this.shake(0.007, 160);
    this.s.time.delayedCall(1400, () => { p.destroy(); d.destroy(); });
  }

  // ── 光柱（神技）──
  pillar(x, y, tint = 0xFFF176, dur = 700) {
    const g = this.s.add.graphics().setDepth(TD.DEPTH.FX).setBlendMode(Phaser.BlendModes.ADD);
    const top = TD.LAYOUT.battle.y;
    g.fillStyle(tint, 0.55);
    g.fillTriangle(x - 14, top, x + 14, top, x + 90, y);
    g.fillTriangle(x - 14, top, x - 90, y, x + 90, y);
    g.setAlpha(0);
    this.s.tweens.add({ targets: g, alpha: 1, duration: 90, yoyo: true, hold: dur * 0.4,
      onComplete: () => g.destroy() });
    this.ring(x, y, 220, tint, 480);
    const p = this.s.add.particles(x, y, 'px_spark', {
      speed: { min: 60, max: 220 }, lifespan: 520, scale: { start: 0.8, end: 0 },
      quantity: 20, tint, blendMode: 'ADD', emitting: false,
    }).setDepth(TD.DEPTH.FX);
    p.explode(20);
    this.s.time.delayedCall(1200, () => p.destroy());
  }

  // ── 城牆受創 ──
  wallHurt() {
    this.shake(0.014, 260);
    this.flash(0xFF4D4D, 140, 0.28);
    const y = TD.LAYOUT.battle.y + TD.LAYOUT.battle.h - 20;
    const p = this.s.add.particles(TD.GAME_W / 2, y, 'px_smoke', {
      speed: { min: 60, max: 180 }, lifespan: 900, scale: { start: 0.5, end: 1.8 },
      alpha: { start: 0.6, end: 0 }, quantity: 14, gravityY: -40,
      emitZone: { type: 'random', source: new Phaser.Geom.Line(-460, 0, 460, 0) },
      emitting: false,
    }).setDepth(TD.DEPTH.FX);
    p.explode(14);
    this.s.time.delayedCall(1400, () => p.destroy());
  }

  // ── 合成閃光 ──
  mergeBurst(x, y, tint) {
    this.ring(x, y, 160, tint, 320);
    const p = this.s.add.particles(x, y, 'px_spark', {
      speed: { min: 80, max: 260 }, lifespan: 480, scale: { start: 0.7, end: 0 },
      quantity: 16, tint, blendMode: 'ADD', emitting: false,
    }).setDepth(TD.DEPTH.FX_TOP);
    p.explode(16);
    this.s.time.delayedCall(900, () => p.destroy());
  }

  // ── BOSS 出場橫幅 ──
  bossBanner(name, title, tint = 0xFF8A3C) {
    const W = TD.GAME_W, cy = TD.GAME_H * 0.34;
    const dark = this.s.add.rectangle(W / 2, TD.GAME_H / 2, W, TD.GAME_H, 0x000000, 0.55)
      .setDepth(TD.DEPTH.BANNER);
    const bar = this.s.add.rectangle(W / 2, cy, W, 200, 0x5E3A18, 0.92).setDepth(TD.DEPTH.BANNER);
    const line = this.s.add.rectangle(W / 2, cy + 104, W, 5, tint).setDepth(TD.DEPTH.BANNER);
    bar.scaleY = 0; line.scaleX = 0;

    const t1 = this.s.add.text(W / 2, cy - 26, name, {
      fontFamily: TD.FONT, fontSize: '86px', color: '#FFF6E0',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(TD.DEPTH.BANNER).setAlpha(0);
    const t2 = this.s.add.text(W / 2, cy + 52, title, {
      fontFamily: TD.FONT, fontSize: '30px', color: '#FFC72C',
    }).setOrigin(0.5).setDepth(TD.DEPTH.BANNER).setAlpha(0);

    this.s.tweens.add({ targets: bar, scaleY: 1, duration: 220, ease: 'Back.Out' });
    this.s.tweens.add({ targets: line, scaleX: 1, duration: 380, delay: 120, ease: 'Cubic.Out' });
    this.s.tweens.add({ targets: [t1, t2], alpha: 1, duration: 260, delay: 200 });
    this.shake(0.012, 400);
    this.s.time.delayedCall(1700, () => {
      this.s.tweens.add({
        targets: [dark, bar, line, t1, t2], alpha: 0, duration: 320,
        onComplete: () => [dark, bar, line, t1, t2].forEach(o => o.destroy()),
      });
    });
    return 2000;
  }

  // ── 波次警告 ──
  waveWarn(text) {
    const y = TD.LAYOUT.battle.y + 70;
    const bar = this.s.add.rectangle(-TD.GAME_W, y, TD.GAME_W, 70, 0xE0483C, 0.82)
      .setDepth(TD.DEPTH.FX_TOP);
    const t = this.s.add.text(-TD.GAME_W, y, text, {
      fontFamily: TD.FONT, fontSize: '42px', color: '#FFE0B2',
      stroke: '#5E3A18', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(TD.DEPTH.FX_TOP);
    this.s.tweens.add({
      targets: [bar, t], x: TD.GAME_W / 2, duration: 340, ease: 'Cubic.Out',
      onComplete: () => {
        this.s.tweens.add({
          targets: [bar, t], x: TD.GAME_W * 2, delay: 900, duration: 340, ease: 'Cubic.In',
          onComplete: () => { bar.destroy(); t.destroy(); },
        });
      },
    });
  }

  // ── Combo 提示 ──
  combo(n) {
    const x = TD.GAME_W - 120, y = TD.LAYOUT.battle.y + 190;
    if (this._comboT) this._comboT.destroy();
    const big = n % 10 === 0;
    this._comboT = this.s.add.text(x, y, `×${n}`, {
      fontFamily: TD.FONT, fontSize: big ? '84px' : '58px',
      color: big ? '#FFE066' : '#FFF6E0', stroke: '#5E3A18', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(TD.DEPTH.FX_TOP).setScale(1.6);
    this.s.tweens.add({ targets: this._comboT, scale: 1, duration: 220, ease: 'Back.Out' });
    this.s.tweens.add({
      targets: this._comboT, alpha: 0, delay: 900, duration: 400,
      onComplete: () => { if (this._comboT) { this._comboT.destroy(); this._comboT = null; } },
    });
    if (big) this.flash(0xFFC72C, 140, 0.3);
  }
};
