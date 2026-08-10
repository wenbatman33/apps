// v4 城門實體：HP、血條、受擊回饋、戰損（裂紋→冒煙→燃燒）、破門敗北
class GateV4 {
  constructor(scene, maxHp) {
    this.scene = scene;
    this.hp = this.maxHp = maxHp;
    const G = LAYOUT_V4.gate, B = LAYOUT_V4.gateHpBar;
    // 血條（刻在門上方）
    // 城堡血條（仿實機：置底、❤＋數值）
    this.barBg = scene.add.rectangle(B.x, B.y, B.w, B.h, 0x1a140e, 0.85)
      .setStrokeStyle(3, 0x6a5432).setDepth(920);
    this.barFg = scene.add.rectangle(B.x - B.w / 2 + 4, B.y, B.w - 8, B.h - 10, 0xe84040)
      .setOrigin(0, 0.5).setDepth(921);
    scene.add.text(B.x - B.w / 2 - 8, B.y, '❤️', { fontSize: '44px' })
      .setOrigin(0.5).setDepth(922);
    this.barTxt = scene.add.text(B.x, B.y, '', {
      fontSize: '30px', color: '#FFFFFF', stroke: '#1A140E', strokeThickness: 5, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(922);
    this.refreshTxt = () => this.barTxt.setText(Math.ceil(this.hp) + ' / ' + this.maxHp);
    this.refreshTxt();
    // 戰損覆蓋層
    this.cracks = scene.add.graphics().setDepth(455);
    this.decals = [];
    this.smoke = null; this.fire = null;
    this.stage = 0;
  }

  damage(n, hitX) {
    if (this.hp <= 0) return;
    AudioV4.gateHit();
    this.hp = Math.max(0, this.hp - n);
    const G = LAYOUT_V4.gate;
    FxV4.spark(this.scene, hitX ?? G.x, G.y - 40, 0xffe08a, 7);
    FxV4.shake(this.scene, 0.0022, 120);
    this.refresh();
    if (this.hp <= 0) this.scene.onDefeat();
  }

  refresh() {
    const pct = this.hp / this.maxHp;
    const B = LAYOUT_V4.gateHpBar, G = LAYOUT_V4.gate;
    this.barFg.width = Math.max(0, (B.w - 8) * pct);
    this.barFg.fillColor = pct > 0.5 ? 0xe84040 : pct > 0.25 ? 0xd83030 : 0xa82020;
    this.refreshTxt();
    // 戰損階段：3=完好 2=裂 1=冒煙 0=燃燒
    const stage = pct > 0.75 ? 0 : pct > 0.5 ? 1 : pct > 0.25 ? 2 : 3;
    if (stage !== this.stage) {
      const worse = stage > this.stage;
      if (worse) {
        this.scene.cameras.main.flash(220, 200, 40, 30);
        FxV4.shake(this.scene, 0.008, 400);
        FxV4.floatText(this.scene, G.x, G.y - 160, '💥 城牆受損！', '#FF5C5C', 52);
        FxV4.spark(this.scene, G.x, G.y - 40, 0xcabfa8, 22);   // 碎石飛濺
      }
      this.stage = stage;
      // 城牆階段硬切換（換圖瞬間用煙塵/飛石/白閃遮蓋，不做半透明疊影）
      this.applyWallStage(stage, worse);
      this.cracks.clear();
      this.applyDecals(stage, worse);
      if (stage >= 1) this.drawCracks(stage);
      if (stage >= 2 && !this.smoke) {
        this.smoke = this.scene.add.particles(G.x - 40, G.y - 60, 'fx_dot', {
          speedY: { min: -50, max: -20 }, scale: { start: 0.9, end: 0 },
          alpha: { start: 0.45, end: 0 }, lifespan: 1000, frequency: 120,
          tint: 0x555148,
        }).setDepth(860);
      }
      if (stage >= 3 && !this.fire) {
        this.fire = FxV4.flame(this.scene, G.x + 50, G.y + 30, 1.2);
        this.wallFires = [FxV4.flame(this.scene, 250, 1335, 0.9), FxV4.flame(this.scene, 820, 1325, 0.9)];
        this.scene.setCrisis(true);
      }
    }
  }

  // 城牆換圖：0-1=完好(+裂紋貼花) 2+=重損圖
  applyWallStage(stage, worse) {
    const sc = this.scene;
    const dmg = sc.stripDmg, lite = sc.stripLite;
    const wantDmg = stage >= 2 ? 1 : 0;
    const wantLite = stage === 1 && lite ? 1 : 0;
    if (worse) this.wallBreakBurst(stage);
    if (lite) sc.tweens.add({ targets: lite, alpha: wantLite, duration: 200, delay: worse ? 140 : 0 });
    if (dmg) sc.tweens.add({ targets: dmg, alpha: wantDmg, duration: 200, delay: worse ? 140 : 0 });
  }

  // 破壞瞬間：全牆煙塵牆＋飛石＋白閃（遮住換圖）
  wallBreakBurst(stage) {
    const sc = this.scene;
    AudioV4.wallBreak();
    sc.cameras.main.flash(140, 255, 235, 210);
    FxV4.shake(sc, 0.011, 500);
    // 沿牆帶爆一排塵雲
    for (let x = 80; x <= 1000; x += 115) {
      const dust = sc.add.particles(x, 1290 + (x % 3) * 30, 'fx_dot', {
        speed: { min: 40, max: 160 }, scale: { start: 1.6, end: 0 },
        alpha: { start: 0.75, end: 0 }, lifespan: { min: 500, max: 900 },
        quantity: 10, tint: [0xcabfa8, 0x9a917e, 0x7a7264], emitting: false,
      }).setDepth(870);
      dust.explode(10);
      sc.time.delayedCall(1100, () => dust.destroy());
    }
    // 飛石拋物線
    for (let k = 0; k < 8 + stage * 4; k++) {
      const sx = 120 + Math.random() * 840, sy = 1260 + Math.random() * 80;
      const rock = sc.add.image(sx, sy, 'fx_rock').setScale(0.7 + Math.random() * 0.9)
        .setTint(0xcabfa8).setDepth(872);
      const tx = sx + (Math.random() - 0.5) * 260, peak = 120 + Math.random() * 140;
      const t = { v: 0 };
      sc.tweens.add({
        targets: t, v: 1, duration: 550 + Math.random() * 300,
        onUpdate: () => {
          rock.x = Phaser.Math.Linear(sx, tx, t.v);
          rock.y = Phaser.Math.Linear(sy, sy + 90, t.v) - Math.sin(t.v * Math.PI) * peak;
          rock.rotation += 0.2;
        },
        onComplete: () => rock.destroy(),
      });
    }
  }

  // 戰損貼花：階段性疊加（裂縫→破洞/焦黑→瓦礫＋火）
  applyDecals(stage, pop) {
    this.decals.forEach(d => d.destroy());
    this.decals = [];
    const sc = this.scene, G = LAYOUT_V4.gate;
    const put = (tex, x, y, scale, alpha, depth = 456) => {
      const img = sc.add.image(x, y, tex).setScale(scale).setAlpha(alpha).setDepth(depth);
      this.decals.push(img);
      if (pop) {
        img.setScale(scale * 1.8);
        sc.tweens.add({ targets: img, scale, duration: 260, ease: 'Back.easeOut' });
      }
      return img;
    };
    if (stage >= 1) {
      put('FX_crack', G.x - 6, 1425, 0.42, 0.9);
      put('FX_crack', 250, 1365, 0.3, 0.8);
      put('FX_crack', 830, 1360, 0.28, 0.8);
    }
    if (stage >= 2) {
      put('FX_hole', 395, 1380, 0.3, 0.95);
      put('FX_scorch', 640, 1370, 0.34, 0.8);
      put('FX_crack', 540, 1315, 0.36, 0.9);
      put('FX_scorch', 150, 1385, 0.3, 0.75);
    }
    if (stage >= 3) {
      put('FX_hole', 760, 1385, 0.34, 1);
      put('FX_rubble', 540, 1530, 0.4, 1, 460);
      put('FX_rubble', 300, 1425, 0.3, 0.95, 460);
      put('FX_scorch', G.x, 1435, 0.44, 0.9);
    }
  }

  drawCracks(stage) {
    const G = LAYOUT_V4.gate;
    const g = this.cracks;
    // 城門裂紋
    g.lineStyle(4, 0x2a1e12, 0.8);
    const seeds = stage * 3;
    for (let i = 0; i < seeds; i++) {
      let x = G.x + (i % 2 ? 1 : -1) * (20 + i * 13), y = G.y - 60 + i * 22;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += Phaser.Math.Between(-26, 26); y += Phaser.Math.Between(10, 30);
        g.lineTo(x, y);
      }
      g.strokePath();
    }
    // 城牆整面裂紋帶（戰損可視化）
    g.lineStyle(5, 0x3a2e1e, 0.7);
    const wallSeeds = stage * 5;
    for (let i = 0; i < wallSeeds; i++) {
      let x = 60 + ((i * 197) % 960), y = 1285 + ((i * 83) % 100);
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) {
        x += Phaser.Math.Between(-34, 34); y += Phaser.Math.Between(8, 26);
        g.lineTo(x, y);
      }
      g.strokePath();
      // 破口煙燻
      if (stage >= 2 && i % 2 === 0) g.fillStyle(0x2a2420, 0.35).fillEllipse(x, y - 20, 46, 20);
    }
  }

  breakOpen() {  // 敗北演出
    const G = LAYOUT_V4.gate;
    FxV4.shake(this.scene, 0.02, 600);
    FxV4.spark(this.scene, G.x, G.y, 0xffd23c, 30);
    if (!this.fire) this.fire = FxV4.flame(this.scene, G.x, G.y, 1.6);
  }

  destroy() {
    this.barBg.destroy(); this.barFg.destroy(); this.barTxt.destroy(); this.cracks.destroy();
    if (this.smoke) this.smoke.destroy();
    if (this.fire) this.fire.destroy();
    if (this.wallFires) this.wallFires.forEach(f => f.destroy());
  }
}
