// DEV 微調工具：D 鍵開關，即時調整版面與玩法數值並可匯出 JSON
import { LAYOUT, LAYOUT_PC, LAYOUT_MOBILE, RULES, applyLayout } from '../config.js';

const LAYOUT_FIELDS = [
  ['playTop', 60, 400, 1], ['playLeft', 0, 120, 1], ['deadLine', 800, 1260, 1], ['launchY', 900, 1270, 1],
  ['hudTitleY', 10, 200, 1], ['hudTitleSize', 14, 64, 1], ['hudSubY', 20, 240, 1], ['hudSubSize', 10, 40, 1],
  ['progressY', 40, 260, 1], ['progressW', 200, 700, 5], ['progressH', 2, 30, 1],
  ['ballCountY', 1100, 1279, 1], ['ballCountSize', 12, 56, 1],
  ['btnSpeedX', 40, 400, 1], ['btnRecallX', 320, 690, 1], ['btnBottomY', 1100, 1279, 1], ['turnInfoY', 1000, 1279, 1],
  ['aimDotGap', 10, 80, 1], ['aimDotSize', 1, 16, 0.5], ['aimMaxLen', 200, 3000, 20],
  ['glowAlpha', 0, 1, 0.01], ['shakeScale', 0, 3, 0.05],
];

const RULE_FIELDS = [
  ['ballRadius', 3, 16, 0.5], ['ballSpeed', 400, 4000, 25], ['fireInterval', 0.01, 0.3, 0.005],
  ['fireBurst', 0.5, 8, 0.1], ['fireIntervalMin', 0.005, 0.06, 0.001], ['scatter', 0, 0.3, 0.005],
  ['maxBalls', 10, 600, 10], ['turboAfter', 1, 20, 0.5], ['turboScale', 1, 6, 0.1],
];

export class DevTools {
  constructor(hooks) {
    this.hooks = hooks;
    this.open = false;
    this.mode = 'PC';
    this.build();
    window.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        if (e.target && /input|textarea/i.test(e.target.tagName)) return;
        this.toggle();
      }
    });
  }

  toggle() {
    this.open = !this.open;
    this.el.style.transform = this.open ? 'translateX(0)' : 'translateX(105%)';
    this.tab.textContent = this.open ? '✕' : '⚙';
  }

  build() {
    const css = document.createElement('style');
    css.textContent = `
#devpanel{position:fixed;top:0;right:0;width:330px;height:100%;background:rgba(6,10,20,.96);
  color:#cfe8ff;font:12px/1.5 ui-monospace,Menlo,monospace;z-index:999;overflow-y:auto;
  border-left:1px solid rgba(53,240,255,.3);transform:translateX(105%);transition:transform .22s;
  padding:12px 14px 60px;backdrop-filter:blur(6px)}
#devtab{position:fixed;top:6px;right:6px;z-index:1000;width:24px;height:24px;border-radius:6px;
  background:rgba(6,10,20,.55);color:rgba(53,240,255,.55);border:1px solid rgba(53,240,255,.2);
  cursor:pointer;font-size:12px;line-height:22px;padding:0;opacity:.5;transition:opacity .2s}
#devtab:hover{opacity:1}
#devpanel h3{color:#35f0ff;font-size:13px;margin:14px 0 6px;letter-spacing:.08em}
#devpanel .row{display:flex;align-items:center;gap:6px;margin:3px 0}
#devpanel .row label{flex:0 0 108px;color:#8fb8cc;font-size:11px;overflow:hidden;text-overflow:ellipsis}
#devpanel input[type=range]{flex:1;min-width:0;accent-color:#35f0ff}
#devpanel .val{flex:0 0 52px;text-align:right;color:#fff;font-size:11px}
#devpanel button{background:rgba(53,240,255,.12);border:1px solid rgba(53,240,255,.45);color:#cfe8ff;
  border-radius:6px;padding:5px 9px;cursor:pointer;font:11px ui-monospace,monospace;margin:2px}
#devpanel button:hover{background:rgba(53,240,255,.26)}
#devpanel button.on{background:#35f0ff;color:#03121a;font-weight:700}
#devpanel textarea{width:100%;height:150px;background:#020610;color:#7fe7ff;border:1px solid rgba(53,240,255,.3);
  border-radius:6px;font:10px ui-monospace,monospace;padding:6px;margin-top:6px}
#devpanel .fps{color:#9dff6b}
`;
    document.head.appendChild(css);

    this.tab = document.createElement('button');
    this.tab.id = 'devtab';
    this.tab.textContent = '⚙';
    this.tab.onclick = () => this.toggle();
    document.body.appendChild(this.tab);

    const el = document.createElement('div');
    el.id = 'devpanel';
    this.el = el;
    document.body.appendChild(el);

    el.innerHTML = `<h3>DEV 微調工具 <span class="fps" id="dvfps"></span></h3>
      <div id="dvmode"></div>
      <h3>LAYOUT 版面</h3><div id="dvlayout"></div>
      <h3>RULES 玩法</h3><div id="dvrules"></div>
      <h3>狀態測試</h3><div id="dvact"></div>
      <h3>匯出</h3><div id="dvexp"></div>
      <textarea id="dvout" readonly placeholder="按「匯出目前版面」產生 JSON"></textarea>`;

    // 版面模式切換
    const modeBox = el.querySelector('#dvmode');
    for (const m of ['PC', 'Mobile']) {
      const b = document.createElement('button');
      b.textContent = m;
      b.onclick = () => {
        this.mode = m;
        applyLayout(m === 'PC' ? LAYOUT_PC : LAYOUT_MOBILE);
        this.syncInputs();
        this.hooks.onLayoutChange?.();
        [...modeBox.children].forEach((c) => c.classList.toggle('on', c.textContent === m));
      };
      modeBox.appendChild(b);
    }
    modeBox.children[0].classList.add('on');

    this.inputs = {};
    const mk = (host, name, min, max, step, target) => {
      const row = document.createElement('div');
      row.className = 'row';
      const lb = document.createElement('label');
      lb.textContent = name;
      const r = document.createElement('input');
      r.type = 'range'; r.min = min; r.max = max; r.step = step;
      r.value = target[name];
      const v = document.createElement('span');
      v.className = 'val';
      v.textContent = fmt(target[name]);
      r.oninput = () => {
        const val = parseFloat(r.value);
        target[name] = val;
        // 版面同步寫回對應的 PC / Mobile 樣板
        if (target === LAYOUT) (this.mode === 'PC' ? LAYOUT_PC : LAYOUT_MOBILE)[name] = val;
        v.textContent = fmt(val);
        this.hooks.onLayoutChange?.();
      };
      row.append(lb, r, v);
      host.appendChild(row);
      this.inputs[name] = { r, v, target };
    };

    const lh = el.querySelector('#dvlayout');
    for (const [n, a, b, s] of LAYOUT_FIELDS) mk(lh, n, a, b, s, LAYOUT);
    const rh = el.querySelector('#dvrules');
    for (const [n, a, b, s] of RULE_FIELDS) mk(rh, n, a, b, s, RULES);

    // 狀態測試
    const act = el.querySelector('#dvact');
    const acts = [
      ['+50 球', () => this.hooks.addBalls?.(50)],
      ['+200 球', () => this.hooks.addBalls?.(200)],
      ['清空盤面', () => this.hooks.clearBoard?.()],
      ['直接過關', () => this.hooks.forceWin?.()],
      ['直接失敗', () => this.hooks.forceLose?.()],
      ['下一關', () => this.hooks.jump?.(+1)],
      ['上一關', () => this.hooks.jump?.(-1)],
      ['跳到 50', () => this.hooks.goto?.(50)],
      ['跳到 100', () => this.hooks.goto?.(100)],
      ['跳到 200', () => this.hooks.goto?.(200)],
      ['解鎖全部', () => this.hooks.unlockAll?.()],
      ['重置進度', () => this.hooks.resetAll?.()],
      ['壓力測試 500 球', () => this.hooks.stress?.(500)],
    ];
    for (const [t, fn] of acts) {
      const b = document.createElement('button');
      b.textContent = t; b.onclick = fn;
      act.appendChild(b);
    }

    // 匯出
    const exp = el.querySelector('#dvexp');
    const be = document.createElement('button');
    be.textContent = '💾 匯出目前版面';
    be.onclick = () => {
      const out = {
        LAYOUT_PC: pick(LAYOUT_PC), LAYOUT_MOBILE: pick(LAYOUT_MOBILE), RULES: pick(RULES),
      };
      el.querySelector('#dvout').value = JSON.stringify(out, null, 2);
      this.hooks.onExport?.(out);
    };
    const bc = document.createElement('button');
    bc.textContent = '📋 複製';
    bc.onclick = async () => {
      const ta = el.querySelector('#dvout');
      ta.select();
      try { await navigator.clipboard.writeText(ta.value); bc.textContent = '✓ 已複製'; }
      catch (e) { document.execCommand('copy'); bc.textContent = '✓ 已複製'; }
      setTimeout(() => { bc.textContent = '📋 複製'; }, 1200);
    };
    exp.append(be, bc);
  }

  syncInputs() {
    for (const [k, o] of Object.entries(this.inputs)) {
      if (o.target[k] === undefined) continue;
      o.r.value = o.target[k];
      o.v.textContent = fmt(o.target[k]);
    }
  }

  setFps(fps, balls) {
    const e = document.getElementById('dvfps');
    if (e) e.textContent = `${fps}fps / ${balls}球`;
  }
}

function fmt(v) { return Number.isInteger(v) ? String(v) : v.toFixed(2); }
function pick(o) { return JSON.parse(JSON.stringify(o)); }
