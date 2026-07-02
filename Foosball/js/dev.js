// DEV 開發者微調工具：按 D 或右下角 ⚙ 開啟
// 即時調整版面/物理/操作/AI 參數，💾 匯出 JSON 後貼給 Claude 鎖定進 source
import { CONFIG } from './config.js';

const LS_KEY = 'foosball_dev_cfg_v3'; // v3：操作改為點擊踢球制，舊覆寫值作廢

function pathGet(obj, path) { return path.split('.').reduce((o, k) => o[k], obj); }
function pathSet(obj, path, v) {
  const ks = path.split('.');
  const last = ks.pop();
  ks.reduce((o, k) => o[k], obj)[last] = v;
}

// 深合併 localStorage 儲存的覆寫值
function merge(dst, src) {
  for (const k in src) {
    if (src[k] && typeof src[k] === 'object' && dst[k]) merge(dst[k], src[k]);
    else if (k in dst) dst[k] = src[k];
  }
}

export function loadDevOverrides() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) merge(CONFIG, JSON.parse(raw));
  } catch (e) { /* 忽略壞資料 */ }
}

export function initDev({ scene, game, ui, onTestGoal, onReserve }) {
  const panel = document.getElementById('dev-panel');
  const body = document.getElementById('dev-body');
  let editLayout = 'LAYOUT_MOBILE';

  const save = () => localStorage.setItem(LS_KEY, JSON.stringify({
    table: CONFIG.table, physics: CONFIG.physics, control: CONFIG.control,
    ai: CONFIG.ai, rules: CONFIG.rules,
    LAYOUT_MOBILE: CONFIG.LAYOUT_MOBILE, LAYOUT_PC: CONFIG.LAYOUT_PC,
  }));

  function slider(label, path, min, max, step, onChange) {
    const row = document.createElement('div');
    row.className = 'dev-row';
    const val = pathGet(CONFIG, path);
    row.innerHTML = `<label>${label}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${val}"><span>${val}</span>`;
    const input = row.querySelector('input'), span = row.querySelector('span');
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      pathSet(CONFIG, path, v);
      span.textContent = v;
      save();
      onChange && onChange(v);
    });
    return row;
  }

  function section(title) {
    const h = document.createElement('div');
    h.className = 'dev-sec'; h.textContent = title;
    body.appendChild(h);
    return h;
  }

  function rebuild() {
    body.innerHTML = '';

    section(`版面（編輯中：${editLayout === 'LAYOUT_PC' ? 'PC 橫版' : '手機直版'}）`);
    const sw = document.createElement('div');
    sw.className = 'dev-row dev-btns';
    for (const [k, name] of [['LAYOUT_MOBILE', '手機'], ['LAYOUT_PC', 'PC']]) {
      const b = document.createElement('button');
      b.textContent = name;
      b.className = editLayout === k ? 'on' : '';
      b.addEventListener('click', () => { editLayout = k; rebuild(); });
      sw.appendChild(b);
    }
    body.appendChild(sw);
    const relayout = () => scene.applyLayout();
    body.appendChild(slider('鏡頭高度 camH', `${editLayout}.camH`, 8, 48, 0.5, relayout));
    body.appendChild(slider('鏡頭距離 camD', `${editLayout}.camD`, 0, 34, 0.5, relayout));
    body.appendChild(slider('視角 fov', `${editLayout}.fov`, 28, 85, 1, relayout));
    body.appendChild(slider('視線落點 lookZ', `${editLayout}.lookZ`, -10, 10, 0.5, relayout));

    section('物理');
    body.appendChild(slider('摩擦 friction', 'physics.friction', 0.1, 1.6, 0.05));
    body.appendChild(slider('牆彈性 wallRest', 'physics.wallRest', 0.3, 1, 0.02));
    body.appendChild(slider('人偶彈性 blockRest', 'physics.blockRest', 0.1, 1, 0.02));
    body.appendChild(slider('球速上限 maxSpeed', 'physics.maxSpeed', 25, 90, 1));
    body.appendChild(slider('中場死區斜坡', 'physics.slopeMid', 0, 20, 0.5));
    body.appendChild(slider('球門死角斜坡', 'physics.slopeGoal', 0, 20, 0.5));

    section('操作');
    body.appendChild(slider('移桿靈敏度', 'control.moveSens', 0.3, 3, 0.05));
    body.appendChild(slider('點擊射門力道', 'control.tapKickPow', 10, 60, 1));
    body.appendChild(slider('點擊判定秒數', 'control.tapMaxTime', 0.1, 0.6, 0.02));
    body.appendChild(slider('點擊判定移動量', 'control.tapMaxMove', 0.3, 3, 0.1));
    body.appendChild(slider('射門冷卻(秒)', 'control.kickCooldown', 0.1, 1, 0.05));

    const diff = ui.difficulty;
    section(`AI（目前難度：${diff}）`);
    body.appendChild(slider('移動速度', `ai.${diff}.speed`, 2, 30, 0.5));
    body.appendChild(slider('反應間隔(秒)', `ai.${diff}.react`, 0.02, 0.6, 0.01));
    body.appendChild(slider('射門力道', `ai.${diff}.kickPow`, 10, 55, 1));
    body.appendChild(slider('瞄準精度', `ai.${diff}.aim`, 0, 1, 0.05));
    body.appendChild(slider('出腳冷卻(秒)', `ai.${diff}.kickCd`, 0.2, 2.5, 0.05));

    section('規則');
    body.appendChild(slider('獲勝分數', 'rules.winScore', 1, 11, 1));

    section('動作測試');
    const btns = document.createElement('div');
    btns.className = 'dev-row dev-btns';
    const mk = (name, fn) => {
      const b = document.createElement('button');
      b.textContent = name; b.addEventListener('click', fn);
      btns.appendChild(b);
    };
    mk('測試進球演出', onTestGoal);
    mk('重新發球', onReserve);
    mk('💾 匯出設定', () => {
      const json = JSON.stringify(CONFIG, null, 2);
      console.log('[DEV] CONFIG export:\n' + json);
      navigator.clipboard && navigator.clipboard.writeText(json).catch(() => {});
      const ta = document.getElementById('dev-export');
      ta.value = json;
      ta.classList.remove('hidden');
      alert('已複製到剪貼簿（也印在 console / 下方文字框），貼給 Claude 即可鎖定');
    });
    mk('重置為預設', () => { localStorage.removeItem(LS_KEY); location.reload(); });
    body.appendChild(btns);
    const ta = document.createElement('textarea');
    ta.id = 'dev-export'; ta.className = 'hidden'; ta.rows = 8;
    body.appendChild(ta);
  }

  const toggle = () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      editLayout = scene.orientation === 'landscape' ? 'LAYOUT_PC' : 'LAYOUT_MOBILE'; // 預設編輯目前版面
      rebuild();
    }
  };
  document.getElementById('dev-toggle').addEventListener('click', toggle);
  window.addEventListener('keydown', e => {
    if (e.key === 'd' || e.key === 'D') {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      toggle();
    }
  });
}
