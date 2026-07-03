// 入口：組裝場景 / 遊戲 / 操作 / UI / 音效 / DEV 工具與主迴圈
import { TEAMS, getTeam } from './teams.js';
import { Game } from './game.js';
import { Scene3D } from './scene3d.js';
import { InputManager } from './input.js';
import { UI } from './ui.js';
import { Sfx } from './sfx.js';
import { initDev, loadDevOverrides } from './dev.js';

loadDevOverrides();

const canvas = document.getElementById('game-canvas');
const scene = new Scene3D(canvas);
const game = new Game();
const ui = new UI();
const sfx = new Sfx();
const input = new InputManager(canvas, scene, game);

// 預設展示隊伍（選單背景）
scene.setTeams(getTeam('BRA'), getTeam('ARG'));

// --- 直版 / 橫版切換（依畫面長寬比） ---
function updateOrientation() {
  const w = window.innerWidth, h = window.innerHeight;
  const mode = w > h ? 'landscape' : 'portrait';
  document.body.classList.toggle('landscape', mode === 'landscape');
  scene.setOrientation(mode);
  scene.resize(w, h);
}
window.addEventListener('resize', updateOrientation);
window.addEventListener('orientationchange', () => setTimeout(updateOrientation, 120));
updateOrientation();

// --- 音效解鎖（行動裝置需要手勢） ---
window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

// --- 遊戲流程 ---
ui.onStart = ({ pTeam, aTeam, difficulty }) => {
  scene.setTeams(pTeam, aTeam);
  ui.setMatchTeams(pTeam, aTeam);
  game.setDifficulty(difficulty);
  game.startMatch();
  input.enabled = true;
  sfx.whistle();
};
ui.onRematch = () => {
  game.startMatch();
  input.enabled = true;
  sfx.whistle();
};
ui.onMenu = () => {
  game.phase = 'idle';
  input.enabled = false;
};

game.on('goal', scorer => {
  ui.goalFlash(scorer, game);
  sfx.goal();
});
game.on('end', winner => {
  input.enabled = false;
  ui.showResult(winner, game);
  winner === 'P' ? sfx.win() : sfx.lose();
});
game.on('kick', () => sfx.swing());
game.on('strike', r => sfx.strike(r.kickPow));
game.on('wall', sp => sfx.wall(sp));
game.on('block', sp => sfx.block(sp));

// --- DEV 工具 ---
initDev({
  scene, game, ui,
  onTestGoal: () => {
    if (game.phase === 'idle') return alert('請先開一場比賽再測試');
    game.ball.x = 0; game.ball.z = -13; game.ball.vx = 0; game.ball.vz = -30;
  },
  onReserve: () => { if (game.phase !== 'idle') { game.serve(null); game.phase = 'play'; } },
});

// --- 一鍵揮桿按鈕：點了對應桿直接踢 ---
import { CONFIG } from './config.js';
{
  const kindToIdx = {};
  game.rods.forEach((r, i) => { if (r.def.side === 'P') kindToIdx[r.def.kind] = i; });
  document.querySelectorAll('#kick-bar button[data-kind]').forEach(btn => {
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!input.enabled) return;
      if (game.triggerKick(kindToIdx[btn.dataset.kind], CONFIG.control.tapKickPow)) {
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 160);
      }
    });
  });
  // PC 鍵盤 1~4 = 出腳（對應下方按鈕）
  const keyToKind = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'ATT' };
  window.addEventListener('keydown', e => {
    const kind = keyToKind[e.key];
    if (!kind || !input.enabled) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (game.triggerKick(kindToIdx[kind], CONFIG.control.tapKickPow)) {
      const btn = document.querySelector(`#kick-bar button[data-kind="${kind}"]`);
      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 160);
    }
  });
  // 自動追球開關
  const trackBtn = document.getElementById('btn-track');
  trackBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    CONFIG.control.autoTrack = !CONFIG.control.autoTrack;
    trackBtn.classList.toggle('on', CONFIG.control.autoTrack);
  });
}

// debug 掛勾（DEV / 自動測試用）
window.__foosball = { game, scene, ui, input };

// --- 主迴圈 ---
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop); // 先排下一幀，單幀例外不會殺掉迴圈
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  scene.sync(game);
  scene.render();
}
requestAnimationFrame(loop);
