/* v2 DEV 微調工具 — 按 D 或右下角齒輪
 * 特效參數即時生效；版面參數放開滑桿時重建場景；狀態頁可強制觸發各種戰況
 */
window.TD = window.TD || {};

TD.DevTools = class DevTools {
  constructor(scene) {
    this.s = scene;
    this.open = false;
    this.tab = 'fx';
    this.buildToggle();
  }

  buildToggle() {
    const s = this.s;
    this.gear = s.add.container(TD.GAME_W - 46, TD.GAME_H - 46).setDepth(TD.DEPTH.DEV);
    const g = s.add.graphics();
    g.fillStyle(0x000000, 0.5).fillCircle(0, 0, 36);
    g.lineStyle(3, 0xC8901A, 0.9).strokeCircle(0, 0, 36);
    const t = s.add.text(0, 0, '⚙', { fontSize: '34px' }).setOrigin(0.5);
    this.gear.add([g, t]);
    this.gear.setSize(72, 72).setInteractive({ useHandCursor: true });
    this.gear.on('pointerdown', (p, x, y, ev) => { ev && ev.stopPropagation(); this.toggle(); });
    this.gear.setAlpha(0.3);
  }

  toggle() { this.open ? this.close() : this.show(); }
  close() {
    this.open = false;
    if (this.panel) { this.panel.destroy(true); this.panel = null; }
    this.gear.setAlpha(0.3);
  }
  show() { this.open = true; this.gear.setAlpha(1); this.render(); }

  // path 前綴：F=TD.FXP（即時） L=TD.LAYOUT（放開時重建） @=TD 全域（重建）
  specs() {
    return {
      fx: [
        ['火花數量倍率', 'F.sparkMul', 0, 3, 0.05],
        ['漂浮餘燼密度', 'F.emberRate', 0, 3, 0.05],
        ['震屏倍率', 'F.shakeMul', 0, 3, 0.05],
        ['火焰大小', 'F.fireScale', 0.4, 2.5, 0.05],
        ['粒子上限', 'F.maxParticles', 100, 1500, 10],
      ],
      layout: [
        ['城牆接觸線 Y', 'L.wall.topY', 900, 1400, 2],
        ['牆面高度', 'L.wall.faceH', 140, 420, 2],
        ['守軍站位 Y', 'L.wall.slotY', 1150, 1420, 2],
        ['守軍體型倍率', 'L.wall.unitScale', 0.5, 1.8, 0.02],
        ['城門寬', 'L.gate.w', 200, 520, 4],
        ['城門高', 'L.gate.h', 160, 420, 4],
        ['城門頂 Y', 'L.gate.topY', 1080, 1360, 2],
        ['敵人體型倍率', 'L.unit.enemyScale', 0.5, 1.8, 0.02],
        ['合成台 Y', 'L.bench.y', 1400, 1750, 2],
        ['格子大小', 'L.bench.cell', 100, 220, 2],
        ['技能鈕 X', 'L.skills.x', 800, 1050, 2],
        ['底列 Y', 'L.bottom.y', 1750, 1910, 2],
        ['敵血倍率', '@hpScale', 0.2, 4, 0.05],
      ],
    };
  }

  getVal(path) {
    if (path[0] === '@') return this.s[path.slice(1)] ?? 1;
    const p = path.split('.');
    if (p[0] === 'F') return TD.FXP[p[1]];
    let o = TD.LAYOUT;
    for (let i = 1; i < p.length - 1; i++) o = o[p[i]];
    return o[p[p.length - 1]];
  }

  setVal(path, v, commit) {
    if (path[0] === '@') { this.s[path.slice(1)] = v; return; }
    const p = path.split('.');
    if (p[0] === 'F') { TD.FXP[p[1]] = v; return; }              // 即時
    let o = TD.LAYOUT;
    for (let i = 1; i < p.length - 1; i++) o = o[p[i]];
    o[p[p.length - 1]] = v;
    if (commit) this.s.scene.restart({ level: this.s.levelId }); // 放開才重建
  }

  render() {
    if (this.panel) this.panel.destroy(true);
    const s = this.s;
    const W = 680, X = TD.GAME_W - W, H = TD.GAME_H;
    const c = s.add.container(0, 0).setDepth(TD.DEPTH.DEV);
    this.panel = c;

    const bg = s.add.graphics();
    bg.fillStyle(0x1A120A, 0.95).fillRect(X, 0, W, H);
    bg.lineStyle(3, 0xC8901A, 1).lineBetween(X, 0, X, H);
    c.add(bg);
    c.add(s.add.zone(X + W / 2, H / 2, W, H).setInteractive());

    c.add(s.add.text(X + 24, 20, 'DEV 微調工具', {
      fontFamily: TD.FONT, fontSize: '34px', color: TD.CSS.gold,
    }));
    const closeZ = s.add.text(TD.GAME_W - 44, 18, '✕', {
      fontFamily: TD.FONT, fontSize: '38px', color: '#FFF6E0',
    }).setInteractive({ useHandCursor: true });
    closeZ.on('pointerdown', () => this.close());
    c.add(closeZ);

    const tabs = [['fx', '特效'], ['layout', '版面'], ['state', '狀態'], ['io', '匯出']];
    tabs.forEach(([k, label], i) => {
      const bx = X + 24 + i * 160, by = 76;
      const on = this.tab === k;
      const g = s.add.graphics();
      g.fillStyle(on ? 0xFFC83D : 0x5A3A1A, 1).fillRoundedRect(bx, by, 146, 54, 10);
      const t = s.add.text(bx + 73, by + 27, label, {
        fontFamily: TD.FONT, fontSize: '28px', color: on ? '#241A10' : '#C9B08A',
      }).setOrigin(0.5);
      const z = s.add.zone(bx + 73, by + 27, 146, 54).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { this.tab = k; this.render(); });
      c.add([g, t, z]);
    });

    if (this.tab === 'io') this.renderIO(c, X, W);
    else if (this.tab === 'state') this.renderState(c, X, W);
    else this.renderSliders(c, X, W, this.specs()[this.tab]);
  }

  renderSliders(c, X, W, list) {
    const s = this.s;
    let y = 168;
    const rowH = 88;
    list.forEach(([label, path, min, max, step]) => {
      if (y > TD.GAME_H - 80) return;
      const v = this.getVal(path);
      c.add(s.add.text(X + 24, y, label, {
        fontFamily: TD.FONT, fontSize: '25px', color: '#FFF6E0',
      }));
      const valT = s.add.text(X + W - 24, y, this.fmt(v, step), {
        fontFamily: TD.FONT, fontSize: '25px', color: TD.CSS.gold,
      }).setOrigin(1, 0);
      c.add(valT);

      const tx = X + 24, tw = W - 48, ty = y + 46;
      const bar = s.add.graphics();
      const redraw = (val) => {
        const k = (val - min) / (max - min);
        bar.clear();
        bar.fillStyle(0x5A3A1A, 1).fillRoundedRect(tx, ty - 7, tw, 14, 7);
        bar.fillStyle(0xFF7A1A, 1).fillRoundedRect(tx, ty - 7, tw * k, 14, 7);
        bar.fillStyle(0xFFC83D, 1).fillCircle(tx + tw * k, ty, 17);
      };
      redraw(v);
      c.add(bar);

      const z = s.add.zone(tx + tw / 2, ty, tw, 56).setInteractive({ useHandCursor: true, draggable: true });
      let cur = v;
      const calc = (px) => {
        const k = Phaser.Math.Clamp((px - tx) / tw, 0, 1);
        let val = min + k * (max - min);
        val = Math.round(val / step) * step;
        return +val.toFixed(4);
      };
      z.on('pointerdown', p => { cur = calc(p.x); this.setVal(path, cur, false); valT.setText(this.fmt(cur, step)); redraw(cur); });
      z.on('drag', p => { cur = calc(p.x); this.setVal(path, cur, false); valT.setText(this.fmt(cur, step)); redraw(cur); });
      z.on('pointerup', () => this.setVal(path, cur, path[0] === 'L' || path[0] === '@'));
      s.input.setDraggable(z);
      c.add(z);
      y += rowH;
    });
    c.add(s.add.text(X + 24, y + 10, '特效即時生效；版面放開滑桿後重建場景', {
      fontFamily: TD.FONT, fontSize: '22px', color: '#8A7458',
    }));
  }

  fmt(v, step) { return step < 1 ? (+v).toFixed(2) : String(Math.round(v)); }

  renderState(c, X, W) {
    const s = this.s;
    const btns = [
      ['💰 +1000 金幣', () => { s.gold += 1000; s.hud.refresh(); }],
      ['⚡ 神恩灌滿', () => { s.fury = TD.FURY_MAX; }],
      ['🏹 給滿級四兵種', () => {
        ['archer', 'spear', 'stone', 'oil'].forEach((t, i) => {
          const empty = s.bench.cells.findIndex(x => !x);
          if (empty >= 0) s.bench.cells[empty] = { type: t, lv: 5 };
        });
        s.bench.redraw();
      }],
      ['🐏 召喚攻城槌', () => s.spawnEnemy('ram', 1)],
      ['🗼 召喚攻城塔', () => s.spawnEnemy('siegetower', 0)],
      ['🪨 召喚投石機', () => s.spawnEnemy('catapult', 2)],
      ['🪜 雲梯 ×3', () => [0, 1, 2].forEach(l => s.spawnEnemy('ladder', l))],
      ['🔥 火把兵 ×3', () => [0, 1, 2].forEach(l => s.spawnEnemy('torch', l))],
      ['👑 BOSS 狄俄墨得斯', () => s.spawnEnemy('diomedes', 1)],
      ['🌊 一次來 20 隻', () => { for (let i = 0; i < 20; i++)
        s.time.delayedCall(i * 120, () => !s.over && s.spawnEnemy('soldier', Phaser.Math.Between(0, 2))); }],
      ['💔 城門設為 20%', () => { s.wall.hp = Math.round(s.wall.maxHp * 0.2); s.wall.drawHpBar(); s.wall.updateStage(); }],
      ['💥 城門設為 55%', () => { s.wall.hp = Math.round(s.wall.maxHp * 0.55); s.wall.drawHpBar(); s.wall.updateStage(); }],
      ['⏭ 跳到下一波', () => { s.enemies.forEach(e => !e.dead && e.die('dev')); }],
      ['🏁 直接結算（勝）', () => s.victory()],
      ['☠️ 觸發破門演出', () => { s.wall.hp = 0; s.gateBreach(); }],
    ];
    let y = 160;
    btns.forEach(([label, cb]) => {
      if (y > TD.GAME_H - 70) return;
      const g = this.s.add.graphics();
      g.fillStyle(0x5A3A1A, 1).fillRoundedRect(X + 24, y, W - 48, 58, 10);
      const t = this.s.add.text(X + 44, y + 29, label, {
        fontFamily: TD.FONT, fontSize: '26px', color: '#FFF6E0',
      }).setOrigin(0, 0.5);
      const z = this.s.add.zone(X + W / 2, y + 29, W - 48, 58).setInteractive({ useHandCursor: true });
      z.on('pointerdown', cb);
      c.add([g, t, z]);
      y += 66;
    });
  }

  renderIO(c, X, W) {
    const s = this.s;
    const json = JSON.stringify({ LAYOUT: TD.LAYOUT, FXP: TD.FXP }, null, 2);
    c.add(s.add.text(X + 24, 160, '調好後把 JSON 交給 Claude bake 進 source', {
      fontFamily: TD.FONT, fontSize: '24px', color: '#C9B08A',
    }));
    const box = s.add.graphics();
    box.fillStyle(0x000000, 0.6).fillRoundedRect(X + 24, 210, W - 48, 1100, 10);
    c.add(box);
    c.add(s.add.text(X + 36, 222, json.slice(0, 3400), {
      fontFamily: 'Menlo, monospace', fontSize: '15px', color: '#B6F5A8',
      wordWrap: { width: W - 72 },
    }));
    const mk = (y, label, cb, color = 0xFFC83D) => {
      const g = s.add.graphics();
      g.fillStyle(color, 1).fillRoundedRect(X + 24, y, W - 48, 72, 12);
      const t = s.add.text(X + W / 2, y + 36, label, {
        fontFamily: TD.FONT, fontSize: '28px', color: '#241A10',
      }).setOrigin(0.5);
      const z = s.add.zone(X + W / 2, y + 36, W - 48, 72).setInteractive({ useHandCursor: true });
      z.on('pointerdown', cb);
      c.add([g, t, z]);
    };
    mk(1340, '💾 複製到剪貼簿', () => {
      const done = () => s.floatLabel(TD.GAME_W / 2, TD.GAME_H / 2, '已複製', TD.CSS.ok, 40);
      if (navigator.clipboard) navigator.clipboard.writeText(json).then(done).catch(() => { console.log(json); done(); });
      else { console.log(json); done(); }
    });
    mk(1430, '💽 存到瀏覽器（自動套用）', () => {
      localStorage.setItem('troyDefense.layout.v2', json);
      s.floatLabel(TD.GAME_W / 2, TD.GAME_H / 2, '已存入瀏覽器', TD.CSS.ok, 40);
    }, 0xC8901A);
    mk(1520, '↺ 還原預設', () => {
      localStorage.removeItem('troyDefense.layout.v2');
      location.reload();
    }, 0xE0483C);
  }
};
