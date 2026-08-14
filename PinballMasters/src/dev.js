// ===== DEV 開發者微調工具：D 鍵或右下角 ⚙ 開關 =====
// 滑桿即時綁定 TUNE → 畫面立即更新；「匯出」產出 JSON 給 Claude bake 回 tune.js
import { TUNE, getPath, setPath } from './tune.js';

const SCHEMA = [
  { sec: '⚙ 物理' },
  { key: 'physics.gravity',         label: '斜面重力',   min: 4,   max: 16,  step: 0.2 },
  { key: 'physics.wallRestitution', label: '牆面反彈',   min: 0.2, max: 0.95, step: 0.01 },
  { key: 'physics.rollDamp',        label: '滾動保留比', min: 0.8, max: 0.995, step: 0.005 },
  { key: 'physics.maxSpeed',        label: '極速限制',   min: 15,  max: 50,  step: 1 },
  { key: 'physics.bumperBoost',     label: '彈射器力道', min: 8,   max: 28,  step: 0.5 },
  { key: 'physics.slingKick',       label: '彈弓力道',   min: 6,   max: 24,  step: 0.5 },
  { sec: '🕹 Flipper' },
  { key: 'flipper.pivotX',      label: '樞軸間距',  min: 0.9, max: 1.8, step: 0.01 },
  { key: 'flipper.pivotZ',      label: '樞軸高度z', min: 4.2, max: 5.5, step: 0.02 },
  { key: 'flipper.len',         label: '桿長',      min: 0.8, max: 1.5, step: 0.01 },
  { key: 'flipper.restDeg',     label: '下垂角°',   min: 15,  max: 45,  step: 1 },
  { key: 'flipper.upDeg',       label: '抬升角°',   min: 15,  max: 50,  step: 1 },
  { key: 'flipper.speed',       label: '轉速°/s',   min: 400, max: 2000, step: 25 },
  { key: 'flipper.restitution', label: '桿面反彈',  min: 0.1, max: 0.9, step: 0.02 },
  { sec: '🎯 發射桿' },
  { key: 'plunger.minSpeed', label: '最小發射速度', min: 8,   max: 22,  step: 0.5 },
  { key: 'plunger.maxSpeed', label: '拉滿發射速度', min: 16,  max: 40,  step: 0.5 },
  { key: 'plunger.pullPx',   label: '拉滿像素',     min: 80,  max: 400, step: 5 },
  { sec: '🎥 相機' },
  { key: 'camera.fov',    label: 'FOV',       min: 35, max: 80, step: 1,   cam: true },
  { key: 'camera.tilt',   label: '傾角°',     min: 0,  max: 60, step: 1,   cam: true },
  { key: 'camera.lookZ',  label: '視點Z偏移', min: -3, max: 3,  step: 0.1, cam: true },
  { key: 'camera.margin', label: '邊緣留白',  min: 1,  max: 1.4, step: 0.01, cam: true },
  { key: 'camera.shake',  label: '震動倍率',  min: 0,  max: 3,  step: 0.1 },
  { sec: '✨ 特效' },
  { key: 'fx.trailLen',       label: '軌跡長度', min: 4,   max: 40,  step: 1 },
  { key: 'fx.trailWidth',     label: '軌跡寬度', min: 0.05, max: 1,  step: 0.01 },
  { key: 'fx.trailOpacity',   label: '軌跡亮度', min: 0.1, max: 1,   step: 0.05 },
  { key: 'fx.glowSize',       label: '光暈大小', min: 1,   max: 6,   step: 0.1 },
  { key: 'fx.particles',      label: '粒子倍率', min: 0,   max: 3,   step: 0.1 },
  { key: 'fx.lightIntensity', label: '跟隨光強', min: 0,   max: 8,   step: 0.1 },
  { sec: '⚔ 戰鬥' },
  { key: 'battle.saverSec',      label: '球保護秒數', min: 0,   max: 30,   step: 1 },
  { key: 'battle.vulnSec',       label: '破防秒數',   min: 4,   max: 30,   step: 1 },
  { key: 'battle.vulnDmgBase',   label: '破防傷害底', min: 80,  max: 800,  step: 10 },
  { key: 'battle.vulnDmgImpact', label: '破防撞速傷', min: 10,  max: 120,  step: 2 },
  { key: 'battle.chipDmgBase',   label: '平時傷害底', min: 0,   max: 100,  step: 2 },
  { key: 'battle.comboBonus',    label: 'Combo加成',  min: 0,   max: 0.2,  step: 0.005 },
  { sec: '🌟 後製（輝光 / 色調）' },
  { key: 'post.bloomStrength', label: '輝光強度', min: 0,   max: 2.5, step: 0.05, post: 'bloomStrength' },
  { key: 'post.threshold',     label: '輝光門檻', min: 0.1, max: 1.5, step: 0.02, post: 'threshold' },
  { key: 'post.exposure',      label: '曝光',     min: 0.4, max: 2.2, step: 0.05, post: 'exposure' },
  { key: 'post.vignette',      label: '暗角',     min: 0,   max: 1.2, step: 0.05, post: 'vignette' },
  { key: 'post.chroma',        label: '色差',     min: 0,   max: 0.03, step: 0.001, post: 'chroma' },
];

export function setupDevTool(getGame, postfx) {
  const panel = document.getElementById('dev-panel');
  const btn = document.getElementById('btn-dev');
  let dragMode = false;

  const toggle = () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) build();
  };
  btn.addEventListener('click', toggle);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      toggle();
    }
  });

  function build() {
    panel.innerHTML = '<h3>🛠 DEV 微調工具 <span class="x">✕</span></h3>';
    panel.querySelector('.x').addEventListener('click', toggle);

    // 狀態觸發
    const h4s = document.createElement('h4'); h4s.textContent = '🎬 狀態觸發';
    panel.appendChild(h4s);
    const btns = document.createElement('div'); btns.className = 'dev-btns';
    const addBtn = (label, fn) => {
      const b = document.createElement('button'); b.textContent = label;
      b.addEventListener('click', fn); btns.appendChild(b); return b;
    };
    addBtn('觸發破防', () => getGame()?.devVuln());
    addBtn('直接勝利', () => getGame()?.devVictory());
    addBtn('直接失敗', () => getGame()?.devDefeat());
    addBtn('補一顆球', () => getGame()?.devAddBall());
    const dragBtn = addBtn('🖱 拖曳擺位:關', () => {
      dragMode = !dragMode;
      const g = getGame(); if (g) g.devDrag = dragMode;
      dragBtn.textContent = `🖱 拖曳擺位:${dragMode ? '開' : '關'}`;
      dragBtn.classList.toggle('on', dragMode);
    });
    panel.appendChild(btns);
    const note = document.createElement('div'); note.className = 'dev-note';
    note.textContent = '拖曳擺位開啟時，直接在棋盤上拖動敵人/彈射器；匯出可取得座標 JSON。';
    panel.appendChild(note);

    // 滑桿
    for (const item of SCHEMA) {
      if (item.sec) {
        const h = document.createElement('h4'); h.textContent = item.sec;
        panel.appendChild(h); continue;
      }
      const row = document.createElement('div'); row.className = 'dev-row';
      const lab = document.createElement('label'); lab.textContent = item.label;
      row.appendChild(lab);
      {
        const inp = document.createElement('input'); inp.type = 'range';
        inp.min = item.min; inp.max = item.max; inp.step = item.step;
        inp.value = getPath(TUNE, item.key);
        const val = document.createElement('span'); val.className = 'val';
        val.textContent = (+inp.value).toFixed(2).replace(/\.?0+$/, '');
        inp.addEventListener('input', () => {
          const v = parseFloat(inp.value);
          setPath(TUNE, item.key, v);
          val.textContent = v.toFixed(2).replace(/\.?0+$/, '');
          const g = getGame();
          if (item.post) postfx?.set(item.post, v);
          if (g && item.cam) g.devRefreshCamera();
        });
        row.appendChild(inp); row.appendChild(val);
      }
      panel.appendChild(row);
    }

    // 匯出
    const h4e = document.createElement('h4'); h4e.textContent = '💾 匯出 / 鎖定';
    panel.appendChild(h4e);
    const ebtns = document.createElement('div'); ebtns.className = 'dev-btns';
    const out = document.createElement('textarea'); out.id = 'dev-export-out';
    out.placeholder = '按「匯出」後，把這段 JSON 貼給 Claude 即可 bake 進程式碼';
    const eb = document.createElement('button'); eb.textContent = '💾 匯出全部參數';
    eb.addEventListener('click', () => {
      const data = { TUNE, layoutExport: getGame()?.devExportLayout() ?? null };
      out.value = JSON.stringify(data, null, 2);
      out.select?.();
      try { navigator.clipboard?.writeText(out.value); } catch {}
      console.log('[DEV EXPORT]', out.value);
    });
    ebtns.appendChild(eb);
    panel.appendChild(ebtns);
    panel.appendChild(out);
  }

  return { showButton(v) { btn.classList.toggle('hidden', !v); } };
}
