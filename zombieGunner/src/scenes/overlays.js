/* ============================================================
 * 三選一技能 / 暫停 / 結算
 * ============================================================ */
(function (H) {
  'use strict';

  var W = 720, HT = 1280;

  // =========================================================
  // 三選一技能（覆蓋在戰鬥場景上）
  // =========================================================
  H.SkillScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function SkillScene() { Phaser.Scene.call(this, { key: 'Skill' }); },

    init: function (data) {
      this.chapter = data.chapter;
      this.nextLevel = data.level;
      this.stats = data.stats;
      this.coin = data.coin || 0;
    },

    create: function () {
      var self = this;
      // 雙層遮罩：確保下層戰鬥 HUD 不會透出來干擾閱讀
      this.add.rectangle(W / 2, HT / 2, W, HT, 0x0d1016, 0.92).setDepth(0);
      this.add.rectangle(W / 2, HT / 2, W, HT, 0x06080c, 0.55).setDepth(1);
      H.Sfx.levelup();

      H.UI.title(this, W / 2, 232, '選 擇 強 化', 54, '#ffd23d');
      H.UI.text(this, W / 2, 292, '下一關：第 ' + this.chapter + ' 章 · ' + this.nextLevel + ' 關', 22);

      var picks = H.rollSkills(this.stats, 3);
      picks.forEach(function (sk, i) {
        self.card(sk, W / 2, 430 + i * 248);
      });
    },

    card: function (sk, x, y) {
      var self = this;
      var w = 600, h = 210;
      // 進場只做位移＋淡入，不縮放 —— 縮放期間命中區會跟著變小，導致「點了沒反應」
      var c = this.add.container(x + 90, y).setAlpha(0);

      var g = this.add.graphics();
      g.fillStyle(0x232b36, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
      g.lineStyle(5, sk.color, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
      g.fillStyle(sk.color, 0.12);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 22);

      var ico = H.iconImage(this, -w / 2 + 78, 0, 'ic_sk_' + sk.id, 104, sk.icon, sk.color);

      var name = this.add.text(-w / 2 + 148, -34, sk.name, {
        fontFamily: H.UI.FONT, fontSize: '34px', color: '#ffffff', stroke: '#0d1016', strokeThickness: 5,
      }).setOrigin(0, 0.5);
      var desc = this.add.text(-w / 2 + 148, 12, sk.desc, {
        fontFamily: H.UI.FONT, fontSize: '22px', color: '#c8d0dd', wordWrap: { width: w - 200 },
      }).setOrigin(0, 0.5);

      c.add([g, ico, name, desc]);

      var owned = this.stats.taken[sk.id] || 0;
      if (owned > 0) {
        c.add(this.add.text(w / 2 - 30, -h / 2 + 30, '已持有 x' + owned, {
          fontFamily: H.UI.FONT, fontSize: '18px', color: '#8b95a6',
        }).setOrigin(1, 0.5));
      }

      var pad = 12;
      c.setSize(w + pad * 2, h + pad * 2);
      c.setInteractive(
        new Phaser.Geom.Rectangle(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2),
        Phaser.Geom.Rectangle.Contains
      );
      c.input.cursor = 'pointer';
      c.on('pointerdown', function () { self.pick(sk, c); });

      this.tweens.add({ targets: c, x: x, alpha: 1, duration: 240, ease: 'Quad.out', delay: 50 });
      return c;
    },

    pick: function (sk, card) {
      var self = this;
      if (this.picked) return;
      this.picked = true;
      H.Sfx.win();
      sk.apply(this.stats);
      this.stats.taken[sk.id] = (this.stats.taken[sk.id] || 0) + 1;

      this.tweens.add({
        targets: card, scale: 1.15, alpha: 0, duration: 260,
        onComplete: function () {
          self.scene.start('Game', {
            chapter: self.chapter, level: self.nextLevel, stats: self.stats,
          });
        }
      });
    },
  });

  // =========================================================
  // 暫停
  // =========================================================
  H.PauseScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function PauseScene() { Phaser.Scene.call(this, { key: 'Pause' }); },

    init: function (data) { this.game_ = data.from; },

    create: function () {
      var self = this;
      this.add.rectangle(W / 2, HT / 2, W, HT, 0x0d1016, 0.82);
      H.UI.panel(this, W / 2, HT / 2, 560, 520);
      H.UI.title(this, W / 2, HT / 2 - 190, '暫  停', 52, '#ffffff');

      var g = this.game_;
      H.UI.text(this, W / 2, HT / 2 - 120,
        '第 ' + g.chapter + ' 章 · 第 ' + g.levelNo + ' 關', 24);

      H.UI.button(this, W / 2, HT / 2 - 40, 400, 88, '▶  繼續遊戲', function () {
        self.scene.stop();
        g.paused = false;
        g.physics.resume();
        g.input.enabled = true;
        self.scene.resume('Game');
      }, { color: 0x4dbf6d, size: 30 });

      H.UI.button(this, W / 2, HT / 2 + 68, 400, 88, '↻  重新開始本關', function () {
        self.scene.stop();
        self.scene.start('Game', { chapter: g.chapter, level: g.levelNo, stats: g.carryStats });
      }, { color: 0xff8a3d, size: 30 });

      H.UI.button(this, W / 2, HT / 2 + 176, 400, 88, '☰  回關卡選單', function () {
        self.scene.stop('Game');
        self.scene.start('LevelSelect', { chapter: g.chapter });
      }, { color: 0x4a5568, size: 30 });

      var snd = H.Save.get();
      H.UI.button(this, W / 2, HT / 2 + 268, 200, 66, snd.sound ? '🔊 音效開' : '🔇 音效關', function () {
        var s = H.Save.get(); s.sound = !s.sound; H.Save.save();
        self.scene.restart({ from: g });
      }, { color: 0x3a414f, size: 20 });
    },
  });

  // =========================================================
  // 結算
  // =========================================================
  H.ResultScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function ResultScene() { Phaser.Scene.call(this, { key: 'Result' }); },

    init: function (data) { this.d = data || {}; },

    create: function () {
      var self = this, d = this.d;
      H.UI.bg(this, d.win ? 0x1f3326 : 0x33201f);

      if (d.chapterDone) {
        H.UI.title(this, W / 2, 300, '章 節 通 關 !', 62, '#4dff7d');
        H.UI.text(this, W / 2, 372, H.CHAPTERS[d.chapter - 1].name + ' 全 50 關完成', 26);
        if (d.chapter < 3) {
          H.UI.text(this, W / 2, 430, '🔓 已解鎖 ' + H.CHAPTERS[d.chapter].name, 24, '#ffd23d');
        } else {
          H.UI.text(this, W / 2, 430, '你終結了整場屍潮。恭喜！', 24, '#ffd23d');
        }
      } else if (d.win) {
        H.UI.title(this, W / 2, 320, 'STAGE CLEAR', 60, '#4dff7d');
      } else {
        H.UI.title(this, W / 2, 300, '你 被 吞 噬 了', 58, '#ff3d5c');
        H.UI.text(this, W / 2, 372, '第 ' + d.chapter + ' 章 · 第 ' + d.level + ' 關', 26);
        var z = H.charImage(this, W / 2, 500, 'zombie_walk', 'z_walker', 210, -Math.PI / 2);
        this.tweens.add({
          targets: z, scaleX: z.scaleX * 1.1, scaleY: z.scaleY * 0.92,
          duration: 700, yoyo: true, repeat: -1,
        });
      }

      // 金幣結算
      this.add.image(W / 2 - 60, 660, 'coin').setScale(1.1);
      H.UI.text(this, W / 2 + 20, 660, '+ ' + (d.coin || 0), 34, '#ffd23d');
      H.UI.text(this, W / 2, 706, '目前持有 ' + H.Save.get().coin, 20, '#8b95a6');

      var y = 850;
      if (!d.win) {
        H.UI.button(this, W / 2, y, 440, 96, '↻  重試本關（保留強化）', function () {
          var st = d.stats;
          if (st) { st.hp = st.maxHp; }
          self.scene.start('Game', { chapter: d.chapter, level: d.level, stats: st });
        }, { color: 0xff6b3d, size: 27 });
        y += 116;
      }

      H.UI.button(this, W / 2, y, 440, 96, '☰  回關卡選單', function () {
        self.scene.start('LevelSelect', { chapter: d.chapter });
      }, { color: 0x4a5568, size: 27 });
      y += 116;

      H.UI.button(this, W / 2, y, 440, 96, '⌂  回主選單', function () {
        self.scene.start('Menu');
      }, { color: 0x3a414f, size: 27 });
    },
  });
})(window.HABBY);
