// ============ 入口：初始化 + 輸入 + 主迴圈 ============
import * as M from './machine.js';
import { initGame } from './game.js';
import { initUI } from './ui.js';
import { initDev, toggle as toggleDev, isDevDragging } from './dev.js';
import { Sound } from './sound.js';

const G = {};           // 共享情境物件：G.game / G.ui
G.machine = M;
window.RACCOIN = G;     // 除錯用掛勾

initDev(G);             // 先載入 LAYOUT 覆寫（localStorage）
M.initMachine(G);
initGame(G);
initUI(G);

// ---------- 輸入 ----------
const canvas = document.querySelector('#app canvas');

window.addEventListener('pointermove', (e) => {
  if (isDevDragging()) return;
  if (e.target === canvas) M.aimFromScreen(e.clientX, e.clientY);
});

canvas.addEventListener('pointerdown', (e) => {
  if (isDevDragging()) return;
  Sound.unlock();
  M.aimFromScreen(e.clientX, e.clientY);
  G.game.insertCoin();
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (G.game.run.selectedClip >= 0) G.game.selectClip(-1);
});

window.addEventListener('keydown', (e) => {
  const r = G.game.run;
  const key = e.key.toLowerCase();
  if (key >= '1' && key <= '9') G.game.selectClip(Number(key) - 1);
  else if (key === 'escape') {
    if (r.selectedClip >= 0) G.game.selectClip(-1);
    else if (r.state === 'play') G.game.pause();
    else if (r.state === 'paused') G.game.resume();
  }
  else if (key === 'q') G.game.usePrize(0);
  else if (key === 'w') G.game.usePrize(1);
  else if (key === 'e') G.game.usePrize(2);
  else if (key === 'r') G.game.usePrize(3);
  else if (key === 'd') toggleDev();
  else if (key === ' ') { e.preventDefault(); r.timeScale = 2; }
});
window.addEventListener('keyup', (e) => {
  if (e.key === ' ') G.game.run.timeScale = document.getElementById('speed-btn').classList.contains('on') ? 2 : 1;
});

// 頁面隱藏時自動暫停
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.game.run.state === 'play') G.game.pause();
});

// ---------- 主迴圈 ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const r = G.game.run;
  const running = r.state === 'play' || r.state === 'wheel' || r.state === 'start';
  if (running) {
    G.game.tick(dt);
    M.stepMachine(dt, r.timeScale);
  } else {
    // 暫停/商店時仍渲染畫面但不步進物理
    M.stepMachine(0, 0);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
