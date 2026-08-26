// 玩家資料層：餘額、雙押注、自動下注 / 自動兌現、我的紀錄
import { RULES } from '../config.js';
import { PHASE } from './engine.js';

export const SLOT = { IDLE: 'idle', QUEUED: 'queued', ACTIVE: 'active', CASHED: 'cashed' };

const load = (k, d) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; }
};

export class Game {
  constructor(engine) {
    this.engine = engine;
    this.balance = load('av_balance', RULES.startBalance);
    this.showSecond = load('av_second_v2', true); // 預設就展開雙押注（換鍵名讓舊紀錄失效）
    this.myBets = load('av_mybets', []);
    this.slots = [this._newSlot(0), this._newSlot(1)];
    const saved = load('av_slots', null);
    if (saved) saved.forEach((s, i) => Object.assign(this.slots[i], { amount: s.amount, autoBet: false, autoCash: s.autoCash, autoCashAt: s.autoCashAt, state: SLOT.IDLE }));
    this.listeners = {};

    engine.on('phase', (p) => this._onPhase(p));
    engine.on('tick', (m) => this._onTick(m));
    engine.on('crash', () => this._onCrash());
  }

  on(e, fn) { (this.listeners[e] ||= []).push(fn); return this; }
  emit(e, p) { (this.listeners[e] || []).forEach((f) => f(p)); }

  _newSlot(i) {
    return {
      index: i, amount: i === 0 ? 10 : 20, state: SLOT.IDLE,
      autoBet: false, autoCash: false, autoCashAt: 2.0,
      lastWin: 0, lastMult: 0, tab: 'bet',
    };
  }

  save() {
    localStorage.setItem('av_balance', JSON.stringify(Math.round(this.balance * 100) / 100));
    localStorage.setItem('av_second_v2', JSON.stringify(this.showSecond));
    localStorage.setItem('av_mybets', JSON.stringify(this.myBets.slice(0, 60)));
    localStorage.setItem('av_slots', JSON.stringify(this.slots.map((s) => ({ amount: s.amount, autoCash: s.autoCash, autoCashAt: s.autoCashAt }))));
  }

  setAmount(slot, v) {
    slot.amount = Math.max(RULES.minBet, Math.min(RULES.maxBet, Math.round(v * 100) / 100));
    this.save();
    this.emit('change');
  }

  canPlace(slot) {
    return slot.state === SLOT.IDLE && this.balance >= slot.amount && slot.amount >= RULES.minBet;
  }

  place(slot) {
    if (!this.canPlace(slot)) return false;
    this.balance -= slot.amount;
    slot.state = SLOT.QUEUED;
    slot.lastWin = 0;
    this.save();
    this.emit('change');
    this.emit('placed', slot);
    return true;
  }

  cancel(slot) {
    if (slot.state !== SLOT.QUEUED) return false;
    this.balance += slot.amount;
    slot.state = SLOT.IDLE;
    this.save();
    this.emit('change');
    return true;
  }

  cashOut(slot, mult = this.engine.mult) {
    if (slot.state !== SLOT.ACTIVE) return false;
    const m = Math.floor(mult * 100) / 100;
    const win = Math.min(slot.amount * m, RULES.maxWinPerBet);
    this.balance += win;
    slot.state = SLOT.IDLE; // 兌現後立即可為下一回合下注（與原版一致）
    slot.lastWin = win;
    slot.lastMult = m;
    this.myBets.unshift({ t: Date.now(), amount: slot.amount, m, win, nonce: this.engine.round?.nonce });
    this.save();
    this.emit('change');
    this.emit('cashed', { slot, m, win });
    return true;
  }

  _onPhase(p) {
    if (p === PHASE.FLYING) {
      this.slots.forEach((s) => { if (s.state === SLOT.QUEUED) s.state = SLOT.ACTIVE; });
    } else if (p === PHASE.BETTING) {
      // 自動下注：新回合下注階段自動排入
      this.slots.forEach((s) => {
        if (s.state === SLOT.CASHED) s.state = SLOT.IDLE;
        if (s.autoBet && s.state === SLOT.IDLE) this.place(s);
      });
    }
    this.emit('change');
  }

  _onTick(m) {
    this.slots.forEach((s) => {
      if (s.state === SLOT.ACTIVE && s.autoCash && m >= s.autoCashAt) this.cashOut(s, s.autoCashAt);
    });
  }

  _onCrash() {
    this.slots.forEach((s) => {
      if (s.state === SLOT.ACTIVE) {
        this.myBets.unshift({ t: Date.now(), amount: s.amount, m: 0, win: 0, nonce: this.engine.round?.nonce });
        s.state = SLOT.IDLE;
        s.lastWin = 0;
      }
    });
    this.save();
    this.emit('change');
  }
}
