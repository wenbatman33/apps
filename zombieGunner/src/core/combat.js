/* ============================================================
 * 戰鬥：開火、子彈、命中、爆炸、傷害結算
 * 由 GameScene 呼叫，sc = GameScene 實例
 * ============================================================ */
(function (H) {
  'use strict';

  var C = {};

  /** 槍口世界座標（子彈與槍焰都由此發射，才不會與槍管脫節） */
  C.muzzle = function (sc, angle) {
    var P = H.PLAYER, mx, my;
    if (sc.hasPlayerAnim) { mx = P.muzzleX * P.spriteSize; my = P.muzzleY * P.spriteSize; }
    else { mx = 50; my = 0; }
    var c = Math.cos(angle), s = Math.sin(angle);
    return { x: sc.player.x + mx * c - my * s, y: sc.player.y + mx * s + my * c };
  };

  // ---------------------------------------------------------
  // 玩家開火（含多重／後方／側翼／斜向）
  // ---------------------------------------------------------
  C.fire = function (sc, angle) {
    var s = sc.stats;
    var angles = [];

    // 主方向：多重射擊呈扇形
    var n = s.shots;
    var spread = Phaser.Math.DegToRad(9);
    for (var i = 0; i < n; i++) angles.push(angle + (i - (n - 1) / 2) * spread);

    // 額外方向的子彈從身上射出（不從槍口，否則會憑空出現在角色外側）
    var extra = [];
    if (s.rear) extra.push(angle + Math.PI);
    if (s.side) { extra.push(angle + Math.PI / 2); extra.push(angle - Math.PI / 2); }
    if (s.diag) { extra.push(angle + Math.PI / 4); extra.push(angle - Math.PI / 4); }

    var crit = Math.random() < s.critRate;
    for (var k = 0; k < angles.length; k++) C.spawnBullet(sc, angles[k], crit, true);
    for (var m = 0; m < extra.length; m++) C.spawnBullet(sc, extra[m], crit, false);

    // 槍口火花
    var mp = C.muzzle(sc, angle);
    var fl = sc.add.image(mp.x, mp.y, 'glow').setDepth(sc.player.depth + 1)
      .setTint(0xffd23d).setScale(0.28).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: fl, scale: 0.05, alpha: 0, duration: 90, onComplete: function () { fl.destroy(); } });
    sc.cameras.main.shake(40, 0.0012);
    H.Sfx.shoot();
  };

  C.spawnBullet = function (sc, angle, crit, fromMuzzle) {
    var s = sc.stats;
    var mp = fromMuzzle ? C.muzzle(sc, angle)
      : { x: sc.player.x + Math.cos(angle) * 26, y: sc.player.y + Math.sin(angle) * 26 };
    var b = sc.bullets.get(mp.x, mp.y, 'bullet');
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.setDepth(600).setRotation(angle).setScale(crit ? 1.25 : 1);
    b.setTint(crit ? 0xff6b3d : 0xffffff);
    b.body.reset(b.x, b.y);
    b.body.setCircle(7, 8, 1);
    sc.physics.velocityFromRotation(angle, s.bulletSpeed, b.body.velocity);
    b.dmg = s.damage * (crit ? s.critMul : 1);
    b.crit = crit;
    b.pierce = s.pierce;
    b.bounce = s.bounce;
    b.fire = s.fire; b.ice = s.ice; b.blast = s.blast; b.homing = s.homing;
    b.hitIds = [];
    b.life = (s.range / s.bulletSpeed) * 1000 + 120;
  };

  // ---------------------------------------------------------
  // 子彈每幀更新（壽命、追蹤、出界）
  // ---------------------------------------------------------
  C.updateBullets = function (sc, dt) {
    var A = H.LAYOUT.arena;
    sc.bullets.children.each(function (b) {
      if (!b.active) return;
      b.life -= dt;
      if (b.life <= 0 || b.x < A.x - 60 || b.x > A.x + A.w + 60 || b.y < A.y - 60 || b.y > A.y + A.h + 60) {
        C.killBullet(sc, b); return;
      }
      if (b.homing > 0) {
        var t = C.nearestEnemy(sc, b.x, b.y, 420, b.hitIds);
        if (t) {
          var want = Phaser.Math.Angle.Between(b.x, b.y, t.x, t.y);
          var cur = Math.atan2(b.body.velocity.y, b.body.velocity.x);
          var na = Phaser.Math.Angle.RotateTo(cur, want, 0.0075 * dt * b.homing);
          var sp = sc.stats.bulletSpeed;
          sc.physics.velocityFromRotation(na, sp, b.body.velocity);
          b.setRotation(na);
        }
      }
    });

    sc.eprojs.children.each(function (p) {
      if (!p.active) return;
      p.life -= dt;
      if (p.life <= 0 || p.x < A.x - 80 || p.x > A.x + A.w + 80 || p.y < A.y - 80 || p.y > A.y + A.h + 80) {
        p.setActive(false).setVisible(false);
      }
    });
  };

  C.killBullet = function (sc, b) {
    b.setActive(false).setVisible(false);
    if (b.body) b.body.stop();
  };

  C.nearestEnemy = function (sc, x, y, range, exclude) {
    var best = null, bd = range * range;
    sc.enemies.children.each(function (e) {
      if (!e.active || e.dying) return;
      if (exclude && exclude.indexOf(e.uid) >= 0) return;
      var d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
      if (d < bd) { bd = d; best = e; }
    });
    return best;
  };

  // ---------------------------------------------------------
  // 子彈命中敵人
  // ---------------------------------------------------------
  C.bulletHit = function (sc, b, e) {
    if (!b.active || !e.active || e.dying) return;
    if (b.hitIds.indexOf(e.uid) >= 0) return;
    b.hitIds.push(e.uid);

    C.damageEnemy(sc, e, b.dmg, { crit: b.crit, knock: 130, from: b });

    if (b.fire > 0) { e.burn = { dps: sc.stats.damage * 0.28 * b.fire, until: sc.time.now + 3000 }; }
    if (b.ice > 0) { e.slowUntil = sc.time.now + 1200 + 400 * b.ice; e.slowAmt = Math.min(0.6, 0.35 + 0.08 * (b.ice - 1)); }
    if (b.blast > 0) C.explode(sc, b.x, b.y, 60 + 22 * b.blast, b.dmg * 0.55, 0xff8a3d);

    if (b.pierce > 0) { b.pierce--; return; }

    if (b.bounce > 0) {
      var t = C.nearestEnemy(sc, b.x, b.y, 300, b.hitIds);
      if (t) {
        b.bounce--;
        var a = Phaser.Math.Angle.Between(b.x, b.y, t.x, t.y);
        sc.physics.velocityFromRotation(a, sc.stats.bulletSpeed, b.body.velocity);
        b.setRotation(a);
        b.life = 900;
        return;
      }
    }
    C.killBullet(sc, b);
  };

  // ---------------------------------------------------------
  // 對敵人造成傷害
  // ---------------------------------------------------------
  C.damageEnemy = function (sc, e, dmg, opt) {
    opt = opt || {};
    if (!e.active || e.dying) return;
    var real = Math.max(1, dmg - (e.def.armor || 0));
    e.hp -= real;

    // 受擊閃白
    e.setTintFill(0xffffff);
    sc.time.delayedCall(70, function () { if (e.active) e.clearTint(); });

    // 擊退
    if (opt.knock && e.body) {
      var kr = 1 - (e.def.knockResist || 0);
      if (kr > 0) {
        var a = opt.from ? Math.atan2(opt.from.body.velocity.y, opt.from.body.velocity.x)
          : Phaser.Math.Angle.Between(sc.player.x, sc.player.y, e.x, e.y);
        e.knockX = Math.cos(a) * opt.knock * kr;
        e.knockY = Math.sin(a) * opt.knock * kr;
      }
    }

    if (opt.crit) C.popText(sc, e.x, e.y - e.def.r - 6, Math.round(real), 0xffd23d, 26);
    H.Sfx.hit();

    // 吸血
    if (sc.stats.lifesteal > 0) sc.healPlayer(real * sc.stats.lifesteal);

    if (e.hp <= 0) C.killEnemy(sc, e);
    else if (e.hpBar) e.hpBar.width = Math.max(0, (e.hp / e.maxHp) * e.hpBarW);
  };

  C.killEnemy = function (sc, e) {
    e.dying = true;
    H.Sfx.kill();

    // 血漬 + 碎屑
    var splat = sc.add.image(e.x, e.y, 'glow').setDepth(20).setTint(0x8c1f1f)
      .setScale(e.def.r / 80).setAlpha(0.55);
    sc.tweens.add({ targets: splat, alpha: 0.18, duration: 400 });
    sc.groundFx.push(splat);
    if (sc.groundFx.length > 40) { var old = sc.groundFx.shift(); old.destroy(); }

    C.burst(sc, e.x, e.y, e.def.body, Math.min(14, 5 + Math.floor(e.def.r / 5)));

    // 自爆屍死亡也炸
    if (e.def.kind === 'suicide') C.explode(sc, e.x, e.y, e.def.blastR, e.dmg * 0.7, 0xb07dff);

    // 掉落
    sc.dropLoot(e);

    if (e.hpBarBg) { e.hpBarBg.destroy(); e.hpBar.destroy(); }
    if (e.shadow) e.shadow.destroy();

    var body = e;
    sc.tweens.add({
      targets: body, scale: e.baseScale * 0.4, alpha: 0, angle: e.angle + 60, duration: 220,
      onComplete: function () { body.destroy(); }
    });

    sc.onEnemyKilled(e);
  };

  // ---------------------------------------------------------
  // 範圍爆炸（可傷敵，opt.hurtPlayer 時也傷玩家）
  // ---------------------------------------------------------
  C.explode = function (sc, x, y, r, dmg, color, hurtPlayer) {
    var ring = sc.add.image(x, y, 'glow').setDepth(700).setTint(color || 0xff8a3d)
      .setScale(r / 160).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: ring, scale: r / 55, alpha: 0, duration: 300, onComplete: function () { ring.destroy(); } });
    C.burst(sc, x, y, color || 0xff8a3d, 10);
    sc.cameras.main.shake(140, 0.006);
    H.Sfx.explode();

    sc.enemies.children.each(function (e) {
      if (!e.active || e.dying) return;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) < r + e.def.r) {
        C.damageEnemy(sc, e, dmg, { knock: 180 });
      }
    });
    if (hurtPlayer && Phaser.Math.Distance.Between(x, y, sc.player.x, sc.player.y) < r + H.PLAYER.radius) {
      sc.hurtPlayer(dmg);
    }
  };

  // ---------------------------------------------------------
  // 粒子 / 飄字
  // ---------------------------------------------------------
  C.burst = function (sc, x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 190;
      var p = sc.add.image(x, y, 'px').setDepth(650).setTint(color)
        .setScale(0.5 + Math.random() * 1.1);
      sc.tweens.add({
        targets: p, x: x + Math.cos(a) * sp * 0.5, y: y + Math.sin(a) * sp * 0.5,
        alpha: 0, scale: 0.1, duration: 260 + Math.random() * 220,
        onComplete: function () { this.targets[0].destroy(); }
      });
    }
  };

  C.popText = function (sc, x, y, txt, color, size) {
    var t = sc.add.text(x, y, String(txt), {
      fontFamily: 'Impact, "Arial Black", sans-serif', fontSize: (size || 22) + 'px',
      color: '#' + (color || 0xffffff).toString(16).padStart(6, '0'),
      stroke: '#12141a', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(900);
    sc.tweens.add({
      targets: t, y: y - 46, alpha: 0, scale: 1.25, duration: 620, ease: 'Quad.out',
      onComplete: function () { t.destroy(); }
    });
  };

  H.Combat = C;
})(window.HABBY);
