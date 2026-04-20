// 遊戲結束場景：顯示分數 + 若能上榜，輸入名字
import { CANVAS_W, CANVAS_H } from "../constants.js";
import { addScore, qualifies } from "../storage.js";
import { playHighScore, playGameOver, stopMusic, playButton } from "../audio.js";

export function registerGameOverScene(k) {
  k.scene("gameover", (params) => {
    const { mode, score, reason } = params;  // reason: "time" | "nomove"

    // 背景
    k.add([
      k.rect(CANVAS_W, CANVAS_H),
      k.pos(0, 0),
      k.color(15, 20, 40),
    ]);

    // 標題先畫佔位（qualifies 為 async，拿到結果再更新）
    const titleText = k.add([
      k.text("遊戲結束", { size: 60 }),
      k.pos(CANVAS_W / 2, 80),
      k.anchor("center"),
      k.color(220, 220, 240),
      k.outline(3, k.rgb(80, 60, 20)),
    ]);

    k.add([
      k.text(`模式：${mode === "timed" ? "計時模式" : "自由模式"}`, { size: 22 }),
      k.pos(CANVAS_W / 2, 160),
      k.anchor("center"),
      k.color(180, 210, 255),
    ]);
    k.add([
      k.text(reason === "time" ? "時間到" : "沒有可行的移動了", { size: 18 }),
      k.pos(CANVAS_W / 2, 190),
      k.anchor("center"),
      k.color(150, 170, 200),
    ]);

    // 分數
    k.add([
      k.text("最終分數", { size: 24 }),
      k.pos(CANVAS_W / 2, 240),
      k.anchor("center"),
      k.color(200, 210, 240),
    ]);
    k.add([
      k.text(String(score), { size: 80 }),
      k.pos(CANVAS_W / 2, 310),
      k.anchor("center"),
      k.color(250, 230, 130),
      k.outline(3, k.rgb(120, 80, 20)),
    ]);

    // 停止背景音樂，改播語音
    stopMusic();
    playGameOver(reason);

    // 非同步查詢是否能上榜，拿到結果後更新畫面
    (async () => {
      let canRank = false;
      try {
        canRank = await qualifies(mode, score);
      } catch (e) {
        console.warn("[gameover] qualifies failed", e);
      }
      if (canRank) {
        titleText.text = "恭喜上榜！";
        titleText.color = k.rgb(255, 230, 100);
        setTimeout(() => playHighScore(), 800);
        askName(k, mode, score);
      } else {
        addButtons(k);
      }
    })();
  });
}

function askName(k, mode, score) {
  k.add([
    k.text("請輸入玩家名稱（Enter 確認）", { size: 20 }),
    k.pos(CANVAS_W / 2, 400),
    k.anchor("center"),
    k.color(200, 220, 255),
  ]);

  let name = "";
  const MAX = 8;
  const box = k.add([
    k.rect(320, 54, { radius: 8 }),
    k.pos(CANVAS_W / 2, 450),
    k.anchor("center"),
    k.color(25, 40, 80),
    k.outline(3, k.rgb(255, 230, 100)),
  ]);
  const nameText = k.add([
    k.text("_", { size: 30 }),
    k.pos(CANVAS_W / 2, 450),
    k.anchor("center"),
    k.color(255, 240, 200),
    k.z(1),
  ]);

  // 閃爍游標
  let blink = 0;
  nameText.onUpdate(() => {
    blink += k.dt();
    const cursor = (Math.floor(blink * 2) % 2) ? "_" : " ";
    nameText.text = (name || "") + cursor;
  });

  k.onCharInput((ch) => {
    if (name.length < MAX && /[\w\-]/.test(ch)) {
      name += ch;
    }
  });
  k.onKeyPress("backspace", () => {
    name = name.slice(0, -1);
  });
  k.onKeyPress("enter", async () => {
    const finalName = name.trim() || "Player";
    const rank = await addScore(mode, finalName, score);
    k.go("leaderboard", { highlight: { mode, rank } });
  });
}

function addButtons(k) {
  const btn1 = k.add([
    k.rect(220, 48, { radius: 8 }),
    k.pos(CANVAS_W / 2 - 120, CANVAS_H - 80),
    k.anchor("center"),
    k.color(80, 160, 100),
    k.outline(2, k.rgb(220, 255, 230)),
    k.area(),
  ]);
  k.add([
    k.text("再玩一次 (R)", { size: 20 }),
    k.pos(CANVAS_W / 2 - 120, CANVAS_H - 80),
    k.anchor("center"),
    k.z(1),
  ]);
  btn1.onClick(() => { playButton(); k.go("menu"); });

  const btn2 = k.add([
    k.rect(220, 48, { radius: 8 }),
    k.pos(CANVAS_W / 2 + 120, CANVAS_H - 80),
    k.anchor("center"),
    k.color(80, 120, 180),
    k.outline(2, k.rgb(200, 220, 255)),
    k.area(),
  ]);
  k.add([
    k.text("排行榜", { size: 20 }),
    k.pos(CANVAS_W / 2 + 120, CANVAS_H - 80),
    k.anchor("center"),
    k.z(1),
  ]);
  btn2.onClick(() => { playButton(); k.go("leaderboard"); });

  k.onKeyPress("r", () => k.go("menu"));
  k.onKeyPress("escape", () => k.go("menu"));
}
