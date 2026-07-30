// ============ DOM UI 層 ============
import { COIN_DEFS, CHIP_DEFS, PRIZE_DEFS, RARITY, WHEEL_REWARDS, LAYOUT } from './data.js';
import * as M from './machine.js';
import { Sound } from './sound.js';

let G = null;
const $ = id => document.getElementById(id);
let els = {};

export function initUI(Gref) {
  G = Gref;
  els = {
    hudTop: $('hud-top'), hudLeft: $('hud-left'), hudRight: $('hud-right'), hudBottom: $('hud-bottom'),
    roundLabel: $('round-label'), scoreCur: $('score-cur'), scoreTarget: $('score-target'),
    scoreFill: $('score-bar-fill'), rateLabel: $('rate-label'), convLabel: $('conv-label'),
    comboCount: $('combo-count'), wheelFill: $('wheel-energy-fill'),
    hand: $('hand-coins'), clip: $('clip'), tickets: $('tickets-label'),
    exchangeBtn: $('exchange-btn'), exchangeCost: $('exchange-cost'),
    shopBtn: $('shop-btn'), speedBtn: $('speed-btn'),
    chipsList: $('chips-list'), prizesList: $('prizes-list'), shakeBtn: $('shake-btn'),
    popupLayer: $('popup-layer'), toastArea: $('toast-area'), tooltip: $('tooltip'),
    banner: $('round-banner'), pauseBtn: $('pause-btn'),
  };

  G.ui = {
    refreshAll, refreshScore, refreshResources, refreshClip, refreshChips, refreshPrizes,
    showBanner, toast, popupWorld, showShop, showWin, showFail, showPause, spinWheel, showHUD,
  };

  bindButtons();
}

function bindButtons() {
  const r = G.game.run;
  // 開始畫面
  let diffIdx = 0;
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      diffIdx = Number(btn.dataset.diff);
    });
  });
  $('start-btn').addEventListener('click', () => {
    Sound.unlock();
    $('start-screen').classList.add('hidden');
    showHUD(true);
    G.game.startRun(diffIdx);
  });

  els.exchangeBtn.addEventListener('click', () => G.game.exchange());
  els.shopBtn.addEventListener('click', () => G.game.endRoundToShop());
  els.shakeBtn.addEventListener('click', () => G.game.shakeMachine());
  els.speedBtn.addEventListener('click', () => {
    r.timeScale = r.timeScale === 1 ? 2 : 1;
    els.speedBtn.classList.toggle('on', r.timeScale === 2);
  });
  els.pauseBtn.addEventListener('click', () => G.game.pause());
  $('resume-btn').addEventListener('click', () => G.game.resume());
  $('giveup-btn').addEventListener('click', () => { showPause(false); G.game.giveUp(); });
  $('fail-restart').addEventListener('click', () => location.reload());
  $('win-restart').addEventListener('click', () => location.reload());
  $('endless-btn').addEventListener('click', () => {
    $('win-modal').classList.add('hidden');
    G.game.enterEndless();
  });
  $('shop-reroll').addEventListener('click', () => G.game.rerollShop());
  $('shop-leave').addEventListener('click', () => {
    $('shop-modal').classList.add('hidden');
    G.game.nextRound();
  });
}

export function showHUD(v) {
  for (const e of [els.hudTop, els.hudLeft, els.hudRight, els.hudBottom, els.pauseBtn])
    e.classList.toggle('hidden', !v);
}

// ---------- 更新 ----------
function refreshAll() { refreshScore(); refreshResources(); refreshClip(); refreshChips(); refreshPrizes(); }

function refreshScore() {
  const r = G.game.run;
  els.roundLabel.textContent = r.endless ? `Round ${r.round} ♾` : `Round ${r.round} / 15`;
  els.scoreCur.textContent = r.score;
  els.scoreTarget.textContent = `/ ${r.target}`;
  els.scoreFill.style.width = Math.min(100, r.score / r.target * 100) + '%';
  els.rateLabel.textContent = '×' + G.game.effRate().toFixed(2).replace(/0$/, '');
  els.convLabel.textContent = '×' + LAYOUT.game.convRate;
  els.comboCount.textContent = r.combo > 0 ? r.combo : '-';
  els.comboCount.classList.toggle('hot', r.combo >= 10);
  els.wheelFill.style.width = Math.min(100, r.wheelEnergy / LAYOUT.game.wheelTh3 * 100) + '%';
}

function refreshResources() {
  const r = G.game.run;
  els.hand.textContent = r.hand;
  els.tickets.textContent = r.tickets;
  const cost = G.game.exchangeCost();
  els.exchangeCost.textContent = `🎟️${cost} → +${LAYOUT.game.exchangeYield}枚`;
  els.exchangeBtn.disabled = r.tickets < cost;
  els.shopBtn.classList.toggle('hidden', !r.reached || r.state !== 'play');
  refreshScore();
}

function refreshClip() {
  const r = G.game.run;
  els.clip.innerHTML = '';
  for (let i = 0; i < r.clipCap; i++) {
    const slot = r.clip[i];
    const div = document.createElement('div');
    div.className = 'clip-slot' + (slot ? '' : ' empty') + (r.selectedClip === i ? ' selected' : '');
    if (slot) {
      const def = COIN_DEFS[slot.defId];
      div.innerHTML = `<span class="key">${i + 1}</span><span class="cnt">×${slot.count}</span>
        <div class="ic">${def.icon}</div><div class="nm">${def.name}</div>`;
      div.addEventListener('click', () => G.game.selectClip(i));
      attachTooltip(div, def.name, RARITY[def.rarity], def.desc + `<br>價值 ${def.value}`);
    } else {
      div.innerHTML = `<span class="key">${i + 1}</span><div class="ic" style="opacity:.3">·</div>`;
    }
    els.clip.appendChild(div);
  }
}

function refreshChips() {
  const r = G.game.run;
  els.chipsList.innerHTML = '';
  if (!r.chips.length) {
    els.chipsList.innerHTML = '<span style="font-size:9.5px;color:#666f80">尚無晶片</span>';
    return;
  }
  for (const id of r.chips) {
    const def = CHIP_DEFS[id];
    const div = document.createElement('div');
    div.className = 'chip-icon';
    div.textContent = def.icon;
    attachTooltip(div, def.name, RARITY[def.rarity], def.desc);
    els.chipsList.appendChild(div);
  }
}

const PRIZE_KEYS = ['Q', 'W', 'E', 'R'];
function refreshPrizes() {
  const r = G.game.run;
  els.prizesList.innerHTML = '';
  r.prizes.forEach((p, i) => {
    const def = PRIZE_DEFS[p.id];
    const btn = document.createElement('button');
    btn.className = 'prize-btn';
    btn.innerHTML = `<span class="ic">${def.icon}</span><span class="n">${PRIZE_KEYS[i] || ''}·×${p.uses}</span>`;
    btn.addEventListener('click', () => G.game.usePrize(i));
    attachTooltip(btn, def.name, null, def.desc);
    els.prizesList.appendChild(btn);
  });
  els.shakeBtn.disabled = r.shakeCd > 0;
  els.shakeBtn.innerHTML = r.shakeCd > 0 ? `搖晃<br>${Math.ceil(r.shakeCd)}s` : '搖晃<br>機台';
}

// ---------- 提示 ----------
function attachTooltip(el, name, rarity, desc) {
  const show = (e) => {
    els.tooltip.innerHTML = `<div class="tt-name">${name}</div>` +
      (rarity ? `<div class="tt-rar" style="color:${rarity.color}">${rarity.name}</div>` : '') +
      `<div class="tt-desc">${desc}</div>`;
    els.tooltip.classList.remove('hidden');
    const rect = el.getBoundingClientRect();
    const tw = 230;
    let x = Math.min(window.innerWidth - tw - 8, Math.max(8, rect.left));
    let y = rect.top - els.tooltip.offsetHeight - 8;
    if (y < 8) y = rect.bottom + 8;
    els.tooltip.style.left = x + 'px';
    els.tooltip.style.top = y + 'px';
  };
  el.addEventListener('pointerenter', show);
  el.addEventListener('pointerleave', () => els.tooltip.classList.add('hidden'));
  el.addEventListener('pointerdown', show);
}

let popupCount = 0;
function popupWorld(pos, text, cls = '') {
  if (popupCount > 36) return;
  const p = M.project(pos);
  const div = document.createElement('div');
  div.className = 'score-pop ' + cls;
  div.style.left = (p.x + (Math.random() - 0.5) * 30) + 'px';
  div.style.top = p.y + 'px';
  div.style.fontSize = (cls === 'huge' ? 30 : cls === 'big' ? 23 : 17) + 'px';
  div.textContent = text;
  els.popupLayer.appendChild(div);
  popupCount++;
  setTimeout(() => { div.remove(); popupCount--; }, 1000);
}

function toast(msg, cls = '') {
  const div = document.createElement('div');
  div.className = 'toast ' + cls;
  div.textContent = msg;
  els.toastArea.appendChild(div);
  while (els.toastArea.children.length > 4) els.toastArea.firstChild.remove();
  setTimeout(() => div.remove(), 2600);
}

function showBanner(main, sub) {
  els.banner.innerHTML = `<div class="rb-main">${main}</div><div class="rb-sub">${sub}</div>`;
  els.banner.classList.remove('hidden');
  setTimeout(() => els.banner.classList.add('hidden'), 2100);
}

// ---------- 彈窗 ----------
function showPause(v) { $('pause-modal').classList.toggle('hidden', !v); }

function showFail(html) {
  $('fail-info').innerHTML = html;
  $('fail-modal').classList.remove('hidden');
}

function showWin() {
  const r = G.game.run;
  $('win-info').innerHTML = `完成全部 15 回合！<br>總得分硬幣 ${r.stats.coinsScored} 枚・最高連擊 ${r.stats.bestCombo}<br>可挑戰無盡模式：目標每回合 ×1.8`;
  $('win-modal').classList.remove('hidden');
}

// ---------- 商店 ----------
function shopCard(item) {
  let def, name, icon, desc, rar = null;
  if (item.type === 'coin') { def = COIN_DEFS[item.id]; name = def.name; icon = def.icon; desc = def.desc; rar = RARITY[def.rarity]; }
  else if (item.type === 'chip') { def = CHIP_DEFS[item.id]; name = def.name; icon = def.icon; desc = def.desc; rar = RARITY[def.rarity]; }
  else if (item.type === 'prize') { def = PRIZE_DEFS[item.id]; name = def.name; icon = def.icon; desc = def.desc + `（${def.uses} 次）`; }
  else { name = item.name; icon = item.icon; desc = item.desc; }
  const div = document.createElement('div');
  div.className = 'shop-item' + (item.sold ? ' sold' : '');
  div.innerHTML = `<div class="ic">${icon}</div><div class="nm">${name}</div>` +
    (rar ? `<div class="rar" style="color:${rar.color}">${rar.name}</div>` : '<div class="rar"> </div>') +
    `<div class="ds">${desc}</div>`;
  const buy = document.createElement('button');
  buy.className = 'buy';
  buy.textContent = `🎟️ ${item.price}`;
  buy.disabled = item.sold || G.game.run.tickets < item.price;
  buy.addEventListener('click', () => G.game.buyShopItem(item));
  div.appendChild(buy);
  return div;
}

function showShop() {
  const r = G.game.run;
  const s = r.shop;
  $('shop-round-info').textContent = r.endless ? `無盡模式・下一回合 Round ${r.round + 1}` : `下一回合 Round ${r.round + 1} / 15・目標將提高`;
  $('shop-tickets').textContent = `🎟️ ${r.tickets}`;
  const fill = (id, items) => {
    const el = $(id);
    el.innerHTML = '';
    if (!items.length) el.innerHTML = '<span style="font-size:11px;color:#666f80">（無）</span>';
    for (const it of items) el.appendChild(shopCard(it));
  };
  fill('shop-coins', s.coins);
  fill('shop-chips', s.chips);
  fill('shop-prizes', s.prizes);
  fill('shop-services', s.services);
  const rc = 10 + r.rerolls * 5;
  $('shop-reroll').textContent = `🔄 重抽 (🎟️${rc})`;
  $('shop-reroll').disabled = r.tickets < rc;
  $('shop-modal').classList.remove('hidden');
  refreshAll();
}

// ---------- 幸運輪盤 ----------
function pickWheelReward(lv) {
  const pool = WHEEL_REWARDS.filter(w => w.minLv <= lv);
  const total = pool.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of pool) { r -= w.weight; if (r <= 0) return w; }
  return pool[0];
}

function spinWheel(lv, count, done) {
  const modal = $('wheel-modal');
  const cv = $('wheel-canvas');
  const ctx = cv.getContext('2d');
  $('wheel-level-label').textContent = `LV.${lv}・獎勵 ×${count}`;
  $('wheel-result').textContent = '';
  modal.classList.remove('hidden');
  const pool = WHEEL_REWARDS.filter(w => w.minLv <= lv);
  const seg = Math.PI * 2 / pool.length;
  const colors = ['#8f6bff', '#ff8de0', '#38c96f', '#ffb03a', '#3e7bfa', '#ff5a5a', '#2fbdb3', '#c94fae'];
  let angle = 0, spinning = false;

  function draw() {
    ctx.clearRect(0, 0, 300, 300);
    ctx.save();
    ctx.translate(150, 150);
    ctx.rotate(angle);
    pool.forEach((w, i) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 140, i * seg, (i + 1) * seg);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.stroke();
      ctx.save();
      ctx.rotate(i * seg + seg / 2);
      ctx.textAlign = 'center';
      ctx.font = '22px sans-serif';
      ctx.fillText(w.icon, 92, 8);
      ctx.restore();
    });
    ctx.restore();
    // 指針（尖端朝下，指向輪盤）
    ctx.fillStyle = '#ffe66d';
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, 36); ctx.lineTo(136, 6); ctx.lineTo(164, 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#241340';
    ctx.beginPath(); ctx.arc(150, 150, 26, 0, Math.PI * 2); ctx.fill();
    ctx.font = '26px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🎡', 150, 160);
  }
  draw();

  let spins = 0;
  const results = [];
  function spinOnce() {
    if (spins >= count) {
      setTimeout(() => {
        modal.classList.add('hidden');
        // 關閉彈窗後才發放獎勵，玩家才看得到硬幣雨等效果
        results.forEach(w => {
          toast(`🎡 ${w.icon} ${w.name}！`, 'good');
          G.game.applyWheelReward(w.id, lv);
        });
        done();
      }, 1000);
      return;
    }
    spins++;
    const reward = pickWheelReward(lv);
    results.push(reward);
    const idx = pool.indexOf(reward);
    // 指針在正上方（-90°），讓目標扇形中心對準指針
    const targetAngle = -Math.PI / 2 - (idx * seg + seg / 2);
    const from = angle % (Math.PI * 2);
    const to = targetAngle - Math.PI * 2 * (4 + Math.random());
    const dur = 2400;
    const t0 = performance.now();
    let lastTick = 0;
    spinning = true;
    function anim(now) {
      const t = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      angle = from + (to - from) * ease;
      if (now - lastTick > 90 && t < 0.9) { Sound.wheelTick(); lastTick = now; }
      draw();
      if (t < 1) requestAnimationFrame(anim);
      else {
        spinning = false;
        Sound.wheelWin();
        $('wheel-result').textContent = `${reward.icon} ${reward.name}！`;
        setTimeout(spinOnce, 800);
      }
    }
    requestAnimationFrame(anim);
  }
  setTimeout(spinOnce, 400);
}
