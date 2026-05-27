import Phaser from "phaser";
import {
  GAME_WIDTH, GAME_HEIGHT, ZONES, ZONE_X, BARMAN_ZONE,
  PLAYER_MIN_ZONE, PLAYER_MAX_ZONE,
  ROW_TOP_Y, ROW_COUPLE_Y, ROW_PLAYER_Y,
  PARAMS, SCORE, COLORS, levelDiff
} from "../config";
import { ASSET_SIZE } from "./BootScene";
import { Dev, toggleDevPanel, exportLayout, initDevState } from "./DevPanel";
import { SPRITES as LAYOUT_SPRITES, spritePx, pathPx, RECTS as LAYOUT_RECTS, rectPx } from "./LAYOUT";

type Phase = "intro" | "play" | "duel" | "transition" | "over";
type ItemKind = "cup" | "bottle" | "plate" | "bonus" | "dynamite";

// 酒保送來的物品從 zone 6 往左走；炸彈從左門 zone 0 往右走
interface DeliveredItem {
  sprite: Phaser.GameObjects.Sprite;
  kind: ItemKind;
  zone: number;
  direction: -1 | 1;   // -1 = 往左（酒器） / +1 = 往右（炸彈從門口進來）
  nextStepAt: number;
  scoreValue: number;
  destructible: boolean;
}

// 中層夫婦丟出的攻擊物 — 從夫婦位置「斜向」拋向目標 zone 的玩家層
interface CoupleProjectile {
  sprite: Phaser.GameObjects.Sprite;
  targetZone: number;
  hitAt: number;         // 砸到玩家層的時間
}

// 中層夫婦狀態
interface Couple {
  manSprite: Phaser.GameObjects.Sprite;
  womanSprite: Phaser.GameObjects.Sprite;
  manAlertAt: number;     // 抬頭 → 站起來丟物品的時間
  womanAlertAt: number;
  manState: "eat" | "alert" | "throw";
  womanState: "eat" | "alert" | "throw";
  nextManCheck: number;
  nextWomanCheck: number;
  // 吃飯動畫切換（eat1 ↔ eat2）
  manEatFrame: 0 | 1;
  womanEatFrame: 0 | 1;
  nextManEatToggle: number;
  nextWomanEatToggle: number;
}

// 第 3 關地上炸彈（靜止燃燒，要狂按 → 拿威士忌澆）
interface GroundBomb {
  sprite: Phaser.GameObjects.Sprite;
  fuseEndAt: number;     // 不澆熄就會爆炸
  whiskeyPour: number;   // 已澆酒次數
}

interface BarmanState {
  sprite: Phaser.GameObjects.Sprite;
  nextSpawnAt: number;   // 下一次酒保丟出新物品時機
}

export class GameScene extends Phaser.Scene {
  private level = 1;
  private stage = 1;        // 1, 2, 3 — 各等級的小關
  private lives = PARAMS.lives;
  private score = 0;
  private hits = 0;

  private phase: Phase = "play";
  private invincible = false;

  private playerZone = 2;
  private player!: Phaser.GameObjects.Sprite;

  private barman!: BarmanState;
  private items: DeliveredItem[] = [];
  private projectiles: CoupleProjectile[] = [];
  private couple!: Couple;
  private groundBombs: GroundBomb[] = [];

  // 對決
  private bandit?: Phaser.GameObjects.Sprite;
  private banditHits = 0;
  private coverPlanks: Phaser.GameObjects.Rectangle[] = [];  // 舊式（暫保留以免破壞其他邏輯）
  private coverSprite?: Phaser.GameObjects.Image;  // 新：3 階段 cover sprite
  private coverHp = 0;
  private nextBanditEventAt = 0;
  private banditState: "hidden" | "peek" | "fired" | "hit" = "hidden";
  private banditBaseY = 0;
  private duelPaused = false;

  // spawn 偏向「不同類型」用 — 上次 spawn 的種類與時間
  private lastSpawnKind: ItemKind = "cup";
  private lastSpawnAt = 0;

  // Dev panel 即時調整的 row Y 值（每次 create 從 window.__wbDev 取）
  private rowTopY = ROW_TOP_Y;
  private rowCoupleY = ROW_COUPLE_Y;
  private rowPlayerY = ROW_PLAYER_Y;

  // 夫婦警告圖示（生氣時顯示「!!」）
  private manAlertMark?: Phaser.GameObjects.Text;
  private womanAlertMark?: Phaser.GameObjects.Text;

  // 對決：玩家「躲桌後」(hide) vs「跳出桌前」(expose) — expose 期間暴露在外
  private playerDuelState: "hide" | "expose" = "hide";
  private duelHideX = 0;
  private duelExposeX = 0;
  private duelTableX = 0;

  // HUD
  private scoreText!: Phaser.GameObjects.Text;
  private hitsText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;

  constructor() { super("Game"); }

  // 建立 sprite 並依 ASSET_SIZE 套用 displaySize（真實 PNG 與佔位都顯示同尺寸）
  private mkSprite(x: number, y: number, key: string, depth = 0): Phaser.GameObjects.Sprite {
    const s = this.add.sprite(x, y, key).setDepth(depth);
    const size = ASSET_SIZE[key];
    if (size) s.setDisplaySize(size.w, size.h);
    return s;
  }

  create() {
    this.level = 1;
    this.stage = 1;
    this.lives = PARAMS.lives;
    this.score = 0;
    this.hits = 0;
    this.phase = "intro";  // 進入後先播開場音 + 兩聲槍響才切到 play
    this.invincible = false;
    this.playerZone = 2;
    this.items = [];
    this.projectiles = [];
    this.groundBombs = [];

    // Dev panel layout — 每次 create 讀取最新值（dev panel 滑桿改動會自動重啟）
    const dev = initDevState();
    for (let i = 0; i < 7 && i < dev.zoneX.length; i++) ZONE_X[i] = GAME_WIDTH * dev.zoneX[i];
    this.rowTopY = GAME_HEIGHT * dev.rowTopY;
    this.rowCoupleY = GAME_HEIGHT * dev.rowCoupleY;
    this.rowPlayerY = GAME_HEIGHT * dev.rowPlayerY;

    // 註冊「套用」鉤子 — Dev panel 滑桿改動會 debounce 呼叫
    window.__wbApplyLayout = () => this.scene.restart();

    this.drawBackdrop();
    this.createBarman();
    this.createCouple();
    this.createPlayer();
    this.createHUD();
    this.bindInput();
    this.startIntro();
  }

  // 開場序：opening 音 → 兩聲槍響 → 切到 play + 開背景音樂
  private startIntro() {
    let openingMs = 1500;  // 預估開場音長度（取不到就用 fallback）
    if (this.cache.audio.exists("sfx_opening")) {
      try {
        const opening = this.sound.add("sfx_opening", { volume: 0.6 });
        opening.play();
        const dur = (opening as any).duration;
        if (typeof dur === "number" && dur > 0) openingMs = dur * 1000;
      } catch (_) {}
    }
    // 開場音結束後，連續 2 聲槍響
    this.time.delayedCall(openingMs + 200, () => {
      this.playSfx("sfx_fire", 0.6);
      this.spawnMuzzleFlash();
    });
    this.time.delayedCall(openingMs + 600, () => {
      this.playSfx("sfx_fire", 0.6);
      this.spawnMuzzleFlash();
    });
    // 槍響後切到 play 並開背景音樂
    this.time.delayedCall(openingMs + 1100, () => {
      this.phase = "play";
      this.startBgm();
    });
  }

  // ----- 音效 -----
  private bgm?: Phaser.Sound.BaseSound;
  private stepBgmActive = false;
  private stepBgmIndex = 0;
  private stepTimer?: Phaser.Time.TimerEvent;
  private playSfx(key: string, volume = 0.6) {
    if (!this.cache.audio.exists(key)) return;
    try { this.sound.play(key, { volume }); } catch (_) {}
  }
  // 用 step1 → step2 → step3 → step4 → step1 ... 循環當背景節奏
  // 每一步對齊遊戲節拍 itemStepMs，不接在前一個結束直接播
  private startStepBgm() {
    if (this.stepBgmActive) return;
    this.stepBgmActive = true;
    this.stepBgmIndex = 0;
    const playNextStep = () => {
      if (!this.stepBgmActive) return;
      const key = `sfx_step${(this.stepBgmIndex % 4) + 1}`;
      this.stepBgmIndex++;
      if (this.cache.audio.exists(key)) {
        try { this.sound.play(key, { volume: 0.45 }); } catch (_) {}
      }
      // 固定節拍，不隨難度變化
      this.stepTimer = this.time.delayedCall(1500, playNextStep);
    };
    playNextStep();
  }
  private stopStepBgm() {
    this.stepBgmActive = false;
    if (this.stepTimer) { this.stepTimer.remove(false); this.stepTimer = undefined; }
  }
  private startBgm() {
    // 新版用 step1-4 循環當背景，不再有單一 backsound
    this.startStepBgm();
  }
  shutdown() {
    this.stopStepBgm();
    try { this.bgm?.stop(); } catch (_) {}
    this.bgm = undefined;
  }

  // === 場景凍結 — 中彈時暫停所有 tween/update/step BGM，音樂結束後恢復 ===
  private frozen = false;
  private freezeScene() {
    if (this.frozen) return;
    this.frozen = true;
    // 暫停所有 tween（物品移動、夫婦丟、通緝犯狀態 tween）
    this.tweens.pauseAll();
    // 暫停 Time 事件（夫婦 waypoint 走法、各種 delayedCall）
    this.time.paused = true;
    // 停 step BGM 計時（已在播的那段讓它放完，下一段不會起）
    if (this.stepTimer) { this.stepTimer.remove(false); this.stepTimer = undefined; }
  }
  private unfreezeScene() {
    if (!this.frozen) return;
    this.frozen = false;
    this.tweens.resumeAll();
    this.time.paused = false;
    // 重新接上 step BGM 節拍
    if (this.stepBgmActive) {
      const playNextStep = () => {
        if (!this.stepBgmActive) return;
        const key = `sfx_step${(this.stepBgmIndex % 4) + 1}`;
        this.stepBgmIndex++;
        if (this.cache.audio.exists(key)) {
          try { this.sound.play(key, { volume: 0.45 }); } catch (_) {}
        }
        this.stepTimer = this.time.delayedCall(1500, playNextStep);
      };
      this.stepTimer = this.time.delayedCall(200, playNextStep);
    }
  }
  /** 凍結場景並播指定音效，音效結束後自動解凍。
   *  注意：保險 timer 用 window.setTimeout（因為 time.paused = true 期間 delayedCall 不會跑）
   */
  private freezeUntilSfx(key: string, volume = 0.7) {
    this.freezeScene();
    const resumeOnce = (() => {
      let done = false;
      return () => { if (done) return; done = true; this.unfreezeScene(); };
    })();
    if (!this.cache.audio.exists(key)) {
      window.setTimeout(resumeOnce, 800);
      return;
    }
    let dur = 800;
    try {
      const s = this.sound.add(key, { volume });
      const d = (s as any).duration;
      if (typeof d === "number" && d > 0) dur = d * 1000;
      s.once("complete", resumeOnce);
      s.play();
      // 保險：sound complete 沒觸發時用 setTimeout 補（不受 time.paused 影響）
      window.setTimeout(resumeOnce, dur + 300);
    } catch (_) {
      window.setTimeout(resumeOnce, 800);
    }
  }

  // === 背景 ===
  // 背景圖已含吧台/招牌/桌椅/門/酒架 — drawBackdrop 不再疊任何假元素
  private drawBackdrop() {
    // === 永遠用 LCD 純剪影背景（精緻 AI 圖暫停）===
    this.cameras.main.setBackgroundColor("#a8b4a0");  // LCD 灰綠
    const g = this.add.graphics().setDepth(-10);

    // 水平掃描線（模擬 LCD 像素列）
    g.lineStyle(1, 0x556655, 0.18);
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      g.lineBetween(0, y, GAME_WIDTH, y);
    }

    // === 吧台檯面：對齊 ZONE_X[1] 到 ZONE_X[6] 的網格 ===
    const halfStep = (ZONE_X[1] - ZONE_X[0]) / 2;
    const barLeft = ZONE_X[1] - halfStep;
    const barRight = ZONE_X[6] + halfStep;
    const barTop = this.rowTopY - 8;
    const barBot = this.rowTopY + 18;
    g.fillStyle(0x4a3a28, 0.85);  // 深棕吧台
    g.fillRect(barLeft, barTop, barRight - barLeft, barBot - barTop);
    g.lineStyle(2, 0x1a1a1a, 0.8);
    g.strokeRect(barLeft, barTop, barRight - barLeft, barBot - barTop);

    // === Zone 網格線：每個 zone 中心一條淡黑線（從吧台到地板）===
    g.lineStyle(1, 0x1a1a1a, 0.25);
    for (let i = 1; i <= 6; i++) {
      g.lineBetween(ZONE_X[i], barBot, ZONE_X[i], this.rowPlayerY + 30);
    }
    // 區隔線（zone 之間的中點）— 更淡
    g.lineStyle(1, 0x1a1a1a, 0.10);
    for (let i = 0; i <= 6; i++) {
      const x = ZONE_X[i] - halfStep;
      g.lineBetween(x, barTop, x, this.rowPlayerY + 30);
    }

    // === 三層 Y 輔助線 ===
    g.lineStyle(1, 0x1a1a1a, 0.20);
    g.lineBetween(0, this.rowTopY, GAME_WIDTH, this.rowTopY);
    g.lineBetween(0, this.rowCoupleY, GAME_WIDTH, this.rowCoupleY);
    g.lineBetween(0, this.rowPlayerY, GAME_WIDTH, this.rowPlayerY);

    // === Zone 編號 ===
    for (let i = 0; i < ZONES; i++) {
      this.add.text(ZONE_X[i], barTop - 14, `${i}`, {
        fontSize: "10px", color: "#222", fontFamily: "monospace"
      }).setOrigin(0.5).setAlpha(0.5);
    }
    this.add.text(ZONE_X[0], this.rowPlayerY + 18, "MISS", {
      fontSize: "11px", color: "#aa3333", fontFamily: "monospace"
    }).setOrigin(0.5).setAlpha(0.7);

    // 場景 sprite 元件（依 LAYOUT.ts 位置）— 桌椅、門、夫婦圓桌
    this.placeLayoutSprite("swing_door",   "ph_door",        -5);
    this.placeLayoutSprite("couple_table", "ph_round_table",  3);
    this.placeLayoutSprite("chair_left",   "ph_chair_left",   2);
    this.placeLayoutSprite("chair_right",  "ph_chair_right",  2);
    this.placeLayoutSprite("food_set",     "ph_food_set",     4);
  }

  /** 依 LAYOUT.ts 把 sprite 放到場景上 */
  private placeLayoutSprite(layoutKey: string, textureKey: string, depth: number) {
    const s = (LAYOUT_SPRITES as any)[layoutKey];
    if (!s || !this.textures.exists(textureKey)) return null;
    const px = spritePx(s);
    const yOffset = px.anchor === "bottom" ? -px.h / 2 : 0;
    const img = this.add.image(px.x, px.y + yOffset, textureKey).setDepth(depth);
    // 與編輯器 object-fit:contain 一致：保持原比例縮入 LAYOUT 框
    const src: any = img.texture.source[0];
    const natW = src?.width || px.w;
    const natH = src?.height || px.h;
    if (natW > 0 && natH > 0) {
      const k = Math.min(px.w / natW, px.h / natH);
      img.setDisplaySize(natW * k, natH * k);
    } else {
      img.setDisplaySize(px.w, px.h);
    }
    return img;
  }

  /** 套用 LAYOUT.ts 尺寸到既有 sprite，保持原比例 contain 在 LAYOUT 框內 */
  private applyLayoutSize(sprite: Phaser.GameObjects.Sprite, layoutKey: string) {
    const s = (LAYOUT_SPRITES as any)[layoutKey];
    if (!s) return;
    const px = spritePx(s);
    this.fitSpriteContain(sprite, px.w, px.h);
  }

  /** 保持原比例縮到 (boxW, boxH) 內（同 CSS object-fit: contain） */
  private fitSpriteContain(sprite: Phaser.GameObjects.Sprite, boxW: number, boxH: number) {
    const tex = sprite.texture;
    const src: any = tex.source[0];
    const natW = src?.width || boxW;
    const natH = src?.height || boxH;
    if (natW <= 0 || natH <= 0) { sprite.setDisplaySize(boxW, boxH); return; }
    const sx = boxW / natW;
    const sy = boxH / natH;
    const s = Math.min(sx, sy);
    sprite.setDisplaySize(natW * s, natH * s);
  }

  /** 依 cover HP 切 intact → damaged → destroyed */
  private updateCoverSprite() {
    if (!this.coverSprite) return;
    const hp = this.coverHp;
    const max = PARAMS.tableHp;
    let tex = "ph_table";
    if (hp <= 0) {
      this.coverSprite.setVisible(false); return;
    } else if (hp === 1) {
      tex = "ph_table_destroyed";
    } else if (hp < max) {
      tex = "ph_table_dmg";
    }
    if (this.textures.exists(tex)) this.coverSprite.setTexture(tex);
  }

  // === 角色 ===
  private createBarman() {
    // 酒保位置 + 尺寸完全用 LAYOUT.ts（與編輯器一致）
    const s = (LAYOUT_SPRITES as any).barman_idle;
    const px = spritePx(s);
    const cy = s.anchor === "bottom" ? px.y - px.h / 2 : px.y;
    const spr = this.mkSprite(px.x, cy, "ph_barman", 6);
    this.fitSpriteContain(spr, px.w, px.h);
    console.log(`[Barman] LAYOUT=${JSON.stringify(s)} → pos(${px.x.toFixed(0)},${cy.toFixed(0)}) box(${px.w.toFixed(0)},${px.h.toFixed(0)}) actual(${spr.displayWidth.toFixed(0)},${spr.displayHeight.toFixed(0)})`);
    this.barman = {
      sprite: spr,
      nextSpawnAt: this.time.now + 800
    };
  }

  private createCouple() {
    // 夫婦位置完全用 LAYOUT.ts（與編輯器一致）
    const manLayout = (LAYOUT_SPRITES as any).husband_eat1;
    const womanLayout = (LAYOUT_SPRITES as any).wife_eat1;
    const manPx = spritePx(manLayout);
    const womanPx = spritePx(womanLayout);
    const manY = manLayout.anchor === "bottom" ? manPx.y - manPx.h / 2 : manPx.y;
    const womanY = womanLayout.anchor === "bottom" ? womanPx.y - womanPx.h / 2 : womanPx.y;
    const manSpr = this.mkSprite(manPx.x, manY, "ph_man", 5);
    this.applyLayoutSize(manSpr, "husband_eat1");
    const womanSpr = this.mkSprite(womanPx.x, womanY, "ph_woman", 5);
    this.applyLayoutSize(womanSpr, "wife_eat1");
    this.couple = {
      manSprite: manSpr,
      womanSprite: womanSpr,
      manState: "eat",
      womanState: "eat",
      manAlertAt: 0,
      womanAlertAt: 0,
      nextManCheck: this.time.now + 3000,
      nextWomanCheck: this.time.now + 4000,
      manEatFrame: 0,
      womanEatFrame: 0,
      nextManEatToggle: this.time.now + 800,
      nextWomanEatToggle: this.time.now + 1000
    };
  }

  private createPlayer() {
    // 警長初始：x 強制 ZONE_X[playerZone]，y/尺寸 從 LAYOUT 取
    const sherPose = (LAYOUT_SPRITES as any)[`sheriff_action${this.playerZone}`] || (LAYOUT_SPRITES as any).sheriff_action1;
    const sherPx = spritePx(sherPose);
    const sherCy = sherPose.anchor === "bottom" ? sherPx.y - sherPx.h / 2 : sherPx.y;
    const initPoseKey = `ph_player_action${this.playerZone}`;
    const initKey = this.textures.exists(initPoseKey) ? initPoseKey : "ph_player";
    this.player = this.mkSprite(ZONE_X[this.playerZone], sherCy, initKey, 10);
    this.fitSpriteContain(this.player, sherPx.w, sherPx.h);
  }

  // === HUD ===
  private createHUD() {
    this.scoreText = this.add.text(16, 10, "SCORE 0", { fontSize: "22px", color: COLORS.textCream }).setDepth(100);
    this.hitsText  = this.add.text(GAME_WIDTH / 2, 10, `HITS 0/${PARAMS.hitsToFinishStage}`, { fontSize: "20px", color: "#cda434" }).setOrigin(0.5, 0).setDepth(100);
    this.livesText = this.add.text(GAME_WIDTH - 16, 10, "♥♥♥", { fontSize: "24px", color: "#e63946" }).setOrigin(1, 0).setDepth(100);
    this.levelText = this.add.text(GAME_WIDTH - 16, 40, "L1-1", { fontSize: "16px", color: "#ffd166" }).setOrigin(1, 0).setDepth(100);
    this.comboText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "", {
      fontSize: "40px", color: "#ffe066", fontFamily: "Impact, sans-serif", stroke: "#000", strokeThickness: 6
    }).setOrigin(0.5).setDepth(120);
    this.debugText = this.add.text(16, GAME_HEIGHT - 18, "", { fontSize: "11px", color: "#6b4423" }).setDepth(100);
    this.refreshHUD();
  }

  private refreshHUD() {
    this.scoreText.setText(`SCORE ${this.score}`);
    this.hitsText.setText(this.phase === "play" ? `HITS ${this.hits}/${PARAMS.hitsToFinishStage}` : "");
    this.livesText.setText("♥".repeat(this.lives) + "·".repeat(PARAMS.lives - this.lives));
    this.levelText.setText(this.phase === "duel" ? `L${this.level} 對決` : `L${this.level}-${this.stage}`);
  }

  // === 輸入 ===
  private bindInput() {
    const kb = this.input.keyboard!;
    kb.on("keydown-LEFT",  () => this.move(-1));
    kb.on("keydown-A",     () => this.move(-1));
    kb.on("keydown-RIGHT", () => this.move(1));
    // 注意：D 改成開 Dev panel，移動右側用 ← / → / A / L
    kb.on("keydown-L",     () => this.move(1));
    kb.on("keydown-SPACE", () => this.fire());
    kb.on("keydown-F",     () => this.fire());
    // DEV — P 觸發對決, N 跳下一關, D Dev 面板, X 匯出, R 套用 layout
    kb.on("keydown-P",     () => { if (this.phase === "play") this.startDuel(); });
    kb.on("keydown-N",     () => { if (this.phase === "play") this.advanceStage(); });
    kb.on("keydown-D",     () => toggleDevPanel());
    kb.on("keydown-X",     () => exportLayout());
    kb.on("keydown-R",     () => this.scene.restart());
  }

  private move(dir: number) {
    if (this.phase === "over" || this.phase === "intro") return;
    if (this.phase === "duel") return;

    // 在 zone 4 按右 → 進入 pour 姿勢（搬到 LAYOUT sheriff_pour 位置），若 stage 3 有炸彈順便澆酒
    if (dir > 0 && this.playerZone === PLAYER_MAX_ZONE) {
      this.setPlayerSprite("ph_player_pour");
      // LCD 風格：瞬移到 sheriff_pour 位置
      const pourLayout = (LAYOUT_SPRITES as any).sheriff_pour;
      if (pourLayout) {
        const px = spritePx(pourLayout);
        const cy = pourLayout.anchor === "bottom" ? px.y - px.h / 2 : px.y;
        this.player.setPosition(px.x, cy);
      }
      // stage 3 + 有地上炸彈 → 觸發澆酒
      if (this.stage === 3 && this.groundBombs.length > 0) {
        this.pourWhiskey();
      }
      // 放開後回 action4
      this.time.delayedCall(400, () => {
        if (this.invincible) return;
        this.setPlayerSprite("ph_player_action4");
        const a4 = (LAYOUT_SPRITES as any).sheriff_action4;
        if (a4) {
          const px = spritePx(a4);
          const cy = a4.anchor === "bottom" ? px.y - px.h / 2 : px.y;
          this.player.setPosition(px.x, cy);
        }
      });
      return;
    }

    const newZone = Phaser.Math.Clamp(this.playerZone + dir, PLAYER_MIN_ZONE, PLAYER_MAX_ZONE);
    if (newZone === this.playerZone) return;
    this.playerZone = newZone;

    // 警長依抵達 zone 切 pose：zone 1 = action1, ... zone 4 = action4
    const zonePoseKey = `ph_player_action${newZone}`;
    if (this.textures.exists(zonePoseKey)) {
      this.setPlayerSprite(zonePoseKey);
    } else {
      this.setPlayerSprite("ph_player");
    }

    // LCD 風格：x 強制 ZONE_X[newZone]，y 從 LAYOUT 取（保持腳底高度）
    const layoutKey = `sheriff_action${newZone}`;
    const layout = (LAYOUT_SPRITES as any)[layoutKey];
    let cy = this.player.y;
    if (layout) {
      const px = spritePx(layout);
      cy = layout.anchor === "bottom" ? px.y - px.h / 2 : px.y;
    }
    this.player.setPosition(ZONE_X[newZone], cy);
  }

  // 玩家在 zone 4 把酒瓶傾倒到 zone 5 — 每按一次扣 ground bomb 一段引信
  private pourWhiskey() {
    // 視覺：威士忌液體往 zone 5 灑
    const startX = ZONE_X[PLAYER_MAX_ZONE] + 24;
    const endX = ZONE_X[5] - 10;
    const drop = this.add.circle(startX, this.rowPlayerY - 10, 5, 0xffaa55).setDepth(15);
    this.tweens.add({
      targets: drop, x: endX, y: this.rowPlayerY + 28, alpha: 0,
      duration: 280, ease: "Quad.in",
      onComplete: () => drop.destroy()
    });

    // 找最近的 ground bomb 澆酒
    const b = this.groundBombs[0];
    if (b) {
      b.whiskeyPour += 1;
      b.sprite.setTint(0x66ccff);
      this.tweens.add({ targets: b.sprite, scale: 0.9, yoyo: true, duration: 120 });
      if (b.whiskeyPour >= 3) {
        this.extinguishBomb(b);
      }
    }
  }

  // 切換玩家 sprite — 套用對應的 displaySize + 位置（與編輯器一致）
  private setPlayerSprite(key: string, movePosition: boolean = false) {
    if (!this.textures.exists(key)) return;
    this.player.setTexture(key);
    // 優先用 LAYOUT.ts 的尺寸（保比例 contain，與編輯器一致），沒有就 fallback ASSET_SIZE
    // 注意：hit 沒有專屬 LAYOUT，借用 sheriff_down 的位置與尺寸
    let layoutKey = key.replace("ph_player_", "sheriff_").replace("ph_player", "sheriff_action1");
    if (layoutKey === "sheriff_hit") layoutKey = "sheriff_down";
    const s = (LAYOUT_SPRITES as any)[layoutKey];
    if (s) {
      const px = spritePx(s);
      this.fitSpriteContain(this.player, px.w, px.h);
      if (movePosition) {
        const cy = s.anchor === "bottom" ? px.y - px.h / 2 : px.y;
        this.player.setPosition(px.x, cy);
      }
    } else {
      const size = ASSET_SIZE[key];
      if (size) this.player.setDisplaySize(size.w, size.h);
    }
  }

  // === FIRE 開槍 ===
  private fire() {
    if (this.phase === "over" || this.phase === "intro") return;
    if (this.phase === "duel") return this.fireDuel();

    // 一般遊玩：警長保持當前 zone 的 action pose，只顯示槍口火光
    // （ph_player_fire 大開槍姿勢只在對決時用）
    this.spawnMuzzleFlash();
    this.spawnUpwardBullet();

    // 1) 上層物品 — 同 zone 命中（多個堆疊 → 重疊加分）
    const hitsTop = this.items.filter(it => it.zone === this.playerZone);
    // 2) 中層攻擊物 — 在玩家上方對應 zone 的飛行中投擲物，也順便擊落
    const hitsMid = this.projectiles.filter(p => p.targetZone === this.playerZone);

    // 炸彈不可射 → 失誤
    const dyn = hitsTop.find(it => it.kind === "dynamite");
    if (dyn) {
      this.flashCenter("射中炸彈！", "#ff3030");
      this.explode(dyn.sprite.x, dyn.sprite.y);
      this.removeItem(dyn);
      this.takeHit();
      return;
    }

    if (hitsTop.length === 0 && hitsMid.length === 0) {
      // 空射
      return;
    }

    // 上層物品 — 計算分數（依使用者回饋）
    const breakables = hitsTop.filter(it => it.destructible);
    let gained = 0;
    for (const b of breakables) {
      // 換成擊碎圖 + 短暫顯示 + 粒子 + 移除
      this.showBrokenItem(b);
      if (b.kind !== "bonus") this.hits++;
    }
    if (breakables.length > 0) {
      // 1 個 = 10；2+ 個 = 50（flat）
      if (breakables.length === 1) {
        gained = SCORE.singleHit;
      } else {
        gained = SCORE.multiHitFlat;
      }
      // bonus 額外加分
      const hadBonus = breakables.some(b => b.kind === "bonus");
      if (hadBonus) gained += SCORE.bonus;
      this.score += gained;

      if (breakables.length >= 2) {
        this.comboText.setText(`x${breakables.length}  +${gained}`).setAlpha(1);
        this.tweens.add({ targets: this.comboText, alpha: 0, duration: 700 });
      }
      // 一發 3+ 個 → 掉特殊酒瓶 bonus
      if (breakables.length >= 3) {
        this.time.delayedCall(200, () => this.spawnBonus());
      }
    }

    // 中層攻擊物 — 順便擊落（防禦性射擊，無分）
    for (const p of hitsMid) {
      this.smash(p.sprite.x, p.sprite.y, 0xff6666);
      p.sprite.destroy();
      const i = this.projectiles.indexOf(p);
      if (i >= 0) this.projectiles.splice(i, 1);
    }

    this.refreshHUD();
    if (this.hits >= PARAMS.hitsToFinishStage) this.startDuel();
  }

  // 計算當前 pose 槍口位置（相對 sprite 中心的 gunOffset，從 LAYOUT 讀）
  private getGunPos(): { x: number; y: number } {
    const poseKey = `sheriff_action${this.playerZone}`;
    const pose = (LAYOUT_SPRITES as any)[poseKey] || (LAYOUT_SPRITES as any).sheriff_action1;
    const off = { dx: pose.gunOffsetX ?? +0.22, dy: pose.gunOffsetY ?? -0.50 };
    return {
      x: this.player.x + off.dx * this.player.displayWidth,
      y: this.player.y + off.dy * this.player.displayHeight,
    };
  }

  // 只做槍口閃光特效 + 音效（不發射子彈）
  private spawnMuzzleFlash() {
    const { x, y } = this.getGunPos();
    const f = this.add.circle(x, y, 8, 0xffd166).setDepth(20);
    this.tweens.add({ targets: f, alpha: 0, scale: 2, duration: 120, onComplete: () => f.destroy() });
    this.playSfx("sfx_fire", 0.5);
  }

  // 一般關卡：LCD 風格瞬間閃光線（從槍口到畫面頂）
  private spawnUpwardBullet() {
    const { x, y } = this.getGunPos();
    const line = this.add.rectangle(x, y / 2, 3, y, 0xffd166).setDepth(15);
    line.setAlpha(0.9);
    // 短暫顯示 80ms 後消失
    this.time.delayedCall(80, () => line.destroy());
  }

  // 不同物品有各自的 Y 軌道 — 三條線，全部都在吧台檯面上方一點點
  private yForKind(kind: ItemKind): number {
    // 物品的 anchor 在中心；要讓物品底部坐在吧台檯面上，y 要往上微推（高度/2）
    const base = this.rowTopY;
    switch (kind) {
      case "plate":    return base + 4;    // 盤子矮平 — 直接放在檯面
      case "bottle":   return base - 14;   // 瓶子高 — 往上推讓底部坐在檯面
      case "cup":      return base + 0;    // 杯子中等
      case "dynamite": return base - 4;
      case "bonus":    return base - 16;
    }
  }

  // === 酒保推進物品（往左）+ 炸彈從左門進來（往右） ===
  /** 取得某 kind 對應的 LAYOUT path（waypoint 對應 zone）*/
  private getItemPath(kind: ItemKind) {
    const name = kind === "cup" ? "cup_flow"
               : kind === "bottle" ? "bottle_flow"
               : kind === "plate" ? "plate_flow"
               : kind === "bonus" ? "cup_flow"
               : "dynamite_arc";
    return pathPx(name);
  }

  /** 杯/瓶/盤/bonus：強制 x = ZONE_X[zone]（LCD 對齊），y 從 path 或 yForKind */
  private waypointForZone(kind: ItemKind, zone: number) {
    const path = this.getItemPath(kind);
    let y = this.yForKind(kind);
    if (path.length > 0) {
      const idx = Math.max(0, Math.min(path.length - 1, (path.length - 1) - zone));
      y = path[idx].y;  // 只吃 y，x 強制 ZONE_X[zone]
    }
    return { x: ZONE_X[zone], y };
  }

  private spawnDeliveredItem() {
    const r = Math.random();
    const diff = levelDiff(this.level);
    let kind: ItemKind;
    let fromDoor = false;
    if ((this.stage === 2 || this.stage === 3) && r < diff.bombChance) {
      kind = "dynamite";
      fromDoor = true;
    } else {
      const now = this.time.now;
      const recent = (now - this.lastSpawnAt) < diff.itemStepMs;
      const types: ItemKind[] = ["cup", "bottle", "plate"];
      const candidates = recent ? types.filter(t => t !== this.lastSpawnKind) : types;
      kind = candidates[Math.floor(Math.random() * candidates.length)];
    }

    const startZone = fromDoor ? 0 : BARMAN_ZONE;

    const sameKindAtStart = this.items.find(it => it.kind === kind && it.zone === startZone);
    if (sameKindAtStart) return;

    if (!fromDoor) {
      this.lastSpawnKind = kind;
      this.lastSpawnAt = this.time.now;
    }

    const props = this.itemProps(kind);
    const direction = fromDoor ? +1 : -1;

    // 用 LAYOUT path 的起點位置
    if (kind === "dynamite") {
      // 沖天炮：用 10 點 dynamite_arc tween chain 一次性走完
      this.spawnDynamiteArc(props);
      return;
    }

    const start = this.waypointForZone(kind, startZone);
    const sprite = this.mkSprite(start.x, start.y, props.key, 7);

    const stepMs = levelDiff(this.level).itemStepMs;
    this.items.push({
      sprite, kind, zone: startZone,
      direction,
      nextStepAt: this.time.now + stepMs,
      scoreValue: props.score,
      destructible: props.destructible
    });
  }

  /** 沖天炮：依 dynamite_arc tween chain
   *  Stage 1、2：只跑點 1-7（上空 7 點，到吧台上方止）
   *  Stage 3：跑完所有 10 點（最後 3 點是落地軌跡）
   */
  private spawnDynamiteArc(props: { key: string; score: number; destructible: boolean }) {
    const fullPath = pathPx("dynamite_arc");
    if (fullPath.length < 2) return;
    // 依關卡截路徑
    const endIdx = this.stage === 3 ? fullPath.length : 7;  // stage 3: 全部 10 點；其餘: 前 7 點
    const path = fullPath.slice(0, endIdx);
    const diff = levelDiff(this.level);
    const sprite = this.mkSprite(path[0].x, path[0].y, props.key, 7);
    sprite.setTint(0xff5544);

    // LCD 風格：一格一格瞬移
    const segMs = diff.itemStepMs;
    path.slice(1).forEach((pt, i) => {
      this.time.delayedCall(segMs * (i + 1), () => {
        if (sprite.active) sprite.setPosition(pt.x, pt.y);
      });
    });

    // 仍進 items 列表，但用最簡化的 zone 追蹤（依時間估算）
    this.items.push({
      sprite, kind: "dynamite", zone: 0,
      direction: +1,
      nextStepAt: this.time.now + segMs,
      scoreValue: 0,
      destructible: false
    });
  }

  private spawnBonus() {
    const props = { key: "ph_bonus", score: SCORE.bonus, destructible: true };
    const start = this.waypointForZone("bonus", BARMAN_ZONE);
    const sprite = this.mkSprite(start.x, start.y, props.key, 7);
    sprite.setTint(0xfff066);
    const stepMs = levelDiff(this.level).itemStepMs;
    this.items.push({
      sprite, kind: "bonus", zone: BARMAN_ZONE,
      direction: -1,
      nextStepAt: this.time.now + stepMs,
      scoreValue: props.score,
      destructible: true
    });
  }

  private itemProps(kind: ItemKind) {
    // 各物品 scoreValue 已不再使用（改用 SCORE.singleHit / multiHitFlat），保留欄位為日後彈性
    switch (kind) {
      case "cup":      return { key: "ph_cup",    score: 10, destructible: true };
      case "bottle":   return { key: "ph_bottle", score: 10, destructible: true };
      case "plate":    return { key: "ph_plate",  score: 10, destructible: true };
      case "dynamite": return { key: "ph_dyn",    score: 0,  destructible: false };
      case "bonus":    return { key: "ph_bonus",  score: SCORE.bonus, destructible: true };
    }
  }

  /** 物品被擊中：換擊碎圖、稍微縮放下落、粒子、然後移除 */
  private showBrokenItem(it: DeliveredItem) {
    const brokenKey =
      it.kind === "cup"    ? "ph_cup_broken" :
      it.kind === "bottle" ? "ph_bottle_broken" :
      it.kind === "plate"  ? "ph_plate_broken" :
      null;

    // 擊中音效（依物品種類）
    const hitSfx =
      it.kind === "cup"    ? "sfx_hit1" :
      it.kind === "bottle" ? "sfx_hit2" :
      it.kind === "plate"  ? "sfx_hit3" :
      null;
    if (hitSfx) this.playSfx(hitSfx, 0.7);

    // 立刻先放粒子
    this.smash(it.sprite.x, it.sprite.y, 0xffd166);

    if (brokenKey && this.textures.exists(brokenKey)) {
      const x = it.sprite.x, y = it.sprite.y;
      // 移除原物
      const i = this.items.indexOf(it);
      if (i >= 0) this.items.splice(i, 1);
      it.sprite.destroy();
      // 放破碎圖（用 LAYOUT 對應 sprite 尺寸）
      const broken = this.add.sprite(x, y, brokenKey).setDepth(8);
      const layoutKey =
        it.kind === "cup"    ? "cup" :
        it.kind === "bottle" ? "bottle" :
        it.kind === "plate"  ? "plate" : null;
      if (layoutKey) {
        const s = (LAYOUT_SPRITES as any)[layoutKey];
        if (s) {
          const px = spritePx(s);
          broken.setDisplaySize(px.w * 1.2, px.h * 1.2);
        }
      }
      // 破碎圖在原地停留一個節奏（itemStepMs），到下一拍直接消失（不淡出）
      const holdMs = levelDiff(this.level).itemStepMs;
      this.time.delayedCall(holdMs, () => {
        if (broken.active) broken.destroy();
      });
    } else {
      // 沒有對應的 broken 圖（如 bonus、dynamite）直接移除
      this.removeItem(it);
    }
  }

  private removeItem(it: DeliveredItem) {
    it.sprite.destroy();
    const i = this.items.indexOf(it);
    if (i >= 0) this.items.splice(i, 1);
  }

  /** 物品滑到吧台最左 → LCD 風直接消失 */
  private fallOffLeft(it: DeliveredItem) {
    const i = this.items.indexOf(it);
    if (i >= 0) this.items.splice(i, 1);
    it.sprite.destroy();
  }

  // 每個 item 依自己的 nextStepAt 跳格
  // 酒器（direction=-1）：zone 6 → 0，到 0 = miss
  // 炸彈（direction=+1）：zone 0 → 6，到 6 = 酒保接住處理（依關卡）
  private stepItems(now: number) {
    const diff = levelDiff(this.level);
    for (const it of [...this.items]) {
      if (now < it.nextStepAt) continue;
      const newZone = it.zone + it.direction;

      // 邊界處理：酒器溢出 → 往左傾倒掉落動畫
      if (it.direction < 0 && newZone < 0) {
        this.fallOffLeft(it);
        continue;
      }

      // 邊界處理：炸彈到達酒保（zone 6）
      if (it.direction > 0 && newZone >= BARMAN_ZONE) {
        if (it.kind === "dynamite") {
          if (this.stage === 2) {
            // 第 2 關：酒保接住熄滅 — 安全
            this.flashCenter("酒保熄滅炸彈", "#66ccff");
            this.smash(this.barman.sprite.x, this.barman.sprite.y, 0x66ccff);
          } else if (this.stage === 3) {
            // 第 3 關：酒保太忙 → 丟到 zone 5 地上
            this.barmanCatchAndDrop();
            this.spawnGroundBomb();
          }
        }
        this.removeItem(it);
        continue;
      }

      // 同類型不重疊：前面同類型還沒走 → 這拍跳過、等下一拍
      const blocking = this.items.find(o => o !== it && o.kind === it.kind && o.zone === newZone);
      if (blocking) {
        it.nextStepAt += diff.itemStepMs;
        continue;
      }

      it.zone = newZone;
      it.nextStepAt += diff.itemStepMs;
      // LCD 風格：直接瞬移到下一個 waypoint，無 tween
      const wp = this.waypointForZone(it.kind, newZone);
      it.sprite.setPosition(wp.x, wp.y);
    }
  }

  // 第 3 關酒保接到炸彈後拋到 zone 5 地上的視覺
  private barmanCatchAndDrop() {
    if (!this.barman) return;
    // 酒保跳一下表示「太忙了」
    this.tweens.add({
      targets: this.barman.sprite, y: this.barman.sprite.y - 8, yoyo: true, duration: 120
    });
    // 拋擲軌跡（zone 6 -> zone 5 地上）
    const projectile = this.mkSprite(this.barman.sprite.x, this.barman.sprite.y, "ph_dyn",15);
    projectile.setTint(0xff8855);
    this.tweens.add({
      targets: projectile,
      x: ZONE_X[5], y: this.rowPlayerY + 30,
      duration: 500, ease: "Quad.in",
      onComplete: () => projectile.destroy()
    });
  }


  private spawnGroundBomb() {
    const x = ZONE_X[5];
    const y = this.rowPlayerY + 30;
    const sprite = this.mkSprite(x, y, "ph_dyn_fuse",8);
    sprite.setTint(0xff5722);
    const diff = levelDiff(this.level);
    const fuse = 4000 - this.level * 200;
    this.groundBombs.push({
      sprite,
      fuseEndAt: this.time.now + fuse,
      whiskeyPour: 0
    });
    this.flashCenter("狂按 → 澆酒熄滅！", "#ff8855");
  }

  private extinguishBomb(b: GroundBomb) {
    this.flashCenter("熄滅！", "#66ccff");
    this.smash(b.sprite.x, b.sprite.y, 0x66ccff);
    b.sprite.destroy();
    const i = this.groundBombs.indexOf(b);
    if (i >= 0) this.groundBombs.splice(i, 1);
    this.score += 100;
    this.refreshHUD();
  }

  // === 夫婦客人 ===
  private tickCouple(now: number) {
    const diff = levelDiff(this.level);

    // 吃飯動畫切換（eat1 ↔ eat2）
    if (this.couple.manState === "eat" && now >= this.couple.nextManEatToggle) {
      this.couple.manEatFrame = this.couple.manEatFrame === 0 ? 1 : 0;
      const tex = this.couple.manEatFrame === 0 ? "ph_man" : "ph_man_eat2";
      if (this.textures.exists(tex)) this.couple.manSprite.setTexture(tex);
      this.couple.nextManEatToggle = now + 700 + Math.random() * 400;
    }
    if (this.couple.womanState === "eat" && now >= this.couple.nextWomanEatToggle) {
      this.couple.womanEatFrame = this.couple.womanEatFrame === 0 ? 1 : 0;
      const tex = this.couple.womanEatFrame === 0 ? "ph_woman" : "ph_woman_eat2";
      if (this.textures.exists(tex)) this.couple.womanSprite.setTexture(tex);
      this.couple.nextWomanEatToggle = now + 800 + Math.random() * 400;
    }

    // 男
    if (this.couple.manState === "eat" && now >= this.couple.nextManCheck) {
      if (Math.random() < diff.coupleAngerChance) {
        this.couple.manState = "alert";
        this.couple.manSprite.setTexture("ph_man_up");
        this.couple.manSprite.setTint(0xff5555);
        this.couple.manAlertAt = now + diff.coupleAngerMs;
        this.showAlertMark(this.couple.manSprite, "man");
      }
      this.couple.nextManCheck = now + 600;
    } else if (this.couple.manState === "alert" && now >= this.couple.manAlertAt) {
      // 男攻擊 zone 1 或 2（隨機 50/50 走 husband_throw_z1 或 _z2）
      const targetZone = Math.random() < 0.5 ? 1 : 2;
      const pathName = targetZone === 1 ? "husband_throw_z1" : "husband_throw_z2";
      const projKey = Math.random() < 0.5 ? "ph_apple" : "ph_bottle";
      this.couple.manSprite.setTexture("ph_man_throw");
      this.coupleThrow(this.couple.manSprite, targetZone, projKey, pathName);
      this.time.delayedCall(300, () => {
        this.couple.manSprite.setTexture("ph_man");
        this.couple.manSprite.clearTint();
      });
      this.couple.manState = "eat";
      this.hideAlertMark("man");
      this.couple.nextManCheck = now + 2500 + Math.random() * 3000;
    }

    // 女
    if (this.couple.womanState === "eat" && now >= this.couple.nextWomanCheck) {
      if (Math.random() < diff.coupleAngerChance) {
        this.couple.womanState = "alert";
        this.couple.womanSprite.setTexture("ph_woman_up");
        this.couple.womanSprite.setTint(0xff5555);
        this.couple.womanAlertAt = now + diff.coupleAngerMs;
        this.showAlertMark(this.couple.womanSprite, "woman");
      }
      this.couple.nextWomanCheck = now + 600;
    } else if (this.couple.womanState === "alert" && now >= this.couple.womanAlertAt) {
      // 女攻擊 zone 3 或 4（隨機 50/50 走 wife_throw_z3 或 _z4）
      const targetZone = Math.random() < 0.5 ? 3 : 4;
      const pathName = targetZone === 3 ? "wife_throw_z3" : "wife_throw_z4";
      const projKey = Math.random() < 0.5 ? "ph_apple" : "ph_bottle";
      this.couple.womanSprite.setTexture("ph_woman_throw");
      this.coupleThrow(this.couple.womanSprite, targetZone, projKey, pathName);
      this.time.delayedCall(300, () => {
        this.couple.womanSprite.setTexture("ph_woman");
        this.couple.womanSprite.clearTint();
      });
      this.couple.womanState = "eat";
      this.hideAlertMark("woman");
      this.couple.nextWomanCheck = now + 2500 + Math.random() * 3000;
    }
  }

  private showAlertMark(from: Phaser.GameObjects.Sprite, who: "man" | "woman") {
    const t = this.add.text(from.x, from.y - 60, "!!", {
      fontSize: "32px", color: "#ff3030", fontFamily: "Impact, sans-serif",
      stroke: "#000", strokeThickness: 4
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: t, scale: 1.4, yoyo: true, repeat: -1, duration: 200
    });
    if (who === "man") this.manAlertMark = t;
    else this.womanAlertMark = t;
  }

  private hideAlertMark(who: "man" | "woman") {
    const mark = who === "man" ? this.manAlertMark : this.womanAlertMark;
    if (mark) {
      mark.destroy();
      if (who === "man") this.manAlertMark = undefined;
      else this.womanAlertMark = undefined;
    }
  }

  // 夫婦丟擲：依 LAYOUT.ts 中的 path waypoints 連續 tween
  private coupleThrow(from: Phaser.GameObjects.Sprite, targetZone: number, key: string, pathName: string) {
    const diff = levelDiff(this.level);
    const sprite = this.mkSprite(from.x, from.y - 14, key, 9);
    sprite.setTint(0xff7755);
    const tossMs = diff.projectileTossMs;

    const waypoints = pathPx(pathName);
    if (waypoints.length >= 2) {
      // 一格一格跳：每個 waypoint 用 delayedCall 直接 setPosition（無平滑 tween）
      const segMs = tossMs / Math.max(1, waypoints.length - 1);
      waypoints.slice(1).forEach((pt, i) => {
        this.time.delayedCall(segMs * (i + 1), () => {
          if (sprite.active) sprite.setPosition(pt.x, pt.y);
        });
      });
    } else {
      // fallback：直線到 target zone
      this.tweens.add({
        targets: sprite,
        x: ZONE_X[targetZone], y: this.rowPlayerY - 6,
        duration: tossMs, ease: "Linear"
      });
    }

    this.projectiles.push({ sprite, targetZone, hitAt: this.time.now + tossMs });
  }

  private tickProjectiles(now: number) {
    for (const p of [...this.projectiles]) {
      if (now < p.hitAt) continue;
      if (this.playerZone === p.targetZone) {
        this.takeHit();
      }
      // 夫婦丟的東西落地不要爆炸聲（只保留視覺）
      this.explode(p.sprite.x, p.sprite.y, /* withSound */ false);
      p.sprite.destroy();
      const i = this.projectiles.indexOf(p);
      if (i >= 0) this.projectiles.splice(i, 1);
    }
  }

  // === 失誤 ===
  private takeHit() {
    if (this.invincible) return;
    this.lives -= 1;
    this.refreshHUD();
    this.invincible = true;
    this.cameras.main.shake(160, 0.012);
    this.cameras.main.flash(120, 200, 0, 0);

    // LCD 風：直接切 down sprite + 搬到 sheriff_down 位置，無搖晃無淚珠
    this.setPlayerSprite("ph_player_down", /* movePosition */ true);
    // 1 秒後復活（靠 freezeUntilSfx 處理凍結，這裡負責復活後位置）
    this.time.delayedCall(1000, () => {
      this.invincible = false;
      if (this.phase === "duel") {
        this.setPlayerSprite("ph_player_hide", /* movePosition */ true);
        this.playerDuelState = "hide";
        const hideLayout = (LAYOUT_SPRITES as any).sheriff_hide;
        if (hideLayout) {
          const hpx = spritePx(hideLayout);
          this.duelHideX = hpx.x;
        }
      } else {
        const zoneKey = `ph_player_action${this.playerZone}`;
        this.setPlayerSprite(this.textures.exists(zoneKey) ? zoneKey : "ph_player", /* movePosition */ true);
      }
    });

    if (this.lives <= 0) {
      this.phase = "over";
      this.playSfx("sfx_gameover", 0.8);
      try { this.bgm?.stop(); } catch (_) {}
      this.stopStepBgm();
      this.time.delayedCall(700, () => this.scene.start("GameOver", {
        score: this.score, level: this.level, stage: this.stage
      }));
    } else {
      // 中彈：場景凍結到 miss 音樂播完才恢復（所有 tween / update 全暫停）
      this.freezeUntilSfx("sfx_miss", 0.7);
    }
  }

  // === 對決 ===
  private startDuel() {
    this.phase = "transition";
    // 通緝犯來了 — 停止一般時刻的 step BGM
    this.stopStepBgm();
    [...this.items].forEach(it => this.removeItem(it));
    this.projectiles.forEach(p => p.sprite.destroy());
    this.projectiles = [];
    // 夫婦躲桌下
    this.couple.manSprite.setAlpha(0.2);
    this.couple.womanSprite.setAlpha(0.2);
    this.couple.manSprite.setTexture("ph_man");
    this.couple.womanSprite.setTexture("ph_woman");
    this.couple.manSprite.clearTint();
    this.couple.womanSprite.clearTint();
    this.couple.manState = "eat";
    this.couple.womanState = "eat";
    this.hideAlertMark("man");
    this.hideAlertMark("woman");
    this.refreshHUD();
    this.flashCenter("通緝犯來了!", "#ff6655");
    this.time.delayedCall(900, () => this.enterDuel());
  }

  private enterDuel() {
    this.phase = "duel";
    this.banditHits = 0;
    this.duelPaused = false;
    this.playerDuelState = "hide";

    // === LCD 對決位置：全部對齊 ZONE_X 網格 ===
    // 警長躲掩體：ZONE_X[6]（最右）
    // 通緝犯：ZONE_X[0]（最左，門口）
    // 掩體：ZONE_X[6]，桌前
    this.duelHideX   = ZONE_X[6];
    this.duelExposeX = ZONE_X[6];   // LCD 同一 column，靠 pose 區別躲/冒
    this.duelTableX  = ZONE_X[6];

    this.playerZone = PLAYER_MAX_ZONE;
    // y 從 LAYOUT sheriff_hide 取（保留腳底高度設定）
    const hideLayout = (LAYOUT_SPRITES as any).sheriff_hide;
    const hidePx = spritePx(hideLayout);
    const hideY = hideLayout.anchor === "bottom" ? hidePx.y - hidePx.h / 2 : hidePx.y;
    this.player.setPosition(this.duelHideX, hideY);
    this.setPlayerSprite("ph_player_hide");
    this.playSfx("sfx_beep", 0.5);

    // 掩體在 ZONE_X[6]，y 從 LAYOUT cover_intact
    this.coverPlanks = [];
    this.coverHp = PARAMS.tableHp;
    const coverLayout = (LAYOUT_SPRITES as any).cover_intact;
    if (coverLayout && this.textures.exists("ph_table")) {
      const cpx = spritePx(coverLayout);
      const cy = cpx.anchor === "bottom" ? cpx.y - cpx.h / 2 : cpx.y;
      this.coverSprite = this.add.image(ZONE_X[6], cy, "ph_table").setDepth(11);
      const src: any = this.coverSprite.texture.source[0];
      const k = Math.min(cpx.w / (src?.width || cpx.w), cpx.h / (src?.height || cpx.h));
      this.coverSprite.setDisplaySize((src?.width || cpx.w) * k, (src?.height || cpx.h) * k);
    }

    // 通緝犯：x 固定 ZONE_X[0]，y 從 LAYOUT bandit_hide
    const bHideLayout = (LAYOUT_SPRITES as any).bandit_hide || (LAYOUT_SPRITES as any).bandit_at_door;
    const bpx = spritePx(bHideLayout);
    const banditCy = bHideLayout.anchor === "bottom" ? bpx.y - bpx.h / 2 : bpx.y;
    this.banditBaseY = banditCy;
    this.bandit = this.mkSprite(ZONE_X[0], banditCy, "ph_bandit_hide", 11);
    this.applyLayoutSize(this.bandit, bHideLayout === (LAYOUT_SPRITES as any).bandit_hide ? "bandit_hide" : "bandit_at_door");
    this.bandit.setAlpha(0.3);  // hide 狀態半透明

    // 進場音 boss1：播放期間通緝犯不動作，音樂結束才開始刺探/攻擊
    let bossMs = 2000;
    if (this.cache.audio.exists("sfx_boss1")) {
      try {
        const s = this.sound.add("sfx_boss1", { volume: 0.7 });
        s.play();
        const dur = (s as any).duration;
        if (typeof dur === "number" && dur > 0) bossMs = dur * 1000;
      } catch (_) {}
    }
    this.banditState = "hidden";
    this.nextBanditEventAt = this.time.now + bossMs + 200;
    this.flashCenter("對決開始！", "#ff6655");
    this.refreshHUD();
  }

  // FIRE 按下：跳出桌前 → 射擊 → 跳回。期間 expose 視窗（暴露）約 500ms
  private fireDuel() {
    if (this.duelPaused) return;
    if (this.playerDuelState === "expose") return; // 已在跳出狀態中，不重複觸發

    this.playerDuelState = "expose";

    // LCD 風格：瞬間跳到桌前 → 開槍 → 300ms 後瞬間跳回
    this.player.setX(this.duelExposeX);
    this.spawnMuzzleFlash();
    this.shootAtBandit();
    this.time.delayedCall(300, () => {
      if (this.phase !== "duel") return;
      this.player.setX(this.duelHideX);
      this.playerDuelState = "hide";
    });
  }

  // LCD 風格：瞬間閃光線（從槍口到通緝犯），同時判定命中
  private shootAtBandit() {
    if (!this.bandit) return;
    const fp = (LAYOUT_SPRITES as any).sheriff_fire;
    const dx = fp?.gunOffsetX ?? -0.30;
    const dy = fp?.gunOffsetY ?? -0.10;
    const sx = this.player.x + dx * this.player.displayWidth;
    const sy = this.player.y + dy * this.player.displayHeight;
    const tx = this.bandit.x;
    const ty = this.bandit.y;
    // 畫一條從 (sx,sy) 到 (tx,ty) 的閃光線
    const line = this.add.graphics().setDepth(15);
    line.lineStyle(3, 0xffd166, 0.9);
    line.lineBetween(sx, sy, tx, ty);
    this.time.delayedCall(80, () => line.destroy());
    // 即時命中判定（不等動畫）
    if (this.banditState !== "hidden" && this.banditState !== "hit") {
      this.onBanditHit();
    }
  }

  private onBanditHit() {
    if (!this.bandit) return;
    this.banditHits++;
    this.banditState = "hit";
    // 切到通緝犯中彈 sprite
    if (this.textures.exists("ph_bandit_hit")) {
      this.bandit.setTexture("ph_bandit_hit");
      // 用 LAYOUT bandit_hit 的尺寸 + 位置（與編輯器一致）
      const hitLayout = (LAYOUT_SPRITES as any).bandit_hit;
      if (hitLayout) {
        const px = spritePx(hitLayout);
        const cy = hitLayout.anchor === "bottom" ? px.y - px.h / 2 : px.y;
        this.applyLayoutSize(this.bandit, "bandit_hit");
        this.bandit.setPosition(px.x, cy);
      }
    }
    this.duelPaused = true;
    this.flashCenter("命中！", "#ffff66");
    this.cameras.main.shake(80, 0.005);
    // 通緝犯中彈：場景凍結，等 boss4 音樂播完才恢復
    this.freezeUntilSfx("sfx_boss4", 0.7);

    // LCD 風：中彈不揮舞，直接停在 hit pose，靠音效 + freeze 表達

    if (this.banditHits >= PARAMS.duelBanditHits) {
      const dead = this.bandit;
      this.bandit = undefined;
      // LCD 風：通緝犯倒地 sprite 直接顯示，700ms 後直接消失
      this.time.delayedCall(700, () => dead.destroy());
      this.score += SCORE.banditKill;
      this.refreshHUD();
      this.time.delayedCall(900, () => {
        this.flashCenter("STAGE CLEAR!", "#7af07a");
        this.playSfx("sfx_stage", 0.6);
        this.time.delayedCall(900, () => this.advanceStage());
      });
    } else {
      // LCD 風：中槍反應結束後直接躲回吧台
      this.time.delayedCall(900, () => {
        if (!this.bandit) return;
        this.bandit.clearTint();
        this.bandit.setAngle(0);
        this.bandit.setY(this.banditBaseY);
        this.bandit.setAlpha(0.25);
        this.banditState = "hidden";
        this.nextBanditEventAt = this.time.now + 700 + Math.random() * 500;
        this.duelPaused = false;
      });
    }
  }

  // 通緝犯對決週期：
  //   hidden → peek1（高處試探） → peek2（低處試探） → aim（舉槍） → fired（開槍） → hidden
  // 玩家可在 peek1/peek2/aim 任一可見狀態擊中通緝犯
  private tickDuel(now: number) {
    if (!this.bandit) return;
    if (this.duelPaused) return;
    if (this.banditState === "hit") return;  // 中槍反應期間不推進狀態
    if (now < this.nextBanditEventAt) return;

    const baseY = this.banditBaseY;
    const fireDelay = Math.max(450, 1300 - this.level * 70);

    const setBanditTex = (key: string) => {
      if (!this.bandit || !this.textures.exists(key)) return;
      this.bandit.setTexture(key);
      const size = ASSET_SIZE[key];
      if (size) this.bandit.setDisplaySize(size.w, size.h);
    };

    // LCD 風：通緝犯只切貼圖 + 透明度，位置永遠在 ZONE_X[0]（y 從 LAYOUT 取）
    const setPose = (poseKey: string, texKey: string, alpha: number) => {
      if (!this.bandit) return;
      const lay = (LAYOUT_SPRITES as any)[poseKey];
      if (!lay) return;
      const px = spritePx(lay);
      const cy = lay.anchor === "bottom" ? px.y - px.h / 2 : px.y;
      setBanditTex(texKey);
      this.applyLayoutSize(this.bandit, poseKey);
      this.bandit.setPosition(ZONE_X[0], cy);  // x 強制對齊 ZONE_X[0]
      this.bandit.setAlpha(alpha);
    };

    // 3 狀態循環：hidden → peek → fired → hidden
    if (this.banditState === "hidden") {
      this.banditState = "peek";
      this.bandit.clearTint();
      setPose("bandit_peek", "ph_bandit_peek", 1);
      this.playSfx("sfx_boss2", 0.5);  // 通緝犯刺探
      this.nextBanditEventAt = now + fireDelay;  // peek 暴露時間（玩家可射）
    } else if (this.banditState === "peek") {
      this.banditState = "fired";
      setPose("bandit_fire", "ph_bandit_fire", 1);
      this.banditFireBullet();
      this.nextBanditEventAt = now + 800;
    } else if (this.banditState === "fired") {
      this.banditState = "hidden";
      setPose("bandit_hide", "ph_bandit_hide", 0.3);
      this.nextBanditEventAt = now + 800 + Math.random() * 400;
    }
  }

  private banditFireBullet() {
    if (!this.bandit) return;
    this.playSfx("sfx_boss3", 0.6);  // 通緝犯開槍

    // LCD 風：子彈從 ZONE_X[0] → [1] → [2] → ... → [6]，每格 150ms 瞬移
    // 玩家在這 1050ms 間需要保持躲藏才不會中彈
    const startY = this.bandit.y;
    const endY = this.rowPlayerY;
    const b = this.mkSprite(ZONE_X[0], startY, "ph_bbullet", 15);
    const totalSteps = 6;  // 0 → 6 共 6 段
    const stepMs = 150;
    for (let i = 1; i <= totalSteps; i++) {
      const t = i / totalSteps;
      const x = ZONE_X[i];
      const y = startY + (endY - startY) * t;
      this.time.delayedCall(stepMs * i, () => {
        if (b.active) b.setPosition(x, y);
      });
    }
    // 抵達結算
    this.time.delayedCall(stepMs * totalSteps + 50, () => {
      if (b.active) b.destroy();
      if (this.phase !== "duel") return;
      if (this.playerDuelState === "expose") {
        this.duelPaused = true;
        this.flashCenter("中彈！", "#ff3030");
        this.takeHit();
        this.time.delayedCall(700, () => { this.duelPaused = false; });
      } else if (this.coverHp > 0) {
        this.coverHp -= 1;
        this.updateCoverSprite();
        this.cameras.main.shake(120, 0.008);
        this.duelPaused = true;
        this.flashCenter("桌子中彈！", "#ff8866");
        this.time.delayedCall(700, () => { this.duelPaused = false; });
      } else {
        this.duelPaused = true;
        this.takeHit();
        this.time.delayedCall(700, () => { this.duelPaused = false; });
      }
    });
  }

  private advanceStage() {
    // 清掉殘餘桌子木板與通緝犯
    this.coverPlanks.forEach(p => p.destroy());
    this.coverPlanks = [];
    this.coverSprite?.destroy();
    this.coverSprite = undefined;
    this.coverHp = 0;
    if (this.bandit) { this.bandit.destroy(); this.bandit = undefined; }

    // 夫婦恢復
    this.couple.manSprite.setAlpha(1);
    this.couple.womanSprite.setAlpha(1);
    this.couple.nextManCheck = this.time.now + 3000;
    this.couple.nextWomanCheck = this.time.now + 4000;

    this.stage += 1;
    if (this.stage > 3) {
      this.stage = 1;
      this.level += 1;
      if (this.level > 10) {
        this.flashCenter("ALL CLEAR!", "#ffd700");
        this.playSfx("sfx_stage", 0.8);
        this.phase = "over";
        this.time.delayedCall(1500, () => this.scene.start("GameOver", { score: this.score, level: this.level, stage: 3 }));
        return;
      }
      this.flashCenter(`LEVEL ${this.level}`, "#ffd166");
      this.playSfx("sfx_level", 0.7);
    } else {
      this.flashCenter(`STAGE ${this.stage}`, "#ffd166");
    }
    this.hits = 0;
    this.playerZone = 2;
    this.player.setX(ZONE_X[2]);
    this.phase = "play";
    // 對決結束回到一般時刻，重新啟動 step BGM
    this.startStepBgm();
    this.refreshHUD();
  }

  // === 視覺效果 ===
  private smash(x: number, y: number, color: number) {
    for (let i = 0; i < 5; i++) {
      const p = this.add.rectangle(x, y, 6, 6, color).setDepth(18);
      const ang = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * 25;
      this.tweens.add({
        targets: p, x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r, alpha: 0,
        duration: 380, onComplete: () => p.destroy()
      });
    }
  }
  private explode(x: number, y: number, withSound: boolean = true) {
    const c = this.add.circle(x, y, 8, 0xff5722).setDepth(18);
    this.tweens.add({ targets: c, scale: 5, alpha: 0, duration: 350, onComplete: () => c.destroy() });
    this.cameras.main.shake(150, 0.01);
    if (withSound) this.playSfx("sfx_bomb", 0.7);
  }
  private flashCenter(msg: string, color: string) {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, msg, {
      fontSize: "28px", color, fontFamily: "Impact, sans-serif", stroke: "#000", strokeThickness: 4
    }).setOrigin(0.5).setDepth(150);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, duration: 800, onComplete: () => t.destroy() });
  }

  // === 主迴圈 ===
  override update() {
    if (this.phase === "over") return;
    if (this.frozen) return;  // 中彈凍結期間整個遊戲邏輯不推進
    const now = this.time.now;

    if (this.phase === "play") {
      // 酒保 spawn
      if (now >= this.barman.nextSpawnAt) {
        this.spawnDeliveredItem();
        const diff = levelDiff(this.level);
        this.barman.nextSpawnAt = now + diff.itemSpawnMs * (0.7 + Math.random() * 0.6);
      }
      this.stepItems(now);
      this.tickCouple(now);
      this.tickProjectiles(now);

      // 第 3 關 ground bomb 倒數
      for (const b of [...this.groundBombs]) {
        if (now >= b.fuseEndAt) {
          this.explode(b.sprite.x, b.sprite.y);
          b.sprite.destroy();
          const i = this.groundBombs.indexOf(b);
          if (i >= 0) this.groundBombs.splice(i, 1);
          this.takeHit();
        }
      }
    } else if (this.phase === "duel") {
      this.tickDuel(now);
    }

    this.debugText.setText(
      `phase=${this.phase} zone=${this.playerZone} items=${this.items.length} proj=${this.projectiles.length} L${this.level}-${this.stage}`
    );
  }
}
