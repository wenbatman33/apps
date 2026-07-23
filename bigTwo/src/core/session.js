// 限时计分赛：起始点数，一局接一局，时间到结算总共赢多少
// 存在 registry，跨 scene.restart（每局重发牌）持续累计

(function () {
  class Session {
    constructor(opts = {}) {
      this.difficulty = opts.difficulty || 'normal';
      this.base = opts.base != null ? opts.base : 500;   // 起始点数
      this.durationMs = (opts.durationMin != null ? opts.durationMin : 30) * 60 * 1000;
      this.chips = this.base;
      this.hands = 0;      // 已完成局数
      this.wins = 0;       // 玩家获胜局数
      this.best = 0;       // 单局最高净得
      this.endAt = Date.now() + this.durationMs;
      this.ended = false;
    }

    remainingMs() {
      return Math.max(0, this.endAt - Date.now());
    }

    isTimeUp() {
      return this.remainingMs() <= 0;
    }

    // 套用一局结果，回传玩家本局净得分
    // penalty：各家罚分（settle 结果），winner：赢家索引
    applyResult(penalty, winner) {
      const total = penalty.reduce((a, b) => a + b, 0);
      // 经典大老二两两结算：玩家净得 = 其他三家付给你的 - 你付给其他三家的
      // = 总罚分 - 4 × 自己罚分（赢家自己罚分 0，收走全部）
      const net = total - 4 * penalty[0];
      this.chips += net;
      this.hands += 1;
      if (winner === 0) this.wins += 1;
      if (net > this.best) this.best = net;
      return net;
    }

    netTotal() {
      return this.chips - this.base;
    }
  }

  window.BigTwoSession = Session;
})();
