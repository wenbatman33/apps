import { Game3D } from "./game3d.js";
import * as Net from "./net.js";
import * as Sfx from "./sound.js";
import { RACE_OPTIONS } from "./constants.js";

document.addEventListener("pointerdown", () => Sfx.unlock(), { once: true });

const $menu = document.getElementById("menu");
const $hud  = document.getElementById("hud");
const $overlay = document.getElementById("overlay");
const $canvas = document.getElementById("gl");

const NAME_KEY = "nineball_name";
const state = {
  mode: null,
  raceTo: 9,
  difficulty: "normal",
  name: localStorage.getItem(NAME_KEY) || "玩家",
};
let game = null;

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === "className") e.className = attrs[k];
    else if (k === "onClick") e.addEventListener("click", attrs[k]);
    else if (k === "style") Object.assign(e.style, attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  for (const k of kids.flat()) {
    if (k == null) continue;
    e.appendChild(typeof k === "string" ? document.createTextNode(k) : k);
  }
  return e;
}

// ---------- 選單頁面 ----------
function showMenu() {
  Net.leave();
  stopGame();
  $menu.classList.remove("hidden");
  $hud.classList.add("hidden");
  $overlay.classList.add("hidden");
  $menu.innerHTML = "";
  $menu.append(
    el("h1", {}, "9 號球"),
    el("div", { className: "sub" }, "9-Ball Pool · 3D 俯視"),
    el("div", { className: "row" },
      el("button", { onClick: () => { state.mode = "ai"; state.raceTo = 7; pickDifficulty(); } }, "單人挑戰 AI"),
      el("button", { onClick: () => { state.mode = "net"; state.raceTo = 5; pickName(); } }, "網路對戰"),
      el("button", { onClick: () => { state.mode = "practice"; state.raceTo = 0; startGame(); } }, "練習模式"),
    ),
    el("div", { className: "hint" }, "拖曳白球反方向瞄準，放開擊球"),
  );
}

function pickRace(mode) {
  state.mode = mode;
  $menu.innerHTML = "";
  $menu.append(
    el("h1", {}, "搶幾局？"),
    el("div", { className: "sub" }, mode === "ai" ? "單人挑戰 AI" : "網路對戰"),
    el("div", { className: "row horizontal" },
      ...RACE_OPTIONS.map(n =>
        el("button", { onClick: () => { state.raceTo = n; pickDifficulty(); } },
          `搶 ${n} 局`)
      )
    ),
    el("div", { style: { marginTop: "30px" } },
      el("button", { className: "ghost", onClick: showMenu }, "返回"),
    ),
  );
}

function pickDifficulty() {
  $menu.innerHTML = "";
  const levels = [["簡單", "easy"], ["普通", "normal"], ["困難", "hard"]];
  $menu.append(
    el("h1", {}, "選擇難度"),
    el("div", { className: "sub" }, `搶 ${state.raceTo} 局`),
    el("div", { className: "row" },
      ...levels.map(([lbl, val]) =>
        el("button", { onClick: () => { state.difficulty = val; startGame(); } }, lbl)
      ),
    ),
    el("div", { style: { marginTop: "30px" } },
      el("button", { className: "ghost", onClick: showMenu }, "返回"),
    ),
  );
}

function pickName() {
  $menu.innerHTML = "";
  const input = el("input", { type: "text", maxlength: "12", placeholder: "暱稱" });
  input.value = state.name || "";
  $menu.append(
    el("h1", {}, "輸入暱稱"),
    el("div", { className: "sub" }, "搶 5 局 · 系統會自動配對"),
    el("div", { className: "row" },
      input,
      el("button", {
        onClick: () => {
          state.name = (input.value || "玩家").slice(0, 12);
          localStorage.setItem(NAME_KEY, state.name);
          startMatching();
        }
      }, "開始配對"),
    ),
    el("div", { style: { marginTop: "30px" } },
      el("button", { className: "ghost", onClick: showMenu }, "返回"),
    ),
  );
  setTimeout(() => input.focus(), 100);
}

function startMatching() {
  $menu.innerHTML = "";
  const status = el("div", { className: "sub" }, "配對中…");
  $menu.append(
    el("h1", {}, "配對中"),
    status,
    el("div", { className: "row" },
      el("button", { className: "ghost", onClick: () => { Net.leave(); showMenu(); } }, "取消"),
    ),
  );
  Net.joinLobby(state.name, {
    onMatched: ({ role, opponentName, myName, roomCode }) => {
      status.textContent = "配對成功！";
      const seed = hash32(roomCode) || 1;
      setTimeout(() => {
        startGame({ role, opponentName, myName, roomCode, seed });
      }, 400);
    },
  }).catch(err => {
    status.textContent = "配對失敗：" + (err.message || err);
  });
}

// ---------- 啟動遊戲 ----------
function startGame(netInfo = null) {
  $menu.classList.add("hidden");
  $hud.classList.remove("hidden");
  $overlay.classList.add("hidden");

  game = new Game3D($canvas, {
    mode: state.mode, raceTo: state.raceTo,
    difficulty: state.difficulty, name: state.name,
    net: netInfo,
    onHudChange: renderHud,
    onMatchEnd: showMatchEnd,
    onToast: showToast,
    onOpponentLeft: () => showOverlay("對手離線", "連線已中斷", "返回選單", showMenu),
  });
  if (netInfo) game.setNetHandlers(Net);
  window.__game = game; // 除錯用
}

function stopGame() {
  if (game) { game.destroy(); game = null; }
}

// ---------- HUD ----------
function renderHud(info) {
  $hud.innerHTML = "";
  const p1Turn = info.currentPlayer === 1;
  const isPractice = state.mode === "practice";
  $hud.append(
    el("div", {},
      el("span", { className: p1Turn ? "turn" : "" }, info.p1),
      isPractice ? null : el("span", { className: "score" }, ` ${info.score.p1} - ${info.score.p2} `),
      isPractice ? null : el("span", { className: !p1Turn ? "turn" : "" }, info.p2),
    ),
    el("div", { className: "target" },
      info.target ? el("img", {
        src: `assets/${info.target}ball.png`,
        style: {
          width: "28px", height: "28px", borderRadius: "50%",
          boxShadow: "0 1px 3px rgba(0,0,0,.5)", verticalAlign: "middle",
        },
      }) : null,
      info.ballInHand ? el("span", { className: "tag", style: { color: "#f7c300" } }, "自由球") : null,
    ),
    el("div", {},
      el("button", { className: "back", onClick: () => game?.openSpinPicker() }, "擊球點"),
      el("button", { className: "back", onClick: () => { Net.leave(); showMenu(); } }, "返回"),
    ),
  );
}

// ---------- 結果畫面 ----------
function showMatchEnd({ winner, score }) {
  const winnerName = winner === 1
    ? (state.mode === "net" && game?.net ? (game.net.role === "host" ? game.net.myName : (game.net.opponentName || "對手")) : state.name)
    : (state.mode === "ai" ? "AI" : (game?.net ? (game.net.role === "host" ? (game.net.opponentName || "對手") : game.net.myName) : "對手"));
  showOverlay(`${winnerName} 勝利！`, `${score.p1} : ${score.p2}`, "返回選單", showMenu);
}

let toastTimer = null;
function showToast(msg) {
  let $t = document.getElementById("toast");
  if (!$t) {
    $t = document.createElement("div");
    $t.id = "toast";
    document.body.appendChild($t);
  }
  $t.textContent = msg;
  $t.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $t.classList.remove("show"), 2400);
}

function showOverlay(title, big, btnText, onBtn) {
  $overlay.classList.remove("hidden");
  $overlay.innerHTML = "";
  $overlay.append(
    el("h2", {}, title),
    el("div", { className: "big" }, big),
    el("button", { onClick: onBtn }, btnText),
  );
}

showMenu();
