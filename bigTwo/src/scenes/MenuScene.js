// 主选单：极简标题 + 难度选择 + 开始

(function () {
  class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }

    preload() {
      window.BigTwoAssets.load(this);
    }

    create() {
      const L = window.LAYOUT, T = window.THEME;
      this.cameras.main.setBackgroundColor(T.bg);
      this.difficulty = window.localStorage.getItem('bigtwo_diff') || 'normal';

      // 标题：有 Logo 图就用图，否则退回纯文字
      if (this.textures.exists('title')) {
        const logo = this.add.image(L.width / 2, 380, 'title').setOrigin(0.5);
        const maxW = 500;
        if (logo.width > maxW) logo.setScale(maxW / logo.width);
      } else {
        this.add.text(L.width / 2, 360, '大老二', {
          fontFamily: 'system-ui, "PingFang TC", sans-serif',
          fontSize: '96px', color: T.text, fontStyle: 'bold'
        }).setOrigin(0.5);
      }

      this.add.text(L.width / 2, 660, 'BIG TWO · 30 分钟计分赛', {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '26px', color: T.textDim
      }).setOrigin(0.5);

      // 难度
      this.add.text(L.width / 2, 748, '电脑难度', {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '28px', color: T.textDim
      }).setOrigin(0.5);

      const diffs = [
        { key: 'easy', label: '轻松' },
        { key: 'normal', label: '普通' },
        { key: 'hard', label: '困难' }
      ];
      this.diffBtns = [];
      const w = 180, gap = 20;
      const startX = (L.width - (w * 3 + gap * 2)) / 2 + w / 2;
      diffs.forEach((d, i) => {
        const btn = this.makePill(startX + i * (w + gap), 838, w, 80, d.label, () => {
          this.difficulty = d.key;
          window.localStorage.setItem('bigtwo_diff', d.key);
          this.refreshDiff();
        });
        btn.key = d.key;
        this.diffBtns.push(btn);
      });
      this.refreshDiff();

      // 开始
      const start = this.makePill(L.width / 2, 1000, 360, 100, '开始 30 分钟挑战', () => {
        this.registry.remove('session');   // 清掉上一场，开新的计分赛
        this.scene.start('Game', { difficulty: this.difficulty });
      }, true);

      // 规则说明（开专页）
      const rules = this.add.text(L.width / 2, 1150, '📖 规则说明', {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '30px', color: T.text
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      rules.on('pointerdown', () => { window.SFX.play('sfx_button'); this.scene.start('Rules'); });

      // 音效来源标注（小森平免费音效，使用需附来源）
      this.add.text(L.width / 2, 1290, '音效：小森平 taira-komori.net', {
        fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#4b5563'
      }).setOrigin(0.5);

      this.makeMuteButton();
      this.input.keyboard.on('keydown-D', () => window.DevPanel && window.DevPanel.toggle(this));
    }

    // 右上角静音切换（🔊 / 🔇），状态记忆
    makeMuteButton() {
      const L = window.LAYOUT;
      const btn = this.add.text(L.width - 54, 54, window.SFX.isMuted() ? '🔇' : '🔊', {
        fontSize: '40px'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        const m = window.SFX.toggle();
        btn.setText(m ? '🔇' : '🔊');
        if (!m) window.SFX.play('sfx_button');
      });
      return btn;
    }

    makePill(x, y, w, h, label, onClick, primary) {
      const T = window.THEME;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      const t = this.add.text(0, 0, label, {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: (primary ? 36 : 30) + 'px', color: T.text, fontStyle: 'bold'
      }).setOrigin(0.5);
      c.add([g, t]);
      c.setSize(w, h).setInteractive(
        new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains
      );
      c.on('pointerdown', () => {
        window.SFX.play('sfx_button');
        // 只缩放内容物，避免点击判定区跟著缩小
        this.tweens.add({ targets: [g, t], scale: 0.95, duration: 70, yoyo: true });
        onClick();
      });

      const btn = { c, g, t, w, h, primary: !!primary };
      this.paint(btn, !!primary);
      return btn;
    }

    paint(btn, active) {
      const T = window.THEME;
      const { g, w, h } = btn;
      g.clear();
      if (active) {
        g.fillStyle(T.accent, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
        btn.t.setColor('#0f1115');
      } else {
        g.fillStyle(T.bgAccent, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
        g.lineStyle(2, 0x333a48, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
        btn.t.setColor(T.textDim);
      }
    }

    refreshDiff() {
      this.diffBtns.forEach(b => this.paint(b, b.key === this.difficulty));
    }
  }

  window.MenuScene = MenuScene;
})();
