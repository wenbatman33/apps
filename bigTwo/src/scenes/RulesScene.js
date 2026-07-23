// 规则说明页：可捲动，从主选单进入，返回回主选单

(function () {
  const SECTIONS = [
    ['牌的大小', [
      '点数：3 4 5 6 7 8 9 10 J Q K A 2',
      '（3 最小、2 最大）',
      '花色：♠ 黑桃 > ♥ 红心 > ♦ 方块 > ♣ 梅花'
    ]],
    ['牌型', [
      '单张、对子、三条',
      '五张：顺子 < 同花 < 葫芦 < 铁支 < 同花顺',
      '跟牌张数须与桌面相同（单张压单张…）'
    ]],
    ['炸弹「切」', [
      '铁支、同花顺可在任何情况打出，',
      '不论桌面是单张、对子或三条。',
      '炸弹之间：同花顺 > 铁支。'
    ]],
    ['开局与出牌权', [
      '持 ♣3 者先出，第一手必须包含 ♣3。',
      '其余三家都「不要」后，',
      '最后出牌者取得牌权、重新自由出牌。'
    ]],
    ['计分', [
      '剩牌 n 的倍率：',
      '  n<8 ×1　8~9 ×2　10~12 ×3　13 ×4',
      '手上留 ♠2 → 该家再 ×2',
      '关门（赢家最后一手打 ♠2）→ 其余家全 ×2',
      '例：剩 9 张且留 ♠2 → 9×2×2 = 36'
    ]],
    ['30 分钟计分赛', [
      '起始 500 点，一局接一局，',
      '30 分钟内累计，时间到看净赚多少。'
    ]]
  ];

  class RulesScene extends Phaser.Scene {
    constructor() { super('Rules'); }

    create() {
      const L = window.LAYOUT, T = window.THEME;
      this.cameras.main.setBackgroundColor(T.bg);

      const VIEW_TOP = 138, VIEW_BOTTOM = 1236;

      // ---- 可捲动内容 ----
      this.content = this.add.container(0, VIEW_TOP);
      let y = 0;
      const addLine = (txt, style) => {
        const t = this.add.text(72, y, txt, style).setOrigin(0, 0);
        this.content.add(t);
        y += t.height + 5;
      };
      SECTIONS.forEach(([title, lines]) => {
        addLine(title, {
          fontFamily: 'system-ui, "PingFang TC", sans-serif',
          fontSize: '31px', color: T.accentHex, fontStyle: 'bold'
        });
        y += 3;
        lines.forEach(ln => addLine(ln, {
          fontFamily: 'system-ui, "PingFang TC", sans-serif',
          fontSize: '26px', color: T.text, lineSpacing: 4,
          wordWrap: { width: L.width - 144 }
        }));
        y += 16;
      });
      const contentH = y;

      // 只在可视区显示（遮罩）
      const maskG = this.make.graphics();
      maskG.fillRect(0, VIEW_TOP, L.width, VIEW_BOTTOM - VIEW_TOP);
      this.content.setMask(maskG.createGeometryMask());

      // 捲动范围
      const minY = Math.min(VIEW_TOP, VIEW_BOTTOM - contentH);
      const maxY = VIEW_TOP;
      const clamp = () => { this.content.y = Phaser.Math.Clamp(this.content.y, minY, maxY); };

      // 拖曳捲动
      let dragging = false, startPY = 0, startCY = 0;
      this.input.on('pointerdown', p => { dragging = true; startPY = p.y; startCY = this.content.y; });
      this.input.on('pointerup', () => { dragging = false; });
      this.input.on('pointermove', p => {
        if (!dragging) return;
        this.content.y = startCY + (p.y - startPY);
        clamp();
      });
      // 滑鼠滚轮
      this.input.on('wheel', (p, over, dx, dy) => { this.content.y -= dy * 0.5; clamp(); });

      // 内容超出一屏才允许捲动（否则锁定，避免手滑位移）
      this.scrollable = contentH > VIEW_BOTTOM - VIEW_TOP;

      // ---- 固定：标题列 + 返回 ----
      const topbar = this.add.graphics();
      topbar.fillStyle(T.bg, 1).fillRect(0, 0, L.width, VIEW_TOP);
      this.add.text(L.width / 2, 84, '规则说明', {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '46px', color: T.text, fontStyle: 'bold'
      }).setOrigin(0.5);

      const botbar = this.add.graphics();
      botbar.fillStyle(T.bg, 1).fillRect(0, VIEW_BOTTOM, L.width, L.height - VIEW_BOTTOM);

      const back = this.add.container(L.width / 2, 1300);
      const bg = this.add.graphics();
      bg.fillStyle(T.accent, 1).fillRoundedRect(-160, -44, 320, 88, 44);
      back.add([bg, this.add.text(0, 0, '返回', {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '34px', color: '#0f1115', fontStyle: 'bold'
      }).setOrigin(0.5)]);
      back.setSize(320, 88).setInteractive(
        new Phaser.Geom.Rectangle(0, 0, 320, 88), Phaser.Geom.Rectangle.Contains);
      back.on('pointerdown', () => { window.SFX.play('sfx_button'); this.scene.start('Menu'); });
    }
  }

  window.RulesScene = RulesScene;
})();
