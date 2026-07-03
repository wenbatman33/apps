// 世界盃錦標賽：32 強單淘汰賽程管理
// rounds[r] = 該輪隊伍 id 序列（i 與 i+1 配對）；results[r] = 該輪比賽結果
import { TEAMS } from './teams.js';

export const ROUND_NAMES = ['32 強', '16 強', '8 強', '準決賽', '決賽'];

export class Tournament {
  constructor(playerId) {
    this.playerId = playerId;
    const others = TEAMS.map(t => t.id).filter(id => id !== playerId);
    // 洗牌其餘 31 隊
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    // 玩家隨機落位
    const slot = Math.floor(Math.random() * 32);
    others.splice(slot, 0, playerId);
    this.rounds = [others];
    this.results = [];
    this.round = 0;
  }

  roundName() { return ROUND_NAMES[this.round]; }

  // 本輪對戰組合 [[a,b], ...]
  pairs() {
    const r = this.rounds[this.round], out = [];
    for (let i = 0; i < r.length; i += 2) out.push([r[i], r[i + 1]]);
    return out;
  }

  // 玩家本輪的對手 id
  playerOpponent() {
    for (const [a, b] of this.pairs()) {
      if (a === this.playerId) return b;
      if (b === this.playerId) return a;
    }
    return null;
  }

  // 玩家比賽結束 → 記錄本輪全部結果（其他場模擬）並晉級
  finishRound(playerGoals, oppGoals) {
    const res = this.pairs().map(([a, b]) => {
      if (a === this.playerId || b === this.playerId) {
        const sa = a === this.playerId ? playerGoals : oppGoals;
        const sb = b === this.playerId ? playerGoals : oppGoals;
        return { a, b, sa, sb, winner: sa > sb ? a : b, me: true };
      }
      // 模擬其他場（平手時黃金進球 +1）
      let sa = Math.floor(Math.random() * 4), sb = Math.floor(Math.random() * 4);
      if (sa === sb) (Math.random() < 0.5 ? sa++ : sb++);
      return { a, b, sa, sb, winner: sa > sb ? a : b, me: false };
    });
    this.results.push(res);
    this.rounds.push(res.map(r => r.winner));
    this.round++;
  }

  lastResults() { return this.results[this.results.length - 1]; }
  lastRoundName() { return ROUND_NAMES[this.round - 1]; }
  // 冠軍 id（賽程打完才有）
  champion() {
    const cur = this.rounds[this.round];
    return cur.length === 1 ? cur[0] : null;
  }
}
