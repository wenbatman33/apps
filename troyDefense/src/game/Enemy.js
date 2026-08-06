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
    if (D.flying) {
      const g = G.cellXY(G.exit.c, G.exit.r);
      this.flyTo = { x: g.x, y: g.y };
    } else {
      this.repath();
    }

    // 狀態
    this.slowUntil = 0; this.slowAmt = 0;
    this.burnUntil = 0; this.burnDps = 0; this.burnFx = null;
    this.stealthUntil = 0;
    this.dashUntil = 0; this.nextDash = D.dash ? D.dash.every : 0;
    this.nextSummon = D.summon ? D.summon.every : 0;
    this.heelOpenUntil = 0; this.nextHeel = D.heelWindow ? D.heelWindow.every : 0;
    this.nextStealth = D.stealth ? D.stealth.every : 0;
    this.nextHeal = D.heal ? D.heal.every : 0;

    this.build(scene.enemyScale || 1);
    scene.add.existing(this);
    this.setDepth(TD.DEPTH.ENEMY + (this.isBoss ? 3 : 0));
  }

  build(scaleUp) {
    const D = this.def;
    const cell = this.gs.grid.cellW;
    const base = cell * D.scale * scaleUp;

    this.shadow = this.scene.add.ellipse(0, base * 0.34, base * 0.50, base * 0.16, 0x000000, 0.28);

    // 有行走動畫就用 sprite，否則退回單張圖
    const animKey = D.tex + '_walk';
    this.hasWalkAnim = this.scene.anims.exists(animKey);
    if (this.hasWalkAnim) {
      this.img = this.scene.add.sprite(0, 0, D.tex);
      const fw = TD.SHEET_W / TD.WALK_FRAMES, fh = TD.SHEET_H;
      // 每幀是 384×1024 的直立畫布，角色只佔中間一部分
      // → 以「顯示高度」為準、寬度依原比例，才不會把角色壓胖
      // 幀是 384×1024 的直立畫布、角色約佔其中 65% 高度
      // → 顯示高度要放大補償，角色的視覺高度才會接近一個格子
      const dh = base * 2.6;
      this.img.setDisplaySize(dh * (fw / fh), dh).setOrigin(0.5, 0.80);
      this.img.play({ key: animKey, startFrame: Phaser.Math.Between(0, TD.WALK_FRAMES - 1) });
      this.img.anims.msPerFrame = 1000 / (6 + (D.spd || 50) / 22);   // 步頻隨速度
    } else {
      this.img = this.scene.add.image(0, 0, D.tex);
      this.img.setDisplaySize(base, base).setOrigin(0.5, 0.66);
    }
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

    // 行走動畫用的基準值（程序化動畫，不用 tween）
    this.baseSX = this.img.scaleX;
    this.baseSY = this.img.scaleY;
    this.shadowSX = this.shadow.scaleX;
    this.bodyH = base;
    this.walkPhase = Math.random() * Math.PI * 2;   // 錯開步伐，整群不會同步
    this.stepSide = 1;
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
    // 附近有戰鼓手就加速
    if (!this.def.haste) {
      for (const o of this.gs.enemies) {
        if (!o.def.haste || o === this || o.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(this.x, this.y, o.x, o.y) < o.def.haste.range) {
          s *= o.def.haste.mul; break;
        }
      }
    }
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
    // 隨軍祭司：治療周圍同伴
    if (this.def.heal) {
      this.nextHeal -= dt;
      if (this.nextHeal <= 0) {
        this.nextHeal = this.def.heal.every;
        let healed = 0;
        this.gs.enemies.forEach(o => {
          if (o === this || o.hp <= 0 || o.hp >= o.maxHp) return;
          if (Phaser.Math.Distance.Between(this.x, this.y, o.x, o.y) > this.def.heal.range) return;
          o.hp = Math.min(o.maxHp, o.hp + this.def.heal.amount);
          o.hpBar.scaleX = o.hp / o.maxHp;
          o.hpBar.fillColor = 0x4CD97B;
          this.gs.fx.ring(o.x, o.y - 20, 60, 0x4CD97B, 260);
          healed++;
        });
        if (healed) this.gs.fx.ring(this.x, this.y, this.def.heal.range, 0x4CD97B, 420);
      }
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
        this.gs.fx.ring(this.x, this.y + this.bodyW * 0.5, 120, 0xFF4D4D, 380);
        this.gs.audio.bell();
        this.gs.fx.flash(0xFF4D4D, 120, 0.16);
        this.gs.floatLabel(this.x, this.y - this.bodyW, '腳踝！點他', '#FF6B6B', 34, 1200);
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

    if (this.structure) return;
    if (this.def.flying) this.fly(dt); else this.walk(dt);
  }

  /** 飛行單位：無視網格與塔，直線飛向城門 */
  fly(dt) {
    const dx = this.flyTo.x - this.x, dy = this.flyTo.y - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt / 1000;
    if (this.img && Math.abs(dx) > 2) this.img.setFlipX(dx < 0);
    if (d <= step) { this.reachWall(); return; }
    this.x += dx / d * step;
    this.y += dy / d * step;
    // 拍翅：上下起伏 + 翅膀節奏的縱向縮放
    const t = this.gs.now / 150 + this.offX;
    this.img.y = Math.sin(t) * this.bodyH * 0.10 - this.bodyH * 0.10;
    this.img.scaleY = this.baseSY * (1 + Math.sin(t + 0.6) * 0.06);
    this.img.scaleX = this.baseSX * (1 - Math.sin(t + 0.6) * 0.04);
    this.img.rotation = Math.sin(t * 0.5) * 0.05;
    this.shadow.setAlpha(0.14).setScale(this.shadowSX * 0.72);
    this.setDepth(TD.DEPTH.PROJ + 2);
  }

  /** 程序化行走動畫：彈跳 + 擠壓拉伸 + 傾斜 + 陰影同步 + 踏步塵土 */
  animateWalk(dt, moving) {
    if (!this.img || !this.baseSY) return;
    const D = this.def;

    if (!moving) {
      if (this.hasWalkAnim && this.img.anims.isPlaying) this.img.anims.pause();
      this.img.y += (0 - this.img.y) * 0.2;
      this.img.rotation += (0 - this.img.rotation) * 0.2;
      return;
    }
    if (this.hasWalkAnim && this.img.anims.isPaused) this.img.anims.resume();

    // 有 sprite 分鏡時，程序化幅度收斂，避免和分鏡打架
    const sheet = this.hasWalkAnim;
    const heavy = (D.scale || 1) > 1.15;
    const rate = (this.speed / 60) * (heavy ? 5.0 : 8.0);
    const prev = this.walkPhase;
    this.walkPhase += dt / 1000 * rate;

    const amp = this.bodyH * (sheet ? 0.014 : (heavy ? 0.030 : 0.055));
    const lift = Math.abs(Math.sin(this.walkPhase));       // 0 著地 → 1 最高
    this.img.y = -lift * amp;

    // 著地瞬間壓扁、騰空時拉長
    const sq = (1 - lift) * (sheet ? 0.018 : (heavy ? 0.05 : 0.08));
    this.img.scaleY = this.baseSY * (1 - sq);
    this.img.scaleX = this.baseSX * (1 + sq * 0.6) * (this.img.flipX ? 1 : 1);

    // 左右輕微搖擺
    this.img.rotation = Math.sin(this.walkPhase * 0.5) * (sheet ? 0.012 : (heavy ? 0.030 : 0.055));

    // 陰影：騰空時變小變淡
    this.shadow.scaleX = this.shadowSX * (1 - lift * 0.28);
    this.shadow.scaleY = this.shadowSX * (1 - lift * 0.28);
    this.shadow.alpha = 0.30 - lift * 0.14;

    // 每一步著地時揚起塵土
    if (Math.floor(prev / Math.PI) !== Math.floor(this.walkPhase / Math.PI)) {
      this.stepSide *= -1;
      this.footDust();
    }
  }

  footDust() {
    if (!this.gs.fxDustOn) return;
    const p = this.scene.add.image(
      this.x + this.stepSide * this.bodyH * 0.10,
      this.y + this.bodyH * 0.06, 'px_smoke');
    p.setDepth(TD.DEPTH.ENEMY - 1).setScale(this.bodyH / 340).setAlpha(0.34).setTint(0xD9C08A);
    this.scene.tweens.add({
      targets: p, alpha: 0, scale: p.scale * 2.1,
      x: p.x - this.stepSide * 8, y: p.y - 6,
      duration: 420, ease: 'Cubic.easeOut', onComplete: () => p.destroy(),
    });
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
    this.animateWalk(dt, step > 0.01);
    this.setDepth(TD.DEPTH.ENEMY + (this.isBoss ? 3 : 0) + this.y / 1000);
  }

  /** 弱點窗口內被玩家點擊：射腳踝 */
  tapHeel() {
    if (!this.alive || !this.def.heelTapPct) return false;
    if (this.gs.now >= this.heelOpenUntil) return false;
    if (this.gs.now < (this._tapCd || 0)) return false;
    this._tapCd = this.gs.now + 700;
    const dmg = this.maxHp * this.def.heelTapPct;
    this.takeDamage(dmg, { trueDmg: true, ignoreArmor: true, silent: true, skipHeelMul: true });
    this.gs.fx.dmgText(this.x, this.y - 70, dmg, { crit: true });
    this.gs.fx.hit(this.x, this.y + this.bodyW * 0.4, 0xFF4D4D, 16);
    this.gs.fx.ring(this.x, this.y + this.bodyW * 0.4, 150, 0xFFE066, 300);
    this.gs.audio.crit();
    this.gs.fx.shake(0.008, 140);
    return true;
  }

  takeDamage(amount, opt = {}) {
    if (this.hp <= 0 || this._dead || !this.scene) return 0;
    if (!this.damageable && !opt.trueDmg) {
      if (!opt.silent) this.gs.fx.dmgText(this.x, this.y - 50, 0, {});
      return 0;
    }
    let dmg = amount;
    if (this.armor && !opt.ignoreArmor && !opt.trueDmg) dmg *= (1 - this.armor);
    // 弱點窗口：塔的傷害放大（點擊處決本身已是百分比傷害，不重複加成）
    if (this.def.heelMul && !opt.skipHeelMul && this.gs.now < this.heelOpenUntil) {
      dmg *= this.def.heelMul;
    }
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
    if (!this.alive) return;
    this.burnDps = Math.max(this.burnDps, dps);
    this.burnUntil = Math.max(this.burnUntil, this.gs.now + dur);
    if (!this.burnFx) this.burnFx = this.gs.fx.burnAura(this);
  }

  applySlow(amt, dur) {
    if (!this.alive || this.def.immuneSlow) return;
    this.slowAmt = Math.max(this.slowAmt, amt);
    this.slowUntil = Math.max(this.slowUntil, this.gs.now + dur);
  }

  /** 還活著且還在場上（死亡銷毀後 this.scene 會變 undefined） */
  get alive() { return this.active && !this._dead && !!this.scene && this.hp > 0; }

  /** 擊退：沿路徑往回退幾格 */
  knockback(px) {
    if (!this.alive || this.def.flying) return;
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
    // 分裂：死亡時生出小兵，繼承目前進度
    if (this.def.split) {
      for (let i = 0; i < this.def.split.n; i++) {
        const e = this.gs.spawnEnemy(this.def.split.type, this.entryIdx);
        if (!e) continue;
        e.cell = this.cell;
        e.x = this.x + Phaser.Math.Between(-26, 26);
        e.y = this.y + Phaser.Math.Between(-20, 20);
        e.repath();
      }
      this.gs.fx.ring(this.x, this.y, 120, 0x9CCC65, 320);
    }
    this.gs.onEnemyKilled(this);
    if (this.burnFx) this.burnFx.destroy();
    this.gs.fx.kill(this.x, this.y - 20, this.isBoss || this.def.big);
    this.gs.audio[(this.isBoss || this.def.big) ? 'killBig' : 'kill']();
    this.destroy();
  }

  reachWall() {
    if (this._dead) return;
    this._dead = true;
    this.gs.onEnemyReachWall(this);
    if (this.burnFx) this.burnFx.destroy();
    this.destroy();
  }
};
