// 載入全部原始素材（直接讀 ../game/sprites，不複製檔案）
class PreloadScene extends Phaser.Scene {
    constructor() { super({ key: 'Preload' }); }

    preload() {
        // 降低同時下載數，避免大量小圖併發造成本機伺服器/分頁載入停滯
        this.load.maxParallelDownloads = 8;

        const cx = CANVAS_WIDTH / 2, cy = CANVAS_HEIGHT / 2;
        this.add.rectangle(cx, cy, CANVAS_WIDTH, CANVAS_HEIGHT, 0x0a1a30);
        const bg = this.add.graphics();
        bg.fillStyle(0x222244).fillRect(cx - 220, cy - 14, 440, 28);
        const bar = this.add.graphics();
        const pct = this.add.text(cx, cy - 56, 'LOADING… 0%', {
            fontFamily: 'Arial', fontSize: 26, color: '#cfe0ff',
        }).setOrigin(0.5);
        this.load.on('progress', (p) => {
            bar.clear();
            bar.fillStyle(0x4d8bff).fillRect(cx - 216, cy - 10, 432 * p, 20);
            pct.setText('LOADING… ' + Math.round(p * 100) + '%');
        });

        const base = 'assets/sprites';

        // 背景 / 靜態圖
        this.load.image('bg_menu', `${base}/bg_menu.jpg`);
        this.load.image('bg_game', `${base}/bg_game.jpg`);
        this.load.image('goal', `${base}/goal.png`);
        this.load.image('ball_shadow', `${base}/ball_shadow.png`);
        this.load.image('logo', `${base}/logo_ctl.png`);
        this.load.image('start_ball', `${base}/start_ball.png`);

        // 廣告看板用圖（平鋪）
        this.load.image('ad_18luck', 'assets/logo/18luck.png');

        // 球：1050×150 = 7 幀，每幀 150×150
        this.load.spritesheet('ball', `${base}/ball.png`, { frameWidth: 150, frameHeight: 150 });

        // 球員射門動畫 31 幀
        for (let i = 0; i < NUM_SPRITE_PLAYER; i++) {
            this.load.image(`player_${i}`, `${base}/player/player_${i}.png`);
        }

        // 守門員 16 組動畫，逐幀載入
        for (let g = 0; g < SPRITE_NAME_GOALKEEPER.length; g++) {
            const name = SPRITE_NAME_GOALKEEPER[g];
            const n = NUM_SPRITE_GOALKEEPER[g];
            for (let f = 0; f < n; f++) {
                this.load.image(`${name}_${f}`, `${base}/${name}/${name}_${f}.png`);
            }
        }

        // 音效
        const snd = 'assets/sounds';
        this.load.audio('kick', `${snd}/kick.mp3`);
        this.load.audio('goal', `${snd}/goal.mp3`);
        this.load.audio('ball_saved', `${snd}/ball_saved.mp3`);
        this.load.audio('pole', `${snd}/pole.mp3`);
        this.load.audio('drop_bounce_grass', `${snd}/drop_bounce_grass.mp3`);
    }

    create() {
        Projection.createCamera();
        this.scene.start('Menu');
    }
}
