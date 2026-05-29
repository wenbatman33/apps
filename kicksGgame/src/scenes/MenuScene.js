// 主選單（Phaser 純畫面）
class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'Menu' }); }

    create() {
        // 直向（ENVELOP 只顯示中央窄條 x≈533~827）需縮小並收進中央
        const portrait = window.innerHeight > window.innerWidth;

        // 半透明蓋片（全螢幕，純色不怕裁切）
        this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x06122a, 0.55);

        if (portrait) {
            // 標題換兩行以塞進中央窄條
            this.add.text(GAME_W / 2, 175, 'PENALTY\nKICKS', {
                fontFamily: 'Arial Black, sans-serif', fontSize: 58, color: '#ffffff',
                stroke: '#0033aa', strokeThickness: 6, align: 'center', lineSpacing: 4,
            }).setOrigin(0.5);
            this.add.text(GAME_W / 2, 295, 'kicksGame', {
                fontFamily: 'Arial Black, sans-serif', fontSize: 28, color: '#9cc3ff',
                stroke: '#0033aa', strokeThickness: 3,
            }).setOrigin(0.5);
            this.makeButton(GAME_W / 2, 400, '▶  PLAY', () => this.scene.start('Play'), 250, 26);
        } else {
            this.add.text(GAME_W / 2, 120, 'PENALTY KICKS', {
                fontFamily: 'Arial Black, sans-serif', fontSize: 96, color: '#ffffff',
                stroke: '#0033aa', strokeThickness: 8,
            }).setOrigin(0.5);
            this.add.text(GAME_W / 2, 210, 'kicksGame', {
                fontFamily: 'Arial Black, sans-serif', fontSize: 34, color: '#9cc3ff',
                stroke: '#0033aa', strokeThickness: 3,
            }).setOrigin(0.5);
            this.makeButton(GAME_W / 2, 380, '▶  PLAY', () => this.scene.start('Play'), 460, 26);
        }
    }

    makeButton(x, y, label, onClick, w = 460, fontSize = 26) {
        const h = 60;
        const bg = this.add.rectangle(x, y, w, h, 0x1a3a8c, 0.92)
            .setStrokeStyle(2, 0x6aa3ff)
            .setInteractive({ useHandCursor: true });
        const txt = this.add.text(x, y, label, {
            fontFamily: 'Arial', fontSize: fontSize, color: '#ffffff',
        }).setOrigin(0.5);

        bg.on('pointerover', () => bg.setFillStyle(0x2a5fd0, 0.95));
        bg.on('pointerout',  () => bg.setFillStyle(0x1a3a8c, 0.92));
        bg.on('pointerdown', onClick);
        return { bg, txt };
    }
}
