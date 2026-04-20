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
  // 改用 HTML <input> overlay：手機虛擬鍵盤、中文輸入法、注音都支援
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed", "inset:0",
    "display:flex", "align-items:center", "justify-content:center",
    "z-index:9999", "background:rgba(0,0,0,0.55)",
    "font-family:-apple-system,BlinkMacSystemFont,'PingFang TC','Microsoft JhengHei',sans-serif",
  ].join(";");

  overlay.innerHTML = `
    <div style="background:#0f1428;border:2px solid rgb(255,230,100);border-radius:14px;
                padding:28px 32px;text-align:center;min-width:280px;max-width:90vw;">
      <div style="color:#c8dcff;font-size:17px;margin-bottom:14px;">輸入名稱（最多 8 字，可輸入中文）</div>
      <input id="_ni" type="text" maxlength="8" autocomplete="off" inputmode="text"
        style="font-size:24px;padding:8px 12px;border-radius:8px;
               border:2px solid #ffd060;background:#1a2550;color:#fff;
               width:200px;text-align:center;outline:none;
               font-family:inherit;">
      <div style="margin-top:18px;display:flex;gap:14px;justify-content:center;">
        <button id="_nc" style="font-size:16px;padding:9px 22px;border-radius:8px;
                                background:#444;color:#fff;border:none;cursor:pointer;">取消</button>
        <button id="_no" style="font-size:16px;padding:9px 22px;border-radius:8px;
                                background:#3a72b0;color:#fff;border:none;cursor:pointer;">確認上榜</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const inp = overlay.querySelector("#_ni");
  // iOS 需延遲才能自動 focus 並彈出鍵盤
  setTimeout(() => inp.focus(), 80);

  function submit() {
    const finalName = (inp.value.trim() || "Player").slice(0, 8);
    cleanup();
    addScore(mode, finalName, score).then(rank => {
      k.go("leaderboard", { highlight: { mode, rank } });
    });
  }

  function cancel() {
    cleanup();
    k.go("menu");
  }

  function cleanup() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  overlay.querySelector("#_no").addEventListener("click", submit);
  overlay.querySelector("#_nc").addEventListener("click", cancel);
  inp.addEventListener("keydown", e => {
    if (e.key === "Enter")  submit();
    if (e.key === "Escape") cancel();
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
