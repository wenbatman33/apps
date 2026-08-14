/* ============================================================
 * 程式生成美術（免外部素材）：卡通俯視角、粗描邊
 * 所有角色貼圖一律「面朝右 (+x)」，遊戲中用 rotation 對準目標
 * ============================================================ */
(function (H) {
  'use strict';

  function G(scene) { return scene.make.graphics({ x: 0, y: 0, add: false }); }

  function shade(color, amt) {
    var r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
    r = Math.max(0, Math.min(255, Math.round(r + amt)));
    g = Math.max(0, Math.min(255, Math.round(g + amt)));
    b = Math.max(0, Math.min(255, Math.round(b + amt)));
    return (r << 16) | (g << 8) | b;
  }
  H.shade = shade;

  // ---------------------------------------------------------
  // 玩家：軍裝槍手（面朝右）
  // ---------------------------------------------------------
  function makePlayer(scene) {
    var K = 1.34;                       // 整體放大（角色在直屏中的存在感）
    var S = Math.round(80 * K), cx = S / 2, cy = S / 2;
    var g = G(scene);
    var OUT = 0x141821;
    var LW = 3.4 * K;
    function u(v) { return v * K; }

    // 腿
    g.fillStyle(0x2b3448, 1); g.lineStyle(LW, OUT, 1);
    g.fillEllipse(cx - u(6), cy - u(11), u(15), u(12)); g.strokeEllipse(cx - u(6), cy - u(11), u(15), u(12));
    g.fillEllipse(cx - u(6), cy + u(11), u(15), u(12)); g.strokeEllipse(cx - u(6), cy + u(11), u(15), u(12));

    // 後手臂
    g.fillStyle(0x3d4c6b, 1);
    g.fillEllipse(cx + u(4), cy + u(12), u(20), u(11)); g.strokeEllipse(cx + u(4), cy + u(12), u(20), u(11));

    // 軀幹
    g.fillStyle(0x4a5f8c, 1);
    g.fillEllipse(cx - u(1), cy, u(31), u(33)); g.strokeEllipse(cx - u(1), cy, u(31), u(33));
    // 戰術背心
    g.fillStyle(0x33425f, 1);
    g.fillRoundedRect(cx - u(12), cy - u(12), u(19), u(24), u(6));
    g.lineStyle(LW * 0.8, OUT, 1); g.strokeRoundedRect(cx - u(12), cy - u(12), u(19), u(24), u(6));
    g.fillStyle(0x7d92bd, 1);
    g.fillRect(cx - u(9), cy - u(7), u(12), u(3.4)); g.fillRect(cx - u(9), cy + u(2), u(12), u(3.4));

    // 槍（步槍）
    g.lineStyle(LW, OUT, 1);
    g.fillStyle(0x23282f, 1);
    g.fillRoundedRect(cx + u(6), cy - u(4), u(33), u(9), u(3.4));
    g.strokeRoundedRect(cx + u(6), cy - u(4), u(33), u(9), u(3.4));
    g.fillStyle(0x3a424d, 1);
    g.fillRoundedRect(cx + u(1), cy - u(7), u(16), u(14), u(4.5));
    g.strokeRoundedRect(cx + u(1), cy - u(7), u(16), u(14), u(4.5));
    g.fillStyle(0x6f7b88, 1); g.fillRect(cx + u(32), cy - u(2.4), u(9), u(5));

    // 前手臂（握把）
    g.fillStyle(0x5a6ea3, 1);
    g.fillEllipse(cx + u(8), cy - u(11), u(23), u(12)); g.strokeEllipse(cx + u(8), cy - u(11), u(23), u(12));
    g.fillStyle(0x1f242e, 1);
    g.fillCircle(cx + u(17), cy - u(9), u(5.4)); g.strokeCircle(cx + u(17), cy - u(9), u(5.4));

    // 頭 + 頭盔
    var hr = u(13.5);
    g.fillStyle(0xf0bf95, 1); g.lineStyle(LW, OUT, 1);
    g.fillCircle(cx + u(2), cy, hr); g.strokeCircle(cx + u(2), cy, hr);
    g.fillStyle(0x3f5375, 1);
    g.slice(cx + u(2), cy, hr, Phaser.Math.DegToRad(66), Phaser.Math.DegToRad(294), false);
    g.fillPath();
    g.lineStyle(LW, OUT, 1); g.strokeCircle(cx + u(2), cy, hr);
    // 頭盔頂視高光
    g.fillStyle(0x5d76a3, 1);
    g.fillEllipse(cx - u(3), cy, u(9), u(16));
    // 護目鏡（面向方向）
    g.fillStyle(0x5ad7ff, 0.95);
    g.fillRoundedRect(cx + u(8), cy - u(8), u(7), u(16), u(3.4));
    g.lineStyle(LW * 0.7, OUT, 1); g.strokeRoundedRect(cx + u(8), cy - u(8), u(7), u(16), u(3.4));

    g.generateTexture('player', S, S);
    g.destroy();
  }

  // ---------------------------------------------------------
  // 喪屍（參數化）
  // ---------------------------------------------------------
  function makeZombie(scene, key, def) {
    var r = def.r, S = Math.ceil(r * 3.4), cx = S / 2, cy = S / 2;
    var g = G(scene);
    var OUT = 0x120f16;
    var body = def.body, head = def.head, dark = def.dark;
    var big = !!def.boss;
    var lw = big ? 4 : 3;

    // 前伸的雙手
    g.lineStyle(lw, OUT, 1);
    g.fillStyle(shade(body, -18), 1);
    g.fillEllipse(cx + r * 0.75, cy - r * 0.5, r * 1.15, r * 0.5);
    g.strokeEllipse(cx + r * 0.75, cy - r * 0.5, r * 1.15, r * 0.5);
    g.fillEllipse(cx + r * 0.75, cy + r * 0.5, r * 1.15, r * 0.5);
    g.strokeEllipse(cx + r * 0.75, cy + r * 0.5, r * 1.15, r * 0.5);
    // 手掌
    g.fillStyle(shade(head, -10), 1);
    g.fillCircle(cx + r * 1.25, cy - r * 0.5, r * 0.26); g.strokeCircle(cx + r * 1.25, cy - r * 0.5, r * 0.26);
    g.fillCircle(cx + r * 1.25, cy + r * 0.5, r * 0.26); g.strokeCircle(cx + r * 1.25, cy + r * 0.5, r * 0.26);

    // 軀幹
    var bw = def.fat ? r * 2.3 : r * 1.85, bh = def.fat ? r * 2.2 : r * 1.95;
    g.fillStyle(body, 1);
    g.fillEllipse(cx - r * 0.12, cy, bw, bh); g.strokeEllipse(cx - r * 0.12, cy, bw, bh);

    // 破爛衣物 / 血漬
    g.fillStyle(dark, 0.85);
    g.fillEllipse(cx - r * 0.45, cy + r * 0.3, r * 0.7, r * 0.5);
    g.fillEllipse(cx - r * 0.1, cy - r * 0.45, r * 0.5, r * 0.36);
    if (def.armor) {
      g.fillStyle(0x8c9aa8, 1); g.lineStyle(lw, OUT, 1);
      g.fillRoundedRect(cx - r * 0.6, cy - r * 0.75, r * 0.95, r * 1.5, r * 0.28);
      g.strokeRoundedRect(cx - r * 0.6, cy - r * 0.75, r * 0.95, r * 1.5, r * 0.28);
      g.fillStyle(0xb8c4d0, 1); g.fillRect(cx - r * 0.45, cy - r * 0.5, r * 0.65, r * 0.16);
    }

    // 肩甲（暴屍 / boss）
    if (def.spikes) {
      g.fillStyle(shade(dark, 20), 1); g.lineStyle(lw, OUT, 1);
      for (var i = -1; i <= 1; i += 2) {
        g.fillTriangle(cx - r * 0.2, cy + i * r * 0.9, cx + r * 0.35, cy + i * r * 0.75, cx - r * 0.05, cy + i * r * 1.5);
        g.strokeTriangle(cx - r * 0.2, cy + i * r * 0.9, cx + r * 0.35, cy + i * r * 0.75, cx - r * 0.05, cy + i * r * 1.5);
      }
    }

    // 頭
    var hr = def.fat ? r * 0.55 : r * 0.62;
    var hx = cx + r * 0.35;
    g.fillStyle(head, 1); g.lineStyle(lw, OUT, 1);
    g.fillCircle(hx, cy, hr); g.strokeCircle(hx, cy, hr);

    if (def.hood) {  // 屍巫兜帽
      g.fillStyle(shade(dark, -10), 1);
      g.slice(hx, cy, hr * 1.35, Phaser.Math.DegToRad(60), Phaser.Math.DegToRad(300), false);
      g.fillPath();
      g.lineStyle(lw, OUT, 1); g.strokePath();
    }

    // 眼睛（發光）
    var eyeC = def.boss ? 0xff2d2d : 0xff4d4d;
    g.fillStyle(eyeC, 1);
    g.fillCircle(hx + hr * 0.45, cy - hr * 0.38, hr * 0.19);
    g.fillCircle(hx + hr * 0.45, cy + hr * 0.38, hr * 0.19);
    g.fillStyle(0xffffff, 0.75);
    g.fillCircle(hx + hr * 0.52, cy - hr * 0.42, hr * 0.08);
    g.fillCircle(hx + hr * 0.52, cy + hr * 0.42, hr * 0.08);
    // 嘴（血口）
    g.fillStyle(0x6b1a1a, 1);
    g.fillEllipse(hx + hr * 0.72, cy, hr * 0.34, hr * 0.5);

    // BOSS 角
    if (big) {
      g.fillStyle(0xe8e0d0, 1); g.lineStyle(lw, OUT, 1);
      for (var s = -1; s <= 1; s += 2) {
        g.fillTriangle(hx - hr * 0.3, cy + s * hr * 0.8, hx + hr * 0.15, cy + s * hr * 0.95, hx - hr * 0.8, cy + s * hr * 1.7);
        g.strokeTriangle(hx - hr * 0.3, cy + s * hr * 0.8, hx + hr * 0.15, cy + s * hr * 0.95, hx - hr * 0.8, cy + s * hr * 1.7);
      }
    }

    g.generateTexture(key, S, S);
    g.destroy();
  }

  // ---------------------------------------------------------
  // 其他小物件
  // ---------------------------------------------------------
  function makeMisc(scene) {
    var g;

    // 陰影
    g = G(scene);
    g.fillStyle(0x000000, 0.34); g.fillEllipse(40, 20, 76, 34);
    g.generateTexture('shadow', 80, 40); g.destroy();

    // 玩家子彈（黃色曳光）
    g = G(scene);
    g.fillStyle(0xfff2a8, 1); g.fillRoundedRect(0, 4, 26, 8, 4);
    g.fillStyle(0xffd23d, 1); g.fillRoundedRect(2, 5.5, 20, 5, 2.5);
    g.fillStyle(0xffffff, 1); g.fillCircle(23, 8, 4);
    g.generateTexture('bullet', 30, 16); g.destroy();

    // 敵人投射物（白色，用 tint 染色）
    g = G(scene);
    g.fillStyle(0xffffff, 1); g.fillCircle(16, 16, 13);
    g.fillStyle(0xffffff, 0.45); g.fillCircle(16, 16, 16);
    g.generateTexture('eproj', 32, 32); g.destroy();

    // 圓形光暈（爆炸／特效通用）
    g = G(scene);
    g.fillStyle(0xffffff, 0.28); g.fillCircle(64, 64, 64);
    g.fillStyle(0xffffff, 0.45); g.fillCircle(64, 64, 44);
    g.fillStyle(0xffffff, 0.85); g.fillCircle(64, 64, 22);
    g.generateTexture('glow', 128, 128); g.destroy();

    // 方形粒子
    g = G(scene);
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 8, 8);
    g.generateTexture('px', 8, 8); g.destroy();

    // 金幣
    g = G(scene);
    g.fillStyle(0xb8860b, 1); g.lineStyle(3, 0x5c3d00, 1);
    g.fillCircle(18, 18, 15); g.strokeCircle(18, 18, 15);
    g.fillStyle(0xffd23d, 1); g.fillCircle(18, 18, 11);
    g.fillStyle(0xfff2a8, 1); g.fillCircle(14, 14, 4);
    g.generateTexture('coin', 36, 36); g.destroy();

    // 補血包
    g = G(scene);
    g.fillStyle(0xf5f5f5, 1); g.lineStyle(3, 0x2a2a2a, 1);
    g.fillRoundedRect(2, 2, 32, 32, 8); g.strokeRoundedRect(2, 2, 32, 32, 8);
    g.fillStyle(0xff3d5c, 1);
    g.fillRect(14, 7, 8, 22); g.fillRect(7, 14, 22, 8);
    g.generateTexture('heart', 36, 36); g.destroy();

    // 木箱障礙
    g = G(scene);
    g.fillStyle(0x8a6238, 1); g.lineStyle(4, 0x2a1c0f, 1);
    g.fillRoundedRect(3, 3, 66, 66, 8); g.strokeRoundedRect(3, 3, 66, 66, 8);
    g.fillStyle(0xa87a48, 1); g.fillRoundedRect(10, 10, 52, 52, 5);
    g.lineStyle(4, 0x6b4a29, 1);
    g.lineBetween(10, 10, 62, 62); g.lineBetween(62, 10, 10, 62);
    g.generateTexture('crate', 72, 72); g.destroy();

    // 油桶障礙
    g = G(scene);
    g.fillStyle(0x2f3d5c, 1); g.lineStyle(4, 0x121821, 1);
    g.fillCircle(32, 32, 29); g.strokeCircle(32, 32, 29);
    g.fillStyle(0x43567d, 1); g.fillCircle(32, 32, 21);
    g.fillStyle(0xff8a3d, 1); g.fillCircle(32, 32, 9);
    g.generateTexture('barrel', 64, 64); g.destroy();

    // 搖桿底座
    g = G(scene);
    g.fillStyle(0xffffff, 0.10); g.fillCircle(110, 110, 105);
    g.lineStyle(6, 0xffffff, 0.5); g.strokeCircle(110, 110, 100);
    g.lineStyle(3, 0xffffff, 0.28); g.strokeCircle(110, 110, 66);
    g.generateTexture('joy_base', 220, 220); g.destroy();

    // 搖桿頭
    g = G(scene);
    g.fillStyle(0xffffff, 0.30); g.fillCircle(56, 56, 52);
    g.fillStyle(0xffffff, 0.85); g.fillCircle(56, 56, 40);
    g.lineStyle(4, 0x1a1d24, 0.55); g.strokeCircle(56, 56, 40);
    g.generateTexture('joy_knob', 112, 112); g.destroy();

    // 血條底
    g = G(scene);
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 4, 4);
    g.generateTexture('white', 4, 4); g.destroy();
  }

  // 地板磚（依章節配色）
  function makeGround(scene, chap) {
    var key = 'ground_' + chap.id;
    if (scene.textures.exists(key)) return key;
    var S = 160;
    var g = G(scene);
    g.fillStyle(chap.ground, 1); g.fillRect(0, 0, S, S);
    // 棋盤格只做輕微明暗差，避免地板搶戲
    g.fillStyle(shade(chap.ground, 9), 1);
    g.fillRect(0, 0, S / 2, S / 2); g.fillRect(S / 2, S / 2, S / 2, S / 2);
    g.lineStyle(2, chap.grid, 0.45);
    g.strokeRect(0, 0, S, S); g.lineBetween(S / 2, 0, S / 2, S); g.lineBetween(0, S / 2, S, S / 2);
    // 隨機髒污
    for (var i = 0; i < 22; i++) {
      var x = Math.random() * S, y = Math.random() * S, rr = 2 + Math.random() * 7;
      g.fillStyle(Math.random() < 0.5 ? H.shade(chap.ground, -14) : H.shade(chap.ground, 12), 0.6);
      g.fillCircle(x, y, rr);
    }
    g.generateTexture(key, S, S);
    g.destroy();
    return key;
  }

  H.Art = {
    /** 建立所有貼圖（只需執行一次） */
    build: function (scene) {
      if (scene.textures.exists('player')) return;
      makePlayer(scene);
      makeMisc(scene);
      Object.keys(H.ENEMY).forEach(function (k) {
        var d = Object.assign({}, H.ENEMY[k]);
        if (k === 'bloater' || k === 'brute') d.fat = true;
        if (k === 'brute' || k === 'armored') d.spikes = true;
        if (k === 'necro' || k === 'necro_boss') d.hood = true;
        if (d.boss) { d.fat = true; d.spikes = true; }
        makeZombie(scene, 'z_' + k, d);
      });
    },
    ground: makeGround,
  };
})(window.HABBY);
