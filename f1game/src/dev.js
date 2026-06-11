// DEV 微調工具（D 鍵開關）：即時調參數、拖曳 HUD、狀態切換、匯出 JSON
import { PARAMS } from './params.js';

const SLIDERS = [
  ['物理', [
    ['physics.topSpeed', '極速 m/s', 60, 120, 1],
    ['physics.accel', '加速度', 8, 30, 0.5],
    ['physics.brakeDecel', '煞車力', 20, 60, 1],
    ['physics.steerLock', '轉向角', 0.15, 0.5, 0.01],
    ['physics.steerFalloff', '高速轉向衰減', 0.005, 0.06, 0.001],
    ['physics.gripLatA', '側向抓地', 15, 50, 1],
    ['physics.downforce', '下壓力', 0, 0.01, 0.0002],
    ['physics.gripRecover', '滑移恢復', 2, 15, 0.5],
    ['physics.grassGrip', '草地抓地', 0.1, 0.8, 0.02],
    ['physics.steerAssist', '轉向輔助', 0, 1, 0.05],
  ]],
  ['攝影機', [
    ['camera.dist', '距離', 6, 22, 0.5],
    ['camera.height', '高度', 1.5, 10, 0.1],
    ['camera.lookAhead', '前瞻', 0, 25, 0.5],
    ['camera.lag', '跟隨平滑', 1, 12, 0.5],
    ['camera.fovBase', 'FOV', 45, 85, 1],
    ['camera.fovSpeed', '速度 FOV 增量', 0, 30, 1],
  ]],
  ['AI 難度', [
    ['ai.speedScale', 'AI 速度倍率', 0.85, 1.08, 0.005],
    ['ai.gripLatA', 'AI 過彎極限', 18, 40, 0.5],
    ['ai.brake', 'AI 煞車力', 24, 50, 1],
  ]],
  ['比賽', [
    ['race.laps', '圈數', 1, 10, 1],
    ['race.aiCount', 'AI 數量（重啟生效）', 0, 7, 1],
  ]],
];

const get = (path) => path.split('.').reduce((o, k) => o[k], PARAMS);
const set = (path, v) => {
  const ks = path.split('.');
  ks.slice(0, -1).reduce((o, k) => o[k], PARAMS)[ks.at(-1)] = v;
};

export function initDevTool(game) {
  const panel = document.getElementById('dev');
  const body = document.getElementById('dev-body');
  let dragMode = false;

  for (const [title, items] of SLIDERS) {
    const h = document.createElement('h3'); h.textContent = title; body.appendChild(h);
    for (const [path, label, min, max, step] of items) {
      const div = document.createElement('div'); div.className = 'ctl';
      const lab = document.createElement('label');
      const b = document.createElement('b'); b.textContent = get(path);
      lab.append(label, b);
      const inp = document.createElement('input');
      inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = get(path);
      inp.oninput = () => { set(path, +inp.value); b.textContent = +inp.value; };
      div.append(lab, inp); body.appendChild(div);
    }
  }

  // 狀態切換
  const h = document.createElement('h3'); h.textContent = '狀態切換'; body.appendChild(h);
  const btns = document.createElement('div'); btns.className = 'btns';
  const mkBtn = (txt, fn) => { const b = document.createElement('button'); b.textContent = txt; b.onclick = fn; btns.appendChild(b); };
  mkBtn('🔄 重新起跑', () => game.restart());
  mkBtn('🏁 預覽結算', () => game.previewResults());
  mkBtn('🚥 預覽起跑燈', () => game.hud.setLights(3));
  mkBtn('↔️ HUD 拖曳', () => {
    dragMode = !dragMode;
    document.body.classList.toggle('dev-drag', dragMode);
  });
  body.appendChild(btns);

  // HUD 拖曳
  let dragEl = null, dx = 0, dy = 0;
  document.addEventListener('pointerdown', e => {
    if (!dragMode) return;
    const p = e.target.closest('.hud-panel');
    if (!p || panel.contains(p)) return;
    dragEl = p;
    const r = p.getBoundingClientRect();
    dx = e.clientX - r.left; dy = e.clientY - r.top;
    e.preventDefault();
  });
  document.addEventListener('pointermove', e => {
    if (!dragEl) return;
    dragEl.style.left = (e.clientX - dx) + 'px';
    dragEl.style.top = (e.clientY - dy) + 'px';
    dragEl.style.right = 'auto'; dragEl.style.bottom = 'auto';
    PARAMS.hud[dragEl.id] = { left: dragEl.style.left, top: dragEl.style.top };
  });
  document.addEventListener('pointerup', () => { dragEl = null; });

  // 匯出
  const h2 = document.createElement('h3'); h2.textContent = '匯出'; body.appendChild(h2);
  const ta = document.createElement('textarea'); ta.readOnly = true;
  const btns2 = document.createElement('div'); btns2.className = 'btns';
  const b2 = document.createElement('button'); b2.textContent = '💾 匯出目前參數 JSON';
  b2.onclick = () => {
    ta.value = JSON.stringify(PARAMS, null, 2);
    console.log('PARAMS 匯出：', JSON.stringify(PARAMS, null, 2));
    navigator.clipboard?.writeText(ta.value);
  };
  btns2.appendChild(b2);
  body.append(btns2, ta);
  const note = document.createElement('div'); note.className = 'note';
  note.textContent = '調好後按匯出（已自動複製到剪貼簿），把 JSON 貼給 Claude 即可鎖定進 source code。';
  body.appendChild(note);

  // 開關
  const toggle = () => { panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex'; };
  document.getElementById('dev-close').onclick = toggle;
  return { toggle };
}
