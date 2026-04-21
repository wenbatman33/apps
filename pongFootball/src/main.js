// 入口：state machine + 主迴圈
import { loadAssets, images } from "./assets.js";
import {
  LOGIC_W, LOGIC_H, COURT_TOP, COURT_BOTTOM, PADDLE_H, WIN_SCORE,
} from "./constants.js";
import {
  createGameState, startRound, updatePhysics, renderGame, clampPaddle,
} from "./game.js";
import { setupInput, getPaddleTargetY } from "./input.js";
import { createAI, updateAI } from "./ai.js";
import { playSfx, setAudioEnabled } from "./audio.js";
import * as Net from "./net.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const menuEl = document.getElementById("menu");
const overlayEl = document.getElementById("overlay");
const backBtn = document.getElementById("back-btn");

let layout = { vertical: false, scale: 1, offsetX: 0, offsetY: 0, viewW: 0, viewH: 0 };
let state = null;
let ai = null;
let mode = null;           // 'ai' | 'local' | 'net-host' | 'net-client'
let aiSide = "right";      // AI 控制的邊
let difficulty = "normal";
let lastT = 0;
let paused = false;
let netState = { lastSend: 0, remoteInputY: null, remoteSnapshot: null };

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  layout.viewW = w; layout.viewH = h;
  layout.vertical = h > w;
  if (layout.vertical) {
    layout.scale = Math.min(w / LOGIC_H, h / LOGIC_W);
    layout.offsetX = (w - LOGIC_H * layout.scale) / 2;
    layout.offsetY = (h - LOGIC_W * layout.scale) / 2;
  } else {
    layout.scale = Math.min(w / LOGIC_W, h / LOGIC_H);
    layout.offsetX = (w - LOGIC_W * layout.scale) / 2;
    layout.offsetY = (h - LOGIC_H * layout.scale) / 2;
  }
}
window.addEventListener("resize", resize);

// ---------- Menu ----------
function showMenu() {
  menuEl.style.display = "flex";
  overlayEl.innerHTML = "";
  backBtn.classList.remove("visible");
}
function hideMenu() {
  menuEl.style.display = "none";
  backBtn.classList.add("visible");
}

function startGame(chosenMode, opts = {}) {
  mode = chosenMode;
  difficulty = opts.difficulty || "normal";
  state = createGameState();
  if (mode === "ai") {
    ai = createAI(difficulty);
    aiSide = "right";
  } else {
    ai = null;
  }
  startRound(state);
  hideMenu();
  paused = false;
  lastT = performance.now();
}

// ---------- Main loop ----------
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  if (state && !paused) {
    if (mode === "ai") {
      state.leftY = getPaddleTargetY("left", state.leftY, dt);
      state.rightY = updateAI(ai, state, "right", dt);
    } else if (mode === "local") {
      state.leftY = getPaddleTargetY("left", state.leftY, dt);
      state.rightY = getPaddleTargetY("right", state.rightY, dt);
    } else if (mode === "net-host") {
      state.leftY = getPaddleTargetY("left", state.leftY, dt);
      if (netState.remoteInputY != null) state.rightY = clampPaddle(netState.remoteInputY);
      updatePhysics(state, dt);
      netState.lastSend += dt;
      if (netState.lastSend > 0.05) {
        netState.lastSend = 0;
        Net.sendState({
          ball: state.ball, leftY: state.leftY, rightY: state.rightY,
          leftScore: state.leftScore, rightScore: state.rightScore,
          status: state.status,
        });
      }
    } else if (mode === "net-client") {
      // client 的擋板（畫面右邊）= 本地輸入；插值過去
      const target = getPaddleTargetY("right", state.rightY, dt);
      state.rightY = target;
      Net.sendInput({ y: target });
      // 套用 host 狀態
      if (netState.remoteSnapshot) {
        const s = netState.remoteSnapshot;
        state.ball = s.ball;
        state.leftY = s.leftY;
        state.leftScore = s.leftScore;
        state.rightScore = s.rightScore;
        state.status = s.status;
      }
    }

    if (mode !== "net-host" && mode !== "net-client") {
      updatePhysics(state, dt);
    }

    // 勝負顯示
    if (state.status === "gameover" && !overlayEl.dataset.shown) {
      overlayEl.dataset.shown = "1";
      showGameOver(state.winner);
    }
  }

  if (state) renderGame(ctx, state, layout.viewW, layout.viewH, layout.vertical);
  requestAnimationFrame(tick);
}

function showGameOver(winner) {
  const youAre = mode === "net-client" ? "right" : "left";
  const youWin = winner === youAre || (mode === "ai" && winner === "left") || (mode === "local" && true);
  const txt = mode === "local" ? (winner === "left" ? "左方勝利！" : "右方勝利！")
            : (youWin ? "你贏了！" : "你輸了");
  overlayEl.innerHTML = `
    <div class="gameover">
      <h1>${txt}</h1>
      <div class="score">${state.leftScore} : ${state.rightScore}</div>
      <button id="btn-again">再來一局</button>
      <button id="btn-home">回主選單</button>
    </div>`;
  overlayEl.querySelector("#btn-again").onclick = () => {
    overlayEl.dataset.shown = "";
    overlayEl.innerHTML = "";
    startGame(mode, { difficulty });
  };
  overlayEl.querySelector("#btn-home").onclick = () => {
    overlayEl.dataset.shown = "";
    Net.leaveRoom();
    state = null;
    showMenu();
  };
}

// ---------- Menu wiring ----------
function wireMenu() {
  document.getElementById("play-ai").onclick = () => {
    document.getElementById("difficulty-pane").style.display = "flex";
  };
  document.querySelectorAll("[data-diff]").forEach(btn => {
    btn.onclick = () => {
      startGame("ai", { difficulty: btn.dataset.diff });
      document.getElementById("difficulty-pane").style.display = "none";
    };
  });
  document.getElementById("play-local").onclick = () => startGame("local");
  document.getElementById("play-net").onclick = () => {
    document.getElementById("net-pane").style.display = "flex";
  };
  document.getElementById("btn-host").onclick = async () => {
    const code = Net.genRoomCode();
    document.getElementById("net-info").textContent = `房間碼：${code}（分享給對手）`;
    await Net.hostRoom(code, {
      onInput: (p) => { netState.remoteInputY = p.y; },
      onJoin: () => {
        document.getElementById("net-info").textContent = `對手已加入！`;
        setTimeout(() => {
          document.getElementById("net-pane").style.display = "none";
          startGame("net-host");
        }, 500);
      }
    });
  };
  document.getElementById("btn-join").onclick = async () => {
    const code = document.getElementById("code-input").value.trim().toUpperCase();
    if (!code) return;
    document.getElementById("net-info").textContent = `連線中…`;
    const res = await Net.joinRoom(code, {
      onState: (p) => { netState.remoteSnapshot = p; },
    });
    if (res.connected) {
      document.getElementById("net-info").textContent = `已連線！`;
      setTimeout(() => {
        document.getElementById("net-pane").style.display = "none";
        startGame("net-client");
      }, 300);
    } else {
      document.getElementById("net-info").textContent = `找不到房間 ${code}`;
    }
  };
  document.querySelectorAll(".pane-close").forEach(b => {
    b.onclick = (e) => e.target.closest(".pane").style.display = "none";
  });
  document.getElementById("sound-toggle").onchange = (e) => setAudioEnabled(e.target.checked);
  backBtn.onclick = () => {
    if (confirm("確定回主選單？")) {
      overlayEl.dataset.shown = "";
      Net.leaveRoom();
      state = null;
      showMenu();
    }
  };
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && state) backBtn.click();
  });
}

// ---------- Start ----------
(async function boot() {
  resize();
  setupInput(canvas, () => layout);
  wireMenu();
  await loadAssets();
  showMenu();
  requestAnimationFrame(tick);
})();
