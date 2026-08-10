/* v2 主戰場 — 模組化場景組裝 + 波次 + 輸贏演出
 * 佈局（直向）：海(黑船) → 沙灘(軍營) → 戰場 → 城牆/城門 → 城內遠景 → 合成台/技能 → 底列
 */
window.TD = window.TD || {};

TD.GameScene = class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.levelId = (data && data.level) || 1;
    this.level = TD.getLevel(this.levelId);
  }

  create() {
    this.over = false;
    this.gold = this.level.startGold;
    this.score = 0;
    this.fury = 0;
    this.combo = 0;
    this.comboAt = 0;
    this.kills = 0;
    this.enemies = [];
    this.projectiles = [];
    this.pendingSpawns = 0;
    this.waveIdx = -1;
    this.waveActive = false;
    this.hpScale = this.hpScale || 1;
    this.lastBurnScan = 0;
    this.lastWaveCheck = 0;

    this.fx = new TD.Fx(this);
    this.buildScenery();
    this.wall = new TD.Wall(this, this.level.gateHp);
    this.bench = new TD.Bench(this);
    this.skills = new TD.Skills(this);
    this.buildHud();
    this.buildBottom();
    this.bindInput();
    this.dev = new TD.DevTools(this);

    TD.audio.startBGM('battle');
    this.events.once('shutdown', () => { TD.audio.stopBGM(); });

    // 開場：關卡名橫幅 → 第一波
    this.banner(`第${['','一','二','三','四','五','六','七','八','九','十'][this.levelId]}年 · ${this.level.name}`, this.level.sub);
    this.time.delayedCall(1800, () => this.nextWave());
  }

  // ══════════════ 場景組裝（乾淨平塗風，參考合成防線的清爽感）══════════════
  buildScenery() {
    const L = TD.LAYOUT, W = TD.GAME_W, H = TD.GAME_H;

    // ── 戰場層：一張完整的場景美術（等比鋪滿寬度，下緣被城牆蓋住）──
    const field = this.add.image(W / 2, 0, 'B_field').setOrigin(0.5, 0).setDepth(TD.DEPTH.FIELD);
    field.setScale(W / field.width);

    // 背景火盆位置疊上動態火焰，讓靜態背景活起來
    [[76, 596, 0.5], [1008, 596, 0.5], [176, 388, 0.42], [880, 400, 0.42],
     [286, 268, 0.34], [790, 250, 0.34]].forEach(([x, y, sc]) => this.fx.flame(x, y, sc));

    // 關卡色調微調（不同年份的氛圍差異）
    if (this.level.dayTint === 'dusk') {
      this.add.rectangle(W / 2, H / 2, W, H, 0xFF6A20, 0.06).setDepth(TD.DEPTH.VIGNETTE - 1);
    }

    // ── 面板層：底部操作區的石雕底板 ──
    const panelTop = L.bench.y - 58;
    const panel = this.add.image(W / 2, panelTop, 'B_panel').setOrigin(0.5, 0)
      .setDepth(TD.DEPTH.PANEL - 2);
    panel.setDisplaySize(W, H - panelTop);
  }

  // ══════════════ HUD ══════════════
  buildHud() {
    const L = TD.LAYOUT.hud, W = TD.GAME_W;
    this.add.rectangle(W / 2, L.h / 2, W, L.h, 0x14100C, 0.55).setDepth(TD.DEPTH.HUD);
    const mk = (x, y, size, origin, color = TD.CSS.marble) =>
      this.add.text(x, y, '', {
        fontFamily: TD.FONT, fontSize: `${size}px`, color,
        stroke: TD.STROKE, strokeThickness: 4,
      }).setOrigin(origin, 0).setDepth(TD.DEPTH.HUD + 1);

    this.hudLevel = mk(L.levelX, L.levelY, L.levelSize, 0);
    this.hudWave = mk(L.waveX, L.waveY, L.waveSize, 0.5, TD.CSS.gold);
    this.hudScore = mk(L.scoreX, L.scoreY, L.scoreSize, 1);
    this.hudLevel.setText(`第${this.levelId}年 ${this.level.name}`);

    // 連殺
    this.comboT = this.add.text(W / 2, L.h + 26, '', {
      fontFamily: TD.FONT, fontSize: '44px', color: TD.CSS.fireHot,
      stroke: TD.STROKE, strokeThickness: 7, fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(TD.DEPTH.HUD + 1).setAlpha(0);

    this.hud = {
      refresh: () => {
        this.hudScore.setText(`⭐${this.score.toLocaleString()}`);
        this.hudWave.setText(this.waveIdx >= 0
          ? `WAVE ${Math.min(this.waveIdx + 1, this.level.waves.length)}/${this.level.waves.length}` : '');
        this.goldT.setText(String(this.gold));
        this.recruitCost.setText(`💰${this.bench.recruitCost()}`);
      },
      flashGold: () => {
        this.tweens.add({ targets: [this.goldT, this.coinI], scale: 1.25, duration: 90, yoyo: true });
        this.goldT.setColor(TD.CSS.danger);
        this.time.delayedCall(350, () => this.goldT.setColor(TD.CSS.gold));
      },
    };
  }

  buildBottom() {
    const L = TD.LAYOUT.bottom, W = TD.GAME_W;
    // 金幣
    this.coinI = this.add.image(L.coinX - 46, L.y, 'a_coin').setDepth(TD.DEPTH.PANEL).setScale(0.9);
    this.goldT = this.add.text(L.coinX, L.y, String(this.gold), {
      fontFamily: TD.FONT, fontSize: `${L.coinSize}px`, color: TD.CSS.gold,
      stroke: TD.STROKE, strokeThickness: 5, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(TD.DEPTH.PANEL);

    // 徵兵鈕（金色，配深色石雕面板）
    const rb = this.add.graphics().setDepth(TD.DEPTH.PANEL);
    rb.fillStyle(0x3A2A14, 1).fillRoundedRect(L.recruitX - L.recruitW / 2 - 4, L.y - L.recruitH / 2 - 4, L.recruitW + 8, L.recruitH + 8, 22);
    rb.fillStyle(0xE0A020, 1).fillRoundedRect(L.recruitX - L.recruitW / 2, L.y - L.recruitH / 2, L.recruitW, L.recruitH, 20);
    rb.fillStyle(0xFFC850, 1).fillRoundedRect(L.recruitX - L.recruitW / 2, L.y - L.recruitH / 2, L.recruitW, L.recruitH / 2, { tl: 20, tr: 20, bl: 0, br: 0 });
    rb.lineStyle(4, 0x8A5A08, 1).strokeRoundedRect(L.recruitX - L.recruitW / 2, L.y - L.recruitH / 2, L.recruitW, L.recruitH, 20);
    this.add.text(L.recruitX, L.y - 14, '＋徵兵', {
      fontFamily: TD.FONT, fontSize: '34px', color: '#4A2E04', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(TD.DEPTH.PANEL);
    this.recruitCost = this.add.text(L.recruitX, L.y + 22, '', {
      fontFamily: TD.FONT, fontSize: '24px', color: '#6A4408', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(TD.DEPTH.PANEL);
    const rz = this.add.zone(L.recruitX, L.y, L.recruitW, L.recruitH).setInteractive();
    rz.on('pointerdown', (p, x, y, ev) => { ev && ev.stopPropagation(); this.bench.recruit(); });

    // 一鍵合成（綠色圓角）
    const mb = this.add.graphics().setDepth(TD.DEPTH.PANEL);
    mb.fillStyle(0x1A3A18, 1).fillRoundedRect(L.mergeX - L.mergeW / 2 - 4, L.y - 46, L.mergeW + 8, 92, 20);
    mb.fillStyle(0x4CA855, 1).fillRoundedRect(L.mergeX - L.mergeW / 2, L.y - 42, L.mergeW, 84, 18);
    mb.fillStyle(0x6EC878, 1).fillRoundedRect(L.mergeX - L.mergeW / 2, L.y - 42, L.mergeW, 42, { tl: 18, tr: 18, bl: 0, br: 0 });
    mb.lineStyle(4, 0x1E6028, 1).strokeRoundedRect(L.mergeX - L.mergeW / 2, L.y - 42, L.mergeW, 84, 18);
    this.add.text(L.mergeX, L.y, '⚡合成', {
      fontFamily: TD.FONT, fontSize: '28px', color: '#0A3A12', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(TD.DEPTH.PANEL);
    const mz = this.add.zone(L.mergeX, L.y, L.mergeW, 84).setInteractive();
    mz.on('pointerdown', (p, x, y, ev) => { ev && ev.stopPropagation(); this.bench.autoMerge(); });

    this.hud.refresh();
  }

  // ══════════════ 輸入 ══════════════
  bindInput() {
    this.input.on('pointermove', p => this.skills.moveCursor(p.x, p.y));
    this.input.on('pointerdown', p => {
      if (this.over) return;
      if (this.skills.tryCast(p.x, p.y)) return;

      const slot = this.wall.slotAt(p.x, p.y);
      if (slot) {
        // 有雲梯掛著且沒選取 → 推梯！
        if (!this.bench.sel && slot.ladder && slot.ladder.climbers.size) { this.pushLadder(slot); return; }
        this.bench.tapSlot(slot);
        return;
      }
      // 點到雲梯本體也可推
      const lad = this.wall.slots.find(sl => sl.ladder &&
        Math.abs(p.x - sl.x) < 70 && p.y > TD.LAYOUT.wall.topY - 60 && p.y < TD.LAYOUT.wall.slotY + 40);
      if (lad && lad.ladder.climbers.size) { this.pushLadder(lad); return; }

      // 點空白：取消選取
      if (this.bench.sel && p.y < TD.LAYOUT.bench.y - 40) { this.bench.sel = null; this.bench.redraw(); }
    });

    this.input.keyboard && this.input.keyboard.on('keydown-D', () => this.dev.toggle());
  }

  /** 推倒雲梯：梯上敵兵全部墜落 */
  pushLadder(slot) {
    const lad = slot.ladder;
    if (!lad) return;
    slot.ladder = null;
    TD.audio.killBig();
    this.fx.shake(4, 200);
    this.fx.dust(slot.x, TD.LAYOUT.wall.topY, 8);
    // 梯子倒下
    this.tweens.add({
      targets: lad.sprite, angle: Phaser.Math.Between(-70, -50), y: lad.sprite.y - 60, alpha: 0,
      duration: 550, ease: 'Cubic.In', onComplete: () => lad.sprite.destroy(),
    });
    // 梯上的人墜落慘死
    lad.climbers.forEach(e => {
      if (e.dead) return;
      this.tweens.add({
        targets: e.spr, y: TD.LAYOUT.wall.topY - 90, angle: 160, duration: 420, ease: 'Cubic.In',
        onComplete: () => e.takeDamage(99999, 'fall'),
      });
    });
    lad.climbers.clear();
  }

  // ══════════════ 波次 ══════════════
  nextWave() {
    if (this.over) return;
    this.waveIdx++;
    if (this.waveIdx >= this.level.waves.length) { this.victory(); return; }
    const wave = this.level.waves[this.waveIdx];
    this.waveActive = true;

    // 警告橫幅＋鼓聲
    const isBoss = !!wave.boss;
    this.banner(isBoss ? '⚔ BOSS 來襲 ⚔' : `WAVE ${this.waveIdx + 1} 來襲`, null, isBoss);
    TD.audio.horn && isBoss && TD.audio.horn();

    wave.events.forEach(ev => {
      for (let k = 0; k < ev.n; k++) {
        this.pendingSpawns++;
        this.time.delayedCall(ev.at * 1000 + k * ev.gap + 900, () => {
          this.pendingSpawns--;
          if (this.over) return;
          const lane = ev.lane === -1 ? Phaser.Math.Between(0, 2) : ev.lane;
          this.spawnEnemy(ev.type, lane);
        });
      }
    });
    this.hud.refresh();
  }

  spawnEnemy(type, lane, opt = {}) {
    const e = new TD.Enemy(this, type, lane);
    if (opt.atWall && opt.slot) { e.state = 'wallfight'; e.slot = opt.slot; e.stopAnim(); }
    this.enemies.push(e);
    return e;
  }

  // ══════════════ 彈幕系統（守軍持續直射火力）══════════════
  spawnProj(cfg) {
    const spr = this.add.image(cfg.x, cfg.y, cfg.tex)
      .setDepth(TD.DEPTH.PROJ).setScale(cfg.scale || 1);
    if (cfg.tint) spr.setTint(cfg.tint);
    if (cfg.rot != null) spr.setRotation(cfg.rot);
    if (cfg.add) spr.setBlendMode(Phaser.BlendModes.ADD);
    this.projectiles.push({
      spr, vx: cfg.vx, vy: cfg.vy, dmg: cfg.dmg, kind: cfg.kind,
      pierce: cfg.pierce || 0, hitSet: cfg.pierce ? new Set() : null,
      trail: cfg.trail, trailAt: 0, onHit: cfg.onHit,
      sx: cfg.x, sy: cfg.y, maxDist: cfg.maxDist || 1600,
    });
  }

  updateProjectiles(now, dt) {
    const sec = dt / 1000;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.spr.x += p.vx * sec;
      p.spr.y += p.vy * sec;
      // 曳光
      if (p.trail && now > p.trailAt) {
        p.trailAt = now + 40;
        const col = p.trail === 'fire' ? 0xFFA040 : p.trail === 'blue' ? 0x9FD4FF : 0xFFF4D8;
        const e = this.add.image(p.spr.x, p.spr.y, 'fx_ember')
          .setDepth(TD.DEPTH.PROJ - 1).setBlendMode(Phaser.BlendModes.ADD)
          .setTint(col).setScale(p.trail === 'faint' ? 0.35 : 0.6).setAlpha(0.8);
        this.tweens.add({ targets: e, alpha: 0, scale: 0.1, duration: 220, onComplete: () => e.destroy() });
      }
      // 命中判定
      let dead = false;
      for (const en of this.enemies) {
        if (en.dead || en.state === 'climb' || en.state === 'wallfight') continue;
        if (p.hitSet && p.hitSet.has(en.id)) continue;
        const hw = en.spr.displayWidth * 0.35 + 16;
        if (Math.abs(en.x - p.spr.x) < hw && Math.abs(en.y - 40 - p.spr.y) < en.spr.displayHeight * 0.45 + 14) {
          en.takeDamage(p.dmg, p.kind);
          p.onHit && p.onHit(en);
          this.fx.sparks(p.spr.x, p.spr.y, p.kind === 'fire' ? 3 : 4,
            { angle: Math.atan2(p.vy, p.vx) + Math.PI, spread: 0.8, power: 220 });
          if (p.hitSet) { p.hitSet.add(en.id); }
          else { dead = true; }
          if (!p.hitSet) break;
        }
      }
      // 出界/超程
      const off = p.spr.y < TD.LAYOUT.field.y - 40 || p.spr.y > TD.GAME_H ||
        p.spr.x < -40 || p.spr.x > TD.GAME_W + 40 ||
        Phaser.Math.Distance.Between(p.sx, p.sy, p.spr.x, p.spr.y) > p.maxDist;
      if (dead || off) {
        p.spr.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  onEnemyKilled(e) {
    if (this.over) return;
    this.kills++;
    this.gold += e.cfg.gold;
    this.score += Math.round(e.cfg.score * (1 + Math.min(this.combo, 20) * 0.05));
    this.fury = Math.min(TD.FURY_MAX, this.fury + TD.FURY_PER_KILL * (e.cfg.boss ? 10 : 1));
    // 連殺
    const now = this.time.now;
    this.combo = (now - this.comboAt < 2500) ? this.combo + 1 : 1;
    this.comboAt = now;
    this.maxCombo = Math.max(this.maxCombo || 0, this.combo);
    if (this.combo >= 3) {
      this.comboT.setText(`連殺 ×${this.combo}`).setAlpha(1).setScale(1 + Math.min(this.combo, 15) * 0.03);
      if (this.combo % 10 === 0) this.fx.flashWhite(0.18, 120);
    }
    this.hud.refresh();
  }

  checkWaveClear(now) {
    if (!this.waveActive || this.over) return;
    if (now - this.lastWaveCheck < 500) return;
    this.lastWaveCheck = now;
    if (this.pendingSpawns > 0) return;
    if (this.enemies.some(e => !e.dead)) return;
    this.waveActive = false;
    // 波次獎勵
    const bonus = 40 + this.waveIdx * 15;
    this.gold += bonus;
    this.floatLabel(TD.GAME_W / 2, 700, `波次獎勵 +💰${bonus}`, TD.CSS.gold, 40);
    this.hud.refresh();
    this.time.delayedCall(3200, () => this.nextWave());
  }

  // ══════════════ 輸贏 ══════════════
  victory() {
    if (this.over) return;
    this.over = true;
    const hpk = this.wall.hp / this.wall.maxHp;
    const stars = hpk >= 0.9 ? 3 : hpk >= 0.6 ? 2 : 1;
    this.score += Math.round(hpk * 5000);
    TD.save.record(this.levelId, stars, this.score);
    TD.audio.win();
    this.fx.flashWhite(0.5, 300);
    this.resultPanel(true, stars);
  }

  /** 城門被轟破 — 輸也要輸得壯烈 */
  gateBreach() {
    if (this.over) return;
    this.over = true;
    const L = TD.LAYOUT.gate;
    const fx = this.fx;
    TD.audio.lose();
    fx.shake(14, 900);
    fx.flashWhite(0.7, 200);
    fx.explosion(L.x, L.topY + L.h / 2, 220);
    fx.chips(L.x, L.topY + 60, 30);
    fx.rubble(L.x, L.topY + 100, 16);
    // 門板炸飛
    this.tweens.add({
      targets: this.wall.gateImg, y: this.wall.gateImg.y + 60, alpha: 0.15,
      scaleX: this.wall.gateImg.scaleX * 1.3, duration: 700, ease: 'Cubic.Out',
    });
    // 火海吞沒
    [340, 540, 740].forEach((x, i) => this.time.delayedCall(300 + i * 220, () =>
      fx.groundFire(x, L.topY + 120, 320, 6, 0)));
    // 敵軍湧入剪影
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(500 + i * 130, () => {
        const e = this.add.image(L.x + Phaser.Math.Between(-90, 90), L.topY + 30, 'G_soldier')
          .setScale(TD.LAYOUT.unit.enemyScale).setDepth(TD.DEPTH.GATE + 2).setTint(0x181008);
        this.tweens.add({ targets: e, y: e.y + 240, alpha: 0.2, duration: 1400, onComplete: () => e.destroy() });
      });
    }
    this.time.delayedCall(2400, () => this.resultPanel(false, 0));
  }

  resultPanel(won, stars) {
    const W = TD.GAME_W, H = TD.GAME_H;
    this.add.rectangle(W / 2, H / 2, W, H, 0x0A0604, 0.78).setDepth(TD.DEPTH.DIALOG);
    const c = this.add.container(W / 2, H / 2 - 80).setDepth(TD.DEPTH.DIALOG + 1);
    const title = this.add.text(0, -220, won ? '守住了！' : '城門陷落', {
      fontFamily: TD.FONT, fontSize: '96px', color: won ? TD.CSS.gold : TD.CSS.danger,
      stroke: TD.STROKE, strokeThickness: 10, fontStyle: 'bold',
    }).setOrigin(0.5);
    const starT = this.add.text(0, -100, won ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '', {
      fontSize: '80px', color: TD.CSS.gold,
    }).setOrigin(0.5);
    const info = this.add.text(0, 10,
      `分數 ${this.score.toLocaleString()}\n擊殺 ${this.kills}　最高連殺 ×${this.maxCombo || 0}\n城門 ${Math.round(100 * this.wall.hp / this.wall.maxHp)}%`, {
      fontFamily: TD.FONT, fontSize: '38px', color: TD.CSS.marble, align: 'center', lineSpacing: 14,
    }).setOrigin(0.5);
    c.add([title, starT, info]);

    const mkBtn = (y, label, color, cb) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1).fillRoundedRect(-220, y - 44, 440, 88, 18);
      const t = this.add.text(0, y, label, {
        fontFamily: TD.FONT, fontSize: '36px', color: '#241A10', fontStyle: 'bold',
      }).setOrigin(0.5);
      const z = this.add.zone(0, y, 440, 88).setInteractive();
      z.on('pointerdown', cb);
      c.add([g, t, z]);
    };
    let by = 150;
    if (won && this.levelId < TD.LEVELS.length) {
      mkBtn(by, '下一年 ▶', TD.PALETTE.gold, () => this.scene.restart({ level: this.levelId + 1 }));
      by += 110;
    }
    mkBtn(by, won ? '再守一次' : '重整旗鼓', TD.PALETTE.marbleDim, () => this.scene.restart({ level: this.levelId }));
    mkBtn(by + 110, '回城邦', 0x8B5A2B, () => this.scene.start('Title'));
  }

  // ══════════════ 通用 ══════════════
  banner(text, sub, danger = false) {
    const W = TD.GAME_W;
    const c = this.add.container(W / 2, 640).setDepth(TD.DEPTH.BANNER).setAlpha(0);
    const g = this.add.graphics();
    g.fillStyle(0x14100C, 0.82).fillRect(-W / 2, -70, W, danger ? 150 : 140);
    g.lineStyle(3, danger ? TD.PALETTE.danger : TD.PALETTE.gold, 0.9)
      .lineBetween(-W / 2, -70, W / 2, -70).lineBetween(-W / 2, danger ? 80 : 70, W / 2, danger ? 80 : 70);
    const t = this.add.text(0, sub ? -22 : 0, text, {
      fontFamily: TD.FONT, fontSize: danger ? '64px' : '56px',
      color: danger ? TD.CSS.danger : TD.CSS.gold,
      stroke: TD.STROKE, strokeThickness: 8, fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add([g, t]);
    if (sub) {
      c.add(this.add.text(0, 34, sub, {
        fontFamily: TD.FONT, fontSize: '30px', color: TD.CSS.dim,
      }).setOrigin(0.5));
    }
    this.tweens.add({
      targets: c, alpha: 1, duration: 250,
      onComplete: () => this.tweens.add({
        targets: c, alpha: 0, delay: 1300, duration: 350, onComplete: () => c.destroy(),
      }),
    });
    if (danger) this.fx.vignettePulse(0.35);
  }

  floatLabel(x, y, text, color, size = 32) {
    const t = this.add.text(x, y, text, {
      fontFamily: TD.FONT, fontSize: `${size}px`, color,
      stroke: TD.STROKE, strokeThickness: 6, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(TD.DEPTH.FX_TOP);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 1100, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  // ══════════════ 每幀 ══════════════
  update(t, dt) {
    const now = this.time.now;
    this.seaT && (this.seaT.tilePositionX += dt * 0.01);

    this.enemies.forEach(e => e.update(now, dt));
    this.updateProjectiles(now, dt);
    // 清掉已死且演出完的
    if (this.enemies.length > 60) this.enemies = this.enemies.filter(e => !e.dead || (e.spr && e.spr.scene));

    this.wall.slots.forEach(sl => sl.unit && sl.unit.update(now));
    this.wall.update(now, dt);
    this.fx.updateGroundFires(now);
    this.fx.updateAmbient(now, dt);
    this.skills.update(now);

    // 地面火灼燒敵人
    if (now - this.lastBurnScan > 300) {
      this.lastBurnScan = now;
      this.fx.groundFires.forEach(gf => {
        this.enemies.forEach(e => {
          if (e.dead || !gf.dps) return;
          if (Math.abs(e.x - gf.x) < gf.w / 2 + 20 && Math.abs(e.y - gf.y) < 60) {
            e.takeDamage(gf.dps * 0.3, 'fire');
            if (!e.dead && !e.burn) e.setBurn(gf.dps * 0.5, 2);
          }
        });
      });
      // 連殺過期
      if (this.combo > 0 && now - this.comboAt > 2500) {
        this.combo = 0;
        this.tweens.add({ targets: this.comboT, alpha: 0, duration: 300 });
      }
      // 音樂張力＋心跳
      const hpk = this.wall.hp / this.wall.maxHp;
      TD.audio.setTension && TD.audio.setTension(1 - hpk);
      if (hpk < 0.3 && now - (this.lastBeat || 0) > (hpk < 0.15 ? 700 : 1100)) {
        this.lastBeat = now;
        TD.audio.heartbeat(hpk < 0.15);
      }
    }
    this.checkWaveClear(now);
  }
};
