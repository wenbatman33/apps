import Phaser from "phaser";

export const FONT = '"PingFang TC", "Noto Sans TC", system-ui, sans-serif';

export const titleStyle = (size = 54): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  fontStyle: "bold",
  align: "center",
  color: "#ffe4a3",
  stroke: "#341725",
  strokeThickness: Math.max(7, Math.round(size * 0.16)),
  shadow: { color: "#000000", blur: 7, offsetY: 4, fill: true },
});

export const bodyStyle = (size = 24, color = "#fff0cf"): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  fontStyle: "bold",
  align: "center",
  color,
  stroke: "#261627",
  strokeThickness: Math.max(4, Math.round(size * 0.15)),
  lineSpacing: 5,
  shadow: { color: "#000000", blur: 3, offsetY: 2, fill: true },
});

export const buttonLabelStyle = (size = 28): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  fontStyle: "bold",
  align: "center",
  color: "#4c200d",
  stroke: "#f7c85b",
  strokeThickness: 1,
});

export function makeTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  size = 28,
  hitWidth = 170,
  hitHeight = 88,
): Phaser.GameObjects.Text {
  const text = scene.add
    .text(x, y, label, bodyStyle(size, "#ffe397"))
    .setOrigin(0.5)
    .setAlign("center")
    .setDepth(80);
  const hitArea = scene.add.zone(x, y, hitWidth, hitHeight).setDepth(79).setInteractive({ useHandCursor: true });
  const over = (): Phaser.GameObjects.Text => text.setScale(1.04).setColor("#ffffff");
  const out = (): Phaser.GameObjects.Text => text.setScale(1).setColor("#ffe397");
  hitArea.on("pointerover", over).on("pointerout", out).on("pointerdown", onClick);
  return text;
}

export function addCover(scene: Phaser.Scene, key: string): Phaser.GameObjects.Image {
  return scene.add.image(360, 640, key).setDisplaySize(720, 1280).setDepth(0);
}
