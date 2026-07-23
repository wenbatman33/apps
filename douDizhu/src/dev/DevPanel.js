// DEV 微调面板（按 D 开关）
// 直接改 window.LAYOUT 的数值并即时重绘，满意后按「汇出」拿到 JSON

(function () {
  const FIELDS = [
    { path: 'card.w', label: '卡片宽', min: 50, max: 180, step: 1 },
    { path: 'card.h', label: '卡片高', min: 70, max: 250, step: 1 },
    { path: 'card.radius', label: '圆角', min: 0, max: 30, step: 1 },
    { path: 'card.fontRank', label: '点数字级', min: 16, max: 60, step: 1 },
    { path: 'card.fontSuit', label: '花色字级', min: 14, max: 60, step: 1 },
    { path: 'card.fontCenter', label: '中央花色字级', min: 20, max: 90, step: 1 },
    { path: 'hand.y', label: '手牌 Y', min: 900, max: 1300, step: 2 },
    { path: 'hand.liftY', label: '选取上移', min: 0, max: 80, step: 1 },
    { path: 'hand.maxWidth', label: '手牌最大宽', min: 400, max: 740, step: 5 },
    { path: 'play.y', label: '出牌区 Y', min: 400, max: 900, step: 2 },
    { path: 'play.overlap', label: '出牌重叠', min: 0, max: 90, step: 1 },
    { path: 'play.scale', label: '出牌缩放', min: 0.5, max: 1.4, step: 0.02 },
    { path: 'play.maxWidth', label: '出牌区最大宽', min: 400, max: 740, step: 5 },
    { path: 'bottomCards.y', label: '底牌 Y', min: 120, max: 400, step: 2 },
    { path: 'bottomCards.scale', label: '底牌缩放', min: 0.3, max: 1, step: 0.02 },
    { path: 'bottomCards.gap', label: '底牌间距', min: 40, max: 120, step: 2 },
    { path: 'buttons.y', label: '按钮 Y', min: 1100, max: 1330, step: 2 },
    { path: 'buttons.w', label: '按钮宽', min: 120, max: 260, step: 2 },
    { path: 'buttons.h', label: '按钮高', min: 50, max: 130, step: 2 },
    { path: 'bidButtons.w', label: '叫分按钮宽', min: 100, max: 200, step: 2 },
    { path: 'hint.y', label: '提示文字 Y', min: 300, max: 1000, step: 2 },
    { path: 'ai.thinkMin', label: 'AI 最短思考(ms)', min: 0, max: 2000, step: 50 },
    { path: 'ai.thinkMax', label: 'AI 最长思考(ms)', min: 100, max: 3000, step: 50 },
    { path: 'ai.bidDelay', label: 'AI 叫分延迟(ms)', min: 100, max: 2000, step: 50 },
    { path: 'ai.playAnim', label: '出牌动画(ms)', min: 80, max: 800, step: 10 }
  ];

  function get(obj, path) {
    return path.split('.').reduce((o, k) => o[k], obj);
  }
  function set(obj, path, val) {
    const keys = path.split('.');
    const last = keys.pop();
    keys.reduce((o, k) => o[k], obj)[last] = val;
  }

  let el = null;
  let scene = null;

  function build() {
    el = document.createElement('div');
    el.id = 'dev-panel';
    el.innerHTML = `
      <div class="dev-head">
        <span>DEV 微调</span>
        <button id="dev-close">✕</button>
      </div>
      <div class="dev-rows"></div>
      <div class="dev-foot">
        <button id="dev-export">💾 汇出 JSON</button>
        <button id="dev-reset">↺ 还原</button>
      </div>
      <textarea id="dev-out" readonly placeholder="汇出结果会出现在这里"></textarea>
    `;
    document.body.appendChild(el);

    const rows = el.querySelector('.dev-rows');
    FIELDS.forEach(f => {
      const row = document.createElement('div');
      row.className = 'dev-row';
      const val = get(window.LAYOUT, f.path);
      row.innerHTML = `
        <label>${f.label}</label>
        <input type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${val}">
        <span class="dev-val">${val}</span>
      `;
      const slider = row.querySelector('input');
      const out = row.querySelector('.dev-val');
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        set(window.LAYOUT, f.path, v);
        out.textContent = v;
        apply();
      });
      rows.appendChild(row);
    });

    el.querySelector('#dev-close').onclick = () => toggle(scene);
    el.querySelector('#dev-export').onclick = () => {
      el.querySelector('#dev-out').value = JSON.stringify(window.LAYOUT, null, 2);
    };
    el.querySelector('#dev-reset').onclick = () => {
      window.LAYOUT = JSON.parse(JSON.stringify(window.LAYOUT_MOBILE));
      el.remove(); el = null;
      build();
      apply();
    };
  }

  // 即时套用：重启目前场景让所有元件用新数值重绘
  let pending = null;
  function apply() {
    if (!scene) return;
    clearTimeout(pending);
    pending = setTimeout(() => {
      if (scene.relayout) scene.relayout();
      else scene.scene.restart();
    }, 120);
  }

  function toggle(s) {
    scene = s || scene;
    if (!el) build();
    el.classList.toggle('open');
  }

  window.DevPanel = { toggle };
})();
