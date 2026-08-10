// v4 特效工具：程序貼圖、火花、火焰、飄字、金幣、震屏
const FxV4 = {
  makeTextures(scene) {
    if (scene.textures.exists('fx_dot')) return;
    let g = scene.make.graphics({ add: false });
    g.fillStyle(0xffffff).fillCircle(8, 8, 8);
    g.generateTexture('fx_dot', 16, 16); g.clear();
    // 四角星火花
    g.fillStyle(0xffffff).beginPath();
    const R = 14, r = 5;
    for (let k = 0; k < 8; k++) {
      const rr = k % 2 ? r : R, a = k * Math.PI / 4;
      const x = 16 + Math.cos(a) * rr, y = 16 + Math.sin(a) * rr;
      k ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath().fillPath();
    g.generateTexture('fx_star', 32, 32); g.clear();
    // 箭（朝上）
    g.fillStyle(0xfff4d8).fillRect(6, 8, 4, 34);
    g.fillStyle(0xcdd3da).fillTriangle(8, 0, 2, 12, 14, 12);
    g.fillStyle(0xb54a38).fillRect(4, 38, 8, 6);
    g.generateTexture('fx_arrow', 16, 46); g.clear();
    // 標槍
    g.fillStyle(0xd9c79c).fillRect(6, 4, 4, 44);
    g.fillStyle(0xc9a227).fillTriangle(8, 0, 3, 14, 13, 14);
    g.generateTexture('fx_javelin', 16, 50); g.clear();
    // 石塊
    g.fillStyle(0x9a917e).fillCircle(12, 12, 11);
    g.fillStyle(0xb3aa96).fillCircle(9, 9, 5);
    g.generateTexture('fx_rock', 24, 24); g.clear();
    // 火油罐
    g.fillStyle(0x7a5a3a).fillRoundedRect(2, 8, 20, 16, 5);
    g.fillStyle(0x5e4327).fillRoundedRect(0, 4, 24, 7, 3);
    g.fillStyle(0xff8a2a).fillCircle(12, 4, 5);
    g.generateTexture('fx_pot', 24, 26); g.clear();
    g.destroy();
  },

  spark(scene, x, y, tint = 0xffe08a, n = 8) {
    n = Math.max(1, Math.round(n * window.DEV_V4.particleMult));
    const e = scene.add.particles(x, y, 'fx_star', {
      speed: { min: 90, max: 260 }, scale: { start: 0.7, end: 0 },
      lifespan: 320, quantity: n, tint, gravityY: 500, emitting: false,
    }).setDepth(900);
    e.explode(n); scene.time.delayedCall(600, () => e.destroy());
  },

  // 持續火焰（回傳 emitter，呼叫端負責 destroy）
  flame(scene, x, y, scale = 1) {
    return scene.add.particles(x, y, 'fx_dot', {
      speedY: { min: -90 * scale, max: -40 * scale },
      speedX: { min: -18, max: 18 },
      scale: { start: 0.9 * scale, end: 0 },
      lifespan: { min: 300, max: 620 },
      frequency: 45 / Math.max(0.25, window.DEV_V4.particleMult),
      tint: [0xff8a2a, 0xffd23c, 0xff5c2a],
      blendMode: 'ADD',
    }).setDepth(850);
  },

  // 傷害數字：白=普通 金大=暴擊 橘=灼燒 彩=魔法
  _dmgActive: 0,
  dmgNum(scene, x, y, n, opts = {}) {
    const crit = opts.crit;
    if (this._dmgActive > 40 && !crit) return;   // 海量戰鬥節流
    this._dmgActive++;
    const t = scene.add.text(x + Phaser.Math.Between(-22, 22), y - 40 + Phaser.Math.Between(-10, 10),
      String(Math.max(1, Math.round(n))), {
        fontFamily: 'sans-serif', fontStyle: 'bold',
        fontSize: (crit ? 54 : opts.size || 34) + 'px',
        color: crit ? '#FFD23C' : opts.color || '#FFF8E0',
        stroke: '#1A140E', strokeThickness: crit ? 8 : 5,
      }).setOrigin(0.5).setDepth(952).setScale(0.3);
    scene.tweens.add({ targets: t, scale: crit ? 1.25 : 1, duration: 110, ease: 'Back.easeOut' });
    scene.tweens.add({
      targets: t, y: t.y - (crit ? 90 : 62), alpha: 0, delay: 90,
      duration: crit ? 700 : 520, ease: 'Cubic.easeOut',
      onComplete: () => { t.destroy(); FxV4._dmgActive--; },
    });
  },

  // 投射物軌跡光尾（跟隨目標，呼叫端負責 destroy）
  trail(scene, follow, tints, scale = 0.55) {
    const e = scene.add.particles(0, 0, 'fx_dot', {
      speed: { min: 4, max: 18 }, scale: { start: scale, end: 0 },
      lifespan: 260, frequency: 18 / Math.max(0.25, window.DEV_V4.particleMult),
      tint: tints, blendMode: 'ADD',
    }).setDepth(869);
    e.startFollow(follow);
    return e;
  },

  // 衝擊環：擴張的描邊圓
  ring(scene, x, y, color = 0xffd23c, r1 = 120, dur = 320) {
    const c = scene.add.circle(x, y, 18).setStrokeStyle(8, color, 0.9).setDepth(890);
    scene.tweens.add({
      targets: c, radius: r1, alpha: 0, duration: dur, ease: 'Cubic.easeOut',
      onUpdate: () => c.setStrokeStyle(Math.max(2, 8 * c.alpha), color, c.alpha),
      onComplete: () => c.destroy(),
    });
    return c;
  },

  floatText(scene, x, y, str, color = '#FFD23C', size = 40) {
    const t = scene.add.text(x, y, str, {
      fontFamily: 'sans-serif', fontSize: size + 'px', color,
      stroke: '#1A140E', strokeThickness: 6, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(950);
    scene.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  },

  coinFly(scene, x, y, toX, toY) {
    const c = scene.add.image(x, y, 'fx_dot').setTint(0xffb020).setScale(1.3).setDepth(950);
    scene.tweens.add({
      targets: c, x: toX, y: toY, scale: 0.5, duration: 480,
      ease: 'Cubic.easeIn', onComplete: () => c.destroy(),
    });
  },

  shake(scene, intensity = 0.004, dur = 200) {
    scene.cameras.main.shake(dur, intensity * window.DEV_V4.shakeMult);
  },
};
