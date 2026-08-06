/* 戰場網格 + 尋路
 * 玩家可在任意空格建塔；塔會阻擋通行，敵人以 BFS 找最短路繞行。
 * 保護規則：若放下這座塔會讓任何入口到城門完全無路，就不允許放。
 */
window.TD = window.TD || {};

TD.Grid = class Grid {
  constructor(scene) {
    this.s = scene;
    const G = TD.LAYOUT.grid;
    this.cols = G.cols;
    this.rows = G.rows;
    this.wallRow = this.rows - 1;          // 城牆列（不可通行、可建塔）
    this.entries = G.entries.map(c => ({ c, r: 0 }));
    this.exit = { c: G.exitCol, r: this.rows - 2 };   // 城門前一格＝敵人的目標

    // cells[r][c] 同時作為「戰場塔位 slot」使用，介面與合成台格子一致
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({ c, r, type: 'field', blocked: false, locked: false, unit: null,
                   isWall: r === this.rows - 1, x: 0, y: 0, size: 0 });
      }
      this.cells.push(row);
    }
    this.syncCellXY();
    this.buildGfx();
    this.recomputeMainPath();
  }

  /** 版面變動後重算每格的畫面座標 */
  syncCellXY() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const p = this.cellXY(c, r);
        const cell = this.cells[r][c];
        cell.x = p.x; cell.y = p.y; cell.size = Math.min(this.cellW, this.cellH);
      }
    }
  }

  // ── 座標換算（網格鋪在地圖中央的空地上，避開兩側裝飾）──
  get area() {
    const B = TD.LAYOUT.battle, G = TD.LAYOUT.grid;
    const x = B.x + B.w * G.insetL;
    const y = B.y + B.h * G.insetT;
    return { x, y, w: B.w * (1 - G.insetL - G.insetR), h: B.h * (1 - G.insetT - G.insetB) };
  }
  get cellW() { return this.area.w / this.cols; }
  get cellH() { return this.area.h / this.rows; }

  cellXY(c, r) {
    const a = this.area;
    return { x: a.x + (c + 0.5) * this.cellW, y: a.y + (r + 0.5) * this.cellH };
  }

  xyToCell(x, y) {
    const a = this.area;
    const c = Math.floor((x - a.x) / this.cellW);
    const r = Math.floor((y - a.y) / this.cellH);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
    return this.cells[r][c];
  }

  at(c, r) {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
    return this.cells[r][c];
  }

  isEntry(cell) { return this.entries.some(e => e.c === cell.c && e.r === cell.r); }
  isExit(cell) { return cell.c === this.exit.c && cell.r === this.exit.r; }

  /** 這格能不能建塔（不看是否封死路） */
  buildable(cell) {
    if (!cell) return false;
    if (cell.blocked || cell.unit) return false;
    if (this.isEntry(cell) || this.isExit(cell)) return false;
    return true;   // 城牆列也可以建，而且不影響敵人路線
  }

  /** 城牆列上的塔不會擋路，不必檢查封死 */
  wouldSealOffCell(cell) { return cell.isWall ? false : this.wouldSealOff(cell); }

  // ── BFS 最短路 ──
  findPath(from, to, blockedExtra = null) {
    const key = (c, r) => r * this.cols + c;
    const blocked = (c, r) => {
      const cell = this.at(c, r);
      if (!cell) return true;
      if (blockedExtra && blockedExtra.c === c && blockedExtra.r === r) return true;
      return !!cell.unit || cell.blocked || cell.isWall;
    };
    const start = key(from.c, from.r), goal = key(to.c, to.r);
    const prev = new Map();
    const seen = new Set([start]);
    const q = [[from.c, from.r]];
    const D = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    while (q.length) {
      const [c, r] = q.shift();
      if (key(c, r) === goal) {
        // 回溯
        // 回傳實際的 cell 參照（帶 x/y/unit），供敵人直接移動與判斷
        const path = [];
        let k = goal, cc = c, rr = r;
        while (k !== start) {
          path.push(this.cells[rr][cc]);
          const p = prev.get(k);
          if (!p) break;
          cc = p.c; rr = p.r; k = key(cc, rr);
        }
        path.push(this.cells[from.r][from.c]);
        return path.reverse();
      }
      for (const [dc, dr] of D) {
        const nc = c + dc, nr = r + dr;
        const nk = key(nc, nr);
        if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue;
        if (seen.has(nk)) continue;
        if (blocked(nc, nr)) continue;
        seen.add(nk);
        prev.set(nk, { c, r });
        q.push([nc, nr]);
      }
    }
    return null;
  }

  /** 在 cell 放塔後，所有入口是否仍能抵達城門 */
  wouldSealOff(cell) {
    return this.entries.some(e => !this.findPath(e, this.exit, cell));
  }

  /** 從任意格到城門的最短路 */
  pathFrom(cell) { return this.findPath(cell, this.exit); }

  /** 主要示意路徑（給玩家看的「目前敵人會怎麼走」） */
  recomputeMainPath() {
    this.mainPaths = this.entries.map(e => this.findPath(e, this.exit)).filter(Boolean);
    this.drawPaths();
  }

  // ── 繪製 ──
  buildGfx() {
    this.gridGfx = this.s.add.graphics().setDepth(TD.DEPTH.SLOT);
    this.pathGfx = this.s.add.graphics().setDepth(TD.DEPTH.PATH);
    this.hlGfx = this.s.add.graphics().setDepth(TD.DEPTH.SLOT + 1);
    this.drawGrid(false);

    // 入口與城門標記
    const mk = this.s.add.graphics().setDepth(TD.DEPTH.SLOT + 1);
    this.entries.forEach(e => {
      const p = this.cellXY(e.c, e.r);
      mk.fillStyle(0xFF4D4D, 0.45).fillCircle(p.x, p.y, this.cellW * 0.30);
      mk.lineStyle(5, 0xFF7A5C, 0.95).strokeCircle(p.x, p.y, this.cellW * 0.30);
    });
    const g = this.cellXY(this.exit.c, this.exit.r);
    mk.fillStyle(0xFFC72C, 0.40).fillCircle(g.x, g.y, this.cellW * 0.36);
    mk.lineStyle(6, 0xFFE066, 1).strokeCircle(g.x, g.y, this.cellW * 0.36);
    this.markGfx = mk;
  }

  /** 版面或關卡階段變更後整個重畫 */
  redraw() {
    this.syncCellXY();
    this.markGfx.clear();
    this.entries.forEach(e => {
      const p = this.cellXY(e.c, e.r);
      this.markGfx.fillStyle(0xFF4D4D, 0.45).fillCircle(p.x, p.y, this.cellW * 0.30);
      this.markGfx.lineStyle(5, 0xFF7A5C, 0.95).strokeCircle(p.x, p.y, this.cellW * 0.30);
    });
    const g = this.cellXY(this.exit.c, this.exit.r);
    this.markGfx.fillStyle(0xFFC72C, 0.40).fillCircle(g.x, g.y, this.cellW * 0.36);
    this.markGfx.lineStyle(6, 0xFFE066, 1).strokeCircle(g.x, g.y, this.cellW * 0.36);
    this.drawGrid(false);
    this.recomputeMainPath();
  }

  /** 第 10 關城內戰：入口與城門對調 */
  flip() {
    const G = TD.LAYOUT.grid;
    const atTop = this.entries[0].r === 0;
    // 城內戰：敵人改從城牆那側湧入，目標變成上方
    this.entries = G.entries.map(c => ({ c, r: atTop ? this.rows - 2 : 0 }));
    this.exit = { c: G.exitCol, r: atTop ? 0 : this.rows - 2 };
    this.redraw();
  }

  drawGrid(strong) {
    const g = this.gridGfx;
    const w = this.cellW, h = this.cellH;
    const pad = Math.min(w, h) * 0.055;
    g.clear();

    this.cells.forEach(row => row.forEach(cell => {
      const x = cell.x - w / 2 + pad, y = cell.y - h / 2 + pad;
      const cw = w - pad * 2, ch = h - pad * 2;
      const rad = Math.min(cw, ch) * 0.16;

      if (cell.blocked) {
        g.fillStyle(0x3A2416, 0.55).fillRoundedRect(x, y, cw, ch, rad);
        g.lineStyle(3, 0x8B5A2B, 0.9).strokeRoundedRect(x, y, cw, ch, rad);
        return;
      }
      if (cell.isWall) {
        // 城牆上的守備位：石砌垛口
        g.fillStyle(0xFFFFFF, cell.unit ? 0.10 : (strong ? 0.34 : 0.20))
          .fillRoundedRect(x, y, cw, ch, rad);
        g.lineStyle(strong ? 4 : 3, 0xFFE066, strong ? 0.95 : 0.55)
          .strokeRoundedRect(x, y, cw, ch, rad);
        return;
      }
      // 可建格：明亮半透明色塊
      const canBuild = !cell.unit;
      g.fillStyle(0xFFFFFF, canBuild ? (strong ? 0.30 : 0.15) : 0.06)
        .fillRoundedRect(x, y, cw, ch, rad);
      g.lineStyle(strong ? 3 : 2, 0x6B4423, strong ? 0.55 : 0.22)
        .strokeRoundedRect(x, y, cw, ch, rad);
      if (strong && canBuild) {
        g.lineStyle(2, 0xFFFFFF, 0.5).strokeRoundedRect(x + 3, y + 3, cw - 6, ch - 6, rad - 2);
      }
    }));
  }

  drawPaths() {
    const g = this.pathGfx;
    g.clear();
    if (!this.mainPaths) return;
    const w = this.cellW, h = this.cellH;
    const pad = Math.min(w, h) * 0.055;
    // 敵人會經過的格子鋪成一條土黃色走道
    const seen = new Set();
    this.mainPaths.forEach(path => path.forEach(cell => {
      const k = cell.r * this.cols + cell.c;
      if (seen.has(k)) return;
      seen.add(k);
      const x = cell.x - w / 2 + pad, y = cell.y - h / 2 + pad;
      const cw = w - pad * 2, ch = h - pad * 2;
      g.fillStyle(0x9C6B3A, 0.45).fillRoundedRect(x, y, cw, ch, Math.min(cw, ch) * 0.16);
    }));
  }

  /** 拖曳時：標示可放/不可放，並預覽新路徑 */
  highlight(cell, unitDragging) {
    const g = this.hlGfx;
    g.clear();
    if (!cell) { this.drawGrid(false); return; }
    this.drawGrid(true);

    const p = this.cellXY(cell.c, cell.r);
    const w = this.cellW * 0.9, h = this.cellH * 0.9;

    if (cell.unit) {
      // 已有塔：可能是合成目標
      const can = unitDragging && this.s.canCombine(unitDragging, cell.unit);
      g.lineStyle(7, can ? 0xFFC72C : 0xFF4D4D, 1)
        .strokeRoundedRect(p.x - w / 2, p.y - h / 2, w, h, 10);
      return;
    }

    const ok = this.buildable(cell);
    const seals = ok && this.wouldSealOffCell(cell);
    const color = (!ok || seals) ? 0xFF4D4D : 0x4CD97B;
    g.fillStyle(color, 0.22).fillRoundedRect(p.x - w / 2, p.y - h / 2, w, h, 10);
    g.lineStyle(5, color, 0.95).strokeRoundedRect(p.x - w / 2, p.y - h / 2, w, h, 10);

    // 預覽放下後敵人的新路徑
    if (ok && !seals) {
      const preview = this.findPath(this.entries[0], this.exit, cell);
      if (preview) {
        g.lineStyle(10, 0xFFE066, 0.7);
        for (let i = 0; i < preview.length - 1; i++) {
          const a = this.cellXY(preview[i].c, preview[i].r);
          const b = this.cellXY(preview[i + 1].c, preview[i + 1].r);
          g.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
    }
  }

  clearHighlight() { this.hlGfx.clear(); this.drawGrid(false); }
};
