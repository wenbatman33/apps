// 守門員 — 移植自 game/js/CGoalKeeper.js
// 16 組動畫，每組一個 Phaser animation；以單一 sprite 切換播放
class GoalKeeperView {
    constructor(scene, x, y) {
        this.scene = scene;
        this.startPos = { x, y };
        this.animType = IDLE;
        this.sprite = scene.add.sprite(x, y, 'gk_idle_0').setOrigin(0, 0);

        // 為 16 組動畫建立 anim key
        for (let g = 0; g < SPRITE_NAME_GOALKEEPER.length; g++) {
            const name = SPRITE_NAME_GOALKEEPER[g];
            const n = NUM_SPRITE_GOALKEEPER[g];
            const frames = [];
            for (let f = 0; f < n; f++) frames.push({ key: `${name}_${f}` });
            scene.anims.create({
                key: name,
                frames,
                frameRate: FPS,           // 與原 BUFFER_ANIM_PLAYER=FPS 對齊
                repeat: g === IDLE ? -1 : 0,
            });
        }
        this.runAnim(IDLE);
    }

    _applyOffset(type) {
        const o = OFFSET_CONTAINER_GOALKEEPER[type];
        this.sprite.setPosition(this.startPos.x + o.x, this.startPos.y + o.y);
    }

    runAnim(type) {
        this.animType = type;
        this._applyOffset(type);
        this.sprite.setAlpha(1);
        this.sprite.play(SPRITE_NAME_GOALKEEPER[type]);
    }

    // 撲救：播動畫並把守門員位移到球落點方向（移植 runAnimAndShift）
    runAnimAndShift(type, ballFinalPos) {
        this.runAnim(type);
        const origin = ORIGIN_POINT_IMPACT_ANIMATION[type];
        let dx = origin.x === null ? 0 : (ballFinalPos.x - origin.x);
        let dy = origin.y === null ? 0 : (ballFinalPos.y - origin.y);
        const o = OFFSET_CONTAINER_GOALKEEPER[type];
        const baseX = this.startPos.x + o.x;
        const baseY = this.startPos.y + o.y;
        this.scene.tweens.add({
            targets: this.sprite, x: baseX + dx, y: baseY + dy, duration: 600,
            onComplete: () => {
                this.scene.tweens.add({ targets: this.sprite, x: baseX, y: baseY, duration: 300 });
            }
        });
    }

    // 撲救動畫播完後淡出（被擋/撲錯都呼叫）
    fadeOut() {
        this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: 500 });
    }

    reset() {
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.setAlpha(1);
        this.runAnim(IDLE);
    }
}
