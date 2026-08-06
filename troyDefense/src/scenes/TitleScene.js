/* 標題 / 關卡選擇 / 英雄編隊 */
window.TD = window.TD || {};

TD.TitleScene = class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.selHeroes = [...(TD.save.data.heroes || ['hector', 'paris'])];
    this.page = 'title';
    this.build();
  }

  build() {
    this.children.removeAll();
    if (this.page === 'title') this.buildTitle();
    else if (this.page === 'levels') this.buildLevels();
    else this.buildHeroes();
  }

  bgImage() {
    const key = this.textures.exists('U_title') ? 'U_title' : 'B_field_sq';
    const img = this.add.image(TD.GAME_W / 2, TD.GAME_H / 2, key);
    const s = Math.max(TD.GAME_W / img.width, TD.GAME_H / img.height);
    img.setScale(s).setDepth(0);
    this.add.rectangle(TD.GAME_W / 2, TD.GAME_H / 2, TD.GAME_W, TD.GAME_H, 0x1B3A5C, 0.22).setDepth(1);
    return img;
  }

  // ── 標題 ──
  buildTitle() {
    this.bgImage();
    const t1 = this.add.text(TD.GAME_W / 2, 420, '防守特洛伊', {
      fontFamily: TD.FONT, fontSize: '120px', color: '#FFC72C',
      stroke: '#5E3A18', strokeThickness: 14,
      shadow: { offsetX: 0, offsetY: 6, color: '#3A2416', blur: 10, fill: true },
    }).setOrigin(0.5).setDepth(10);
    this.add.text(TD.GAME_W / 2, 530, 'T R O Y   D E F E N S E', {
      fontFamily: 'Georgia, serif', fontSize: '34px', color: '#FFE9B8', stroke: '#4A2E12', strokeThickness: 6, shadow: { offsetX: 0, offsetY: 3, color: '#3A2416', blur: 6, fill: true },
    }).setOrigin(0.5).setDepth(10);
    this.add.text(TD.GAME_W / 2, 640, '十年圍城，一手守下', {
      fontFamily: TD.FONT, fontSize: '40px', color: '#FFF6E0', stroke: '#4A2E12', strokeThickness: 6, shadow: { offsetX: 0, offsetY: 3, color: '#3A2416', blur: 6, fill: true },
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({ targets: t1, scale: 1.03, duration: 1800, yoyo: true, repeat: -1 });

    const stars = TD.save.totalStars();
    this.add.text(TD.GAME_W / 2, 720, `★ ${stars} / 30`, {
      fontFamily: TD.FONT, fontSize: '36px', color: '#FFE066', stroke: '#4A2E12', strokeThickness: 6, shadow: { offsetX: 0, offsetY: 3, color: '#3A2416', blur: 6, fill: true },
    }).setOrigin(0.5).setDepth(10);

    this.bigBtn(TD.GAME_W / 2, 1080, '開始防守', () => { this.page = 'levels'; this.build(); });
    this.bigBtn(TD.GAME_W / 2, 1230, '英雄編隊', () => { this.page = 'heroes'; this.build(); }, 0xC98B4B, '#FFF6E0');

    this.add.text(TD.GAME_W / 2, 1420,
      '手機直屏 · 合成式塔防\n拖曳合成守軍，撐過特洛伊戰爭的十年', {
        fontFamily: TD.FONT, fontSize: '28px', color: '#FFF6E0', align: 'center', lineSpacing: 10, stroke: '#4A2E12', strokeThickness: 6, shadow: { offsetX: 0, offsetY: 3, color: '#3A2416', blur: 6, fill: true },
      }).setOrigin(0.5).setDepth(10);

    this.add.text(TD.GAME_W / 2, TD.GAME_H - 90, '遊戲中按 D 開啟開發者微調工具 · P 暫停', {
      fontFamily: TD.FONT, fontSize: '22px', color: '#FFF6E0', stroke: '#4A2E12', strokeThickness: 6, shadow: { offsetX: 0, offsetY: 3, color: '#3A2416', blur: 6, fill: true },
    }).setOrigin(0.5).setDepth(10);

    this.input.once('pointerdown', () => { TD.audio.init(); TD.audio.resume(); });
  }

  // ── 關卡選擇 ──
  buildLevels() {
    this.bgImage();
    this.add.text(TD.GAME_W / 2, 150, '選擇年份', {
      fontFamily: TD.FONT, fontSize: '68px', color: '#FFC72C',
    }).setOrigin(0.5).setDepth(10);

    const cols = 2, cw = 460, ch = 190, gap = 30;
    const x0 = (TD.GAME_W - (cols * cw + (cols - 1) * gap)) / 2;
    TD.LEVELS.forEach((L, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = x0 + cw / 2 + c * (cw + gap);
      const y = 300 + ch / 2 + r * (ch + gap);
      const open = L.id <= TD.save.data.unlocked;
      const stars = TD.save.starsOf(L.id);

      const g = this.add.graphics().setDepth(10);
      g.fillStyle(open ? (L.finale ? 0xC0392B : 0x8B5A2B) : 0x5E3A18, 0.94)
        .fillRoundedRect(x - cw / 2, y - ch / 2, cw, ch, 14);
      g.lineStyle(4, open ? (L.finale ? 0xFF8A3C : 0xC98B4B) : 0x6B4423, 1)
        .strokeRoundedRect(x - cw / 2, y - ch / 2, cw, ch, 14);

      this.add.text(x - cw / 2 + 26, y - 62, `第 ${L.year} 年`, {
        fontFamily: TD.FONT, fontSize: '26px', color: open ? '#C9A87C' : '#9B8468',
      }).setDepth(11);
      this.add.text(x - cw / 2 + 26, y - 22, open ? L.title : '？？？', {
        fontFamily: TD.FONT, fontSize: '38px', color: open ? '#FFF6E0' : '#9B8468',
      }).setDepth(11);
      this.add.text(x - cw / 2 + 26, y + 32,
        open ? '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars) : '🔒', {
          fontFamily: TD.FONT, fontSize: '30px', color: '#FFC72C',
        }).setDepth(11);
      if (open && TD.save.bestOf(L.id)) {
        this.add.text(x + cw / 2 - 26, y + 60, TD.save.bestOf(L.id).toLocaleString(), {
          fontFamily: TD.FONT, fontSize: '24px', color: '#C98B4B',
        }).setOrigin(1, 0.5).setDepth(11);
      }
      this.add.text(x + cw / 2 - 26, y - 58, `${L.time}s`, {
        fontFamily: TD.FONT, fontSize: '24px', color: '#C98B4B',
      }).setOrigin(1, 0.5).setDepth(11);

      if (open) {
        const z = this.add.zone(x, y, cw, ch).setInteractive({ useHandCursor: true }).setDepth(12);
        z.on('pointerdown', () => {
          TD.audio.init(); TD.audio.resume();
          this.scene.start('Game', { level: L.id, heroes: this.selHeroes });
        });
      }
    });

    this.bigBtn(TD.GAME_W / 2, TD.GAME_H - 130, '返回', () => { this.page = 'title'; this.build(); },
      0xC98B4B, '#FFF6E0');
  }

  // ── 英雄編隊 ──
  buildHeroes() {
    this.bgImage();
    this.add.text(TD.GAME_W / 2, 130, '英雄編隊', {
      fontFamily: TD.FONT, fontSize: '68px', color: '#FFC72C',
    }).setOrigin(0.5).setDepth(10);
    this.add.text(TD.GAME_W / 2, 205, '選擇 2 位隨你上陣', {
      fontFamily: TD.FONT, fontSize: '28px', color: '#C9A87C',
    }).setOrigin(0.5).setDepth(10);

    const keys = TD.heroList();
    const cw = 980, ch = 176, gap = 14;
    keys.forEach((k, i) => {
      const H = TD.HEROES[k];
      const y = 300 + ch / 2 + i * (ch + gap);
      const x = TD.GAME_W / 2;
      const open = TD.save.heroUnlocked(k);
      const sel = this.selHeroes.includes(k);

      const g = this.add.graphics().setDepth(10);
      g.fillStyle(sel ? 0xB57C42 : 0x6B4423, 0.95)
        .fillRoundedRect(x - cw / 2, y - ch / 2, cw, ch, 14);
      g.lineStyle(sel ? 5 : 3, open ? (sel ? 0xFFC72C : 0xC98B4B) : 0x6B4423, 1)
        .strokeRoundedRect(x - cw / 2, y - ch / 2, cw, ch, 14);

      const img = this.add.image(x - cw / 2 + 96, y, H.tex)
        .setDisplaySize(140, 140).setDepth(11);
      if (!open) img.setTint(0x333333);

      this.add.text(x - cw / 2 + 190, y - 54, open ? `${H.name} · ${H.title}` : `？？？（第 ${H.unlock} 年解鎖）`, {
        fontFamily: TD.FONT, fontSize: '36px', color: open ? '#FFF6E0' : '#9B8468',
      }).setDepth(11);
      if (open) {
        this.add.text(x - cw / 2 + 190, y - 4, `⚡ ${H.skill.name}：${H.skill.desc}`, {
          fontFamily: TD.FONT, fontSize: '24px', color: '#FFC72C',
          wordWrap: { width: cw - 230 },
        }).setDepth(11);
        this.add.text(x - cw / 2 + 190, y + 52, `◈ 被動：${H.passive.name}`, {
          fontFamily: TD.FONT, fontSize: '24px', color: '#C9A87C',
        }).setDepth(11);

        const z = this.add.zone(x, y, cw, ch).setInteractive({ useHandCursor: true }).setDepth(12);
        z.on('pointerdown', () => {
          TD.audio.init(); TD.audio.resume(); TD.audio.place();
          const at = this.selHeroes.indexOf(k);
          if (at >= 0) this.selHeroes.splice(at, 1);
          else { if (this.selHeroes.length >= 2) this.selHeroes.shift(); this.selHeroes.push(k); }
          TD.save.setHeroes(this.selHeroes);
          this.build();
        });
      }
    });

    this.bigBtn(TD.GAME_W / 2, TD.GAME_H - 120, '完成', () => { this.page = 'title'; this.build(); });
  }

  bigBtn(x, y, label, cb, color = 0xFFC72C, txtColor = '#5E3A18') {
    const w = 520, h = 116;
    const g = this.add.graphics().setDepth(20);
    const dark = Phaser.Display.Color.IntegerToColor(color).darken(28).color;
    g.fillStyle(dark, 1).fillRoundedRect(x - w / 2, y - h / 2 + 9, w, h, 26);
    g.fillStyle(color, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h - 4, 26);
    g.fillStyle(0xFFFFFF, 0.30).fillRoundedRect(x - w / 2 + 14, y - h / 2 + 9, w - 28, (h - 4) * 0.36, 18);
    g.lineStyle(5, 0x4A2E12, 0.55).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 26);
    const t = this.add.text(x, y - 2, label, {
      fontFamily: TD.FONT, fontSize: '46px', color: txtColor,
      stroke: '#FFFFFF', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(21);
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(22);
    z.on('pointerdown', () => { TD.audio.init(); TD.audio.resume(); cb(); });
    z.on('pointerover', () => t.setScale(1.05));
    z.on('pointerout', () => t.setScale(1));
    return z;
  }
};
