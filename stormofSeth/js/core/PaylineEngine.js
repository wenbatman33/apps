/**
 * PaylineEngine - Win calculation for slot games
 *
 * Evaluates the result grid against all paylines and returns win data.
 * Supports: standard line wins, scatter wins, wild substitution.
 *
 * Godot equivalent: A pure GDScript utility class (no Node) that
 * takes a 2D array of symbol IDs and returns an Array of WinResult dicts.
 */

class PaylineEngine {
  constructor(theme) {
    this.theme = theme;
    this.paylines = theme.paylines;
    this.symbolMap = {};
    for (const sym of theme.symbols) {
      this.symbolMap[sym.id] = sym;
    }
    this.wildSymbol = theme.symbols.find(s => s.type === 'wild');
    this.scatterSymbol = theme.symbols.find(s => s.type === 'scatter');
  }

  /**
   * Evaluate grid and return all wins
   * @param {string[][]} grid - [reel][row] symbol IDs, e.g. grid[0][1] = 'pharaoh'
   * @param {number} bet - total bet amount
   * @param {boolean} isFreeSpins - apply free spin multiplier
   * @param {number} multiplier - current multiplier
   * @returns {Object} { lineWins, scatterWin, totalWin, winningLines, sethPositions }
   */
  evaluate(grid, bet, isFreeSpins = false, multiplier = 1) {
    const lineWins = this._evaluateLines(grid, bet, multiplier);
    const scatterWin = this._evaluateScatter(grid, bet, multiplier);
    const sethPositions = this._findSethPositions(grid);

    const totalWin = lineWins.reduce((s, w) => s + w.win, 0) + (scatterWin ? scatterWin.win : 0);

    return {
      lineWins,
      scatterWin,
      totalWin,
      winningLines: lineWins.map(w => w.lineIndex),
      sethPositions,
      hasScatter: !!scatterWin,
      scatterCount: scatterWin ? scatterWin.count : 0,
      triggersFreeSpins: scatterWin ? scatterWin.triggersFreeSpins : false,
      freeSpinsAwarded: scatterWin ? scatterWin.freeSpinsAwarded : 0
    };
  }

  _evaluateLines(grid, bet, multiplier) {
    const wins = [];
    const reels = this.theme.grid.reels;
    const betPerLine = bet / this.paylines.length;

    for (let li = 0; li < this.paylines.length; li++) {
      const line = this.paylines[li];
      const symbols = line.slice(0, reels).map((row, reel) => grid[reel][row]);

      const result = this._checkLine(symbols, betPerLine, multiplier);
      if (result) {
        wins.push({
          lineIndex: li,
          line,
          symbolId: result.symbolId,
          count: result.count,
          positions: result.positions,
          win: result.win
        });
      }
    }
    return wins;
  }

  _checkLine(symbols, betPerLine, multiplier) {
    if (!symbols.length) return null;
    const wildId = this.wildSymbol?.id;

    // Determine first non-wild symbol
    let baseSymbol = null;
    for (const s of symbols) {
      if (s !== wildId) { baseSymbol = s; break; }
    }
    if (!baseSymbol) baseSymbol = wildId; // all wilds

    let count = 0;
    const positions = [];
    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i] === baseSymbol || symbols[i] === wildId) {
        count++;
        positions.push(i);
      } else break;
    }

    if (count < 3) return null;

    const symDef = this.symbolMap[baseSymbol];
    if (!symDef) return null;

    const payout = symDef.paytable[String(count)];
    if (!payout) return null;

    const win = betPerLine * payout * multiplier;
    return { symbolId: baseSymbol, count, positions, win };
  }

  _evaluateScatter(grid, bet, multiplier) {
    if (!this.scatterSymbol) return null;
    const scatterId = this.scatterSymbol.id;
    const positions = [];

    for (let r = 0; r < grid.length; r++) {
      for (let row = 0; row < grid[r].length; row++) {
        if (grid[r][row] === scatterId) {
          positions.push({ reel: r, row });
        }
      }
    }

    const count = positions.length;
    if (count < 3) return null;

    const scatterPay = this.scatterSymbol.scatterPay?.[String(count)] || 0;
    const win = bet * scatterPay * multiplier;

    const freeSpinsFeature = this.theme.features?.freeSpins;
    const triggersFreeSpins = freeSpinsFeature?.enabled && count >= freeSpinsFeature.minTrigger;
    const freeSpinsAwarded = triggersFreeSpins ? (freeSpinsFeature.awards[String(count)] || 0) : 0;

    return { symbolId: scatterId, count, positions, win, triggersFreeSpins, freeSpinsAwarded };
  }

  _findSethPositions(grid) {
    if (!this.wildSymbol) return [];
    const wildId = this.wildSymbol.id;
    const positions = [];
    for (let r = 0; r < grid.length; r++) {
      for (let row = 0; row < grid[r].length; row++) {
        if (grid[r][row] === wildId) positions.push({ reel: r, row });
      }
    }
    return positions;
  }

  /**
   * Generate a random grid weighted by symbol weights
   */
  generateGrid(reels, rows) {
    const symbols = this.theme.symbols;
    const totalWeight = symbols.reduce((s, sym) => s + sym.weight, 0);

    const grid = [];
    for (let r = 0; r < reels; r++) {
      grid[r] = [];
      for (let row = 0; row < rows; row++) {
        grid[r][row] = this._weightedRandom(symbols, totalWeight);
      }
    }
    return grid;
  }

  _weightedRandom(symbols, totalWeight) {
    let rand = Math.random() * totalWeight;
    for (const sym of symbols) {
      rand -= sym.weight;
      if (rand <= 0) return sym.id;
    }
    return symbols[symbols.length - 1].id;
  }

  /**
   * Generate grid with guaranteed win (for testing / forced wins)
   * @param {string} symbolId - symbol to force
   * @param {number} count - how many in a row (3-5)
   */
  generateForcedWin(reels, rows, symbolId, count = 3) {
    const grid = this.generateGrid(reels, rows);
    // Force middle row win on first `count` reels
    for (let r = 0; r < count; r++) {
      grid[r][1] = symbolId;
    }
    return grid;
  }

  /**
   * Generate grid guaranteed to have zero wins.
   * Re-rolls up to 50 times; falls back to patching reel 2 if needed.
   */
  generateLoss(reels, rows) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const grid = this.generateGrid(reels, rows);
      const result = this.evaluate(grid, 1, false, 1);
      if (result.totalWin === 0) return grid;
    }
    // Guaranteed fallback: break every potential match at reel index 2
    const grid = this.generateGrid(reels, rows);
    const breaker = this.theme.symbols.find(
      s => s.type !== 'wild' && s.type !== 'scatter' && s.weight >= 5
    ) || this.theme.symbols[this.theme.symbols.length - 1];
    // Alternate between two different low symbols across rows so no scatter forms either
    const alts = this.theme.symbols.filter(s => s.type !== 'wild' && s.type !== 'scatter');
    for (let row = 0; row < rows; row++) {
      grid[2][row] = alts[row % alts.length]?.id || breaker.id;
    }
    return grid;
  }
}
