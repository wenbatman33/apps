// 主選單（Phaser 純畫面）
class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'Menu' }); }

    create() {
        // Phaser 上層是透明的；這裡先放半透明蓋片避免 3D 場景太花
        this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x06122a, 0.55);

        // 標題
        this.add.text(GAME_W / 2, 120, 'PENALTY KICKS', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: 96,
            color: '#ffffff',
            stroke: '#0033aa',
            strokeThickness: 8,
        }).setOrigin(0.5);

        // 品牌標示
        this.add.text(GAME_W / 2, 210, 'kicksGame', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: 34,
            color: '#9cc3ff',
            stroke: '#0033aa',
            strokeThickness: 3,
        }).setOrigin(0.5);

        // PLAY 按鈕
        this.makeButton(GAME_W / 2, 380, '▶  PLAY', () => {
            this.scene.start('Play');
        });
    }

    makeButton(x, y, label, onClick) {
        const w = 460, h = 60;
        const bg = this.add.rectangle(x, y, w, h, 0x1a3a8c, 0.92)
            .setStrokeStyle(2, 0x6aa3ff)
            .setInteractive({ useHandCursor: true });
        const txt = this.add.text(x, y, label, {
            fontFamily: 'Arial', fontSize: 26, color: '#ffffff',
        }).setOrigin(0.5);

        bg.on('pointerover', () => bg.setFillStyle(0x2a5fd0, 0.95));
        bg.on('pointerout',  () => bg.setFillStyle(0x1a3a8c, 0.92));
        bg.on('pointerdown', onClick);
        return { bg, txt };
    }
}
