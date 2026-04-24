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

    // 碰撞
    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, null, this);
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
      if (p.x < this.W / 2) { // 左半邊才啟用搖桿
        this.joystick.active = true;
        this.joystick.baseX = p.x;
        this.joystick.baseY = p.y;
        this.joystick.stickX = p.x;
        this.joystick.stickY = p.y;
        this.joyBase.setPosition(p.x, p.y).setVisible(true);
        this.joyStick.setPosition(p.x, p.y).setVisible(true);
      }
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

    this.updatePlayer(delta);
    this.updateWeapons(time);
    this.updateSpawner(time);
    this.updateEnemies(delta);
    this.updateXpGems();
    this.updateRegen(delta);

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
    if (len > 0) { vx /= len; vy /= len; }
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
      if (time - last >= stat.cooldown) {
        this.fireWeapon(key, stat);
        this.lastFireTime[key] = time;
      }
    }
  }

  fireWeapon(key, stat) {
    const target = Utils.nearestEnemy(this.player, this.enemies);
    if (!target) return;
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

  updateEnemies(delta) {
    this.enemies.children.iterate(e => {
      if (!e || !e.active) return;
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.setVelocity((dx / d) * e.speed, (dy / d) * e.speed);
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

    enemy.hp -= bullet.damage;
    // 擊退
    const ang = Phaser.Math.Angle.Between(bullet.x, bullet.y, enemy.x, enemy.y);
    enemy.x += Math.cos(ang) * 4;
    enemy.y += Math.sin(ang) * 4;

    // 閃紅
    enemy.setTint(0xffffff);
    this.time.delayedCall(60, () => enemy.active && enemy.clearTint());

    if (enemy.hp <= 0) this.killEnemy(enemy);

    if (bullet.pierce <= 0) bullet.destroy();
    else bullet.pierce--;
  }

  killEnemy(enemy) {
    // 掉落經驗
    const gem = this.xpGems.create(enemy.x, enemy.y, 'tex_xp');
    gem.xp = enemy.xp;
    enemy.destroy();
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
    const g = this.add.container(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y).setDepth(200);
    const panel = this.add.rectangle(0, 0, 300, 200, 0x000000, 0.8).setStrokeStyle(2, 0xff5577);
    const t1 = this.add.text(0, -50, 'GAME OVER', { fontSize: '32px', color: '#ff5577', fontStyle: 'bold' }).setOrigin(0.5);
    const t2 = this.add.text(0, 0, `存活 ${Math.floor(this.elapsed / 1000)} 秒\n等級 ${this.player.level}`, { fontSize: '18px', color: '#fff', align: 'center' }).setOrigin(0.5);
    const btn = this.add.text(0, 60, '重新開始', { fontSize: '22px', color: '#4fc3ff', backgroundColor: '#222', padding: { x: 16, y: 8 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.scene.restart());
    g.add([panel, t1, t2, btn]);
    g.setScrollFactor(0);
    // 用 camera fixed 座標
    g.x = this.W / 2;
    g.y = this.H / 2;
  }
}
