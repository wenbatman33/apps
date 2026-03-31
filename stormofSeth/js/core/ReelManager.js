/**
 * ReelManager - Handles reel spinning animation
 *
 * Each reel spins independently with staggered start/stop.
 * Uses a strip of symbols that scroll, then snaps to the final result.
 *
 * Godot equivalent: A Node2D with 5 child Reel nodes,
 * each containing a ScrollContainer with symbol Sprite2D nodes.
 * Uses Tween for easing and AnimationPlayer for stop effects.
 */

class ReelManager {
  constructor(theme, symbolRenderer) {
    this.theme = theme;
    this.renderer = symbolRenderer;
    this.reels = theme.grid.reels;
    this.rows = theme.grid.rows;
    this.symbolSize = theme.grid.symbolSize;
    this.padding = theme.grid.symbolPadding;
    this.cellSize = this.symbolSize + this.padding;

    // Reel state
    this.reelStrips = [];           // infinite symbol strips
    this.reelOffsets = [];          // current scroll offset (px, absolute during decel)
    this.reelSpeeds = [];           // current scroll speed (px/frame)
    this.reelSnapTargets = [];      // final rest position (locked once on entering stopping)
    this.reelDecelStartDist = [];   // total decel distance (snapTarget - offset at lock time)
    this.reelStates = [];           // 'idle' | 'spinning' | 'stopping' | 'stopped'
    this.reelSymbols = [];          // visible symbols when stopped
    this.reelExpandedWild = [];
    this.reelHighlighted = [];

    for (let i = 0; i < this.reels; i++) {
      this.reelStrips.push(this._generateStrip());
      this.reelOffsets.push(0);
      this.reelSpeeds.push(0);
      this.reelSnapTargets.push(null);
      this.reelDecelStartDist.push(1);
      this.reelStates.push('idle');
      this.reelSymbols.push(['jack', 'queen', 'king']);
      this.reelExpandedWild.push(false);
      this.reelHighlighted.push([false, false, false]);
    }

    this.spinning = false;
    this.onAllStopped = null;
    this.onReelStop = null;

    // Animation constants
    this.SPIN_SPEED = this.cellSize * 0.72;     // px per frame at max speed
    this.ACCEL_FRAMES = 10;                     // frames to reach full speed
    this.STOP_DELAY = 6;                        // frames between each reel stop

    this._frame = 0;
    this._stopQueue = [];
  }

  /**
   * Generate a randomized reel strip of ~30 symbols
   */
  _generateStrip() {
    const symbols = this.theme.symbols;
    const totalWeight = symbols.reduce((s, sym) => s + sym.weight, 0);
    const strip = [];
    const len = 40;
    for (let i = 0; i < len; i++) {
      let rand = Math.random() * totalWeight;
      for (const sym of symbols) {
        rand -= sym.weight;
        if (rand <= 0) { strip.push(sym.id); break; }
      }
    }
    return strip;
  }

  /**
   * Start spinning all reels
   * @param {string[][]} targetGrid - the final result grid to snap to
   * @param {Function} onAllStopped - callback when all reels stop
   */
  spin(targetGrid, onAllStopped) {
    this.targetGrid = targetGrid;
    this.onAllStopped = onAllStopped;
    this.spinning = true;
    this._stoppedCount = 0;
    this._stopQueue = [];
    this._frame = 0;

    for (let i = 0; i < this.reels; i++) {
      this.reelStates[i] = 'spinning';
      this.reelSpeeds[i] = 0; // will accelerate
      this.reelSnapTargets[i] = null;
      this.reelExpandedWild[i] = false;
      this.reelHighlighted[i] = [false, false, false];

      // Schedule stop: reel i stops after i * STOP_DELAY frames + spin duration
      const stopAt = 55 + i * this.STOP_DELAY;
      this._stopQueue.push({ reel: i, frame: stopAt });
    }
  }

  /**
   * Lock the snap target when a reel enters stopping state.
   * Called ONCE — never recalculated. Target is absolute (no modulo) to
   * prevent the mid-decel wrap-around jump bug.
   *
   * We place the target DECEL_CELLS ahead so there's room to decelerate via
   * friction, then overshoot slightly, then spring back.
   */
  _lockSnapTarget(reelIndex) {
    const DECEL_CELLS = 5;
    const strip = this.reelStrips[reelIndex];

    const currentCell = Math.floor(this.reelOffsets[reelIndex] / this.cellSize);
    const snapCell = currentCell + DECEL_CELLS;

    // Absolute target (no modulo) — remaining distance is always a positive, monotone value
    const snapTarget = snapCell * this.cellSize;
    this.reelSnapTargets[reelIndex] = snapTarget;
    this.reelDecelStartDist[reelIndex] = snapTarget - this.reelOffsets[reelIndex];

    for (let row = 0; row < this.rows; row++) {
      strip[(snapCell + row) % strip.length] = this.targetGrid[reelIndex][row];
    }
  }

  /**
   * Expand Seth wild on a specific reel (used during free spins Seth Storm)
   */
  expandWild(reelIndex) {
    this.reelExpandedWild[reelIndex] = true;
    for (let row = 0; row < this.rows; row++) {
      this.reelSymbols[reelIndex][row] = this.theme.symbols.find(s => s.type === 'wild').id;
    }
  }

  /**
   * Set highlight on specific positions
   * @param {Array} positions - [{reel, row}]
   */
  setHighlights(positions) {
    // Clear all
    for (let i = 0; i < this.reels; i++) {
      this.reelHighlighted[i] = [false, false, false];
    }
    for (const pos of positions) {
      if (this.reelHighlighted[pos.reel]) {
        this.reelHighlighted[pos.reel][pos.row] = true;
      }
    }
  }

  clearHighlights() {
    for (let i = 0; i < this.reels; i++) {
      this.reelHighlighted[i] = [false, false, false];
    }
  }

  /**
   * Update animation - call every frame
   *
   * Three-phase reel stop (mimics physical reel mechanics):
   *   Phase 1 — spinning:  constant speed, free scroll
   *   Phase 2 — stopping:  friction braking; reel slows and OVERSHOOTS target
   *   Phase 3 — bouncing:  spring pulls reel back from overshoot to exact target
   *
   * The overshoot + spring-back is what gives slot machines their characteristic
   * satisfying "clunk" feel. Without it the stop feels digital and abrupt.
   */
  update() {
    if (!this.spinning) return;
    this._frame++;

    // Transition spinning → stopping, lock target immediately (called once only)
    for (const stop of this._stopQueue) {
      if (this._frame >= stop.frame && this.reelStates[stop.reel] === 'spinning') {
        this.reelStates[stop.reel] = 'stopping';
        this._lockSnapTarget(stop.reel);
      }
    }

    let anyActive = false;
    for (let i = 0; i < this.reels; i++) {
      const s = this.reelStates[i];
      if (s === 'spinning' || s === 'stopping') {
        anyActive = true;
        this._updateReel(i, s);
      }
    }

    if (!anyActive && this.spinning) {
      this.spinning = false;
      if (this.onAllStopped) this.onAllStopped();
    }
  }

  _updateReel(i, state) {
    const stripTotal = this.cellSize * this.reelStrips[i].length;

    // ── Phase 1: Full-speed scroll ──────────────────────────────────
    if (state === 'spinning') {
      this.reelSpeeds[i] = Math.min(
        this.reelSpeeds[i] + this.SPIN_SPEED / this.ACCEL_FRAMES,
        this.SPIN_SPEED
      );
      this.reelOffsets[i] = (this.reelOffsets[i] + this.reelSpeeds[i]) % stripTotal;
      return;
    }

    // ── Phase 2: Smooth ease-out toward snap target ─────────────────
    // step = remaining * K (proportional ease-out).
    // Each frame we close K fraction of the gap → exponential convergence.
    // At K=0.22 we reach within 1px of a 670px gap in ~27 frames: smooth and fast.
    // No minimum step floor — snap threshold handles the final pixel.
    if (state === 'stopping') {
      const snapTarget = this.reelSnapTargets[i];
      const remaining = snapTarget - this.reelOffsets[i];

      if (remaining <= 1.5) {
        this.reelOffsets[i] = snapTarget % stripTotal;
        this.reelSpeeds[i] = 0;
        this.reelSymbols[i] = [...this.targetGrid[i]];
        this.reelStates[i] = 'stopped';
        this._stoppedCount++;
        if (this.onReelStop) this.onReelStop(i);
        return;
      }

      const step = remaining * 0.22;
      this.reelOffsets[i] += step;
      this.reelSpeeds[i] = step; // keep speed in sync for motion-blur alpha
      return;
    }
  }

  /**
   * Get visible symbols for a reel at current offset
   */
  getVisibleSymbols(reelIndex) {
    const strip = this.reelStrips[reelIndex];
    const offset = this.reelOffsets[reelIndex];
    const startIndex = Math.floor(offset / this.cellSize);
    const symbols = [];
    for (let row = 0; row < this.rows; row++) {
      symbols.push(strip[(startIndex + row) % strip.length]);
    }
    return symbols;
  }

  /**
   * Draw all reels onto canvas context
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} startX - left edge of reels area
   * @param {number} startY - top edge of reels area
   */
  draw(ctx, startX, startY) {
    const symbolMap = {};
    for (const sym of this.theme.symbols) symbolMap[sym.id] = sym;

    for (let ri = 0; ri < this.reels; ri++) {
      const x = startX + ri * this.cellSize + this.cellSize / 2;
      const state = this.reelStates[ri];
      const isExpanded = this.reelExpandedWild[ri];

      // Expanded wild glow effect on reel column
      if (isExpanded) {
        const wildSym = this.theme.symbols.find(s => s.type === 'wild');
        const grd = ctx.createLinearGradient(x - this.cellSize / 2, startY, x - this.cellSize / 2, startY + this.rows * this.cellSize);
        grd.addColorStop(0, `${wildSym.colors.glow}22`);
        grd.addColorStop(0.5, `${wildSym.colors.glow}55`);
        grd.addColorStop(1, `${wildSym.colors.glow}22`);
        ctx.fillStyle = grd;
        ctx.fillRect(x - this.cellSize / 2, startY, this.cellSize, this.rows * this.cellSize);
      }

      if (state === 'spinning' || state === 'stopping') {
        // Draw scrolling strip using current offset (works for all moving phases)
        const strip = this.reelStrips[ri];
        const offset = this.reelOffsets[ri];
        const startIdx = Math.floor(offset / this.cellSize);
        const subOffset = offset % this.cellSize;

        const speedRatio = this.reelSpeeds[ri] / this.SPIN_SPEED;
        const alpha = state === 'bouncing' ? 1 : (0.5 + (1 - speedRatio) * 0.5);

        for (let row = -1; row <= this.rows; row++) {
          const symId = strip[(startIdx + row) % strip.length];
          const symDef = symbolMap[symId];
          if (!symDef) continue;
          const y = startY + row * this.cellSize - subOffset + this.cellSize / 2;
          if (y < startY - this.cellSize || y > startY + (this.rows + 1) * this.cellSize) continue;
          ctx.globalAlpha = alpha;
          this.renderer.drawSymbol(ctx, symDef, x, y, this.symbolSize * 0.95, 1, false);
          ctx.globalAlpha = 1;
        }
      } else {
        // Fully stopped — draw from reelSymbols with highlight support
        const symbols = isExpanded ? this.reelSymbols[ri] : (this.targetGrid ? [...this.targetGrid[ri]] : this.reelSymbols[ri]);
        for (let row = 0; row < this.rows; row++) {
          const symId = symbols[row];
          const symDef = symbolMap[symId];
          if (!symDef) continue;
          const y = startY + row * this.cellSize + this.cellSize / 2;
          const highlighted = this.reelHighlighted[ri][row];
          this.renderer.drawSymbol(ctx, symDef, x, y, this.symbolSize * 0.95, 1, highlighted);
        }
      }
    }
  }
}
