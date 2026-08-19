import Phaser from '../../../vendor/phaser.js';
import { Bullet } from '../entities/Bullet.js';
import { Enemy } from '../entities/Enemy.js';
import { Pickup } from '../entities/Pickup.js';
import { Player, PLAYER_START_Y } from '../entities/Player.js';
import { BGM_VOLUME, DEPTH, EVENTS, GAME_HEIGHT, GAME_WIDTH, MASTER_VOLUME } from '../constants.js';
import { DDA } from '../systems/DDA.js';
import { EventBus } from '../EventBus.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { ExplosionSystem } from '../systems/ExplosionSystem.js';
import { InputController } from '../systems/InputController.js';
import { LevelLoader } from '../systems/LevelLoader.js';
import { getNickname, submitScore } from '../systems/Leaderboard.js';
import { ObjectPool } from '../systems/ObjectPool.js';
import { PLASMA_DAMAGE_SCALE, WeaponSystem } from '../systems/WeaponSystem.js';
const WEAPON_ORDER = ['vulcan', 'laser', 'plasma'];
const PLASMA_TICK_MS = 112;
const DEV_WEAPON_KEY = 'skyraider:dev-weapon';
const PICKUP_COLLECT_RADIUS = 38;
// 分數文字可用寬度（HUD 上分數圖示右側 ~ 分隔線之間）
const SCORE_MAX_WIDTH = 58;
// Boss 戰鬥音樂：所有關卡的大魔王共用 Titan Descent，原速播放
const BOSS_BGM_KEY = 'bgm-boss';
const BOSS_BGM_RATE = 1.0;
export class GameScene extends Phaser.Scene {
    static devContinueEnabled = false;
    loaderSystem = new LevelLoader();
    stage;
    inputController;
    weaponSystem = new WeaponSystem();
    audioSystem = new AudioSystem();
    explosionSystem;
    dda = new DDA();
    player;
    playerBullets;
    enemyBullets;
    enemies;
    pickups;
    stats = {
        lives: 3,
        bombs: 3,
        power: 1,
        weapon: 'vulcan',
        score: 0,
        combo: 0,
    };
    maxCombo = 0;
    stageStartedAt = 0;
    spawnedWaveIndexes = new Set();
    // 已移除 debug HUD
    bossHealthBar;
    bossHealthBack;
    scoreText;
    weaponText;
    // HUD：以單一圖示 + 數量文字呈現
    lifeIcon;
    lifeCountText;
    bombIcon;
    bombCountText;
    powerPips = [];
    powerLabel;
    bombButton;
    pauseOverlay;
    scrollingBg;
    // 多層 parallax（如該關卡有 parallax 素材時啟用）
    parallaxMid;
    parallaxNear;
    plasmaGraphics;
    plasmaNextDamageAt = 0;
    trackerLastFireAt = 0;
    stageBgm;
    // 正在淡出的舊 BGM（boss 切歌用），場景關閉時必須一併停掉
    fadingBgm;
    backgroundHeight = GAME_HEIGHT;
    backgroundStartY = GAME_HEIGHT / 2;
    backgroundEndY = GAME_HEIGHT / 2;
    stageCleared = false;
    gameplayStarted = false;
    exitingStage = false;
    respawning = false;
    bossSpawned = false;
    bossDefeated = false;
    bossPhaseChanged = false;
    bossSupportTimer;
    hiddenAt = 0;
    paused = false;
    pausedAt = 0;
    stageId = 1;
    handleSetStage = (event) => {
        const stageId = event.detail?.stageId;
        if (!stageId)
            return;
        this.scene.start('GameScene', {
            stageId,
            lives: Math.max(3, this.stats.lives),
            bombs: Math.max(3, this.stats.bombs),
            power: this.stats.power,
            weapon: this.stats.weapon,
            score: this.stats.score,
        });
    };
    handleSetWeapon = (event) => {
        const weapon = event.detail?.weapon;
        if (!weapon || !WEAPON_ORDER.includes(weapon))
            return;
        this.stats.weapon = weapon;
        this.emitStats();
    };
    handleSetContinueMode = (event) => {
        // 僅 dev 模式才接受續命設定
        if (!document.documentElement.classList.contains('dev-mode')) {
            GameScene.devContinueEnabled = false;
            return;
        }
        const enabled = event.detail?.enabled;
        GameScene.devContinueEnabled = enabled ?? false;
    };
    handleSetPower = (event) => {
        const power = event.detail?.power;
        if (typeof power !== 'number')
            return;
        this.stats.power = Phaser.Math.Clamp(Math.floor(power), 1, 6);
        this.emitStats();
    };
    handleAudioUnlock = () => this.audioSystem.unlock();
    handlePauseKey = (event) => {
        if (event.code === 'KeyP' || event.code === 'Escape') {
            this.togglePause();
        }
    };
    handleVisibilityChange = () => {
        if (document.hidden) {
            // 離開分頁/視窗 → 自動暫停（玩家回來後需點擊畫面繼續）
            this.hiddenAt = this.time.now;
            this.togglePause(true);
            return;
        }
        // 回到分頁時保持暫停狀態，讓玩家點擊 overlay 繼續
        if (this.hiddenAt > 0) {
            const pausedFor = Math.max(0, this.time.now - this.hiddenAt);
            this.stageStartedAt += pausedFor;
            this.enemies?.values().forEach((enemy) => {
                if (enemy.active)
                    enemy.spawnTime += pausedFor;
            });
            this.hiddenAt = 0;
        }
        this.clearActiveProjectiles();
    };
    constructor() {
        super('GameScene');
    }
    init(data) {
        this.stageId = data?.stageId ?? 1;
    }
    // 只載入「這一關」需要的素材，避免首次進遊戲就下載全部 8 關的資源。
    // 已載過的關卡會留在 cache，重玩不會重新下載。
    preload() {
        const stageId = this.stageId;
        const pending = [];
        if (!this.cache.audio.exists(`bgm-stage-${stageId}`)) {
            this.load.audio(`bgm-stage-${stageId}`, `assets/sound/BGM/stage_${stageId}.m4a`);
            pending.push('bgm');
        }
        if (!this.cache.audio.exists('bgm-boss')) {
            this.load.audio('bgm-boss', 'assets/sound/BGM/boss_titan_descent.m4a');
            pending.push('boss-bgm');
        }
        if (!this.textures.exists(`stage-${stageId}-gpt2-long`)) {
            this.load.image(`stage-${stageId}-gpt2-long`, `assets/ai/gpt2_long_v6/stage-${stageId}-gpt2-long-v6.webp`);
            pending.push('bg');
        }
        ['far', 'mid', 'near'].forEach((layer) => {
            const key = `parallax-${stageId}-${layer}`;
            if (this.textures.exists(key))
                return;
            this.load.image(key, `assets/parallax/stage-${stageId}/${layer}.webp`);
            pending.push(key);
        });
        if (!this.textures.exists(`boss-stage-${stageId}`)) {
            this.load.image(`boss-stage-${stageId}`, `assets/images/generated/enemies/boss-stage-${stageId}.png`);
            pending.push('boss');
        }
        if (!this.textures.exists(`midboss-stage-${stageId}`)) {
            this.load.image(`midboss-stage-${stageId}`, `assets/images/generated/enemies/midboss-stage-${stageId}.png`);
            pending.push('midboss');
        }
        if (pending.length === 0)
            return;
        this.showStageLoader();
    }
    // 關卡素材下載中顯示 HTML loader（沿用開場那張，避免黑畫面）。
    // 進度條本身是跑馬燈動畫，百分比改寫在副標文字上。
    showStageLoader() {
        const loader = document.querySelector('#html-loader');
        const subtitle = loader?.querySelector('.loader-subtitle');
        loader?.classList.remove('is-hidden');
        if (subtitle)
            subtitle.textContent = `Loading stage ${this.stageId}`;
        this.load.on('progress', (value) => {
            if (subtitle)
                subtitle.textContent = `Loading stage ${this.stageId} — ${Math.round(value * 100)}%`;
        });
        this.load.once('complete', () => {
            loader?.classList.add('is-hidden');
            if (subtitle)
                subtitle.textContent = 'Initializing combat systems';
        });
    }
    create(data) {
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
        // 預設武器：dev 模式才讀 localStorage 設定，正式模式一律 vulcan
        const isDevMode = document.documentElement.classList.contains('dev-mode');
        const defaultWeapon = isDevMode ? this.readDevWeapon() : 'vulcan';
        this.stats = {
            lives: data?.lives ?? 3,
            bombs: data?.bombs ?? 3,
            power: data?.power ?? 1,
            weapon: data?.weapon ?? defaultWeapon,
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
        }
        else {
            this.backgroundStartY = GAME_HEIGHT / 2;
            this.backgroundEndY = GAME_HEIGHT / 2;
            this.scrollingBg.setY(GAME_HEIGHT / 2);
        }
        this.parallaxMid = undefined;
        this.parallaxNear = undefined;
        if (hasParallax) {
            // 中層雲/煙：黑底 + ADD blend（黑色透明、亮色疊加發光）
            // tileScale 讓 parallax 素材塞滿畫面寬度。
            // 依實際紋理寬度計算，素材日後換解析度也不會跑版
            const parallaxWidth = this.textures.get(midKey).getSourceImage().width || GAME_WIDTH;
            const tileScale = GAME_WIDTH / parallaxWidth;
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
    shutdown() {
        this.stopStageBgm();
        this.audioSystem.stopWeaponLoop();
        this.unregisterDevEvents();
    }
    update(time, delta) {
        if (delta > 250) {
            this.clearActiveProjectiles();
            this.audioSystem.stopWeaponLoop();
            return;
        }
        if (this.paused) {
            this.updateHud(time);
            return;
        }
        // 機炮掃射循環：停火後由 AudioSystem 自行淡出
        this.audioSystem.tickWeaponLoop(time);
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
    createPools() {
        this.playerBullets = new ObjectPool(() => new Bullet(this), 120);
        this.enemyBullets = new ObjectPool(() => new Bullet(this), 260);
        this.enemies = new ObjectPool(() => new Enemy(this), 58);
        this.pickups = new ObjectPool(() => new Pickup(this), 18);
    }
    registerDevEvents() {
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unregisterDevEvents());
        window.addEventListener('skyraider:set-stage', this.handleSetStage);
        window.addEventListener('skyraider:set-weapon', this.handleSetWeapon);
        window.addEventListener('skyraider:set-continue-mode', this.handleSetContinueMode);
        window.addEventListener('skyraider:set-power', this.handleSetPower);
        // 只在 dev 模式（?dev=1）下才讀取 continue toggle；正式模式一律不續命
        const isDevMode = document.documentElement.classList.contains('dev-mode');
        if (isDevMode) {
            const continueToggle = document.querySelector('#continue-toggle');
            GameScene.devContinueEnabled = !!continueToggle?.checked;
        }
        else {
            GameScene.devContinueEnabled = false;
        }
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('pointerdown', this.handleAudioUnlock);
        window.addEventListener('keydown', this.handleAudioUnlock);
        window.addEventListener('keydown', this.handlePauseKey);
    }
    unregisterDevEvents() {
        window.removeEventListener('skyraider:set-stage', this.handleSetStage);
        window.removeEventListener('skyraider:set-weapon', this.handleSetWeapon);
        window.removeEventListener('skyraider:set-continue-mode', this.handleSetContinueMode);
        window.removeEventListener('skyraider:set-power', this.handleSetPower);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('pointerdown', this.handleAudioUnlock);
        window.removeEventListener('keydown', this.handleAudioUnlock);
        window.removeEventListener('keydown', this.handlePauseKey);
        this.detachResumeListener();
    }
    playStageBgm() {
        // 全域音量統一 60%（音樂與音效共用）
        this.sound.volume = MASTER_VOLUME;
        const key = `bgm-stage-${this.stageId}`;
        if (!this.cache.audio.exists(key))
            return;
        this.stopStageBgm();
        this.stageBgm = this.sound.add(key, {
            loop: true,
            volume: BGM_VOLUME,
        });
        // 雙重保險：部分瀏覽器 / 音檔對 loop flag 表現不一致，
        // 監聽 complete 事件後手動重新播放
        this.stageBgm.on('complete', () => {
            if (this.stageBgm && !this.stageBgm.isPlaying) {
                this.stageBgm.play();
            }
        });
        this.stageBgm.play({ loop: true, volume: BGM_VOLUME });
    }
    // Boss 登場時淡出關卡 BGM，換上戰鬥主題（加速播放提升壓迫感）
    playBossBgm() {
        const key = BOSS_BGM_KEY;
        if (!this.cache.audio.exists(key))
            return;
        const previous = this.stageBgm;
        this.stageBgm = undefined;
        if (previous) {
            // 淡出舊曲，避免硬切
            this.fadingBgm = previous;
            this.tweens.add({
                targets: previous,
                volume: 0,
                duration: 620,
                onComplete: () => {
                    previous.stop();
                    previous.destroy();
                    if (this.fadingBgm === previous)
                        this.fadingBgm = undefined;
                },
            });
        }
        const bossBgm = this.sound.add(key, { loop: true, volume: 0 });
        bossBgm.on('complete', () => {
            if (!bossBgm.isPlaying)
                bossBgm.play();
        });
        bossBgm.play({ loop: true, volume: 0 });
        const withRate = bossBgm;
        withRate.setRate?.(BOSS_BGM_RATE);
        // 警報聲先響，音樂再淡入
        this.tweens.add({
            targets: bossBgm,
            volume: BGM_VOLUME,
            duration: 900,
            delay: 260,
        });
        this.stageBgm = bossBgm;
    }
    stopStageBgm() {
        if (this.fadingBgm) {
            this.tweens.killTweensOf(this.fadingBgm);
            this.fadingBgm.stop();
            this.fadingBgm.destroy();
            this.fadingBgm = undefined;
        }
        if (!this.stageBgm)
            return;
        this.tweens.killTweensOf(this.stageBgm);
        this.stageBgm.stop();
        this.stageBgm.destroy();
        this.stageBgm = undefined;
    }
    // 分數位數變多時自動縮小字級，避免壓到 HUD 的飛機圖示
    fitScoreText() {
        if (!this.scoreText)
            return;
        this.scoreText.setScale(1);
        const width = this.scoreText.width;
        if (width > SCORE_MAX_WIDTH) {
            this.scoreText.setScale(Math.max(0.58, SCORE_MAX_WIDTH / width));
        }
    }
    clearActiveProjectiles() {
        this.plasmaGraphics?.clear();
        this.playerBullets?.values().forEach((bullet) => bullet.deactivatePoolItem());
        this.enemyBullets?.values().forEach((bullet) => bullet.deactivatePoolItem());
    }
    scrollBackground(time) {
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
    playStageIntro() {
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
    showStageTitleCard() {
        const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 34, GAME_WIDTH, 116, 0x020611, 0.42);
        const titleCard = this.add.container(0, 0, [panel]).setDepth(DEPTH.ui + 3);
        // 文字 shutter 特效：每個字母從上方落下、scale 從 1.6 → 1，帶 glow，依序逐字進場
        const buildShutterText = (text, y, style, letterSpacing) => {
            const letters = [];
            // 先個別建立量測寬度
            const widths = [];
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
        const titleStyle = {
            fontFamily: 'Arial, sans-serif',
            fontSize: '30px',
            color: '#ffffff',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 0, color: '#9eeeff', blur: 12, fill: true },
        };
        const subStyle = {
            fontFamily: 'Arial, sans-serif',
            fontSize: '17px',
            color: '#bfefff',
        };
        const { letters: titleLetters } = buildShutterText(this.stage.name, GAME_HEIGHT / 2 - 58, titleStyle, 0);
        const { letters: subLetters } = buildShutterText(this.stage.subtitle, GAME_HEIGHT / 2 - 18, subStyle, 0);
        titleCard.add([...titleLetters, ...subLetters]);
        // tha 風：每個字「橫向滑入」+ 殘影。隱藏起點：往右偏移、scaleX 壓扁、alpha 0
        const startOffsetX = 36;
        const animateLetter = (letter, finalY, delay, duration) => {
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
    createHud() {
        const hudWidth = 412;
        const hudHeight = 58;
        // 面板形狀：左右兩端均有斜切角，包含暫停按鈕區
        const shape = [
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
        // 分數：origin 設為左中，超長時以 setScale 等比縮小（見 fitScoreText）
        this.scoreText = this.add
            .text(38, 28, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#fff4b8',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 0, color: '#ffe184', blur: 8, fill: true },
        })
            .setOrigin(0, 0.5);
        // Lives：飛機圖示 + ×N（sprite 已縮成 236×256，HUD 用更小 scale）
        this.lifeIcon = this.add
            .image(112, 32, 'player-ship')
            .setScale(0.11)
            .setAngle(0);
        this.lifeCountText = this.add.text(132, 22, '×3', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#9eeeff',
            fontStyle: 'bold',
        });
        // Bombs：炸彈圖示 + ×N（sprite 已預縮成 192px）
        this.bombIcon = this.add.image(202, 32, 'bomb-button').setScale(0.16);
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
        this.powerPips = Array.from({ length: 6 }, (_, index) => this.add.rectangle(298 + index * 11, 32, 8, 28, 0x66f7ff, 0.95).setOrigin(0.5));
        // 武器名稱顯示已移除
        this.weaponText = this.add.text(0, 0, '', { fontSize: '1px' }).setVisible(false);
        // 手機 ENVELOP 模式：依當前視窗比例算出實際上邊裁切量，HUD 緊貼裁切下緣
        const fillMode = window.__SR_FILL_MODE__ === true;
        let hudY = 16;
        if (fillMode) {
            const vpW = window.innerWidth;
            const vpH = window.innerHeight;
            const gameRatio = GAME_HEIGHT / GAME_WIDTH;
            const canvasDisplayH = vpW * gameRatio;
            const overflow = Math.max(0, canvasDisplayH - vpH);
            const cropTopInGame = (overflow / 2) * (GAME_WIDTH / vpW);
            hudY = Math.max(8, Math.round(cropTopInGame + 6));
        }
        this.add
            .container(10, hudY, [
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
        const bombArt = this.add.image(0, 0, 'bomb-button').setScale(0.31);
        const label = this.add
            .text(0, 33, 'B KEY', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '10px',
            color: '#fff4b8',
            fontStyle: 'bold',
        })
            .setOrigin(0.5);
        // 手機 ENVELOP 模式：依視窗比例算出實際下邊裁切，炸彈鈕緊貼裁切上緣
        const fillMode2 = window.__SR_FILL_MODE__ === true;
        let bombY = GAME_HEIGHT - 82;
        if (fillMode2) {
            const vpW = window.innerWidth;
            const vpH = window.innerHeight;
            const gameRatio = GAME_HEIGHT / GAME_WIDTH;
            const canvasDisplayH = vpW * gameRatio;
            const overflow = Math.max(0, canvasDisplayH - vpH);
            const cropBottomInGame = (overflow / 2) * (GAME_WIDTH / vpW);
            bombY = Math.round(GAME_HEIGHT - cropBottomInGame - 50);
        }
        this.bombButton = this.add.container(GAME_WIDTH - 64, bombY, [bombArt, label]);
        this.bombButton.setSize(74, 74).setDepth(DEPTH.ui).setInteractive({ useHandCursor: true });
        this.bombButton.on('pointerdown', () => this.inputController.queueBomb());
        this.createPauseUi();
    }
    createPauseUi() {
        // 暫停按鈕已移除（離開視窗自動暫停、回來點擊 overlay 繼續）
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
            .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 18, 'Tap to resume', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
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
    togglePause(force) {
        if (this.exitingStage || this.stageCleared)
            return;
        const nextPaused = force ?? !this.paused;
        if (nextPaused === this.paused)
            return;
        this.paused = nextPaused;
        this.pauseOverlay.setVisible(this.paused).setAlpha(this.paused ? 1 : 0);
        this.physics.world.isPaused = this.paused;
        if (this.paused) {
            this.pausedAt = this.time.now;
            this.audioSystem.stopWeaponLoop();
            this.tweens.pauseAll();
            this.stageBgm?.pause();
            this.plasmaGraphics.clear();
            // DOM 級別備援：直接掛 pointerdown / touchstart 在 canvas，
            // 確保即使 Phaser 輸入系統異常（如 iOS 切換分頁後）仍能取消暫停
            this.attachResumeListener();
            return;
        }
        this.detachResumeListener();
        if (this.pausedAt > 0) {
            const pausedFor = Math.max(0, this.time.now - this.pausedAt);
            this.stageStartedAt += pausedFor;
            this.enemies.values().forEach((enemy) => {
                if (enemy.active)
                    enemy.spawnTime += pausedFor;
            });
            this.pausedAt = 0;
        }
        this.tweens.resumeAll();
        this.stageBgm?.resume();
    }
    resumeDomListener;
    attachResumeListener() {
        if (this.resumeDomListener)
            return;
        this.resumeDomListener = (e) => {
            e.preventDefault?.();
            this.togglePause(false);
        };
        const canvas = this.game.canvas;
        canvas.addEventListener('pointerdown', this.resumeDomListener, { passive: false, capture: true });
        canvas.addEventListener('touchstart', this.resumeDomListener, { passive: false, capture: true });
    }
    detachResumeListener() {
        if (!this.resumeDomListener)
            return;
        const canvas = this.game.canvas;
        canvas.removeEventListener('pointerdown', this.resumeDomListener, { capture: true });
        canvas.removeEventListener('touchstart', this.resumeDomListener, { capture: true });
        this.resumeDomListener = undefined;
    }
    createColliders() {
        this.physics.add.overlap(this.getActiveSprites(this.playerBullets), this.getActiveSprites(this.enemies), (bulletObject, enemyObject) => this.onPlayerBulletHitsEnemy(bulletObject, enemyObject));
        this.physics.add.overlap(this.player, this.getActiveSprites(this.enemyBullets), (_player, bulletObject) => this.onPlayerHitByBullet(bulletObject));
        this.physics.add.overlap(this.player, this.getActiveSprites(this.enemies), (_player, enemyObject) => this.onPlayerCollidesEnemy(enemyObject));
        this.physics.add.overlap(this.player, this.getActiveSprites(this.pickups), (_player, pickupObject) => this.onPickup(pickupObject));
    }
    getActiveSprites(pool) {
        return pool.values();
    }
    firePlayerWeapon(time) {
        const shots = this.weaponSystem.tryFire(time, this.player.x, this.player.y, this.stats.power, this.stats.weapon);
        if (shots.length > 0) {
            this.audioSystem.shoot(this.stats.weapon, time, this.stats.power);
        }
        for (const shot of shots) {
            const b = this.playerBullets.acquire(shot.x, shot.y, shot.vx, shot.vy, 'player', shot.damage, shot.texture, shot.radius);
            // 清除前一次可能殘留的 tracker 標記
            b.tracker = false;
        }
    }
    // 雷電系 Plasma：全等級皆為彎曲追蹤閃電。
    // Lv 越高 → 同時鎖定目標越多、光束越粗、分支越多
    updatePlasmaLaser(time) {
        this.plasmaGraphics.clear();
        if (this.stats.weapon !== 'plasma' || this.stageCleared)
            return;
        const targets = this.getPlasmaTargets();
        if (targets.length === 0)
            return;
        const shouldDamage = time >= this.plasmaNextDamageAt;
        if (shouldDamage) {
            this.plasmaNextDamageAt = time + PLASMA_TICK_MS;
        }
        // 電漿為持續光束，以固定節奏補電流音（AudioSystem 內另有最小間隔限制）
        this.audioSystem.plasmaBeam(time);
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
    fireTrackerSubweapon(time) {
        if (this.stats.power < 3 || this.stageCleared)
            return;
        const interval = this.stats.power >= 5 ? 500 : 700;
        if (time - this.trackerLastFireAt < interval)
            return;
        this.trackerLastFireAt = time;
        const target = this.findNearestEnemy();
        if (!target)
            return;
        const dx = target.x - this.player.x;
        const dy = target.y - this.player.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        const speed = 360;
        // 追蹤導彈專用紋理
        const bullet = this.playerBullets.acquire(this.player.x, this.player.y - 18, (dx / length) * speed, (dy / length) * speed, 'player', 28 + this.stats.power * 4, 'tracking-missile', 6);
        // 標記為追蹤型，updateTrackerBullets 會持續調整方向
        bullet.tracker = true;
        this.audioSystem.missile(time);
    }
    // 追蹤型子彈每 frame 微幅修正方向以朝最近敵人飛行
    updateTrackerBullets(delta) {
        const turnRate = 0.012 * delta; // 每幀偏轉量
        this.playerBullets.values().forEach((bullet) => {
            if (!bullet.active)
                return;
            const tagged = bullet;
            if (!tagged.tracker)
                return;
            const target = this.findNearestEnemy(bullet.x, bullet.y);
            if (!target || !bullet.body)
                return;
            const body = bullet.body;
            const dx = target.x - bullet.x;
            const dy = target.y - bullet.y;
            const targetAngle = Math.atan2(dy, dx);
            const currentAngle = Math.atan2(body.velocity.y, body.velocity.x);
            let diff = targetAngle - currentAngle;
            while (diff > Math.PI)
                diff -= Math.PI * 2;
            while (diff < -Math.PI)
                diff += Math.PI * 2;
            const newAngle = currentAngle + Phaser.Math.Clamp(diff, -turnRate, turnRate);
            const speed = Math.hypot(body.velocity.x, body.velocity.y);
            body.setVelocity(Math.cos(newAngle) * speed, Math.sin(newAngle) * speed);
            bullet.setRotation(newAngle + Math.PI / 2);
        });
    }
    findNearestEnemy(fromX = this.player.x, fromY = this.player.y) {
        let best = null;
        let bestDist = Infinity;
        this.enemies.values().forEach((enemy) => {
            if (!enemy.active || !this.isEnemyDamageable(enemy))
                return;
            const d = Phaser.Math.Distance.Between(fromX, fromY, enemy.x, enemy.y);
            if (d < bestDist) {
                bestDist = d;
                best = enemy;
            }
        });
        return best;
    }
    getPlasmaTargets() {
        // 雷電風格：lv1=1、lv2=1（更粗）、lv3=2、lv4=3、lv5=4、lv6=5
        // 小飛機（scout/drone）最多只 1 道光束鎖定，其餘額度給重型敵人
        const lv = this.stats.power;
        const targetCount = lv >= 6 ? 5 : lv >= 5 ? 4 : lv >= 4 ? 3 : lv >= 3 ? 2 : 1;
        const inRange = this.enemies
            .values()
            .filter((enemy) => {
            if (!enemy.active || !this.isEnemyDamageable(enemy))
                return false;
            return Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= this.getPlasmaRange();
        })
            .sort((a, b) => {
            const aDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y);
            const bDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y);
            return aDistance - bDistance;
        });
        const isSmall = (e) => e.kind === 'scout' || e.kind === 'drone';
        const heavies = inRange.filter((e) => !isSmall(e));
        const smalls = inRange.filter(isSmall);
        const picked = [];
        // 重型敵人優先填滿
        for (const h of heavies) {
            if (picked.length >= targetCount)
                break;
            picked.push(h);
        }
        // 還有額度且尚未鎖過小飛機 → 加 1 個小飛機
        if (picked.length < targetCount && smalls.length > 0) {
            picked.push(smalls[0]);
        }
        return picked;
    }
    getPlasmaRange() {
        // 射程加長：基底 820，每級 +130
        return 820 + this.stats.power * 130;
    }
    getPlasmaDamage() {
        return (3.8 + this.stats.power * 1.15) * PLASMA_DAMAGE_SCALE;
    }
    drawPlasmaArc(enemy, time, index) {
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
        if (level >= 2)
            this.drawPlasmaSideRibbon(points, phase, 0.85, 0x7f45ff, level);
        if (level >= 4)
            this.drawPlasmaSideRibbon(points, phase + Math.PI, -0.85, 0xff59ff, level);
        if (level >= 6)
            this.drawPlasmaSideRibbon(points, phase * 1.3, 1.35, 0xffffff, level);
        this.plasmaGraphics.lineStyle(1, core, 0.28);
        this.plasmaGraphics.strokeCircle(endX, endY, 14 + level * 4 + Math.sin(phase) * 3);
        if (level >= 3)
            this.plasmaGraphics.strokeCircle(endX, endY, 22 + level * 4 + Math.cos(phase) * 4);
        this.plasmaGraphics.fillStyle(core, 0.12 + level * 0.02);
        this.plasmaGraphics.fillCircle(endX, endY, 12 + level * 3 + Math.sin(phase) * 3);
        this.plasmaGraphics.fillStyle(0xffffff, 0.72);
        this.plasmaGraphics.fillCircle(endX, endY, 2 + level * 0.4);
    }
    drawPlasmaSideRibbon(points, phase, direction, color, level) {
        const ribbon = points.map((point, index) => {
            const t = index / Math.max(1, points.length - 1);
            return {
                x: point.x + Math.sin(t * Math.PI * 8 + phase) * direction * (3 + level),
                y: point.y + Math.cos(t * Math.PI * 5 + phase) * direction * (2 + level * 0.7),
            };
        });
        this.strokePlasmaPath(ribbon, Math.max(1.5, level * 0.75), color, 0.28);
    }
    strokePlasmaPath(points, width, color, alpha) {
        if (points.length === 0)
            return;
        this.plasmaGraphics.lineStyle(width, color, alpha);
        this.plasmaGraphics.beginPath();
        this.plasmaGraphics.moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) {
            this.plasmaGraphics.lineTo(point.x, point.y);
        }
        this.plasmaGraphics.strokePath();
    }
    handleWeaponSwitch() {
        if (!this.inputController.consumeWeaponSwitch())
            return;
        this.stats.weapon = this.getNextWeapon(this.stats.weapon);
        this.emitStats();
    }
    getNextWeapon(current) {
        const index = WEAPON_ORDER.indexOf(current);
        return WEAPON_ORDER[(index + 1) % WEAPON_ORDER.length];
    }
    spawnScheduledWaves(time) {
        const elapsedSeconds = (time - this.stageStartedAt) / 1000;
        this.stage.waves.forEach((wave, index) => {
            if (!this.spawnedWaveIndexes.has(index) && elapsedSeconds >= wave.time) {
                this.spawnedWaveIndexes.add(index);
                this.spawnWave(wave);
            }
        });
    }
    // Boss 戰中循環產生零星敵機干擾，直到 boss 被擊敗
    startBossSupportSpawns() {
        if (this.bossSupportTimer)
            return;
        this.bossSupportTimer = this.time.addEvent({
            delay: 4200,
            loop: true,
            callback: () => {
                if (this.bossDefeated ||
                    this.stageCleared ||
                    this.exitingStage ||
                    !this.bossSpawned) {
                    this.stopBossSupportSpawns();
                    return;
                }
                const kinds = ['scout', 'drone'];
                const kind = kinds[Math.floor(Math.random() * kinds.length)];
                const patterns = ['line', 'sine', 'vee', 'zigzag'];
                const pattern = patterns[Math.floor(Math.random() * patterns.length)];
                const count = 3 + Math.floor(Math.random() * 3); // 3~5 隻
                const intervalMs = 200;
                const baseX = 80 + Math.random() * (GAME_WIDTH - 160);
                for (let i = 0; i < count; i += 1) {
                    this.time.delayedCall(i * intervalMs, () => {
                        if (this.bossDefeated || this.stageCleared || this.exitingStage)
                            return;
                        const offsetX = Phaser.Math.Clamp(baseX + (i - count / 2) * 26, 64, GAME_WIDTH - 64);
                        const config = this.loaderSystem.getEnemyConfig(kind);
                        const enemy = this.enemies.acquire(offsetX, -34, config, pattern, this.getStageHpMultiplier() * 0.7);
                        this.applyStageEnemyVisual(enemy, kind);
                    });
                }
            },
        });
    }
    stopBossSupportSpawns() {
        this.bossSupportTimer?.remove(false);
        this.bossSupportTimer = undefined;
    }
    spawnWave(wave) {
        const interval = wave.intervalMs ?? 400;
        const dda = this.dda.getState(this.time.now);
        const count = Math.max(1, Math.round(wave.count * dda.densityMultiplier));
        for (let index = 0; index < count; index += 1) {
            this.time.delayedCall(index * interval, () => {
                if (this.stageCleared || this.exitingStage)
                    return undefined;
                const x = this.getWaveX(wave, index, count);
                const y = wave.spawn === 'boss' || wave.spawn === 'midboss' ? -150 : -34;
                const config = this.loaderSystem.getEnemyConfig(wave.spawn);
                const enemy = this.enemies.acquire(x, y, config, wave.pattern, this.getStageHpMultiplier() * dda.enemyHpMultiplier);
                this.applyStageEnemyVisual(enemy, wave.spawn);
                if (wave.spawn === 'boss') {
                    this.bossSpawned = true;
                    EventBus.emit(EVENTS.bossSpawned);
                    this.audioSystem.bossWarning();
                    this.playBossBgm();
                    this.bossHealthBack.setVisible(true);
                    this.bossHealthBar.setVisible(true);
                    this.startBossSupportSpawns();
                }
                return enemy;
            });
        }
    }
    applyStageEnemyVisual(enemy, kind) {
        const stageTints = [0xffffff, 0xffd07a, 0x83d5ff, 0xcdefff, 0xb89cff, 0x73fff1, 0xff7bea, 0xffd34d];
        const tint = stageTints[this.stageId - 1] ?? 0xffffff;
        enemy.clearTint();
        if (kind === 'boss') {
            const key = `boss-stage-${this.stageId}`;
            if (this.textures.exists(key))
                enemy.setTexture(key);
            enemy.setScale(0.82 + this.stageId * 0.025);
            return;
        }
        if (kind === 'midboss') {
            const key = `midboss-stage-${this.stageId}`;
            if (this.textures.exists(key))
                enemy.setTexture(key);
            enemy.setScale(0.54 + this.stageId * 0.018);
            return;
        }
        if (this.stageId > 1)
            enemy.setTint(tint);
    }
    getWaveX(wave, index, count) {
        const margin = 54;
        if (wave.x)
            return Phaser.Math.Clamp(wave.x, margin, GAME_WIDTH - margin);
        if (wave.pattern === 'vee') {
            const spacing = Math.min(34, (GAME_WIDTH - margin * 2) / Math.max(1, count - 1));
            return Phaser.Math.Clamp(GAME_WIDTH / 2 + (index - (count - 1) / 2) * spacing, margin, GAME_WIDTH - margin);
        }
        if (wave.pattern === 'cross')
            return index % 2 === 0 ? 68 : GAME_WIDTH - 68;
        if (wave.pattern === 'zigzag')
            return Phaser.Math.Clamp(70 + ((index * 82) % (GAME_WIDTH - 140)), margin, GAME_WIDTH - margin);
        if (wave.pattern === 'ambush')
            return index % 2 === 0 ? 76 : GAME_WIDTH - 76;
        return Phaser.Math.Clamp(60 + ((index * 64) % (GAME_WIDTH - 120)), margin, GAME_WIDTH - margin);
    }
    fireEnemies(time) {
        for (const enemy of this.enemies.values()) {
            if (!enemy.active || time - enemy.lastFireAt < this.getEnemyFireRate(enemy))
                continue;
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
                this.enemyBullets.acquire(enemy.x, enemy.y + 22, Math.cos(angle) * speed, Math.sin(angle) * speed, 'enemy', 1, this.getEnemyBulletTexture(enemy));
            }
            if (length === 0)
                enemy.lastFireAt += 1;
        }
    }
    canEnemyFire(enemy) {
        // scout / drone：偶爾射擊（每次冷卻到時 ~22% 機率才開火），不打太頻繁
        if (enemy.kind === 'scout' || enemy.kind === 'drone') {
            if (enemy.y < 42 || enemy.y > GAME_HEIGHT - 64)
                return false;
            return Math.random() < 0.22;
        }
        if (enemy.kind === 'boss')
            return enemy.y >= 88 && enemy.y <= GAME_HEIGHT - 40;
        if (enemy.kind === 'midboss')
            return enemy.y >= 96 && enemy.y <= GAME_HEIGHT - 40;
        return enemy.y >= 42 && enemy.y <= GAME_HEIGHT - 64;
    }
    getEnemyFireRate(enemy) {
        if (this.stageId !== 1)
            return enemy.fireRateMs / (1 + (this.stageId - 1) * 0.08);
        if (enemy.kind === 'boss')
            return enemy.fireRateMs + 260;
        if (enemy.kind === 'midboss')
            return enemy.fireRateMs + 420;
        if (enemy.kind === 'gunship')
            return enemy.fireRateMs + 900;
        return enemy.fireRateMs + 1250;
    }
    getEnemyBulletTexture(enemy) {
        if (enemy.kind === 'boss')
            return 'bullet-enemy-boss';
        if (enemy.kind === 'midboss')
            return 'bullet-enemy-midboss';
        if (enemy.kind === 'gunship')
            return 'bullet-enemy-gunship';
        if (enemy.kind === 'drone')
            return 'bullet-enemy-drone';
        return 'bullet-enemy-scout';
    }
    getStageHpMultiplier() {
        return 1 + (this.stageId - 1) * 0.18;
    }
    handleBomb() {
        if (!this.inputController.consumeBomb() || this.stats.bombs <= 0)
            return;
        this.stats.bombs -= 1;
        this.enemyBullets.values().forEach((bullet) => bullet.deactivatePoolItem());
        this.explosionSystem.bombFlash();
        this.audioSystem.bomb();
        navigator.vibrate?.(60);
        for (const enemy of this.enemies.values()) {
            if (!enemy.active || !this.isEnemyDamageable(enemy))
                continue;
            enemy.hitFlash();
            if (enemy.applyDamage(this.getBombDamage(enemy))) {
                this.killEnemy(enemy);
            }
        }
        this.emitStats();
    }
    getBombDamage(enemy) {
        if (enemy.kind === 'boss')
            return Math.min(70, enemy.maxHp * 0.045);
        if (enemy.kind === 'midboss')
            return Math.min(180, enemy.maxHp * 0.22);
        return 999;
    }
    onPlayerBulletHitsEnemy(bulletObject, enemyObject) {
        const bullet = bulletObject;
        const enemy = enemyObject;
        if (!bullet.active || !enemy.active)
            return;
        if (!this.isEnemyDamageable(enemy))
            return;
        bullet.deactivatePoolItem();
        this.audioSystem.enemyHit(this.time.now, enemy.kind === 'boss' || enemy.kind === 'midboss');
        enemy.hitFlash();
        if (enemy.applyDamage(bullet.damage)) {
            this.killEnemy(enemy);
        }
    }
    killEnemy(enemy) {
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
        }
        else if (enemy.kind === 'midboss') {
            this.cameras.main.shake(220, 0.008);
        }
        else {
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
    spawnScorePopup(x, y, score, kind) {
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
    isEnemyDamageable(enemy) {
        const bounds = enemy.getBounds();
        return bounds.bottom > 8 && bounds.top < GAME_HEIGHT - 8 && bounds.right > 8 && bounds.left < GAME_WIDTH - 8;
    }
    maybeDropPickup(x, y, kind) {
        const bonus = this.dda.getState(this.time.now).powerDropBonus;
        // 一般敵人掉寶率降低（原本 0.18 + bonus 太頻繁）
        const chance = kind === 'boss' || kind === 'midboss' ? 1 : 0.08 + bonus * 0.4;
        if (Math.random() > chance)
            return;
        const roll = Math.random();
        let pickupKind;
        if (kind === 'boss' || kind === 'midboss') {
            // boss / midboss：90% 武器升級、10% 1UP（稀有福利）
            if (Math.random() < 0.1) {
                pickupKind = 'one-up';
            }
            else {
                pickupKind = `weapon-${this.getNextWeapon(this.stats.weapon)}`;
            }
        }
        else if (roll < 0.03) {
            // 3%：1UP（極稀有）
            pickupKind = 'one-up';
        }
        else if (roll < 0.22) {
            // ~19%：power
            pickupKind = 'power';
        }
        else if (roll < 0.55) {
            // ~33%：weapon
            pickupKind = `weapon-${WEAPON_ORDER[Math.floor(Math.random() * WEAPON_ORDER.length)]}`;
        }
        else {
            // 45%：bomb
            pickupKind = 'bomb';
        }
        this.pickups.acquire(x, y, pickupKind);
    }
    onPlayerHitByBullet(bulletObject) {
        const bullet = bulletObject;
        if (!bullet.active)
            return;
        bullet.deactivatePoolItem();
        this.damagePlayer();
    }
    onPlayerCollidesEnemy(enemyObject) {
        const enemy = enemyObject;
        if (!enemy.active)
            return;
        if (enemy.kind !== 'boss' && enemy.kind !== 'midboss') {
            enemy.deactivatePoolItem();
            this.explosionSystem.burst(enemy.x, enemy.y, 'medium');
        }
        this.damagePlayer();
    }
    onPickup(pickupObject) {
        const pickup = pickupObject;
        if (!pickup.active)
            return;
        if (pickup.kind === 'power')
            this.stats.power = Math.min(6, this.stats.power + 1);
        if (pickup.kind === 'bomb')
            this.stats.bombs = Math.min(3, this.stats.bombs + 1);
        if (pickup.kind === 'one-up')
            this.stats.lives += 1; // 1UP 無上限
        // 武器道具：撿到「同一把」代表火力強化（+1 級），撿到「別把」才換武器。
        // 原本同武器等於白撿——boss 有 90% 機率掉武器道具，剛好掉到手上這把就完全浪費。
        let weaponSwitched = false;
        if (pickup.kind.startsWith('weapon-')) {
            const next = pickup.kind.replace('weapon-', '');
            if (next === this.stats.weapon) {
                if (this.stats.power < 6) {
                    this.stats.power += 1;
                }
                else {
                    // 火力已滿級，改給額外分數，道具不會白撿
                    this.stats.score += 300;
                }
            }
            else {
                this.stats.weapon = next;
                weaponSwitched = true;
            }
        }
        this.stats.score += 50;
        // 換武器與火力強化聽感要分得出來
        if (weaponSwitched) {
            this.audioSystem.weaponSwitch();
        }
        else {
            this.audioSystem.pickup(pickup.kind);
        }
        pickup.deactivatePoolItem();
        this.emitStats();
    }
    collectNearbyPickups() {
        for (const pickup of this.pickups.values()) {
            if (!pickup.active)
                continue;
            const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.x, pickup.y);
            if (distance <= PICKUP_COLLECT_RADIUS) {
                this.onPickup(pickup);
                continue;
            }
        }
    }
    damagePlayer() {
        if (this.player.isInvulnerable(this.time.now) || this.stageCleared)
            return;
        this.dda.recordHit(this.time.now);
        this.dda.recordDeath(this.time.now);
        this.stats.lives -= 1;
        this.stats.power = 1;
        this.stats.combo = 0;
        // 被擊落時武器恢復為預設 vulcan
        this.stats.weapon = 'vulcan';
        this.explosionSystem.playerDeath(this.player.x, this.player.y);
        this.audioSystem.playerDeath();
        this.audioSystem.stopWeaponLoop();
        navigator.vibrate?.(35);
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
    playRespawnIntro() {
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
    updateHud(time) {
        this.scoreText.setText(String(this.stats.score));
        this.fitScoreText();
        const lives = Math.max(0, this.stats.lives);
        const bombs = Math.max(0, this.stats.bombs);
        this.lifeCountText.setText(`×${lives}`);
        this.bombCountText.setText(`×${bombs}`);
        // 沒有炸彈/生命時圖示半透明
        this.lifeIcon.setAlpha(lives > 0 ? 1 : 0.3);
        this.bombIcon.setAlpha(bombs > 0 ? 1 : 0.3);
        this.powerPips.forEach((pip, index) => {
            const levelColors = [0x66f7ff, 0x5dffb0, 0xfff06a, 0xffb35c, 0xff68d8, 0xffffff];
            pip.setFillStyle(index < this.stats.power ? levelColors[index] : 0x183153, index < this.stats.power ? 0.95 : 0.42);
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
    getWeaponShortName() {
        if (this.stats.weapon === 'plasma')
            return 'PLS';
        if (this.stats.weapon === 'laser')
            return 'LSR';
        return 'VLC';
    }
    checkClearCondition(time) {
        if (this.stageCleared)
            return;
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
    playStageOutro() {
        if (this.paused)
            this.togglePause(false);
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
    finish(cleared) {
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
    emitStats() {
        EventBus.emit(EVENTS.statsChanged, { ...this.stats });
    }
    readDevWeapon() {
        const value = localStorage.getItem(DEV_WEAPON_KEY);
        return WEAPON_ORDER.includes(value) ? value : 'vulcan';
    }
}
