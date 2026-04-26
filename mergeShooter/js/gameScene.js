/**
 * GameScene — 依 GDD §2 場景配置：
 *
 *   ┌─────────────────────┐  y= 0   ─┐
 *   │ 頂部 UI (UIScene)    │         │
 *   │ Stage X · Wave Y    │         │
 *   ├─────────────────────┤  y= 110 ─┤
 *   │                     │         │
 *   │  敵人生成區          │         │
 *   │  (敵人由上往下)      │         │
 *   │                     │         │
 *   ├─────────────────────┤  y= 760 ─┤  城牆 HP bar (UIScene)
 *   │ ▓▓▓▓ WALL ▓▓▓▓     │         │
 *   ├─────────────────────┤  y= 800 ─┤
 *   │ [前線 6 砲位]        │         │  ← 只有這排會射擊
 *   ├─────────────────────┤  y= 920 ─┤
 *   │ [備用 6×2 = 12 格]   │         │  ← 暫存，不射擊
 *   │                     │         │
 *   ├─────────────────────┤  y= 1170 ┤  底部按鈕列
 *   │ [購買] [升城牆] $$  │         │
 *   └─────────────────────┘  y= 1280
 */

const FRONT = 'front';
const RESERVE = 'reserve';

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init() {
    const save = MSSave.load();
    this.gold = save.gold;
    this.stage = save.currentStage;
    this.wave = save.currentWave;
    this.wall = { ...save.wall };
    this.highestLv = save.highestUnlockedCannonLevel;
    this.savedCannons = save.cannons;

    this.gameOver = false;
    this.waveActive = false;
    this.enemiesRemaining = 0;
    this.enemyTotal = 0;
    this.bossSpawned = false;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;

    // 區域 y 邊界（依素材設計圖：城牆寬條 + 前線盤 + 備用 3 排）
    this.combatTop = H * 0.09;
    this.wallY = H * 0.555;     // 城牆寬條中央
    this.frontY = H * 0.625;    // 前線砲位列
    this.reserveStart = H * 0.72;  // 備用區第 1 排頂
    // (備用區 row 間距改用 cellPitch，與前線格子大小一致)

    // ========== 戰場背景 ==========
    const gfx = this.add.graphics();
    gfx.fillGradientStyle(0x4a86c7, 0x4a86c7, 0x9ed4e9, 0x9ed4e9, 1);
    gfx.fillRect(0, 0, W, this.wallY);
    // 6 直行條紋
    for (let c = 0; c < 6; c++) {
      const cx = (c + 0.5) * (W / 6);
      this.add.rectangle(cx, this.wallY / 2, W / 6 - 4, this.wallY, 0xffffff, 0.04);
    }
    this.add.image(W / 2, 0, 'top-gradient').setOrigin(0.5, 0).setScale(W / 1337, 0.5).setAlpha(0.6);

    // ========== 城牆寬血條（依素材：滿寬大條） ==========
    // 由 UIScene 負責繪製 HP bar 視覺，這裡只記錄碰撞 y

    // ========== 統一格子視覺（前線 + 備用都長一樣） ==========
    const frontW = W * 0.97;
    const cellPitch = frontW / 6;          // 格子間距
    const cellBox = cellPitch * 0.86;       // 格子實際大小（正方形）
    this.cellSize = cellBox;

    // 通用畫格子方法
    const SLOT_FILL = 0xc8edf6;
    const SLOT_STROKE = 0x6da8c2;
    const drawCell = (cx, cy) => {
      const r = this.add.rectangle(cx, cy, cellBox, cellBox, SLOT_FILL).setStrokeStyle(2, SLOT_STROKE, 0.85);
      this.add.text(cx, cy, '+', { fontFamily: 'Arial', fontSize: cellBox * 0.45, color: '#5a8aa8', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.35);
      return r;
    };

    // ========== 前線 6 砲位（外圍青色長盤包覆） ==========
    this.frontCells = [];
    this.add.rectangle(W / 2, this.frontY, frontW, cellPitch * 1.3, 0x9bd9ec).setStrokeStyle(4, 0x5a8aa8);
    this.add.rectangle(W / 2, this.frontY - 3, frontW * 0.97, cellPitch * 1.18, 0xb6e3f0);
    for (let i = 0; i < 6; i++) {
      const cx = (i + 0.5) * (W / 6);
      const cy = this.frontY;
      drawCell(cx, cy);
      this.frontCells.push({ x: cx, y: cy, slot: FRONT, index: i, gun: null });
    }

    // ========== 備用區 6×2 = 12 格（同樣的格子視覺，無外框包覆） ==========
    this.reserveCells = [];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 6; c++) {
        const cx = (c + 0.5) * (W / 6);
        const cy = this.reserveStart + r * cellPitch;
        drawCell(cx, cy);
        this.reserveCells.push({ x: cx, y: cy, slot: RESERVE, index: r * 6 + c, gun: null });
      }
    }

    this.allCells = this.frontCells.concat(this.reserveCells);

    // ========== Group ==========
    this.guns = this.add.group();
    this.bullets = this.add.group();
    this.enemies = this.add.group();
    this.fxLayer = this.add.layer();

    // 載入存檔砲塔，若無則送 3 把 lv1 在備用區
    if (this.savedCannons && this.savedCannons.length) {
      this.savedCannons.forEach(c => {
        const cell = c.slot === FRONT ? this.frontCells[c.index] : this.reserveCells[c.index];
        if (cell) this.placeGun(cell, c.level);
      });
    } else {
      // 開局送 3 把 lv1 放在前線中央（玩家立刻看到砲塔射擊）
      [1, 2, 3].forEach(i => this.placeGun(this.frontCells[i], 1));
    }

    // ========== 自動射擊 ==========
    this.shootTimer = this.time.addEvent({ delay: 50, loop: true, callback: () => this.gunFireTick() });

    // ========== 開始第一波 ==========
    this.time.delayedCall(800, () => this.startWave());

    // ========== 拖放 ==========
    this.input.on('dragstart', (p, obj) => {
      obj.setDepth(1000);
      obj.setScale(obj._baseScale * 1.12);
      if (obj._badge) obj._badge.setDepth(1000);
      if (obj._lvTxt) obj._lvTxt.setDepth(1001);
    });
    this.input.on('drag', (p, obj, x, y) => {
      obj.x = x; obj.y = y;
      this.syncBadge(obj);
    });
    this.input.on('dragend', (p, obj) => {
      obj.setDepth(0);
      obj.setScale(obj._baseScale);
      if (obj._badge) obj._badge.setDepth(0);
      if (obj._lvTxt) obj._lvTxt.setDepth(0);
      this.tryDropGun(obj, p.x, p.y);
    });

    // 事件
    this.events.on('buy-gun', () => this.buyGun());
    this.events.on('upgrade-wall', () => this.upgradeWall());
    this.events.on('upgrade-all', () => this.upgradeAll());

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // ========== 砲塔 ==========
  placeGun(cell, level) {
    const stat = MSData.cannonStat(level);
    const texKey = `gun${Math.min(10, Math.ceil(level / 2))}-idle`;
    const g = this.add.image(cell.x, cell.y - this.cellSize * 0.05, texKey);
    g._baseScale = (this.cellSize * 0.78) / Math.max(g.width, g.height);
    g.setScale(g._baseScale);
    // 不染色：素材包已有 Gun01~Gun10 共 10 種樣貌，依等級用不同 sprite 即可
    g.setData('level', level);
    g.setData('cell', cell);
    g.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(g);
    g._cooldown = 0;
    g._stat = stat;
    cell.gun = g;
    this.guns.add(g);

    // 紫盾等級標
    const badge = this.add.image(cell.x, cell.y + this.cellSize * 0.32, 'shield-icon');
    badge.setScale(this.cellSize * 0.42 / Math.max(badge.width, badge.height));
    const lvTxt = this.add.text(badge.x, badge.y + 1, '' + level, {
      fontFamily: 'AlfaSlabOne, Arial', fontSize: Math.floor(this.cellSize * 0.22), color: '#ffffff',
      stroke: '#3a2a76', strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5);
    g._badge = badge;
    g._lvTxt = lvTxt;

    if (level > this.highestLv) {
      this.highestLv = level;
      this.events.emit('highest-lv', this.highestLv);
    }
    return g;
  }

  removeGun(g) {
    if (g._badge) g._badge.destroy();
    if (g._lvTxt) g._lvTxt.destroy();
    if (g.getData('cell')) g.getData('cell').gun = null;
    g.destroy();
  }

  syncBadge(g) {
    if (!g._badge) return;
    g._badge.x = g.x; g._badge.y = g.y + this.cellSize * 0.36;
    g._lvTxt.x = g._badge.x; g._lvTxt.y = g._badge.y + 1;
  }

  alignToCell(g, cell) {
    g.x = cell.x; g.y = cell.y - this.cellSize * 0.05;
    this.syncBadge(g);
  }

  tryDropGun(gun, x, y) {
    const target = this.findCellAt(x, y);
    const fromCell = gun.getData('cell');
    if (!target || target === fromCell) {
      this.alignToCell(gun, fromCell);
      return;
    }
    if (!target.gun) {
      // 移動
      fromCell.gun = null;
      target.gun = gun;
      gun.setData('cell', target);
      this.alignToCell(gun, target);
      MSAudio.sfx.click();
      this.persist();
      return;
    }
    // 合併
    const other = target.gun;
    if (other.getData('level') === gun.getData('level') && gun.getData('level') < MSData.MAX_LEVEL) {
      const newLevel = gun.getData('level') + 1;
      this.removeGun(other);
      this.removeGun(gun);
      this.placeGun(target, newLevel);
      this.flashMerge(target.x, target.y, newLevel);
      MSAudio.sfx.merge();
      if (newLevel >= 10) this.cameras.main.shake(120, 0.006);
      this.persist();
    } else {
      // 交換
      const tmpCell = gun.getData('cell');
      tmpCell.gun = other; other.setData('cell', tmpCell);
      target.gun = gun; gun.setData('cell', target);
      this.alignToCell(gun, target);
      this.alignToCell(other, tmpCell);
      MSAudio.sfx.click();
      this.persist();
    }
  }

  findCellAt(x, y) {
    return this.allCells.find(c => Math.abs(c.x - x) < this.cellSize / 2 && Math.abs(c.y - y) < this.cellSize / 2);
  }

  flashMerge(x, y, lv) {
    // 合成黑色煙霧過場（用素材的 dead-fx 動畫，染深色當煙霧）
    const smoke = this.add.sprite(x, y, 'deadfx-0').setScale(this.cellSize / 100);
    smoke.setTint(0x333333);
    smoke.play('dead-fx');
    smoke.once('animationcomplete', () => smoke.destroy());

    // 內圈白光提示升級
    const ring = this.add.circle(x, y, this.cellSize * 0.3, 0xffffff, 0.85);
    this.tweens.add({ targets: ring, radius: this.cellSize * 0.7, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
  }

  // ========== 經濟 ==========
  buyGun() {
    if (this.gameOver) return;
    const cost = MSData.buyCost(this.highestLv);
    if (this.gold < cost) { this.events.emit('warn', '金幣不足'); return; }
    const empty = this.reserveCells.find(c => !c.gun);
    if (!empty) { this.events.emit('warn', '備用區已滿'); return; }
    this.gold -= cost;
    // 抽卡：依最高解鎖等級從 pool 中隨機抽出等級
    const rolledLv = MSData.rollPurchasedLevel(this.highestLv);
    this.placeGun(empty, rolledLv);
    MSAudio.sfx.coin();
    if (rolledLv > 1) this.flashMerge(empty.x, empty.y, rolledLv); // 抽到高等級的驚喜特效
    this.events.emit('gold-changed', this.gold);
    this.persist();
  }

  upgradeAll() {
    if (this.gameOver) return;
    if (this.guns.children.size === 0) { this.events.emit('warn', '沒有砲塔可升級'); return; }
    const cost = Math.floor(MSData.buyCost(this.buysCount) * 2);
    if (this.gold < cost) { this.events.emit('warn', '金幣不足'); return; }
    this.gold -= cost;
    this.allGunsPowerMul = (this.allGunsPowerMul || 1) * 1.10;  // 全部砲塔 +10% 火力
    // 立即套用到現有砲塔
    this.guns.children.each(g => {
      g._stat.damage *= 1.10;
    });
    MSAudio.sfx.upgrade();
    this.events.emit('gold-changed', this.gold);
    this.events.emit('warn', '全部砲塔火力 +10%');
  }

  upgradeWall() {
    if (this.gameOver) return;
    const cost = MSData.wallUpgradeCost(this.wall.upgradeLevel);
    if (!isFinite(cost)) { this.events.emit('warn', '城牆已滿級'); return; }
    if (this.gold < cost) { this.events.emit('warn', '金幣不足'); return; }
    this.gold -= cost;
    this.wall.upgradeLevel++;
    this.wall.maxHP = MSData.wallMaxHpAtLevel(this.wall.upgradeLevel);
    this.wall.currentHP = this.wall.maxHP;
    MSAudio.sfx.upgrade();
    this.events.emit('gold-changed', this.gold);
    this.events.emit('wall-changed', this.wall);
    this.persist();
  }

  addGold(n) {
    this.gold += n;
    this.events.emit('gold-changed', this.gold);
  }

  // ========== 波次 ==========
  startWave() {
    if (this.gameOver) return;
    this.waveActive = true;
    const stages = MSData.buildStage(this.stage);
    const waveData = stages[this.wave - 1];
    if (!waveData) {
      // 該關打完，進下一關
      this.completeStage();
      return;
    }
    let total = 0;
    waveData.composition.forEach(c => total += c.count);
    this.enemyTotal = total;
    this.enemiesRemaining = total;
    this.events.emit('wave-changed', this.stage, this.wave, this.enemyTotal);

    // 序列化生成
    let delay = 0;
    waveData.composition.forEach(group => {
      const t = MSData.ENEMY_TYPES[group.type];
      for (let i = 0; i < group.count; i++) {
        this.time.delayedCall(delay, () => {
          if (!this.gameOver) this.spawnEnemy(t, waveData.isBoss && group.type === 4);
        });
        delay += group.type === 4 ? 0 : 600 - Math.min(450, this.stage * 8);
      }
    });
  }

  spawnEnemy(typeData, isBoss) {
    const W = this.W;
    const col = Phaser.Math.Between(0, 5);
    const x = (col + 0.5) * (W / 6);
    const y = this.combatTop;
    // 對應素材怪物 sprite (循環取用)
    const sprIdx = Phaser.Math.Between(1, 10);
    const e = this.add.sprite(x, y, `mon${sprIdx}-0`);
    const tw = this.cellSize * (isBoss ? 1.6 : 0.85);
    e._baseScale = tw / Math.max(e.width, e.height);
    e.setScale(e._baseScale);
    e.play(`mon${sprIdx}-walk`);
    const baseHp = MSData.enemyHp(this.stage, this.wave) * typeData.hpMul * (isBoss ? 30 : 1);
    e._hpMax = Math.floor(baseHp);
    e._hp = e._hpMax;
    e._speed = typeData.speed * (1 + this.stage * 0.04);
    e._reward = Math.max(2, Math.floor(e._hpMax * 0.15));
    e._col = col;
    e._isBoss = isBoss;

    // hp bar
    const bgImg = this.add.image(x, y - tw * 0.55, 'hpbar-bg');
    bgImg.setScale(tw / 200);
    const fgImg = this.add.image(bgImg.x - bgImg.displayWidth * 0.48, bgImg.y, 'hpbar-fg').setOrigin(0, 0.5).setScale(tw / 200, tw / 200);
    e._hpBg = bgImg; e._hpFg = fgImg;
    this.enemies.add(e);
  }

  // ========== 砲塔射擊（前線 6 砲位才射） ==========
  gunFireTick() {
    if (this.gameOver) return;
    const now = this.time.now;
    this.guns.children.each(g => {
      if (!g.active) return;
      const cell = g.getData('cell');
      if (cell.slot !== FRONT) return;     // 只有前線砲位
      const stat = g._stat;
      const interval = 1000 / stat.fireRate;
      if (now < g._cooldown) return;

      const enemy = this.findEnemyForCol(cell.index, g.x, g.y, stat.range);
      if (!enemy) return;
      g._cooldown = now + interval;

      const lv = g.getData('level');
      // 砲塔反衝動畫 — 用 tween 縮放代替 sprite animation（Image 無法 play）
      this.tweens.add({ targets: g, scaleX: g._baseScale * 1.15, scaleY: g._baseScale * 0.88, duration: 60, yoyo: true, ease: 'Quad.out' });

      // 子彈：每次射擊發 1 顆（對應素材實際玩法）
      const bIdx = 1 + ((lv - 1) % 4);
      const b = this.add.image(g.x, g.y - this.cellSize * 0.4, 'bullet' + bIdx).setScale(0.5);
      b._target = enemy;
      b._dmg = stat.damage;
      b._speed = stat.projectileSpeed;
      this.bullets.add(b);
      MSAudio.sfx.shoot();

      const fx = this.add.sprite(g.x, g.y - this.cellSize * 0.5, 'shootfx-0').setScale(0.55);
      fx.play('shoot-fx');
      fx.once('animationcomplete', () => fx.destroy());
      this.fxLayer.add(fx);
    });
  }

  findEnemyForCol(col, gx, gy, range) {
    // 全螢幕鎖定最近敵人（不分欄位），優先打最靠近城牆的（y 最大）
    let best = null, bestY = -Infinity;
    this.enemies.children.each(e => {
      if (!e.active) return;
      if (e.y >= gy) return;
      if (Phaser.Math.Distance.Between(e.x, e.y, gx, gy) > range) return;
      if (e.y > bestY) { best = e; bestY = e.y; }
    });
    return best;
  }

  hitEnemy(enemy, dmg) {
    if (enemy._dead) return;             // 已死，避免後續子彈重複觸發死亡特效
    enemy._hp -= dmg;
    enemy._hpFg.scaleX = Math.max(0, enemy._hp / enemy._hpMax) * (enemy._hpBg.scaleY * (200 / 200));
    enemy._hpFg.scaleY = enemy._hpBg.scaleY;
    enemy._hpFg.scaleX = Math.max(0, enemy._hp / enemy._hpMax) * enemy._hpBg.scaleX;
    if (enemy._hp <= 0) {
      enemy._dead = true;
      this.addGold(enemy._reward);
      const fx = this.add.sprite(enemy.x, enemy.y, 'deadfx-0').setScale(enemy._baseScale * 1.4);
      fx.play('dead-fx');
      fx.once('animationcomplete', () => fx.destroy());
      enemy._hpBg.destroy(); enemy._hpFg.destroy();
      enemy.destroy();
      MSAudio.sfx.enemyDie();
      this.enemiesRemaining--;
      this.events.emit('enemies-changed', this.enemiesRemaining, this.enemyTotal);
      if (this.enemiesRemaining <= 0 && this.waveActive) this.completeWave();
    } else {
      MSAudio.sfx.hit();
    }
  }

  completeWave() {
    this.waveActive = false;
    const stages = MSData.buildStage(this.stage);
    if (this.wave >= stages.length) {
      this.completeStage();
    } else {
      this.wave++;
      this.persist();
      this.events.emit('wave-changed', this.stage, this.wave, 0);
      this.time.delayedCall(800, () => this.startWave());
    }
  }

  completeStage() {
    // 過關獎勵 = 約等於 1.5 把當前武器（剛好夠買 1-2 把）
    const reward = Math.floor(MSData.buyCost(this.buysCount) * 1.5);
    this.addGold(reward);
    MSAudio.sfx.waveClear();
    this.scene.launch('Popup', {
      type: 'stage-clear',
      stage: this.stage,
      coins: reward,
      onClose: () => {
        this.stage++;
        this.wave = 1;
        // 城牆滿血
        this.wall.currentHP = this.wall.maxHP;
        this.events.emit('wall-changed', this.wall);
        this.persist();
        this.events.emit('wave-changed', this.stage, this.wave, 0);
        this.time.delayedCall(600, () => this.startWave());
      },
    });
  }

  endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    MSAudio.sfx.gameOver();
    this.scene.launch('Popup', {
      type: 'game-over',
      stage: this.stage,
      onClose: () => {
        // 重試：城牆回滿、留住砲塔
        this.wall.currentHP = this.wall.maxHP;
        this.wave = 1;
        this.persist();
        this.scene.stop('UI'); this.scene.stop('Popup');
        this.scene.restart();
        this.scene.run('UI');
      },
    });
  }

  persist() {
    const cannons = this.guns.children.entries.map(g => ({
      level: g.getData('level'),
      slot: g.getData('cell').slot,
      index: g.getData('cell').index,
    }));
    MSSave.save({
      currentStage: this.stage,
      currentWave: this.wave,
      gold: this.gold,
      wall: this.wall,
      cannons,
      buysCount: this.buysCount,
      highestUnlockedCannonLevel: this.highestLv,
      settings: { sound: !MSAudio.isMuted(), music: !MSAudio.isMuted() },
    });
  }

  update(time, dt) {
    if (this.gameOver) return;
    const dts = dt / 1000;

    // 子彈
    this.bullets.children.each(b => {
      if (!b.active) return;
      const t = b._target;
      if (!t || !t.active) {
        b.y -= b._speed * dts;
        if (b.y < -50) b.destroy();
        return;
      }
      const ang = Phaser.Math.Angle.Between(b.x, b.y, t.x, t.y);
      b.x += Math.cos(ang) * b._speed * dts;
      b.y += Math.sin(ang) * b._speed * dts;
      b.setRotation(ang + Math.PI / 2);
      if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) < 28) {
        this.hitEnemy(t, b._dmg);
        b.destroy();
      }
    });

    // 怪物
    this.enemies.children.each(e => {
      if (!e.active) return;
      e.y += e._speed * dts;
      const hpY = Math.max(this.combatTop + 10, e.y - e.displayHeight * 0.55);
      e._hpBg.x = e.x; e._hpBg.y = hpY;
      e._hpFg.x = e._hpBg.x - e._hpBg.displayWidth * 0.48; e._hpFg.y = hpY;

      if (e.y >= this.wallY - 10) {
        // 撞牆扣血
        const dmg = e._isBoss ? 60 : (e._hpMax > 100 ? 25 : 10);
        this.wall.currentHP = Math.max(0, this.wall.currentHP - dmg);
        this.events.emit('wall-changed', this.wall);
        e._hpBg.destroy(); e._hpFg.destroy();
        e.destroy();
        this.cameras.main.shake(120, 0.006);
        this.enemiesRemaining--;
        this.events.emit('enemies-changed', this.enemiesRemaining, this.enemyTotal);
        if (this.wall.currentHP <= 0) this.endGame();
        else if (this.enemiesRemaining <= 0 && this.waveActive) this.completeWave();
      }
    });
  }
}
