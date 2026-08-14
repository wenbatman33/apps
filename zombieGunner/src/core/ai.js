/* ============================================================
 * 喪屍 AI 行為
 * ============================================================ */
(function (H) {
  'use strict';

  var A = {};
  var C;   // 延遲取得 H.Combat

  A.update = function (sc, e, dt, now) {
    C = H.Combat;
    if (!e.active || e.dying) return;
    var d = e.def;
    var px = sc.player.x, py = sc.player.y;
    var dist = Phaser.Math.Distance.Between(e.x, e.y, px, py);
    var ang = Phaser.Math.Angle.Between(e.x, e.y, px, py);

    // --- 狀態效果 ---
    var spd = e.speed;
    if (e.slowUntil && now < e.slowUntil) { spd *= (1 - (e.slowAmt || 0.35)); e.setTint(0x9dd8ff); }
    else if (e.slowUntil) { e.slowUntil = 0; if (e.active) e.clearTint(); }

    if (e.burn && now < e.burn.until) {
      if (!e.burnTick || now - e.burnTick > 500) {
        e.burnTick = now;
        C.damageEnemy(sc, e, e.burn.dps * 0.5, {});
        var f = sc.add.image(e.x + Phaser.Math.Between(-8, 8), e.y - 6, 'px')
          .setTint(0xff6b1f).setDepth(640).setScale(1.2);
        sc.tweens.add({ targets: f, y: f.y - 26, alpha: 0, duration: 380, onComplete: function () { f.destroy(); } });
      }
    } else if (e.burn) e.burn = null;

    // 面向玩家（貼圖朝右）
    e.setRotation(Phaser.Math.Angle.RotateTo(e.rotation, ang, 0.012 * dt));

    // 擊退位移
    if (e.knockX || e.knockY) {
      e.x += e.knockX * dt / 1000; e.y += e.knockY * dt / 1000;
      e.knockX *= 0.86; e.knockY *= 0.86;
      if (Math.abs(e.knockX) < 4) e.knockX = 0;
      if (Math.abs(e.knockY) < 4) e.knockY = 0;
    }

    var vx = 0, vy = 0;

    switch (d.kind) {
      case 'ranged':
        vx = Math.cos(ang) * spd; vy = Math.sin(ang) * spd;
        if (dist < (d.keepDist || 300)) { vx = -vx * 0.8; vy = -vy * 0.8; }
        else if (dist < (d.shootRange || 400)) { vx *= 0.15; vy *= 0.15; }
        A.tryShoot(sc, e, d, now, ang);
        break;

      case 'summon':
        vx = Math.cos(ang) * spd; vy = Math.sin(ang) * spd;
        if (dist < (d.keepDist || 340)) { vx = -vx * 0.9; vy = -vy * 0.9; }
        A.trySummon(sc, e, d, now);
        if (d.shootRange) A.tryShoot(sc, e, d, now, ang);
        break;

      case 'suicide':
        if (e.fuseAt) {
          vx = vy = 0;
          e.setScale(e.baseScale * (1 + Math.sin(now * 0.05) * 0.14));
          e.setTintFill(now % 160 < 80 ? 0xffffff : 0xff4d4d);
          if (now >= e.fuseAt) {
            e.dying = true;
            C.explode(sc, e.x, e.y, d.blastR, e.dmg, 0xb07dff, true);
            if (e.shadow) e.shadow.destroy();
            sc.onEnemyKilled(e);
            e.destroy();
            return;
          }
        } else {
          vx = Math.cos(ang) * spd * 1.05; vy = Math.sin(ang) * spd * 1.05;
          if (dist < d.r + H.PLAYER.radius + 34) e.fuseAt = now + d.fuse;
        }
        break;

      case 'boss':
        A.bossUpdate(sc, e, d, dt, now, dist, ang);
        return;

      default: // melee
        if (d.charge) {
          if (dist < 300 && !e.chargeUntil && (!e.chargeCd || now > e.chargeCd)) {
            e.chargeUntil = now + 700; e.chargeCd = now + 2400;
            e.chargeAng = ang;
          }
          if (e.chargeUntil && now < e.chargeUntil) {
            vx = Math.cos(e.chargeAng) * spd * 2.1;
            vy = Math.sin(e.chargeAng) * spd * 2.1;
          } else {
            if (e.chargeUntil && now >= e.chargeUntil) e.chargeUntil = 0;
            vx = Math.cos(ang) * spd; vy = Math.sin(ang) * spd;
          }
        } else {
          vx = Math.cos(ang) * spd; vy = Math.sin(ang) * spd;
        }
        // 沒有 sprite 動畫時，用縮放擺動假裝走路
        if (!e.animKey) e.setScale(e.baseScale * (1 + Math.sin(now * 0.012 + e.uid) * 0.05));
        break;
    }

    e.body.setVelocity(vx, vy);
  };

  A.tryShoot = function (sc, e, d, now, ang) {
    if (!d.shootRange) return;
    var dist = Phaser.Math.Distance.Between(e.x, e.y, sc.player.x, sc.player.y);
    if (dist > d.shootRange) return;
    if (e.shootAt && now < e.shootAt) return;
    e.shootAt = now + d.shootCd * (0.85 + Math.random() * 0.3);

    var n = d.spread || 1;
    for (var i = 0; i < n; i++) {
      var a = ang + (i - (n - 1) / 2) * Phaser.Math.DegToRad(11);
      A.spawnEProj(sc, e, d, a);
    }
    // 吐出前搖
    e.setScale(e.baseScale * 1.18);
    sc.tweens.add({ targets: e, scale: e.baseScale, duration: 180 });
  };

  A.spawnEProj = function (sc, e, d, a) {
    var p = sc.eprojs.get(e.x + Math.cos(a) * d.r, e.y + Math.sin(a) * d.r, 'eproj');
    if (!p) return;
    p.setActive(true).setVisible(true).setDepth(620)
      .setTint(d.projColor || 0x9dff5c).setScale((d.projR || 11) / 13);
    p.body.reset(p.x, p.y);
    p.body.setCircle(13, 3, 3);
    sc.physics.velocityFromRotation(a, d.projSpeed || 300, p.body.velocity);
    p.dmg = e.dmg * 0.85;
    p.life = 4200;
    p.hitR = (d.projR || 11);
  };

  A.trySummon = function (sc, e, d, now) {
    if (!d.summon) return;
    if (e.summonAt && now < e.summonAt) return;
    if (sc.enemies.countActive(true) > 40) { e.summonAt = now + 1500; return; }
    e.summonAt = now + d.summonCd;
    for (var i = 0; i < (d.summonN || 2); i++) {
      var a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 40;
      sc.spawnEnemy(d.summon, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, true);
    }
    var ring = sc.add.image(e.x, e.y, 'glow').setDepth(300).setTint(0xb07dff).setScale(0.9)
      .setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 420, onComplete: function () { ring.destroy(); } });
  };

  // ---------------------------------------------------------
  // BOSS：衝撞 / 震地 / 召喚 / 遠程 綜合
  // ---------------------------------------------------------
  A.bossUpdate = function (sc, e, d, dt, now, dist, ang) {
    var spd = e.speed;
    if (e.slowUntil && now < e.slowUntil) spd *= 0.7;

    // 衝撞
    if (d.dashCd) {
      if (!e.dashCdAt) e.dashCdAt = now + d.dashCd;
      if (!e.dashUntil && now > e.dashCdAt && dist < 620) {
        e.telegraphUntil = now + 520;
        e.dashCdAt = now + d.dashCd + 900;
        e.dashAng = ang;
        e.setTintFill(0xff4d4d);
        sc.time.delayedCall(520, function () {
          if (!e.active) return;
          e.clearTint(); e.dashUntil = sc.time.now + 620;
        });
      }
    }
    if (e.dashUntil && now < e.dashUntil) {
      e.body.setVelocity(Math.cos(e.dashAng) * d.dashSpeed, Math.sin(e.dashAng) * d.dashSpeed);
      e.setRotation(e.dashAng);
      return;
    } else if (e.dashUntil) e.dashUntil = 0;
    if (e.telegraphUntil && now < e.telegraphUntil) { e.body.setVelocity(0, 0); return; }

    // 震地
    if (d.slamCd) {
      if (!e.slamAt) e.slamAt = now + d.slamCd;
      if (now > e.slamAt && dist < d.slamR * 1.3) {
        e.slamAt = now + d.slamCd;
        var warn = sc.add.circle(e.x, e.y, d.slamR, 0xff4d4d, 0.16).setDepth(15)
          .setStrokeStyle(4, 0xff4d4d, 0.7);
        sc.tweens.add({ targets: warn, alpha: 0.45, duration: 260, yoyo: true, repeat: 1 });
        var ex = e.x, ey = e.y;
        sc.time.delayedCall(700, function () {
          warn.destroy();
          if (!e.active) return;
          H.Combat.explode(sc, ex, ey, d.slamR, e.dmg, 0xff8a3d, true);
        });
      }
    }

    if (d.summon) A.trySummon(sc, e, d, now);
    if (d.shootRange) A.tryShoot(sc, e, d, now, ang);

    e.setRotation(Phaser.Math.Angle.RotateTo(e.rotation, ang, 0.008 * dt));
    var keep = d.shootRange ? 260 : 0;
    var mv = dist > keep ? 1 : -0.5;
    e.body.setVelocity(Math.cos(ang) * spd * mv, Math.sin(ang) * spd * mv);
  };

  H.AI = A;
})(window.HABBY);
