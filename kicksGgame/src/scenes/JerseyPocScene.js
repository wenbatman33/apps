// 球衣染色 POC 場景：把原圖綠色襪條替換成藍色，左右對照
class JerseyPocScene extends Phaser.Scene {
    constructor() { super({ key: 'JerseyPoc' }); }

    create() {
        // 半透明蓋板（避免 3D 干擾觀察）
        this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x06122a, 0.85);

        this.add.text(GAME_W / 2, 36, '球衣染色 POC — 左：原圖   右：藍白條紋版（程式合成）', {
            fontFamily: 'Arial', fontSize: 22, color: '#ffe98a',
        }).setOrigin(0.5);

        // 三組對照：player_12 / player_18 / gk_idle_0
        const samples = [
            { key: 'player_12', label: '球員 frame 12' },
            { key: 'player_18', label: '球員 frame 18' },
            { key: 'gk_idle_0', label: '守門員 idle 0' },
        ];

        // 對球員：把襪條綠色（hue 90~160）換成藍色（hue 220）
        // 對 GK：把灰白上衣的對角斜條（接近黑灰）暫時不動；先把短褲/襪可能存在的色相位移
        const COL_W = GAME_W / 3;

        samples.forEach((s, idx) => {
            const cx = COL_W * idx + COL_W / 2;
            const baseY = 110;

            this.add.text(cx, baseY, s.label, {
                fontFamily: 'Arial', fontSize: 18, color: '#cfe0ff',
            }).setOrigin(0.5);

            // 原圖
            this.add.image(cx - 80, baseY + 220, s.key)
                .setOrigin(0.5).setDisplaySize(180, 280);
            this.add.text(cx - 80, baseY + 380, '原', {
                fontFamily: 'Arial', fontSize: 16, color: '#aaa',
            }).setOrigin(0.5);

            // 染色版
            const recoloredKey = `${s.key}_blue`;
            this.makeRecoloredTexture(s.key, recoloredKey);
            this.add.image(cx + 80, baseY + 220, recoloredKey)
                .setOrigin(0.5).setDisplaySize(180, 280);
            this.add.text(cx + 80, baseY + 380, '藍白', {
                fontFamily: 'Arial', fontSize: 16, color: '#88c5ff',
            }).setOrigin(0.5);
        });

        // 回主選單
        const back = this.add.rectangle(120, GAME_H - 50, 180, 50, 0x000033, 0.7)
            .setStrokeStyle(2, 0x9cc3ff).setInteractive({ useHandCursor: true });
        this.add.text(120, GAME_H - 50, '← MENU', {
            fontFamily: 'Arial', fontSize: 22, color: '#ffffff',
        }).setOrigin(0.5);
        back.on('pointerdown', () => this.scene.start('Menu'));
        this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
    }

    // 取出原 texture，做染色，存成新 texture
    makeRecoloredTexture(srcKey, newKey) {
        if (this.textures.exists(newKey)) return;
        const srcCanvas = Recolor.textureToCanvas(this, srcKey);
        // 綠色襪條 → 藍色（hue 220 = 飽和藍）
        // 範圍 80~170 涵蓋黃綠到青綠
        let out = Recolor.shiftHue(srcCanvas, [80, 170], 220, 1.0);
        Recolor.canvasToTexture(this, out, newKey);
    }
}
