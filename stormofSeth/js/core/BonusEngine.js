/**
 * BonusEngine - Manages free spins and Seth Storm feature
 *
 * Seth Storm Feature:
 *   During free spins, each Seth (Wild) that appears expands to fill its entire reel.
 *   This triggers a re-spin. Additional multiplier is applied per expanded Seth.
 *   Max multiplier: 5x (configurable in theme)
 *
 * Godot equivalent: An Autoload singleton (GameState.gd) that manages
 * free spin count, multiplier, and emits signals like:
 *   signal free_spins_started(count)
 *   signal free_spins_ended(total_win)
 *   signal seth_storm_triggered(reel_index, multiplier)
 */

class BonusEngine {
  constructor(theme) {
    this.theme = theme;
    this.feature = theme.features?.sethStorm || {};
    this.freeSpinFeature = theme.features?.freeSpins || {};

    this.reset();
  }

  reset() {
    this.freeSpinsRemaining = 0;
    this.freeSpinsTotal = 0;
    this.isFreeSpins = false;
    this.multiplier = 1;
    this.totalFreeSpinWin = 0;
    this.expandedReels = new Set();
    this.sethStormActive = false;
  }

  get isActive() {
    return this.isFreeSpins || this.sethStormActive;
  }

  /**
   * Start free spins mode
   */
  startFreeSpins(count) {
    this.freeSpinsRemaining = count;
    this.freeSpinsTotal = count;
    this.isFreeSpins = true;
    this.multiplier = 1;
    this.totalFreeSpinWin = 0;
    this.expandedReels.clear();
    this.sethStormActive = false;
  }

  /**
   * Add more free spins (re-trigger)
   */
  addFreeSpins(count) {
    this.freeSpinsRemaining += count;
    this.freeSpinsTotal += count;
  }

  /**
   * Called after each free spin resolves
   * @param {Object} spinResult - result from PaylineEngine.evaluate()
   * @returns {Object} { sethStorm: bool, expandedReels: [], newMultiplier, addedSpins }
   */
  processFreeSpinResult(spinResult) {
    if (!this.isFreeSpins) return null;

    this.totalFreeSpinWin += spinResult.totalWin;
    this.freeSpinsRemaining--;

    // Check for Seth Storm trigger
    const sethPos = spinResult.sethPositions || [];
    const sethReels = [...new Set(sethPos.map(p => p.reel))];
    const newExpanded = sethReels.filter(r => !this.expandedReels.has(r));

    let multiplierGained = 0;
    for (const r of newExpanded) {
      this.expandedReels.add(r);
      const gain = this.feature.multiplierPerSeth || 1;
      const maxMult = this.feature.maxMultiplier || 5;
      if (this.multiplier < maxMult) {
        this.multiplier = Math.min(this.multiplier + gain, maxMult);
        multiplierGained += gain;
      }
    }

    const sethStormTriggered = newExpanded.length > 0 && this.feature.enabled;
    if (sethStormTriggered) {
      this.sethStormActive = true;
      // Re-spin: add 1 back
      if (this.feature.reSpinOnExpand) {
        this.freeSpinsRemaining++;
      }
    }

    // Re-trigger free spins from scatter during free spins
    let addedSpins = 0;
    if (spinResult.triggersFreeSpins) {
      addedSpins = Math.floor(spinResult.freeSpinsAwarded / 2); // half on retrigger
      this.addFreeSpins(addedSpins);
    }

    return {
      sethStorm: sethStormTriggered,
      expandedReels: [...newExpanded],
      newMultiplier: this.multiplier,
      multiplierGained,
      addedSpins
    };
  }

  /**
   * Check if free spins are done
   */
  isFreeSpinsDone() {
    return this.isFreeSpins && this.freeSpinsRemaining <= 0;
  }

  /**
   * End free spins and return summary
   */
  endFreeSpins() {
    const summary = {
      totalWin: this.totalFreeSpinWin,
      spinsPlayed: this.freeSpinsTotal,
      maxMultiplier: this.multiplier,
      expandedReels: [...this.expandedReels]
    };
    this.reset();
    return summary;
  }

  /**
   * Get display status for UI
   */
  getStatus() {
    return {
      isFreeSpins: this.isFreeSpins,
      spinsRemaining: this.freeSpinsRemaining,
      spinsTotal: this.freeSpinsTotal,
      multiplier: this.multiplier,
      totalFreeSpinWin: this.totalFreeSpinWin,
      sethStormActive: this.sethStormActive,
      expandedReels: [...this.expandedReels]
    };
  }
}
