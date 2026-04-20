// 主要遊戲場景：棋盤、互動、連鎖、計分、計時
import {
  GRID_W, GRID_H, CELL, GEM_TYPES,
  GRID_OFFSET_X, GRID_OFFSET_Y, CANVAS_W, CANVAS_H,
  SCORE_PER_GEM, COMBO_BONUS,
  TIMED_SECONDS, TIMED_BONUS_SECONDS,
} from "../constants.js";
import {
  createGrid, findMatches, clearMatches,
  swap, swapCausesMatch, hasValidMove, findHint, isAdjacent,
} from "../grid.js";
import { gemComp } from "../gems.js";
import {
  unlockAudio, playSwap, playMatch, playInvalid, playDrop, playTick,
  playMusic, stopMusic, playGetReady, playGo, playThirtySeconds, playButton,
} from "../audio.js";

export function registerGameScene(k) {
  k.scene("game", (params) => {
    const mode = params?.mode || "timed";

    // --- 狀態 ---
    let grid = createGrid();
    let gems = Array.from({ length: GRID_H }, () => new Array(GRID_W).fill(null));
    let score = 0;
    let state = "animating";  // 一開始播 get ready 動畫
    let selected = null; // { x, y }
    let timeLeft = mode === "timed" ? TIMED_SECONDS : Infinity;
    let lastTickPlayed = -1;
    let thirtyPlayed = false;
    let hintGems = [];

    // 切換背景音樂
    playMusic(mode === "timed" ? "music_speed.mp3" : "music_classic.mp3");

    // --- 背景 ---
    k.add([k.rect(CANVAS_W, CANVAS_H), k.pos(0, 0), k.color(15, 20, 40)]);

    // HUD 背板
    k.add([
      k.rect(220, CANVAS_H - 40),
      k.pos(20, 20),
      k.color(25, 35, 70),
      k.outline(2, k.rgb(80, 120, 200)),
    ]);

    // 棋盤底板
    const BOARD_PAD = 8;
    k.add([
      k.rect(GRID_W * CELL + BOARD_PAD * 2, GRID_H * CELL + BOARD_PAD * 2, { radius: 8 }),
      k.pos(GRID_OFFSET_X - BOARD_PAD, GRID_OFFSET_Y - BOARD_PAD),
      k.color(30, 40, 70),
      k.outline(3, k.rgb(120, 150, 220)),
    ]);

    // 棋盤格紋（8x8 交錯色）
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const dark = (x + y) % 2 === 0;
        k.add([
          k.rect(CELL, CELL),
          k.pos(GRID_OFFSET_X + x * CELL, GRID_OFFSET_Y + y * CELL),
          k.color(dark ? 45 : 55, dark ? 55 : 65, dark ? 85 : 95),
          k.opacity(0.7),
        ]);
      }
    }

    // --- HUD ---
    k.add([
      k.text(mode === "timed" ? "計時模式" : "自由模式", { size: 22 }),
      k.pos(130, 50),
      k.anchor("center"),
      k.color(250, 220, 110),
    ]);

    k.add([
      k.text("分數", { size: 16 }),
      k.pos(130, 95),
      k.anchor("center"),
      k.color(170, 200, 230),
    ]);
    const scoreText = k.add([
      k.text("0", { size: 36 }),
      k.pos(130, 130),
      k.anchor("center"),
      k.color(255, 240, 130),
    ]);

    k.add([
      k.text(mode === "timed" ? "剩餘時間" : "連鎖最高", { size: 16 }),
      k.pos(130, 180),
      k.anchor("center"),
      k.color(170, 200, 230),
    ]);
    const secondaryText = k.add([
      k.text(mode === "timed" ? String(TIMED_SECONDS) : "0", { size: 36 }),
      k.pos(130, 215),
      k.anchor("center"),
      k.color(180, 255, 200),
    ]);

    // 計時模式進度條（時間）或自由模式累計配對數
    const progressBg = k.add([
      k.rect(180, 10, { radius: 4 }),
      k.pos(40, 260),
      k.color(40, 50, 80),
    ]);
    const progressBar = k.add([
      k.rect(180, 10, { radius: 4 }),
      k.pos(40, 260),
      k.color(120, 220, 140),
    ]);

    let comboBest = 0;

    // HUD 按鈕
    makeHudButton(k, 130, 430, "提示 (H)", [80, 140, 180], () => { playButton(); showHint(); });
    makeHudButton(k, 130, 480, "重新開始 (R)", [100, 100, 160], () => { playButton(); restart(); });
    makeHudButton(k, 130, 530, "回主選單 (ESC)", [150, 80, 80], () => { playButton(); k.go("menu"); });

    // 當前連鎖顯示（浮動文字）
    let comboFlash = null;

    // --- 建立初始寶石 ---
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        spawnGem(x, y, grid[y][x]);
      }
    }

    // 開場 Get Ready / Go!
    playGetReady();
    const readyText = k.add([
      k.text("Get Ready!", { size: 72 }),
      k.pos(GRID_OFFSET_X + GRID_W * CELL / 2, GRID_OFFSET_Y + GRID_H * CELL / 2),
      k.anchor("center"),
      k.color(255, 230, 100),
      k.outline(5, k.rgb(60, 30, 0)),
      k.z(100),
    ]);
    k.wait(1.2, () => {
      readyText.text = "GO!";
      readyText.color = k.rgb(120, 255, 120);
      playGo();
      k.tween(1.4, 0, 0.6, v => {
        readyText.scale = k.vec2(1 + (1 - v) * 0.5, 1 + (1 - v) * 0.5);
        if (readyText.opacity !== undefined) readyText.opacity = v;
      });
      k.wait(0.6, () => {
        if (readyText.exists()) k.destroy(readyText);
        if (state !== "gameover") state = "idle";
      });
    });

    // --- 輸入：點擊 + 拖曳/滑動 雙模式 ---
    // 桌面點擊（先選再點相鄰）與手機滑動（按住拖向相鄰格）都支援
    let dragStart = null;     // { gx, gy, mx, my } 按下起點
    let dragSwapped = false;  // 本次拖曳已觸發過交換
    const DRAG_THRESHOLD = CELL * 0.3;

    k.onMousePress(() => {
      unlockAudio();
      if (state !== "idle") return;
      const mp = k.mousePos();
      const gx = Math.floor((mp.x - GRID_OFFSET_X) / CELL);
      const gy = Math.floor((mp.y - GRID_OFFSET_Y) / CELL);
      if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) {
        dragStart = null;
        return;
      }
      clearHintFlash();
      dragStart = { gx, gy, mx: mp.x, my: mp.y };
      dragSwapped = false;
    });

    k.onMouseMove(() => {
      if (!dragStart || dragSwapped || state !== "idle") return;
      const mp = k.mousePos();
      const dx = mp.x - dragStart.mx;
      const dy = mp.y - dragStart.my;
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

      // 判斷主方向
      let ddx = 0, ddy = 0;
      if (Math.abs(dx) > Math.abs(dy)) ddx = dx > 0 ? 1 : -1;
      else                             ddy = dy > 0 ? 1 : -1;

      const nx = dragStart.gx + ddx;
      const ny = dragStart.gy + ddy;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) return;

      // 取消任何既有選取狀態
      if (selected) {
        markSelected(selected.x, selected.y, false);
        selected = null;
      }

      dragSwapped = true;
      const a = { x: dragStart.gx, y: dragStart.gy };
      const b = { x: nx, y: ny };
      dragStart = null;
      trySwap(a, b);
    });

    k.onMouseRelease(() => {
      if (!dragStart || dragSwapped) {
        dragStart = null;
        return;
      }
      if (state !== "idle") { dragStart = null; return; }
      // 沒拖曳：視為點擊（點選/切換）
      const ds = dragStart;
      dragStart = null;
      onCellClick(ds.gx, ds.gy);
    });

    k.onKeyPress("escape", () => k.go("menu"));
    k.onKeyPress("r", () => restart());
    k.onKeyPress("h", () => showHint());

    // --- 開發模式：快速刷分 / 跳結局 ---
    // 啟動方式：網址加 ?dev=1，或在 console 執行 localStorage.setItem("bejeweled_dev","1")
    if (typeof window !== "undefined" && window.__DEV__) {
      // 畫面左上角紅色標籤
      k.add([
        k.rect(90, 24, { radius: 4 }),
        k.pos(20, 20),
        k.color(220, 60, 60),
        k.z(200),
      ]);
      k.add([
        k.text("DEV MODE", { size: 14 }),
        k.pos(65, 32),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.z(201),
      ]);
      // 操作說明（HUD 下方）
      k.add([
        k.text("DEV: +加5000  -加99999  T減時  K結束  A自動連消", { size: 11 }),
        k.pos(130, 590),
        k.anchor("center"),
        k.color(255, 180, 180),
        k.z(201),
      ]);

      k.onKeyPress("equal", () => devAddScore(5000));    // '+' 通常是 shift+equal
      k.onKeyPress("minus", () => devAddScore(99999));
      k.onKeyPress("t", () => {
        if (mode === "timed") timeLeft = Math.min(timeLeft, 3);
      });
      k.onKeyPress("k", () => {
        if (state === "gameover") return;
        state = "gameover";
        k.go("gameover", { mode, score, reason: mode === "timed" ? "time" : "nomove" });
      });
      k.onKeyPress("a", () => devAutoMatch());
    }

    function devAddScore(amount) {
      score += amount;
      scoreText.text = String(score);
      k.tween(1.5, 1, 0.25, v => scoreText.scale = k.vec2(v), k.easings.easeOutQuad);
    }

    async function devAutoMatch() {
      if (state !== "idle") return;
      const pair = findHint(grid);
      if (!pair) return;
      await trySwap(pair[0], pair[1]);
    }

    // --- 更新計時 ---
    k.onUpdate(() => {
      if (state === "gameover") return;
      if (mode !== "timed") return;
      timeLeft -= k.dt();
      if (timeLeft < 0) timeLeft = 0;
      const s = Math.ceil(timeLeft);
      secondaryText.text = String(s);
      secondaryText.color = s <= 10 ? k.rgb(255, 120, 120) : k.rgb(180, 255, 200);

      // 30 秒提醒語音
      if (!thirtyPlayed && s === 30) {
        playThirtySeconds();
        thirtyPlayed = true;
      }
      // 倒數滴答音
      if (s <= 10 && s > 0 && s !== lastTickPlayed) {
        playTick();
        lastTickPlayed = s;
      }

      // 進度條
      progressBar.width = Math.max(0, (timeLeft / TIMED_SECONDS) * 180);

      if (timeLeft <= 0 && state !== "animating") {
        state = "gameover";
        k.wait(0.5, () => k.go("gameover", { mode, score, reason: "time" }));
      }
    });

    // =================== 內部函式 ===================

    function spawnGem(x, y, type, visualY = null) {
      const px = GRID_OFFSET_X + x * CELL + CELL / 2;
      const py = visualY !== null ? visualY : GRID_OFFSET_Y + y * CELL + CELL / 2;
      const g = k.add([
        k.pos(px, py),
        k.anchor("center"),
        k.z(5),
        gemComp(k, type, CELL),
        { gx: x, gy: y },
      ]);
      gems[y][x] = g;
      return g;
    }

    function cellToPos(x, y) {
      return k.vec2(
        GRID_OFFSET_X + x * CELL + CELL / 2,
        GRID_OFFSET_Y + y * CELL + CELL / 2,
      );
    }

    function updateScore(gain, combo, matchCount) {
      score += gain;
      scoreText.text = String(score);
      // 分數動畫
      k.tween(1.3, 1, 0.2, v => scoreText.scale = k.vec2(v), k.easings.easeOutQuad);

      if (combo > comboBest) comboBest = combo;
      if (mode !== "timed") {
        secondaryText.text = String(comboBest);
      }

      // 連鎖浮動提示
      if (combo >= 2) {
        if (comboFlash) k.destroy(comboFlash);
        comboFlash = k.add([
          k.text(`連鎖 x${combo}!`, { size: 36 }),
          k.pos(GRID_OFFSET_X + GRID_W * CELL / 2, GRID_OFFSET_Y - 10),
          k.anchor("center"),
          k.color(255, 220, 80),
          k.outline(3, k.rgb(80, 40, 0)),
          k.z(100),
          k.opacity(1),
        ]);
        const cf = comboFlash;
        k.tween(1, 0, 1.2, v => cf.opacity = v);
        k.tween(cf.pos.y, cf.pos.y - 30, 1.2, v => cf.pos.y = v);
        k.wait(1.2, () => { if (cf.exists()) k.destroy(cf); });
      }
    }

    function onCellClick(x, y) {
      if (!selected) {
        selected = { x, y };
        markSelected(x, y, true);
        return;
      }
      if (selected.x === x && selected.y === y) {
        markSelected(x, y, false);
        selected = null;
        return;
      }
      if (isAdjacent(selected, { x, y })) {
        const a = selected;
        const b = { x, y };
        markSelected(a.x, a.y, false);
        selected = null;
        trySwap(a, b);
      } else {
        // 切換選取
        markSelected(selected.x, selected.y, false);
        selected = { x, y };
        markSelected(x, y, true);
      }
    }

    function markSelected(x, y, on) {
      const g = gems[y][x];
      if (!g) return;
      if (on) {
        g._pulseT = 0;
        g._pulseCb = g.onUpdate(() => {
          g._pulseT += k.dt();
          g.scale = 1.1 + Math.sin(g._pulseT * 6) * 0.08;
        });
      } else {
        if (g._pulseCb) { g._pulseCb.cancel(); g._pulseCb = null; }
        g.scale = 1;
      }
    }

    async function trySwap(a, b) {
      state = "animating";
      const legal = swapCausesMatch(grid, a, b);
      const gA = gems[a.y][a.x];
      const gB = gems[b.y][b.x];
      if (!gA || !gB) { state = "idle"; return; }

      if (legal) {
        playSwap();
        // 資料交換 + 視覺交換
        swap(grid, a, b);
        gems[a.y][a.x] = gB;
        gems[b.y][b.x] = gA;
        gA.gx = b.x; gA.gy = b.y;
        gB.gx = a.x; gB.gy = a.y;
        await Promise.all([
          tweenPos(gA, cellToPos(b.x, b.y), 0.18),
          tweenPos(gB, cellToPos(a.x, a.y), 0.18),
        ]);
        await cascade();
      } else {
        playInvalid();
        // 失敗：晃一下再彈回
        await Promise.all([
          tweenPos(gA, cellToPos(b.x, b.y), 0.15),
          tweenPos(gB, cellToPos(a.x, a.y), 0.15),
        ]);
        await Promise.all([
          tweenPos(gA, cellToPos(a.x, a.y), 0.15),
          tweenPos(gB, cellToPos(b.x, b.y), 0.15),
        ]);
      }
      if (state !== "gameover") {
        state = "idle";
        if (!hasValidMove(grid)) {
          state = "gameover";
          k.wait(0.6, () => k.go("gameover", { mode, score, reason: "nomove" }));
        }
      }
    }

    async function cascade() {
      let combo = 0;
      while (true) {
        const matched = findMatches(grid);
        if (matched.size === 0) break;
        combo++;

        const gain = Math.floor(
          matched.size * SCORE_PER_GEM * Math.pow(COMBO_BONUS, combo - 1)
        );
        updateScore(gain, combo, matched.size);
        playMatch(combo - 1, matched.size);

        if (mode === "timed") {
          timeLeft = Math.min(timeLeft + TIMED_BONUS_SECONDS, TIMED_SECONDS);
        }

        // 動畫：閃光 + 爆裂
        const destroyList = [];
        matched.forEach(key => {
          const [x, y] = key.split(",").map(Number);
          const gg = gems[y][x];
          if (gg) {
            destroyList.push(gg);
            gems[y][x] = null;
          }
        });

        await animateClear(destroyList);
        clearMatches(grid, matched);

        // 重力：同步整理 grid 資料 + gems 視覺物件
        const moves = gravityBoth();

        // 此時 grid 頂部有連續 null；從最上方開始補充
        const added = [];
        for (let x = 0; x < GRID_W; x++) {
          let spawnCount = 0;
          for (let y = 0; y < GRID_H; y++) {
            if (grid[y][x] === null) {
              const type = Math.floor(Math.random() * GEM_TYPES);
              grid[y][x] = type;
              spawnCount++;
              // 從棋盤上方依序疊生成，落下時依序下移
              const visualY = GRID_OFFSET_Y - spawnCount * CELL + CELL / 2;
              const g = spawnGem(x, y, type, visualY);
              added.push({ gem: g, targetY: cellToPos(x, y).y });
            }
          }
        }

        playDrop();
        const fallTweens = [];
        moves.forEach(m => {
          fallTweens.push(tweenPos(m.gem, cellToPos(m.gem.gx, m.gem.gy), 0.25 + m.dy * 0.03, k.easings.easeInQuad));
        });
        added.forEach(a => {
          fallTweens.push(tweenPos(a.gem, k.vec2(a.gem.pos.x, a.targetY), 0.35, k.easings.easeInQuad));
        });
        await Promise.all(fallTweens);
      }
      return combo;
    }

    // 重力：同步整理資料 grid 與視覺 gems，回傳 gem 移動清單
    function gravityBoth() {
      const moves = [];
      for (let x = 0; x < GRID_W; x++) {
        let writeY = GRID_H - 1;
        for (let y = GRID_H - 1; y >= 0; y--) {
          if (grid[y][x] !== null) {
            if (y !== writeY) {
              grid[writeY][x] = grid[y][x];
              grid[y][x] = null;
              const g = gems[y][x];
              gems[writeY][x] = g;
              gems[y][x] = null;
              if (g) {
                g.gy = writeY;
                g.gx = x;
                moves.push({ gem: g, dy: writeY - y });
              }
            }
            writeY--;
          }
        }
      }
      return moves;
    }

    async function animateClear(list) {
      if (list.length === 0) return;
      const tweens = [];
      list.forEach(g => {
        // 閃一下白光
        k.tween(0, 1, 0.08, v => g.brightness = v);
        k.wait(0.08, () => k.tween(1, 0, 0.15, v => g.brightness = v));
        // 放大淡出
        tweens.push(new Promise(resolve => {
          k.tween(1, 1.5, 0.25, v => g.scale = v, k.easings.easeOutQuad);
          k.tween(1, 0, 0.25, v => {
            if (g.opacity !== undefined) g.opacity = v;
          });
          // kaboom 物件沒有預設 opacity 對 drawXXX 起作用，用 rot 轉一下增加爆裂感
          k.tween(0, Math.PI, 0.25, v => g.rot = v);
          k.wait(0.25, () => { k.destroy(g); resolve(); });
        }));
      });
      await Promise.all(tweens);
    }

    function tweenPos(obj, target, dur, ease) {
      return new Promise(resolve => {
        const start = k.vec2(obj.pos.x, obj.pos.y);
        const t = k.tween(
          0, 1, dur,
          v => { obj.pos.x = start.x + (target.x - start.x) * v; obj.pos.y = start.y + (target.y - start.y) * v; },
          ease || k.easings.easeOutQuad,
        );
        t.onEnd(resolve);
      });
    }

    function showHint() {
      if (state !== "idle") return;
      const pair = findHint(grid);
      if (!pair) return;
      clearHintFlash();
      pair.forEach(p => {
        const g = gems[p.y][p.x];
        if (!g) return;
        hintGems.push(g);
        g.hintLoop = k.loop(0.4, () => {
          k.tween(0, 1, 0.2, v => g.brightness = v);
          k.wait(0.2, () => k.tween(1, 0, 0.2, v => g.brightness = v));
        });
      });
      // 3 秒後自動停
      k.wait(3, clearHintFlash);
    }

    function clearHintFlash() {
      hintGems.forEach(g => {
        if (g.hintLoop) { g.hintLoop.cancel(); g.hintLoop = null; }
        g.brightness = 0;
      });
      hintGems = [];
    }

    function restart() {
      k.go("game", { mode });
    }
  });
}

function makeHudButton(k, cx, cy, label, rgb, onClick) {
  const btn = k.add([
    k.rect(180, 40, { radius: 6 }),
    k.pos(cx, cy),
    k.anchor("center"),
    k.color(rgb[0], rgb[1], rgb[2]),
    k.outline(2, k.rgb(255, 255, 255)),
    k.area(),
  ]);
  k.add([
    k.text(label, { size: 16 }),
    k.pos(cx, cy),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(1),
  ]);
  btn.onClick(onClick);
  btn.onHover(() => {
    btn.color = k.rgb(Math.min(255, rgb[0] + 40), Math.min(255, rgb[1] + 40), Math.min(255, rgb[2] + 40));
  });
  btn.onHoverEnd(() => {
    btn.color = k.rgb(rgb[0], rgb[1], rgb[2]);
  });
}
