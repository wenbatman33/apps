// ============ 遊戲狀態與規則 ============
import { LAYOUT, COIN_DEFS, CHIP_DEFS, PRIZE_DEFS, SHOP_COIN_POOL, RARITY_WEIGHT,
  ROUND_CURVE, BASE_TARGET, TOTAL_ROUNDS, ENDLESS_MULT, DIFFICULTIES, BAD_POOL, CHARACTER, WHEEL_REWARDS } from './data.js';
import * as M from './machine.js';
import { Sound } from './sound.js';

let G = null;

export const run = {
  state: 'start',      // start | play | shop | wheel | paused | fail | win
  diff: DIFFICULTIES[0],
  round: 1, target: 100, score: 0, reached: false,
  hand: 40, tickets: 0,
  exchangeUses: 0,
  clip: [], clipCap: CHARACTER.clipCap, selectedClip: -1,
  chips: [], prizes: [],
  permRate: 0,
  combo: 0, comboTimer: 0, wheelEnergy: 0,
  endless: false,
  insertCd: 0, shakeCd: 0,
  failTimer: -1,
  timeScale: 1,
  shop: null, rerolls: 0,
  stats: { coinsScored: 0, bestCombo: 0 },
};

export function initGame(Gref) {
  G = Gref;
  G.game = {
    run,
    startRun, startRound, endRoundToShop, nextRound, giveUp,
    insertCoin, selectClip, usePrize, exchange, shakeMachine, exchangeCost,
    onCoinTouch, onCoinScored, onCoinLost, onBadDestroyed,
    tick, effRate, explosionBoost, buyShopItem, rerollShop, applyWheelReward, addPrize,
    enterEndless, pause, resume,
  };
}

// ---------- 開局 / 回合 ----------
function startRun(diffIdx) {
  run.diff = DIFFICULTIES[diffIdx];
  run.state = 'play';
  run.round = 1;
  run.tickets = CHARACTER.startTickets;
  run.hand = run.diff.startCoins;
  run.clip = CHARACTER.startClip.map(id => ({ defId: id, count: 1 }));
  run.clipCap = CHARACTER.clipCap;
  run.chips = []; run.prizes = [];
  run.permRate = 0; run.endless = false;
  prefillTable();
  startRound(true);
}

function targetFor(round) {
  let t;
  if (round <= TOTAL_ROUNDS) t = BASE_TARGET * ROUND_CURVE[round - 1];
  else t = BASE_TARGET * ROUND_CURVE[TOTAL_ROUNDS - 1] * Math.pow(ENDLESS_MULT, round - TOTAL_ROUNDS);
  return Math.round(t * run.diff.targetMult);
}

function startRound(first = false) {
  run.target = targetFor(run.round);
  run.score = 0; run.reached = false;
  run.exchangeUses = 0;
  run.combo = 0; run.comboTimer = 0;
  run.failTimer = -1;
  if (!first) {
    const bonus = run.chips.includes('chip_start') ? 8 : 0;
    run.hand = Math.max(run.hand, run.diff.startCoins + bonus);
  } else if (run.chips.includes('chip_start')) run.hand += 8;
  // 負面幣生成
  if (run.round >= run.diff.badStartRound) {
    const n = run.diff.badPerRound + (run.round >= 10 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const id = BAD_POOL[Math.floor(Math.random() * BAD_POOL.length)];
      M.spawnCoin(id, { x: (Math.random() - 0.5) * 4, z: 0.5 + Math.random() * 1.5, y: 4 });
    }
  }
  run.state = 'play';
  G.ui.showBanner(`ROUND ${run.round}${run.endless ? ' ♾' : ' / ' + TOTAL_ROUNDS}`, `目標分數 ${run.target}`);
  G.ui.refreshAll();
}

function prefillTable() {
  const M_ = LAYOUT.machine;
  let n = 0;
  // 從推板最大伸出處一路密鋪到前緣，讓推力鏈能直達得分邊
  for (let z = M_.pusherMinZ + M_.pusherRange + 0.55; z < M_.floorFrontZ - 0.25; z += 0.78) {
    for (let x = -2.8; x <= 2.8; x += 0.82) {
      if (Math.random() < 0.95) {
        const id = Math.random() < 0.1 ? 'silver' : 'copper';
        M.spawnCoin(id, { x: x + (Math.random() - 0.5) * 0.15, y: 0.35, z, rot: false, force: true });
        n++;
        // 少量第二層，增加初始堆疊感
        if (Math.random() < 0.18) {
          M.spawnCoin('copper', { x: x + (Math.random() - 0.5) * 0.3, y: 0.75, z: z + (Math.random() - 0.5) * 0.2, rot: false, force: true });
          n++;
        }
      }
    }
  }
}

function endRoundToShop() {
  if (!run.reached) return;
  // 結算：溢出分數轉票券 + 完成獎勵
  const overflow = Math.max(0, run.score - run.target);
  let gain = Math.floor(overflow * 0.08) + 20 + run.round * 2 + CHARACTER.endRoundTickets;
  if (run.chips.includes('chip_ticket')) gain += 12;
  run.tickets += gain;
  Sound.roundWin();
  G.ui.toast(`回合完成！獎勵 +${gain} 🎟️`, 'good');
  saveBest();
  if (run.round === TOTAL_ROUNDS && !run.endless) {
    run.state = 'win';
    G.ui.showWin();
    return;
  }
  openShop();
}

function enterEndless() {
  run.endless = true;
  openShop();
}

function nextRound() {
  run.round++;
  startRound();
}

function giveUp() { doFail('主動放棄'); }

function doFail(reason) {
  if (run.state === 'fail') return;
  run.state = 'fail';
  Sound.fail();
  saveBest();
  G.ui.showFail(`${reason}<br>止步於第 ${run.round} 回合・總得分硬幣 ${run.stats.coinsScored} 枚`);
}

function saveBest() {
  try {
    const best = Number(localStorage.getItem('raccoin_best') || 0);
    if (run.round > best) localStorage.setItem('raccoin_best', String(run.round));
  } catch (e) {}
}

function pause() { if (run.state === 'play') { run.state = 'paused'; G.ui.showPause(true); } }
function resume() { if (run.state === 'paused') { run.state = 'play'; G.ui.showPause(false); } }

// ---------- 數值 ----------
function badCount(id) { return M.getCoins().filter(c => c.def.id === id).length; }

function effRate() {
  let r = 1 + run.permRate;
  if (run.chips.includes('chip_rate')) r += 0.2;
  r *= Math.pow(0.9, badCount('curse'));
  return r;
}

function comboMult() { return 1 + 0.06 * Math.min(run.combo, 30); }

function explosionBoost() { return run.chips.includes('chip_boom') ? 1.5 : 1; }

function exchangeCost() {
  let base = 15 + run.exchangeUses * 3;
  base *= CHARACTER.exchangeDiscount;
  if (run.chips.includes('chip_exch')) base *= 0.7;
  base *= 1 + 0.5 * badCount('tax');
  return Math.ceil(base);
}

function comboWindow() {
  return LAYOUT.game.comboWindow + (run.chips.includes('chip_combo') ? 1.2 : 0);
}

// ---------- 投幣 ----------
function insertCoin() {
  if (run.state !== 'play' || run.insertCd > 0) return;
  const x = M.getAimX();
  const drop = { x, vz: 0.5 };
  if (run.selectedClip >= 0) {
    const slot = run.clip[run.selectedClip];
    if (!slot || slot.count <= 0) { run.selectedClip = -1; G.ui.refreshClip(); return; }
    const coin = M.spawnCoin(slot.defId, drop);
    if (!coin) { G.ui.toast('機台硬幣太多了！', 'warn'); Sound.error(); return; }
    slot.count--;
    if (slot.count <= 0) { run.clip.splice(run.selectedClip, 1); run.selectedClip = -1; }
    Sound.insert();
    if (slot.defId === 'laser') fireLaser(x, coin);
  } else {
    if (run.hand <= 0) { G.ui.toast('硬幣不足！用 🎟️ 兌換更多', 'warn'); Sound.error(); return; }
    if (!M.spawnCoin('copper', drop)) { G.ui.toast('機台硬幣太多了！', 'warn'); Sound.error(); return; }
    run.hand--;
    Sound.insert();
  }
  run.insertCd = LAYOUT.game.insertCooldown;
  G.ui.refreshResources();
}

function selectClip(i) {
  if (i >= run.clip.length) i = -1;
  run.selectedClip = (run.selectedClip === i) ? -1 : i;
  M.setAimColor(run.selectedClip >= 0 ? 0xff8de0 : 0xffe66d);
  G.ui.refreshClip();
}

function fireLaser(x, laserCoin) {
  M.laserBeam(x);
  const targets = M.getCoins()
    .filter(c => c !== laserCoin && Math.abs(c.body.position.x - x) < 0.55 && c.def.kind !== 'bad')
    .sort((a, b) => b.body.position.z - a.body.position.z)
    .slice(0, 4);
  for (const t of targets) {
    const pos = { ...t.body.position };
    M.sparkleAt(pos, 0xff4f9e);
    M.removeCoin(t);
    scoreCoin(t, pos, true);
  }
}

// ---------- 兌換 / 搖晃 ----------
function exchange() {
  if (run.state !== 'play') return;
  const cost = exchangeCost();
  if (run.tickets < cost) { G.ui.toast('票券不足！', 'warn'); Sound.error(); return; }
  run.tickets -= cost;
  run.exchangeUses++;
  run.hand += LAYOUT.game.exchangeYield;
  run.failTimer = -1;
  Sound.buy();
  G.ui.toast(`兌換成功 +${LAYOUT.game.exchangeYield} 枚硬幣`, 'good');
  G.ui.refreshResources();
}

function shakeMachine() {
  if (run.state !== 'play' || run.shakeCd > 0) return;
  run.shakeCd = 25;
  M.shakeMachine(1.4);
  G.ui.refreshPrizes();
}

// ---------- 硬幣事件 ----------
function onCoinTouch(a, b, imp) {
  if (run.state !== 'play' && run.state !== 'wheel') return;
  for (const [c, o] of [[a, b], [b, a]]) {
    const id = c.def.id;
    const now = performance.now();
    // 炸彈：落地 1.5 秒後被碰就爆
    if (id === 'bomb' && c.state.landedAt && now - c.state.landedAt > 1500 && !c.state.dead) {
      c.state.dead = true;
      const pos = { ...c.body.position };
      M.removeCoin(c);
      M.explode(pos, 1.9, 5.5, { destroyBad: true });
      return;
    }
    // 兔子繁殖
    if (id === 'rabbit' && o.def.id === 'rabbit' && c.id < o.id) {
      if (now - c.state.lastTrigger > 6000 && now - o.state.lastTrigger > 6000) {
        const rabbits = M.getCoins().filter(x => x.def.id === 'rabbit').length;
        if (rabbits < 12) {
          c.state.lastTrigger = now; o.state.lastTrigger = now;
          const p = c.body.position;
          M.spawnCoin('rabbit', { x: p.x, y: p.y + 1.2, z: p.z, gen: 1 });
          M.sparkleAt(p, 0xffc0e8);
          Sound.spawnPop();
          G.ui.toast('🐰 兔子繁殖了！', 'good');
        }
      }
    }
    // 狼捕食動物
    if (id === 'wolf' && o.def.tags?.includes('animal') && o.def.id !== 'wolf' && !o.state.dead) {
      o.state.dead = true;
      const p = { ...o.body.position };
      c.value += o.value;
      M.removeCoin(o);
      M.spawnCoin('fert', { x: p.x, y: p.y + 0.8, z: p.z });
      M.sparkleAt(p, 0xff8a8a);
      Sound.spawnPop();
      G.ui.popupWorld(p, `🐺+${o.value}`, 'big');
    }
    // 種子吸收養分
    if (id === 'seed' && o.def.tags?.includes('plantfood') && !o.state.dead) {
      o.state.dead = true;
      const sp = c.body.position;
      c.state.growth++;
      M.removeCoin(o);
      M.sparkleAt(sp, 0x7ac96f);
      if (c.state.growth >= 3 && !c.state.dead) {
        c.state.dead = true;
        const p = { ...sp };
        M.removeCoin(c);
        Sound.grow();
        addScore(Math.round(30 * effRate()), p, 'huge', '🌳');
        for (let i = 0; i < 3; i++) M.spawnCoin('gold', { x: p.x + (Math.random()-0.5), y: p.y + 1.5 + i * 0.5, z: p.z });
        G.ui.toast('🌳 硬幣樹長成了！掉出 3 枚金幣', 'good');
      }
    }
    // 清除幣
    if (id === 'cleaner' && o.def.kind === 'bad' && !c.state.dead && !o.state.dead) {
      c.state.dead = true; o.state.dead = true;
      const p = { ...o.body.position };
      M.removeCoin(o); M.removeCoin(c);
      M.sparkleAt(p, 0xb8e0a0);
      run.tickets += 10;
      Sound.ticket();
      G.ui.popupWorld(p, '🧹+10🎟️', 'big');
      G.ui.refreshResources();
    }
    // 鏽蝕
    if (id === 'rust' && o.def.kind !== 'bad' && !o.state.rusted && o.value > 1) {
      o.state.rusted = true;
      o.value = Math.max(1, Math.ceil(o.value / 2));
      o.mesh.material.forEach?.(m => m.color?.multiplyScalar(0.55));
      G.ui.popupWorld(o.body.position, '🦠 減半', 'bad');
    }
  }
}

// 分數入帳（直接得分也走這裡）
function addScore(gain, pos, cls = '', prefix = '+') {
  run.score += gain;
  if (pos) G.ui.popupWorld(pos, `${prefix}${gain}`, cls);
  checkReached();
  G.ui.refreshScore();
}

function checkReached() {
  if (!run.reached && run.score >= run.target) {
    run.reached = true;
    run.failTimer = -1;
    Sound.bigScore();
    G.ui.showBanner('🎯 達標！', '可繼續累積溢出分數，或進入商店');
    G.ui.refreshAll();
  }
}

function scoreCoin(coin, pos, direct = false) {
  const def = coin.def;
  // 負面幣落下
  if (def.kind === 'bad') {
    if (def.id === 'thief') {
      run.tickets = Math.max(0, run.tickets - 15);
      Sound.badScore();
      G.ui.popupWorld(pos, '🦹 -15🎟️', 'bad');
    } else {
      Sound.ticket();
      G.ui.popupWorld(pos, '🧹 已清除', '');
    }
    G.ui.refreshResources();
    return;
  }
  // 一般得分
  run.combo++;
  run.comboTimer = comboWindow();
  run.wheelEnergy++;
  run.stats.coinsScored++;
  run.stats.bestCombo = Math.max(run.stats.bestCombo, run.combo);
  const gain = Math.max(1, Math.round(coin.value * effRate() * comboMult()));
  const tGain = Math.max(1, Math.round(gain * LAYOUT.game.convRate));
  run.tickets += tGain;
  Sound.score(run.combo);
  const cls = gain >= 60 ? 'huge' : gain >= 20 ? 'big' : '';
  addScore(gain, pos, cls);

  // 特殊幣得分效果
  if (def.id === 'ticket') { run.tickets += 6; Sound.ticket(); G.ui.popupWorld(pos, '+6🎟️', 'big'); }
  if (def.id === 'double') { run.permRate += 0.15; G.ui.toast('✖️ 得分倍率永久 +0.15！', 'good'); }
  if (def.id === 'ret' && Math.random() < 0.7) { addToClip('ret'); G.ui.toast('🔁 回歸幣回到硬幣夾', 'good'); }
  if (def.id === 'clone' && coin.state.gen < 2) {
    M.spawnCoin('clone', { x: (Math.random() - 0.5) * 3, gen: coin.state.gen + 1 });
    G.ui.toast('🪞 複製幣複製了自己！', 'good');
  }
  if (def.id === 'sticky' && !direct) {
    const near = M.getCoins().sort((a, b) =>
      a.body.position.distanceTo(coin.body.position) - b.body.position.distanceTo(coin.body.position)).slice(0, 3);
    for (const n of near) { n.body.wakeUp(); n.body.applyImpulse({ x: 0, y: 0.5, z: 2.2 }); }
  }
  if (def.id === 'nuke') {
    addScore(Math.round(50 * effRate()), pos, 'huge', '☢️+');
    M.explode(M.frontCenter(), 12, 6.5, { destroyBad: true, big: true });
    G.ui.toast('☢️ 核爆！全場硬幣向前推進', 'good');
  }
  G.ui.refreshResources();
}

function onCoinScored(coin) {
  if (run.state === 'fail' || run.state === 'win') return;
  const pos = { x: coin.body.position.x, y: 0.5, z: LAYOUT.machine.floorFrontZ };
  scoreCoin(coin, pos);
}

function onCoinLost(coin) {
  if (coin.def.kind === 'special') G.ui.toast(`${coin.def.icon} ${coin.def.name} 掉進側溝流失了`, 'warn');
}

function onBadDestroyed(coin) {
  run.tickets += 5;
  G.ui.popupWorld(coin.body.position, '💥+5🎟️', 'big');
  G.ui.refreshResources();
}

function addToClip(defId) {
  const slot = run.clip.find(s => s.defId === defId);
  if (slot) { slot.count++; G.ui.refreshClip(); return true; }
  if (run.clip.length < run.clipCap) { run.clip.push({ defId, count: 1 }); G.ui.refreshClip(); return true; }
  return false;
}

// ---------- 每幀邏輯 ----------
let regenAcc = 0;
function tick(dt) {
  if (run.insertCd > 0) run.insertCd -= dt;
  if (run.shakeCd > 0) { run.shakeCd -= dt; if (run.shakeCd <= 0) G.ui.refreshPrizes(); }
  if (run.state !== 'play') return;

  // 手持硬幣自動回充：永遠有幣可投，盡情暢玩
  regenAcc += dt;
  if (regenAcc >= LAYOUT.game.regenSec) {
    regenAcc = 0;
    if (run.hand < LAYOUT.game.regenCap) { run.hand++; G.ui.refreshResources(); }
  }

  // Combo 計時
  if (run.combo > 0) {
    run.comboTimer -= dt;
    if (run.comboTimer <= 0) {
      run.combo = 0;
      if (run.wheelEnergy >= LAYOUT.game.wheelTh1) triggerWheel();
      G.ui.refreshScore();
    }
  }

  // 每枚硬幣的時間行為
  const now = performance.now();
  for (const c of [...M.getCoins()]) {
    const id = c.def.id;
    if (id === 'magnet' && now - c.state.lastTrigger > 2000) {
      c.state.lastTrigger = now;
      const near = M.coinsNear(c.body.position, 1.7, x => x !== c);
      for (const n of near) {
        const d = c.body.position.vsub(n.body.position);
        d.y = 0; d.normalize();
        n.body.wakeUp();
        n.body.applyImpulse(d.scale(0.9));
      }
      if (near.length) M.sparkleAt(c.body.position, 0xff6b6b);
    }
    if (id === 'tornado' && c.state.landedAt && now - c.state.landedAt > 3000 && !c.state.dead) {
      c.state.dead = true;
      const p = { ...c.body.position };
      M.removeCoin(c);
      M.tornadoAt(p, 2.4, 3.2);
      G.ui.toast('🌪️ 龍捲風！', 'good');
    }
    // 炸彈待爆閃爍
    if (id === 'bomb' && c.state.landedAt && now - c.state.landedAt > 1500) {
      const s = 1 + 0.08 * Math.sin(now / 90);
      c.mesh.scale.set(s, 1, s);
    }
  }

  // 失敗偵測：沒硬幣、沒到標、換不起 → 倒數
  if (!run.reached && run.hand <= 0) {
    const canExchange = run.tickets >= exchangeCost();
    const hasClip = run.clip.some(s => s.count > 0);
    if (!canExchange && !hasClip) {
      if (run.failTimer < 0) { run.failTimer = 8; G.ui.toast('⚠️ 資源耗盡！8 秒內未得分將失敗', 'warn'); }
      run.failTimer -= dt;
      if (run.failTimer <= 0) doFail('硬幣與票券耗盡，未達目標分數');
    } else run.failTimer = -1;
  } else run.failTimer = -1;
}

// ---------- 幸運輪盤 ----------
function triggerWheel() {
  const e = run.wheelEnergy;
  const lv = e >= LAYOUT.game.wheelTh3 ? 3 : e >= LAYOUT.game.wheelTh2 ? 2 : 1;
  run.wheelEnergy = 0;
  run.state = 'wheel';
  const count = 1 + (run.chips.includes('chip_wheel') ? 1 : 0);
  G.ui.spinWheel(lv, count, () => { if (run.state === 'wheel') run.state = 'play'; G.ui.refreshAll(); });
}

function applyWheelReward(id, lv) {
  const spread = (n, coinId) => {
    let i = 0;
    const timer = setInterval(() => {
      M.spawnCoin(coinId, { x: (Math.random() - 0.5) * 5, z: -1.5 + Math.random() * 2.5, y: 5 + Math.random() * 2, force: true });
      Sound.spawnPop();
      if (++i >= n) clearInterval(timer);
    }, 90);
  };
  switch (id) {
    case 'coinRain': spread(10 + lv * 3, 'copper'); break;
    case 'silverRain': spread(4 + lv * 2, 'silver'); break;
    case 'handCoins': run.hand += 6 + lv * 3; break;
    case 'tickets': run.tickets += 14 + lv * 6; break;
    case 'tower':
      // 硬幣塔：立刻從推板出幣口升一座塔，等級越高越高、金幣比例越高（金幣塔）
      M.dispenseTower(8 + lv * 4, lv >= 3 ? 0.45 : 0.15 + lv * 0.05);
      break;
    case 'prizeBall': {
      const ids = Object.keys(PRIZE_DEFS);
      addPrize(ids[Math.floor(Math.random() * ids.length)], 1);
      break;
    }
    case 'empower': for (const c of M.getCoins()) if (c.def.kind !== 'bad') c.value += 2;
      G.ui.toast('💪 全場硬幣價值 +2！', 'good'); break;
    case 'wheel2': setTimeout(() => {
      run.state = 'wheel';
      G.ui.spinWheel(Math.min(3, lv + 1), 1, () => { if (run.state === 'wheel') run.state = 'play'; G.ui.refreshAll(); });
    }, 600); break;
  }
  G.ui.refreshResources();
}

// ---------- 道具 ----------
function addPrize(id, uses = null) {
  const def = PRIZE_DEFS[id];
  const owned = run.prizes.find(p => p.id === id);
  if (owned) { owned.uses += uses ?? def.uses; }
  else {
    if (run.prizes.length >= 4) { G.ui.toast('道具欄已滿（最多 4 格）', 'warn'); return false; }
    run.prizes.push({ id, uses: uses ?? def.uses });
  }
  G.ui.refreshPrizes();
  return true;
}

function usePrize(i) {
  if (run.state !== 'play') return;
  const p = run.prizes[i];
  if (!p || p.uses <= 0) return;
  const center = { x: 0, y: 0.6, z: 0 };
  switch (p.id) {
    case 'p_shake': M.shakeMachine(2.0); break;
    case 'p_bomb': M.explode(center, 3.2, 6, { destroyBad: true, big: true }); break;
    case 'p_freeze': M.setFreeze(6); G.ui.toast('🧊 推板凍結 6 秒', 'good'); break;
    case 'p_magnet': M.setMagnetPull(3); G.ui.toast('🧲 全場硬幣被吸向得分區', 'good'); break;
    case 'p_clean': {
      const bads = M.getCoins().filter(c => c.def.kind === 'bad');
      if (!bads.length) { G.ui.toast('場上沒有負面幣', 'warn'); return; }
      const b = bads[0];
      M.sparkleAt(b.body.position, 0xb8e0a0);
      M.removeCoin(b);
      G.ui.toast(`🧹 已清除 ${b.def.name}`, 'good');
      break;
    }
    case 'p_copy': {
      const specials = M.getCoins().filter(c => c.def.kind === 'special');
      if (!specials.length) { G.ui.toast('場上沒有特殊幣可複製', 'warn'); return; }
      const s = specials[Math.floor(Math.random() * specials.length)];
      const sp = s.body.position;
      M.spawnCoin(s.def.id, { x: sp.x, y: sp.y + 1.5, z: sp.z, gen: s.state.gen });
      M.sparkleAt(sp, 0x9fd8ff);
      G.ui.toast(`🖨️ 複製了 ${s.def.name}`, 'good');
      break;
    }
  }
  p.uses--;
  if (p.uses <= 0) run.prizes.splice(i, 1);
  G.ui.refreshPrizes();
}

// ---------- 商店 ----------
function pickWeighted(pool) {
  // 依稀有度權重抽一個硬幣 id
  const items = pool.map(id => ({ id, w: RARITY_WEIGHT[COIN_DEFS[id].rarity] || 10 }));
  let total = items.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const it of items) { r -= it.w; if (r <= 0) return it.id; }
  return items[items.length - 1].id;
}

function priceOf(base) {
  let p = base * run.diff.shopMult * (1 + (run.round - 1) * 0.06);
  if (run.chips.includes('chip_shop')) p *= 0.8;
  return Math.ceil(p);
}

function genShop() {
  const coinIds = [];
  while (coinIds.length < 3) {
    const id = pickWeighted(SHOP_COIN_POOL);
    if (!coinIds.includes(id) || coinIds.length > 6) coinIds.push(id);
  }
  const chipPool = Object.keys(CHIP_DEFS).filter(id => !run.chips.includes(id));
  const chipIds = chipPool.sort(() => Math.random() - 0.5).slice(0, 2);
  const prizePool = Object.keys(PRIZE_DEFS);
  const prizeIds = prizePool.sort(() => Math.random() - 0.5).slice(0, 2);
  const services = [];
  if (run.clipCap < 8) services.push({ type: 'service', id: 'expand', name: '擴充硬幣夾', icon: '📦', price: priceOf(40), desc: `硬幣夾容量 ${run.clipCap} → ${run.clipCap + 1}` });
  run.shop = {
    coins: coinIds.map(id => ({ type: 'coin', id, price: priceOf(COIN_DEFS[id].price), sold: false })),
    chips: chipIds.map(id => ({ type: 'chip', id, price: priceOf(CHIP_DEFS[id].price), sold: false })),
    prizes: prizeIds.map(id => ({ type: 'prize', id, price: priceOf(PRIZE_DEFS[id].price), sold: false })),
    services: services.map(s => ({ ...s, sold: false })),
  };
}

function openShop() {
  run.state = 'shop';
  run.rerolls = 0;
  genShop();
  G.ui.showShop();
}

function rerollShop() {
  const cost = 10 + run.rerolls * 5;
  if (run.tickets < cost) { G.ui.toast('票券不足！', 'warn'); Sound.error(); return; }
  run.tickets -= cost;
  run.rerolls++;
  genShop();
  Sound.buy();
  G.ui.showShop();
}

function buyShopItem(item) {
  if (item.sold) return;
  if (run.tickets < item.price) { G.ui.toast('票券不足！', 'warn'); Sound.error(); return; }
  if (item.type === 'coin') {
    if (!addToClip(item.id)) { G.ui.toast('硬幣夾已滿！買「擴充硬幣夾」增加容量', 'warn'); Sound.error(); return; }
  } else if (item.type === 'chip') {
    if (run.chips.length >= 8) { G.ui.toast('晶片槽已滿（最多 8 片）', 'warn'); Sound.error(); return; }
    run.chips.push(item.id);
  } else if (item.type === 'prize') {
    if (!addPrize(item.id)) return;
  } else if (item.type === 'service' && item.id === 'expand') {
    run.clipCap++;
  }
  run.tickets -= item.price;
  item.sold = true;
  Sound.buy();
  G.ui.showShop();
  G.ui.refreshAll();
}
