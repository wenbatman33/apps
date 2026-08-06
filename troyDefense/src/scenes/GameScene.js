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
    // 空拍俯視地圖，維持 1:1
    this.bg = this.add.image(B.x + B.w / 2, B.y + B.h / 2, LV.bg)
      .setDisplaySize(B.w, B.h).setDepth(TD.DEPTH.BG);
    if (LV.tint) this.bg.setTint(LV.tint);

    // 戰場上下的面板底色
    const H0 = TD.LAYOUT.hud;
    const hudG = this.add.graphics().setDepth(TD.DEPTH.PANEL - 1);
    this.woodPanel(hudG, -30, -46, TD.GAME_W + 60, H0.h + 62, 28);
    // 文字底條：確保在木紋上依然清晰
    hudG.fillStyle(0x2A1A0C, 0.55).fillRoundedRect(18, 24, TD.GAME_W - 36, 74, 16);
    const botG = this.add.graphics().setDepth(TD.DEPTH.PANEL - 1);
    botG.fillStyle(0x5E3A18, 1).fillRect(0, B.y + B.h, TD.GAME_W, TD.GAME_H - (B.y + B.h));

    // 危險暈染（HP 低時亮起）
    this.dangerVig = this.add.graphics().setDepth(TD.DEPTH.FX_TOP - 1).setAlpha(0);
    this.dangerVig.fillStyle(0xFF0000, 0.35);
    this.dangerVig.fillRect(B.x, B.y, B.w, 70);
    this.dangerVig.fillRect(B.x, B.y + B.h - 70, B.w, 70);
    this.dangerVig.fillRect(B.x, B.y, 70, B.h);
    this.dangerVig.fillRect(B.x + B.w - 70, B.y, 70, B.h);
  }

  /** 戰場網格：任意空格可建塔，敵人自動繞路 */
  buildGrid() {
    this.grid = new TD.Grid(this);
    this.slots = [];       // 合成台格子；戰場格子由 grid.cells 提供
  }

  /** 圓潤木質面板（明亮手遊風） */
  woodPanel(g, x, y, w, h, r = 20) {
    g.fillStyle(0x5E3A18, 1).fillRoundedRect(x, y, w, h, r);
    g.fillStyle(0x8B5A2B, 1).fillRoundedRect(x + 5, y + 5, w - 10, h - 12, r - 4);
    g.fillStyle(0xB57C42, 0.55).fillRoundedRect(x + 5, y + 5, w - 10, (h - 12) * 0.34, r - 4);
    g.lineStyle(4, 0x4A2E12, 0.9).strokeRoundedRect(x, y, w, h, r);
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
    g.fillStyle(0x4A2E12, 0.55).fillRoundedRect(s.x - r, s.y - r, r * 2, r * 2, 16);
    g.fillStyle(0x6B4423, 0.75).fillRoundedRect(s.x - r + 4, s.y - r + 4, r * 2 - 8, r * 2 - 8, 13);
    g.lineStyle(hl ? 6 : 3, hl ? 0xFFC72C : 0x4A2E12, hl ? 1 : 0.75)
      .strokeRoundedRect(s.x - r, s.y - r, r * 2, r * 2, 16);
    if (hl) g.fillStyle(0xFFC72C, 0.22).fillRoundedRect(s.x - r, s.y - r, r * 2, r * 2, 16);
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
        stroke: '#4A2E12', strokeThickness: 5,
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
    ring.fillStyle(0x4A2E12, 1).fillCircle(0, 6, 66);
    ring.fillStyle(0x8B5A2B, 1).fillCircle(0, 0, 66);
    ring.fillStyle(0xFFF6E0, 0.18).fillEllipse(0, -26, 100, 46);
    ring.lineStyle(6, HERO.color, 1).strokeCircle(0, 0, 66);
    ring.lineStyle(3, 0x4A2E12, 0.8).strokeCircle(0, 0, 70);

    const img = this.add.image(0, -4, HERO.tex).setDisplaySize(112, 112);
    const mask = this.make.graphics().fillCircle(x, y - 4, 56);
    img.setMask(mask.createGeometryMask());

    const cdArc = this.add.graphics();
    const plate = this.add.graphics();
    plate.fillStyle(0x4A2E12, 0.92).fillRoundedRect(-62, 64, 124, 32, 10);
    plate.lineStyle(2, 0xC98B4B, 0.9).strokeRoundedRect(-62, 64, 124, 32, 10);
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

    // 提前召喚鈕
    this.rushBtn = this.add.container(BT.skillX, BT.y).setDepth(TD.DEPTH.HUD);
    const rg = this.add.graphics();
    rg.fillStyle(0xA8352B, 1).fillCircle(0, 5, BT.skillR);
    rg.fillStyle(0xE0483C, 1).fillCircle(0, 0, BT.skillR);
    rg.fillStyle(0xFFFFFF, 0.26).fillEllipse(0, -BT.skillR * 0.42, BT.skillR * 1.1, BT.skillR * 0.55);
    rg.lineStyle(5, 0xFFE066, 1).strokeCircle(0, 0, BT.skillR);
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
    this.txtRecruit.setColor(can ? '#5E3A18' : '#C9A87C');
  }

  /** DEV 工具改動 LAYOUT 後即時重建版面 */
  relayout() {
    const L = TD.LAYOUT, B = L.battle;

    // 戰場地圖與網格
    this.bg.setPosition(B.x + B.w / 2, B.y + B.h / 2).setDisplaySize(B.w, B.h);
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

  // ══════════════ 輸入與拖曳（自製，不依賴 Phaser 的 Container hit test）══════════════
  setupInput() {
    this.input.on('pointerdown', (p) => {
      if (this.state !== 'playing' || this.dragging) return;
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
      const u = this.dragging;
      if (!u) return;
      u.x = p.worldX + this.dragDX;
      u.y = p.worldY + this.dragDY;
      if (Math.abs(this.dragDX) > 0 || true) this.dragMoved = true;

      const slot = this.slotAt(u.x, u.y);
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
      if (!moved) { u.moveToSlot(u.slot, false); this.showUnitInfo(u); return; }
      this.resolveDrop(u, this.slotAt(dx, dy));
    };
    this.input.on('pointerup', drop);
    this.input.on('pointerupoutside', drop);
  }

  /** 用座標找最近的單位（命中範圍放寬，手機好操作） */
  unitAt(x, y) {
    let best = null, bd = Infinity;
    for (const u of this.units) {
      if (!u.slot) continue;
      const size = u.slot.type === 'field' ? this.grid.cellW : TD.LAYOUT.bench.cell;
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

  slotAt(x, y) {
    // 先看合成台
    let best = null, bd = 1e9;
    for (const s of this.slots) {
      const d = Phaser.Math.Distance.Squared(x, y, s.x, s.y);
      if (d < bd && d < (s.size * 0.62) ** 2) { bd = d; best = s; }
    }
    if (best) return best;
    // 再看戰場格子
    return this.grid.xyToCell(x, y);
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
    this.recruitCost += TD.RECRUIT_STEP;
    const pool = TD.RECRUIT_POOL;
    const kind = pool[Phaser.Math.Between(0, pool.length - 1)];
    // 隨關卡提升初始階級
    const lv = Math.random() < Math.min(0.35, 0.04 * this.levelId) ? 2 : 1;
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
    let best = null, bestDist = -1;
    const r2 = range * range;
    for (const e of this.enemies) {
      if (!e.targetable) continue;
      const d2 = Phaser.Math.Distance.Squared(unit.x, unit.y, e.x, e.y);
      if (d2 > r2) continue;
      // 優先打最接近城牆的
      const prog = e.progress;
      if (prog > bestDist) { bestDist = prog; best = e; }
    }
    return best;
  }

  spawnProjectile(unit, target, st, K, ox, oy) {
    const crit = K.target === 'single' && Math.random() < (this.archerCrit || 0) && unit.kind.includes('archer');

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
    this.enemies.forEach(e => {
      if (!e.targetable) return;
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

    this.enemies.forEach(e => {
      if (!e.targetable) return;
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
          this.enemies.forEach(e => {
            if (!e.targetable) return;
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

  addFirePool(x, y, r, dur, dps) {
    const pool = { x, y, r, until: this.now + dur, dps };
    (this.pools = this.pools || []).push(pool);
  }

  updatePools(dt) {
    if (!this.pools) return;
    this.pools = this.pools.filter(p => p.until > this.now);
    this.pools.forEach(p => {
      this.enemies.forEach(e => {
        if (!e.targetable) return;
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
    if (D && D.boss && !D.structure) {
      // BOSS 單獨生成
      this.spawnEnemy(w.type, w.lane);
      return;
    }
    this.pending.push({ type: w.type, n: w.count, lane: w.lane, gap: w.gap, left: 0 });
    if (w.count >= 8) this.fx.waveWarn(`第 ${++this.waveCount || (this.waveCount = 1)} 波 · ${D ? D.name : ''} ×${w.count}`);
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
    const goldMul = (this.level.goldPenalty || 1) * (1 + (this.goldGain || 0));
    const gold = Math.round(e.def.gold * goldMul);
    this.gold += gold;
    this.mana = Math.min(this.manaMax, this.mana + (e.isBoss ? 25 : 2) * (1 + (this.manaGain || 0)));

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
    btn.ready = this.now + H.skill.cd;
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
        if (!t.active) return;
        this.fx.pillar(t.x, t.y, 0x81D4FA, 420);
        const d = t.takeDamage(t.maxHp * 0.45 + 600, { trueDmg: true, ignoreArmor: true });
        this.fx.dmgText(t.x, t.y - 80, d, { crit: true });
        this.audio.crit();
      }));
      this.floatLabel(TD.GAME_W / 2, TD.LAYOUT.battle.y + 260, '阿波羅之引', '#81D4FA', 48);

    } else if (eff === 'foresee') {
      this.foreseeUntil = this.now + H.skill.dur;
      this.enemies.forEach(e => e.applySlow(0.4, H.skill.dur));
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
      this.enemies.forEach(e => {
        const d = e.takeDamage(900, { ignoreArmor: true });
        e.knockback(260);
        if (d > 0) this.fx.dmgText(e.x, e.y - 70, d, { crit: true });
      });
      this.fx.shake(0.016, 400);
      this.floatLabel(TD.GAME_W / 2, TD.LAYOUT.battle.y + 260, '狂戰衝鋒', '#FFAB91', 48);

    } else if (eff === 'dawn') {
      this.enemies.forEach((e, i) => this.time.delayedCall(i * 60, () => {
        if (!e.active) return;
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
    const steps = [
      { y: TD.LAYOUT.bottom.y - 130, txt: '① 點「徵兵」召集守軍', dur: 3000 },
      { y: TD.LAYOUT.bench.y + 120, txt: '② 把兩個相同的守軍拖在一起 → 升階', dur: 3400 },
      { y: TD.LAYOUT.battle.y + TD.LAYOUT.battle.h * 0.5, txt: '③ 拖到戰場任一空格建塔\n塔會擋路，敵人得繞遠', dur: 4000 },
    ];
    steps.forEach((s, i) => this.time.delayedCall(1200 + i * 3600, () => {
      if (this.state !== 'playing') return;
      this.floatLabel(TD.GAME_W / 2, s.y, s.txt, '#FFE066', 34, s.dur);
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
      time: Math.round((this.timeLeft / 1000) * 80),
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
      this.bg.setTexture(ph.bg).setDisplaySize(TD.GAME_W, TD.LAYOUT.battle.h).clearTint();
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
      target.unit = null;
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
    this.updateProjectiles(dt);
    this.updatePools(dt);
    this.updateWaves(dt);

    // Combo 衰減
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

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
    g.fillStyle(0x3A2416, 1).fillRoundedRect(H.hpBarX, H.hpBarY, H.hpBarW, H.hpBarH, 11);
    const col = r > 0.5 ? 0x4CD97B : (r > 0.25 ? 0xFFC72C : 0xFF4D4D);
    const fw = Math.max(0, (H.hpBarW - 8) * r);
    g.fillStyle(col, 1).fillRoundedRect(H.hpBarX + 4, H.hpBarY + 4, fw, H.hpBarH - 8, 8);
    if (fw > 20) g.fillStyle(0xFFFFFF, 0.35)
      .fillRoundedRect(H.hpBarX + 7, H.hpBarY + 6, fw - 6, (H.hpBarH - 8) * 0.42, 6);
    g.lineStyle(3, 0x6B4423, 1).strokeRoundedRect(H.hpBarX, H.hpBarY, H.hpBarW, H.hpBarH, 11);
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
        const k = left / H2.skill.cd;
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
