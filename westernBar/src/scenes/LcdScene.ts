// LCD 純玩法場景（slot/actor 架構）
// 啟用方式：URL 加 ?scene=lcd
//
// 設計：完全 LCD 風格 — 每個 actor 只顯示當前 slot，無 tween，每拍瞬移一格。
import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { SLOTS, ACTORS, makeActor, actorCurrentSlot, actorAdvance, slotPx, type ActorState } from "./LCD_LAYOUT";

// 拍速（ms）
const TICK_MS = 1400;
// 各軌道拍速錯開 — 創造重疊機會（三軌不同步、會出現同 column 疊起來的瞬間）
const TRACK_TICK_MS: Record<string, number> = {
  plate:    900,   // 上方軌道：最快
  bottle:  1200,   // 中層：中速
  cup:     1550,   // 下層：最慢
  dynamite: 700,   // 沖天炮（飛行較快）
};

type ItemKind = "cup" | "bottle" | "plate" | "dynamite";

type ActiveItem = {
  actor: ActorState;
  sprite: Phaser.GameObjects.Sprite;
  kind: ItemKind;
  nextTickAt: number;
  broken?: boolean;   // 擊碎中：下一拍才移除
};

type Phase = "intro" | "play" | "duel" | "over";

export class LcdScene extends Phaser.Scene {
  private phase: Phase = "intro";
  private playerZone = 4;   // 1..4，警長 zone
  private playerSprite!: Phaser.GameObjects.Sprite;
  private items: ActiveItem[] = [];
  private nextTickAt = 0;
  private nextSpawnAt = 0;
  // 每軌獨立 spawn 計時（同一軌一次只允許 1 個）
  private trackNextSpawnAt: Record<string, number> = { cup: 0, bottle: 0, plate: 0 };
  private lives = 3;
  private score = 0;
  private hits = 0;  // 累積擊中物品數，達標進對決
  private hitsToDuel = 12;
  private hudText!: Phaser.GameObjects.Text;
  private bulletFlash?: Phaser.GameObjects.Line;
  private gunDebug = false;

  // === 夫妻 ===
  private husbandSprite!: Phaser.GameObjects.Sprite;
  private wifeSprite!: Phaser.GameObjects.Sprite;
  private husbandState: "eat" | "alert" | "throw" = "eat";
  private wifeState: "eat" | "alert" | "throw" = "eat";
  private husbandNextAt = 0;
  private wifeNextAt = 0;
  // 投擲中的暗器 actor（origin → wp1 → wp2 → 命中或落空）
  private projectiles: Array<{ actor: ActorState; sprite: Phaser.GameObjects.Sprite; targetZone: number; landed?: boolean }> = [];

  // === 對決 ===
  private banditSprite?: Phaser.GameObjects.Sprite;
  private coverSprite?: Phaser.GameObjects.Sprite;
  private banditState: "hide" | "peek" | "fire" = "hide";
  private banditNextAt = 0;
  private banditHits = 0;
  private coverHp = 3;
  private duelSheriffExposed = false;
  private banditFireTimer?: Phaser.Time.TimerEvent;
  private banditFireWindowOpen = false;
  private duelReady = false;  // boss1 音樂播完 + 警長就位後才可以開槍
  private banditTimer?: Phaser.Time.TimerEvent;  // 隨機週期的下一動作
  private duelPaused = false;  // 中槍音樂播放期間暫停
  private doorSprite?: Phaser.GameObjects.Sprite;

  // === 編輯模式 ===
  private editMode = false;
  private editLayer?: Phaser.GameObjects.Container;
  private editHandles = new Map<string, Phaser.GameObjects.Rectangle>();
  private editLabels = new Map<string, Phaser.GameObjects.Text>();
  private editSelectedKey: string | null = null;
  private editHud?: Phaser.GameObjects.Text;
  private editSelHud?: Phaser.GameObjects.Text;

  // 音效
  private stepBgmIndex = 0;
  private stepTimer?: Phaser.Time.TimerEvent;
  private stepBgmActive = false;

  constructor() { super("Lcd"); }

  // === 音效 ===
  private isMuted(): boolean { return localStorage.getItem("wb_mute") === "1"; }
  private playSfx(key: string, volume = 0.6) {
    if (this.isMuted()) return;
    if (!this.cache.audio.exists(key)) return;
    try { this.sound.play(key, { volume }); } catch (_) {}
  }
  /** 給需要 onComplete 的場合：靜音時回傳 fake sound，立即觸發 onComplete */
  private addSfx(key: string, opts: { volume?: number } = {}) {
    if (this.isMuted() || !this.cache.audio.exists(key)) {
      const fake: any = {
        play: () => fake,
        once: (_ev: string, cb: () => void) => { setTimeout(cb, 200); return fake; },
        duration: 0.2,  // 200ms 假時長，避免外層 fallback timer 等太久
      };
      return fake;
    }
    return this.sound.add(key, opts);
  }
  /** step1→step2→step3→step4 循環當 BGM */
  private startStepBgm() {
    if (this.stepBgmActive) return;
    this.stepBgmActive = true;
    this.stepBgmIndex = 0;
    const playNext = () => {
      if (!this.stepBgmActive) return;
      const key = `sfx_step${(this.stepBgmIndex % 4) + 1}`;
      this.stepBgmIndex++;
      this.playSfx(key, 0.45);
      this.stepTimer = this.time.delayedCall(1500, playNext);
    };
    playNext();
  }
  private stopStepBgm() {
    this.stepBgmActive = false;
    if (this.stepTimer) { this.stepTimer.remove(false); this.stepTimer = undefined; }
  }

  create() {
    this.drawBackdrop();
    this.drawStaticProps();

    // 警長初始位置：zone 4（最右），準備開場遊行
    this.phase = "intro";
    this.playerZone = 4;
    const initSlot = ACTORS.sheriff_walk.slots[3];  // action4
    const p = slotPx(initSlot)!;
    this.playerSprite = this.add.sprite(p.x, p.cy, this.texKeyForSlot(initSlot)).setDepth(15);
    this.fitSprite(this.playerSprite, p.w, p.h);

    // 夫妻初始：坐在中間桌子吃飯
    const hp = slotPx("husband/1")!;
    this.husbandSprite = this.add.sprite(hp.x, hp.cy, this.texKeyForSlot("husband/1")).setDepth(7);
    this.fitSprite(this.husbandSprite, hp.w, hp.h);
    const wp = slotPx("wife/1")!;
    this.wifeSprite = this.add.sprite(wp.x, wp.cy, this.texKeyForSlot("wife/1")).setDepth(7);
    this.fitSprite(this.wifeSprite, wp.w, wp.h);

    this.hudText = this.add.text(10, 10, "", { fontSize: "16px", color: "#222", fontFamily: "monospace" }).setDepth(100);
    this.refreshHud();
    this.createMuteButton();
    this.createDevPanel();

    // 輸入（intro 期間 disable）
    const kb = this.input.keyboard!;
    kb.on("keydown-LEFT",  () => { if (this.phase === "play") this.movePlayer(-1); });
    kb.on("keydown-RIGHT", () => { if (this.phase === "play") this.movePlayer(+1); });
    const handleFire = () => {
      if (this.phase === "play") this.fire();
      else if (this.phase === "duel") {
        // 對決期間：音樂未播完 / 中槍暫停中 / 已暴露 → 全部封鎖
        if (!this.duelReady || this.duelPaused || this.duelSheriffExposed) return;
        this.duelFire();
      }
    };
    kb.on("keydown-SPACE", handleFire);
    kb.on("keydown-F",     handleFire);
    // 測試：按 D 直接進對決
    kb.on("keydown-D", () => { if (this.phase === "play") this.enterDuel(); });
    // 編輯模式：E 切換
    kb.on("keydown-E", () => this.toggleEditMode());
    // 槍口 debug：G 切換（紅點顯示子彈起點）
    kb.on("keydown-G", () => { this.gunDebug = !this.gunDebug; console.log("gunDebug =", this.gunDebug); });
    kb.on("keydown-DELETE", () => this.exportLayoutJson());
    kb.on("keydown-S", (ev: KeyboardEvent) => { if (ev.shiftKey && this.editMode) this.exportLayoutJson(); });

    // 開場序列：警長 zone 4 → 3 → 2 → 1 → 0 → 2，停在 2 開兩槍，然後 play
    this.runIntro();
  }

  // === 開場序列 ===

  private runIntro() {
    // 開場音樂 — 用 complete 事件等播完才開兩槍 + 開遊戲
    let walkDone = false;
    let openingDone = false;
    const checkBoth = () => {
      if (walkDone && openingDone) this.introFireTwoShots();
    };

    if (this.cache.audio.exists("sfx_opening")) {
      try {
        const s = this.addSfx("sfx_opening", { volume: 0.6 });
        s.once("complete", () => { openingDone = true; checkBoth(); });
        s.play();
        // 用實際 duration + 500ms 當保險
        const durMs = (s.duration && s.duration > 0) ? s.duration * 1000 + 500 : 8000;
        this.time.delayedCall(durMs, () => { if (!openingDone) { openingDone = true; checkBoth(); } });
      } catch (_) {
        openingDone = true;
      }
    } else {
      openingDone = true;
    }

    const STEP = 350;  // 每步停留 ms
    const path: number[] = [4, 3, 2, 1, 0, 1, 2];
    let i = 0;
    const step = () => {
      if (i >= path.length) {
        // 走完了 — 但要等開場音樂也播完才開兩槍
        walkDone = true;
        checkBoth();
        return;
      }
      this.setPlayerZone(path[i]);
      this.playSfx("sfx_beep", 0.3);  // 走路腳步聲
      i++;
      this.time.delayedCall(STEP, step);
    };
    step();
  }

  /** intro 用：可以走 zone 0（MISS 位置）、不只 1-4 */
  private setPlayerZone(zone: number) {
    this.playerZone = zone;
    // zone 0 用 sheriff/action0 slot（站 MISS 位置），1-4 用 action1-4
    const slotKey = zone === 0 ? "sheriff/action0" : ACTORS.sheriff_walk.slots[zone - 1];
    this.renderActor(this.playerSprite, slotKey);
  }

  private introFireTwoShots() {
    this.fire(/* introMode */ true);
    this.time.delayedCall(400, () => this.fire(true));
    this.time.delayedCall(900, () => {
      // 切到 play 模式 + 開始背景音樂
      this.phase = "play";
      this.nextTickAt = this.time.now + TICK_MS;
      this.nextSpawnAt = this.time.now + 500;
      this.startStepBgm();
    });
  }

  override update(_t: number, _dt: number) {
    const now = this.time.now;

    if (this.phase === "play") {
      // 每個物品依自己的 nextTickAt 推進（不同軌道速度不同）
      this.tickActors(now);
      // 夫婦邏輯與暗器仍用統一節拍
      if (now >= this.nextTickAt) {
        this.tickCouple(now);
        this.tickProjectiles();
        this.nextTickAt = now + TICK_MS;
      }
      this.maybeSpawnTrack("cup");
      this.maybeSpawnTrack("bottle");
      this.maybeSpawnTrack("plate");
    }
    // 對決週期改用 scheduleBanditAction 隨機延遲，不在 update 裡跑
  }

  // === 渲染輔助 ===

  /** slot key → 新版 LCD 剪影 texture key（lcd_*）
   *  彩色版沒載入時自動 fallback 到黑剪影版（lcd_sil_*）*/
  private resolveTex(colorKey: string, silhouetteKey: string): string {
    return this.textures.exists(colorKey) ? colorKey : silhouetteKey;
  }

  private texKeyForSlot(slotKey: string): string {
    // 警長
    if (slotKey.startsWith("sheriff/")) {
      const pose = slotKey.split("/")[1];
      const colorMap: Record<string, string> = {
        action0: "lcd_sheriff_action0",
        action1: "lcd_sheriff_walk_1",
        action2: "lcd_sheriff_walk_2",
        action3: "lcd_sheriff_walk_3",
        action4: "lcd_sheriff_walk_4",
        pour:    "lcd_sheriff_pour",
        hide:    "lcd_sheriff_hide",
        fire:    "lcd_sheriff_fire",
        down:    "lcd_sheriff_down",
        duel_in: "lcd_sheriff_duel_in",
      };
      const silMap: Record<string, string> = {
        action0: "lcd_sil_sheriff_walk_1",
        action1: "lcd_sil_sheriff_walk_1",
        action2: "lcd_sil_sheriff_walk_2",
        action3: "lcd_sil_sheriff_walk_3",
        action4: "lcd_sil_sheriff_walk_4",
        pour:    "lcd_sil_sheriff_pour",
        hide:    "lcd_sil_sheriff_hide",
        fire:    "lcd_sil_sheriff_fire",
        down:    "lcd_sil_sheriff_down",
        duel_in: "lcd_sil_sheriff_walk_4",
      };
      return this.resolveTex(colorMap[pose] || "__missing__", silMap[pose] || "__missing__");
    }
    // 通緝犯
    if (slotKey.startsWith("bandit/")) {
      const p = slotKey.split("/")[1];
      return this.resolveTex(`lcd_bandit_${p}`, `lcd_sil_bandit_${p}`);
    }
    // 門
    if (slotKey === "door/open")   return this.resolveTex("lcd_door_open",   "lcd_sil_door_open");
    if (slotKey === "door/closed") return this.resolveTex("lcd_door_closed", "lcd_sil_door_closed");
    // 掩體
    if (slotKey === "cover/intact")    return this.resolveTex("lcd_cover_intact",    "lcd_sil_cover_intact");
    if (slotKey === "cover/damaged")   return this.resolveTex("lcd_cover_damaged",   "lcd_sil_cover_damaged");
    if (slotKey === "cover/destroyed") return this.resolveTex("lcd_cover_destroyed", "lcd_sil_cover_destroyed");
    // 物品
    if (slotKey.startsWith("cup/"))    return this.resolveTex("lcd_cup_intact",    "lcd_sil_cup_intact");
    if (slotKey.startsWith("bottle/")) return this.resolveTex("lcd_bottle_intact", "lcd_sil_bottle_intact");
    if (slotKey.startsWith("plate/"))  return this.resolveTex("lcd_plate_intact",  "lcd_sil_plate_intact");
    // 沖天炮
    if (slotKey.startsWith("dyn/"))    return this.resolveTex("lcd_dynamite", "lcd_sil_dynamite");
    // 投擲物
    if (slotKey.startsWith("ash/"))    return this.resolveTex("lcd_ashtray", "lcd_sil_ashtray");
    if (slotKey.startsWith("apple/"))  return this.resolveTex("lcd_apple",   "lcd_sil_apple");
    // 夫妻
    if (slotKey.startsWith("husband/")) {
      const n = slotKey.split("/")[1];
      const role = n === "1" ? "eat" : n === "2" ? "alert" : "throw";
      return this.resolveTex(`lcd_husband_${role}`, `lcd_sil_husband_${role}`);
    }
    if (slotKey.startsWith("wife/")) {
      const n = slotKey.split("/")[1];
      const role = n === "1" ? "eat" : n === "2" ? "alert" : "throw";
      return this.resolveTex(`lcd_wife_${role}`, `lcd_sil_wife_${role}`);
    }
    // 爆炸
    if (slotKey === "explosion") return this.resolveTex("lcd_explosion", "lcd_sil_explosion");
    // 酒保
    if (slotKey === "barman/idle")  return this.resolveTex("lcd_barman_idle",  "lcd_sil_barman_idle");
    if (slotKey === "barman/slide") return this.resolveTex("lcd_barman_slide", "lcd_sil_barman_slide");
    // 桌椅木桶
    if (slotKey === "couple_table") return "lcd_couple_table";
    if (slotKey === "chair_left")   return "lcd_chair_left";
    if (slotKey === "chair_right")  return "lcd_chair_right";
    if (slotKey === "barrel")       return "lcd_barrel";
    return "__missing__";
  }

  private fitSprite(spr: Phaser.GameObjects.Sprite, boxW: number, boxH: number) {
    const tex = spr.texture;
    const src: any = tex.source[0];
    const natW = src?.width || boxW;
    const natH = src?.height || boxH;
    if (natW <= 0 || natH <= 0) { spr.setDisplaySize(boxW, boxH); return; }
    const k = Math.min(boxW / natW, boxH / natH);
    spr.setDisplaySize(natW * k, natH * k);
  }

  /** 把 sprite 切到指定 slot 的貼圖 + 位置 + 大小 */
  private renderActor(spr: Phaser.GameObjects.Sprite, slotKey: string) {
    const p = slotPx(slotKey);
    if (!p) { spr.setVisible(false); return; }
    spr.setVisible(true);
    spr.setTexture(this.texKeyForSlot(slotKey));
    spr.setPosition(p.x, p.cy);
    this.fitSprite(spr, p.w, p.h);
  }

  // === 背景 ===

  private drawStaticProps() {
    // depth 層級（由低到高）：
    //   bg -10 / 椅子 5 / 夫妻 bandit 7 / item 7-9 / 桌子 木桶 12 / 警長 15 / cover 14 / HUD 100
    // 桌椅木桶（depth 14：高過夫婦和 boss）
    const propsHigh: Record<string, number> = {
      couple_table: 14,
      barrel:       14,
      chair_left:   5,
      chair_right:  5,
      "barman/idle": 6,
    };
    for (const [key, depth] of Object.entries(propsHigh)) {
      const p = slotPx(key); if (!p) continue;
      const tex = this.texKeyForSlot(key);
      if (tex === "__missing__" || !this.textures.exists(tex)) continue;
      const spr = this.add.sprite(p.x, p.cy, tex).setDepth(depth);
      this.fitSprite(spr, p.w, p.h);
    }
  }

  private drawBackdrop() {
    this.cameras.main.setBackgroundColor("#1a1410");
    // 用 codex 生的 3D 場景背景圖直接鋪滿
    if (this.textures.exists("lcd_background")) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "lcd_background")
        .setDepth(-10);
      // 等比縮放鋪滿（cover）
      const tex = this.textures.get("lcd_background").getSourceImage() as HTMLImageElement;
      const tw = tex.width || GAME_WIDTH;
      const th = tex.height || GAME_HEIGHT;
      const scale = Math.max(GAME_WIDTH / tw, GAME_HEIGHT / th);
      bg.setScale(scale);
    } else {
      this.cameras.main.setBackgroundColor("#a8b4a0");
    }
  }

  // === 玩家 ===

  private movePlayer(dir: number) {
    // 玩家 zone：1..4，按右到 4 還再右 → 切到 5 (pour 倒酒姿勢)
    const next = Phaser.Math.Clamp(this.playerZone + dir, 1, 5);
    if (next === this.playerZone) return;
    this.playerZone = next;
    // zone 5 = pour（倒酒姿勢），其他 1-4 = walk_1..4
    const slot = this.playerZone === 5 ? "sheriff/pour" : ACTORS.sheriff_walk.slots[this.playerZone - 1];
    this.renderActor(this.playerSprite, slot);
  }

  private fire(introMode = false) {
    // 槍口位置（從當前 pose 的 gunOffset 算）
    const zoneIdx = Math.max(1, Math.min(4, this.playerZone)) - 1;
    const slot = ACTORS.sheriff_walk.slots[zoneIdx];
    const p = slotPx(slot)!;
    const dx = p.slot.gunOffsetX ?? -0.30;
    const dy = p.slot.gunOffsetY ?? -0.50;
    const gx = p.x + dx * this.playerSprite.displayWidth;
    const gy = p.cy + dy * this.playerSprite.displayHeight;

    // 子彈 = 從槍口往上的閃光線（無 tween，瞬間消失）
    this.bulletFlash?.destroy();
    this.bulletFlash = this.add.line(0, 0, gx, gy, gx, 0, 0xffffff, 1).setOrigin(0, 0).setLineWidth(2).setDepth(20);
    this.time.delayedCall(100, () => { this.bulletFlash?.destroy(); this.bulletFlash = undefined; });
    // Debug: 槍口位置紅點（按 G 切換）
    if (this.gunDebug) {
      const dot = this.add.circle(gx, gy, 5, 0xff0000).setDepth(30);
      this.time.delayedCall(600, () => dot.destroy());
    }
    this.playSfx("sfx_fire", 0.5);

    if (introMode) return;  // intro 的兩聲只是視覺，無命中判定

    // 命中判定：子彈 x = gx；任何 item 當前 slot 的 x 在 ±tolerance 內 + 在玩家上方 = 命中
    const tolerance = 0.06 * GAME_WIDTH;
    let hits = 0;
    for (const it of [...this.items]) {
      const currentSlot = actorCurrentSlot(it.actor);
      if (!currentSlot) continue;
      const sp = slotPx(currentSlot);
      if (!sp) continue;
      if (Math.abs(sp.x - gx) <= tolerance && sp.y < p.cy - 30) {
        // 命中
        if (it.kind === "dynamite") {
          this.explodeAt(sp.x, sp.y);
          this.removeItem(it);
          this.lives--;
          this.refreshHud();
          continue;
        }
        const hitSfx = it.kind === "cup" ? "sfx_hit1"
                     : it.kind === "bottle" ? "sfx_hit2"
                     : it.kind === "plate" ? "sfx_hit3" : null;
        if (hitSfx) this.playSfx(hitSfx, 0.6);
        this.score += 10;
        this.hits++;
        // 不立刻移除：換成擊碎紋理，下一拍再消失
        if (!it.broken) {
          it.broken = true;
          const brokenKey = it.kind === "cup" ? this.resolveTex("lcd_cup_broken", "lcd_sil_cup_broken")
                          : it.kind === "bottle" ? this.resolveTex("lcd_bottle_broken", "lcd_sil_bottle_broken")
                          : it.kind === "plate" ? this.resolveTex("lcd_plate_broken", "lcd_sil_plate_broken")
                          : null;
          if (brokenKey && this.textures.exists(brokenKey)) {
            it.sprite.setTexture(brokenKey);
            this.fitSprite(it.sprite, sp.w * 1.3, sp.h * 1.3);
          }
        }
        hits++;
      }
    }
    if (hits >= 2) this.score += 30;
    if (hits > 0) {
      this.refreshHud();
      if (this.hits >= this.hitsToDuel) this.enterDuel();
    }
  }

  private explodeAt(x: number, y: number) {
    const c = this.add.circle(x, y, 8, 0x000000).setDepth(30);
    this.time.delayedCall(300, () => c.destroy());
    this.playSfx("sfx_bomb", 0.7);
  }

  // ========== 夫妻 ==========

  private setCoupleSprite(who: "husband" | "wife", state: "eat" | "alert" | "throw") {
    const slotKey = `${who}/${state === "eat" ? 1 : state === "alert" ? 2 : 3}`;
    const spr = who === "husband" ? this.husbandSprite : this.wifeSprite;
    this.renderActor(spr, slotKey);
    // 生氣站立 → 退到椅子後面（depth 4 < 椅子 5）；吃飯/投擲 → 椅子前 (7)
    spr.setDepth(state === "alert" ? 4 : 7);
    if (who === "husband") this.husbandState = state;
    else this.wifeState = state;
  }

  private tickCouple(now: number) {
    // 隨機發怒：每 ~3-5 拍檢查一次
    if (now >= this.husbandNextAt) {
      this.cycleCoupleMember("husband");
      this.husbandNextAt = now + (3000 + Math.random() * 3000);
    }
    if (now >= this.wifeNextAt) {
      this.cycleCoupleMember("wife");
      this.wifeNextAt = now + (3500 + Math.random() * 3500);
    }
  }

  private cycleCoupleMember(who: "husband" | "wife") {
    const state = who === "husband" ? this.husbandState : this.wifeState;
    if (state === "eat") {
      // 60% 機率不動，40% 進警戒
      if (Math.random() < 0.4) this.setCoupleSprite(who, "alert");
    } else if (state === "alert") {
      // 警戒 → 投擲（再 1 拍）
      this.setCoupleSprite(who, "throw");
      this.spawnCoupleProjectile(who);
      // 投完回吃飯
      this.time.delayedCall(TICK_MS, () => this.setCoupleSprite(who, "eat"));
    }
  }

  private spawnCoupleProjectile(who: "husband" | "wife") {
    // 男人丟煙灰缸到 z1/z2，女人丟蘋果到 z3/z4
    const target = who === "husband" ? (Math.random() < 0.5 ? 1 : 2) : (Math.random() < 0.5 ? 3 : 4);
    const actorKey = who === "husband" ? `ash_to_z${target}` : `apple_to_z${target}`;
    const actor = makeActor(actorKey);
    const slot = actorCurrentSlot(actor)!;
    const p = slotPx(slot)!;
    const sprite = this.add.sprite(p.x, p.cy, this.texKeyForSlot(slot)).setDepth(9);
    this.fitSprite(sprite, p.w, p.h);
    this.projectiles.push({ actor, sprite, targetZone: target });
    this.playSfx("sfx_beep", 0.4);
  }

  private tickProjectiles() {
    for (const p of [...this.projectiles]) {
      // 已落地：再下一拍才判定 — 給玩家一拍的反應時間逃離 target zone
      if (p.landed) {
        if (this.playerZone === p.targetZone) {
          this.lives--;
          this.refreshHud();
          this.explodeAt(p.sprite.x, p.sprite.y);
        }
        p.sprite.destroy();
        const i = this.projectiles.indexOf(p);
        if (i >= 0) this.projectiles.splice(i, 1);
        continue;
      }
      const status = actorAdvance(p.actor);
      const slot = actorCurrentSlot(p.actor);
      if (status === "ended") {
        // 飛到最後落點 slot — 標記 landed，sprite 停在原地，下一拍才判定
        p.landed = true;
        continue;
      }
      this.renderActor(p.sprite, slot!);
    }
  }

  // ========== 對決 ==========

  private enterDuel() {
    this.phase = "duel";
    this.duelReady = false;
    this.duelPaused = false;
    this.stopStepBgm();

    // 清掉場上物品 / 投擲物
    for (const it of this.items) it.sprite.destroy();
    this.items = [];
    for (const p of this.projectiles) p.sprite.destroy();
    this.projectiles = [];

    // 對決期間夫妻消失（躲到桌下不出場）
    this.husbandSprite.setVisible(false);
    this.wifeSprite.setVisible(false);

    // 警長 duel_in（走向掩體）→ hide
    this.renderActor(this.playerSprite, "sheriff/duel_in");
    this.duelSheriffExposed = false;
    this.time.delayedCall(800, () => {
      if (this.phase === "duel") this.renderActor(this.playerSprite, "sheriff/hide");
    });

    // 掩體出場（intact）
    this.coverHp = 3;
    const cp = slotPx("cover/intact")!;
    this.coverSprite = this.add.sprite(cp.x, cp.cy, this.texKeyForSlot("cover/intact")).setDepth(17);
    this.fitSprite(this.coverSprite, cp.w, cp.h);

    // === 彈簧門開兩次震盪 ===
    const dp = slotPx("door/open")!;
    this.doorSprite = this.add.sprite(dp.x, dp.cy, this.texKeyForSlot("door/open")).setDepth(7);
    this.fitSprite(this.doorSprite, dp.w, dp.h);
    const swing = (slotKey: string) => {
      if (!this.doorSprite || this.phase !== "duel") return;
      this.renderActor(this.doorSprite, slotKey);
    };
    this.time.delayedCall(0,   () => swing("door/open"));
    this.time.delayedCall(250, () => swing("door/closed"));
    this.time.delayedCall(500, () => swing("door/open"));
    this.time.delayedCall(800, () => swing("door/closed"));

    // 通緝犯：at_door（門口出現）→ enter（短暫走入）→ 停在「等待位置」(enter pose)
    // 直到 boss1 音樂結束才切到 hide pose 並開始 cycle
    const bp = slotPx("bandit/at_door")!;
    this.banditSprite = this.add.sprite(bp.x, bp.cy, this.texKeyForSlot("bandit/at_door")).setDepth(7);
    this.fitSprite(this.banditSprite, bp.w, bp.h);
    this.banditState = "hide";
    this.banditHits = 0;

    // 850ms 後切到 enter pose — 然後就停在這個「等待位置」不動
    this.time.delayedCall(850, () => {
      if (this.banditSprite && this.phase === "duel") {
        this.renderActor(this.banditSprite, "bandit/enter");
      }
    });

    // boss1 音樂 — 用 sound complete 事件接（比估 duration 準）
    const onBossEnd = () => {
      if (this.phase !== "duel") return;
      // 進入 hide（躲到掩體後）→ 開啟對決 → 排第一次刺探
      if (this.banditSprite) {
        this.renderActor(this.banditSprite, "bandit/hide");
        this.banditState = "hide";
      }
      this.duelReady = true;
      this.scheduleBanditAction(500 + Math.random() * 500);
    };

    if (this.cache.audio.exists("sfx_boss1")) {
      try {
        const s = this.addSfx("sfx_boss1", { volume: 0.7 });
        let ended = false;
        const fire = () => { if (ended) return; ended = true; onBossEnd(); };
        s.once("complete", fire);
        s.play();
        // 保險用「實際 duration + 500ms」當 fallback
        const durMs = (s.duration && s.duration > 0) ? s.duration * 1000 + 500 : 20000;
        this.time.delayedCall(durMs, fire);
      } catch (_) {
        this.time.delayedCall(15000, onBossEnd);
      }
    } else {
      this.time.delayedCall(3000, onBossEnd);
    }

    this.refreshHud();
  }

  /** 排程通緝犯下一動作（隨機延遲）— 取代固定 tick 週期 */
  private scheduleBanditAction(delay: number) {
    this.banditTimer?.remove(false);
    this.banditTimer = this.time.delayedCall(delay, () => this.banditCycle());
  }

  /** 隨機週期：hide → peek → 隨機(再 peek / fire / 回 hide) → 開槍後又躲回去
   *  通緝犯避免在開槍位置待太久（fire pose 只停 ~400-600ms）
   */
  private banditCycle() {
    if (!this.banditSprite || this.phase !== "duel" || this.duelPaused || !this.duelReady) return;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    if (this.banditState === "hide") {
      // 從 hide → 探頭
      this.banditState = "peek";
      this.renderActor(this.banditSprite, "bandit/peek");
      this.playSfx("sfx_boss2", 0.5);
      this.scheduleBanditAction(rand(400, 800));
    } else if (this.banditState === "peek") {
      // 從 peek → 隨機決定：開槍 or 縮回去
      if (Math.random() < 0.65) {
        // 開槍
        this.banditState = "fire";
        this.renderActor(this.banditSprite, "bandit/fire");
        this.playSfx("sfx_boss3", 0.6);
        this.banditFireWindowOpen = true;
        // fire pose 只停 400-600ms（不待太久）— 超過就「開完槍」並判定警長
        const fireWindow = rand(400, 600);
        this.banditFireTimer = this.time.delayedCall(fireWindow, () => {
          this.banditFireWindowOpen = false;
          this.banditFireTimer = undefined;
          if (this.banditState === "fire" && this.phase === "duel" && !this.duelPaused) {
            this.handleBanditShot();
            // 開完槍縮回 hide，隨機延遲後下一輪
            this.banditState = "hide";
            if (this.banditSprite) this.renderActor(this.banditSprite, "bandit/hide");
            this.scheduleBanditAction(rand(600, 1400));
          }
        });
      } else {
        // 縮回 hide
        this.banditState = "hide";
        this.renderActor(this.banditSprite, "bandit/hide");
        this.scheduleBanditAction(rand(400, 1000));
      }
    }
  }

  /** 通緝犯開槍：警長暴露 → 扣命；否則打到桌子 */
  private handleBanditShot() {
    const sheriffHit = this.duelSheriffExposed || this.coverHp <= 0;
    if (sheriffHit) {
      // 警長中槍：暫停對決週期 → 播 miss 音 → 復原（桌子重置 + 警長回 hide）
      this.lives--;
      this.refreshHud();
      this.duelPaused = true;
      this.renderActor(this.playerSprite, "sheriff/down");
      // miss 音樂長度
      let missMs = 1200;
      if (this.cache.audio.exists("sfx_miss")) {
        try {
          const s = this.addSfx("sfx_miss", { volume: 0.7 });
          s.play();
          const dur = (s as any).duration;
          if (typeof dur === "number" && dur > 0) missMs = dur * 1000;
        } catch (_) {}
      }
      this.time.delayedCall(missMs + 200, () => {
        if (this.phase !== "duel") return;
        if (this.lives <= 0) return;  // GAME OVER 自動處理
        // 復原：桌子重置成 3 階段、警長回 hide
        this.coverHp = 3;
        this.updateCover("cover/intact");
        this.coverSprite?.setVisible(true);
        this.duelSheriffExposed = false;
        this.renderActor(this.playerSprite, "sheriff/hide");
        this.duelPaused = false;
        this.scheduleBanditAction(800 + Math.random() * 600);
      });
    } else {
      // 桌子幫擋一發
      this.coverHp--;
      if (this.coverHp === 2) this.updateCover("cover/damaged");
      else if (this.coverHp === 1) this.updateCover("cover/destroyed");
      else if (this.coverHp === 0) this.coverSprite?.setVisible(false);
      this.cameras.main.shake(80, 0.005);
    }
  }

  private updateCover(slotKey: string) {
    if (!this.coverSprite) return;
    const p = slotPx(slotKey)!;
    this.coverSprite.setTexture(this.texKeyForSlot(slotKey));
    this.coverSprite.setPosition(p.x, p.cy);
    this.fitSprite(this.coverSprite, p.w, p.h);
  }

  /** 對決時按 SPACE：警長跳出開槍。
   *  只有通緝犯正在 fire pose（命中窗口開啟期間）才算命中（快槍對決）。
   *  其他狀態（hide/peek）按 SPACE 也會擊發但打不到通緝犯，浪費一次跳出。
   */
  private duelFire() {
    if (this.duelSheriffExposed) return;
    if (!this.duelReady) return;
    if (this.duelPaused) return;  // 中槍音樂期間封鎖

    this.duelSheriffExposed = true;
    this.renderActor(this.playerSprite, "sheriff/fire");
    this.playSfx("sfx_fire", 0.5);

    // 子彈視覺
    const sp = slotPx("sheriff/fire")!;
    if (this.banditSprite) {
      const flash = this.add.line(0, 0, sp.x, sp.cy, this.banditSprite.x, this.banditSprite.y, 0xffffff, 1)
        .setOrigin(0, 0).setLineWidth(2).setDepth(20);
      this.time.delayedCall(120, () => flash.destroy());
    }

    // 命中判定（快槍對決）：
    //   • 必須是「通緝犯探頭完、舉槍開火」的那一瞬間（fire pose 期間）
    //   • 玩家比通緝犯【晚】開槍，但在通緝犯退回 hide 之前按 → 算擊中
    //   • 在 hide / peek 期間按 → 打空（白費一次跳出）
    if (this.banditState === "fire" && this.banditFireWindowOpen) {
      this.banditFireTimer?.remove(false);
      this.banditFireTimer = undefined;
      this.banditFireWindowOpen = false;
      this.onBanditHit();
    }

    // 跳回 hide
    this.time.delayedCall(350, () => {
      if (this.phase !== "duel") return;
      this.duelSheriffExposed = false;
      if (this.lives > 0) this.renderActor(this.playerSprite, "sheriff/hide");
    });
  }

  private onBanditHit() {
    this.banditHits++;
    if (this.banditSprite) {
      this.renderActor(this.banditSprite, "bandit/hit");
    }
    // 取消任何排程的下一個動作
    this.banditTimer?.remove(false); this.banditTimer = undefined;
    this.duelPaused = true;

    // 取得 boss4 音樂長度，播完才繼續對決
    let hitMs = 800;
    if (this.cache.audio.exists("sfx_boss4")) {
      try {
        const s = this.addSfx("sfx_boss4", { volume: 0.7 });
        s.play();
        const dur = (s as any).duration;
        if (typeof dur === "number" && dur > 0) hitMs = dur * 1000;
      } catch (_) {}
    }

    this.time.delayedCall(hitMs + 200, () => {
      if (this.phase !== "duel") return;
      if (this.banditHits >= 3) {
        this.exitDuel(true);
        return;
      }
      // 通緝犯回 hide，繼續週期
      this.banditState = "hide";
      if (this.banditSprite) this.renderActor(this.banditSprite, "bandit/hide");
      this.duelPaused = false;
      this.scheduleBanditAction(600 + Math.random() * 800);
    });
  }

  private exitDuel(won: boolean) {
    if (won) {
      // 打死通緝犯不加分（只是過關）
      this.playSfx("sfx_stage", 0.7);
    }
    this.banditFireTimer?.remove(false); this.banditFireTimer = undefined;
    this.banditTimer?.remove(false);     this.banditTimer = undefined;
    this.banditFireWindowOpen = false;
    this.duelPaused = false;
    this.duelReady = false;
    this.banditSprite?.destroy(); this.banditSprite = undefined;
    this.coverSprite?.destroy();  this.coverSprite  = undefined;
    this.doorSprite?.destroy();   this.doorSprite   = undefined;
    // 夫妻復原（重新坐回桌子吃飯）
    this.setCoupleSprite("husband", "eat");
    this.setCoupleSprite("wife", "eat");
    this.husbandSprite.setVisible(true);
    this.wifeSprite.setVisible(true);
    this.hits = 0;
    this.phase = "play";
    // 警長回到 zone 2
    this.playerZone = 2;
    this.renderActor(this.playerSprite, ACTORS.sheriff_walk.slots[1]);
    this.startStepBgm();
    this.nextTickAt = this.time.now + TICK_MS;
    this.nextSpawnAt = this.time.now + 1000;
    this.refreshHud();
  }

  // === Tick：物品推進（MISS 不扣命，靜默消失）
  //   每個物品依自己的 nextTickAt 推進 — 盤子比較快
  private tickActors(now: number) {
    for (const it of [...this.items]) {
      if (now < it.nextTickAt) continue;
      // 擊碎物：下一拍才消失（保留擊碎圖在原位置）
      if (it.broken) {
        this.removeItem(it);
        continue;
      }
      const status = actorAdvance(it.actor);
      const slot = actorCurrentSlot(it.actor);
      if (status === "ended") {
        this.removeItem(it);
        continue;
      }
      this.renderActor(it.sprite, slot!);
      it.nextTickAt = now + (TRACK_TICK_MS[it.kind] || TICK_MS);
    }
  }

  /** 檢查指定軌道是否該 spawn 新物品（每軌一次最多 1 個） */
  private maybeSpawnTrack(kind: ActiveItem["kind"]) {
    const now = this.time.now;
    if (now < (this.trackNextSpawnAt[kind] || 0)) return;
    // 軌道上已經有同類物品 → 跳過
    if (this.items.some(it => it.kind === kind)) return;
    this.spawnItem(kind);
    // 下一次 spawn 等 6-10 拍（隨機，跟軌道無關，給玩家反應時間）
    this.trackNextSpawnAt[kind] = now + TICK_MS * (6 + Math.random() * 4);
  }

  private spawnItem(forceKind?: ItemKind) {
    const kind: ItemKind = forceKind
      ?? (["cup", "bottle", "plate"] as const)[Math.floor(Math.random() * 3)];
    const actorKey = `${kind}_flow`;
    const actor = makeActor(actorKey);
    const slot = actorCurrentSlot(actor)!;
    const p = slotPx(slot)!;
    // 物品 depth：cup 最高、bottle 中、plate 最低（同 column 疊起來時前後關係正確）
    const itemDepth: Record<string, number> = { plate: 8, bottle: 9, cup: 10, dynamite: 9 };
    const sprite = this.add.sprite(p.x, p.cy, this.texKeyForSlot(slot)).setDepth(itemDepth[kind] || 8);
    this.fitSprite(sprite, p.w, p.h);
    this.items.push({
      actor, sprite, kind,
      nextTickAt: this.time.now + (TRACK_TICK_MS[kind] || TICK_MS),
    });
  }

  private removeItem(it: ActiveItem) {
    it.sprite.destroy();
    const i = this.items.indexOf(it);
    if (i >= 0) this.items.splice(i, 1);
  }

  private refreshHud() {
    this.hudText.setText(`SCORE ${this.score}    LIVES ${this.lives}    ZONE ${this.playerZone}`);
    if (this.lives <= 0 && this.phase !== "over") {
      this.phase = "over";
      this.stopStepBgm();
      this.playSfx("sfx_gameover", 0.8);
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "GAME OVER", {
        fontSize: "48px", color: "#aa3333", fontFamily: "monospace"
      }).setOrigin(0.5).setDepth(200);
    }
  }

  shutdown() {
    this.stopStepBgm();
  }

  // ========== Dev 面板（測試用按鈕）==========
  private muteBtnWidth = 0;
  /** 右上角靜音切換按鈕（localStorage 是唯一真相） */
  private createMuteButton() {
    // 同步 Phaser sound 狀態（雙保險）
    this.sound.mute = this.isMuted();

    const w = 70, h = 22;
    const rx = GAME_WIDTH - 10;
    const by = 10;
    const bg = this.add.rectangle(rx, by, w, h, 0x000000, 0.75)
      .setOrigin(1, 0)
      .setStrokeStyle(1, 0xffd166, 0.9)
      .setDepth(160)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(rx - w / 2, by + h / 2, "", {
      fontSize: "12px", color: "#ffd166", fontFamily: "monospace"
    }).setOrigin(0.5, 0.5).setDepth(161);
    // refresh 一律以 localStorage 為準
    const refresh = () => label.setText(this.isMuted() ? "🔇 靜音" : "🔊 開");
    refresh();
    const toggle = () => {
      const next = !this.isMuted();
      localStorage.setItem("wb_mute", next ? "1" : "0");
      this.sound.mute = next;
      // 同時停掉所有正在播的聲音（避免靜音時還聽得到尾巴）
      try { this.sound.stopAll(); } catch (_) {}
      refresh();
    };
    bg.on("pointerup", toggle);
    this.input.keyboard!.on("keydown-M", toggle);
    this.muteBtnWidth = w + 6;
  }

  private createDevPanel() {
    const labels: Array<[string, () => void]> = [
      ["⚔ 對決",    () => { if (this.phase === "play") this.enterDuel(); }],
      ["+1 命",     () => { this.lives++; this.refreshHud(); }],
      ["-1 命",     () => { this.lives--; this.refreshHud(); }],
      ["生 cup",    () => { if (this.phase === "play") this.spawnItem("cup"); }],
      ["生 bottle", () => { if (this.phase === "play") this.spawnItem("bottle"); }],
      ["生 plate",  () => { if (this.phase === "play") this.spawnItem("plate"); }],
      ["丈夫丟",    () => { if (this.phase === "play") this.spawnCoupleProjectile("husband"); }],
      ["妻子丟",    () => { if (this.phase === "play") this.spawnCoupleProjectile("wife"); }],
      ["重啟",      () => { this.scene.restart(); }],
    ];

    // 靜音鈕在最右邊；dev panel 從靜音鈕左側開始往左排
    let bx = GAME_WIDTH - 10 - this.muteBtnWidth;
    const by = 10;
    for (let i = labels.length - 1; i >= 0; i--) {
      const [text, fn] = labels[i];
      const btn = this.add.rectangle(bx, by, 1, 22, 0x222222, 0.7)
        .setOrigin(1, 0).setDepth(150).setInteractive({ useHandCursor: true });
      const t = this.add.text(bx - 4, by + 11, text, {
        fontSize: "11px", color: "#ffd166", fontFamily: "monospace"
      }).setOrigin(1, 0.5).setDepth(151);
      const w = t.width + 12;
      btn.setSize(w, 22);
      btn.setPosition(bx, by);
      btn.on("pointerover", () => btn.setFillStyle(0x444444, 0.9));
      btn.on("pointerout",  () => btn.setFillStyle(0x222222, 0.7));
      btn.on("pointerup", fn);
      bx -= (w + 4);
    }
  }

  // ============================================================
  // 編輯模式 — 拖拉 SLOTS 位置 + 縮放 + 匯出 JSON
  // ============================================================
  private toggleEditMode() {
    this.editMode = !this.editMode;
    if (this.editMode) this.openEditMode();
    else this.closeEditMode();
  }

  private openEditMode() {
    // 暫停遊戲節奏
    (this.time as any).paused = true;
    if (this.banditTimer) this.banditTimer.paused = true;

    this.editLayer = this.add.container(0, 0).setDepth(200);
    this.editHud = this.add.text(GAME_WIDTH / 2, 6,
      "編輯模式 ON  ｜  拖曳=移動  ｜  滾輪=縮放  ｜  ←→↑↓=微調1px  ｜  Shift+S=匯出  ｜  E=結束",
      { fontSize: "12px", color: "#fff", backgroundColor: "#000", padding: { x: 6, y: 3 } }
    ).setOrigin(0.5, 0).setDepth(220);
    this.editSelHud = this.add.text(10, GAME_HEIGHT - 22, "(未選取)",
      { fontSize: "12px", color: "#ffd166", backgroundColor: "#000", padding: { x: 6, y: 3 }, fontFamily: "monospace" }
    ).setOrigin(0, 0).setDepth(220);

    // 對每個 slot 建一個半透明可拖拉矩形 + 標籤
    for (const key of Object.keys(SLOTS)) {
      this.makeEditHandle(key);
    }

    // 滾輪縮放
    this.input.on("wheel", this.onEditWheel, this);
    // 鍵盤微調
    const kb = this.input.keyboard!;
    kb.on("keydown-LEFT",  this.onEditNudgeLeft,  this);
    kb.on("keydown-RIGHT", this.onEditNudgeRight, this);
    kb.on("keydown-UP",    this.onEditNudgeUp,    this);
    kb.on("keydown-DOWN",  this.onEditNudgeDown,  this);
  }

  private closeEditMode() {
    (this.time as any).paused = false;
    if (this.banditTimer) this.banditTimer.paused = false;
    this.editLayer?.destroy(); this.editLayer = undefined;
    this.editHud?.destroy();   this.editHud = undefined;
    this.editSelHud?.destroy(); this.editSelHud = undefined;
    this.editHandles.forEach(r => r.destroy()); this.editHandles.clear();
    this.editLabels.forEach(t => t.destroy()); this.editLabels.clear();
    this.editSelectedKey = null;
    this.input.off("wheel", this.onEditWheel, this);
    const kb = this.input.keyboard!;
    kb.off("keydown-LEFT",  this.onEditNudgeLeft,  this);
    kb.off("keydown-RIGHT", this.onEditNudgeRight, this);
    kb.off("keydown-UP",    this.onEditNudgeUp,    this);
    kb.off("keydown-DOWN",  this.onEditNudgeDown,  this);
  }

  private makeEditHandle(key: string) {
    const p = slotPx(key); if (!p) return;
    const x = p.x;
    const y = p.anchor === "bottom" ? p.y - p.h / 2 : p.y;
    const rect = this.add.rectangle(x, y, p.w, p.h, 0x00ff88, 0.15)
      .setStrokeStyle(1, 0x00ff88, 0.7)
      .setDepth(210)
      .setInteractive({ draggable: true, useHandCursor: true });
    const label = this.add.text(x, y, key, {
      fontSize: "9px", color: "#fff", backgroundColor: "#000",
      padding: { x: 2, y: 1 }, fontFamily: "monospace"
    }).setOrigin(0.5, 0.5).setDepth(211);

    rect.on("pointerdown", () => this.selectEditKey(key));
    rect.on("drag", (_pt: any, dx: number, dy: number) => {
      rect.setPosition(dx, dy);
      label.setPosition(dx, dy);
      // 更新 SLOTS 比例（x 為中心點，y 看 anchor）
      const s = SLOTS[key];
      s.x = dx / GAME_WIDTH;
      const pyPx = s.anchor === "bottom" ? (dy + s.h * GAME_HEIGHT / 2) : dy;
      s.y = pyPx / GAME_HEIGHT;
      this.refreshEditSelHud();
      this.applyLiveUpdate(key);
    });

    this.editHandles.set(key, rect);
    this.editLabels.set(key, label);
  }

  private selectEditKey(key: string) {
    if (this.editSelectedKey && this.editHandles.has(this.editSelectedKey)) {
      this.editHandles.get(this.editSelectedKey)!.setStrokeStyle(1, 0x00ff88, 0.7);
    }
    this.editSelectedKey = key;
    const r = this.editHandles.get(key);
    if (r) r.setStrokeStyle(2, 0xff3366, 1);
    this.refreshEditSelHud();
  }

  private refreshEditSelHud() {
    if (!this.editSelHud) return;
    const k = this.editSelectedKey;
    if (!k) { this.editSelHud.setText("(未選取)"); return; }
    const s = SLOTS[k];
    this.editSelHud.setText(
      `${k}  x=${s.x.toFixed(4)} y=${s.y.toFixed(4)} w=${s.w.toFixed(4)} h=${s.h.toFixed(4)}`
    );
  }

  private onEditWheel = (_pt: any, _go: any, _dx: number, dy: number) => {
    if (!this.editSelectedKey) return;
    const s = SLOTS[this.editSelectedKey];
    const step = dy > 0 ? 0.97 : 1.03;
    s.w = Math.max(0.005, s.w * step);
    s.h = Math.max(0.005, s.h * step);
    this.redrawHandle(this.editSelectedKey);
    this.refreshEditSelHud();
    this.applyLiveUpdate(this.editSelectedKey);
  };

  private nudge(dxRatio: number, dyRatio: number) {
    if (!this.editSelectedKey) return;
    const s = SLOTS[this.editSelectedKey];
    s.x += dxRatio; s.y += dyRatio;
    this.redrawHandle(this.editSelectedKey);
    this.refreshEditSelHud();
    this.applyLiveUpdate(this.editSelectedKey);
  }
  private onEditNudgeLeft  = () => this.nudge(-1 / GAME_WIDTH,  0);
  private onEditNudgeRight = () => this.nudge( 1 / GAME_WIDTH,  0);
  private onEditNudgeUp    = () => this.nudge( 0, -1 / GAME_HEIGHT);
  private onEditNudgeDown  = () => this.nudge( 0,  1 / GAME_HEIGHT);

  private redrawHandle(key: string) {
    const p = slotPx(key); if (!p) return;
    const x = p.x;
    const y = p.anchor === "bottom" ? p.y - p.h / 2 : p.y;
    const r = this.editHandles.get(key); if (r) { r.setPosition(x, y); r.setSize(p.w, p.h); }
    const t = this.editLabels.get(key);  if (t) t.setPosition(x, y);
  }

  /** 編輯時即時把場上正在顯示對應 slot 的 sprite 也跟著動 */
  private applyLiveUpdate(_key: string) {
    // 重畫主要常駐 sprite（警長/夫妻/掩體/門/通緝犯）
    if (this.playerSprite) {
      const slot = ACTORS.sheriff_walk.slots[Math.max(0, this.playerZone - 1)];
      const pp = slotPx(slot); if (pp) { this.playerSprite.setPosition(pp.x, pp.cy); this.fitSprite(this.playerSprite, pp.w, pp.h); }
    }
    if (this.husbandSprite) {
      const hk = `husband/${this.husbandState === "eat" ? 1 : this.husbandState === "alert" ? 2 : 3}`;
      const hp = slotPx(hk); if (hp) { this.husbandSprite.setPosition(hp.x, hp.cy); this.fitSprite(this.husbandSprite, hp.w, hp.h); }
    }
    if (this.wifeSprite) {
      const wk = `wife/${this.wifeState === "eat" ? 1 : this.wifeState === "alert" ? 2 : 3}`;
      const wp = slotPx(wk); if (wp) { this.wifeSprite.setPosition(wp.x, wp.cy); this.fitSprite(this.wifeSprite, wp.w, wp.h); }
    }
  }

  private exportLayoutJson() {
    if (!this.editMode) return;
    const out: Record<string, any> = {};
    for (const k of Object.keys(SLOTS)) {
      const s = SLOTS[k];
      out[k] = {
        x: +s.x.toFixed(4), y: +s.y.toFixed(4),
        w: +s.w.toFixed(4), h: +s.h.toFixed(4),
        ...(s.anchor ? { anchor: s.anchor } : {}),
        ...(s.src ? { src: s.src } : {}),
        ...(s.gunOffsetX != null ? { gunOffsetX: s.gunOffsetX } : {}),
        ...(s.gunOffsetY != null ? { gunOffsetY: s.gunOffsetY } : {}),
      };
    }
    const json = JSON.stringify(out, null, 2);
    console.log("=== SLOTS export ===\n" + json);
    try {
      navigator.clipboard.writeText(json);
      this.editHud?.setText("已複製 SLOTS JSON 到剪貼簿 ✓ （E 退出）");
    } catch (_) {
      this.editHud?.setText("JSON 已在 console，請手動複製");
    }
  }
}
