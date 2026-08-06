/* 主遊戲場景：戰場、合成台、HUD 全部由 Phaser 繪製 */
window.TD = window.TD || {};

TD.GameScene = class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.levelId = data.level || 1;
    this.heroKeys = data.heroes || ['hector', 'paris'];
    this.level = TD.levelById(this.levelId);
    this.now = 0;
  }

  create() {
    const L = TD.LAYOUT, LV = this.level;
    this.audio = TD.audio;
    this.audio.init(); this.audio.resume();

    // ── 狀態 ──
    this.state = 'intro';           // intro | playing | paused | over
    this.timeLeft = LV.time * 1000;
    this.wallMax = 100; this.wallHp = 100;
    this.gold = LV.gold;
    this.mana = 0; this.manaMax = 100;
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.comboTimer = 0;
    this.kills = 0; this.recruits = 0;
    this.recruitCost = TD.RECRUIT_BASE;
    this.waveIdx = 0; this.pending = [];
    this.enemies = []; this.units = []; this.projs = [];
    this.auraBuff = { dmg: 0, rate: 0 }; this.auras = [];
    this.rallyUntil = 0; this.foreseeUntil = 0; this.aegisUntil = 0;
    this.hpScale = 1; this.enemyScale = 1;
    this.phaseIdx = 0; this.reversed = false;
    this.heelHintShown = false;
    this.seenTypes = new Set();
    this.fxDustOn = true;   // 腳步塵土
    this.barricades = []; this.barricadeMode = false;

    this.boon = TD.newBoonState();
    this.waveCount = 0;
    this.applyHeroPassives();

    this.fx = new TD.Fx(this);
    this.buildBackground();
    this.buildGrid();
    this.buildBench();
    this.buildHud();
    this.buildBottom();
    this.setupInput();

    // 初始三隻，讓玩家馬上能玩
    this.addUnit('archer', 1); this.addUnit('archer', 1); this.addUnit('spear', 1);

    this.waves = (LV.finale ? LV.phases[0].waves : LV.waves).map(w => ({ ...w, done: false }));
    if (LV.finale) this.phaseTimeLeft = LV.phases[0].dur * 1000;

    this.showIntro();

    // DEV 工具
    this.dev = new TD.DevTools(this);
    this.input.keyboard.on('keydown-D', () => this.dev.toggle());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
  }

  // ══════════════ 建構 ══════════════
  buildBackground() {
    const B = TD.LAYOUT.battle, LV = this.level;
    // 地圖以 cover 填滿戰場（等比放大後裁掉兩側裝飾），把空間讓給棋盤
    this.bg = this.add.image(B.x + B.w / 2, B.y + B.h / 2, LV.bg).setDepth(TD.DEPTH.BG);
    this.fitBackground();
    if (LV.tint) this.bg.setTint(LV.tint);

    // 戰場上下的面板底色
    const H0 = TD.LAYOUT.hud;
    const hudG = this.add.graphics().setDepth(TD.DEPTH.PANEL - 1);
    this.woodPanel(hudG, -30, -46, TD.GAME_W + 60, H0.h + 62, 28);
    // 文字底條：確保在木紋上依然清晰
    hudG.fillStyle(TD.PALETTE.blueDark, 0.55).fillRoundedRect(18, 24, TD.GAME_W - 36, 74, 16);
    const botG = this.add.graphics().setDepth(TD.DEPTH.PANEL - 1);
    botG.fillStyle(TD.PALETTE.blueDark, 1).fillRect(0, B.y + B.h, TD.GAME_W, TD.GAME_H - (B.y + B.h));

    // 危險暈染（HP 低時亮起）
    this.dangerVig = this.add.graphics().setDepth(TD.DEPTH.FX_TOP - 1).setAlpha(0);
    this.dangerVig.fillStyle(0xFF0000, 0.35);
    this.dangerVig.fillRect(B.x, B.y, B.w, 70);
    this.dangerVig.fillRect(B.x, B.y + B.h - 70, B.w, 70);
    this.dangerVig.fillRect(B.x, B.y, 70, B.h);
    this.dangerVig.fillRect(B.x + B.w - 70, B.y, 70, B.h);
  }

  /** 讓地圖等比 cover 戰場，超出的部分用遮罩裁掉，把空間留給棋盤 */
  fitBackground() {
    const B = TD.LAYOUT.battle;
    if (!this.bg) return;
    let sw = 1024, sh = 1024;
    try {
      const tex = this.textures.get(this.bg.texture.key);
      const src = tex && tex.getSourceImage && tex.getSourceImage();
      if (src && src.width) { sw = src.width; sh = src.height; }
    } catch (e) { /* 用預設值 */ }

    const sc = Math.max(B.w / sw, B.h / sh);
    this.bg.setPosition(B.x + B.w / 2, B.y + B.h / 2).setDisplaySize(sw * sc, sh * sc);

    try {
      if (this.bgMaskG) this.bgMaskG.destroy();
      this.bgMaskG = this.make.graphics({ add: false });
      this.bgMaskG.fillStyle(0xffffff).fillRect(B.x, B.y, B.w, B.h);
      this.bg.setMask(this.bgMaskG.createGeometryMask());
    } catch (e) { /* 遮罩失敗就讓它超出，不影響玩法 */ }
  }

  /** 戰場網格：任意空格可建塔，敵人自動繞路 */
  buildGrid() {
    this.grid = new TD.Grid(this);
    this.slots = [];       // 合成台格子；戰場格子由 grid.cells 提供
  }

  /** 立體面板：深藍底 + 大理石白描邊 + 頂部亮藍反光 */
  woodPanel(g, x, y, w, h, r = 22) {
    const P = TD.PALETTE;
    g.fillStyle(P.blueDark, 1).fillRoundedRect(x, y, w, h, r);
    g.fillStyle(P.blue, 1).fillRoundedRect(x + 5, y + 5, w - 10, h - 13, r - 4);
    g.fillStyle(P.blueLight, 0.45).fillRoundedRect(x + 5, y + 5, w - 10, (h - 13) * 0.32, r - 4);
    g.lineStyle(4, P.marble, 0.92).strokeRoundedRect(x, y, w, h, r);
  }

  /** 立體按鈕：頂部高光 / 主色面 / 底部厚邊 —— CR 那種「可以按」的實體感 */
  btn3D(g, x, y, w, h, color, opt = {}) {
    const lip = opt.lip || 8;
    const r = opt.radius || 22;
    const dark = Phaser.Display.Color.IntegerToColor(color).darken(32).color;
    g.fillStyle(dark, 1).fillRoundedRect(x, y + lip, w, h - lip, r);
    g.fillStyle(color, 1).fillRoundedRect(x, y, w, h - lip, r);
    g.fillStyle(0xFFFFFF, opt.gloss === false ? 0.14 : 0.34)
      .fillRoundedRect(x + 8, y + 5, w - 16, (h - lip) * 0.36, r - 6);
    if (opt.stroke !== false) {
      g.lineStyle(3, TD.PALETTE.marble, opt.strokeAlpha || 0.55)
        .strokeRoundedRect(x, y, w, h, r);
    }
  }

  makeSlot(type, idx, x, y, size) {
    const s = { type, idx, x, y, size, unit: null, locked: false };
    s.gfx = this.add.graphics()
      .setDepth(type === 'field' ? TD.DEPTH.SLOT : TD.DEPTH.BENCH_SLOT);
    this.drawSlot(s);
    return s;
  }

  drawSlot(s, hl = false) {
    // 戰場格子的視覺由 Grid 統一處理
    if (!s || s.type === 'field') return;
    const g = s.gfx, r = s.size * 0.44;
    g.clear();

    if (s.locked) {
      g.fillStyle(0x000000, 0.45).fillRoundedRect(s.x - r, s.y - r, r * 2, r * 2, 14);
      return;
    }
    const P = TD.PALETTE;
    g.fillStyle(P.blueDark, 0.75).fillRoundedRect(s.x - r, s.y - r, r * 2, r * 2, 16);
    g.fillStyle(0x0B2140, 0.55).fillRoundedRect(s.x - r + 4, s.y - r + 4, r * 2 - 8, r * 2 - 8, 13);
    g.lineStyle(hl ? 6 : 2, hl ? P.gold : P.blueLight, hl ? 1 : 0.55)
      .strokeRoundedRect(s.x - r, s.y - r, r * 2, r * 2, 16);
    if (hl) g.fillStyle(P.gold, 0.24).fillRoundedRect(s.x - r, s.y - r, r * 2, r * 2, 16);
  }

  buildBench() {
    const B = TD.LAYOUT.bench;
    const w = B.cols * B.cell + (B.cols - 1) * B.gap;
    const h = B.rows * B.cell + (B.rows - 1) * B.gap;
    this.benchPanel = this.add.graphics().setDepth(TD.DEPTH.PANEL);
    this.woodPanel(this.benchPanel, B.x - 12, B.y - 12, w + 24, h + 24, 18);

    for (let r = 0; r < B.rows; r++) {
      for (let c = 0; c < B.cols; c++) {
        const x = B.x + B.cell / 2 + c * (B.cell + B.gap);
        const y = B.y + B.cell / 2 + r * (B.cell + B.gap);
        this.slots.push(this.makeSlot('bench', r * B.cols + c, x, y, B.cell));
      }
    }
  }

  buildHud() {
    const H = TD.LAYOUT.hud;
    const mk = (x, y, txt, size, color, origin = 0) =>
      this.add.text(x, y, txt, {
        fontFamily: TD.FONT, fontSize: `${size}px`, color,
        stroke: TD.STROKE, strokeThickness: 6,
      }).setOrigin(origin, 0).setDepth(TD.DEPTH.HUD);

    this.txtLevel = mk(H.levelX, H.levelY, '', H.levelSize, TD.CSS.ivory);
    this.txtTimer = mk(H.timerX, H.timerY, '', H.timerSize, TD.CSS.ivory, 0.5);
    this.txtScore = mk(H.scoreX, H.scoreY, '', H.scoreSize, TD.CSS.gold, 1);

    this.hpGfx = this.add.graphics().setDepth(TD.DEPTH.HUD);
    this.txtWaveInfo = mk(40, H.hpBarY + 34, '', 24, '#C9A87C');

    // 波次條
    const WB = TD.LAYOUT.waveBar;
    this.waveGfx = this.add.graphics().setDepth(TD.DEPTH.HUD);

    // 音量開關
    this.buildSoundBtn();

    // 英雄技能鈕
    this.heroBtns = this.heroKeys.map((hk, i) => this.makeHeroBtn(hk, i));
  }

  buildSoundBtn() {
    const x = 74, y = TD.LAYOUT.battle.y + 62;
    const g = this.add.graphics().setDepth(TD.DEPTH.HUD);
    const t = this.add.text(x, y, '', { fontSize: '40px' }).setOrigin(0.5).setDepth(TD.DEPTH.HUD + 1);
    const draw = () => {
      const on = TD.save.data.sound !== false;
      g.clear();
      g.fillStyle(0x3A2416, 0.62).fillCircle(x, y, 40);
      g.lineStyle(4, on ? 0xFFC72C : 0x9B8468, 0.95).strokeCircle(x, y, 40);
      t.setText(on ? '🔊' : '🔇');
    };
    draw();
    TD.audio.setEnabled(TD.save.data.sound !== false);
    const z = this.add.zone(x, y, 92, 92).setInteractive({ useHandCursor: true })
      .setDepth(TD.DEPTH.HUD + 2);
    z.on('pointerdown', () => {
      const on = TD.save.data.sound === false;      // 切換後的狀態
      TD.save.data.sound = on;
      TD.save.flush();
      TD.audio.setEnabled(on);
      draw();
    });
    this.soundBtn = { g, t, z, draw };
  }

  makeHeroBtn(heroKey, i) {
    const HERO = TD.HEROES[heroKey];
    const x = TD.GAME_W - 92, y = TD.LAYOUT.battle.y + 96 + i * 168;
    const c = this.add.container(x, y).setDepth(TD.DEPTH.HUD);

    const ring = this.add.graphics();
    ring.fillStyle(TD.PALETTE.blueDark, 1).fillCircle(0, 7, 66);
    ring.fillStyle(TD.PALETTE.blue, 1).fillCircle(0, 0, 66);
    ring.fillStyle(TD.PALETTE.blueLight, 0.40).fillEllipse(0, -26, 102, 48);
    ring.lineStyle(6, HERO.color, 1).strokeCircle(0, 0, 66);
    ring.lineStyle(3, TD.PALETTE.marble, 0.85).strokeCircle(0, 0, 71);

    const img = this.add.image(0, -4, HERO.tex).setDisplaySize(112, 112);
    const mask = this.make.graphics().fillCircle(x, y - 4, 56);
    img.setMask(mask.createGeometryMask());

    const cdArc = this.add.graphics();
    const plate = this.add.graphics();
    plate.fillStyle(TD.PALETTE.blueDark, 0.94).fillRoundedRect(-64, 64, 128, 34, 12);
    plate.lineStyle(2, TD.PALETTE.marble, 0.8).strokeRoundedRect(-64, 64, 128, 34, 12);
    const label = this.add.text(0, 80, HERO.skill.name, {
      fontFamily: TD.FONT, fontSize: '21px', color: '#FFF6E0',
    }).setOrigin(0.5);

    c.add([ring, img, cdArc, plate, label]);
    const hz = this.add.zone(x, y, 150, 150).setInteractive({ useHandCursor: true })
      .setDepth(TD.DEPTH.HUD + 1);
    hz.on('pointerdown', () => this.useHeroSkill(heroKey));

    return { key: heroKey, c, cdArc, ready: 0, img };
  }

  buildBottom() {
    const BT = TD.LAYOUT.bottom;
    const panel = this.add.graphics().setDepth(TD.DEPTH.PANEL);
    this.woodPanel(panel, -30, BT.y - 66, TD.GAME_W + 60, TD.GAME_H - BT.y + 110, 24);

    // 金幣
    this.coinIcon = this.add.image(BT.coinX - 56, BT.y, 'U_coin')
      .setDisplaySize(52, 52).setDepth(TD.DEPTH.HUD);
    this.txtGold = this.add.text(BT.coinX - 22, BT.y, '0', {
      fontFamily: TD.FONT, fontSize: `${BT.coinSize}px`, color: TD.CSS.gold,
    }).setOrigin(0, 0.5).setDepth(TD.DEPTH.HUD);

    // 徵兵鈕
    this.recruitBtn = this.add.container(BT.recruitX, BT.y).setDepth(TD.DEPTH.HUD);
    this.recruitBg = this.add.graphics();
    this.txtRecruit = this.add.text(0, -14, '徵兵', {
      fontFamily: TD.FONT, fontSize: '40px', color: '#5E3A18',
    }).setOrigin(0.5);
    this.txtRecruitCost = this.add.text(0, 26, '', {
      fontFamily: TD.FONT, fontSize: '26px', color: '#7A4A1C',
    }).setOrigin(0.5);
    this.recruitBtn.add([this.recruitBg, this.txtRecruit, this.txtRecruitCost]);
    this.recruitZone = this.add.zone(BT.recruitX, BT.y, BT.recruitW, BT.recruitH)
      .setInteractive({ useHandCursor: true }).setDepth(TD.DEPTH.HUD + 1);
    this.recruitZone.on('pointerdown', () => this.doRecruit());
    this.drawRecruit();

    // 路障鈕
    this.barBtn = this.add.container(BT.barricadeX || 300, BT.y).setDepth(TD.DEPTH.HUD);
    this.barBg = this.add.graphics();
    this.txtBar = this.add.text(0, -12, '🧱 路障', {
      fontFamily: TD.FONT, fontSize: '30px', color: '#4A2E12',
    }).setOrigin(0.5);
    this.txtBarCost = this.add.text(0, 24, '', {
      fontFamily: TD.FONT, fontSize: '22px', color: '#6B4423',
    }).setOrigin(0.5);
    this.barBtn.add([this.barBg, this.txtBar, this.txtBarCost]);
    this.barZone = this.add.zone(BT.barricadeX || 300, BT.y, 200, BT.recruitH)
      .setInteractive({ useHandCursor: true }).setDepth(TD.DEPTH.HUD + 1);
    this.barZone.on('pointerdown', () => this.toggleBarricadeMode());
    this.drawBarricadeBtn();

    // 提前召喚鈕
    this.rushBtn = this.add.container(BT.skillX, BT.y).setDepth(TD.DEPTH.HUD);
    const rg = this.add.graphics();
    rg.fillStyle(0xB03A2E, 1).fillCircle(0, 7, BT.skillR);
    rg.fillStyle(0xE74C3C, 1).fillCircle(0, 0, BT.skillR);
    rg.fillStyle(0xFFFFFF, 0.30).fillEllipse(0, -BT.skillR * 0.40, BT.skillR * 1.15, BT.skillR * 0.58);
    rg.lineStyle(4, TD.PALETTE.marble, 0.9).strokeCircle(0, 0, BT.skillR);
    const rt = this.add.text(0, 0, '⏩', { fontSize: '48px' }).setOrigin(0.5);
    this.rushBtn.add([rg, rt]);
    this.rushZone = this.add.zone(BT.skillX, BT.y, BT.skillR * 2.2, BT.skillR * 2.2)
      .setInteractive({ useHandCursor: true }).setDepth(TD.DEPTH.HUD + 1);
    this.rushZone.on('pointerdown', () => this.rushWave());
  }

  drawRecruit() {
    const BT = TD.LAYOUT.bottom;
    const can = this.gold >= this.recruitCost && this.freeSlot();
    this.recruitBg.clear();
    this.recruitBg.fillStyle(can ? 0xFFC72C : 0xA6743C, 1)
      .fillRoundedRect(-BT.recruitW / 2, -BT.recruitH / 2, BT.recruitW, BT.recruitH, 16);
    this.recruitBg.lineStyle(4, can ? 0xFFF0A8 : 0x8B5A2B, 1)
      .strokeRoundedRect(-BT.recruitW / 2, -BT.recruitH / 2, BT.recruitW, BT.recruitH, 16);
    this.txtRecruitCost.setText(`💰 ${this.recruitCost}`);
    this.txtRecruit.setColor(can ? '#4A3308' : '#C4CCD4');
  }

  /** DEV 工具改動 LAYOUT 後即時重建版面 */
  relayout() {
    const L = TD.LAYOUT, B = L.battle;

    // 戰場地圖與網格
    this.fitBackground();
    this.grid.redraw();

    // 合成台重建（戰場單位不動，只跟著格子座標走）
    const keepBench = [];
    this.slots.forEach(s => { if (s.unit) keepBench.push(s.unit); s.gfx.destroy(); });
    this.slots = [];

    const BN = L.bench;
    for (let r = 0; r < BN.rows; r++) {
      for (let c = 0; c < BN.cols; c++) {
        const x = BN.x + BN.cell / 2 + c * (BN.cell + BN.gap);
        const y = BN.y + BN.cell / 2 + r * (BN.cell + BN.gap);
        this.slots.push(this.makeSlot('bench', r * BN.cols + c, x, y, BN.cell));
      }
    }

    const bw = BN.cols * BN.cell + (BN.cols - 1) * BN.gap;
    const bh = BN.rows * BN.cell + (BN.rows - 1) * BN.gap;
    this.benchPanel.clear();
    this.woodPanel(this.benchPanel, BN.x - 12, BN.y - 12, bw + 24, bh + 24, 18);

    keepBench.forEach(u => {
      u.slot = null;
      const s = this.slots.find(x => !x.unit);
      if (s) { u.baseSize = TD.LAYOUT.bench.cell; u.refresh(); u.moveToSlot(s, false); }
      else { this.units = this.units.filter(x => x !== u); u.destroy(); }
    });

    // 戰場上的塔跟著新格子座標
    this.units.filter(u => u.onField).forEach(u => {
      u.baseSize = TD.LAYOUT.bench.cell;
      u.refresh();
      u.x = u.slot.x; u.y = u.slot.y;
      u.applySlotScale();
    });

    // HUD / 底部
    const H = L.hud, BT = L.bottom;
    this.txtLevel.setPosition(H.levelX, H.levelY).setFontSize(H.levelSize);
    this.txtTimer.setPosition(H.timerX, H.timerY).setFontSize(H.timerSize);
    this.txtScore.setPosition(H.scoreX, H.scoreY).setFontSize(H.scoreSize);
    this.txtWaveInfo.setPosition(40, H.hpBarY + 34);
    this.coinIcon.setPosition(BT.coinX - 56, BT.y);
    this.txtGold.setPosition(BT.coinX - 22, BT.y);
    this.recruitBtn.setPosition(BT.recruitX, BT.y);
    this.recruitZone.setPosition(BT.recruitX, BT.y).setSize(BT.recruitW, BT.recruitH);
    this.rushBtn.setPosition(BT.skillX, BT.y);
    this.rushZone.setPosition(BT.skillX, BT.y);
    this.drawRecruit();
    this.recomputeAura();
  }

  /** 網格內容變動：重算示意路徑與所有敵人的路線 */
  onGridChanged() {
    this.grid.recomputeMainPath();
    this.enemies.forEach(e => e.repath());
  }

  // ══════════════ 路障：把敵人導去你要的路線 ══════════════
  drawBarricadeBtn() {
    const BT = TD.LAYOUT.bottom;
    const n = this.barricades.length;
    const cost = TD.barricadeCost(n);
    const full = n >= TD.BARRICADE.max;
    const can = !full && this.gold >= cost;
    const on = this.barricadeMode;
    const W = 200, H = BT.recruitH;
    const g = this.barBg;
    g.clear();
    const base = on ? TD.PALETTE.ok : (can ? TD.PALETTE.blueLight : 0x6E7C8A);
    this.btn3D(g, -W / 2, -H / 2, W, H, base,
               { gloss: can || on, strokeAlpha: on ? 1 : 0.55 });
    this.txtBar.setText(on ? '🧱 放置中' : '🧱 路障');
    this.txtBarCost.setText(full ? `已達上限 ${TD.BARRICADE.max}` : `💰 ${cost}　剩 ${TD.BARRICADE.max - n}`);
  }

  toggleBarricadeMode() {
    if (this.state !== 'playing') return;
    this.barricadeMode = !this.barricadeMode;
    if (this.barricadeMode) {
      this.closeTowerPanel();
      this.grid.drawGrid(true);
      this.floatLabel(TD.GAME_W / 2, TD.LAYOUT.battle.y + TD.LAYOUT.battle.h * 0.5,
        '點戰場空格放置路障\n路障只擋路、不會攻擊\n再按一次按鈕結束', '#8CE99A', 32, 2600);
    } else {
      this.grid.clearHighlight();
    }
    this.audio.place();
    this.drawBarricadeBtn();
  }

  placeBarricade(cell) {
    const n = this.barricades.length;
    const cost = TD.barricadeCost(n);
    if (n >= TD.BARRICADE.max) {
      this.audio.deny();
      this.floatLabel(cell.x, cell.y - 60, `路障已達上限 ${TD.BARRICADE.max}`, '#FF6B6B', 28);
      return;
    }
    if (this.gold < cost) {
      this.audio.deny();
      this.floatLabel(cell.x, cell.y - 60, '金幣不足', '#FF6B6B', 30);
      return;
    }
    if (!this.grid.buildable(cell) || cell.isWall) {
      this.audio.deny();
      this.floatLabel(cell.x, cell.y - 60, '這格不能放', '#FF6B6B', 28);
      return;
    }
    if (this.grid.wouldSealOff(cell)) {
      this.audio.deny();
      this.fx.ring(cell.x, cell.y, 130, 0xFF4D4D, 300);
      this.floatLabel(cell.x, cell.y - 70, '不能完全封死通路', '#FF6B6B', 30);
      return;
    }

    this.gold -= cost;
    const size = this.grid.cellW * 0.94;
    let img;
    if (this.textures.exists('U_barricade')) {
      img = this.add.image(cell.x, cell.y, 'U_barricade').setDisplaySize(size, size);
    } else {
      img = this.add.rectangle(cell.x, cell.y, size * 0.8, size * 0.8, 0x8B5A2B)
        .setStrokeStyle(4, 0x4A2E12);
    }
    img.setDepth(TD.DEPTH.TOWER + cell.y / 1000);
    cell.barricade = img;
    this.barricades.push({ cell, img });

    img.setScale(img.scaleX * 0.4);
    this.tweens.add({ targets: img, scaleX: img.scaleX / 0.4, scaleY: img.scaleY / 0.4,
                      duration: 220, ease: 'Back.easeOut' });
    this.fx.ring(cell.x, cell.y, 110, 0x9FD3FF, 280);
    this.audio.place();
    this.onGridChanged();
    this.drawBarricadeBtn();
    this.drawRecruit();
  }

  removeBarricade(cell) {
    const i = this.barricades.findIndex(b => b.cell === cell);
    if (i < 0) return;
    const back = Math.round(TD.barricadeCost(i) * TD.BARRICADE.sellRate);
    this.gold += back;
    this.barricades[i].img.destroy();
    this.barricades.splice(i, 1);
    cell.barricade = null;
    this.fx.coin(cell.x, cell.y, back);
    this.floatLabel(cell.x, cell.y - 60, `+${back}`, '#FFC72C', 30);
    this.audio.coin();
    this.onGridChanged();
    this.drawBarricadeBtn();
    this.drawRecruit();
  }

  // ══════════════ 輸入與拖曳（自製，不依賴 Phaser 的 Container hit test）══════════════
  setupInput() {
    this.input.on('pointerdown', (p) => {
      if (this.state !== 'playing' || this.dragging) return;

      // 路障放置模式
      if (this.barricadeMode) {
        const cell = this.grid.xyToCell(p.worldX, p.worldY);
        if (cell) {
          if (cell.barricade) this.removeBarricade(cell);
          else this.placeBarricade(cell);
          return;
        }
      }
      // 非放置模式下，點既有路障可拆除退款
      const bc = this.grid.xyToCell(p.worldX, p.worldY);
      if (bc && bc.barricade) { this.removeBarricade(bc); return; }

      if (this.towerPanel && !this.panelHit(p.worldX, p.worldY)) this.closeTowerPanel();
      // 先看是不是點在「弱點顯露中的 BOSS」身上
      if (this.tapBoss(p.worldX, p.worldY)) return;
      const u = this.unitAt(p.worldX, p.worldY);
      if (!u) return;
      this.tweens.killTweensOf(u);      // 停掉進場/歸位動畫，否則會蓋掉拖曳位置
      this.dragging = u;
      this.dragDX = u.x - p.worldX;
      this.dragDY = u.y - p.worldY;
      this.dragMoved = false;
      u.setDepth(TD.DEPTH.DRAG);
      u.setScale(u.baseScale * 1.14);
      this.highlightTargets(u);
      this.audio.place();
    });

    this.input.on('pointermove', (p) => {
      if (this.barricadeMode && !this.dragging) {
        const cell = this.grid.xyToCell(p.worldX, p.worldY);
        this.grid.highlight(cell, null);
        return;
      }
      const u = this.dragging;
      if (!u) return;
      u.x = p.worldX + this.dragDX;
      u.y = p.worldY + this.dragDY;
      if (Math.abs(this.dragDX) > 0 || true) this.dragMoved = true;

      const slot = this.slotAt(u.x, u.y, u);
      if (slot !== this._hoverSlot) {
        if (this._hoverSlot && this._hoverSlot.type !== 'field') this.drawSlot(this._hoverSlot, false);
        this._hoverSlot = slot;
        if (slot && slot.type !== 'field') this.drawSlot(slot, true);
      }
      this.grid.highlight(slot && slot.type === 'field' ? slot : null, u);
    });

    const drop = (p) => {
      const u = this.dragging;
      if (!u) return;
      this.dragging = null;
      this.clearHighlights();
      u.setScale(u.baseScale);
      u.setDepth(u.onField ? TD.DEPTH.TOWER : TD.DEPTH.UNIT);
      // 用放開時的指標位置判定落點，最可靠
      const dx = p.worldX + this.dragDX, dy = p.worldY + this.dragDY;
      const moved = Phaser.Math.Distance.Between(dx, dy, u.slot.x, u.slot.y) > 16;
      if (!moved) {
        u.moveToSlot(u.slot, false);
        if (u.onField) this.openTowerPanel(u); else this.showUnitInfo(u);
        return;
      }
      this.resolveDrop(u, this.slotAt(dx, dy, u));
    };
    this.input.on('pointerup', drop);
    this.input.on('pointerupoutside', drop);
  }

  /** 點擊弱點顯露中的 BOSS */
  tapBoss(x, y) {
    for (const e of this.enemies) {
      if (!e.def.heelTapPct || !e.active) continue;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) > e.bodyW * 1.6) continue;
      if (e.tapHeel()) return true;
    }
    return false;
  }

  /** 用座標找最近的單位（命中範圍放寬，手機好操作） */
  unitAt(x, y) {
    let best = null, bd = Infinity;
    for (const u of this.units) {
      if (!u.slot) continue;
      const fp = u.footprint || 1;
      const size = u.slot.type === 'field' ? this.grid.cellW * fp : TD.LAYOUT.bench.cell;
      const r = size * 0.56;
      const d = Phaser.Math.Distance.Squared(x, y, u.x, u.y);
      if (d < bd && d < r * r) { bd = d; best = u; }
    }
    return best;
  }

  highlightTargets(unit) {
    this.slots.forEach(s => {
      if (s.locked) return;
      if (s.unit && s.unit !== unit && this.canCombine(unit, s.unit)) this.drawSlot(s, true);
    });
    this.grid.drawGrid(true);
  }

  clearHighlights() {
    this.slots.forEach(s => this.drawSlot(s, false));
    this.grid.clearHighlight();
    this._hoverSlot = null;
  }

  canCombine(a, b) {
    if (!a || !b) return false;
    if (a.kind === b.kind && a.lv === b.lv && a.lv < TD.MAX_LV && !TD.isFused(a.kind)) return true;
    return !!TD.findFusion(a.kind, a.lv, b.kind, b.lv);
  }

  resolveDrop(unit, slot) {
    const home = unit.slot;
    if (!slot || slot.locked) { unit.moveToSlot(home); return; }
    if (slot === home) { unit.moveToSlot(home); return; }

    const other = slot.unit;
    const touchesField = slot.type === 'field' || home.type === 'field';

    if (!other) {
      // 放到戰場空格：檢查是否可建、以及會不會把路完全封死
      if (slot.type === 'field') {
        if (!this.grid.buildable(slot)) {
          this.audio.deny();
          this.floatLabel(slot.x, slot.y - 60, '這格不能建塔', '#FF6B6B', 30);
          unit.moveToSlot(home); return;
        }
        if (this.grid.wouldSealOffCell(slot)) {
          this.audio.deny();
          this.fx.ring(slot.x, slot.y, 140, 0xFF4D4D, 320);
          this.floatLabel(slot.x, slot.y - 70, '不能完全封死通路', '#FF6B6B', 32);
          unit.moveToSlot(home); return;
        }
      }
      unit.moveToSlot(slot);
      this.audio.place();
      if (touchesField) this.onGridChanged();
      this.afterBoardChange();
      return;
    }

    // 合成
    if (this.canCombine(unit, other)) { this.doCombine(unit, other, slot); return; }

    // 交換（戰場↔戰場、戰場↔合成台都允許）
    other.moveToSlot(home);
    unit.moveToSlot(slot);
    this.audio.place();
    if (touchesField) this.onGridChanged();
    this.afterBoardChange();
  }

  doCombine(a, b, slot) {
    const fusion = TD.findFusion(a.kind, a.lv, b.kind, b.lv);
    const isFusion = !!fusion && a.kind !== b.kind;

    a.slot.unit = null;
    this.units = this.units.filter(u => u !== a);
    a.destroy();

    if (isFusion) {
      b.upgradeTo(fusion.out, 1);
      this.fx.mergeBurst(slot.x, slot.y, TD.getKind(fusion.out).tint);
      this.fx.flash(0xFFC72C, 120, 0.22);
      this.audio.fuse();
      this.floatLabel(slot.x, slot.y - 90, `融合！${TD.getKind(fusion.out).name}`, '#FFE066', 46);
      this.addScore(500);
    } else {
      const nlv = b.lv + 1;
      b.upgradeTo(b.kind, nlv);
      this.fx.mergeBurst(slot.x, slot.y, TD.getKind(b.kind).tint);
      this.audio.merge(nlv);
      this.floatLabel(slot.x, slot.y - 80, `Lv.${nlv} ${TD.nameOf(b.kind, nlv)}`, '#FFF6E0', 34);
      this.addScore(60 * nlv);
      if (nlv >= 5) this.fx.flash(TD.getKind(b.kind).tint, 100, 0.18);
    }
    this.afterBoardChange();
  }

  afterBoardChange() {
    this.recomputeAura();
    this.drawRecruit();
  }

  slotAt(x, y, unit) {
    // 先看合成台
    let best = null, bd = 1e9;
    for (const s of this.slots) {
      const d = Phaser.Math.Distance.Squared(x, y, s.x, s.y);
      if (d < bd && d < (s.size * 0.62) ** 2) { bd = d; best = s; }
    }
    if (best) return best;
    // 再看戰場格子；2×2 單位要吸附成合法的左上角
    let cell = this.grid.xyToCell(x, y);
    if (!cell) return null;
    cell = this.grid.mainCell(cell);
    const fp = unit ? (unit.footprint || 1) : 1;
    if (fp > 1) cell = this.grid.anchorFor(cell, fp);
    return cell;
  }

  freeSlot() { return this.slots.find(s => s.type === 'bench' && !s.unit && !s.locked); }

  // ══════════════ 單位 ══════════════
  addUnit(kind, lv, slot = null) {
    const s = slot || this.freeSlot();
    if (!s) return null;
    const u = new TD.Unit(this, kind, lv);
    u.moveToSlot(s, false);
    this.units.push(u);
    this.afterBoardChange();
    return u;
  }

  doRecruit() {
    if (this.state !== 'playing') return;
    if (this.gold < this.recruitCost) { this.audio.deny(); this.shakeBtn(this.recruitBtn); return; }
    if (!this.freeSlot()) {
      this.audio.deny(); this.shakeBtn(this.recruitBtn);
      this.floatLabel(TD.LAYOUT.bottom.recruitX, TD.LAYOUT.bottom.y - 90, '合成台已滿', '#FF4D4D', 34);
      return;
    }
    this.gold -= this.recruitCost;
    this.recruits++;
    this.applyBoonSideEffects();
    const pool = TD.RECRUIT_POOL;
    const kind = pool[Phaser.Math.Between(0, pool.length - 1)];
    const lv2p = Math.min(0.35, 0.04 * this.levelId) + (this.boon.luckyLv2 || 0);
    const lv = Math.random() < lv2p ? 2 : 1;
    const u = this.addUnit(kind, lv);
    if (u) {
      u.setScale(0.2);
      this.tweens.add({ targets: u, scaleX: u.baseScale, scaleY: u.baseScale,
        duration: 260, ease: 'Back.Out' });
      this.fx.mergeBurst(u.x, u.y, TD.getKind(kind).tint);
    }
    this.audio.coin();
    this.drawRecruit();
  }

  shakeBtn(btn) {
    this.tweens.add({ targets: btn, x: btn.x + 8, duration: 45, yoyo: true, repeat: 3 });
  }

  showUnitInfo(u) {
    const st = u.stats, K = TD.getKind(u.kind);
    const lines = [`${TD.nameOf(u.kind, u.lv)}  Lv.${u.lv}`];
    if (st.dmg) lines.push(`傷害 ${st.dmg}   射速 ${(1000 / st.cd).toFixed(1)}/s`);
    if (st.range) lines.push(`射程 ${st.range}`);
    if (st.buff) lines.push(`光環增傷 +${Math.round(st.buff * 100)}%`);
    if (st.burn) lines.push(`燃燒 ${st.burn}/s`);
    lines.push(K.desc);
    this.floatLabel(u.x, u.y - u.baseSize * 0.6, lines.join('\n'), '#FFF6E0', 26, 1600);

    // 射程圈
    if (u.onField && st.range) {
      const g = this.add.graphics().setDepth(TD.DEPTH.FX);
      g.lineStyle(3, K.tint, 0.6).strokeCircle(u.x, u.y, st.range);
      g.fillStyle(K.tint, 0.06).fillCircle(u.x, u.y, st.range);
      this.tweens.add({ targets: g, alpha: 0, duration: 1400, onComplete: () => g.destroy() });
    }
  }

  // ══════════════ 塔操作面板 ══════════════
  panelHit(x, y) {
    const r = this.panelRect;
    return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  openTowerPanel(u) {
    this.closeTowerPanel();
    this.panelUnit = u;
    const W = 1000, H = 250, X = (TD.GAME_W - W) / 2, Y = TD.LAYOUT.battle.y + TD.LAYOUT.battle.h - H - 16;
    this.panelRect = { x: X, y: Y, w: W, h: H };

    const c = this.add.container(0, 0).setDepth(TD.DEPTH.BANNER);
    this.towerPanel = c;

    const g = this.add.graphics();
    this.woodPanel(g, X, Y, W, H, 22);
    c.add(g);

    // 射程圈
    const st = u.stats, K = TD.getKind(u.kind);
    const ring = this.add.graphics().setDepth(TD.DEPTH.FX);
    if (st.range) {
      ring.lineStyle(4, K.tint, 0.75).strokeCircle(u.x, u.y, st.range);
      ring.fillStyle(K.tint, 0.10).fillCircle(u.x, u.y, st.range);
    }
    c.add(ring);
    const mark = this.add.graphics();
    mark.lineStyle(5, 0xFFE066, 1).strokeCircle(u.x, u.y, this.grid.cellW * 0.52);
    c.add(mark);

    // 資訊
    c.add(this.add.text(X + 26, Y + 20, `${TD.nameOf(u.kind, u.lv)}  Lv.${u.lv}`, {
      fontFamily: TD.FONT, fontSize: '38px', color: '#FFF6E0', stroke: '#4A2E12', strokeThickness: 5,
    }));
    if (st.isGiant) {
      c.add(this.add.text(X + W - 26, Y + 66, '🗿 巨人單位（2×2）', {
        fontFamily: TD.FONT, fontSize: '24px', color: '#D9A8FF',
        stroke: TD.STROKE, strokeThickness: 4,
      }).setOrigin(1, 0));
    }
    if (st.onWallBonus) {
      c.add(this.add.text(X + W - 26, Y + 30, '🏰 居高臨下加成中', {
        fontFamily: TD.FONT, fontSize: '25px', color: '#8FD0FF',
        stroke: '#4A2E12', strokeThickness: 4,
      }).setOrigin(1, 0));
    }
    const line2 = st.dmg
      ? `傷害 ${st.dmg}   射速 ${(1000 / st.cd).toFixed(1)}/s   射程 ${st.range}`
      : `光環增傷 +${Math.round(st.buff * 100)}%   減速 ${Math.round(st.slow * 100)}%   範圍 ${st.range}`;
    c.add(this.add.text(X + 26, Y + 68, line2, {
      fontFamily: TD.FONT, fontSize: '26px', color: '#FFE9B8', stroke: '#4A2E12', strokeThickness: 4,
    }));

    const btn = (bx, by, bw, bh, label, sub, color, cb, enabled = true) => {
      const bg = this.add.graphics();
      const dark = Phaser.Display.Color.IntegerToColor(color).darken(30).color;
      bg.fillStyle(enabled ? dark : 0x6B5136, 1).fillRoundedRect(bx, by + 6, bw, bh, 16);
      bg.fillStyle(enabled ? color : 0x8B7355, 1).fillRoundedRect(bx, by, bw, bh - 4, 16);
      bg.fillStyle(0xFFFFFF, enabled ? 0.28 : 0.08)
        .fillRoundedRect(bx + 8, by + 6, bw - 16, (bh - 4) * 0.34, 12);
      c.add(bg);
      c.add(this.add.text(bx + bw / 2, by + bh * 0.32, label, {
        fontFamily: TD.FONT, fontSize: '30px', color: enabled ? '#4A2E12' : '#C9A87C',
      }).setOrigin(0.5));
      if (sub) c.add(this.add.text(bx + bw / 2, by + bh * 0.70, sub, {
        fontFamily: TD.FONT, fontSize: '22px', color: enabled ? '#6B4423' : '#A6743C',
      }).setOrigin(0.5));
      const z = this.add.zone(bx + bw / 2, by + bh / 2, bw, bh).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { if (enabled) cb(); else this.audio.deny(); });
      c.add(z);
    };

    const bw = 300, bh = 96, by = Y + 128;
    const maxed = u.lv >= TD.MAX_LV || TD.isFused(u.kind);
    const canGiant = maxed && !u.giant && u.footprint === 1;
    if (canGiant) {
      // 滿階塔改成提供「巨人化」
      btn(X + 26, by, bw, bh, '🗿 巨人化', `💰 ${TD.GIANT.cost}　佔 2×2`, 0xB06CD8,
          () => this.giantify(u), this.gold >= TD.GIANT.cost);
    } else {
      const cost = TD.upgradeCost(u.lv);
      btn(X + 26, by, bw, bh, u.giant ? '已巨人化' : (maxed ? '已滿階' : '升級'),
          (u.giant || maxed) ? '' : `💰 ${cost}`, 0xFFC72C,
          () => this.upgradeTower(u), !maxed && this.gold >= cost);
    }

    const pri = TD.PRIORITIES.find(p => p.key === u.priority) || TD.PRIORITIES[0];
    btn(X + 26 + bw + 22, by, bw, bh, `目標：${pri.name}`, pri.desc, 0x8FC94B,
        () => { this.cyclePriority(u); });

    btn(X + 26 + (bw + 22) * 2, by, bw, bh, '賣出', `+💰 ${TD.sellValue(u.lv)}`, 0xE0483C,
        () => this.sellTower(u));
  }

  closeTowerPanel() {
    if (this.towerPanel) { this.towerPanel.destroy(true); this.towerPanel = null; }
    this.panelUnit = null; this.panelRect = null;
  }

  upgradeTower(u) {
    const cost = TD.upgradeCost(u.lv);
    if (u.lv >= TD.MAX_LV || TD.isFused(u.kind) || this.gold < cost) { this.audio.deny(); return; }
    this.gold -= cost;
    u.upgradeTo(u.kind, u.lv + 1);
    this.fx.mergeBurst(u.x, u.y, TD.getKind(u.kind).tint);
    this.audio.merge(u.lv);
    this.floatLabel(u.x, u.y - 80, `Lv.${u.lv} ${TD.nameOf(u.kind, u.lv)}`, '#FFE066', 32);
    this.addScore(40 * u.lv);
    this.afterBoardChange();
    this.openTowerPanel(u);
  }

  /** 巨人化：需要 2×2 空間，且不能把路封死 */
  giantify(u) {
    if (u.giant || this.gold < TD.GIANT.cost) { this.audio.deny(); return; }
    const g = this.grid, slot = u.slot;
    const anchor = g.anchorFor(slot, 2);
    if (!anchor || !g.buildableArea(anchor, 2, u)) {
      this.audio.deny();
      this.floatLabel(u.x, u.y - 80, '周圍空間不足，需要 2×2', '#FF6E6E', 30);
      return;
    }
    if (!anchor.isWall && g.wouldSealOffArea(anchor, 2, u)) {
      this.audio.deny();
      this.floatLabel(u.x, u.y - 80, '巨人化會把路封死', '#FF6E6E', 30);
      return;
    }
    this.gold -= TD.GIANT.cost;
    g.release(slot, 1);
    u.slot = null;
    u.giant = true;
    u.moveToSlot(anchor, false);
    u.becomeGiant();
    this.fx.mergeBurst(u.x, u.y, 0xB06CD8);
    this.fx.ring(u.x, u.y, 240, 0xB06CD8, 480);
    this.fx.shake(0.010, 260);
    this.audio.fuse();
    this.floatLabel(u.x, u.y - 110, `🗿 ${TD.nameOf(u.kind, u.lv)} 巨人化`, '#D9A8FF', 40);
    this.addScore(800);
    this.onGridChanged();
    this.afterBoardChange();
    this.closeTowerPanel();
  }

  sellTower(u) {
    const val = TD.sellValue(u.lv);
    this.gold += val;
    this.fx.coin(u.x, u.y, val);
    this.floatLabel(u.x, u.y - 70, `+${val}`, '#FFC72C', 34);
    this.fx.ring(u.x, u.y, 130, 0xFFC72C, 300);
    this.audio.coin();
    if (u.slot) {
      if (u.slot.type === 'field') this.grid.release(u.slot, u.footprint);
      else u.slot.unit = null;
    }
    this.units = this.units.filter(x => x !== u);
    u.destroy();
    this.closeTowerPanel();
    this.onGridChanged();
    this.afterBoardChange();
  }

  cyclePriority(u) {
    const i = TD.PRIORITIES.findIndex(p => p.key === u.priority);
    u.priority = TD.PRIORITIES[(i + 1) % TD.PRIORITIES.length].key;
    this.audio.place();
    this.openTowerPanel(u);
  }

  floatLabel(x, y, txt, color = '#FFF6E0', size = 32, dur = 900) {
    const t = this.add.text(x, y, txt, {
      fontFamily: TD.FONT, fontSize: `${size}px`, color, align: 'center',
      stroke: '#5E3A18', strokeThickness: 5, lineSpacing: 6,
    }).setOrigin(0.5).setDepth(TD.DEPTH.FX_TOP);
    this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: dur, ease: 'Cubic.Out',
      onComplete: () => t.destroy() });
  }

  // ══════════════ 光環 ══════════════
  registerAura(unit, st) { this.auras.push({ unit, st }); }

  recomputeAura() {
    this.auras = [];
    let dmg = 0, rate = 0;
    this.units.forEach(u => {
      if (!u.onField) return;
      const K = TD.getKind(u.kind);
      if (K.target !== 'aura') return;
      const st = u.stats;
      dmg += st.buff || 0;
      rate += st.rateBuff || 0;
      this.auras.push({ unit: u, st });
    });
    this.auraBuff = { dmg, rate };
  }

  inAnyAura(enemy) {
    return this.auras.some(a =>
      Phaser.Math.Distance.Between(a.unit.x, a.unit.y, enemy.x, enemy.y) < (a.st.range || 300));
  }

  // ══════════════ 目標與攻擊 ══════════════
  findTarget(unit, range, mode) {
    let best = null, bestScore = -Infinity;
    const r2 = range * range;
    const pri = unit.priority || 'first';
    for (const e of this.enemies) {
      if (!e.targetable) continue;
      const d2 = Phaser.Math.Distance.Squared(unit.x, unit.y, e.x, e.y);
      if (d2 > r2) continue;
      let score;
      switch (pri) {
        case 'strong': score = e.hp; break;
        case 'weak':   score = -e.hp; break;
        case 'near':   score = -d2; break;
        default:       score = e.progress;      // 最前方
      }
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  spawnProjectile(unit, target, st, K, ox, oy) {
    const critRate = (this.archerCrit || 0) * (unit.kind.includes('archer') ? 1 : 0) + (this.boon.critAdd || 0);
    const crit = K.target === 'single' && Math.random() < critRate;

    if (K.target === 'single') {
      this.audio.shootArrow();
      const img = this.add.image(ox, oy, 'px_arrow').setDepth(TD.DEPTH.PROJ)
        .setDisplaySize(56, 56).setTint(TD.isFused(unit.kind) ? 0xFF8A65 : 0xFFFFFF);
      this.projs.push({
        img, type: 'arrow', tx: target.x, ty: target.y, target,
        sp: 1500, dmg: st.dmg * (crit ? 2.2 : 1), crit, burn: st.burn,
        knock: st.knock, bossMul: st.bossMul, trail: TD.isFused(unit.kind) || st.burn > 0,
      });
    } else if (K.target === 'pierce') {
      this.audio.shootSpear();
      this.pierceAttack(unit, target, st);
    } else if (K.target === 'aoe') {
      this.audio.shootStone();
      const img = this.add.image(ox, oy, 'px_rock').setDepth(TD.DEPTH.PROJ).setDisplaySize(64, 64);
      this.projs.push({
        img, type: 'lob', sx: ox, sy: oy, tx: target.x, ty: target.y,
        t: 0, dur: Phaser.Math.Distance.Between(ox, oy, target.x, target.y) / 0.9,
        dmg: st.dmg, aoe: st.aoe, pool: st.pool, spin: Phaser.Math.Between(-8, 8),
      });
    } else if (K.target === 'cone') {
      this.audio.shootOil();
      this.coneAttack(unit, st);
    }
  }

  pierceAttack(unit, target, st) {
    const ang = Phaser.Math.Angle.Between(unit.x, unit.y, target.x, target.y);
    const len = st.range;
    const ex = unit.x + Math.cos(ang) * len, ey = unit.y + Math.sin(ang) * len;

    // 矛影
    const g = this.add.graphics().setDepth(TD.DEPTH.PROJ).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(16, 0xFFF176, 0.9).lineBetween(unit.x, unit.y, ex, ey);
    g.lineStyle(6, 0xFFFFFF, 1).lineBetween(unit.x, unit.y, ex, ey);
    this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });

    const line = new Phaser.Geom.Line(unit.x, unit.y, ex, ey);
    let hit = 0;
    this.enemies.slice().forEach(e => {
      if (!e.targetable || !e.alive) return;
      if (Phaser.Geom.Intersects.LineToCircle(line, new Phaser.Geom.Circle(e.x, e.y - 20, e.bodyW * 0.5))) {
        const d = e.takeDamage(st.dmg, { bossMul: st.bossMul });
        if (d > 0) { this.fx.dmgText(e.x, e.y - 70, d); this.fx.hit(e.x, e.y - 30, 0xFFF176, 6); hit++; }
      }
    });
    if (hit >= 3) this.fx.shake(0.005, 100);
    this.audio.hit();
  }

  coneAttack(unit, st) {
    const r = st.range;
    const g = this.add.graphics().setDepth(TD.DEPTH.PROJ).setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(0xFF7043, 0.4);
    g.slice(unit.x, unit.y, r, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.fillPath();
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });

    this.enemies.slice().forEach(e => {
      if (!e.targetable || !e.alive) return;
      if (e.y > unit.y) return;      // 只打前方
      if (Phaser.Math.Distance.Between(unit.x, unit.y, e.x, e.y) > r) return;
      const d = e.takeDamage(st.dmg, { ignoreArmor: true });
      if (d > 0) this.fx.dmgText(e.x, e.y - 60, d);
      e.applyBurn(st.burn, 2400);
    });
  }

  updateProjectiles(dt) {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      if (p.type === 'arrow') {
        if (p.target && p.target.active) { p.tx = p.target.x; p.ty = p.target.y - 30; }
        const dx = p.tx - p.img.x, dy = p.ty - p.img.y;
        const d = Math.hypot(dx, dy);
        const step = p.sp * dt / 1000;
        p.img.rotation = Math.atan2(dy, dx);
        if (p.trail && Math.random() < 0.7) {
          const s = this.add.image(p.img.x, p.img.y, 'px_spark').setScale(0.3)
            .setTint(0xFF8A65).setBlendMode(Phaser.BlendModes.ADD).setDepth(TD.DEPTH.FX);
          this.tweens.add({ targets: s, alpha: 0, scale: 0, duration: 260, onComplete: () => s.destroy() });
        }
        if (d <= step || !p.target || !p.target.active) {
          if (p.target && p.target.active) {
            const dealt = p.target.takeDamage(p.dmg, { bossMul: p.bossMul });
            if (dealt > 0) {
              this.fx.dmgText(p.target.x, p.target.y - 70, dealt, { crit: p.crit });
              this.fx.hit(p.img.x, p.img.y, p.crit ? 0xFFE066 : 0xFFF6E0, p.crit ? 14 : 6);
              p.crit ? this.audio.crit() : this.audio.hit();
              if (p.burn) p.target.applyBurn(p.burn, 2400);
              if (p.knock) p.target.knockback(p.knock);
            }
          }
          p.img.destroy(); this.projs.splice(i, 1);
        } else {
          p.img.x += dx / d * step; p.img.y += dy / d * step;
        }
      } else if (p.type === 'lob') {
        p.t += dt;
        const k = Math.min(1, p.t / p.dur);
        p.img.x = Phaser.Math.Linear(p.sx, p.tx, k);
        p.img.y = Phaser.Math.Linear(p.sy, p.ty, k) - Math.sin(k * Math.PI) * 220;
        p.img.rotation += p.spin * dt / 1000;
        if (k >= 1) {
          this.fx.explode(p.tx, p.ty, p.aoe);
          this.audio.explode();
          this.enemies.slice().forEach(e => {
            if (!e.targetable || !e.alive) return;
            const d = Phaser.Math.Distance.Between(p.tx, p.ty, e.x, e.y);
            if (d > p.aoe) return;
            const fall = 1 - (d / p.aoe) * 0.45;
            const dealt = e.takeDamage(p.dmg * fall, { ignoreArmor: true });
            if (dealt > 0) this.fx.dmgText(e.x, e.y - 60, dealt);
          });
          if (p.pool) {
            this.fx.firePool(p.tx, p.ty, p.aoe * 0.8, p.pool);
            this.addFirePool(p.tx, p.ty, p.aoe * 0.8, p.pool, p.dmg * 0.25);
          }
          p.img.destroy(); this.projs.splice(i, 1);
        }
      }
    }
  }

  /** 焦土戰術：踩在走道上的敵人持續受傷 */
  applyGroundBurn(dt) {
    const dps = this.boon.groundBurn;
    this.enemies.slice().forEach(e => {
      if (!e.alive || e.def.flying) return;
      e.takeDamage(dps * dt / 1000, { silent: true, ignoreArmor: true });
    });
  }

  addFirePool(x, y, r, dur, dps) {
    const pool = { x, y, r, until: this.now + dur, dps };
    (this.pools = this.pools || []).push(pool);
  }

  updatePools(dt) {
    if (!this.pools) return;
    this.pools = this.pools.filter(p => p.until > this.now);
    this.pools.forEach(p => {
      this.enemies.slice().forEach(e => {
        if (!e.targetable || !e.alive) return;
        if (Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y) < p.r) {
          e.takeDamage(p.dps * dt / 1000, { silent: true, ignoreArmor: true });
        }
      });
    });
  }

  // ══════════════ 敵人與波次 ══════════════
  spawnEnemy(typeKey, laneIdx) {
    if (!TD.ENEMIES[typeKey]) return null;
    const e = new TD.Enemy(this, typeKey, laneIdx);
    this.enemies.push(e);
    if (e.isBoss && !e.structure) {
      this.audio.horn();
      this.fx.bossBanner(e.def.name, e.def.title, 0xFF8A3C);
      if (e.def.invulnerable && !this.heelHintShown) {
        this.heelHintShown = true;
        this.time.delayedCall(2100, () => this.floatLabel(TD.GAME_W / 2,
          TD.LAYOUT.battle.y + 300, '腳踝亮起紅光時才能造成傷害', '#FF6B6B', 34, 2600));
      }
    }
    return e;
  }

  /** 新敵人第一次登場時，直接告訴玩家它的機制與應對 */
  introEnemy(e) {
    const D = e.def;
    const hint = D.title || (D.heal ? '會治療周圍同伴' : D.flying ? '飛行，無視你的迷宮'
      : D.split ? '死亡會分裂' : D.haste ? '讓周圍同伴加速' : null);
    if (!hint || D.structure) return;

    const W = 880, H = 190, X = (TD.GAME_W - W) / 2;
    const Y = TD.LAYOUT.battle.y + 40;
    const c = this.add.container(0, 0).setDepth(TD.DEPTH.BANNER);

    const g = this.add.graphics();
    g.fillStyle(0x2A1A0C, 0.92).fillRoundedRect(X, Y, W, H, 22);
    g.lineStyle(5, D.boss ? 0xFFC72C : 0xFF8A3C, 1).strokeRoundedRect(X, Y, W, H, 22);
    c.add(g);

    if (this.textures.exists(D.tex)) {
      c.add(this.add.image(X + 92, Y + H / 2, D.tex).setDisplaySize(150, 150));
    }
    c.add(this.add.text(X + 186, Y + 26, `新敵人：${D.name}`, {
      fontFamily: TD.FONT, fontSize: '36px', color: D.boss ? '#FFE066' : '#FFF6E0',
      stroke: '#4A2E12', strokeThickness: 5,
    }));
    c.add(this.add.text(X + 186, Y + 84, hint, {
      fontFamily: TD.FONT, fontSize: '27px', color: '#FFCFA8',
      wordWrap: { width: W - 220 }, lineSpacing: 6,
    }));
    c.add(this.add.text(X + W - 24, Y + H - 34, '圖鑑可查看全部敵人', {
      fontFamily: TD.FONT, fontSize: '20px', color: '#C9A87C',
    }).setOrigin(1, 0.5));

    c.setAlpha(0); c.y = -30;
    this.tweens.add({ targets: c, alpha: 1, y: 0, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: c, alpha: 0, y: -30, delay: 3200, duration: 320,
      onComplete: () => c.destroy(true),
    });
    this.audio.bell();
  }

  updateWaves(dt) {
    const elapsed = (this.level.finale
      ? (this.level.phases[this.phaseIdx].dur * 1000 - this.phaseTimeLeft)
      : (this.level.time * 1000 - this.timeLeft)) / 1000;

    this.waves.forEach(w => {
      if (w.done || elapsed < w.t) return;
      w.done = true;
      this.fireWave(w);
    });

    // 排隊生成
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const q = this.pending[i];
      q.left -= dt;
      if (q.left <= 0) {
        this.spawnEnemy(q.type, q.lane);
        q.n--; q.left = q.gap;
        if (q.n <= 0) this.pending.splice(i, 1);
      }
    }
  }

  fireWave(w) {
    const D = TD.ENEMIES[w.type];
    this.waveCount++;
    if (D && D.boss && !D.structure) {
      this.spawnEnemy(w.type, w.lane);
    } else {
      this.pending.push({ type: w.type, n: w.count, lane: w.lane, gap: w.gap, left: 0 });
      if (w.count >= 6) this.fx.waveWarn(`第 ${this.waveCount} 波 · ${D ? D.name : ''} ×${w.count}`);
    }
    // 每 3 波給一次 3 選 1
    if (this.waveCount % 3 === 0) this.time.delayedCall(900, () => this.showBoonPicker());
  }

  // ══════════════ 波次間 3 選 1 ══════════════
  showBoonPicker() {
    if (this.state !== 'playing') return;
    this.state = 'boon';
    this.closeTowerPanel();
    const cards = TD.rollBoons(this.boon, 3);
    if (!cards.length) { this.state = 'playing'; return; }
    this.audio.bell();

    const c = this.add.container(0, 0).setDepth(TD.DEPTH.DIALOG);
    const bg = this.add.rectangle(TD.GAME_W / 2, TD.GAME_H / 2, TD.GAME_W, TD.GAME_H, 0x1B1008, 0.82)
      .setInteractive();
    c.add(bg);

    const title = this.add.text(TD.GAME_W / 2, 300, '選擇一項強化', {
      fontFamily: TD.FONT, fontSize: '76px', color: '#FFC72C',
      stroke: '#4A2E12', strokeThickness: 10,
    }).setOrigin(0.5);
    const sub = this.add.text(TD.GAME_W / 2, 380, `第 ${this.waveCount} 波結束 · 三選一`, {
      fontFamily: TD.FONT, fontSize: '30px', color: '#FFE9B8',
    }).setOrigin(0.5);
    c.add([title, sub]);

    const CW = 880, CH = 260, GAP = 34;
    const y0 = 500;
    cards.forEach((b, i) => {
      const x = TD.GAME_W / 2, y = y0 + i * (CH + GAP);
      const g = this.add.graphics();
      this.woodPanel(g, x - CW / 2, y, CW, CH, 24);
      g.fillStyle(0x4A2E12, 0.45).fillRoundedRect(x - CW / 2 + 22, y + 20, 150, 150, 20);
      c.add(g);

      c.add(this.add.text(x - CW / 2 + 97, y + 95, b.icon, { fontSize: '84px' }).setOrigin(0.5));
      c.add(this.add.text(x - CW / 2 + 200, y + 34, b.name, {
        fontFamily: TD.FONT, fontSize: '46px', color: '#FFF6E0',
        stroke: '#4A2E12', strokeThickness: 5,
      }));
      c.add(this.add.text(x - CW / 2 + 200, y + 100, b.desc, {
        fontFamily: TD.FONT, fontSize: '30px', color: '#FFE9B8',
        wordWrap: { width: CW - 240 }, lineSpacing: 8,
      }));
      const tagBg = this.add.graphics();
      tagBg.fillStyle(0xE0483C, 0.9).fillRoundedRect(x + CW / 2 - 150, y + 200, 120, 42, 12);
      c.add(tagBg);
      c.add(this.add.text(x + CW / 2 - 90, y + 221, b.tag, {
        fontFamily: TD.FONT, fontSize: '24px', color: '#FFF6E0',
      }).setOrigin(0.5));

      const z = this.add.zone(x, y + CH / 2, CW, CH).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        this.takeBoon(b);
        c.destroy(true);
        this.state = 'playing';
      });
      c.add(z);
    });

    this.boonUI = c;
  }

  takeBoon(b) {
    this.boon.taken.push(b.id);
    if (b.apply) b.apply(this.boon);
    if (b.instant) b.instant(this);
    this.fx.flash(0xFFC72C, 240, 0.35);
    this.audio.fuse();
    this.floatLabel(TD.GAME_W / 2, TD.LAYOUT.battle.y + 400, `${b.icon} ${b.name}`, '#FFE066', 52, 1400);
    this.applyBoonSideEffects();
    this.drawRecruit();
  }

  applyBoonSideEffects() {
    // 徵兵折扣重算
    const base = TD.RECRUIT_BASE + this.recruits * TD.RECRUIT_STEP;
    const disc = (this.boon.recruitDisc || 0) + (this.recruitDiscount ? -this.recruitDiscount : 0);
    this.recruitCost = Math.max(10, Math.round(base * (1 - Math.min(0.7, disc))));
  }

  rushWave() {
    if (this.state !== 'playing') return;
    const next = this.waves.find(w => !w.done);
    if (!next) { this.audio.deny(); return; }
    const elapsed = (this.level.time * 1000 - this.timeLeft) / 1000;
    const saved = Math.max(0, next.t - elapsed);
    if (saved < 1) { this.audio.deny(); return; }
    next.done = true;
    this.fireWave(next);
    this.rushBonus = (this.rushBonus || 0) + 1;
    this.addScore(Math.round(saved * 80));
    this.floatLabel(TD.LAYOUT.bottom.skillX, TD.LAYOUT.bottom.y - 100,
      `+${Math.round(saved * 80)}`, '#FFE066', 36);
    this.fx.waveWarn('提前召喚！分數 +15%');
    this.audio.horn();
  }

  onEnemyKilled(e) {
    this.enemies = this.enemies.filter(x => x !== e);
    this.kills++;
    const goldMul = (this.level.goldPenalty || 1) * (1 + (this.goldGain || 0)) * (this.boon.goldMul || 1);
    const gold = Math.round(e.def.gold * goldMul);
    this.gold += gold;
    this.mana = Math.min(this.manaMax, this.mana + (e.isBoss ? 25 : 2) * (1 + (this.manaGain || 0)));

    if (this.boon.killHeal) {
      this._healCount = (this._healCount || 0) + 1;
      if (this._healCount >= this.boon.killHeal) {
        this._healCount = 0;
        this.wallHp = Math.min(this.wallMax, this.wallHp + 1);
      }
    }
    this.combo++; this.comboTimer = 2600;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const comboMul = 1 + Math.min(1.0, Math.floor(this.combo / 5) * 0.1);
    this.addScore(Math.round(e.def.score * comboMul));

    if (this.combo % 5 === 0) this.fx.combo(this.combo);
    if (gold > 0) { this.fx.coin(e.x, e.y, gold); this.audio.coin(); }
    this.drawRecruit();

    // 木馬被拆 → 真結局
    if (e.structure && this.level.finale && this.phaseIdx === 0) this.trueEnding();
  }

  onEnemyReachWall(e) {
    this.enemies = this.enemies.filter(x => x !== e);
    if (this.now < this.aegisUntil) {
      this.fx.ring(e.x, e.y, 200, 0xFFE066, 320);
      this.floatLabel(e.x, e.y - 60, '格擋', '#FFE066', 34);
      return;
    }
    this.wallHp = Math.max(0, this.wallHp - e.def.dmg);
    this.combo = 0;
    this.fx.wallHurt();
    this.audio.wallHit();

    if (e.def.burnTower) {
      const towers = this.units.filter(u => u.onField);
      if (towers.length) {
        const t = Phaser.Utils.Array.GetRandom(towers);
        t.disabledUntil = this.now + 5000;
        this.fx.ring(t.x, t.y, 120, 0xFF4D4D, 300);
        this.floatLabel(t.x, t.y - 80, '塔被縱火癱瘓', '#FF6B6B', 26);
      }
    }

    if (this.wallHp <= 0) this.onWallBroken();
  }

  onWallBroken() {
    if (this.reviveReady) {
      this.reviveReady = false;
      this.wallHp = Math.round(this.wallMax * 0.2);
      this.fx.flash(0xFFE066, 400, 0.6);
      this.fx.bossBanner('埃涅阿斯', '血脈不絕 · 免死一次', 0xFF8A65);
      this.audio.win();
      return;
    }
    this.endGame(false);
  }

  // ══════════════ 英雄 ══════════════
  applyHeroPassives() {
    this.archerCrit = 0; this.goldGain = 0; this.manaGain = 0;
    this.reviveReady = false; this.prepBonus = 0;
    this.heroKeys.forEach(k => {
      const H = TD.HEROES[k]; if (!H) return;
      const p = H.passive;
      if (p.effect === 'wallHp') { this.wallMax = Math.round(100 * (1 + p.v)); this.wallHp = this.wallMax; }
      if (p.effect === 'archerCrit') this.archerCrit = p.v;
      if (p.effect === 'goldGain') this.goldGain = p.v;
      if (p.effect === 'manaGain') this.manaGain = p.v;
      if (p.effect === 'startGold') this.gold += p.v;
      if (p.effect === 'recruitCost') this.recruitDiscount = p.v;
      if (p.effect === 'revive') this.reviveReady = true;
      if (p.effect === 'prepTime') this.prepBonus = p.v;
    });
    if (this.recruitDiscount) this.recruitCost = Math.round(TD.RECRUIT_BASE * (1 + this.recruitDiscount));
  }

  useHeroSkill(heroKey) {
    if (this.state !== 'playing') return;
    const btn = this.heroBtns.find(b => b.key === heroKey);
    const H = TD.HEROES[heroKey];
    if (!btn || this.now < btn.ready) { this.audio.deny(); return; }
    btn.ready = this.now + H.skill.cd * (this.boon.heroCdMul || 1);
    this.audio.skill();
    this.fx.flash(H.color, 160, 0.3);

    const eff = H.skill.effect;
    if (eff === 'aegis') {
      this.aegisUntil = this.now + H.skill.dur;
      const B = TD.LAYOUT.battle;
      const g = this.add.graphics().setDepth(TD.DEPTH.FX).setBlendMode(Phaser.BlendModes.ADD);
      g.fillStyle(0xFFE066, 0.28).fillRect(0, B.y + B.h - 150, TD.GAME_W, 60);
      g.lineStyle(6, 0xFFF176, 0.9).lineBetween(0, B.y + B.h - 150, TD.GAME_W, B.y + B.h - 150);
      this.tweens.add({ targets: g, alpha: 0.4, duration: 300, yoyo: true, repeat: -1 });
      this.time.delayedCall(H.skill.dur, () => g.destroy());
      this.floatLabel(TD.GAME_W / 2, B.y + B.h - 220, '守護之怒', '#FFE066', 48);

    } else if (eff === 'fateArrow') {
      const targets = [...this.enemies].filter(e => e.targetable)
        .sort((a, b) => b.hp - a.hp).slice(0, 3);
      targets.forEach((t, i) => this.time.delayedCall(i * 180, () => {
        if (!t.alive) return;
        this.fx.pillar(t.x, t.y, 0x81D4FA, 420);
        const d = t.takeDamage(t.maxHp * 0.45 + 600, { trueDmg: true, ignoreArmor: true });
        this.fx.dmgText(t.x, t.y - 80, d, { crit: true });
        this.audio.crit();
      }));
      this.floatLabel(TD.GAME_W / 2, TD.LAYOUT.battle.y + 260, '阿波羅之引', '#81D4FA', 48);

    } else if (eff === 'foresee') {
      this.foreseeUntil = this.now + H.skill.dur;
      this.enemies.slice().forEach(e => { if (e.alive) e.applySlow(0.4, H.skill.dur); });
      this.fx.flash(0xCE93D8, 200, 0.25);
      const nx = this.waves.filter(w => !w.done).slice(0, 3)
        .map(w => `${TD.ENEMIES[w.type] ? TD.ENEMIES[w.type].name : w.type}×${w.count}`).join('\n');
      this.floatLabel(TD.GAME_W / 2, TD.LAYOUT.battle.y + 300,
        '預視 · 接下來\n' + (nx || '無'), '#CE93D8', 34, 2400);

    } else if (eff === 'charge') {
      this.grid.entries.forEach(en => {
        const p = this.grid.cellXY(en.c, Math.floor(this.grid.rows * 0.55));
        this.fx.ring(p.x, p.y, 300, 0xFFAB91, 520);
      });
      this.enemies.slice().forEach(e => {
        if (!e.alive) return;
        const ex = e.x, ey = e.y;
        e.knockback(260);                       // 先擊退，再結算傷害
        const d = e.takeDamage(900, { ignoreArmor: true });
        if (d > 0) this.fx.dmgText(ex, ey - 70, d, { crit: true });
      });
      this.fx.shake(0.016, 400);
      this.floatLabel(TD.GAME_W / 2, TD.LAYOUT.battle.y + 260, '狂戰衝鋒', '#FFAB91', 48);

    } else if (eff === 'dawn') {
      this.enemies.slice().forEach((e, i) => this.time.delayedCall(i * 60, () => {
        if (!e.alive) return;
        this.fx.pillar(e.x, e.y, 0xFFF176, 400);
        const d = e.takeDamage(700, { trueDmg: true, ignoreArmor: true });
        if (d > 0) this.fx.dmgText(e.x, e.y - 70, d, { real: true });
      }));
      this.fx.flash(0xFFF176, 300, 0.45);
      this.floatLabel(TD.GAME_W / 2, TD.LAYOUT.battle.y + 260, '曙光審判', '#FFF176', 48);

    } else if (eff === 'rally') {
      this.rallyUntil = this.now + H.skill.dur;
      this.units.filter(u => u.onField).forEach(u => {
        this.fx.ring(u.x, u.y, 140, 0xFFC72C, 400);
      });
      this.floatLabel(TD.GAME_W / 2, TD.LAYOUT.battle.y + 260, '王之號令 · 攻速 +80%', '#FFC72C', 44);
    }
  }

  // ══════════════ 分數 ══════════════
  addScore(v) { this.score += v; }

  // ══════════════ 流程 ══════════════
  showIntro() {
    const LV = this.level;
    const dark = this.add.rectangle(TD.GAME_W / 2, TD.GAME_H / 2, TD.GAME_W, TD.GAME_H, 0x000000, 0.82)
      .setDepth(TD.DEPTH.DIALOG).setInteractive();
    const y0 = TD.GAME_H * 0.32;
    const t0 = this.add.text(TD.GAME_W / 2, y0 - 90, `第 ${LV.year} 年`, {
      fontFamily: TD.FONT, fontSize: '44px', color: '#C9A87C',
    }).setOrigin(0.5).setDepth(TD.DEPTH.DIALOG);
    const t1 = this.add.text(TD.GAME_W / 2, y0, LV.title, {
      fontFamily: TD.FONT, fontSize: '86px', color: '#FFC72C',
    }).setOrigin(0.5).setDepth(TD.DEPTH.DIALOG);
    const t2 = this.add.text(TD.GAME_W / 2, y0 + 150, LV.intro, {
      fontFamily: TD.FONT, fontSize: '34px', color: '#FFF6E0',
      align: 'center', wordWrap: { width: 860 }, lineSpacing: 14,
    }).setOrigin(0.5).setDepth(TD.DEPTH.DIALOG);
    const t3 = this.add.text(TD.GAME_W / 2, TD.GAME_H * 0.62, '點擊開始防守', {
      fontFamily: TD.FONT, fontSize: '38px', color: '#FF8A3C',
    }).setOrigin(0.5).setDepth(TD.DEPTH.DIALOG);
    this.tweens.add({ targets: t3, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    [t0, t1, t2].forEach((t, i) => {
      t.setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, y: t.y - 20, duration: 500, delay: i * 220 });
    });

    dark.once('pointerdown', () => {
      [dark, t0, t1, t2, t3].forEach(o => o.destroy());
      this.startPlaying();
    });
  }

  startPlaying() {
    this.state = 'playing';
    this.audio.resume();
    this.audio.startBGM();
    if (this.level.tutorial) this.runTutorial();
  }

  runTutorial() {
    const B = TD.LAYOUT.battle;
    const steps = [
      { y: B.y + B.h * 0.28,
        txt: '敵人會從上方紅圈進場，一路走到下方的城門\n黃色箭頭就是他們的行進路線', dur: 4200 },
      { y: B.y + B.h * 0.50,
        txt: '把守軍拖到戰場任一空格就能建塔\n塔會擋住去路，敵人只能繞遠 → 你就有更多輸出時間', dur: 4400 },
      { y: B.y + B.h * 0.62,
        txt: '按底部「🧱 路障」可以買便宜的純擋路障礙\n用它把敵人導去你想要的路線，再點一次可拆掉退款', dur: 4600 },
      { y: TD.LAYOUT.bench.y - 70,
        txt: '兩個「相同兵種、相同等級」拖在一起 → 升一階\n兩個「不同兵種、相同等級」→ 融合成特殊單位', dur: 4600 },
      { y: B.y + B.h * 0.72,
        txt: '點擊已建好的塔：可以升級、賣掉、或改它的攻擊優先順序', dur: 4000 },
    ];
    steps.forEach((s, i) => this.time.delayedCall(1000 + i * 4600, () => {
      if (this.state !== 'playing') return;
      this.floatLabel(TD.GAME_W / 2, s.y, s.txt, '#FFE066', 30, s.dur);
    }));
  }

  togglePause() {
    if (this.state === 'playing') { this.state = 'paused'; this.showPause(); }
    else if (this.state === 'paused') { this.state = 'playing'; if (this.pauseUI) this.pauseUI.destroy(true); }
  }

  showPause() {
    const c = this.add.container(0, 0).setDepth(TD.DEPTH.DIALOG);
    const bg = this.add.rectangle(TD.GAME_W / 2, TD.GAME_H / 2, TD.GAME_W, TD.GAME_H, 0x000000, 0.75)
      .setInteractive();
    const t = this.add.text(TD.GAME_W / 2, TD.GAME_H / 2, '暫停\n\n點擊繼續', {
      fontFamily: TD.FONT, fontSize: '64px', color: '#FFF6E0', align: 'center',
    }).setOrigin(0.5);
    c.add([bg, t]);
    bg.once('pointerdown', () => this.togglePause());
    this.pauseUI = c;
  }

  trueEnding() {
    this.state = 'over';
    this.audio.stopBGM(); this.audio.win();
    this.fx.flash(0xFFFFFF, 900, 0.9);
    this.time.delayedCall(600, () => this.showResult(true, true));
  }

  endGame(win) {
    if (this.state === 'over') return;
    this.state = 'over';
    this.audio.stopBGM();
    win ? this.audio.win() : this.audio.lose();
    this.enemies.forEach(e => e.destroy());
    this.enemies = [];
    this.time.delayedCall(700, () => this.showResult(win, false));
  }

  computeScore() {
    const wallPct = this.wallHp / this.wallMax;
    const parts = {
      kill: this.score,
      wall: Math.round(wallPct * 5000),
      time: Math.round((this.timeLeft / 1000) * 80 * (this.boon.timeBonus || 1)),
      eff: Math.round((this.kills / Math.max(1, this.recruits)) * 300),
    };
    parts.total = parts.kill + parts.wall + parts.time + parts.eff;
    return parts;
  }

  showResult(win, trueEnd) {
    const p = this.computeScore();
    const wallPct = this.wallHp / this.wallMax;
    let stars = 0;
    if (win) { stars = 1; if (wallPct >= 0.6) stars = 2; if (wallPct >= 0.9 && this.maxCombo >= 30) stars = 3; }
    if (trueEnd) stars = 3;

    TD.save.record(this.levelId, stars, p.total);

    const c = this.add.container(0, 0).setDepth(TD.DEPTH.DIALOG);
    const bg = this.add.rectangle(TD.GAME_W / 2, TD.GAME_H / 2, TD.GAME_W, TD.GAME_H, 0x000000, 0.9)
      .setInteractive();
    const title = trueEnd ? '改寫歷史' : (win ? '守住了' : '城破了');
    const sub = trueEnd ? '木馬在城外化為灰燼。十年之後，希臘人空手而歸。'
      : (win ? `第 ${this.level.year} 年結束，特洛伊還站著。` : '這一年，城牆沒能撐住。');

    const t1 = this.add.text(TD.GAME_W / 2, 420, title, {
      fontFamily: TD.FONT, fontSize: '96px',
      color: trueEnd ? '#FFE066' : (win ? '#FFF6E0' : '#FF8A3C'),
    }).setOrigin(0.5);
    const t2 = this.add.text(TD.GAME_W / 2, 530, sub, {
      fontFamily: TD.FONT, fontSize: '32px', color: '#C9A87C',
      align: 'center', wordWrap: { width: 880 },
    }).setOrigin(0.5);

    const starTxt = this.add.text(TD.GAME_W / 2, 650,
      '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars), {
        fontFamily: TD.FONT, fontSize: '84px', color: '#FFC72C',
      }).setOrigin(0.5);

    const rows = [
      ['擊殺與連擊', p.kill], ['城牆完整度', p.wall],
      ['剩餘時間', p.time], ['資源效率', p.eff],
    ];
    const list = rows.map(([k, v], i) =>
      this.add.text(TD.GAME_W / 2, 790 + i * 62, `${k}          ${v.toLocaleString()}`, {
        fontFamily: TD.FONT, fontSize: '36px', color: '#FFF6E0',
      }).setOrigin(0.5));

    const total = this.add.text(TD.GAME_W / 2, 1080, p.total.toLocaleString(), {
      fontFamily: TD.FONT, fontSize: '110px', color: '#FFE066',
    }).setOrigin(0.5).setScale(0.2);
    this.tweens.add({ targets: total, scale: 1, duration: 500, ease: 'Back.Out' });

    const stat = this.add.text(TD.GAME_W / 2, 1200,
      `擊殺 ${this.kills}   最高連擊 ×${this.maxCombo}   徵兵 ${this.recruits}`, {
        fontFamily: TD.FONT, fontSize: '30px', color: '#C9A87C',
      }).setOrigin(0.5);

    const mkBtn = (x, y, label, cb, color = 0xFFC72C) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1).fillRoundedRect(x - 190, y - 52, 380, 104, 16);
      const t = this.add.text(x, y, label, {
        fontFamily: TD.FONT, fontSize: '40px', color: '#5E3A18',
      }).setOrigin(0.5);
      const z = this.add.zone(x, y, 380, 104).setInteractive({ useHandCursor: true });
      z.on('pointerdown', cb);
      return [g, t, z];
    };

    const btns = [];
    if (win && this.levelId < 10) {
      btns.push(...mkBtn(TD.GAME_W / 2, 1400, '前往下一年',
        () => this.scene.start('Game', { level: this.levelId + 1, heroes: this.heroKeys })));
    } else {
      btns.push(...mkBtn(TD.GAME_W / 2, 1400, '再試一次',
        () => this.scene.start('Game', { level: this.levelId, heroes: this.heroKeys })));
    }
    btns.push(...mkBtn(TD.GAME_W / 2, 1540, '回到選單',
      () => this.scene.start('Title'), 0xC98B4B));

    c.add([bg, t1, t2, starTxt, ...list, total, stat, ...btns]);
  }

  // ══════════════ 第 10 關階段 ══════════════
  advancePhase() {
    const LV = this.level;
    this.phaseIdx++;
    if (this.phaseIdx >= LV.phases.length) { this.endGame(true); return; }
    const ph = LV.phases[this.phaseIdx];
    this.phaseTimeLeft = ph.dur * 1000;
    this.waves = ph.waves.map(w => ({ ...w, done: false }));
    this.pending = [];
    this.enemies.forEach(e => e.destroy());
    this.enemies = [];

    if (ph.bg && this.textures.exists(ph.bg)) {
      this.bg.setTexture(ph.bg).clearTint();
      this.fitBackground();
    }
    if (ph.reversed) this.reverseLanes();
    if (ph.collapse) this.collapseEvery = ph.collapse * 1000, this.collapseTimer = ph.collapse * 1000;

    this.fx.bossBanner(ph.name, ph.hint, 0xE0483C);
    this.audio.horn();
    this.fx.flash(0xFF4D4D, 400, 0.5);
  }

  reverseLanes() {
    this.reversed = !this.reversed;
    this.grid.flip();
    this.enemies.forEach(e => e.repath());
    this.floatLabel(TD.GAME_W / 2, TD.LAYOUT.battle.y + TD.LAYOUT.battle.h * 0.4,
      '敵人從城內湧出！\n重新佈署你的守軍', '#FF6B6B', 42, 3000);
  }

  doCollapse() {
    const G = this.grid;
    const cands = [];
    G.cells.forEach(row => row.forEach(c => {
      if (!c.blocked && !G.isEntry(c) && !G.isExit(c)) cands.push(c);
    }));
    if (cands.length <= 14) return;

    // 找一個崩塌後仍留有通路的格子
    Phaser.Utils.Array.Shuffle(cands);
    let target = null;
    for (const c of cands) {
      c.blocked = true;
      const ok = !G.entries.some(e => !G.findPath(e, G.exit));
      c.blocked = false;
      if (ok) { target = c; break; }
    }
    if (!target) return;

    target.blocked = true;
    if (target.unit) {
      const u = target.unit;
      const free = this.freeSlot();
      const main = G.mainCell(target);
      G.release(main, u.footprint);
      u.giant = false;
      if (free) u.moveToSlot(free);
      else { this.units = this.units.filter(x => x !== u); u.destroy(); }
    }
    G.redraw();
    this.onGridChanged();
    this.fx.explode(target.x, target.y, 110);
    this.audio.wallHit();
    this.floatLabel(target.x, target.y - 80, '地面崩塌', '#FF4D4D', 28);
  }

  // ══════════════ 主迴圈 ══════════════
  update(time, dt) {
    this.now = time;
    if (this.state !== 'playing') return;
    dt = Math.min(dt, 50);

    // 計時
    if (this.level.finale) {
      this.phaseTimeLeft -= dt;
      this.timeLeft -= dt;
      if (this.collapseEvery) {
        this.collapseTimer -= dt;
        if (this.collapseTimer <= 0) { this.collapseTimer = this.collapseEvery; this.doCollapse(); }
      }
      if (this.phaseTimeLeft <= 0) { this.advancePhase(); return; }
    } else {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.endGame(true); return; }
    }

    // 更新
    this.recomputeAura();
    this.units.forEach(u => u.update(dt));
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.active) { this.enemies.splice(i, 1); continue; }
      e.update(dt);
    }
    // 祭司減速
    this.auras.forEach(a => {
      if (!a.st.slow) return;
      this.enemies.forEach(e => {
        if (Phaser.Math.Distance.Between(a.unit.x, a.unit.y, e.x, e.y) < a.st.range)
          e.applySlow(a.st.slow, 300);
      });
    });
    if (this.boon.groundBurn) this.applyGroundBurn(dt);
    this.updateProjectiles(dt);
    this.updatePools(dt);
    this.updateWaves(dt);

    // Combo 衰減
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // 路徑箭頭脈動，讓行進方向更醒目
    this.grid.drawArrows(0.55 + 0.45 * Math.abs(Math.sin(this.now / 520)));
    this.updateHud(dt);
    this.updateTension(dt);
  }

  updateHud(dt) {
    const LV = this.level;
    const sec = Math.max(0, Math.ceil((LV.finale ? this.phaseTimeLeft : this.timeLeft) / 1000));
    const mm = String(Math.floor(sec / 60)), ss = String(sec % 60).padStart(2, '0');

    this.txtLevel.setText(LV.finale
      ? `第 ${LV.year} 年 · ${LV.phases[this.phaseIdx].name}`
      : `第 ${LV.year} 年 · ${LV.title}`);
    this.txtTimer.setText(`${mm}:${ss}`);
    this.txtScore.setText(this.score.toLocaleString());
    this.txtGold.setText(String(Math.floor(this.gold)));

    // 最後 15 秒警示
    if (sec <= 15 && sec > 0) {
      this.txtTimer.setColor('#FF4D4D');
      if (sec !== this._lastBell) {
        this._lastBell = sec;
        this.audio.bell();
        this.tweens.add({ targets: this.txtTimer, scale: 1.35, duration: 120, yoyo: true });
      }
    } else this.txtTimer.setColor(TD.CSS.ivory);

    // 城牆血條
    const H = TD.LAYOUT.hud, r = this.wallHp / this.wallMax;
    const g = this.hpGfx;
    g.clear();
    g.fillStyle(TD.PALETTE.blueDark, 1).fillRoundedRect(H.hpBarX, H.hpBarY, H.hpBarW, H.hpBarH, 11);
    const col = r > 0.5 ? TD.PALETTE.heal : (r > 0.25 ? TD.PALETTE.gold : TD.PALETTE.danger);
    const fw = Math.max(0, (H.hpBarW - 8) * r);
    g.fillStyle(col, 1).fillRoundedRect(H.hpBarX + 4, H.hpBarY + 4, fw, H.hpBarH - 8, 8);
    if (fw > 20) g.fillStyle(0xFFFFFF, 0.35)
      .fillRoundedRect(H.hpBarX + 7, H.hpBarY + 6, fw - 6, (H.hpBarH - 8) * 0.42, 6);
    g.lineStyle(3, TD.PALETTE.marble, 0.8).strokeRoundedRect(H.hpBarX, H.hpBarY, H.hpBarW, H.hpBarH, 11);
    // 裂痕
    if (r < 0.6) {
      g.lineStyle(2, 0x5E3A18, 0.8);
      for (let i = 0; i < 6; i++) {
        const x = H.hpBarX + 40 + i * 150;
        if (x > H.hpBarX + H.hpBarW * r) continue;
        g.lineBetween(x, H.hpBarY + 2, x + 10, H.hpBarY + H.hpBarH - 2);
      }
    }
    this.txtWaveInfo.setText(
      `城牆 ${Math.ceil(this.wallHp)}/${this.wallMax}    敵 ${this.enemies.length}` +
      (this.combo > 1 ? `    連擊 ×${this.combo}` : ''));

    // 波次條
    const WB = TD.LAYOUT.waveBar;
    const next = this.waves.find(w => !w.done);
    const elapsed = (LV.finale ? (LV.phases[this.phaseIdx].dur * 1000 - this.phaseTimeLeft)
                               : (LV.time * 1000 - this.timeLeft)) / 1000;
    const wg = this.waveGfx;
    wg.clear();
    wg.fillStyle(0x3A2416, 0.75).fillRoundedRect(WB.x, WB.y, WB.w, WB.h, 7);
    if (next) {
      const prev = this.waves.filter(w => w.done).pop();
      const from = prev ? prev.t : 0;
      const k = Phaser.Math.Clamp((elapsed - from) / Math.max(0.1, next.t - from), 0, 1);
      wg.fillStyle(0xFF8A3C, 1).fillRoundedRect(WB.x + 2, WB.y + 2, (WB.w - 4) * k, WB.h - 4, 5);
    } else {
      wg.fillStyle(0x4CD97B, 1).fillRoundedRect(WB.x + 2, WB.y + 2, WB.w - 4, WB.h - 4, 5);
    }

    // 英雄 CD
    this.heroBtns.forEach(b => {
      const H2 = TD.HEROES[b.key];
      const left = Math.max(0, b.ready - this.now);
      b.cdArc.clear();
      if (left > 0) {
        const k = left / (H2.skill.cd * (this.boon.heroCdMul || 1));
        b.cdArc.fillStyle(0x000000, 0.62);
        b.cdArc.slice(0, 0, 62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false);
        b.cdArc.fillPath();
        b.img.setAlpha(0.5);
      } else {
        b.img.setAlpha(1);
        if (!b._pulse) {
          b._pulse = this.tweens.add({ targets: b.c, scale: 1.05, duration: 620, yoyo: true, repeat: -1 });
        }
      }
      if (left > 0 && b._pulse) { b._pulse.stop(); b._pulse = null; b.c.setScale(1); }
    });

    this.drawRecruit();
  }

  updateTension(dt) {
    const hpR = this.wallHp / this.wallMax;
    // 最接近城牆的敵人
    let near = 0;
    this.enemies.forEach(e => near = Math.max(near, e.progress));
    const timeR = 1 - (this.timeLeft / (this.level.time * 1000));
    const tension = Phaser.Math.Clamp(
      (1 - hpR) * 0.5 + near * 0.3 + timeR * 0.1 + (this.enemies.length / 25) * 0.1, 0, 1);
    this.audio.setTension(tension);

    // 危險暈染
    const dangerA = hpR < 0.35 ? (0.35 - hpR) / 0.35 : 0;
    this.dangerVig.setAlpha(dangerA * (0.6 + 0.4 * Math.sin(this.now / 260)));

    // 心跳
    if (hpR < 0.3) {
      this._hb = (this._hb || 0) - dt;
      if (this._hb <= 0) { this._hb = 700 + hpR * 1400; this.audio.heartbeat(hpR < 0.15); }
    }

    // 畫面色調隨進程變紅
    if (!this.level.night) {
      const k = timeR;
      const r = 255, g = Math.round(255 - k * 55), b = Math.round(255 - k * 90);
      this.bg.setTint(Phaser.Display.Color.GetColor(r, g, b));
    }
  }
};
