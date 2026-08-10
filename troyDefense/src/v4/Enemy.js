// v4 敵人：march（沿路南下）→ attackGate（砍門）→ death
class EnemyV4 {
  constructor(scene, type, lane, hpMult) {
    this.scene = scene;
    this.def = ENEMIES_V4[type];
    this.type = type;
    this.hp = this.maxHp = Math.round(this.def.hp * hpMult * (scene.levelDef.hpScale || 1));
    this.state = 'march';
    this.atkTimer = 0;
    this.burn = null;
    this.poison = null;      // 毒：疊層 DoT＋減速
    this.shockT = 0;         // 雷：麻痺定身
    this.dead = false;
    const L = LAYOUT_V4;
    this.lane = lane || 0;
    // 從三艘黑船跳下登陸
    const shipX = [211, 540, 869][Phaser.Math.Between(0, 2)];
    const x = shipX + Phaser.Math.Between(-52, 52);
    const sy = 96 + Phaser.Math.Between(-8, 8);
    this.sprite = scene.add.sprite(x, sy, this.def.tex, 0)
      .setDepth(500 + lane + (this.def.boss ? 40 : 0));
    this.sprite.setScale(0.42 * (this.def.scale || 1));
    if (this.def.boss) {
      this.sprite.setTint(0xffd9a0);          // BOSS 金袍色偏
      FxV4.shake(scene, 0.006, 400);
      FxV4.floatText(scene, x, sy - 110, '⚔ ' + this.def.name + ' 登場！', '#FFD23C', 52);
    }
    if (this.def.giant) {
      FxV4.shake(scene, 0.008, 500);
      FxV4.floatText(scene, x, sy - 140, '🗿 獨眼巨人來襲！', '#FF9A3C', 54);
    }
    this.sprite.play(this.def.tex + '_walk');
    this.wobbleSeed = Math.random() * Math.PI * 2;
    // 跳船登陸：淡入＋落地小跳
    this.state = 'landing';
    this.sprite.setAlpha(0.2);
    scene.tweens.add({
      targets: this.sprite, alpha: 1, y: sy + 58, duration: 300, ease: 'Quad.easeIn',
      onComplete: () => {
        if (!this.dead) {
          FxV4.spark(scene, this.sprite.x, this.sprite.y + 30, 0xd8c8a0, 4);
          this.state = 'march';
        }
      },
    });
    // 小血條
    this.hpBg = scene.add.rectangle(x, this.sprite.y - 70, 74, 9, 0x1a140e, 0.7).setDepth(940).setVisible(false);
    this.hpFg = scene.add.rectangle(x, this.sprite.y - 70, 70, 5, 0x6fe08a).setDepth(941).setVisible(false);
  }

  update(dt) {
    if (this.dead) return;
    const s = this.sprite, L = LAYOUT_V4;
    // 著火 DoT
    if (this.burn) {
      this.burn.left -= dt;
      const bd = this.burn.dps * dt / 1000;
      this.takeDamage(bd, false);
      if (this.dead) return;
      this.burn.acc = (this.burn.acc || 0) + bd;
      this.burn.numT = (this.burn.numT || 0) + dt;
      if (this.burn.numT >= 600) {           // 灼燒累積橘字
        FxV4.dmgNum(this.scene, s.x, s.y, this.burn.acc, { color: '#FF9A3C', size: 30 });
        this.burn.acc = 0; this.burn.numT = 0;
      }
      if (this.burn.left <= 0) { this.burn.fx.destroy(); this.burn = null; s.clearTint(); }
    }
    // ⚡ 麻痺：定身抖動
    if (this.shockT > 0) {
      this.shockT -= dt;
      s.x += Phaser.Math.Between(-2, 2) * 0.5;
      this.hpBg.setPosition(s.x, s.y - 70);
      this.hpFg.setPosition(s.x - (70 - 70 * this.hp / this.maxHp) / 2, s.y - 70);
      return;
    }
    // ☠ 中毒：DoT＋累積綠字（由 update 統一驅動）
    if (this.poison) {
      this.poison.left -= dt;
      const pd = this.poison.dps * this.poison.stacks * dt / 1000;
      this.takeDamage(pd, false);
      if (this.dead) return;
      this.poison.acc = (this.poison.acc || 0) + pd;
      this.poison.numT = (this.poison.numT || 0) + dt;
      if (this.poison.numT >= 650) {
        FxV4.dmgNum(this.scene, s.x, s.y, this.poison.acc, { color: '#7AE85A', size: 30 });
        this.poison.acc = 0; this.poison.numT = 0;
      }
      if (this.poison.left <= 0) {
        this.poison.fx.destroy(); this.poison = null;
        if (!this.burn) s.clearTint();
      }
    }
    if (this.state === 'march') {
      const spd = this.def.speed * (this.burn ? 1.3 : 1) * (this.poison ? 0.68 : 1) * window.DEV_V4.speedMult;
      s.y += spd * dt / 1000;
      // 漫野南下＋輕微蛇行（幅度與速度成正比；巨人/BOSS 直線壓境）
      if (!this.def.giant && !this.def.boss)
        s.x += Math.sin(s.y / 70 + this.wobbleSeed) * 0.6 * (this.def.speed / 62);
      if (s.y >= L.gateStopY - 130) {       // 接近牆前：先佔位再走過去
        this.claimT = (this.claimT || 0) - dt;
        if (this.claimT <= 0) {
          this.claimT = 400;
          this.spot = this.scene.claimAtkSpot(this);
          if (this.spot) this.state = 'approach';
        }
        if (!this.spot && s.y >= L.gateStopY) {   // 沒位子：牆前原地開砍
          this.state = 'attack';
          s.play(this.def.tex + '_attack');
        }
      }
    } else if (this.state === 'approach') {
      const spd = this.def.speed * window.DEV_V4.speedMult;
      const dx = this.spot.x - s.x, dy = this.spot.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        this.state = 'attack';
        s.play(this.def.tex + '_attack');
      } else {
        s.x += dx / d * spd * dt / 1000;
        s.y += dy / d * spd * dt / 1000;
      }
    } else if (this.state === 'attack') {
      this.atkTimer -= dt;
      if (this.atkTimer <= 0) {
        this.atkTimer = this.def.atkCd;
        this.scene.gate.damage(this.def.gateDmg, s.x);
        if (this.def.giant) this.scene.giantSmash(s.x);
        if (this.def.fire) {                  // 火把兵：門前留火
          const fl = FxV4.flame(this.scene, s.x + Phaser.Math.Between(-30, 30), s.y + 60, 0.8);
          this.scene.time.delayedCall(1800, () => fl.destroy());
        }
        if (this.def.boss) FxV4.shake(this.scene, 0.007, 250);
      }
    }
    // 血條跟隨
    this.hpBg.setPosition(s.x, s.y - 70);
    this.hpFg.setPosition(s.x - (70 - 70 * this.hp / this.maxHp) / 2, s.y - 70);
  }

  // ☠ 疊毒（最多 5 層，每層加傷）
  setPoison(dps, dur) {
    if (this.dead) return;
    if (this.poison) {
      this.poison.left = dur;
      this.poison.stacks = Math.min(5, this.poison.stacks + 1);
    } else {
      this.poison = { dps, left: dur, stacks: 1,
        fx: this.scene.add.particles(0, 0, 'fx_dot', {
          speedY: { min: -40, max: -16 }, scale: { start: 0.5, end: 0 },
          lifespan: 500, frequency: 90, tint: [0x7ae85a, 0x3aa834], blendMode: 'ADD',
        }).setDepth(848) };
      this.poison.fx.startFollow(this.sprite, 0, -26);
    }
    this.sprite.setTint(0x9ae87a);
  }

  // ⚡ 麻痺
  setShock(ms) {
    if (this.dead || this.def.boss) return;   // BOSS 免疫定身
    this.shockT = Math.max(this.shockT, ms);
    this.sprite.setTintFill(0xbfe4ff);
    this.scene.time.delayedCall(120, () => {
      if (!this.dead) this.poison ? this.sprite.setTint(0x9ae87a) : this.burn ? this.sprite.setTint(0xffaa66) : this.sprite.clearTint();
    });
  }

  setBurn(dps, dur) {
    if (this.dead) return;
    if (this.burn) { this.burn.left = dur; this.burn.dps = Math.max(this.burn.dps, dps); return; }
    this.burn = { dps, left: dur, fx: FxV4.flame(this.scene, 0, 0, 0.5) };
    this.burn.fx.startFollow(this.sprite, 0, -30);
    this.sprite.setTint(0xffaa66);
  }

  takeDamage(n, flash = true, opts = {}) {
    if (this.dead) return;
    this.hp -= n;
    if (flash) FxV4.dmgNum(this.scene, this.sprite.x, this.sprite.y, n, opts);
    this.hpBg.setVisible(true); this.hpFg.setVisible(true);
    this.hpFg.width = Math.max(0, 70 * this.hp / this.maxHp);
    this.hpFg.fillColor = this.hp / this.maxHp > 0.35 ? 0x6fe08a : 0xff5c5c;
    if (flash) {
      this.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(60, () => { if (!this.dead) this.burn ? this.sprite.setTint(0xffaa66) : this.sprite.clearTint(); });
    }
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    const sc = this.scene, s = this.sprite;
    sc.releaseAtkSpot(this);
    if (this.burn) { this.burn.fx.destroy(); this.burn = null; }
    if (this.poison) { this.poison.fx.destroy(); this.poison = null; }
    this.hpBg.destroy(); this.hpFg.destroy();
    s.clearTint();
    s.play(this.def.tex + '_death');
    if (this.def.giant) AudioV4.thud(); else AudioV4.kill();
    FxV4.spark(sc, s.x, s.y, 0xc96a55, 10);
    sc.addGoldKill(this.def.gold, s.x, s.y);
    sc.addScore(this.def.score);
    s.once('animationcomplete', () => {
      sc.tweens.add({ targets: s, alpha: 0, duration: 500, onComplete: () => s.destroy() });
    });
  }

  destroy() {
    this.scene.releaseAtkSpot(this);
    if (this.poison) this.poison.fx.destroy();
    if (this.burn) this.burn.fx.destroy();
    this.hpBg.destroy(); this.hpFg.destroy(); this.sprite.destroy();
    this.dead = true;
  }
}
