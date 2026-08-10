/* v2 守軍 — 站在城牆垛口上（背面視角），自動攻擊城下敵軍
 * 四種模式：arrow 拋物線箭 / stone AoE 砸地 / spear 牆頭突刺 / oil 扇形火油
 */
window.TD = window.TD || {};

TD.Unit = class Unit {
  constructor(scene, slot, type, lv) {
    this.s = scene;
    this.slot = slot;
    this.type = type;
    this.lv = lv;
    this.cfg = TD.UNITS[type];
    this.stat = TD.unitStat(type, lv);
    this.hp = 60 + lv * 45;
    this.maxHp = this.hp;
    this.atkAt = 0;
    this.dead = false;

    const L = TD.LAYOUT;
    this.spr = scene.add.image(slot.x, slot.y, this.cfg.icon)
      .setOrigin(0.5, 0.9).setDepth(TD.DEPTH.DEFENDER);
    this.spr.setScale((TD.BASE_DEF_H * L.wall.unitScale * (1 + (lv - 1) * 0.055)) / this.spr.height);

    // 階級徽章
    this.badge = scene.add.container(slot.x + 34, slot.y - 66).setDepth(TD.DEPTH.DEFENDER + 1);
    const bg = scene.add.graphics();
    bg.fillStyle(0x1A0E06, 0.9).fillCircle(0, 0, L.unit.badgeSize * 0.62);
    bg.lineStyle(3, this.cfg.color, 1).strokeCircle(0, 0, L.unit.badgeSize * 0.62);
    const txt = scene.add.text(0, 0, String(lv), {
      fontFamily: TD.FONT, fontSize: '26px', color: TD.CSS.gold, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.badge.add([bg, txt]);

    // 高階發光
    if (lv >= 4) {
      this.glow = scene.add.image(slot.x, slot.y - 30, 'fx_glow')
        .setDepth(TD.DEPTH.DEFENDER - 1).setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setAlpha(0.7);
    }

    this.hpBar = scene.add.graphics().setDepth(TD.DEPTH.DEFENDER + 2);

    // 就位動畫
    scene.fx.dust(slot.x, slot.y, 4);
    this.spr.setScale(this.spr.scale * 0.4);
    scene.tweens.add({ targets: this.spr, scale: this.spr.scale / 0.4, duration: 220, ease: 'Back.Out' });
    TD.audio.place();
  }

  get x() { return this.slot.x; }
  get y() { return this.slot.y; }

  update(now) {
    if (this.dead) return;
    if (now < this.atkAt) return;

    switch (this.cfg.mode) {
      case 'arrow': this.tryStream(now, 'arrow'); break;
      case 'spear': this.tryStream(now, 'spear'); break;
      case 'stone': this.tryStone(now); break;
      case 'oil':   this.tryOilJet(now); break;
    }
    this.drawHp();
  }

  /** 找目標：優先自己正上方的縱列，其次全場最近 */
  findTarget(range, filter) {
    let col = null, colY = -1, any = null, anyD = 1e9;
    for (const e of this.s.enemies) {
      if (e.dead || e.state === 'climb' || e.state === 'wallfight') continue;
      if (filter && !filter(e)) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d > range) continue;
      if (Math.abs(e.x - this.x) < 165 && e.y > colY) { colY = e.y; col = e; }
      if (d < anyD) { anyD = d; any = e; }
    }
    return col || any;
  }

  recoil() {
    this.s.tweens.add({ targets: this.spr, scaleY: this.spr.scaleY * 0.92, duration: 60, yoyo: true });
  }

  muzzle(tint) {
    const m = this.s.add.image(this.x, this.y - 70, 'fx_glow')
      .setDepth(TD.DEPTH.PROJ).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.5).setTint(tint).setAlpha(0.9);
    this.s.tweens.add({ targets: m, scale: 0.2, alpha: 0, duration: 110, onComplete: () => m.destroy() });
  }

  // ── 高頻直射彈幕（弓＝單體箭流；矛＝貫穿標槍）──
  tryStream(now, kind) {
    const t = this.findTarget(this.stat.range);
    if (!t) return;
    this.atkAt = now + this.stat.rate;
    this.recoil();
    const fire = kind === 'arrow' && this.lv >= (this.cfg.burnLv || 99);
    kind === 'arrow' ? TD.audio.shootArrow() : TD.audio.shootSpear();
    this.muzzle(fire ? 0xFFB050 : 0xFFF0C0);

    // 朝目標方向直射（多半是正上方）
    const ang = Math.atan2(t.y - (this.y - 60), t.x - this.x);
    const sp = this.cfg.projSpeed;
    this.s.spawnProj({
      x: this.x, y: this.y - 60,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      tex: 'fx_arrow', scale: kind === 'spear' ? 1.7 : 1.15,
      tint: fire ? 0xFFB050 : (kind === 'spear' ? 0xBFE4FF : 0xFFFFFF),
      rot: ang - Math.PI / 2,
      dmg: this.stat.dmg, kind,
      pierce: this.cfg.pierce || 0,
      trail: fire ? 'fire' : (kind === 'spear' ? 'blue' : 'faint'),
      onHit: (e) => { if (fire && !e.dead) e.setBurn(this.stat.dmg * 0.3, 2.2); },
    });
  }

  // ── 投石：AoE 砸地 ──
  tryStone(now) {
    const t = this.findTarget(this.stat.range);
    if (!t) return;
    this.atkAt = now + this.stat.rate;
    this.recoil();
    TD.audio.shootStone();
    const rock = this.s.add.image(this.x, this.y - 70, 'fx_stone')
      .setDepth(TD.DEPTH.PROJ).setScale(2.6);
    const sx = this.x, sy = this.y - 70;
    const tx = t.x, ty = t.y;         // 預判落點＝目前位置
    const curve = { t: 0 };
    this.s.tweens.add({
      targets: rock, angle: 520, duration: 640,
    });
    this.s.tweens.add({
      targets: curve, t: 1, duration: 640, ease: 'Linear',
      onUpdate: () => {
        rock.x = Phaser.Math.Linear(sx, tx, curve.t);
        rock.y = TD.qBezier(sy, Math.min(sy, ty) - 260, ty, curve.t);
      },
      onComplete: () => {
        rock.destroy();
        const aoe = this.cfg.aoe * (1 + (this.lv - 1) * 0.08);
        this.s.fx.dust(tx, ty, 6);
        this.s.fx.rubble(tx, ty, 8);
        this.s.fx.sparks(tx, ty, 6, { spread: 3.14, power: 260 });
        this.s.fx.shake(3, 140);
        this.s.enemies.forEach(e => {
          if (e.dead) return;
          if (Phaser.Math.Distance.Between(tx, ty, e.x, e.y) < aoe) {
            e.takeDamage(this.stat.dmg, 'stone');
          }
        });
      },
    });
  }

  // ── 火油：持續火舌噴流（短射程、點燃）──
  tryOilJet(now) {
    const t = this.findTarget(this.stat.range);
    if (!t) return;
    this.atkAt = now + this.stat.rate;
    if (Math.random() < 0.2) TD.audio.shootOil();
    const ang = Math.atan2(t.y - (this.y - 55), t.x - this.x)
      + Phaser.Math.FloatBetween(-0.12, 0.12);          // 噴流散布
    const sp = this.cfg.projSpeed;
    this.s.spawnProj({
      x: this.x + Phaser.Math.Between(-8, 8), y: this.y - 55,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      tex: 'fx_ember', scale: Phaser.Math.FloatBetween(0.9, 1.5),
      tint: 0xFFB050, add: true,
      dmg: this.stat.dmg, kind: 'fire',
      trail: 'fire', maxDist: this.stat.range,
      onHit: (e) => { if (!e.dead) e.setBurn(this.stat.dmg * 1.2, this.cfg.burnSec); },
    });
  }

  hurt(v) {
    if (this.dead) return;
    this.hp -= v;
    this.spr.setTintFill(0xFF9090);
    this.s.time.delayedCall(50, () => { if (!this.dead) this.spr.clearTint(); });
    this.drawHp();
    if (this.hp <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.slot.unit = null;
    this.s.fx.dust(this.x, this.y, 5);
    this.s.fx.sparks(this.x, this.y - 30, 8, { spread: 3.14 });
    TD.audio.deny();
    this.s.tweens.add({
      targets: [this.spr, this.badge], alpha: 0, y: '+=20', duration: 400,
      onComplete: () => this.destroy(),
    });
    this.hpBar.clear();
  }

  drawHp() {
    const g = this.hpBar; g.clear();
    if (this.hp >= this.maxHp || this.dead) return;
    const w = 60, h = 6;
    const x = this.x - w / 2, y = this.y - this.spr.displayHeight - 6;
    const k = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    g.fillStyle(0x1A0E06, 0.8).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(k > 0.4 ? 0x6FE08A : 0xFF5C5C, 1).fillRect(x, y, w * k, h);
  }

  destroy() {
    this.spr.destroy(); this.badge.destroy(); this.hpBar.destroy();
    this.glow && this.glow.destroy();
  }
};
