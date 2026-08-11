import Phaser from "phaser";
import "./style.css";
import { BootScene } from "./scenes/BootScene";
import { CampaignScene } from "./scenes/CampaignScene";
import { CoverScene } from "./scenes/CoverScene";
import { HomeScene } from "./scenes/HomeScene";
import { PveBattleScene } from "./scenes/PveBattleScene";
import { ResultScene } from "./scenes/ResultScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: 720,
  height: 1280,
  backgroundColor: "#100d1d",
  scene: [
    BootScene,
    CoverScene,
    HomeScene,
    CampaignScene,
    PveBattleScene,
    ResultScene,
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  input: {
    activePointers: 2,
  },
  render: {
    antialias: true,
    roundPixels: false,
    powerPreference: "high-performance",
  },
};

new Phaser.Game(config);
