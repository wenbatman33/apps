/* 載入資源；AI 素材若尚未生成完成，自動以程序繪製的陶器風剪影替代 */
window.TD = window.TD || {};

TD.BootScene = class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const W = TD.GAME_W, H = TD.GAME_H;
    this.cameras.main.setBackgroundColor('#2FA8E0');

    // ── 載入畫面 ──
    const g = this.add.graphics();
    g.fillStyle(0x5E3A18, 1).fillRect(0, 0, W, H);
    this.add.text(W / 2, H / 2 - 160, '防守特洛伊', {
      fontFamily: TD.FONT, fontSize: '92px', color: TD.CSS.gold,
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 - 70, 'TROY  DEFENSE', {
      fontFamily: 'Georgia, serif', fontSize: '34px', color: '#C9A87C',
    }).setOrigin(0.5).setLetterSpacing?.(8);

    const barW = 620, barX = (W - barW) / 2, barY = H / 2 + 40;
    const frame = this.add.graphics();
    frame.lineStyle(3, TD.PALETTE.bronze, 1).strokeRect(barX, barY, barW, 22);
    const fill = this.add.graphics();
    const pct = this.add.text(W / 2, barY + 70, '', {
      fontFamily: TD.FONT, fontSize: '30px', color: '#C9A87C',
    }).setOrigin(0.5);

    this.load.on('progress', (v) => {
      fill.clear().fillStyle(TD.PALETTE.ochre, 1)
        .fillRect(barX + 3, barY + 3, (barW - 6) * v, 16);
      pct.setText(`${Math.round(v * 100)}%`);
    });

    // 缺圖不該中斷載入
    this.missing = new Set();
    this.load.on('loaderror', (f) => this.missing.add(f.key));

    // ── 實際資源 ──
    this.load.setPath('public/assets');
    const P = (cat, id) => this.load.image(id, `${cat}/${id}.png`);

    ['T_archer_1', 'T_archer_3', 'T_archer_6', 'T_spear_1', 'T_spear_3', 'T_spear_6',
     'T_stone_1', 'T_stone_3', 'T_stone_6', 'T_oil_1', 'T_oil_3', 'T_oil_6',
     'T_priest_1', 'T_priest_3', 'T_priest_6'].forEach(id => P('T', id));

    // 敵人是 4 幀行走循環 sprite sheet
    TD.WALK_FRAMES = 4;
    TD.SHEET_W = 1536; TD.SHEET_H = 1024;
    this.sheetIds = ['E_soldier', 'E_shield', 'E_runner', 'E_siege', 'E_fire',
      'E_achilles', 'E_ajax', 'E_odysseus', 'E_diomedes', 'E_agamemnon',
      'E_healer', 'E_flyer', 'E_myrmidon', 'E_drummer'];
    this.sheetIds.forEach(id => this.load.spritesheet(id, `E/${id}.png`, {
      frameWidth: TD.SHEET_W / TD.WALK_FRAMES, frameHeight: TD.SHEET_H,
    }));

    ['H_hector', 'H_paris', 'H_cassandra', 'H_aeneas', 'H_penthesilea'].forEach(id => P('H', id));

    ['B_field_sq', 'B_field_night_sq', 'B_city_sq', 'B_horse'].forEach(id => P('B', id));

    ['U_title', 'U_coin', 'U_barricade'].forEach(id => P('U', id));

    // 大型融合器械（2×2）
    ['F_ballista', 'F_greekfire'].forEach(id => P('F', id));
  }

  create() {
    // 缺失素材 → 生成替代圖
    this.missing.forEach(key => this.makePlaceholder(key));
    if (this.missing.size) {
      console.info(`[TD] ${this.missing.size} 個素材尚未生成，暫用程序繪製替代：`,
        [...this.missing].join(', '));
    }
    TD.MISSING = this.missing;

    this.makeParticleTextures();
    this.buildWalkAnims();
    this.scene.start('Title');
  }

  /** 為每個敵人建立行走循環動畫；素材缺失時退回單幀 */
  buildWalkAnims() {
    (this.sheetIds || []).forEach(id => {
      if (!this.textures.exists(id)) return;
      const total = this.textures.get(id).frameTotal - 1;   // 扣掉 __BASE
      if (this.anims.exists(id + '_walk')) return;
      this.anims.create({
        key: id + '_walk',
        frames: this.anims.generateFrameNumbers(id, {
          start: 0, end: Math.max(0, Math.min(TD.WALK_FRAMES - 1, total - 1)),
        }),
        frameRate: 8,
        repeat: -1,
      });
    });
  }

  // ── 程序生成的替代貼圖（希臘陶器風剪影）──
  makePlaceholder(key) {
    const isBg = key.startsWith('B_field') || key.startsWith('B_city') || key === 'U_title';
    if (isBg) return this.makeBgPlaceholder(key);

    const S = 512;
    const tex = this.textures.createCanvas(key, S, S);
    const c = tex.getContext();
    const meta = this.metaFor(key);

    c.clearRect(0, 0, S, S);
    // 陶盤底
    c.fillStyle = 'rgba(26,21,18,0.0)';
    c.fillRect(0, 0, S, S);

    // 剪影主體
    c.save();
    c.translate(S / 2, S / 2);
    c.fillStyle = meta.color;
    c.strokeStyle = '#5E3A18';
    c.lineWidth = 8;

    // 頭
    c.beginPath(); c.arc(0, -130, 52, 0, Math.PI * 2); c.fill(); c.stroke();
    // 盔飾
    c.beginPath();
    c.moveTo(-46, -168); c.quadraticCurveTo(0, -250, 52, -160);
    c.quadraticCurveTo(10, -196, -46, -168); c.closePath();
    c.fillStyle = '#FF8A3C'; c.fill(); c.stroke();
    // 身
    c.fillStyle = meta.color;
    c.beginPath();
    c.moveTo(-70, -74); c.lineTo(70, -74); c.lineTo(56, 96);
    c.lineTo(-56, 96); c.closePath(); c.fill(); c.stroke();
    // 腿
    c.beginPath(); c.rect(-52, 96, 40, 110); c.fill(); c.stroke();
    c.beginPath(); c.rect(14, 96, 40, 110); c.fill(); c.stroke();
    // 武器（依兵種給不同形狀）
    c.strokeStyle = '#FFC72C'; c.lineWidth = 14; c.lineCap = 'round';
    c.beginPath();
    if (meta.shape === 'bow') { c.arc(120, -40, 96, -1.1, 1.1); }
    else if (meta.shape === 'spear') { c.moveTo(110, -210); c.lineTo(110, 200); }
    else if (meta.shape === 'stone') { c.arc(120, -60, 46, 0, Math.PI * 2); }
    else if (meta.shape === 'oil') { c.moveTo(96, -120); c.lineTo(150, -20); c.lineTo(96, 60); }
    else { c.moveTo(112, -190); c.lineTo(112, 120); }
    c.stroke();
    c.restore();

    // 標籤
    c.fillStyle = '#FFF6E0';
    c.font = 'bold 40px "PingFang TC", sans-serif';
    c.textAlign = 'center';
    c.fillText(meta.label, S / 2, S - 26);
    tex.refresh();
  }

  makeBgPlaceholder(key) {
    const W = 720, H = 1080;
    const tex = this.textures.createCanvas(key, W, H);
    const c = tex.getContext();
    const night = key.includes('night');
    const burn = key.includes('burn');

    const sky = c.createLinearGradient(0, 0, 0, H);
    if (burn) { sky.addColorStop(0, '#3B0D08'); sky.addColorStop(0.5, '#8B1A1A'); sky.addColorStop(1, '#2A0A06'); }
    else if (night) { sky.addColorStop(0, '#0E1430'); sky.addColorStop(0.6, '#1B2450'); sky.addColorStop(1, '#0A0E1F'); }
    else { sky.addColorStop(0, '#F2D9A8'); sky.addColorStop(0.45, '#D9A566'); sky.addColorStop(1, '#8A5A34'); }
    c.fillStyle = sky; c.fillRect(0, 0, W, H);

    // 遠方海與船
    if (!burn) {
      c.fillStyle = night ? '#0C1836' : '#2E5A6E';
      c.fillRect(0, 0, W, H * 0.16);
      c.fillStyle = '#120E0B';
      for (let i = 0; i < 9; i++) {
        const x = 30 + i * 76, y = H * 0.10 + (i % 3) * 14;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + 46, y);
        c.lineTo(x + 34, y + 16); c.lineTo(x + 12, y + 16); c.closePath(); c.fill();
        c.fillRect(x + 21, y - 26, 4, 26);
      }
    }
    // 地面
    c.fillStyle = burn ? '#2A1410' : (night ? '#15182C' : '#B5854F');
    c.fillRect(0, H * 0.16, W, H * 0.72);
    // 三條路
    c.strokeStyle = burn ? '#4A2018' : (night ? '#232842' : '#8E6234');
    c.lineWidth = 58; c.lineCap = 'round';
    [0.2, 0.5, 0.8].forEach(fx => {
      c.beginPath(); c.moveTo(W * fx, H * 0.18);
      c.quadraticCurveTo(W * (fx * 0.4 + 0.3), H * 0.55, W * 0.5, H * 0.86);
      c.stroke();
    });
    // 城牆
    c.fillStyle = burn ? '#1A0E0A' : '#C98B4B';
    c.fillRect(0, H * 0.86, W, H * 0.14);
    c.fillStyle = burn ? '#2A1610' : '#8A6B47';
    for (let x = 0; x < W; x += 60) c.fillRect(x + 8, H * 0.84, 44, 30);
    tex.refresh();
  }

  metaFor(key) {
    const m = {
      T_archer: { color: '#FF8A3C', shape: 'bow', label: '弓兵' },
      T_spear: { color: '#9C7A3C', shape: 'spear', label: '長矛' },
      T_stone: { color: '#7A6A55', shape: 'stone', label: '投石' },
      T_oil: { color: '#B5502A', shape: 'oil', label: '熱油' },
      T_priest: { color: '#8E7AA8', shape: 'staff', label: '祭司' },
      E_soldier: { color: '#4A5568', shape: 'spear', label: '步兵' },
      E_shield: { color: '#3B4252', shape: 'spear', label: '盾兵' },
      E_runner: { color: '#6B4A3A', shape: 'spear', label: '衝鋒' },
      E_fire: { color: '#5A3A2A', shape: 'oil', label: '縱火' },
      E_siege: { color: '#4A3A2A', shape: 'stone', label: '攻城' },
      E_achilles: { color: '#FFC72C', shape: 'spear', label: '阿基里斯' },
      E_ajax: { color: '#6B5B45', shape: 'spear', label: '埃阿斯' },
      E_odysseus: { color: '#5A6B7A', shape: 'spear', label: '奧德修斯' },
      H_hector: { color: '#FF8A3C', shape: 'spear', label: '赫克托爾' },
      H_paris: { color: '#6EC6FF', shape: 'bow', label: '帕里斯' },
      H_cassandra: { color: '#CE93D8', shape: 'staff', label: '卡珊德拉' },
      H_aeneas: { color: '#FF8A65', shape: 'spear', label: '埃涅阿斯' },
      H_penthesilea: { color: '#FFAB91', shape: 'spear', label: '女王' },
      E_healer: { color: '#7FC97F', shape: 'staff', label: '祭司' },
      E_flyer: { color: '#B08968', shape: 'spear', label: '鳥妖' },
      E_myrmidon: { color: '#3A3A3A', shape: 'spear', label: '蟻兵' },
      E_drummer: { color: '#C46A3A', shape: 'stone', label: '鼓手' },
      E_diomedes: { color: '#C9A227', shape: 'spear', label: '狄俄墨得斯' },
      E_agamemnon: { color: '#A63A3A', shape: 'spear', label: '阿伽門農' },
      B_horse: { color: '#8A6B47', shape: 'stone', label: '木馬' },
      B_gate: { color: '#C98B4B', shape: 'stone', label: '城門' },
      U_frame: { color: '#9C7A3C', shape: 'stone', label: '' },
      U_coin: { color: '#FFC72C', shape: 'stone', label: '' },
      U_barricade: { color: '#8B5A2B', shape: 'stone', label: '路障' },
      F_ballista: { color: '#C9A227', shape: 'spear', label: '攻城弩' },
      F_greekfire: { color: '#69F0AE', shape: 'stone', label: '希臘火' },
    };
    for (const k in m) if (key.startsWith(k)) return m[k];
    return { color: '#7A6A55', shape: 'spear', label: '' };
  }

  // ── 粒子用小圖 ──
  makeParticleTextures() {
    const mk = (key, draw, s = 64) => {
      if (this.textures.exists(key)) return;
      const t = this.textures.createCanvas(key, s, s);
      draw(t.getContext(), s);
      t.refresh();
    };
    mk('px_spark', (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,214,120,0.9)');
      g.addColorStop(1, 'rgba(255,140,40,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    mk('px_smoke', (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(200,190,180,0.55)');
      g.addColorStop(1, 'rgba(120,110,100,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    mk('px_blood', (c, s) => {
      c.fillStyle = '#8B1A1A';
      c.beginPath(); c.arc(s / 2, s / 2, s / 2 - 6, 0, Math.PI * 2); c.fill();
    }, 24);
    mk('px_shard', (c, s) => {
      c.fillStyle = '#FFF6E0';
      c.beginPath(); c.moveTo(s / 2, 2); c.lineTo(s - 4, s - 6);
      c.lineTo(4, s - 6); c.closePath(); c.fill();
    }, 20);
    mk('px_ring', (c, s) => {
      c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 6;
      c.beginPath(); c.arc(s / 2, s / 2, s / 2 - 8, 0, Math.PI * 2); c.stroke();
    }, 96);
    mk('px_arrow', (c, s) => {
      c.strokeStyle = '#FFF6E0'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(6, s / 2); c.lineTo(s - 14, s / 2); c.stroke();
      c.fillStyle = '#FFC72C';
      c.beginPath(); c.moveTo(s - 2, s / 2); c.lineTo(s - 18, s / 2 - 9);
      c.lineTo(s - 18, s / 2 + 9); c.closePath(); c.fill();
    }, 48);
    mk('px_rock', (c, s) => {
      c.fillStyle = '#6B5B45'; c.strokeStyle = '#5E3A18'; c.lineWidth = 3;
      c.beginPath();
      c.moveTo(s * .5, 4); c.lineTo(s - 6, s * .38); c.lineTo(s * .78, s - 6);
      c.lineTo(s * .24, s - 8); c.lineTo(5, s * .42); c.closePath();
      c.fill(); c.stroke();
    }, 56);
  }
};
