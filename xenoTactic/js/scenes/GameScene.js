class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  // ==========================
  // LIFECYCLE
  // ==========================
  create() {
    // State
    this.gold = 150;
    this.lives = 20;
    this.currentWave = 0;
    this.waveInProgress = false;
    this.gameOver = false;
    this.gameWon = false;
    this.score = 0;
    this.gameSpeed = 1;

    // Grid: null = empty, string = tower key
    this.grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));

    // Collections
    this.towers = [];
    this.enemies = [];
    this.bullets = [];

    // Selected tower type for placement
    this.selectedTowerKey = null;
    this.hoveredCell = { col: -1, row: -1 };

    // Pathfinding
    this.pathfinder = new AStar(GRID_COLS, GRID_ROWS);
    this.blockedCells = new Set(); // "col,row" strings
    this.currentPath = null;
    this.recalculatePath();

    // Wave system
    this.waves = generateWaves();
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1000;

    // Graphics layers (depth order)
    this.bgGraphics     = this.add.graphics().setDepth(0);
    this.pathGraphics   = this.add.graphics().setDepth(1);
    this.towerGraphics  = this.add.graphics().setDepth(2);
    this.dynamicLayer   = this.add.graphics().setDepth(3);
    this.uiLayer        = this.add.graphics().setDepth(9);
    this.overlayLayer   = this.add.graphics().setDepth(20);

    // Build static visuals
    this.drawBackground();
    this.drawEntryExit();
    this.createHUD();
    this.createTowerPanel();
    this.drawPath();

    // Input
    this.setupInput();

    this._nextEnemyId = 0;
    this._nextBulletId = 0;

    // Show welcome message
    this.showMsg('Place towers then press START WAVE', '#aabbcc');
  }

  update(time, delta) {
    if (this.gameOver || this.gameWon) return;

    const dt = delta * this.gameSpeed;

    this.updateSpawn(dt);
    this.updateEnemies(dt);
    this.updateTowers(time);
    this.updateBullets(dt);
    this.checkWaveComplete();

    // Redraw dynamic layer
    this.dynamicLayer.clear();
    this.drawPath();
    this.drawEnemies();
    this.drawBullets();
    this.drawGhostTower();

    this.updateHUD();
    this.cleanup();
  }

  // ==========================
  // DRAWING
  // ==========================
  drawBackground() {
    const g = this.bgGraphics;

    // Overall BG
    g.fillStyle(0x050a14);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Grid cells (checkerboard)
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = GRID_OFFSET_X + c * CELL_SIZE;
        const y = GRID_OFFSET_Y + r * CELL_SIZE;
        const shade = (c + r) % 2 === 0 ? 0x0c1222 : 0x090e1a;
        g.fillStyle(shade);
        g.fillRect(x + 1, y + 1, CELL_SIZE - 1, CELL_SIZE - 1);
      }
    }

    // Grid lines
    g.lineStyle(1, 0x182840, 0.9);
    for (let c = 0; c <= GRID_COLS; c++) {
      const x = GRID_OFFSET_X + c * CELL_SIZE;
      g.lineBetween(x, GRID_OFFSET_Y, x, GRID_OFFSET_Y + GRID_ROWS * CELL_SIZE);
    }
    for (let r = 0; r <= GRID_ROWS; r++) {
      const y = GRID_OFFSET_Y + r * CELL_SIZE;
      g.lineBetween(GRID_OFFSET_X, y, GRID_OFFSET_X + GRID_COLS * CELL_SIZE, y);
    }

    // Grid border
    g.lineStyle(2, 0x334466);
    g.strokeRect(GRID_OFFSET_X, GRID_OFFSET_Y, GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);

    // HUD bar
    g.fillStyle(0x080d1a);
    g.fillRect(0, 0, GAME_WIDTH, HUD_HEIGHT);
    g.lineStyle(1, 0x2a3a5a);
    g.lineBetween(0, HUD_HEIGHT, GAME_WIDTH, HUD_HEIGHT);

    // Side panel
    const px = GRID_COLS * CELL_SIZE;
    g.fillStyle(0x080d1a);
    g.fillRect(px, 0, PANEL_WIDTH, GAME_HEIGHT);
    g.lineStyle(2, 0x2a3a5a);
    g.lineBetween(px, 0, px, GAME_HEIGHT);
  }

  drawEntryExit() {
    const g = this.bgGraphics;

    // Entry cell
    const ex = GRID_OFFSET_X + ENTRY.col * CELL_SIZE;
    const ey = GRID_OFFSET_Y + ENTRY.row * CELL_SIZE;
    g.fillStyle(0x00ff44, 0.25);
    g.fillRect(ex + 1, ey + 1, CELL_SIZE - 1, CELL_SIZE - 1);
    g.lineStyle(2, 0x00ff44);
    g.strokeRect(ex + 1, ey + 1, CELL_SIZE - 2, CELL_SIZE - 2);

    // Exit cell
    const xx = GRID_OFFSET_X + EXIT.col * CELL_SIZE;
    const xy = GRID_OFFSET_Y + EXIT.row * CELL_SIZE;
    g.fillStyle(0xff3300, 0.25);
    g.fillRect(xx + 1, xy + 1, CELL_SIZE - 1, CELL_SIZE - 1);
    g.lineStyle(2, 0xff3300);
    g.strokeRect(xx + 1, xy + 1, CELL_SIZE - 2, CELL_SIZE - 2);

    // Labels
    this.add.text(ex + CELL_SIZE / 2, ey + CELL_SIZE / 2, 'IN', {
      fontSize: '11px', color: '#00ff44', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);
    this.add.text(xx + CELL_SIZE / 2, xy + CELL_SIZE / 2, 'OUT', {
      fontSize: '11px', color: '#ff4400', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);
  }

  drawPath() {
    const g = this.pathGraphics;
    g.clear();
    if (!this.currentPath) return;

    for (let i = 0; i < this.currentPath.length; i++) {
      const { col, row } = this.currentPath[i];
      // Skip entry/exit cells
      if ((col === ENTRY.col && row === ENTRY.row) || (col === EXIT.col && row === EXIT.row)) continue;
      const x = GRID_OFFSET_X + col * CELL_SIZE;
      const y = GRID_OFFSET_Y + row * CELL_SIZE;
      const t = i / (this.currentPath.length - 1);
      // Color: green → red along the path
      const r = Math.floor(t * 60);
      const gv = Math.floor((1 - t) * 50);
      const b = Math.floor(40 + t * 20);
      g.fillStyle(Phaser.Display.Color.GetColor(r, gv + 20, b), 0.35);
      g.fillRect(x + 2, y + 2, CELL_SIZE - 3, CELL_SIZE - 3);

      // Arrow direction
      if (i < this.currentPath.length - 1) {
        const nx = this.currentPath[i + 1];
        const dc = nx.col - col;
        const dr = nx.row - row;
        const cx = GRID_OFFSET_X + col * CELL_SIZE + CELL_SIZE / 2;
        const cy = GRID_OFFSET_Y + row * CELL_SIZE + CELL_SIZE / 2;
        g.fillStyle(0xffffff, 0.12);
        g.fillTriangle(
          cx + dc * 10, cy + dr * 10,
          cx + dr * 5 - dc * 4, cy - dc * 5 - dr * 4,
          cx - dr * 5 - dc * 4, cy + dc * 5 - dr * 4
        );
      }
    }
  }

  drawEnemies() {
    const g = this.dynamicLayer;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const def = ENEMY_DEFS[e.type] || ENEMY_DEFS['BASIC'];
      const sz = e.isBoss ? def.size : (def.size || 9);

      // Shadow
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(e.x + 2, e.y + 3, sz * 2.2, sz * 0.8);

      // Body
      g.fillStyle(e.isFrozen ? 0xaaeeff : (e.slowFactor < 1 ? 0x88ddff : def.color));
      if (e.isFlying) {
        // Hexagon-ish for flyers
        g.fillStar(e.x, e.y, 3, sz * 0.6, sz);
      } else if (e.isBoss) {
        g.fillRect(e.x - sz, e.y - sz, sz * 2, sz * 2);
        g.lineStyle(2, 0xff6666);
        g.strokeRect(e.x - sz, e.y - sz, sz * 2, sz * 2);
      } else {
        g.fillCircle(e.x, e.y, sz);
      }

      // Directional indicator
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(e.x + e.vx * sz * 0.5, e.y + e.vy * sz * 0.5, 2);

      // Health bar
      const barW = sz * 2.5;
      const barH = 4;
      const barX = e.x - barW / 2;
      const barY = e.y - sz - 8;
      const hp_pct = e.hp / e.maxHp;

      g.fillStyle(0x222222, 0.8);
      g.fillRect(barX, barY, barW, barH);

      const barColor = hp_pct > 0.6 ? 0x44ff44 : (hp_pct > 0.3 ? 0xffdd00 : 0xff2222);
      g.fillStyle(barColor);
      g.fillRect(barX, barY, barW * hp_pct, barH);

      // Freeze ring
      if (e.isFrozen) {
        g.lineStyle(2, 0x88eeff, 0.8);
        g.strokeCircle(e.x, e.y, sz + 4);
      }
    }
  }

  drawBullets() {
    const g = this.dynamicLayer;
    for (const b of this.bullets) {
      if (b.dead) continue;
      if (b.isFreeze) {
        g.fillStyle(0x88eeff, 0.9);
        g.fillCircle(b.x, b.y, 5);
        g.lineStyle(1, 0xffffff, 0.6);
        g.strokeCircle(b.x, b.y, 5);
      } else if (b.isAoe) {
        // Pulse ring
        g.lineStyle(2, TOWER_DEFS['SONIC'].color, 0.7);
        g.strokeCircle(b.x, b.y, b.aoeRadius);
      } else {
        const col = b.color || 0xffffff;
        g.fillStyle(col, 0.9);
        g.fillCircle(b.x, b.y, 4);
        // Trail
        g.fillStyle(col, 0.3);
        g.fillCircle(b.x - b.vx * 8, b.y - b.vy * 8, 2.5);
      }
    }
  }

  drawGhostTower() {
    const g = this.dynamicLayer;
    const { col, row } = this.hoveredCell;
    if (!this.selectedTowerKey || col < 0 || row < 0) return;
    if (col >= GRID_COLS || row >= GRID_ROWS) return;

    const def = TOWER_DEFS[this.selectedTowerKey];
    const valid = this.canPlaceTower(col, row);
    const x = GRID_OFFSET_X + col * CELL_SIZE;
    const y = GRID_OFFSET_Y + row * CELL_SIZE;
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;

    // Range circle
    const rangeRadius = def.range * CELL_SIZE;
    g.lineStyle(1, valid ? 0x44ff88 : 0xff4444, 0.5);
    g.strokeCircle(cx, cy, rangeRadius);
    g.fillStyle(valid ? 0x44ff88 : 0xff4444, 0.06);
    g.fillCircle(cx, cy, rangeRadius);

    // Ghost tower body
    g.fillStyle(def.color, valid ? 0.55 : 0.3);
    g.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
    g.lineStyle(2, valid ? 0xffffff : 0xff4444, 0.8);
    g.strokeRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
  }

  // Draw a single tower on the towerGraphics layer
  drawTower(tower) {
    const g = this.towerGraphics;
    const def = TOWER_DEFS[tower.key];
    const x = GRID_OFFSET_X + tower.col * CELL_SIZE;
    const y = GRID_OFFSET_Y + tower.row * CELL_SIZE;
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;
    const hs = CELL_SIZE / 2 - 3;

    // Base
    g.fillStyle(def.color);
    g.fillRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);

    // Inner detail
    g.fillStyle(def.barrelColor || Phaser.Display.Color.IntegerToColor(def.color).darken(30).color);
    g.fillRect(x + 9, y + 9, CELL_SIZE - 18, CELL_SIZE - 18);

    // Barrel direction (always pointing right initially)
    g.fillStyle(def.barrelColor || 0xffffff);
    g.fillRect(cx, cy - 3, hs, 6);

    // Corner bolts
    g.fillStyle(0x000000, 0.5);
    [[x+4, y+4],[x+CELL_SIZE-8,y+4],[x+4,y+CELL_SIZE-8],[x+CELL_SIZE-8,y+CELL_SIZE-8]].forEach(([bx, by]) => {
      g.fillCircle(bx, by, 2);
    });

    // Special DCA indicator
    if (tower.key === 'DCA') {
      g.lineStyle(1, 0x88bbff, 0.6);
      g.strokeCircle(cx, cy, hs - 2);
    }

    // Border
    g.lineStyle(1, 0xffffff, 0.2);
    g.strokeRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);
  }

  // ==========================
  // HUD + PANEL
  // ==========================
  createHUD() {
    const ts = { fontSize: '13px', color: '#556677', fontFamily: 'monospace' };
    const vs = { fontSize: '17px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold' };

    this.add.text(10, 8, 'WAVE', ts).setDepth(12);
    this.hudWave = this.add.text(58, 5, '0/20', vs).setDepth(12);

    this.add.text(145, 8, 'LIVES', ts).setDepth(12);
    this.hudLives = this.add.text(200, 5, '20', { ...vs, color: '#ff6666' }).setDepth(12);

    this.add.text(265, 8, 'GOLD', ts).setDepth(12);
    this.hudGold = this.add.text(310, 5, '150', { ...vs, color: '#ffdd44' }).setDepth(12);

    this.add.text(395, 8, 'SCORE', ts).setDepth(12);
    this.hudScore = this.add.text(450, 5, '0', { ...vs, color: '#44ffaa' }).setDepth(12);

    // Status bar
    this.hudMsg = this.add.text(GAME_WIDTH / 2, 35, '', {
      fontSize: '13px', color: '#aabbcc', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(12);
  }

  createTowerPanel() {
    const px = GRID_COLS * CELL_SIZE;
    const g = this.uiLayer;

    // Title
    this.add.text(px + PANEL_WIDTH / 2, 12, 'TOWERS', {
      fontSize: '14px', color: '#4488ff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(12);

    const keys = Object.keys(TOWER_DEFS);
    const btnH = 64;
    const btnMargin = 5;
    const startY = HUD_HEIGHT + 8;

    this.panelButtons = {};

    keys.forEach((key, i) => {
      const def = TOWER_DEFS[key];
      const bx = px + 8;
      const by = startY + i * (btnH + btnMargin);
      const bw = PANEL_WIDTH - 16;

      // Background
      g.fillStyle(0x0c1622);
      g.fillRect(bx, by, bw, btnH);
      g.lineStyle(1, 0x223355);
      g.strokeRect(bx, by, bw, btnH);

      // Tower color swatch
      g.fillStyle(def.color);
      g.fillRect(bx + 5, by + btnH / 2 - 15, 30, 30);
      g.lineStyle(1, 0x000000, 0.4);
      g.strokeRect(bx + 5, by + btnH / 2 - 15, 30, 30);

      // Texts
      this.add.text(bx + 44, by + 8, def.name, {
        fontSize: '14px', color: '#eef0ff', fontFamily: 'monospace', fontStyle: 'bold'
      }).setDepth(12);
      this.add.text(bx + 44, by + 26, `$${def.cost}`, {
        fontSize: '13px', color: '#ffdd44', fontFamily: 'monospace'
      }).setDepth(12);
      this.add.text(bx + 5, by + 48, def.desc, {
        fontSize: '10px', color: '#667788', fontFamily: 'monospace'
      }).setDepth(12);

      // Interactive zone
      const zone = this.add.zone(bx, by, bw, btnH).setOrigin(0, 0).setInteractive().setDepth(13);
      zone.on('pointerdown', () => this.selectTowerKey(key));

      this.panelButtons[key] = { bx, by, bw, bh: btnH, index: i };
    });

    // Selection highlight
    this.selHighlight = this.add.graphics().setDepth(11);

    // Sell hint
    const hintY = startY + keys.length * (btnH + btnMargin) + 8;
    this.add.text(px + PANEL_WIDTH / 2, hintY,
      'Right-click tower\nto sell (50%)', {
        fontSize: '11px', color: '#445566', fontFamily: 'monospace', align: 'center'
      }).setOrigin(0.5, 0).setDepth(12);

    // Start Wave button
    this.startBtnY = GAME_HEIGHT - 105;
    this.startBtnG = this.add.graphics().setDepth(11);
    this.drawStartBtn(false);
    const sz = this.add.zone(px + 10, this.startBtnY, PANEL_WIDTH - 20, 42)
      .setOrigin(0, 0).setInteractive().setDepth(13);
    sz.on('pointerdown', () => this.startWave());
    sz.on('pointerover', () => this.drawStartBtn(true));
    sz.on('pointerout', () => this.drawStartBtn(false));

    this.startBtnText = this.add.text(px + PANEL_WIDTH / 2, this.startBtnY + 21, 'START WAVE', {
      fontSize: '15px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(14);

    // Speed button
    this.speedBtnY = GAME_HEIGHT - 52;
    this.speedBtnG = this.add.graphics().setDepth(11);
    this.drawSpeedBtn(false);
    const spz = this.add.zone(px + 10, this.speedBtnY, PANEL_WIDTH - 20, 35)
      .setOrigin(0, 0).setInteractive().setDepth(13);
    spz.on('pointerdown', () => this.toggleSpeed());
    spz.on('pointerover', () => this.drawSpeedBtn(true));
    spz.on('pointerout', () => this.drawSpeedBtn(false));

    this.speedBtnText = this.add.text(px + PANEL_WIDTH / 2, this.speedBtnY + 17, 'SPEED: 1x', {
      fontSize: '13px', color: '#aabbcc', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(14);
  }

  drawStartBtn(hover) {
    const px = GRID_COLS * CELL_SIZE;
    const g = this.startBtnG;
    g.clear();
    g.fillStyle(hover ? 0x116622 : 0x0a4418);
    g.fillRoundedRect(px + 10, this.startBtnY, PANEL_WIDTH - 20, 42, 6);
    g.lineStyle(2, hover ? 0x44ff88 : 0x226633);
    g.strokeRoundedRect(px + 10, this.startBtnY, PANEL_WIDTH - 20, 42, 6);
  }

  drawSpeedBtn(hover) {
    const px = GRID_COLS * CELL_SIZE;
    const g = this.speedBtnG;
    g.clear();
    g.fillStyle(hover ? 0x223355 : 0x151e30);
    g.fillRoundedRect(px + 10, this.speedBtnY, PANEL_WIDTH - 20, 35, 5);
    g.lineStyle(1, hover ? 0x4488ff : 0x2a3a55);
    g.strokeRoundedRect(px + 10, this.speedBtnY, PANEL_WIDTH - 20, 35, 5);
  }

  selectTowerKey(key) {
    if (this.selectedTowerKey === key) {
      this.selectedTowerKey = null;
    } else {
      this.selectedTowerKey = key;
    }
    this.updateSelectionHighlight();
  }

  updateSelectionHighlight() {
    const g = this.selHighlight;
    g.clear();
    if (!this.selectedTowerKey) return;
    const btn = this.panelButtons[this.selectedTowerKey];
    if (!btn) return;
    g.lineStyle(2, 0x4488ff);
    g.strokeRect(btn.bx, btn.by, btn.bw, btn.bh);
    g.fillStyle(0x4488ff, 0.12);
    g.fillRect(btn.bx, btn.by, btn.bw, btn.bh);
  }

  updateHUD() {
    this.hudWave.setText(`${this.currentWave}/${this.waves.length}`);
    this.hudLives.setText(`${this.lives}`);
    this.hudGold.setText(`${this.gold}`);
    this.hudScore.setText(`${this.score}`);
  }

  showMsg(text, color = '#aabbcc') {
    this.hudMsg.setText(text).setColor(color);
  }

  // ==========================
  // INPUT
  // ==========================
  setupInput() {
    // Mouse click on grid
    this.input.on('pointerdown', (ptr) => {
      const col = Math.floor((ptr.x - GRID_OFFSET_X) / CELL_SIZE);
      const row = Math.floor((ptr.y - GRID_OFFSET_Y) / CELL_SIZE);

      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        if (ptr.rightButtonDown()) {
          this.sellTower(col, row);
        } else if (this.selectedTowerKey) {
          this.placeTower(col, row, this.selectedTowerKey);
        }
      }
    });

    this.input.on('pointermove', (ptr) => {
      const col = Math.floor((ptr.x - GRID_OFFSET_X) / CELL_SIZE);
      const row = Math.floor((ptr.y - GRID_OFFSET_Y) / CELL_SIZE);
      this.hoveredCell = { col, row };
    });

    // Prevent context menu
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard shortcuts
    this.input.keyboard.on('keydown-ESC', () => {
      this.selectedTowerKey = null;
      this.updateSelectionHighlight();
    });

    this.input.keyboard.on('keydown-SPACE', () => this.startWave());

    // Number keys for tower selection
    const keys = Object.keys(TOWER_DEFS);
    ['ONE','TWO','THREE','FOUR','FIVE','SIX'].forEach((kname, i) => {
      this.input.keyboard.on(`keydown-${kname}`, () => {
        if (keys[i]) this.selectTowerKey(keys[i]);
      });
    });
  }

  // ==========================
  // TOWER MANAGEMENT
  // ==========================
  canPlaceTower(col, row) {
    // Entry/exit cells are always free
    if (col === ENTRY.col && row === ENTRY.row) return false;
    if (col === EXIT.col && row === EXIT.row) return false;
    // Already occupied
    if (this.grid[row][col] !== null) return false;

    // Try placing and check if path still exists
    const testKey = `${col},${row}`;
    this.blockedCells.add(testKey);
    const path = this.pathfinder.findPath(this.blockedCells, ENTRY.col, ENTRY.row, EXIT.col, EXIT.row);
    this.blockedCells.delete(testKey);
    return path !== null;
  }

  placeTower(col, row, key) {
    const def = TOWER_DEFS[key];
    if (!def) return;
    if (!this.canPlaceTower(col, row)) {
      this.showMsg('Cannot place there — path would be blocked!', '#ff6644');
      return;
    }
    if (this.gold < def.cost) {
      this.showMsg(`Not enough gold! Need $${def.cost}`, '#ff6644');
      return;
    }

    this.gold -= def.cost;
    this.grid[row][col] = key;
    this.blockedCells.add(`${col},${row}`);

    const tower = {
      col, row, key, def,
      lastFired: 0,
      angle: 0,
    };
    this.towers.push(tower);
    this.drawTower(tower);

    this.recalculatePath();
    this.updateEnemyPathsAfterChange();
    this.showMsg(`Placed ${def.name} ($${def.cost})`, '#88ccff');
  }

  sellTower(col, row) {
    const key = this.grid[row][col];
    if (!key) return;

    const def = TOWER_DEFS[key];
    const sellGold = Math.floor(def.cost * def.sellRatio);
    this.gold += sellGold;
    this.grid[row][col] = null;
    this.blockedCells.delete(`${col},${row}`);

    this.towers = this.towers.filter(t => !(t.col === col && t.row === row));
    this.score += sellGold; // Minor score for sell

    // Redraw tower layer
    this.towerGraphics.clear();
    this.towers.forEach(t => this.drawTower(t));

    this.recalculatePath();
    this.updateEnemyPathsAfterChange();
    this.showMsg(`Sold for $${sellGold}`, '#ffdd44');
  }

  recalculatePath() {
    this.currentPath = this.pathfinder.findPath(
      this.blockedCells, ENTRY.col, ENTRY.row, EXIT.col, EXIT.row
    );
    return this.currentPath !== null;
  }

  // When the path changes mid-wave, reroute existing ground enemies
  updateEnemyPathsAfterChange() {
    if (!this.currentPath) return;
    const waypoints = this.pathToWaypoints(this.currentPath);

    for (const e of this.enemies) {
      if (e.dead || e.isFlying) continue;
      // Find nearest waypoint ahead of current position
      let bestIdx = waypoints.length - 1;
      let bestDist = Infinity;
      // Estimate progress as ratio
      const progressRatio = e.pathIndex / Math.max(e.waypoints.length - 1, 1);
      const startSearch = Math.max(0, Math.floor(progressRatio * waypoints.length) - 2);

      for (let i = startSearch; i < waypoints.length; i++) {
        const dx = waypoints[i].x - e.x;
        const dy = waypoints[i].y - e.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      e.waypoints = waypoints;
      e.pathIndex = Math.min(bestIdx + 1, waypoints.length - 1);
    }
  }

  pathToWaypoints(path) {
    return path.map(({ col, row }) => ({
      x: GRID_OFFSET_X + (col + 0.5) * CELL_SIZE,
      y: GRID_OFFSET_Y + (row + 0.5) * CELL_SIZE
    }));
  }

  // ==========================
  // WAVE / ENEMY MANAGEMENT
  // ==========================
  startWave() {
    if (this.waveInProgress) {
      this.showMsg('Wave already in progress!', '#ff8844');
      return;
    }
    if (this.currentWave >= this.waves.length) {
      this.showMsg('All waves complete — you win!', '#44ffaa');
      return;
    }
    if (!this.currentPath) {
      this.showMsg('No valid path exists!', '#ff4444');
      return;
    }

    this.currentWave++;
    const waveData = this.waves[this.currentWave - 1];
    this.spawnQueue = [...waveData.enemies];
    this.spawnInterval = waveData.interval;
    this.spawnTimer = 0;
    this.waveInProgress = true;

    this.startBtnText.setText('WAVE IN PROGRESS');
    this.showMsg(`Wave ${this.currentWave} / ${this.waves.length} — ${waveData.enemies.length} enemies`, '#ffdd44');
  }

  updateSpawn(dt) {
    if (!this.waveInProgress || this.spawnQueue.length === 0) return;
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      const type = this.spawnQueue.shift();
      this.spawnEnemy(type);
    }
  }

  spawnEnemy(type, overrideX, overrideY, overrideHp, progress) {
    const def = ENEMY_DEFS[type];
    if (!def) return;

    const entryX = GRID_OFFSET_X + (ENTRY.col + 0.5) * CELL_SIZE;
    const entryY = GRID_OFFSET_Y + (ENTRY.row + 0.5) * CELL_SIZE;
    const exitX = GRID_OFFSET_X + (EXIT.col + 0.5) * CELL_SIZE;
    const exitY = GRID_OFFSET_Y + (EXIT.row + 0.5) * CELL_SIZE;

    const scaledHp = overrideHp !== undefined
      ? overrideHp
      : getScaledHp(type, this.currentWave);

    const enemy = {
      id: this._nextEnemyId++,
      type,
      x: overrideX !== undefined ? overrideX : entryX,
      y: overrideY !== undefined ? overrideY : entryY,
      hp: scaledHp,
      maxHp: scaledHp,
      speed: def.speed,
      isFlying: def.isFlying,
      isBoss: def.isBoss || false,
      reward: def.reward,
      splitsOnDeath: def.splitsOnDeath || false,
      splitCount: def.splitCount || 0,
      splitHp: def.splitHp || 0,
      splitSpeed: def.splitSpeed || def.speed,
      slowFactor: 1,
      isFrozen: false,
      frozenUntil: 0,
      vx: 0, vy: 0,
      dead: false,
      reachedExit: false,
    };

    if (def.isFlying) {
      // Flying enemies go straight to exit
      const dx = exitX - enemy.x;
      const dy = exitY - enemy.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      enemy.vx = dx / len;
      enemy.vy = dy / len;
      enemy.flyTarget = { x: exitX, y: exitY };
    } else {
      // Ground enemy follows A* path
      if (this.currentPath) {
        enemy.waypoints = this.pathToWaypoints(this.currentPath);
        enemy.pathIndex = progress || 1;
      } else {
        enemy.waypoints = [];
        enemy.pathIndex = 0;
      }
    }

    this.enemies.push(enemy);
  }

  updateEnemies(dt) {
    const now = this.time.now;
    for (const e of this.enemies) {
      if (e.dead || e.reachedExit) continue;

      // Handle freeze
      if (e.isFrozen && now > e.frozenUntil) {
        e.isFrozen = false;
        e.slowFactor = 1;
      }

      const spd = e.speed * (e.isFrozen ? 0.15 : e.slowFactor) * (dt / 1000);

      if (e.isFlying) {
        this.moveFlyingEnemy(e, spd);
      } else {
        this.moveGroundEnemy(e, spd);
      }
    }
  }

  moveFlyingEnemy(e, spd) {
    const dx = e.flyTarget.x - e.x;
    const dy = e.flyTarget.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < spd + 3) {
      this.enemyExited(e);
    } else {
      e.x += (dx / dist) * spd;
      e.y += (dy / dist) * spd;
      e.vx = dx / dist;
      e.vy = dy / dist;
    }
  }

  moveGroundEnemy(e, spd) {
    if (!e.waypoints || e.pathIndex >= e.waypoints.length) {
      this.enemyExited(e);
      return;
    }
    const wp = e.waypoints[e.pathIndex];
    const dx = wp.x - e.x;
    const dy = wp.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < spd + 2) {
      e.x = wp.x;
      e.y = wp.y;
      e.pathIndex++;
      if (e.pathIndex >= e.waypoints.length) {
        this.enemyExited(e);
      }
    } else {
      e.x += (dx / dist) * spd;
      e.y += (dy / dist) * spd;
      e.vx = dx / dist;
      e.vy = dy / dist;
    }
  }

  enemyExited(e) {
    e.reachedExit = true;
    e.dead = true;
    this.lives = Math.max(0, this.lives - 1);
    this.flashLife();
    if (this.lives <= 0) {
      this.triggerGameOver();
    }
  }

  enemyDied(e, reward) {
    e.dead = true;
    this.gold += reward !== undefined ? reward : e.reward;
    this.score += e.reward * 10 * this.currentWave;

    if (e.splitsOnDeath) {
      for (let i = 0; i < e.splitCount; i++) {
        const offset = (i - (e.splitCount - 1) / 2) * 14;
        this.spawnEnemy('SPEED',
          e.x + offset * Math.abs(e.vy || 1),
          e.y + offset * Math.abs(e.vx || 0),
          e.splitHp,
          e.pathIndex
        );
      }
    }
  }

  flashLife() {
    this.hudLives.setColor('#ff0000');
    this.time.delayedCall(300, () => {
      if (this.hudLives) this.hudLives.setColor('#ff6666');
    });
  }

  // ==========================
  // TOWER SHOOTING
  // ==========================
  updateTowers(time) {
    for (const tower of this.towers) {
      const def = TOWER_DEFS[tower.key];
      if (time - tower.lastFired < def.fireRate) continue;

      // Find targets
      if (def.aoe) {
        this.fireSonicTower(tower, time);
        continue;
      }

      const target = this.findTarget(tower, def);
      if (!target) continue;

      tower.lastFired = time;
      this.fireTower(tower, def, target);
    }
  }

  findTarget(tower, def) {
    const rangePixels = def.range * CELL_SIZE;
    const tx = GRID_OFFSET_X + (tower.col + 0.5) * CELL_SIZE;
    const ty = GRID_OFFSET_Y + (tower.row + 0.5) * CELL_SIZE;

    let best = null;
    let bestProgress = -1;

    for (const e of this.enemies) {
      if (e.dead || e.reachedExit) continue;

      // Type check
      const canTarget = (def.targets.includes('air') && e.isFlying) ||
                        (def.targets.includes('ground') && !e.isFlying);
      if (!canTarget) continue;

      const dx = e.x - tx;
      const dy = e.y - ty;
      if (dx * dx + dy * dy > rangePixels * rangePixels) continue;

      // "First" targeting: highest pathIndex / progress
      const progress = e.isFlying
        ? (1 - Math.sqrt((e.flyTarget.x - e.x) ** 2 + (e.flyTarget.y - e.y) ** 2) / 1000)
        : e.pathIndex;

      if (progress > bestProgress) {
        bestProgress = progress;
        best = e;
      }
    }
    return best;
  }

  fireTower(tower, def, target) {
    const sx = GRID_OFFSET_X + (tower.col + 0.5) * CELL_SIZE;
    const sy = GRID_OFFSET_Y + (tower.row + 0.5) * CELL_SIZE;
    const dx = target.x - sx;
    const dy = target.y - sy;
    const len = Math.sqrt(dx * dx + dy * dy);

    const bullet = {
      id: this._nextBulletId++,
      x: sx, y: sy,
      vx: dx / len, vy: dy / len,
      speed: def.bulletSpeed,
      target,
      damage: def.damage,
      isFreeze: !!def.slowFactor,
      slowFactor: def.slowFactor || 1,
      slowDuration: def.slowDuration || 0,
      color: def.color,
      dead: false,
    };
    this.bullets.push(bullet);
  }

  fireSonicTower(tower, time) {
    const def = TOWER_DEFS[tower.key];
    const rangePixels = def.range * CELL_SIZE;
    const aoeRadius = def.aoeRadius * CELL_SIZE;
    const tx = GRID_OFFSET_X + (tower.col + 0.5) * CELL_SIZE;
    const ty = GRID_OFFSET_Y + (tower.row + 0.5) * CELL_SIZE;

    let hit = false;
    for (const e of this.enemies) {
      if (e.dead || e.reachedExit || e.isFlying) continue;
      const dx = e.x - tx;
      const dy = e.y - ty;
      if (dx * dx + dy * dy <= rangePixels * rangePixels) {
        e.hp -= def.damage;
        if (e.hp <= 0) this.enemyDied(e, e.reward);
        hit = true;
      }
    }

    if (hit) {
      tower.lastFired = time;
      // Visual pulse
      const pulse = {
        id: this._nextBulletId++,
        x: tx, y: ty, vx: 0, vy: 0, speed: 0,
        isAoe: true, aoeRadius: 5, aoeMax: aoeRadius,
        damage: 0, dead: false, color: def.color,
        target: null,
      };
      this.bullets.push(pulse);
    }
  }

  updateBullets(dt) {
    for (const b of this.bullets) {
      if (b.dead) continue;

      // AOE pulse animation
      if (b.isAoe) {
        b.aoeRadius += 5;
        if (b.aoeRadius > b.aoeMax) b.dead = true;
        continue;
      }

      // Homing bullet
      if (b.target && !b.target.dead && !b.target.reachedExit) {
        const dx = b.target.x - b.x;
        const dy = b.target.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const move = b.speed * (dt / 1000);
        if (dist < move + 6) {
          // Hit!
          this.bulletHit(b);
        } else {
          b.vx = dx / dist;
          b.vy = dy / dist;
          b.x += b.vx * move;
          b.y += b.vy * move;
        }
      } else {
        // Target gone — fly straight and self-destruct
        const move = b.speed * (dt / 1000);
        b.x += b.vx * move;
        b.y += b.vy * move;
        if (b.x < 0 || b.x > GAME_WIDTH || b.y < 0 || b.y > GAME_HEIGHT) {
          b.dead = true;
        }
      }
    }
  }

  bulletHit(bullet) {
    bullet.dead = true;
    const e = bullet.target;
    if (!e || e.dead || e.reachedExit) return;

    if (bullet.isFreeze) {
      e.isFrozen = true;
      e.frozenUntil = this.time.now + bullet.slowDuration;
      e.slowFactor = bullet.slowFactor;
      e.hp -= bullet.damage;
    } else {
      e.hp -= bullet.damage;
    }

    if (e.hp <= 0) this.enemyDied(e, e.reward);
  }

  // ==========================
  // WAVE / GAME STATE
  // ==========================
  checkWaveComplete() {
    if (!this.waveInProgress) return;
    if (this.spawnQueue.length > 0) return;

    const alive = this.enemies.some(e => !e.dead && !e.reachedExit);
    if (!alive) {
      this.waveInProgress = false;
      this.startBtnText.setText(
        this.currentWave >= this.waves.length ? 'VICTORY!' : 'START WAVE'
      );

      if (this.currentWave >= this.waves.length) {
        this.time.delayedCall(500, () => this.triggerVictory());
        return;
      }

      // Wave clear bonus
      const bonus = this.currentWave * 10;
      this.gold += bonus;
      this.score += bonus * 5;
      this.showMsg(`Wave ${this.currentWave} cleared! +$${bonus} bonus`, '#44ff88');
    }
  }

  triggerGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.showEndScreen(false);
  }

  triggerVictory() {
    if (this.gameWon) return;
    this.gameWon = true;
    this.showEndScreen(true);
  }

  showEndScreen(won) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const g = this.overlayLayer;

    g.fillStyle(0x000000, 0.75);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    g.fillStyle(won ? 0x002200 : 0x220000);
    g.fillRoundedRect(cx - 250, cy - 130, 500, 260, 12);
    g.lineStyle(3, won ? 0x44ff88 : 0xff4444);
    g.strokeRoundedRect(cx - 250, cy - 130, 500, 260, 12);

    this.add.text(cx, cy - 90, won ? 'VICTORY!' : 'GAME OVER', {
      fontSize: '50px', color: won ? '#44ff88' : '#ff4444',
      fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(25);

    this.add.text(cx, cy - 20, `Score: ${this.score}`, {
      fontSize: '26px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(25);

    this.add.text(cx, cy + 20, `Wave: ${this.currentWave} / ${this.waves.length}`, {
      fontSize: '18px', color: '#aabbcc', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(25);

    this.add.text(cx, cy + 50, `Gold: $${this.gold}  Lives: ${this.lives}`, {
      fontSize: '16px', color: '#aabbcc', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(25);

    // Restart button
    const rbg = this.add.graphics().setDepth(25);
    const drawR = (h) => {
      rbg.clear();
      rbg.fillStyle(h ? 0x335533 : 0x223322);
      rbg.fillRoundedRect(cx - 100, cy + 80, 200, 45, 8);
      rbg.lineStyle(2, h ? 0x88ff88 : 0x446644);
      rbg.strokeRoundedRect(cx - 100, cy + 80, 200, 45, 8);
    };
    drawR(false);
    this.add.text(cx, cy + 102, 'PLAY AGAIN', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(26);

    const rz = this.add.zone(cx - 100, cy + 80, 200, 45).setOrigin(0, 0).setInteractive().setDepth(27);
    rz.on('pointerover', () => drawR(true));
    rz.on('pointerout', () => drawR(false));
    rz.on('pointerdown', () => this.scene.restart());

    this.input.keyboard.once('keydown-ENTER', () => this.scene.restart());
    this.input.keyboard.once('keydown-SPACE', () => this.scene.restart());
  }

  toggleSpeed() {
    this.gameSpeed = this.gameSpeed === 1 ? 2 : 1;
    this.speedBtnText.setText(`SPEED: ${this.gameSpeed}x`);
    this.speedBtnText.setColor(this.gameSpeed > 1 ? '#ffdd44' : '#aabbcc');
    this.drawSpeedBtn(false);
  }

  // ==========================
  // CLEANUP
  // ==========================
  cleanup() {
    if (this.enemies.some(e => e.dead)) {
      this.enemies = this.enemies.filter(e => !e.dead);
    }
    if (this.bullets.some(b => b.dead)) {
      this.bullets = this.bullets.filter(b => !b.dead);
    }
  }
}
