export class DDA {
    recentDeaths = [];
    lastHitAt = 0;
    recordDeath(nowMs) {
        this.recentDeaths = [...this.recentDeaths, nowMs].filter((deathAt) => nowMs - deathAt <= 30_000);
        this.lastHitAt = nowMs;
    }
    recordHit(nowMs) {
        this.lastHitAt = nowMs;
    }
    getState(nowMs) {
        const deaths = this.recentDeaths.filter((deathAt) => nowMs - deathAt <= 30_000).length;
        const pressureRelief = deaths >= 2;
        const cleanRunBonus = this.lastHitAt > 0 && nowMs - this.lastHitAt >= 90_000;
        return {
            densityMultiplier: pressureRelief ? 0.9 : 1,
            enemyHpMultiplier: pressureRelief ? 0.9 : 1,
            powerDropBonus: cleanRunBonus ? 0.2 : 0,
        };
    }
}
