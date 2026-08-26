// 回合狀態機：下注(betting) → 飛行(flying) → 飛走(crashed) → 循環
import { RULES } from '../config.js';
import { makeRound, randomSeed } from './fair.js';

// 首次載入時的示範歷史（與正式回合相同的分佈）
function seedHistory(n) {
  return Array.from({ length: n }, () => {
    const r = Math.random();
    const m = Math.max(1, Math.floor((RULES.rtp / (1 - r)) * 100) / 100);
    return { m: Math.min(m, RULES.maxMultiplier), seeded: true };
  });
}

export const PHASE = { BETTING: 'betting', FLYING: 'flying', CRASHED: 'crashed' };

export class Engine {
  constructor() {
    this.phase = PHASE.BETTING;
    this.t = 0;              // 目前階段經過時間 (ms)
    this.mult = 1;           // 目前倍數
    this.round = null;       // 本回合公平資料（含 crash）
    this.next = null;        // 預先備好的下一回合
    this.nonce = Number(localStorage.getItem('av_nonce') || 0);
    this.clientSeed = localStorage.getItem('av_clientseed') || randomSeed(8);
    this.history = JSON.parse(localStorage.getItem('av_history') || '[]');
    if (!this.history.length) this.history = seedHistory(14);
    this.listeners = {};
    this.ready = false;
    this._prepare().then(() => { this.ready = true; });
  }

  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); return this; }
  emit(evt, payload) { (this.listeners[evt] || []).forEach((f) => f(payload)); }

  setClientSeed(seed) {
    this.clientSeed = seed || randomSeed(8);
    localStorage.setItem('av_clientseed', this.clientSeed);
    this._prepare(true);
  }

  // 預先產生下一回合（開局前就定案，符合 provably fair）
  async _prepare(force = false) {
    if (this.next && !force) return;
    this.nonce += 1;
    this.next = await makeRound(this.clientSeed, this.nonce);
    localStorage.setItem('av_nonce', String(this.nonce));
    this.emit('prepared', this.next);
  }

  // 飛走時間（毫秒）
  get crashMs() {
    if (!this.round) return 0;
    return (Math.log(this.round.crash) / RULES.growth) * 1000;
  }

  update(dt) {
    this.t += dt;
    if (this.phase === PHASE.BETTING) {
      if (this.t >= RULES.bettingMs && this.next) this._startFlight();
    } else if (this.phase === PHASE.FLYING) {
      const m = Math.exp(RULES.growth * (this.t / 1000));
      if (m >= this.round.crash) {
        this.mult = this.round.crash;
        this._crash();
      } else {
        this.mult = m;
        this.emit('tick', this.mult);
      }
    } else if (this.phase === PHASE.CRASHED) {
      if (this.t >= RULES.crashedMs) this._startBetting();
    }
  }

  _startFlight() {
    this.round = this.next;
    this.next = null;
    this.phase = PHASE.FLYING;
    this.t = 0;
    this.mult = 1;
    this._prepare();
    this.emit('phase', PHASE.FLYING);
  }

  _crash() {
    this.phase = PHASE.CRASHED;
    this.t = 0;
    const rec = { m: this.round.crash, hash: this.round.hash, serverSeed: this.round.serverSeed, clientSeed: this.round.clientSeed, nonce: this.round.nonce };
    this.history.unshift(rec);
    if (this.history.length > RULES.historyMax) this.history.length = RULES.historyMax;
    localStorage.setItem('av_history', JSON.stringify(this.history));
    this.emit('crash', rec);
    this.emit('phase', PHASE.CRASHED);
  }

  _startBetting() {
    this.phase = PHASE.BETTING;
    this.t = 0;
    this.mult = 1;
    this.emit('phase', PHASE.BETTING);
  }

  // 下注階段剩餘比例 0..1
  get bettingProgress() {
    return Math.min(1, this.t / RULES.bettingMs);
  }
}
