/* 我方守軍：在合成台可拖曳合成，放上戰場塔位後自動攻擊 */
window.TD = window.TD || {};

TD.Unit = class Unit extends Phaser.GameObjects.Container {
  constructor(scene, kind, lv) {
    super(scene, 0, 0);
    this.gs = scene;
    this.kind = kind;
    this.lv = lv;
    this.slot = null;
    this.cdLeft = 0;
    this.disabledUntil = 0;      // 被縱火兵癱瘓
    this.priority = 'first';     // 目標優先權
    this.giant = false;          // 巨人化（佔 2×2）
    this.baseSize = TD.LAYOUT.bench.cell;
    this.baseScale = 1;
    this.build();
    scene.add.existing(this);
    this.setDepth(TD.DEPTH.UNIT);
  }

  build() {
    const K = TD.getKind(this.kind);
    const size = this.baseSize;

    // 地面陰影（放到戰場上才顯示）
    this.shadow = this.scene.add.ellipse(0, size * 0.34, size * 0.62, size * 0.20, 0x000000, 0.32);
    this.shadow.setVisible(false);

    // 階級光暈
    this.glow = this.scene.add.graphics();
    this.drawGlow();

    // 單位圖（素材本身就是 45° 斜俯視、自帶石砌基座）
    this.img = this.scene.add.image(0, TD.LAYOUT.unit.yOffset, TD.texOf(this.kind, this.lv));
    const fit = size * TD.LAYOUT.unit.imgScale;
    this.img.setDisplaySize(fit, fit);
    if (TD.isFused(this.kind)) this.img.setTint(K.tint);

    // 等級徽章
    const bs = TD.LAYOUT.unit.badgeSize;
    this.badge = this.scene.add.graphics();
    this.badge.fillStyle(0x3A2416, 1).fillCircle(size * 0.33, size * 0.34, bs + 2);
    this.badge.fillStyle(K.tint, 1).fillCircle(size * 0.33, size * 0.33, bs);
    this.badge.fillStyle(0xFFFFFF, 0.35).fillEllipse(size * 0.33, size * 0.33 - bs * 0.4, bs * 1.2, bs * 0.7);
    this.badgeTxt = this.scene.add.text(size * 0.33, size * 0.33,
      TD.isFused(this.kind) ? '★' : String(this.lv), {
        fontFamily: TD.FONT, fontSize: `${bs * 1.2}px`, color: '#3A2416',
        stroke: '#FFFFFF', strokeThickness: 2,
      }).setOrigin(0.5);

    this.add([this.shadow, this.glow, this.img, this.badge, this.badgeTxt]);
    this.setSize(size, size);

    // 攻擊分鏡用的基準值
    this.imgBaseX = 0;
    this.imgBaseY = TD.LAYOUT.unit.yOffset;
    this.imgBaseSX = this.img.scaleX;
    this.imgBaseSY = this.img.scaleY;
    this.idlePhase = Math.random() * Math.PI * 2;
  }

  drawGlow() {
    const K = TD.getKind(this.kind), s = this.baseSize;
    this.glow.clear();
    if (TD.isFused(this.kind)) {
      this.glow.fillStyle(0xFFE066, 0.30).fillCircle(0, s * 0.18, s * 0.46);
      this.glow.lineStyle(5, 0xFFC72C, 0.9).strokeCircle(0, s * 0.30, s * 0.40);
    } else if (this.lv >= 4) {
      this.glow.fillStyle(K.tint, 0.16 + (this.lv - 4) * 0.07).fillCircle(0, s * 0.18, s * 0.44);
    }
  }

  refresh() {
    const slot = this.slot;
    this.removeAll(true);
    this.build();
    if (slot) { this.slot = slot; this.applySlotScale(); }
  }

  upgradeTo(kind, lv) {
    this.kind = kind; this.lv = lv;
    this.refresh();
    this.scene.tweens.add({
      targets: this, scaleX: this.baseScale * 1.35, scaleY: this.baseScale * 1.35,
      duration: 170, yoyo: true, ease: 'Back.Out',
    });
  }

  get stats() {
    const st = TD.statsOf(this.kind, this.lv);
    const gs = this.gs;
    let dmgMul = 1, rateMul = 1;
    if (gs && gs.auraBuff) { dmgMul += gs.auraBuff.dmg; rateMul += gs.auraBuff.rate; }
    if (gs && gs.rallyUntil > gs.now) rateMul += 0.8;

    // 波次增益
    const b = gs && gs.boon;
    if (b) {
      dmgMul *= (b.dmgMul[this.kind] || 1) * (b.dmgMul.all || 1);
      rateMul *= b.rateMul || 1;
      st.range = Math.round(st.range * (b.rangeMul || 1));
      if (st.aoe) st.aoe = Math.round(st.aoe * (b.aoeMul || 1));
      if (st.burn) st.burn = +(st.burn * (b.burnMul || 1)).toFixed(1);
      if (st.buff) st.buff = +(st.buff * (b.auraMul || 1)).toFixed(2);
      if (st.slow) st.slow = +(st.slow * (b.auraMul || 1)).toFixed(2);
    }
    // 巨人化加成
    if (this.giant) {
      dmgMul *= TD.GIANT.dmgMul;
      rateMul *= TD.GIANT.rateMul;
      st.range = Math.round(st.range * TD.GIANT.rangeMul);
      st.isGiant = true;
    }

    // 城牆守備位：居高臨下，射程與傷害加成
    if (this.slot && this.slot.isWall) {
      const G = TD.LAYOUT.grid;
      st.range = Math.round(st.range * (G.wallRangeMul || 1));
      dmgMul *= (G.wallDmgMul || 1);
      st.onWallBonus = true;
    }
    st.dmg = Math.round(st.dmg * dmgMul);
    st.cd = Math.max(90, Math.round(st.cd / rateMul));
    return st;
  }

  /** 佔幾格（1 或 2） */
  get footprint() { return TD.footprintOf(this.kind, this.lv, this.giant); }

  /** 是否已佈署在戰場塔位上（＝會自動攻擊） */
  get onField() { return !!this.slot && this.slot.type === 'field'; }
  get isDisabled() { return this.gs.now < this.disabledUntil; }

  applySlotScale() {
    if (!this.slot) return;
    const onField = this.slot.type === 'field';
    const fp = this.footprint;
    const target = onField
      ? this.gs.grid.cellW * TD.LAYOUT.unit.fieldScale * fp
      : TD.LAYOUT.bench.cell;
    this.baseScale = target / this.baseSize;
    this.setScale(this.baseScale);
    this.shadow.setVisible(onField);
    this.setDepth(onField ? TD.DEPTH.TOWER + this.slot.y / 100 : TD.DEPTH.UNIT);
  }

  /** 2×2 時要站在四格的中心，而不是主格中心 */
  anchorXY(slot) {
    const fp = this.footprint;
    if (!slot || slot.type !== 'field' || fp <= 1) return { x: slot.x, y: slot.y };
    const g = this.gs.grid;
    return { x: slot.x + g.cellW * (fp - 1) / 2, y: slot.y + g.cellH * (fp - 1) / 2 };
  }

  moveToSlot(slot, anim = true) {
    const g = this.gs.grid;
    // 先釋放舊佔位（2×2 要一次清掉四格）
    if (this.slot) {
      if (this.slot.type === 'field' && g) g.release(this.slot, this.footprint);
      else this.slot.unit = null;
    }
    this.slot = slot;
    if (slot.type === 'field' && g) g.occupy(slot, this.footprint, this);
    else slot.unit = this;

    this.applySlotScale();
    const p = this.anchorXY(slot);
    if (anim) {
      this.scene.tweens.add({ targets: this, x: p.x, y: p.y, duration: 190, ease: 'Back.easeOut' });
    } else { this.x = p.x; this.y = p.y; }
    this.gs.drawSlot(slot);
  }

  /** 巨人化：Lv6 專屬終極升級，佔 2×2 */
  becomeGiant() {
    this.giant = true;
    this.refresh();
    const p = this.anchorXY(this.slot);
    this.x = p.x; this.y = p.y;
    this.scene.tweens.add({
      targets: this, scaleX: this.baseScale * 1.25, scaleY: this.baseScale * 1.25,
      duration: 220, yoyo: true, ease: 'Back.easeOut',
    });
  }

  update(dt) {
    if (!this.onField) return;
    if (this.isDisabled) { this.img.setTint(0x666666); return; }
    if (!TD.isFused(this.kind)) this.img.clearTint();
    this.idle(this.gs.now);

    const st = this.stats;
    const K = TD.getKind(this.kind);
    if (K.target === 'aura') { this.gs.registerAura(this, st); return; }

    this.cdLeft -= dt;
    if (this.cdLeft > 0) return;

    const target = this.gs.findTarget(this, st.range, K.target);
    if (!target) return;
    this.cdLeft = st.cd;
    this.fire(target, st, K);
  }

  fire(target, st, K) {
    const ox = this.x, oy = this.y - this.baseSize * 0.22 * this.baseScale;
    this.img.setFlipX(target.x < this.x);
    this.playAttackAnim(K.target, target.x < this.x ? -1 : 1);
    this.gs.spawnProjectile(this, target, st, K, ox, oy);
  }

  /** 各兵種的攻擊分鏡：蓄力 → 出手 → 回位 */
  playAttackAnim(mode, dir) {
    const img = this.img, tw = this.scene.tweens;
    if (!img || !this.imgBaseSY) return;
    tw.killTweensOf(img);
    const X = this.imgBaseX, Y = this.imgBaseY;
    const SX = this.imgBaseSX, SY = this.imgBaseSY;
    const back = (v) => X - dir * v;
    const fwd = (v) => X + dir * v;

    const chain = (steps) => tw.chain({ targets: img, tweens: steps });

    if (mode === 'single') {
      // 弓：後仰拉弦 → 前傾放箭 → 回正
      chain([
        { x: back(7), scaleY: SY * 1.05, scaleX: SX * 0.97, rotation: -dir * 0.05,
          duration: 80, ease: 'Sine.easeOut' },
        { x: fwd(5), scaleY: SY * 0.96, scaleX: SX * 1.04, rotation: dir * 0.04,
          duration: 55, ease: 'Back.easeOut' },
        { x: X, y: Y, scaleX: SX, scaleY: SY, rotation: 0, duration: 130, ease: 'Sine.easeInOut' },
      ]);
    } else if (mode === 'pierce') {
      // 矛：收矛 → 猛力前刺 → 收回
      chain([
        { x: back(12), duration: 90, ease: 'Sine.easeOut' },
        { x: fwd(20), scaleX: SX * 1.08, scaleY: SY * 0.94, duration: 60, ease: 'Back.easeOut' },
        { x: X, scaleX: SX, scaleY: SY, duration: 150, ease: 'Sine.easeInOut' },
      ]);
    } else if (mode === 'aoe') {
      // 投石：後仰蓄力 → 甩臂拋出
      chain([
        { rotation: -dir * 0.16, y: Y + 4, duration: 150, ease: 'Sine.easeOut' },
        { rotation: dir * 0.13, y: Y - 6, scaleY: SY * 1.05, duration: 90, ease: 'Back.easeOut' },
        { rotation: 0, y: Y, scaleY: SY, duration: 200, ease: 'Sine.easeInOut' },
      ]);
    } else if (mode === 'cone') {
      // 熱油：整鍋往前傾倒
      chain([
        { rotation: dir * 0.18, x: fwd(6), duration: 130, ease: 'Sine.easeOut' },
        { rotation: 0, x: X, duration: 220, ease: 'Sine.easeInOut' },
      ]);
    } else {
      // 祭司：舉杖上浮
      chain([
        { y: Y - 8, scaleY: SY * 1.06, duration: 200, ease: 'Sine.easeOut' },
        { y: Y, scaleY: SY, duration: 260, ease: 'Sine.easeInOut' },
      ]);
    }
  }

  /** 待機時的呼吸起伏，讓塔不是死的 */
  idle(now) {
    if (!this.img || !this.imgBaseSY || this.scene.tweens.isTweening(this.img)) return;
    const b = Math.sin(now / 620 + this.idlePhase);
    this.img.scaleY = this.imgBaseSY * (1 + b * 0.014);
    this.img.scaleX = this.imgBaseSX * (1 - b * 0.010);
    this.img.y = this.imgBaseY + b * 1.6;
  }
};
