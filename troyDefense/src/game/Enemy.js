/* 敵方單位：在網格上以最短路推進，玩家建塔會使其重新繞路 */
window.TD = window.TD || {};

TD.Enemy = class Enemy extends Phaser.GameObjects.Container {
  constructor(scene, typeKey, entryIdx) {
    super(scene, 0, 0);
    this.gs = scene;
    this.typeKey = typeKey;
    const D = TD.ENEMIES[typeKey];
    this.def = D;

    this.maxHp = Math.round(D.hp * (scene.hpScale || 1));
    this.hp = this.maxHp;
    this.spd = D.spd;
    this.armor = D.armor || 0;
    this.isBoss = !!D.boss;
    this.structure = !!D.structure;

    // 起點
    const G = scene.grid;
    const ents = G.entries;
    const e = ents[(entryIdx < 0 ? Phaser.Math.Between(0, ents.length - 1) : entryIdx) % ents.length];
    this.cell = G.at(e.c, e.r);
    const p = G.cellXY(e.c, e.r);
    this.x = p.x; this.y = p.y;
    this.entryIdx = ents.indexOf(e);

    // 隨機微偏移與速度差：避免同路敵人完全重疊成一坨
    const gw = G.cellW, gh = G.cellH;
    this.offX = Phaser.Math.FloatBetween(-gw * 0.24, gw * 0.24);
    this.offY = Phaser.Math.FloatBetween(-gh * 0.20, gh * 0.20);
    this.spdVar = Phaser.Math.FloatBetween(0.90, 1.12);
    this.x += this.offX; this.y += this.offY;

    this.path = null; this.pathIdx = 0; this.target = null;
    this.repath();

    // 狀態
    this.slowUntil = 0; this.slowAmt = 0;
    this.burnUntil = 0; this.burnDps = 0; this.burnFx = null;
    this.stealthUntil = 0;
    this.dashUntil = 0; this.nextDash = D.dash ? D.dash.every : 0;
    this.nextSummon = D.summon ? D.summon.every : 0;
    this.heelOpenUntil = 0; this.nextHeel = D.heelWindow ? D.heelWindow.every : 0;
    this.nextStealth = D.stealth ? D.stealth.every : 0;

    this.build(scene.enemyScale || 1);
    scene.add.existing(this);
    this.setDepth(TD.DEPTH.ENEMY + (this.isBoss ? 3 : 0));
  }

  build(scaleUp) {
    const D = this.def;
    const cell = this.gs.grid.cellW;
    const base = cell * D.scale * scaleUp;

    this.shadow = this.scene.add.ellipse(0, base * 0.34, base * 0.50, base * 0.16, 0x000000, 0.28);
    this.img = this.scene.add.image(0, 0, D.tex);
    this.img.setDisplaySize(base, base).setOrigin(0.5, 0.66);
    if (D.tint) this.img.setTint(D.tint);
    this.bodyW = base * 0.42;

    const bw = Math.max(52, base * 0.62);
    this.hpBg = this.scene.add.rectangle(0, -base * 0.46, bw, 10, 0x3A2416, 0.75);
    this.hpBar = this.scene.add.rectangle(-bw / 2, -base * 0.46, bw, 10, 0x4CD97B).setOrigin(0, 0.5);
    this.hpW = bw;

    this.add([this.shadow, this.img, this.hpBg, this.hpBar]);

    if (this.isBoss) {
      this.crown = this.scene.add.text(0, -base * 0.62, this.def.name, {
        fontFamily: TD.FONT, fontSize: '26px', color: '#FFE066',
        stroke: '#5E3A18', strokeThickness: 5,
      }).setOrigin(0.5);
      this.add(this.crown);
    }

    // 行走的輕微上下擺動
    this.walkTween = this.scene.tweens.add({
      targets: this.img, y: -base * 0.03, duration: 260 + Math.random() * 120,
      yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });
  }

  // ── 尋路 ──
  repath() {
    if (this.structure) return;
    const G = this.gs.grid;
    // 若正走向的下一格已被建塔，就退回目前這格重算
    const from = (this.target && !this.target.unit) ? this.target : this.cell;
    const p = G.pathFrom(from);
    if (!p || p.length === 0) return;
    this.path = p;
    this.pathIdx = 0;
    this.target = p[0];
  }

  get remainSteps() { return this.path ? this.path.length - this.pathIdx : 999; }

  /** 給「優先打最接近城門的敵人」用，0~1，越大越近 */
  get progress() {
    if (!this.path || !this.path.length) return 0;
    return 1 - this.remainSteps / (this.path.length + 1);
  }

  get speed() {
    let s = this.spd;
    if (this.gs.now < this.slowUntil && !this.def.immuneSlow) s *= (1 - this.slowAmt);
    if (this.gs.now < this.dashUntil) s *= this.def.dash.mul;
    if (this.gs.foreseeUntil > this.gs.now && !this.def.immuneSlow) s *= 0.6;
    return s * this.spdVar * (this.gs.grid.cellW / 88);   // 隨格子大小等比
  }

  get targetable() {
    if (this.gs.now < this.stealthUntil) return false;
    return this.active && this.hp > 0;
  }

  get damageable() {
    if (!this.def.invulnerable) return true;
    return this.gs.now < this.heelOpenUntil;
  }

  update(dt) {
    if (this.hp <= 0) return;
    const now = this.gs.now;

    if (now < this.burnUntil) {
      this.takeDamage(this.burnDps * dt / 1000, { silent: true, ignoreArmor: true });
      if (this.hp <= 0) return;
    } else if (this.burnFx) { this.burnFx.destroy(); this.burnFx = null; }

    if (this.def.dash && !this.structure) {
      this.nextDash -= dt;
      if (this.nextDash <= 0) {
        this.nextDash = this.def.dash.every;
        this.dashUntil = now + this.def.dash.dur;
        this.gs.fx.ring(this.x, this.y, 80, 0xFFE066, 220);
      }
    }
    if (this.def.stealth) {
      this.nextStealth -= dt;
      if (this.nextStealth <= 0) {
        this.nextStealth = this.def.stealth.every;
        if (!this.gs.inAnyAura(this)) {
          this.stealthUntil = now + this.def.stealth.dur;
          this.gs.fx.ring(this.x, this.y, 100, 0x64B5F6, 260);
        }
      }
      this.img.setAlpha(now < this.stealthUntil ? 0.28 : 1);
    }
    if (this.def.summon) {
      this.nextSummon -= dt;
      if (this.nextSummon <= 0) {
        this.nextSummon = this.def.summon.every;
        for (let i = 0; i < this.def.summon.n; i++) {
          const e = this.gs.spawnEnemy(this.def.summon.type, this.entryIdx);
          if (e) { e.cell = this.cell; e.x = this.x; e.y = this.y; e.repath(); }
        }
        this.gs.fx.ring(this.x, this.y, 120, 0xE57373, 300);
      }
    }
    if (this.def.heelWindow) {
      this.nextHeel -= dt;
      if (this.nextHeel <= 0) {
        this.nextHeel = this.def.heelWindow.every;
        this.heelOpenUntil = now + this.def.heelWindow.dur;
        this.gs.fx.ring(this.x, this.y + this.bodyW * 0.5, 100, 0xFF4D4D, 380);
        this.gs.audio.bell();
      }
      const open = now < this.heelOpenUntil;
      this.img.setTint(open ? 0xFFFFFF : 0x9FA8B5);
      if (open && !this._heelMark) {
        this._heelMark = this.scene.add.image(0, this.bodyW * 0.4, 'px_ring')
          .setTint(0xFF4D4D).setScale(0.7).setBlendMode(Phaser.BlendModes.ADD);
        this.add(this._heelMark);
        this.scene.tweens.add({ targets: this._heelMark, scale: 1.1, alpha: 0.4,
          duration: 400, yoyo: true, repeat: -1 });
      }
      if (!open && this._heelMark) { this._heelMark.destroy(); this._heelMark = null; }
    }

    if (!this.structure) this.walk(dt);
  }

  walk(dt) {
    if (!this.target) { this.repath(); if (!this.target) return; }

    const tx = this.target.x + this.offX, ty = this.target.y + this.offY;
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt / 1000;

    if (this.img && Math.abs(dx) > 2) this.img.setFlipX(dx < 0);

    if (d <= step) {
      // 抵達這一格
      this.x = tx; this.y = ty;
      this.cell = this.target;
      this.pathIdx++;
      if (this.gs.grid.isExit(this.cell)) { this.reachWall(); return; }
      if (this.pathIdx >= this.path.length) { this.repath(); return; }
      this.target = this.path[this.pathIdx];
      // 走到新格時若前方被封，立刻重算
      if (this.target.unit) this.repath();
    } else {
      this.x += dx / d * step;
      this.y += dy / d * step;
    }
    this.setDepth(TD.DEPTH.ENEMY + (this.isBoss ? 3 : 0) + this.y / 1000);
  }

  takeDamage(amount, opt = {}) {
    if (this.hp <= 0) return 0;
    if (!this.damageable && !opt.trueDmg) {
      if (!opt.silent) this.gs.fx.dmgText(this.x, this.y - 50, 0, {});
      return 0;
    }
    let dmg = amount;
    if (this.armor && !opt.ignoreArmor && !opt.trueDmg) dmg *= (1 - this.armor);
    if (opt.bossMul && this.isBoss) dmg *= opt.bossMul;
    this.hp -= dmg;

    const r = Math.max(0, this.hp / this.maxHp);
    this.hpBar.scaleX = r;
    this.hpBar.fillColor = r > 0.5 ? 0x4CD97B : (r > 0.22 ? 0xFFC72C : 0xFF4D4D);

    if (!opt.silent) {
      this.img.setTintFill(0xFFFFFF);
      this.scene.time.delayedCall(55, () => {
        if (!this.active) return;
        if (this.def.tint) this.img.setTint(this.def.tint); else this.img.clearTint();
        if (this.def.heelWindow) this.img.setTint(this.gs.now < this.heelOpenUntil ? 0xFFFFFF : 0x9FA8B5);
      });
    }
    if (this.hp <= 0) this.die();
    return dmg;
  }

  applyBurn(dps, dur = 2200) {
    this.burnDps = Math.max(this.burnDps, dps);
    this.burnUntil = Math.max(this.burnUntil, this.gs.now + dur);
    if (!this.burnFx) this.burnFx = this.gs.fx.burnAura(this);
  }

  applySlow(amt, dur) {
    if (this.def.immuneSlow) return;
    this.slowAmt = Math.max(this.slowAmt, amt);
    this.slowUntil = Math.max(this.slowUntil, this.gs.now + dur);
  }

  /** 擊退：沿路徑往回退幾格 */
  knockback(px) {
    const steps = Math.max(1, Math.round(px / this.gs.grid.cellW));
    const back = Math.max(0, this.pathIdx - steps);
    if (!this.path || !this.path.length) return;
    this.pathIdx = back;
    this.target = this.path[back];
    this.cell = this.target;
    this.scene.tweens.add({ targets: this, x: this.target.x, y: this.target.y, duration: 220 });
  }

  die() {
    if (this._dead) return;
    this._dead = true;
    if (this.walkTween) this.walkTween.stop();
    this.gs.onEnemyKilled(this);
    if (this.burnFx) this.burnFx.destroy();
    this.gs.fx.kill(this.x, this.y - 20, this.isBoss || this.def.big);
    this.gs.audio[(this.isBoss || this.def.big) ? 'killBig' : 'kill']();
    this.destroy();
  }

  reachWall() {
    if (this._dead) return;
    this._dead = true;
    if (this.walkTween) this.walkTween.stop();
    this.gs.onEnemyReachWall(this);
    if (this.burnFx) this.burnFx.destroy();
    this.destroy();
  }
};
