// 排行榜場景
import { CANVAS_W, CANVAS_H, TOP_N } from "../constants.js";
import { getScores } from "../storage.js";

export function registerLeaderboardScene(k) {
  k.scene("leaderboard", (params = {}) => {
    const highlight = params.highlight || null;  // { mode, rank } 高亮剛創紀錄

    k.add([
      k.rect(CANVAS_W, CANVAS_H),
      k.pos(0, 0),
      k.color(15, 20, 40),
    ]);

    k.add([
      k.text("排行榜", { size: 56 }),
      k.pos(CANVAS_W / 2, 50),
      k.anchor("center"),
      k.color(250, 220, 110),
      k.outline(3, k.rgb(120, 80, 20)),
    ]);

    // 兩欄：左 = Timed，右 = Simple
    drawBoard(k, "timed", "計時模式", 60, 110, highlight);
    drawBoard(k, "simple", "自由模式", 420, 110, highlight);

    // 回選單
    const back = k.add([
      k.rect(200, 44, { radius: 8 }),
      k.pos(CANVAS_W / 2, CANVAS_H - 50),
      k.anchor("center"),
      k.color(80, 120, 180),
      k.area(),
      k.outline(2, k.rgb(200, 220, 255)),
    ]);
    k.add([
      k.text("回主選單 (ESC)", { size: 20 }),
      k.pos(CANVAS_W / 2, CANVAS_H - 50),
      k.anchor("center"),
      k.z(1),
    ]);
    back.onClick(() => k.go("menu"));
    k.onKeyPress("escape", () => k.go("menu"));
  });
}

function drawBoard(k, mode, title, x, y, highlight) {
  // 欄位背景
  k.add([
    k.rect(340, 440, { radius: 12 }),
    k.pos(x, y),
    k.color(25, 35, 70),
    k.outline(2, k.rgb(80, 120, 200)),
  ]);

  // 標題
  k.add([
    k.text(title, { size: 28 }),
    k.pos(x + 170, y + 30),
    k.anchor("center"),
    k.color(180, 220, 255),
  ]);

  const scores = getScores(mode);

  // 表頭
  const headerY = y + 75;
  k.add([k.text("名次", { size: 16 }), k.pos(x + 30, headerY), k.color(150, 170, 200)]);
  k.add([k.text("玩家", { size: 16 }), k.pos(x + 90, headerY), k.color(150, 170, 200)]);
  k.add([k.text("分數", { size: 16 }), k.pos(x + 220, headerY), k.color(150, 170, 200)]);

  // 空榜
  if (scores.length === 0) {
    k.add([
      k.text("尚無紀錄", { size: 20 }),
      k.pos(x + 170, y + 220),
      k.anchor("center"),
      k.color(120, 140, 170),
    ]);
    return;
  }

  // 列表
  for (let i = 0; i < TOP_N; i++) {
    const rowY = y + 110 + i * 30;
    const s = scores[i];
    const isHi = highlight && highlight.mode === mode && highlight.rank === i + 1;
    const color = isHi ? k.rgb(255, 240, 80) : (i < 3 ? k.rgb(250, 220, 130) : k.rgb(220, 230, 240));

    if (isHi) {
      k.add([
        k.rect(320, 28, { radius: 4 }),
        k.pos(x + 10, rowY - 4),
        k.color(180, 130, 30),
        k.opacity(0.4),
      ]);
    }

    k.add([k.text(`${i + 1}.`, { size: 18 }), k.pos(x + 30, rowY), k.color(color)]);
    if (s) {
      k.add([k.text(s.name, { size: 18 }), k.pos(x + 90, rowY), k.color(color)]);
      k.add([k.text(String(s.score), { size: 18 }), k.pos(x + 220, rowY), k.color(color)]);
    } else {
      k.add([k.text("—", { size: 18 }), k.pos(x + 90, rowY), k.color(80, 90, 110)]);
      k.add([k.text("—", { size: 18 }), k.pos(x + 220, rowY), k.color(80, 90, 110)]);
    }
  }
}
