// v4 戰鬥主場景
class GameV4 extends Phaser.Scene {
  constructor() { super('GameV4'); }

  init(data) { this.levelIdx = data.level || 0; }

  create() {
    const L = LAYOUT_V4, lv = LEVELS_V4[this.levelIdx];
    this.levelDef = lv;
    FxV4.makeTextures(this);

    // ── 背景與底部面板 ──
    const bg = this.add.image(L.W / 2, L.BG_H / 2, 'bg_battlefield');
    bg.setDisplaySize(L.W, L.BG_H);
    // 六塔樓城牆帶（英雄塔台）＋破損版（血量交叉淡變）
    const stripY = 1345;
    const strip = this.add.image(L.W / 2, stripY, 'castle_strip').setDepth(452);
    strip.setDisplaySize(L.W, L.W / strip.width * strip.height);
    this.stripDmg = this.add.image(L.W / 2, stripY, 'castle_strip_dmg').setDepth(453).setAlpha(0);
    this.stripDmg.setDisplaySize(L.W, L.W / strip.width * strip.height);
    this.stripLite = this.textures.exists('castle_strip_lite')
      ? this.add.image(L.W / 2, stripY, 'castle_strip_lite').setDepth(453).setAlpha(0) : null;
    if (this.stripLite) this.stripLite.setDisplaySize(L.W, L.W / strip.width * strip.height);
    // 城內連續房屋帶（蓋掉底圖與城牆帶的銜接縫）
    const cb = this.add.image(L.W / 2, 0, 'cityband').setDepth(451);
    cb.setDisplaySize(L.W, 158);
    cb.setY(1474 + 79);
    this.add.rectangle(L.W / 2, L.panel.y + L.panel.h / 2, L.W, L.panel.h, 0xd9c79c).setDepth(590);
    this.add.rectangle(L.W / 2, L.panel.y + 3, L.W, 6, 0xb99c64).setDepth(591);

    // ── 狀態 ──
    this.gold = 0;
    this.score = 0;
    this.waveIdx = -1;
    this.spawnQueue = [];
    this.enemies = [];
    this.units = new Array(L.slots.length).fill(null);
    this.phase = 'prep';   // prep | wave | pick | gap | over
    this.crisisOverlay = null;
    this.isEndless = !!lv.endless;
    // 局內 build 成長（吃波間卡片）
    this.mods = { oilR: 1, oilDps: 1, oilStack: 0, arrows: 40, arrowDmg: 120, cdMult: 1, goldMult: 1,
      hero: { chain: 0, sun: 0, wave: 0, holy: 0, lord: 0, venom: 0, venomR: 0 } };
    // 攻門佔位：兩列 × 13 位（以城門為中心向兩側展開）
    this.atkSpots = [];
    const offs = [0];
    for (let k = 1; k <= 6; k++) offs.push(k * 78, -k * 78);
    for (let row = 0; row < 3; row++)
      for (const o of offs)
        this.atkSpots.push({ x: L.gate.x + o, y: L.gateStopY + 8 - row * 64, row, taken: null });

    // ── 實體 ──
    this.gate = new GateV4(this, lv.gateHp);
    this.skills = new SkillsV4(this);

    // ── 垛位提示圈 ──
    this.slotHints = L.slots.map((p, i) => {
      const c = this.add.circle(p.x, p.y, 46, 0xffd060, 0.14)
        .setStrokeStyle(4, 0xffd060, 0.95).setDepth(690).setVisible(false);
      this.tweens.add({ targets: c, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 500 });
      const zone = this.add.circle(p.x, p.y, 56, 0xffffff, 0.001).setDepth(691).setInteractive();
      zone.on('pointerdown', () => this.onSlotTapped(i));
      return c;
    });

    // ── HUD ──
    this.hudWave = this.chip(L.hud.waveX, L.hud.waveY, 380, '準備中…', 0);
    this.hudGold = this.chip(L.hud.goldX - 380, L.hud.goldY, 380, '', 1);
    this.updateGoldHud();
    const pause = this.add.circle(L.hud.pauseX, L.hud.pauseY, 34, 0x1a2430, 0.85)
      .setStrokeStyle(3, 0x3a4a5e).setDepth(961).setInteractive({ useHandCursor: true });
    this.add.text(L.hud.pauseX, L.hud.pauseY, '⏸', { fontSize: '30px' }).setOrigin(0.5).setDepth(962);
    pause.on('pointerdown', () => this.togglePause());

    // ── 戰意值（殺敵集氣 → 抽卡） ──
    this.bp = 0; this.bpNeed = 8; this.draftCount = 0; this.rerolls = 3; this.drafting = false;
    this.add.rectangle(390, 1688, 700, 54, 0x1a2430, 0.9).setStrokeStyle(3, 0x3a4a5e).setDepth(940);
    this.bpFg = this.add.rectangle(44, 1688, 1, 38, 0x58a8ff).setOrigin(0, 0.5).setDepth(941);
    this.add.text(60, 1688, '⚔ 戰鬥點數', { fontSize: '28px', fontStyle: 'bold', color: '#F2E9D2' })
      .setOrigin(0, 0.5).setDepth(942);
    this.bpTxt = this.add.text(724, 1688, '', { fontSize: '26px', fontStyle: 'bold', color: '#BFE4FF' })
      .setOrigin(1, 0.5).setDepth(942);
    this.updateBp();
    this.add.text(390, 1745, '殺敵集滿戰鬥點數 → 隨機援軍／技能強化', { fontSize: '24px', color: '#8A7A5E' })
      .setOrigin(0.5).setDepth(940);

    // 拖曳判定門檻：短按仍算點擊、拖 12px 以上才進入拖曳
    this.input.dragDistanceThreshold = 12;

    // ── 全域指標：技能落點優先，否則按住＝炮台手動瞄準 ──
    this.aimPt = null;
    this.aimGfx = this.add.graphics().setDepth(880);
    this.input.on('pointerdown', (ptr, over) => {
      if (over.length) return;
      const x = ptr.worldX ?? ptr.x, y = ptr.worldY ?? ptr.y;
      if (this.skills.onBattlefieldTap(x, y)) return;
      if (y < LAYOUT_V4.panel.y) this.aimPt = { x, y };
    });
    this.input.on('pointermove', ptr => {
      const x = ptr.worldX ?? ptr.x, y = ptr.worldY ?? ptr.y;
      this.skills.onPointerMove(x, y);
      if (this.aimPt && ptr.isDown && y < LAYOUT_V4.panel.y) { this.aimPt.x = x; this.aimPt.y = y; }
    });
    this.input.on('pointerup', () => { this.aimPt = null; this.aimGfx.clear(); });

    // ── 戰場氛圍：全場漂浮餘燼（戰火底味） ──
    this.add.particles(0, 0, 'fx_dot', {
      x: { min: 0, max: L.W }, y: { min: 400, max: 1600 },
      speedX: { min: -28, max: -10 }, speedY: { min: -34, max: -14 },
      scale: { start: 0.5, end: 0 }, alpha: { start: 0.85, end: 0 },
      lifespan: { min: 2500, max: 4200 }, frequency: 320,
      tint: [0xffb050, 0xff8a2a, 0xffd23c], blendMode: 'ADD',
    }).setDepth(840);

    // ── 關卡開場 ──
    this.deployAt(LAYOUT_V4.slots.length - 1, 'hector', 1);
    this.showBanner(lv.name, lv.story, () => { AudioV4.startBgm(); this.startNextWave(); });

    // DEV 工具掛載
    window.DevV4 && DevV4.attach(this);
  }

  // 關卡開場橫幅：黑底旗語 → 淡出後回呼
  showBanner(title, sub, cb) {
    const W = LAYOUT_V4.W;
    const g = this.add.container(W / 2, 760).setDepth(1050);
    const bg = this.add.rectangle(0, 0, W, 240, 0x1a140e, 0.82);
    const t1 = this.add.text(0, -40, title, { fontSize: '64px', fontStyle: 'bold', color: '#F2E9D2' }).setOrigin(0.5);
    const t2 = this.add.text(0, 42, sub, { fontSize: '32px', color: '#FFC83D' }).setOrigin(0.5);
    g.add([bg, t1, t2]).setAlpha(0);
    this.tweens.add({
      targets: g, alpha: 1, duration: 350,
      onComplete: () => this.tweens.add({
        targets: g, alpha: 0, delay: 1600, duration: 400,
        onComplete: () => { g.destroy(); cb && cb(); },
      }),
    });
  }

  chip(x, y, w, text, align) {
    const r = this.add.rectangle(align ? x + w / 2 : x + w / 2, y + 30, w, 62, 0x1a2430, 0.85)
      .setDepth(960);
    r.isFilled = true;
    const t = this.add.text(align ? x + w - 24 : x + 24, y + 30, text, {
      fontSize: '34px', fontStyle: 'bold', color: align ? '#FFC83D' : '#F2E9D2',
    }).setOrigin(align ? 1 : 0, 0.5).setDepth(961);
    return t;
  }

  // ───────────── 波次 ─────────────
  startNextWave() {
    const lv = this.levelDef;
    this.waveIdx++;
    if (!this.isEndless && this.waveIdx >= lv.waves.length) return;
    this.phase = 'wave';
    const w = this.isEndless ? genEndlessWave(this.waveIdx) : lv.waves[this.waveIdx];
    this.hudWave.setText(this.isEndless ? `WAVE ${this.waveIdx + 1} ∞` : `WAVE ${this.waveIdx + 1}/${lv.waves.length}`);
    FxV4.floatText(this, LAYOUT_V4.W / 2, 560, `WAVE ${this.waveIdx + 1}`, '#F2E9D2', 62);
    // 展開生成佇列
    this.spawnQueue = [];
    for (const [type, n] of w.list)
      for (let i = 0; i < n; i++) this.spawnQueue.push(type);
    Phaser.Utils.Array.Shuffle(this.spawnQueue);
    this.spawnInterval = w.interval;
    this.spawnTimer = this.waveIdx === 0 ? 1500 : 400;
  }

  update(time, dt) {
    if (this.phase === 'over' || this._paused || this.drafting) return;
    // 生成
    if (this.phase === 'wave' && this.spawnQueue.length) {
      this.spawnTimer -= dt;
      while (this.spawnTimer <= 0 && this.spawnQueue.length) {   // 海量補刷
        this.spawnTimer += this.spawnInterval * window.DEV_V4.intervalMult;
        const type = this.spawnQueue.pop();
        const lane = Phaser.Math.Between(0, LAYOUT_V4.lanes.length - 1);
        this.enemies.push(new EnemyV4(this, type, lane, this.levelDef.waveHpMult(this.waveIdx)));
      }
    }
    // 炮台瞄準虛線
    this.aimGfx.clear();
    if (this.aimPt) {
      const hub = LAYOUT_V4.slots[LAYOUT_V4.slots.length - 1];
      this.aimGfx.lineStyle(4, 0xffffff, 0.55);
      const dx = this.aimPt.x - hub.x, dy = this.aimPt.y - hub.y;
      const len = Math.hypot(dx, dy), seg = 26;
      for (let d = 30; d < len; d += seg * 2) {
        this.aimGfx.lineBetween(hub.x + dx / len * d, hub.y + dy / len * d,
          hub.x + dx / len * Math.min(d + seg, len), hub.y + dy / len * Math.min(d + seg, len));
      }
      this.aimGfx.strokeCircle(this.aimPt.x, this.aimPt.y, 26);
    }
    // 雅典娜被動：城門緩回
    this._regenT = (this._regenT || 0) + dt;
    if (this._regenT > 500) {
      let regen = 0;
      for (const u of this.units)
        if (u && u.type === 'athena') regen += (1.5 + u.lv) * (1 + this.mods.hero.holy * 0.5);
      if (regen > 0 && this.gate.hp > 0 && this.gate.hp < this.gate.maxHp) {
        this.gate.hp = Math.min(this.gate.maxHp, this.gate.hp + regen * this._regenT / 1000);
        this.gate.refresh();
      }
      this._regenT = 0;
    }
    // 實體更新
    for (const e of this.enemies) e.update(dt);
    this.enemies = this.enemies.filter(e => !e.dead);
    for (const u of this.units) if (u) u.update(dt);
    this.skills.update(dt);
    // 快節奏連波：出怪一結束 3 秒後下一波直接壓上（不等清場）；最終波才需肅清結算
    if (this.phase === 'wave' && !this.spawnQueue.length) {
      const isLast = !this.isEndless && this.waveIdx >= this.levelDef.waves.length - 1;
      if (isLast) {
        if (!this.enemies.length) {
          this.phase = 'clearing';
          this.hudWave.setText('敵軍潰退…');
          FxV4.floatText(this, LAYOUT_V4.W / 2, 700, '⚔ 敵軍潰退！', '#FFD23C', 56);
          this.time.delayedCall(1200, () => {
            if (this.enemies.length || this.spawnQueue.length) { this.phase = 'wave'; return; }
            this.onVictory();
          });
        }
      } else if (!this.nextQueued) {
        this.nextQueued = true;
        this.hudWave.setText('⚠ 增援逼近…');
        this.time.delayedCall(3000, () => {
          this.nextQueued = false;
          if (this.phase === 'wave' || this.phase === 'gap') this.startNextWave();
        });
      }
    }
  }

  // ───────────── 經濟 ─────────────
  addGoldKill(n, x, y) {
    this.score += n;
    this.bp += 1;
    this.updateGoldHud(); this.updateBp();
    this.tryDraft();
  }
  addGold(n) { this.score += n; this.updateGoldHud(); }
  addScore(n) { this.score += n; this.updateGoldHud(); }
  updateGoldHud() { this.hudGold.setText(`⭐ ${this.score}`); }
  updateBp() {
    if (!this.bpFg) return;
    this.bpFg.width = Math.max(1, 692 * Math.min(1, this.bp / this.bpNeed));
    this.bpTxt.setText(`${Math.min(this.bp, this.bpNeed)}/${this.bpNeed}`);
  }
  tryDraft() {
    if (this.drafting || this.phase === 'over') return;
    if (this.bp < this.bpNeed) return;
    this.bp -= this.bpNeed;
    this.draftCount++;
    this.bpNeed = Math.round(this.bpNeed * 1.5 + 6);   // 海量擊殺下門檻加速成長
    this.updateBp();
    this.showDraft();
  }

  // 卡片圖示：有生成圖用圖、否則退回 emoji
  cardIcon(x, y, id, emoji) {
    const map = { stun: 'chain' };          // 雷霆天罰共用閃電圖
    const key = 'FXI_' + (map[id] || id);
    if (this.textures.exists(key))
      return this.add.image(x, y, key).setDepth(1082).setDisplaySize(195, 195);
    return this.add.text(x, y - 10, emoji, { fontSize: '110px' }).setOrigin(0.5).setDepth(1082);
  }

  // ── 選擇技能（單卡＋刷新，仿實機） ──
  pickDraft() {
    const pool = [];
    const emptySlots = LAYOUT_V4.slots.map((_, i) => i).filter(i => !this.units[i]);
    if (emptySlots.length)
      pool.push({ w: 40, kind: 'join', type: Phaser.Utils.Array.GetRandom(DRAFT_TYPES),
        lv: 1 + Math.floor(this.draftCount / 3) });
    if (this.units.some(u => u && u.lv < 5 && u.type !== 'hector'))
      pool.push({ w: 25, kind: 'promote' });
    for (const c of CARDS_V4)
      if (['oilR', 'oilDps', 'arrows', 'cd', 'repair'].includes(c.id) && c.can(this))
        pool.push({ w: c.w, kind: 'card', card: c });
    // 神系專屬強化（該祭司在場才會出現）
    const fielded = t => this.units.some(u => u && u.type === t);
    if (fielded('zeus')) pool.push({ w: 15, kind: 'card', card: { id: 'chain', icon: '⚡', name: '連鎖閃電',
      desc: '閃電多跳 1 個目標', apply: sc => sc.mods.hero.chain++ } });
    if (fielded('apollo')) pool.push({ w: 15, kind: 'card', card: { id: 'sun', icon: '☀', name: '烈日餘燼',
      desc: '太陽火球燃燒\n更久更痛', apply: sc => sc.mods.hero.sun++ } });
    if (fielded('poseidon')) pool.push({ w: 15, kind: 'card', card: { id: 'wave', icon: '🌊', name: '怒濤狂瀾',
      desc: '海嘯範圍與擊退\n大幅提升', apply: sc => sc.mods.hero.wave++ } });
    if (fielded('athena')) pool.push({ w: 15, kind: 'card', card: { id: 'holy', icon: '🦉', name: '雅典娜神佑',
      desc: '城門回復速度\n+50%', apply: sc => sc.mods.hero.holy++ } });
    pool.push({ w: 18, kind: 'card', card: { id: 'lord', icon: '👑', name: '赫克托爾戰意',
      desc: '主角傷害 +40%\n攻速 +15%', apply: sc => sc.mods.hero.lord++ } });
    if (fielded('paris')) pool.push({ w: 15, kind: 'card', card: { id: 'venom', icon: '☠', name: '海德拉蛇毒',
      desc: '毒傷 +50%\n毒霧更持久', apply: sc => sc.mods.hero.venom = (sc.mods.hero.venom || 0) + 1 } });
    if (fielded('zeus')) pool.push({ w: 12, kind: 'card', card: { id: 'stun', icon: '🌩', name: '雷霆天罰',
      desc: '閃電麻痺時間\n大幅延長', apply: sc => sc.mods.hero.chain++ } });
    if (!pool.length) return null;
    const total = pool.reduce((t, c) => t + c.w, 0);
    let r = Math.random() * total;
    for (const c of pool) { r -= c.w; if (r <= 0) return c; }
    return pool[0];
  }

  showDraft() {
    AudioV4.chime();
    this.drafting = true;
    const W = LAYOUT_V4.W, H = LAYOUT_V4.H;
    const ui = [];
    const cleanup = () => { ui.forEach(o => o.destroy()); this.drafting = false;
      this.time.delayedCall(700, () => this.tryDraft()); };   // 抽卡間隔喘息
    ui.push(this.add.rectangle(W / 2, H / 2, W, H, 0x102030, 0.62).setDepth(1080).setInteractive());
    ui.push(this.add.text(W / 2, 470, '⚔ 選擇技能', {
      fontSize: '56px', fontStyle: 'bold', color: '#FFD23C', stroke: '#1A140E', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(1081));
    let cardUi = [];
    const draw3 = () => {
      const picks = [], keys = new Set();
      let guard = 0;
      while (picks.length < 3 && guard++ < 24) {
        const d = this.pickDraft();
        if (!d) break;
        const key = d.kind + (d.type || '') + (d.card ? d.card.id : '');
        if (keys.has(key)) continue;
        keys.add(key); picks.push(d);
      }
      return picks;
    };
    const renderCards = () => {
      cardUi.forEach(o => o.destroy()); cardUi = [];
      const picks = draw3();
      if (!picks.length) { cleanup(); return; }
      picks.forEach((d, k) => {
        const cx = W / 2 + (k - (picks.length - 1) / 2) * 340, cy = 880;
        const bgR = this.add.rectangle(cx, cy, 320, 460, 0xf7eed6).setStrokeStyle(6, 0xb99c64)
          .setDepth(1081).setInteractive({ useHandCursor: true });
        const top = this.add.rectangle(cx, cy - 200, 320, 58, 0xc9a227).setDepth(1082);
        let name, desc, apply;
        if (d.kind === 'join') {
          const def = UNITS_V4[d.type];
          name = def.name + (d.lv > 1 ? ' Lv' + d.lv : '');
          desc = def.name + '\n加入戰鬥';
          apply = () => {
            const es = LAYOUT_V4.slots.map((_, i2) => i2).filter(i2 => !this.units[i2]);
            if (es.length) this.deployAt(Phaser.Utils.Array.GetRandom(es), d.type, d.lv);
          };
          cardUi.push(this.add.image(cx, cy - 40, def.tex, 0).setDepth(1082).setScale(0.78));
        } else if (d.kind === 'promote') {
          name = '戰場升銜'; desc = '隨機 1 名守軍\n+1 級';
          apply = () => {
            const us = this.units.map((u, i2) => [u, i2]).filter(([u]) => u && u.lv < 5 && u.type !== 'hector');
            if (!us.length) return;
            const [u, i2] = Phaser.Utils.Array.GetRandom(us);
            const { type, lv } = u; u.destroy(); this.units[i2] = null;
            this.deployAt(i2, type, lv + 1);
          };
          cardUi.push(this.cardIcon(cx, cy - 40, 'promote', '⬆'));
        } else {
          name = d.card.name; desc = d.card.desc;
          apply = () => d.card.apply(this);
          cardUi.push(this.cardIcon(cx, cy - 40, d.card.id, d.card.icon));
        }
        cardUi.push(bgR, top,
          this.add.text(cx, cy - 200, name, { fontSize: '34px', fontStyle: 'bold', color: '#3A2200' }).setOrigin(0.5).setDepth(1083),
          this.add.text(cx, cy + 120, desc, { fontSize: '28px', color: '#5A4A30', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setDepth(1082));
        bgR.setScale(0.2).setAlpha(0);
        this.tweens.add({ targets: bgR, scale: 1, alpha: 1, delay: 80 + k * 90, duration: 240, ease: 'Back.easeOut' });
        bgR.on('pointerover', () => bgR.setStrokeStyle(6, 0xff8a1a));
        bgR.on('pointerout', () => bgR.setStrokeStyle(6, 0xb99c64));
        bgR.on('pointerdown', () => {
          AudioV4.pick();
          apply();
          FxV4.spark(this, cx, cy, 0xffd23c, 16);
          cardUi.forEach(o => o.destroy());
          cleanup();
        });
      });
    };
    const rb = this.add.rectangle(W / 2, 1250, 320, 90, 0xcbb88c).setStrokeStyle(4, 0x9a8a6a)
      .setDepth(1081).setInteractive({ useHandCursor: true });
    const rt = this.add.text(W / 2, 1250, '', { fontSize: '36px', fontStyle: 'bold', color: '#5E4A2E' })
      .setOrigin(0.5).setDepth(1082);
    const updateR = () => rt.setText(`🎲 全部刷新（剩 ${this.rerolls}）`);
    updateR();
    rb.on('pointerdown', () => {
      if (this.rerolls <= 0) { FxV4.floatText(this, W / 2, 1180, '刷新次數用完', '#FF5C5C', 30); return; }
      this.rerolls--; updateR(); renderCards();
    });
    ui.push(rb, rt);
    renderCards();
  }

  // ───────────── 上牆／回收 ─────────────
  showSlotHints(on) {
    this.slotHints.forEach((c, i) => c.setVisible(on && !this.units[i]));
  }

  onSlotTapped(i) { /* 佈陣由抽卡自動完成 */ }

  deployAt(i, type, lv) {
    if (this.units[i]) return;
    this.units[i] = new UnitV4(this, type, lv, i);
    FxV4.spark(this, LAYOUT_V4.slots[i].x, LAYOUT_V4.slots[i].y, 0xffd060, 10);
  }

  // 敵人攻門佔位
  claimAtkSpot(enemy) {
    // 前排（貼牆）優先，同排比橫向距離 → 敵人一路殺到城門口
    let best = null, bd = 1e9;
    for (const sp of this.atkSpots) {
      if (sp.taken) continue;
      const d = sp.row * 10000 + Math.abs(sp.x - enemy.sprite.x);
      if (d < bd) { bd = d; best = sp; }
    }
    if (best) best.taken = enemy;
    return best;
  }
  releaseAtkSpot(enemy) {
    for (const sp of this.atkSpots) if (sp.taken === enemy) sp.taken = null;
  }

  // 距離 (x,y) 最近的空垛位（供拖曳放置，110px 內才算）
  nearestFreeSlot(x, y) {
    let best = -1, bd = 110;
    LAYOUT_V4.slots.forEach((p, i) => {
      if (this.units[i]) return;
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  onUnitTapped(unit) {
    if (unit.type === 'hector') { unit.tryStartSortie(); return; }
    FxV4.floatText(this, unit.sprite.x, unit.sprite.y - 90,
      unit.def.name + ' Lv' + unit.lv, '#F2E9D2', 30);
  }

  // 巨人撞門演出（由 Enemy attack 呼叫過 gate.damage；這裡加強震）
  giantSmash(x) {
    FxV4.shake(this, 0.012, 450);
    FxV4.ring(this, x, LAYOUT_V4.gateStopY + 30, 0xcabfa8, 180, 400);
    FxV4.spark(this, x, LAYOUT_V4.gateStopY + 20, 0xcabfa8, 16);
  }

  // ───────────── 神蹟（魔法英雄攻擊） ─────────────
  heroCast(unit, target) {
    const kind = unit.def.magic, lv = unit.lv, H = this.mods.hero;
    const sx = unit.sprite.x, sy = unit.sprite.y - 40;
    if (kind === 'chain') {                 // ⚡ 連鎖閃電
      AudioV4.zap();
      const jumps = 1 + lv + H.chain;
      let cur = target, prev = { sprite: { x: sx, y: sy } };
      const hit = new Set();
      const g = this.add.graphics().setDepth(890);
      for (let k = 0; k < jumps && cur; k++) {
        hit.add(cur);
        this.drawLightning(g, prev.sprite.x, prev.sprite.y - 20, cur.sprite.x, cur.sprite.y - 20);
        cur.takeDamage(unit.dmg, true, { color: '#9FD4FF' });
        cur.setShock(400 + H.chain * 120);          // ⚡ 麻痺定身
        FxV4.spark(this, cur.sprite.x, cur.sprite.y, 0xbfe4ff, 5);
        FxV4.ring(this, cur.sprite.x, cur.sprite.y, 0x9fd4ff, 62, 240);
        prev = cur;
        cur = this.enemies.find(e => !e.dead && !hit.has(e) &&
          Phaser.Math.Distance.Between(prev.sprite.x, prev.sprite.y, e.sprite.x, e.sprite.y) < 210);
      }
      this.time.delayedCall(160, () => g.destroy());
    } else if (kind === 'sun') {            // ☀ 太陽火球
      AudioV4.fireCast();
      const p = this.add.image(sx, sy, 'fx_dot').setTint(0xffa020).setScale(2.4).setDepth(870);
      const glow = FxV4.flame(this, sx, sy, 0.7); glow.startFollow(p);
      const tx = target.sprite.x, ty = target.sprite.y;
      this.tweens.add({
        targets: p, x: tx, y: ty, duration: 430, ease: 'Sine.easeIn',
        onComplete: () => {
          p.destroy(); glow.destroy();
          const flash = this.add.circle(tx, ty, 90, 0xffffff, 0.85).setDepth(895);
          this.tweens.add({ targets: flash, alpha: 0, scale: 1.5, duration: 160, onComplete: () => flash.destroy() });
          FxV4.ring(this, tx, ty, 0xffa020, 150, 360);
          FxV4.spark(this, tx, ty, 0xffa020, 18);
          FxV4.shake(this, 0.002, 120);
          const dur = 2200 + H.sun * 900, dps = (16 + 8 * lv) * (1 + H.sun * 0.4);
          for (const e of this.enemies)
            if (!e.dead && Phaser.Math.Distance.Between(tx, ty, e.sprite.x, e.sprite.y) < 135) {
              e.takeDamage(unit.dmg); e.setBurn(dps, dur);
            }
        },
      });
    } else if (kind === 'wave') {           // 🌊 怒濤衝擊
      AudioV4.wave();
      const tx = target.sprite.x, ty = target.sprite.y;
      const R = 150 + H.wave * 45, push = 46 + H.wave * 22;
      for (let w = 0; w < 3; w++) {
        const rip = this.add.ellipse(tx, ty, 40, 26, 0x20c0a8, 0.45 - w * 0.1).setDepth(860);
        this.tweens.add({ targets: rip, displayWidth: R * (2.2 + w * 0.5), displayHeight: R * (1.4 + w * 0.3),
          alpha: 0, duration: 420 + w * 140, delay: w * 90, onComplete: () => rip.destroy() });
      }
      const splash = this.add.particles(tx, ty, 'fx_dot', {
        speed: { min: 120, max: 300 }, scale: { start: 0.7, end: 0 }, lifespan: 420,
        quantity: 16, tint: [0x7fe4d4, 0x20c0a8, 0xeaf8ff], blendMode: 'ADD', emitting: false,
      }).setDepth(891);
      splash.explode(16); this.time.delayedCall(700, () => splash.destroy());
      for (const e of this.enemies)
        if (!e.dead && Phaser.Math.Distance.Between(tx, ty, e.sprite.x, e.sprite.y) < R) {
          e.takeDamage(unit.dmg);
          // 擊退：巨人/BOSS 免疫；已貼牆者不拉回（避免無限風箏原地踏步）
          if (!e.def.giant && !e.def.boss && e.state === 'march')
            e.sprite.y = Math.max(LAYOUT_V4.spawnY, e.sprite.y - push);
        }
    } else if (kind === 'venom') {          // ☠ 帕里斯毒箭
      AudioV4.poison();
      const p = this.add.image(sx, sy, 'fx_arrow').setTint(0x7ae85a).setDepth(870);
      const tr = FxV4.trail(this, p, [0x7ae85a, 0x3aa834], 0.6);
      const tx = target.sprite.x, ty = target.sprite.y;
      const t = { v: 0 };
      this.tweens.add({
        targets: t, v: 1, duration: 380,
        onUpdate: () => {
          const x = Phaser.Math.Linear(sx, tx, t.v);
          const y = Phaser.Math.Linear(sy, ty, t.v) - Math.sin(t.v * Math.PI) * 90;
          p.setRotation(Math.atan2(ty - y, tx - x) + Math.PI / 2);
          p.setPosition(x, y);
        },
        onComplete: () => {
          p.destroy(); tr.stopFollow(); tr.emitting = false;
          this.time.delayedCall(300, () => tr.destroy());
          FxV4.ring(this, tx, ty, 0x7ae85a, 90 + H.venomR * 30, 300);
          const pr = 95 + (H.venom || 0) * 0;
          for (const e of this.enemies)
            if (!e.dead && Phaser.Math.Distance.Between(tx, ty, e.sprite.x, e.sprite.y) < 110) {
              e.takeDamage(unit.dmg, true, { color: '#7AE85A' });
              e.setPoison((10 + 6 * lv) * (1 + (H.venom || 0) * 0.5), 3200 + (H.venom || 0) * 800);
            }
        },
      });
    } else if (kind === 'holy') {           // 🦉 聖光矛
      AudioV4.holy();
      const g = this.add.graphics().setDepth(890);
      g.lineStyle(8, 0xfff8d8, 0.9).lineBetween(sx, sy, target.sprite.x, target.sprite.y - 20);
      g.lineStyle(3, 0xffffff, 1).lineBetween(sx, sy, target.sprite.x, target.sprite.y - 20);
      this.time.delayedCall(120, () => g.destroy());
      const pillar = this.add.rectangle(target.sprite.x, target.sprite.y - 90, 30, 200, 0xfff8d8, 0.65).setDepth(889);
      this.tweens.add({ targets: pillar, alpha: 0, scaleX: 2.2, duration: 300, onComplete: () => pillar.destroy() });
      FxV4.ring(this, target.sprite.x, target.sprite.y, 0xfff8d8, 80, 280);
      FxV4.spark(this, target.sprite.x, target.sprite.y, 0xfff8d8, 8);
      target.takeDamage(Math.round(unit.dmg * 1.4), true, { color: '#FFF8D8' });
    }
  }

  drawLightning(g, x1, y1, x2, y2) {
    g.lineStyle(5, 0x9fd4ff, 0.9);
    const segs = 6;
    let px = x1, py = y1;
    g.beginPath(); g.moveTo(x1, y1);
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const nx = x1 + (x2 - x1) * t + (i < segs ? Phaser.Math.Between(-26, 26) : 0);
      const ny = y1 + (y2 - y1) * t + (i < segs ? Phaser.Math.Between(-18, 18) : 0);
      g.lineTo(nx, ny); px = nx; py = ny;
    }
    g.strokePath();
    g.lineStyle(2, 0xffffff, 1);
    g.strokePath();
  }

  // ───────────── 投射物 ─────────────
  fireProjectile(unit, target) {
    const def = unit.def;
    const sx = unit.sprite.x, sy = unit.sprite.y - 40;
    // 預測落點
    const flight = 420;
    const tx = target.sprite.x, ty = target.sprite.y + (target.state === 'march' ? target.def.speed * flight / 1000 : 0);
    const texMap = { arrow: 'fx_arrow', javelin: 'fx_javelin', rock: 'fx_rock', pot: 'fx_pot', gold: 'fx_arrow' };
    AudioV4.shoot();
    const p = this.add.image(sx, sy, texMap[def.proj]).setDepth(870);
    if (def.proj === 'gold') p.setTint(0xffd23c).setScale(1.3);
    const trailTints = { arrow: [0xfff4d8, 0xbfe4ff], javelin: [0xbfe4ff, 0xffffff],
      rock: [0xb3aa96, 0x8a8170], pot: [0xff8a2a, 0xffd23c], gold: [0xffd23c, 0xfff8d8] };
    const tr = FxV4.trail(this, p, trailTints[def.proj], def.proj === 'gold' ? 0.8 : 0.5);
    const arc = def.proj === 'rock' || def.proj === 'pot' ? 180 : 90;
    const t = { v: 0 };
    this.tweens.add({
      targets: t, v: 1, duration: flight, ease: 'Linear',
      onUpdate: () => {
        const x = Phaser.Math.Linear(sx, tx, t.v);
        const y = Phaser.Math.Linear(sy, ty, t.v) - Math.sin(t.v * Math.PI) * arc;
        // 朝向
        p.setRotation(Math.atan2(
          (Phaser.Math.Linear(sy, ty, Math.min(1, t.v + 0.05)) - Math.sin(Math.min(1, t.v + 0.05) * Math.PI) * arc) - y,
          Phaser.Math.Linear(sx, tx, Math.min(1, t.v + 0.05)) - x
        ) + Math.PI / 2);
        p.setPosition(x, y);
        if (def.proj === 'rock') p.rotation += 0.22;
      },
      onComplete: () => {
        p.destroy();
        tr.stopFollow(); tr.emitting = false;
        this.time.delayedCall(320, () => tr.destroy());
        this.onProjectileHit(unit, tx, ty, target);
      },
    });
  }

  onProjectileHit(unit, x, y, target) {
    const def = unit.def, dmg = unit.dmg;
    if (target && target.fake) {           // 炮台手動落點：範圍濺射＋金環
      AudioV4.hit();
      FxV4.spark(this, x, y, 0xffd23c, 8);
      FxV4.ring(this, x, y, 0xffd23c, 95, 260);
      for (const e of this.enemies)
        if (!e.dead && Phaser.Math.Distance.Between(x, y, e.sprite.x, e.sprite.y) < 95)
          e.takeDamage(Math.round(dmg * 0.55));
      return;
    }
    if (def.aoe) {           // 投石 AoE：塵環＋碎石
      AudioV4.thud();
      FxV4.spark(this, x, y, 0xb3aa96, 10);
      FxV4.ring(this, x, y, 0xcabfa8, def.aoe, 300);
      FxV4.shake(this, 0.0015, 100);
      for (const e of this.enemies)
        if (!e.dead && Phaser.Math.Distance.Between(x, y, e.sprite.x, e.sprite.y) < def.aoe) e.takeDamage(dmg);
    } else if (def.burn) {   // 火油
      const fl = FxV4.flame(this, x, y, 0.9);
      this.time.delayedCall(def.burn.dur, () => fl.destroy());
      for (const e of this.enemies)
        if (!e.dead && Phaser.Math.Distance.Between(x, y, e.sprite.x, e.sprite.y) < def.burn.r)
          e.setBurn(def.burn.dps, def.burn.dur);
    } else {
      if (target && !target.dead) {
        if (Math.random() < 0.12) {           // 暴擊：大金字＋震屏＋金環
          AudioV4.crit();
          target.takeDamage(dmg * 2, true, { crit: true });
          FxV4.ring(this, target.sprite.x, target.sprite.y, 0xffd23c, 70, 260);
          FxV4.shake(this, 0.0015, 80);
        } else {
          AudioV4.hit();
          target.takeDamage(dmg);
        }
        FxV4.spark(this, target.sprite.x, target.sprite.y, 0xffe08a, 4);
      }
    }
  }

  // ───────────── 危急狀態 ─────────────
  setCrisis(on) {
    if (on && !this.crisisOverlay) {
      const g = this.add.graphics().setDepth(930);
      const W = LAYOUT_V4.W, H = LAYOUT_V4.H;
      for (let i = 0; i < 20; i++) {
        g.lineStyle(8, 0xc81e14, 0.05);
        g.strokeRect(i * 4, i * 7, W - i * 8, H - i * 14);
      }
      this.crisisOverlay = g;
      this.tweens.add({ targets: g, alpha: { from: 1, to: 0.35 }, yoyo: true, repeat: -1, duration: 700 });
    }
  }

  // ───────────── 勝敗 ─────────────
  onVictory() {
    if (this.phase === 'over') return;
    this.phase = 'over';
    AudioV4.stopBgm(); AudioV4.victory();
    const W = LAYOUT_V4.W, H = LAYOUT_V4.H;
    const pct = this.gate.hp / this.gate.maxHp;
    const stars = pct >= 0.7 ? 3 : pct >= 0.3 ? 2 : 1;
    // 進度存檔
    const save = JSON.parse(localStorage.troyV4 || '{}');
    save.stars = save.stars || [];
    save.stars[this.levelIdx] = Math.max(save.stars[this.levelIdx] || 0, stars);
    save.unlocked = Math.max(save.unlocked || 0, this.levelIdx + 1);
    localStorage.troyV4 = JSON.stringify(save);
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a140e, 0.72).setDepth(1000).setInteractive();
    const panel = this.add.image(W / 2, H / 2 - 60, 'ui_victory').setDepth(1001);
    panel.setScale(Math.min(920 / panel.width, 1));
    const px = W / 2, py = H / 2 - 60;
    this.add.text(px, py - 30, '勝 利！', { fontSize: '72px', fontStyle: 'bold', color: '#5E3A08' }).setOrigin(0.5).setDepth(1002);
    // 星星（對準面板三個星槽：左小/中大/右小）
    const s = panel.scale;
    const starPos = [[-215 * s, -285 * s, 100], [0, -320 * s, 150], [215 * s, -285 * s, 100]];
    starPos.forEach(([dx, dy, size], i) => {
      const st = this.add.text(px + dx, py + dy, i < stars ? '⭐' : '☆',
        { fontSize: size * s + 'px' }).setOrigin(0.5).setDepth(1002).setScale(0);
      this.tweens.add({ targets: st, scale: 1, delay: 300 + i * 250, duration: 300, ease: 'Back.easeOut' });
    });
    this.add.text(px, py + 70, `城門剩餘 ${Math.round(pct * 100)}%\n⭐ 分數 ${this.score}`, {
      fontSize: '38px', color: '#5A4A30', align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1002);
    const hasNext = this.levelIdx + 1 < LEVELS_V4.length;
    if (hasNext) {
      this.overBtn(px, py + 235 * s + 40, '下一關 ▶', () => this.scene.restart({ level: this.levelIdx + 1 }), 380);
      this.overBtn(px - 165, py + 235 * s + 170, '↻ 重打', () => this.scene.restart({ level: this.levelIdx }));
      this.overBtn(px + 165, py + 235 * s + 170, '🏠 回城', () => this.scene.start('TitleV4'));
    } else {
      this.overBtn(px - 165, py + 235 * s + 40, '↻ 重打', () => this.scene.restart({ level: this.levelIdx }));
      this.overBtn(px + 165, py + 235 * s + 40, '🏠 回城', () => this.scene.start('TitleV4'));
    }
    FxV4.spark(this, px, py - 200, 0xffd23c, 24);
  }

  onDefeat() {
    if (this.phase === 'over') return;
    this.phase = 'over';
    AudioV4.stopBgm(); AudioV4.defeat();
    this.gate.breakOpen();
    const W = LAYOUT_V4.W, H = LAYOUT_V4.H;
    // 無盡模式：記錄最佳波數
    let subText = '十年之城，毀於一旦——再守一次。';
    if (this.isEndless) {
      const save = JSON.parse(localStorage.troyV4 || '{}');
      const best = Math.max(save.endlessBest || 0, this.waveIdx);
      save.endlessBest = best;
      localStorage.troyV4 = JSON.stringify(save);
      subText = `撐過 ${this.waveIdx} 波｜最佳紀錄 ${best} 波`;
    }
    this.cameras.main.flash(400, 255, 200, 120);
    this.time.delayedCall(900, () => {
      this.add.rectangle(W / 2, H / 2, W, H, 0x1a0908, 0.82).setDepth(1000).setInteractive();
      this.add.text(W / 2, H / 2 - 200, '城 破', { fontSize: '110px', fontStyle: 'bold', color: '#FF5C5C', stroke: '#1A0908', strokeThickness: 10 }).setOrigin(0.5).setDepth(1001);
      this.add.text(W / 2, H / 2 - 90, subText, { fontSize: '36px', color: '#E4C9B0' }).setOrigin(0.5).setDepth(1001);
      this.overBtn(W / 2 - 170, H / 2 + 60, '↻ 再戰', () => this.scene.restart({ level: this.levelIdx }));
      this.overBtn(W / 2 + 170, H / 2 + 60, '🏠 回城', () => this.scene.start('TitleV4'));
    });
  }

  overBtn(x, y, label, cb, w = 300) {
    const r = this.add.rectangle(x, y, w, 100, 0xffb020).setStrokeStyle(5, 0xb97a10)
      .setDepth(1002).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontSize: '44px', fontStyle: 'bold', color: '#5E3A08' }).setOrigin(0.5).setDepth(1003);
    r.on('pointerdown', cb);
  }

  // ───────────── 暫停 ─────────────
  togglePause() {
    if (this.phase === 'over') return;
    if (this.pauseUi) {
      this.pauseUi.forEach(o => o.destroy()); this.pauseUi = null;
      this.time.paused = false;
      this.tweens.resumeAll(); this.anims.resumeAll();
      this._paused = false;
      return;
    }
    const W = LAYOUT_V4.W, H = LAYOUT_V4.H;
    this.time.paused = true; this.tweens.pauseAll(); this.anims.pauseAll();
    this._paused = true;
    const ui = [];
    ui.push(this.add.rectangle(W / 2, H / 2, W, H, 0x1a140e, 0.7).setDepth(1100).setInteractive());
    ui.push(this.add.text(W / 2, H / 2 - 240, '暫 停', { fontSize: '80px', fontStyle: 'bold', color: '#F2E9D2' }).setOrigin(0.5).setDepth(1101));
    const mk = (y, label, cb) => {
      const r = this.add.rectangle(W / 2, y, 420, 100, 0xffb020).setStrokeStyle(5, 0xb97a10).setDepth(1101).setInteractive({ useHandCursor: true });
      const t = this.add.text(W / 2, y, label, { fontSize: '42px', fontStyle: 'bold', color: '#5E3A08' }).setOrigin(0.5).setDepth(1102);
      r.on('pointerdown', cb); ui.push(r, t);
    };
    mk(H / 2 - 80, '▶ 繼續', () => this.togglePause());
    mk(H / 2 + 60, '↻ 重打本關', () => { this.time.paused = false; this.scene.restart({ level: this.levelIdx }); });
    mk(H / 2 + 200, '🏠 回標題', () => { this.time.paused = false; this.scene.start('TitleV4'); });
    mk(H / 2 + 340, '🛠 DEV 工具', () => { window.DevV4 && DevV4.toggle(); });
    mk(H / 2 + 480, AudioV4.enabled ? '🔊 音效：開' : '🔇 音效：關', () => {
      AudioV4.setEnabled(!AudioV4.enabled);
      this.togglePause(); this.togglePause();   // 重繪選單標籤
    });
    this.pauseUi = ui;
  }
}
