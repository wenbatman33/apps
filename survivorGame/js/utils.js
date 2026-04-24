// 共用工具函式
const Utils = {
  // 產生純色圓形貼圖，避免依賴外部素材
  makeCircleTexture(scene, key, radius, color) {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(radius, radius, radius);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  },
  // 產生矩形貼圖
  makeRectTexture(scene, key, w, h, color) {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  },
  // 找最近敵人
  nearestEnemy(from, enemies) {
    let best = null, bestDist = Infinity;
    enemies.children.iterate(e => {
      if (!e || !e.active) return;
      const d = Phaser.Math.Distance.Squared(from.x, from.y, e.x, e.y);
      if (d < bestDist) { bestDist = d; best = e; }
    });
    return best;
  },
  // 升級所需經驗（指數成長）
  xpToNext(level) {
    return Math.floor(5 + level * 4 + Math.pow(level, 1.5) * 2);
  }
};
