/* 玩具兵團的特洛伊 — 程式向量美術（VISUAL_SPEC_v3）
 * 全部貼圖在啟動時以 Canvas 繪製：同一套色票、同一套造型語言。
 * 鐵律：扁平、圓角、無描邊、每物件最多三層色（主/亮/深）＋腳下橢圓影。
 */
window.TD = window.TD || {};

// ── 色票（唯一來源）──
TD.ART = {
  sea: '#4FA9E8', seaWave: '#7FC4F2', seaFoam: '#EAF4FF',
  sand: '#F2DCA0', sandDot: '#E3C983',
  grassA: '#A8D858', grassB: '#A0D14E', grassHi: '#B8E468',
  stone: '#F2E9D2', stoneLine: '#DFD2AE', stoneDim: '#E8DCBC', stoneDark: '#C9BA94',
  wood: '#8A5A32', woodHi: '#A8743E', woodDark: '#6E4626',
  bronze: '#C9A227', bronzeHi: '#D9B44A', bronzeDark: '#B08A18',
  troy: '#3E7FA8', troyDark: '#33688A', troyHi: '#4E93BE',
  greek: '#B54A38', greekDark: '#9C3A2A', greekHi: '#C25846',
  crest: '#D94A30', crestDark: '#B83A24',
  skinT: '#D9A878', skinG: '#E8B48A',
  leather: '#7A5A3A', leatherDark: '#5E442C',
  fire: '#FF8A2A', fireIn: '#FFD23C', spark: '#FFE08A', ember: '#FFB050',
  hide: '#C9A87A', hideDark: '#B08F60',
  char: '#241812', hole: '#2A1A10',
};

TD.Art = {

  generate(scene) {
    const A = TD.ART;
    this.s = scene;

    // ── 守軍（背面）──
    this.humanoid('a_def_archer', { facing: 'back', tunic: A.troy, weapon: 'bow' });
    this.humanoid('a_def_spear',  { facing: 'back', tunic: A.troy, weapon: 'spearUp' });
    this.humanoid('a_def_stone',  { facing: 'back', tunic: A.troy, weapon: 'boulder' });
    this.humanoid('a_def_oil',    { facing: 'back', tunic: A.troy, weapon: 'pot' });

    // ── 敵軍（正面）──
    this.humanoid('a_soldier',  { facing: 'front', tunic: A.greek, weapon: 'sword', shield: 'side' });
    this.humanoid('a_runner',   { facing: 'front', tunic: A.greekHi, weapon: 'sword', slim: true });
    this.humanoid('a_shield',   { facing: 'front', tunic: A.greek, shield: 'big', wide: true });
    this.humanoid('a_torch',    { facing: 'front', tunic: A.greekDark, weapon: 'torch' });
    this.humanoid('a_ladderman',{ facing: 'front', tunic: A.greek, weapon: 'ladder' });
    this.humanoid('a_diomedes', { facing: 'front', tunic: A.bronze, weapon: 'sword', shield: 'side', cape: true });

    // ── 建築 ──
    this.wallSeg(); this.merlon();
    for (let i = 0; i < 4; i++) this.gate(i);
    this.brazier();

    // ── 器械與場景件 ──
    this.ship(); this.ram(); this.siegeTower(); this.catapult(); this.ladder();
    this.coin();
  },

  tex(key, w, h, draw) {
    const t = this.s.textures;
    if (t.exists(key)) t.remove(key);
    const cv = t.createCanvas(key, w, h);
    const c = cv.getContext();
    c.clearRect(0, 0, w, h);
    draw(c, w, h);
    cv.refresh();
  },

  rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  },

  fillRR(c, x, y, w, h, r, color) { this.rr(c, x, y, w, h, r); c.fillStyle = color; c.fill(); },

  // ══════════════ Q 版人形（140×190，腳底 y=182）══════════════
  humanoid(key, o) {
    const A = TD.ART;
    this.tex(key, 140, 190, (c) => {
      const cx = 70;
      const skin = o.facing === 'back' ? A.skinT : A.skinG;
      const tunic = o.tunic;
      const dark = this.shade(tunic, -18), hi = this.shade(tunic, 14);
      const bw = o.wide ? 76 : o.slim ? 56 : 66;      // 身寬

      // 影
      c.fillStyle = 'rgba(0,0,0,0.15)';
      c.beginPath(); c.ellipse(cx, 182, 34, 9, 0, 0, 7); c.fill();

      // 斗篷（背後層）
      if (o.cape) {
        c.fillStyle = A.crestDark;
        this.fillRR(c, cx - 44, 70, 88, 96, 18, A.crestDark);
      }
      // 雲梯（扛肩上，背後層）
      if (o.weapon === 'ladder') {
        c.save(); c.translate(cx, 90); c.rotate(-0.5);
        this.fillRR(c, -78, -34, 156, 9, 4, A.woodHi);
        this.fillRR(c, -78, -6, 156, 9, 4, A.woodHi);
        c.fillStyle = A.wood;
        for (let i = -60; i <= 60; i += 30) this.fillRR(c, i - 4, -30, 8, 26, 3, A.wood);
        c.restore();
      }

      // 腿
      c.fillStyle = A.leather;
      this.fillRR(c, cx - 24, 138, 20, 42, 9, A.leather);
      this.fillRR(c, cx + 4, 138, 20, 42, 9, A.leather);
      // 涼鞋帶
      c.fillStyle = A.leatherDark;
      this.fillRR(c, cx - 24, 168, 20, 8, 4, A.leatherDark);
      this.fillRR(c, cx + 4, 168, 20, 8, 4, A.leatherDark);

      // 軀幹（圓角梯形感：上寬下略窄）
      this.fillRR(c, cx - bw / 2, 74, bw, 74, 16, tunic);
      // 裙襬摺線
      c.fillStyle = dark;
      for (let i = 0; i < 3; i++) this.fillRR(c, cx - bw / 2 + 8 + i * (bw - 24) / 2.4, 128, 8, 20, 4, dark);
      // 左上柔光
      this.fillRR(c, cx - bw / 2 + 4, 78, bw / 3, 30, 10, hi);
      // 腰帶
      this.fillRR(c, cx - bw / 2, 118, bw, 12, 6, A.bronze);
      this.fillRR(c, cx - 6, 118, 12, 12, 4, A.bronzeHi);

      // 手臂
      const armY = 82;
      const drawArm = (side, up, len = 34) => {
        const ax = cx + side * (bw / 2 + 2);
        c.save(); c.translate(ax, armY);
        c.rotate(side * (up ? -1.9 : 0.35));
        this.fillRR(c, -8, 0, 16, len, 8, tunic);
        c.fillStyle = skin; c.beginPath(); c.arc(0, len - 2, 8, 0, 7); c.fill();
        c.restore();
      };

      // 頭
      c.fillStyle = skin;
      c.beginPath(); c.arc(cx, 48, 28, 0, 7); c.fill();
      if (o.facing === 'front') {
        c.fillStyle = '#3A2A20';
        c.beginPath(); c.arc(cx - 10, 50, 3.4, 0, 7); c.fill();
        c.beginPath(); c.arc(cx + 10, 50, 3.4, 0, 7); c.fill();
      }
      // 頭盔（圓頂＋護頰/護頸）
      c.fillStyle = A.bronze;
      c.beginPath(); c.arc(cx, 44, 29, Math.PI, 0); c.fill();
      this.fillRR(c, cx - 29, 40, 58, 10, 5, A.bronze);
      if (o.facing === 'front') {
        this.fillRR(c, cx - 29, 44, 10, 20, 5, A.bronze);   // 護頰
        this.fillRR(c, cx + 19, 44, 10, 20, 5, A.bronze);
      } else {
        this.fillRR(c, cx - 22, 46, 44, 14, 6, A.bronzeDark); // 護頸
      }
      // 盔頂高光
      c.fillStyle = A.bronzeHi;
      c.beginPath(); c.arc(cx - 8, 32, 10, Math.PI, 0); c.fill();
      // 紅纓
      c.fillStyle = A.crest;
      if (o.facing === 'back') {
        c.beginPath();
        c.moveTo(cx - 4, 66); c.quadraticCurveTo(cx - 14, 20, cx, 6);
        c.quadraticCurveTo(cx + 14, 20, cx + 4, 66); c.closePath(); c.fill();
      } else {
        c.beginPath();
        c.moveTo(cx - 26, 22); c.quadraticCurveTo(cx, -4, cx + 26, 22);
        c.quadraticCurveTo(cx, 12, cx - 26, 22); c.closePath(); c.fill();
      }

      // ── 武器 ──
      c.lineCap = 'round';
      if (o.weapon === 'bow') {
        drawArm(1, true);
        c.strokeStyle = A.woodHi; c.lineWidth = 7;
        c.beginPath(); c.arc(cx + bw / 2 + 14, 40, 40, -1.25, 1.25); c.stroke();
        c.strokeStyle = A.stone; c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(cx + bw / 2 + 26, 2); c.lineTo(cx + bw / 2 + 26, 78); c.stroke();
      } else if (o.weapon === 'spearUp') {
        drawArm(1, true);
        c.strokeStyle = A.woodHi; c.lineWidth = 8;
        c.beginPath(); c.moveTo(cx + bw / 2 + 12, 150); c.lineTo(cx + bw / 2 + 12, 14); c.stroke();
        c.fillStyle = A.bronzeHi;
        c.beginPath(); c.moveTo(cx + bw / 2 + 12, 0); c.lineTo(cx + bw / 2 + 2, 22);
        c.lineTo(cx + bw / 2 + 22, 22); c.closePath(); c.fill();
      } else if (o.weapon === 'boulder') {
        drawArm(-1, true); drawArm(1, true);
        c.fillStyle = '#9C9284';
        c.beginPath(); c.ellipse(cx, 12, 34, 26, 0, 0, 7); c.fill();
        c.fillStyle = '#B0A896';
        c.beginPath(); c.ellipse(cx - 10, 6, 14, 9, -0.4, 0, 7); c.fill();
      } else if (o.weapon === 'pot') {
        drawArm(-1, true); drawArm(1, true);
        c.fillStyle = A.leatherDark;
        this.fillRR(c, cx - 26, 2, 52, 34, 12, '#4A3A2A');
        this.fillRR(c, cx - 30, 0, 60, 10, 5, '#5E4A34');
        c.fillStyle = A.fire;
        this.fillRR(c, cx - 22, -4, 44, 8, 4, A.fire);
        c.fillStyle = A.fireIn;
        this.fillRR(c, cx - 12, -6, 24, 6, 3, A.fireIn);
      } else if (o.weapon === 'sword') {
        drawArm(-1, false);
        drawArm(1, true, 30);
        c.strokeStyle = '#D8D3C4'; c.lineWidth = 7;
        c.beginPath(); c.moveTo(cx + bw / 2 + 16, 44); c.lineTo(cx + bw / 2 + 34, 6); c.stroke();
        c.strokeStyle = A.bronze; c.lineWidth = 5;
        c.beginPath(); c.moveTo(cx + bw / 2 + 8, 40); c.lineTo(cx + bw / 2 + 26, 46); c.stroke();
      } else if (o.weapon === 'torch') {
        drawArm(-1, false);
        drawArm(1, true, 28);
        c.strokeStyle = A.woodHi; c.lineWidth = 8;
        c.beginPath(); c.moveTo(cx + bw / 2 + 14, 46); c.lineTo(cx + bw / 2 + 22, 8); c.stroke();
        // 火苗
        const fx = cx + bw / 2 + 24;
        c.fillStyle = A.fire;
        c.beginPath();
        c.moveTo(fx, 8); c.quadraticCurveTo(fx - 12, -8, fx - 4, -20);
        c.quadraticCurveTo(fx + 2, -10, fx + 6, -22);
        c.quadraticCurveTo(fx + 14, -6, fx + 8, 6); c.closePath(); c.fill();
        c.fillStyle = A.fireIn;
        c.beginPath(); c.ellipse(fx + 1, -4, 5, 9, 0, 0, 7); c.fill();
      } else {
        drawArm(-1, false); drawArm(1, false);
      }

      // 盾
      if (o.shield === 'side') {
        c.fillStyle = A.bronze;
        c.beginPath(); c.ellipse(cx - bw / 2 - 6, 96, 22, 30, 0, 0, 7); c.fill();
        c.fillStyle = A.bronzeDark;
        c.beginPath(); c.ellipse(cx - bw / 2 - 6, 96, 14, 20, 0, 0, 7); c.fill();
        c.fillStyle = A.bronzeHi;
        c.beginPath(); c.arc(cx - bw / 2 - 6, 96, 7, 0, 7); c.fill();
      } else if (o.shield === 'big') {
        c.fillStyle = A.bronze;
        c.beginPath(); c.ellipse(cx, 106, 42, 56, 0, 0, 7); c.fill();
        c.fillStyle = A.bronzeDark;
        c.beginPath(); c.ellipse(cx, 106, 30, 42, 0, 0, 7); c.fill();
        c.fillStyle = A.bronzeHi;
        c.beginPath(); c.arc(cx, 106, 12, 0, 7); c.fill();
        // 盾上高光
        c.fillStyle = 'rgba(255,255,255,0.18)';
        c.beginPath(); c.ellipse(cx - 14, 78, 12, 20, -0.5, 0, 7); c.fill();
      }
    });
  },

  shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, v + Math.round(255 * amt / 100)));
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
    return `rgb(${r},${g},${b})`;
  },

  // ══════════════ 城牆段（256×220，可水平拼接）══════════════
  wallSeg() {
    const A = TD.ART;
    this.tex('a_wall', 256, 220, (c, w, h) => {
      c.fillStyle = A.stone; c.fillRect(0, 0, w, h);
      // 頂部走道
      c.fillStyle = '#F7F0DC'; c.fillRect(0, 0, w, 26);
      c.fillStyle = A.stoneLine; c.fillRect(0, 26, w, 4);
      // 磚（64 寬、交錯半格 — 對齊 256 保證無縫）
      c.fillStyle = A.stoneLine;
      for (let row = 0; row < 4; row++) {
        const y = 30 + row * 40;
        c.fillRect(0, y + 38, w, 3);
        const off = row % 2 ? 32 : 0;
        for (let x = -32; x < w + 32; x += 64) c.fillRect(x + off, y, 3, 38);
      }
      // 少量磚色差（精緻感：隨機淡塊）
      c.fillStyle = '#EDE2C4';
      [[10, 34], [138, 34], [74, 74], [202, 74], [42, 114], [170, 114], [106, 154], [10, 154]]
        .forEach(([x, y]) => c.fillRect(x + 2, y + 2, 58, 34));
      // 基座
      c.fillStyle = A.stoneDark; c.fillRect(0, h - 26, w, 26);
      c.fillStyle = A.stoneDim; c.fillRect(0, h - 26, w, 4);
    });
  },

  // ══════════════ 垛口（88×112）══════════════
  merlon() {
    const A = TD.ART;
    this.tex('a_merlon', 88, 112, (c) => {
      this.fillRR(c, 4, 8, 80, 104, 10, A.stoneDim);
      this.fillRR(c, 0, 0, 88, 22, 8, A.stone);        // 頂帽
      c.fillStyle = A.stoneDark;
      this.fillRR(c, 70, 26, 10, 82, 5, A.stoneDark);  // 右側影
      this.fillRR(c, 36, 34, 16, 48, 8, '#8A7A5C');    // 箭縫
      c.fillStyle = '#F7F0DC';
      this.fillRR(c, 6, 2, 30, 8, 4, '#F7F0DC');       // 頂高光
    });
  },

  // ══════════════ 城門四態（440×380）══════════════
  gate(stage) {
    const A = TD.ART;
    this.tex(`a_gate_${stage}`, 440, 380, (c, w, h) => {
      const cx = w / 2;
      // 石框
      this.fillRR(c, 10, 40, 70, h - 40, 12, A.stoneDim);
      this.fillRR(c, w - 80, 40, 70, h - 40, 12, A.stoneDim);
      c.fillStyle = A.stoneLine;
      for (let y = 70; y < h - 20; y += 46) { c.fillRect(14, y, 62, 3); c.fillRect(w - 76, y, 62, 3); }
      // 拱
      c.fillStyle = A.stoneDim;
      c.beginPath(); c.arc(cx, 116, 160, Math.PI, 0); c.lineTo(cx + 160, 40); c.lineTo(cx - 160, 40); c.closePath();
      c.beginPath();
      c.arc(cx, 120, 170, Math.PI, 0);
      c.arc(cx, 120, 108, 0, Math.PI, true);
      c.closePath(); c.fill();
      // 拱磚縫
      c.strokeStyle = A.stoneLine; c.lineWidth = 3;
      for (let a = 0.35; a < Math.PI; a += 0.44) {
        c.beginPath();
        c.moveTo(cx + Math.cos(Math.PI + a) * 108, 120 + Math.sin(Math.PI + a) * 108);
        c.lineTo(cx + Math.cos(Math.PI + a) * 170, 120 + Math.sin(Math.PI + a) * 170);
        c.stroke();
      }
      // 楣心徽章（金盾＋馬首剪影）
      c.fillStyle = A.bronze;
      this.fillRR(c, cx - 26, 28, 52, 60, 12, A.bronze);
      c.fillStyle = A.bronzeHi;
      this.fillRR(c, cx - 20, 34, 40, 26, 8, A.bronzeHi);
      c.fillStyle = A.woodDark;
      c.beginPath();
      c.moveTo(cx - 8, 74); c.quadraticCurveTo(cx - 10, 52, cx + 2, 48);
      c.quadraticCurveTo(cx + 14, 44, cx + 12, 56); c.quadraticCurveTo(cx + 6, 56, cx + 4, 62);
      c.lineTo(cx + 6, 74); c.closePath(); c.fill();

      // 門板（拱形內）
      c.save();
      c.beginPath();
      c.arc(cx, 120, 110, Math.PI, 0);
      c.lineTo(cx + 110, h); c.lineTo(cx - 110, h); c.closePath();
      c.clip();
      const skew = stage >= 3 ? 0.05 : 0;
      c.save();
      if (skew) { c.translate(cx, h); c.rotate(skew); c.translate(-cx, -h); }
      c.fillStyle = A.wood;
      c.fillRect(cx - 112, 10, 224, h);
      // 板縫
      c.strokeStyle = A.woodDark; c.lineWidth = 4;
      for (let i = -2; i <= 2; i++) {
        c.beginPath(); c.moveTo(cx + i * 45, 10); c.lineTo(cx + i * 45, h); c.stroke();
      }
      // 木紋（精緻感：淡短線）
      c.strokeStyle = this.shade(A.wood, 8); c.lineWidth = 2;
      [[cx - 90, 150], [cx - 20, 200], [cx + 60, 170], [cx - 60, 300], [cx + 30, 320]].forEach(([x, y]) => {
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 12, y + 8, x + 4, y + 22); c.stroke();
      });
      // 青銅橫箍＋鉚釘
      [188, 300].forEach(y => {
        c.fillStyle = A.bronze; c.fillRect(cx - 112, y, 224, 22);
        c.fillStyle = A.bronzeHi; c.fillRect(cx - 112, y, 224, 7);
        c.fillStyle = A.bronzeDark;
        for (let x = -96; x <= 96; x += 32) { c.beginPath(); c.arc(cx + x, y + 13, 5, 0, 7); c.fill(); }
      });
      // 門環
      [-46, 46].forEach(dx => {
        c.fillStyle = A.bronzeDark; c.beginPath(); c.arc(cx + dx, 252, 12, 0, 7); c.fill();
        c.strokeStyle = A.bronzeHi; c.lineWidth = 6;
        c.beginPath(); c.arc(cx + dx, 262, 12, 0.3, Math.PI - 0.3); c.stroke();
      });
      c.restore();

      // ── 損傷疊層 ──
      if (stage >= 1) {
        c.strokeStyle = A.woodDark; c.lineWidth = 5; c.lineCap = 'round';
        [[cx - 70, 120, cx - 50, 240], [cx + 30, 100, cx + 62, 210]].forEach(([x1, y1, x2, y2]) => {
          c.beginPath(); c.moveTo(x1, y1);
          c.lineTo((x1 + x2) / 2 + 14, (y1 + y2) / 2);
          c.lineTo(x2, y2); c.stroke();
        });
      }
      if (stage >= 2) {
        // 破洞
        c.fillStyle = A.hole;
        c.beginPath();
        c.moveTo(cx - 30, 190); c.lineTo(cx + 8, 176); c.lineTo(cx + 40, 200);
        c.lineTo(cx + 30, 240); c.lineTo(cx - 8, 252); c.lineTo(cx - 38, 226);
        c.closePath(); c.fill();
        // 焦邊
        c.strokeStyle = A.char; c.lineWidth = 8;
        c.beginPath();
        c.moveTo(cx - 34, 186); c.lineTo(cx + 10, 172); c.lineTo(cx + 44, 198); c.stroke();
      }
      if (stage >= 3) {
        c.fillStyle = A.hole;
        c.beginPath();
        c.moveTo(cx - 100, 300); c.lineTo(cx - 50, 280); c.lineTo(cx - 30, 330);
        c.lineTo(cx - 70, 368); c.lineTo(cx - 104, 344); c.closePath(); c.fill();
        c.fillStyle = A.char;
        c.globalAlpha = 0.55;
        c.fillRect(cx - 112, 280, 224, 100);
        c.globalAlpha = 1;
      }
      c.restore();

      if (stage >= 1) {
        // 石框缺角
        c.fillStyle = A.stoneDark;
        c.beginPath(); c.moveTo(24, 60); c.lineTo(52, 66); c.lineTo(30, 84); c.closePath(); c.fill();
      }
    });
  },

  // ══════════════ 火盆（120×140）══════════════
  brazier() {
    const A = TD.ART;
    this.tex('a_brazier', 120, 140, (c) => {
      c.fillStyle = 'rgba(0,0,0,0.15)';
      c.beginPath(); c.ellipse(60, 132, 34, 8, 0, 0, 7); c.fill();
      c.strokeStyle = A.bronzeDark; c.lineWidth = 9; c.lineCap = 'round';
      [[-22, 1], [0, 0], [22, -1]].forEach(([dx]) => {
        c.beginPath(); c.moveTo(60 + dx * 0.4, 92); c.lineTo(60 + dx, 128); c.stroke();
      });
      c.fillStyle = A.bronze;
      c.beginPath(); c.ellipse(60, 74, 42, 26, 0, 0, Math.PI); c.fill();
      c.fillStyle = A.bronzeHi;
      c.beginPath(); c.ellipse(60, 72, 42, 10, 0, 0, 7); c.fill();
      c.fillStyle = '#4A3428';
      c.beginPath(); c.ellipse(60, 72, 32, 6, 0, 0, 7); c.fill();
    });
  },

  // ══════════════ 黑船（240×170）══════════════
  ship() {
    const A = TD.ART;
    this.tex('a_ship', 240, 170, (c) => {
      const hull = '#3A2E28', hullHi = '#4A3A30';
      // 船身
      c.fillStyle = hull;
      c.beginPath();
      c.moveTo(12, 108);
      c.quadraticCurveTo(120, 148, 228, 108);
      c.lineTo(206, 138); c.quadraticCurveTo(120, 158, 34, 138);
      c.closePath(); c.fill();
      // 船首尾翹起
      c.strokeStyle = hull; c.lineWidth = 12; c.lineCap = 'round';
      c.beginPath(); c.moveTo(16, 106); c.quadraticCurveTo(4, 88, 10, 68); c.stroke();
      c.beginPath(); c.moveTo(224, 106); c.quadraticCurveTo(238, 86, 230, 64); c.stroke();
      // 舷板線
      c.strokeStyle = hullHi; c.lineWidth = 4;
      c.beginPath(); c.moveTo(24, 118); c.quadraticCurveTo(120, 150, 216, 118); c.stroke();
      // 船眼
      c.fillStyle = '#F2E9D2'; c.beginPath(); c.arc(38, 116, 7, 0, 7); c.fill();
      c.fillStyle = '#241812'; c.beginPath(); c.arc(40, 116, 3.5, 0, 7); c.fill();
      // 桅杆＋帆
      c.fillStyle = '#5A4636'; c.fillRect(116, 20, 8, 92);
      c.fillStyle = A.crestDark;
      c.beginPath();
      c.moveTo(128, 26); c.quadraticCurveTo(196, 52, 128, 92);
      c.closePath(); c.fill();
      c.fillStyle = A.crest;
      c.beginPath();
      c.moveTo(128, 32); c.quadraticCurveTo(180, 54, 128, 84);
      c.closePath(); c.fill();
    });
  },

  // ══════════════ 攻城槌（260×190）══════════════
  ram() {
    const A = TD.ART;
    this.tex('a_ram', 260, 190, (c) => {
      c.fillStyle = 'rgba(0,0,0,0.14)';
      c.beginPath(); c.ellipse(130, 178, 92, 12, 0, 0, 7); c.fill();
      // 輪
      [[62, 158], [198, 158]].forEach(([x, y]) => {
        c.fillStyle = '#5A4636'; c.beginPath(); c.arc(x, y, 26, 0, 7); c.fill();
        c.fillStyle = '#8A745A'; c.beginPath(); c.arc(x, y, 10, 0, 7); c.fill();
      });
      // 車體
      this.fillRR(c, 26, 70, 208, 84, 16, A.wood);
      // 獸皮棚
      c.fillStyle = A.hide;
      c.beginPath();
      c.moveTo(18, 84); c.quadraticCurveTo(130, 28, 242, 84);
      c.lineTo(242, 100); c.quadraticCurveTo(130, 48, 18, 100);
      c.closePath(); c.fill();
      c.fillStyle = A.hideDark;
      c.beginPath();
      c.moveTo(18, 96); c.quadraticCurveTo(130, 44, 242, 96);
      c.lineTo(242, 102); c.quadraticCurveTo(130, 50, 18, 102);
      c.closePath(); c.fill();
      // 板縫
      c.strokeStyle = A.woodDark; c.lineWidth = 4;
      [70, 130, 190].forEach(x => { c.beginPath(); c.moveTo(x, 104); c.lineTo(x, 152); c.stroke(); });
      // 公羊頭（前端金球＋捲角）
      c.fillStyle = A.bronze; c.beginPath(); c.arc(22, 128, 24, 0, 7); c.fill();
      c.fillStyle = A.bronzeHi; c.beginPath(); c.arc(14, 120, 9, 0, 7); c.fill();
      c.strokeStyle = A.bronzeDark; c.lineWidth = 7;
      c.beginPath(); c.arc(30, 112, 12, -0.5, Math.PI + 0.8); c.stroke();
    });
  },

  // ══════════════ 攻城塔（220×300）══════════════
  siegeTower() {
    const A = TD.ART;
    this.tex('a_siegetower', 220, 300, (c) => {
      c.fillStyle = 'rgba(0,0,0,0.14)';
      c.beginPath(); c.ellipse(110, 288, 84, 11, 0, 0, 7); c.fill();
      [[50, 272], [170, 272]].forEach(([x, y]) => {
        c.fillStyle = '#5A4636'; c.beginPath(); c.arc(x, y, 22, 0, 7); c.fill();
        c.fillStyle = '#8A745A'; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill();
      });
      // 三層塔身（往上略縮）
      this.fillRR(c, 30, 180, 160, 92, 12, A.wood);
      this.fillRR(c, 38, 100, 144, 88, 12, this.shade(A.wood, 5));
      this.fillRR(c, 46, 28, 128, 80, 12, A.woodHi);
      // 獸皮側披
      c.fillStyle = A.hide;
      this.fillRR(c, 46, 28, 128, 26, 12, A.hide);
      // 窗
      c.fillStyle = A.char;
      this.fillRR(c, 96, 130, 28, 34, 8, '#3A2A1C');
      this.fillRR(c, 96, 208, 28, 34, 8, '#3A2A1C');
      // 頂層垛口
      c.fillStyle = A.woodHi;
      [-48, -16, 16, 48].forEach(dx => this.fillRR(c, 110 + dx - 10, 12, 20, 22, 5, A.woodHi));
      // 橫杆線
      c.strokeStyle = A.woodDark; c.lineWidth = 4;
      [100, 180].forEach(y => { c.beginPath(); c.moveTo(40, y); c.lineTo(180, y); c.stroke(); });
    });
  },

  // ══════════════ 投石機（240×200）══════════════
  catapult() {
    const A = TD.ART;
    this.tex('a_catapult', 240, 200, (c) => {
      c.fillStyle = 'rgba(0,0,0,0.14)';
      c.beginPath(); c.ellipse(120, 188, 88, 11, 0, 0, 7); c.fill();
      [[52, 170], [188, 170]].forEach(([x, y]) => {
        c.fillStyle = '#5A4636'; c.beginPath(); c.arc(x, y, 20, 0, 7); c.fill();
        c.fillStyle = '#8A745A'; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill();
      });
      // 底座
      this.fillRR(c, 30, 140, 180, 34, 10, A.wood);
      // A 字架
      c.strokeStyle = A.woodHi; c.lineWidth = 14; c.lineCap = 'round';
      c.beginPath(); c.moveTo(70, 148); c.lineTo(120, 60); c.stroke();
      c.beginPath(); c.moveTo(170, 148); c.lineTo(120, 60); c.stroke();
      // 絞繩
      c.fillStyle = A.hide; c.beginPath(); c.arc(120, 132, 16, 0, 7); c.fill();
      c.fillStyle = A.hideDark; c.beginPath(); c.arc(120, 132, 8, 0, 7); c.fill();
      // 投臂＋杓＋石
      c.strokeStyle = A.wood; c.lineWidth = 12;
      c.beginPath(); c.moveTo(120, 132); c.lineTo(196, 36); c.stroke();
      c.fillStyle = A.woodDark;
      c.beginPath(); c.arc(200, 32, 17, 0, 7); c.fill();
      c.fillStyle = '#9C9284';
      c.beginPath(); c.arc(200, 28, 11, 0, 7); c.fill();
    });
  },

  // ══════════════ 雲梯（80×340）══════════════
  ladder() {
    const A = TD.ART;
    this.tex('a_ladder', 80, 340, (c) => {
      c.fillStyle = A.woodHi;
      this.fillRR(c, 8, 0, 14, 340, 7, A.woodHi);
      this.fillRR(c, 58, 0, 14, 340, 7, A.woodHi);
      c.fillStyle = A.wood;
      for (let y = 18; y < 330; y += 44) this.fillRR(c, 14, y, 52, 11, 5, A.wood);
      // 頂鉤
      c.strokeStyle = A.bronzeDark; c.lineWidth = 8; c.lineCap = 'round';
      c.beginPath(); c.arc(15, 8, 10, Math.PI, Math.PI * 1.7); c.stroke();
      c.beginPath(); c.arc(65, 8, 10, Math.PI * 1.3, Math.PI * 2); c.stroke();
    });
  },

  // ══════════════ 金幣（64）══════════════
  coin() {
    const A = TD.ART;
    this.tex('a_coin', 64, 64, (c) => {
      c.fillStyle = A.bronzeDark; c.beginPath(); c.arc(32, 34, 28, 0, 7); c.fill();
      c.fillStyle = '#FFC83D'; c.beginPath(); c.arc(32, 30, 28, 0, 7); c.fill();
      c.fillStyle = '#FFD86A'; c.beginPath(); c.arc(32, 30, 20, 0, 7); c.fill();
      c.fillStyle = '#FFC83D'; c.beginPath(); c.arc(32, 30, 13, 0, 7); c.fill();
      c.fillStyle = '#FFF0B8'; c.beginPath(); c.ellipse(22, 18, 9, 5, -0.6, 0, 7); c.fill();
    });
  },
};
