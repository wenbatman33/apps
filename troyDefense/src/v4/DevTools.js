// v4 DEV 微調工具（DOM 面板）：按 D 或暫停選單開啟
// 功能：即時參數滑桿、狀態強制觸發、LAYOUT 拖曳模式、💾 匯出 JSON
const DevV4 = {
  scene: null, el: null, dragMode: false, dragHandles: [],

  attach(scene) { this.scene = scene; },

  toggle() {
    if (this.el) { this.close(); return; }
    const el = document.createElement('div');
    el.id = 'dev-v4';
    el.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;background:rgba(20,16,10,.94);' +
      'color:#EDE0C8;font:13px/1.6 sans-serif;padding:12px 14px;border:1px solid #6a5432;border-radius:10px;' +
      'width:250px;max-height:92vh;overflow:auto';
    el.innerHTML = `
      <b style="color:#FFB020">🛠 DEV v4</b> <span id="dv-close" style="float:right;cursor:pointer">✕</span>
      <hr style="border-color:#4a3a22">
      ${this.slider('speedMult', '敵人速度', 0.2, 3)}
      ${this.slider('intervalMult', '出怪間隔', 0.2, 3)}
      ${this.slider('particleMult', '粒子倍率', 0, 3)}
      ${this.slider('shakeMult', '震屏倍率', 0, 3)}
      <hr style="border-color:#4a3a22">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <button data-act="bp">+30 戰鬥點數</button>
        <button data-act="killwave">清空本波</button>
        <button data-act="gate20">城門 −20%</button>
        <button data-act="gatefull">城門全滿</button>
        <button data-act="win">觸發勝利</button>
        <button data-act="lose">觸發敗北</button>
      </div>
      <hr style="border-color:#4a3a22">
      <label style="display:block;margin:4px 0"><input type="checkbox" id="dv-drag"> LAYOUT 拖曳模式（垛位/技能鈕/門）</label>
      <button data-act="export" style="width:100%;margin-top:6px">💾 匯出 LAYOUT JSON</button>
      <textarea id="dv-out" style="width:100%;height:110px;margin-top:6px;background:#111;color:#9f9;border:1px solid #444;font-size:11px"></textarea>`;
    document.body.appendChild(el);
    el.querySelectorAll('button').forEach(b => b.style.cssText += 'background:#3a2e1a;color:#EDE0C8;border:1px solid #6a5432;border-radius:6px;padding:5px;cursor:pointer;font-size:12px');
    el.querySelector('#dv-close').onclick = () => this.close();
    el.querySelectorAll('input[type=range]').forEach(r => {
      r.oninput = () => {
        window.DEV_V4[r.dataset.key] = parseFloat(r.value);
        el.querySelector('#dv-val-' + r.dataset.key).textContent = r.value;
      };
    });
    el.querySelector('#dv-drag').onchange = e => this.setDragMode(e.target.checked);
    el.onclick = e => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act) this.doAction(act);
    };
    this.el = el;
  },

  slider(key, label, min, max) {
    const v = window.DEV_V4[key];
    return `<div>${label} <span id="dv-val-${key}" style="color:#FFB020">${v}</span>
      <input type="range" data-key="${key}" min="${min}" max="${max}" step="0.1" value="${v}" style="width:100%"></div>`;
  },

  doAction(act) {
    const sc = this.scene;
    if (!sc || !sc.scene || !sc.scene.isActive()) { this.log('（需在戰鬥場景）'); return; }
    switch (act) {
      case 'bp': sc.bp += 30; sc.updateBp(); sc.tryDraft(); break;
      case 'killwave': sc.enemies.forEach(e => e.takeDamage(999999)); sc.spawnQueue = []; break;
      case 'gate20': sc.gate.damage(sc.gate.maxHp * 0.2); break;
      case 'gatefull': sc.gate.hp = sc.gate.maxHp; sc.gate.refresh(); break;
      case 'win': sc.onVictory(); break;
      case 'lose': sc.gate.damage(999999); break;
      case 'export': this.exportLayout(); break;
    }
  },

  setDragMode(on) {
    const sc = this.scene;
    this.dragMode = on;
    this.dragHandles.forEach(h => h.destroy());
    this.dragHandles = [];
    if (!on || !sc) return;
    const mk = (x, y, label, onDrag) => {
      const c = sc.add.circle(x, y, 30, 0x00ff88, 0.35).setStrokeStyle(3, 0x00ff88).setDepth(2000).setInteractive({ draggable: true });
      const t = sc.add.text(x, y - 44, label, { fontSize: '20px', color: '#00ff88' }).setOrigin(0.5).setDepth(2000);
      c.on('drag', (p, dx, dy) => { c.setPosition(dx, dy); t.setPosition(dx, dy - 44); onDrag(Math.round(dx), Math.round(dy)); });
      this.dragHandles.push(c, t);
    };
    LAYOUT_V4.slots.forEach((s, i) => mk(s.x, s.y, '垛' + (i + 1), (x, y) => {
      s.x = x; s.y = y;
      if (sc.units[i]) { sc.units[i].sprite.setPosition(x, y); sc.units[i].badge.setPosition(x + 34, y - 44); }
      sc.slotHints[i].setPosition(x, y);
    }));
    LAYOUT_V4.skills.forEach((s, i) => mk(s.x, s.y, '技' + (i + 1), (x, y) => {
      s.x = x; s.y = y;
      const b = sc.skills.buttons[i];
      b.ring.setPosition(x, y); b.face.setPosition(x, y); b.txt.setPosition(x, y); b.p.x = x; b.p.y = y;
    }));
    mk(LAYOUT_V4.gate.x, LAYOUT_V4.gate.y, '城門', (x, y) => { LAYOUT_V4.gate.x = x; LAYOUT_V4.gate.y = y; });
    mk(LAYOUT_V4.gateHpBar.x, LAYOUT_V4.gateHpBar.y, '門血條', (x, y) => {
      LAYOUT_V4.gateHpBar.x = x; LAYOUT_V4.gateHpBar.y = y;
      sc.gate.barBg.setPosition(x, y);
      sc.gate.barFg.setPosition(x - LAYOUT_V4.gateHpBar.w / 2 + 3, y);
      sc.gate.barTxt.setPosition(x, y - 26);
    });
  },

  exportLayout() {
    const out = JSON.stringify(LAYOUT_V4, null, 1);
    this.el.querySelector('#dv-out').value = out;
    console.log('[DEV_V4 LAYOUT]', out);
  },

  log(msg) { if (this.el) this.el.querySelector('#dv-out').value = msg; },

  close() {
    this.setDragMode(false);
    if (this.el) { this.el.remove(); this.el = null; }
  },
};
window.DevV4 = DevV4;
window.addEventListener('keydown', e => { if (e.key === 'd' || e.key === 'D') DevV4.toggle(); });
