/* DEV 微調工具（全 Phaser 繪製，手機也能用）
 * 按 D 或右下角齒輪開啟。滑桿即時生效、可直接拖曳元件、可匯出 JSON。
 */
window.TD = window.TD || {};

TD.DevTools = class DevTools {
  constructor(scene) {
    this.s = scene;
    this.open = false;
    this.tab = 'layout';
    this.mode = 'mobile';
    this.buildToggle();
  }

  // ── 右下角小齒輪 ──
  buildToggle() {
    const s = this.s;
    this.gear = s.add.container(TD.GAME_W - 52, TD.GAME_H - 52).setDepth(TD.DEPTH.DEV);
    const g = s.add.graphics();
    g.fillStyle(0x000000, 0.55).fillCircle(0, 0, 40);
    g.lineStyle(3, 0xC98B4B, 0.9).strokeCircle(0, 0, 40);
    const t = s.add.text(0, 0, '⚙', { fontSize: '38px' }).setOrigin(0.5);
    this.gear.add([g, t]);
    this.gear.setSize(80, 80).setInteractive({ useHandCursor: true });
    this.gear.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.toggle(); });
    this.gear.setAlpha(0.35);
  }

  toggle() { this.open ? this.close() : this.show(); }

  close() {
    this.open = false;
    if (this.panel) { this.panel.destroy(true); this.panel = null; }
    this.gear.setAlpha(0.35);
    this.setDragMode(false);
  }

  show() {
    this.open = true;
    this.gear.setAlpha(1);
    this.render();
  }

  // ── 可調項目 ──
  specs() {
    return {
      layout: [
        ['戰場 Y', 'battle.y', 0, 500, 1],
        ['戰場高', 'battle.h', 600, 1400, 1],
        ['網格欄數', 'grid.cols', 5, 13, 1],
        ['網格列數', 'grid.rows', 5, 13, 1],
        ['城門所在欄', 'grid.exitCol', 0, 12, 1],
        ['合成台 X', 'bench.x', 0, 400, 1],
        ['合成台 Y', 'bench.y', 900, 1750, 1],
        ['格子大小', 'bench.cell', 90, 280, 1],
        ['格子間距', 'bench.gap', 0, 50, 1],
        ['合成台欄數', 'bench.cols', 3, 7, 1],
        ['合成台列數', 'bench.rows', 1, 4, 1],
        ['立繪縮放', 'unit.imgScale', 0.4, 1.4, 0.02],
        ['戰場塔放大', 'unit.fieldScale', 0.6, 1.8, 0.02],
        ['立繪 Y 偏移', 'unit.yOffset', -60, 60, 1],
        ['徽章大小', 'unit.badgeSize', 14, 54, 1],
        ['底部列 Y', 'bottom.y', 1600, 1900, 1],
        ['徵兵鈕寬', 'bottom.recruitW', 200, 620, 1],
        ['HUD 高', 'hud.h', 100, 320, 1],
        ['計時字級', 'hud.timerSize', 30, 120, 1],
        ['血條 Y', 'hud.hpBarY', 60, 200, 1],
      ],
      tune: [
        ['成長倍率', '@GROWTH', 1.2, 2.6, 0.02],
        ['徵兵基價', '@RECRUIT_BASE', 10, 200, 1],
        ['徵兵漲幅', '@RECRUIT_STEP', 0, 40, 1],
        ['敵人血量倍率', '#hpScale', 0.2, 4, 0.05],
        ['敵人體型倍率', '#enemyScale', 0.4, 2.2, 0.05],
      ],
    };
  }

  getVal(path) {
    if (path[0] === '@') return TD[path.slice(1)];
    if (path[0] === '#') return this.s[path.slice(1)];
    const p = path.split('.');
    return TD.LAYOUT[p[0]][p[1]];
  }

  setVal(path, v) {
    if (path[0] === '@') { TD[path.slice(1)] = v; return; }
    if (path[0] === '#') { this.s[path.slice(1)] = v; return; }
    const p = path.split('.');
    TD.LAYOUT[p[0]][p[1]] = v;
    if (p[0] === 'grid') this.s.scene.restart({ level: this.s.levelId, heroes: this.s.heroKeys });
    else this.s.relayout();
  }

  // ── 繪製面板 ──
  render() {
    if (this.panel) this.panel.destroy(true);
    const s = this.s;
    const W = 700, X = TD.GAME_W - W, H = TD.GAME_H;
    const c = s.add.container(0, 0).setDepth(TD.DEPTH.DEV);
    this.panel = c;

    const bg = s.add.graphics();
    bg.fillStyle(0x3A2416, 0.94).fillRect(X, 0, W, H);
    bg.lineStyle(3, 0xC98B4B, 1).lineBetween(X, 0, X, H);
    c.add(bg);
    // 吃掉點擊，避免穿透到遊戲
    const blocker = s.add.zone(X + W / 2, H / 2, W, H).setInteractive();
    c.add(blocker);

    c.add(s.add.text(X + 24, 22, 'DEV 微調工具', {
      fontFamily: TD.FONT, fontSize: '34px', color: '#FFC72C',
    }));
    const closeZ = s.add.text(TD.GAME_W - 44, 20, '✕', {
      fontFamily: TD.FONT, fontSize: '38px', color: '#FFF6E0',
    }).setInteractive({ useHandCursor: true });
    closeZ.on('pointerdown', () => this.close());
    c.add(closeZ);

    // 分頁
    const tabs = [['layout', '版面'], ['tune', '數值'], ['state', '狀態'], ['io', '匯出']];
    tabs.forEach(([k, label], i) => {
      const bx = X + 24 + i * 165, by = 78;
      const on = this.tab === k;
      const g = s.add.graphics();
      g.fillStyle(on ? 0xFFC72C : 0x8B5A2B, 1).fillRoundedRect(bx, by, 150, 56, 10);
      const t = s.add.text(bx + 75, by + 28, label, {
        fontFamily: TD.FONT, fontSize: '28px', color: on ? '#5E3A18' : '#C9A87C',
      }).setOrigin(0.5);
      const z = s.add.zone(bx + 75, by + 28, 150, 56).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { this.tab = k; this.render(); });
      c.add([g, t, z]);
    });

    // PC / Mobile 切換
    ['mobile', 'pc'].forEach((m, i) => {
      const bx = X + 24 + i * 120, by = 150;
      const on = this.mode === m;
      const g = s.add.graphics();
      g.fillStyle(on ? 0xC98B4B : 0x5E3A18, 1).fillRoundedRect(bx, by, 110, 44, 8);
      const t = s.add.text(bx + 55, by + 22, m === 'pc' ? 'PC' : 'Mobile', {
        fontFamily: TD.FONT, fontSize: '22px', color: on ? '#FFF6E0' : '#A6743C',
      }).setOrigin(0.5);
      const z = s.add.zone(bx + 55, by + 22, 110, 44).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { this.mode = m; this.render(); });
      c.add([g, t, z]);
    });

    // 拖曳模式
    const dragOn = !!this._dragMode;
    const dg = s.add.graphics();
    dg.fillStyle(dragOn ? 0xFF8A3C : 0x5E3A18, 1).fillRoundedRect(X + 280, 150, 200, 44, 8);
    const dt = s.add.text(X + 380, 172, dragOn ? '拖曳中 ✓' : '拖曳元件', {
      fontFamily: TD.FONT, fontSize: '22px', color: dragOn ? '#FFF' : '#C9A87C',
    }).setOrigin(0.5);
    const dz = s.add.zone(X + 380, 172, 200, 44).setInteractive({ useHandCursor: true });
    dz.on('pointerdown', () => { this.setDragMode(!this._dragMode); this.render(); });
    c.add([dg, dt, dz]);

    if (this.tab === 'io') this.renderIO(c, X, W);
    else if (this.tab === 'state') this.renderState(c, X, W);
    else this.renderSliders(c, X, W, this.specs()[this.tab]);
  }

  renderSliders(c, X, W, list) {
    const s = this.s;
    let y = 220;
    const rowH = 74;
    list.forEach(([label, path, min, max, step]) => {
      if (y > TD.GAME_H - 60) return;
      const v = this.getVal(path);
      c.add(s.add.text(X + 24, y, label, {
        fontFamily: TD.FONT, fontSize: '24px', color: '#FFF6E0',
      }));
      const valT = s.add.text(X + W - 24, y, this.fmt(v, step), {
        fontFamily: TD.FONT, fontSize: '24px', color: '#FFC72C',
      }).setOrigin(1, 0);
      c.add(valT);

      const tx = X + 24, tw = W - 48, ty = y + 42;
      const bar = s.add.graphics();
      const redraw = (val) => {
        const k = (val - min) / (max - min);
        bar.clear();
        bar.fillStyle(0x8B5A2B, 1).fillRoundedRect(tx, ty - 7, tw, 14, 7);
        bar.fillStyle(0xFF8A3C, 1).fillRoundedRect(tx, ty - 7, tw * k, 14, 7);
        bar.fillStyle(0xFFC72C, 1).fillCircle(tx + tw * k, ty, 17);
        bar.lineStyle(3, 0x5E3A18, 1).strokeCircle(tx + tw * k, ty, 17);
      };
      redraw(v);
      c.add(bar);

      const z = s.add.zone(tx + tw / 2, ty, tw, 54).setInteractive({ useHandCursor: true, draggable: true });
      const apply = (px) => {
        const k = Phaser.Math.Clamp((px - tx) / tw, 0, 1);
        let val = min + k * (max - min);
        val = Math.round(val / step) * step;
        val = +val.toFixed(4);
        this.setVal(path, val);
        valT.setText(this.fmt(val, step));
        redraw(val);
      };
      z.on('pointerdown', (p) => apply(p.x));
      z.on('drag', (p) => apply(p.x));
      s.input.setDraggable(z);
      c.add(z);

      y += rowH;
    });
  }

  fmt(v, step) { return step < 1 ? (+v).toFixed(2) : String(Math.round(v)); }

  renderState(c, X, W) {
    const s = this.s;
    const btns = [
      ['💰 +1000 金幣', () => { s.gold += 1000; s.drawRecruit(); }],
      ['⚡ 技能 CD 歸零', () => s.heroBtns.forEach(b => b.ready = 0)],
      ['🏹 給滿階弓兵', () => s.addUnit('archer', 6)],
      ['🔥 給融合：火矢台', () => s.addUnit('fireArrow', 1)],
      ['💥 給融合：希臘火', () => s.addUnit('greekFire', 1)],
      ['👑 召喚 阿基里斯', () => s.spawnEnemy('achilles', 1)],
      ['🛡 召喚 大埃阿斯', () => s.spawnEnemy('ajax', 1)],
      ['🐴 召喚 木馬', () => s.spawnEnemy('horse', 1)],
      ['🌊 一次來 20 隻', () => { for (let i = 0; i < 20; i++)
        s.time.delayedCall(i * 120, () => s.spawnEnemy('soldier', -1)); }],
      ['💔 城牆設為 15%', () => { s.wallHp = Math.round(s.wallMax * 0.15); }],
      ['🔄 翻轉路徑（城內戰）', () => s.reverseLanes()],
      ['🏚 觸發地面崩塌', () => s.doCollapse()],
      ['⏭ 進入下一階段', () => s.level.finale ? s.advancePhase() : s.endGame(true)],
      ['🏁 直接結算（勝）', () => s.endGame(true)],
    ];
    let y = 226;
    btns.forEach(([label, cb]) => {
      if (y > TD.GAME_H - 70) return;
      const g = s.add.graphics();
      g.fillStyle(0x8B5A2B, 1).fillRoundedRect(X + 24, y, W - 48, 58, 10);
      g.lineStyle(2, 0xC98B4B, 1).strokeRoundedRect(X + 24, y, W - 48, 58, 10);
      const t = s.add.text(X + 44, y + 29, label, {
        fontFamily: TD.FONT, fontSize: '26px', color: '#FFF6E0',
      }).setOrigin(0, 0.5);
      const z = s.add.zone(X + W / 2, y + 29, W - 48, 58).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { cb(); });
      c.add([g, t, z]);
      y += 66;
    });
  }

  renderIO(c, X, W) {
    const s = this.s;
    const json = JSON.stringify(TD.LAYOUT, (k, v) => typeof v === 'function' ? undefined : v, 2);

    c.add(s.add.text(X + 24, 220,
      '把下面的 JSON 交給 Claude，\n他會 baked 進 src/config/layout.js', {
        fontFamily: TD.FONT, fontSize: '24px', color: '#C9A87C', lineSpacing: 8,
      }));

    const box = s.add.graphics();
    box.fillStyle(0x000000, 0.6).fillRoundedRect(X + 24, 300, W - 48, 900, 10);
    c.add(box);
    c.add(s.add.text(X + 36, 312, json.slice(0, 2600), {
      fontFamily: 'Menlo, monospace', fontSize: '17px', color: '#B6F5A8',
      wordWrap: { width: W - 72 }, lineSpacing: 2,
    }));

    const mk = (y, label, cb, color = 0xFFC72C) => {
      const g = s.add.graphics();
      g.fillStyle(color, 1).fillRoundedRect(X + 24, y, W - 48, 76, 12);
      const t = s.add.text(X + W / 2, y + 38, label, {
        fontFamily: TD.FONT, fontSize: '30px', color: '#5E3A18',
      }).setOrigin(0.5);
      const z = s.add.zone(X + W / 2, y + 38, W - 48, 76).setInteractive({ useHandCursor: true });
      z.on('pointerdown', cb);
      c.add([g, t, z]);
    };

    mk(1240, '💾 複製到剪貼簿', () => {
      const done = () => s.floatLabel(TD.GAME_W / 2, TD.GAME_H / 2, '已複製 LAYOUT JSON', '#6FCF97', 40);
      if (navigator.clipboard) navigator.clipboard.writeText(json).then(done).catch(() => {
        console.log(json); done();
      });
      else { console.log(json); done(); }
    });
    mk(1340, '🖨 印到 Console', () => {
      console.log('=== TD.LAYOUT ===\n' + json);
      s.floatLabel(TD.GAME_W / 2, TD.GAME_H / 2, '已印到 Console', '#6FCF97', 40);
    }, 0xC98B4B);
    mk(1440, '↺ 還原預設', () => {
      localStorage.removeItem('troyDefense.layout');
      location.reload();
    }, 0xE0483C);
    mk(1540, '💽 存到瀏覽器（下次自動套用）', () => {
      localStorage.setItem('troyDefense.layout', json);
      s.floatLabel(TD.GAME_W / 2, TD.GAME_H / 2, '已存入 localStorage', '#6FCF97', 40);
    }, 0xC98B4B);
  }

  // ── 直接拖曳元件 ──
  setDragMode(on) {
    this._dragMode = on;
    const s = this.s;
    if (this._dragHandles) { this._dragHandles.forEach(h => h.destroy()); this._dragHandles = null; }
    if (!on) return;

    const targets = [
      { label: '合成台', path: 'bench', x: () => TD.LAYOUT.bench.x, y: () => TD.LAYOUT.bench.y },
      { label: '底部列', path: 'bottom', x: () => TD.LAYOUT.bottom.recruitX, y: () => TD.LAYOUT.bottom.y },
    ];
    this._dragHandles = targets.map(t => {
      const h = s.add.container(t.x(), t.y()).setDepth(TD.DEPTH.DEV - 1);
      const g = s.add.graphics();
      g.fillStyle(0xFF8A3C, 0.8).fillCircle(0, 0, 34);
      g.lineStyle(3, 0xFFF, 1).strokeCircle(0, 0, 34);
      const tx = s.add.text(0, 0, '✥', { fontSize: '30px', color: '#fff' }).setOrigin(0.5);
      const lb = s.add.text(0, 48, t.label, {
        fontFamily: TD.FONT, fontSize: '22px', color: '#FFE066',
        stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5);
      h.add([g, tx, lb]);
      h.setSize(68, 68).setInteractive({ useHandCursor: true, draggable: true });
      s.input.setDraggable(h);
      h.on('drag', (p, dx, dy) => {
        h.x = dx; h.y = dy;
        if (t.path === 'bench') { TD.LAYOUT.bench.x = Math.round(dx); TD.LAYOUT.bench.y = Math.round(dy); }
        if (t.path === 'bottom') { TD.LAYOUT.bottom.recruitX = Math.round(dx); TD.LAYOUT.bottom.y = Math.round(dy); }
        s.relayout();
      });
      return h;
    });
  }
};
