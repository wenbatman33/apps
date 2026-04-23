// Jetpack 2D — Phaser 3
// 邏輯解析度 960x540；自適應縮放；橫向自動捲動；按住飛行。

const W = 960, H = 540;
const GROUND_Y = H - 78;     // 地面 y（玩家可達）
const CEIL_Y   = 26;         // 天花板 y（貼齊螢幕頂端）
const SCROLL_BASE = 240;     // 起始捲動速度 px/s
const SCROLL_MAX  = 520;
const THRUST  = -1200;     // 噴射推力（負＝向上）
const GRAVITY = 1100;
const VY_UP_MAX   = -640;
const VY_DOWN_MAX = 620;
const PLAYER_X = 220;

// ---------- WebAudio 音效 ----------
const SFX = (() => {
  let ctx = null;
  const ensure = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const env = (g, t, a, d, peak = 0.3) => {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  };
  return {
    coin() {
      const c = ensure(); const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(1760, t + 0.08);
      o.connect(g).connect(c.destination); env(g, t, 0.005, 0.10, 0.16);
      o.start(t); o.stop(t + 0.16);
    },
    explode() {
      const c = ensure(); const t = c.currentTime;
      const buf = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      const src = c.createBufferSource(); src.buffer = buf;
      const g = c.createGain(); src.connect(g).connect(c.destination);
      env(g, t, 0.005, 0.55, 0.55); src.start(t);
    },
    pickup() {
      const c = ensure(); const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(440, t);
      o.frequency.exponentialRampToValueAtTime(1320, t + 0.16);
      o.connect(g).connect(c.destination); env(g, t, 0.005, 0.20, 0.25);
      o.start(t); o.stop(t + 0.22);
    },
    shoot() {
      const c = ensure(); const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(700, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.18);
      o.connect(g).connect(c.destination); env(g, t, 0.003, 0.18, 0.18);
      o.start(t); o.stop(t + 0.2);
    },
    bomb() {
      this.explode();
      const c = ensure(); const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
      o.connect(g).connect(c.destination); env(g, t, 0.005, 0.4, 0.4);
      o.start(t); o.stop(t + 0.45);
    },
    thrust(on) {
      // 使用素材包提供的 jetPack.mp3，迴圈播放，淡入淡出
      const c = ensure();
      if (!this._thrAudio) {
        const a = new Audio('assets/mp3/jetPack.mp3');
        a.loop = true; a.preload = 'auto'; a.crossOrigin = 'anonymous';
        const src = c.createMediaElementSource(a);
        const g = c.createGain(); g.gain.value = 0;
        src.connect(g).connect(c.destination);
        this._thrAudio = a; this._thrGain = g; this._thrPeak = 0.55;
      }
      const a = this._thrAudio, g = this._thrGain;
      const t = c.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      if (on) {
        if (a.paused) a.play().catch(() => {});
        // 100 ms 淡入到峰值
        g.gain.linearRampToValueAtTime(this._thrPeak, t + 0.10);
      } else {
        // 200 ms 淡出後暫停
        g.gain.linearRampToValueAtTime(0, t + 0.20);
        clearTimeout(this._thrStopT);
        this._thrStopT = setTimeout(() => { if (g.gain.value < 0.01 && !a.paused) a.pause(); }, 230);
      }
    },
  };
})();

// ---------- Boot ----------
class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    const A = 'assets/image';
    // 背景：日落色（04 兩層）+ 03 雲層
    // 4 個背景包全部載入，create 時隨機挑配色
    this.load.image('bg_01_l1', `${A}/Background/01/Layer1.png`);
    this.load.image('bg_01_l2', `${A}/Background/01/Layar2.png`);
    this.load.image('bg_01_l3', `${A}/Background/01/Layer3.png`);
    this.load.image('bg_02_l1', `${A}/Background/02/Layer1.png`);
    this.load.image('bg_03_l1', `${A}/Background/03/Layer1.png`);
    this.load.image('bg_03_l2', `${A}/Background/03/Layer2.png`);
    this.load.image('bg_04_l1', `${A}/Background/04/Layer1.png`);
    this.load.image('bg_04_l2', `${A}/Background/04/Layer2.png`);
    // 邊界 / 障礙 / 平台
    this.load.image('border',   `${A}/StageAssets/Border.png`);
    this.load.image('spikeUp',  `${A}/StageAssets/Obstacle.png`);
    this.load.image('spikeStrip', `${A}/StageAssets/Obstacle2.png`);
    this.load.image('groundDecor', `${A}/StageAssets/Layer1.png`);
    this.load.image('pilar',    `${A}/StageAssets/Pilar.png`);
    this.load.image('woodBox',  `${A}/StageAssets/WoodBox.png`);
    this.load.image('woodBox2', `${A}/StageAssets/WoodBox2.png`);
    this.load.image('woodBox3', `${A}/StageAssets/WoodBox3.png`);
    // 角色
    for (let i = 1; i <= 4; i++) this.load.image(`p${i}`, `${A}/Characters/01/${i}.png`);
    // 金幣
    for (let i = 1; i <= 6; i++) this.load.image(`coin${i}`, `${A}/OtherAssets/Coin Sprite/${i}.png`);
    // 電擊
    for (let i = 1; i <= 4; i++) this.load.image(`elec${i}`, `${A}/OtherAssets/ElectricObstacle/${i}.png`);
    // 爆炸 / 煙
    for (let i = 1; i <= 5; i++) this.load.image(`exp${i}`, `${A}/OtherAssets/Explosion Sprite/${i}.png`);
    for (let i = 1; i <= 4; i++) this.load.image(`smk${i}`, `${A}/SmokeSprite/${i}.png`);
    // 敵人
    for (let i = 1; i <= 5; i++) this.load.image(`en${i}`, `${A}/OtherAssets/EnemyShoot${i}.png`);
    for (let i = 1; i <= 4; i++) this.load.image(`enDead${i}`, `${A}/OtherAssets/EnemyDead/${i}.png`);
    this.load.image('bullet1', `${A}/OtherAssets/Projectile1.png`);
    this.load.image('bullet2', `${A}/OtherAssets/Projectile2.png`);
    // 道具
    this.load.image('shieldItem', `${A}/OtherAssets/ShieldItem.png`);
    this.load.image('shieldRing', `${A}/OtherAssets/Shield.png`);
    this.load.image('magnetItem', `${A}/OtherAssets/MagnetItem.png`);
    this.load.image('magnetBuff', `${A}/OtherAssets/CharOnMagnetBuff.png`);
    this.load.image('bombItem',   `${A}/OtherAssets/BombItem.png`);
    this.load.image('healthBar',  `${A}/OtherAssets/RedBarShield.png`);
    // HUD icons
    this.load.image('hudFace',     `${A}/HUD/HudFaceScore.png`);
    this.load.image('pauseBtn',    `${A}/HUD/PauseBtn.png`);
    this.load.image('shieldBtn',   `${A}/HUD/ShieldIcon.png`);
    this.load.image('shieldBtnA',  `${A}/HUD/ShieldActiveBtn.png`);
    this.load.image('bombBtn',     `${A}/HUD/BombIcon.png`);
    this.load.image('bombBtnA',    `${A}/HUD/BombActiveBtn.png`);
    this.load.image('magnetBtn',   `${A}/HUD/MagnetIcon.png`);
    this.load.image('magnetBtnA',  `${A}/HUD/MagnetActiveBtn.png`);
  }
  create() {
    this.anims.create({ key: 'fly',  frames: [1,2,3,4].map(i => ({ key: `p${i}` })), frameRate: 14, repeat: -1 });
    this.anims.create({ key: 'coin', frames: [1,2,3,4,5,6].map(i => ({ key: `coin${i}` })), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'elec', frames: [1,2,3,4].map(i => ({ key: `elec${i}` })), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'exp',  frames: [1,2,3,4,5].map(i => ({ key: `exp${i}` })), frameRate: 18, repeat: 0 });
    this.anims.create({ key: 'smk',  frames: [1,2,3,4].map(i => ({ key: `smk${i}` })), frameRate: 18, repeat: 0 });
    this.anims.create({ key: 'enWalk', frames: [1,2,3,4,5].map(i => ({ key: `en${i}` })), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'enDead', frames: [1,2,3,4].map(i => ({ key: `enDead${i}` })), frameRate: 12, repeat: 0 });
    this.scene.start('play');
  }
}

// ---------- Play ----------
class PlayScene extends Phaser.Scene {
  constructor() { super('play'); }

  create() {
    // 隨機選一組背景配色
    const schemes = [
      { far: 'bg_04_l1', mtn: 'bg_03_l1', mtn2: 'bg_03_l2', mid: 'bg_04_l2' }, // 日落+山
      { far: 'bg_03_l1', mtn: 'bg_03_l2', mtn2: 'bg_04_l2', mid: 'bg_04_l2' }, // 黃昏
      { far: 'bg_02_l1', mtn: 'bg_04_l2', mtn2: 'bg_03_l2', mid: 'bg_03_l1' }, // 夜空
      { far: 'bg_01_l1', mtn: 'bg_01_l2', mtn2: 'bg_01_l3', mid: 'bg_01_l3' }, // 室內實驗室
    ];
    const sch = Phaser.Utils.Array.GetRandom(schemes);
    this.bgFar  = this.add.tileSprite(0, 0, W, H, sch.far ).setOrigin(0).setScrollFactor(0);
    this.bgMtn  = this.add.tileSprite(0, 0, W, H, sch.mtn ).setOrigin(0).setScrollFactor(0);
    this.bgMtn2 = this.add.tileSprite(0, 0, W, H, sch.mtn2).setOrigin(0).setScrollFactor(0);
    this.bgMid  = this.add.tileSprite(0, 0, W, H, sch.mid ).setOrigin(0).setScrollFactor(0);
    [this.bgFar, this.bgMtn, this.bgMtn2, this.bgMid].forEach(b => { b.tileScaleX = H / 600; b.tileScaleY = H / 600; });
    this.bgMtn.tilePositionY  = -110;
    this.bgMtn2.tilePositionY = -150;
    this.bgMid.tilePositionY  = -60;

    // 上邊界貼齊螢幕頂端 + 垂掛尖刺；背後加深色漸層襯底擋住天空透出的亮帶
    this.ceilBackdrop = this.add.rectangle(0, 0, W, 80, 0x1a1420).setOrigin(0, 0).setScrollFactor(0).setDepth(47);
    this.ceilFade = this.add.rectangle(0, 80, W, 30, 0x1a1420, 0.55).setOrigin(0, 0).setScrollFactor(0).setDepth(47);
    this.borderTop = this.add.tileSprite(0, 0, W, 26, 'border').setOrigin(0, 0).setScrollFactor(0).setDepth(50);
    this.ceilSpikes = this.add.tileSprite(0, 26, W, 26, 'spikeStrip').setOrigin(0, 0).setScrollFactor(0).setDepth(49);
    this.ceilSpikes.setFlipY(true); // 尖刺朝下
    // 下方：岩石裝飾帶直接從地面延伸下去（取消木邊條）
    this.groundBand = this.add.tileSprite(0, GROUND_Y, W, 130, 'groundDecor').setOrigin(0, 0).setScrollFactor(0).setDepth(48);
    this.groundBand.tileScaleX = 0.55; this.groundBand.tileScaleY = 0.55;

    // 玩家（放大讓畫質更清晰）
    this.player = this.physics.add.sprite(PLAYER_X, H / 2, 'p1').play('fly').setDepth(100);
    this.player.setScale(0.5);
    this.player.body.setSize(140, 200, true).setOffset(80, 50);
    this.player.body.setAllowGravity(false);

    // 群組
    this.coins   = this.physics.add.group();
    this.hazards = this.physics.add.group();
    this.items   = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.enemies = this.physics.add.group();

    this.physics.add.overlap(this.player, this.coins,   (_p, c) => this.collectCoin(c));
    this.physics.add.overlap(this.player, this.items,   (_p, it) => this.collectItem(it));
    this.physics.add.overlap(this.player, this.hazards, (_p, h) => this.hitHazard(h));
    this.physics.add.overlap(this.player, this.bullets, (_p, b) => this.hitBullet(b));
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.hitEnemy(e));

    // 狀態
    this.thrusting = false;
    this.vy = 0;
    this.alive = true;
    this.paused = false;
    this.distance = 0;
    this.score = 0;
    this.scrollSpeed = SCROLL_BASE;
    this.shieldUntil = 0;
    this.magnetUntil = 0;
    this.smokeTimer = 0;
    this.spawnX = W;
    this.worldX = 0;
    this.inv = { shield: 1, bomb: 1, magnet: 1 }; // 開局贈送

    // 護盾光環 / 磁鐵光環（不旋轉）
    this.shieldFx = this.add.image(0, 0, 'shieldRing').setScale(0.55).setVisible(false).setAlpha(0.85).setDepth(99);
    this.magnetFx = this.add.image(0, 0, 'magnetBuff').setScale(0.7).setVisible(false).setAlpha(0.6).setDepth(98);
    // 玩家頭上剩餘時間進度條
    this.buffBarBg = this.add.rectangle(0, 0, 60, 6, 0x000000, 0.55).setDepth(101).setVisible(false);
    this.buffBar   = this.add.rectangle(0, 0, 60, 4, 0x4caf50).setDepth(102).setVisible(false);

    // ====== HUD ======
    this.hudLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);
    // 左上：頭像 + 金幣
    const face = this.add.image(40, 40, 'hudFace').setScale(0.22);
    this.scoreTxt = this.add.text(80, 22, '0', {
      fontFamily: 'system-ui, "Microsoft JhengHei", sans-serif',
      fontSize: '32px', color: '#ffd60a', stroke: '#000', strokeThickness: 5, fontStyle: 'bold',
    });
    this.distTxt = this.add.text(80, 56, '0 m', {
      fontFamily: 'system-ui, "Microsoft JhengHei", sans-serif',
      fontSize: '16px', color: '#fff', stroke: '#000', strokeThickness: 3,
    });
    // 右上：暫停
    this.pauseImg = this.add.image(W - 40, 40, 'pauseBtn').setScale(0.22).setInteractive({ useHandCursor: true });
    this.pauseImg.on('pointerdown', () => this.togglePause());
    // 右上：AI 切換鈕
    this.aiBtn = this.add.text(W - 100, 28, 'AI', {
      fontFamily: 'system-ui, "Microsoft JhengHei", sans-serif',
      fontSize: '20px', color: '#fff', backgroundColor: '#444',
      padding: { x: 12, y: 6 }, fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.aiBtn.on('pointerdown', () => this.toggleAI());
    // AI 紀錄顯示
    this.aiBest = parseInt(localStorage.getItem('jp_ai_best') || '0', 10);
    this.aiBestTxt = this.add.text(W - 100, 60, `AI 最佳 ${this.aiBest} m`, {
      fontSize: '14px', color: '#ffd166', stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);
    // 左下：道具列
    const ITEM_Y = H - 50;
    this.itemSlots = ['shield', 'bomb', 'magnet'].map((kind, i) => {
      const x = 50 + i * 80;
      const bgKey = kind === 'shield' ? 'shieldBtn' : kind === 'bomb' ? 'bombBtn' : 'magnetBtn';
      const img = this.add.image(x, ITEM_Y, bgKey).setScale(0.22).setInteractive({ useHandCursor: true });
      const cnt = this.add.text(x + 18, ITEM_Y + 18, '0', {
        fontSize: '18px', color: '#fff', stroke: '#000', strokeThickness: 4, fontStyle: 'bold',
      }).setOrigin(0.5);
      img.on('pointerdown', () => this.useItem(kind));
      return { kind, img, cnt };
    });

    this.hudLayer.add([face, this.scoreTxt, this.distTxt, this.pauseImg, this.aiBtn, this.aiBestTxt,
      ...this.itemSlots.flatMap(s => [s.img, s.cnt])]);

    this.aiMode = !!this.registry.get('aiMode');
    if (this.aiMode) {
      this.aiBtn.setStyle({ backgroundColor: '#2a9d8f' });
      this.aiBtn.setText('AI ●');
    }

    // 輸入
    const press = (ev) => {
      if (this.paused || !this.alive) return;
      // 點 HUD 不觸發
      if (ev && ev.y !== undefined) {
        const py = ev.y * (H / this.scale.canvas.clientHeight);
        if (py < 80 || py > H - 90) return;
      }
      this.thrusting = true; SFX.thrust(true);
    };
    const release = () => { this.thrusting = false; SFX.thrust(false); };
    this.input.on('pointerdown', press);
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.keyboard.on('keydown-SPACE', () => { if (this.alive && !this.paused) { this.thrusting = true; SFX.thrust(true); } });
    this.input.keyboard.on('keyup-SPACE', release);
    this.input.keyboard.on('keydown-UP', () => { if (this.alive && !this.paused) { this.thrusting = true; SFX.thrust(true); } });
    this.input.keyboard.on('keyup-UP', release);
    // 道具熱鍵 1/2/3
    this.input.keyboard.on('keydown-ONE', () => this.useItem('shield'));
    this.input.keyboard.on('keydown-TWO', () => this.useItem('bomb'));
    this.input.keyboard.on('keydown-THREE', () => this.useItem('magnet'));
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-A', () => this.toggleAI());
    this.input.keyboard.on('keydown-R', () => { if (!this.alive) this.restartGame(); });

    // 暫停遮罩
    this.pauseLayer = this.add.container(W/2, H/2).setScrollFactor(0).setDepth(1500).setVisible(false);
    const pBg = this.add.rectangle(0, 0, W, H, 0x000000, 0.5);
    const pTxt = this.add.text(0, 0, '暫停\n（按 P 繼續）', { fontSize: '40px', color: '#fff', align: 'center' }).setOrigin(0.5);
    this.pauseLayer.add([pBg, pTxt]);

    // 結束面板
    this.gameOverGroup = this.add.container(W / 2, H / 2).setScrollFactor(0).setDepth(2000).setVisible(false);
    const panel = this.add.rectangle(0, 0, 420, 240, 0x000000, 0.78).setStrokeStyle(2, 0xffffff, 0.5);
    this.goTitle = this.add.text(0, -78, 'GAME OVER', { fontSize: '40px', color: '#ffd166', fontStyle: 'bold' }).setOrigin(0.5);
    this.goStats = this.add.text(0, -10, '', { fontSize: '22px', color: '#fff', align: 'center' }).setOrigin(0.5);
    this.goBtn = this.add.text(0, 70, '▶ 再來一局', {
      fontSize: '24px', color: '#fff', backgroundColor: '#2a9d8f', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.goBtn.on('pointerdown', () => this.restartGame());
    this.gameOverGroup.add([panel, this.goTitle, this.goStats, this.goBtn]);

    this.refreshItemHud();
  }

  // ---------- AI 模式 ----------
  toggleAI() {
    this.aiMode = !this.aiMode;
    this.registry.set('aiMode', this.aiMode);
    this.aiBtn.setStyle({ backgroundColor: this.aiMode ? '#2a9d8f' : '#444' });
    this.aiBtn.setText(this.aiMode ? 'AI ●' : 'AI');
    if (!this.aiMode) { this.thrusting = false; SFX.thrust(false); }
    // 若開啟 AI 時已死亡，立刻重啟一局
    if (this.aiMode && !this.alive) this.restartGame();
  }

  // 計算「上方避開」與「下方避開」的縱向區間集合，回傳安全縫隙列表
  aiBuildIntervals() {
    const px = this.player.x;
    const lookahead = 320;
    const intervals = [];
    const margin = 36;

    const consider = (obj) => {
      if (!obj.active || !obj.body) return;
      if (obj.x + obj.body.halfWidth < px - 20) return;
      if (obj.x - obj.body.halfWidth > px + lookahead) return;
      const top = obj.body.top - margin;
      const bot = obj.body.bottom + margin;
      intervals.push({ y1: top, y2: bot });
    };
    this.hazards.children.each(consider);
    this.enemies.children.each(consider);

    // 子彈：依速度推算到達 px 時的 y
    this.bullets.children.each(b => {
      if (!b.active || !b.body) return;
      const vx = b.body.velocity.x, vy = b.body.velocity.y;
      if (Math.abs(vx) < 1) return;
      const t = (px - b.x) / vx;
      if (t < 0 || t > 1.2) return;
      const fy = b.y + vy * t;
      intervals.push({ y1: fy - 38, y2: fy + 38 });
    });

    intervals.sort((a, b) => a.y1 - b.y1);
    const merged = [];
    for (const it of intervals) {
      if (merged.length && it.y1 <= merged[merged.length - 1].y2) {
        merged[merged.length - 1].y2 = Math.max(merged[merged.length - 1].y2, it.y2);
      } else merged.push({ ...it });
    }
    const top = CEIL_Y + 30, bot = GROUND_Y - 30;
    const gaps = [];
    let prev = top;
    for (const m of merged) {
      if (m.y1 > prev) gaps.push({ y1: prev, y2: Math.min(m.y1, bot) });
      prev = Math.max(prev, m.y2);
    }
    if (prev < bot) gaps.push({ y1: prev, y2: bot });
    return gaps.filter(g => g.y2 - g.y1 > 50);
  }

  aiDecide() {
    const py = this.player.y, px = this.player.x;
    const gaps = this.aiBuildIntervals();
    let target;
    if (gaps.length === 0) {
      target = (CEIL_Y + GROUND_Y) / 2;
    } else {
      // 選擇：最接近 py 且夠寬的縫隙中心
      let best = null;
      for (const g of gaps) {
        const size = g.y2 - g.y1;
        const mid = (g.y1 + g.y2) / 2;
        const score = -Math.abs(mid - py) + size * 0.5;
        if (!best || score > best.score) best = { mid, score, size };
      }
      target = best.mid;
    }

    // 若安全：嘗試靠近近處金幣
    let coinDy = null;
    this.coins.children.each(c => {
      if (!c.active) return;
      if (c.x < px - 10 || c.x > px + 220) return;
      const dy = c.y - py;
      // 確認金幣不會撞到危險區
      const inHazard = gaps.length && !gaps.some(g => c.y >= g.y1 && c.y <= g.y2);
      if (inHazard) return;
      if (coinDy === null || Math.abs(dy) < Math.abs(coinDy)) coinDy = dy;
    });
    if (coinDy !== null && Math.abs(target - py) < 30) target = py + coinDy;

    // 自動使用道具
    if (this.alive) {
      // 若沒有任何安全縫隙 → 投炸彈
      if (gaps.length === 0 && (this.inv.bomb || 0) > 0) this.useItem('bomb');
      // 周圍金幣很多 → 開磁鐵
      let nearCoins = 0;
      this.coins.children.each(c => {
        if (c.active && c.x > px && c.x < px + 350) nearCoins++;
      });
      if (nearCoins >= 6 && this.time.now > this.magnetUntil && (this.inv.magnet || 0) > 0) this.useItem('magnet');
      // 障礙非常密集 → 開護盾
      if (gaps.length <= 1 && this.time.now > this.shieldUntil && (this.inv.shield || 0) > 0) {
        const totalSize = gaps.reduce((s, g) => s + (g.y2 - g.y1), 0);
        if (totalSize < 140) this.useItem('shield');
      }
    }

    // 預測：若不噴 vs 噴，0.18s 後哪個更接近 target
    const T = 0.18;
    const yNoThrust = py + this.vy * T + 0.5 * GRAVITY * T * T;
    const yThrust   = py + this.vy * T + 0.5 * THRUST  * T * T;
    return Math.abs(yThrust - target) < Math.abs(yNoThrust - target);
  }

  // ---------- 暫停 ----------
  togglePause() {
    if (!this.alive) return;
    this.paused = !this.paused;
    this.pauseLayer.setVisible(this.paused);
    if (this.paused) { this.physics.world.pause(); SFX.thrust(false); }
    else this.physics.world.resume();
  }

  restartGame() { SFX.thrust(false); this.scene.restart(); }

  // ---------- 道具使用 ----------
  useItem(kind) {
    if (!this.alive || this.paused) return;
    if ((this.inv[kind] || 0) <= 0) return;
    this.inv[kind]--;
    if (kind === 'shield') {
      this.shieldUntil = this.time.now + 8000;
      SFX.pickup();
    } else if (kind === 'magnet') {
      this.magnetUntil = this.time.now + 9000;
      SFX.pickup();
    } else if (kind === 'bomb') {
      this.detonateBomb();
    }
    this.refreshItemHud();
  }

  detonateBomb() {
    SFX.bomb();
    // 全螢幕清除危險物
    [this.hazards, this.bullets, this.enemies].forEach(g => g.children.each(o => {
      if (o.x < W + 50) {
        const ex = this.add.sprite(o.x, o.y, 'exp1').setScale(0.9).play('exp').setDepth(110);
        ex.once('animationcomplete', () => ex.destroy());
        o.destroy();
      }
    }));
    this.cameras.main.flash(220, 255, 220, 120);
    this.cameras.main.shake(220, 0.01);
  }

  refreshItemHud() {
    this.itemSlots.forEach(s => {
      const n = this.inv[s.kind] || 0;
      s.cnt.setText(String(n));
      const active = (s.kind === 'shield' && this.time.now < this.shieldUntil)
                  || (s.kind === 'magnet' && this.time.now < this.magnetUntil);
      const baseKey = s.kind === 'shield' ? (active ? 'shieldBtnA' : 'shieldBtn')
                    : s.kind === 'bomb'   ? 'bombBtn'
                    : (active ? 'magnetBtnA' : 'magnetBtn');
      if (s.img.texture.key !== baseKey) s.img.setTexture(baseKey);
      s.img.setAlpha(n > 0 || active ? 1 : 0.45);
    });
  }

  // ---------- 生成 ----------
  spawnCoin(x, y) {
    const c = this.coins.create(x, y, 'coin1').play('coin');
    c.setScale(0.7); c.body.setAllowGravity(false);
  }
  spawnElectric(x, type) {
    // type: 'top' | 'bottom' | 'mid'
    const e = this.hazards.create(x, 0, 'elec1').play('elec').setDepth(60);
    e.body.setAllowGravity(false);
    if (type === 'top')      e.y = CEIL_Y + 20;
    else if (type === 'bottom') e.y = GROUND_Y - 8;
    else { e.y = Phaser.Math.Between(CEIL_Y + 80, GROUND_Y - 80); e.setAngle(90); e.body.setSize(30, 140).setOffset(58, -57); }
  }
  spawnSpikeRow(x, top) {
    const y = top ? CEIL_Y + 26 : GROUND_Y - 26;
    const s = this.hazards.create(x, y, 'spikeUp').setDepth(60);
    s.setScale(0.5);
    if (top) s.setFlipY(true);
    s.body.setAllowGravity(false);
    s.body.setSize(220, 70).setOffset(10, top ? 10 : 16);
  }
  spawnPilar(x) {
    const p = this.hazards.create(x, GROUND_Y - 60, 'pilar').setDepth(60).setOrigin(0.5, 1);
    p.setScale(0.7);
    p.body.setAllowGravity(false);
    p.body.setSize(60, 180).setOffset(38, 16);
  }
  spawnWoodBoxes(x) {
    // 隨機在中段堆 1~2 個（純裝飾，不傷害但會擋路 -> 我們設成擋路障礙）
    const kinds = ['woodBox', 'woodBox2', 'woodBox3'];
    const k = Phaser.Utils.Array.GetRandom(kinds);
    const y = Phaser.Math.Between(CEIL_Y + 80, GROUND_Y - 50);
    const b = this.hazards.create(x, y, k).setDepth(55);
    b.setScale(0.7); b.body.setAllowGravity(false);
    const tex = b.texture.getSourceImage();
    b.body.setSize(tex.width * 0.85, tex.height * 0.85).setOffset(tex.width * 0.075, tex.height * 0.075);
  }
  spawnEnemy(x) {
    const e = this.enemies.create(x, GROUND_Y - 6, 'en1').play('enWalk').setDepth(70).setOrigin(0.5, 1);
    e.setScale(0.6); e.body.setAllowGravity(false);
    e.body.setSize(50, 80).setOffset(8, 13);
    e.setData('nextShot', this.time.now + Phaser.Math.Between(700, 1500));
  }
  spawnItem(x, kind) {
    const key = kind === 'shield' ? 'shieldItem' : kind === 'bomb' ? 'bombItem' : 'magnetItem';
    const it = this.items.create(x, Phaser.Math.Between(CEIL_Y + 80, GROUND_Y - 80), key).setDepth(80);
    it.setScale(0.7); it.body.setAllowGravity(false);
    it.setData('kind', kind);
  }

  // 依距離決定可用組合的權重表
  difficultyWeights() {
    const d = this.distance;
    // 第 1 階段 (0~150m)：純金幣 + 偶爾單一上/下尖刺 + 道具
    // 第 2 階段 (150~400m)：加入單體電擊、柱子、木箱
    // 第 3 階段 (400~800m)：加入敵人、組合更密
    // 第 4 階段 (800m+)：高頻混合，敵人比例升高
    if (d < 150) {
      return [
        { k: 'coinArc',  w: 6 },
        { k: 'spikeTop', w: 1 },
        { k: 'spikeBot', w: 1 },
        { k: 'item',     w: 1 },
      ];
    }
    if (d < 400) {
      return [
        { k: 'coinArc',  w: 5 },
        { k: 'spikeTop', w: 2 },
        { k: 'spikeBot', w: 2 },
        { k: 'elec',     w: 2 },
        { k: 'pilar',    w: 1 },
        { k: 'wood',     w: 1 },
        { k: 'item',     w: 1 },
      ];
    }
    if (d < 800) {
      return [
        { k: 'coinArc',  w: 3 },
        { k: 'spikeTop', w: 2 },
        { k: 'spikeBot', w: 2 },
        { k: 'elec',     w: 3 },
        { k: 'pilar',    w: 2 },
        { k: 'wood',     w: 2 },
        { k: 'enemy',    w: 2 },
        { k: 'item',     w: 1 },
      ];
    }
    return [
      { k: 'coinArc',  w: 2 },
      { k: 'spikeTop', w: 3 },
      { k: 'spikeBot', w: 3 },
      { k: 'elec',     w: 4 },
      { k: 'pilar',    w: 3 },
      { k: 'wood',     w: 2 },
      { k: 'enemy',    w: 4 },
      { k: 'combo',    w: 3 },
      { k: 'item',     w: 1 },
    ];
  }

  pickWeighted(table) {
    const total = table.reduce((s, t) => s + t.w, 0);
    let r = Math.random() * total;
    for (const t of table) { r -= t.w; if (r <= 0) return t.k; }
    return table[0].k;
  }

  spawnPattern() {
    const kind = this.pickWeighted(this.difficultyWeights());
    switch (kind) {
      case 'coinArc': {
        const baseY = Phaser.Math.Between(CEIL_Y + 90, GROUND_Y - 90);
        const n = 8;
        for (let i = 0; i < n; i++) this.spawnCoin(this.spawnX + i * 38, baseY + Math.sin(i / (n - 1) * Math.PI) * -50);
        this.spawnX += n * 38 + 80;
        break;
      }
      case 'spikeTop':
        this.spawnSpikeRow(this.spawnX, true);
        this.spawnCoin(this.spawnX + 60, GROUND_Y - 80);
        this.spawnCoin(this.spawnX + 100, GROUND_Y - 80);
        this.spawnX += 260;
        break;
      case 'spikeBot':
        this.spawnSpikeRow(this.spawnX, false);
        this.spawnCoin(this.spawnX + 60, CEIL_Y + 80);
        this.spawnCoin(this.spawnX + 100, CEIL_Y + 80);
        this.spawnX += 260;
        break;
      case 'elec': {
        const t = Phaser.Utils.Array.GetRandom(['top', 'bottom', 'mid']);
        this.spawnElectric(this.spawnX, t);
        const safeY = t === 'top' ? GROUND_Y - 100 : t === 'bottom' ? CEIL_Y + 100 : (Math.random() < 0.5 ? CEIL_Y + 90 : GROUND_Y - 90);
        this.spawnCoin(this.spawnX + 80, safeY);
        this.spawnCoin(this.spawnX + 120, safeY);
        this.spawnX += 260;
        break;
      }
      case 'pilar':
        this.spawnPilar(this.spawnX);
        this.spawnCoin(this.spawnX + 40, CEIL_Y + 90);
        this.spawnCoin(this.spawnX + 80, CEIL_Y + 90);
        this.spawnX += 240;
        break;
      case 'wood':
        this.spawnWoodBoxes(this.spawnX);
        this.spawnX += 200;
        break;
      case 'enemy':
        this.spawnEnemy(this.spawnX);
        this.spawnX += 280;
        break;
      case 'combo': {
        // 高難度組合：上下夾擊電擊 + 中間金幣
        this.spawnElectric(this.spawnX, 'top');
        this.spawnElectric(this.spawnX, 'bottom');
        this.spawnCoin(this.spawnX + 90, H / 2);
        this.spawnCoin(this.spawnX + 130, H / 2);
        this.spawnX += 280;
        break;
      }
      case 'item': {
        const k = Phaser.Utils.Array.GetRandom(['shield', 'bomb', 'magnet']);
        this.spawnItem(this.spawnX, k);
        this.spawnX += 220;
        break;
      }
    }
  }

  // ---------- 收集/傷害 ----------
  collectCoin(c) {
    if (!c.active) return;
    c.destroy();
    this.score += 1;
    SFX.coin();
  }
  collectItem(it) {
    if (!it.active) return;
    const k = it.getData('kind');
    this.inv[k] = (this.inv[k] || 0) + 1;
    it.destroy();
    SFX.pickup();
    this.refreshItemHud();
  }
  hitHazard(h) {
    if (!this.alive) return;
    if (this.time.now < this.shieldUntil) {
      h.destroy(); this.shieldUntil = 0;
      this.cameras.main.flash(120, 200, 230, 255);
      this.refreshItemHud();
      return;
    }
    this.die();
  }
  hitBullet(b) {
    if (!this.alive) return;
    if (this.time.now < this.shieldUntil) {
      b.destroy(); this.shieldUntil = 0;
      this.cameras.main.flash(100, 200, 230, 255);
      this.refreshItemHud();
      return;
    }
    b.destroy(); this.die();
  }
  hitEnemy(e) {
    if (!this.alive || !e.active) return;
    if (this.time.now < this.shieldUntil) {
      const d = this.add.sprite(e.x, e.y, 'enDead1').setScale(0.6).setDepth(70).play('enDead');
      d.once('animationcomplete', () => d.destroy());
      e.destroy();
      this.cameras.main.flash(100, 200, 230, 255);
      return;
    }
    this.die();
  }

  die() {
    this.alive = false;
    this.thrusting = false;
    SFX.thrust(false); SFX.explode();
    const ex = this.add.sprite(this.player.x, this.player.y, 'exp1').setScale(1.4).play('exp').setDepth(200);
    ex.once('animationcomplete', () => ex.destroy());
    this.player.setVisible(false);
    this.cameras.main.shake(220, 0.012);
    let extra = '';
    if (this.aiMode) {
      const d = Math.floor(this.distance);
      if (d > this.aiBest) {
        this.aiBest = d;
        localStorage.setItem('jp_ai_best', String(d));
        extra = '\n🎉 AI 新紀錄！';
      }
      this.aiBestTxt.setText(`AI 最佳 ${this.aiBest} m`);
    }
    this.goStats.setText(`距離 ${Math.floor(this.distance)} m   金幣 ${this.score}${this.aiMode ? '  (AI)' : ''}${extra}`);
    this.gameOverGroup.setVisible(true);
    // AI 模式：1.2 秒後自動重來，持續挑戰
    if (this.aiMode) {
      this.time.delayedCall(1200, () => { if (this.aiMode) this.restartGame(); });
    }
  }

  update(_t, dt) {
    if (this.paused) return;
    const dts = dt / 1000;

    if (this.alive) {
      this.bgFar.tilePositionX  += this.scrollSpeed * 0.04 * dts;
      this.bgMtn.tilePositionX  += this.scrollSpeed * 0.10 * dts;
      this.bgMtn2.tilePositionX += this.scrollSpeed * 0.18 * dts;
      this.bgMid.tilePositionX  += this.scrollSpeed * 0.30 * dts;
      this.borderTop.tilePositionX += this.scrollSpeed * dts;
      this.ceilSpikes.tilePositionX += this.scrollSpeed * dts;
      this.groundBand.tilePositionX += this.scrollSpeed * 0.85 * dts;
    }

    if (this.alive) {
      // AI 決策覆寫 thrusting
      if (this.aiMode) {
        const want = this.aiDecide();
        if (want !== this.thrusting) {
          this.thrusting = want;
          SFX.thrust(want);
        }
      }
      this.vy += (this.thrusting ? THRUST : GRAVITY) * dts;
      this.vy = Phaser.Math.Clamp(this.vy, VY_UP_MAX, VY_DOWN_MAX);
      this.player.y += this.vy * dts;
      // 撞天花板（含尖刺裝飾條）或地面 → 死亡
      if (this.player.y < CEIL_Y + 30 || this.player.y > GROUND_Y - 8) {
        this.die();
        return;
      }
      this.player.setAngle(Phaser.Math.Clamp(this.vy * 0.05, -25, 35));

      // 噴射煙霧
      this.smokeTimer -= dt;
      if (this.thrusting && this.smokeTimer <= 0) {
        this.smokeTimer = 50;
        const s = this.add.sprite(this.player.x - 14, this.player.y + 26, 'smk1').setScale(0.18).setAlpha(0.85).setDepth(95).play('smk');
        s.once('animationcomplete', () => s.destroy());
        this.tweens.add({ targets: s, x: s.x - 80, y: s.y + 30, alpha: 0, duration: 500 });
      }

      // 距離 / 加速（緩慢）
      this.distance += this.scrollSpeed * dts / 10;
      this.scrollSpeed = Math.min(SCROLL_MAX, SCROLL_BASE + this.distance * 0.25);

      // 生成
      const dxWorld = this.scrollSpeed * dts;
      this.worldX += dxWorld;
      while (this.spawnX - this.worldX < W + 100) this.spawnPattern();

      // 移動世界物件
      const move = (obj) => { obj.x -= dxWorld; if (obj.x < -120) obj.destroy(); };
      this.coins.children.each(move);
      this.hazards.children.each(move);
      this.items.children.each(move);
      this.enemies.children.each(move);
      this.bullets.children.each((b) => { /* 子彈自走 */ if (b.x < -50 || b.x > W + 50) b.destroy(); });

      // 敵人射擊
      const now = this.time.now;
      this.enemies.children.each((e) => {
        if (!e.active) return;
        if (e.x < W && now > e.getData('nextShot')) {
          e.setData('nextShot', now + Phaser.Math.Between(1400, 2400));
          const b = this.bullets.create(e.x - 20, e.y - 50, 'bullet1');
          b.body.setAllowGravity(false);
          const angle = Math.atan2(this.player.y - (e.y - 50), this.player.x - (e.x - 20));
          const SP = 380;
          b.setVelocity(Math.cos(angle) * SP, Math.sin(angle) * SP);
          b.setRotation(angle);
          SFX.shoot();
        }
      });

      // 磁鐵：吸金幣
      if (now < this.magnetUntil) {
        this.coins.children.each((c) => {
          if (!c.active) return;
          const dx = this.player.x - c.x, dy = this.player.y - c.y;
          const d2 = dx*dx + dy*dy;
          if (d2 < 260*260) {
            const d = Math.sqrt(d2) || 1;
            const pull = 600;
            c.x += (dx / d) * pull * dts;
            c.y += (dy / d) * pull * dts;
          }
        });
      }
    }

    // 護盾 / 磁鐵光環（不旋轉，固定位置跟隨）
    const shieldOn = this.time.now < this.shieldUntil;
    this.shieldFx.setVisible(shieldOn);
    if (shieldOn) this.shieldFx.setPosition(this.player.x, this.player.y);
    const magOn = this.time.now < this.magnetUntil;
    this.magnetFx.setVisible(magOn);
    if (magOn) this.magnetFx.setPosition(this.player.x, this.player.y);

    // Buff 剩餘時間進度條（護盾優先，否則磁鐵）
    let remain = 0, total = 1, color = 0x4caf50;
    if (shieldOn) { remain = this.shieldUntil - this.time.now; total = 8000; color = 0x4cc3ff; }
    else if (magOn) { remain = this.magnetUntil - this.time.now; total = 9000; color = 0xffb84c; }
    const showBar = remain > 0;
    this.buffBarBg.setVisible(showBar);
    this.buffBar.setVisible(showBar);
    if (showBar) {
      const ratio = Phaser.Math.Clamp(remain / total, 0, 1);
      const w = 60;
      this.buffBarBg.setPosition(this.player.x, this.player.y - 60);
      this.buffBar.setPosition(this.player.x - w / 2 + (w * ratio) / 2, this.player.y - 60);
      this.buffBar.width = w * ratio;
      this.buffBar.fillColor = color;
    }

    // HUD
    this.scoreTxt.setText(String(this.score));
    this.distTxt.setText(`${Math.floor(this.distance)} m`);
    this.refreshItemHud();
  }
}

// ---------- 啟動 ----------
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: W, height: H,
  backgroundColor: '#1a1a2e',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, PlayScene],
};
window.__game = new Phaser.Game(config);
