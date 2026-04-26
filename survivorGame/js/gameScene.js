// 主遊戲場景
class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    const { width, height } = this.scale.gameSize;
    this.W = width; this.H = height;

    // 地面格線背景
    this.drawGridBackground();

    // 產生貼圖
    Utils.makeCircleTexture(this, 'tex_player', 18, 0x4fc3ff);
    Utils.makeCircleTexture(this, 'tex_enemy_s', 14, 0xff5577);
    Utils.makeCircleTexture(this, 'tex_enemy_f', 10, 0xffaa44);
    Utils.makeCircleTexture(this, 'tex_enemy_t', 22, 0xaa44ff);
    Utils.makeCircleTexture(this, 'tex_bullet', 5, 0xffff99);
    Utils.makeCircleTexture(this, 'tex_xp', 6, 0x77ff77);
    Utils.makeCircleTexture(this, 'tex_missile', 6, 0xff8844);
    Utils.makeCircleTexture(this, 'tex_spark', 4, 0xffffff);
    Utils.makeCircleTexture(this, 'tex_flame', 8, 0xff7733);
    Utils.makeCircleTexture(this, 'tex_frost', 6, 0x66ddff);

    // 玩家
    this.player = this.physics.add.sprite(this.W / 2, this.H / 2, 'tex_player');
    this.player.setCircle(18);
    this.player.maxHp = 100;
    this.player.hp = 100;
    this.player.speed = 220;
    this.player.regen = 0;
    this.player.magnet = 60;
    this.player.level = 1;
    this.player.xp = 0;
    this.player.xpNext = Utils.xpToNext(1);
    this.player.weapons = { pistol: 1 }; // 初始武器
    this.player.passives = {};
    this.player.invuln = 0;

    // 群組
    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.xpGems = this.physics.add.group();
    this.missiles = this.physics.add.group();
    this.flames = this.physics.add.group();

    // 朝向（給火焰瞄準與飛彈出手方向用）
    this.player_facing = { x: 1, y: 0 };

    // 視覺輔助 graphics（閃電/冰環）
    this.fxLightning = this.add.graphics().setDepth(50);
    this.fxAura = this.add.graphics().setDepth(48);

    // 擊殺計數，用於螢幕震動節奏
    this.killStreak = 0;
    this.lastKillTime = 0;

    // 碰撞
    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, null, this);
    this.physics.add.overlap(this.missiles, this.enemies, this.onMissileHit, null, this);
    this.physics.add.overlap(this.flames, this.enemies, this.onFlameHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.player, this.xpGems, this.onPickupXp, null, this);

    // 輸入：鍵盤
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');

    // 虛擬搖桿
    this.setupJoystick();

    // 計時器
    this.elapsed = 0;
    this.lastFireTime = {};
    this.lastSpawnTime = 0;
    this.lastRegenTime = 0;

    // 鏡頭跟隨
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBackgroundColor('#0a0a12');

    // UI 場景
    this.scene.launch('UIScene', { game: this });
    this.uiScene = this.scene.get('UIScene');

    this.gameOver = false;
  }

  drawGridBackground() {
    const size = 2400;
    const g = this.add.graphics();
    g.fillStyle(0x0f0f1c, 1);
    g.fillRect(-size / 2, -size / 2, size, size);
    g.lineStyle(1, 0x1f1f38, 1);
    const step = 60;
    for (let x = -size / 2; x <= size / 2; x += step) {
      g.lineBetween(x, -size / 2, x, size / 2);
    }
    for (let y = -size / 2; y <= size / 2; y += step) {
      g.lineBetween(-size / 2, y, size / 2, y);
    }
    g.setDepth(-10);
    // 邊界限制
    this.worldBound = { minX: -size / 2, maxX: size / 2, minY: -size / 2, maxY: size / 2 };
  }

  setupJoystick() {
    this.joystick = { active: false, baseX: 0, baseY: 0, stickX: 0, stickY: 0, dx: 0, dy: 0 };
    const radius = 60;

    this.joyBase = this.add.circle(0, 0, radius, 0xffffff, 0.12).setScrollFactor(0).setDepth(100).setVisible(false);
    this.joyStick = this.add.circle(0, 0, radius * 0.45, 0xffffff, 0.3).setScrollFactor(0).setDepth(101).setVisible(false);

    this.input.on('pointerdown', (p) => {
      // 畫面任意位置皆可啟用搖桿
      this.joystick.active = true;
      this.joystick.pointerId = p.id;
      this.joystick.baseX = p.x;
      this.joystick.baseY = p.y;
      this.joystick.stickX = p.x;
      this.joystick.stickY = p.y;
      this.joyBase.setPosition(p.x, p.y).setVisible(true);
      this.joyStick.setPosition(p.x, p.y).setVisible(true);
    });
    this.input.on('pointermove', (p) => {
      if (!this.joystick.active || !p.isDown) return;
      const dx = p.x - this.joystick.baseX;
      const dy = p.y - this.joystick.baseY;
      const dist = Math.hypot(dx, dy);
      const clamp = Math.min(dist, radius);
      const nx = dist ? dx / dist : 0;
      const ny = dist ? dy / dist : 0;
      this.joyStick.setPosition(this.joystick.baseX + nx * clamp, this.joystick.baseY + ny * clamp);
      this.joystick.dx = nx * (clamp / radius);
      this.joystick.dy = ny * (clamp / radius);
    });
    this.input.on('pointerup', () => {
      this.joystick.active = false;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      this.joyBase.setVisible(false);
      this.joyStick.setVisible(false);
    });
  }

  update(time, delta) {
    if (this.gameOver) return;
    this.elapsed += delta;
    this.now = time;

    this.updatePlayer(delta);
    this.updateWeapons(time);
    this.updateMissiles(delta);
    this.updateFlames(delta);
    this.updateSpawner(time);
    this.updateEnemies(delta, time);
    this.updateXpGems();
    this.updateRegen(delta);
    this.updateBurns(delta, time);

    if (this.player.invuln > 0) this.player.invuln -= delta;
  }

  updatePlayer(delta) {
    let vx = 0, vy = 0;
    // 鍵盤
    if (this.keys.A.isDown || this.keys.LEFT.isDown) vx -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) vx += 1;
    if (this.keys.W.isDown || this.keys.UP.isDown) vy -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) vy += 1;
    // 搖桿蓋過鍵盤
    if (this.joystick.active && (Math.abs(this.joystick.dx) > 0.08 || Math.abs(this.joystick.dy) > 0.08)) {
      vx = this.joystick.dx;
      vy = this.joystick.dy;
    }
    const len = Math.hypot(vx, vy);
    if (len > 0) {
      vx /= len; vy /= len;
      this.player_facing.x = vx;
      this.player_facing.y = vy;
    }
    this.player.setVelocity(vx * this.player.speed, vy * this.player.speed);

    // 世界邊界
    const b = this.worldBound;
    this.player.x = Phaser.Math.Clamp(this.player.x, b.minX + 20, b.maxX - 20);
    this.player.y = Phaser.Math.Clamp(this.player.y, b.minY + 20, b.maxY - 20);

    // 受傷閃爍
    this.player.setAlpha(this.player.invuln > 0 ? 0.5 : 1);
  }

  updateWeapons(time) {
    for (const [key, level] of Object.entries(this.player.weapons)) {
      const def = WEAPONS[key];
      const stat = def.levelStat(level);
      const last = this.lastFireTime[key] || 0;
      if (time - last < stat.cooldown) continue;
      const fired = this.fireWeapon(key, def, stat);
      if (fired !== false) this.lastFireTime[key] = time;
    }
  }

  fireWeapon(key, def, stat) {
    switch (def.type) {
      case 'bullet':    return this.fireBullet(stat);
      case 'lightning': return this.fireLightning(stat);
      case 'flame':     return this.fireFlame(stat);
      case 'frost':     return this.fireFrost(stat);
      case 'homing':    return this.fireHoming(stat);
    }
  }

  fireBullet(stat) {
    const target = Utils.nearestEnemy(this.player, this.enemies);
    if (!target) return false;
    const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const count = stat.count || 1;
    const spread = stat.spread || 0;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
      const ang = baseAngle + t * spread;
      const b = this.bullets.create(this.player.x, this.player.y, 'tex_bullet');
      b.setVelocity(Math.cos(ang) * stat.speed, Math.sin(ang) * stat.speed);
      b.damage = stat.damage;
      b.pierce = stat.pierce || 0;
      b.hits = new Set();
      b.life = 1400;
    }
  }

  fireLightning(stat) {
    const first = Utils.nearestEnemy(this.player, this.enemies);
    if (!first) return false;
    const path = [{ x: this.player.x, y: this.player.y }];
    let current = first;
    const visited = new Set();
    let remaining = stat.chain;
    while (current && remaining-- >= 0) {
      visited.add(current);
      path.push({ x: current.x, y: current.y });
      this.damageEnemy(current, stat.damage, 0xaaeeff);
      // 找下一個目標
      let next = null, bestD = stat.chainRange * stat.chainRange;
      this.enemies.children.iterate(e => {
        if (!e || !e.active || visited.has(e)) return;
        const d = Phaser.Math.Distance.Squared(current.x, current.y, e.x, e.y);
        if (d < bestD) { bestD = d; next = e; }
      });
      current = next;
    }
    this.drawLightning(path);
    this.cameras.main.shake(60, 0.003);
  }

  drawLightning(points) {
    const g = this.fxLightning;
    const draw = (alpha, width, color) => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        g.moveTo(a.x, a.y);
        // 折線：分段加抖動
        const segs = 6;
        for (let s = 1; s <= segs; s++) {
          const t = s / segs;
          const px = a.x + (b.x - a.x) * t + (s < segs ? Phaser.Math.Between(-8, 8) : 0);
          const py = a.y + (b.y - a.y) * t + (s < segs ? Phaser.Math.Between(-8, 8) : 0);
          g.lineTo(px, py);
        }
      }
      g.strokePath();
    };
    draw(0.35, 8, 0x88ddff); // 外光暈
    draw(1.0,  3, 0xffffff); // 主幹
    this.time.delayedCall(80, () => g.clear());
  }

  fireFlame(stat) {
    // 沿玩家朝向噴出多顆火焰粒子
    const fx = this.player_facing.x, fy = this.player_facing.y;
    const baseAngle = Math.atan2(fy, fx);
    for (let i = 0; i < stat.particles; i++) {
      const ang = baseAngle + Phaser.Math.FloatBetween(-stat.arc / 2, stat.arc / 2);
      const speed = 280 + Math.random() * 120;
      const f = this.flames.create(this.player.x, this.player.y, 'tex_flame');
      f.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
      f.damage = stat.damage;
      f.burnDps = stat.burnDps;
      f.burnDuration = stat.burnDuration;
      f.life = (stat.range / speed) * 1000;
      f.bornAt = this.now;
      f.setTint(Phaser.Display.Color.GetColor(255, Phaser.Math.Between(120, 200), 60));
      f.setScale(Phaser.Math.FloatBetween(0.8, 1.4));
      f.setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  fireFrost(stat) {
    // 以玩家為中心爆發
    const r = stat.radius;
    this.enemies.children.iterate(e => {
      if (!e || !e.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d <= r) {
        this.damageEnemy(e, stat.damage, 0x66ddff);
        e.slowFactor = stat.slowFactor;
        e.slowUntil = this.now + stat.slowDuration;
      }
    });
    this.drawFrostRing(r);
    this.cameras.main.shake(80, 0.004);
  }

  drawFrostRing(maxR) {
    // 用 scale 把小圓放大成環狀波紋
    const baseR = 10;
    const ring = this.add.circle(this.player.x, this.player.y, baseR, 0x66ddff, 0)
      .setStrokeStyle(3, 0xaaeeff, 0.9).setDepth(49).setScale(0.2);
    this.tweens.add({
      targets: ring,
      scale: maxR / baseR,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });
  }

  fireHoming(stat) {
    const used = new Set();
    for (let i = 0; i < stat.count; i++) {
      // 找尚未被本批鎖定的最近敵人
      let target = null, bestD = Infinity;
      this.enemies.children.iterate(e => {
        if (!e || !e.active || used.has(e)) return;
        const d = Phaser.Math.Distance.Squared(this.player.x, this.player.y, e.x, e.y);
        if (d < bestD) { bestD = d; target = e; }
      });
      if (!target) target = Utils.nearestEnemy(this.player, this.enemies);
      if (target) used.add(target);
      const m = this.missiles.create(this.player.x, this.player.y, 'tex_missile');
      // 初始隨機朝外噴一點
      const ang = Math.random() * Math.PI * 2;
      m.setVelocity(Math.cos(ang) * 140, Math.sin(ang) * 140);
      m.target = target;
      m.damage = stat.damage;
      m.speed = stat.speed;
      m.turnRate = stat.turnRate;
      m.explodeRadius = stat.explodeRadius;
      m.life = stat.life;
      m.bornAt = this.now;
      m.setScale(1.4);
      m.setTint(0xffaa55);
    }
  }

  updateMissiles(delta) {
    this.missiles.children.iterate(m => {
      if (!m || !m.active) return;
      // 重新尋標
      if (!m.target || !m.target.active) {
        m.target = Utils.nearestEnemy(m, this.enemies);
      }
      if (m.target) {
        const dx = m.target.x - m.x;
        const dy = m.target.y - m.y;
        const desired = Math.atan2(dy, dx);
        const cur = Math.atan2(m.body.velocity.y, m.body.velocity.x);
        const newAng = Phaser.Math.Angle.RotateTo(cur, desired, m.turnRate);
        m.setVelocity(Math.cos(newAng) * m.speed, Math.sin(newAng) * m.speed);
        m.rotation = newAng;
      }
      m.life -= delta;
      if (m.life <= 0) {
        this.explodeMissile(m);
      }
      // 拖尾
      if (Math.random() < 0.6) {
        const t = this.add.circle(m.x, m.y, 3, 0xffaa55, 0.7).setDepth(45).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: t, alpha: 0, scale: 0.2, duration: 280, onComplete: () => t.destroy() });
      }
    });
  }

  explodeMissile(m) {
    const r = m.explodeRadius;
    // 範圍傷害
    this.enemies.children.iterate(e => {
      if (!e || !e.active) return;
      const d = Phaser.Math.Distance.Between(m.x, m.y, e.x, e.y);
      if (d <= r) this.damageEnemy(e, m.damage, 0xffaa55);
    });
    // 爆炸視覺
    const boom = this.add.circle(m.x, m.y, 8, 0xffcc66, 0.9).setDepth(49).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: boom, scale: r / 8, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => boom.destroy() });
    this.cameras.main.shake(80, 0.005);
    m.destroy();
  }

  updateFlames(delta) {
    this.flames.children.iterate(f => {
      if (!f || !f.active) return;
      f.life -= delta;
      f.setAlpha(Math.max(0, f.life / 600));
      f.setScale(f.scaleX * 0.985);
      if (f.life <= 0) f.destroy();
    });
  }

  updateBurns(delta, time) {
    this.enemies.children.iterate(e => {
      if (!e || !e.active) return;
      if (e.burnUntil && time < e.burnUntil) {
        e._burnTick = (e._burnTick || 0) + delta;
        if (e._burnTick >= 200) { // 每 0.2 秒結算
          e._burnTick = 0;
          this.damageEnemy(e, e.burnDps * 0.2, 0xff8844, true);
        }
      }
    });
  }

  updateSpawner(time) {
    // 難度：時間越久刷越多越強
    const minute = this.elapsed / 60000;
    const interval = Math.max(220, 900 - minute * 150);
    if (time - this.lastSpawnTime < interval) return;
    this.lastSpawnTime = time;

    const batch = 1 + Math.floor(minute * 2);
    for (let i = 0; i < batch; i++) this.spawnEnemy(minute);
  }

  spawnEnemy(minute) {
    // 場外隨機一點
    const cam = this.cameras.main;
    const edge = Phaser.Math.Between(0, 3);
    const margin = 40;
    let x, y;
    if (edge === 0) { x = cam.worldView.left - margin; y = Phaser.Math.Between(cam.worldView.top, cam.worldView.bottom); }
    else if (edge === 1) { x = cam.worldView.right + margin; y = Phaser.Math.Between(cam.worldView.top, cam.worldView.bottom); }
    else if (edge === 2) { x = Phaser.Math.Between(cam.worldView.left, cam.worldView.right); y = cam.worldView.top - margin; }
    else { x = Phaser.Math.Between(cam.worldView.left, cam.worldView.right); y = cam.worldView.bottom + margin; }

    // 類型機率隨時間變化
    const r = Math.random();
    let type = 'slime';
    if (minute > 0.5 && r < 0.35) type = 'fast';
    if (minute > 1.5 && r < 0.15) type = 'tank';

    const stats = {
      slime: { tex: 'tex_enemy_s', hp: 10 + minute * 6, speed: 70 + minute * 8, dmg: 10, xp: 1 },
      fast:  { tex: 'tex_enemy_f', hp: 6 + minute * 4, speed: 130 + minute * 10, dmg: 8, xp: 1 },
      tank:  { tex: 'tex_enemy_t', hp: 40 + minute * 20, speed: 50 + minute * 5, dmg: 20, xp: 4 }
    }[type];

    const e = this.enemies.create(x, y, stats.tex);
    e.setCircle(e.width / 2);
    e.hp = stats.hp;
    e.speed = stats.speed;
    e.dmg = stats.dmg;
    e.xp = stats.xp;
    e.type = type;
  }

  updateEnemies(delta, time) {
    this.enemies.children.iterate(e => {
      if (!e || !e.active) return;
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      let mult = 1;
      if (e.slowUntil && time < e.slowUntil) {
        mult = e.slowFactor || 0.5;
        if (!e._frostTinted) { e.setTint(0x88ccff); e._frostTinted = true; }
      } else if (e._frostTinted) {
        e._frostTinted = false;
        if (!e.burnUntil || time >= e.burnUntil) e.clearTint();
      }
      // 燃燒著色（不蓋過冰）
      if (e.burnUntil && time < e.burnUntil && !e._frostTinted) {
        e.setTint(0xff8844);
      } else if (!e.burnUntil || time >= e.burnUntil) {
        if (!e._frostTinted && !e._hitFlash) e.clearTint();
      }
      e.setVelocity((dx / d) * e.speed * mult, (dy / d) * e.speed * mult);
    });
  }

  updateXpGems() {
    const magnetRange = this.player.magnet;
    this.xpGems.children.iterate(g => {
      if (!g || !g.active) return;
      const dx = this.player.x - g.x;
      const dy = this.player.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d < magnetRange) {
        const pull = 300;
        g.setVelocity((dx / (d || 1)) * pull, (dy / (d || 1)) * pull);
      }
    });
  }

  updateRegen(delta) {
    if (this.player.regen <= 0) return;
    this.lastRegenTime += delta;
    if (this.lastRegenTime >= 1000) {
      this.lastRegenTime = 0;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.regen);
    }
  }

  onBulletHit(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    if (bullet.hits.has(enemy)) return;
    bullet.hits.add(enemy);

    // 擊退
    const ang = Phaser.Math.Angle.Between(bullet.x, bullet.y, enemy.x, enemy.y);
    enemy.x += Math.cos(ang) * 4;
    enemy.y += Math.sin(ang) * 4;

    this.damageEnemy(enemy, bullet.damage, 0xffffff);
    this.spawnSpark(bullet.x, bullet.y, 0xffff99);

    if (bullet.pierce <= 0) bullet.destroy();
    else bullet.pierce--;
  }

  onMissileHit(missile, enemy) {
    if (!missile.active || !enemy.active) return;
    this.explodeMissile(missile);
  }

  onFlameHit(flame, enemy) {
    if (!flame.active || !enemy.active) return;
    if (!flame._hits) flame._hits = new Set();
    if (flame._hits.has(enemy)) return;
    flame._hits.add(enemy);
    this.damageEnemy(enemy, flame.damage, 0xff8844);
    enemy.burnDps = Math.max(enemy.burnDps || 0, flame.burnDps);
    enemy.burnUntil = (this.now || 0) + flame.burnDuration;
    this.spawnSpark(flame.x, flame.y, 0xff7733);
  }

  damageEnemy(enemy, dmg, color, isDot) {
    if (!enemy || !enemy.active) return;
    enemy.hp -= dmg;
    if (!isDot) {
      enemy._hitFlash = true;
      enemy.setTint(0xffffff);
      this.time.delayedCall(60, () => {
        if (enemy.active) {
          enemy._hitFlash = false;
          enemy.clearTint();
        }
      });
    }
    this.spawnDamageNumber(enemy.x, enemy.y, Math.ceil(dmg), color);
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    // 經驗
    const gem = this.xpGems.create(enemy.x, enemy.y, 'tex_xp');
    gem.xp = enemy.xp;
    // 爆裂粒子
    this.spawnBurst(enemy.x, enemy.y, enemy.tintTopLeft || 0xff6688);
    enemy.destroy();

    // 連殺鏡頭震動
    const t = this.now || 0;
    if (t - this.lastKillTime < 400) this.killStreak++;
    else this.killStreak = 1;
    this.lastKillTime = t;
    if (this.killStreak % 8 === 0) this.cameras.main.shake(80, 0.004);
  }

  spawnDamageNumber(x, y, val, color) {
    const hex = '#' + (color || 0xffffff).toString(16).padStart(6, '0');
    const t = this.add.text(x + Phaser.Math.Between(-6, 6), y - 10, String(val), {
      fontSize: '14px', color: hex, fontStyle: 'bold', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({
      targets: t, y: t.y - 24, alpha: 0, duration: 600, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy()
    });
  }

  spawnSpark(x, y, color) {
    for (let i = 0; i < 3; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 80;
      const s = this.add.circle(x, y, 2, color, 1).setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: s,
        x: x + Math.cos(ang) * sp * 0.25,
        y: y + Math.sin(ang) * sp * 0.25,
        alpha: 0, scale: 0.2, duration: 280,
        onComplete: () => s.destroy()
      });
    }
  }

  spawnBurst(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 24 + Math.random() * 24;
      const p = this.add.circle(x, y, 3, color, 1).setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        alpha: 0, scale: 0.3, duration: 380,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  onPlayerHit(player, enemy) {
    if (this.player.invuln > 0) return;
    this.player.hp -= enemy.dmg;
    this.player.invuln = 600;
    this.cameras.main.shake(120, 0.005);
    if (this.player.hp <= 0) this.endGame();
  }

  onPickupXp(player, gem) {
    this.player.xp += gem.xp;
    gem.destroy();
    while (this.player.xp >= this.player.xpNext) {
      this.player.xp -= this.player.xpNext;
      this.player.level++;
      this.player.xpNext = Utils.xpToNext(this.player.level);
      this.triggerLevelUp();
    }
  }

  triggerLevelUp() {
    // 全螢幕短閃光
    const flash = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0xffffff, 0.45)
      .setScrollFactor(0).setDepth(150);
    this.tweens.add({ targets: flash, alpha: 0, duration: 240, onComplete: () => flash.destroy() });
    this.physics.pause();
    this.scene.launch('UpgradeScene', { game: this });
    this.scene.bringToTop('UpgradeScene');
  }

  resumeFromUpgrade() {
    this.physics.resume();
  }

  endGame() {
    this.gameOver = true;
    this.physics.pause();
    const cx = this.W / 2;
    const cy = this.H / 2;
    // 不用 container，直接把元素加在固定螢幕座標，避免 container 內 setInteractive 的 hit test 異常
    this.add.rectangle(cx, cy, 300, 200, 0x000000, 0.8).setStrokeStyle(2, 0xff5577).setScrollFactor(0).setDepth(200);
    this.add.text(cx, cy - 50, 'GAME OVER', { fontSize: '32px', color: '#ff5577', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    this.add.text(cx, cy, `存活 ${Math.floor(this.elapsed / 1000)} 秒\n等級 ${this.player.level}`, { fontSize: '18px', color: '#fff', align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    const btn = this.add.text(cx, cy + 60, '重新開始', { fontSize: '22px', color: '#4fc3ff', backgroundColor: '#222', padding: { x: 16, y: 8 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(201)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      this.scene.restart();
    });
  }
}
