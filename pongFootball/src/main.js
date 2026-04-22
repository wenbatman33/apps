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
const surrenderBtn = document.getElementById("surrender-btn");
const netHud = document.getElementById("net-hud");

let layout = { vertical: false, scale: 1, offsetX: 0, offsetY: 0, viewW: 0, viewH: 0 };
let state = null;
let ai = null;
let mode = null;           // 'ai' | 'net-host' | 'net-client'
let aiSide = "right";
let difficulty = "normal";
let lastT = 0;
let paused = false;
let netState = { lastSend: 0, remoteInputY: null, remoteSnapshot: null };
let readyLocal = false;
let readyRemote = false;
let gameStarted = false;   // ready 畫面等雙方按完才 true
let savedName = localStorage.getItem("pong_name") || "";

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
  surrenderBtn.classList.remove("visible");
  netHud.classList.remove("visible");
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
  gameStarted = true;

  if (mode === "net-host" || mode === "net-client") {
    surrenderBtn.classList.add("visible");
    updateNetHud();
    netHud.classList.add("visible");
  }
}

function updateNetHud() {
  const me = Net.getMyName() || "我";
  const opp = Net.getOpponentName() || "對手";
  // net-host: 我在左、對手在右；net-client: 我在右
  if (mode === "net-host") netHud.textContent = `${me} (左) vs (右) ${opp}`;
  else if (mode === "net-client") netHud.textContent = `${opp} (左) vs (右) ${me}`;
}

// ---------- Main loop ----------
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  if (state && !paused) {
    if (mode === "ai") {
      state.leftY = getPaddleTargetY("left", state.leftY, dt);
      state.rightY = updateAI(ai, state, "right", dt);
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
      const target = getPaddleTargetY("right", state.rightY, dt);
      state.rightY = target;
      // 節流送 input，避免超過 Supabase broadcast rate limit
      netState.lastSend += dt;
      if (netState.lastSend > 0.05) {
        netState.lastSend = 0;
        Net.sendInput({ y: target });
      }
      if (netState.remoteSnapshot) {
        const s = netState.remoteSnapshot;
        state.ball = s.ball;
        state.leftY = s.leftY;
        state.leftScore = s.leftScore;
        state.rightScore = s.rightScore;
        state.status = s.status;
      }
    }

    if (mode === "ai") {
      updatePhysics(state, dt);
    }

    if (state.status === "gameover" && !overlayEl.dataset.shown) {
      overlayEl.dataset.shown = "1";
      showGameOver(state.winner);
    }
  }

  if (state) renderGame(ctx, state, layout.viewW, layout.viewH, layout.vertical);
  requestAnimationFrame(tick);
}

function showGameOver(winner, overrideText = null) {
  const youAre = mode === "net-client" ? "right" : "left";
  const youWin = winner === youAre || (mode === "ai" && winner === "left");
  const txt = overrideText || (youWin ? "你贏了！" : "你輸了");
  const showScore = !overrideText;
  overlayEl.innerHTML = `
    <div class="gameover">
      <h1>${txt}</h1>
      ${showScore ? `<div class="score">${state.leftScore} : ${state.rightScore}</div>` : ""}
      ${mode === "ai" ? `<button id="btn-again">再來一局</button>` : ""}
      <button id="btn-home">回主選單</button>
    </div>`;
  const againBtn = overlayEl.querySelector("#btn-again");
  if (againBtn) againBtn.onclick = () => {
    overlayEl.dataset.shown = "";
    overlayEl.innerHTML = "";
    startGame(mode, { difficulty });
  };
  overlayEl.querySelector("#btn-home").onclick = () => {
    overlayEl.dataset.shown = "";
    Net.leaveRoom();
    state = null;
    gameStarted = false;
    showMenu();
  };
}

function toast(msg, ms = 2000) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// ---------- 網路配對 / 準備流程 ----------

function openNetPane() {
  document.getElementById("net-pane").style.display = "flex";
  document.getElementById("name-input").value = savedName;
}

async function startMatch() {
  const name = document.getElementById("name-input").value.trim() || "玩家";
  savedName = name;
  localStorage.setItem("pong_name", name);

  document.getElementById("net-pane").style.display = "none";
  document.getElementById("matching-pane").style.display = "flex";
  document.getElementById("matching-info").textContent = "尋找對手中…";

  await Net.joinLobby(name, {
    onMatched: ({ role, opponentName }) => {
      document.getElementById("matching-pane").style.display = "none";
      openReadyPane();
    },
    onReady: ({ ready, from }) => {
      // from 是對方的 role → 對方準備狀態
      readyRemote = !!ready;
      refreshReadyUI();
      maybeStartGame();
    },
    onInput: (p) => { netState.remoteInputY = p.y; },
    onState: (p) => { netState.remoteSnapshot = p; },
    onSurrender: ({ from }) => {
      handleOpponentSurrender();
    },
    onOpponentLeft: () => {
      handleOpponentLeft();
    },
  });
}

function openReadyPane() {
  readyLocal = false; readyRemote = false;
  document.getElementById("ready-pane").style.display = "flex";
  document.getElementById("me-name").textContent = Net.getMyName();
  document.getElementById("opp-name").textContent = Net.getOpponentName();
  refreshReadyUI();
  document.getElementById("btn-ready").disabled = false;
  document.getElementById("btn-ready").textContent = "我準備好了";
}

function refreshReadyUI() {
  const meChip = document.getElementById("me-chip");
  const oppChip = document.getElementById("opp-chip");
  meChip.classList.toggle("ready", readyLocal);
  oppChip.classList.toggle("ready", readyRemote);
  document.getElementById("me-status").textContent = readyLocal ? "已準備" : "未準備";
  document.getElementById("opp-status").textContent = readyRemote ? "已準備" : "未準備";
}

function maybeStartGame() {
  if (readyLocal && readyRemote) {
    document.getElementById("ready-pane").style.display = "none";
    const role = Net.getRole();
    startGame(role === "host" ? "net-host" : "net-client");
  }
}

function handleOpponentSurrender() {
  if (!gameStarted) return;
  toast(`${Net.getOpponentName()} 投降了！`, 1500);
  setTimeout(() => {
    state.status = "gameover";
    overlayEl.dataset.shown = "1";
    showGameOver(null, "你贏了！（對方投降）");
  }, 800);
}

function handleOpponentLeft() {
  // ready 階段或遊戲中
  const readyPane = document.getElementById("ready-pane");
  if (readyPane.style.display === "flex") {
    readyPane.style.display = "none";
    Net.leaveRoom();
    toast("對方已離開");
    showMenu();
    return;
  }
  if (gameStarted) {
    toast(`${Net.getOpponentName()} 斷線了`, 1500);
    state.status = "gameover";
    overlayEl.dataset.shown = "1";
    showGameOver(null, "對方已離線");
  }
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

  document.getElementById("play-net").onclick = openNetPane;
  document.getElementById("btn-match").onclick = startMatch;
  document.getElementById("btn-cancel-match").onclick = () => {
    Net.cancelMatchmaking();
    document.getElementById("matching-pane").style.display = "none";
  };

  document.getElementById("btn-ready").onclick = () => {
    readyLocal = !readyLocal;
    Net.sendReady(readyLocal);
    refreshReadyUI();
    document.getElementById("btn-ready").textContent = readyLocal ? "取消準備" : "我準備好了";
    maybeStartGame();
  };
  document.getElementById("btn-leave-ready").onclick = () => {
    document.getElementById("ready-pane").style.display = "none";
    Net.leaveRoom();
    showMenu();
  };

  document.querySelectorAll(".pane-close").forEach(b => {
    b.onclick = (e) => e.target.closest(".pane").style.display = "none";
  });
  document.getElementById("sound-toggle").onchange = (e) => setAudioEnabled(e.target.checked);

  backBtn.onclick = () => {
    if (confirm("確定回主選單？")) {
      overlayEl.dataset.shown = "";
      if (mode === "net-host" || mode === "net-client") {
        Net.sendSurrender();
      }
      Net.leaveRoom();
      state = null;
      gameStarted = false;
      showMenu();
    }
  };

  surrenderBtn.onclick = () => {
    if (!confirm("確定投降？")) return;
    Net.sendSurrender();
    state.status = "gameover";
    overlayEl.dataset.shown = "1";
    showGameOver(null, "你投降了");
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && state) backBtn.click();
  });
  window.addEventListener("beforeunload", () => {
    Net.leaveRoom();
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
