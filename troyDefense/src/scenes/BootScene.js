/* v3 載入 — 貼紙風 imagegen 素材；缺圖自動退回程式向量版（a_*） */
window.TD = window.TD || {};

TD.BootScene = class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const W = TD.GAME_W, H = TD.GAME_H;
    this.cameras.main.setBackgroundColor('#14100C');
    this.add.text(W / 2, H / 2 - 120, '防守特洛伊', {
      fontFamily: TD.FONT, fontSize: '92px', color: TD.CSS.gold, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 - 26, '— 烈焰圍城 —', {
      fontFamily: TD.FONT, fontSize: '38px', color: TD.CSS.fire,
    }).setOrigin(0.5);
    const barW = 620, barX = (W - barW) / 2, barY = H / 2 + 60;
    const fr = this.add.graphics();
    fr.lineStyle(3, TD.PALETTE.uiEdge, 1).strokeRect(barX, barY, barW, 20);
    const fill = this.add.graphics();
    this.load.on('progress', v => {
      fill.clear().fillStyle(TD.PALETTE.fire, 1).fillRect(barX + 3, barY + 3, (barW - 6) * v, 14);
    });

    this.missing = new Set();
    this.load.on('loaderror', f => this.missing.add(f.key));

    this.load.setPath('public/assets/G');
    TD.G_KEYS = [
      'G_def_archer', 'G_def_spear', 'G_def_stone', 'G_def_oil',
      'G_soldier', 'G_runner', 'G_shield', 'G_torch', 'G_ladderman', 'G_diomedes',
      'G_gate_0', 'G_gate_1', 'G_gate_2', 'G_gate_3',
      'G_wall', 'G_merlon', 'G_ship', 'G_ram', 'G_siegetower', 'G_catapult',
      'G_ladder', 'G_brazier',
      'B_field', 'B_wall', 'B_panel', 'B_slot',
    ];
    TD.G_KEYS.forEach(id => this.load.image(id, `${id}.png`));
  }

  create() {
    TD.Art.generate(this);   // 向量備援＋a_coin

    // 缺圖 → 用向量版替身（G_xxx ← a_xxx）
    const alias = {
      G_def_archer: 'a_def_archer', G_def_spear: 'a_def_spear',
      G_def_stone: 'a_def_stone', G_def_oil: 'a_def_oil',
      G_soldier: 'a_soldier', G_runner: 'a_runner', G_shield: 'a_shield',
      G_torch: 'a_torch', G_ladderman: 'a_ladderman', G_diomedes: 'a_diomedes',
      G_gate_0: 'a_gate_0', G_gate_1: 'a_gate_1', G_gate_2: 'a_gate_2', G_gate_3: 'a_gate_3',
      G_wall: 'a_wall', G_merlon: 'a_merlon', G_ship: 'a_ship',
      G_ram: 'a_ram', G_siegetower: 'a_siegetower', G_catapult: 'a_catapult',
      G_ladder: 'a_ladder', G_brazier: 'a_brazier',
      B_field: 'a_wall', B_wall: 'a_wall', B_panel: 'a_wall', B_slot: 'a_merlon',
    };
    TD.G_KEYS.forEach(k => {
      if (!this.textures.exists(k) || this.missing.has(k)) {
        const src = this.textures.get(alias[k]).getSourceImage();
        this.textures.addImage(k, src);
        console.info(`[TD] ${k} 缺圖，使用向量替身`);
      }
    });
    this.scene.start('Title');
  }
};
