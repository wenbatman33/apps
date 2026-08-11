import Phaser from "phaser";
import { HERO } from "../game/content";
import { loadSave } from "../game/save";
import { addCover, bodyStyle, buttonLabelStyle, titleStyle } from "../ui/theme";

export class HomeScene extends Phaser.Scene {
  constructor() {
    super("home");
  }

  create(): void {
    const save = loadSave();
    addCover(this, "home");
    this.add.text(360, 62, "特洛伊王城", titleStyle(46)).setOrigin(0.5).setDepth(30);
    this.add
      .text(360, 118, `防線進度 ${save.unlockedYear} / 10`, bodyStyle(22, "#ffd47d"))
      .setOrigin(0.5)
      .setDepth(30);

    this.add.image(360, 730, HERO.texture).setDisplaySize(300, 450).setDepth(20);
    this.add.text(360, 968, `${HERO.name}・${HERO.title}`, titleStyle(31)).setOrigin(0.5).setDepth(30);
    this.add
      .text(360, 1015, `英雄技・${HERO.skill}：出城迎戰並恢復生命`, bodyStyle(19, "#ffe7a7"))
      .setOrigin(0.5)
      .setDepth(30);

    this.add
      .image(360, 1145, "gold-action-button")
      .setDisplaySize(420, 108)
      .setDepth(30)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("campaign"));
    this.add
      .text(360, 1145, "選擇戰役", buttonLabelStyle(30))
      .setOrigin(0.5)
      .setDepth(31)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("campaign"));
  }
}
