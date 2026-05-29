// 踢球員 — 移植自 game/js/CPlayer.js
// 31 幀踢球動畫；播到 SHOOT_FRAME 時觸發球的衝力
class PlayerView {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sprite = scene.add.sprite(x, y, 'player_0').setOrigin(0, 0).setVisible(false);

        const frames = [];
        for (let i = 0; i < NUM_SPRITE_PLAYER; i++) frames.push({ key: `player_${i}` });
        scene.anims.create({ key: 'player_kick', frames, frameRate: FPS, repeat: 0 });

        this.onShootFrame = null;  // callback
        this.onComplete = null;
        this._shotFired = false;

        this.sprite.on('animationcomplete', () => {
            this.sprite.setVisible(false);
            if (this.onComplete) this.onComplete();
        });
    }

    play() {
        this._shotFired = false;
        this.sprite.setVisible(true);
        this.sprite.play('player_kick');
        // 第 SHOOT_FRAME 幀觸發踢球衝力（30fps，確定性計時）
        this.scene.time.delayedCall((SHOOT_FRAME / FPS) * 1000, () => {
            if (!this._shotFired && this.onShootFrame) {
                this._shotFired = true;
                this.onShootFrame();
            }
        });
    }
    reset() {
        this._shotFired = false;
        this.sprite.setVisible(false);
        this.sprite.setFrame(0);
    }
}
