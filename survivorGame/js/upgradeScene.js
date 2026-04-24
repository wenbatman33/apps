// 升級三選一場景（全 Phaser 繪製）
class UpgradeScene extends Phaser.Scene {
  constructor() { super('UpgradeScene'); }

  init(data) { this.gameRef = data.game; }

  create() {
    const { width: W, height: H } = this.scale.gameSize;

    // 遮罩
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setScrollFactor(0);
    this.add.text(W / 2, H * 0.16, 'LEVEL UP!', {
      fontSize: '36px', color: '#ffd84d', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);
    this.add.text(W / 2, H * 0.22, '選擇一項升級', {
      fontSize: '18px', color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0);

    // 抽卡
    const choices = this.rollChoices(3);
    const cardW = Math.min(W * 0.85, 380);
    const cardH = 110;
    const startY = H * 0.32;
    const gap = 18;

    choices.forEach((c, i) => {
      const y = startY + i * (cardH + gap);
      this.createCard(W / 2, y, cardW, cardH, c);
    });

    // 若沒得選（全滿級），給一個 hp 補滿
    if (choices.length === 0) {
      const y = H * 0.5;
      this.createCard(W / 2, y, cardW, cardH, {
        type: 'heal', key: 'heal', title: '治癒', desc: '回復全部生命值'
      });
    }
  }

  rollChoices(n) {
    const p = this.gameRef.player;
    const pool = [];
    // 武器：已擁有可升級；未擁有可新增（上限 4 把）
    const ownedWeaponCount = Object.keys(p.weapons).length;
    for (const [key, def] of Object.entries(WEAPONS)) {
      const lv = p.weapons[key] || 0;
      if (lv === 0 && ownedWeaponCount >= 4) continue;
      if (lv >= def.maxLevel) continue;
      pool.push({
        type: 'weapon', key,
        title: lv === 0 ? `新武器：${def.name}` : `${def.name} Lv.${lv + 1}`,
        desc: def.desc
      });
    }
    // 被動
    for (const [key, def] of Object.entries(PASSIVES)) {
      const lv = p.passives[key] || 0;
      if (lv >= def.maxLevel) continue;
      pool.push({
        type: 'passive', key,
        title: `${def.name} Lv.${lv + 1}`,
        desc: def.desc
      });
    }
    // 洗牌取 n
    Phaser.Utils.Array.Shuffle(pool);
    return pool.slice(0, n);
  }

  createCard(x, y, w, h, choice) {
    const bg = this.add.rectangle(x, y, w, h, 0x1a1a2e, 1)
      .setStrokeStyle(2, 0x4fc3ff).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    const title = this.add.text(x, y - 20, choice.title, {
      fontSize: '22px', color: '#ffd84d', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);
    const desc = this.add.text(x, y + 18, choice.desc, {
      fontSize: '15px', color: '#cccccc', align: 'center', wordWrap: { width: w - 24 }
    }).setOrigin(0.5).setScrollFactor(0);

    bg.on('pointerover', () => bg.setFillStyle(0x2a2a4e));
    bg.on('pointerout', () => bg.setFillStyle(0x1a1a2e));
    bg.on('pointerdown', () => this.applyChoice(choice));
  }

  applyChoice(choice) {
    const p = this.gameRef.player;
    if (choice.type === 'weapon') {
      p.weapons[choice.key] = (p.weapons[choice.key] || 0) + 1;
    } else if (choice.type === 'passive') {
      p.passives[choice.key] = (p.passives[choice.key] || 0) + 1;
      PASSIVES[choice.key].apply(p);
    } else if (choice.type === 'heal') {
      p.hp = p.maxHp;
    }
    this.gameRef.resumeFromUpgrade();
    this.scene.stop();
  }
}
