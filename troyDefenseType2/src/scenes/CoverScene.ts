import Phaser from "phaser";
import { addCover, bodyStyle, makeTextButton, titleStyle } from "../ui/theme";

export class CoverScene extends Phaser.Scene {
  constructor() {
    super("cover");
  }

  create(): void {
    addCover(this, "cover");

    this.add.text(360, 270, "防守特洛伊", titleStyle(62)).setOrigin(0.5).setDepth(20);
    this.add
      .text(360, 352, "守住城門・命運由你改寫", bodyStyle(27, "#f6d895"))
      .setOrigin(0.5)
      .setDepth(20);

    this.add
      .text(360, 885, "怪群防守　英雄技能　3 × 5 同兵種升階", bodyStyle(22))
      .setOrigin(0.5)
      .setDepth(20);

    const start = makeTextButton(this, 360, 1158, "立即開始", () => this.scene.start("home"), 34, 470, 130);
    this.tweens.add({ targets: start, scale: 1.06, duration: 700, yoyo: true, repeat: -1 });
  }
}
