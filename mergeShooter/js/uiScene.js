/**
 * UIScene — 嚴格依使用者貼的素材設計圖：
 *   頂部 HUD: 金幣 / STAGE 進度 / 設定 / 音效
 *   城牆 HP 寬條: 橫跨全寬，置於前線上方
 *   底部 4 按鈕（依素材圖配色與圖示）：
 *     1. 黃色 ⬆ (btn03) — 升級全部砲塔火力
 *     2. 紫色 100 (btn 04) — 買槍（顯示當前購買價）
 *     3. 綠色 HP (btn02) — 升級城牆（紫盾顯示等級、右側顯示 HP/maxHP）
 *     4. 橘色垃圾桶 (btn01) — 賣砲塔
 */
class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const game = this.scene.get('Game');
    this.game = game;

    // ========== 頂部 HUD ==========
    this.add.rectangle(W / 2, H * 0.045, W, H * 0.09, 0x2c2150, 0.6);

    // 金幣（左上）
    const moneyBar = this.add.image(W * 0.20, H * 0.045, 'money-bar');
    moneyBar.setScale((W * 0.30) / moneyBar.width);
    this.add.image(W * 0.07, H * 0.045, 'sp-coin').setScale((W * 0.07) / 110);
    this.goldTxt = this.add.text(W * 0.22, H * 0.045, this.formatGold(game.gold), {
      fontFamily: 'AlfaSlabOne, Arial', fontSize: 26, color: '#fff7c2', stroke: '#3a2400', strokeThickness: 4,
    }).setOrigin(0.5);

    // STAGE 顯示（中央）
    this.stageTxt = this.add.text(W / 2, H * 0.034, `STAGE ${game.stage}`, {
      fontFamily: 'AlfaSlabOne, Arial', fontSize: 28, color: '#fff7c2', stroke: '#3a2a76', strokeThickness: 5,
    }).setOrigin(0.5);
    this.waveDots = this.add.container(W / 2, H * 0.066);
    this.refreshWaveDots(game.stage, game.wave);

    // 設定齒輪
    const cog = this.add.text(W * 0.83, H * 0.045, '⚙', {
      fontFamily: 'Arial', fontSize: 26, color: '#fff7c2',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cog.on('pointerdown', () => this.scene.launch('Popup', { type: 'settings' }));

    // 音效
    this.muteBtn = this.add.image(W * 0.93, H * 0.045, MSAudio.isMuted() ? 'sound-off' : 'sound-on').setInteractive({ useHandCursor: true });
    const sndScale = (W * 0.10) / Math.max(this.muteBtn.width, this.muteBtn.height);
    this.muteBtn.setScale(sndScale);
    this.muteBtn.on('pointerdown', () => {
      const m = MSAudio.toggleMuted();
      this.muteBtn.setTexture(m ? 'sound-off' : 'sound-on').setScale(sndScale);
    });

    // ========== 城牆寬血條 ==========
    const whpY = game.wallY;
    const whpW = W * 0.96, whpH = 26;
    this.wallHpBg = this.add.rectangle(W / 2, whpY, whpW, whpH, 0xb6e3f0).setStrokeStyle(3, 0x5a8aa8);
    this.wallHpFg = this.add.rectangle(W / 2 - whpW / 2 + 4, whpY, whpW - 8, whpH - 8, 0x42a55c).setOrigin(0, 0.5);
    this._wallFullW = whpW - 8;

    // ========== 底部 4 顆按鈕 ==========
    const btnY = H * 0.955;

    // 1. 黃色 ⬆ — 升級全部砲塔火力
    this.upBtn = this.makeBtn(W * 0.10, btnY, 'btn03', 'btn03-p', W * 0.14, () => game.events.emit('upgrade-all'));
    this.add.text(W * 0.10, btnY - 4, '⬆', {
      fontFamily: 'Arial', fontSize: 32, color: '#fff', stroke: '#3a2400', strokeThickness: 4, fontStyle: 'bold',
    }).setOrigin(0.5);

    // 2. 紫色 — 買槍（紫盾包包 + 當前購買價格）
    this.buyBtn = this.makeBtn(W * 0.32, btnY, 'btn04', 'btn04-p', W * 0.22, () => game.events.emit('buy-gun'));
    this.add.image(W * 0.25, btnY - 1, 'shield-icon').setScale((W * 0.06) / 118);
    this.buyCostTxt = this.add.text(W * 0.36, btnY, '$' + this.formatGold(MSData.buyCost(game.buysCount)), {
      fontFamily: 'AlfaSlabOne, Arial', fontSize: 22, color: '#fff7c2', stroke: '#3a2a76', strokeThickness: 4,
    }).setOrigin(0.5);

    // 3. 綠色 — 升級城牆（紫盾顯示等級 + HP/maxHP）
    this.wallBtn = this.makeBtn(W * 0.62, btnY, 'btn02', 'btn02-p', W * 0.26, () => game.events.emit('upgrade-wall'));
    this.add.image(W * 0.53, btnY - 1, 'shield-icon').setScale((W * 0.06) / 118);
    this.wallLvTxt = this.add.text(W * 0.53, btnY, '' + (game.wall.upgradeLevel + 1), {
      fontFamily: 'AlfaSlabOne, Arial', fontSize: 18, color: '#fff', stroke: '#3a2a76', strokeThickness: 3,
    }).setOrigin(0.5);
    this.wallMaxTxt = this.add.text(W * 0.66, btnY - 8, '' + game.wall.maxHP, {
      fontFamily: 'AlfaSlabOne, Arial', fontSize: 18, color: '#ffd700', stroke: '#3a2400', strokeThickness: 3,
    }).setOrigin(0.5);
    this.wallHpTxt = this.add.text(W * 0.66, btnY + 10, `${game.wall.currentHP}/${game.wall.maxHP}`, {
      fontFamily: 'PassionOne, Arial', fontSize: 13, color: '#fff7c2',
    }).setOrigin(0.5);

    // 4. 橘色垃圾桶 — 賣砲塔
    this.binBtn = this.makeBtn(W * 0.88, btnY, 'btn01', 'btn01-p', W * 0.13, () => {
      game.events.emit('warn', '拖砲塔到此可賣出');
    });
    this.add.image(W * 0.88, btnY - 6, 'bin-icon').setScale((W * 0.07) / 110);
    // 賣砲塔 hit zone
    game.binHitArea = { x: W * 0.88, y: btnY, r: W * 0.075 };

    // ========== 警告與進度 ==========
    this.warnTxt = this.add.text(W / 2, H * 0.45, '', {
      fontFamily: 'PassionOne, Arial', fontSize: 26, color: '#ff8866', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    this.enemiesTxt = this.add.text(W / 2, H * 0.50, '', {
      fontFamily: 'PassionOne, Arial', fontSize: 16, color: '#ffd56b', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0.85);

    // 事件
    game.events.on('gold-changed', (g) => this.goldTxt.setText(this.formatGold(g)));
    game.events.on('wall-changed', (w) => this.refreshWall(w));
    game.events.on('wave-changed', (s, w, total) => {
      this.stageTxt.setText('STAGE ' + s);
      this.refreshWaveDots(s, w);
    });
    game.events.on('enemies-changed', (r, t) => {
      if (t > 0) this.enemiesTxt.setText(`敵人 ${t - r} / ${t}`);
      else this.enemiesTxt.setText('');
    });
    game.events.on('warn', (m) => this.showWarn(m));
    game.events.on('buy-cost-changed', (c) => this.buyCostTxt.setText('$' + this.formatGold(c)));

    this.refreshWall(game.wall);
  }

  refreshWaveDots(stage, currentWave) {
    this.waveDots.removeAll(true);
    const stages = MSData.buildStage(stage);
    const total = stages.length;
    const w = Math.min(220, total * 22);
    const step = w / Math.max(1, total - 1);
    for (let i = 0; i < total; i++) {
      const x = -w / 2 + i * step;
      const filled = i < currentWave;
      const isBoss = stages[i].isBoss;
      const c = filled ? (isBoss ? 0xffd700 : 0x6cf08a) : 0x3a3360;
      const dot = this.add.circle(x, 0, isBoss ? 7 : 5, c).setStrokeStyle(2, 0x5a4ba0);
      this.waveDots.add(dot);
    }
  }

  refreshWall(w) {
    const ratio = Math.max(0, w.currentHP / w.maxHP);
    this.wallHpFg.width = this._wallFullW * ratio;
    this.wallHpFg.fillColor = ratio > 0.5 ? 0x42a55c : (ratio > 0.25 ? 0xffcb47 : 0xff5b5b);
    this.wallLvTxt.setText('' + (w.upgradeLevel + 1));
    this.wallMaxTxt.setText('' + w.maxHP);
    this.wallHpTxt.setText(`${w.currentHP}/${w.maxHP}`);
  }

  makeBtn(x, y, tex, texP, width, onClick) {
    const btn = this.add.image(x, y, tex).setInteractive({ useHandCursor: true });
    const s = width / btn.width;
    btn.setScale(s);
    btn.on('pointerdown', () => { btn.setTexture(texP).setScale(s); MSAudio.sfx.click(); });
    btn.on('pointerup', () => { btn.setTexture(tex).setScale(s); onClick(); });
    btn.on('pointerout', () => { btn.setTexture(tex).setScale(s); });
    return btn;
  }

  formatGold(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3 && n % 100 === 0) return (n / 1e3) + 'k';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return '' + n;
  }

  showWarn(msg) {
    this.warnTxt.setText(msg);
    this.tweens.killTweensOf(this.warnTxt);
    this.warnTxt.setAlpha(1).setY(this.scale.height * 0.45);
    this.tweens.add({ targets: this.warnTxt, y: this.scale.height * 0.42, alpha: 0, duration: 1200, ease: 'Cubic.out' });
  }
}
