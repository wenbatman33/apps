import Phaser from "phaser";

// 舊 ASSETS 已移除（legacy GameScene 用，已不存在）

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
  { key: "lcd_husband_hide",   file: "lcd_color/husband_hide.png" },
  { key: "lcd_wife_hide",      file: "lcd_color/wife_hide.png" },
  { key: "lcd_couple_hide",    file: "lcd_figma/couple_table_hide.png" },
  { key: "lcd_wanted_poster",  file: "clean_v2/wanted_poster.png" },
  // 手機 UI 按鈕（loading 階段的 bg/frame/fill 已在 preload 第一階段載過）
  { key: "ui_mobile_bg",       file: "clean_v3/ui_bg.png" },
  { key: "ui_btn_left",        file: "clean_v3/btn_left.png" },
  { key: "ui_btn_right",       file: "clean_v3/btn_right.png" },
  { key: "ui_btn_fire",        file: "clean_v3/btn_fire.png" },
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

import { IS_MOBILE, CANVAS_WIDTH, CANVAS_HEIGHT } from "../config";

export class BootScene extends Phaser.Scene {
  private failed = new Set<string>();

  constructor() { super("Boot"); }

  preload() {
    this.load.setPath("assets");
    // 第一階段 preload 為空（loading 畫面用 Phaser 原生繪圖，不依賴外部素材）
  }

  /** 第二階段：顯示 loading 畫面，再載完整 LCD 資源 */
  create() {
    this.startMainLoad();
  }

  private startMainLoad() {
    // 純色背景（取代外部 bg 圖）
    this.cameras.main.setBackgroundColor("#1a1410");

    // 進度條（Phaser 原生 rectangle）
    const barY = CANVAS_HEIGHT * (IS_MOBILE ? 0.55 : 0.55);
    const barW = CANVAS_WIDTH * 0.6;
    const barH = Math.round(CANVAS_HEIGHT * 0.025);
    // 外框
    this.add.rectangle(CANVAS_WIDTH / 2, barY, barW, barH, 0x000000, 1)
      .setStrokeStyle(2, 0xffd166, 1);
    // 填充條（從左對齊，寬度動態）
    const fill = this.add.rectangle(CANVAS_WIDTH / 2 - barW / 2 + 2, barY, 0, barH - 4, 0xffd166, 1)
      .setOrigin(0, 0.5);

    // Loading 文字
    this.add.text(CANVAS_WIDTH / 2, barY - barH * 2, "LOADING...", {
      fontSize: `${Math.round(CANVAS_HEIGHT * 0.025)}px`,
      color: "#ffd166", fontFamily: "monospace", fontStyle: "bold",
    }).setOrigin(0.5);

    const progressText = this.add.text(CANVAS_WIDTH / 2, barY + barH * 2, "0%", {
      fontSize: `${Math.round(CANVAS_HEIGHT * 0.02)}px`,
      color: "#888", fontFamily: "monospace",
    }).setOrigin(0.5);

    // 載入主要資源
    this.load.on("progress", (p: number) => {
      fill.width = (barW - 4) * p;
      progressText.setText(`${Math.round(p * 100)}%`);
    });
    this.load.once("complete", () => {
      if (this.failed.size > 0) console.log(`[Boot] missing: ${[...this.failed].join(", ")}`);
      this.time.delayedCall(200, () => this.scene.start("Lcd"));
    });

    for (const a of LCD_ASSETS)          this.load.image(a.key, a.file);
    for (const a of LCD_FALLBACK_ASSETS) this.load.image(a.key, a.file);
    for (const k of Object.keys(SOUNDS)) this.load.audio(k, SOUNDS[k]);
    this.load.on("loaderror", (file: Phaser.Loader.File) => { this.failed.add(file.key); });
    this.load.start();
  }
}
