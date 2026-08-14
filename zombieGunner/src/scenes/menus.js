/* ============================================================
 * Boot / 主選單 / 章節關卡選擇 / 永久強化
 * ============================================================ */
(function (H) {
  'use strict';

  var W = 720;

  // =========================================================
  // Boot：生成所有程式貼圖
  // =========================================================
  H.BootScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function BootScene() { Phaser.Scene.call(this, { key: 'Boot' }); },

    preload: function () {
      H.Save.load();

      // Loading 進度（此時尚無貼圖，用最原始畫法）
      var bar = this.add.rectangle(360, 640, 0, 16, 0xff6b3d).setOrigin(0, 0.5);
      bar.x = 200;
      this.add.rectangle(360, 640, 320, 16).setStrokeStyle(3, 0x3a414f, 1);
      this.add.text(360, 600, '載入素材中…', {
        fontFamily: 'Arial Black, sans-serif', fontSize: '22px', color: '#8b95a6',
      }).setOrigin(0.5);
      this.load.on('progress', function (v) { bar.width = 320 * v; });

      // AI 生成的圖示素材（尚未生成的檔案會被忽略，UI 自動退回符號版）
      this.load.setPath('assets/icons');
      H.SKILLS.forEach(function (sk) { this.load.image('ic_sk_' + sk.id, 'sk_' + sk.id + '.png'); }, this);
      H.PERM_INFO.forEach(function (p) { this.load.image('ic_perm_' + p.k, 'perm_' + p.k + '.png'); }, this);

      // 場景物件 / 掉落物
      this.load.setPath('assets/props');
      ['obs_crate', 'obs_barrel', 'obs_car', 'obs_sandbag', 'loot_coin', 'loot_medkit']
        .forEach(function (k) { this.load.image('p_' + k, k + '.png'); }, this);

      // 角色俯視角動畫 atlas
      this.load.setPath('');
      H.Anim.preload(this);

      this.load.on('loaderror', function (f) { /* 素材未就緒，忽略 */ });
    },

    create: function () {
      H.Art.build(this);
      H.Anim.create(this);
      this.scene.start('Menu');
    },
  });

  /** 角色立繪：有 AI sprite 就用，否則退回程式貼圖 */
  H.charImage = function (sc, x, y, atlasKey, fallbackKey, size, rotation) {
    var img;
    if (sc.textures.exists(atlasKey)) {
      img = sc.add.image(x, y, atlasKey, 'frame_000.png');
      img.setDisplaySize(size, size);
    } else {
      img = sc.add.image(x, y, fallbackKey);
      img.setDisplaySize(size * 0.72, size * 0.72);
    }
    if (rotation !== undefined) img.setRotation(rotation);
    return img;
  };

  /** 技能圖示：有 AI 素材就用圖，否則退回符號（回傳 container 方便嵌入版面） */
  H.iconImage = function (sc, x, y, key, size, fallbackText, color) {
    var c = sc.add.container(x, y);
    var has = sc.textures.exists(key);
    var bg = sc.add.circle(0, 0, size * 0.5, has ? 0x161b23 : color, has ? 0.9 : 0.92)
      .setStrokeStyle(Math.max(3, size * 0.05), has ? color : 0x0d1016, 1);
    c.add(bg);
    if (has) {
      c.add(sc.add.image(0, 0, key).setDisplaySize(size * 0.94, size * 0.94));
    } else {
      c.add(sc.add.text(0, 0, fallbackText, {
        fontSize: Math.round(size * 0.5) + 'px', color: '#12141a',
      }).setOrigin(0.5));
    }
    c.iconBg = bg;
    return c;
  };

  // =========================================================
  // 主選單
  // =========================================================
  H.MenuScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function MenuScene() { Phaser.Scene.call(this, { key: 'Menu' }); },

    create: function () {
      H.Art.build(this);
      H.UI.bg(this, 0x2a1a1a);
      var self = this;
      var d = H.Save.get();

      // 標題
      H.UI.title(this, W / 2, 168, '屍 潮 槍 手', 76, '#ff6b3d');
      H.UI.text(this, W / 2, 232, 'Z O M B I E   G U N N E R', 24, '#8b95a6');

      // 裝飾：玩家與喪屍
      H.charImage(this, W / 2 - 168, 344, 'player_walk', 'player', 122, 0);
      var z1 = H.charImage(this, W / 2 + 66, 340, 'zombie_walk', 'z_walker', 108, Math.PI);
      var z2 = H.charImage(this, W / 2 + 172, 368, 'zombie_runner', 'z_runner', 92, Math.PI);
      this.tweens.add({ targets: [z1, z2], x: '-=26', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

      // 章節卡片
      var y = 500;
      H.CHAPTERS.forEach(function (ch, i) {
        self.chapterCard(ch, W / 2, y + i * 168);
      });

      // 底部：強化 / 音效
      H.UI.button(this, W / 2 - 150, 1105, 260, 78, '⚙  永久強化', function () {
        self.scene.start('Upgrade');
      }, { color: 0x4a5568, size: 26 });

      this.coinText = H.UI.text(this, W / 2 + 172, 1105, '', 30, '#ffd23d');
      this.add.image(W / 2 + 100, 1105, 'coin').setScale(0.9);
      this.refreshCoin();

      // 音效切換
      var sndBtn = H.UI.button(this, W - 60, 60, 84, 66, d.sound ? '🔊' : '🔇', function () {
        var s = H.Save.get(); s.sound = !s.sound; H.Save.save();
        sndBtn.label.setText(s.sound ? '🔊' : '🔇');
      }, { color: 0x3a414f, size: 26 });

      H.UI.text(this, W / 2, 1200, '移動時停火 · 停下自動射擊 — 走位就是一切', 20, '#6f7787');

      this.input.once('pointerdown', function () { H.Sfx.unlock(); });
    },

    refreshCoin: function () {
      this.coinText.setText(String(H.Save.get().coin));
    },

    chapterCard: function (ch, x, y) {
      var self = this;
      var d = H.Save.get();
      var unlocked = d.progress[ch.id] > 0;
      var best = d.best[ch.id] || 0;
      var w = 620, h = 148;

      var g = this.add.graphics();
      g.fillStyle(unlocked ? 0x232b36 : 0x191d24, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 20);
      g.lineStyle(5, unlocked ? ch.accent : 0x2a2f38, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 20);

      // 章節縮圖（地板色塊 + 代表敵人）
      var icon = this.add.graphics();
      icon.fillStyle(ch.ground, 1);
      icon.fillRoundedRect(x - w / 2 + 16, y - 52, 104, 104, 14);
      icon.lineStyle(4, 0x0d1016, 1);
      icon.strokeRoundedRect(x - w / 2 + 16, y - 52, 104, 104, 14);
      var rep = ch.id === 1 ? ['zombie_walk', 'z_walker'] : ch.id === 2 ? ['zombie_runner', 'z_spitter'] : ['zombie_brute', 'z_armored'];
      var repImg = H.charImage(this, x - w / 2 + 68, y, rep[0], rep[1], 74, Math.PI)
        .setAlpha(unlocked ? 1 : 0.28);
      if (ch.id === 2) repImg.setTint(0x8fe07a);
      else if (ch.id === 3) repImg.setTint(0x9fb88a);

      this.add.text(x - w / 2 + 140, y - 44, ch.name, {
        fontFamily: H.UI.FONT, fontSize: '30px',
        color: unlocked ? '#' + ch.accent.toString(16).padStart(6, '0') : '#5a616e',
        stroke: '#0d1016', strokeThickness: 5,
      }).setOrigin(0, 0.5);
      this.add.text(x - w / 2 + 140, y - 10, ch.sub, {
        fontFamily: H.UI.FONT, fontSize: '17px', color: '#6f7787',
      }).setOrigin(0, 0.5);

      if (unlocked) {
        // 進度條
        var pw = 240, p = best / H.LEVELS_PER_CHAPTER;
        this.add.rectangle(x - w / 2 + 140, y + 30, pw, 16, 0x0d1016).setOrigin(0, 0.5);
        this.add.rectangle(x - w / 2 + 142, y + 30, (pw - 4) * p, 12, ch.accent).setOrigin(0, 0.5);
        this.add.text(x - w / 2 + 140 + pw + 12, y + 30, best + '/' + H.LEVELS_PER_CHAPTER, {
          fontFamily: H.UI.FONT, fontSize: '18px', color: '#c8d0dd',
        }).setOrigin(0, 0.5);

        H.UI.button(this, x + w / 2 - 86, y + 6, 132, 66, '進 入', function () {
          self.scene.start('LevelSelect', { chapter: ch.id });
        }, { color: ch.accent, size: 26, textColor: '#12141a' });
      } else {
        this.add.text(x + w / 2 - 86, y, '🔒', { fontSize: '46px' }).setOrigin(0.5);
        this.add.text(x - w / 2 + 140, y + 30, '通關前一章後解鎖', {
          fontFamily: H.UI.FONT, fontSize: '18px', color: '#5a616e',
        }).setOrigin(0, 0.5);
      }
    },
  });

  // =========================================================
  // 關卡選擇（50 關）
  // =========================================================
  H.LevelSelectScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function LevelSelectScene() { Phaser.Scene.call(this, { key: 'LevelSelect' }); },

    init: function (data) { this.chapterId = (data && data.chapter) || 1; },

    create: function () {
      var self = this;
      var ch = H.CHAPTERS[this.chapterId - 1];
      var d = H.Save.get();
      H.UI.bg(this, H.shade(ch.ground, 10));

      H.UI.title(this, W / 2, 90, ch.name, 40, '#' + ch.accent.toString(16).padStart(6, '0'));
      H.UI.text(this, W / 2, 136, '已通關 ' + (d.best[this.chapterId] || 0) + ' / ' + H.LEVELS_PER_CHAPTER, 22);

      // 5 x 10 關卡格
      var cols = 5, cw = 118, chh = 92, x0 = W / 2 - (cols - 1) * cw / 2, y0 = 220;
      for (var i = 1; i <= H.LEVELS_PER_CHAPTER; i++) {
        var cx = x0 + ((i - 1) % cols) * cw;
        var cy = y0 + Math.floor((i - 1) / cols) * chh;
        this.levelCell(i, cx, cy, ch, d);
      }

      H.UI.button(this, W / 2 - 170, 1210, 280, 82, '← 返回選單', function () {
        self.scene.start('Menu');
      }, { color: 0x4a5568, size: 26 });

      var nextLv = Math.min(H.LEVELS_PER_CHAPTER, d.progress[this.chapterId] || 1);
      H.UI.button(this, W / 2 + 170, 1210, 280, 82, '繼續 ' + nextLv + ' 關 ▶', function () {
        self.scene.start('Game', { chapter: self.chapterId, level: nextLv });
      }, { color: ch.accent, size: 26, textColor: '#12141a' });
    },

    levelCell: function (i, x, y, ch, d) {
      var self = this;
      var unlocked = H.Save.isUnlocked(this.chapterId, i);
      var cleared = i <= (d.best[this.chapterId] || 0);
      var boss = H.isBoss(i), elite = H.isElite(i);
      var size = 84;

      var color = !unlocked ? 0x1b1f26 : boss ? 0x8c2f2f : elite ? 0x8c6a2f : 0x28303c;
      var g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 16);
      g.lineStyle(4, cleared ? ch.accent : 0x0d1016, 1);
      g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 16);

      if (unlocked) {
        this.add.text(x, y - 6, String(i), {
          fontFamily: H.UI.FONT, fontSize: boss ? '26px' : '28px',
          color: cleared ? '#ffffff' : '#c8d0dd', stroke: '#0d1016', strokeThickness: 4,
        }).setOrigin(0.5);
        if (boss) this.add.text(x, y + 24, '☠ BOSS', { fontFamily: H.UI.FONT, fontSize: '13px', color: '#ffd0d0' }).setOrigin(0.5);
        else if (elite) this.add.text(x, y + 24, '★ 精英', { fontFamily: H.UI.FONT, fontSize: '13px', color: '#ffe6b0' }).setOrigin(0.5);
        if (cleared) this.add.text(x + 28, y - 28, '✓', { fontFamily: H.UI.FONT, fontSize: '20px', color: '#4dff7d' }).setOrigin(0.5);

        var hit = this.add.rectangle(x, y, size, size, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', function () {
          H.Sfx.click();
          self.scene.start('Game', { chapter: self.chapterId, level: i });
        });
      } else {
        this.add.text(x, y, '🔒', { fontSize: '26px' }).setOrigin(0.5).setAlpha(0.5);
      }
    },
  });

  // =========================================================
  // 永久強化商店
  // =========================================================
  H.UpgradeScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function UpgradeScene() { Phaser.Scene.call(this, { key: 'Upgrade' }); },

    create: function () {
      var self = this;
      H.UI.bg(this, 0x1c2430);
      H.UI.title(this, W / 2, 96, '永 久 強 化', 46, '#ffd23d');
      this.coinText = H.UI.text(this, W / 2 + 30, 156, '', 30, '#ffd23d');
      this.add.image(W / 2 - 40, 156, 'coin').setScale(0.95);

      this.rows = [];
      var y0 = 250;
      H.PERM_INFO.forEach(function (info, i) {
        self.rows.push(self.permRow(info, W / 2, y0 + i * 132));
      });

      H.UI.button(this, W / 2, 1190, 320, 84, '← 返回選單', function () {
        self.scene.start('Menu');
      }, { color: 0x4a5568, size: 28 });

      this.refresh();
    },

    permRow: function (info, x, y) {
      var self = this;
      var w = 620, h = 112;
      var g = this.add.graphics();
      g.fillStyle(0x232b36, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 18);
      g.lineStyle(4, 0x0d1016, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 18);

      H.iconImage(this, x - w / 2 + 56, y, 'ic_perm_' + info.k, 72, info.icon, info.color);

      this.add.text(x - w / 2 + 108, y - 24, info.name, {
        fontFamily: H.UI.FONT, fontSize: '27px', color: '#ffffff', stroke: '#0d1016', strokeThickness: 4,
      }).setOrigin(0, 0.5);
      this.add.text(x - w / 2 + 108, y + 12, info.desc, {
        fontFamily: H.UI.FONT, fontSize: '19px', color: '#8b95a6',
      }).setOrigin(0, 0.5);

      var lvText = this.add.text(x + 62, y, '', {
        fontFamily: H.UI.FONT, fontSize: '24px', color: '#c8d0dd', stroke: '#0d1016', strokeThickness: 4,
      }).setOrigin(0.5);

      var btn = H.UI.button(this, x + w / 2 - 90, y, 150, 74, '', function () {
        if (H.Save.buyPerm(info.k)) { H.Sfx.levelup(); self.refresh(); }
        else { H.Sfx.hurt(); self.cameras.main.shake(120, 0.004); }
      }, { color: info.color, size: 22, textColor: '#12141a' });

      return { info: info, lvText: lvText, btn: btn };
    },

    refresh: function () {
      var d = H.Save.get();
      this.coinText.setText(String(d.coin));
      this.rows.forEach(function (r) {
        var lv = d.perm[r.info.k] || 0;
        var cost = H.Save.permCost(r.info.k);
        r.lvText.setText('Lv.' + lv);
        r.btn.label.setText('💰 ' + cost);
        r.btn.label.setColor(d.coin >= cost ? '#12141a' : '#6b6b6b');
      });
    },
  });
})(window.HABBY);
