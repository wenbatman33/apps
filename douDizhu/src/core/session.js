// 限時計分賽：起始點數，一局接一局，時間到結算總共贏多少
// 存在 registry，跨 scene.restart（每局重發牌）持續累計

(function () {
  class Session {
    constructor(opts = {}) {
      this.difficulty = opts.difficulty || 'normal';
      this.base = opts.base != null ? opts.base : 500;   // 起始點數
      this.durationMs = (opts.durationMin != null ? opts.durationMin : 30) * 60 * 1000;
      this.chips = this.base;
      this.hands = 0;       // 已完成局數
      this.wins = 0;        // 玩家獲勝局數
      this.best = 0;        // 單局最高淨得
      this.landlordCount = 0; // 玩家當地主次數
      this.endAt = Date.now() + this.durationMs;
      this.ended = false;
      this.nextFirstBidder = 0; // 每局輪流先叫分
    }

    remainingMs() {
      return Math.max(0, this.endAt - Date.now());
    }

    isTimeUp() {
      return this.remainingMs() <= 0;
    }

    // 套用一局結果，回傳玩家（座位0）本局淨得分
    // settled = { pts, landlordWin, landlord, bid, mult }
    applyResult(settled) {
      const meLandlord = settled.landlord === 0;
      const meWin = meLandlord ? settled.landlordWin : !settled.landlordWin;
      // 地主對兩個農民各結一份：地主 ±2×pts、農民各 ±1×pts
      const net = (meLandlord ? 2 : 1) * settled.pts * (meWin ? 1 : -1);
      this.chips += net;
      this.hands += 1;
      if (meWin) this.wins += 1;
      if (meLandlord) this.landlordCount += 1;
      if (net > this.best) this.best = net;
      this.nextFirstBidder = (this.nextFirstBidder + 1) % 3;
      return net;
    }

    netTotal() {
      return this.chips - this.base;
    }
  }

  window.DdzSession = Session;
})();
