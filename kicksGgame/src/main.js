// Phaser 啟動入口
// 設計：Phaser canvas 疊在 Three.js canvas 上層，背景透明，
// Phaser 負責 UI / 過場 / HUD / 輸入；Three.js 負責 3D 球場
const GAME_W = 1360;
const GAME_H = 640;

const config = {
    type: Phaser.WEBGL,
    parent: 'phaser-container',
    width: GAME_W,
    height: GAME_H,
    transparent: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [PreloadScene, MenuScene, JerseyPocScene, PlayScene],
};

window.GAME_W = GAME_W;
window.GAME_H = GAME_H;
window.game = new Phaser.Game(config);
