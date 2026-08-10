/* v2 主動技能 — 玩家親手放火：沸油傾瀉 / 萬箭齊發 / 神火隕石（神恩滿）
 * 點技能鈕 → 進入瞄準模式 → 點戰場施放（再點鈕取消）；神火按下直接全場轟
 */
window.TD = window.TD || {};

TD.Skills = class Skills {
  constructor(scene) {
    this.s = scene;
    this.cdUntil = { oilPour: 0, arrowRain: 0 };
    this.aiming = null;          // 'oilPour' | 'arrowRain'
    this.build();
  }

  build() {
    const s = this.s, L = TD.LAYOUT.skills;
    this.btns = {};
    this.btns.oilPour = this.makeBtn(L.xs[0], L.y, L.r, TD.SKILLS.oilPour.icon, () => this.toggleAim('oilPour'));
    this.btns.arrowRain = this.makeBtn(L.xs[1], L.y, L.r, TD.SKILLS.arrowRain.icon, () => this.toggleAim('arrowRain'));
    this.btns.meteor = this.makeBtn(L.xs[2], L.y, L.r, TD.SKILLS.meteor.icon, () => this.castMeteor());

    // 瞄準游標
    this.cursor = s.add.graphics().setDepth(TD.DEPTH.FX_TOP).setAlpha(0);
  }

  makeBtn(x, y, r, icon, cb) {
    const s = this.s;
    const c = s.add.container(x, y).setDepth(TD.DEPTH.PANEL);
    const bg = s.add.graphics();
    const ring = s.add.graphics();
    const t = s.add.text(0, 0, icon, { fontSize: `${r * 0.9}px` }).setOrigin(0.5);
    c.add([bg, ring, t]);
    const z = s.add.zone(x, y, r * 2.2, r * 2.2).setInteractive();
    z.on('pointerdown', (p, lx, ly, ev) => { ev && ev.stopPropagation(); cb(); });
    return { c, bg, ring, t, r, x, y };
  }

  toggleAim(key) {
    if (this.s.over) return;
    const now = this.s.time.now;
    if (now < this.cdUntil[key]) { TD.audio.deny(); return; }
    this.aiming = this.aiming === key ? null : key;
    this.cursor.setAlpha(this.aiming ? 1 : 0);
    TD.audio.coin();
  }

  /** GameScene 的 pointermove 轉呼叫 */
  moveCursor(x, y) {
    if (!this.aiming) return;
    const cfg = TD.SKILLS[this.aiming];
    const g = this.cursor; g.clear();
    const col = this.aiming === 'oilPour' ? 0xFF7A1A : 0xFFC83D;
    g.lineStyle(4, col, 0.9).strokeCircle(x, y, cfg.radius);
    g.lineStyle(2, col, 0.4).strokeCircle(x, y, cfg.radius * 0.55);
    g.lineBetween(x - 26, y, x + 26, y); g.lineBetween(x, y - 26, x, y + 26);
  }

  /** 點擊戰場；回傳 true 表示此點擊被技能吃掉 */
  tryCast(x, y) {
    if (!this.aiming) return false;
    const key = this.aiming;
    // 只能施放在戰場區
    const F = TD.LAYOUT;
    if (y < F.field.y || y > F.wall.topY + 30) { TD.audio.deny(); return true; }
    this.aiming = null; this.cursor.setAlpha(0).clear();
    this.cdUntil[key] = this.s.time.now + TD.SKILLS[key].cd;
    if (key === 'oilPour') this.castOil(x, y);
    else this.castArrowRain(x, y);
    return true;
  }

  castOil(x, y) {
    const s = this.s, cfg = TD.SKILLS.oilPour;
    TD.audio.skill();
    // 油瀑從城垛上緣傾下 → 落點爆燃
    const fromY = TD.LAYOUT.wall.topY - 20;
    for (let i = 0; i < 26; i++) {
      const d = s.add.image(x + Phaser.Math.Between(-60, 60), fromY, 'fx_ember')
        .setDepth(TD.DEPTH.PROJ).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(Phaser.Math.FloatBetween(0.6, 1.2)).setTint(0xFFB050);
      s.tweens.add({
        targets: d, y: y + Phaser.Math.Between(-40, 40), x: d.x + Phaser.Math.Between(-30, 30),
        duration: 320 + i * 14, ease: 'Cubic.In', onComplete: () => d.destroy(),
      });
    }
    s.time.delayedCall(420, () => {
      s.fx.flashWhite(0.25, 90);
      s.fx.shake(4, 200);
      s.fx.explosion(x, y, cfg.radius * 0.6);
      s.fx.groundFire(x, y, cfg.radius * 2, cfg.burnSec, cfg.dmg);
      TD.audio.explode();
      s.enemies.forEach(e => {
        if (e.dead) return;
        if (Phaser.Math.Distance.Between(x, y, e.x, e.y) < cfg.radius) {
          e.takeDamage(cfg.dmg * 2, 'fire');
          if (!e.dead) e.setBurn(cfg.dmg, 3.2);
        }
      });
    });
  }

  castArrowRain(x, y) {
    const s = this.s, cfg = TD.SKILLS.arrowRain;
    TD.audio.skill();
    // 全城牆守軍齊射動作
    s.wall.slots.forEach(sl => sl.unit && s.tweens.add({
      targets: sl.unit.spr, scaleY: sl.unit.spr.scaleY * 0.9, duration: 90, yoyo: true,
    }));
    const n = cfg.count;
    for (let i = 0; i < n; i++) {
      s.time.delayedCall(i * 9, () => {
        const tx = x + Phaser.Math.Between(-cfg.radius, cfg.radius);
        const ty = y + Phaser.Math.Between(-cfg.radius * 0.7, cfg.radius * 0.7);
        const a = s.add.image(tx + 60, ty - 700, 'fx_arrow').setDepth(TD.DEPTH.PROJ)
          .setScale(1.15).setRotation(Math.PI * 0.54);
        s.tweens.add({
          targets: a, x: tx, y: ty, duration: 240, ease: 'Cubic.In',
          onComplete: () => {
            a.setRotation(Math.PI * 0.5).setOrigin(0.5, 0.1);
            s.tweens.add({ targets: a, alpha: 0, delay: 500, duration: 400, onComplete: () => a.destroy() });
            if (i % 6 === 0) s.fx.dust(tx, ty, 1);
            s.enemies.forEach(e => {
              if (e.dead) return;
              if (Phaser.Math.Distance.Between(tx, ty, e.x, e.y) < 46) e.takeDamage(cfg.dmg, 'arrow');
            });
          },
        });
      });
    }
    s.time.delayedCall(300, () => TD.audio.shootArrow());
    s.fx.shake(3, 260);
  }

  castMeteor() {
    const s = this.s;
    if (s.over) return;
    if (s.fury < TD.FURY_MAX) { TD.audio.deny(); return; }
    s.fury = 0;
    const cfg = TD.SKILLS.meteor;
    TD.audio.horn();
    s.fx.slowmo(0.35, 200);
    const xs = Phaser.Utils.Array.Shuffle([...TD.LAYOUT.lanes.xs]);
    xs.forEach((mx, i) => {
      s.time.delayedCall(260 + i * 340, () => {
        const my = Phaser.Math.Between(760, TD.LAYOUT.wall.topY - 130);
        const ball = s.add.image(mx + 200, -80, 'fx_fireball')
          .setDepth(TD.DEPTH.FX_TOP).setBlendMode(Phaser.BlendModes.ADD).setScale(2.6);
        const trail = s.time.addEvent({ delay: 26, loop: true, callback: () => {
          const e = s.add.image(ball.x, ball.y, 'fx_ember').setDepth(TD.DEPTH.FX_TOP)
            .setBlendMode(Phaser.BlendModes.ADD).setScale(1.5);
          s.tweens.add({ targets: e, alpha: 0, scale: 0.3, duration: 420, onComplete: () => e.destroy() });
        }});
        s.tweens.add({
          targets: ball, x: mx, y: my, duration: 480, ease: 'Cubic.In',
          onComplete: () => {
            ball.destroy(); trail.remove();
            s.fx.explosion(mx, my, cfg.radius);
            s.fx.shake(12, 500);
            s.fx.groundFire(mx, my + 30, cfg.radius * 1.4, 4, 20);
            TD.audio.explode();
            s.enemies.forEach(e => {
              if (e.dead) return;
              if (Phaser.Math.Distance.Between(mx, my, e.x, e.y) < cfg.radius) {
                e.takeDamage(cfg.dmg, 'fire');
                if (!e.dead) e.setBurn(16, 3);
              }
            });
          },
        });
      });
    });
  }

  /** 每幀刷新按鈕狀態（CD 圈 / 神恩填充）*/
  update(now) {
    const draw = (b, key) => {
      const { bg, ring, r } = b;
      bg.clear(); ring.clear();
      let ready, frac;
      if (key === 'meteor') {
        frac = Phaser.Math.Clamp(this.s.fury / TD.FURY_MAX, 0, 1);
        ready = frac >= 1;
      } else {
        const cd = TD.SKILLS[key].cd;
        const left = Math.max(0, this.cdUntil[key] - now);
        frac = 1 - left / cd;
        ready = left <= 0;
      }
      bg.fillStyle(ready ? 0x3A2410 : 0x241A10, 0.94).fillCircle(0, 0, r);
      bg.lineStyle(4, ready ? TD.PALETTE.gold : TD.PALETTE.uiEdge, 1).strokeCircle(0, 0, r);
      if (!ready) {
        ring.lineStyle(6, key === 'meteor' ? TD.PALETTE.fire : TD.PALETTE.mana, 0.9);
        ring.beginPath();
        ring.arc(0, 0, r - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ring.strokePath();
      } else if (key === 'meteor' || this.aiming === key) {
        // 就緒呼吸光
        const k = 0.5 + 0.5 * Math.sin(now / 220);
        ring.lineStyle(5, TD.PALETTE.fire, 0.4 + 0.5 * k).strokeCircle(0, 0, r + 5);
      }
      b.t.setAlpha(ready ? 1 : 0.55);
    };
    draw(this.btns.oilPour, 'oilPour');
    draw(this.btns.arrowRain, 'arrowRain');
    draw(this.btns.meteor, 'meteor');
  }
};
