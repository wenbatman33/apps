/* ============================================================
 * 進入點
 * ============================================================ */
(function (H) {
  'use strict';

  var config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: H.GAME.WIDTH,
    height: H.GAME.HEIGHT,
    backgroundColor: H.GAME.BG,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false },
    },
    input: { activePointers: 3 },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    scene: [
      H.BootScene, H.MenuScene, H.LevelSelectScene, H.UpgradeScene,
      H.GameScene, H.SkillScene, H.PauseScene, H.ResultScene,
    ],
  };

  window.addEventListener('load', function () {
    H.game = new Phaser.Game(config);
    // 首次互動解鎖音訊
    var unlock = function () { H.Sfx.unlock(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);
    // 手機避免下拉刷新 / 縮放
    document.addEventListener('touchmove', function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

    // 版面變動後重算 canvas 邊界，避免點擊座標偏移（旋轉、網址列收合、切回分頁）
    var refresh = function () { if (H.game && H.game.scale) H.game.scale.refresh(); };
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', function () { setTimeout(refresh, 250); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(refresh, 60); });
    setTimeout(refresh, 200);
  });
})(window.HABBY);
