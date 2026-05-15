// Stack 疊疊樂 — 經典原版復刻（等角立體 2.5D，純程式繪製，無圖檔）
// 方塊為立體箱（頂面＋左右側面陰影），每層交替沿 X / Z 兩條水平軸滑動
// 點擊鎖定 → 溢出切除掉落 → 該軸變窄 → 相機上移 → 顏色隨高度循環

const W = 450, H = 800;
const CX = 225, CY = 470;     // 等角投影螢幕原點
const THICK = 24;             // 每塊在螢幕上的立體厚度（px）
const F0 = 116;               // 初始方塊平面邊長（plan px，正方）
const PERFECT = 5;            // 完美對齊容許誤差（plan px）
const TRAVEL = 118;           // 移動方塊在該軸上的擺幅
const SPEED_BASE = 150;       // 滑動基礎速率（plan px/s）
const SPEED_PER = 16;         // 每次完美連擊加速量
const SPEED_MAX = 380;        // 速率上限（連擊中斷歸 0，速度回基礎）
const CAM_SPEED = 150;        // 相機等速上升（px/s），連續無瞬跳
// 內部渲染倍率：版面/玩法數值不變，只把畫布與繪製放大 RES 倍，
// 讓斜向移動的整數像素步進 < 1 裝置像素，消除交界處抖動（低解析放大鋸齒）
const RES = 3;

// 原版 Stack 的 RGB sin 循環配色：相位 0/2/4、頻率 0.3、較飽和（非粉彩）
function blockColor(i) {
  const r = Math.round(Math.sin(0.3 * i + 0) * 85 + 150);
  const g = Math.round(Math.sin(0.3 * i + 2) * 85 + 150);
  const b = Math.round(Math.sin(0.3 * i + 4) * 85 + 150);
  return (r << 16) | (g << 8) | b;
}
function shade(c, f) {
  const r = Math.min(255, ((c >> 16) & 0xff) * f);
  const g = Math.min(255, ((c >> 8) & 0xff) * f);
  const b = Math.min(255, (c & 0xff) * f);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
function bgColor(i, f) { return shade(blockColor(i), f); }
// c 朝 t 色混合 k（0..1）
function mix(c, t, k) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const R = (t >> 16) & 255, G = (t >> 8) & 255, B = t & 255;
  const m = (a, bb) => Math.round(a + (bb - a) * k);
  return (m(r, R) << 16) | (m(g, G) << 8) | m(b, B);
}

class StackScene extends Phaser.Scene {
  constructor() { super('stack'); }

  create() {
    this.bg = this.add.graphics().setScrollFactor(0);
    this.gPart = this.add.graphics().setScrollFactor(0); // 閃爍小方塊星點
    this.gTower = this.add.graphics();  // 已放置的塔（重畫）
    this.gMove = this.add.graphics();   // 移動中的方塊（每幀重畫）
    this.gChip = this.add.graphics();   // 掉落的碎塊
    this.gFx = this.add.graphics();     // 完美對齊特效

    // 星點粒子：緩慢上飄、明滅閃爍
    this.parts = [];
    for (let i = 0; i < 34; i++) {
      this.parts.push({
        x: Math.random() * W * RES,
        y: Math.random() * H * RES,
        s: (2 + Math.random() * 5) * RES,
        spd: (6 + Math.random() * 16) * RES,
        ph: Math.random() * Math.PI * 2,
        tw: 0.8 + Math.random() * 1.6,
        a: 0.25 + Math.random() * 0.5,
      });
    }

    // 分數（大、細緻）
    this.scoreText = this.add.text(W * RES / 2, 150 * RES, '0', {
      fontFamily: '-apple-system, "Microsoft JhengHei", sans-serif',
      fontSize: `${88 * RES}px`, color: '#ffffff', fontStyle: '300',
    }).setOrigin(0.5).setScrollFactor(0).setShadow(0, 2 * RES, 'rgba(0,0,0,0.18)', 5 * RES);

    // 皇冠 + 最高分
    this.crown = this.add.graphics().setScrollFactor(0);
    this.bestText = this.add.text(W * RES / 2 + 6 * RES, 232 * RES, '0', {
      fontFamily: '-apple-system, "Microsoft JhengHei", sans-serif',
      fontSize: `${30 * RES}px`, color: '#ffffff',
    }).setOrigin(0, 0.5).setScrollFactor(0).setAlpha(0.92);
    this.best = parseInt(localStorage.getItem('stack_best') || '0', 10) || 0;

    this.tipText = this.add.text(W * RES / 2, (H - 150) * RES, '點擊放下方塊', {
      fontFamily: '-apple-system, "Microsoft JhengHei", sans-serif',
      fontSize: `${22 * RES}px`, color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0.85);

    this.input.on('pointerdown', () => this.onTap());
    this.input.keyboard.on('keydown-SPACE', () => this.onTap());

    this.resetGame();

    // 開發者模式音效測試面板：網址加 #dev 開啟（不影響正常玩家）
    if (location.hash.toLowerCase().includes('dev')) this.buildDevPanel();
  }

  buildDevPanel() {
    const ctxResume = () => {
      const c = this.sound && this.sound.context;
      if (c && c.state === 'suspended') c.resume();
    };
    const wrap = document.createElement('div');
    wrap.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;' +
      'flex-wrap:wrap;gap:6px;justify-content:center;padding:8px;' +
      'background:rgba(0,0,0,.55);font:600 13px/1 -apple-system,sans-serif';
    let devCombo = 0;
    const mk = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText =
        'border:0;border-radius:8px;padding:9px 12px;color:#fff;' +
        'background:#3a7;cursor:pointer;font:inherit;-webkit-tap-highlight-color:transparent';
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        ctxResume(); fn(b);
      });
      wrap.appendChild(b);
      return b;
    };
    mk('一般放下', () => this.sfx('place'));
    mk('切除', () => this.sfx('slice'));
    mk('遊戲結束', () => this.sfx('over'));
    const pb = mk('完美 +1（連擊 0）', (b) => {
      devCombo++;
      this.sfx('perfect', devCombo);
      b.textContent = `完美 +1（連擊 ${devCombo}）`;
    });
    mk('完美音階 1→14', () => {
      for (let i = 1; i <= 14; i++) {
        setTimeout(() => this.sfx('perfect', i), (i - 1) * 260);
      }
    });
    mk('重置連擊', () => { devCombo = 0; pb.textContent = '完美 +1（連擊 0）'; });
    document.body.appendChild(wrap);
  }

  resetGame() {
    this.tower = [];                 // 已放置方塊資料
    this.level = 0;
    this.combo = 0;
    this.state = 'playing';
    this.camY = 0;                   // 相機垂直位移（px），隨高度上移
    this.camYTarget = 0;
    this.chip = null;
    this.fx = [];                    // 完美對齊特效（外框＋噴出小方塊）

    // 基座（滿尺寸，置中，不參與切除）
    const base = { cx: 0, cz: 0, fx: F0, fz: F0, lvl: 0, color: blockColor(0) };
    this.tower.push(base);
    this.below = base;

    this.gChip.clear();
    this.drawBg();
    this.drawTower();
    this.scoreText.setText('0');
    this.updateBest();
    this.tipText.setText('點擊放下方塊').setAlpha(0.85);
    this.spawnMovingBlock();
  }

  spawnMovingBlock() {
    this.level++;
    const axis = this.level % 2 === 1 ? 'x' : 'z'; // 交替軸
    const b = this.below;
    const blk = {
      cx: b.cx, cz: b.cz, fx: b.fx, fz: b.fz,
      lvl: this.level, color: blockColor(this.level),
    };
    blk.axis = axis;
    const center = axis === 'x' ? b.cx : b.cz;
    blk.center = center;            // 擺動中心（沿用下方中心）
    blk.m = center - TRAVEL;        // 從一端進入
    blk.dir = 1;
    if (axis === 'x') blk.cx = blk.m; else blk.cz = blk.m;
    this.moveBlk = blk;
    this.moving = true;
    this.camYTarget = this.level * THICK; // 相機目標位移，update 逐幀逼近
  }

  update(_, dt) {
    const ds = dt / 1000;

    // 星點：緩慢上飄 + 明滅閃爍（任何狀態都動）
    this.gPart.clear();
    const tn = this.time.now / 1000;
    for (const p of this.parts) {
      p.y -= p.spd * ds;
      if (p.y < -12) { p.y = H * RES + 12; p.x = Math.random() * W * RES; }
      const a = p.a * (0.35 + 0.65 * Math.abs(Math.sin(tn * p.tw + p.ph)));
      this.gPart.fillStyle(0xffffff, a);
      this.gPart.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }

    if (this.state === 'playing' && this.moveBlk && this.moving) {
      const blk = this.moveBlk;
      const spd = Math.min(SPEED_BASE + this.combo * SPEED_PER, SPEED_MAX);
      blk.m += blk.dir * spd * ds;
      if (blk.m > blk.center + TRAVEL) { blk.m = blk.center + TRAVEL; blk.dir = -1; }
      else if (blk.m < blk.center - TRAVEL) { blk.m = blk.center - TRAVEL; blk.dir = 1; }
      if (blk.axis === 'x') blk.cx = blk.m; else blk.cz = blk.m;
    }

    // 相機等速上升（連續、位置無瞬跳），效能已證實每幀重畫亦穩定 60fps
    const step = CAM_SPEED * ds;
    const dy = this.camYTarget - this.camY;
    this.camY += Math.abs(dy) <= step ? dy : Math.sign(dy) * step;

    this.drawTower();
    if (this.moveBlk && this.state === 'playing') {
      this.gMove.clear();
      this.drawBlock(this.gMove, this.moveBlk, 0, 1);
    }
    if (this.chip) {
      const c = this.chip;
      c.vy += 2600 * ds;             // 強重力，明確加速墜落
      c.drop += c.vy * ds;
      if (c.axis === 'x') c.cx += c.vAxis * ds;  // 沿切除軸往外側翻離塔
      else c.cz += c.vAxis * ds;
      this.gChip.clear();
      this.drawBlock(this.gChip, c, c.drop, 1);   // 全程不透明，掉出畫面才銷毀
      if (c.drop > H + 220) this.chip = null;
    }
    this.updateFx(ds);
  }

  onTap() {
    const ctx = this.sound && this.sound.context;
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (this.state === 'over') { this.resetGame(); return; }
    if (this.state === 'playing' && this.moving) {
      if (this.tipText.alpha > 0) this.tipText.setAlpha(0);
      this.placeBlock();
    }
  }

  placeBlock() {
    this.moving = false;
    const blk = this.moveBlk;
    const below = this.below;
    const axis = blk.axis;
    const bc = axis === 'x' ? below.cx : below.cz;     // 下方中心
    const bf = axis === 'x' ? below.fx : below.fz;     // 下方該軸尺寸
    const mc = blk.m;                                   // 本塊中心
    const delta = mc - bc;
    const overlap = bf - Math.abs(delta);

    if (overlap <= 0) { this.gameOver(blk); return; }

    if (Math.abs(delta) <= PERFECT) {
      // 完美對齊：尺寸與下方完全相同、置中，不縮減也不放大（上層永不大於下層）
      this.applyAxis(blk, axis, bc, bf);
      this.combo++;
      this.flashPerfect(blk);
      this.playSound('perfect');
    } else {
      // 切除：保留重疊段，溢出塊掉落
      this.combo = 0;
      const newC = bc + delta / 2;                      // 重疊段中心
      const mf = axis === 'x' ? blk.fx : blk.fz;        // 本塊該軸原尺寸
      const offC = delta > 0
        ? (bc + bf / 2 + mc + mf / 2) / 2               // 外溢段中心（正向）
        : (bc - bf / 2 + mc - mf / 2) / 2;              // 外溢段中心（負向）
      const chip = {
        cx: blk.cx, cz: blk.cz, fx: blk.fx, fz: blk.fz,
        lvl: blk.lvl, color: blk.color, drop: 0, vy: 40,
        axis, vAxis: Math.sign(delta) * 230, // 往外溢方向翻離
      };
      this.applyAxis(chip, axis, offC, Math.abs(delta));
      this.chip = chip;

      this.applyAxis(blk, axis, newC, overlap);
      this.playSound('slice');
      this.playSound('place');
    }

    this.tower.push(blk);
    this.below = blk;
    this.scoreText.setText(String(this.level));
    this.drawBg();
    this.drawTower();
    this.spawnMovingBlock();
    this.moving = true;
  }

  applyAxis(b, axis, center, size) {
    if (axis === 'x') { b.cx = center; b.fx = size; }
    else { b.cz = center; b.fz = size; }
  }

  // 等角投影：plan (px,pz) 於高度 lvl → 螢幕座標
  proj(px, pz, lvl, dropPx) {
    const ux = px - pz;
    const uy = (px + pz) / 2;
    return {
      x: (CX + ux) * RES,
      y: (CY + uy - lvl * THICK + this.camY + (dropPx || 0)) * RES,
    };
  }

  drawBlock(g, b, dropPx, alpha) {
    const ax = b.fx / 2, az = b.fz / 2;
    const top = b.lvl + 1, bot = b.lvl;
    const P = (sx, sz, lv) => this.proj(b.cx + sx, b.cz + sz, lv, dropPx);
    const At = P(-ax, -az, top), Bt = P(ax, -az, top), Ct = P(ax, az, top), Dt = P(-ax, az, top);
    const Bb = P(ax, -az, bot), Cb = P(ax, az, bot), Db = P(-ax, az, bot);
    if (At.y > (H + 140) * RES && Ct.y > (H + 140) * RES) return; // 已滾出畫面下方則略過

    const a = alpha == null ? 1 : alpha;
    g.fillStyle(shade(b.color, 0.52), a);   // 左側面（前緣 C-D）最暗
    g.fillPoints([Dt, Ct, Cb, Db], true);
    g.fillStyle(shade(b.color, 0.72), a);   // 右側面（前緣 C-B）次暗
    g.fillPoints([Ct, Bt, Bb, Cb], true);
    g.fillStyle(b.color, a);                // 頂面最亮
    g.fillPoints([At, Bt, Ct, Dt], true);
  }

  drawTower() {
    this.gTower.clear();
    for (const b of this.tower) this.drawBlock(this.gTower, b, 0, 1);
  }

  flashPerfect(blk) {
    const ax = blk.fx / 2, az = blk.fz / 2, top = blk.lvl + 1;
    const P = (sx, sz) => this.proj(blk.cx + sx, blk.cz + sz, top, 0);
    const A = P(-ax, -az), B = P(ax, -az), C = P(ax, az), D = P(-ax, az);
    const cx = (A.x + B.x + C.x + D.x) / 4;
    const cy = (A.y + B.y + C.y + D.y) / 4;
    const cmb = Math.min(this.combo, 10);

    // 擴張外框：連擊越高擴越大、越亮
    this.fx.push({
      ring: [A, B, C, D], cx, cy, t: 0,
      life: 0.42, grow: 0.45 + cmb * 0.06,
    });
    // 沿頂面四周噴出小方塊，數量隨連擊增加
    const n = Math.min(28, 8 + this.combo * 3);
    for (let k = 0; k < n; k++) {
      const e = (k / n) * Math.PI * 2 + Math.random() * 0.3;
      const dx = Math.cos(e), dy = Math.sin(e) * 0.5; // 等角壓扁
      const sp = (130 + Math.random() * 170) * RES;
      this.fx.push({
        x: cx + dx * 10 * RES, y: cy + dy * 10 * RES,
        vx: dx * sp, vy: dy * sp - 70 * RES,
        s: (3 + Math.random() * 4) * RES,
        t: 0, life: 0.38 + Math.random() * 0.28,
      });
    }
  }

  updateFx(ds) {
    this.gFx.clear();
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += ds;
      const k = f.t / f.life;
      if (k >= 1) { this.fx.splice(i, 1); continue; }
      if (f.ring) {
        const g = 1 + f.grow * k, a = 1 - k;
        const pts = f.ring.map(pt => ({
          x: f.cx + (pt.x - f.cx) * g, y: f.cy + (pt.y - f.cy) * g,
        }));
        this.gFx.lineStyle(3 * RES, 0xffffff, a);
        this.gFx.strokePoints(pts, true, true);
      } else {
        f.vy += 560 * RES * ds;
        f.x += f.vx * ds; f.y += f.vy * ds;
        const sz = f.s * (1 - 0.5 * k);
        this.gFx.fillStyle(0xffffff, 1 - k);
        this.gFx.fillRect(f.x - sz / 2, f.y - sz / 2, sz, sz);
      }
    }
  }

  drawBg() {
    // 明亮暖色漸層：隨高度循環色相，但整體調亮（朝白混合）如原版
    const base = blockColor(this.level);
    const top = mix(base, 0xffffff, 0.60);   // 上方較亮
    const bot = mix(base, 0xffffff, 0.30);   // 下方較飽和
    this.bg.clear();
    this.bg.fillGradientStyle(top, top, bot, bot, 1);
    this.bg.fillRect(0, 0, W * RES, H * RES);
  }

  playSound(key) { this.sfx(key); }

  initAudio() {
    const ctx = this.sound && this.sound.context;
    if (!ctx || this._master) return;
    this._ctx = ctx;
    this._master = ctx.createGain();
    this._master.gain.value = 0.45;
    this._master.connect(ctx.destination);
  }

  tone(freq, dur, type, peak, when) {
    const ctx = this._ctx;
    const t0 = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this._master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  sfx(kind, comboOverride) {
    this.initAudio();
    if (!this._ctx) return;
    if (kind === 'place') {
      this.tone(174.6, 0.12, 'sine', 0.34);
      this.tone(116.5, 0.10, 'sine', 0.22);
    } else if (kind === 'slice') {
      this.tone(150, 0.09, 'triangle', 0.28);
      this.tone(86, 0.13, 'sine', 0.16);
    } else if (kind === 'perfect') {
      // 七聲大調音階隨連擊一路爬升（do re mi fa sol la si）
      const combo = comboOverride != null ? comboOverride : this.combo;
      const major = [0, 2, 4, 5, 7, 9, 11];
      const n = Math.max(0, combo - 1);
      const semi = major[n % 7] + 12 * Math.floor(n / 7);
      const f = 261.6 * Math.pow(2, semi / 12);
      this.tone(f, 0.42, 'triangle', 0.40);
      this.tone(f * 2, 0.26, 'sine', 0.14);
    } else if (kind === 'over') {
      this.tone(220, 0.16, 'sine', 0.38);
      this.tone(146.8, 0.34, 'sine', 0.36, 0.13);
      this.tone(98, 0.5, 'sine', 0.30, 0.28);
    }
  }

  drawCrown(cx, cy, s) {
    const g = this.crown;
    g.clear();
    g.fillStyle(0xffffff, 0.92);
    g.fillPoints([
      { x: cx - s, y: cy + s * 0.55 },
      { x: cx - s, y: cy - s * 0.15 },
      { x: cx - s * 0.45, y: cy + s * 0.12 },
      { x: cx, y: cy - s * 0.72 },
      { x: cx + s * 0.45, y: cy + s * 0.12 },
      { x: cx + s, y: cy - s * 0.15 },
      { x: cx + s, y: cy + s * 0.55 },
    ], true);
  }

  updateBest() {
    this.bestText.setText(String(this.best));
    const s = 15 * RES, gap = 11 * RES, tw = this.bestText.width, cy = 232 * RES;
    const total = s * 2 + gap + tw;
    const left = W * RES / 2 - total / 2;
    this.drawCrown(left + s, cy, s);
    this.bestText.setPosition(left + s * 2 + gap, cy);
  }

  gameOver(blk) {
    this.state = 'over';
    this.playSound('over');
    const score = this.level - 1;
    if (score > this.best) {
      this.best = score;
      localStorage.setItem('stack_best', String(score));
      this.updateBest();
    }
    this.chip = { ...blk, drop: 0, vy: 80, axis: blk.axis, vAxis: 0 };
    this.gMove.clear();
    this.tipText.setText('按此重新開始').setAlpha(0.9);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W * RES,
  height: H * RES,
  backgroundColor: '#0c0c12',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [StackScene],
});
