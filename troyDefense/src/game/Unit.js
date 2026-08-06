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
    st.dmg = Math.round(st.dmg * dmgMul);
    st.cd = Math.max(90, Math.round(st.cd / rateMul));
    return st;
  }

  /** 是否已佈署在戰場塔位上（＝會自動攻擊） */
  get onField() { return !!this.slot && this.slot.type === 'field'; }
  get isDisabled() { return this.gs.now < this.disabledUntil; }

  applySlotScale() {
    if (!this.slot) return;
    const onField = this.slot.type === 'field';
    const target = onField
      ? this.gs.grid.cellW * TD.LAYOUT.unit.fieldScale
      : TD.LAYOUT.bench.cell;
    this.baseScale = target / this.baseSize;
    this.setScale(this.baseScale);
    this.shadow.setVisible(onField);
    // 戰場上依 y 排序，越靠下越前面
    this.setDepth(onField ? TD.DEPTH.TOWER + this.slot.y / 100 : TD.DEPTH.UNIT);
  }

  moveToSlot(slot, anim = true) {
    if (this.slot) this.slot.unit = null;
    this.slot = slot;
    slot.unit = this;
    this.applySlotScale();
    if (anim) {
      this.scene.tweens.add({ targets: this, x: slot.x, y: slot.y, duration: 190, ease: 'Back.Out' });
    } else { this.x = slot.x; this.y = slot.y; }
    this.gs.drawSlot(slot);
  }

  update(dt) {
    if (!this.onField) return;
    if (this.isDisabled) { this.img.setTint(0x666666); return; }
    if (!TD.isFused(this.kind)) this.img.clearTint();

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
    // 開火後座
    this.scene.tweens.add({
      targets: this.img, y: TD.LAYOUT.unit.yOffset + 7, duration: 60, yoyo: true,
    });
    this.gs.spawnProjectile(this, target, st, K, ox, oy);
  }
};
