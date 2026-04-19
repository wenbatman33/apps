// 入口：初始化 Kaboom 並註冊所有場景
import kaboom from "https://unpkg.com/kaboom@3000.1.17/dist/kaboom.mjs";
import { CANVAS_W, CANVAS_H } from "./constants.js";
import { registerMenuScene } from "./scenes/menu.js";
import { registerGameScene } from "./scenes/game.js";
import { registerGameOverScene } from "./scenes/gameover.js";
import { registerLeaderboardScene } from "./scenes/leaderboard.js";

const k = kaboom({
  width: CANVAS_W,
  height: CANVAS_H,
  background: [15, 20, 40],
  root: document.getElementById("game"),
  global: false,
  letterbox: true,
  stretch: false,
  crisp: true,
});

registerMenuScene(k);
registerGameScene(k);
registerGameOverScene(k);
registerLeaderboardScene(k);

k.go("menu");
