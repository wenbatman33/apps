import Phaser from 'phaser';

export function createGeneratedAssets(scene: Phaser.Scene): void {
  createShip(scene);
  createEnemies(scene);
  createBullets(scene);
  createPickups(scene);
  createExplosion(scene);
  createBackgroundTiles(scene);
}

function createShip(scene: Phaser.Scene): void {
  if (scene.textures.exists('player-ship')) return;
  const g = scene.add.graphics();
  g.fillGradientStyle(0xc9f8ff, 0x79d7ff, 0x2f66ff, 0x1431a7, 1);
  g.fillTriangle(32, 2, 8, 62, 56, 62);
  g.fillStyle(0xff784f, 1);
  g.fillTriangle(32, 50, 22, 72, 42, 72);
  g.lineStyle(3, 0xffffff, 0.85);
  g.strokeTriangle(32, 2, 8, 62, 56, 62);
  g.fillStyle(0x081638, 0.8);
  g.fillEllipse(32, 29, 16, 24);
  g.generateTexture('player-ship', 64, 78);
  g.destroy();
}

function createEnemies(scene: Phaser.Scene): void {
  if (!scene.textures.exists('enemy-scout')) {
    createEnemyTexture(scene, 'enemy-scout', 58, 50, 0xff835c, 0x6b1929);
  }
  if (!scene.textures.exists('enemy-drone')) {
    createEnemyTexture(scene, 'enemy-drone', 48, 44, 0xaeeaff, 0x244b7d);
  }
  if (!scene.textures.exists('enemy-gunship')) {
    createEnemyTexture(scene, 'enemy-gunship', 78, 64, 0xffc46b, 0x7c3824);
  }
  if (!scene.textures.exists('enemy-midboss')) {
    createEnemyTexture(scene, 'enemy-midboss', 130, 92, 0xbfd6ff, 0x425b88);
  }
  if (!scene.textures.exists('boss-heli')) {
    createBossTexture(scene);
  }
}

function createEnemyTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  primary: number,
  secondary: number,
): void {
  const g = scene.add.graphics();
  g.fillGradientStyle(primary, primary, secondary, secondary, 1);
  g.fillEllipse(width / 2, height / 2, width * 0.9, height * 0.62);
  g.fillStyle(secondary, 1);
  g.fillTriangle(width / 2, height - 3, width * 0.2, height * 0.45, width * 0.8, height * 0.45);
  g.fillStyle(0x101421, 0.88);
  g.fillRoundedRect(width * 0.35, height * 0.24, width * 0.3, height * 0.24, 6);
  g.lineStyle(2, 0xffffff, 0.42);
  g.strokeEllipse(width / 2, height / 2, width * 0.9, height * 0.62);
  g.generateTexture(key, width, height);
  g.destroy();
}

function createBossTexture(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillGradientStyle(0xd7ecff, 0x8fb8ff, 0x243767, 0x13224a, 1);
  g.fillRoundedRect(28, 26, 164, 82, 28);
  g.fillStyle(0x192a5a, 1);
  g.fillEllipse(36, 68, 70, 26);
  g.fillEllipse(184, 68, 70, 26);
  g.fillStyle(0xff6a4a, 1);
  g.fillRect(100, 92, 20, 44);
  g.fillStyle(0x0b132b, 0.9);
  g.fillRoundedRect(84, 42, 52, 34, 10);
  g.lineStyle(4, 0xffffff, 0.35);
  g.strokeRoundedRect(28, 26, 164, 82, 28);
  g.generateTexture('boss-heli', 220, 150);
  g.destroy();
}

function createBullets(scene: Phaser.Scene): void {
  if (
    scene.textures.exists('bullet-player') &&
    scene.textures.exists('bullet-enemy') &&
    scene.textures.exists('fragment')
  ) {
    return;
  }
  const g = scene.add.graphics();
  if (!scene.textures.exists('bullet-player')) {
    g.fillGradientStyle(0xffffff, 0xcff8ff, 0x48bfff, 0x2567ff, 1);
    g.fillEllipse(8, 14, 10, 24);
    g.generateTexture('bullet-player', 16, 28);
    g.clear();
  }
  if (!scene.textures.exists('bullet-enemy')) {
    g.fillGradientStyle(0xfff1a8, 0xffa64c, 0xff4b38, 0xa01932, 1);
    g.fillEllipse(9, 9, 16, 16);
    g.generateTexture('bullet-enemy', 18, 18);
    g.clear();
  }
  if (!scene.textures.exists('fragment')) {
    g.fillStyle(0xfff6bd, 1);
    g.fillRect(0, 0, 8, 8);
    g.generateTexture('fragment', 8, 8);
  }
  g.destroy();
}

function createPickups(scene: Phaser.Scene): void {
  if (scene.textures.exists('pickup-power') && scene.textures.exists('pickup-bomb')) return;
  const g = scene.add.graphics();
  if (!scene.textures.exists('pickup-power')) {
    g.fillStyle(0x4dff9a, 1);
    g.fillCircle(18, 18, 17);
    g.fillStyle(0x073b25, 1);
    g.fillRect(15, 7, 6, 22);
    g.fillRect(8, 14, 20, 6);
    g.generateTexture('pickup-power', 36, 36);
    g.clear();
  }
  if (!scene.textures.exists('pickup-bomb')) {
    g.fillStyle(0xffda5c, 1);
    g.fillCircle(18, 18, 17);
    g.fillStyle(0x4d1709, 1);
    g.fillRoundedRect(11, 8, 14, 20, 4);
    g.fillStyle(0xffda5c, 1);
    g.fillCircle(18, 14, 5);
    g.fillCircle(18, 22, 5);
    g.generateTexture('pickup-bomb', 36, 36);
  }
  g.destroy();
}

function createExplosion(scene: Phaser.Scene): void {
  const hasAllFrames = Array.from({ length: 8 }, (_, index) =>
    scene.textures.exists(`explosion-${index}`),
  ).every(Boolean);

  if (!hasAllFrames) {
  for (let index = 0; index < 8; index += 1) {
    if (scene.textures.exists(`explosion-${index}`)) continue;
    const g = scene.add.graphics();
    const radius = 16 + index * 7;
    g.fillStyle(0xfff6c8, 0.95 - index * 0.08);
    g.fillCircle(48, 48, radius);
    g.fillStyle(0xff7a2f, 0.75 - index * 0.06);
    g.fillCircle(48, 48, radius * 1.4);
    g.fillStyle(0x832433, 0.45 - index * 0.04);
    g.fillCircle(48, 48, radius * 1.9);
    g.generateTexture(`explosion-${index}`, 96, 96);
    g.destroy();
  }
  }

  scene.anims.create({
    key: 'explosion-burst',
    frames: Array.from({ length: 8 }, (_, index) => ({ key: `explosion-${index}` })),
    frameRate: 28,
    repeat: 0,
  });
}

function createBackgroundTiles(scene: Phaser.Scene): void {
  if (scene.textures.exists('bg-dawn') && scene.textures.exists('bg-orbit')) return;
  if (scene.textures.exists('bg-dawn')) return;
  const g = scene.add.graphics();
  g.fillGradientStyle(0x102552, 0x1d5582, 0xffb06d, 0x3a1d4f, 1);
  g.fillRect(0, 0, 432, 936);
  g.lineStyle(1, 0xffffff, 0.08);
  for (let y = 0; y < 936; y += 52) g.lineBetween(0, y, 432, y + 18);
  g.generateTexture('bg-dawn', 432, 936);
  g.destroy();
}
