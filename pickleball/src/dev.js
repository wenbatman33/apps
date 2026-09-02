// ===== DEV 開發者微調工具：D 鍵或右下角 ⚙ 開關 =====
// 滑桿即時綁定 TUNE → 畫面立即更新；HUD 元件可直接拖曳；「匯出」產出 JSON 供 Claude bake 回 tune.js
import { TUNE, getPath, setPath } from './tune.js';

function schema(layout) {
  return [
    { sec: '🎥 相機（' + layout.toUpperCase() + '）' },
    { key: `camera.${layout}.fov`,     label: 'FOV',      min: 30, max: 90, step: 1,    cam: true },
    { key: `camera.${layout}.y`,       label: '高度 Y',   min: 2,  max: 12, step: 0.05, cam: true },
    { key: `camera.${layout}.z`,       label: '距離 Z',   min: 8,  max: 20, step: 0.05, cam: true },
    { key: `camera.${layout}.lookY`,   label: '視點 Y',   min: -1, max: 3,  step: 0.05, cam: true },
    { key: `camera.${layout}.lookZ`,   label: '視點 Z',   min: -6, max: 4,  step: 0.05, cam: true },
    { key: `camera.${layout}.followX`, label: '跟隨 X',   min: 0,  max: 1,  step: 0.01, cam: true },
    { sec: '💡 燈光' },
    { key: 'light.exposure',       label: '曝光',      min: 0.3, max: 2.5, step: 0.01, light: true },
    { key: 'light.sunIntensity',   label: '主光強度',  min: 0,   max: 6,   step: 0.05, light: true },
    { key: 'light.sunX',           label: '主光 X',    min: -12, max: 12,  step: 0.1,  light: true },
    { key: 'light.sunY',           label: '主光 Y',    min: 4,   max: 20,  step: 0.1,  light: true },
    { key: 'light.sunZ',           label: '主光 Z',    min: -12, max: 12,  step: 0.1,  light: true },
    { key: 'light.hemiIntensity',  label: '環境光',    min: 0,   max: 2,   step: 0.01, light: true },
    { key: 'light.pointIntensity', label: '點光強度',  min: 0,   max: 200, step: 1,    light: true },
    { key: 'light.envFloor',       label: '地板反射',  min: 0,   max: 2,   step: 0.01, light: true },
    { key: 'light.envArena',       label: '場館反射',  min: 0,   max: 2,   step: 0.01, light: true },
    { key: 'light.envChar',        label: '角色反射',  min: 0,   max: 2,   step: 0.01, light: true },
    { key: 'light.panelEmissive',  label: '燈板亮度',  min: 0,   max: 8,   step: 0.05, light: true },
    { key: 'light.shadowBias',     label: '陰影 bias', min: -0.002, max: 0.002, step: 0.00005, light: true },
    { sec: '🌟 後製（僅 PC）' },
    { key: 'post.bloomStrength',  label: '輝光強度', min: 0, max: 2,   step: 0.01, post: true },
    { key: 'post.bloomRadius',    label: '輝光範圍', min: 0, max: 1.5, step: 0.01, post: true },
    { key: 'post.bloomThreshold', label: '輝光門檻', min: 0, max: 2,   step: 0.01, post: true },
    { key: 'post.vignette',       label: '暗角',     min: 0, max: 1.2, step: 0.01, post: true },
    { sec: '🎾 物理 / 擊球' },
    { key: 'physics.gravity',     label: '重力',      min: 5,   max: 15,  step: 0.1 },
    { key: 'physics.drag',        label: '空氣阻力',  min: 0,   max: 0.05, step: 0.001 },
    { key: 'physics.restitution', label: '地面反彈',  min: 0.2, max: 0.9, step: 0.01 },
    { key: 'physics.friction',    label: '落地摩擦',  min: 0.4, max: 1,   step: 0.01 },
    { key: 'shot.driveSpeed',     label: '平擊球速',  min: 6,   max: 24,  step: 0.1 },
    { key: 'shot.serveSpeed',     label: '發球球速',  min: 5,   max: 18,  step: 0.1 },
    { key: 'shot.netClear',       label: '過網餘裕',  min: 0,   max: 0.8, step: 0.01 },
    { key: 'shot.depthPerfect',   label: '完美深度',  min: 0.3, max: 1.1, step: 0.01 },
    { key: 'shot.depthWorst',     label: '最差深度',  min: 0.1, max: 1,   step: 0.01 },
    { key: 'shot.aimHalfW',       label: '瞄準寬度',  min: 1,   max: 3.2, step: 0.05 },
    { sec: '🏃 玩家' },
    { key: 'player.speed',        label: '跑速',      min: 2,   max: 12,  step: 0.1 },
    { key: 'player.reachX',       label: '橫向可及',  min: 0.5, max: 2.5, step: 0.05 },
    { key: 'player.reachZ',       label: '縱向可及',  min: 0.5, max: 2.5, step: 0.05 },
    { key: 'player.swingWindow',  label: '揮拍時窗',  min: 0.1, max: 0.8, step: 0.01 },
    { key: 'player.contactAhead', label: '擊球前距',  min: 0,   max: 1.5, step: 0.05 },
    { key: 'player.aimError',     label: '失誤誤差',  min: 0,   max: 2.5, step: 0.05 },
    { key: 'player.homeZ',        label: '預備位置Z', min: 3,   max: 8,   step: 0.1 },
    { key: 'player.dragSpeed',    label: '拖曳靈敏',  min: 0.005, max: 0.05, step: 0.001 },
    { sec: '🤖 AI（普通難度）' },
    { key: 'ai.normal.speed',     label: '跑速',      min: 2,   max: 12,  step: 0.1 },
    { key: 'ai.normal.error',     label: '瞄準誤差',  min: 0,   max: 2.5, step: 0.05 },
    { key: 'ai.normal.react',     label: '反應延遲',  min: 0,   max: 0.8, step: 0.01 },
    { key: 'ai.normal.missRate',  label: '失誤率',    min: 0,   max: 0.6, step: 0.01 },
    { key: 'ai.normal.corner',    label: '打角機率',  min: 0,   max: 1,   step: 0.01 },
    { sec: '🧭 HUD（' + layout.toUpperCase() + '）— 也可直接拖曳' },
    { key: `hud.${layout}.scoreY`,     label: '計分 Y',   min: -200, max: 0,   step: 1,    hud: true },
    { key: `hud.${layout}.scoreScale`, label: '計分縮放', min: 0.5,  max: 1.6, step: 0.01, hud: true },
    { key: `hud.${layout}.toastY`,     label: '訊息 Y',   min: -300, max: 400, step: 1,    hud: true },
    { key: `hud.${layout}.hintY`,      label: '提示 Y',   min: 0,    max: 400, step: 1,    hud: true },
    { key: `hud.${layout}.menuX`,      label: '選單 X',   min: 0,    max: 200, step: 1,    hud: true },
    { key: `hud.${layout}.menuY`,      label: '選單 Y',   min: -200, max: 0,   step: 1,    hud: true },
  ];
}

export function setupDevTool(ctx) {
  const { hud, arena, postfx, game, applyCamera, setLayout, getLayout, canvas } = ctx;
  const panel = document.getElementById('dev-panel');
  const btn = document.getElementById('btn-dev');
  let dragMode = false;

  const fmt = (v, step) => (step >= 1 ? String(Math.round(v)) : Number(v).toFixed(Math.min(5, Math.max(2, -Math.floor(Math.log10(step))))));

  function build() {
    const layout = getLayout();
    panel.innerHTML = '';
    const head = document.createElement('div');
    head.innerHTML = `<h3>🛠 DEV 微調工具</h3><div class="tip">拖滑桿即時生效；「拖曳 HUD」開啟後可直接用滑鼠拖動計分板 / 訊息 / 提示 / 選單鈕。調好後按「💾 匯出」把 JSON 貼給 Claude bake 進 tune.js。</div>`;
    panel.appendChild(head);

    // 版面切換
    const lay = document.createElement('div'); lay.className = 'btns';
    for (const k of ['pc', 'mobile']) {
      const b = document.createElement('button');
      b.textContent = k === 'pc' ? '💻 PC 版面' : '📱 Mobile 版面';
      if (k === layout) b.classList.add('on');
      b.onclick = () => { setLayout(k); build(); };
      lay.appendChild(b);
    }
    const dragBtn = document.createElement('button');
    dragBtn.textContent = '🖱 拖曳 HUD';
    if (dragMode) dragBtn.classList.add('on');
    dragBtn.onclick = () => { dragMode = !dragMode; dragBtn.classList.toggle('on', dragMode); };
    lay.appendChild(dragBtn);
    panel.appendChild(lay);

    // 狀態觸發
    const st = document.createElement('div'); st.className = 'btns';
    const add = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; st.appendChild(b); };
    add('▶ 開始（普通）', () => game.startMatch('normal'));
    add('🏆 結算(勝)', () => { hud.showResult(true, 11, 7); game.state = 'result'; });
    add('💀 結算(敗)', () => { hud.showResult(false, 6, 11); game.state = 'result'; });
    add('💬 得分訊息', () => hud.toast('OUT', '對手的球出界', '#7dffb0', 2));
    add('💡 提示', () => hud.hint('球接近時點擊擊球；點畫面左 / 右決定出球方向', 4));
    add('🏠 回標題', () => game.toMenu());
    panel.appendChild(st);

    for (const it of schema(layout)) {
      if (it.sec) { const h = document.createElement('h3'); h.textContent = it.sec; panel.appendChild(h); continue; }
      const row = document.createElement('div'); row.className = 'row';
      const lb = document.createElement('label'); lb.textContent = it.label; lb.title = it.key;
      const inp = document.createElement('input'); inp.type = 'range'; inp.min = it.min; inp.max = it.max; inp.step = it.step;
      const cur = getPath(it.key);
      inp.value = cur;
      const val = document.createElement('span'); val.className = 'val'; val.textContent = fmt(cur, it.step);
      inp.oninput = () => {
        const v = parseFloat(inp.value);
        setPath(it.key, v);
        val.textContent = fmt(v, it.step);
        if (it.cam) applyCamera();
        if (it.light) { arena.applyLightTune(); postfx.apply(); ctx.applyChar?.(); }
        if (it.post) postfx.apply();
        if (it.hud) hud.layout();
      };
      row.append(lb, inp, val);
      panel.appendChild(row);
      it._inp = inp; it._val = val;
    }
    panel._schema = schema(layout);

    const h = document.createElement('h3'); h.textContent = '💾 匯出 / 鎖定'; panel.appendChild(h);
    const ex = document.createElement('div'); ex.className = 'btns';
    const ta = document.createElement('textarea'); ta.readOnly = true;
    const eb = document.createElement('button'); eb.textContent = '💾 匯出目前數值 (JSON)';
    eb.onclick = () => {
      const out = { camera: TUNE.camera, light: TUNE.light, post: TUNE.post, physics: TUNE.physics, shot: TUNE.shot, player: TUNE.player, ai: TUNE.ai, hud: TUNE.hud };
      const s = JSON.stringify(out, null, 2);
      ta.value = s;
      console.log('[DEV EXPORT]\n' + s);
      navigator.clipboard?.writeText(s).catch(() => {});
      eb.textContent = '✅ 已複製到剪貼簿';
      setTimeout(() => (eb.textContent = '💾 匯出目前數值 (JSON)'), 1500);
    };
    ex.appendChild(eb);
    panel.appendChild(ex);
    panel.appendChild(ta);
  }

  function refreshSliders() {
    for (const it of panel._schema || []) {
      if (!it._inp) continue;
      const v = getPath(it.key);
      it._inp.value = v; it._val.textContent = fmt(v, it.step);
    }
  }

  function toggle(force) {
    const show = force ?? panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !show);
    btn.classList.toggle('hidden', !show);
    if (show) build();
  }
  btn.addEventListener('click', () => toggle());
  window.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'd' || e.key === 'D') toggle();
    if (e.key === '`' ) btn.classList.toggle('hidden');
  });
  // 手機：右下角三指點兩下顯示齒輪
  let tapN = 0, tapT = 0;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 3) { const now = performance.now(); tapN = now - tapT < 600 ? tapN + 1 : 1; tapT = now; if (tapN >= 2) { btn.classList.toggle('hidden'); tapN = 0; } }
  }, { passive: true });

  // ---- HUD 拖曳 ----
  let dragging = null;
  const layoutOf = () => TUNE.hud[getLayout()];
  const pick = (ux, uy) => {
    const cands = [
      { name: 'score', obj: hud.score, w: 260, h: 60 },
      { name: 'menu', obj: hud.menuBtn, w: 60, h: 60 },
      { name: 'toast', obj: hud.toastGroup, w: 320, h: 90 },
      { name: 'hint', obj: hud.hintText, w: 420, h: 40 },
    ];
    for (const c of cands) {
      const p = c.obj.position;
      if (Math.abs(ux - p.x) <= c.w / 2 && Math.abs(uy - p.y) <= c.h / 2) return c;
    }
    return null;
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (!dragMode) return;
    const u = hud.layer.toUI(e.clientX, e.clientY);
    const c = pick(u.x, u.y);
    if (!c) return;
    if (c.name === 'toast') hud.toast('OUT', '對手的球出界', '#7dffb0', 999);
    if (c.name === 'hint') hud.hint('提示文字（拖曳中）', 999);
    dragging = { c, lx: e.clientX, ly: e.clientY };
    e.stopImmediatePropagation();
  }, true);
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.lx, dy = -(e.clientY - dragging.ly);
    dragging.lx = e.clientX; dragging.ly = e.clientY;
    const L = layoutOf();
    switch (dragging.c.name) {
      case 'score': L.scoreY += dy; break;
      case 'menu': L.menuX += dx; L.menuY += dy; break;
      case 'toast': L.toastY += dy; break;
      case 'hint': L.hintY += dy; break;
    }
    hud.layout();
    refreshSliders();
    e.stopImmediatePropagation();
  }, true);
  canvas.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = null;
    e.stopImmediatePropagation();
  }, true);

  return { toggle };
}
