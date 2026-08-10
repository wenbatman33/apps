// v4 徵兵合成台：5×2 卡格
// 操作：點A→同型同級亮綠→點B 合成；點卡→點垛位上牆；也可「直接拖曳卡片到垛位」
class BenchV4 {
  constructor(scene) {
    this.scene = scene;
    const B = LAYOUT_V4.bench;
    this.cards = new Array(B.cols * B.rows).fill(null); // {type,lv,img,badge,label}
    this.selected = -1;
    this.slotRects = [];
    for (let i = 0; i < this.cards.length; i++) {
      const { x, y } = this.cellPos(i);
      const bg = scene.add.rectangle(x, y, B.cell, B.cell, 0xf7eed6)
        .setStrokeStyle(3, 0xb99c64).setDepth(600).setInteractive();
      bg.on('pointerdown', () => this.onCellTap(i));
      this.slotRects.push(bg);
    }
  }

  cellPos(i) {
    const B = LAYOUT_V4.bench;
    const c = i % B.cols, r = Math.floor(i / B.cols);
    return { x: B.x0 + c * (B.cell + B.gapX) + B.cell / 2, y: B.y0 + r * (B.cell + B.gapY) + B.cell / 2 };
  }

  emptyIdx() { return this.cards.findIndex(c => c === null); }

  addUnit(type, lv) {
    const i = this.emptyIdx();
    if (i < 0) return false;
    this.makeCard(i, type, lv, true);
    return true;
  }

  // 建卡：裁切放大縮圖＋等級徽章＋兵種名＋可拖曳
  makeCard(i, type, lv, pop) {
    const sc = this.scene, B = LAYOUT_V4.bench;
    const { x, y } = this.cellPos(i);
    const def = UNITS_V4[type];
    // 角色在 256 格內約佔中央 200px：裁掉留白、放大到近乎填滿卡框
    const img = sc.add.image(x, y - 8, def.tex, 0).setDepth(601);
    img.setCrop(28, 16, 200, 214);
    img.setScale((B.cell + 40) / 200);
    // 點擊判定區縮到可見角色範圍（貼圖被裁切放大後，預設判定區會大於卡框、蓋到鄰卡）
    img.setInteractive({
      draggable: true, useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(56, 44, 144, 168),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
    const badge = sc.add.container(x + 40, y - 42, [
      sc.add.circle(0, 0, 15, def.color).setStrokeStyle(2, 0xffffff),
      sc.add.text(0, 0, type === 'hector' ? '★' : String(lv), { fontSize: '20px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5),
    ]).setDepth(603);
    const hex = '#' + def.color.toString(16).padStart(6, '0');
    const label = sc.add.text(x, y + B.cell / 2 - 14, def.name, {
      fontSize: '20px', fontStyle: 'bold', color: '#FFFFFF',
      backgroundColor: hex, padding: { x: 6, y: 1 },
    }).setOrigin(0.5).setDepth(603);
    this.cards[i] = { type, lv, img, badge, label };

    img.on('pointerdown', () => this.onCellTap(i));
    img.on('dragstart', () => {
      img.setDepth(905); badge.setDepth(906);
      sc.showSlotHints(true);
    });
    img.on('drag', (ptr, dx, dy) => {
      img.setPosition(dx, dy);
      badge.setPosition(dx + 40, dy - 42);
      label.setPosition(dx, dy + LAYOUT_V4.bench.cell / 2 - 6);
    });
    img.on('dragend', () => {
      sc.showSlotHints(false);
      const back = () => {
        sc.tweens.add({ targets: img, x, y: y - 8, duration: 180, ease: 'Back.easeOut' });
        sc.tweens.add({ targets: badge, x: x + 40, y: y - 42, duration: 180 });
        sc.tweens.add({ targets: label, x, y: y + LAYOUT_V4.bench.cell / 2 - 14, duration: 180 });
        img.setDepth(601); badge.setDepth(603);
      };
      const slot = sc.nearestFreeSlot(img.x, img.y);
      if (slot >= 0) {                       // 拖到垛位 → 上牆
        const c = this.cards[i];
        this.removeAt(i); this.clearSelect();
        sc.deployAt(slot, c.type, c.lv);
        return;
      }
      const j = this.cellAt(img.x, img.y);   // 拖到其他卡格
      if (j >= 0 && j !== i) {
        const me = this.cards[i], other = this.cards[j];
        if (other && me && other.type === me.type && other.lv === me.lv && me.type !== 'hector') {
          this.clearSelect(); this.mergePair(i, j);   // 拖曳合成！
          return;
        }
        if (!other) {                        // 拖到空格 → 搬家
          this.cards[j] = this.cards[i]; this.cards[i] = null;
          const q = this.cellPos(j);
          img.setPosition(q.x, q.y - 8); badge.setPosition(q.x + 40, q.y - 42);
          label.setPosition(q.x, q.y + LAYOUT_V4.bench.cell / 2 - 14);
          img.setDepth(601); badge.setDepth(603);
          this.rebind(j); this.clearSelect();
          return;
        }
      }
      back();
    });
    if (pop) sc.tweens.add({ targets: img, scale: { from: 0.15, to: img.scale }, duration: 220, ease: 'Back.easeOut' });
  }

  // 合成：i 併入 j（產物落在 j 格）
  mergePair(i, j) {
    const sc = this.scene;
    const a = this.cards[i];
    const nl = a.lv + 1, type = a.type;
    const pos = this.cellPos(j);
    this.removeAt(i); this.removeAt(j);
    if (nl > 5) {
      this.makeCard(j, 'hector', 1, true);
      FxV4.floatText(sc, pos.x, pos.y - 70, '⭐ 英雄覺醒！', '#FFD23C', 44);
    } else {
      this.makeCard(j, type, nl, true);
      FxV4.floatText(sc, pos.x, pos.y - 70, 'Lv' + nl, '#7AD880', 36);
    }
    FxV4.spark(sc, pos.x, pos.y, 0x7ad880, 12);
  }

  // ⚡一鍵合成：反覆找出所有同型同級對全部合完
  mergeAll() {
    let did = 0, guard = 0;
    while (guard++ < 30) {
      let found = false;
      for (let i = 0; i < this.cards.length && !found; i++) {
        const a = this.cards[i];
        if (!a || a.type === 'hector') continue;
        for (let j = i + 1; j < this.cards.length; j++) {
          const b = this.cards[j];
          if (b && b.type === a.type && b.lv === a.lv) {
            this.clearSelect(); this.mergePair(i, j); did++; found = true; break;
          }
        }
      }
      if (!found) break;
    }
    return did;
  }

  // 座標落在哪個卡格（60px 內）
  cellAt(x, y) {
    for (let i = 0; i < this.cards.length; i++) {
      const p = this.cellPos(i);
      if (Math.abs(x - p.x) < 62 && Math.abs(y - p.y) < 62) return i;
    }
    return -1;
  }

  // 搬家後重綁 tap/drag 索引（重建卡片最簡單可靠）
  rebind(j) {
    const c = this.cards[j];
    if (!c) return;
    const { type, lv } = c;
    this.removeAt(j);
    this.makeCard(j, type, lv, false);
  }

  removeAt(i) {
    const c = this.cards[i];
    if (!c) return;
    c.img.destroy(); c.badge.destroy(); c.label.destroy();
    this.cards[i] = null;
  }

  onCellTap(i) {
    const sc = this.scene;
    const c = this.cards[i];
    if (this.selected === i) { this.clearSelect(); return; }
    if (this.selected >= 0) {
      const a = this.cards[this.selected];
      if (c && a && c !== a && c.type === a.type && c.lv === a.lv && a.type !== 'hector') {
        const sel = this.selected;
        this.clearSelect();
        this.mergePair(sel, i);
        return;
      }
      this.clearSelect();
    }
    if (c) this.select(i);
  }

  select(i) {
    this.selected = i;
    this.slotRects[i].setStrokeStyle(5, 0xff8a1a);
    const sel = this.cards[i];
    this.cards.forEach((c, j) => {
      if (j !== i && c && c.type === sel.type && c.lv === sel.lv)
        this.slotRects[j].setStrokeStyle(5, 0x4caf50);
    });
    this.scene.showSlotHints(true);
  }

  clearSelect() {
    this.selected = -1;
    this.slotRects.forEach(r => r.setStrokeStyle(3, 0xb99c64));
    this.scene.showSlotHints(false);
  }

  deploySelected() {
    if (this.selected < 0) return null;
    const c = this.cards[this.selected];
    if (!c) return null;
    const info = { type: c.type, lv: c.lv };
    this.removeAt(this.selected);
    this.clearSelect();
    return info;
  }
}
