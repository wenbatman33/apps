class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Background
    const g = this.add.graphics();
    g.fillStyle(0x050812);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Starfield
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      const s = Math.random() * 2;
      const a = 0.3 + Math.random() * 0.7;
      g.fillStyle(0xffffff, a);
      g.fillRect(x, y, s, s);
    }

    // Title glow
    const titleGlow = this.add.graphics();
    titleGlow.fillStyle(0x0044ff, 0.08);
    titleGlow.fillEllipse(cx, cy - 80, 600, 120);

    // Title
    this.add.text(cx, cy - 100, 'XENO', {
      fontSize: '80px', color: '#4488ff', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#002288', strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(cx, cy - 20, 'TACTIC', {
      fontSize: '80px', color: '#00ccff', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#005577', strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(cx, cy + 45, 'TOWER DEFENSE', {
      fontSize: '20px', color: '#556677', fontFamily: 'monospace', letterSpacing: 8
    }).setOrigin(0.5);

    // How to play
    const infoLines = [
      'Place towers to create a maze — enemies find their own path',
      'You must ALWAYS keep at least one valid path open',
      'DCA towers are the ONLY defense against flying enemies',
      'Right-click a tower to sell for 50% of its cost',
    ];
    infoLines.forEach((line, i) => {
      this.add.text(cx, cy + 110 + i * 22, line, {
        fontSize: '13px', color: '#778899', fontFamily: 'monospace', align: 'center'
      }).setOrigin(0.5);
    });

    // Play button
    const btnY = cy + 230;
    const btnBg = this.add.graphics();
    const drawBtn = (hover) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0x1155cc : 0x0033aa);
      btnBg.fillRoundedRect(cx - 130, btnY - 25, 260, 50, 8);
      btnBg.lineStyle(2, hover ? 0x88ccff : 0x4466cc);
      btnBg.strokeRoundedRect(cx - 130, btnY - 25, 260, 50, 8);
    };
    drawBtn(false);

    const btnText = this.add.text(cx, btnY, 'START GAME', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    const zone = this.add.zone(cx - 130, btnY - 25, 260, 50).setOrigin(0, 0).setInteractive();
    zone.on('pointerover', () => { drawBtn(true); btnText.setColor('#88ccff'); });
    zone.on('pointerout',  () => { drawBtn(false); btnText.setColor('#ffffff'); });
    zone.on('pointerdown', () => this.scene.start('GameScene'));

    // Pulsing arrow
    this.tweens.add({
      targets: btnText,
      scaleX: 1.05, scaleY: 1.05,
      duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // Version
    this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 10, 'v1.0', {
      fontSize: '11px', color: '#334455', fontFamily: 'monospace'
    }).setOrigin(1, 1);

    // Keyboard shortcut
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'));
  }
}
