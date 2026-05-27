import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from "../config";

export class TitleScene extends Phaser.Scene {
  constructor() { super("Title"); }

  create() {
    this.cameras.main.setBackgroundColor("#1a0f08");

    this.add.text(GAME_WIDTH / 2, 120, "WESTERN BAR", {
      fontFamily: "Impact, 'Arial Black', sans-serif",
      fontSize: "84px",
      color: COLORS.textCream,
      stroke: "#000",
      strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 200, "西部酒吧射擊", {
      fontSize: "28px",
      color: "#e9c46a"
    }).setOrigin(0.5);

    // 最高分（先用 localStorage）
    const best = Number(localStorage.getItem("wb_best") ?? 0);
    this.add.text(GAME_WIDTH / 2, 260, `HIGH SCORE  ${best}`, {
      fontSize: "22px", color: "#ffe8b5"
    }).setOrigin(0.5);

    // ===== 開始按鈕 =====
    const btnX = GAME_WIDTH / 2;
    const btnY = 370;
    const btnW = 240;
    const btnH = 64;
    const btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, 0xc9842f)
      .setStrokeStyle(3, 0x3a1f0a)
      .setInteractive({ useHandCursor: true });
    const btnLabel = this.add.text(btnX, btnY, "▶ 開始遊戲", {
      fontFamily: "Impact, 'Arial Black', sans-serif",
      fontSize: "30px",
      color: "#fff8e0",
      stroke: "#3a1f0a",
      strokeThickness: 4
    }).setOrigin(0.5);

    btnBg.on("pointerover", () => {
      btnBg.setFillStyle(0xe8a040);
      this.tweens.add({ targets: btnLabel, scale: 1.08, duration: 120 });
    });
    btnBg.on("pointerout", () => {
      btnBg.setFillStyle(0xc9842f);
      this.tweens.add({ targets: btnLabel, scale: 1, duration: 120 });
    });
    btnBg.on("pointerdown", () => {
      btnBg.setFillStyle(0xa56522);
    });
    btnBg.on("pointerup", () => {
      this.scene.start("Game");
    });

    this.add.text(GAME_WIDTH / 2, 450, "← → 移動    Space 開槍", {
      fontSize: "20px", color: "#cda434"
    }).setOrigin(0.5);

    // 目前為 LCD 純剪影玩法測試階段，精緻圖暫停

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 24, "v0.1 prototype  •  Casio Western Bar 1984 復刻", {
      fontSize: "14px", color: "#8a6f47"
    }).setOrigin(0.5);

  }
}
