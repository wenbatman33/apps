/* ============================================================
 * 共用 UI 元件（卡通粗描邊風格）
 * ============================================================ */
(function (H) {
  'use strict';

  var U = {};

  U.FONT = 'Arial Black, "Noto Sans TC", sans-serif';

  U.panel = function (sc, x, y, w, h, color, alpha) {
    var g = sc.add.graphics();
    g.fillStyle(color === undefined ? 0x1b2029 : color, alpha === undefined ? 0.96 : alpha);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 22);
    g.lineStyle(5, 0x0d1016, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 22);
    return g;
  };

  /** 圓角按鈕；回傳 container */
  U.button = function (sc, x, y, w, h, label, onClick, opt) {
    opt = opt || {};
    var color = opt.color === undefined ? 0xff6b3d : opt.color;
    var disabled = !!opt.disabled;
    var c = sc.add.container(x, y);
    var g = sc.add.graphics();
    var base = disabled ? 0x3a414f : color;

    function draw(shift) {
      g.clear();
      // 立體下緣
      g.fillStyle(H.shade(base, -60), 1);
      g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 18);
      g.fillStyle(base, 1);
      g.fillRoundedRect(-w / 2, -h / 2 + shift, w, h - 6, 18);
      g.lineStyle(5, 0x0d1016, 1);
      g.strokeRoundedRect(-w / 2, -h / 2 + shift, w, h - 6, 18);
      // 上緣高光
      g.fillStyle(H.shade(base, 45), 0.5);
      g.fillRoundedRect(-w / 2 + 10, -h / 2 + shift + 6, w - 20, (h - 6) * 0.34, 12);
    }
    draw(0);

    var t = sc.add.text(0, 0, label, {
      fontFamily: U.FONT, fontSize: (opt.size || 28) + 'px',
      color: disabled ? '#7d8492' : (opt.textColor || '#ffffff'),
      stroke: '#0d1016', strokeThickness: 5, align: 'center',
    }).setOrigin(0.5);
    c.add([g, t]);
    c.label = t;
    c.redraw = draw;

    if (!disabled) {
      // 命中區比視覺再大一圈，手指點擊更好按
      var pad = 10;
      c.setSize(w + pad * 2, h + pad * 2);
      c.setInteractive(
        new Phaser.Geom.Rectangle(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2),
        Phaser.Geom.Rectangle.Contains
      );
      // 手遊手感：按下即觸發（等 pointerup 會因手指微幅位移而漏掉）
      c.on('pointerdown', function () {
        if (c.locked) return;
        c.locked = true;
        draw(6);
        H.Sfx.click();
        if (onClick) onClick();
        sc.time.delayedCall(260, function () { if (c.active) { c.locked = false; draw(0); } });
      });
      c.on('pointerup', function () { draw(0); });
      c.on('pointerout', function () { draw(0); sc.input.setDefaultCursor('default'); });
      c.on('pointerover', function () { sc.input.setDefaultCursor('pointer'); });
    }
    return c;
  };

  U.title = function (sc, x, y, text, size, color) {
    return sc.add.text(x, y, text, {
      fontFamily: 'Impact, ' + U.FONT, fontSize: (size || 48) + 'px',
      color: color || '#ffffff', stroke: '#0d1016', strokeThickness: 8, align: 'center',
    }).setOrigin(0.5);
  };

  U.text = function (sc, x, y, text, size, color) {
    return sc.add.text(x, y, text, {
      fontFamily: U.FONT, fontSize: (size || 22) + 'px',
      color: color || '#c8d0dd', stroke: '#0d1016', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5);
  };

  /** 場景背景：暗色漸層 + 動態血霧 */
  U.bg = function (sc, tint) {
    var W = H.GAME.WIDTH, Ht = H.GAME.HEIGHT;
    sc.cameras.main.setBackgroundColor('#0d1016');
    var g = sc.add.graphics();
    g.fillGradientStyle(tint || 0x1c2430, tint || 0x1c2430, 0x0d1016, 0x0d1016, 1);
    g.fillRect(0, 0, W, Ht);
    for (var i = 0; i < 14; i++) {
      var b = sc.add.image(Math.random() * W, Math.random() * Ht, 'glow')
        .setTint(0x8c1f1f).setAlpha(0.05 + Math.random() * 0.06)
        .setScale(1 + Math.random() * 2.5).setBlendMode(Phaser.BlendModes.ADD);
      sc.tweens.add({
        targets: b, y: b.y - 120 - Math.random() * 200, alpha: 0,
        duration: 6000 + Math.random() * 6000, repeat: -1, delay: Math.random() * 3000,
      });
    }
  };

  H.UI = U;
})(window.HABBY);
