import Phaser from "phaser";

// v6：每個 texture key 對應的真實 PNG 路徑 + 顯示尺寸
type AssetMap = { key: string; file: string; w: number; h: number; color: number };

const ASSETS: AssetMap[] = [
  // 角色 — 警長（v9 依 LCD 8 動作解析圖個別生）
  { key: "ph_player",          file: "sprites/sheriff/action1.png",    w: 80,  h: 140, color: 0x2b6cb0 },  // zone 1 idle
  { key: "ph_player_walk1",    file: "sprites/sheriff/action1.png",    w: 80,  h: 140, color: 0x2b6cb0 },
  { key: "ph_player_walk2",    file: "sprites/sheriff/action2.png",    w: 80,  h: 140, color: 0x2b6cb0 },
  { key: "ph_player_walk3",    file: "sprites/sheriff/action3.png",    w: 80,  h: 140, color: 0x2b6cb0 },
  { key: "ph_player_action1",  file: "sprites/sheriff/action1.png",    w: 80,  h: 140, color: 0x2b6cb0 },
  { key: "ph_player_action2",  file: "sprites/sheriff/action2.png",    w: 80,  h: 140, color: 0x2b6cb0 },
  { key: "ph_player_action3",  file: "sprites/sheriff/action3.png",    w: 80,  h: 140, color: 0x2b6cb0 },
  { key: "ph_player_action4",  file: "sprites/sheriff/action4.png",    w: 80,  h: 140, color: 0x2b6cb0 },
  { key: "ph_player_pour",     file: "sprites/sheriff/pour.png",       w: 110, h: 145, color: 0x8a5a44 },
  { key: "ph_player_hide",     file: "sprites/sheriff/hide.png",       w: 115, h: 110, color: 0x444444 },
  { key: "ph_player_fire",     file: "sprites/sheriff/fire.png",       w: 130, h: 135, color: 0x2b6cb0 },
  { key: "ph_player_hit",      file: "sprites/sheriff/down.png",       w: 140, h: 110, color: 0xff4444 },  // 缺 hit → 用 down 暫代
  { key: "ph_player_down",     file: "sprites/sheriff/down.png",       w: 140, h: 110, color: 0x444444 },
  { key: "ph_player_aim",      file: "sprites/sheriff/action2.png",    w: 80,  h: 140, color: 0x2b6cb0 },

  // 通緝犯
  { key: "ph_bandit",          file: "sprites/bandit/at_door.png",     w: 90,  h: 145, color: 0x9b2226 },
  { key: "ph_bandit_at_door",  file: "sprites/bandit/at_door.png",     w: 90,  h: 145, color: 0x9b2226 },
  { key: "ph_bandit_enter",    file: "sprites/bandit/enter.png",       w: 110, h: 145, color: 0x9b2226 },
  { key: "ph_bandit_hide",     file: "sprites/bandit/hide.png",        w: 85,  h: 125, color: 0x9b2226 },
  { key: "ph_bandit_peek",     file: "sprites/bandit/peek.png",        w: 70,  h: 135, color: 0x9b2226 },
  { key: "ph_bandit_peek_hi",  file: "sprites/bandit/peek.png",        w: 70,  h: 135, color: 0x9b2226 },
  { key: "ph_bandit_peek_lo",  file: "sprites/bandit/hide.png",        w: 85,  h: 100, color: 0x9b2226 },
  { key: "ph_bandit_fire",     file: "sprites/bandit/fire.png",        w: 140, h: 130, color: 0x9b2226 },
  { key: "ph_bandit_hit",      file: "sprites/bandit/hit.png",         w: 125, h: 135, color: 0xff4444 },
  { key: "ph_bandit_down",     file: "sprites/bandit/down.png",        w: 140, h: 90,  color: 0x444444 },

  // 酒保
  { key: "ph_barman",          file: "sprites/barman/idle.png",        w: 100, h: 130, color: 0xc69214 },
  { key: "ph_barman_throw",    file: "sprites/barman/slide.png",       w: 130, h: 110, color: 0xc69214 },
  { key: "ph_barman_catch",    file: "sprites/barman/catch.png",       w: 80,  h: 130, color: 0xc69214 },
  { key: "ph_barman_cheer",    file: "sprites/barman/cheer.png",       w: 110, h: 135, color: 0xc69214 },

  // 夫婦
  { key: "ph_man",             file: "sprites/husband/eat1.png",       w: 95,  h: 115, color: 0x6b4423 },
  { key: "ph_man_eat2",        file: "sprites/husband/eat2.png",       w: 95,  h: 110, color: 0x6b4423 },
  { key: "ph_man_up",          file: "sprites/husband/alert.png",      w: 95,  h: 110, color: 0x8a3b1f },
  { key: "ph_man_throw",       file: "sprites/husband/alert.png",      w: 95,  h: 110, color: 0x8a3b1f },
  { key: "ph_man_hide",        file: "sprites/husband/hide.png",       w: 90,  h: 85,  color: 0x6b4423 },
  { key: "ph_woman",           file: "sprites/wife/eat1.png",          w: 85,  h: 120, color: 0xa05a8c },
  { key: "ph_woman_eat2",      file: "sprites/wife/eat2.png",          w: 90,  h: 115, color: 0xa05a8c },
  { key: "ph_woman_up",        file: "sprites/wife/alert.png",         w: 85,  h: 120, color: 0xc83982 },
  { key: "ph_woman_throw",     file: "sprites/wife/alert.png",         w: 85,  h: 120, color: 0xc83982 },
  { key: "ph_woman_hide",      file: "sprites/wife/hide.png",          w: 90,  h: 95,  color: 0xa05a8c },

  // 物品（軌道上的杯/瓶/盤）— 縮小以放上吧台檯面
  { key: "ph_cup",             file: "G/G01_cup_intact.png",          w: 38,  h: 38,  color: 0xf2c14e },
  { key: "ph_cup_broken",      file: "G/G02_cup_broken.png",          w: 44,  h: 44,  color: 0xf2c14e },
  { key: "ph_bottle",          file: "G/G03_bottle_intact.png",       w: 30,  h: 52,  color: 0x3a7d44 },
  { key: "ph_bottle_broken",   file: "G/G04_bottle_broken.png",       w: 44,  h: 44,  color: 0x3a7d44 },
  { key: "ph_plate",           file: "G/G05_plate_intact.png",        w: 44,  h: 44,  color: 0xc0392b },  // 鏢靶（正方形）
  { key: "ph_plate_broken",    file: "G/G06_plate_broken.png",        w: 50,  h: 50,  color: 0xc0392b },
  { key: "ph_bonus",           file: "G/G07_bonus_bottle.png",        w: 34,  h: 56,  color: 0xffd700 },

  // 攻擊物
  { key: "ph_apple",           file: "H/H01_apple.png",               w: 32,  h: 32,  color: 0xc0392b },
  { key: "ph_ashtray",         file: "H/H01_apple.png",               w: 32,  h: 22,  color: 0x444444 },

  // 炸彈 + 效果
  { key: "ph_dyn",             file: "I/I01_dynamite_lit.png",        w: 28,  h: 36,  color: 0x222222 },
  { key: "ph_dyn_fuse",        file: "I/I02_dynamite_ground.png",     w: 32,  h: 36,  color: 0xff5722 },
  { key: "ph_explosion",       file: "I/I03_explosion.png",           w: 60,  h: 60,  color: 0xff5722 },

  // 威士忌
  { key: "ph_whiskey",         file: "J/J01_whiskey_bottle.png",      w: 28,  h: 48,  color: 0x8a5a44 },

  // 桌子
  { key: "ph_table",           file: "F/F01_table_intact.png",        w: 110, h: 60,  color: 0x6b3f1d },
  { key: "ph_table_dmg",       file: "F/F02_table_damaged.png",       w: 110, h: 60,  color: 0x6b3f1d },
  { key: "ph_table_destroyed", file: "F/F03_table_destroyed.png",     w: 110, h: 50,  color: 0x4a2d18 },
  { key: "ph_cover",           file: "F/F01_table_intact.png",        w: 20,  h: 70,  color: 0x4a2d18 },

  // 子彈（佔位）
  { key: "ph_bullet",          file: "L/L01_bullet_player.png",       w: 12,  h: 22,  color: 0xffd166 },
  { key: "ph_bbullet",         file: "L/L02_bullet_bandit.png",       w: 12,  h: 18,  color: 0xff3333 },

  // 門（佔位 — A01 背景已含）
  { key: "ph_door",            file: "A/A11_swing_door.png",          w: 80,  h: 130, color: 0x3a1f10 },
  { key: "ph_round_table",     file: "A/A26_round_table.png",         w: 170, h: 80,  color: 0x6b3f1d },
  { key: "ph_chair_left",      file: "A/A27_chair_left.png",          w: 60,  h: 90,  color: 0x6b3f1d },
  { key: "ph_chair_right",     file: "A/A28_chair_right.png",         w: 60,  h: 90,  color: 0x6b3f1d },
  { key: "ph_food_set",        file: "A/A29_food_set.png",            w: 90,  h: 60,  color: 0xe9d8a6 },

  // 背景（v8 — A00 空場景）
  { key: "ph_bg",              file: "A/A00_empty_bg.png",            w: 960, h: 540, color: 0x2b1a0e },
  { key: "ph_bg_L1",           file: "A/A01_bg_L1_day.png",           w: 960, h: 540, color: 0x2b1a0e },
  { key: "ph_bg_L2",           file: "A/A02_bg_L2_afternoon.png",     w: 960, h: 540, color: 0x2b1a0e },
  { key: "ph_bg_L3",           file: "A/A03_bg_L3_dusk.png",          w: 960, h: 540, color: 0x2b1a0e },
  { key: "ph_bg_L4",           file: "A/A04_bg_L4_night.png",         w: 960, h: 540, color: 0x2b1a0e },
  { key: "ph_bg_L5",           file: "A/A05_bg_L5_rain.png",          w: 960, h: 540, color: 0x2b1a0e },
  { key: "ph_bg_L6",           file: "A/A06_bg_L6_dust.png",          w: 960, h: 540, color: 0x2b1a0e },
  { key: "ph_bg_L7",           file: "A/A07_bg_L7_minetown.png",      w: 960, h: 540, color: 0x2b1a0e },
  { key: "ph_bg_L8",           file: "A/A08_bg_L8_abandoned.png",     w: 960, h: 540, color: 0x2b1a0e },
  { key: "ph_bg_L9",           file: "A/A09_bg_L9_storm.png",         w: 960, h: 540, color: 0x2b1a0e },
  { key: "ph_bg_L10",          file: "A/A10_bg_L10_final.png",        w: 960, h: 540, color: 0x2b1a0e }
];

export const ASSET_SIZE: Record<string, { w: number; h: number }> = {};
ASSETS.forEach(a => { ASSET_SIZE[a.key] = { w: a.w, h: a.h }; });

// LCD 黑色剪影素材（256x256 透明 PNG，原創繪製）
// LcdScene 用，key 一律 lcd_ 開頭
export const LCD_ASSETS: Array<{ key: string; file: string }> = [
  { key: "lcd_sheriff_walk_1", file: "lcd_color/sheriff_walk_1.png" },
  { key: "lcd_sheriff_walk_2", file: "lcd_color/sheriff_walk_2.png" },
  { key: "lcd_sheriff_walk_3", file: "lcd_color/sheriff_walk_3.png" },
  { key: "lcd_sheriff_walk_4", file: "lcd_color/sheriff_walk_4.png" },
  { key: "lcd_sheriff_pour",   file: "lcd_color/sheriff_pour.png" },
  { key: "lcd_sheriff_hide",   file: "lcd_color/sheriff_hide.png" },
  { key: "lcd_sheriff_fire",   file: "lcd_color/sheriff_fire.png" },
  { key: "lcd_sheriff_down",   file: "lcd_color/sheriff_down.png" },
  { key: "lcd_bandit_at_door", file: "lcd_color/bandit_at_door.png" },
  { key: "lcd_bandit_enter",   file: "lcd_color/bandit_enter.png" },
  { key: "lcd_bandit_hide",    file: "lcd_color/bandit_hide.png" },
  { key: "lcd_bandit_peek",    file: "lcd_color/bandit_peek.png" },
  { key: "lcd_bandit_fire",    file: "lcd_color/bandit_fire.png" },
  { key: "lcd_bandit_hit",     file: "lcd_color/bandit_hit.png" },
  { key: "lcd_cup_intact",     file: "lcd_color/cup_intact.png" },
  { key: "lcd_cup_broken",     file: "lcd_color/cup_broken.png" },
  { key: "lcd_bottle_intact",  file: "lcd_color/bottle_intact.png" },
  { key: "lcd_bottle_broken",  file: "lcd_color/bottle_broken.png" },
  { key: "lcd_plate_intact",   file: "lcd_color/plate_intact.png" },
  { key: "lcd_plate_broken",   file: "lcd_color/plate_broken.png" },
  { key: "lcd_dynamite",       file: "lcd_color/dynamite.png" },
  { key: "lcd_explosion",      file: "lcd_color/explosion.png" },
  { key: "lcd_apple",          file: "lcd_color/apple.png" },
  { key: "lcd_ashtray",        file: "lcd_color/ashtray.png" },
  { key: "lcd_husband_eat",    file: "lcd_color/husband_eat.png" },
  { key: "lcd_husband_alert",  file: "lcd_color/husband_alert.png" },
  { key: "lcd_husband_throw",  file: "lcd_color/husband_throw.png" },
  { key: "lcd_wife_eat",       file: "lcd_color/wife_eat.png" },
  { key: "lcd_wife_alert",     file: "lcd_color/wife_alert.png" },
  { key: "lcd_wife_throw",     file: "lcd_color/wife_throw.png" },
  { key: "lcd_door_open",      file: "lcd_color/door_open.png" },
  { key: "lcd_door_closed",    file: "lcd_color/door_closed.png" },
  { key: "lcd_cover_intact",   file: "lcd_color/cover_intact.png" },
  { key: "lcd_cover_damaged",  file: "lcd_color/cover_damaged.png" },
  { key: "lcd_cover_destroyed",file: "lcd_color/cover_destroyed.png" },
  { key: "lcd_barman_idle",    file: "lcd_color/barman_idle.png" },
  { key: "lcd_barman_slide",   file: "lcd_color/barman_slide.png" },
  { key: "lcd_sheriff_action0",file: "lcd_color/sheriff_action0.png" },
  { key: "lcd_sheriff_duel_in",file: "lcd_color/sheriff_duel_in.png" },
  { key: "lcd_background",     file: "lcd_color/background.png" },
  { key: "lcd_couple_table",   file: "lcd_figma/couple_table.png" },
  { key: "lcd_chair_left",     file: "lcd_figma/chair_left.png" },
  { key: "lcd_chair_right",    file: "lcd_figma/chair_right.png" },
  { key: "lcd_barrel",         file: "lcd_figma/barrel.png" },
];

// 同名黑剪影 fallback（彩色沒生好時用）— key 前綴 lcd_sil_
export const LCD_FALLBACK_ASSETS: Array<{ key: string; file: string }> = [
  { key: "lcd_sil_sheriff_walk_1", file: "lcd/sheriff_walk_1.png" },
  { key: "lcd_sil_sheriff_walk_2", file: "lcd/sheriff_walk_2.png" },
  { key: "lcd_sil_sheriff_walk_3", file: "lcd/sheriff_walk_3.png" },
  { key: "lcd_sil_sheriff_walk_4", file: "lcd/sheriff_walk_4.png" },
  { key: "lcd_sil_sheriff_pour",   file: "lcd/sheriff_pour.png" },
  { key: "lcd_sil_sheriff_hide",   file: "lcd/sheriff_hide.png" },
  { key: "lcd_sil_sheriff_fire",   file: "lcd/sheriff_fire.png" },
  { key: "lcd_sil_sheriff_down",   file: "lcd/sheriff_down.png" },
  { key: "lcd_sil_bandit_at_door", file: "lcd/bandit_at_door.png" },
  { key: "lcd_sil_bandit_enter",   file: "lcd/bandit_enter.png" },
  { key: "lcd_sil_bandit_hide",    file: "lcd/bandit_hide.png" },
  { key: "lcd_sil_bandit_peek",    file: "lcd/bandit_peek.png" },
  { key: "lcd_sil_bandit_fire",    file: "lcd/bandit_fire.png" },
  { key: "lcd_sil_bandit_hit",     file: "lcd/bandit_hit.png" },
  { key: "lcd_sil_cup_intact",     file: "lcd/cup_intact.png" },
  { key: "lcd_sil_cup_broken",     file: "lcd/cup_broken.png" },
  { key: "lcd_sil_bottle_intact",  file: "lcd/bottle_intact.png" },
  { key: "lcd_sil_bottle_broken",  file: "lcd/bottle_broken.png" },
  { key: "lcd_sil_plate_intact",   file: "lcd/plate_intact.png" },
  { key: "lcd_sil_plate_broken",   file: "lcd/plate_broken.png" },
  { key: "lcd_sil_dynamite",       file: "lcd/dynamite.png" },
  { key: "lcd_sil_explosion",      file: "lcd/explosion.png" },
  { key: "lcd_sil_apple",          file: "lcd/apple.png" },
  { key: "lcd_sil_ashtray",        file: "lcd/ashtray.png" },
  { key: "lcd_sil_husband_eat",    file: "lcd/husband_eat.png" },
  { key: "lcd_sil_husband_alert",  file: "lcd/husband_alert.png" },
  { key: "lcd_sil_husband_throw",  file: "lcd/husband_throw.png" },
  { key: "lcd_sil_wife_eat",       file: "lcd/wife_eat.png" },
  { key: "lcd_sil_wife_alert",     file: "lcd/wife_alert.png" },
  { key: "lcd_sil_wife_throw",     file: "lcd/wife_throw.png" },
  { key: "lcd_sil_door_open",      file: "lcd/door_open.png" },
  { key: "lcd_sil_door_closed",    file: "lcd/door_closed.png" },
  { key: "lcd_sil_cover_intact",   file: "lcd/cover_intact.png" },
  { key: "lcd_sil_cover_damaged",  file: "lcd/cover_damaged.png" },
  { key: "lcd_sil_cover_destroyed",file: "lcd/cover_destroyed.png" },
  { key: "lcd_sil_barman_idle",    file: "lcd/barman_idle.png" },
  { key: "lcd_sil_barman_slide",   file: "lcd/barman_slide.png" },
];

// 音效檔（ogg，從 itch.io 原版抽出）
export const SOUNDS: Record<string, string> = {
  sfx_opening:    "sound_orig/start.ogg",       // 開場
  sfx_fire:       "sound_orig/fire1.ogg",       // 警長開槍
  sfx_fire2:      "sound_orig/fire2.ogg",       // 通緝犯開槍
  sfx_hit1:       "sound_orig/hit1.ogg",        // 命中 1
  sfx_hit2:       "sound_orig/hit2.ogg",        // 命中 2
  sfx_hit3:       "sound_orig/hit3.ogg",        // 命中 3
  sfx_bomb:       "sound_orig/bomb.ogg",        // 炸彈爆炸
  sfx_douse:      "sound_orig/douse.ogg",       // 澆熄炸彈
  sfx_bonus:      "sound_orig/bonus.ogg",       // bonus pickup
  sfx_miss:       "sound_orig/miss.ogg",        // 警長中彈/失誤
  sfx_gameover:   "sound_orig/over.ogg",        // 遊戲結束
  sfx_level:      "sound_orig/levelup.ogg",     // 升等
  sfx_stage:      "sound_orig/levelstart.ogg",  // 過關 / 關卡開始
  sfx_beep:       "sound_orig/beep.ogg",        // 嗶聲（通用）
  sfx_boss1:      "sound_orig/boss1.ogg",       // 對決：通緝犯出現
  sfx_boss2:      "sound_orig/boss2.ogg",       // 對決：通緝犯動作 1
  sfx_boss3:      "sound_orig/boss3.ogg",       // 對決：通緝犯動作 2
  sfx_boss4:      "sound_orig/boss4.ogg",       // 對決：通緝犯動作 3
  sfx_step1:      "sound_orig/step1.ogg",       // 背景步進 1
  sfx_step2:      "sound_orig/step2.ogg",       // 背景步進 2
  sfx_step3:      "sound_orig/step3.ogg",       // 背景步進 3
  sfx_step4:      "sound_orig/step4.ogg",       // 背景步進 4
};

// 永遠用 LCD 剪影視圖（暫時禁用 AI 精緻圖，先求玩法）
// 之後要切回精緻圖時，把 isWireframeView() 改成讀 URL 即可
export function isWireframeView(): boolean { return true; }
export const isLcdMode = isWireframeView;

export class BootScene extends Phaser.Scene {
  private failed = new Set<string>();

  constructor() { super("Boot"); }

  preload() {
    this.load.setPath("assets");
    if (!isWireframeView()) {
      // 一般視圖：載入所有 AI 生成圖
      for (const a of ASSETS) this.load.image(a.key, a.file);
    }
    // LCD 彩色素材 + 黑剪影 fallback 都載入（給 LcdScene 用）
    for (const a of LCD_ASSETS)          this.load.image(a.key, a.file);
    for (const a of LCD_FALLBACK_ASSETS) this.load.image(a.key, a.file);
    // 剪影視圖跳過 image，全部用 generated 黑色幾何
    for (const k of Object.keys(SOUNDS)) this.load.audio(k, SOUNDS[k]);
    this.load.on("loaderror", (file: Phaser.Loader.File) => { this.failed.add(file.key); });
  }

  create() {
    if (isWireframeView()) {
      this.makeLcdSilhouettes();
      console.log("[Boot] 純剪影測試視圖：所有 sprite 改用黑色幾何");
    } else {
      this.makePlaceholdersForMissing();
    }
    // 所有 texture 用 LINEAR filter（縮放時更平滑）
    for (const a of ASSETS) {
      const tex = this.textures.get(a.key);
      if (tex && tex.source[0]) {
        tex.source[0].setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
    const loaded = ASSETS.length - this.failed.size;
    console.log(`[Boot v7] 真實素材 ${loaded}/${ASSETS.length}，缺 ${this.failed.size} 張用色塊代替`);
    if (this.failed.size > 0) console.log(`[Boot] missing: ${[...this.failed].join(", ")}`);
    // 預設走新 LCD slot-based 場景。`?scene=legacy` 才走舊 Title → GameScene 流程。
    const urlScene = new URLSearchParams(window.location.search).get("scene");
    if (urlScene === "legacy") {
      this.scene.start("Title");
    } else {
      this.scene.start("Lcd");
    }
  }

  private makePlaceholdersForMissing() {
    const g = this.add.graphics();
    for (const a of ASSETS) {
      if (this.textures.exists(a.key)) continue;
      g.clear();
      g.fillStyle(a.color, 1).fillRect(0, 0, a.w, a.h);
      g.lineStyle(2, 0x000000, 1).strokeRect(1, 1, a.w - 2, a.h - 2);
      g.generateTexture(a.key, a.w, a.h);
    }
    g.destroy();
  }

  /** LCD 靜態矩陣模式：每個 sprite key 都畫一個簡單的黑色剪影 */
  private makeLcdSilhouettes() {
    const g = this.add.graphics();
    const BLACK = 0x1a1a1a;
    const drawSilhouette = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      g.clear();
      g.fillStyle(BLACK, 1);
      draw(g);
      g.generateTexture(key, w, h);
    };
    for (const a of ASSETS) {
      const k = a.key;
      // 警長／通緝犯：人型剪影（頭+身+腿）
      if (k.startsWith("ph_player") || k === "ph_bandit" || k.startsWith("ph_bandit_")) {
        drawSilhouette(k, a.w, a.h, gg => {
          const cx = a.w / 2;
          // 帽
          gg.fillEllipse(cx, a.h * 0.10, a.w * 0.9, a.h * 0.10);
          gg.fillRect(cx - a.w * 0.25, a.h * 0.06, a.w * 0.5, a.h * 0.10);
          // 頭
          gg.fillCircle(cx, a.h * 0.22, a.h * 0.08);
          // 身（梯形）
          gg.fillRect(cx - a.w * 0.30, a.h * 0.30, a.w * 0.6, a.h * 0.35);
          // 雙腿
          gg.fillRect(cx - a.w * 0.25, a.h * 0.65, a.w * 0.18, a.h * 0.32);
          gg.fillRect(cx + a.w * 0.07, a.h * 0.65, a.w * 0.18, a.h * 0.32);
          // 持槍手（往上指）— action1-4 / fire 系列
          if (k.includes("action") || k.includes("fire") || k === "ph_player" || k === "ph_bandit") {
            gg.fillRect(cx - a.w * 0.45, a.h * 0.05, a.w * 0.15, a.h * 0.30);  // 手臂
            gg.fillRect(cx - a.w * 0.50, a.h * 0.00, a.w * 0.10, a.h * 0.10);  // 槍
          }
        });
        continue;
      }
      // 酒保：類似人型但站在吧台後（只露上半身）
      if (k.startsWith("ph_barman")) {
        drawSilhouette(k, a.w, a.h, gg => {
          const cx = a.w / 2;
          gg.fillEllipse(cx, a.h * 0.15, a.w * 0.9, a.h * 0.12);  // 帽
          gg.fillCircle(cx, a.h * 0.32, a.h * 0.10);              // 頭
          gg.fillRect(cx - a.w * 0.35, a.h * 0.45, a.w * 0.7, a.h * 0.50);  // 身
        });
        continue;
      }
      // 夫妻：坐姿剪影
      if (k.startsWith("ph_man") || k.startsWith("ph_woman")) {
        drawSilhouette(k, a.w, a.h, gg => {
          const cx = a.w / 2;
          gg.fillCircle(cx, a.h * 0.20, a.h * 0.13);              // 頭
          gg.fillRect(cx - a.w * 0.35, a.h * 0.35, a.w * 0.7, a.h * 0.55);  // 身（坐著較矮）
        });
        continue;
      }
      // 酒杯
      if (k === "ph_cup" || k === "ph_cup_broken") {
        drawSilhouette(k, a.w, a.h, gg => {
          gg.fillRect(2, 4, a.w - 4, a.h - 4);  // 杯身
          gg.fillRect(a.w - 6, a.h * 0.3, 6, a.h * 0.4);  // 把手
        });
        continue;
      }
      // 酒瓶
      if (k === "ph_bottle" || k === "ph_bottle_broken" || k === "ph_bonus") {
        drawSilhouette(k, a.w, a.h, gg => {
          gg.fillRect(a.w * 0.35, 0, a.w * 0.30, a.h * 0.25);  // 瓶口
          gg.fillRect(2, a.h * 0.25, a.w - 4, a.h * 0.75);     // 瓶身
        });
        continue;
      }
      // 盤子／標靶
      if (k === "ph_plate" || k === "ph_plate_broken") {
        drawSilhouette(k, a.w, a.h, gg => {
          gg.fillEllipse(a.w / 2, a.h / 2, a.w - 4, a.h - 4);
        });
        continue;
      }
      // 子彈：細長矩形
      if (k === "ph_bullet" || k === "ph_bbullet") {
        drawSilhouette(k, a.w, a.h, gg => {
          gg.fillRect(0, 0, a.w, a.h);
        });
        continue;
      }
      // 炸彈／威士忌：方塊 + 引信
      if (k === "ph_dyn" || k === "ph_dyn_fuse" || k === "ph_whiskey") {
        drawSilhouette(k, a.w, a.h, gg => {
          gg.fillRect(2, 4, a.w - 4, a.h - 6);
          gg.fillRect(a.w / 2 - 1, 0, 2, 4);  // 引信
        });
        continue;
      }
      // 桌子掩體：橫的長條
      if (k === "ph_table" || k === "ph_table_dmg" || k === "ph_table_destroyed") {
        drawSilhouette(k, a.w, a.h, gg => {
          gg.fillRect(2, a.h * 0.4, a.w - 4, a.h * 0.4);  // 桌面
          gg.fillRect(a.w * 0.15, a.h * 0.6, a.w * 0.15, a.h * 0.4);  // 左腳
          gg.fillRect(a.w * 0.70, a.h * 0.6, a.w * 0.15, a.h * 0.4);  // 右腳
        });
        continue;
      }
      // 圓桌
      if (k === "ph_round_table") {
        drawSilhouette(k, a.w, a.h, gg => {
          gg.fillEllipse(a.w / 2, a.h * 0.35, a.w * 0.9, a.h * 0.40);  // 桌面
          gg.fillRect(a.w / 2 - 4, a.h * 0.55, 8, a.h * 0.45);          // 桌腳
          gg.fillEllipse(a.w / 2, a.h * 0.98, a.w * 0.5, a.h * 0.04);   // 底盤
        });
        continue;
      }
      // 椅子
      if (k === "ph_chair_left" || k === "ph_chair_right") {
        drawSilhouette(k, a.w, a.h, gg => {
          gg.fillRect(a.w * 0.2, a.h * 0.40, a.w * 0.6, a.h * 0.15);  // 座面
          gg.fillRect(a.w * 0.2, 0, a.w * 0.2, a.h * 0.40);            // 椅背
          gg.fillRect(a.w * 0.25, a.h * 0.55, a.w * 0.1, a.h * 0.45); // 腳
          gg.fillRect(a.w * 0.65, a.h * 0.55, a.w * 0.1, a.h * 0.45); // 腳
        });
        continue;
      }
      // 門
      if (k === "ph_door") {
        drawSilhouette(k, a.w, a.h, gg => {
          gg.lineStyle(3, BLACK, 1);
          gg.strokeRect(2, 2, a.w - 4, a.h - 4);
          gg.fillRect(a.w * 0.45, a.h * 0.3, a.w * 0.1, a.h * 0.4);  // 中柱
        });
        continue;
      }
      // 蘋果、菸灰缸、爆炸、食物等小東西
      if (k === "ph_apple" || k === "ph_ashtray" || k === "ph_food_set") {
        drawSilhouette(k, a.w, a.h, gg => {
          gg.fillCircle(a.w / 2, a.h / 2, Math.min(a.w, a.h) * 0.4);
        });
        continue;
      }
      if (k === "ph_explosion") {
        drawSilhouette(k, a.w, a.h, gg => {
          // 星爆形狀
          const cx = a.w / 2, cy = a.h / 2, r = Math.min(a.w, a.h) * 0.5;
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            gg.fillRect(cx - 3 + Math.cos(ang) * r * 0.5, cy - 3 + Math.sin(ang) * r * 0.5, 6, 6);
          }
          gg.fillCircle(cx, cy, r * 0.4);
        });
        continue;
      }
      // 預設 fallback：簡單方塊
      drawSilhouette(k, a.w, a.h, gg => {
        gg.fillRect(2, 2, a.w - 4, a.h - 4);
      });
    }
    g.destroy();
  }
}
