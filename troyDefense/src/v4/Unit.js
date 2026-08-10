// v4 守軍：站垛位 → 索敵（最接近城門者優先）→ 播攻擊動畫 → 發射投射物
class UnitV4 {
  constructor(scene, type, lv, slotIdx) {
    this.scene = scene;
    this.type = type; this.lv = lv;
    this.def = UNITS_V4[type];
    this.slotIdx = slotIdx;
    this.cdTimer = 0;
    const p = LAYOUT_V4.slots[slotIdx];
    const scale = (type === 'hector' ? 0.85 : 0.7) * (1 + 0.05 * (lv - 1));
    const feetPx = (window.FEET_V4 || {})[this.def.tex] ?? 103;   // 像素實測腳底
    this.feetOff = Math.round(feetPx * scale);
    // 塔台平台：石面＋兵種色發光圈（呼吸）
    this.plat = scene.add.container(p.x, p.y + this.feetOff, [
      scene.add.ellipse(0, 0, 132, 46, 0x9a9080, 0.45),
      scene.add.ellipse(0, 0, 118, 40, this.def.color, 0.20),
    ]).setDepth(698);
    this.ring = scene.add.ellipse(p.x, p.y + this.feetOff, 122, 42).setStrokeStyle(6, this.def.color, 0.95).setDepth(699);
    scene.tweens.add({ targets: this.ring, alpha: { from: 1, to: 0.45 }, yoyo: true, repeat: -1, duration: 700 });
    this.sprite = scene.add.sprite(p.x, p.y, this.def.tex, 0).setDepth(700).setScale(scale);
    this.sprite.play(this.def.tex + '_idle');
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerdown', () => scene.onUnitTapped(this));
    // 塔下等級盾徽（仿實機）
    const shield = scene.add.graphics();
    shield.fillStyle(this.def.color, 1).lineStyle(4, 0xffffff, 1);
    shield.beginPath();
    shield.moveTo(0, -20); shield.lineTo(17, -11); shield.lineTo(15, 9); shield.lineTo(0, 24);
    shield.lineTo(-15, 9); shield.lineTo(-17, -11); shield.closePath();
    shield.fillPath(); shield.strokePath();
    this.badge = scene.add.container(p.x, p.y + this.feetOff + 54, [
      shield,
      scene.add.text(0, 0, type === 'hector' ? '★' : String(lv), { fontSize: '26px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5),
    ]).setDepth(702);
    if (type === 'hector') {
      scene.add.text(p.x, p.y + this.feetOff + 104, '你', {
        fontSize: '30px', fontStyle: 'bold', color: '#FFFFFF',
        backgroundColor: '#3E7FA8', padding: { x: 10, y: 2 },
      }).setOrigin(0.5).setDepth(702);
    }
    // 出場彈跳＋站崗呼吸微動
    scene.tweens.add({ targets: this.sprite, scale: { from: scale * 0.3, to: scale }, duration: 260, ease: 'Back.easeOut' });
    this.addBreath();
    // 出擊系統（赫克托爾專屬）
    this.sortie = null;         // null | 'out' | 'fight' | 'back'
    this.sortieCd = 0;
    this.sortieT = 0;
    this.slashT = 0;
    if (type === 'hector') this.cdGfx = scene.add.graphics().setDepth(703);
  }

  addBreath() {
    const p = LAYOUT_V4.slots[this.slotIdx];
    this.breath = this.scene.tweens.add({
      targets: this.sprite, y: p.y - 3, yoyo: true, repeat: -1,
      duration: 850 + Math.random() * 300, ease: 'Sine.inOut', delay: Math.random() * 400,
    });
  }

  // ⚔ 英雄出擊：躍下城樓 → 近戰橫掃 8 秒 → 歸位（CD 20s）
  tryStartSortie() {
    const sc = this.scene;
    if (this.type !== 'hector' || this.sortie) return false;
    if (this.sortieCd > 0) {
      FxV4.floatText(sc, this.sprite.x, this.sprite.y - 100, '出擊冷卻 ' + Math.ceil(this.sortieCd / 1000) + 's', '#BFC9D4', 30);
      return false;
    }
    this.sortie = 'out';
    AudioV4.horn();
    if (this.breath) this.breath.stop();
    FxV4.floatText(sc, this.sprite.x, this.sprite.y - 120, '⚔ 赫克托爾出擊！', '#FFD23C', 52);
    const tx = LAYOUT_V4.gate.x, ty = LAYOUT_V4.gateStopY - 60;
    sc.tweens.add({                        // 躍下：拋物線
      targets: this.sprite, x: tx, y: ty, duration: 520, ease: 'Quad.easeIn',
      onComplete: () => {
        FxV4.shake(sc, 0.006, 300);
        FxV4.ring(sc, tx, ty, 0xffd23c, 200, 380);
        FxV4.spark(sc, tx, ty, 0xffd23c, 18);
        for (const e of sc.enemies)         // 落地震擊
          if (!e.dead && Phaser.Math.Distance.Between(tx, ty, e.sprite.x, e.sprite.y) < 190)
            e.takeDamage(this.dmg * 1.5, true, { crit: true });
        this.sortie = 'fight';
        this.sortieT = 8000;
        this.slashT = 0;
      },
    });
    return true;
  }

  updateSortie(dt) {
    const sc = this.scene, s = this.sprite;
    if (this.sortie === 'fight') {
      this.sortieT -= dt;
      this.slashT -= dt;
      // 追最近敵人
      let best = null, bd = 1e9;
      for (const e of sc.enemies) {
        if (e.dead) continue;
        const d = Phaser.Math.Distance.Between(s.x, s.y, e.sprite.x, e.sprite.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (best && bd > 70) {
        const dx = best.sprite.x - s.x, dy = best.sprite.y - s.y;
        const spd = 300;
        s.x += dx / bd * spd * dt / 1000;
        s.y = Math.min(LAYOUT_V4.gateStopY - 30, s.y + dy / bd * spd * dt / 1000);
      }
      if (best && bd <= 110 && this.slashT <= 0) {   // 近戰橫掃
        this.slashT = 420;
        s.play(this.def.tex + '_attack', true);
        FxV4.ring(sc, s.x, s.y, 0xfff8d8, 150, 260);
        FxV4.spark(sc, s.x, s.y - 20, 0xffd23c, 8);
        for (const e of sc.enemies)
          if (!e.dead && Phaser.Math.Distance.Between(s.x, s.y, e.sprite.x, e.sprite.y) < 160)
            e.takeDamage(this.dmg, true, { color: '#FFD23C' });
      }
      if (this.sortieT <= 0 || !sc.enemies.length) {   // 時間到／清場 → 歸位
        this.sortie = 'back';
        const p = LAYOUT_V4.slots[this.slotIdx];
        sc.tweens.add({
          targets: s, x: p.x, y: p.y, duration: 480, ease: 'Quad.easeOut',
          onComplete: () => {
            this.sortie = null;
            this.sortieCd = 20000;
            s.play(this.def.tex + '_idle', true);
            this.addBreath();
            FxV4.floatText(sc, p.x, p.y - 110, '歸位', '#BFE4FF', 30);
          },
        });
      }
    }
    // CD 圓弧
    if (this.cdGfx) {
      this.cdGfx.clear();
      if (this.sortieCd > 0) {
        const p = LAYOUT_V4.slots[this.slotIdx];
        const pct = this.sortieCd / 20000;
        this.cdGfx.fillStyle(0x1a2430, 0.55);
        this.cdGfx.slice(p.x, p.y + this.feetOff, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct, false);
        this.cdGfx.fillPath();
      }
    }
  }

  get dmg() {
    let d = this.def.dmg * UNIT_LV_DMG(this.lv);
    if (this.type === 'hector') d *= 1 + 0.4 * this.scene.mods.hero.lord;   // 👑 戰意疊層
    return Math.round(d);
  }

  update(dt) {
    if (this.sortieCd > 0) this.sortieCd = Math.max(0, this.sortieCd - dt);
    if (this.sortie) { this.updateSortie(dt); return; }
    if (this.cdGfx) this.updateSortie(0);     // 純畫 CD 弧
    this.cdTimer -= dt;
    if (this.cdTimer > 0) return;
    // 赫克托爾（你）：按住瞄準只決定落點，射速依自身攻速（含戰意卡加成）
    if (this.type === 'hector' && this.scene.aimPt) {
      this.cdTimer = this.def.cd * Math.pow(0.87, this.scene.mods.hero.lord);
      const pt = { sprite: { x: this.scene.aimPt.x, y: this.scene.aimPt.y }, dead: false, fake: true };
      const s = this.sprite;
      s.play(this.def.tex + '_attack', true);
      this.scene.fireProjectile(this, pt);
      return;
    }
    const target = this.findTarget();
    if (!target) return;
    this.cdTimer = this.def.cd * (this.type === 'hector' ? Math.pow(0.87, this.scene.mods.hero.lord) : 1);
    const s = this.sprite;
    s.play(this.def.tex + '_attack');
    s.once('animationcomplete', () => { if (s.active) s.play(this.def.tex + '_idle'); });
    // 動畫到「出手」幀時發射
    this.scene.time.delayedCall(220, () => {
      if (!this.sprite.active || target.dead) return;
      if (this.def.magic) this.scene.heroCast(this, target);
      else this.scene.fireProjectile(this, target);
    });
  }

  findTarget() {
    let best = null, bestY = -1;
    for (const e of this.scene.enemies) {
      if (e.dead) continue;
      const d = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, e.sprite.x, e.sprite.y);
      if (d <= this.def.range && e.sprite.y > bestY) { best = e; bestY = e.sprite.y; }
    }
    return best;
  }

  destroy() { this.sprite.destroy(); this.badge.destroy(); this.ring.destroy(); this.plat.destroy(); if (this.cdGfx) this.cdGfx.destroy(); }
}
