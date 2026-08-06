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
                   owner: null, barricade: null, isWall: r === this.rows - 1,
                   x: 0, y: 0, size: 0 });
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
    if (cell.blocked || cell.unit || cell.barricade) return false;
    if (this.isEntry(cell) || this.isExit(cell)) return false;
    return true;   // 城牆列也可以建，而且不影響敵人路線
  }

  // ══════════════ 多格（2×2）佔位 ══════════════

  /** 取得以 cell 為左上角、size×size 的所有格子；超出邊界回傳 null */
  footprintCells(cell, size) {
    if (!cell) return null;
    if (size <= 1) return [cell];
    const out = [];
    for (let dr = 0; dr < size; dr++) {
      for (let dc = 0; dc < size; dc++) {
        const c = this.at(cell.c + dc, cell.r + dr);
        if (!c) return null;
        out.push(c);
      }
    }
    return out;
  }

  /** 把落點吸附成合法的左上角（靠近邊界時往內縮） */
  anchorFor(cell, size) {
    if (!cell || size <= 1) return cell;
    const c = Phaser.Math.Clamp(cell.c, 0, this.cols - size);
    const r = Phaser.Math.Clamp(cell.r, 0, this.rows - size);
    return this.at(c, r);
  }

  /** size×size 是否整塊可建（2×2 不允許跨到城牆列，避免半空中） */
  buildableArea(cell, size, ignoreUnit) {
    const cells = this.footprintCells(cell, size);
    if (!cells) return false;
    if (size > 1 && cells.some(c => c.isWall)) return false;
    return cells.every(c => {
      if (ignoreUnit && c.unit === ignoreUnit) return true;
      return this.buildable(c);
    });
  }

  /** 放下 size×size 後，所有入口是否還有路 */
  wouldSealOffArea(cell, size, ignoreUnit) {
    const cells = this.footprintCells(cell, size);
    if (!cells) return true;
    if (cells.every(c => c.isWall)) return false;      // 城牆列不擋路
    const prev = cells.map(c => c.unit);
    cells.forEach(c => { if (c.unit !== ignoreUnit) c._blockTmp = true; });
    const ok = !this.entries.some(e => !this.findPath(e, this.exit));
    cells.forEach((c) => { delete c._blockTmp; });
    return !ok;
  }

  /** 標記／解除 size×size 的佔用；主格存 unit，其餘存 owner */
  occupy(cell, size, unit) {
    const cells = this.footprintCells(cell, size) || [];
    cells.forEach(c => { c.unit = unit; c.owner = (c === cell) ? null : cell; });
    return cells;
  }
  release(cell, size) {
    const cells = this.footprintCells(cell, size) || [];
    cells.forEach(c => { c.unit = null; c.owner = null; });
  }

  /** 點到副格時換成主格 */
  mainCell(cell) { return (cell && cell.owner) ? cell.owner : cell; }

  /** 城牆列上的塔不會擋路，不必檢查封死 */
  wouldSealOffCell(cell) { return cell.isWall ? false : this.wouldSealOff(cell); }

  // ── BFS 最短路 ──
  findPath(from, to, blockedExtra = null) {
    const key = (c, r) => r * this.cols + c;
    const blocked = (c, r) => {
      const cell = this.at(c, r);
      if (!cell) return true;
      if (blockedExtra && blockedExtra.c === c && blockedExtra.r === r) return true;
      return !!cell.unit || !!cell.barricade || cell.blocked || cell.isWall || !!cell._blockTmp;
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
    // 地磚是「地面」，必須在背景圖之上、走道與箭頭之下
    this.gridGfx = this.s.add.graphics().setDepth(TD.DEPTH.BG + 1);
    this.pathGfx = this.s.add.graphics().setDepth(TD.DEPTH.BG + 2);
    this.arrowGfx = this.s.add.graphics().setDepth(TD.DEPTH.BG + 3);
    this.vignetteGfx = this.s.add.graphics().setDepth(TD.DEPTH.BG + 4);
    this.hlGfx = this.s.add.graphics().setDepth(TD.DEPTH.SLOT + 1);
    this.drawGrid(false);
    this.drawVignette();

    // 入口與城門標記
    const mk = this.s.add.graphics().setDepth(TD.DEPTH.BG + 5);
    this.entries.forEach(e => {
      const p = this.cellXY(e.c, e.r);
      mk.fillStyle(0xFF4D4D, 0.45).fillCircle(p.x, p.y, this.cellW * 0.30);
      mk.lineStyle(5, 0xFF7A5C, 0.95).strokeCircle(p.x, p.y, this.cellW * 0.30);
    });
    const g = this.cellXY(this.exit.c, this.exit.r);
    mk.fillStyle(0xFFC72C, 0.40).fillCircle(g.x, g.y, this.cellW * 0.36);
    mk.lineStyle(6, 0xFFE066, 1).strokeCircle(g.x, g.y, this.cellW * 0.36);
    this.markGfx = mk;
    this.buildLabels();
  }

  /** 入口與城門的文字標示，讓新玩家一眼知道攻守方向 */
  buildLabels() {
    if (this.labels) this.labels.forEach(o => o.destroy());
    this.labels = [];
    const mk = (x, y, txt, color) => {
      const t = this.s.add.text(x, y, txt, {
        fontFamily: TD.FONT, fontSize: '24px', color,
        stroke: '#4A2E12', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(TD.DEPTH.SLOT + 2);
      this.labels.push(t);
      return t;
    };
    const e0 = this.entries[Math.floor(this.entries.length / 2)];
    const ep = this.cellXY(e0.c, e0.r);
    const up = this.entries[0].r === 0;
    mk(ep.x, ep.y - this.cellH * 0.62, '敵人從這裡進攻', '#FF9B7A');
    // 「守住城門」放在城門格的內側，避免和城牆說明擠在一起
    const gp = this.cellXY(this.exit.c, this.exit.r);
    mk(gp.x, gp.y - this.cellH * (up ? 0.60 : -0.60), '守住城門', '#FFE066');

    // 城牆列說明：放在整排的正下方
    const wr = this.wallRow;
    if (wr >= 0 && wr < this.rows) {
      const mid = this.cellXY(Math.floor(this.cols / 2), wr);
      const G = TD.LAYOUT.grid;
      mk(mid.x, mid.y + this.cellH * 0.60,
         `城牆守備位　射程 +${Math.round((G.wallRangeMul - 1) * 100)}%　傷害 +${Math.round((G.wallDmgMul - 1) * 100)}%　不擋路`,
         '#BFE3FF');
    }
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
    this.drawVignette();
    this.recomputeMainPath();
    this.buildLabels();
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

  /** 地面＝棋盤本身：深淺交替的地磚，有厚度、有邊緣，不是疊在圖上的濾鏡 */
  drawGrid(strong) {
    const P = TD.PALETTE;
    const g = this.gridGfx;
    const w = this.cellW, h = this.cellH;
    const rad = Math.min(w, h) * 0.14;
    const lip = Math.max(3, h * 0.055);        // 地磚底部厚度
    g.clear();

    this.cells.forEach(row => row.forEach(cell => {
      const x = cell.x - w / 2, y = cell.y - h / 2;
      const even = (cell.c + cell.r) % 2 === 0;
      const onWall = cell.isWall;

      if (cell.blocked) {
        g.fillStyle(0x6B5136, 1).fillRoundedRect(x + 1, y + 1, w - 2, h - 2, rad);
        g.fillStyle(0x000000, 0.30).fillRoundedRect(x + 1, y + h - lip, w - 2, lip, rad);
        g.lineStyle(3, 0x4A2E12, 0.9).strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, rad);
        return;
      }

      // 地磚改成「半透明疊加」，讓底下的地圖透出來，而不是整個蓋掉
      const deep = onWall ? P.wallLine : P.tileLine;
      g.fillStyle(deep, onWall ? 0.55 : 0.30).fillRoundedRect(x + 1, y + lip, w - 2, h - 2, rad);

      const face = onWall ? (even ? P.wallTileA : P.wallTileB)
                          : (even ? P.tileA : P.tileB);
      // 深淺交替仍在，但只是薄薄一層色調，不遮蔽底圖
      g.fillStyle(face, onWall ? 0.62 : (even ? 0.26 : 0.14))
        .fillRoundedRect(x + 1, y, w - 2, h - lip, rad);

      g.fillStyle(0xFFFFFF, onWall ? 0.22 : 0.10)
        .fillRoundedRect(x + 4, y + 3, w - 8, (h - lip) * 0.30, rad * 0.8);

      // 邊框
      g.lineStyle(strong ? 3 : 2, onWall ? P.wallLine : P.tileLine, strong ? 0.9 : 0.5)
        .strokeRoundedRect(x + 1, y, w - 2, h - lip, rad);

      // 城牆守備位：空位畫垛口記號
      if (onWall && !cell.unit) {
        const cx = cell.x, cy = cell.y - lip / 2, r2 = Math.min(w, h) * 0.15;
        g.fillStyle(P.blue, 0.35);
        g.fillTriangle(cx, cy - r2, cx + r2 * 0.85, cy + r2 * 0.65, cx - r2 * 0.85, cy + r2 * 0.65);
      }
    }));
  }

  /** 棋盤四周的內陰影，讓戰場有「陷下去」的縱深 */
  drawVignette() {
    if (!this.vignetteGfx) return;
    const a = this.area, g = this.vignetteGfx;
    const d = Math.min(this.cellW, this.cellH) * 0.55;
    g.clear();
    for (let i = 0; i < 6; i++) {
      const t = i / 6, al = 0.10 * (1 - t);
      const o = d * t;
      g.lineStyle(d / 3, 0x000000, al);
      g.strokeRect(a.x - o, a.y - o, a.w + o * 2, a.h + o * 2);
    }
  }

  drawPaths() {
    const P = TD.PALETTE;
    const g = this.pathGfx;
    g.clear();
    if (!this.mainPaths) return;
    const w = this.cellW, h = this.cellH;
    const rad = Math.min(w, h) * 0.14;
    const lip = Math.max(3, h * 0.055);

    // 1) 敵人會經過的格子換成踩踏泥土磚（仍保持方格造型）
    const seen = new Set();
    this.mainPaths.forEach(path => path.forEach(cell => {
      const k = cell.r * this.cols + cell.c;
      if (seen.has(k) || cell.isWall) return;
      seen.add(k);
      const x = cell.x - w / 2, y = cell.y - h / 2;
      g.fillStyle(P.laneDark, 0.45).fillRoundedRect(x + 1, y + lip, w - 2, h - 2, rad);
      g.fillStyle(P.lane, 0.52).fillRoundedRect(x + 1, y, w - 2, h - lip, rad);
      g.fillStyle(0x000000, 0.08).fillRoundedRect(x + 4, y + 3, w - 8, (h - lip) * 0.28, rad * 0.8);
      g.lineStyle(2, P.laneDark, 0.7).strokeRoundedRect(x + 1, y, w - 2, h - lip, rad);
    }));

    // 2) 方向箭頭
    this.arrowDirs = [];
    const drawn = new Set();
    this.mainPaths.forEach(path => {
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        const k = a.r * this.cols + a.c;
        if (drawn.has(k)) continue;
        drawn.add(k);
        this.arrowDirs.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
                              ang: Math.atan2(b.y - a.y, b.x - a.x) });
      }
    });
    this.drawArrows(1);
  }

  /** 方向箭頭（alpha 由 GameScene 每幀脈動） */
  drawArrows(alpha) {
    const g = this.arrowGfx;
    if (!g || !this.arrowDirs) return;
    const size = Math.min(this.cellW, this.cellH) * 0.26;
    g.clear();
    this.arrowDirs.forEach(a => {
      const c = Math.cos(a.ang), s2 = Math.sin(a.ang);
      const tipX = a.x + c * size, tipY = a.y + s2 * size;
      const bx = a.x - c * size * 0.55, by = a.y - s2 * size * 0.55;
      const px = -s2 * size * 0.62, py = c * size * 0.62;
      g.fillStyle(0xFFFFFF, 0.35 * alpha);
      g.fillTriangle(tipX + c * 3, tipY + s2 * 3, bx + px, by + py, bx - px, by - py);
      g.fillStyle(TD.PALETTE.gold, 0.9 * alpha);
      g.fillTriangle(tipX, tipY, bx + px * 0.8, by + py * 0.8, bx - px * 0.8, by - py * 0.8);
    });
  }

  /** 拖曳時：標示可放/不可放，並預覽新路徑（支援 2×2） */
  highlight(cell, unitDragging) {
    const g = this.hlGfx;
    g.clear();
    if (!cell) { this.drawGrid(false); return; }
    this.drawGrid(true);

    const size = unitDragging ? (unitDragging.footprint || 1) : 1;
    if (size > 1) return this.highlightArea(cell, unitDragging, size);

    const p = this.cellXY(cell.c, cell.r);
    const w = this.cellW * 0.9, h = this.cellH * 0.9;

    if (cell.unit) {
      // 已有塔：可能是合成目標
      const can = unitDragging && this.s.canCombine(unitDragging, cell.unit);
      g.lineStyle(7, can ? TD.PALETTE.gold : TD.PALETTE.danger, 1)
        .strokeRoundedRect(p.x - w / 2, p.y - h / 2, w, h, 10);
      return;
    }

    const ok = this.buildable(cell);
    const seals = ok && this.wouldSealOffCell(cell);
    const color = (!ok || seals) ? TD.PALETTE.danger : TD.PALETTE.ok;
    g.fillStyle(color, 0.22).fillRoundedRect(p.x - w / 2, p.y - h / 2, w, h, 10);
    g.lineStyle(5, color, 0.95).strokeRoundedRect(p.x - w / 2, p.y - h / 2, w, h, 10);

    // 預覽放下後敵人的新路徑，並算出「多繞幾格」
    if (ok && !seals && !cell.isWall) {
      let before = 0, after = 0, valid = true;
      this.entries.forEach(en => {
        const p0 = this.findPath(en, this.exit);
        const p1 = this.findPath(en, this.exit, cell);
        if (!p1) { valid = false; return; }
        before += p0 ? p0.length : 0;
        after += p1.length;
      });
      const preview = this.findPath(this.entries[0], this.exit, cell);
      if (preview) {
        const wd = Math.min(this.cellW, this.cellH);
        g.lineStyle(wd * 0.30, 0xFFE066, 0.55);
        for (let i = 0; i < preview.length - 1; i++) {
          const a = this.cellXY(preview[i].c, preview[i].r);
          const b = this.cellXY(preview[i + 1].c, preview[i + 1].r);
          g.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
      if (valid) {
        const diff = Math.round((after - before) / this.entries.length);
        this.showDetour(cell, diff);
      }
    } else if (seals) {
      this.showDetour(cell, null);
    } else if (ok && cell.isWall) {
      this.showDetour(cell, 'wall');
    } else {
      this.hideDetour();
    }
  }

  /** 2×2 巨人單位的落點預覽 */
  highlightArea(cell, unit, size) {
    const g = this.hlGfx;
    const anchor = this.anchorFor(cell, size);
    if (!anchor) { this.hideDetour(); return; }
    const ok = this.buildableArea(anchor, size, unit);
    const seals = ok && this.wouldSealOffArea(anchor, size, unit);
    const color = (!ok || seals) ? TD.PALETTE.danger : TD.PALETTE.ok;

    const p0 = this.cellXY(anchor.c, anchor.r);
    const x = p0.x - this.cellW / 2 + this.cellW * 0.05;
    const y = p0.y - this.cellH / 2 + this.cellH * 0.05;
    const w = this.cellW * size - this.cellW * 0.10;
    const h = this.cellH * size - this.cellH * 0.10;
    g.fillStyle(color, 0.22).fillRoundedRect(x, y, w, h, 14);
    g.lineStyle(6, color, 0.95).strokeRoundedRect(x, y, w, h, 14);
    // 內部格線，讓玩家看清楚吃掉幾格
    g.lineStyle(2, color, 0.5);
    for (let i = 1; i < size; i++) {
      g.lineBetween(x + w / size * i, y, x + w / size * i, y + h);
      g.lineBetween(x, y + h / size * i, x + w, y + h / size * i);
    }

    if (!ok) { this.showDetour(anchor, 'noroom'); return; }
    if (seals) { this.showDetour(anchor, null); return; }

    let before = 0, after = 0;
    const cells = this.footprintCells(anchor, size);
    cells.forEach(c => { if (c.unit !== unit) c._blockTmp = true; });
    this.entries.forEach(en => {
      const p1 = this.findPath(en, this.exit);
      after += p1 ? p1.length : 0;
    });
    cells.forEach(c => { delete c._blockTmp; });
    this.entries.forEach(en => {
      const p0b = this.findPath(en, this.exit);
      before += p0b ? p0b.length : 0;
    });
    const diff = Math.round((after - before) / this.entries.length);
    this.showDetour(anchor, diff);
  }

  /** 顯示「這座塔會讓敵人多繞幾格」 */
  showDetour(cell, diff) {
    if (!this.detourTxt) {
      this.detourTxt = this.s.add.text(0, 0, '', {
        fontFamily: TD.FONT, fontSize: '34px', color: '#FFF6E0',
        stroke: '#4A2E12', strokeThickness: 6, align: 'center',
      }).setOrigin(0.5).setDepth(TD.DEPTH.FX_TOP);
    }
    const t = this.detourTxt;
    t.setVisible(true).setPosition(cell.x, cell.y - this.cellH * 0.78);
    if (diff === 'noroom') { t.setText('這裡放不下 2×2 巨人').setColor('#FF6B6B'); }
    else if (diff === null) { t.setText('會把路完全堵死\n不能放這裡').setColor('#FF6B6B'); }
    else if (diff === 'wall') {
      const G = TD.LAYOUT.grid;
      t.setText(`城牆守備位 · 不擋路\n居高臨下：射程 +${Math.round((G.wallRangeMul - 1) * 100)}%　傷害 +${Math.round((G.wallDmgMul - 1) * 100)}%`)
       .setColor('#8CE99A');
    }
    else if (diff > 0) { t.setText(`敵人要多繞 ${diff} 格`).setColor('#8CE99A'); }
    else { t.setText('不影響路線').setColor('#FFE066'); }
  }

  hideDetour() { if (this.detourTxt) this.detourTxt.setVisible(false); }

  clearHighlight() {
    this.hlGfx.clear();
    this.drawGrid(false);
    this.hideDetour();
  }
};
