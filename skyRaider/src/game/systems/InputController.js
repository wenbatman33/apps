import Phaser from '../../../vendor/phaser.js';
import { GAME_HEIGHT, GAME_WIDTH, WORLD } from '../constants.js';
export class InputController {
    scene;
    target = new Phaser.Math.Vector2(GAME_WIDTH / 2, GAME_HEIGHT - 140);
    lastPointer = new Phaser.Math.Vector2(0, 0);
    dragging = false;
    bombQueued = false;
    weaponSwitchQueued = false;
    handleWindowPointerMove = (event) => {
        if (!this.dragging)
            return;
        if (event.pointerType === 'mouse' && event.buttons === 0) {
            this.dragging = false;
            return;
        }
        const pointer = this.clientToGame(event.clientX, event.clientY);
        this.target.x += pointer.x - this.lastPointer.x;
        this.target.y += pointer.y - this.lastPointer.y;
        this.lastPointer.copy(pointer);
    };
    handleWindowPointerUp = () => {
        this.dragging = false;
    };
    constructor(scene) {
        this.scene = scene;
        this.scene.input.on('pointerdown', (pointer) => {
            this.dragging = true;
            this.lastPointer.set(pointer.x, pointer.y);
        });
        this.scene.input.on('pointerup', () => {
            this.dragging = false;
        });
        window.addEventListener('pointermove', this.handleWindowPointerMove, { passive: true });
        window.addEventListener('pointerup', this.handleWindowPointerUp);
        window.addEventListener('pointercancel', this.handleWindowPointerUp);
        window.addEventListener('blur', this.handleWindowPointerUp);
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
        this.scene.input.keyboard?.on('keydown-X', () => {
            this.bombQueued = true;
        });
        this.scene.input.keyboard?.on('keydown-B', () => {
            this.bombQueued = true;
        });
        this.scene.input.keyboard?.on('keydown-C', () => {
            this.weaponSwitchQueued = true;
        });
    }
    update(currentX, currentY, deltaMs) {
        const keyboard = this.scene.input.keyboard;
        const cursors = keyboard?.createCursorKeys();
        const speed = 420 * (deltaMs / 1000);
        let nextX = currentX;
        let nextY = currentY;
        if (cursors?.left.isDown || keyboard?.addKey('A').isDown)
            nextX -= speed;
        if (cursors?.right.isDown || keyboard?.addKey('D').isDown)
            nextX += speed;
        if (cursors?.up.isDown || keyboard?.addKey('W').isDown)
            nextY -= speed;
        if (cursors?.down.isDown || keyboard?.addKey('S').isDown)
            nextY += speed;
        if (this.dragging) {
            nextX = Phaser.Math.Linear(currentX, this.target.x, 0.36);
            nextY = Phaser.Math.Linear(currentY, this.target.y, 0.36);
        }
        else {
            this.target.set(currentX, currentY);
        }
        return new Phaser.Math.Vector2(Phaser.Math.Clamp(nextX, WORLD.left, WORLD.right), Phaser.Math.Clamp(nextY, WORLD.top + 120, WORLD.bottom));
    }
    queueBomb() {
        this.bombQueued = true;
    }
    consumeBomb() {
        const queued = this.bombQueued;
        this.bombQueued = false;
        return queued;
    }
    consumeWeaponSwitch() {
        const queued = this.weaponSwitchQueued;
        this.weaponSwitchQueued = false;
        return queued;
    }
    destroy() {
        window.removeEventListener('pointermove', this.handleWindowPointerMove);
        window.removeEventListener('pointerup', this.handleWindowPointerUp);
        window.removeEventListener('pointercancel', this.handleWindowPointerUp);
        window.removeEventListener('blur', this.handleWindowPointerUp);
    }
    clientToGame(clientX, clientY) {
        const rect = this.scene.scale.canvas.getBoundingClientRect();
        return new Phaser.Math.Vector2(((clientX - rect.left) / rect.width) * GAME_WIDTH, ((clientY - rect.top) / rect.height) * GAME_HEIGHT);
    }
}
