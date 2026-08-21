import { TUNING, WORLD, LAYOUT, LAYOUT_PC, LAYOUT_MOBILE, SKINS, setLayoutMode, commitLayout, layoutMode } from '../config.js';

// DEV 版面/手感微調工具：D 鍵或右下齒輪開啟。所有數值即時生效，可直接拖曳 HUD 元件，最後匯出 JSON
const SLIDERS = {
  玩法: [
    ['baseSpeed', TUNING, 80, 400, 1], ['boostSpeed', TUNING, 150, 800, 1],
    ['turnRate', TUNING, 1, 10, 0.05], ['turnRateFatPenalty', TUNING, 0, 0.9, 0.01],
    ['boostDrainPerSec', TUNING, 0, 30, 0.5], ['boostMinMass', TUNING, 5, 80, 1],
    ['startMass', TUNING, 5, 200, 1], ['massPerSegment', TUNING, 0.5, 10, 0.1],
    ['baseRadius', TUNING, 5, 30, 0.5], ['radiusGrowth', TUNING, 0.05, 1, 0.01],
    ['maxRadius', TUNING, 20, 90, 1], ['segSpacingRatio', TUNING, 0.2, 1.4, 0.02],
    ['foodMagnet', TUNING, 0, 120, 1], ['eatSpeed', TUNING, 200, 2000, 10],
    ['deathFoodRatio', TUNING, 0, 1.5, 0.02],
    ['cameraZoomBase', TUNING, 0.4, 2, 0.01], ['cameraZoomFalloff', TUNING, 0, 0.006, 0.0001],
    ['cameraZoomMin', TUNING, 0.2, 1.2, 0.01], ['cameraLerp', TUNING, 0.02, 1, 0.01],
    ['botAggression', TUNING, 0, 1, 0.05], ['botBoostChance', TUNING, 0, 1, 0.05],
    ['botReactTime', TUNING, 0.03, 0.6, 0.01],
  ],
  世界: [['radius', WORLD, 2000, 24000, 100], ['foodCount', WORLD, 200, 6000, 50], ['botCount', WORLD, 1, 60, 1],
        ['activeRadius', WORLD, 1200, 6000, 50], ['spawnMinDist', WORLD, 600, 4000, 50], ['despawnRadius', WORLD, 2000, 12000, 100], ['minimapRange', WORLD, 800, 8000, 100]],
  版面: [
    ['hudScale', LAYOUT, 0.5, 2, 0.02],
    ['scoreX', LAYOUT, -400, 400, 1], ['scoreY', LAYOUT, -400, 400, 1], ['scoreSize', LAYOUT, 10, 48, 1],
    ['boardX', LAYOUT, -400, 400, 1], ['boardY', LAYOUT, -400, 400, 1], ['boardSize', LAYOUT, 9, 32, 1],
    ['boardRows', LAYOUT, 3, 10, 1], ['boardAlpha', LAYOUT, 0.1, 1, 0.02],
    ['minimapX', LAYOUT, -400, 400, 1], ['minimapY', LAYOUT, -400, 400, 1],
    ['minimapSize', LAYOUT, 60, 320, 2], ['minimapAlpha', LAYOUT, 0.1, 1, 0.02],
    ['boostBtnX', LAYOUT, -400, 400, 1], ['boostBtnY', LAYOUT, -400, 400, 1], ['boostBtnR', LAYOUT, 0, 120, 1],
    ['joyR', LAYOUT, 40, 160, 1], ['nameSize', LAYOUT, 8, 36, 1],
  ],
};

export function createDevTools(game) {
  const el = document.createElement('div');
  el.id = 'devtools';
  el.innerHTML = '';
  Object.assign(el.style, {
    position: 'fixed', right: '0', top: '0', width: '312px', height: '100%', zIndex: '50',
    background: 'rgba(6,12,26,0.94)', color: '#dfe9ff', font: '12px/1.5 system-ui, sans-serif',
    overflowY: 'auto', padding: '10px 12px 60px', display: 'none',
    borderLeft: '1px solid #3f7dff', boxSizing: 'border-box', backdropFilter: 'blur(6px)',
  });
  document.body.appendChild(el);

  // 面板會遮住同側的 HUD 元件，提供換邊按鈕讓兩側元件都拖得到
  let side = 'right';
  const setSide = (v) => {
    side = v;
    el.style.left = v === 'left' ? '0' : '';
    el.style.right = v === 'right' ? '0' : '';
    el.style.borderLeft = v === 'right' ? '1px solid #3f7dff' : 'none';
    el.style.borderRight = v === 'left' ? '1px solid #3f7dff' : 'none';
    gear.style.left = v === 'left' ? '320px' : '';
    gear.style.right = v === 'left' ? '' : '8px';
  };

  const gear = document.createElement('button');
  gear.textContent = '⚙';
  Object.assign(gear.style, {
    position: 'fixed', right: '8px', top: '8px', zIndex: '49', width: '34px', height: '34px',
    borderRadius: '10px', border: '1px solid rgba(120,170,255,.4)', background: 'rgba(8,16,34,.5)',
    color: '#9fd0ff', fontSize: '17px', cursor: 'pointer',
  });
  document.body.appendChild(gear);

  const h = (tag, css, text) => { const n = document.createElement(tag); if (css) Object.assign(n.style, css); if (text != null) n.textContent = text; return n; };
  const rows = [];

  const addSlider = (label, obj, key, min, max, step) => {
    const wrap = h('div', { margin: '6px 0' });
    const lab = h('div', { display: 'flex', justifyContent: 'space-between', color: '#9fb6d6' });
    lab.append(h('span', null, label), h('span', { color: '#7fd4ff' }, String(obj[key])));
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = obj[key];
    Object.assign(inp.style, { width: '100%', accentColor: '#39d0ff' });
    inp.addEventListener('input', () => {
      obj[key] = parseFloat(inp.value);
      lab.lastChild.textContent = String(obj[key]);
      game.onTune?.(key);
    });
    wrap.append(lab, inp);
    el.appendChild(wrap);
    rows.push({ inp, obj, key, span: lab.lastChild });
  };

  const section = (title) => {
    const t = h('div', { margin: '14px 0 4px', color: '#ffd54f', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,.12)', paddingBottom: '3px' }, title);
    el.appendChild(t);
  };
  const button = (text, fn, color = '#39d0ff') => {
    const b = h('button', {
      margin: '4px 4px 0 0', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer',
      border: '1px solid rgba(120,170,255,.45)', background: 'rgba(20,40,80,.6)', color,
      font: '600 12px system-ui',
    }, text);
    b.onclick = fn; el.appendChild(b); return b;
  };

  // 標題與版面模式
  el.append(h('div', { color: '#fff', fontWeight: '800', fontSize: '14px' }, '🛠 DEV 微調工具'),
    h('div', { color: '#7f97bb', marginBottom: '6px' }, 'D 鍵開關｜可直接拖曳 HUD 元件'));
  button('⇄ 面板換邊', () => setSide(side === 'right' ? 'left' : 'right'));
  button('◻ 半透明', () => { el.style.opacity = el.style.opacity === '0.45' ? '1' : '0.45'; });

  section('版面模式（分別調整與匯出）');
  const modeRow = h('div');
  el.appendChild(modeRow);
  const mkMode = (m, label) => {
    const b = h('button', {
      margin: '2px 4px 6px 0', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer',
      border: '1px solid rgba(120,170,255,.45)', background: layoutMode === m ? '#2a6bff' : 'rgba(20,40,80,.6)', color: '#fff',
    }, label);
    b.onclick = () => {
      commitLayout(); setLayoutMode(m); game.onResize?.(); syncAll();
      [...modeRow.children].forEach((c) => { c.style.background = 'rgba(20,40,80,.6)'; });
      b.style.background = '#2a6bff';
    };
    modeRow.appendChild(b);
  };
  mkMode('pc', 'PC'); mkMode('mobile', 'Mobile');

  for (const [title, list] of Object.entries(SLIDERS)) {
    section(title);
    for (const [key, obj, min, max, step] of list) addSlider(key, obj, key, min, max, step);
  }

  section('玩家蛇顏色');
  [0, 1].forEach((i) => {
    const wrap = h('div', { display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' });
    const c = document.createElement('input');
    c.type = 'color';
    c.value = '#' + SKINS[0][i].toString(16).padStart(6, '0');
    c.oninput = () => { SKINS[0][i] = parseInt(c.value.slice(1), 16); };
    wrap.append(h('span', { color: '#9fb6d6' }, i === 0 ? '主色' : '副色'), c);
    el.appendChild(wrap);
  });

  section('狀態測試');
  button('＋100 分數', () => { if (game.world.player) game.world.player.mass += 100; });
  button('召喚 5 隻 AI', () => { for (let i = 0; i < 5; i++) game.world.spawnBot(); });
  button('觸發死亡結算', () => { if (game.world.player) game.world.kill(game.world.player, null); }, '#ff8a8a');
  button('重開一局', () => game.restart?.());

  section('匯出');
  const out = document.createElement('textarea');
  Object.assign(out.style, { width: '100%', height: '150px', marginTop: '6px', background: '#04091a', color: '#7fd4ff', border: '1px solid #2a4b8a', borderRadius: '8px', fontSize: '11px', padding: '6px' });
  button('💾 匯出目前數值', () => {
    commitLayout();
    const j = {
      TUNING: { ...TUNING },
      WORLD: { ...WORLD },
      LAYOUT_PC: { ...LAYOUT_PC }, LAYOUT_MOBILE: { ...LAYOUT_MOBILE },
      PLAYER_SKIN: SKINS[0].map((c) => '0x' + c.toString(16).padStart(6, '0')),
    };
    out.value = JSON.stringify(j, null, 2);
    navigator.clipboard?.writeText(out.value);
    console.log('[DEV] 匯出設定\n' + out.value);
  }, '#7dff9a');
  el.appendChild(out);

  function syncAll() {
    for (const r of rows) { r.inp.value = r.obj[r.key]; r.span.textContent = String(r.obj[r.key]); }
  }

  let open = false;
  const toggle = (v) => {
    open = v ?? !open;
    el.style.display = open ? 'block' : 'none';
    game.devOpen = open;
    if (open) syncAll();
  };
  gear.onclick = () => toggle();
  setSide('right');
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyD' && document.activeElement?.tagName !== 'INPUT' && !e.metaKey && !e.ctrlKey) toggle();
  });

  // 直接拖曳 HUD 元件調位置（滑桿的替代操作）
  let drag = null;
  const canvas = game.app.canvas;
  canvas.addEventListener('pointerdown', (e) => {
    if (!open) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const hit = game.hud.hitTest(x, y);
    if (hit) {
      drag = { hit, sx: x, sy: y, ox: LAYOUT[hit.kx], oy: LAYOUT[hit.ky] };
      e.stopPropagation();
    }
  }, true);
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    LAYOUT[drag.hit.kx] = Math.round(drag.ox + (e.clientX - r.left - drag.sx));
    LAYOUT[drag.hit.ky] = Math.round(drag.oy + (e.clientY - r.top - drag.sy));
    game.onResize?.(); syncAll();
  });
  addEventListener('pointerup', () => { drag = null; });

  return { toggle, syncAll };
}
