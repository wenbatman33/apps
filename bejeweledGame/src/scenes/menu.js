// 主選單場景
import { CANVAS_W, CANVAS_H } from "../constants.js";
import { unlockAudio, playMusic, playButton, playHover, setMuted, isMuted } from "../audio.js";

export function registerMenuScene(k) {
  k.scene("menu", () => {
    // 背景漸層
    k.add([
      k.rect(CANVAS_W, CANVAS_H),
      k.pos(0, 0),
      k.color(15, 20, 40),
    ]);

    // 裝飾：頂部光暈
    for (let i = 0; i < 30; i++) {
      const r = k.rand(2, 6);
      k.add([
        k.circle(r),
        k.pos(k.rand(0, CANVAS_W), k.rand(0, CANVAS_H)),
        k.color(k.rand(150, 255), k.rand(200, 255), k.rand(200, 255)),
        k.opacity(k.rand(0.2, 0.6)),
      ]);
    }

    // 標題
    k.add([
      k.text("Bejeweled", { size: 80, font: "monospace" }),
      k.pos(CANVAS_W / 2, 130),
      k.anchor("center"),
      k.color(250, 220, 110),
      k.outline(4, k.rgb(120, 80, 20)),
    ]);
    k.add([
      k.text("寶石方塊", { size: 36 }),
      k.pos(CANVAS_W / 2, 200),
      k.anchor("center"),
      k.color(200, 230, 255),
    ]);

    // 首次進入選單嘗試播放背景音樂（需使用者事件才能啟動；在第一次點擊後才會真正響）
    playMusic("music_menu.mp3");

    // 按鈕
    makeButton(k, CANVAS_W / 2, 300, "計時模式  60 秒", [200, 80, 80], () => {
      unlockAudio();
      playButton();
      k.go("game", { mode: "timed" });
    });
    makeButton(k, CANVAS_W / 2, 370, "自由模式  無限", [80, 160, 200], () => {
      unlockAudio();
      playButton();
      k.go("game", { mode: "simple" });
    });
    makeButton(k, CANVAS_W / 2, 440, "排行榜", [120, 100, 200], () => {
      playButton();
      k.go("leaderboard");
    });

    // 靜音切換按鈕（右下角）
    const muteBtn = k.add([
      k.rect(40, 40, { radius: 8 }),
      k.pos(CANVAS_W - 30, CANVAS_H - 30),
      k.anchor("center"),
      k.color(60, 80, 140),
      k.outline(2, k.rgb(200, 220, 255)),
      k.area(),
    ]);
    const muteLabel = k.add([
      k.text(isMuted() ? "🔇" : "🔊", { size: 20 }),
      k.pos(CANVAS_W - 30, CANVAS_H - 30),
      k.anchor("center"),
      k.z(1),
    ]);
    muteBtn.onClick(() => {
      setMuted(!isMuted());
      muteLabel.text = isMuted() ? "🔇" : "🔊";
      if (!isMuted()) playMusic("music_menu.mp3");
    });

    // 說明
    k.add([
      k.text("點選一顆寶石後，再點選相鄰寶石即可交換", { size: 16 }),
      k.pos(CANVAS_W / 2, 540),
      k.anchor("center"),
      k.color(150, 170, 200),
    ]);
    k.add([
      k.text("配對 3 個或以上同色寶石消除得分；連鎖越多分數越高", { size: 16 }),
      k.pos(CANVAS_W / 2, 566),
      k.anchor("center"),
      k.color(150, 170, 200),
    ]);
    k.add([
      k.text("ESC 回主選單    H 提示    R 重開", { size: 14 }),
      k.pos(CANVAS_W / 2, 596),
      k.anchor("center"),
      k.color(110, 130, 160),
    ]);
  });
}

function makeButton(k, cx, cy, label, rgb, onClick) {
  const btn = k.add([
    k.rect(300, 54, { radius: 10 }),
    k.pos(cx, cy),
    k.anchor("center"),
    k.color(rgb[0], rgb[1], rgb[2]),
    k.area(),
    k.outline(3, k.rgb(255, 255, 255)),
    { hovering: false },
  ]);
  const txt = k.add([
    k.text(label, { size: 24 }),
    k.pos(cx, cy),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(1),
  ]);
  btn.onClick(onClick);
  btn.onHover(() => {
    btn.scale = k.vec2(1.05, 1.05);
    txt.scale = k.vec2(1.05, 1.05);
    btn.color = k.rgb(Math.min(255, rgb[0] + 40), Math.min(255, rgb[1] + 40), Math.min(255, rgb[2] + 40));
    playHover();
  });
  btn.onHoverEnd(() => {
    btn.scale = k.vec2(1, 1);
    txt.scale = k.vec2(1, 1);
    btn.color = k.rgb(rgb[0], rgb[1], rgb[2]);
  });
}
