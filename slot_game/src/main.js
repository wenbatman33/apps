"use strict";

var _phaser = _interopRequireDefault(require("phaser"));
var _GameScene = require("./scenes/GameScene");
require("./style.css");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var config = {
  type: _phaser.default.AUTO,
  parent: 'app',
  width: 720,
  height: 1280,
  // Portrait mobile layout similar to PG Soft
  backgroundColor: '#1E0A3C',
  // Deep rich purple
  scene: [_GameScene.GameScene],
  scale: {
    mode: _phaser.default.Scale.FIT,
    autoCenter: _phaser.default.Scale.CENTER_BOTH
  }
};
new _phaser.default.Game(config);