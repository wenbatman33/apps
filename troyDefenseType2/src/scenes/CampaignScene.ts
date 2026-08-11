import Phaser from "phaser";
import { CAMPAIGN_YEARS } from "../game/content";
import { loadSave } from "../game/save";
import { addCover, bodyStyle, buttonLabelStyle, makeTextButton, titleStyle } from "../ui/theme";

export class CampaignScene extends Phaser.Scene {
  constructor() {
    super("campaign");
  }

  create(): void {
    const save = loadSave();
    let selectedIndex = Phaser.Math.Clamp(save.unlockedYear - 1, 0, CAMPAIGN_YEARS.length - 1);

    addCover(this, "campaign-bg");
    this.add.text(360, 48, "特洛伊戰役", titleStyle(42)).setOrigin(0.5).setDepth(30);
    this.add
      .text(360, 94, "點擊下方關卡按鈕切換戰役", bodyStyle(18, "#ffe09a"))
      .setOrigin(0.5)
      .setDepth(30);

    const stageCounter = this.add.text(360, 126, "", bodyStyle(20, "#ffd46f")).setOrigin(0.5).setDepth(31);
    const picture = this.add.image(360, 330, "campaign-stage-1").setDisplaySize(640, 360).setDepth(24);
    const stageTitle = this.add.text(360, 540, "", titleStyle(36)).setOrigin(0.5).setDepth(32);
    const bossText = this.add.text(360, 606, "", bodyStyle(25, "#fff0bd")).setOrigin(0.5).setDepth(32);
    const ruleText = this.add
      .text(360, 654, "", bodyStyle(22, "#f6e4b5"))
      .setOrigin(0.5)
      .setWordWrapWidth(620)
      .setDepth(32);
    const heroText = this.add.text(360, 706, "", bodyStyle(21, "#ccecff")).setOrigin(0.5).setDepth(32);
    const statusText = this.add
      .text(360, 760, "", bodyStyle(22, "#ffe07a"))
      .setOrigin(0.5)
      .setWordWrapWidth(620)
      .setDepth(32);

    const stageButtons = CAMPAIGN_YEARS.map((stage, index) => {
      const x = 72 + index * 64;
      const image = this.add
        .image(x, 836, "rank-badge")
        .setDisplaySize(52, 52)
        .setDepth(35)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x, 836, `${stage.year}`, bodyStyle(20, "#fff0bd"))
        .setOrigin(0.5)
        .setDepth(36);

      image
        .on("pointerdown", () => image.setDisplaySize(46, 46))
        .on("pointerout", () => renderStage())
        .on("pointerup", () => {
          selectedIndex = index;
          renderStage();
        });

      return { image, label };
    });

    const startButton = this.add.image(360, 960, "gold-action-button").setDisplaySize(440, 116).setDepth(40);
    const startLabel = this.add.text(360, 960, "", buttonLabelStyle(30)).setOrigin(0.5).setDepth(41);
    const startHit = this.add.zone(360, 960, 440, 116).setDepth(42);

    const renderStage = (): void => {
      const stage = CAMPAIGN_YEARS[selectedIndex];
      const unlocked = stage.year <= save.unlockedYear;
      const score = save.highScores[String(stage.year)] ?? 0;
      stageCounter.setText(`第 ${stage.year} 關　·　${stage.year} / ${CAMPAIGN_YEARS.length}`);
      picture.setTexture(`campaign-stage-${stage.year}`).clearTint().setAlpha(unlocked ? 1 : 0.72);
      if (!unlocked) picture.setTint(0x777777);
      stageTitle.setText(stage.title).setColor(unlocked ? "#ffe4a3" : "#d7d0c5");
      bossText.setText(`首領　${stage.boss}`);
      ruleText.setText(`戰役規則　${stage.rule}`);
      heroText.setText(`推薦英雄　${stage.recommendedHero}`);
      statusText
        .setText(
          unlocked
            ? score > 0
              ? `已完成　·　最高分 ${score}`
              : "已解鎖　·　尚未通關"
            : `尚未解鎖　·　通過第 ${stage.year - 1} 關後開放`,
        )
        .setColor(unlocked ? "#ffe07a" : "#c8c1b7");

      stageButtons.forEach(({ image, label }, index) => {
        const yearUnlocked = index + 1 <= save.unlockedYear;
        const selected = index === selectedIndex;
        image
          .clearTint()
          .setAlpha(yearUnlocked ? 1 : 0.58)
          .setDisplaySize(selected ? 60 : 52, selected ? 60 : 52);
        if (!yearUnlocked) image.setTint(0x777777);
        else if (selected) image.setTint(0xffc94f);
        label
          .setText(`${index + 1}`)
          .setColor(selected ? "#fff7cf" : yearUnlocked ? "#fff0bd" : "#aaa39a")
          .setFontSize(selected ? 24 : 20);
      });

      startButton.clearTint().setAlpha(unlocked ? 1 : 0.62);
      if (!unlocked) startButton.setTint(0x7c746c);
      startLabel.setText(unlocked ? "開始戰役" : "尚未解鎖").setAlpha(unlocked ? 1 : 0.78);
      startHit.removeAllListeners("pointerdown");
      startHit.removeInteractive();
      if (unlocked) {
        startHit
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => this.scene.start("pve-battle", { year: stage.year }));
      }
    };

    makeTextButton(
      this,
      58,
      330,
      "◀",
      () => {
        selectedIndex = (selectedIndex + CAMPAIGN_YEARS.length - 1) % CAMPAIGN_YEARS.length;
        renderStage();
      },
      44,
      90,
      360,
    );
    makeTextButton(
      this,
      662,
      330,
      "▶",
      () => {
        selectedIndex = (selectedIndex + 1) % CAMPAIGN_YEARS.length;
        renderStage();
      },
      44,
      90,
      360,
    );

    this.add
      .image(360, 1140, "gold-action-button")
      .setDisplaySize(300, 84)
      .setDepth(40)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("home"));
    this.add
      .text(360, 1140, "返回主城", buttonLabelStyle(23))
      .setOrigin(0.5)
      .setDepth(41)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("home"));

    renderStage();
  }
}
