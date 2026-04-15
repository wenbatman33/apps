import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, BOARD, DICE, TileType, TILE_CONFIGS, REWARDS } from '../config';
import { Board } from '../objects/Board';
import { Dice, DiceResult } from '../objects/Dice';
import { Token } from '../objects/Token';
import { TopBar } from '../ui/TopBar';
import { BottomNav } from '../ui/BottomNav';
import { DiceButton } from '../ui/DiceButton';
import { RewardPopup } from '../ui/RewardPopup';

export class GameBoardScene extends Phaser.Scene {
  private board!: Board;
  private dice!: Dice;
  private token!: Token;
  private topBar!: TopBar;
  private bottomNav!: BottomNav;
  private diceButton!: DiceButton;
  private rewardPopup!: RewardPopup;

  private coins: number = 0;
  private diceCount: number = DICE.startDice;
  private isProcessing: boolean = false;

  constructor() {
    super({ key: 'GameBoardScene' });
  }

  create() {
    this.createBackground();
    this.createClouds();
    this.createCityPlaceholder();

    this.board = new Board(this);
    this.token = new Token(this, this.board);
    this.dice = new Dice(this);

    this.topBar = new TopBar(this, this.coins, this.diceCount);
    this.bottomNav = new BottomNav(this);
    this.diceButton = new DiceButton(this);
    this.rewardPopup = new RewardPopup(this);

    this.diceButton.onRoll = () => this.handleRoll();

    // 暴露到 window 方便測試
    (window as any).__GAME_SCENE__ = this;

    console.log('GameBoardScene created');
  }

  private createBackground() {
    const bg = this.add.graphics();
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(0xB3 + (0xE1 - 0xB3) * t);
      const g = Math.floor(0xE5 + (0xF5 - 0xE5) * t);
      const b = Math.floor(0xFC + (0xFE - 0xFC) * t);
      const color = (r << 16) | (g << 8) | b;
      bg.fillStyle(color, 1);
      bg.fillRect(0, (GAME_HEIGHT / steps) * i, GAME_WIDTH, GAME_HEIGHT / steps + 1);
    }
    bg.fillStyle(COLORS.creamWhite, 0.6);
    bg.fillRect(0, GAME_HEIGHT * 0.5, GAME_WIDTH, GAME_HEIGHT * 0.5);
  }

  private createClouds() {
    const cloudPositions = [
      { x: 60, y: 90, scale: 0.8 },
      { x: 280, y: 60, scale: 1 },
      { x: 170, y: 130, scale: 0.6 },
    ];
    cloudPositions.forEach((pos, i) => {
      const cloud = this.add.container(pos.x, pos.y);
      const g = this.add.graphics();
      g.fillStyle(0xFFFFFF, 0.6);
      g.fillCircle(0, 0, 20 * pos.scale);
      g.fillCircle(18 * pos.scale, -5, 15 * pos.scale);
      g.fillCircle(-16 * pos.scale, 2, 14 * pos.scale);
      g.fillCircle(8 * pos.scale, 5, 12 * pos.scale);
      cloud.add(g);
      this.tweens.add({
        targets: cloud, x: pos.x + 30, duration: 6000 + i * 2000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });
  }

  private createCityPlaceholder() {
    const buildings = [
      { x: 30, w: 40, h: 80, color: COLORS.sakuraPink },
      { x: 75, w: 35, h: 100, color: COLORS.softBlue },
      { x: 115, w: 50, h: 70, color: COLORS.mintGreen },
      { x: 165, w: 30, h: 110, color: COLORS.lemonYellow },
      { x: 200, w: 45, h: 85, color: COLORS.lightPurple },
      { x: 250, w: 35, h: 95, color: COLORS.warmOrange },
      { x: 290, w: 40, h: 75, color: COLORS.sakuraPink },
      { x: 335, w: 35, h: 65, color: COLORS.softBlue },
    ];
    const baseY = 310;
    buildings.forEach((b, i) => {
      const g = this.add.graphics();
      g.fillStyle(b.color, 0.7);
      g.fillRoundedRect(b.x, baseY - b.h, b.w, b.h, { tl: 8, tr: 8, bl: 0, br: 0 });
      const windowRows = Math.floor(b.h / 22);
      const windowCols = Math.floor(b.w / 16);
      for (let r = 0; r < windowRows; r++) {
        for (let c = 0; c < windowCols; c++) {
          g.fillStyle(0xFFFFFF, 0.5);
          g.fillRoundedRect(b.x + 8 + c * 14, baseY - b.h + 12 + r * 20, 8, 10, 2);
        }
      }
      if (i % 3 === 0) {
        g.fillStyle(b.color, 0.9);
        g.fillTriangle(b.x + b.w / 2, baseY - b.h - 15, b.x, baseY - b.h, b.x + b.w, baseY - b.h);
      }
    });

    const ground = this.add.graphics();
    ground.fillStyle(COLORS.mintGreen, 0.3);
    ground.fillRoundedRect(10, baseY, GAME_WIDTH - 20, 20, 10);

    [50, 140, 260, 340].forEach(tx => {
      const tree = this.add.graphics();
      tree.fillStyle(0xD4A76A, 0.7);
      tree.fillRoundedRect(tx - 3, baseY - 8, 6, 12, 2);
      tree.fillStyle(COLORS.mintGreen, 0.6);
      tree.fillCircle(tx, baseY - 16, 12);
    });
  }

  handleRoll() {
    if (this.isProcessing) return;

    const multiplier = this.diceButton.getMultiplier();

    if (this.diceCount < multiplier) {
      this.rewardPopup.showToast('骰子不足！', '⚠️');
      return;
    }

    this.isProcessing = true;
    this.diceButton.setDisabled(true);

    // 消耗骰子
    this.diceCount -= multiplier;
    this.topBar.updateDice(this.diceCount);

    console.log(`handleRoll: multiplier=${multiplier}, remaining=${this.diceCount}`);

    // 擲骰子
    this.dice.roll((result: DiceResult) => {
      console.log(`Dice result: ${result.total}, doubles=${result.isDoubles}`);

      if (result.isDoubles) {
        this.rewardPopup.showToast(`骰出 ${result.total} 點！雙數加碼！`, '🎉');
      }

      // 角色移動
      this.token.moveTo(this.board, result.total, (landedTileIndex: number) => {
        console.log(`Landed on tile ${landedTileIndex}`);

        // 處理格子事件
        this.handleTileEvent(landedTileIndex, multiplier, () => {
          // 如果是 doubles，額外一次機會
          if (result.isDoubles && this.diceCount >= multiplier) {
            this.rewardPopup.showToast('Doubles！再來一次！', '✨');
            setTimeout(() => {
              this.diceCount -= multiplier;
              this.topBar.updateDice(this.diceCount);

              this.dice.roll((bonusResult: DiceResult) => {
                this.token.moveTo(this.board, bonusResult.total, (bonusIndex: number) => {
                  this.handleTileEvent(bonusIndex, multiplier, () => {
                    this.finishRoll();
                  });
                });
              });
            });
          } else {
            this.finishRoll();
          }
        });
      });
    });
  }

  private finishRoll() {
    if (this.diceCount <= 0) {
      this.diceButton.setDisabled(true);
      this.rewardPopup.showToast('骰子用完了！等待回復中...', '⏳');
    } else {
      this.diceButton.setDisabled(false);
    }
    this.isProcessing = false;
  }

  private handleTileEvent(tileIndex: number, multiplier: number, done: () => void) {
    const tile = this.board.getTile(tileIndex);
    const pos = tile.getPosition();

    switch (tile.type) {
      case TileType.Coin: {
        const amount = Phaser.Math.Between(REWARDS.coin.min, REWARDS.coin.max) * multiplier;
        this.coins += amount;
        this.topBar.updateCoins(this.coins);
        this.rewardPopup.showFloatingText(pos.x, pos.y - 30, `+${amount} 💰`);
        done();
        break;
      }
      case TileType.Chest: {
        const amount = Phaser.Math.Between(REWARDS.chest.min, REWARDS.chest.max) * multiplier;
        this.coins += amount;
        this.topBar.updateCoins(this.coins);
        this.rewardPopup.show({ emoji: '💎', label: '金幣', amount }).then(done);
        break;
      }
      case TileType.Property: {
        this.rewardPopup.showToast('發現物業！建造系統即將推出', '🏠');
        const amount = 100 * multiplier;
        this.coins += amount;
        this.topBar.updateCoins(this.coins);
        this.rewardPopup.showFloatingText(pos.x, pos.y - 30, `+${amount} 💰`);
        done();
        break;
      }
      case TileType.Chance: {
        const isGood = Math.random() > 0.3;
        if (isGood) {
          const bonus = Phaser.Math.Between(100, 400) * multiplier;
          this.coins += bonus;
          this.topBar.updateCoins(this.coins);
          this.rewardPopup.showToast(`機會來了！獲得 ${bonus} 金幣`, '🍀');
          this.rewardPopup.showFloatingText(pos.x, pos.y - 30, `+${bonus} 💰`, '#5BBF8A');
        } else {
          const loss = Math.min(this.coins, Phaser.Math.Between(50, 150));
          this.coins -= loss;
          this.topBar.updateCoins(this.coins);
          this.rewardPopup.showToast(`噢不！損失了 ${loss} 金幣`, '😅');
          this.rewardPopup.showFloatingText(pos.x, pos.y - 30, `-${loss} 💰`, '#FF6B6B');
        }
        done();
        break;
      }
      case TileType.Shield: {
        this.rewardPopup.showToast('獲得防護盾！', '🛡️');
        this.rewardPopup.showFloatingText(pos.x, pos.y - 30, '+1 🛡️', '#7ED6A0');
        done();
        break;
      }
      case TileType.Raid: {
        const amount = Phaser.Math.Between(REWARDS.raid.min, REWARDS.raid.max) * multiplier;
        this.coins += amount;
        this.topBar.updateCoins(this.coins);
        this.rewardPopup.showToast(`突襲成功！搶到 ${amount} 金幣`, '💥');
        this.rewardPopup.show({ emoji: '👊', label: '金幣', amount }).then(done);
        break;
      }
      case TileType.Event: {
        const bonusDice = Phaser.Math.Between(3, 10);
        this.diceCount += bonusDice;
        this.topBar.updateDice(this.diceCount);
        this.rewardPopup.showToast(`特殊事件！獲得 ${bonusDice} 顆骰子`, '⭐');
        this.rewardPopup.showFloatingText(pos.x, pos.y - 30, `+${bonusDice} 🎲`, '#B8A9E8');
        done();
        break;
      }
      default:
        done();
    }
  }
}
