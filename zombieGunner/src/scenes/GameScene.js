/* ============================================================
 * 戰鬥場景：弓箭傳說式「移動不開火 / 停手自動鎖敵射擊」
 * ============================================================ */
(function (H) {
  'use strict';

  var GameScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function GameScene() { Phaser.Scene.call(this, { key: 'Game' }); },

    // -------------------------------------------------------
    init: function (data) {
      data = data || {};
      this.chapter = data.chapter || 1;
      this.levelNo = data.level || 1;
      this.carryStats = data.stats || null;      // 續戰帶入的技能狀態
      this.lv = H.buildLevel(this.chapter, this.levelNo);
      this.uidSeq = 0;
      this.groundFx = [];
      this.paused = false;
      this.finished = false;
    },

    // -------------------------------------------------------
    create: function () {
      var A = H.LAYOUT.arena, T = this.lv.theme;
      H.Art.build(this);

      // ---- 背景 / 場地 ----
      this.cameras.main.setBackgroundColor(T.fog);
      var gkey = H.Art.ground(this, T);
      this.floor = this.add.tileSprite(A.x + A.w / 2, A.y + A.h / 2, A.w, A.h, gkey).setDepth(0);
      this.arenaBorder = this.add.rectangle(A.x + A.w / 2, A.y + A.h / 2, A.w, A.h)
        .setStrokeStyle(6, T.accent, 0.55).setDepth(5);

      this.physics.world.setBounds(A.x, A.y, A.w, A.h);

      // ---- 群組 ----
      this.obstacles = this.physics.add.staticGroup();
      this.enemies = this.physics.add.group({ runChildUpdate: false });
      this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 220 });
      this.eprojs = this.physics.add.group({ defaultKey: 'eproj', maxSize: 160 });
      this.loots = this.physics.add.group();

      this.buildObstacles();

      // ---- 玩家 ----
      this.stats = this.carryStats || H.newRunStats(H.Save.get().perm);
      this.playerShadow = this.add.image(0, 0, 'shadow').setDepth(28).setScale(0.62).setAlpha(0.4);
      var pr = H.PLAYER.radius;
      this.hasPlayerAnim = this.anims.exists('p_walk');
      if (this.hasPlayerAnim) {
        // AI 生成的俯視角 sprite（256px 格）→ 縮到遊戲尺寸，碰撞半徑換算回原尺寸
        this.player = this.physics.add.sprite(A.x + A.w / 2, A.y + A.h * 0.72, 'player_walk', 'frame_000.png')
          .setDepth(500).setOrigin(0.5, 0.5);
        var pk = H.PLAYER.spriteSize / 256;
        this.player.setScale(pk);
        var rr = pr / pk;
        this.player.body.setCircle(rr, 128 - rr, 128 - rr);
      } else {
        this.player = this.physics.add.image(A.x + A.w / 2, A.y + A.h * 0.72, 'player').setDepth(500);
        var pc = this.player.width / 2;
        this.player.body.setCircle(pr, pc - pr, pc - pr);
      }
      this.player.setCollideWorldBounds(true);
      this.player.setRotation(-Math.PI / 2);
      this.invulnUntil = 0;
      this.fireCd = 0;
      this.stillTime = 0;

      // ---- 碰撞 ----
      this.physics.add.collider(this.player, this.obstacles);
      this.physics.add.collider(this.enemies, this.obstacles);
      this.physics.add.collider(this.enemies, this.enemies);
      var self = this;
      this.physics.add.collider(this.bullets, this.obstacles, function (b) { H.Combat.killBullet(self, b); });
      this.physics.add.overlap(this.bullets, this.enemies, function (b, e) { H.Combat.bulletHit(self, b, e); });
      this.physics.add.overlap(this.player, this.enemies, function (p, e) { self.touchDamage(e); });
      this.physics.add.overlap(this.player, this.eprojs, function (p, pr) {
        if (!pr.active) return;
        pr.setActive(false).setVisible(false);
        self.hurtPlayer(pr.dmg);
        H.Combat.burst(self, pr.x, pr.y, 0x9dff5c, 6);
      });
      this.physics.add.overlap(this.player, this.loots, function (p, l) { self.pickLoot(l); });

      // ---- HUD / 搖桿 ----
      this.buildHud();
      this.updateHpBar();
      this.joy = new H.Joystick(this);

      // ---- 技能附屬物 ----
      this.drones = [];
      this.syncDrones();
      this.auraAt = 0; this.mineAt = 0; this.regenAt = 0;

      // ---- 波次 ----
      this.waveIndex = 0;
      this.aliveCount = 0;
      this.killCount = 0;
      // BOSS 關的最後一波會被 BOSS 取代，計數要跟著調整
      this.totalEnemies = this.lv.waves.reduce(function (a, w) { return a + w.length; }, 0);
      if (this.lv.isBoss) {
        this.totalEnemies = this.totalEnemies - this.lv.waves[this.lv.waves.length - 1].length + 1;
      }
      this.time.delayedCall(500, function () { self.nextWave(); });

      this.showLevelBanner();

      // ---- 暫停 / DEV ----
      this.input.keyboard.on('keydown-ESC', function () { self.togglePause(); });
      this.input.keyboard.on('keydown-D', function () { if (H.Dev) H.Dev.toggle(self); });

      this.events.on('shutdown', function () {
        if (H.Dev) H.Dev.detach();
      });
    },

    // -------------------------------------------------------
    /** DEV 工具改動 LAYOUT 後即時套用 */
    applyLayout: function () {
      var A = H.LAYOUT.arena, L = H.LAYOUT.hud;
      this.floor.setPosition(A.x + A.w / 2, A.y + A.h / 2).setSize(A.w, A.h);
      this.arenaBorder.setPosition(A.x + A.w / 2, A.y + A.h / 2).setSize(A.w, A.h);
      this.physics.world.setBounds(A.x, A.y, A.w, A.h);

      this.hud.hpBg.setPosition(L.barX, L.barY).setSize(L.barW, L.barH);
      this.hud.hpFill.setPosition(L.barX - L.barW / 2 + 4, L.barY).setSize(L.barW - 8, L.barH - 10);
      this.hud.hpText.setPosition(L.barX, L.barY);
      this.hud.lvText.setPosition(L.lvTextX, L.lvTextY).setFontSize(L.lvTextSize);
      this.hud.wave.setPosition(L.waveX, L.waveY);
      this.hud.coin.setPosition(L.coinX - 58, L.coinY);
      this.updateHpBar();
      if (this.joy) this.joy.reposition();
    },

    // -------------------------------------------------------
    buildObstacles: function () {
      var A = H.LAYOUT.arena;
      var n = this.lv.obstacles;
      var seed = this.lv.global * 3571;
      function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
      var placed = [];
      for (var i = 0; i < n; i++) {
        for (var tries = 0; tries < 20; tries++) {
          var x = A.x + 90 + rnd() * (A.w - 180);
          var y = A.y + 90 + rnd() * (A.h - 260);
          var ok = true;
          for (var j = 0; j < placed.length; j++) {
            if (Phaser.Math.Distance.Between(x, y, placed[j].x, placed[j].y) < 150) { ok = false; break; }
          }
          if (!ok) continue;
          placed.push({ x: x, y: y });
          // 優先使用 AI 生成的俯視角道具，未就緒才退回程式貼圖
          var pool = ['p_obs_crate', 'p_obs_barrel', 'p_obs_sandbag', 'p_obs_car'].filter(function (k) {
            return this.textures.exists(k);
          }, this);
          var sh = this.add.image(x, y + 8, 'shadow').setDepth(9).setScale(0.72).setAlpha(0.35);
          var o;
          if (pool.length) {
            var key = pool[Math.floor(rnd() * pool.length)];
            var size = key === 'p_obs_car' ? 168 : 92;
            o = this.obstacles.create(x, y, key).setDepth(100 + y * 0.001);
            o.setDisplaySize(size, size);
            o.body.setSize(size * 0.78, size * 0.78);
            o.body.updateFromGameObject();
            sh.setScale(size / 100);
          } else {
            o = this.obstacles.create(x, y, rnd() < 0.55 ? 'crate' : 'barrel').setDepth(100 + y * 0.001);
            o.setTint(this.lv.theme.propTint);
            o.body.setSize(o.width * 0.86, o.height * 0.86, true);
          }
          o.shadowRef = sh;
          break;
        }
      }
    },

    // -------------------------------------------------------
    buildHud: function () {
      var L = H.LAYOUT.hud, T = this.lv.theme;
      var d = 9500;
      this.hud = {};

      // 血條
      this.hud.hpBg = this.add.rectangle(L.barX, L.barY, L.barW, L.barH, 0x000000, 0.55)
        .setDepth(d).setStrokeStyle(4, 0x1a1d24, 1);
      this.hud.hpFill = this.add.rectangle(L.barX - L.barW / 2 + 4, L.barY, L.barW - 8, L.barH - 10, 0x4dff7d)
        .setOrigin(0, 0.5).setDepth(d + 1);
      this.hud.hpText = this.add.text(L.barX, L.barY, '', {
        fontFamily: 'Arial Black, sans-serif', fontSize: '20px', color: '#ffffff',
        stroke: '#12141a', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(d + 2);

      // 關卡
      this.hud.lvText = this.add.text(L.lvTextX, L.lvTextY,
        '第 ' + this.chapter + ' 章  ·  ' + this.levelNo + ' / ' + H.LEVELS_PER_CHAPTER +
        (this.lv.isBoss ? '  ☠ BOSS' : this.lv.isElite ? '  ★ 精英' : ''), {
        fontFamily: 'Arial Black, sans-serif', fontSize: L.lvTextSize + 'px',
        color: '#' + T.accent.toString(16).padStart(6, '0'), stroke: '#12141a', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(d);

      // 波次 / 剩餘敵人
      this.hud.wave = this.add.text(L.waveX, L.waveY, '', {
        fontFamily: 'Arial Black, sans-serif', fontSize: L.waveSize + 'px', color: '#c8d0dd',
        stroke: '#12141a', strokeThickness: 4,
      }).setOrigin(0, 0.5).setDepth(d);

      // 金幣
      this.add.image(L.coinX - 78, L.coinY, 'coin').setScale(0.72).setDepth(d);
      this.hud.coin = this.add.text(L.coinX - 58, L.coinY, '0', {
        fontFamily: 'Arial Black, sans-serif', fontSize: L.coinSize + 'px', color: '#ffd23d',
        stroke: '#12141a', strokeThickness: 4,
      }).setOrigin(0, 0.5).setDepth(d);
      this.runCoin = 0;

      // 暫停鍵
      var self = this;
      this.hud.pause = this.add.text(52, 60, '❚❚', {
        fontFamily: 'Arial Black, sans-serif', fontSize: '26px', color: '#c8d0dd',
        stroke: '#12141a', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(d).setInteractive({ useHandCursor: true })
        .on('pointerdown', function (p, x, y, ev) { if (ev) ev.stopPropagation(); self.togglePause(); });

      // 已取得技能列（小圖示）
      this.hud.skillIcons = this.add.container(0, 0).setDepth(d);
      this.refreshSkillIcons();

      // BOSS 血條（預設隱藏）
      this.hud.bossName = this.add.text(80, 192, '', {
        fontFamily: 'Arial Black, sans-serif', fontSize: '20px', color: '#ff8080',
        stroke: '#12141a', strokeThickness: 5,
      }).setOrigin(0, 0.5).setDepth(d + 2).setVisible(false);
      this.hud.bossBg = this.add.rectangle(360, 222, 560, 22, 0x000000, 0.65)
        .setDepth(d).setStrokeStyle(4, 0x1a1d24, 1).setVisible(false);
      this.hud.bossFill = this.add.rectangle(360 - 276, 222, 552, 14, 0xff3d5c)
        .setOrigin(0, 0.5).setDepth(d + 1).setVisible(false);
    },

    refreshSkillIcons: function () {
      this.hud.skillIcons.removeAll(true);
      // 已取得技能列：放在右下角空白處，不遮擋戰場與搖桿
      var ids = Object.keys(this.stats.taken);
      var x = 690, y = 1214;
      for (var i = 0; i < ids.length && i < 12; i++) {
        var sk = H.SKILLS.find(function (s) { return s.id === ids[i]; });
        if (!sk) continue;
        var ico = H.iconImage(this, x, y, 'ic_sk_' + sk.id, 34, sk.icon, sk.color);
        var n = this.add.text(x + 12, y + 11, 'x' + this.stats.taken[ids[i]], {
          fontFamily: 'Arial Black', fontSize: '13px', color: '#ffffff', stroke: '#12141a', strokeThickness: 3,
        }).setOrigin(0.5);
        ico.setAlpha(0.9);
        this.hud.skillIcons.add([ico, n]);
        x -= 42;
        if (x < 420) { x = 690; y -= 42; }
      }
    },

    showLevelBanner: function () {
      var T = this.lv.theme;
      var txt = this.lv.isBoss ? '☠  ' + H.enemyDef(this.lv.boss).name + '  ☠'
        : (this.lv.isElite ? '★ 精英關卡 ★' : 'STAGE ' + this.levelNo);
      var t = this.add.text(360, 560, txt, {
        fontFamily: 'Impact, Arial Black, sans-serif', fontSize: this.lv.isBoss ? '58px' : '68px',
        color: this.lv.isBoss ? '#ff3d5c' : '#' + T.accent.toString(16).padStart(6, '0'),
        stroke: '#12141a', strokeThickness: 9,
      }).setOrigin(0.5).setDepth(9800).setScale(0.4).setAlpha(0);
      this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 280, ease: 'Back.out' });
      this.tweens.add({
        targets: t, alpha: 0, y: 500, delay: 900, duration: 400,
        onComplete: function () { t.destroy(); }
      });
      if (this.lv.isBoss) H.Sfx.boss();
    },

    // -------------------------------------------------------
    // 波次
    // -------------------------------------------------------
    nextWave: function () {
      if (this.finished) return;
      if (this.waveIndex >= this.lv.waves.length) return;
      var wave = this.lv.waves[this.waveIndex++];
      var self = this;

      // BOSS 關：最後一波換成 BOSS
      if (this.lv.isBoss && this.waveIndex === this.lv.waves.length) {
        this.spawnAtEdge(this.lv.boss);
        return;
      }
      wave.forEach(function (t, i) {
        self.time.delayedCall(i * 90, function () { self.spawnAtEdge(t); });
      });
    },

    spawnAtEdge: function (type) {
      var A = H.LAYOUT.arena;
      var side = Math.floor(Math.random() * 4);
      var x, y, m = 60;
      if (side === 0) { x = A.x + m + Math.random() * (A.w - m * 2); y = A.y + m; }
      else if (side === 1) { x = A.x + A.w - m; y = A.y + m + Math.random() * (A.h - m * 2); }
      else if (side === 2) { x = A.x + m + Math.random() * (A.w - m * 2); y = A.y + A.h - m; }
      else { x = A.x + m; y = A.y + m + Math.random() * (A.h - m * 2); }
      // 別生在玩家臉上
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 200) {
        x = A.x + A.w - (x - A.x); y = A.y + A.h - (y - A.y);
      }
      this.spawnEnemy(type, x, y);
    },

    spawnEnemy: function (type, x, y, instant) {
      var A = H.LAYOUT.arena;
      x = Phaser.Math.Clamp(x, A.x + 30, A.x + A.w - 30);
      y = Phaser.Math.Clamp(y, A.y + 30, A.y + A.h - 30);
      var d = H.enemyDef(type);
      var am = H.Anim.forEnemy(this, type);
      var e;
      if (am) {
        // AI 俯視角 sprite：以碰撞半徑推算顯示尺寸（sprite 內角色約佔格子 90%）
        e = this.enemies.create(x, y, am.key, 'frame_000.png');
        e.setOrigin(0.5, 0.5);
        e.baseScale = (d.r * 3.5) / 256;
        e.setScale(e.baseScale);
        var rr = d.r / e.baseScale;
        e.body.setCircle(rr, 128 - rr, 128 - rr);
        e.play(am.anim);
        if (am.tint) e.setTint(am.tint);
        e.animKey = am.anim;
      } else {
        e = this.enemies.create(x, y, 'z_' + type);
        e.baseScale = 1;
        e.body.setCircle(d.r, e.width / 2 - d.r, e.height / 2 - d.r);
      }
      e.def = d;
      e.uid = ++this.uidSeq;
      e.maxHp = d.hp * this.lv.hpMul;
      e.hp = e.maxHp;
      e.dmg = d.dmg * this.lv.dmgMul;
      e.speed = d.speed * this.lv.spdMul;
      e.knockX = 0; e.knockY = 0;
      e.touchCd = 0;
      e.setDepth(200);
      e.body.setCollideWorldBounds(true);
      e.body.pushable = !d.boss;
      e.setRotation(Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y));

      e.shadow = this.add.image(x, y + d.r * 0.35, 'shadow')
        .setDepth(150).setScale(d.r / 46).setAlpha(0.35);

      // 出場動畫（破土而出）
      if (!instant) {
        e.setScale(e.baseScale * 0.1).setAlpha(0.2);
        var ring = this.add.image(x, y, 'glow').setDepth(12).setTint(0x8c1f1f).setScale(0.25).setAlpha(0.6);
        this.tweens.add({ targets: ring, scale: 0.7, alpha: 0, duration: 420, onComplete: function () { ring.destroy(); } });
        this.tweens.add({ targets: e, scale: e.baseScale, alpha: 1, duration: 300, ease: 'Back.out' });
      }

      if (d.boss) {
        e.setScale(e.baseScale * 0.1);
        this.tweens.add({ targets: e, scale: e.baseScale, duration: 500, ease: 'Back.out' });
        this.boss = e;
        this.hud.bossBg.setVisible(true); this.hud.bossFill.setVisible(true);
        this.hud.bossName.setVisible(true).setText(d.name);
        this.cameras.main.shake(400, 0.008);
      }

      this.aliveCount++;
      return e;
    },

    onEnemyKilled: function (e) {
      this.aliveCount--;
      this.killCount++;
      if (this.boss === e) {
        this.boss = null;
        this.hud.bossBg.setVisible(false); this.hud.bossFill.setVisible(false); this.hud.bossName.setVisible(false);
      }
      var self = this;
      if (this.aliveCount <= 0 && !this.finished) {
        if (this.waveIndex < this.lv.waves.length) {
          this.time.delayedCall(650, function () { self.nextWave(); });
        } else {
          this.time.delayedCall(500, function () { self.levelClear(); });
        }
      }
    },

    // -------------------------------------------------------
    // 掉落物
    // -------------------------------------------------------
    dropLoot: function (e) {
      var self = this;
      var n = e.def.boss ? 12 : (Math.random() < 0.75 ? 1 : 2);
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 40;
        var useAiCoin = this.textures.exists('p_loot_coin');
        var l = this.loots.create(e.x, e.y, useAiCoin ? 'p_loot_coin' : 'coin').setDepth(120);
        if (useAiCoin) l.setDisplaySize(42, 42); else l.setScale(0.8);
        l.kind = 'coin'; l.value = Math.max(1, Math.round(this.lv.coin / (e.def.boss ? 12 : 6)));
        l.body.setCircle(18);
        l.body.setAllowGravity(false);
        this.tweens.add({ targets: l, x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, duration: 260, ease: 'Quad.out' });
      }
      // 補血包
      if (Math.random() < (e.def.boss ? 1 : 0.055) && this.stats.hp < this.stats.maxHp) {
        var useAiKit = this.textures.exists('p_loot_medkit');
        var h = this.loots.create(e.x, e.y, useAiKit ? 'p_loot_medkit' : 'heart').setDepth(120);
        if (useAiKit) h.setDisplaySize(52, 52); else h.setScale(0.9);
        h.kind = 'heart'; h.value = Math.round(this.stats.maxHp * 0.22);
        h.body.setCircle(18);
        h.body.setAllowGravity(false);
      }
    },

    pickLoot: function (l) {
      if (!l.active) return;
      if (l.kind === 'coin') { this.runCoin += l.value; H.Sfx.coin(); }
      else { this.healPlayer(l.value); H.Sfx.heal(); }
      l.destroy();
      this.hud.coin.setText(String(this.runCoin));
    },

    // -------------------------------------------------------
    // 玩家受傷 / 回復
    // -------------------------------------------------------
    touchDamage: function (e) {
      if (!e.active || e.dying) return;
      var now = this.time.now;
      if (e.touchCd && now < e.touchCd) return;
      e.touchCd = now + 700;
      this.hurtPlayer(e.dmg);
      if (this.stats.thorns > 0) H.Combat.damageEnemy(this, e, e.dmg * this.stats.thorns, {});
    },

    hurtPlayer: function (dmg) {
      var now = this.time.now;
      if (this.finished || now < this.invulnUntil) return;
      if (this.stats.dodge > 0 && Math.random() < this.stats.dodge) {
        H.Combat.popText(this, this.player.x, this.player.y - 40, 'MISS', 0xb0ffb0, 22);
        return;
      }
      var real = dmg * (1 - Math.min(0.75, this.stats.dr));
      this.stats.hp -= real;
      this.invulnUntil = now + H.PLAYER.invulnAfterHit;
      H.Sfx.hurt();
      this.cameras.main.shake(180, 0.009);
      this.cameras.main.flash(120, 120, 0, 0);
      var p = this.player;
      this.tweens.add({ targets: p, alpha: 0.35, duration: 90, yoyo: true, repeat: 2 });
      this.updateHpBar();
      if (this.stats.hp <= 0) this.gameOver();
    },

    healPlayer: function (v) {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + v);
      this.updateHpBar();
    },

    updateHpBar: function () {
      var L = H.LAYOUT.hud;
      var p = Phaser.Math.Clamp(this.stats.hp / this.stats.maxHp, 0, 1);
      this.hud.hpFill.width = (L.barW - 8) * p;
      this.hud.hpFill.fillColor = p > 0.5 ? 0x4dff7d : p > 0.25 ? 0xffc93d : 0xff3d5c;
      this.hud.hpText.setText(Math.max(0, Math.ceil(this.stats.hp)) + ' / ' + Math.round(this.stats.maxHp));
    },

    // -------------------------------------------------------
    // 無人機 / 光環 / 地雷
    // -------------------------------------------------------
    syncDrones: function () {
      while (this.drones.length < this.stats.drones) {
        var i = this.drones.length;
        var d = this.add.image(this.player.x, this.player.y, 'player')
          .setScale(0.42).setDepth(480).setTint(0x7dffb0);
        d.orbit = (Math.PI * 2 / 3) * i;
        d.fireCd = 0;
        this.drones.push(d);
      }
    },

    updateDrones: function (dt, target) {
      for (var i = 0; i < this.drones.length; i++) {
        var d = this.drones[i];
        d.orbit += dt * 0.0016;
        var tx = this.player.x + Math.cos(d.orbit) * 74;
        var ty = this.player.y + Math.sin(d.orbit) * 74;
        d.x += (tx - d.x) * 0.14; d.y += (ty - d.y) * 0.14;
        if (target) {
          d.setRotation(Phaser.Math.Angle.Between(d.x, d.y, target.x, target.y));
          d.fireCd -= dt;
          if (d.fireCd <= 0) {
            d.fireCd = this.stats.fireRate * 1.6;
            var b = this.bullets.get(d.x, d.y, 'bullet');
            if (b) {
              var a = d.rotation;
              b.setActive(true).setVisible(true).setDepth(600).setRotation(a).setScale(0.8).setTint(0x7dffb0);
              b.body.reset(b.x, b.y); b.body.setCircle(7, 8, 1);
              this.physics.velocityFromRotation(a, this.stats.bulletSpeed, b.body.velocity);
              b.dmg = this.stats.damage * 0.5; b.crit = false;
              b.pierce = 0; b.bounce = 0; b.fire = 0; b.ice = 0; b.blast = 0; b.homing = 0;
              b.hitIds = []; b.life = 900;
            }
          }
        }
      }
    },

    updateSpecials: function (now) {
      var s = this.stats, self = this;
      // 電磁力場
      if (s.aura > 0 && now > this.auraAt) {
        this.auraAt = now + 700;
        var r = 110 + 30 * s.aura;
        var ring = this.add.image(this.player.x, this.player.y, 'glow').setDepth(60)
          .setTint(0x7dd3ff).setScale(r / 120).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: ring, alpha: 0, scale: r / 90, duration: 300, onComplete: function () { ring.destroy(); } });
        this.enemies.children.each(function (e) {
          if (!e.active || e.dying) return;
          if (Phaser.Math.Distance.Between(self.player.x, self.player.y, e.x, e.y) < r)
            H.Combat.damageEnemy(self, e, s.damage * 0.35 * s.aura, {});
        });
      }
      // 詭雷
      if (s.mine > 0 && now > this.mineAt) {
        this.mineAt = now + 3200 / s.mine;
        var mx = this.player.x, my = this.player.y;
        var m = this.add.image(mx, my, 'barrel').setDepth(30).setScale(0.42).setTint(0xff8a3d);
        this.tweens.add({ targets: m, alpha: 0.55, duration: 400, yoyo: true, repeat: -1 });
        m.armed = true;
        this.mines = this.mines || [];
        this.mines.push(m);
        this.time.delayedCall(9000, function () { if (m.active) { m.destroy(); } });
      }
      if (this.mines && this.mines.length) {
        for (var i = this.mines.length - 1; i >= 0; i--) {
          var m2 = this.mines[i];
          if (!m2.active) { this.mines.splice(i, 1); continue; }
          var hit = H.Combat.nearestEnemy(this, m2.x, m2.y, 60);
          if (hit) {
            H.Combat.explode(this, m2.x, m2.y, 110, s.damage * 2.2, 0xff8a3d);
            m2.destroy(); this.mines.splice(i, 1);
          }
        }
      }
      // 再生
      if (s.regen > 0 && now > this.regenAt) {
        this.regenAt = now + 3000;
        if (this.stats.hp < this.stats.maxHp) this.healPlayer(s.regen);
      }
    },

    // -------------------------------------------------------
    update: function (time, delta) {
      if (this.finished || this.paused) return;
      var dt = Math.min(delta, 50);
      var s = this.stats;
      var A = H.LAYOUT.arena;

      // ---- 移動 ----
      var dir = this.joy.read();
      var moving = dir.s > 0;
      if (moving) {
        this.player.body.setVelocity(dir.x * s.speed * dir.s, dir.y * s.speed * dir.s);
        var ma = Math.atan2(dir.y, dir.x);
        this.player.setRotation(Phaser.Math.Angle.RotateTo(this.player.rotation, ma, 0.018 * dt));
        this.stillTime = 0;
      } else {
        this.player.body.setVelocity(0, 0);
        this.stillTime += dt;
      }
      this.playerShadow.setPosition(this.player.x, this.player.y + 12);

      // ---- 自動鎖敵射擊（僅靜止時）----
      var target = H.Combat.nearestEnemy(this, this.player.x, this.player.y, s.range);
      this.fireCd -= dt;
      if (!moving && this.stillTime >= H.PLAYER.stopFireDelay && target) {
        var ta = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
        this.player.setRotation(Phaser.Math.Angle.RotateTo(this.player.rotation, ta, 0.03 * dt));
        if (this.fireCd <= 0) {
          this.fireCd = s.fireRate;
          H.Combat.fire(this, this.player.rotation);
          if (this.anims.exists('p_shoot')) this.player.play('p_shoot', true);
        }
      } else if (this.fireCd < 0) this.fireCd = 0;

      // 玩家動畫：走路循環 / 靜止待機
      if (this.hasPlayerAnim) {
        var pa = this.player.anims;
        var cur = pa.currentAnim ? pa.currentAnim.key : null;
        if (moving) {
          if (cur !== 'p_walk' || !pa.isPlaying) this.player.play('p_walk', true);
        } else if (cur === 'p_walk') {
          pa.stop();
          this.player.setTexture('player_walk', 'frame_000.png');
        }
      }

      // ---- 敵人 ----
      var self = this;
      this.enemies.children.each(function (e) {
        if (!e.active) return;
        H.AI.update(self, e, dt, time);
        if (e.shadow) e.shadow.setPosition(e.x, e.y + e.def.r * 0.35);
        e.setDepth(200 + e.y * 0.01);
      });

      // ---- BOSS 血條 ----
      if (this.boss && this.boss.active) {
        this.hud.bossFill.width = 552 * Phaser.Math.Clamp(this.boss.hp / this.boss.maxHp, 0, 1);
      }

      // ---- 子彈 / 特殊 ----
      H.Combat.updateBullets(this, dt);
      this.updateDrones(dt, target);
      this.updateSpecials(time);

      // ---- 掉落物磁吸 ----
      var mag = 110 + s.magnet;
      this.loots.children.each(function (l) {
        if (!l.active) return;
        var d = Phaser.Math.Distance.Between(l.x, l.y, self.player.x, self.player.y);
        if (d < mag) {
          var a = Phaser.Math.Angle.Between(l.x, l.y, self.player.x, self.player.y);
          var sp = 260 + (mag - d) * 3;
          l.x += Math.cos(a) * sp * dt / 1000;
          l.y += Math.sin(a) * sp * dt / 1000;
        }
      });

      // ---- HUD ----
      this.hud.wave.setText('波次 ' + Math.min(this.waveIndex, this.lv.waves.length) + '/' + this.lv.waves.length +
        '   剩餘 ' + Math.max(0, this.totalEnemies - this.killCount));

      // 玩家保持在場地內
      this.player.x = Phaser.Math.Clamp(this.player.x, A.x + 24, A.x + A.w - 24);
      this.player.y = Phaser.Math.Clamp(this.player.y, A.y + 24, A.y + A.h - 24);
    },

    // -------------------------------------------------------
    // 結束流程
    // -------------------------------------------------------
    levelClear: function () {
      if (this.finished) return;
      this.finished = true;
      this.physics.pause();
      H.Save.clearLevel(this.chapter, this.levelNo, this.runCoin);
      H.Sfx.win();

      var last = this.levelNo >= H.LEVELS_PER_CHAPTER;
      var self = this;
      var t = this.add.text(360, 540, last ? '章 節 通 關 !' : 'STAGE CLEAR', {
        fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '64px', color: '#4dff7d',
        stroke: '#12141a', strokeThickness: 10,
      }).setOrigin(0.5).setDepth(9900).setScale(0.4);
      this.tweens.add({ targets: t, scale: 1, duration: 320, ease: 'Back.out' });

      this.time.delayedCall(900, function () {
        t.destroy();
        if (last) {
          self.scene.start('Result', {
            win: true, chapterDone: true, chapter: self.chapter, level: self.levelNo, coin: self.runCoin,
          });
        } else {
          self.input.enabled = false;   // 確保覆蓋層獨佔輸入
          self.scene.pause();
          self.scene.launch('Skill', {
            chapter: self.chapter, level: self.levelNo + 1, stats: self.stats, coin: self.runCoin,
          });
        }
      });
    },

    gameOver: function () {
      if (this.finished) return;
      this.finished = true;
      this.physics.pause();
      H.Sfx.lose();
      H.Save.get().coin += Math.floor(this.runCoin * 0.5);
      H.Save.save();
      var self = this;
      this.cameras.main.flash(400, 120, 0, 0);
      this.time.delayedCall(700, function () {
        self.scene.start('Result', {
          win: false, chapter: self.chapter, level: self.levelNo, coin: Math.floor(self.runCoin * 0.5),
          stats: self.stats,
        });
      });
    },

    togglePause: function () {
      if (this.finished) return;
      var self = this;
      this.paused = true;
      this.physics.pause();
      this.joy._up({ id: this.joy.pointerId });   // 放開搖桿，避免恢復後角色續走
      this.input.enabled = false;
      this.scene.launch('Pause', { from: this });
      this.scene.pause();
    },
  });

  H.GameScene = GameScene;
})(window.HABBY);
