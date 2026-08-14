/* ============================================================
 * DEV 版面微調工具（按 D 開關 / 右下角齒輪）
 * 依專案準則：所有 LAYOUT 變數可即時拖拉調整並匯出 JSON
 * ============================================================ */
(function (H) {
  'use strict';

  var panel = null, sc = null, open = false, handles = [];

  var FIELDS = [
    { g: '場地 Arena', p: 'arena', k: 'x', min: 0, max: 200 },
    { g: '場地 Arena', p: 'arena', k: 'y', min: 100, max: 500 },
    { g: '場地 Arena', p: 'arena', k: 'w', min: 300, max: 720 },
    { g: '場地 Arena', p: 'arena', k: 'h', min: 300, max: 1100 },

    { g: 'HUD', p: 'hud', k: 'barX', min: 0, max: 720 },
    { g: 'HUD', p: 'hud', k: 'barY', min: 0, max: 300 },
    { g: 'HUD', p: 'hud', k: 'barW', min: 200, max: 700 },
    { g: 'HUD', p: 'hud', k: 'barH', min: 12, max: 80 },
    { g: 'HUD', p: 'hud', k: 'lvTextX', min: 0, max: 720 },
    { g: 'HUD', p: 'hud', k: 'lvTextY', min: 0, max: 300 },
    { g: 'HUD', p: 'hud', k: 'lvTextSize', min: 12, max: 48 },
    { g: 'HUD', p: 'hud', k: 'waveX', min: 0, max: 720 },
    { g: 'HUD', p: 'hud', k: 'waveY', min: 0, max: 300 },
    { g: 'HUD', p: 'hud', k: 'coinX', min: 0, max: 720 },
    { g: 'HUD', p: 'hud', k: 'coinY', min: 0, max: 300 },

    { g: '虛擬搖桿', p: 'joystick', k: 'baseX', min: 0, max: 720 },
    { g: '虛擬搖桿', p: 'joystick', k: 'baseY', min: 600, max: 1280 },
    { g: '虛擬搖桿', p: 'joystick', k: 'baseR', min: 50, max: 200 },
    { g: '虛擬搖桿', p: 'joystick', k: 'knobR', min: 20, max: 110 },
    { g: '虛擬搖桿', p: 'joystick', k: 'idleAlpha', min: 0, max: 1, step: 0.02 },
    { g: '虛擬搖桿', p: 'joystick', k: 'activeAlpha', min: 0, max: 1, step: 0.02 },
    { g: '虛擬搖桿', p: 'joystick', k: 'deadzone', min: 0, max: 0.5, step: 0.01 },
    { g: '虛擬搖桿', p: 'joystick', k: 'followMax', min: 0, max: 200 },

    { g: '功能鍵', p: 'buttons', k: 'skillX', min: 0, max: 720 },
    { g: '功能鍵', p: 'buttons', k: 'skillY', min: 600, max: 1280 },
    { g: '功能鍵', p: 'buttons', k: 'skillR', min: 30, max: 140 },
  ];

  var PFIELDS = [
    { k: 'speed', min: 100, max: 700 },
    { k: 'fireRate', min: 80, max: 1000 },
    { k: 'damage', min: 1, max: 100 },
    { k: 'bulletSpeed', min: 200, max: 2000 },
    { k: 'range', min: 200, max: 900 },
    { k: 'hp', min: 20, max: 600 },
    { k: 'stopFireDelay', min: 0, max: 400 },
    { k: 'spriteSize', min: 60, max: 220 },
    { k: 'muzzleX', min: -0.6, max: 0.8, step: 0.002 },
    { k: 'muzzleY', min: -0.4, max: 0.4, step: 0.002 },
  ];

  function el(tag, css, txt) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }

  function build() {
    panel = el('div', [
      'position:fixed;right:8px;top:8px;bottom:8px;width:330px;z-index:99999',
      'background:rgba(16,19,26,.94);border:2px solid #ff6b3d;border-radius:12px',
      'font:12px/1.5 -apple-system,"Noto Sans TC",sans-serif;color:#dfe5ee',
      'overflow-y:auto;padding:10px;box-shadow:0 8px 40px rgba(0,0,0,.6)'
    ].join(';'));

    var head = el('div', 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px');
    head.appendChild(el('b', 'color:#ff6b3d;font-size:14px', '🔧 DEV 版面微調'));
    var close = el('button', 'background:#3a414f;color:#fff;border:0;border-radius:6px;padding:4px 10px;cursor:pointer', '✕');
    close.onclick = function () { H.Dev.toggle(sc); };
    head.appendChild(close);
    panel.appendChild(head);

    // 快捷操作
    var act = el('div', 'display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px');
    [
      ['無敵', function () { sc.devGod = !sc.devGod; sc.invulnUntil = sc.devGod ? Number.MAX_SAFE_INTEGER : 0; }],
      ['殺光敵人', function () { sc.enemies.children.each(function (e) { if (e.active && !e.dying) H.Combat.damageEnemy(sc, e, 99999, {}); }); }],
      ['生 BOSS', function () { sc.spawnEnemy(sc.lv.theme.bosses[0], sc.player.x + 200, sc.player.y - 200, true); }],
      ['隨機技能', function () { var s = H.rollSkills(sc.stats, 1)[0]; s.apply(sc.stats); sc.stats.taken[s.id] = (sc.stats.taken[s.id] || 0) + 1; sc.refreshSkillIcons(); sc.syncDrones(); }],
      ['直接過關', function () { sc.levelClear(); }],
      ['物理框線', function () { sc.physics.world.drawDebug = !sc.physics.world.drawDebug; if (!sc.physics.world.debugGraphic) sc.physics.world.createDebugGraphic(); sc.physics.world.debugGraphic.visible = sc.physics.world.drawDebug; }],
      ['拖曳模式', function () { toggleHandles(); }],
    ].forEach(function (a) {
      var b = el('button', 'background:#2f3d5c;color:#fff;border:0;border-radius:6px;padding:5px 9px;cursor:pointer;font-size:11px', a[0]);
      b.onclick = a[1];
      act.appendChild(b);
    });
    panel.appendChild(act);

    // LAYOUT 滑桿
    var lastG = '';
    FIELDS.forEach(function (f) {
      if (f.g !== lastG) { lastG = f.g; panel.appendChild(el('div', 'color:#ffd23d;margin:8px 0 3px;font-weight:700', f.g)); }
      panel.appendChild(slider(H.LAYOUT[f.p], f.k, f.min, f.max, f.step || 1, applyLayout));
    });

    panel.appendChild(el('div', 'color:#ffd23d;margin:10px 0 3px;font-weight:700', '玩家數值（本場即時）'));
    PFIELDS.forEach(function (f) {
      panel.appendChild(slider(H.PLAYER, f.k, f.min, f.max, f.step || 1, function () {
        // 同步到當前戰鬥狀態
        if (!sc || !sc.stats) return;
        sc.stats.speed = H.PLAYER.speed;
        sc.stats.fireRate = H.PLAYER.fireRate;
        sc.stats.damage = H.PLAYER.damage;
        sc.stats.bulletSpeed = H.PLAYER.bulletSpeed;
        sc.stats.range = H.PLAYER.range;
      }));
    });

    // 匯出
    var exp = el('button', 'width:100%;margin:12px 0 4px;background:#ff6b3d;color:#12141a;border:0;border-radius:8px;padding:10px;font-weight:700;cursor:pointer', '💾 匯出 LAYOUT JSON');
    exp.onclick = function () {
      var out = JSON.stringify({ LAYOUT: H.LAYOUT, PLAYER: H.PLAYER }, null, 2);
      console.log('%c[HABBY LAYOUT EXPORT]', 'color:#ff6b3d;font-weight:700');
      console.log(out);
      try {
        navigator.clipboard.writeText(out);
        exp.textContent = '✅ 已複製到剪貼簿（也在 Console）';
        setTimeout(function () { exp.textContent = '💾 匯出 LAYOUT JSON'; }, 1800);
      } catch (e) { exp.textContent = '已輸出到 Console'; }
    };
    panel.appendChild(exp);

    var tip = el('div', 'color:#8b95a6;font-size:11px;margin-top:6px',
      '調整後按「匯出」→ 把 JSON 貼給 Claude，即可 baked 進原始碼。ESC 暫停、D 開關本面板。');
    panel.appendChild(tip);

    document.body.appendChild(panel);
  }

  function slider(obj, key, min, max, step, onChange) {
    var row = el('div', 'display:flex;align-items:center;gap:6px;margin:2px 0');
    row.appendChild(el('span', 'width:88px;color:#a9b3c2;font-size:11px', key));
    var r = el('input', 'flex:1');
    r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = obj[key];
    var v = el('input', 'width:52px;background:#232b36;color:#fff;border:1px solid #3a414f;border-radius:4px;font-size:11px;padding:2px');
    v.value = obj[key];
    r.oninput = function () { obj[key] = parseFloat(r.value); v.value = obj[key]; onChange && onChange(); };
    v.onchange = function () { obj[key] = parseFloat(v.value); r.value = obj[key]; onChange && onChange(); };
    row.appendChild(r); row.appendChild(v);
    return row;
  }

  function applyLayout() {
    if (sc && sc.applyLayout) sc.applyLayout();
    syncHandles();
  }

  // ---- 畫面內拖曳把手 ----
  function toggleHandles() {
    if (handles.length) { clearHandles(); return; }
    if (!sc) return;
    var A = H.LAYOUT.arena, J = H.LAYOUT.joystick, U = H.LAYOUT.hud;
    mkHandle('場地', A.x + A.w / 2, A.y + A.h / 2, function (x, y) {
      A.x = Math.round(x - A.w / 2); A.y = Math.round(y - A.h / 2); applyLayout();
    });
    mkHandle('搖桿', J.baseX, J.baseY, function (x, y) {
      J.baseX = Math.round(x); J.baseY = Math.round(y); applyLayout();
    });
    mkHandle('血條', U.barX, U.barY, function (x, y) {
      U.barX = Math.round(x); U.barY = Math.round(y); applyLayout();
    });
  }

  function mkHandle(name, x, y, onMove) {
    var c = sc.add.container(x, y).setDepth(99999);
    var box = sc.add.rectangle(0, 0, 74, 40, 0xff6b3d, 0.75).setStrokeStyle(3, 0xffffff, 1);
    var t = sc.add.text(0, 0, name, { fontFamily: 'sans-serif', fontSize: '15px', color: '#12141a' }).setOrigin(0.5);
    c.add([box, t]);
    c.setSize(74, 40).setInteractive({ draggable: true, useHandCursor: true });
    sc.input.setDraggable(c);
    c.on('drag', function (p, dx, dy) { c.setPosition(dx, dy); onMove(dx, dy); });
    c.handleName = name;
    handles.push(c);
  }

  function syncHandles() {
    if (!handles.length || !sc) return;
    var A = H.LAYOUT.arena, J = H.LAYOUT.joystick, U = H.LAYOUT.hud;
    handles.forEach(function (h) {
      if (h.handleName === '場地') h.setPosition(A.x + A.w / 2, A.y + A.h / 2);
      if (h.handleName === '搖桿') h.setPosition(J.baseX, J.baseY);
      if (h.handleName === '血條') h.setPosition(U.barX, U.barY);
    });
  }

  function clearHandles() {
    handles.forEach(function (h) { h.destroy(); });
    handles = [];
  }

  H.Dev = {
    toggle: function (scene) {
      sc = scene;
      open = !open;
      if (open) { if (!panel) build(); panel.style.display = 'block'; }
      else { if (panel) panel.style.display = 'none'; clearHandles(); }
    },
    detach: function () {
      clearHandles();
      if (panel) panel.style.display = 'none';
      open = false;
    },
    isOpen: function () { return open; },
  };
})(window.HABBY);
