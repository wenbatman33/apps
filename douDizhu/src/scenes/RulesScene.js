// 规则说明页：可捲动，从主选单进入，返回回主选单

(function () {
  const SECTIONS = [
    ['基本玩法', [
      '3 人对战，一副 54 张（含大小王）。',
      '每人 17 张，留 3 张底牌。',
      '叫分决定地主：地主拿底牌，1 打 2。',
      '地主先出完赢；任一农民先出完，农民赢。'
    ]],
    ['牌的大小', [
      '点数：3 4 5 6 7 8 9 10 J Q K A 2',
      '（3 最小、2 最大），花色不分大小。',
      '王：小王 > 2，大王 > 小王。'
    ]],
    ['叫分（抢地主）', [
      '轮流叫 1 / 2 / 3 分或不叫，',
      '后叫的必须比前面高，叫 3 分直接当地主。',
      '叫分就是底分，越高输赢越大。',
      '都不叫则重新发牌。'
    ]],
    ['牌型', [
      '单张、对子、三条',
      '三带一、三带一对',
      '顺子：5 张以上连续单张（3~A）',
      '连对：3 对以上连续对子（3~A）',
      '飞机：2 组以上连续三条，可带同数量的单张或对子',
      '四带二：炸弹带两张单牌或两个对子',
      '跟牌必须同型同长度，比主体点数。'
    ]],
    ['炸弹与王炸', [
      '炸弹（四张同点）可压任何牌型，',
      '王炸（大小王）是最大的牌，压一切。',
      '每打出一个炸弹或王炸，本局倍数 ×2。'
    ]],
    ['出牌权', [
      '地主先出，其余两家轮流跟牌。',
      '两家都「不要」后，最后出牌者重新自由出牌。'
    ]],
    ['计分', [
      '每家输赢 = 叫分 × 倍数 × 10。',
      '地主赢：向两个农民各收一份；',
      '农民赢：各向地主收一份（地主付双份）。',
      '春天：农民全程没出过牌，倍数再 ×2；',
      '反春：地主只出过第一手，倍数再 ×2。'
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
