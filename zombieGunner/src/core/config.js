/* ============================================================
 * Habby - 屍潮槍手 (Zombie Gunner)
 * 全域設定：畫面尺寸、版面座標、平衡數值
 * ============================================================ */
window.HABBY = window.HABBY || {};

(function (H) {
  'use strict';

  // 直屏基準解析度（所有座標以此為準，再由 Phaser Scale 縮放）
  H.GAME = {
    WIDTH: 720,
    HEIGHT: 1280,
    BG: '#10131a',
  };

  // ---- 版面（可由 DEV 工具即時微調並匯出）----
  H.LAYOUT = {
    // 戰鬥場地（玩家可移動的矩形範圍）
    arena: { x: 40, y: 250, w: 640, h: 830 },

    // 頂部 HUD
    hud: {
      barX: 360, barY: 60, barW: 560, barH: 34,      // 玩家血條
      lvTextX: 360, lvTextY: 108, lvTextSize: 26,     // 關卡文字
      coinX: 640, coinY: 150, coinSize: 24,           // 金幣
      waveX: 80, waveY: 150, waveSize: 22,            // 波次
    },

    // 虛擬搖桿（浮動式：手指按下處生成，此為預設閒置位置）
    joystick: {
      baseX: 170, baseY: 1080, baseR: 110, knobR: 52,
      idleAlpha: 0.30, activeAlpha: 0.62,
      deadzone: 0.14,          // 死區（避免誤觸微移導致停火判定抖動）
      followMax: 70,           // 拖出底座外多遠時底座跟著移動
    },

    // 右下功能鍵（技能／道具）
    buttons: { skillX: 590, skillY: 1090, skillR: 70 },
  };

  // ---- 玩家基礎數值 ----
  H.PLAYER = {
    radius: 26,
    spriteSize: 124,         // AI sprite 在場上的顯示邊長（px）
    // 槍口相對角色中心的位置（以 spriteSize 為單位的比例，量自 sprite 槍管末端）
    muzzleX: 0.496,
    muzzleY: -0.035,
    speed: 300,              // px/s
    hp: 120,
    fireRate: 420,           // ms / 發
    damage: 12,
    bulletSpeed: 900,
    range: 560,              // 自動鎖定射程
    critRate: 0.05,
    critMul: 2.0,
    stopFireDelay: 60,       // 停止移動後多久開火（ms，手感用）
    invulnAfterHit: 420,     // 受擊無敵（ms）
  };

  // ---- 難度曲線 ----
  H.BALANCE = {
    // 第 n 關（全域 1..150）敵人強度倍率
    enemyHp: function (g) { return 1 + (g - 1) * 0.115 + Math.pow(g / 30, 2.1); },
    enemyDmg: function (g) { return 1 + (g - 1) * 0.055 + Math.pow(g / 45, 1.9); },
    enemySpd: function (g) { return 1 + Math.min(0.55, (g - 1) * 0.006); },
    // 每關敵人總數
    count: function (g) { return Math.min(34, 5 + Math.floor(g * 0.42)); },
    // 金幣
    coin: function (g) { return 10 + Math.floor(g * 1.6); },
  };

  H.isBoss = function (levelInChapter) { return levelInChapter % 10 === 0; };
  H.isElite = function (levelInChapter) { return levelInChapter % 5 === 0 && levelInChapter % 10 !== 0; };
})(window.HABBY);
