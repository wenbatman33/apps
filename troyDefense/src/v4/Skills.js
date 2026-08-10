// v4 主動技能：🔥沸油傾瀉 / 🏹萬箭齊發 / ☄️神火隕石(M2 解鎖)
class SkillsV4 {
  constructor(scene) {
    this.scene = scene;
    this.defs = [
      { id: 'oil',    name: '沸油', icon: '🔥', cd: 12000, color: 0xc85a14 },
      { id: 'arrows', name: '箭雨', icon: '🏹', cd: 18000, color: 0x5a7890 },
      { id: 'meteor', name: '隕石', icon: '☄️', cd: 30000, color: 0x6a2a20 },
    ];
    this.timers = [0, 0, 0];
    this.aiming = -1;
    this.buttons = [];
    LAYOUT_V4.skills.forEach((p, i) => {
      const d = this.defs[i];
      const ring = scene.add.circle(p.x, p.y, p.r, 0x4e3a22).setStrokeStyle(4, 0x3a2a16).setDepth(600);
      const face = scene.add.circle(p.x, p.y, p.r - 8, d.color).setDepth(601);
      const txt = scene.add.text(p.x, p.y, d.icon, { fontSize: '44px' }).setOrigin(0.5).setDepth(602);
      const cdArc = scene.add.graphics().setDepth(603);
      // 技能名稱標籤（鎖定時顯示未解鎖）
      scene.add.text(p.x, p.y - p.r - 18, d.name, {
        fontSize: '24px', fontStyle: 'bold', color: '#5E3A08',
        stroke: '#D9C79C', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(602);
      ring.setInteractive({ useHandCursor: true });
      ring.on('pointerdown', () => this.onTap(i));
      this.buttons.push({ ring, face, txt, cdArc, p });

    });
    // 瞄準圈與引導提示
    this.aimCircle = scene.add.circle(0, 0, 150, 0xff8a2a, 0.18)
      .setStrokeStyle(4, 0xffb020, 0.9).setDepth(890).setVisible(false);
    this.aimHint = scene.add.text(LAYOUT_V4.W / 2, 1560, '', {
      fontSize: '36px', fontStyle: 'bold', color: '#FFE08A',
      backgroundColor: 'rgba(26,36,48,0.85)', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setDepth(940).setVisible(false);
  }

  onTap(i) {
    const d = this.defs[i];
    if (this.timers[i] > 0) return;
    if (this.aiming === i) { this.cancelAim(); return; }
    this.aiming = i;
    this.aimCircle.setVisible(true).setRadius(d.id === 'oil' ? 150 * this.scene.mods.oilR : d.id === 'meteor' ? 230 : 180);
    this.aimCircle.setPosition(LAYOUT_V4.W / 2, 900);
    this.aimCircle.setFillStyle(d.id === 'oil' ? 0xff8a2a : 0xbfe4ff, 0.18);
    this.aimHint.setText('👆 點擊戰場位置施放「' + d.name + '」（再點按鈕取消）').setVisible(true);
    this.buttons[i].ring.setStrokeStyle(5, 0xffd060);
  }

  cancelAim() {
    if (this.aiming >= 0) this.buttons[this.aiming].ring.setStrokeStyle(4, 0x3a2a16);
    this.aiming = -1;
    this.aimCircle.setVisible(false);
    this.aimHint.setVisible(false);
  }

  onPointerMove(x, y) {
    if (this.aiming >= 0 && y < LAYOUT_V4.panel.y) this.aimCircle.setPosition(x, y);
  }

  // 回傳 true = 本次點擊被技能吃掉
  onBattlefieldTap(x, y) {
    if (this.aiming < 0) return false;
    if (y >= LAYOUT_V4.panel.y) return false;
    const i = this.aiming, d = this.defs[i];
    this.cancelAim();
    this.timers[i] = d.cd * this.scene.mods.cdMult;
    if (d.id === 'oil') this.castOil(x, y);
    else if (d.id === 'meteor') this.castMeteor(x, y);
    else this.castArrows(x, y);
    return true;
  }

  castOil(x, y) {
    const sc = this.scene;
    AudioV4.fireCast();
    const R = 150 * sc.mods.oilR;
    // 油瀑：從城門樓潑向落點
    const gx = LAYOUT_V4.gate.x, gy = 1130;
    for (let k = 0; k < 16; k++) {
      const drop = sc.add.image(gx + Phaser.Math.Between(-30, 30), gy, 'fx_dot')
        .setTint(k % 3 ? 0xff8a2a : 0xffd23c).setScale(1.1).setDepth(872);
      sc.tweens.add({
        targets: drop, x: x + Phaser.Math.Between(-60, 60), y: y + Phaser.Math.Between(-40, 40),
        delay: k * 26, duration: 300, ease: 'Sine.easeIn', onComplete: () => drop.destroy(),
      });
    }
    sc.time.delayedCall(360, () => FxV4.ring(sc, x, y, 0xff8a2a, R, 400));
    const pool = sc.add.circle(x, y, R, 0xff8a2a, 0.28).setDepth(400);
    const fire = [FxV4.flame(sc, x - 60, y + 10, 1.1), FxV4.flame(sc, x + 40, y - 20, 1.3), FxV4.flame(sc, x, y + 40, 1.0)];
    FxV4.shake(sc, 0.004, 200);
    FxV4.floatText(sc, x, y - 90, '🔥 沸油傾瀉', '#FF9A3C', 44);
    const tick = sc.time.addEvent({
      delay: 250, repeat: 23,   // 6 秒
      callback: () => {
        for (const e of sc.enemies) {
          if (e.dead) continue;
          if (Phaser.Math.Distance.Between(x, y, e.sprite.x, e.sprite.y) < R + 15)
            e.setBurn(45 * sc.mods.oilDps, 1200);
        }
      },
    });
    sc.time.delayedCall(6000, () => {
      tick.remove(); fire.forEach(f => f.destroy());
      sc.tweens.add({ targets: pool, alpha: 0, duration: 600, onComplete: () => pool.destroy() });
    });
  }

  castArrows(x, y) {
    const sc = this.scene;
    AudioV4.volley();
    FxV4.floatText(sc, x, y - 90, '🏹 萬箭齊發', '#EAF4FF', 44);
    const N = sc.mods.arrows;
    for (let k = 0; k < N; k++) {
      const tx = x + Phaser.Math.Between(-170, 170), ty = y + Phaser.Math.Between(-140, 140);
      const a = sc.add.image(tx, ty - 700 - Math.random() * 300, 'fx_arrow')
        .setDepth(880).setScale(1.1).setFlipY(true);
      sc.tweens.add({
        targets: a, y: ty, duration: 420 + Math.random() * 260, ease: 'Cubic.easeIn',
        onComplete: () => {
          FxV4.spark(sc, tx, ty, 0xfff4d8, 2);
          sc.tweens.add({ targets: a, alpha: 0, delay: 500, duration: 400, onComplete: () => a.destroy() });
        },
      });
    }
    sc.time.delayedCall(650, () => {
      for (const e of sc.enemies) {
        if (e.dead) continue;
        if (Phaser.Math.Distance.Between(x, y, e.sprite.x, e.sprite.y) < 195) e.takeDamage(sc.mods.arrowDmg);
      }
      FxV4.shake(sc, 0.003, 180);
    });
  }

  // ☄️ 神火隕石：天降巨石，大範圍毀滅＋全場震動
  castMeteor(x, y) {
    const sc = this.scene;
    FxV4.floatText(sc, x, y - 100, '☄️ 神火隕石', '#FFB050', 48);
    // 落下警示圈
    const warn = sc.add.circle(x, y, 230, 0xff5c2a, 0.12).setStrokeStyle(5, 0xff8a2a, 0.8).setDepth(860);
    sc.tweens.add({ targets: warn, alpha: { from: 1, to: 0.3 }, yoyo: true, repeat: 3, duration: 180 });
    // 隕石本體：巨石＋烈焰尾
    const rock = sc.add.image(x + 260, y - 900, 'fx_rock').setScale(4.2).setTint(0xff9a50).setDepth(900);
    const tr = FxV4.trail(sc, rock, [0xff8a2a, 0xffd23c, 0xff5c2a], 1.6);
    sc.tweens.add({
      targets: rock, x, y, duration: 850, ease: 'Quad.easeIn',
      onUpdate: () => rock.rotation += 0.15,
      onComplete: () => {
        rock.destroy(); tr.stopFollow(); tr.emitting = false;
        sc.time.delayedCall(400, () => tr.destroy());
        warn.destroy();
        // 撞擊：白閃＋雙重衝擊環＋蕈狀火＋深震
        AudioV4.explode();
        sc.cameras.main.flash(160, 255, 240, 220);
        FxV4.shake(sc, 0.014, 550);
        FxV4.ring(sc, x, y, 0xffd23c, 260, 450);
        FxV4.ring(sc, x, y, 0xff8a2a, 180, 350);
        FxV4.spark(sc, x, y, 0xffb050, 26);
        const fires = [FxV4.flame(sc, x - 80, y + 20, 1.4), FxV4.flame(sc, x + 60, y - 40, 1.6), FxV4.flame(sc, x, y + 50, 1.2)];
        sc.time.delayedCall(3000, () => fires.forEach(f => f.destroy()));
        for (const e of sc.enemies) {
          if (e.dead) continue;
          const d2 = Phaser.Math.Distance.Between(x, y, e.sprite.x, e.sprite.y);
          if (d2 < 240) {
            e.takeDamage(d2 < 120 ? 500 : 280, true, { crit: d2 < 120 });
            e.setBurn(40, 2500);
          }
        }
      },
    });
  }

  update(dt) {
    this.timers.forEach((t, i) => {
      if (t <= 0) return;
      this.timers[i] = Math.max(0, t - dt);
      const b = this.buttons[i], d = this.defs[i];
      const pct = this.timers[i] / (d.cd * this.scene.mods.cdMult);
      b.cdArc.clear();
      if (pct > 0) {
        b.cdArc.fillStyle(0x1a2430, 0.62);
        b.cdArc.slice(b.p.x, b.p.y, b.p.r - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct, false);
        b.cdArc.fillPath();
      }
    });
  }
}
