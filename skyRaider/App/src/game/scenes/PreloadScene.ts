import Phaser from 'phaser';
import { createGeneratedAssets } from '../assets/createGeneratedAssets';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

export class PreloadScene extends Phaser.Scene {
  private progressFill!: Phaser.GameObjects.Rectangle;
  private percentText!: Phaser.GameObjects.Text;

  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.createLoadingUi();
    this.load.on('progress', (value: number) => {
      this.progressFill.width = 300 * value;
      this.percentText.setText(`${Math.round(value * 100)}%`);
    });
    this.load.on('complete', () => {
      this.percentText.setText('READY');
    });

    this.load.image('player-ship', 'assets/images/generated/player-ship-premium.png');
    this.load.image('menu-background-premium', 'assets/images/generated/menu-background-premium.png');
    this.load.image('enemy-scout', 'assets/images/generated/enemies/enemy-scout-clean.png');
    this.load.image('enemy-drone', 'assets/images/generated/enemies/enemy-drone-clean.png');
    this.load.image('enemy-gunship', 'assets/images/generated/enemies/enemy-gunship-clean.png');
    this.load.image('enemy-midboss', 'assets/images/generated/enemies/enemy-midboss-clean.png');
    this.load.image('boss-heli', 'assets/images/generated/enemies/boss-heli-clean.png');
    for (let stageId = 1; stageId <= 8; stageId += 1) {
      this.load.image(`boss-stage-${stageId}`, `assets/images/generated/enemies/boss-stage-${stageId}.png`);
      this.load.image(`midboss-stage-${stageId}`, `assets/images/generated/enemies/midboss-stage-${stageId}.png`);
    }
    this.load.svg('bullet-player', 'assets/images/bullet-player.svg', { width: 16, height: 28 });
    this.load.svg('bullet-vulcan', 'assets/images/bullet-vulcan-v2.svg', { width: 12, height: 18 });
    this.load.svg('bullet-laser', 'assets/images/bullet-laser.svg', { width: 24, height: 72 });
    this.load.svg('bullet-plasma', 'assets/images/bullet-plasma.svg', { width: 52, height: 88 });
    this.load.svg('bullet-enemy', 'assets/images/bullet-enemy.svg', { width: 18, height: 18 });
    this.load.svg('bullet-enemy-scout', 'assets/images/bullet-enemy-scout.svg', { width: 16, height: 16 });
    this.load.svg('bullet-enemy-drone', 'assets/images/bullet-enemy-drone.svg', { width: 18, height: 18 });
    this.load.svg('bullet-enemy-gunship', 'assets/images/bullet-enemy-gunship.svg', { width: 18, height: 22 });
    this.load.svg('bullet-enemy-midboss', 'assets/images/bullet-enemy-midboss.svg', { width: 22, height: 22 });
    this.load.svg('bullet-enemy-boss', 'assets/images/bullet-enemy-boss.svg', { width: 24, height: 24 });
    this.load.svg('fragment', 'assets/images/fragment.svg', { width: 8, height: 8 });
    this.load.image('pickup-power', 'assets/images/generated/pickups/pickup-power-gpt2.png');
    this.load.image('pickup-bomb', 'assets/images/generated/pickups/pickup-bomb-gpt2.png');
    this.load.image('pickup-weapon-vulcan', 'assets/images/generated/pickups/pickup-weapon-vulcan-gpt2.png');
    this.load.image('pickup-weapon-laser', 'assets/images/generated/pickups/pickup-weapon-laser-gpt2.png');
    this.load.image('pickup-weapon-plasma', 'assets/images/generated/pickups/pickup-weapon-missile-gpt2.png');
    this.load.image('bomb-button', 'assets/images/generated/pickups/bomb-button-gpt2.png');
    this.load.svg('bg-dawn', 'assets/images/bg-dawn.svg', { width: GAME_WIDTH, height: GAME_HEIGHT });
    this.load.svg('bg-orbit', 'assets/images/bg-orbit.svg', { width: GAME_WIDTH, height: GAME_HEIGHT });

    for (let stageId = 1; stageId <= 8; stageId += 1) {
      this.load.audio(`bgm-stage-${stageId}`, `assets/sound/BGM/stage_${stageId}.mp3`);
      this.load.image(
        `stage-${stageId}-gpt2-long`,
        `assets/ai/gpt2_long_v6/stage-${stageId}-gpt2-long-v6.png`,
      );
    }

    for (let index = 0; index < 8; index += 1) {
      this.load.svg(`explosion-${index}`, `assets/images/explosion-${index}.svg`, {
        width: 96,
        height: 96,
      });
      this.load.image(
        `player-death-explosion-${index}`,
        `assets/images/generated/vfx/player-death-explosion-${index}.png`,
      );
    }
  }

  create(): void {
    createGeneratedAssets(this);
    this.anims.create({
      key: 'player-death-burst',
      frames: Array.from({ length: 8 }, (_, index) => ({ key: `player-death-explosion-${index}` })),
      frameRate: 24,
      repeat: 0,
    });
    this.scene.start('MenuScene');
    requestAnimationFrame(() => {
      document.querySelector('#html-loader')?.classList.add('is-hidden');
    });
  }

  private createLoadingUi(): void {
    this.cameras.main.setBackgroundColor('#050816');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050816, 1);
    this.add.circle(GAME_WIDTH / 2, 300, 190, 0x123764, 0.28);
    this.add.circle(GAME_WIDTH / 2, 300, 118, 0x8b3cff, 0.12);
    this.add
      .text(GAME_WIDTH / 2, 292, 'SKY RAIDER', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 340, 'Loading sortie assets', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#bfefff',
      })
      .setOrigin(0.5);
    this.add.rectangle(GAME_WIDTH / 2, 440, 304, 12, 0x09142e, 0.9).setStrokeStyle(1, 0x73eeff, 0.5);
    this.progressFill = this.add.rectangle(GAME_WIDTH / 2 - 150, 440, 1, 8, 0x66f7ff, 1).setOrigin(0, 0.5);
    this.percentText = this.add
      .text(GAME_WIDTH / 2, 470, '0%', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#fff4b8',
      })
      .setOrigin(0.5);
  }
}
