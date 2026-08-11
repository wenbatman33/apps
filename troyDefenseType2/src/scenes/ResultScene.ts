import Phaser from "phaser";
import { recordVictory } from "../game/save";
import { addCover, bodyStyle, buttonLabelStyle, titleStyle } from "../ui/theme";

export interface BattleResult {
  won: boolean;
  year: number;
  score: number;
  elapsedSeconds: number;
  lives: number;
  kills: number;
  merges: number;
  heroUses: number;
}

export class ResultScene extends Phaser.Scene {
  private result: BattleResult = {
    won: false,
    year: 1,
    score: 0,
    elapsedSeconds: 0,
    lives: 0,
    kills: 0,
    merges: 0,
    heroUses: 0,
  };

  constructor() {
    super("result");
  }

  init(data: BattleResult): void {
    this.result = { ...this.result, ...data };
  }

  create(): void {
    addCover(this, this.result.won ? "result-victory" : "result-defeat");
    if (this.result.won) recordVictory(this.result.year, this.result.score);

    this.add
      .text(360, 82, this.result.won ? "防守成功！" : "防線失守", titleStyle(48))
      .setOrigin(0.5)
      .setDepth(30);
    this.add
      .text(360, 690, this.result.won ? "敵軍已被擊退，下一道防線已開啟。" : "立即重整盤面，再守一次。", bodyStyle(23))
      .setOrigin(0.5)
      .setDepth(30);
    this.add
      .text(
        360,
        875,
        `總分　${this.result.score}\n完成時間　${this.formatTime(this.result.elapsedSeconds)}\n剩餘生命　${"♥".repeat(this.result.lives)}${"♡".repeat(3 - this.result.lives)}\n擊殺　${this.result.kills}　合成　${this.result.merges}　英雄技能　${this.result.heroUses}`,
        bodyStyle(27, "#ffe5a0"),
      )
      .setOrigin(0.5)
      .setDepth(30);

    const proceed = (): void => {
      this.scene.start(this.result.won ? "campaign" : "pve-battle", { year: this.result.year });
    };
    this.add
      .image(360, 1158, "gold-action-button")
      .setDisplaySize(420, 108)
      .setDepth(25)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", proceed);
    this.add
      .text(360, 1158, this.result.won ? "選擇下一場" : "立即再戰", buttonLabelStyle(29))
      .setOrigin(0.5)
      .setDepth(30)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", proceed);
  }

  private formatTime(total: number): string {
    const minutes = Math.floor(total / 60).toString().padStart(2, "0");
    const seconds = Math.floor(total % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }
}
