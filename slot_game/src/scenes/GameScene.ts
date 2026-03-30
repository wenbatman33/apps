import Phaser from 'phaser';

const SYMBOLS = ['🍄', '🌟', '🪙', '🐢', '🦖', '👸🏼', '💰', '👑'];
const REEL_COLS = 5;
const REEL_ROWS = 3;
const REEL_WIDTH = 138;
const SYMBOL_HEIGHT = 160;
const SPIN_DURATION_BASE = 1200;
const SPIN_DELAY_BETWEEN_REELS = 200;

export class GameScene extends Phaser.Scene {
    private reels: Phaser.GameObjects.Container[][] = [];
    private isSpinning = false;
    private spinButton!: Phaser.GameObjects.Container;
    private resultMatrix: number[][] = [];
    
    // UI Elements
    private balance = 1000;
    private currentBet = 10;
    private balanceText!: Phaser.GameObjects.Text;
    private betText!: Phaser.GameObjects.Text;
    private winTextLayer!: Phaser.GameObjects.Text;
    private multiplierText!: Phaser.GameObjects.Text;
    
    // Host Animation
    private hostChar!: Phaser.GameObjects.Text;
    
    // Effects
    private winShaders: Phaser.GameObjects.Graphics[][] = [];
    private coinEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.load.audio('coin', 'https://labs.phaser.io/assets/audio/SoundEffects/pickup.wav');
        this.load.audio('spin', 'https://labs.phaser.io/assets/audio/SoundEffects/synth_1.mp3');
        this.load.audio('win', 'https://labs.phaser.io/assets/audio/SoundEffects/magical_1.ogg');
        this.load.audio('stop', 'https://labs.phaser.io/assets/audio/SoundEffects/keybd_1.mp3');
        this.load.image('particle', 'https://labs.phaser.io/assets/particles/yellow.png');
    }

    create() {
        this.createBackground();
        this.createHostArea();
        this.createReels();
        this.createUI();
        this.createWinEffects();
    }

    private createBackground() {
        // Deep purple to magenta gradient for the PG Soft vibe (Mobile portrait)
        const bg = this.add.graphics();
        // Fallback solid if complex gradient is tough, but let's emulate it
        bg.fillGradientStyle(0x3B0452, 0x3B0452, 0x1A052A, 0x1A052A, 1, 1, 1, 1);
        bg.fillRect(0, 0, 720, 1280);

        // Radiant glow (Mandala effect behind host)
        const rays = this.add.graphics();
        rays.setPosition(360, 200);
        
        // Draw sunburst rays
        rays.fillStyle(0xFFD700, 0.15); // Golden rays
        for(let i=0; i<360; i+=15) {
            const rad = Phaser.Math.DegToRad(i);
            const rad2 = Phaser.Math.DegToRad(i+5);
            rays.beginPath();
            rays.moveTo(0,0);
            rays.lineTo(Math.cos(rad)*600, Math.sin(rad)*600);
            rays.lineTo(Math.cos(rad2)*600, Math.sin(rad2)*600);
            rays.closePath();
            rays.fillPath();
        }

        // Rotate rays continuously
        this.tweens.add({
            targets: rays,
            angle: 360,
            duration: 30000,
            repeat: -1
        });
        
        // Add floating dust
        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: 720 },
            y: { min: 400, max: 1280 },
            speedY: { min: -10, max: -40 },
            lifespan: { min: 4000, max: 8000 },
            scale: { start: 0.1, end: 0.3 },
            alpha: { start: 0.5, end: 0 },
            quantity: 1,
            frequency: 100,
            tint: [0xFFD700, 0xFFA500],
            blendMode: 'ADD'
        });
    }

    private createHostArea() {
        // Giant Mario Host at the top
        this.hostChar = this.add.text(360, 180, '👨🏻‍🔧', {
            fontSize: '180px', // Massive
            fontFamily: '"Segoe UI Emoji"'
        }).setOrigin(0.5);
        
        // Host breathing animation
        this.tweens.add({
            targets: this.hostChar,
            y: 160,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // The Huge Multiplier Display Track under the host
        const multiBg = this.add.graphics();
        multiBg.fillStyle(0x000000, 0.6);
        multiBg.fillRoundedRect(160, 310, 400, 80, 40);
        multiBg.lineStyle(4, 0xFFD700);
        multiBg.strokeRoundedRect(160, 310, 400, 80, 40);

        this.multiplierText = this.add.text(360, 350, 'X2', {
            fontFamily: '"Impact", sans-serif',
            fontSize: '80px',
            color: '#FFEA00',
            stroke: '#E60000',
            strokeThickness: 12,
            shadow: { offsetX: 3, offsetY: 5, color: '#440000', fill: true }
        }).setOrigin(0.5);

        // Win Banner (GANHOS equivalent)
        const ribbonBg = this.add.graphics();
        ribbonBg.fillStyle(0x5A009D, 1); // Rich Purple ribbon
        ribbonBg.fillRoundedRect(110, 420, 500, 50, 15);
        ribbonBg.lineStyle(3, 0xD4AF37); // Gold edge
        ribbonBg.strokeRoundedRect(110, 420, 500, 50, 15);

        this.add.text(360, 445, 'WIN AMOUNT', { 
            fontSize: '22px', 
            fontFamily: 'Arial Black', 
            color: '#FFD700',
            shadow: { offsetY: 2, color: '#000', fill: true }
        }).setOrigin(0.5, 0.5).setAlpha(0.6);

        this.winTextLayer = this.add.text(360, 445, '', { 
            fontSize: '32px', 
            fontFamily: 'Arial Black', 
            color: '#00FF00',
            stroke: '#003300',
            strokeThickness: 4,
            shadow: { offsetY: 2, color: '#000', fill: true }
        }).setOrigin(0.5, 0.5);
    }

    private createReels() {
        const frameX = 360;
        const frameY = 750; // Middle of the reels
        const width = REEL_COLS * REEL_WIDTH; // 5 * 138 = 690
        const height = REEL_ROWS * SYMBOL_HEIGHT; // 3 * 160 = 480
        
        // Reels dark transparent backdrop (the void)
        const bg = this.add.graphics();
        bg.fillStyle(0x0a0314, 0.85); // Very dark purplish black
        bg.fillRect(frameX - width/2, frameY - height/2, width, height);
        
        // Thin gold vertical separators
        bg.lineStyle(2, 0xD4AF37, 0.5); // Thin gold with opacity
        for(let i=1; i<REEL_COLS; i++) {
            bg.beginPath();
            bg.moveTo(frameX - width/2 + i * REEL_WIDTH, frameY - height/2);
            bg.lineTo(frameX - width/2 + i * REEL_WIDTH, frameY + height/2);
            bg.strokePath();
        }

        // Thick Gold horizontal top and bottom caps
        bg.lineStyle(8, 0xFFD700, 1);
        bg.strokeRect(frameX - width/2, frameY - height/2, width, height);

        // Geometrical Mask for scrolling text
        const maskShape = this.add.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(frameX - width / 2, frameY - height / 2, width, height);
        const mask = maskShape.createGeometryMask();

        const startX = frameX - width / 2 + REEL_WIDTH / 2;
        const startY = frameY - height / 2 + SYMBOL_HEIGHT / 2;

        for (let col = 0; col < REEL_COLS; col++) {
            this.reels[col] = [];
            this.winShaders[col] = [];

            for (let row = 0; row < REEL_ROWS + 5; row++) { 
                const symbolIdx = Phaser.Math.Between(0, SYMBOLS.length - 1);
                const x = startX + col * REEL_WIDTH;
                const y = startY + (row - 2) * SYMBOL_HEIGHT;
                
                // --- Create sunburst shader behind symbol for Winning --- //
                if (row >= 1 && row <= 3) { // Only the visible rows get shaders stored
                    const shader = this.createSunburst(x, y);
                    shader.setVisible(false);
                    shader.setMask(mask);
                    this.winShaders[col].push(shader);
                }

                const symbolContainer = this.add.container(x, y);

                // Heavy 3D Drop Shadow / Offset
                const shadow = this.add.text(4, 8, SYMBOLS[symbolIdx], {
                    fontSize: '110px',
                    fontFamily: '"Segoe UI Emoji"'
                }).setOrigin(0.5).setAlpha(0.7).setTint(0x000000);

                const text = this.add.text(0, 0, SYMBOLS[symbolIdx], {
                    fontSize: '110px',
                    fontFamily: '"Segoe UI Emoji"'
                }).setOrigin(0.5);

                symbolContainer.add([shadow, text]);
                symbolContainer.setMask(mask);
                (symbolContainer as any).charIdx = symbolIdx;
                this.reels[col].push(symbolContainer);
            }
        }
        
        // Inner Shadows (Top and bottom gradients for cylindrical curve illusion)
        const gradientMaskTop = this.add.graphics();
        gradientMaskTop.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.9, 0.9, 0, 0);
        gradientMaskTop.fillRect(frameX - width/2, frameY - height/2, width, 50);

        const gradientMaskBottom = this.add.graphics();
        gradientMaskBottom.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.9, 0.9);
        gradientMaskBottom.fillRect(frameX - width/2, frameY + height/2 - 50, width, 50);
    }

    private createSunburst(x: number, y: number): Phaser.GameObjects.Graphics {
        const burst = this.add.graphics();
        burst.setPosition(x, y);
        burst.fillStyle(0xFF8800, 0.7); // Orange glow
        burst.fillCircle(0, 0, 70); // Base glow
        
        burst.fillStyle(0xFFE500, 0.9); // Yellow spikes
        const spikes = 12;
        const outer = 85;
        const inner = 30;
        
        burst.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outer : inner;
            const angle = (i * Math.PI) / spikes;
            if (i === 0) burst.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            else burst.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        burst.closePath();
        burst.fillPath();

        // Spin it infinitely!
        this.tweens.add({
            targets: burst,
            angle: 360,
            duration: 5000,
            repeat: -1
        });
        
        // Pulsate scale slightly
        this.tweens.add({
            targets: burst,
            scale: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        return burst;
    }

    private createUI() {
        const uiY = 1100;
        
        // Minimal Footer style:
        
        // 1. Bet Adjustments
        // [-] Button
        const btnMinus = this.add.graphics();
        btnMinus.fillStyle(0x000000, 0.6);
        btnMinus.fillRoundedRect(40, uiY - 30, 80, 80, 40);
        btnMinus.lineStyle(2, 0xD4AF37);
        btnMinus.strokeRoundedRect(40, uiY - 30, 80, 80, 40);
        const textMinus = this.add.text(80, uiY + 10, '-', { fontSize: '48px', color: '#FFF' }).setOrigin(0.5);
        
        const hitMinus = new Phaser.Geom.Rectangle(40, uiY - 30, 80, 80);
        textMinus.setInteractive(hitMinus, Phaser.Geom.Rectangle.Contains);
        textMinus.on('pointerdown', () => this.changeBet(-10));
        textMinus.on('pointerover', () => this.sys.canvas.style.cursor = 'pointer');
        textMinus.on('pointerout', () => this.sys.canvas.style.cursor = 'default');

        // [+] Button
        const btnPlus = this.add.graphics();
        btnPlus.fillStyle(0x000000, 0.6);
        btnPlus.fillRoundedRect(600, uiY - 30, 80, 80, 40);
        btnPlus.lineStyle(2, 0xD4AF37);
        btnPlus.strokeRoundedRect(600, uiY - 30, 80, 80, 40);
        const textPlus = this.add.text(640, uiY + 10, '+', { fontSize: '48px', color: '#FFF' }).setOrigin(0.5);
        
        const hitPlus = new Phaser.Geom.Rectangle(600, uiY - 30, 80, 80);
        textPlus.setInteractive(hitPlus, Phaser.Geom.Rectangle.Contains);
        textPlus.on('pointerdown', () => this.changeBet(10));
        textPlus.on('pointerover', () => this.sys.canvas.style.cursor = 'pointer');
        textPlus.on('pointerout', () => this.sys.canvas.style.cursor = 'default');

        // Bet Display
        this.betText = this.add.text(520, uiY + 10, 'BET $10', { fontSize: '24px', fontFamily: 'Arial Black', color: '#FFD700' }).setOrigin(0.5);

        // 2. The Main Circular Spin Button
        this.spinButton = this.add.container(360, uiY + 10);
        
        const outerGlow = this.add.circle(0, 0, 75, 0xFF0000, 0.3);
        const spinBase = this.add.circle(0, 0, 70, 0x440000);
        const spinTop = this.add.circle(0, -5, 70, 0xDD0000);
        // Inner gold rim
        const spinRim = this.add.graphics();
        spinRim.lineStyle(6, 0xFFD700);
        spinRim.strokeCircle(0, -5, 62);
        
        const spinText = this.add.text(0, -5, 'SPIN', {
            fontFamily: '"Impact", sans-serif',
            fontSize: '36px',
            color: '#FFFFFF',
            shadow: { offsetX: 0, offsetY: 2, color: '#660000', fill: true }
        }).setOrigin(0.5);

        this.spinButton.add([outerGlow, spinBase, spinTop, spinRim, spinText]);

        const hitCircle = new Phaser.Geom.Circle(0, 0, 70);
        this.spinButton.setInteractive(hitCircle, Phaser.Geom.Circle.Contains);
        
        this.spinButton.on('pointerdown', () => {
            if (!this.isSpinning) {
                this.spinButton.setScale(0.9);
                void this.spin();
                this.time.delayedCall(100, () => this.spinButton.setScale(1.0));
            }
        });
        
        this.spinButton.on('pointerover', () => {
            if (!this.isSpinning) this.sys.canvas.style.cursor = 'pointer';
        });
        
        this.spinButton.on('pointerout', () => {
            this.sys.canvas.style.cursor = 'default';
        });

        // 3. Very Bottom Info Strip (Balance)
        const strip = this.add.graphics();
        strip.fillStyle(0x000000, 0.8);
        strip.fillRect(0, 1220, 720, 60);
        
        this.balanceText = this.add.text(360, 1250, `BALANCE: $${this.balance}`, {
            fontSize: '22px', fontFamily: 'Arial Black', color: '#00FF00'
        }).setOrigin(0.5);
    }

    private changeBet(amount: number) {
        if (this.isSpinning) return;
        this.currentBet = Phaser.Math.Clamp(this.currentBet + amount, 10, this.balance > 0 ? this.balance : 10);
        this.updateUI();
    }

    private updateUI() {
        this.balanceText.setText(`BALANCE: $${this.balance}`);
        this.betText.setText(`BET $${this.currentBet}`);
    }

    private createWinEffects() {
        this.coinEmitter = this.add.particles(0, 0, 'particle', {
            x: 360,
            y: { min: -50, max: 0 },
            speedX: { min: -300, max: 300 },
            speedY: { min: -100, max: 400 },
            angle: { min: 45, max: 135 },
            gravityY: 1000,
            lifespan: 3000,
            quantity: 15, // High quantity for mobile vertical fall
            scale: { start: 1, end: 0.2 },
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD',
            tint: [0xFFD700, 0xFFA500, 0xFFFFFF],
            emitting: false
        });
        this.coinEmitter.setDepth(15);
    }

    private hideWinShaders() {
        for (let c=0; c<REEL_COLS; c++) {
            for (let r=0; r<REEL_ROWS; r++) {
                if (this.winShaders[c] && this.winShaders[c][r]) {
                    this.winShaders[c][r].setVisible(false);
                }
            }
        }
    }

    private async fetchMultipliersFromAPI(): Promise<number[][]> {
        return new Promise(resolve => {
            setTimeout(() => {
                const matrix: number[][] = [];
                for (let c = 0; c < REEL_COLS; c++) {
                    matrix[c] = [];
                    for (let r = 0; r < REEL_ROWS; r++) {
                        matrix[c].push(Phaser.Math.Between(0, SYMBOLS.length - 1));
                    }
                }
                resolve(matrix);
            }, 300); 
        });
    }

    private async spin() {
        if (this.balance < this.currentBet) {
            this.cameras.main.shake(200, 0.005);
            return;
        }

        this.isSpinning = true;
        this.balance -= this.currentBet;
        this.updateUI();

        // Clear previous win info
        this.winTextLayer.setText('');
        this.hideWinShaders();
        
        // Randomize Multiplier purely for visual
        const possibleMultipliers = ['X2', 'X3', 'X5', 'X10', 'WILD'];
        this.multiplierText.setText(possibleMultipliers[Phaser.Math.Between(0, possibleMultipliers.length-1)]);

        this.sound.play('spin', { volume: 0.8, loop: true });
        this.coinEmitter.stop();
        
        this.tweens.add({
            targets: this.hostChar,
            y: 130,
            rotation: 0.2,
            duration: 150,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.resultMatrix = await this.fetchMultipliersFromAPI();

        let completedReels = 0;
        
        for (let col = 0; col < REEL_COLS; col++) {
            this.time.delayedCall(col * SPIN_DELAY_BETWEEN_REELS, () => {
                this.spinReel(col, () => {
                    completedReels++;
                    if (completedReels === REEL_COLS) {
                        this.onSpinComplete();
                    }
                });
            });
        }
    }

    private spinReel(col: number, onComplete: () => void) {
        const reel = this.reels[col];
        const extraSpins = 3 + col * 2; 
        const spinDistance = extraSpins * SYMBOLS.length * SYMBOL_HEIGHT;
        
        let currentYOffset = 0;
        const finalTarget = spinDistance;
        
        reel.forEach((symbolContainer) => {
            this.tweens.add({ targets: symbolContainer, scaleY: 2.0, alpha: 0.6, duration: 150 });
        });
        
        this.tweens.addCounter({
            from: 0,
            to: finalTarget,
            duration: SPIN_DURATION_BASE + col * 250,
            ease: Phaser.Math.Easing.Cubic.In,
            onUpdate: (tween) => {
                const value = Number(tween.getValue());
                const delta = value - currentYOffset;
                currentYOffset = value;
                
                reel.forEach((symbolContainer) => {
                    symbolContainer.y += delta;
                    const frameHeight = (REEL_ROWS + 5) * SYMBOL_HEIGHT;
                    const frameTop = 750 - (REEL_ROWS * SYMBOL_HEIGHT) / 2 - 2 * SYMBOL_HEIGHT;
                    
                    if (symbolContainer.y > frameTop + frameHeight) {
                        symbolContainer.y -= frameHeight;
                        const newIdx = Phaser.Math.Between(0, SYMBOLS.length - 1);
                        (symbolContainer as any).charIdx = newIdx;
                        (symbolContainer.list[0] as Phaser.GameObjects.Text).setText(SYMBOLS[newIdx]);
                        (symbolContainer.list[1] as Phaser.GameObjects.Text).setText(SYMBOLS[newIdx]);
                    }
                });
            },
            onComplete: () => {
                reel.sort((a, b) => a.y - b.y);
                const startY = 750 - (REEL_ROWS * SYMBOL_HEIGHT) / 2 + SYMBOL_HEIGHT / 2;
                
                const visibleSet = reel.slice(1, 4); 
                
                for(let r = 0; r < REEL_ROWS; r++) {
                    const sc = visibleSet[r];
                    const finalCharIdx = this.resultMatrix[col][r];
                    (sc as any).charIdx = finalCharIdx;
                    (sc.list[0] as Phaser.GameObjects.Text).setText(SYMBOLS[finalCharIdx]);
                    (sc.list[1] as Phaser.GameObjects.Text).setText(SYMBOLS[finalCharIdx]);
                    
                    sc.y = startY + r * SYMBOL_HEIGHT - SYMBOL_HEIGHT * 1.5;
                    this.tweens.add({
                        targets: sc,
                        y: startY + r * SYMBOL_HEIGHT,
                        scaleY: 1, 
                        alpha: 1,
                        duration: 350,
                        ease: 'Back.easeOut', 
                    });
                }
                
                const topSc = reel[0];
                const bottomSc = reel[4];
                topSc.scaleY = 1; topSc.alpha = 1; topSc.y = startY - SYMBOL_HEIGHT;
                bottomSc.scaleY = 1; bottomSc.alpha = 1; bottomSc.y = startY + 3*SYMBOL_HEIGHT;
                
                this.sound.play('stop', { volume: 0.6 });

                onComplete();
            }
        });
    }

    private onSpinComplete() {
        this.sound.stopAll(); 
        
        // Reset Host
        this.tweens.killTweensOf(this.hostChar);
        this.hostChar.setRotation(0);
        this.tweens.add({
            targets: this.hostChar,
            y: 160,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // PG Soft Style Win Reveal!
        const winChance = Phaser.Math.FloatBetween(0, 1);
        
        if (winChance > 0.6) {
            // Find which symbols "won" (DEV mode: just pick a few random visible spots)
            let matchCount = 0;
            for(let c=0; c<REEL_COLS; c++) {
                for(let r=0; r<REEL_ROWS; r++) {
                    if (Phaser.Math.FloatBetween(0,1) > 0.6) {
                        // Light up this symbol!
                        if (this.winShaders[c][r]) {
                            this.winShaders[c][r].setVisible(true);
                            // Bounce the symbol
                            const sc = this.reels[c][r+1]; // offset +1 for visible array mapping
                            this.tweens.add({
                                targets: sc,
                                scale: 1.2,
                                duration: 300,
                                yoyo: true,
                                repeat: -1
                            });
                        }
                        matchCount++;
                    }
                }
            }

            const winMultiplier = Phaser.Math.Between(2, 20);
            const totalWin = this.currentBet * winMultiplier;
            this.balance += totalWin;
            
            // Show WIN TEXT pop up dynamically counting up
            this.winTextLayer.setText('0');
            this.tweens.addCounter({
                from: 0,
                to: totalWin,
                duration: 1000,
                onUpdate: (tw) => {
                    this.winTextLayer.setText(Math.floor(Number(tw.getValue())).toString());
                },
                onComplete: () => {
                    this.winTextLayer.setText(totalWin.toString());
                    // Burst coins!
                    this.coinEmitter.start();
                    this.time.delayedCall(2000, () => this.coinEmitter.stop());
                    
                    this.time.delayedCall(3000, () => {
                        this.isSpinning = false;
                        this.hideWinShaders();
                        // Reset symbol scales
                        for(let c=0; c<REEL_COLS; c++) {
                            for(let ro=0; ro<REEL_ROWS+5; ro++) {
                                this.tweens.killTweensOf(this.reels[c][ro]);
                                this.reels[c][ro].setScale(1);
                            }
                        }
                        this.updateUI();
                    });
                }
            });

            this.sound.play('win', { volume: 1 });
        } else {
            this.isSpinning = false;
        }
        
        this.updateUI();
    }
}
