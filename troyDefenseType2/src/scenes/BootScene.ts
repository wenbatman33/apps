import Phaser from "phaser";
import { bodyStyle } from "../ui/theme";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    const loading = this.add
      .text(360, 610, "載入特洛伊 0%", bodyStyle(28, "#ffe39b"))
      .setOrigin(0.5);

    this.load.on("progress", (value: number) => {
      loading.setText(`載入特洛伊 ${Math.round(value * 100)}%`);
    });

    this.load.image("cover", "/assets/backgrounds/royale-cover-v2.png");
    this.load.image("home", "/assets/backgrounds/home-hub-v4.jpg");
    this.load.image("campaign-bg", "/assets/backgrounds/campaign-command-v4.jpg");
    this.load.image("result-victory", "/assets/backgrounds/result-victory-v4.jpg");
    this.load.image("result-defeat", "/assets/backgrounds/result-defeat-v4.jpg");
    this.load.image("battle-clean", "/assets/backgrounds/troy-coastal-battle-3x5-dual-road-v5.png");
    this.load.image("unit-role-ring", "/assets/ui/unit-role-ring-v1.png");
    this.load.image("rank-badge", "/assets/ui/rank-badge-v1.png");
    this.load.image("gold-action-button", "/assets/ui/gold-action-button-v1.png");
    this.load.image("campaign-stage-1", "/assets/campaign/stage-01.jpg");
    this.load.image("campaign-stage-2", "/assets/campaign/stage-02.jpg");
    this.load.image("campaign-stage-3", "/assets/campaign/stage-03.jpg");
    this.load.image("campaign-stage-4", "/assets/campaign/stage-04.jpg");
    this.load.image("campaign-stage-5", "/assets/campaign/stage-05.jpg");
    this.load.image("campaign-stage-6", "/assets/campaign/stage-06.jpg");
    this.load.image("campaign-stage-7", "/assets/campaign/stage-07.jpg");
    this.load.image("campaign-stage-8", "/assets/campaign/stage-08.jpg");
    this.load.image("campaign-stage-9", "/assets/campaign/stage-09.jpg");
    this.load.image("campaign-stage-10", "/assets/campaign/stage-10.jpg");
    this.load.image("hero-hector", "/assets/heroes/simple-v2/hector.png");
    this.load.spritesheet("hero-hector-run", "/assets/heroes/action_sheets/hector-run-v1.png", {
      frameWidth: 627,
      frameHeight: 627,
    });
    this.load.spritesheet("hero-hector-strike", "/assets/heroes/action_sheets/hector-strike-v1.png", {
      frameWidth: 627,
      frameHeight: 627,
    });

    this.load.spritesheet("unit-archer", "/assets/units/attack_sheets/archer-attack-v2.png", {
      frameWidth: 627,
      frameHeight: 627,
    });
    this.load.spritesheet("unit-guard", "/assets/units/attack_sheets/guard-attack-v1.png", {
      frameWidth: 512,
      frameHeight: 512,
    });
    this.load.spritesheet("unit-priest", "/assets/units/attack_sheets/priest-attack-v1.png", {
      frameWidth: 512,
      frameHeight: 512,
    });
    this.load.spritesheet("unit-hunter", "/assets/units/attack_sheets/hunter-attack-v1.png", {
      frameWidth: 512,
      frameHeight: 512,
    });
    this.load.spritesheet("unit-engineer", "/assets/units/attack_sheets/engineer-attack-v1.png", {
      frameWidth: 512,
      frameHeight: 512,
    });

    this.load.spritesheet("enemy-raider", "/assets/enemies/walk_sheets/raider-walk-v1.png", {
      frameWidth: 627,
      frameHeight: 627,
    });
    this.load.spritesheet("enemy-shield", "/assets/enemies/walk_sheets/shield-walk-v1.png", {
      frameWidth: 627,
      frameHeight: 627,
    });
    this.load.spritesheet("boss-achilles", "/assets/enemies/walk_sheets/achilles-run-v1.png", {
      frameWidth: 627,
      frameHeight: 627,
    });
    this.load.spritesheet("boss-horse", "/assets/enemies/walk_sheets/horse-roll-v1.png", {
      frameWidth: 627,
      frameHeight: 627,
    });

    this.load.image("sun-arrow", "/assets/projectiles/sun-arrow.png");
    this.load.image("javelin", "/assets/projectiles/javelin.png");
    this.load.image("oracle-bolt", "/assets/projectiles/oracle-bolt.png");
    this.load.image("bronze-impact", "/assets/effects/bronze-impact.png");
    this.load.image("oracle-impact", "/assets/effects/oracle-impact.png");
  }

  create(): void {
    ["archer", "guard", "priest", "hunter", "engineer"].forEach((type) => {
      this.anims.create({
        key: `attack-${type}`,
        frames: this.anims.generateFrameNumbers(`unit-${type}`, { start: 0, end: 3 }),
        frameRate: 10,
        repeat: 0,
      });
    });
    [
      { key: "walk-raider", texture: "enemy-raider", frameRate: 9 },
      { key: "march-shield", texture: "enemy-shield", frameRate: 6 },
      { key: "run-achilles", texture: "boss-achilles", frameRate: 11 },
      { key: "roll-horse", texture: "boss-horse", frameRate: 7 },
    ].forEach(({ key, texture, frameRate }) => {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texture, { start: 0, end: 3 }),
        frameRate,
        repeat: -1,
      });
    });
    this.anims.create({
      key: "run-hector-field",
      frames: this.anims.generateFrameNumbers("hero-hector-run", { start: 0, end: 3 }),
      frameRate: 9,
      repeat: -1,
    });
    this.anims.create({
      key: "strike-hector-field",
      frames: this.anims.generateFrameNumbers("hero-hector-strike", { start: 0, end: 3 }),
      frameRate: 11,
      repeat: 0,
    });
    this.scene.start("cover");
  }
}
