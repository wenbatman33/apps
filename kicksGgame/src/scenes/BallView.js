// 球的視覺 — 移植自 game/js/CBall.js
// 7 幀滾動 + 陰影；位置/縮放由投影決定
class BallView {
    constructor(scene) {
        this.scene = scene;
        this.startScale = FOV * BALL_RADIUS; // 9.6
        this.frame = 0;
        this.bufferTime = 0;

        this.shadow = scene.add.image(0, 0, 'ball_shadow').setOrigin(0.5);
        this.sprite = scene.add.sprite(0, 0, 'ball', 0).setOrigin(0.5);
        this.container = scene.add.container(0, 0, [this.shadow, this.sprite]);
    }

    setVisible(v) { this.container.setVisible(v); }
    setAlpha(a) { this.container.setAlpha(a); }
    setPosition(x, y) { this.sprite.setPosition(x, y); }
    setPositionShadow(x, y) { this.shadow.setPosition(x, y); }
    scale(v) { this.sprite.setScale(v); }
    setAngle(a) { this.sprite.setAngle(a); }
    setAlphaByHeight(h) { this.shadow.setAlpha(Phaser.Math.Clamp(h, 0, 1)); }
    scaleShadow(s) {
        const v = s > 0.08 ? s : 0.08;
        this.shadow.setScale(v);
    }

    // 依物理速度滾動換幀（移植 CBall.rolls）
    rolls(physics) {
        const forceX = physics.velocity.x * 0.15;
        this.sprite.setAngle(Math.sin(-forceX) * (180 / Math.PI));

        const forceY = Math.abs(physics.angularVelocity.x);
        const next = physics.angularVelocity.x < 0
            ? () => this._nextFrame() : () => this._prevFrame();

        if (forceY > 7) next();
        else if (forceY > 3) { if (++this.bufferTime > 2 / ROLL_BALL_RATE) { next(); this.bufferTime = 0; } }
        else if (forceY > 1) { if (++this.bufferTime > 3 / ROLL_BALL_RATE) { next(); this.bufferTime = 0; } }
        else if (forceY > MIN_BALL_VEL_ROTATION) { if (++this.bufferTime > 4 / ROLL_BALL_RATE) { next(); this.bufferTime = 0; } }
    }
    _prevFrame() { this.frame = this.frame === 0 ? 6 : this.frame - 1; this.sprite.setFrame(this.frame); }
    _nextFrame() { this.frame = this.frame === 6 ? 0 : this.frame + 1; this.sprite.setFrame(this.frame); }

    fade(toAlpha, dur, wait) {
        this.scene.tweens.add({ targets: this.container, alpha: toAlpha, duration: dur, delay: wait });
    }
}
