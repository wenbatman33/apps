import Phaser from 'phaser';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Bullet } from '../entities/Bullet';
import { Enemy } from '../entities/Enemy';
import { Pickup } from '../entities/Pickup';
import { Player, PLAYER_START_Y } from '../entities/Player';
import { DEPTH, EVENTS, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { DDA } from '../systems/DDA';
import { EventBus } from '../EventBus';
import { AudioSystem } from '../systems/AudioSystem';
import { ExplosionSystem } from '../systems/ExplosionSystem';
import { InputController } from '../systems/InputController';
import { LevelLoader } from '../systems/LevelLoader';
import { getNickname, submitScore } from '../systems/Leaderboard';
import { ObjectPool, type Poolable } from '../systems/ObjectPool';
import { PLASMA_DAMAGE_SCALE, WeaponSystem } from '../systems/WeaponSystem';
import type { EnemyKind, PickupKind, PlayerStats, StageConfig, WaveConfig, WeaponType } from '../types';

const WEAPON_ORDER: WeaponType[] = ['vulcan', 'laser', 'plasma'];
const PLASMA_TICK_MS = 112;
const DEV_WEAPON_KEY = 'skyraider:dev-weapon';
const PICKUP_COLLECT_RADIUS = 38;

export class GameScene extends Phaser.Scene {
  private static devContinueEnabled = false;

  private loaderSystem = new LevelLoader();
  private stage!: StageConfig;
  private inputController!: InputController;
  private weaponSystem = new WeaponSystem();
  private audioSystem = new AudioSystem();
  private explosionSystem!: ExplosionSystem;
  private dda = new DDA();
  private player!: Player;
  private playerBullets!: ObjectPool<Bullet>;
  private enemyBullets!: ObjectPool<Bullet>;
  private enemies!: ObjectPool<Enemy>;
  private pickups!: ObjectPool<Pickup>;
  private stats: PlayerStats = {
    lives: 3,
    bombs: 3,
    power: 1,
    weapon: 'vulcan',
    score: 0,
    combo: 0,
  };
  private maxCombo = 0;
  private stageStartedAt = 0;
  private spawnedWaveIndexes = new Set<number>();
  // 已移除 debug HUD
  private bossHealthBar!: Phaser.GameObjects.Rectangle;
  private bossHealthBack!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  // HUD：以單一圖示 + 數量文字呈現
  private lifeIcon!: Phaser.GameObjects.Image;
  private lifeCountText!: Phaser.GameObjects.Text;
  private bombIcon!: Phaser.GameObjects.Image;
  private bombCountText!: Phaser.GameObjects.Text;
  private powerPips: Phaser.GameObjects.Rectangle[] = [];
  private powerLabel!: Phaser.GameObjects.Text;
  private bombButton!: Phaser.GameObjects.Container;
  private pauseButton!: Phaser.GameObjects.Container;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private scrollingBg!: Phaser.GameObjects.Image;
  // 多層 parallax（如該關卡有 parallax 素材時啟用）
  private parallaxMid?: Phaser.GameObjects.TileSprite;
  private parallaxNear?: Phaser.GameObjects.TileSprite;
  private plasmaGraphics!: Phaser.GameObjects.Graphics;
  private plasmaNextDamageAt = 0;
  private trackerLastFireAt = 0;
  private stageBgm?: Phaser.Sound.BaseSound;
  private backgroundHeight = GAME_HEIGHT;
  private backgroundStartY = GAME_HEIGHT / 2;
  private backgroundEndY = GAME_HEIGHT / 2;
  private stageCleared = false;
  private gameplayStarted = false;
  private exitingStage = false;
  private respawning = false;
  private bossSpawned = false;
  private bossDefeated = false;
  private bossPhaseChanged = false;
  private bossSupportTimer?: Phaser.Time.TimerEvent;
  private hiddenAt = 0;
  private paused = false;
  private pausedAt = 0;
  private stageId = 1;
  private handleSetStage = (event: Event): void => {
    const stageId = (event as CustomEvent<{ stageId: number }>).detail?.stageId;
    if (!stageId) return;
    this.scene.start('GameScene', {
      stageId,
      lives: Math.max(3, this.stats.lives),
      bombs: Math.max(3, this.stats.bombs),
      power: this.stats.power,
      weapon: this.stats.weapon,
      score: this.stats.score,
    });
  };
  private handleSetWeapon = (event: Event): void => {
    const weapon = (event as CustomEvent<{ weapon: WeaponType }>).detail?.weapon;
    if (!weapon || !WEAPON_ORDER.includes(weapon)) return;
    this.stats.weapon = weapon;
    this.emitStats();
  };
  private handleSetContinueMode = (event: Event): void => {
    // 僅 dev 模式才接受續命設定
    if (!document.documentElement.classList.contains('dev-mode')) {
      GameScene.devContinueEnabled = false;
      return;
    }
    const enabled = (event as CustomEvent<{ enabled: boolean }>).detail?.enabled;
    GameScene.devContinueEnabled = enabled ?? false;
  };
  private handleSetPower = (event: Event): void => {
    const power = (event as CustomEvent<{ power: number }>).detail?.power;
    if (typeof power !== 'number') return;
    this.stats.power = Phaser.Math.Clamp(Math.floor(power), 1, 6);
    this.emitStats();
  };
  private handleAudioUnlock = (): void => this.audioSystem.unlock();
  private handlePauseKey = (event: KeyboardEvent): void => {
    if (event.code === 'KeyP' || event.code === 'Escape') {
      this.togglePause();
    }
  };
  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.hiddenAt = this.time.now;
      return;
    }

    if (this.hiddenAt > 0) {
      const pausedFor = Math.max(0, this.time.now - this.hiddenAt);
      this.stageStartedAt += pausedFor;
      this.enemies?.values().forEach((enemy) => {
        if (enemy.active) enemy.spawnTime += pausedFor;
      });
      this.hiddenAt = 0;
    }
    this.clearActiveProjectiles();
  };

  constructor() {
    super('GameScene');
  }

  create(data?: Partial<PlayerStats> & { stageId?: number }): void {
    this.stageId = data?.stageId ?? 1;
    this.stage = this.loaderSystem.loadStage(this.stageId);
    this.stageStartedAt = this.time.now;
    this.spawnedWaveIndexes.clear();
    this.stageCleared = false;
    this.gameplayStarted = false;
    this.exitingStage = false;
    this.respawning = false;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.bossPhaseChanged = false;
    this.stopBossSupportSpawns();
    this.hiddenAt = 0;
    this.paused = false;
    this.pausedAt = 0;
    this.stats = {
      lives: data?.lives ?? 3,
      bombs: data?.bombs ?? 3,
      power: data?.power ?? 1,
      weapon: data?.weapon ?? this.readDevWeapon(),
      score: data?.score ?? 0,
      combo: 0,
    };
    this.maxCombo = 0;

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 若該關卡有 parallax 素材就用多層 parallax 背景（far + mid + near 三層）
    const farKey = `parallax-${this.stageId}-far`;
    const midKey = `parallax-${this.stageId}-mid`;
    const nearKey = `parallax-${this.stageId}-near`;
    // far 必須有，mid 至少要有；near 可選
    const hasParallax = this.textures.exists(farKey) && this.textures.exists(midKey);
    const hasNear = hasParallax && this.textures.exists(nearKey);

    const farTextureKey = hasParallax ? farKey : this.stage.backgroundKey;
    this.scrollingBg = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, farTextureKey)
      .setDepth(DEPTH.background)
      .setAlpha(0.96);
    // 把背景寬度縮放到滿 canvas（避免只看到中間一小條）
    if (this.scrollingBg.width > 0) {
      const widthScale = GAME_WIDTH / this.scrollingBg.width;
      this.scrollingBg.setScale(widthScale);
    }
    this.backgroundHeight = this.scrollingBg.displayHeight;
    if (this.backgroundHeight > GAME_HEIGHT) {
      this.backgroundStartY = GAME_HEIGHT - this.backgroundHeight / 2;
      this.backgroundEndY = this.backgroundHeight / 2;
      this.scrollingBg.setY(this.backgroundStartY);
    } else {
      this.backgroundStartY = GAME_HEIGHT / 2;
      this.backgroundEndY = GAME_HEIGHT / 2;
      this.scrollingBg.setY(GAME_HEIGHT / 2);
    }

    this.parallaxMid = undefined;
    this.parallaxNear = undefined;
    if (hasParallax) {
      // 中層雲/煙：黑底 + ADD blend（黑色透明、亮色疊加發光）
      // tileScale 讓 1024px 寬的素材塞進 432px 畫面
      const tileScale = GAME_WIDTH / 1024;
      this.parallaxMid = this.add
        .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, midKey)
        .setDepth(DEPTH.background + 1)
        .setAlpha(0.55)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.parallaxMid.tileScaleX = tileScale;
      this.parallaxMid.tileScaleY = tileScale;
      // 近層粒子：黑底 + ADD blend（可選）
      if (hasNear) {
        this.parallaxNear = this.add
          .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, nearKey)
          .setDepth(DEPTH.background + 2)
          .setAlpha(0.6)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.parallaxNear.tileScaleX = tileScale;
        this.parallaxNear.tileScaleY = tileScale;
      }
    }

    // 加深暗色 overlay 提升前景子彈/敵機可見度
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020611, 0.34)
      .setDepth(DEPTH.background + 3);

    this.explosionSystem = new ExplosionSystem(this);
    this.player = new Player(this);
    this.player.setPosition(GAME_WIDTH / 2, GAME_HEIGHT + 110);
    this.player.setAlpha(0.95);
    this.inputController = new InputController(this);
    this.createPools();
    this.plasmaGraphics = this.add
      .graphics()
      .setDepth(DEPTH.bullet + 2)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.createHud();
    this.createColliders();
    this.registerDevEvents();
    this.emitStats();
    this.playStageBgm();

    this.playStageIntro();
  }

  shutdown(): void {
    this.stopStageBgm();
    this.unregisterDevEvents();
  }

  update(time: number, delta: number): void {
    if (delta > 250) {
      this.clearActiveProjectiles();
      return;
    }

    if (this.paused) {
      this.updateHud(time);
      return;
    }

    this.scrollBackground(time);
    if (!this.gameplayStarted || this.exitingStage) {
      this.updateHud(time);
      return;
    }

    if (this.respawning) {
      this.spawnScheduledWaves(time);
      this.fireEnemies(time);
      this.updateHud(time);
      this.checkClearCondition(time);
      return;
    }

    const previousX = this.player.x;
    const next = this.inputController.update(this.player.x, this.player.y, delta);
    this.player.setPosition(next.x, next.y);
    this.player.bankToward(next.x - previousX);
    this.handleWeaponSwitch();
    this.firePlayerWeapon(time);
    this.updatePlasmaLaser(time);
    this.fireTrackerSubweapon(time);
    this.updateTrackerBullets(delta);
    this.handleBomb();
    this.spawnScheduledWaves(time);
    this.fireEnemies(time);
    this.collectNearbyPickups();
    this.updateHud(time);
    this.checkClearCondition(time);
  }

  private createPools(): void {
    this.playerBullets = new ObjectPool(() => new Bullet(this), 120);
    this.enemyBullets = new ObjectPool(() => new Bullet(this), 260);
    this.enemies = new ObjectPool(() => new Enemy(this), 58);
    this.pickups = new ObjectPool(() => new Pickup(this), 18);
  }

  private registerDevEvents(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unregisterDevEvents());
    window.addEventListener('skyraider:set-stage', this.handleSetStage);
    window.addEventListener('skyraider:set-weapon', this.handleSetWeapon);
    window.addEventListener('skyraider:set-continue-mode', this.handleSetContinueMode);
    window.addEventListener('skyraider:set-power', this.handleSetPower);
    // 只在 dev 模式（?dev=1）下才讀取 continue toggle；正式模式一律不續命
    const isDevMode = document.documentElement.classList.contains('dev-mode');
    if (isDevMode) {
      const continueToggle = document.querySelector<HTMLInputElement>('#continue-toggle');
      GameScene.devContinueEnabled = !!continueToggle?.checked;
    } else {
      GameScene.devContinueEnabled = false;
    }
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pointerdown', this.handleAudioUnlock);
    window.addEventListener('keydown', this.handleAudioUnlock);
    window.addEventListener('keydown', this.handlePauseKey);
  }

  private unregisterDevEvents(): void {
    window.removeEventListener('skyraider:set-stage', this.handleSetStage);
    window.removeEventListener('skyraider:set-weapon', this.handleSetWeapon);
    window.removeEventListener('skyraider:set-continue-mode', this.handleSetContinueMode);
    window.removeEventListener('skyraider:set-power', this.handleSetPower);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pointerdown', this.handleAudioUnlock);
    window.removeEventListener('keydown', this.handleAudioUnlock);
    window.removeEventListener('keydown', this.handlePauseKey);
  }

  private playStageBgm(): void {
    const key = `bgm-stage-${this.stageId}`;
    if (!this.cache.audio.exists(key)) return;
    this.stopStageBgm();
    this.stageBgm = this.sound.add(key, {
      loop: true,
      volume: 0.2,
    });
    // 雙重保險：部分瀏覽器 / 音檔對 loop flag 表現不一致，
    // 監聽 complete 事件後手動重新播放
    this.stageBgm.on('complete', () => {
      if (this.stageBgm && !this.stageBgm.isPlaying) {
        this.stageBgm.play();
      }
    });
    this.stageBgm.play({ loop: true, volume: 0.2 });
  }

  private stopStageBgm(): void {
    if (!this.stageBgm) return;
    this.stageBgm.stop();
    this.stageBgm.destroy();
    this.stageBgm = undefined;
  }

  private clearActiveProjectiles(): void {
    this.plasmaGraphics?.clear();
    this.playerBullets?.values().forEach((bullet) => bullet.deactivatePoolItem());
    this.enemyBullets?.values().forEach((bullet) => bullet.deactivatePoolItem());
  }

  private scrollBackground(time: number): void {
    const elapsedSeconds = this.gameplayStarted ? Math.max(0, (time - this.stageStartedAt) / 1000) : 0;
    const progress = Phaser.Math.Clamp(elapsedSeconds / Math.max(1, this.stage.duration * 0.72), 0, 1);
    this.scrollingBg.y = Phaser.Math.Linear(this.backgroundStartY, this.backgroundEndY, progress);

    // Parallax 中、近層以時間為基準等速捲動，營造速度感
    if (this.parallaxMid) {
      this.parallaxMid.tilePositionY = -elapsedSeconds * 70;
    }
    if (this.parallaxNear) {
      this.parallaxNear.tilePositionY = -elapsedSeconds * 140;
    }
  }

  private playStageIntro(): void {
    this.player.setAngle(0);
    this.tweens.add({
      targets: this.player,
      y: PLAYER_START_Y,
      alpha: 1,
      duration: 980,
      ease: 'Sine.easeOut',
      onComplete: () => this.showStageTitleCard(),
    });
  }

  private showStageTitleCard(): void {
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 34, GAME_WIDTH, 116, 0x020611, 0.42);
    const titleCard = this.add.container(0, 0, [panel]).setDepth(DEPTH.ui + 3);

    // 文字 shutter 特效：每個字母從上方落下、scale 從 1.6 → 1，帶 glow，依序逐字進場
    const buildShutterText = (
      text: string,
      y: number,
      style: Phaser.Types.GameObjects.Text.TextStyle,
      letterSpacing: number,
    ): { letters: Phaser.GameObjects.Text[]; totalWidth: number } => {
      const letters: Phaser.GameObjects.Text[] = [];
      // 先個別建立量測寬度
      const widths: number[] = [];
      for (const ch of text) {
        const t = this.add.text(0, 0, ch, style).setOrigin(0.5);
        letters.push(t);
        widths.push(t.width + letterSpacing);
      }
      const totalWidth = widths.reduce((a, b) => a + b, 0) - letterSpacing;
      let cursor = -totalWidth / 2;
      letters.forEach((letter, idx) => {
        const w = widths[idx];
        const x = cursor + w / 2 - letterSpacing / 2;
        letter.setPosition(GAME_WIDTH / 2 + x, y);
        cursor += w;
      });
      return { letters, totalWidth };
    };

    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      color: '#ffffff',
      fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 0, color: '#9eeeff', blur: 12, fill: true },
    };
    const subStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      color: '#bfefff',
    };

    const { letters: titleLetters } = buildShutterText(this.stage.name, GAME_HEIGHT / 2 - 58, titleStyle, 0);
    const { letters: subLetters } = buildShutterText(this.stage.subtitle, GAME_HEIGHT / 2 - 18, subStyle, 0);
    titleCard.add([...titleLetters, ...subLetters]);

    // tha 風：每個字「橫向滑入」+ 殘影。隱藏起點：往右偏移、scaleX 壓扁、alpha 0
    const startOffsetX = 36;
    const animateLetter = (
      letter: Phaser.GameObjects.Text,
      finalY: number,
      delay: number,
      duration: number,
    ): void => {
      const finalX = letter.x;
      // 殘影：用半透明複製字符跟在後面（往右偏一點），製造 motion-blur 感
      const ghostA = this.add
        .text(finalX + startOffsetX, finalY, letter.text, letter.style.toJSON())
        .setOrigin(0.5)
        .setAlpha(0);
      const ghostB = this.add
        .text(finalX + startOffsetX * 0.6, finalY, letter.text, letter.style.toJSON())
        .setOrigin(0.5)
        .setAlpha(0);
      ghostA.setTint(0x9eeeff);
      ghostB.setTint(0xffe184);
      titleCard.add([ghostA, ghostB]);

      letter.setX(finalX + startOffsetX);
      letter.setAlpha(0);
      letter.setScale(1, 1);

      // 主字
      this.tweens.add({
        targets: letter,
        x: finalX,
        alpha: 1,
        delay,
        duration,
        ease: 'Cubic.easeOut',
      });
      // 殘影 A：稍慢、淡入後立刻淡出
      this.tweens.add({
        targets: ghostA,
        x: finalX,
        alpha: { from: 0, to: 0.42 },
        delay,
        duration,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: ghostA,
            alpha: 0,
            duration: 100,
            onComplete: () => ghostA.destroy(),
          });
        },
      });
      // 殘影 B：再慢一點
      this.tweens.add({
        targets: ghostB,
        x: finalX,
        alpha: { from: 0, to: 0.28 },
        delay: delay + 18,
        duration,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: ghostB,
            alpha: 0,
            duration: 100,
            onComplete: () => ghostB.destroy(),
          });
        },
      });
    };

    // 標題：每個字 18ms 間距、進場 180ms（俐落 tha 節奏）
    const titleStep = 22;
    const titleDuration = 200;
    titleLetters.forEach((letter, idx) => {
      letter.setY(GAME_HEIGHT / 2 - 58);
      animateLetter(letter, GAME_HEIGHT / 2 - 58, idx * titleStep, titleDuration);
    });
    // 副標：稍快流動
    const subStartDelay = titleLetters.length * titleStep + 60;
    const subStep = 16;
    const subDuration = 160;
    subLetters.forEach((letter, idx) => {
      letter.setY(GAME_HEIGHT / 2 - 18);
      animateLetter(letter, GAME_HEIGHT / 2 - 18, subStartDelay + idx * subStep, subDuration);
    });

    // 全部出場後停留，再整體淡出
    const totalEnter = subStartDelay + subLetters.length * subStep + subDuration;
    this.time.delayedCall(totalEnter + 700, () => {
      this.tweens.add({
        targets: titleCard,
        alpha: 0,
        y: -16,
        duration: 360,
        ease: 'Sine.easeIn',
        onComplete: () => {
          titleCard.destroy(true);
        },
      });
    });
    // 遊戲開始時間以「文字進場完成」為準
    this.time.delayedCall(Math.max(280, totalEnter * 0.4), () => {
      this.gameplayStarted = true;
      this.stageStartedAt = this.time.now;
      this.player.invulnerableUntil = this.time.now + 900;
    });
  }

  private createHud(): void {
    const hudWidth = 412;
    const hudHeight = 58;
    // 面板形狀：左右兩端均有斜切角，包含暫停按鈕區
    const shape: Phaser.Geom.Point[] = [
      new Phaser.Geom.Point(18, 0),
      new Phaser.Geom.Point(hudWidth - 18, 0),
      new Phaser.Geom.Point(hudWidth, 15),
      new Phaser.Geom.Point(hudWidth, hudHeight - 15),
      new Phaser.Geom.Point(hudWidth - 18, hudHeight),
      new Phaser.Geom.Point(14, hudHeight),
      new Phaser.Geom.Point(0, hudHeight - 14),
      new Phaser.Geom.Point(0, 15),
    ];
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x061229, 0.8);
    panelBg.fillPoints(shape, true);
    panelBg.lineStyle(2, 0x54e8ff, 0.62);
    panelBg.strokePoints(shape, true);
    panelBg.lineStyle(1, 0x9cf8ff, 0.25);
    panelBg.strokeRect(10, 9, hudWidth - 20, hudHeight - 18);
    panelBg.fillStyle(0x54e8ff, 0.32);
    panelBg.fillRect(28, 4, 76, 2);
    panelBg.fillRect(222, 4, 112, 2);
    panelBg.fillRect(22, hudHeight - 6, 118, 2);
    panelBg.fillRect(250, hudHeight - 6, 82, 2);
    // 區段分隔線（score | life | bomb | power | pause）
    panelBg.lineStyle(1, 0x54e8ff, 0.28);
    [86, 176, 276, 358].forEach((x) => {
      panelBg.beginPath();
      panelBg.moveTo(x, 11);
      panelBg.lineTo(x + 10, hudHeight - 12);
      panelBg.strokePath();
    });

    const scoreIcon = this.add.graphics();
    scoreIcon.fillStyle(0xffd45c, 0.95);
    scoreIcon.fillCircle(20, 29, 10);
    scoreIcon.lineStyle(2, 0xfff3ad, 0.78);
    scoreIcon.strokeCircle(20, 29, 10);
    scoreIcon.lineStyle(1, 0x6a4512, 0.38);
    scoreIcon.strokeCircle(20, 29, 5);
    this.scoreText = this.add.text(38, 17, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#fff4b8',
      fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 0, color: '#ffe184', blur: 8, fill: true },
    });
    // Lives：飛機圖示 + ×N
    this.lifeIcon = this.add
      .image(112, 32, 'player-ship')
      .setScale(0.18)
      .setAngle(0);
    this.lifeCountText = this.add.text(132, 22, '×3', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#9eeeff',
      fontStyle: 'bold',
    });

    // Bombs：炸彈圖示 + ×N
    this.bombIcon = this.add.image(202, 32, 'bomb-button').setScale(0.26);
    this.bombCountText = this.add.text(220, 22, '×3', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#ffe184',
      fontStyle: 'bold',
    });

    // Power：保留 6 個 pip 視覺進度條
    this.powerLabel = this.add.text(282, 6, 'P', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#66f7ff',
      fontStyle: 'bold',
    });
    this.powerPips = Array.from({ length: 6 }, (_, index) =>
      this.add.rectangle(298 + index * 11, 32, 8, 28, 0x66f7ff, 0.95).setOrigin(0.5),
    );

    // 武器名稱顯示已移除
    this.weaponText = this.add.text(0, 0, '', { fontSize: '1px' }).setVisible(false);
    this.add
      .container(10, 16, [
        panelBg,
        scoreIcon,
        this.scoreText,
        this.lifeIcon,
        this.lifeCountText,
        this.bombIcon,
        this.bombCountText,
        this.powerLabel,
        ...this.powerPips,
        this.weaponText,
      ])
      .setDepth(DEPTH.ui);

    // FPS / debug HUD 已移除

    this.bossHealthBack = this.add
      .rectangle(GAME_WIDTH / 2, 82, 300, 10, 0x17223f, 0.82)
      .setDepth(DEPTH.ui)
      .setVisible(false);
    this.bossHealthBar = this.add
      .rectangle(GAME_WIDTH / 2 - 150, 82, 300, 8, 0xff6048, 0.95)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.ui + 1)
      .setVisible(false);

    const bombArt = this.add.image(0, 0, 'bomb-button').setScale(0.78);
    const label = this.add
      .text(0, 33, 'B KEY', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#fff4b8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.bombButton = this.add.container(GAME_WIDTH - 64, GAME_HEIGHT - 82, [bombArt, label]);
    this.bombButton.setSize(74, 74).setDepth(DEPTH.ui).setInteractive({ useHandCursor: true });
    this.bombButton.on('pointerdown', () => this.inputController.queueBomb());

    this.createPauseUi();
  }

  private createPauseUi(): void {
    // 暫停按鈕嵌入 HUD 面板右側
    const pauseBack = this.add.circle(0, 0, 16, 0x041027, 0.85).setStrokeStyle(1.5, 0x73eeff, 0.7);
    const barLeft = this.add.rectangle(-4, 0, 3, 14, 0xd9fbff, 0.95);
    const barRight = this.add.rectangle(4, 0, 3, 14, 0xd9fbff, 0.95);
    // HUD container 在 (10, 16)，所以 local (382, 32) 對應全域 (392, 48)
    this.pauseButton = this.add
      .container(392, 48, [pauseBack, barLeft, barRight])
      .setSize(36, 36)
      .setDepth(DEPTH.ui + 2)
      .setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerdown', () => this.togglePause());

    const overlayBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020611, 0.58);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 280, 142, 0x061229, 0.92);
    panel.setStrokeStyle(1, 0x73eeff, 0.55);
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 34, 'PAUSED', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 18, 'Tap pause or press P to resume', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#bfefff',
      })
      .setOrigin(0.5);
    this.pauseOverlay = this.add
      .container(0, 0, [overlayBg, panel, title, hint])
      .setDepth(DEPTH.ui + 8)
      .setVisible(false)
      .setAlpha(0);
    this.pauseOverlay.setSize(GAME_WIDTH, GAME_HEIGHT).setInteractive();
    this.pauseOverlay.on('pointerdown', () => this.togglePause(false));
  }

  private togglePause(force?: boolean): void {
    if (this.exitingStage || this.stageCleared) return;
    const nextPaused = force ?? !this.paused;
    if (nextPaused === this.paused) return;
    this.paused = nextPaused;
    this.pauseOverlay.setVisible(this.paused).setAlpha(this.paused ? 1 : 0);
    this.physics.world.isPaused = this.paused;
    if (this.paused) {
      this.pausedAt = this.time.now;
      this.tweens.pauseAll();
      this.stageBgm?.pause();
      this.plasmaGraphics.clear();
      return;
    }
    if (this.pausedAt > 0) {
      const pausedFor = Math.max(0, this.time.now - this.pausedAt);
      this.stageStartedAt += pausedFor;
      this.enemies.values().forEach((enemy) => {
        if (enemy.active) enemy.spawnTime += pausedFor;
      });
      this.pausedAt = 0;
    }
    this.tweens.resumeAll();
    this.stageBgm?.resume();
  }

  private createColliders(): void {
    this.physics.add.overlap(
      this.getActiveSprites(this.playerBullets),
      this.getActiveSprites(this.enemies),
      (bulletObject, enemyObject) => this.onPlayerBulletHitsEnemy(bulletObject, enemyObject),
    );
    this.physics.add.overlap(
      this.player,
      this.getActiveSprites(this.enemyBullets),
      (_player, bulletObject) => this.onPlayerHitByBullet(bulletObject),
    );
    this.physics.add.overlap(
      this.player,
      this.getActiveSprites(this.enemies),
      (_player, enemyObject) => this.onPlayerCollidesEnemy(enemyObject),
    );
    this.physics.add.overlap(
      this.player,
      this.getActiveSprites(this.pickups),
      (_player, pickupObject) => this.onPickup(pickupObject),
    );
  }

  private getActiveSprites<T extends Phaser.Physics.Arcade.Image & Poolable>(
    pool: ObjectPool<T>,
  ): T[] {
    return pool.values() as T[];
  }

  private firePlayerWeapon(time: number): void {
    const shots = this.weaponSystem.tryFire(
      time,
      this.player.x,
      this.player.y,
      this.stats.power,
      this.stats.weapon,
    );
    if (shots.length > 0) {
      this.audioSystem.shoot(this.stats.weapon, time);
    }
    for (const shot of shots) {
      const b = this.playerBullets.acquire(
        shot.x,
        shot.y,
        shot.vx,
        shot.vy,
        'player',
        shot.damage,
        shot.texture,
        shot.radius,
      );
      // 清除前一次可能殘留的 tracker 標記
      (b as unknown as { tracker?: boolean }).tracker = false;
    }
  }

  // 雷電系 Plasma：全等級皆為彎曲追蹤閃電。
  // Lv 越高 → 同時鎖定目標越多、光束越粗、分支越多
  private updatePlasmaLaser(time: number): void {
    this.plasmaGraphics.clear();
    if (this.stats.weapon !== 'plasma' || this.stageCleared) return;

    const targets = this.getPlasmaTargets();
    if (targets.length === 0) return;

    const shouldDamage = time >= this.plasmaNextDamageAt;
    if (shouldDamage) {
      this.plasmaNextDamageAt = time + PLASMA_TICK_MS;
    }

    targets.forEach((enemy, index) => {
      this.drawPlasmaArc(enemy, time, index);
      if (shouldDamage && enemy.active) {
        enemy.hitFlash();
        if (enemy.applyDamage(this.getPlasmaDamage())) {
          this.killEnemy(enemy);
        }
      }
    });
  }

  // 副武器：power >= 3 時每 700ms 自動射出 1 顆追蹤導彈
  private fireTrackerSubweapon(time: number): void {
    if (this.stats.power < 3 || this.stageCleared) return;
    const interval = this.stats.power >= 5 ? 500 : 700;
    if (time - this.trackerLastFireAt < interval) return;
    this.trackerLastFireAt = time;
    const target = this.findNearestEnemy();
    if (!target) return;
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const speed = 360;
    // 用 bullet-laser 紋理當追蹤導彈視覺
    const bullet = this.playerBullets.acquire(
      this.player.x,
      this.player.y - 18,
      (dx / length) * speed,
      (dy / length) * speed,
      'player',
      28 + this.stats.power * 4,
      'bullet-laser',
      6,
    );
    // 標記為追蹤型，updateTrackerBullets 會持續調整方向
    (bullet as unknown as { tracker?: boolean }).tracker = true;
  }

  // 追蹤型子彈每 frame 微幅修正方向以朝最近敵人飛行
  private updateTrackerBullets(delta: number): void {
    const turnRate = 0.012 * delta; // 每幀偏轉量
    this.playerBullets.values().forEach((bullet) => {
      if (!bullet.active) return;
      const tagged = bullet as unknown as { tracker?: boolean };
      if (!tagged.tracker) return;
      const target = this.findNearestEnemy(bullet.x, bullet.y);
      if (!target || !bullet.body) return;
      const body = bullet.body as Phaser.Physics.Arcade.Body;
      const dx = target.x - bullet.x;
      const dy = target.y - bullet.y;
      const targetAngle = Math.atan2(dy, dx);
      const currentAngle = Math.atan2(body.velocity.y, body.velocity.x);
      let diff = targetAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const newAngle = currentAngle + Phaser.Math.Clamp(diff, -turnRate, turnRate);
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      body.setVelocity(Math.cos(newAngle) * speed, Math.sin(newAngle) * speed);
      bullet.setRotation(newAngle + Math.PI / 2);
    });
  }

  private findNearestEnemy(fromX = this.player.x, fromY = this.player.y): Enemy | null {
    let best: Enemy | null = null;
    let bestDist = Infinity;
    this.enemies.values().forEach((enemy) => {
      if (!enemy.active || !this.isEnemyDamageable(enemy)) return;
      const d = Phaser.Math.Distance.Between(fromX, fromY, enemy.x, enemy.y);
      if (d < bestDist) {
        bestDist = d;
        best = enemy;
      }
    });
    return best;
  }

  private getPlasmaTargets(): Enemy[] {
    // 雷電風格：lv1=1、lv2=1（更粗）、lv3=2、lv4=3、lv5=4、lv6=5
    const lv = this.stats.power;
    const targetCount = lv >= 6 ? 5 : lv >= 5 ? 4 : lv >= 4 ? 3 : lv >= 3 ? 2 : 1;
    return this.enemies
      .values()
      .filter((enemy) => {
        if (!enemy.active || !this.isEnemyDamageable(enemy)) return false;
        return Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= this.getPlasmaRange();
      })
      .sort((a, b) => {
        const aDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y);
        const bDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y);
        return aDistance - bDistance;
      })
      .slice(0, targetCount);
  }

  private getPlasmaRange(): number {
    // 射程加長：基底 820，每級 +130
    return 820 + this.stats.power * 130;
  }

  private getPlasmaDamage(): number {
    return (3.8 + this.stats.power * 1.15) * PLASMA_DAMAGE_SCALE;
  }

  private drawPlasmaArc(enemy: Enemy, time: number, index: number): void {
    const level = Phaser.Math.Clamp(this.stats.power, 1, 6);
    const startX = this.player.x + (index - (level >= 6 ? 1.5 : 1)) * 9;
    const startY = this.player.y - 30;
    const endX = enemy.x;
    const endY = enemy.y + 12;
    const phase = time * 0.012 + index * 1.9;
    const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
    const amplitude = Phaser.Math.Clamp(distance * (0.075 + level * 0.01), 18, 46 + level * 6) * (index % 2 === 0 ? 1 : -1);
    const pointCount = 26 + level * 3;
    const points = Array.from({ length: pointCount }, (_, pointIndex) => {
      const t = pointIndex / (pointCount - 1);
      const bend = Math.sin(t * Math.PI) * amplitude;
      const pulse = Math.sin(t * Math.PI * (4 + level) + phase) * (8 + level * 2);
      return {
        x: Phaser.Math.Linear(startX, endX, t) + Math.sin(t * Math.PI * 2 + phase) * bend,
        y: Phaser.Math.Linear(startY, endY, t) + pulse,
      };
    });

    const palette = [0xb956ff, 0xd44dff, 0xff4fe8, 0xff68c8, 0xff7cff, 0xffffff];
    const core = palette[level - 1];
    this.strokePlasmaPath(points, 14 + level * 3, 0x8b2dff, 0.08 + level * 0.018);
    this.strokePlasmaPath(points, 6 + level, core, 0.28 + level * 0.055);
    this.strokePlasmaPath(points, 2 + Math.floor(level / 2), 0xf7c0ff, 0.72);
    this.strokePlasmaPath(points, 1.5, 0xffffff, 0.85);

    if (level >= 2) this.drawPlasmaSideRibbon(points, phase, 0.85, 0x7f45ff, level);
    if (level >= 4) this.drawPlasmaSideRibbon(points, phase + Math.PI, -0.85, 0xff59ff, level);
    if (level >= 6) this.drawPlasmaSideRibbon(points, phase * 1.3, 1.35, 0xffffff, level);

    this.plasmaGraphics.lineStyle(1, core, 0.28);
    this.plasmaGraphics.strokeCircle(endX, endY, 14 + level * 4 + Math.sin(phase) * 3);
    if (level >= 3) this.plasmaGraphics.strokeCircle(endX, endY, 22 + level * 4 + Math.cos(phase) * 4);
    this.plasmaGraphics.fillStyle(core, 0.12 + level * 0.02);
    this.plasmaGraphics.fillCircle(endX, endY, 12 + level * 3 + Math.sin(phase) * 3);
    this.plasmaGraphics.fillStyle(0xffffff, 0.72);
    this.plasmaGraphics.fillCircle(endX, endY, 2 + level * 0.4);
  }

  private drawPlasmaSideRibbon(
    points: Array<{ x: number; y: number }>,
    phase: number,
    direction: number,
    color: number,
    level: number,
  ): void {
    const ribbon = points.map((point, index) => {
      const t = index / Math.max(1, points.length - 1);
      return {
        x: point.x + Math.sin(t * Math.PI * 8 + phase) * direction * (3 + level),
        y: point.y + Math.cos(t * Math.PI * 5 + phase) * direction * (2 + level * 0.7),
      };
    });
    this.strokePlasmaPath(ribbon, Math.max(1.5, level * 0.75), color, 0.28);
  }

  private strokePlasmaPath(
    points: Array<{ x: number; y: number }>,
    width: number,
    color: number,
    alpha: number,
  ): void {
    if (points.length === 0) return;
    this.plasmaGraphics.lineStyle(width, color, alpha);
    this.plasmaGraphics.beginPath();
    this.plasmaGraphics.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) {
      this.plasmaGraphics.lineTo(point.x, point.y);
    }
    this.plasmaGraphics.strokePath();
  }

  private handleWeaponSwitch(): void {
    if (!this.inputController.consumeWeaponSwitch()) return;
    this.stats.weapon = this.getNextWeapon(this.stats.weapon);
    this.emitStats();
  }

  private getNextWeapon(current: WeaponType): WeaponType {
    const index = WEAPON_ORDER.indexOf(current);
    return WEAPON_ORDER[(index + 1) % WEAPON_ORDER.length];
  }

  private spawnScheduledWaves(time: number): void {
    const elapsedSeconds = (time - this.stageStartedAt) / 1000;
    this.stage.waves.forEach((wave, index) => {
      if (!this.spawnedWaveIndexes.has(index) && elapsedSeconds >= wave.time) {
        this.spawnedWaveIndexes.add(index);
        this.spawnWave(wave);
      }
    });
  }

  // Boss 戰中循環產生零星敵機干擾，直到 boss 被擊敗
  private startBossSupportSpawns(): void {
    if (this.bossSupportTimer) return;
    this.bossSupportTimer = this.time.addEvent({
      delay: 4200,
      loop: true,
      callback: () => {
        if (
          this.bossDefeated ||
          this.stageCleared ||
          this.exitingStage ||
          !this.bossSpawned
        ) {
          this.stopBossSupportSpawns();
          return;
        }
        const kinds: EnemyKind[] = ['scout', 'drone'];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        const patterns = ['line', 'sine', 'vee', 'zigzag'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const count = 3 + Math.floor(Math.random() * 3); // 3~5 隻
        const intervalMs = 200;
        const baseX = 80 + Math.random() * (GAME_WIDTH - 160);
        for (let i = 0; i < count; i += 1) {
          this.time.delayedCall(i * intervalMs, () => {
            if (this.bossDefeated || this.stageCleared || this.exitingStage) return;
            const offsetX = Phaser.Math.Clamp(baseX + (i - count / 2) * 26, 64, GAME_WIDTH - 64);
            const config = this.loaderSystem.getEnemyConfig(kind);
            const enemy = this.enemies.acquire(
              offsetX,
              -34,
              config,
              pattern,
              this.getStageHpMultiplier() * 0.7,
            );
            this.applyStageEnemyVisual(enemy, kind);
          });
        }
      },
    });
  }

  private stopBossSupportSpawns(): void {
    this.bossSupportTimer?.remove(false);
    this.bossSupportTimer = undefined;
  }

  private spawnWave(wave: WaveConfig): void {
    const interval = wave.intervalMs ?? 400;
    const dda = this.dda.getState(this.time.now);
    const count = Math.max(1, Math.round(wave.count * dda.densityMultiplier));

    for (let index = 0; index < count; index += 1) {
      this.time.delayedCall(index * interval, () => {
        if (this.stageCleared || this.exitingStage) return undefined;
        const x = this.getWaveX(wave, index, count);
        const y = wave.spawn === 'boss' || wave.spawn === 'midboss' ? -150 : -34;
        const config = this.loaderSystem.getEnemyConfig(wave.spawn);
        const enemy = this.enemies.acquire(x, y, config, wave.pattern, this.getStageHpMultiplier() * dda.enemyHpMultiplier);
        this.applyStageEnemyVisual(enemy, wave.spawn);
        if (wave.spawn === 'boss') {
          this.bossSpawned = true;
          EventBus.emit(EVENTS.bossSpawned);
          this.bossHealthBack.setVisible(true);
          this.bossHealthBar.setVisible(true);
          this.startBossSupportSpawns();
        }
        return enemy;
      });
    }
  }

  private applyStageEnemyVisual(enemy: Enemy, kind: EnemyKind): void {
    const stageTints = [0xffffff, 0xffd07a, 0x83d5ff, 0xcdefff, 0xb89cff, 0x73fff1, 0xff7bea, 0xffd34d];
    const tint = stageTints[this.stageId - 1] ?? 0xffffff;
    enemy.clearTint();
    if (kind === 'boss') {
      const key = `boss-stage-${this.stageId}`;
      if (this.textures.exists(key)) enemy.setTexture(key);
      enemy.setScale(0.82 + this.stageId * 0.025);
      return;
    }
    if (kind === 'midboss') {
      const key = `midboss-stage-${this.stageId}`;
      if (this.textures.exists(key)) enemy.setTexture(key);
      enemy.setScale(0.54 + this.stageId * 0.018);
      return;
    }
    if (this.stageId > 1) enemy.setTint(tint);
  }

  private getWaveX(wave: WaveConfig, index: number, count: number): number {
    const margin = 54;
    if (wave.x) return Phaser.Math.Clamp(wave.x, margin, GAME_WIDTH - margin);
    if (wave.pattern === 'vee') {
      const spacing = Math.min(34, (GAME_WIDTH - margin * 2) / Math.max(1, count - 1));
      return Phaser.Math.Clamp(GAME_WIDTH / 2 + (index - (count - 1) / 2) * spacing, margin, GAME_WIDTH - margin);
    }
    if (wave.pattern === 'cross') return index % 2 === 0 ? 68 : GAME_WIDTH - 68;
    if (wave.pattern === 'zigzag') return Phaser.Math.Clamp(70 + ((index * 82) % (GAME_WIDTH - 140)), margin, GAME_WIDTH - margin);
    if (wave.pattern === 'ambush') return index % 2 === 0 ? 76 : GAME_WIDTH - 76;
    return Phaser.Math.Clamp(60 + ((index * 64) % (GAME_WIDTH - 120)), margin, GAME_WIDTH - margin);
  }

  private fireEnemies(time: number): void {
    for (const enemy of this.enemies.values()) {
      if (!enemy.active || time - enemy.lastFireAt < this.getEnemyFireRate(enemy)) continue;
      if (!this.canEnemyFire(enemy)) {
        enemy.lastFireAt = time;
        continue;
      }
      enemy.lastFireAt = time;
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const speed = enemy.bulletSpeed * (this.stageId === 1 ? 0.84 : 1 + (this.stageId - 1) * 0.05);
      const spread = enemy.kind === 'boss' ? [-0.32, 0, 0.32] : enemy.kind === 'midboss' ? [-0.18, 0.18] : [0];
      for (const angleOffset of spread) {
        const angle = Math.atan2(dy, dx) + angleOffset;
        this.enemyBullets.acquire(
          enemy.x,
          enemy.y + 22,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          'enemy',
          1,
          this.getEnemyBulletTexture(enemy),
        );
      }
      if (length === 0) enemy.lastFireAt += 1;
    }
  }

  private canEnemyFire(enemy: Enemy): boolean {
    // scout / drone：偶爾射擊（每次冷卻到時 ~22% 機率才開火），不打太頻繁
    if (enemy.kind === 'scout' || enemy.kind === 'drone') {
      if (enemy.y < 42 || enemy.y > GAME_HEIGHT - 64) return false;
      return Math.random() < 0.22;
    }
    if (enemy.kind === 'boss') return enemy.y >= 88 && enemy.y <= GAME_HEIGHT - 40;
    if (enemy.kind === 'midboss') return enemy.y >= 96 && enemy.y <= GAME_HEIGHT - 40;
    return enemy.y >= 42 && enemy.y <= GAME_HEIGHT - 64;
  }

  private getEnemyFireRate(enemy: Enemy): number {
    if (this.stageId !== 1) return enemy.fireRateMs / (1 + (this.stageId - 1) * 0.08);
    if (enemy.kind === 'boss') return enemy.fireRateMs + 260;
    if (enemy.kind === 'midboss') return enemy.fireRateMs + 420;
    if (enemy.kind === 'gunship') return enemy.fireRateMs + 900;
    return enemy.fireRateMs + 1250;
  }

  private getEnemyBulletTexture(enemy: Enemy): string {
    if (enemy.kind === 'boss') return 'bullet-enemy-boss';
    if (enemy.kind === 'midboss') return 'bullet-enemy-midboss';
    if (enemy.kind === 'gunship') return 'bullet-enemy-gunship';
    if (enemy.kind === 'drone') return 'bullet-enemy-drone';
    return 'bullet-enemy-scout';
  }

  private getStageHpMultiplier(): number {
    return 1 + (this.stageId - 1) * 0.18;
  }

  private handleBomb(): void {
    if (!this.inputController.consumeBomb() || this.stats.bombs <= 0) return;
    this.stats.bombs -= 1;
    this.enemyBullets.values().forEach((bullet) => bullet.deactivatePoolItem());
    this.explosionSystem.bombFlash();
    this.audioSystem.bomb();
    void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => undefined);
    for (const enemy of this.enemies.values()) {
      if (!enemy.active || !this.isEnemyDamageable(enemy)) continue;
      enemy.hitFlash();
      if (enemy.applyDamage(this.getBombDamage(enemy))) {
        this.killEnemy(enemy);
      }
    }
    this.emitStats();
  }

  private getBombDamage(enemy: Enemy): number {
    if (enemy.kind === 'boss') return Math.min(70, enemy.maxHp * 0.045);
    if (enemy.kind === 'midboss') return Math.min(180, enemy.maxHp * 0.22);
    return 999;
  }

  private onPlayerBulletHitsEnemy(
    bulletObject: unknown,
    enemyObject: unknown,
  ): void {
    const bullet = bulletObject as Bullet;
    const enemy = enemyObject as Enemy;
    if (!bullet.active || !enemy.active) return;
    if (!this.isEnemyDamageable(enemy)) return;
    bullet.deactivatePoolItem();
    this.audioSystem.enemyHit(this.time.now);
    enemy.hitFlash();
    if (enemy.applyDamage(bullet.damage)) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: Enemy): void {
    const size = enemy.kind === 'boss' || enemy.kind === 'midboss' ? 'large' : 'medium';
    this.explosionSystem.burst(enemy.x, enemy.y, size);
    this.audioSystem.explosion(enemy.kind);
    const gainedScore = enemy.score + this.stats.combo * 5;
    this.stats.score += gainedScore;
    this.stats.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.stats.combo);

    // 擊殺螢幕震動：boss > midboss > 一般
    if (enemy.kind === 'boss') {
      this.cameras.main.shake(360, 0.014);
    } else if (enemy.kind === 'midboss') {
      this.cameras.main.shake(220, 0.008);
    } else {
      this.cameras.main.shake(70, 0.0028);
    }

    // 分數浮字
    this.spawnScorePopup(enemy.x, enemy.y, gainedScore, enemy.kind);

    this.maybeDropPickup(enemy.x, enemy.y, enemy.kind);
    EventBus.emit(EVENTS.enemyKilled, enemy.kind);
    if (enemy.kind === 'boss') {
      this.bossDefeated = true;
      this.stopBossSupportSpawns();
    }
    enemy.deactivatePoolItem();
    this.emitStats();
  }

  // 分數浮字：擊殺時往上飄、漸隱、自動銷毀
  private spawnScorePopup(x: number, y: number, score: number, kind: EnemyKind): void {
    const isLarge = kind === 'boss' || kind === 'midboss';
    const fontSize = isLarge ? 26 : this.stats.combo >= 30 ? 22 : this.stats.combo >= 10 ? 18 : 15;
    const color = isLarge ? '#ffd166' : this.stats.combo >= 30 ? '#ff8a4f' : this.stats.combo >= 10 ? '#ffe184' : '#ffffff';
    const text = this.add
      .text(x, y - 12, `+${score}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${fontSize}px`,
        color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
        shadow: { offsetX: 0, offsetY: 0, color: '#000', blur: 4, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.vfx + 5);
    this.tweens.add({
      targets: text,
      y: y - 64,
      alpha: 0,
      duration: 720,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
    // 大型敵人額外彈跳
    if (isLarge) {
      this.tweens.add({
        targets: text,
        scale: 1.4,
        duration: 180,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
  }

  private isEnemyDamageable(enemy: Enemy): boolean {
    const bounds = enemy.getBounds();
    return bounds.bottom > 8 && bounds.top < GAME_HEIGHT - 8 && bounds.right > 8 && bounds.left < GAME_WIDTH - 8;
  }

  private maybeDropPickup(x: number, y: number, kind: EnemyKind): void {
    const bonus = this.dda.getState(this.time.now).powerDropBonus;
    // 一般敵人掉寶率降低（原本 0.18 + bonus 太頻繁）
    const chance = kind === 'boss' || kind === 'midboss' ? 1 : 0.08 + bonus * 0.4;
    if (Math.random() > chance) return;
    const roll = Math.random();
    let pickupKind: PickupKind;
    if (kind === 'boss' || kind === 'midboss') {
      pickupKind = `weapon-${this.getNextWeapon(this.stats.weapon)}`;
    } else if (roll < 0.20) {
      // 20%：power（寶物）
      pickupKind = 'power';
    } else if (roll < 0.55) {
      // 35%：weapon
      pickupKind = `weapon-${WEAPON_ORDER[Math.floor(Math.random() * WEAPON_ORDER.length)]}`;
    } else {
      // 45%：bomb
      pickupKind = 'bomb';
    }
    this.pickups.acquire(x, y, pickupKind);
  }

  private onPlayerHitByBullet(
    bulletObject: unknown,
  ): void {
    const bullet = bulletObject as Bullet;
    if (!bullet.active) return;
    bullet.deactivatePoolItem();
    this.damagePlayer();
  }

  private onPlayerCollidesEnemy(
    enemyObject: unknown,
  ): void {
    const enemy = enemyObject as Enemy;
    if (!enemy.active) return;
    if (enemy.kind !== 'boss' && enemy.kind !== 'midboss') {
      enemy.deactivatePoolItem();
      this.explosionSystem.burst(enemy.x, enemy.y, 'medium');
    }
    this.damagePlayer();
  }

  private onPickup(pickupObject: unknown): void {
    const pickup = pickupObject as Pickup;
    if (!pickup.active) return;
    if (pickup.kind === 'power') this.stats.power = Math.min(6, this.stats.power + 1);
    if (pickup.kind === 'bomb') this.stats.bombs = Math.min(3, this.stats.bombs + 1);
    if (pickup.kind.startsWith('weapon-')) {
      this.stats.weapon = pickup.kind.replace('weapon-', '') as WeaponType;
    }
    this.stats.score += 50;
    this.audioSystem.pickup(pickup.kind);
    pickup.deactivatePoolItem();
    this.emitStats();
  }

  private collectNearbyPickups(): void {
    for (const pickup of this.pickups.values()) {
      if (!pickup.active) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.x, pickup.y);
      if (distance <= PICKUP_COLLECT_RADIUS) {
        this.onPickup(pickup);
        continue;
      }

    }
  }

  private damagePlayer(): void {
    if (this.player.isInvulnerable(this.time.now) || this.stageCleared) return;
    this.dda.recordHit(this.time.now);
    this.dda.recordDeath(this.time.now);
    this.stats.lives -= 1;
    this.stats.power = 1;
    this.stats.combo = 0;
    // 被擊落時武器恢復為預設 vulcan
    this.stats.weapon = 'vulcan';
    this.explosionSystem.playerDeath(this.player.x, this.player.y);
    this.audioSystem.playerDeath();
    void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
    this.emitStats();

    if (this.stats.lives < 0) {
      if (GameScene.devContinueEnabled) {
        this.stats.lives = 3;
        this.stats.bombs = Math.max(this.stats.bombs, 2);
        this.stats.power = 1;
        this.enemyBullets.values().forEach((bullet) => bullet.deactivatePoolItem());
        this.playRespawnIntro();
        this.emitStats();
        return;
      }

      this.finish(false);
      return;
    }

    this.playRespawnIntro();
  }

  private playRespawnIntro(): void {
    this.respawning = true;
    this.enemyBullets.values().forEach((bullet) => bullet.deactivatePoolItem());
    this.playerBullets.values().forEach((bullet) => bullet.deactivatePoolItem());
    this.tweens.killTweensOf(this.player);
    this.player.setPosition(GAME_WIDTH / 2, GAME_HEIGHT + 110);
    this.player.setAngle(0);
    this.player.setAlpha(0.5);
    this.player.invulnerableUntil = this.time.now + 2400;
    this.tweens.add({
      targets: this.player,
      y: PLAYER_START_Y,
      alpha: 1,
      duration: 860,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.respawning = false;
        this.player.invulnerableUntil = this.time.now + 1300;
        this.tweens.add({
          targets: this.player,
          alpha: 0.45,
          duration: 110,
          repeat: 8,
          yoyo: true,
          onComplete: () => this.player.setAlpha(1),
        });
      },
    });
  }

  private updateHud(time: number): void {
    this.scoreText.setText(String(this.stats.score));
    const lives = Math.max(0, this.stats.lives);
    const bombs = Math.max(0, this.stats.bombs);
    this.lifeCountText.setText(`×${lives}`);
    this.bombCountText.setText(`×${bombs}`);
    // 沒有炸彈/生命時圖示半透明
    this.lifeIcon.setAlpha(lives > 0 ? 1 : 0.3);
    this.bombIcon.setAlpha(bombs > 0 ? 1 : 0.3);
    this.powerPips.forEach((pip, index) => {
      const levelColors = [0x66f7ff, 0x5dffb0, 0xfff06a, 0xffb35c, 0xff68d8, 0xffffff];
      pip.setFillStyle(
        index < this.stats.power ? levelColors[index] : 0x183153,
        index < this.stats.power ? 0.95 : 0.42,
      );
    });
    this.weaponText.setText(`${this.getWeaponShortName()} L${this.stats.power}`);
    // debug HUD 已停用
    void time;

    const boss = this.enemies.values().find((enemy) => enemy.active && enemy.kind === 'boss');
    if (boss) {
      this.bossHealthBar.width = 300 * Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
      if (!this.bossPhaseChanged && boss.hp < boss.maxHp * 0.5) {
        this.bossPhaseChanged = true;
        EventBus.emit(EVENTS.bossPhaseChanged, 2);
      }
    }
  }

  private getWeaponShortName(): string {
    if (this.stats.weapon === 'plasma') return 'PLS';
    if (this.stats.weapon === 'laser') return 'LSR';
    return 'VLC';
  }

  private checkClearCondition(time: number): void {
    if (this.stageCleared) return;
    const elapsedSeconds = (time - this.stageStartedAt) / 1000;
    const allWavesSpawned = this.spawnedWaveIndexes.size === this.stage.waves.length;
    const anyActiveEnemy = this.enemies.activeCount() > 0;

    if (allWavesSpawned && this.bossSpawned && this.bossDefeated && !anyActiveEnemy && elapsedSeconds > 74) {
      this.stageCleared = true;
      EventBus.emit(EVENTS.stageCleared);
      this.audioSystem.stageClear();
      this.playStageOutro();
    }
  }

  private playStageOutro(): void {
    if (this.paused) this.togglePause(false);
    this.exitingStage = true;
    this.audioSystem.flyAway();
    this.plasmaGraphics.clear();
    this.playerBullets.values().forEach((bullet) => bullet.deactivatePoolItem());
    this.enemyBullets.values().forEach((bullet) => bullet.deactivatePoolItem());
    this.pickups.values().forEach((pickup) => pickup.deactivatePoolItem());
    this.tweens.killTweensOf(this.player);
    this.player.setAlpha(1);
    this.tweens.add({
      targets: this.player,
      x: GAME_WIDTH / 2,
      y: -130,
      angle: 0,
      duration: 1180,
      ease: 'Sine.easeIn',
      onComplete: () => this.finish(true),
    });
  }

  private finish(cleared: boolean): void {
    this.stopStageBgm();
    this.stopBossSupportSpawns();
    // 紀錄成績到排行榜（不論破關或失敗都計入；非同步、不阻塞流程）
    void submitScore({
      name: getNickname(),
      score: this.stats.score,
      stage: this.stage.stageId,
      cleared,
    });
    // 生命值耗盡（任務失敗）直接回主選單
    if (!cleared) {
      this.scene.start('MenuScene');
      return;
    }
    this.scene.start('ResultScene', {
      stageId: this.stage.stageId,
      nextStageId: this.stage.stageId >= this.loaderSystem.getFinalStageId() ? 1 : this.stage.stageId + 1,
      score: this.stats.score,
      combo: this.maxCombo,
      lives: Math.max(0, this.stats.lives),
      bombs: this.stats.bombs,
      power: this.stats.power,
      weapon: this.stats.weapon,
      cleared,
    });
  }

  private emitStats(): void {
    EventBus.emit(EVENTS.statsChanged, { ...this.stats });
  }

  private readDevWeapon(): WeaponType {
    const value = localStorage.getItem(DEV_WEAPON_KEY);
    return WEAPON_ORDER.includes(value as WeaponType) ? (value as WeaponType) : 'vulcan';
  }
}
