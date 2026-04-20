// 入口：初始化 Kaboom 並註冊所有場景
import kaboom from "https://unpkg.com/kaboom@3000.1.17/dist/kaboom.mjs";
import { CANVAS_W, CANVAS_H } from "./constants.js";
import { preloadGemSprites } from "./gems.js";
import { registerMenuScene } from "./scenes/menu.js";
import { registerGameScene } from "./scenes/game.js";
import { registerGameOverScene } from "./scenes/gameover.js";
import { registerLeaderboardScene } from "./scenes/leaderboard.js";

// 開發模式：URL 加 ?dev=1 即開啟（game scene 會多出除錯快捷鍵）
try {
  const params = new URLSearchParams(location.search);
  window.__DEV__ = params.has("dev") || localStorage.getItem("bejeweled_dev") === "1";
} catch { window.__DEV__ = false; }

const k = kaboom({
  width: CANVAS_W,
  height: CANVAS_H,
  background: [15, 20, 40],
  root: document.getElementById("game"),
  global: false,
  letterbox: true,
  stretch: true,   // 依容器縮放，手機才不會被 820x620 硬撐
  crisp: false,    // 關閉 DPR backing，手機 GPU 負擔大幅降低
});

registerMenuScene(k);
registerGameScene(k);
registerGameOverScene(k);
registerLeaderboardScene(k);

// 註冊寶石 sprite，等所有 loader 完成才進主選單
preloadGemSprites(k);
k.onLoad(() => k.go("menu"));
