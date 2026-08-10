/* v2 合成台 — 點擊優先（點A再點B合成；點守軍再點垛口上牆），支援一鍵合成
 * 選取狀態由本類統一管理（含牆上守軍的選取）
 */
window.TD = window.TD || {};

TD.Bench = class Bench {
  constructor(scene) {
    this.s = scene;
    const L = TD.LAYOUT.bench;
    this.cells = new Array(L.cols * L.rows).fill(null);   // {type, lv} | null
    this.sel = null;            // {kind:'bench', i} | {kind:'wall', slot}
    this.recruitCount = 0;
    this.cards = [];
    this.build();
  }

  cellXY(i) {
    const L = TD.LAYOUT.bench;
    const c = i % L.cols, r = (i / L.cols) | 0;
    return {
      x: L.x + c * (L.cell + L.gap) + L.cell / 2,
      y: L.y + r * (L.cell + L.gap) + L.cell / 2,
    };
  }

  build() {
    const s = this.s, L = TD.LAYOUT.bench;
    this.gfx = s.add.graphics().setDepth(TD.DEPTH.BENCH);
    this.cells.forEach((_, i) => {
      const { x, y } = this.cellXY(i);
      const z = s.add.zone(x, y, L.cell, L.cell).setInteractive();
      z.on('pointerdown', () => this.tapBench(i));
    });
    this.redraw();
  }

  redraw() {
    const s = this.s, L = TD.LAYOUT.bench;
    const g = this.gfx; g.clear();
    this.cards.forEach(c => c.destroy()); this.cards = [];

    // 石雕槽位底圖（每格一張，靜態）
    if (!this.slotImgs) {
      this.slotImgs = this.cells.map((_, i) => {
        const { x, y } = this.cellXY(i);
        const img = s.add.image(x, y, 'B_slot').setDepth(TD.DEPTH.BENCH);
        img.setDisplaySize(L.cell, L.cell);
        return img;
      });
    }

    this.cells.forEach((cell, i) => {
      const { x, y } = this.cellXY(i);
      const selected = this.sel && this.sel.kind === 'bench' && this.sel.i === i;
      if (selected) {
        g.lineStyle(6, 0xFF8A1A, 1)
          .strokeRoundedRect(x - L.cell / 2, y - L.cell / 2, L.cell, L.cell, 16);
      }
      if (!cell) return;
      const u = TD.UNITS[cell.type];
      const c = s.add.container(x, y).setDepth(TD.DEPTH.UNIT);
      const img = s.add.image(0, -4, u.icon).setOrigin(0.5, 0.5);
      img.setScale((L.cell - 46) / img.height);
      const badgeBg = s.add.graphics();
      badgeBg.fillStyle(u.color, 1).fillCircle(L.cell / 2 - 24, -L.cell / 2 + 24, 20);
      badgeBg.lineStyle(3, 0xFFFFFF, 0.9).strokeCircle(L.cell / 2 - 24, -L.cell / 2 + 24, 20);
      const lvT = s.add.text(L.cell / 2 - 24, -L.cell / 2 + 24, String(cell.lv), {
        fontFamily: TD.FONT, fontSize: '24px', color: '#FFFFFF', fontStyle: 'bold',
        stroke: '#00000040', strokeThickness: 3,
      }).setOrigin(0.5);
      const nameT = s.add.text(0, L.cell / 2 - 17, u.name, {
        fontFamily: TD.FONT, fontSize: '20px', color: '#F2E4C0', fontStyle: 'bold',
        stroke: '#2A1A0C', strokeThickness: 4,
      }).setOrigin(0.5);
      c.add([img, badgeBg, lvT, nameT]);
      this.cards.push(c);

      // 可合成提示：同種同級描綠邊
      const pair = this.cells.some((o, j) => j !== i && o && o.type === cell.type && o.lv === cell.lv);
      if (pair) g.lineStyle(4, 0x4CAF50, 0.95)
        .strokeRoundedRect(x - L.cell / 2 + 5, y - L.cell / 2 + 5, L.cell - 10, L.cell - 10, 13);
    });

    // 有選取時亮出空垛口提示
    this.s.wall && this.s.wall.showSlotHints(!!this.sel);
  }

  // ── 點擊合成台格子 ──
  tapBench(i) {
    if (this.s.over) return;
    const cell = this.cells[i];
    const sel = this.sel;

    if (!sel) {
      if (cell) { this.sel = { kind: 'bench', i }; TD.audio.coin(); }
      this.redraw(); return;
    }
    if (sel.kind === 'bench') {
      if (sel.i === i) { this.sel = null; this.redraw(); return; }   // 再點取消
      const a = this.cells[sel.i];
      if (!cell) {                       // 移動
        this.cells[i] = a; this.cells[sel.i] = null; this.sel = null;
      } else if (a && cell.type === a.type && cell.lv === a.lv && cell.lv < TD.MAX_LV) {
        this.cells[i] = { type: a.type, lv: a.lv + 1 };              // 合成！
        this.cells[sel.i] = null; this.sel = null;
        this.mergeFx(i, this.cells[i].lv);
      } else {
        this.sel = { kind: 'bench', i };                             // 換選取
      }
      this.redraw(); return;
    }
    if (sel.kind === 'wall') {
      const u = sel.slot.unit;
      if (!u) { this.sel = null; this.redraw(); return; }
      if (!cell) {                       // 收回牆上守軍
        this.cells[i] = { type: u.type, lv: u.lv };
        u.destroy(); sel.slot.unit = null;
        this.sel = null; this.redraw(); return;
      }
      if (cell.type === u.type && cell.lv === u.lv && cell.lv < TD.MAX_LV) {
        // 牆上 + 台上合成 → 升級台上
        this.cells[i] = { type: u.type, lv: u.lv + 1 };
        u.destroy(); sel.slot.unit = null;
        this.sel = null; this.mergeFx(i, this.cells[i].lv);
        this.redraw(); return;
      }
      this.sel = null; this.redraw();
    }
  }

  // ── 點擊垛口 ──
  tapSlot(slot) {
    if (this.s.over) return;
    const sel = this.sel;

    // 垛口著火：優先滅火
    if (slot.burning) { this.s.wall.tapExtinguish(slot); return; }

    if (!sel) {
      if (slot.unit) { this.sel = { kind: 'wall', slot }; TD.audio.coin(); this.redraw(); }
      return;
    }
    if (sel.kind === 'bench') {
      const cell = this.cells[sel.i];
      if (!cell) { this.sel = null; this.redraw(); return; }
      if (!slot.unit) {                  // 上牆！
        slot.unit = new TD.Unit(this.s, slot, cell.type, cell.lv);
        this.cells[sel.i] = null; this.sel = null;
      } else if (slot.unit.type === cell.type && slot.unit.lv === cell.lv && cell.lv < TD.MAX_LV) {
        const lv = cell.lv + 1;          // 直接在牆上合成
        slot.unit.destroy();
        slot.unit = new TD.Unit(this.s, slot, cell.type, lv);
        this.cells[sel.i] = null; this.sel = null;
        this.wallMergeFx(slot, lv);
      } else { TD.audio.deny(); this.sel = null; }
      this.redraw(); return;
    }
    if (sel.kind === 'wall') {
      if (sel.slot === slot) { this.sel = null; this.redraw(); return; }
      const u = sel.slot.unit;
      if (!u) { this.sel = null; this.redraw(); return; }
      if (!slot.unit) {                  // 換位
        slot.unit = new TD.Unit(this.s, slot, u.type, u.lv);
        slot.unit.hp = u.hp;
        u.destroy(); sel.slot.unit = null;
      } else if (slot.unit.type === u.type && slot.unit.lv === u.lv && u.lv < TD.MAX_LV) {
        const lv = u.lv + 1;
        slot.unit.destroy(); u.destroy();
        sel.slot.unit = null;
        slot.unit = new TD.Unit(this.s, slot, u.type, lv);
        this.wallMergeFx(slot, lv);
      } else TD.audio.deny();
      this.sel = null; this.redraw();
    }
  }

  mergeFx(i, lv) {
    const { x, y } = this.cellXY(i);
    this.s.fx.sparks(x, y, 10 + lv * 3, { spread: 3.14, power: 300 });
    this.s.fx.flashWhite(0.12, 60);
    TD.audio.merge(lv);
  }
  wallMergeFx(slot, lv) {
    this.s.fx.sparks(slot.x, slot.y - 30, 12 + lv * 4, { spread: 3.14, power: 340 });
    this.s.fx.shake(2, 100);
    TD.audio.merge(lv);
  }

  // ── 徵兵 ──
  recruitCost() { return TD.RECRUIT_BASE + this.recruitCount * TD.RECRUIT_STEP; }

  recruit() {
    if (this.s.over) return;
    const cost = this.recruitCost();
    if (this.s.gold < cost) { TD.audio.deny(); this.s.hud.flashGold(); return; }
    const empty = this.cells.map((c, i) => c ? -1 : i).filter(i => i >= 0);
    if (!empty.length) { TD.audio.deny(); return; }
    this.s.gold -= cost;
    this.recruitCount++;
    const types = Object.keys(TD.UNITS);
    const i = Phaser.Utils.Array.GetRandom(empty);
    this.cells[i] = { type: Phaser.Utils.Array.GetRandom(types), lv: 1 };
    const { x, y } = this.cellXY(i);
    this.s.fx.dust(x, y, 3);
    TD.audio.coin();
    this.redraw();
    this.s.hud.refresh();
  }

  // ── 一鍵合成 ──
  autoMerge() {
    let merged = 0;
    let again = true;
    while (again) {
      again = false;
      for (let i = 0; i < this.cells.length; i++) {
        const a = this.cells[i];
        if (!a || a.lv >= TD.MAX_LV) continue;
        for (let j = i + 1; j < this.cells.length; j++) {
          const b = this.cells[j];
          if (b && b.type === a.type && b.lv === a.lv) {
            this.cells[i] = { type: a.type, lv: a.lv + 1 };
            this.cells[j] = null;
            this.mergeFx(i, a.lv + 1);
            merged++; again = true; break;
          }
        }
        if (again) break;
      }
    }
    if (!merged) TD.audio.deny();
    this.sel = null;
    this.redraw();
  }
};
