// DEV 微調面板：D 鍵或右下角 ⚙ 開啟
// - 滑桿即時調整 LAYOUT 所有數值
// - 拖曳模式：直接拖畫面元件
// - 💾 匯出：目前 LAYOUT JSON（複製到剪貼簿）
const DevPanel = {
  scene: null,
  el: null,
  visible: false,
  dragMode: false,

  attach(scene) {
    this.scene = scene;
    if (!this._keyBound) {
      this._keyBound = true;
      window.addEventListener('keydown', (e) => {
        if (e.key === 'd' || e.key === 'D') {
          const tag = (document.activeElement && document.activeElement.tagName) || '';
          if (tag !== 'INPUT' && tag !== 'TEXTAREA') this.toggle();
        }
      });
      this._makeGear();
    }
  },

  _makeGear() {
    const g = document.createElement('div');
    g.textContent = '⚙';
    Object.assign(g.style, {
      position: 'fixed', right: '10px', bottom: '10px', zIndex: 9999,
      fontSize: '22px', opacity: 0.35, cursor: 'pointer', userSelect: 'none',
    });
    g.onclick = () => this.toggle();
    document.body.appendChild(g);
  },

  toggle() {
    this.visible = !this.visible;
    if (this.visible) this._build();
    else if (this.el) { this.el.remove(); this.el = null; this._setDrag(false); }
  },

  _build() {
    if (this.el) this.el.remove();
    const el = document.createElement('div');
    this.el = el;
    Object.assign(el.style, {
      position: 'fixed', top: '0', right: '0', width: '300px', height: '100%',
      background: 'rgba(8,20,16,0.94)', color: '#cde', zIndex: 9998,
      overflowY: 'auto', font: '12px/1.5 monospace', padding: '10px', boxSizing: 'border-box',
    });

    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <b style="color:#e8c766">DEV 微調面板</b>
      <span id="dev-close" style="cursor:pointer;font-size:16px">✕</span></div>`;
    el.querySelector('#dev-close').onclick = () => this.toggle();

    // 工具列
    const bar = document.createElement('div');
    bar.style.margin = '8px 0';
    const mkBtn = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      Object.assign(b.style, { margin: '2px', padding: '4px 8px', background: '#1d4a3a', color: '#fff', border: '1px solid #3a6a5a', borderRadius: '4px', cursor: 'pointer', font: '12px monospace' });
      b.onclick = fn;
      bar.appendChild(b);
      return b;
    };
    const dragBtn = mkBtn('🖐 拖曳模式：關', () => {
      this._setDrag(!this.dragMode);
      dragBtn.textContent = `🖐 拖曳模式：${this.dragMode ? '開' : '關'}`;
      dragBtn.style.background = this.dragMode ? '#7a5c10' : '#1d4a3a';
    });
    mkBtn('💾 匯出 LAYOUT', () => this._export());
    mkBtn('🎉 測試橫幅', () => this.scene._flashBanner && this.scene._flashBanner('測試 BIG WIN！', '#8fe0b0'));
    mkBtn('🔇 音效開關', () => { Sound.enabled = !Sound.enabled; });
    el.appendChild(bar);

    // 匯出結果框
    const out = document.createElement('textarea');
    out.id = 'dev-export';
    Object.assign(out.style, { width: '100%', height: '80px', display: 'none', background: '#08110d', color: '#8fe0b0', border: '1px solid #3a6a5a', font: '10px monospace' });
    el.appendChild(out);

    // 遞迴生成滑桿
    const walk = (obj, path) => {
      for (const key of Object.keys(obj)) {
        const v = obj[key];
        const p = path ? `${path}.${key}` : key;
        if (typeof v === 'number') el.appendChild(this._sliderRow(p, v, (nv) => { obj[key] = nv; this._apply(); }));
        else if (Array.isArray(v)) {
          v.forEach((av, i) => {
            if (typeof av === 'number') el.appendChild(this._sliderRow(`${p}[${i}]`, av, (nv) => { v[i] = nv; this._apply(); }));
          });
        } else if (typeof v === 'object' && v) {
          const h = document.createElement('div');
          h.textContent = `▸ ${p}`;
          Object.assign(h.style, { color: '#e8c766', marginTop: '8px', borderBottom: '1px solid #2a4a3e' });
          el.appendChild(h);
          walk(v, p);
        }
      }
    };
    walk(LAYOUT, '');
    document.body.appendChild(el);
  },

  _sliderRow(label, value, onChange) {
    const row = document.createElement('div');
    row.style.margin = '2px 0';
    const isScale = Math.abs(value) <= 3 && !Number.isInteger(value * 1) || (Math.abs(value) <= 3 && String(label).includes('cale'));
    const max = isScale ? 3 : value <= 60 ? 160 : value <= 400 ? 800 : 3200;
    const step = isScale ? 0.01 : 1;
    row.innerHTML = `<span style="display:inline-block;width:150px;overflow:hidden;white-space:nowrap" title="${label}">${label}</span>`;
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min: 0, max, step, value });
    input.style.width = '90px';
    input.style.verticalAlign = 'middle';
    const num = document.createElement('span');
    num.textContent = value;
    num.style.marginLeft = '4px';
    input.oninput = () => { const nv = parseFloat(input.value); num.textContent = nv; onChange(nv); };
    row.appendChild(input);
    row.appendChild(num);
    return row;
  },

  _apply() {
    if (this.scene && this.scene.applyLayout) this.scene.applyLayout();
  },

  // ===== 拖曳模式 =====
  _dragTargets() {
    const s = this.scene;
    if (!s || !s.seats) return [];
    const L = LAYOUT;
    const t = [];
    for (let i = 1; i < s.seats.length; i++) {
      t.push({ obj: s.seats[i].avatar, size: L.opp.avatarR * 2, set: (x, y) => { L.opp.xs[i - 1] = x; L.opp.y = y; } });
    }
    t.push({ obj: s.seats[0].avatar, size: L.player.avatarR * 2, set: (x, y) => { L.player.avatarX = x; L.player.avatarY = y; } });
    t.push({ obj: s.seats[0].cards[0], set: (x, y) => { L.player.cardsX = x + L.player.cardGap / 2 - 56; L.player.cardsY = y; } });
    t.push({ obj: s.commCards[2], set: (x, y) => { L.community.x = x; L.community.y = y; } });
    t.push({ obj: s.potC, size: 60, set: (x, y) => { L.pot.x = x; L.pot.y = y; } });
    s.controls.forEach((c, i) => t.push({ obj: c, size: 90, set: (x, y) => { L.buttons.xs[i] = x; L.buttons.y = y; } }));
    t.push({ obj: s.bannerC, size: 80, set: (x, y) => { L.banner.y = y; } });
    return t;
  },

  _setDrag(on) {
    this.dragMode = on;
    const s = this.scene;
    if (!s) return;
    for (const t of this._dragTargets()) {
      const o = t.obj;
      if (on) {
        if (!o.input) {
          if (o.setSize && t.size) o.setSize(t.size, t.size);
          try { o.setInteractive(); } catch (e) { continue; }
        }
        s.input.setDraggable(o, true);
        if (!o._devDragBound) {
          o._devDragBound = true;
          o.on('drag', (ptr, dx, dy) => { if (this.dragMode) o.setPosition(Math.round(dx), Math.round(dy)); });
          o.on('dragend', () => {
            if (!this.dragMode) return;
            t.set(Math.round(o.x), Math.round(o.y));
            this._apply();
            if (this.visible) this._build(); // 重新整理滑桿數值
          });
        }
      } else if (o.input) {
        s.input.setDraggable(o, false);
      }
    }
  },

  _export() {
    const json = JSON.stringify(LAYOUT, null, 2);
    const out = this.el.querySelector('#dev-export');
    out.style.display = 'block';
    out.value = json;
    if (navigator.clipboard) navigator.clipboard.writeText(json).catch(() => {});
    console.log('=== LAYOUT 匯出 ===\n' + json);
  },
};
