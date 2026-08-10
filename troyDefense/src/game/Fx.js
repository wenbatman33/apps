/* v2 戰火特效系統 — GDD_v2 §6 的實作
 * 四層火焰（環境火/投射火/地面火/身上火）＋ 火花 ＋ 漂浮餘燼 ＋ 鏡頭 juice
 * 全域粒子預算 TD.FXP.maxParticles，超標時先犧牲環境粒子
 */
window.TD = window.TD || {};

TD.Fx = class Fx {
  constructor(scene) {
    this.s = scene;
    this.alive = 0;                    // 目前存活粒子數（手動管理的）
    this.groundFires = [];
    this.emberTimer = 0;
    this.makeTextures();
  }

  budget(n) {                          // 申請 n 顆粒子；超標回傳可用數
    const room = TD.FXP.maxParticles - this.alive;
    return Math.max(0, Math.min(n, room));
  }

  // ── 程序貼圖（火焰動畫幀、火花、木屑等）──
  makeTextures() {
    const t = this.s.textures;
    const mk = (key, s, draw) => {
      if (t.exists(key)) return;
      const c = t.createCanvas(key, s, s).getContext();
      draw(c, s);
      t.get(key).refresh();
    };
    // 火焰 4 幀（跳動火舌）
    for (let f = 0; f < 4; f++) {
      mk(`fx_flame_${f}`, 96, (c, s) => {
        const cx = s / 2, base = s * 0.9;
        const h = s * (0.62 + 0.1 * Math.sin(f * 1.7));
        const w = s * (0.34 + 0.05 * Math.cos(f * 2.3));
        const grad = c.createLinearGradient(0, base - h, 0, base);
        grad.addColorStop(0, 'rgba(255,240,160,0.95)');
        grad.addColorStop(0.45, 'rgba(255,150,40,0.9)');
        grad.addColorStop(1, 'rgba(200,50,20,0.0)');
        c.fillStyle = grad;
        c.beginPath();
        c.moveTo(cx, base - h);
        c.bezierCurveTo(cx + w * (f % 2 ? 1 : 0.7), base - h * 0.6, cx + w, base - h * 0.2, cx, base);
        c.bezierCurveTo(cx - w, base - h * 0.2, cx - w * (f % 2 ? 0.7 : 1), base - h * 0.6, cx, base - h);
        c.fill();
        // 內焰
        const g2 = c.createLinearGradient(0, base - h * 0.55, 0, base);
        g2.addColorStop(0, 'rgba(255,255,220,0.95)');
        g2.addColorStop(1, 'rgba(255,190,60,0)');
        c.fillStyle = g2;
        c.beginPath();
        c.moveTo(cx, base - h * 0.55);
        c.quadraticCurveTo(cx + w * 0.4, base - h * 0.2, cx, base - 2);
        c.quadraticCurveTo(cx - w * 0.4, base - h * 0.2, cx, base - h * 0.55);
        c.fill();
      });
    }
    mk('fx_ember', 24, (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,230,150,1)');
      g.addColorStop(0.5, 'rgba(255,140,40,0.8)');
      g.addColorStop(1, 'rgba(255,80,20,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    mk('fx_spark', 20, (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,240,1)');
      g.addColorStop(0.5, 'rgba(255,220,120,0.9)');
      g.addColorStop(1, 'rgba(255,160,60,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    mk('fx_smoke', 80, (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(70,60,52,0.5)');
      g.addColorStop(1, 'rgba(50,44,38,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    mk('fx_chip', 18, (c, s) => {
      c.fillStyle = '#8B5A2B';
      c.beginPath(); c.moveTo(s / 2, 1); c.lineTo(s - 2, s * 0.6); c.lineTo(s * 0.3, s - 1); c.closePath(); c.fill();
    });
    mk('fx_stone', 22, (c, s) => {
      c.fillStyle = '#9C9284';
      c.beginPath(); c.moveTo(s * .5, 2); c.lineTo(s - 3, s * .4); c.lineTo(s * .7, s - 3);
      c.lineTo(s * .2, s - 4); c.lineTo(2, s * .45); c.closePath(); c.fill();
    });
    mk('fx_glow', 128, (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,180,80,0.55)');
      g.addColorStop(1, 'rgba(255,120,30,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    mk('fx_ring', 128, (c, s) => {
      c.strokeStyle = 'rgba(255,220,150,0.95)'; c.lineWidth = 8;
      c.beginPath(); c.arc(s / 2, s / 2, s / 2 - 10, 0, Math.PI * 2); c.stroke();
    });
    mk('fx_arrow', 54, (c, s) => {
      c.save(); c.translate(s / 2, s / 2); c.rotate(Math.PI / 2);   // 預設朝下
      c.strokeStyle = '#E8D9B0'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-s / 2 + 6, 0); c.lineTo(s / 2 - 12, 0); c.stroke();
      c.fillStyle = '#D8D3C4';
      c.beginPath(); c.moveTo(s / 2 - 2, 0); c.lineTo(s / 2 - 16, -7); c.lineTo(s / 2 - 16, 7); c.closePath(); c.fill();
      c.fillStyle = '#C8542B';
      c.beginPath(); c.moveTo(-s / 2 + 4, -6); c.lineTo(-s / 2 + 14, 0); c.lineTo(-s / 2 + 4, 6); c.closePath(); c.fill();
      c.restore();
    });
    mk('fx_torch', 40, (c, s) => {
      c.fillStyle = '#6B4A2A'; c.fillRect(s / 2 - 3, s * 0.35, 6, s * 0.55);
      const g = c.createRadialGradient(s / 2, s * 0.3, 0, s / 2, s * 0.3, s * 0.3);
      g.addColorStop(0, 'rgba(255,240,160,1)'); g.addColorStop(1, 'rgba(255,120,30,0)');
      c.fillStyle = g; c.beginPath(); c.arc(s / 2, s * 0.3, s * 0.3, 0, Math.PI * 2); c.fill();
    });
    mk('fx_fireball', 64, (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,250,210,1)');
      g.addColorStop(0.4, 'rgba(255,170,50,0.95)');
      g.addColorStop(1, 'rgba(200,60,20,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    // 火焰動畫
    if (!this.s.anims.exists('fx_flame')) {
      this.s.anims.create({
        key: 'fx_flame',
        frames: [0, 1, 2, 3, 2, 1].map(i => ({ key: `fx_flame_${i}` })),
        frameRate: 12, repeat: -1,
      });
    }
  }

  // ══════════════ 火花 ══════════════

  /** 金屬火花（刀劍相擊、箭中盾、撞門）*/
  sparks(x, y, n = 8, opt = {}) {
    n = this.budget(Math.round(n * TD.FXP.sparkMul));
    for (let i = 0; i < n; i++) {
      const sp = this.s.add.image(x, y, 'fx_spark')
        .setDepth(TD.DEPTH.FX).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(Phaser.Math.FloatBetween(0.5, 1.2));
      const ang = (opt.angle ?? -Math.PI / 2) + Phaser.Math.FloatBetween(-(opt.spread ?? 1.0), opt.spread ?? 1.0);
      const sp0 = Phaser.Math.Between(160, opt.power ?? 380);
      this.alive++;
      this.s.tweens.add({
        targets: sp, duration: Phaser.Math.Between(240, 380),
        x: x + Math.cos(ang) * sp0 * 0.4,
        y: y + Math.sin(ang) * sp0 * 0.4 + 60,   // 重力下墜
        alpha: 0, scale: 0.1, ease: 'Cubic.Out',
        onComplete: () => { sp.destroy(); this.alive--; },
      });
    }
  }

  /** 木屑（撞門、砍門）*/
  chips(x, y, n = 8) {
    n = this.budget(n);
    for (let i = 0; i < n; i++) {
      const ch = this.s.add.image(x, y, 'fx_chip')
        .setDepth(TD.DEPTH.FX).setScale(Phaser.Math.FloatBetween(0.7, 1.4))
        .setRotation(Phaser.Math.FloatBetween(0, 6.28));
      const dx = Phaser.Math.Between(-120, 120), dy = Phaser.Math.Between(-160, -40);
      this.alive++;
      this.s.tweens.add({
        targets: ch, duration: Phaser.Math.Between(380, 560),
        x: x + dx, y: y + dy + 220, angle: ch.angle + Phaser.Math.Between(-240, 240),
        alpha: 0, ease: 'Cubic.In',
        onComplete: () => { ch.destroy(); this.alive--; },
      });
    }
  }

  /** 碎石（投石落地、火球命中）*/
  rubble(x, y, n = 8) {
    n = this.budget(n);
    for (let i = 0; i < n; i++) {
      const r = this.s.add.image(x, y, 'fx_stone')
        .setDepth(TD.DEPTH.FX).setScale(Phaser.Math.FloatBetween(0.6, 1.3));
      const dx = Phaser.Math.Between(-140, 140), dy = Phaser.Math.Between(-200, -60);
      this.alive++;
      this.s.tweens.add({
        targets: r, duration: Phaser.Math.Between(400, 620),
        x: x + dx, y: y + dy + 260, angle: Phaser.Math.Between(-180, 180),
        alpha: 0, ease: 'Cubic.In',
        onComplete: () => { r.destroy(); this.alive--; },
      });
    }
  }

  /** 塵土雲 */
  dust(x, y, n = 6, tint = 0xB8A488) {
    n = this.budget(n);
    for (let i = 0; i < n; i++) {
      const d = this.s.add.image(x + Phaser.Math.Between(-40, 40), y + Phaser.Math.Between(-16, 10), 'fx_smoke')
        .setDepth(TD.DEPTH.FX).setTint(tint)
        .setScale(Phaser.Math.FloatBetween(0.8, 1.6)).setAlpha(0.7);
      this.alive++;
      this.s.tweens.add({
        targets: d, duration: Phaser.Math.Between(500, 800),
        y: d.y - Phaser.Math.Between(30, 80), scale: d.scale * 2.0, alpha: 0,
        onComplete: () => { d.destroy(); this.alive--; },
      });
    }
  }

  /** 煙（火場上升黑煙）*/
  smoke(x, y, n = 3) {
    n = this.budget(n);
    for (let i = 0; i < n; i++) {
      const d = this.s.add.image(x + Phaser.Math.Between(-16, 16), y, 'fx_smoke')
        .setDepth(TD.DEPTH.FX_TOP).setScale(Phaser.Math.FloatBetween(0.7, 1.2)).setAlpha(0.55);
      this.alive++;
      this.s.tweens.add({
        targets: d, duration: Phaser.Math.Between(900, 1400),
        y: y - Phaser.Math.Between(90, 160), x: d.x + Phaser.Math.Between(-30, 10),
        scale: d.scale * 2.4, alpha: 0,
        onComplete: () => { d.destroy(); this.alive--; },
      });
    }
  }

  // ══════════════ 火焰 ══════════════

  /** 掛一團火在某座標（回傳 sprite，呼叫端負責銷毀或給 ttl）*/
  flame(x, y, scale = 1, ttl = 0, depth = TD.DEPTH.FX) {
    const f = this.s.add.sprite(x, y, 'fx_flame_0')
      .setOrigin(0.5, 0.92).setDepth(depth)
      .setScale(scale * TD.FXP.fireScale)
      .setBlendMode(Phaser.BlendModes.ADD);
    f.play({ key: 'fx_flame', startFrame: Phaser.Math.Between(0, 3) });
    if (ttl > 0) {
      this.s.time.delayedCall(ttl, () => {
        if (!f.scene) return;
        this.s.tweens.add({ targets: f, alpha: 0, scaleX: 0.3, duration: 300, onComplete: () => f.destroy() });
      });
    }
    return f;
  }

  /** 地面火海：在 (x,y) 產生寬 w 的燃燒帶，持續 sec 秒；GameScene 每 tick 查詢灼燒 */
  groundFire(x, y, w, sec, dps) {
    const flames = [];
    const nF = Math.max(2, Math.round(w / 70));
    for (let i = 0; i < nF; i++) {
      const fx = x - w / 2 + (i + 0.5) * (w / nF) + Phaser.Math.Between(-12, 12);
      flames.push(this.flame(fx, y + Phaser.Math.Between(-10, 10),
        Phaser.Math.FloatBetween(0.8, 1.3), 0, TD.DEPTH.GROUNDFIRE));
    }
    const glow = this.s.add.image(x, y, 'fx_glow').setDepth(TD.DEPTH.DECAL)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(w / 100, 0.9).setAlpha(0.8);
    const gf = { x, y, w, dps, until: this.s.time.now + sec * 1000, flames, glow,
      smokeAt: 0 };
    this.groundFires.push(gf);
    return gf;
  }

  /** 每幀維護地面火（滅火、冒煙）；由 GameScene.update 呼叫 */
  updateGroundFires(now) {
    for (let i = this.groundFires.length - 1; i >= 0; i--) {
      const gf = this.groundFires[i];
      if (now > gf.until) {
        gf.flames.forEach(f => {
          this.s.tweens.add({ targets: f, alpha: 0, scaleX: 0.2, duration: 400, onComplete: () => f.destroy() });
        });
        this.s.tweens.add({ targets: gf.glow, alpha: 0, duration: 500, onComplete: () => gf.glow.destroy() });
        this.groundFires.splice(i, 1);
      } else if (now > gf.smokeAt) {
        gf.smokeAt = now + 380;
        this.smoke(gf.x + Phaser.Math.Between(-gf.w / 2, gf.w / 2), gf.y - 20, 1);
      }
    }
  }

  /** 敵人身上著火（回傳掛載的火 sprite；跟隨由呼叫端在 update 處理）*/
  ignite(target, scale = 0.7) {
    return this.flame(target.x, target.y - 20, scale, 0, TD.DEPTH.FX);
  }

  // ══════════════ 大事件 ══════════════

  /** 爆炸（火球命中、隕石落地）*/
  explosion(x, y, r = 120) {
    // 白閃一幀
    this.flashWhite(0.35, 70);
    // 衝擊環
    const ring = this.s.add.image(x, y, 'fx_ring').setDepth(TD.DEPTH.FX_TOP)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(0.3).setAlpha(1);
    this.s.tweens.add({
      targets: ring, scale: r / 55, alpha: 0, duration: 320, ease: 'Cubic.Out',
      onComplete: () => ring.destroy(),
    });
    // 火球核心
    const core = this.s.add.image(x, y, 'fx_fireball').setDepth(TD.DEPTH.FX_TOP)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(r / 40);
    this.s.tweens.add({ targets: core, scale: core.scale * 1.6, alpha: 0, duration: 260, onComplete: () => core.destroy() });
    // 餘燼緩降
    let n = this.budget(Math.round(22 * TD.FXP.sparkMul));
    for (let i = 0; i < n; i++) {
      const e = this.s.add.image(x, y, 'fx_ember').setDepth(TD.DEPTH.FX_TOP)
        .setBlendMode(Phaser.BlendModes.ADD).setScale(Phaser.Math.FloatBetween(0.5, 1.1));
      const ang = Phaser.Math.FloatBetween(0, 6.28), pw = Phaser.Math.Between(40, r + 60);
      this.alive++;
      this.s.tweens.add({
        targets: e, duration: Phaser.Math.Between(500, 900),
        x: x + Math.cos(ang) * pw, y: y + Math.sin(ang) * pw * 0.7 + 90,
        alpha: 0, ease: 'Cubic.Out',
        onComplete: () => { e.destroy(); this.alive--; },
      });
    }
    this.smoke(x, y - 20, 4);
    this.rubble(x, y, 6);
  }

  // ══════════════ 全場氛圍 ══════════════

  /** 漂浮餘燼（戰火底味）；GameScene.update 每幀呼叫 */
  updateAmbient(now, dt) {
    this.emberTimer -= dt;
    if (this.emberTimer <= 0 && this.alive < TD.FXP.maxParticles * 0.7) {
      this.emberTimer = 1000 / Math.max(0.05, TD.FXP.emberRate);
      const x = Phaser.Math.Between(0, TD.GAME_W), y = Phaser.Math.Between(300, 1500);
      const e = this.s.add.image(x, y, 'fx_ember').setDepth(TD.DEPTH.FX_TOP)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(Phaser.Math.FloatBetween(0.35, 0.8)).setAlpha(0);
      this.alive++;
      this.s.tweens.add({ targets: e, alpha: 0.9, duration: 400, yoyo: false });
      this.s.tweens.add({
        targets: e, duration: Phaser.Math.Between(2400, 4200),
        x: x - Phaser.Math.Between(120, 320), y: y - Phaser.Math.Between(160, 380),
        alpha: 0, ease: 'Sine.In',
        onComplete: () => { e.destroy(); this.alive--; },
      });
    }
  }

  // ══════════════ 鏡頭 Juice ══════════════

  shake(px = 4, ms = 200) {
    this.s.cameras.main.shake(ms, (px * TD.FXP.shakeMul) / TD.GAME_W);
    if (navigator.vibrate && px >= 6) { try { navigator.vibrate(Math.min(80, px * 8)); } catch (e) {} }
  }

  flashWhite(alpha = 0.4, ms = 80) {
    const f = this.s.add.rectangle(TD.GAME_W / 2, TD.GAME_H / 2, TD.GAME_W, TD.GAME_H, 0xFFF6E0)
      .setDepth(TD.DEPTH.FLASH).setAlpha(alpha);
    this.s.tweens.add({ targets: f, alpha: 0, duration: ms, onComplete: () => f.destroy() });
  }

  /** 紅色邊緣脈動（城門受創/瀕死警告）*/
  vignettePulse(alpha = 0.5) {
    if (!this.vg) {
      const g = this.s.add.graphics().setDepth(TD.DEPTH.VIGNETTE);
      const W = TD.GAME_W, H = TD.GAME_H, T = 90;
      g.fillGradientStyle(0xC8321E, 0xC8321E, 0xC8321E, 0xC8321E, 1, 1, 0, 0);
      g.fillRect(0, 0, W, T);
      g.fillGradientStyle(0xC8321E, 0xC8321E, 0xC8321E, 0xC8321E, 0, 0, 1, 1);
      g.fillRect(0, H - T, W, T);
      g.fillGradientStyle(0xC8321E, 0xC8321E, 0xC8321E, 0xC8321E, 1, 0, 1, 0);
      g.fillRect(0, 0, T, H);
      g.fillGradientStyle(0xC8321E, 0xC8321E, 0xC8321E, 0xC8321E, 0, 1, 0, 1);
      g.fillRect(W - T, 0, T, H);
      this.vg = g.setAlpha(0);
    }
    this.s.tweens.add({ targets: this.vg, alpha, duration: 120, yoyo: true, hold: 60 });
  }

  /** 常駐危險紅框（城門 < 25%）*/
  vignetteHold(on) {
    this.vignettePulse(0);              // 確保已建立
    if (on && !this._vgHold) {
      this._vgHold = this.s.tweens.add({
        targets: this.vg, alpha: { from: 0.16, to: 0.4 },
        duration: 700, yoyo: true, repeat: -1,
      });
    } else if (!on && this._vgHold) {
      this._vgHold.stop(); this._vgHold = null;
      this.vg.setAlpha(0);
    }
  }

  /** 慢動作（暴擊/大招）*/
  slowmo(scale = 0.25, ms = 90) {
    if (this._slow) return;
    this._slow = true;
    this.s.time.timeScale = scale;
    this.s.tweens.timeScale = scale;
    this.s.physics && (this.s.physics.world.timeScale = 1 / scale);
    setTimeout(() => {
      this.s.time.timeScale = 1; this.s.tweens.timeScale = 1;
      this._slow = false;
    }, ms * TD.FXP.hitStop);
  }

  /** 傷害數字 */
  dmgNum(x, y, v, crit = false) {
    const t = this.s.add.text(x, y, String(Math.round(v)), {
      fontFamily: TD.FONT, fontSize: crit ? '46px' : '30px',
      color: crit ? TD.CSS.fireHot : '#FFFFFF',
      stroke: TD.STROKE, strokeThickness: crit ? 8 : 5, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(TD.DEPTH.FX_TOP);
    this.s.tweens.add({
      targets: t, y: y - (crit ? 90 : 60), alpha: 0, scale: crit ? 1.25 : 1,
      duration: crit ? 700 : 500, ease: 'Cubic.Out', onComplete: () => t.destroy(),
    });
  }

  /** 金幣彈出 */
  coinPop(x, y, n = 1) {
    for (let i = 0; i < Math.min(n, 3); i++) {
      const c = this.s.add.image(x, y, 'a_coin').setDepth(TD.DEPTH.FX_TOP).setScale(0.7);
      const dx = Phaser.Math.Between(-50, 50);
      this.s.tweens.add({
        targets: c, x: x + dx, y: y - Phaser.Math.Between(60, 110),
        duration: 240, ease: 'Cubic.Out',
        onComplete: () => this.s.tweens.add({
          targets: c, y: y + 20, alpha: 0, duration: 260, ease: 'Cubic.In',
          onComplete: () => c.destroy(),
        }),
      });
    }
  }
};
