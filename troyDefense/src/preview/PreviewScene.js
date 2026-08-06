/* 素材與動畫展示頁：把場景、守軍、敵人走路、路障、攻擊特效全部攤開檢視
 * 用的是遊戲裡同一套貼圖與同一組動畫參數，所見即遊戲內表現。
 */
window.TD = window.TD || {};

TD.PreviewScene = class PreviewScene extends Phaser.Scene {
  constructor() { super('Preview'); }

  create() {
    this.cameras.main.setBackgroundColor('#0E2B4D');
    this.walkers = [];
    this.attackers = [];
    this.scroll = 0;

    this.layer = this.add.container(0, 0);
    let y = 120;   // 避開頂部固定列
    y = this.sectionScene(y);
    y = this.sectionUnits(y);
    y = this.sectionEnemies(y);
    y = this.sectionProps(y);
    y = this.sectionFx(y);
    this.contentH = y + 80;

    this.buildHeader();
    this.setupScroll();
  }

  // ── 版面小工具 ──
  title(y, txt, sub) {
    const t = this.add.text(40, y, txt, {
      fontFamily: TD.FONT, fontSize: '46px', color: TD.CSS.gold,
      stroke: TD.STROKE, strokeThickness: 7,
    });
    this.layer.add(t);
    if (sub) {
      const s = this.add.text(40, y + 56, sub, {
        fontFamily: TD.FONT, fontSize: '25px', color: '#BFD8F0',
      });
      this.layer.add(s);
      return y + 104;
    }
    return y + 68;
  }

  panel(y, h) {
    const g = this.add.graphics();
    const P = TD.PALETTE;
    g.fillStyle(P.blueDark, 1).fillRoundedRect(30, y, TD.GAME_W - 60, h, 22);
    g.fillStyle(0x0B2140, 0.6).fillRoundedRect(38, y + 8, TD.GAME_W - 76, h - 16, 18);
    g.lineStyle(3, P.marble, 0.5).strokeRoundedRect(30, y, TD.GAME_W - 60, h, 22);
    this.layer.add(g);
  }

  label(x, y, txt, size = 22, color = '#DCEBFA') {
    const t = this.add.text(x, y, txt, {
      fontFamily: TD.FONT, fontSize: `${size}px`, color, align: 'center',
      stroke: TD.STROKE, strokeThickness: 4,
    }).setOrigin(0.5, 0);
    this.layer.add(t);
    return t;
  }

  // ── 1. 場景地磚 ──
  sectionScene(y) {
    y = this.title(y, '① 戰場地磚', '格子是地面本身，不是疊上去的濾鏡。深淺交替、有厚度、走道換成踩踏泥土');
    const H = 560;
    this.panel(y, H);

    const cols = 7, rows = 5, cw = 128, ch = 96;
    const ox = (TD.GAME_W - cols * cw) / 2, oy = y + 40;
    const g = this.add.graphics();
    this.layer.add(g);
    const P = TD.PALETTE;
    const lip = ch * 0.055, rad = Math.min(cw, ch) * 0.14;

    // 走道：一條 S 形
    const lane = new Set(['3,0', '3,1', '1,1', '2,1', '1,2', '1,3', '2,3', '3,3', '4,3', '5,3', '5,2', '5,1']);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ox + c * cw, yy = oy + r * ch;
        const isLane = lane.has(`${c},${r}`);
        const isWall = r === rows - 1;
        const even = (c + r) % 2 === 0;
        const deep = isLane ? P.laneDark : (isWall ? P.wallLine : P.tileLine);
        const face = isLane ? P.lane : (isWall ? (even ? P.wallTileA : P.wallTileB)
                                               : (even ? P.tileA : P.tileB));
        g.fillStyle(deep, 1).fillRoundedRect(x + 1, yy + lip, cw - 2, ch - 2, rad);
        g.fillStyle(face, 1).fillRoundedRect(x + 1, yy, cw - 2, ch - lip, rad);
        g.fillStyle(0xFFFFFF, isWall ? 0.30 : (isLane ? 0.06 : 0.16))
          .fillRoundedRect(x + 4, yy + 3, cw - 8, (ch - lip) * 0.30, rad * 0.8);
        g.lineStyle(2, deep, 0.6).strokeRoundedRect(x + 1, yy, cw - 2, ch - lip, rad);
      }
    }
    // 走道方向箭頭
    const arrows = this.add.graphics();
    this.layer.add(arrows);
    this.previewArrows = { g: arrows, pts: [] };
    const seq = ['3,0', '3,1', '2,1', '1,1', '1,2', '1,3', '2,3', '3,3', '4,3', '5,3', '5,2', '5,1'];
    for (let i = 0; i < seq.length - 1; i++) {
      const [c1, r1] = seq[i].split(',').map(Number);
      const [c2, r2] = seq[i + 1].split(',').map(Number);
      const x1 = ox + c1 * cw + cw / 2, y1 = oy + r1 * ch + ch / 2;
      const x2 = ox + c2 * cw + cw / 2, y2 = oy + r2 * ch + ch / 2;
      this.previewArrows.pts.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, ang: Math.atan2(y2 - y1, x2 - x1) });
    }

    this.label(TD.GAME_W / 2, oy + rows * ch + 14, '最下面一排是城牆守備位（大理石磚）', 22, '#BFD8F0');
    return y + H + 40;
  }

  // ── 2. 守軍與攻擊分鏡 ──
  sectionUnits(y) {
    y = this.title(y, '② 守軍與攻擊分鏡', '每個兵種有各自的攻擊動作：弓箭後仰放弦、長矛前刺、投石甩臂、熱油傾倒、祭司舉杖');
    const kinds = Object.keys(TD.KINDS);
    const rowH = 250;
    const H = kinds.length * rowH + 20;
    this.panel(y, H);

    kinds.forEach((k, i) => {
      const K = TD.KINDS[k];
      const ry = y + 24 + i * rowH;
      const nm = this.add.text(64, ry, `${K.icon} ${K.name}`, {
        fontFamily: TD.FONT, fontSize: '30px', color: '#FFE08A',
        stroke: TD.STROKE, strokeThickness: 5,
      });
      const ds = this.add.text(64, ry + 44, K.desc, {
        fontFamily: TD.FONT, fontSize: '20px', color: '#BFD8F0',
        wordWrap: { width: 300 }, lineSpacing: 6,
      });
      this.layer.add(nm); this.layer.add(ds);

      [1, 3, 6].forEach((lv, j) => {
        const x = 420 + j * 200;
        const tex = TD.texOf(k, lv);
        if (!this.textures.exists(tex)) return;
        const img = this.add.image(x, ry + 100, tex).setDisplaySize(150, 150);
        this.layer.add(img);
        this.label(x, ry + 180, `Lv.${lv}`, 22, '#DCEBFA');
        this.attackers.push({ img, mode: K.target, baseX: x, baseY: ry + 100,
                              sx: img.scaleX, sy: img.scaleY, t: Math.random() * 2000 });
      });
    });
    return y + H + 40;
  }

  // ── 3. 敵人行走動畫 ──
  sectionEnemies(y) {
    y = this.title(y, '③ 敵人行走動畫',
      '4 幀行走循環 sprite 分鏡 + 彈跳、陰影縮放與腳步塵土');
    const list = ['soldier', 'shield', 'runner', 'fire', 'healer', 'myrmidon',
                  'drummer', 'siege', 'flyer', 'achilles', 'ajax', 'agamemnon'];
    const perRow = 3, rowH = 290;
    const rows = Math.ceil(list.length / perRow);
    const H = rows * rowH + 20;
    this.panel(y, H);

    list.forEach((k, i) => {
      const E = TD.ENEMIES[k];
      if (!E || !this.textures.exists(E.tex)) return;
      const c = i % perRow, r = Math.floor(i / perRow);
      const x = 190 + c * 350, cy = y + 40 + r * rowH;

      // 跑步機底線
      const g = this.add.graphics();
      g.fillStyle(TD.PALETTE.lane, 0.5).fillRoundedRect(x - 120, cy + 150, 240, 14, 7);
      this.layer.add(g);

      const base = 150 * Math.min(1.25, E.scale || 1);
      const shadow = this.add.ellipse(x, cy + 152, base * 0.5, base * 0.16, 0x000000, 0.3);
      const animKey = E.tex + '_walk';
      const hasAnim = this.anims.exists(animKey);
      let img;
      if (hasAnim) {
        img = this.add.sprite(x, cy + 150, E.tex);
        const fw = TD.SHEET_W / TD.WALK_FRAMES, fh = TD.SHEET_H;
        const dh = base * 2.6;
        img.setDisplaySize(dh * (fw / fh), dh).setOrigin(0.5, 0.80);
        img.play({ key: animKey, startFrame: Phaser.Math.Between(0, TD.WALK_FRAMES - 1) });
      } else {
        img = this.add.image(x, cy + 150, E.tex).setDisplaySize(base, base).setOrigin(0.5, 0.80);
      }
      this.layer.add(shadow); this.layer.add(img);

      this.label(x, cy + 176, E.name, 24, '#FFD9A8');
      this.walkers.push({
        img, shadow, base, flying: !!E.flying, sheet: hasAnim,
        heavy: (E.scale || 1) > 1.15,
        spd: E.spd, phase: Math.random() * Math.PI * 2,
        sx: img.scaleX, sy: img.scaleY, shSX: shadow.scaleX,
        baseY: cy + 150, prevPhase: 0,
      });
    });
    return y + H + 40;
  }

  // ── 4. 路障與城牆 ──
  sectionProps(y) {
    y = this.title(y, '④ 路障與城牆守備位', '路障只擋路不攻擊，用來把敵人導去你要的路線');
    const H = 300;
    this.panel(y, H);

    if (this.textures.exists('U_barricade')) {
      const img = this.add.image(240, y + 130, 'U_barricade').setDisplaySize(180, 180);
      this.layer.add(img);
      this.tweens.add({ targets: img, y: y + 122, duration: 1400, yoyo: true, repeat: -1,
                        ease: 'Sine.easeInOut' });
    }
    this.label(240, y + 232, '路障', 26, '#9FD3FF');

    const info = this.add.text(400, y + 60,
      `價格 ${TD.BARRICADE.baseCost} 起，每放一個 +${TD.BARRICADE.step}\n` +
      `每關上限 ${TD.BARRICADE.max} 個\n` +
      `賣出退回 ${Math.round(TD.BARRICADE.sellRate * 100)}%\n\n` +
      `城牆守備位：射程 +${Math.round((TD.LAYOUT.grid.wallRangeMul - 1) * 100)}%、` +
      `傷害 +${Math.round((TD.LAYOUT.grid.wallDmgMul - 1) * 100)}%，且不影響敵人路線`, {
        fontFamily: TD.FONT, fontSize: '24px', color: '#DCEBFA', lineSpacing: 10,
      });
    this.layer.add(info);
    return y + H + 40;
  }

  // ── 5. 攻擊特效 ──
  sectionFx(y) {
    y = this.title(y, '⑤ 攻擊特效', '點任一顆按鈕看實際效果');
    const H = 420;
    this.panel(y, H);

    this.fxStage = { x: TD.GAME_W / 2, y: y + 150 };
    const g = this.add.graphics();
    g.fillStyle(TD.PALETTE.tileB, 1).fillRoundedRect(120, y + 40, TD.GAME_W - 240, 220, 16);
    this.layer.add(g);

    const btns = [
      ['箭矢命中', () => this.fxHit()],
      ['投石爆炸', () => this.fxExplode()],
      ['熱油燃燒', () => this.fxFire()],
      ['神技光柱', () => this.fxPillar()],
      ['擊殺爆裂', () => this.fxKill()],
    ];
    const bw = 190, gap = 14;
    const total = btns.length * bw + (btns.length - 1) * gap;
    let bx = (TD.GAME_W - total) / 2;
    btns.forEach(([label, fn]) => {
      const by = y + 300;
      const bg = this.add.graphics();
      const P = TD.PALETTE;
      bg.fillStyle(P.goldDark, 1).fillRoundedRect(bx, by + 8, bw, 70, 18);
      bg.fillStyle(P.gold, 1).fillRoundedRect(bx, by, bw, 62, 18);
      bg.fillStyle(0xFFFFFF, 0.32).fillRoundedRect(bx + 8, by + 5, bw - 16, 22, 12);
      const t = this.add.text(bx + bw / 2, by + 31, label, {
        fontFamily: TD.FONT, fontSize: '24px', color: '#4A3308',
      }).setOrigin(0.5);
      const z = this.add.zone(bx + bw / 2, by + 34, bw, 70).setInteractive({ useHandCursor: true });
      z.on('pointerdown', fn);
      this.layer.add(bg); this.layer.add(t); this.layer.add(z);
      bx += bw + gap;
    });
    return y + H + 40;
  }

  // ── 特效（與遊戲內同一套繪製）──
  fxAt() { return { x: this.fxStage.x, y: this.fxStage.y + this.layer.y }; }

  ring(x, y, r, tint, dur) {
    const img = this.add.image(x, y, 'px_ring').setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(0.15).setDepth(50);
    this.tweens.add({ targets: img, scale: r / 48, alpha: 0, duration: dur,
                      ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
  }

  fxHit() {
    const p = this.fxAt();
    const arrow = this.add.image(p.x - 300, p.y, 'px_arrow').setDisplaySize(70, 70).setDepth(50);
    this.tweens.add({
      targets: arrow, x: p.x, duration: 320, ease: 'Quad.easeIn',
      onComplete: () => {
        arrow.destroy();
        const e = this.add.particles(p.x, p.y, 'px_spark', {
          speed: { min: 90, max: 260 }, lifespan: 380, scale: { start: 0.5, end: 0 },
          quantity: 12, tint: 0xFFE08A, blendMode: 'ADD', emitting: false,
        }).setDepth(50);
        e.explode(12);
        this.ring(p.x, p.y, 110, 0xFFC83D, 300);
        this.dmgText(p.x, p.y - 40, 128, false);
        this.time.delayedCall(700, () => e.destroy());
      },
    });
  }

  fxExplode() {
    const p = this.fxAt();
    const rock = this.add.image(p.x - 260, p.y - 160, 'px_rock').setDisplaySize(70, 70).setDepth(50);
    this.tweens.add({ targets: rock, x: p.x, y: p.y, rotation: 6, duration: 480, ease: 'Quad.easeIn',
      onComplete: () => {
        rock.destroy();
        this.ring(p.x, p.y, 260, 0xFFC83D, 340);
        const e = this.add.particles(p.x, p.y, 'px_spark', {
          speed: { min: 120, max: 420 }, lifespan: 480, scale: { start: 0.9, end: 0 },
          quantity: 18, tint: [0xFFC83D, 0xFF7043], blendMode: 'ADD', emitting: false,
        }).setDepth(50);
        e.explode(18);
        const d = this.add.particles(p.x, p.y, 'px_smoke', {
          speed: { min: 40, max: 160 }, lifespan: 900, scale: { start: 0.6, end: 2.0 },
          alpha: { start: 0.5, end: 0 }, quantity: 10, emitting: false,
        }).setDepth(49);
        d.explode(10);
        this.cameras.main.shake(160, 0.006);
        this.dmgText(p.x, p.y - 40, 342, true);
        this.time.delayedCall(1400, () => { e.destroy(); d.destroy(); });
      } });
  }

  fxFire() {
    const p = this.fxAt();
    const e = this.add.particles(p.x, p.y, 'px_spark', {
      speed: { min: 10, max: 70 }, lifespan: 620, frequency: 20,
      scale: { start: 0.75, end: 0 }, tint: [0x69F0AE, 0xFFC83D, 0xFF7043],
      blendMode: 'ADD',
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 100) },
    }).setDepth(50);
    const sm = this.add.particles(p.x, p.y, 'px_smoke', {
      speed: { min: 10, max: 40 }, lifespan: 1100, frequency: 80,
      scale: { start: 0.8, end: 2.2 }, alpha: { start: 0.35, end: 0 },
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 100) },
    }).setDepth(49);
    this.time.delayedCall(2200, () => { e.stop(); sm.stop(); });
    this.time.delayedCall(3600, () => { e.destroy(); sm.destroy(); });
  }

  fxPillar() {
    const p = this.fxAt();
    const g = this.add.graphics().setDepth(50).setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(0xFFF176, 0.55);
    g.fillTriangle(p.x - 16, p.y - 260, p.x + 16, p.y - 260, p.x + 95, p.y);
    g.fillTriangle(p.x - 16, p.y - 260, p.x - 95, p.y, p.x + 95, p.y);
    g.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, duration: 90, yoyo: true, hold: 300,
                      onComplete: () => g.destroy() });
    this.ring(p.x, p.y, 240, 0xFFF176, 480);
    const e = this.add.particles(p.x, p.y, 'px_spark', {
      speed: { min: 60, max: 240 }, lifespan: 520, scale: { start: 0.8, end: 0 },
      quantity: 22, tint: 0xFFF176, blendMode: 'ADD', emitting: false,
    }).setDepth(50);
    e.explode(22);
    this.dmgText(p.x, p.y - 60, 900, true);
    this.time.delayedCall(1200, () => e.destroy());
  }

  fxKill() {
    const p = this.fxAt();
    const shard = this.add.particles(p.x, p.y, 'px_shard', {
      speed: { min: 120, max: 380 }, lifespan: 700, scale: { start: 1.1, end: 0 },
      rotate: { start: 0, end: 360 }, gravityY: 420, quantity: 20,
      tint: [0xF2EFE4, 0xFFC83D, 0xC08A4A], emitting: false,
    }).setDepth(50);
    shard.explode(20);
    const blood = this.add.particles(p.x, p.y, 'px_blood', {
      speed: { min: 60, max: 220 }, lifespan: 500, scale: { start: 0.9, end: 0 },
      gravityY: 300, quantity: 16, alpha: { start: 0.85, end: 0 }, emitting: false,
    }).setDepth(50);
    blood.explode(16);
    this.ring(p.x, p.y, 200, 0xFF6E40, 420);
    this.cameras.main.shake(220, 0.008);
    this.time.delayedCall(1000, () => { shard.destroy(); blood.destroy(); });
  }

  dmgText(x, y, val, crit) {
    const t = this.add.text(x, y, String(val), {
      fontFamily: TD.FONT, fontSize: crit ? '58px' : '38px',
      color: crit ? '#FFE08A' : '#F2EFE4',
      stroke: TD.STROKE, strokeThickness: crit ? 8 : 5,
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, y: y - (crit ? 110 : 74), alpha: 0,
                      duration: crit ? 760 : 560, ease: 'Cubic.easeOut',
                      onComplete: () => t.destroy() });
  }

  // ── 頂部列與捲動 ──
  buildHeader() {
    const g = this.add.graphics().setDepth(100);
    g.fillStyle(TD.PALETTE.blueDark, 0.96).fillRect(0, 0, TD.GAME_W, 92);
    g.lineStyle(3, TD.PALETTE.marble, 0.6).lineBetween(0, 92, TD.GAME_W, 92);
    this.add.text(30, 26, '素材與動畫展示', {
      fontFamily: TD.FONT, fontSize: '40px', color: TD.CSS.gold,
      stroke: TD.STROKE, strokeThickness: 6,
    }).setDepth(101);
    this.add.text(TD.GAME_W - 30, 34, '上下拖曳捲動', {
      fontFamily: TD.FONT, fontSize: '22px', color: '#BFD8F0',
    }).setOrigin(1, 0).setDepth(101);
  }

  setupScroll() {
    this.input.on('wheel', (p, o, dx, dy) => this.scrollBy(dy * 0.9));
    let last = null;
    this.input.on('pointerdown', (p) => { last = p.y; });
    this.input.on('pointermove', (p) => {
      if (last === null || !p.isDown) return;
      this.scrollBy(last - p.y);
      last = p.y;
    });
    this.input.on('pointerup', () => { last = null; });
  }

  scrollBy(d) {
    const max = Math.max(0, this.contentH - TD.GAME_H + 120);
    this.scroll = Phaser.Math.Clamp(this.scroll + d, 0, max);
    this.layer.y = -this.scroll;
  }

  // ── 每幀：走路與攻擊循環 ──
  update(time, delta) {
    const dt = Math.min(delta, 50);

    // 敵人走路（與遊戲內同一組參數）
    this.walkers.forEach(w => {
      if (w.flying) {
        const t = time / 150 + w.phase;
        w.img.y = w.baseY + Math.sin(t) * w.base * 0.10 - w.base * 0.10;
        w.img.scaleY = w.sy * (1 + Math.sin(t + 0.6) * 0.06);
        w.img.scaleX = w.sx * (1 - Math.sin(t + 0.6) * 0.04);
        w.img.rotation = Math.sin(t * 0.5) * 0.05;
        w.shadow.setAlpha(0.14).setScale(w.shSX * 0.72);
        return;
      }
      const rate = (w.spd / 60) * (w.heavy ? 5.0 : 8.0);
      const prev = w.phase;
      w.phase += dt / 1000 * rate;
      const amp = w.base * (w.sheet ? 0.014 : (w.heavy ? 0.030 : 0.055));
      const lift = Math.abs(Math.sin(w.phase));
      w.img.y = w.baseY - lift * amp;
      const sq = (1 - lift) * (w.sheet ? 0.018 : (w.heavy ? 0.05 : 0.08));
      w.img.scaleY = w.sy * (1 - sq);
      w.img.scaleX = w.sx * (1 + sq * 0.6);
      w.img.rotation = Math.sin(w.phase * 0.5) * (w.sheet ? 0.012 : (w.heavy ? 0.030 : 0.055));
      w.shadow.setScale(w.shSX * (1 - lift * 0.28));
      w.shadow.setAlpha(0.30 - lift * 0.14);
      if (Math.floor(prev / Math.PI) !== Math.floor(w.phase / Math.PI)) {
        const d = this.add.image(w.img.x, w.baseY + 4, 'px_smoke')
          .setScale(w.base / 340).setAlpha(0.34).setTint(0xD9C08A).setDepth(5);
        this.layer.add(d);
        this.tweens.add({ targets: d, alpha: 0, scale: d.scale * 2.1, y: d.y - 6,
                          duration: 420, onComplete: () => d.destroy() });
      }
    });

    // 守軍攻擊循環
    this.attackers.forEach(a => {
      a.t -= dt;
      if (a.t > 0) return;
      a.t = 1800 + Math.random() * 800;
      this.playAttack(a);
    });

    // 走道箭頭脈動
    if (this.previewArrows) {
      const al = 0.55 + 0.45 * Math.abs(Math.sin(time / 520));
      const g = this.previewArrows.g;
      g.clear();
      this.previewArrows.pts.forEach(a => {
        const size = 22;
        const c = Math.cos(a.ang), s = Math.sin(a.ang);
        const tip = { x: a.x + c * size, y: a.y + s * size };
        const b = { x: a.x - c * size * 0.55, y: a.y - s * size * 0.55 };
        const px = -s * size * 0.62, py = c * size * 0.62;
        g.fillStyle(0xFFFFFF, 0.35 * al);
        g.fillTriangle(tip.x + c * 3, tip.y + s * 3, b.x + px, b.y + py, b.x - px, b.y - py);
        g.fillStyle(TD.PALETTE.gold, 0.9 * al);
        g.fillTriangle(tip.x, tip.y, b.x + px * 0.8, b.y + py * 0.8, b.x - px * 0.8, b.y - py * 0.8);
      });
    }
  }

  playAttack(a) {
    const img = a.img, dir = 1;
    this.tweens.killTweensOf(img);
    const X = a.baseX, Y = a.baseY, SX = a.sx, SY = a.sy;
    const chain = (steps) => this.tweens.chain({ targets: img, tweens: steps });
    if (a.mode === 'single') {
      chain([
        { x: X - 7, scaleY: SY * 1.05, scaleX: SX * 0.97, rotation: -0.05, duration: 80, ease: 'Sine.easeOut' },
        { x: X + 5, scaleY: SY * 0.96, scaleX: SX * 1.04, rotation: 0.04, duration: 55, ease: 'Back.easeOut' },
        { x: X, y: Y, scaleX: SX, scaleY: SY, rotation: 0, duration: 130, ease: 'Sine.easeInOut' },
      ]);
    } else if (a.mode === 'pierce') {
      chain([
        { x: X - 12, duration: 90, ease: 'Sine.easeOut' },
        { x: X + 20, scaleX: SX * 1.08, scaleY: SY * 0.94, duration: 60, ease: 'Back.easeOut' },
        { x: X, scaleX: SX, scaleY: SY, duration: 150, ease: 'Sine.easeInOut' },
      ]);
    } else if (a.mode === 'aoe') {
      chain([
        { rotation: -0.16, y: Y + 4, duration: 150, ease: 'Sine.easeOut' },
        { rotation: 0.13, y: Y - 6, scaleY: SY * 1.05, duration: 90, ease: 'Back.easeOut' },
        { rotation: 0, y: Y, scaleY: SY, duration: 200, ease: 'Sine.easeInOut' },
      ]);
    } else if (a.mode === 'cone') {
      chain([
        { rotation: 0.18, x: X + 6, duration: 130, ease: 'Sine.easeOut' },
        { rotation: 0, x: X, duration: 220, ease: 'Sine.easeInOut' },
      ]);
    } else {
      chain([
        { y: Y - 8, scaleY: SY * 1.06, duration: 200, ease: 'Sine.easeOut' },
        { y: Y, scaleY: SY, duration: 260, ease: 'Sine.easeInOut' },
      ]);
    }
  }
};
