// 主遊戲場景 — 移植自 game/js/CGame.js
// 物理 = Cannon(Scenario)，投影 = THREE(Projection)，繪圖/輸入 = Phaser
class PlayScene extends Phaser.Scene {
    constructor() { super({ key: 'Play' }); }

    create() {
        // 狀態旗標（對應 CGame 私有變數）
        this.launched = false;
        this.goal = false;
        this.saved = false;
        this.ballOutFlag = false;
        this.makeGoal = false;
        this.poleCollide = false;
        this.animPlayerFlag = false;

        this.score = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.launch = 0;
        this.area = -1;
        this.timeReset = 0;
        this.timePoleReset = 0;
        this.timePressDown = 0;
        this.vHitDir = { x: 0, y: 0, z: 0 };
        this.clickPoint = null;
        this.releasePoint = null;

        this.AREAS_INFO = LEVEL_DATA.area_goal;
        this.NUM_OF_PENALTY = LEVEL_DATA.num_of_penalty;
        this.MULTIPLIER_STEP = LEVEL_DATA.multiplier_step;

        // 背景（原始球場圖）
        this.add.image(0, 0, 'bg_game').setOrigin(0, 0).setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);

        // 物理世界
        this.scenario = new Scenario();
        this.ballBody = this.scenario.ballBody;
        this.scenario.onPoleCollision = () => this._onPole();
        this.scenario.onLineGoal = () => this._onAreaGoal();
        this.scenario.onFieldCollision = () => {
            if (this.launched) this.sound.play('drop_bounce_grass', { volume: 0.3 });
        };

        // 球門尺寸（由 goal 貼圖推算，對齊原始 _pGoalSize）
        const goalTex = this.textures.get('goal').getSourceImage();
        this.goalSize = { w: goalTex.width - 15, h: goalTex.height - 15 / 2 };

        // 守門員（螢幕固定位 + 動畫位移）
        this.gk = new GoalKeeperView(this, CANVAS_WIDTH_HALF - 100, CANVAS_HEIGHT_HALF - 225);

        // 球門貼圖（疊在 GK 前，形成「球進網」遮擋）
        this.goalSprite = this.add.image(291, 28, 'goal').setOrigin(0, 0);

        // 深度排序：背景(0) < 廣告看板(0.5) < 球門框/網(1) < 守門員(2) < 球(3)
        // 原版守門員站在球門網「前面」，整張 goal 貼圖在 GK 之後
        this.goalSprite.setDepth(1);
        this.gk.sprite.setDepth(2);

        // 廣告看板層（蓋掉背景圖內建廣告，可換成自己的圖）
        this._buildAdBoard();

        // 球 + 陰影
        this.ball = new BallView(this);
        this.ball.container.setDepth(3);
        this.ball.setVisible(false);
        this.ballPosition();

        // 靜止待踢的球
        this.startBall = this.add.image(CANVAS_WIDTH_HALF + 55, CANVAS_HEIGHT_HALF + 168, 'start_ball').setOrigin(0.5).setDepth(3);

        // 踢球員（前景，depth 須高於球門網/守門員/球）
        this.player = new PlayerView(this, CANVAS_WIDTH_HALF - 150, CANVAS_HEIGHT_HALF - 320);
        this.player.sprite.setDepth(5);
        this.player.onShootFrame = () => this._addImpulseToBall();

        this._buildHUD();
        this._buildInput();

        this.lastTime = this.time.now;
    }

    // ---------- 廣告看板層 ----------
    // 蓋在背景內建廣告之上、球門網之下。預設空白看板＝去掉原廣告；
    // 之後把自己的圖載入後呼叫 setAdImage('key') 即可換上。
    _buildAdBoard() {
        // 看板位置／尺寸（中心 x,y + 寬高）— 估值，可用 DEV 微調對準後匯出
        this.adLayout = { x: 680, y: 236, w: 1360, h: 92 };
        const L = this.adLayout;
        this.adImageKey = 'ad_18luck';

        // 用 tileSprite 把 logo 平鋪在看板區
        this.adBoard = this.add.tileSprite(L.x, L.y, L.w, L.h, this.adImageKey).setDepth(0.5);
        this._applyAdTileScale();

        this._buildAdDevTune();
    }

    // 讓平鋪圖的高度貼齊看板高度，橫向自然重複
    _applyAdTileScale() {
        const src = this.textures.get(this.adImageKey).getSourceImage();
        const scale = this.adLayout.h / src.height;
        this.adBoard.setTileScale(scale);
    }

    // 換成自己的廣告圖（key 須先在 PreloadScene 載入）
    setAdImage(key) {
        this.adImageKey = key;
        this.adBoard.setTexture(key);
        this._applyAdTileScale();
    }

    // DEV 微調：按 D 開關；方向鍵移動、Q/A 調高、Z/X 調寬、P 匯出座標
    _buildAdDevTune() {
        this.adDev = false;
        this.adDevBox = this.add.graphics().setDepth(99).setVisible(false);
        this.adDevHint = this.add.text(20, CANVAS_HEIGHT - 70,
            '[DEV] 廣告看板微調：方向鍵移動｜Q/A 高｜Z/X 寬｜P 匯出座標｜D 關閉', {
                fontFamily: 'Arial', fontSize: 15, color: '#7CFC00', backgroundColor: '#000a',
            }).setDepth(101).setVisible(false);

        this.input.keyboard.on('keydown-D', () => {
            this.adDev = !this.adDev;
            this.adDevBox.setVisible(this.adDev);
            this.adDevHint.setVisible(this.adDev);
            this._drawAdDevBox();
        });

        this.input.keyboard.on('keydown', (e) => {
            if (!this.adDev) return;
            const L = this.adLayout;
            const s = e.shiftKey ? 10 : 2;
            let changed = true;
            switch (e.key) {
                case 'ArrowUp': L.y -= s; break;
                case 'ArrowDown': L.y += s; break;
                case 'ArrowLeft': L.x -= s; break;
                case 'ArrowRight': L.x += s; break;
                case 'q': case 'Q': L.h -= s; break;
                case 'a': case 'A': L.h += s; break;
                case 'z': case 'Z': L.w -= s; break;
                case 'x': case 'X': L.w += s; break;
                case 'p': case 'P':
                    console.log('AD_LAYOUT =', JSON.stringify(L));
                    return;
                default: changed = false;
            }
            if (changed) {
                this.adBoard.setPosition(L.x, L.y).setSize(L.w, L.h);
                this._applyAdTileScale();
                this._drawAdDevBox();
            }
        });
    }

    _drawAdDevBox() {
        if (!this.adDev) return;
        const L = this.adLayout;
        this.adDevBox.clear()
            .lineStyle(2, 0x7CFC00, 1)
            .strokeRect(L.x - L.w / 2, L.y - L.h / 2, L.w, L.h);
    }

    // ---------- HUD ----------
    // HUD 一律放 depth 100，永遠蓋在球門網/球/守門員之上，避免被遮住
    _buildHUD() {
        const HUD_DEPTH = 100;

        this.scoreText = this.add.text(40, 24, 'SCORE 0', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#002a59', strokeThickness: 6,
        }).setDepth(HUD_DEPTH);
        this.multiText = this.add.text(40, 70, 'x1.0', {
            fontFamily: 'Arial Black', fontSize: 26, color: '#ffe066',
            stroke: '#002a59', strokeThickness: 4,
        }).setDepth(HUD_DEPTH);
        this.launchText = this.add.text(CANVAS_WIDTH - 40, 24, `0 / ${this.NUM_OF_PENALTY}`, {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ffffff',
            stroke: '#002a59', strokeThickness: 5,
        }).setOrigin(1, 0).setDepth(HUD_DEPTH);

        const backBg = this.add.rectangle(CANVAS_WIDTH - 90, 80, 150, 44, 0x000033, 0.6)
            .setStrokeStyle(2, 0x9cc3ff).setInteractive({ useHandCursor: true }).setDepth(HUD_DEPTH);
        this.add.text(CANVAS_WIDTH - 90, 80, '← MENU', {
            fontFamily: 'Arial', fontSize: 20, color: '#fff',
        }).setOrigin(0.5).setDepth(HUD_DEPTH + 1);
        backBg.on('pointerdown', () => this.scene.start('Menu'));

        this.resultText = this.add.text(CANVAS_WIDTH_HALF, CANVAS_HEIGHT_HALF - 60, '', {
            fontFamily: 'Arial Black', fontSize: 100, color: '#fff',
            stroke: '#002a59', strokeThickness: 10,
        }).setOrigin(0.5).setDepth(HUD_DEPTH);

        this.add.text(CANVAS_WIDTH_HALF, CANVAS_HEIGHT - 28,
            '由下往上「快速滑動」射門 — 滑動方向決定球的左右，按住時間越久球越高', {
                fontFamily: 'Arial', fontSize: 18, color: '#ffeb88',
            }).setOrigin(0.5).setDepth(HUD_DEPTH);
    }

    // ---------- 輸入（移植 onMouseDown / onPressMove / onPressUp）----------
    _buildInput() {
        this.input.on('pointerdown', (p) => {
            if (this.launched) return;
            this.clickPoint = { x: p.x, y: p.y };
            this.releasePoint = { x: p.x, y: p.y };
            this.timePressDown = 0;
        });
        this.input.on('pointermove', (p) => {
            if (!this.clickPoint || this.launched) return;
            this.releasePoint = { x: p.x, y: p.y };
        });
        this.input.on('pointerup', () => this._onRelease());
        this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
    }

    _onRelease() {
        if (this.launched || !this.releasePoint) return;
        // 必須由下往上滑（click.y < release.y 代表往下滑 → 取消）
        if ((this.clickPoint.y < this.releasePoint.y) ||
            (this.releasePoint.x === 0 && this.releasePoint.y === 0)) return;

        let dist = Math.ceil(distanceV2(this.clickPoint, this.releasePoint)) * FORCE_RATE;
        if (dist > FORCE_MAX) dist = FORCE_MAX;

        if (this.timePressDown > TIME_SWIPE_DESKTOP) { this.timePressDown = 0; return; }

        let vx = (this.clickPoint.x - this.releasePoint.x) * dist;
        let vy = (this.clickPoint.y - this.releasePoint.y) * dist;
        let len = Math.sqrt(vx * vx + vy * vy);

        if (len > HIT_BALL_MIN_FORCE) {
            if (len > HIT_BALL_MAX_FORCE) {
                const k = HIT_BALL_MAX_FORCE / len;
                vx *= k; vy *= k;
            }
            this.animPlayerFlag = true;
            this.player.play();

            let fForceY = this.timePressDown / 10;
            fForceY = Phaser.Math.Clamp(fForceY, MIN_FORCE_Y, MAX_FORCE_Y);

            this.vHitDir = {
                x: -vx * FORCE_MULTIPLIER_AXIS.x,
                y: fForceY,
                z: vy * FORCE_MULTIPLIER_AXIS.z,
            };
            this.makeGoal = this._goalProbability();
        }
        this.releasePoint.x = 0;
        this.releasePoint.y = 0;
    }

    // ---------- 機率與命中區（移植 predictBallGoalPos / calculateAreaGoal / goalProbability）----------
    _predictBallGoalPos(dir) {
        const nx = dir.x / dir.y;
        const ny = dir.z / dir.y;
        const finalX = linearFunction(nx, STRIKER_GOAL_SHOOTAREA.lx, STRIKER_GOAL_SHOOTAREA.rx,
            -this.goalSize.w / 2, this.goalSize.w / 2);
        const finalY = (-this.goalSize.h / Math.pow(STRIKER_GOAL_SHOOTAREA.zmax, 2)) * ny * ny + this.goalSize.h / 2;
        return { x: finalX, y: finalY };
    }

    _calculateAreaGoal(dir) {
        const pos = this._predictBallGoalPos(dir);
        const startX = -this.goalSize.w / 2;
        const startY = -this.goalSize.h / 2;
        let col = Math.floor(linearFunction(pos.x, startX, startX + this.goalSize.w, 0, NUM_AREA_GOAL.w));
        col = Phaser.Math.Clamp(col, 0, NUM_AREA_GOAL.w - 1);
        let row = Math.floor(linearFunction(pos.y, startY, startY + this.goalSize.h, 0, NUM_AREA_GOAL.h));
        row = Phaser.Math.Clamp(row, 0, NUM_AREA_GOAL.h - 1);
        this.area = row * NUM_AREA_GOAL.w + col;
        return this.area;
    }

    _goalProbability() {
        this.area = -1;
        this._calculateAreaGoal(this.vHitDir);
        if (this.area === -1) return false;
        const prob = this.AREAS_INFO[this.area].probability;
        return Math.floor(Math.random() * MAX_PERCENT_PROBABILITY) < prob;
    }

    // ---------- 射門 ----------
    _addImpulseToBall() {
        if (this.launched) return;
        this.scenario.addImpulse(this.ballBody, this.vHitDir);
        this.scenario.setAngularVelocity(this.ballBody, { x: 0, y: 0, z: 0 });
        this.launched = true;
        this.ball.setVisible(true);
        this.startBall.setVisible(false);
        this._chooseDirectionGoalKeeper();
        this.sound.play('kick');
    }

    _chooseDirectionGoalKeeper() {
        const ballFinalPos = this._predictBallGoalPos(this.vHitDir);
        if (this.makeGoal) {
            this._chooseWrongDirGK();
        } else {
            let idx = this.area;
            if (ballFinalPos.y < 75) {
                if (this.area === 14) idx = 9;
                if (this.area === 10) idx = 5;
            }
            this.gk.runAnimAndShift(AREA_GOALS_ANIM[idx], ballFinalPos);
        }
    }

    _chooseWrongDirGK() {
        const exclusion = ANIM_GOAL_KEEPER_FAIL_EXCLUSION_LIST[this.area];
        const candidates = [];
        for (let i = 1; i <= AREA_GOALS_ANIM.length; i++) {
            if (exclusion.indexOf(i) === -1) candidates.push(i);
        }
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        this.gk.runAnim(pick);
    }

    // ---------- 結果判定（球穿越球門線觸發）----------
    _onAreaGoal() {
        if (this.goal || this.saved) return;
        if (this.makeGoal) {
            this.goal = true;
            this.timeReset = TIME_RESET_AFTER_GOAL;
            this._showResult('GOAL!', '#3aff7c');
            this._calculateScore();
            this.sound.play('goal');
        } else {
            this.saved = true;
            this.timeReset = TIME_RESET_AFTER_SAVE;
            this._showResult('SAVED!', '#ffcc33');
            this.sound.play('ball_saved');
            this._rejectBall();
            this.multiplier = 1;
            this.combo = 0;
        }
    }

    _rejectBall() {
        const v = this.ballBody.velocity;
        v.negate(v);
        if (this.area === 12) {
            v.x *= 1.4; v.y *= 1.4; v.z *= 1.4;
        } else {
            v.y -= 50;
        }
    }

    _calculateScore() {
        const prob = this.AREAS_INFO[this.area].probability;
        const base = prob; // 機率越低分越高（原式：100-(100-prob)=prob）
        this.score += Math.round(base * this.multiplier);
        this.multiplier += this.MULTIPLIER_STEP;
        this.scoreText.setText('SCORE ' + this.score);
        this.multiText.setText('x' + this.multiplier.toFixed(1));
    }

    _onPole() {
        this.timePoleReset = TIME_POLE_COLLISION_RESET;
        this.poleCollide = true;
        this.sound.play('pole', { volume: 0.4 });
    }

    // ---------- 球 2D 位置（移植 ballPosition / refreshShadowCast）----------
    ballPosition() {
        const p = Projection.to2D(this.ballBody.position);
        const scaleDist = p.z * (BALL_SCALE_FACTOR - this.ball.startScale) + this.ball.startScale;
        this.ball.setPosition(p.x, p.y);
        this.ball.scale(scaleDist);
        this._refreshShadow(scaleDist);
    }

    _refreshShadow(scaleDist) {
        const body = this.ballBody;
        const fieldZ = this.scenario.fieldBody.position.z;
        if (body.position.z < fieldZ) { this.ball.scaleShadow(0); return; }
        const shadow2D = Projection.to2D({ x: body.position.x, y: body.position.y, z: fieldZ });
        const dist = (body.position.z - BALL_RADIUS) * ((fieldZ - SHADOWN_FACTOR) - fieldZ) + fieldZ;
        const scaleH = dist * scaleDist;
        this.ball.scaleShadow(scaleH);
        if (scaleH < 0) return;
        this.ball.setAlphaByHeight(dist);
        this.ball.setPositionShadow(shadow2D.x, shadow2D.y);
    }

    // ---------- 出界 / 回合 ----------
    _checkBallOut() {
        if (this.ballOutFlag || this.goal || this.saved) return;
        const pos = this.ballBody.position;
        if (pos.y > BALL_OUT_Y || pos.x > BACK_WALL_GOAL_SIZE.width || pos.x < -BACK_WALL_GOAL_SIZE.width) {
            this.ballOutFlag = true;
            this.timeReset = TIME_RESET_AFTER_BALL_OUT;
            this._showResult('OUT!', '#ff5577');
            this.sound.play('ball_saved');
            this.multiplier = 1;
            this.combo = 0;
            this.multiText.setText('x1.0');
        }
    }

    _endTurn() {
        this.launch++;
        this.launchText.setText(`${this.launch} / ${this.NUM_OF_PENALTY}`);
        if (this.launch < this.NUM_OF_PENALTY) {
            this._resetScene();
            this.launched = false;
        } else {
            this._showWinPanel();
        }
    }

    _resetScene() {
        this.goal = this.ballOutFlag = this.saved = this.makeGoal = this.poleCollide = false;
        this.gk.reset();
        // 球歸位
        this.ballBody.position.set(POSITION_BALL.x, POSITION_BALL.y, POSITION_BALL.z);
        this.scenario.setVelocity(this.ballBody, { x: 0, y: 0, z: 0 });
        this.scenario.setAngularVelocity(this.ballBody, { x: 0, y: 0, z: 0 });
        this.ball.setAlpha(1);
        this.ball.setVisible(false);
        this.startBall.setVisible(true).setAlpha(1);
        this.player.reset();
        this.resultText.setText('');
    }

    _showResult(txt, color) {
        this.resultText.setText(txt).setColor(color).setAlpha(0).setScale(0.5);
        this.tweens.add({ targets: this.resultText, alpha: 1, scale: 1.1, duration: 200, ease: 'Back.Out' });
    }

    _showWinPanel() {
        const D = 200; // 結算面板放最頂層
        this.add.rectangle(CANVAS_WIDTH_HALF, CANVAS_HEIGHT_HALF, CANVAS_WIDTH, CANVAS_HEIGHT, 0x001233, 0.8).setDepth(D);
        this.add.text(CANVAS_WIDTH_HALF, CANVAS_HEIGHT_HALF - 80, 'GAME OVER', {
            fontFamily: 'Arial Black', fontSize: 72, color: '#fff', stroke: '#0033aa', strokeThickness: 8,
        }).setOrigin(0.5).setDepth(D + 1);
        this.add.text(CANVAS_WIDTH_HALF, CANVAS_HEIGHT_HALF + 10, 'SCORE  ' + this.score, {
            fontFamily: 'Arial Black', fontSize: 48, color: '#ffe066',
        }).setOrigin(0.5).setDepth(D + 1);
        const btn = this.add.rectangle(CANVAS_WIDTH_HALF, CANVAS_HEIGHT_HALF + 110, 260, 60, 0x1a4fb8)
            .setStrokeStyle(2, 0x9cc3ff).setInteractive({ useHandCursor: true }).setDepth(D + 1);
        this.add.text(CANVAS_WIDTH_HALF, CANVAS_HEIGHT_HALF + 110, 'PLAY AGAIN', {
            fontFamily: 'Arial', fontSize: 28, color: '#fff',
        }).setOrigin(0.5).setDepth(D + 2);
        btn.on('pointerdown', () => this.scene.restart());
    }

    // ---------- 主迴圈（移植 _updatePlay）----------
    update(time) {
        const dt = time - this.lastTime;
        this.lastTime = time;
        this.sITimeElaps = dt;

        if (this.launch >= this.NUM_OF_PENALTY) return;

        // 物理多步（PHYSICS_ACCURACY 次）
        for (let i = 0; i < PHYSICS_ACCURACY; i++) this.scenario.update();

        this._checkBallOut();

        if (this.goal || this.ballOutFlag || this.saved) {
            if (this.timeReset > 0) this.timeReset -= dt;
            else this._endTurn();
        } else if (this.poleCollide) {
            if (this.timePoleReset > 0) this.timePoleReset -= dt;
            else {
                this._showResult('OUT!', '#ff5577');
                this.multiplier = 1; this.combo = 0;
                this.multiText.setText('x1.0');
                this.sound.play('ball_saved');
                this.poleCollide = false;
                this._endTurn();
            }
        }

        // 累計按壓時間（決定球的高度）
        if (this.clickPoint && !this.launched && this.releasePoint &&
            !(this.releasePoint.x === 0 && this.releasePoint.y === 0)) {
            this.timePressDown += dt;
        }

        this.ballPosition();
        this.ball.rolls(this.ballBody);
        Projection.refresh();
    }
}
