import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";

export class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOver"); }

  init(data: { score: number; level: number; stage: number }) {
    this.data.set("payload", data);
  }

  create() {
    const { score, level, stage } = this.data.get("payload") as { score: number; level: number; stage: number };
    const best = Math.max(Number(localStorage.getItem("wb_best") ?? 0), score);
    localStorage.setItem("wb_best", String(best));

    this.add.text(GAME_WIDTH / 2, 160, "GAME OVER", {
      fontFamily: "Impact, sans-serif", fontSize: "82px", color: "#d62828",
      stroke: "#000", strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 260, `SCORE  ${score}`, {
      fontSize: "36px", color: "#ffe8b5"
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 305, `達到  L${level}-${stage}`, {
      fontSize: "22px", color: "#cda434"
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 345, `HIGH  ${best}`, {
      fontSize: "22px", color: "#ffd166"
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 440, "[ Space ] 回標題", {
      fontSize: "24px", color: "#ffd166"
    }).setOrigin(0.5);

    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Title"));
  }
}
