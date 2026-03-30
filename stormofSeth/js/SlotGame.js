/**
 * SlotGame - Main game controller
 *
 * Orchestrates: ThemeManager, SymbolRenderer, ReelManager,
 * PaylineEngine, BonusEngine, and UIManager.
 *
 * Game loop runs via requestAnimationFrame.
 * State machine: idle → spinning → evaluating → win_show → idle
 *
 * Godot equivalent: Main.gd scene tree:
 *   Main (Node2D)
 *   ├── GameCanvas (SubViewport)
 *   │   ├── Background
 *   │   ├── Reels (Node2D with 5 Reel children)
 *   │   └── WinEffects (CPUParticles2D)
 *   ├── UI (CanvasLayer)
 *   │   ├── ControlPanel
 *   │   └── WinOverlay
 *   └── GameController (Node) ← this file
 */

class SlotGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // Sub-systems (initialized in init())
    this.themeManager = new ThemeManager();
    this.symbolRenderer = new SymbolRenderer();
    this.reelManager = null;
    this.paylineEngine = null;
    this.bonusEngine = null;

    // Game state
    this.state = 'idle'; // idle | spinning | evaluating | win_show | freespin_intro | freespin_outro
    this.balance = 1000;
    this.bet = 1;
    this.betOptions = [0.20, 0.40, 0.60, 0.80, 1, 2, 5, 10, 20, 50];
    this.betIndex = 4;
    this.lastWin = 0;
    this.autoSpin = false;
    this.autoSpinCount = 0;
    this.currentGrid = null;
    this.winResult = null;

    // Win display
    this.winDisplayTimer = 0;
    this.winLineIndex = 0;
    this.winFlashTimer = 0;
    this.countingWin = 0;

    // Particles
    this.particles = [];

    // Layout
    this.layout = {};

    // UI callbacks (set by UIManager)
    this.onBalanceChange = null;
    this.onWinChange = null;
    this.onBetChange = null;
    this.onStateChange = null;
    this.onFreeSpinsChange = null;
    this.onMultiplierChange = null;
    this.onMessage = null;
    this.onBigWin = null;

    // Animation frame
    this._rafId = null;
    this._lastTime = 0;
    this._frameCount = 0;
  }

  // ──────────────────────────────────────────────
  // Initialization
  // ──────────────────────────────────────────────

  async init(themeId, themePath) {
    await this.themeManager.loadAndApply(themeId, themePath);
    const theme = this.themeManager.get();
    await this._setupTheme(theme);
    this._setupCanvas();
    this._startLoop();
  }

  async switchTheme(themeId, themePath) {
    this.state = 'idle';
    if (!this.themeManager.themes[themeId]) {
      await this.themeManager.load(themeId, themePath);
    }
    this.themeManager.apply(themeId);
    const theme = this.themeManager.get();
    await this._setupTheme(theme);
    this._setupCanvas();
    this.notifyState();
  }

  async _setupTheme(theme) {
    await this.symbolRenderer.preloadThemeImages(theme.symbols);
    this.reelManager = new ReelManager(theme, this.symbolRenderer);
    this.paylineEngine = new PaylineEngine(theme);
    this.bonusEngine = new BonusEngine(theme);

    // Init grid with random symbols
    const { reels, rows } = theme.grid;
    this.currentGrid = this.paylineEngine.generateGrid(reels, rows);
    this.reelManager.targetGrid = this.currentGrid;
    for (let i = 0; i < reels; i++) {
      this.reelManager.reelSymbols[i] = [...this.currentGrid[i]];
      this.reelManager.reelStates[i] = 'stopped';
    }

    this.lastWin = 0;
    this.particles = [];
  }

  _setupCanvas() {
    const theme = this.themeManager.get();
    const { reels, rows, symbolSize, symbolPadding } = theme.grid;
    const cellSize = symbolSize + symbolPadding;

    const reelsW = reels * cellSize;
    const reelsH = rows * cellSize;
    const padding = { top: 80, bottom: 20, left: 60, right: 60 };
    const totalW = reelsW + padding.left + padding.right;
    const totalH = reelsH + padding.top + padding.bottom;

    this.canvas.width = totalW;
    this.canvas.height = totalH;
    this.canvas.style.width = '100%';

    this.layout = {
      reelsX: padding.left,
      reelsY: padding.top,
      reelsW,
      reelsH,
      cellSize,
      reels,
      rows,
      totalW,
      totalH,
      padding
    };
  }

  // ──────────────────────────────────────────────
  // Main Game Loop
  // ──────────────────────────────────────────────

  _startLoop() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    const loop = (time) => {
      const dt = time - this._lastTime;
      this._lastTime = time;
      this._frameCount++;
      this._update(dt);
      this._render();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  _update(dt) {
    // Update particles
    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.vx *= 0.99;
      return p.life > 0;
    });

    if (this.state === 'spinning') {
      this.reelManager.update();
    }

    if (this.state === 'win_show') {
      this.winDisplayTimer--;
      this.winFlashTimer++;

      // Cycle through winning lines for display
      if (this.winFlashTimer % 40 === 0 && this.winResult?.lineWins?.length > 0) {
        this.winLineIndex = (this.winLineIndex + 1) % this.winResult.lineWins.length;
        this._showWinLine(this.winResult.lineWins[this.winLineIndex]);
      }

      // Count up win amount
      if (this.countingWin < this.lastWin) {
        const step = Math.max(1, (this.lastWin - this.countingWin) * 0.08);
        this.countingWin = Math.min(this.countingWin + step, this.lastWin);
        if (this.onWinChange) this.onWinChange(this.countingWin);
      }

      if (this.winDisplayTimer <= 0) {
        this._endWinDisplay();
      }
    }
  }

  _render() {
    const ctx = this.ctx;
    const { reelsX, reelsY, reelsW, reelsH, cellSize, reels, rows, totalW, totalH } = this.layout;
    const theme = this.themeManager.get();
    if (!theme) return;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, totalH);
    bg.addColorStop(0, theme.colors.background);
    bg.addColorStop(1, this._adjustColor(theme.colors.background, 20));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, totalW, totalH);

    // Background pattern (subtle)
    this._drawBackground(ctx, theme, totalW, totalH);

    // Reel area background
    const reelBg = ctx.createLinearGradient(reelsX, reelsY, reelsX, reelsY + reelsH);
    reelBg.addColorStop(0, this._adjustColor(theme.colors.reelBg, 10));
    reelBg.addColorStop(1, theme.colors.reelBg);
    ctx.fillStyle = reelBg;
    ctx.fillRect(reelsX, reelsY, reelsW, reelsH);

    // Clip reels
    ctx.save();
    ctx.beginPath();
    ctx.rect(reelsX, reelsY, reelsW, reelsH);
    ctx.clip();

    // Draw reels
    this.reelManager.draw(ctx, reelsX, reelsY);

    ctx.restore();

    // Reel separators
    ctx.strokeStyle = `${theme.colors.reelBorder}55`;
    ctx.lineWidth = 1;
    for (let i = 1; i < reels; i++) {
      const lx = reelsX + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(lx, reelsY);
      ctx.lineTo(lx, reelsY + reelsH);
      ctx.stroke();
    }

    // Reel border frame
    this._drawReelFrame(ctx, theme, reelsX, reelsY, reelsW, reelsH);

    // Payline indicators on sides
    this._drawPaylineIndicators(ctx, theme, reelsX, reelsY, reelsH, cellSize);

    // Win line highlight overlay
    if (this.state === 'win_show' && this.winResult?.lineWins?.length > 0) {
      this._drawWinLineOverlay(ctx, theme, reelsX, reelsY, cellSize, this.winResult.lineWins[this.winLineIndex]);
    }

    // Seth Storm expanded wild effects
    this._drawStormEffects(ctx, theme, reelsX, reelsY, cellSize, reelsH);

    // Particles
    this._renderParticles(ctx);

    // Title bar
    this._drawTitle(ctx, theme, totalW);

    // Bottom row scan line effect
    this._drawScanLines(ctx, reelsX, reelsY, reelsW, reelsH);
  }

  _drawBackground(ctx, theme, w, h) {
    // Subtle diamond pattern
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = theme.colors.reelBorder;
    ctx.lineWidth = 0.5;
    const step = 40;
    for (let x = -step; x < w + step; x += step) {
      for (let y = -step; y < h + step; y += step) {
        ctx.beginPath();
        ctx.moveTo(x, y + step / 2);
        ctx.lineTo(x + step / 2, y);
        ctx.lineTo(x + step, y + step / 2);
        ctx.lineTo(x + step / 2, y + step);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawReelFrame(ctx, theme, x, y, w, h) {
    const r = 8;

    // Outer glow
    ctx.shadowColor = theme.colors.reelBorderGlow;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = theme.colors.reelBorder;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    this._roundRectPath(ctx, x - 2, y - 2, w + 4, h + 4, r);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Corner ornaments
    const ornSize = 16;
    const corners = [
      [x - 2, y - 2], [x + w + 2, y - 2],
      [x - 2, y + h + 2], [x + w + 2, y + h + 2]
    ];
    ctx.fillStyle = theme.colors.reelBorder;
    for (const [cx, cy] of corners) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.moveTo(0, -ornSize / 2);
      ctx.lineTo(ornSize / 2, 0);
      ctx.lineTo(0, ornSize / 2);
      ctx.lineTo(-ornSize / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  _drawPaylineIndicators(ctx, theme, reelsX, reelsY, reelsH, cellSize) {
    const layout = this.layout;
    const rows = layout.rows;
    const dotR = 4;

    ctx.fillStyle = `${theme.colors.reelBorder}88`;
    ctx.font = `bold 10px ${theme.fonts?.ui || 'serif'}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Show row center indicators
    for (let row = 0; row < rows; row++) {
      const y = reelsY + row * cellSize + cellSize / 2;
      ctx.fillStyle = `${theme.colors.reelBorder}66`;
      ctx.beginPath();
      ctx.arc(reelsX - 12, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawWinLineOverlay(ctx, theme, reelsX, reelsY, cellSize, winData) {
    if (!winData) return;

    const line = winData.line;
    const count = winData.count;

    // Draw line connecting winning positions
    ctx.save();
    ctx.strokeStyle = theme.colors.lightningYellow;
    ctx.lineWidth = 3;
    ctx.shadowColor = theme.colors.lightningYellow;
    ctx.shadowBlur = 15;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x = reelsX + i * cellSize + cellSize / 2;
      const y = reelsY + line[i] * cellSize + cellSize / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  _drawStormEffects(ctx, theme, reelsX, reelsY, cellSize, reelsH) {
    const status = this.bonusEngine?.getStatus?.();
    if (!status?.sethStormActive) return;

    const time = this._frameCount;
    for (const reelIdx of status.expandedReels) {
      const x = reelsX + reelIdx * cellSize;
      const pulse = 0.3 + Math.sin(time * 0.15) * 0.2;

      // Lightning column effect
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = theme.colors.lightningColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = theme.colors.lightningColor;
      ctx.shadowBlur = 30;

      // Random lightning segments
      const segments = 8;
      ctx.beginPath();
      ctx.moveTo(x + cellSize / 2, reelsY);
      for (let s = 1; s < segments; s++) {
        const sy = reelsY + (s / segments) * reelsH;
        const sx = x + cellSize / 2 + (Math.sin((time * 0.3 + s) * 2) * cellSize * 0.2);
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawTitle(ctx, theme, totalW) {
    const title = theme.ui?.title || theme.name;
    ctx.save();
    ctx.font = `bold 18px ${theme.fonts?.title || 'serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.colors.textPrimary;
    ctx.shadowColor = theme.colors.reelBorderGlow;
    ctx.shadowBlur = 12;
    ctx.fillText(title, totalW / 2, 40);
    ctx.restore();
  }

  _drawScanLines(ctx, x, y, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let sy = y; sy < y + h; sy += 4) {
      ctx.fillStyle = '#000';
      ctx.fillRect(x, sy, w, 2);
    }
    ctx.restore();
  }

  _renderParticles(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ──────────────────────────────────────────────
  // Spin Actions
  // ──────────────────────────────────────────────

  spin() {
    if (this.state !== 'idle') return;
    if (this.balance < this.bet && !this.bonusEngine.isFreeSpins) {
      this._notify('Insufficient balance!');
      return;
    }

    if (!this.bonusEngine.isFreeSpins) {
      this.balance -= this.bet;
    }

    this.lastWin = 0;
    this.countingWin = 0;
    this.winResult = null;
    this.winLineIndex = 0;
    this.reelManager.clearHighlights();
    if (this.onWinChange) this.onWinChange(0);
    if (this.onBalanceChange) this.onBalanceChange(this.balance);

    // Generate result grid
    const theme = this.themeManager.get();
    const grid = this.paylineEngine.generateGrid(theme.grid.reels, theme.grid.rows);
    this.currentGrid = grid;

    this.state = 'spinning';
    this.notifyState();

    this.reelManager.spin(grid, () => this._onReelsStopped());
  }

  _onReelsStopped() {
    this.state = 'evaluating';
    const status = this.bonusEngine.getStatus();
    const result = this.paylineEngine.evaluate(
      this.currentGrid,
      this.bet,
      status.isFreeSpins,
      status.multiplier
    );
    this.winResult = result;
    this._processResult(result);
  }

  _processResult(result) {
    const theme = this.themeManager.get();
    const status = this.bonusEngine.getStatus();

    // Seth Storm / free spin processing
    if (status.isFreeSpins) {
      const bonusResult = this.bonusEngine.processFreeSpinResult(result);

      if (bonusResult?.sethStorm) {
        this._triggerSethStorm(bonusResult.expandedReels, bonusResult.newMultiplier);
        if (this.onMultiplierChange) this.onMultiplierChange(bonusResult.newMultiplier);
      }
      if (this.onFreeSpinsChange) this.onFreeSpinsChange(this.bonusEngine.getStatus());
    }

    // Win handling
    if (result.totalWin > 0) {
      this.lastWin = result.totalWin;
      this.balance += result.totalWin;
      if (this.onBalanceChange) this.onBalanceChange(this.balance);

      // Highlight winning positions
      const positions = [];
      for (const lw of result.lineWins) {
        for (const reelIdx of lw.positions) {
          positions.push({ reel: reelIdx, row: lw.line[reelIdx] });
        }
      }
      if (result.scatterWin) {
        for (const pos of result.scatterWin.positions) positions.push(pos);
      }
      this.reelManager.setHighlights(positions);

      // Emit particles
      this._spawnWinParticles(result.totalWin);

      // Check big win thresholds
      const mult = result.totalWin / this.bet;
      const wins = theme.ui?.winAnimations;
      if (wins && mult >= wins.epicWin?.threshold) {
        if (this.onBigWin) this.onBigWin('epic', result.totalWin, wins.epicWin);
      } else if (wins && mult >= wins.megaWin?.threshold) {
        if (this.onBigWin) this.onBigWin('mega', result.totalWin, wins.megaWin);
      } else if (wins && mult >= wins.bigWin?.threshold) {
        if (this.onBigWin) this.onBigWin('big', result.totalWin, wins.bigWin);
      }

      this.state = 'win_show';
      this.winDisplayTimer = result.lineWins.length > 0 ? result.lineWins.length * 60 + 60 : 90;
      this.winFlashTimer = 0;
      if (result.lineWins[0]) this._showWinLine(result.lineWins[0]);
      this.notifyState();
    } else {
      this._afterSpin();
    }

    // Free spins trigger
    if (result.triggersFreeSpins && !status.isFreeSpins) {
      setTimeout(() => this._startFreeSpins(result.freeSpinsAwarded), result.totalWin > 0 ? 2000 : 500);
    }
  }

  _endWinDisplay() {
    this.reelManager.clearHighlights();
    this._afterSpin();
  }

  _afterSpin() {
    const bonusStatus = this.bonusEngine.getStatus();

    if (this.bonusEngine.isFreeSpinsDone()) {
      this._endFreeSpins();
      return;
    }

    if (bonusStatus.isFreeSpins) {
      this.state = 'idle';
      this.notifyState();
      // Auto-spin for free spins
      setTimeout(() => this.spin(), 600);
      return;
    }

    this.state = 'idle';
    this.notifyState();

    if (this.autoSpin && this.autoSpinCount > 0) {
      this.autoSpinCount--;
      if (this.autoSpinCount === 0) this.autoSpin = false;
      setTimeout(() => this.spin(), 400);
    }
  }

  _startFreeSpins(count) {
    this.bonusEngine.startFreeSpins(count);
    if (this.onFreeSpinsChange) this.onFreeSpinsChange(this.bonusEngine.getStatus());
    this._notify(`⚡ ${count} FREE SPINS ACTIVATED! ⚡`);
    this.state = 'idle';
    this.notifyState();
    setTimeout(() => this.spin(), 1000);
  }

  _endFreeSpins() {
    const summary = this.bonusEngine.endFreeSpins();
    if (this.onFreeSpinsChange) this.onFreeSpinsChange({ isFreeSpins: false });
    if (this.onMultiplierChange) this.onMultiplierChange(1);
    this._notify(`Free Spins ended! Total win: ${summary.totalWin.toFixed(2)}`);
    this.state = 'idle';
    this.notifyState();

    if (this.autoSpin && this.autoSpinCount > 0) {
      this.autoSpinCount--;
      setTimeout(() => this.spin(), 1000);
    }
  }

  _triggerSethStorm(expandedReels, multiplier) {
    for (const reelIdx of expandedReels) {
      this.reelManager.expandWild(reelIdx);
    }
    this._notify(`⚡ SETH STORM! Multiplier: ${multiplier}x ⚡`);
  }

  // ──────────────────────────────────────────────
  // Bet Controls
  // ──────────────────────────────────────────────

  betUp() {
    if (this.betIndex < this.betOptions.length - 1) {
      this.betIndex++;
      this.bet = this.betOptions[this.betIndex];
      if (this.onBetChange) this.onBetChange(this.bet);
    }
  }

  betDown() {
    if (this.betIndex > 0) {
      this.betIndex--;
      this.bet = this.betOptions[this.betIndex];
      if (this.onBetChange) this.onBetChange(this.bet);
    }
  }

  maxBet() {
    this.betIndex = this.betOptions.length - 1;
    this.bet = this.betOptions[this.betIndex];
    if (this.onBetChange) this.onBetChange(this.bet);
  }

  startAutoSpin(count = 10) {
    this.autoSpin = true;
    this.autoSpinCount = count;
    if (this.state === 'idle') this.spin();
  }

  stopAutoSpin() {
    this.autoSpin = false;
    this.autoSpinCount = 0;
  }

  // ──────────────────────────────────────────────
  // Win Effects
  // ──────────────────────────────────────────────

  _spawnWinParticles(winAmount) {
    const theme = this.themeManager.get();
    const { reelsX, reelsY, reelsW, reelsH } = this.layout;
    const count = Math.min(5 + Math.floor(winAmount / this.bet * 2), 60);
    const colors = [theme.colors.particleColor || '#ffcc44', theme.colors.lightningColor || '#ff6600', '#ffffff'];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: reelsX + Math.random() * reelsW,
        y: reelsY + Math.random() * reelsH,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 5 - 2,
        r: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 800 + Math.random() * 600,
        maxLife: 1400
      });
    }
  }

  _showWinLine(winData) {
    if (!winData) return;
    const { reelsX, reelsY, cellSize } = this.layout;
    const positions = [];
    for (let i = 0; i < winData.count; i++) {
      positions.push({ reel: i, row: winData.line[i] });
    }
    this.reelManager.setHighlights(positions);
  }

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────

  notifyState() {
    if (this.onStateChange) this.onStateChange(this.state, this.bonusEngine?.getStatus?.());
  }

  _notify(msg) {
    if (this.onMessage) this.onMessage(msg);
  }

  _roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  _adjustColor(hex, amount) {
    try {
      const c = parseInt(hex.replace('#', ''), 16);
      const r = Math.min(255, ((c >> 16) & 255) + amount);
      const g = Math.min(255, ((c >> 8) & 255) + amount);
      const b = Math.min(255, (c & 255) + amount);
      return `rgb(${r},${g},${b})`;
    } catch { return hex; }
  }

  destroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }
}
