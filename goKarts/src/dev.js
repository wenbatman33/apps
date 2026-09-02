// DEV 微调面板：按 ` (Backquote) 开关。即时调渲染/光照/雾/镜头参数，💾 匯出 JSON 后由 Claude bake 回 source
import { RENDER, QUALITY, applyEnvIntensity } from './render.js';

const FIELDS = [
  ['— 渲染 —'],
  ['exposure', '曝光', 0.3, 2.0, 0.01],
  ['sun', '主光', 0, 4, 0.05],
  ['hemi', '半球光', 0, 1.5, 0.01],
  ['env', '布景反射', 0, 1.5, 0.01],
  ['envKart', '车辆反射', 0, 2, 0.01],
  ['bloomStrength', 'Bloom 强度', 0, 1.5, 0.01],
  ['bloomRadius', 'Bloom 半径', 0, 1, 0.01],
  ['bloomThreshold', 'Bloom 阈值', 0, 1.5, 0.01],
  ['— 阴影 —'],
  ['shadowRange', '阴影范围', 15, 120, 1],
  ['shadowBias', '阴影 bias', -0.002, 0.002, 0.00005],
  ['shadowNormalBias', '法线 bias', 0, 0.2, 0.001],
  ['— 镜头 —'],
  ['camDist', '距离', 3, 16, 0.1],
  ['camHeight', '高度', 1, 10, 0.1],
  ['fov', '视野', 40, 100, 1],
  ['— 本赛道（雾 / 天空）—'],
  ['fogNear', '雾起', 20, 400, 1, 'track'],
  ['fogFar', '雾终', 100, 1200, 5, 'track'],
  ['turbidity', '天空混浊', 0.5, 20, 0.1, 'sky'],
  ['rayleigh', '瑞利散射', 0, 6, 0.05, 'sky'],
  ['mie', 'Mie 系数', 0, 0.1, 0.001, 'sky'],
  ['mieG', 'Mie 方向', 0, 1, 0.01, 'sky'],
];

export function initDev({ getRace, pipeline }) {
  const panel = document.createElement('div');
  panel.id = 'dev-panel';
  panel.style.cssText = `position:fixed;right:10px;top:10px;z-index:200;width:290px;max-height:92vh;overflow:auto;
    background:rgba(10,14,24,.92);color:#dfe7f3;font:12px/1.5 Menlo,monospace;padding:10px 12px;border-radius:10px;
    border:1px solid rgba(255,255,255,.18);display:none;pointer-events:auto`;
  document.body.appendChild(panel);

  const rows = {};
  const header = document.createElement('div');
  header.innerHTML = `<b style="color:#ffe66d">DEV 微调</b> <span style="opacity:.6">(\` 开关 · 画质 ${QUALITY.low ? 'LOW' : 'HIGH'})</span>`;
  panel.appendChild(header);

  for (const f of FIELDS) {
    if (f.length === 1) {
      const h = document.createElement('div');
      h.textContent = f[0]; h.style.cssText = 'margin:8px 0 2px;color:#9fb0c8;font-weight:700';
      panel.appendChild(h); continue;
    }
    const [key, label, min, max, step, scope] = f;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px';
    row.innerHTML = `<span style="width:72px;flex:none">${label}</span>
      <input type="range" min="${min}" max="${max}" step="${step}" style="flex:1">
      <span class="v" style="width:54px;text-align:right"></span>`;
    const inp = row.querySelector('input'), val = row.querySelector('.v');
    inp.oninput = () => { setValue(key, scope, parseFloat(inp.value)); val.textContent = fmt(parseFloat(inp.value)); };
    rows[key] = { inp, val, scope };
    panel.appendChild(row);
  }

  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:6px;margin-top:10px';
  btns.innerHTML = `<button id="dev-export" style="flex:1;padding:6px;border-radius:6px;border:0;background:#38c96f;color:#fff;font-weight:700;cursor:pointer">💾 匯出 JSON</button>
    <button id="dev-reset" style="padding:6px 10px;border-radius:6px;border:0;background:#444;color:#fff;cursor:pointer">重置</button>`;
  panel.appendChild(btns);
  const out = document.createElement('textarea');
  out.style.cssText = 'width:100%;height:120px;margin-top:8px;background:#05070d;color:#7CFC9B;border:1px solid #333;font:11px Menlo,monospace;display:none';
  panel.appendChild(out);

  const defaults = { ...RENDER };
  btns.querySelector('#dev-reset').onclick = () => { Object.assign(RENDER, defaults); refresh(); applyAll(); };
  btns.querySelector('#dev-export').onclick = () => {
    const race = getRace();
    const data = { RENDER: { ...RENDER } };
    if (race) {
      const def = race.trackDef;
      data.track = { id: def.id, fog: { near: def.fog.near, far: def.fog.far }, sky: def.sky ? { ...def.sky } : null };
    }
    const json = JSON.stringify(data, null, 2);
    out.style.display = 'block'; out.value = json;
    console.log('[DEV 匯出]\n' + json);
    navigator.clipboard?.writeText(json).catch(() => {});
  };

  function fmt(v) { return Math.abs(v) < 0.01 && v !== 0 ? v.toFixed(5) : (+v.toFixed(3)).toString(); }

  function getValue(key, scope) {
    const race = getRace();
    if (scope === 'track') return race ? race.trackDef.fog[key === 'fogNear' ? 'near' : 'far'] : 0;
    if (scope === 'sky') return race && race.trackDef.sky ? race.trackDef.sky[key] : 0;
    return RENDER[key];
  }
  function setValue(key, scope, v) {
    const race = getRace();
    if (scope === 'track') {
      if (!race) return;
      race.trackDef.fog[key === 'fogNear' ? 'near' : 'far'] = v;
      race.scene.fog[key === 'fogNear' ? 'near' : 'far'] = v;
      return;
    }
    if (scope === 'sky') {
      if (!race || !race.trackDef.sky || !race.sky?.material?.uniforms) return;
      race.trackDef.sky[key] = v;
      const u = race.sky.material.uniforms;
      ({ turbidity: u.turbidity, rayleigh: u.rayleigh, mie: u.mieCoefficient, mieG: u.mieDirectionalG })[key].value = v;
      return;
    }
    RENDER[key] = v;
    if (key === 'env' && race) applyEnvIntensity(race.track.group, v);
    if (key === 'envKart' && race) for (const k of race.karts) applyEnvIntensity(k.mesh, v);
  }
  function applyAll() {
    const race = getRace();
    if (!race) return;
    applyEnvIntensity(race.track.group, RENDER.env);
    for (const k of race.karts) applyEnvIntensity(k.mesh, RENDER.envKart);
  }
  function refresh() {
    for (const key in rows) {
      const { inp, val, scope } = rows[key];
      const v = getValue(key, scope);
      inp.value = v; val.textContent = fmt(v);
      inp.disabled = (scope === 'sky' && !(getRace()?.trackDef.sky)) || (scope === 'track' && !getRace());
    }
  }

  window.addEventListener('keydown', e => {
    if (e.code !== 'Backquote') return;
    const on = panel.style.display === 'none';
    panel.style.display = on ? 'block' : 'none';
    if (on) refresh();
  });
  return { refresh };
}
