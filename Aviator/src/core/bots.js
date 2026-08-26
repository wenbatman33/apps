// 即时投注面板的在线玩家（昵称一律遮罩，与原版一致）
import { RULES } from '../config.js';

const HEAD = 'abcdefghijklmnopqrstuvwxyz';
const AMOUNTS = [3, 5, 10, 10, 20, 20, 20, 50, 50, 100, 100, 150, 200, 300, 500, 800, 1000, 2000];
const AVATAR = [0xe21c3d, 0x913ef8, 0x34b4ff, 0x28a909, 0xd07206, 0xc017b4, 0x00b3a4, 0xf3901c];

function maskName() {
  const a = HEAD[(Math.random() * 26) | 0];
  const b = HEAD[(Math.random() * 26) | 0];
  return `${a}***${b}${(Math.random() * 10) | 0}`;
}

// 目标倍数分布：多数人早早落袋，少数硬撑高倍
function targetMult() {
  const r = Math.random();
  if (r < 0.42) return 1.1 + Math.random() * 0.9;      // 1.10 ~ 2.00
  if (r < 0.75) return 2 + Math.random() * 2;          // 2 ~ 4
  if (r < 0.92) return 4 + Math.random() * 6;          // 4 ~ 10
  if (r < 0.99) return 10 + Math.random() * 40;        // 10 ~ 50
  return 50 + Math.random() * 450;                     // 极少数
}

export class Bots {
  constructor() {
    this.list = [];
    this.newRound();
  }

  newRound() {
    const n = 60 + ((Math.random() * 120) | 0);
    this.list = Array.from({ length: n }, () => ({
      name: maskName(),
      color: AVATAR[(Math.random() * AVATAR.length) | 0],
      amount: AMOUNTS[(Math.random() * AMOUNTS.length) | 0],
      target: targetMult(),
      m: 0, win: 0, cashed: false, mine: false, lost: false,
    }));
    this.list.sort((a, b) => b.amount - a.amount);
  }

  // 玩家自己的注插到最上方
  addMine(amount, slotIndex) {
    this.list.unshift({ name: '你', color: 0xffd60a, amount, target: Infinity, m: 0, win: 0, cashed: false, mine: true, lost: false, slotIndex });
  }
  cashMine(slotIndex, m, win) {
    const b = this.list.find((x) => x.mine && x.slotIndex === slotIndex && !x.cashed);
    if (b) { b.cashed = true; b.m = m; b.win = win; }
  }
  removeMine(slotIndex) {
    const i = this.list.findIndex((x) => x.mine && x.slotIndex === slotIndex && !x.cashed);
    if (i >= 0) this.list.splice(i, 1);
  }

  update(mult) {
    let changed = false;
    for (const b of this.list) {
      if (!b.cashed && !b.mine && mult >= b.target) {
        b.cashed = true;
        b.m = Math.floor(b.target * 100) / 100;
        b.win = Math.min(b.amount * b.m, RULES.maxWinPerBet);
        changed = true;
      }
    }
    return changed;
  }

  crash() {
    for (const b of this.list) if (!b.cashed) b.lost = true;
  }

  get stats() {
    const total = this.list.length;
    const cashed = this.list.filter((b) => b.cashed).length;
    const totalBet = this.list.reduce((s, b) => s + b.amount, 0);
    const totalWin = this.list.reduce((s, b) => s + b.win, 0);
    return { total, cashed, totalBet, totalWin };
  }
}
