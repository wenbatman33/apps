/* v2 敵人 — 每種敵人是一種「攻城行為」
 * 鐵律：敵人絕不憑空消失。走到城下就攻城，死了有屍體與粒子交代。
 */
window.TD = window.TD || {};

let ENEMY_SEQ = 0;

TD.Enemy = class Enemy {
  constructor(scene, type, lane) {
    this.s = scene;
    this.cfg = TD.ENEMIES[type];
    this.type = type;
    this.id = ++ENEMY_SEQ;
    this.hp = this.cfg.hp * (scene.hpScale || 1);
    this.maxHp = this.hp;
    this.dead = false;
    this.lane = this.cfg.laneLock != null ? this.cfg.laneLock : lane;
    this.state = 'march';
    this.atkAt = 0;
    this.slowUntil = 0;
    this.burn = null;
    this.flameFx = null;
    this.spawned = 0;                  // 攻城塔已放兵數

    const L = TD.LAYOUT;
    const x = L.lanes.xs[this.lane] + Phaser.Math.Between(-L.lanes.jitter, L.lanes.jitter);
    const y = L.lanes.spawnY - Phaser.Math.Between(0, 40);

    if (this.cfg.art) {
      // 玩具兵：貼紙圖＋左右搖擺走路（玩具兵團感）
      this.spr = scene.add.image(x, y, this.cfg.art);
      this.baseScale = (TD.BASE_ENEMY_H * L.unit.enemyScale * this.cfg.scale) / this.spr.height;
      this.spr.setScale(this.baseScale);
      this.waddle = scene.tweens.add({
        targets: this.spr, angle: { from: -3.5, to: 3.5 },
        duration: 200 + (this.id % 5) * 22, yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });
    } else {
      // 攻城器械：靜態圖＋搖晃；dispH＝目標顯示高
      this.spr = scene.add.image(x, y, this.cfg.sprite);
      this.baseScale = ((this.cfg.dispH || 180) * this.cfg.scale) / this.spr.height;
      this.spr.setScale(this.baseScale);
      this.rockTween = scene.tweens.add({
        targets: this.spr, angle: { from: -1.2, to: 1.2 }, duration: 520,
        yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });
    }
    this.spr.setOrigin(0.5, 0.88);
    this.updateDepth();
    if (this.cfg.boss) this.bossEntrance();

    this.hpBar = scene.add.graphics().setDepth(TD.DEPTH.ENEMY + 500);
    this.nextDash = scene.time.now + (this.cfg.dashEvery || 0);
  }

  bossEntrance() {
    const fx = this.s.fx;
    fx.shake(8, 500); fx.flashWhite(0.3, 150);
    TD.audio.horn();
    const t = this.s.add.text(TD.GAME_W / 2, 560, this.cfg.name, {
      fontFamily: TD.FONT, fontSize: '84px', color: TD.CSS.fireHot,
      stroke: TD.STROKE, strokeThickness: 12, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(TD.DEPTH.BANNER).setAlpha(0);
    this.s.tweens.add({
      targets: t, alpha: 1, scale: { from: 1.6, to: 1 }, duration: 400, ease: 'Cubic.Out',
      onComplete: () => this.s.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 400, onComplete: () => t.destroy() }),
    });
  }

  get x() { return this.spr.x; }
  get y() { return this.spr.y; }

  updateDepth() {
    this.spr.setDepth((this.cfg.sprite ? TD.DEPTH.SIEGE : TD.DEPTH.ENEMY) + this.spr.y * 0.01);
  }

  speedNow(now) {
    let v = this.cfg.speed;
    if (now < this.slowUntil && !this.dashing) v *= 0.6;
    if (this.burn) v *= 1.22;                        // 著火亂竄
    if (this.dashing) v *= this.cfg.dashMul || 1;
    return v;
  }

  // ══════════ 每幀 ══════════
  update(now, dt) {
    if (this.dead) return;
    const L = TD.LAYOUT;
    const stopY = L.wall.topY - L.wall.stopGap;
    const sec = dt / 1000;

    // 燃燒 DOT
    if (this.burn) {
      if (now - this.burn.lastTick > 500) {
        this.burn.lastTick = now;
        this.takeDamage(this.burn.dps * 0.5, 'burnTick');
        if (this.dead) return;
      }
      if (now > this.burn.until) {
        this.burn = null;
        if (this.flameFx) { this.flameFx.destroy(); this.flameFx = null; }
      }
    }
    if (this.flameFx) { this.flameFx.x = this.x; this.flameFx.y = this.y - 10; }

    // BOSS 衝刺
    if (this.cfg.dashEvery && now > this.nextDash && this.state === 'march') {
      this.nextDash = now + this.cfg.dashEvery;
      this.dashing = true;
      this.s.fx.dust(this.x, this.y + 10, 5);
      this.s.time.delayedCall(900, () => { this.dashing = false; });
    }

    switch (this.state) {
      case 'march': this.doMarch(now, sec, stopY); break;
      case 'converge': this.doConverge(now, sec); break;
      case 'attack': this.doAttackGate(now); break;
      case 'throw': this.doThrow(now); break;
      case 'climb': this.doClimb(now, sec); break;
      case 'wallfight': this.doWallFight(now); break;
      case 'docked': this.doTowerDocked(now); break;
      case 'siege': this.doCatapult(now); break;
    }
    this.updateDepth();
    this.drawHp();
  }

  doMarch(now, sec, stopY) {
    const c = this.cfg;
    this.spr.y += this.speedNow(now) * sec;
    if (c.behavior === 'torch' && this.spr.y >= c.throwY) {
      this.state = 'throw'; this.stopAnim(); return;
    }
    if (c.behavior === 'catapult' && this.spr.y >= c.stopY) {
      this.state = 'siege'; this.stopAnim(); return;
    }
    if (this.spr.y >= stopY) {
      this.spr.y = stopY;
      if (c.behavior === 'ladder') this.beginLadder();
      else if (c.behavior === 'tower') this.beginDock();
      else {  // gate / ram / boss
        this.state = 'converge';
        // 在城門前散開站位，不疊在同一點
        const spread = (this.id % 7 - 3) * 46;
        this.gatherX = TD.LAYOUT.gate.x + spread;
      }
    }
  }

  doConverge(now, sec) {
    const dx = this.gatherX - this.spr.x;
    if (Math.abs(dx) < 8) { this.state = 'attack'; this.stopAnim(); return; }
    this.spr.x += Math.sign(dx) * Math.min(Math.abs(dx), this.speedNow(now) * sec);
    this.spr.setFlipX(dx < 0);
  }

  doAttackGate(now) {
    if (now < this.atkAt) return;
    this.atkAt = now + this.cfg.atkRate;
    const L = TD.LAYOUT;
    const hitX = Phaser.Math.Clamp(this.spr.x, L.gate.x - L.gate.w / 2 + 30, L.gate.x + L.gate.w / 2 - 30);
    const hitY = L.gate.topY + 30;
    const big = this.cfg.behavior === 'ram' || this.cfg.boss;
    // 揮擊動作：往門的方向一頂
    this.s.tweens.add({
      targets: this.spr, y: this.spr.y + (big ? 26 : 14), duration: big ? 150 : 90,
      yoyo: true, ease: 'Cubic.In',
      onYoyo: () => this.s.wall.damage(this.cfg.dmg, hitX, hitY, { big }),
    });
  }

  doThrow(now) {
    if (now < this.atkAt) return;
    this.atkAt = now + this.cfg.atkRate;
    const L = TD.LAYOUT;
    // 火把拋物線 → 城門
    const tx = L.gate.x + Phaser.Math.Between(-100, 100), ty = L.gate.topY + 40;
    const torch = this.s.add.image(this.x, this.y, 'fx_torch').setDepth(TD.DEPTH.PROJ);
    const flame = this.s.fx.flame(this.x, this.y, 0.4, 0, TD.DEPTH.PROJ);
    this.s.tweens.add({ targets: torch, angle: 720, duration: 700 });
    const curve = { t: 0 };
    const sx = this.x, sy = this.y, peak = Math.min(sy, ty) - 180;
    this.s.tweens.add({
      targets: curve, t: 1, duration: 700, ease: 'Linear',
      onUpdate: () => {
        const t = curve.t;
        torch.x = Phaser.Math.Linear(sx, tx, t);
        torch.y = TD.qBezier(sy, peak, ty, t);
        flame.x = torch.x; flame.y = torch.y;
      },
      onComplete: () => {
        torch.destroy(); flame.destroy();
        this.s.wall.damage(this.cfg.dmg, tx, ty, {});
        this.s.fx.flame(tx, ty + 10, 0.55, 1800, TD.DEPTH.GATE + 1);
        // 也可能點燃垛口
        const slot = this.s.wall.slotAt(tx, TD.LAYOUT.wall.slotY);
        if (slot && Math.random() < 0.35) this.s.wall.igniteSlot(slot);
      },
    });
    TD.audio.shootOil();
  }

  // ── 雲梯 ──
  beginLadder() {
    const L = TD.LAYOUT;
    // 找最近的垛口
    let best = this.s.wall.slots[0];
    this.s.wall.slots.forEach(sl => {
      if (Math.abs(sl.x - this.x) < Math.abs(best.x - this.x)) best = sl;
    });
    this.slot = best;
    if (!best.ladder) {
      const lad = this.s.add.image(best.x, L.wall.topY - 16, 'G_ladder')
        .setOrigin(0.5, 0).setDepth(TD.DEPTH.LADDER).setAlpha(0);
      const targetH = (best.y - L.wall.topY) + 90;
      lad.setDisplaySize(74, targetH);
      this.s.tweens.add({ targets: lad, alpha: 1, duration: 250 });
      this.s.fx.dust(best.x, L.wall.topY, 4);
      best.ladder = { sprite: lad, climbers: new Set() };
      TD.audio.place();
    }
    best.ladder.climbers.add(this);
    this.state = 'climb';
    this.climbFrom = this.spr.y;
    this.climbStart = this.s.time.now;
  }

  doClimb(now, sec) {
    const L = TD.LAYOUT;
    const k = Phaser.Math.Clamp((now - this.climbStart) / (this.cfg.climbSec * 1000), 0, 1);
    this.spr.x += (this.slot.x - this.spr.x) * 0.2;
    this.spr.y = Phaser.Math.Linear(this.climbFrom, this.slot.y, k);
    this.spr.setScale(this.baseScale * (1 - k * 0.12));
    if (k >= 1) {
      this.slot.ladder && this.slot.ladder.climbers.delete(this);
      this.state = 'wallfight';
      this.stopAnim();
      this.s.fx.dust(this.slot.x, this.slot.y, 3);
    }
  }

  doWallFight(now) {
    if (now < this.atkAt) return;
    this.atkAt = now + this.cfg.atkRate;
    const u = this.slot.unit;
    this.s.tweens.add({ targets: this.spr, x: this.spr.x + (u ? -8 : 8), duration: 80, yoyo: true });
    if (u) {
      u.hurt(this.cfg.dmg * 0.5);
      this.s.fx.sparks((this.spr.x + u.x) / 2, this.slot.y - 26, 7, { spread: 1.6, power: 260 });
      TD.audio.hit();
      // 守軍反擊（近戰白刃）
      this.takeDamage(u.stat.dmg * 0.4, 'spear');
    } else {
      // 沒人守：翻進城，直接鑿門內側
      this.s.wall.damage(this.cfg.dmg * 0.6,
        Phaser.Math.Clamp(this.spr.x, TD.LAYOUT.gate.x - 140, TD.LAYOUT.gate.x + 140),
        TD.LAYOUT.gate.topY + 60, {});
    }
  }

  // ── 攻城塔 ──
  beginDock() {
    this.state = 'docked';
    if (this.rockTween) this.rockTween.stop();
    this.s.fx.shake(5, 250);
    this.s.fx.dust(this.x, this.y + 8, 8);
    // 對準最近垛口
    let best = this.s.wall.slots[0];
    this.s.wall.slots.forEach(sl => {
      if (Math.abs(sl.x - this.x) < Math.abs(best.x - this.x)) best = sl;
    });
    this.slot = best;
    this.atkAt = this.s.time.now + 900;
  }

  doTowerDocked(now) {
    if (now < this.atkAt || this.spawned >= this.cfg.spawnMax) return;
    this.atkAt = now + this.cfg.spawnEvery;
    this.spawned++;
    // 從塔頂放兵到垛口
    const e = this.s.spawnEnemy('soldier', this.lane, { atWall: true, slot: this.slot });
    e.spr.x = this.x; e.spr.y = this.y - 40;
    this.s.tweens.add({ targets: e.spr, x: this.slot.x, y: this.slot.y, duration: 420, ease: 'Cubic.Out' });
  }

  // ── 投石機 ──
  doCatapult(now) {
    if (now < this.atkAt) return;
    this.atkAt = now + this.cfg.atkRate;
    // 投臂後仰演出
    this.s.tweens.add({ targets: this.spr, angle: -8, duration: 300, yoyo: true, ease: 'Cubic.In' });
    // 火球目標：隨機守軍垛口或城門
    const L = TD.LAYOUT;
    const withUnit = this.s.wall.slots.filter(sl => sl.unit);
    const target = (withUnit.length && Math.random() < 0.6)
      ? Phaser.Utils.Array.GetRandom(withUnit)
      : { x: L.gate.x + Phaser.Math.Between(-80, 80), y: L.gate.topY + 50, gate: true };
    const ball = this.s.add.image(this.x, this.y - 60, 'fx_fireball')
      .setDepth(TD.DEPTH.PROJ).setBlendMode(Phaser.BlendModes.ADD).setScale(1.3);
    const trail = this.s.time.addEvent({ delay: 40, loop: true, callback: () => {
      const e = this.s.add.image(ball.x, ball.y, 'fx_ember').setDepth(TD.DEPTH.PROJ)
        .setBlendMode(Phaser.BlendModes.ADD).setScale(0.9);
      this.s.tweens.add({ targets: e, alpha: 0, scale: 0.2, duration: 350, onComplete: () => e.destroy() });
    }});
    const sx = this.x, sy = this.y - 60, peak = 260;
    const curve = { t: 0 };
    TD.audio.shootStone();
    this.s.tweens.add({
      targets: curve, t: 1, duration: 1150, ease: 'Linear',
      onUpdate: () => {
        ball.x = Phaser.Math.Linear(sx, target.x, curve.t);
        ball.y = TD.qBezier(sy, peak, target.y, curve.t);
      },
      onComplete: () => {
        ball.destroy(); trail.remove();
        this.s.fx.explosion(target.x, target.y, 110);
        this.s.fx.shake(8, 350);
        TD.audio.explode();
        if (target.gate) this.s.wall.damage(this.cfg.dmg, target.x, target.y, { big: true });
        else if (target.unit) target.unit.hurt(this.cfg.dmg);
      },
    });
  }

  stopAnim() {
    if (this.waddle) { this.waddle.stop(); this.spr.setAngle(0); }
    if (this.rockTween) this.rockTween.pause();
  }

  // ══════════ 受擊 ══════════
  takeDamage(v, kind = 'arrow', opt = {}) {
    if (this.dead) return;
    if (kind === 'arrow' && this.cfg.blockFront) {
      v *= (1 - this.cfg.blockFront);
      this.s.fx.sparks(this.x, this.y - 30, 4, { power: 220 });   // 箭中盾
    }
    if ((kind === 'fire' || kind === 'burnTick') && this.cfg.burnMul) v *= this.cfg.burnMul;
    if (kind === 'spear' && (this.state === 'climb' || this.state === 'wallfight')) {
      v *= (this.s.spearClimberMul || 3);
    }
    const crit = opt.crit || Math.random() < 0.08;
    if (crit) v *= 1.8;
    this.hp -= v;

    if (kind !== 'burnTick') {
      this.spr.setTintFill(0xFFFFFF);
      this.s.time.delayedCall(40, () => { if (!this.dead) this.spr.clearTint(); });
      this.s.fx.dmgNum(this.x, this.y - this.spr.displayHeight * 0.8, v, crit);
      if (crit) { this.s.fx.slowmo(0.3, 80); TD.audio.crit(); }
    }
    if (this.hp <= 0) this.die(kind);
  }

  /** 點燃（火箭/火油/火海）*/
  setBurn(dps, sec) {
    this.burn = { dps, until: this.s.time.now + sec * 1000, lastTick: 0 };
    if (!this.flameFx) this.flameFx = this.s.fx.ignite(this.spr, 0.55 * this.cfg.scale);
  }

  die(kind) {
    if (this.dead) return;
    this.dead = true;
    const fx = this.s.fx;

    if (this.slot && this.slot.ladder) this.slot.ladder.climbers.delete(this);
    if (this.flameFx) { this.flameFx.destroy(); this.flameFx = null; }
    if (this.rockTween) this.rockTween.stop();
    if (this.waddle) this.waddle.stop();
    this.hpBar.destroy();

    if (this.cfg.behavior === 'tower' || this.cfg.behavior === 'ram' || this.cfg.behavior === 'catapult') {
      // 器械：燃燒倒塌
      fx.shake(this.cfg.behavior === 'tower' ? 10 : 6, 500);
      fx.explosion(this.x, this.y - 40, 140);
      fx.rubble(this.x, this.y, 12);
      fx.dust(this.x, this.y, 10);
      const fl = fx.flame(this.x, this.y - 30, 1.4, 2600);
      TD.audio.killBig();
      this.s.tweens.add({
        targets: this.spr, angle: this.spr.angle + (Math.random() < 0.5 ? -78 : 78),
        y: this.spr.y + 40, alpha: 0.0, duration: 900, ease: 'Cubic.In',
        onComplete: () => this.spr.destroy(),
      });
    } else {
      // 士兵：粒子爆裂 + 倒地屍體淡出
      const n = this.cfg.boss ? 30 : 14;
      for (let i = 0; i < this.s.fx.budget(n); i++) {
        const p = this.s.add.image(this.x, this.y - 30, 'fx_ember')
          .setDepth(TD.DEPTH.FX).setBlendMode(Phaser.BlendModes.ADD)
          .setTint(0xFF6040).setScale(Phaser.Math.FloatBetween(0.4, 1));
        this.s.fx.alive++;
        const ang = Phaser.Math.FloatBetween(0, 6.28);
        this.s.tweens.add({
          targets: p, x: this.x + Math.cos(ang) * 90, y: this.y - 30 + Math.sin(ang) * 70,
          alpha: 0, duration: 420, ease: 'Cubic.Out',
          onComplete: () => { p.destroy(); this.s.fx.alive--; },
        });
      }
      this.spr.setTint(0x6A5A4A);
      this.s.tweens.add({
        targets: this.spr, angle: 84, alpha: 0, duration: this.cfg.boss ? 1500 : 2400,
        ease: 'Cubic.In', onComplete: () => this.spr.destroy(),
      });
      if (this.cfg.boss) { fx.shake(9, 600); fx.flashWhite(0.4, 160); TD.audio.killBig(); }
      else TD.audio.kill();
    }
    fx.coinPop(this.x, this.y - 40, 2);
    this.s.onEnemyKilled(this, kind);
  }

  drawHp() {
    const g = this.hpBar; g.clear();
    if (this.hp >= this.maxHp || this.dead) return;
    const w = this.cfg.boss ? 120 : 64, h = this.cfg.boss ? 12 : 7;
    const x = this.x - w / 2, y = this.y - this.spr.displayHeight * 0.98 - 12;
    const k = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    g.fillStyle(0x1A0E06, 0.8).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(k > 0.4 ? 0x6FE08A : 0xFF5C5C, 1).fillRect(x, y, w * k, h);
  }

  destroy() {
    this.hpBar && this.hpBar.destroy();
    this.flameFx && this.flameFx.destroy();
    this.spr && this.spr.destroy();
  }
};
