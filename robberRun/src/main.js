// Robber Run - Phaser 3
// 手機直屏跑酷；PC 左右鍵 / 手機滑動切換車道

/* global Phaser */

const GAME_W = 540;           // 邏輯寬（直屏）
const GAME_H = 960;           // 邏輯高
const LANE_X = [GAME_W * 0.22, GAME_W * 0.5, GAME_W * 0.78]; // 三車道
const GROUND_Y = GAME_H - 170;

// ======================= BOOT SCENE =======================
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    preload() {
        // 載入畫面
        const w = this.scale.width, h = this.scale.height;
        const bar = this.add.rectangle(w/2, h/2, 300, 8, 0xffcc00).setOrigin(0.5);
        bar.scaleX = 0;
        this.load.on('progress', p => { bar.scaleX = p; });
        this.add.text(w/2, h/2 - 30, 'LOADING...', {
            fontFamily: 'Arial', fontSize: 22, color: '#fff'
        }).setOrigin(0.5);

        // 背景 (5 張循環)
        for (let i = 1; i <= 5; i++) {
            this.load.image(`bg${i}`, `assets/Background/${i}.png`);
        }

        // 角色動畫
        const runFrames = [1,2,3,4,5,6,7,8,9,10];
        runFrames.forEach(n => this.load.image(`run${n}`, `assets/Spritesheets/Character/Run/${n}.png`));
        [1,2,3,4].forEach(n => this.load.image(`jump${n}`, `assets/Spritesheets/Character/Jump/${n}.png`));
        [1,2,3,4].forEach(n => this.load.image(`fall${n}`, `assets/Spritesheets/Character/Fall/${n}.png`));
        this.load.image('hit1', 'assets/Spritesheets/Character/Hit/1.png');
        this.load.image('hit2', 'assets/Spritesheets/Character/Hit/2.png');
        this.load.image('hit3', 'assets/Spritesheets/Character/Hit/3.png');
        this.load.image('hit4', 'assets/Spritesheets/Character/Hit/4-01.png');
        [1,2,3,4,5].forEach(n => this.load.image(`jet${n}`, `assets/Spritesheets/Character/Jetpack/${n}.png`));
        this.load.image('caught', 'assets/Spritesheets/Character/caught/2.png');

        // 金幣 (逐格)
        [1,2,3,4,5,6,7,8,9].forEach(n => this.load.image(`coin${n}`, `assets/Spritesheets/Coin/${n}.png`));
        // 寶石 (跳過壞檔 3、5)
        [1,2,4,6,7,8,9,10].forEach(n => this.load.image(`gem${n}`, `assets/Spritesheets/Gem/${n}.png`));

        // 障礙物與道具 (靜態圖)
        for (let i = 1; i <= 16; i++) this.load.image(`obs${i}`, `assets/Item/obstacles/${i}.png`);
        for (let i = 1; i <= 18; i++) this.load.image(`pw${i}`, `assets/Item/Power ups/${i}.png`);

        // Title / UI
        this.load.image('title', 'assets/Title.png');
        this.load.image('ready', 'assets/get ready.png');

        // 音效 / BGM（之後使用者可替換檔案）
        this.load.audio('bgm', 'assets/mp3/BoogieParty.mp3');
        this.load.audio('sfx_run', 'assets/mp3/runSteps.mp3');
        this.load.audio('sfx_jump', 'assets/mp3/jump.mp3');
        this.load.audio('sfx_coin', 'assets/mp3/powerup.mp3');
        this.load.audio('sfx_gem', 'assets/mp3/powerup.mp3');
        this.load.audio('sfx_powerup', 'assets/mp3/powerup.mp3');
        this.load.audio('sfx_hit', 'assets/mp3/hit.mp3');
        this.load.audio('sfx_powerdown', 'assets/mp3/powerdown.mp3');
        this.load.audio('sfx_jetpack', 'assets/mp3/jetpack.mp3');
    }

    create() {
        // 建立動畫
        const mkAnim = (key, frames, rate, repeat) => this.anims.create({
            key, frames: frames.map(f => ({ key: f })), frameRate: rate, repeat
        });
        mkAnim('run', ['run1','run2','run3','run4','run5','run6','run7','run8','run9','run10'], 18, -1);
        mkAnim('jump', ['jump1','jump2','jump3','jump4'], 10, 0);
        mkAnim('fall', ['fall1','fall2','fall3','fall4'], 10, 0);
        mkAnim('hit', ['hit1','hit2','hit3','hit4'], 10, 0);
        mkAnim('jet', ['jet1','jet2','jet3','jet4','jet5'], 14, -1);
        mkAnim('coin_spin', ['coin1','coin2','coin3','coin4','coin5','coin6','coin7','coin8','coin9'], 14, -1);
        mkAnim('gem_spin', ['gem1','gem2','gem4','gem6','gem7','gem8','gem9','gem10'], 14, -1);

        this.scene.start('Menu');
    }
}

// ======================= MENU SCENE =======================
class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }

    create() {
        // 背景 (取 bg1 並拉滿)
        const bg = this.add.image(GAME_W/2, GAME_H/2, 'bg1');
        const s = Math.max(GAME_W / bg.width, GAME_H / bg.height);
        bg.setScale(s).setAlpha(0.55);

        // 暗層
        this.add.rectangle(GAME_W/2, GAME_H/2, GAME_W, GAME_H, 0x000000, 0.35);

        // 標題
        const title = this.add.image(GAME_W/2, GAME_H*0.28, 'title');
        const tScale = Math.min(1, (GAME_W*0.85)/title.width);
        title.setScale(tScale);

        // 角色預覽
        const hero = this.add.sprite(GAME_W/2, GAME_H*0.55, 'run1');
        hero.setScale(260 / hero.height);
        hero.play('run');

        // Start 按鈕
        const btnBg = this.add.rectangle(GAME_W/2, GAME_H*0.78, 260, 80, 0xffcc00)
            .setStrokeStyle(4, 0x8a4400)
            .setInteractive({ useHandCursor: true });
        this.add.text(GAME_W/2, GAME_H*0.78, 'START', {
            fontFamily: 'Arial Black', fontSize: 40, color: '#331a00'
        }).setOrigin(0.5);

        const startGame = () => {
            this.sound.play('sfx_coin', { volume: 0.5 });
            this.scene.start('Game');
        };
        btnBg.on('pointerover', () => btnBg.setFillStyle(0xffe066));
        btnBg.on('pointerout', () => btnBg.setFillStyle(0xffcc00));
        btnBg.on('pointerdown', startGame);

        // PC：空白 / Enter 直接開始
        this.input.keyboard.once('keydown-SPACE', startGame);
        this.input.keyboard.once('keydown-ENTER', startGame);

        // 操作提示
        this.add.text(GAME_W/2, GAME_H*0.9,
            'PC：← → / A D 移動　空白鍵 跳躍\n手機：左右滑動切換車道　點擊跳躍', {
            fontFamily: 'Arial', fontSize: 20, color: '#ffffff',
            align: 'center', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);

        // 啟動 BGM（需在使用者手勢後才播）
        this.input.once('pointerdown', () => this._startBGM(), this);
        this.input.keyboard.once('keydown', () => this._startBGM(), this);
    }

    _startBGM() {
        if (this.sound.get('bgm')) return;
        const bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
        bgm.play();
    }
}

// ======================= GAME SCENE =======================
class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    create() {
        this.lane = 1;                  // 0,1,2
        this.speed = 420;               // 背景/物件下落速度（px/s）
        this.speedBase = 420;
        this.coins = 0;
        this.gems = 0;
        this.distance = 0;
        this.gameOver = false;
        this.jetpackTime = 0;
        this.invincibleTime = 0;
        this.speedMult = 1;

        // 捲動背景：把 5 張 bg 直向拼接並循環
        this.bgLayer = this.add.group();
        this.bgImages = [];
        let y = GAME_H/2;
        for (let i = 0; i < 6; i++) {
            const key = `bg${(i % 5) + 1}`;
            const img = this.add.image(GAME_W/2, y, key);
            const s = GAME_W / img.width;
            img.setScale(s);
            y -= img.displayHeight;
            img.setDepth(-10);
            this.bgImages.push(img);
        }

        // 群組
        this.itemsGroup = this.physics.add.group();
        this.obstaclesGroup = this.physics.add.group();

        // 角色
        this.hero = this.physics.add.sprite(LANE_X[this.lane], GROUND_Y, 'run1');
        this.hero.setScale(260 / this.hero.height);
        this.hero.body.setAllowGravity(false);
        // 收斂 hero 碰撞框到身體軀幹（原圖 2533x3381，身體約中央 40% 寬、60% 高）
        this.hero.body.setSize(this.hero.width * 0.35, this.hero.height * 0.55);
        this.hero.body.setOffset(this.hero.width * 0.325, this.hero.height * 0.35);
        this.hero.play('run');
        this.hero.setDepth(5);
        this.heroState = 'run';

        // 腳下陰影（跳躍時留在地面，讓玩家辨識落點）
        this.heroShadow = this.add.ellipse(LANE_X[this.lane], GROUND_Y + 40, 140, 36, 0x000000, 0.65);
        this.heroShadow.setDepth(4);

        // 碰撞
        this.physics.add.overlap(this.hero, this.itemsGroup, this._onItem, null, this);
        this.physics.add.overlap(this.hero, this.obstaclesGroup, this._onObstacle, null, this);

        // 輸入
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
        this.keySpace = this.input.keyboard.addKey('SPACE');

        this.input.keyboard.on('keydown-LEFT', () => this._changeLane(-1));
        this.input.keyboard.on('keydown-RIGHT', () => this._changeLane(1));
        this.input.keyboard.on('keydown-A', () => this._changeLane(-1));
        this.input.keyboard.on('keydown-D', () => this._changeLane(1));
        this.input.keyboard.on('keydown-SPACE', () => this._jump());

        // 手機滑動
        this._setupTouch();

        // HUD
        this.scene.launch('UI');
        this.uiScene = this.scene.get('UI');

        // 跑步腳步聲循環
        this.runSnd = this.sound.add('sfx_run', { loop: true, volume: 0.6 });
        this.runSnd.play();
        this.events.once('shutdown', () => { if (this.runSnd) this.runSnd.stop(); });

        // 產生器
        this.spawnTimer = this.time.addEvent({
            delay: 900, loop: true, callback: this._spawnWave, callbackScope: this
        });

        // 加速
        this.time.addEvent({
            delay: 5000, loop: true,
            callback: () => { if (!this.gameOver) this.speedBase = Math.min(this.speedBase + 20, 780); }
        });
    }

    _setupTouch() {
        let sx = 0, sy = 0, moved = false;
        this.input.on('pointerdown', (p) => { sx = p.x; sy = p.y; moved = false; });
        this.input.on('pointerup', (p) => {
            const dx = p.x - sx, dy = p.y - sy;
            const absX = Math.abs(dx), absY = Math.abs(dy);
            if (absX > 40 && absX > absY) {
                this._changeLane(dx > 0 ? 1 : -1);
            } else if (absX < 20 && absY < 20) {
                this._jump();
            }
        });
    }

    _changeLane(dir) {
        if (this.gameOver) return;
        const next = Phaser.Math.Clamp(this.lane + dir, 0, 2);
        if (next === this.lane) return;
        this.lane = next;
        this.tweens.add({
            targets: this.hero,
            x: LANE_X[this.lane],
            duration: 140,
            ease: 'Sine.easeOut'
        });
    }

    _jump() {
        if (this.gameOver || this.heroState !== 'run') return;
        this.heroState = 'jump';
        this.hero.play('jump');
        this.sound.play('sfx_jump', { volume: 0.6 });
        if (this.runSnd?.isPlaying) this.runSnd.pause();
        // 起跳瞬間「向前衝」：加快捲動，落地後短暫減速（喘息），再恢復
        this.speedMult = 1.8;
        this.tweens.add({
            targets: this.hero,
            y: GROUND_Y - 190,
            duration: 340, ease: 'Sine.easeOut',
            yoyo: true,
            onComplete: () => {
                if (this.heroState === 'jump') {
                    this.heroState = 'run';
                    this.hero.play('run');
                    if (this.runSnd && !this.gameOver) this.runSnd.resume();
                }
                // 落地後減速喘息 450ms
                this.speedMult = 0.35;
                this.time.delayedCall(450, () => { this.speedMult = 1; });
            }
        });
    }

    _spawnWave() {
        if (this.gameOver) return;
        // 每波隨機 1~2 個 item/obstacle，不同 lane
        const used = new Set();
        const count = Phaser.Math.Between(1, 2);
        for (let i = 0; i < count; i++) {
            let lane;
            do { lane = Phaser.Math.Between(0, 2); } while (used.has(lane) && used.size < 3);
            used.add(lane);

            const roll = Math.random();
            if (roll < 0.45) this._spawnCoin(lane);
            else if (roll < 0.6) this._spawnGem(lane);
            else if (roll < 0.72) this._spawnPowerup(lane);
            else this._spawnObstacle(lane);
        }
        // 偶爾排金幣一條龍
        if (Math.random() < 0.15) this._spawnCoinLine();
    }

    _fitHeight(sprite, targetH) {
        const s = targetH / sprite.height;
        sprite.setScale(s);
        return sprite;
    }

    _setBodyPx(sprite, targetDisplayW, targetDisplayH) {
        // 用實際顯示像素指定 body 尺寸，避免跨車道誤觸
        const bw = targetDisplayW / sprite.scaleX;
        const bh = targetDisplayH / sprite.scaleY;
        sprite.body.setSize(bw, bh);
        sprite.body.setOffset((sprite.width - bw) / 2, (sprite.height - bh) / 2);
    }

    _spawnCoin(lane) {
        const s = this.physics.add.sprite(LANE_X[lane], -60, 'coin1');
        this._fitHeight(s, 70);
        s.play('coin_spin');
        s.body.setAllowGravity(false);
        this._setBodyPx(s, 60, 60);
        s.setData('type', 'coin');
        this.itemsGroup.add(s);
    }

    _spawnCoinLine() {
        const lane = Phaser.Math.Between(0, 2);
        for (let i = 0; i < 5; i++) {
            const s = this.physics.add.sprite(LANE_X[lane], -60 - i * 80, 'coin1');
            this._fitHeight(s, 70);
            s.play('coin_spin');
            s.body.setAllowGravity(false);
            this._setBodyPx(s, 60, 60);
            s.setData('type', 'coin');
            this.itemsGroup.add(s);
        }
    }

    _spawnGem(lane) {
        const s = this.physics.add.sprite(LANE_X[lane], -60, 'gem1');
        this._fitHeight(s, 85);
        s.play('gem_spin');
        s.body.setAllowGravity(false);
        this._setBodyPx(s, 60, 60);
        s.setData('type', 'gem');
        this.itemsGroup.add(s);
    }

    _spawnPowerup(lane) {
        const idx = Phaser.Math.Between(1, 18);
        const s = this.physics.add.sprite(LANE_X[lane], -60, `pw${idx}`);
        this._fitHeight(s, 100);
        s.body.setAllowGravity(false);
        this._setBodyPx(s, 80, 80);
        s.setData('type', 'powerup');
        s.setData('kind', idx);
        this.itemsGroup.add(s);
    }

    _spawnObstacle(lane) {
        const idx = Phaser.Math.Between(1, 16);
        const s = this.physics.add.sprite(LANE_X[lane], -60, `obs${idx}`);
        // 依圖長寬比分類給予不同目標高度
        const ar = s.height / s.width;
        let targetH;
        if (ar > 2.2)      targetH = 220;  // 又長又細（路障、交通錐等）
        else if (ar > 1.4) targetH = 190;  // 一般人形/車輛（警察、汽車）
        else               targetH = 140;  // 矮胖
        this._fitHeight(s, targetH);
        s.body.setAllowGravity(false);
        // body 寬度嚴格限制在車道內（lane 寬 180）
        this._setBodyPx(s, 110, Math.min(targetH * 0.7, 150));
        s.setData('type', 'obstacle');
        // 不可跳躍的大型障礙（電線桿/招牌/卡車/長椅），跳了一樣失敗
        const NON_JUMPABLE = new Set([3, 5, 8, 9, 10, 11, 12, 13]);
        if (NON_JUMPABLE.has(idx)) s.setData('jumpproof', true);
        this.obstaclesGroup.add(s);
    }

    _onItem(hero, item) {
        const type = item.getData('type');
        if (type === 'coin') {
            this.coins++;
            this.sound.play('sfx_coin', { volume: 0.5 });
        } else if (type === 'gem') {
            this.gems++;
            this.sound.play('sfx_gem', { volume: 0.6 });
        } else if (type === 'powerup') {
            this.sound.play('sfx_powerup', { volume: 0.7 });
            this._activateJetpack();
        }
        item.destroy();
        this._updateHUD();
    }

    _activateJetpack() {
        this.jetpackTime = 5000;
        this.invincibleTime = 5000;
        this.heroState = 'jetpack';
        this.hero.play('jet');
        if (this.runSnd?.isPlaying) this.runSnd.pause();
        const snd = this.sound.add('sfx_jetpack', { volume: 0.5 });
        snd.play();
        this.time.delayedCall(5000, () => {
            snd.stop();
            if (this.gameOver) return;
            this.heroState = 'run';
            this.hero.play('run');
            if (this.runSnd) this.runSnd.resume();
        });
    }

    _onObstacle(hero, obs) {
        // 無敵狀態下撞擊：無論大小都撞破
        if (this.invincibleTime > 0) {
            this.sound.play('sfx_hit', { volume: 0.6 });
            obs.destroy();
            return;
        }
        // 跳躍中跨越小型障礙；大型（卡車/電線桿/長椅等）即使跳也失敗
        if (this.heroState === 'jump') {
            const jumpproof = obs.getData('jumpproof') || obs.displayHeight > 200;
            if (!jumpproof) return;
        }
        obs.destroy();
        this._endGame();
    }

    _endGame() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.hero.play('hit');
        if (this.runSnd) this.runSnd.stop();
        this.sound.play('sfx_powerdown', { volume: 0.8 });
        // BGM 不間斷播放，不在 Game Over 時停止
        this.time.delayedCall(700, () => {
            this.scene.stop('UI');
            this.scene.start('End', { coins: this.coins, gems: this.gems, distance: Math.floor(this.distance) });
        });
    }

    _updateHUD() {
        this.uiScene.events.emit('hud', {
            score: Math.floor(this.distance),
            coins: this.coins,
            gems: this.gems
        });
    }

    update(time, delta) {
        if (this.gameOver) return;
        const dt = delta / 1000;
        this.speed = (this.speedBase + (this.heroState === 'jetpack' ? 220 : 0)) * (this.speedMult || 1);
        this.distance += this.speed * dt * 0.1;
        if (this.jetpackTime > 0) this.jetpackTime -= delta;
        if (this.invincibleTime > 0) this.invincibleTime -= delta;

        // 背景捲動
        this.bgImages.forEach(img => {
            img.y += this.speed * dt;
            if (img.y - img.displayHeight/2 > GAME_H) {
                // 找最上方的 img，放到其上方
                let topY = Infinity;
                this.bgImages.forEach(b => { if (b.y < topY) topY = b.y; });
                img.y = topY - img.displayHeight;
            }
        });

        // 移動物件（反向迭代，避免 destroy 時陣列位移造成跳過）
        const moveGroup = (group) => {
            const arr = group.getChildren();
            for (let i = arr.length - 1; i >= 0; i--) {
                const s = arr[i];
                if (!s || !s.active) continue;
                s.y += this.speed * dt;
                if (s.y > GAME_H + 120) s.destroy();
            }
        };
        moveGroup(this.itemsGroup);
        moveGroup(this.obstaclesGroup);

        // 陰影跟隨 hero.x，跳躍時依高度縮小表現騰空感（保持夠亮才看得到）
        if (this.heroShadow) {
            this.heroShadow.x = this.hero.x;
            const dy = GROUND_Y - this.hero.y;
            const k = Phaser.Math.Clamp(1 - dy / 220, 0.55, 1);
            this.heroShadow.setScale(k, k);
            this.heroShadow.setAlpha(0.35 + 0.3 * k);
        }

        this._updateHUD();
    }
}

// ======================= UI SCENE (HUD) =======================
class UIScene extends Phaser.Scene {
    constructor() { super('UI'); }

    create() {
        const style = { fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff', stroke: '#000', strokeThickness: 4 };
        this.txtScore = this.add.text(20, 20, '0m', style);
        this.txtCoin = this.add.text(20, 58, '💰 0', style);
        this.txtGem = this.add.text(20, 96, '💎 0', style);

        this.events.on('hud', (d) => {
            this.txtScore.setText(`${d.score}m`);
            this.txtCoin.setText(`💰 ${d.coins}`);
            this.txtGem.setText(`💎 ${d.gems}`);
        });
    }
}

// ======================= END SCENE =======================
class EndScene extends Phaser.Scene {
    constructor() { super('End'); }

    create(data) {
        this.add.rectangle(GAME_W/2, GAME_H/2, GAME_W, GAME_H, 0x000000, 0.65);
        this.add.text(GAME_W/2, GAME_H*0.25, 'GAME OVER', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffcc00',
            stroke: '#6b2e00', strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(GAME_W/2, GAME_H*0.45,
            `距離　${data.distance} m\n金幣　${data.coins}\n寶石　${data.gems}`, {
            fontFamily: 'Arial', fontSize: 32, color: '#fff', align: 'center',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        const btn = this.add.rectangle(GAME_W/2, GAME_H*0.7, 280, 80, 0xffcc00)
            .setStrokeStyle(4, 0x8a4400).setInteractive({ useHandCursor: true });
        this.add.text(GAME_W/2, GAME_H*0.7, '再來一次', {
            fontFamily: 'Arial Black', fontSize: 34, color: '#331a00'
        }).setOrigin(0.5);
        const restart = () => this.scene.start('Menu');
        btn.on('pointerdown', restart);
        this.input.keyboard.once('keydown-SPACE', restart);
        this.input.keyboard.once('keydown-ENTER', restart);
    }
}

// ======================= GAME CONFIG =======================
const config = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_W,
        height: GAME_H
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [BootScene, MenuScene, GameScene, UIScene, EndScene]
};

window.__game = new Phaser.Game(config);
