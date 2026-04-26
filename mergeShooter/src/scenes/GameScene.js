// 主場景 — 全部 UI 用素材或 canvas 物件,沒有 DOM
import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import { Cannon } from '../entities/Cannon.js';
import { Enemy } from '../entities/Enemy.js';
import { buyCost, wallUpgradeCost, wallMaxHp, MAX_CANNON_LEVEL, getStage, stageClearReward, waveClearBonus } from '../data/stats.js';
import { loadSave, saveSave } from '../utils/SaveManager.js';

// ===== 精確座標(由 gameArea.png 988x1950 → 540x1066 像素掃描得出) =====
const SLOT_X       = [76, 154, 231, 308, 385, 462];
const FRONT_Y      = 691;     // 前線 6 砲位中心
const RESERVE_Y1   = 791;     // 備用區第 1 排
const RESERVE_Y2   = 864;     // 備用區第 2 排
const WALL_BAR_Y   = 625;     // 牆 HP 條(在前線上方)
const ENEMY_TOP    = 80;
const ENEMY_KILL_Y = 660;     // 敵人到此撞牆扣血
const BOTTOM_BAR_Y = 985;

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.save = loadSave();
    this.debug = false;

    // ----- 背景 -----
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_gameArea');
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // ----- 牆 HP 條 -----
    this.buildWallHpBar();

    // ----- 容器陣列(普通陣列,手動 step) -----
    this.cannons = [];
    this.enemies = [];
    this.bullets = [];

    // ----- 砲位 -----
    this.frontSlots   = SLOT_X.map((x, i) => ({ x, y: FRONT_Y,    type: 'front',   index: i, cannon: null }));
    this.reserveSlots = [];
    for (let r = 0; r < 2; r++) {
      const yy = r === 0 ? RESERVE_Y1 : RESERVE_Y2;
      for (let c = 0; c < 6; c++) {
        this.reserveSlots.push({ x: SLOT_X[c], y: yy, type: 'reserve', index: r * 6 + c, cannon: null });
      }
    }

    // ----- 還原存檔砲塔 -----
    for (const c of this.save.cannons) this.spawnCannon(c.level, c.slot, c.index);

    // ----- 確保前線至少有 2 隻砲塔(舊存檔 / 第一次都適用) -----
    while (this.cannons.filter(c => c.slotInfo.type === 'front').length < 2) {
      const empty = this.frontSlots.find(s => !s.cannon);
      if (!empty) break;
      this.spawnCannon(1, 'front', empty.index);
    }
    this.persist();

    // ----- 關卡狀態 -----
    this.stageIdx = this.save.currentStage;
    this.waveIdx  = this.save.currentWave;
    this.spawning = false;
    this.aliveEnemies = 0;
    this.mode = 'prep';

    // ----- UI(必須在 stageIdx 設好之後) -----
    this.buildTopBar();
    this.buildBottomBar();
    this.buildDebugLayer();

    // ----- 拖曳 -----
    this.input.on('drag', (p, obj, x, y) => {
      obj.x = x; obj.y = y; obj.setDepth(50);
      const d = Phaser.Math.Distance.Between(x, y, this.binIcon.x, this.binIcon.y);
      this.binIcon.setScale(d < 70 ? 0.55 : 0.45);
    });
    this.input.on('dragend', (p, obj) => {
      this.handleDrop(obj);
      this.binIcon.setScale(0.45);
    });

    // ----- 子彈命中 -----
    this.events.on('bullet-hit', ({ target, killed }) => {
      if (killed) this.onEnemyKilled(target);
    });

    // ----- Debug 切換(D 鍵) -----
    this.input.keyboard.on('keydown-D', () => this.toggleDebug());

    // ----- 自動存檔 -----
    this.time.addEvent({ delay: 5000, loop: true, callback: () => this.persist() });

    // ----- 進入準備階段 -----
    this.showFightButton();
  }

  // ============= UI: 牆 HP =============
  buildWallHpBar() {
    const cx = GAME_WIDTH / 2, y = WALL_BAR_Y;
    const w = GAME_WIDTH - 24, h = 50;

    this.wallBgSprite = this.add.image(cx, y, 'bg_wall').setDisplaySize(w, h).setTint(0x1a3a4a).setDepth(3);
    this.wallFgSprite = this.add.image(cx, y, 'bg_wall').setDisplaySize(w, h).setDepth(4);

    const src = this.textures.get('bg_wall').getSourceImage();
    this._wallTexW = src.width;
    this._wallTexH = src.height;

    this.refreshHpBar();
  }
  refreshHpBar() {
    const w = this.save.wall;
    const r = Math.max(0, Math.min(1, w.currentHP / w.maxHP));
    const tw = this._wallTexW, th = this._wallTexH;
    if (r <= 0) this.wallFgSprite.setCrop(0, 0, 0, th);
    else        this.wallFgSprite.setCrop(tw * (1 - r), 0, tw * r, th);
  }

  // ============= UI: 上方 =============
  buildTopBar() {
    // 黃色返回箭頭
    this.backBtn = this.add.image(45, 50, 'ui_arrow_side').setFlipX(true).setScale(0.55)
      .setDepth(41).setInteractive({ useHandCursor: true });
    this.backBtn.on('pointerup', () => { this.persist(); this.scene.start('Menu'); });

    // 圓形音效鈕
    this.soundBtn = this.add.image(45, 130, this.save.settings.sound ? 'ui_sound_on' : 'ui_sound_off')
      .setScale(0.55).setDepth(41).setInteractive({ useHandCursor: true });
    this.soundBtn.on('pointerup', () => {
      this.save.settings.sound = !this.save.settings.sound;
      this.soundBtn.setTexture(this.save.settings.sound ? 'ui_sound_on' : 'ui_sound_off');
      this.persist();
    });

    // 中央波次進度
    this.buildWaveProgress();

    // 右上金幣
    this.moneyBar = this.add.image(GAME_WIDTH - 95, 50, 'ui_money_bar').setScale(0.45).setDepth(41);
    this.moneyText = this.add.text(GAME_WIDTH - 80, 50, '', {
      fontFamily: 'PassionOne, Arial Black, Arial', fontSize: '24px', color: '#2b1c00'
    }).setOrigin(0.5).setDepth(42);
  }

  buildWaveProgress() {
    if (this._waveProg) this._waveProg.forEach(o => o.destroy());
    const stage = getStage(this.stageIdx);
    const total = stage.waves.length;
    const cur = this.waveIdx;
    const cx = GAME_WIDTH / 2, y = 52, gap = 32;
    const startX = cx - ((total - 1) * gap) / 2;
    const grp = [];
    for (let i = 0; i < total; i++) {
      const x = startX + i * gap;
      if (i === cur - 1) {
        const ring = this.add.circle(x, y, 19, 0xff7a3a).setStrokeStyle(3, 0xffffff).setDepth(41);
        const inner = this.add.circle(x, y, 14, 0xfff3d1).setDepth(42);
        const num = this.add.text(x, y, String(i + 1).padStart(2, '0'), {
          fontFamily: 'PassionOne, Arial Black, Arial', fontSize: '15px', color: '#1a1a1a'
        }).setOrigin(0.5).setDepth(43);
        grp.push(ring, inner, num);
      } else {
        const c = i < cur - 1 ? 0x6dd06d : 0x4a78c8;
        grp.push(this.add.circle(x, y, 8, c).setStrokeStyle(2, 0xffffff).setDepth(41));
      }
    }
    this._waveProg = grp;
  }

  // ============= UI: 下方 =============
  buildBottomBar() {
    const y = BOTTOM_BAR_Y;
    // 1) Upgrade 入口(yellow square btn01) — 暫為佔位
    this.upBtn = this.add.image(50, y, 'ui_btn01').setScale(0.42).setDepth(41).setInteractive({ useHandCursor: true });
    this.add.text(50, y, '↑', { fontFamily: 'PassionOne', fontSize: '32px', color: '#ffffff',
      stroke: '#5b3b00', strokeThickness: 3 }).setOrigin(0.5).setDepth(42);
    this.upBtn.on('pointerdown', () => this.upBtn.setTexture('ui_btn01_p'));
    this.upBtn.on('pointerup',   () => { this.upBtn.setTexture('ui_btn01'); this.flashMsg('Power Upgrade — 開發中'); });
    this.upBtn.on('pointerout',  () => this.upBtn.setTexture('ui_btn01'));

    // 2) Buy(purple long btn04)
    this.buyBtn = this.add.image(180, y, 'ui_btn04').setScale(0.5).setDepth(41).setInteractive({ useHandCursor: true });
    this.add.image(140, y - 2, 'gun1_idle').setScale(0.18).setDepth(42);
    this.buyTxt = this.add.text(200, y, '', {
      fontFamily: 'PassionOne, Arial Black, Arial', fontSize: '20px', color: '#ffffff',
      stroke: '#3b1a4a', strokeThickness: 3
    }).setOrigin(0.5).setDepth(42);
    this.buyBtn.on('pointerdown', () => this.buyBtn.setTexture('ui_btn04_p'));
    this.buyBtn.on('pointerup',   () => { this.buyBtn.setTexture('ui_btn04'); this.tryBuy(); });
    this.buyBtn.on('pointerout',  () => this.buyBtn.setTexture('ui_btn04'));

    // 3) Wall(green long btn02)
    this.wallBtn = this.add.image(370, y, 'ui_btn02').setScale(0.5).setDepth(41).setInteractive({ useHandCursor: true });
    this.add.image(330, y - 2, 'ui_shield').setScale(0.32).setDepth(42);
    this.wallTxt = this.add.text(390, y - 8, '', {
      fontFamily: 'PassionOne, Arial Black, Arial', fontSize: '15px', color: '#ffffff',
      stroke: '#1f4a1f', strokeThickness: 2
    }).setOrigin(0.5).setDepth(42);
    this.wallHpTxt = this.add.text(390, y + 9, '', {
      fontFamily: 'PassionOne, Arial Black, Arial', fontSize: '13px', color: '#ffffff',
      stroke: '#1f4a1f', strokeThickness: 2
    }).setOrigin(0.5).setDepth(42);
    this.wallBtn.on('pointerdown', () => this.wallBtn.setTexture('ui_btn02_p'));
    this.wallBtn.on('pointerup',   () => { this.wallBtn.setTexture('ui_btn02'); this.tryUpgradeWall(); });
    this.wallBtn.on('pointerout',  () => this.wallBtn.setTexture('ui_btn02'));

    // 4) Bin
    this.binIcon = this.add.image(GAME_WIDTH - 40, y, 'ui_bin').setScale(0.45).setDepth(41).setInteractive({ useHandCursor: true });

    this.refreshBottom();
  }

  refreshBottom() {
    this.moneyText.setText(this.fmt(this.save.gold));
    this.buyTxt.setText(`$${this.fmt(buyCost(this.save.highestUnlockedCannonLevel))}`);
    this.wallTxt.setText(`$${this.fmt(wallUpgradeCost(this.save.wall.upgradeLevel))}`);
    this.wallHpTxt.setText(`${this.save.wall.currentHP}/${this.save.wall.maxHP}`);
  }

  fmt(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'k';
    return `${n}`;
  }

  // ============= Fight 按鈕 =============
  showFightButton() {
    if (this.fightUI) this.fightUI.forEach(o => o.destroy());
    const cx = GAME_WIDTH / 2, cy = 360;
    const btn = this.add.image(cx, cy, 'ui_btn02').setScale(0.75).setDepth(35).setInteractive({ useHandCursor: true });
    const lbl = this.add.text(cx, cy - 2, 'FIGHT', {
      fontFamily: 'AlfaSlabOne, Arial Black, Arial', fontSize: '40px',
      color: '#ffffff', stroke: '#1f4a1f', strokeThickness: 5
    }).setOrigin(0.5).setDepth(36);
    btn.on('pointerdown', () => btn.setTexture('ui_btn02_p'));
    btn.on('pointerout',  () => btn.setTexture('ui_btn02'));
    btn.on('pointerup', () => {
      this.fightUI.forEach(o => o.destroy());
      this.fightUI = null;
      this.mode = 'fight';
      this.startWave();
    });
    this.fightUI = [btn, lbl];
  }

  // ============= 砲塔 / 合成 =============
  spawnCannon(level, type, idx) {
    const arr = type === 'front' ? this.frontSlots : this.reserveSlots;
    const slot = arr[idx];
    if (!slot || slot.cannon) return null;
    const c = new Cannon(this, slot.x, slot.y, level, { type, index: idx });
    slot.cannon = c;
    this.cannons.push(c);
    return c;
  }

  tryBuy() {
    const cost = buyCost(this.save.highestUnlockedCannonLevel);
    if (this.save.gold < cost) return this.flashMsg('金幣不足');
    const empty = this.reserveSlots.find(s => !s.cannon);
    if (!empty) return this.flashMsg('備用區已滿');
    this.save.gold -= cost;
    this.spawnCannon(1, 'reserve', empty.index);
    this.refreshBottom();
    this.persist();
  }

  tryUpgradeWall() {
    const cost = wallUpgradeCost(this.save.wall.upgradeLevel);
    if (this.save.gold < cost) return this.flashMsg('金幣不足');
    this.save.gold -= cost;
    this.save.wall.upgradeLevel += 1;
    this.save.wall.maxHP = wallMaxHp(this.save.wall.upgradeLevel);
    this.save.wall.currentHP = this.save.wall.maxHP;
    this.refreshBottom();
    this.refreshHpBar();
    this.persist();
  }

  handleDrop(cannon) {
    cannon.setDepth(11);
    const fromArr = cannon.slotInfo.type === 'front' ? this.frontSlots : this.reserveSlots;
    const fromSlot = fromArr[cannon.slotInfo.index];

    // 拖到垃圾桶 → 回收
    if (Phaser.Math.Distance.Between(cannon.x, cannon.y, this.binIcon.x, this.binIcon.y) < 70) {
      const refund = Math.floor(buyCost(this.save.highestUnlockedCannonLevel) * 0.5);
      this.save.gold += refund;
      fromSlot.cannon = null;
      this.cannons = this.cannons.filter(c => c !== cannon);
      cannon.destroy();
      this.refreshBottom();
      this.flashMsg(`回收 +${this.fmt(refund)}`);
      this.persist();
      return;
    }

    // 找最近格(70px 內)
    const all = [...this.frontSlots, ...this.reserveSlots];
    let best = null, bd = 70;
    for (const s of all) {
      const d = Phaser.Math.Distance.Between(cannon.x, cannon.y, s.x, s.y);
      if (d < bd) { bd = d; best = s; }
    }
    if (!best || best === fromSlot) {
      cannon.x = fromSlot.x; cannon.y = fromSlot.y;
      return;
    }

    // 目標有砲 → 合成 or 復位
    if (best.cannon) {
      if (best.cannon.level === cannon.level && cannon.level < MAX_CANNON_LEVEL) {
        const newLv = cannon.level + 1;
        fromSlot.cannon = null;
        this.cannons = this.cannons.filter(c => c !== cannon);
        cannon.destroy();
        best.cannon.setLevel(newLv);
        // 合成特效
        const fx = this.add.sprite(best.cannon.x, best.cannon.y, 'shootfx_0').setScale(1).setDepth(20);
        fx.play('shootfx');
        fx.once('animationcomplete', () => fx.destroy());
        if (newLv >= 10) this.cameras.main.shake(120, 0.005);
        if (newLv > this.save.highestUnlockedCannonLevel) {
          this.save.highestUnlockedCannonLevel = newLv;
          this.refreshBottom();
        }
        this.persist();
        return;
      }
      cannon.x = fromSlot.x; cannon.y = fromSlot.y;
      return;
    }

    // 空格 → 移過去
    fromSlot.cannon = null;
    best.cannon = cannon;
    cannon.x = best.x; cannon.y = best.y;
    cannon.slotInfo = { type: best.type, index: best.index };
    this.persist();
  }

  // ============= 波次 =============
  startWave() {
    const wave = getStage(this.stageIdx).waves[this.waveIdx - 1];
    if (!wave) return;
    this.spawning = true;
    this.aliveEnemies = 0;
    this.spawnTimer = 0;
    this.spawnQueue = [];
    this.waveKillGold = 0; // 重置本波殺敵金幣統計
    for (const sp of wave.spawns) {
      for (let i = 0; i < sp.count; i++) {
        this.spawnQueue.push({ type: sp.type, time: sp.delay + i * sp.interval });
      }
    }
    this.buildWaveProgress();
  }

  spawnEnemyByType(type) {
    const x = Phaser.Math.Between(60, GAME_WIDTH - 60);
    this.enemies.push(new Enemy(this, x, ENEMY_TOP, type, this.stageIdx, this.waveIdx));
    this.aliveEnemies += 1;
  }

  onEnemyKilled(enemy) {
    const g = enemy.getGold();
    this.save.gold += g;
    this.waveKillGold = (this.waveKillGold || 0) + g;
    this.aliveEnemies = Math.max(0, this.aliveEnemies - 1);
    this.refreshBottom();
    this.checkWaveEnd();
  }

  onEnemyReachWall(enemy) {
    this.save.wall.currentHP = Math.max(0, this.save.wall.currentHP - enemy.attack);
    enemy.die();
    this.aliveEnemies = Math.max(0, this.aliveEnemies - 1);
    this.refreshHpBar();
    this.refreshBottom();
    if (this.save.wall.currentHP <= 0) this.gameOver();
    else this.checkWaveEnd();
  }

  checkWaveEnd() {
    if (!this.spawning) return;
    if (this.spawnQueue.length > 0) return;
    if (this.aliveEnemies > 0) return;
    this.spawning = false;
    const stage = getStage(this.stageIdx);
    if (this.waveIdx >= stage.waves.length) {
      this.stageClear();
    } else {
      // Wave 結束:給 wave 獎勵 + 顯示 Wave Clean popup
      const bonus = waveClearBonus(this.stageIdx);
      const killGold = this.waveKillGold || 0;
      this.save.gold += bonus;
      this.refreshBottom();
      this.waveIdx += 1;
      this.save.currentWave = this.waveIdx;
      this.persist();
      this.mode = 'prep';
      this.buildWaveProgress();
      this.time.delayedCall(400, () => this.showWaveCleanPopup(bonus, killGold + bonus));
    }
  }

  showWaveCleanPopup(bonus, total) {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const dim = this.add.image(cx, cy, 'pop_dim').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(60).setAlpha(0.85);
    const box = this.add.image(cx, cy, 'pop_box').setScale(0.6).setDepth(61);

    // 標題 "Wave Clean" — 直接畫在 wave_cleared box 上方的小條
    const title = this.add.text(cx, cy - 200, 'Wave Clean', {
      fontFamily: 'AlfaSlabOne, Arial Black, Arial', fontSize: '32px',
      color: '#ffffff', stroke: '#3b1a00', strokeThickness: 5
    }).setOrigin(0.5).setDepth(63);

    // Coin Bonus
    const lbl1 = this.add.text(cx, cy - 90, 'Coin Bonus', {
      fontFamily: 'AlfaSlabOne, Arial Black, Arial', fontSize: '22px',
      color: '#3b1a00', stroke: '#ffe0a0', strokeThickness: 2
    }).setOrigin(0.5).setDepth(63);
    const coinBox1 = this.add.image(cx, cy - 50, 'pop_coin01').setScale(0.55).setDepth(62);
    const bonusTxt = this.add.text(cx + 15, cy - 50, this.fmt(bonus), {
      fontFamily: 'PassionOne, Arial Black, Arial', fontSize: '28px',
      color: '#3b1a00', stroke: '#ffffff', strokeThickness: 1
    }).setOrigin(0.5).setDepth(63);

    // Total Coin Earning
    const lbl2 = this.add.text(cx, cy + 20, 'Total Coin Earning', {
      fontFamily: 'AlfaSlabOne, Arial Black, Arial', fontSize: '22px',
      color: '#3b1a00', stroke: '#ffe0a0', strokeThickness: 2
    }).setOrigin(0.5).setDepth(63);
    const coinBox2 = this.add.image(cx, cy + 60, 'pop_coin01').setScale(0.55).setTint(0xffffff).setDepth(62);
    const totalTxt = this.add.text(cx + 15, cy + 60, this.fmt(total), {
      fontFamily: 'PassionOne, Arial Black, Arial', fontSize: '28px',
      color: '#3b1a00', stroke: '#ffffff', strokeThickness: 1
    }).setOrigin(0.5).setDepth(63);

    // Next Wave 按鈕
    const next = this.add.image(cx, cy + 170, 'ui_btn05').setScale(0.65).setDepth(63).setInteractive({ useHandCursor: true });
    const nextLbl = this.add.text(cx, cy + 167, 'Next Wave', {
      fontFamily: 'AlfaSlabOne, Arial Black, Arial', fontSize: '24px',
      color: '#ffffff', stroke: '#5b3b00', strokeThickness: 4
    }).setOrigin(0.5).setDepth(64);
    next.on('pointerdown', () => next.setTexture('ui_btn05_p'));
    next.on('pointerout', () => next.setTexture('ui_btn05'));
    next.on('pointerup', () => {
      [dim, box, title, lbl1, coinBox1, bonusTxt, lbl2, coinBox2, totalTxt, next, nextLbl].forEach(o => o.destroy());
      this.showFightButton();
    });
  }

  stageClear() {
    const reward = stageClearReward(this.stageIdx);
    this.save.gold += reward;
    this.stageIdx += 1;
    this.waveIdx = 1;
    this.save.currentStage = this.stageIdx;
    this.save.currentWave = 1;
    this.refreshBottom();
    this.buildWaveProgress();
    this.persist();
    this.showClearPopup(reward);
  }

  // ============= Popup =============
  showClearPopup(reward) {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const dim = this.add.image(cx, cy, 'pop_dim').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(60).setAlpha(0.85);
    const box = this.add.image(cx, cy, 'pop_box').setScale(0.55).setDepth(61);
    const coin = this.add.image(cx, cy + 30, 'pop_coin01').setScale(0.5).setDepth(62);
    const txt = this.add.text(cx, cy + 30, `+${this.fmt(reward)}`, {
      fontFamily: 'PassionOne, Arial Black, Arial', fontSize: '32px',
      color: '#ffffff', stroke: '#3b1a00', strokeThickness: 4
    }).setOrigin(0.5).setDepth(63);
    const next = this.add.image(cx, cy + 130, 'ui_btn05').setScale(0.55).setDepth(63).setInteractive({ useHandCursor: true });
    const nextLbl = this.add.text(cx, cy + 130, '下一關', {
      fontFamily: 'NotoTC, Arial', fontSize: '22px', color: '#ffffff',
      stroke: '#3b1a00', strokeThickness: 3
    }).setOrigin(0.5).setDepth(64);
    next.on('pointerdown', () => next.setTexture('ui_btn05_p'));
    next.on('pointerup', () => {
      [dim, box, coin, txt, next, nextLbl].forEach(o => o.destroy());
      this.mode = 'prep';
      this.showFightButton();
    });
  }

  gameOver() {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const dim = this.add.image(cx, cy, 'pop_dim').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(60).setAlpha(0.85);
    const box = this.add.image(cx, cy, 'pop_box').setScale(0.55).setDepth(61);
    const txt = this.add.text(cx, cy - 20, '城牆失守', {
      fontFamily: 'NotoTC, Arial', fontSize: '36px', color: '#ff7777',
      stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(63);
    const retry = this.add.image(cx, cy + 110, 'ui_btn05').setScale(0.55).setDepth(63).setInteractive({ useHandCursor: true });
    const retryLbl = this.add.text(cx, cy + 110, '重試', {
      fontFamily: 'NotoTC, Arial', fontSize: '24px', color: '#ffffff',
      stroke: '#3b1a00', strokeThickness: 3
    }).setOrigin(0.5).setDepth(64);
    retry.on('pointerup', () => {
      this.save.wall.currentHP = this.save.wall.maxHP;
      this.waveIdx = 1;
      this.save.currentWave = 1;
      this.persist();
      [dim, box, txt, retry, retryLbl].forEach(o => o.destroy());
      this.enemies.forEach(e => e.destroyAll());
      this.enemies = [];
      this.bullets.forEach(b => b.destroy());
      this.bullets = [];
      this.aliveEnemies = 0;
      this.refreshHpBar();
      this.refreshBottom();
      this.mode = 'prep';
      this.showFightButton();
    });
  }

  // ============= Helpers =============
  flashMsg(s) {
    if (this._flash) this._flash.destroy();
    this._flash = this.add.text(GAME_WIDTH / 2, BOTTOM_BAR_Y - 60, s, {
      fontFamily: 'NotoTC, Arial', fontSize: '20px', color: '#ffe060',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: this._flash, alpha: 0, y: BOTTOM_BAR_Y - 90, duration: 900,
      onComplete: () => { if (this._flash) { this._flash.destroy(); this._flash = null; } }
    });
  }

  persist() {
    this.save.cannons = this.cannons.map(c => ({
      level: c.level, slot: c.slotInfo.type, index: c.slotInfo.index
    }));
    saveSave(this.save);
  }

  // ============= Debug 圖層 =============
  buildDebugLayer() {
    this._debugObjs = [];
    // 把所有 slot 框畫出來,預設隱藏
    const all = [...this.frontSlots, ...this.reserveSlots];
    for (const s of all) {
      const r = this.add.rectangle(s.x, s.y, 70, 70, 0x00ff00, 0).setStrokeStyle(2, 0x00ff00).setDepth(99).setVisible(false);
      this._debugObjs.push(r);
    }
    // 牆碰撞線
    const line = this.add.line(0, 0, 0, ENEMY_KILL_Y, GAME_WIDTH, ENEMY_KILL_Y, 0xff0000).setLineWidth(2).setOrigin(0).setDepth(99).setVisible(false);
    this._debugObjs.push(line);
  }
  toggleDebug() {
    this.debug = !this.debug;
    this._debugObjs.forEach(o => o.setVisible(this.debug));
    this.flashMsg(`Debug: ${this.debug ? 'ON' : 'OFF'}`);
  }

  // ============= 主迴圈 =============
  update(time, delta) {
    // 1) 推進敵人
    for (const e of this.enemies) e.step(delta);
    // 2) 推進子彈
    for (const b of this.bullets) b.step(delta);
    // 清死掉的
    this.enemies = this.enemies.filter(e => e.active);
    this.bullets = this.bullets.filter(b => b.active);

    // 3) 砲塔射擊
    if (this.mode === 'fight') {
      for (const c of this.cannons) c.tryShoot(time, this.enemies);
    }

    // 4) 撞牆判定
    for (const e of this.enemies) {
      if (e.isDead) continue;
      if (e.y >= ENEMY_KILL_Y) this.onEnemyReachWall(e);
    }

    // 5) spawn 隊列
    if (this.spawning) {
      this.spawnTimer += delta;
      while (this.spawnQueue.length && this.spawnTimer >= this.spawnQueue[0].time) {
        this.spawnEnemyByType(this.spawnQueue.shift().type);
      }
      this.checkWaveEnd();
    }
  }
}
