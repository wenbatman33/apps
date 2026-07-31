// ============ DEV 微調工具：按 D 或右側 ⚙ 開關；所有數值即時生效並可匯出 ============
import { PHYS, SWING, HIT, CAM, FIELD, PACE, tuneTables, saveTune, resetTune, loadTune } from './config.js';
import { hitBall } from './ball.js';

const SPEC = [
  ['節奏（秒）', [
    [PACE, 'afterPlay', 1, 8, .1, '一般間隔'],
    [PACE, 'afterHR', 1, 10, .1, '全壘打後'],
    [PACE, 'firstBall', .5, 6, .1, '開局等待'],
    [PACE, 'flightSpeed', 1, 4, .1, '飛球播放倍速'],
    [PACE, 'windupSpeed', .3, 2, .05, '投球動作速度'],
    [PACE, 'countdown', 0, 5, .1, '倒數顯示秒數'],
  ]],
  ['飛行物理', [
    [PHYS, 'drag', 0.001, 0.012, 0.0001, '空氣阻力'],
    [PHYS, 'lift', 0, 0.005, 0.0001, '後旋升力'],
    [PHYS, 'g', 6, 14, 0.1, '重力'],
    [PHYS, 'windZ', -12, 12, 0.5, '順風(+)/逆風'],
    [PHYS, 'windX', -10, 10, 0.5, '側風'],
  ]],
  ['揮棒判定 (ms)', [
    [SWING, 'perfect', 8, 80, 1, 'PERFECT 窗'],
    [SWING, 'good', 20, 140, 1, 'GOOD 窗'],
    [SWING, 'ok', 40, 200, 1, 'OK 窗'],
    [SWING, 'poor', 60, 300, 1, '揮空門檻'],
    [SWING, 'barrelDelay', 0, 260, 5, '棒頭延遲'],
    [SWING, 'assistBonus', 1, 2.2, 0.02, '輔助倍率'],
    [SWING, 'powerVelo', 1, 1.4, 0.01, '強打初速'],
  ]],
  ['擊球', [
    [HIT, 'veloMin', 10, 40, 0.5, '最低初速'],
    [HIT, 'veloMax', 35, 70, 0.5, '最高初速'],
    [HIT, 'angleBest', 10, 50, 1, '最佳仰角'],
    [HIT, 'angleSpread', 0, 60, 1, '仰角亂度'],
    [HIT, 'sprayK', 0, 0.8, 0.01, '拉打係數'],
    [HIT, 'spraySpread', 0, 20, 0.5, '左右亂度'],
  ]],
  ['球場', [
    [FIELD, 'wallL', 70, 140, 1, '兩翼距離'],
    [FIELD, 'wallC', 90, 170, 1, '中外野'],
    [FIELD, 'contactZ', -0.5, 1.5, 0.05, '擊球點 Z'],
    [FIELD, 'plateY', 0.4, 1.2, 0.02, '好球帶高'],
    [FIELD, 'releaseY', 0.8, 2.2, 0.02, '出手高度'],
  ]],
  ['相機', [
    [CAM, 'batX', -4, 4, 0.05, '打擊視角 X'],
    [CAM, 'batY', 0.8, 8, 0.05, '打擊視角 Y'],
    [CAM, 'batZ', -20, -2, 0.1, '打擊視角 Z'],
    [CAM, 'batLookY', 0, 4, 0.05, '注視 Y'],
    [CAM, 'batLookZ', 0, 30, 0.5, '注視 Z'],
    [CAM, 'fov', 30, 90, 1, 'FOV (PC)'],
    [CAM, 'fovMobile', 40, 100, 1, 'FOV (手機)'],
    [CAM, 'followLerp', 0.02, 0.4, 0.01, '追球平滑'],
    [CAM, 'shake', 0, 3, 0.05, '震動'],
  ]],
];

export function initDev(G){
  loadTune();
  const panel = document.getElementById('dev');
  const toggleBtn = document.getElementById('dev-toggle');
  let open = false;

  let html = '<h3>⚙ DEV 微調工具</h3>';
  SPEC.forEach((grp, gi) => {
    html += `<div class="dgrp"><label>${grp[0]}</label>`;
    grp[1].forEach(([tbl, key, min, max, step, label], ri) => {
      html += `<div class="drow"><span>${label}</span>
        <input type="range" data-g="${gi}" data-r="${ri}" min="${min}" max="${max}" step="${step}" value="${tbl[key]}">
        <em id="dv-${gi}-${ri}">${tbl[key]}</em></div>`;
    });
    html += '</div>';
  });
  html += `<div class="dbtns">
    <button class="dbtn primary" id="dv-save">💾 匯出</button>
    <button class="dbtn" id="dv-test">⚾ 測試擊球</button>
    <button class="dbtn" id="dv-cam">📷 循環鏡頭</button>
    <button class="dbtn" id="dv-reset">↺ 全部重置</button>
  </div>
  <div style="margin-top:8px;font-size:10px;color:#7d90aa;line-height:1.5">
    調好後按「匯出」→ 數值存進 localStorage 並印到 console，告訴我「我調好了」我就把數值 bake 進原始碼。
  </div>`;
  panel.innerHTML = html;

  panel.querySelectorAll('input[type=range]').forEach(inp => {
    inp.addEventListener('input', () => {
      const [tbl, key] = SPEC[+inp.dataset.g][1][+inp.dataset.r];
      const v = parseFloat(inp.value);
      tbl[key] = v;
      document.getElementById(`dv-${inp.dataset.g}-${inp.dataset.r}`).textContent = v;
      G.onTuneChanged && G.onTuneChanged();
    });
  });

  document.getElementById('dv-save').addEventListener('click', () => {
    const out = saveTune();
    console.log('=== SWING TUNE EXPORT ===\n' + JSON.stringify(out, null, 2));
    try { navigator.clipboard.writeText(JSON.stringify(out, null, 2)); } catch(e){}
    const b = document.getElementById('dv-save');
    b.textContent = '✓ 已複製'; setTimeout(() => b.textContent = '💾 匯出', 1400);
  });
  document.getElementById('dv-reset').addEventListener('click', () => resetTune());
  document.getElementById('dv-test').addEventListener('click', () => {
    // 強制一發理想擊球，用來測物理與距離
    const B = G.ball;
    B.mesh.visible = true;
    B.mesh.position.set(-0.55, 1.0, FIELD.contactZ);
    B.state = 'hit'; B.landed = null; B.hr = false; B.foul = false; B.dist = 0; B.trailPts.length = 0;
    hitBall(B, HIT.veloMax, HIT.angleBest, 0);
    if (G.game) { G.game.camMode = 'follow'; G.game._devWatch = 2.5; }
  });
  document.getElementById('dv-cam').addEventListener('click', () => {
    if (!G.game) return;
    const order = ['bat', 'follow', 'land'];
    G.game.camMode = order[(order.indexOf(G.game.camMode) + 1) % 3];
  });

  function setOpen(v){
    open = v;
    panel.classList.toggle('hidden', !open);
  }
  toggleBtn.classList.remove('hidden');
  toggleBtn.addEventListener('click', () => setOpen(!open));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D'){
      if (document.activeElement?.tagName === 'INPUT') return;
      setOpen(!open);
    }
  });

  return { isOpen: () => open, setOpen };
}
