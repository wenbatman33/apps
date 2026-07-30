// ============ DEV 開發者微調工具（D 鍵或右下角 ⚙ 開啟）============
import { LAYOUT, COIN_DEFS } from './data.js';
import * as M from './machine.js';

let G = null;
let panel, open = false;
let camMode = 'cameraPC';
let dragMode = false;

const STORE_KEY = 'raccoin_layout_v1';

export function initDev(Gref) {
  G = Gref;
  panel = document.getElementById('dev-panel');
  loadOverrides();
  document.getElementById('dev-btn').addEventListener('click', toggle);
  applyHudOffsets();
}

export function toggle() {
  open = !open;
  panel.classList.toggle('hidden', !open);
  if (open) build();
  else setDragMode(false);
}

// ---------- 儲存 / 載入 ----------
function loadOverrides() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    deepMerge(LAYOUT, data);
  } catch (e) {}
}

function saveOverrides() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(LAYOUT)); } catch (e) {}
}

function deepMerge(dst, src) {
  for (const k in src) {
    if (src[k] && typeof src[k] === 'object' && dst[k]) deepMerge(dst[k], src[k]);
    else if (k in dst) dst[k] = src[k];
  }
}

// ---------- 面板建構 ----------
function h(tag, attrs = {}, html = '') {
  const el = document.createElement(tag);
  Object.assign(el, attrs);
  if (html) el.innerHTML = html;
  return el;
}

function sliderRow(parent, label, obj, key, min, max, step, onChange) {
  const row = h('div', { className: 'dev-row' });
  row.appendChild(h('label', {}, label));
  const input = h('input');
  input.type = 'range'; input.min = min; input.max = max; input.step = step;
  input.value = obj[key];
  const val = h('span', { className: 'val' }, String(obj[key]));
  input.addEventListener('input', () => {
    obj[key] = Number(input.value);
    val.textContent = input.value;
    saveOverrides();
    onChange && onChange();
  });
  row.appendChild(input); row.appendChild(val);
  parent.appendChild(row);
}

function build() {
  panel.innerHTML = '';
  panel.appendChild(h('h3', {}, '🛠 DEV 微調工具 <span style="color:#666;font-size:10px">（D 鍵開關）</span>'));

  // ---- 相機 ----
  panel.appendChild(h('h3', {}, '📷 相機'));
  const sel = h('select');
  sel.appendChild(h('option', { value: 'cameraPC' }, 'PC / 橫版'));
  sel.appendChild(h('option', { value: 'cameraMobile' }, '手機直屏'));
  sel.value = camMode;
  sel.addEventListener('change', () => { camMode = sel.value; build(); });
  panel.appendChild(sel);
  const camWrap = h('div');
  panel.appendChild(camWrap);
  const cam = LAYOUT[camMode];
  const rc = () => M.applyCamera();
  sliderRow(camWrap, '高度 y', cam, 'y', 3, 20, 0.1, rc);
  sliderRow(camWrap, '距離 z', cam, 'z', 4, 22, 0.1, rc);
  sliderRow(camWrap, '視角 fov', cam, 'fov', 25, 80, 1, rc);
  sliderRow(camWrap, '注視 lookY', cam, 'lookY', -3, 4, 0.1, rc);
  sliderRow(camWrap, '注視 lookZ', cam, 'lookZ', -5, 4, 0.1, rc);

  // ---- 機台 ----
  panel.appendChild(h('h3', {}, '🎰 機台（改尺寸需按重建）'));
  const mc = LAYOUT.machine;
  sliderRow(panel, '推板週期(s)', mc, 'pusherPeriod', 2, 9, 0.1);
  sliderRow(panel, '推板行程', mc, 'pusherRange', 0.8, 3.5, 0.05);
  sliderRow(panel, '推板最小z', mc, 'pusherMinZ', -5, -2.5, 0.05);
  sliderRow(panel, '投幣落點z', mc, 'dropZ', -4, 0, 0.05);
  sliderRow(panel, '投幣高度y', mc, 'dropY', 3, 8, 0.1);
  sliderRow(panel, '瞄準極限x', mc, 'aimMaxX', 1.5, 3.5, 0.05);
  sliderRow(panel, '凹口半徑', mc, 'notchR', 0.7, 1.8, 0.05);
  sliderRow(panel, '前緣開口寬', mc, 'fieldFrontW', 7, 12, 0.1);
  sliderRow(panel, '出塔間隔min', mc, 'towerEveryMin', 5, 60, 1);
  sliderRow(panel, '出塔間隔max', mc, 'towerEveryMax', 10, 90, 1);
  sliderRow(panel, '塔硬幣min', mc, 'towerSizeMin', 5, 30, 1);
  sliderRow(panel, '塔硬幣max', mc, 'towerSizeMax', 8, 40, 1);
  sliderRow(panel, '機台寬', mc, 'floorW', 5, 10, 0.1);
  sliderRow(panel, '前緣z', mc, 'floorFrontZ', 2, 5, 0.1);
  const btns0 = h('div', { className: 'dev-btns' });
  const rebuild = h('button', {}, '🔧 重建機台');
  rebuild.addEventListener('click', () => M.buildMachine());
  btns0.appendChild(rebuild);
  panel.appendChild(btns0);

  // ---- 物理 ----
  panel.appendChild(h('h3', {}, '⚙️ 物理'));
  const pc = LAYOUT.physics;
  const rp = () => M.applyPhysicsParams();
  sliderRow(panel, '重力', pc, 'gravity', -40, -8, 0.5, rp);
  sliderRow(panel, '幣間摩擦', pc, 'friction', 0, 1, 0.02, rp);
  sliderRow(panel, '地板摩擦', pc, 'floorFriction', 0, 1, 0.02, rp);
  sliderRow(panel, '彈性', pc, 'restitution', 0, 0.6, 0.02, rp);
  sliderRow(panel, '阻尼', pc, 'linearDamping', 0, 0.6, 0.02);
  sliderRow(panel, '硬幣半徑', pc, 'coinRadius', 0.3, 0.7, 0.01);
  sliderRow(panel, '硬幣上限', pc, 'maxCoins', 60, 260, 5);

  // ---- 遊戲 ----
  panel.appendChild(h('h3', {}, '🎮 遊戲數值'));
  const gc = LAYOUT.game;
  sliderRow(panel, 'Combo秒數', gc, 'comboWindow', 1, 6, 0.1);
  sliderRow(panel, '投幣冷卻', gc, 'insertCooldown', 0.05, 1, 0.01);
  sliderRow(panel, '轉換率', gc, 'convRate', 0.02, 0.4, 0.01, () => G.ui.refreshScore());
  sliderRow(panel, '兌換給幣數', gc, 'exchangeYield', 10, 40, 1, () => G.ui.refreshResources());
  sliderRow(panel, '回充間隔秒', gc, 'regenSec', 0.5, 8, 0.1);
  sliderRow(panel, '回充上限', gc, 'regenCap', 20, 120, 5);
  sliderRow(panel, '輪盤門檻1', gc, 'wheelTh1', 3, 30, 1);
  sliderRow(panel, '輪盤門檻2', gc, 'wheelTh2', 10, 60, 1);
  sliderRow(panel, '輪盤門檻3', gc, 'wheelTh3', 20, 100, 1);

  // ---- 狀態觸發 ----
  panel.appendChild(h('h3', {}, '🧪 狀態觸發'));
  const btns = h('div', { className: 'dev-btns' });
  const addBtn = (label, fn) => { const b = h('button', {}, label); b.addEventListener('click', fn); btns.appendChild(b); };
  addBtn('+1000 分', () => { G.game.run.score += 1000; G.game.run.reached = G.game.run.score >= G.game.run.target; G.ui.refreshAll(); });
  addBtn('+100 🎟️', () => { G.game.run.tickets += 100; G.ui.refreshResources(); });
  addBtn('+20 硬幣', () => { G.game.run.hand += 20; G.ui.refreshResources(); });
  addBtn('強制輪盤LV3', () => { G.game.run.wheelEnergy = LAYOUT.game.wheelTh3; G.game.run.combo = 1; G.game.run.comboTimer = 0.01; });
  addBtn('搖晃', () => M.shakeMachine(2));
  addBtn('中央爆炸', () => M.explode({ x: 0, y: 0.6, z: 0 }, 3, 6, { destroyBad: true, big: true }));
  addBtn('生成錢幣塔', () => M.dispenseTower());
  addBtn('搖倒錢幣塔', () => M.crashTowers());
  panel.appendChild(btns);

  // 生成任意硬幣
  const spawnRow = h('div', { className: 'dev-btns' });
  const coinSel = h('select');
  for (const id in COIN_DEFS) coinSel.appendChild(h('option', { value: id }, `${COIN_DEFS[id].icon} ${COIN_DEFS[id].name}`));
  spawnRow.appendChild(coinSel);
  const spawnBtn = h('button', {}, '生成');
  spawnBtn.addEventListener('click', () => M.spawnCoin(coinSel.value, { x: (Math.random() - 0.5) * 3 }));
  spawnRow.appendChild(spawnBtn);
  panel.appendChild(spawnRow);

  // 跳回合
  const jumpRow = h('div', { className: 'dev-btns' });
  const roundSel = h('select');
  for (let i = 1; i <= 15; i++) roundSel.appendChild(h('option', { value: i }, `Round ${i}`));
  jumpRow.appendChild(roundSel);
  const jumpBtn = h('button', {}, '跳到回合');
  jumpBtn.addEventListener('click', () => {
    G.game.run.round = Number(roundSel.value);
    G.game.run.state = 'play';
    document.getElementById('shop-modal').classList.add('hidden');
    G.game.startRound();
  });
  jumpRow.appendChild(jumpBtn);
  panel.appendChild(jumpRow);

  // ---- HUD 拖曳 ----
  panel.appendChild(h('h3', {}, '🖱 HUD 拖曳'));
  const dragBtns = h('div', { className: 'dev-btns' });
  const dragBtn = h('button', {}, dragMode ? '🔒 關閉拖曳' : '✋ 啟用 HUD 拖曳');
  dragBtn.addEventListener('click', () => { setDragMode(!dragMode); dragBtn.textContent = dragMode ? '🔒 關閉拖曳' : '✋ 啟用 HUD 拖曳'; });
  dragBtns.appendChild(dragBtn);
  const resetHud = h('button', {}, '↺ 重置 HUD 位置');
  resetHud.addEventListener('click', () => {
    for (const k in LAYOUT.hud) LAYOUT.hud[k] = { x: 0, y: 0 };
    saveOverrides(); applyHudOffsets();
  });
  dragBtns.appendChild(resetHud);
  const resetAll = h('button', {}, '⚠️ 全部重置');
  resetAll.addEventListener('click', () => { localStorage.removeItem(STORE_KEY); location.reload(); });
  dragBtns.appendChild(resetAll);
  panel.appendChild(dragBtns);

  // ---- 匯出 ----
  const exp = h('button', { id: 'dev-export' }, '💾 匯出 LAYOUT JSON');
  exp.addEventListener('click', () => {
    const json = JSON.stringify(LAYOUT, null, 2);
    ta.value = json;
    ta.classList.remove('hidden');
    navigator.clipboard?.writeText(json);
    console.log('[RACCOIN LAYOUT]', json);
  });
  panel.appendChild(exp);
  const ta = h('textarea', { id: 'dev-json', className: 'hidden', readOnly: true });
  panel.appendChild(ta);
}

// ---------- HUD 拖曳 ----------
function applyHudOffsets() {
  document.querySelectorAll('[data-dev-drag]').forEach(el => {
    const key = el.dataset.devDrag;
    const o = LAYOUT.hud[key] || { x: 0, y: 0 };
    // 用 translate 屬性（與 transform 疊加），不干擾原本置中的 transform
    el.style.translate = `${o.x}px ${o.y}px`;
  });
}

function setDragMode(v) {
  dragMode = v;
  document.querySelectorAll('[data-dev-drag]').forEach(el => {
    el.classList.toggle('dragging', v);
    if (v) el.addEventListener('pointerdown', onDragStart);
    else el.removeEventListener('pointerdown', onDragStart);
  });
}

function onDragStart(e) {
  const el = e.currentTarget;
  const key = el.dataset.devDrag;
  const o = LAYOUT.hud[key];
  const sx = e.clientX - o.x, sy = e.clientY - o.y;
  e.preventDefault(); e.stopPropagation();
  const move = (ev) => {
    o.x = ev.clientX - sx; o.y = ev.clientY - sy;
    applyHudOffsets();
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    saveOverrides();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

export function isDevDragging() { return dragMode; }
