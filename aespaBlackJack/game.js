/* aespa 黑杰克 21点 — Phaser 3 純引擎实现
   直屏 1080x1920, 简体中文 UI, 含偶像反应动画与音效
*/
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const STORAGE_KEY = 'aespa_blackjack_v2';
  const START_CHIPS = 5000;

  // 4 位偶像对手
  const OPPONENTS = [
    { id: 'ice',    name: 'KARINA',   sub: '冰蓝',   key: 'idol_ice',    color: 0x6FE0FF, hex: '#6FE0FF', animKey: 'idol_ice_blue' },
    { id: 'ruby',   name: 'WINTER',   sub: '红宝石', key: 'idol_ruby',   color: 0xFF53C7, hex: '#FF53C7', animKey: 'idol_ruby_magenta' },
    { id: 'violet', name: 'GISELLE',  sub: '紫罗兰', key: 'idol_violet', color: 0xB388FF, hex: '#B388FF', animKey: 'idol_violet_chrome' },
    { id: 'pearl',  name: 'NINGNING', sub: '珍珠金', key: 'idol_pearl',  color: 0xF5D67A, hex: '#F5D67A', animKey: 'idol_pearl_gold' },
  ];

  const CHIPS = [100, 500, 1000, 5000];
  const SUITS = ['s', 'h', 'd', 'c'];
  const RANKS = ['a','2','3','4','5','6','7','8','9','10','j','q','k'];

  const FONT_TITLE = 'Orbitron, Noto Sans SC, sans-serif';
  const FONT_BODY  = 'Noto Sans SC, Orbitron, sans-serif';

  // ===== 存档 =====
  function loadProfile() {
    try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  function saveProfile(p) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function defaultProfile() {
    return {
      playerName: '玩家',
      bestChips: START_CHIPS,
      currentChips: START_CHIPS,
      wins: 0, losses: 0, pushes: 0, blackjacks: 0,
      leaderboard: [],
    };
  }
  function fmt(n) { return n.toLocaleString('en-US'); }

  function handValue(cards) {
    let total = 0, aces = 0;
    for (const c of cards) {
      if (c.rank === 'a') { total += 11; aces++; }
      else if (c.rank === 'k' || c.rank === 'q' || c.rank === 'j' || c.rank === '10') total += 10;
      else total += parseInt(c.rank, 10);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  }
  function isBlackjack(cards) { return cards.length === 2 && handValue(cards) === 21; }

  // ===== 音效池 =====
  const SfxMgr = {
    keys: ['sfx_button','sfx_chip_click','sfx_chip_stack','sfx_chip_push','sfx_bet','sfx_deal','sfx_flip','sfx_shuffle','sfx_win','sfx_lose'],
    play(scene, key, vol = 0.6) {
      if (!scene.sound || !scene.cache.audio.exists(key)) return;
      try { scene.sound.play(key, { volume: vol }); } catch (e) {}
    },
  };

  // ===== Boot / Preload =====
  class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      // 第一阶段: 仅载入 loading 背景
      this.load.setBaseURL('./');
      this.load.image('loading_bg', 'assets/generated/loading_screen.png');
    }
    create() {
      // 显示 loading 背景
      this.add.image(W/2, H/2, 'loading_bg').setDisplaySize(W, H);

      const gw = 700, gh = 18;
      const barY = 1640;
      const barBg = this.add.graphics();
      barBg.fillStyle(0x000000, 0.5);
      barBg.fillRoundedRect(W/2 - gw/2, barY, gw, gh, 9);
      const bar = this.add.graphics();
      const pct = this.add.text(W/2, barY + 45, '0%', {
        fontFamily: FONT_TITLE, fontSize: '28px', color: '#6FE0FF',
      }).setOrigin(0.5).setAlpha(0.9);

      this.load.on('progress', (v) => {
        bar.clear();
        bar.fillStyle(0xFF53C7, 1);
        bar.fillRoundedRect(W/2 - gw/2, barY, gw * v, gh, 9);
        pct.setText(`${Math.floor(v*100)}%`);
      });
      this.load.once('complete', () => this.startMain());

      // 第二阶段: 主资源
      this.load.image('bg_menu',    'assets/generated/main_menu_bg.png');
      this.load.image('bg_table',   'assets/generated/game_table_bg_no_buttons.png');
      this.load.image('panel_bet',    'assets/ui/panel_bet.png');
      this.load.image('panel_result', 'assets/ui/panel_result.png');
      this.load.image('panel_status', 'assets/ui/panel_status.png');
      // 按钮
      ['btn_deal','btn_double','btn_hit','btn_play','btn_rebet','btn_split','btn_stand']
        .forEach(k => this.load.image(k, `assets/ui/${k}.png`));
      // 筹码
      CHIPS.forEach(v => this.load.image(`chip_${v}`, `assets/ui/chip_${v}.png`));
      // 立绘
      this.load.image('idol_ice',    'assets/sprites/idol_ice_blue.png');
      this.load.image('idol_ruby',   'assets/sprites/idol_ruby_magenta.png');
      this.load.image('idol_violet', 'assets/sprites/idol_violet_chrome.png');
      this.load.image('idol_pearl',  'assets/sprites/idol_pearl_gold.png');
      // 偶像表情动画 sheet (6 帧, 512x512)
      OPPONENTS.forEach(op => {
        this.load.spritesheet(`${op.id}_win`,  `assets/sprites/expression_animations/${op.animKey}/win_expression_sheet.png`,
          { frameWidth: 512, frameHeight: 512, endFrame: 5 });
        this.load.spritesheet(`${op.id}_lose`, `assets/sprites/expression_animations/${op.animKey}/lose_expression_sheet.png`,
          { frameWidth: 512, frameHeight: 512, endFrame: 5 });
      });
      // 卡牌
      this.load.image('card_back', 'assets/cards/card_back.png');
      for (const r of RANKS) for (const s of SUITS) {
        this.load.image(`card_${r}_${s}`, `assets/cards/${r}_${s}.png`);
      }
      // 音效
      this.load.audio('sfx_button',     'assets/sfx/button_tap.wav');
      this.load.audio('sfx_chip_click', 'assets/sfx/chip_click.wav');
      this.load.audio('sfx_chip_stack', 'assets/sfx/chip_stack.wav');
      this.load.audio('sfx_chip_push',  'assets/sfx/chip_push.wav');
      this.load.audio('sfx_bet',        'assets/sfx/bet_confirm.wav');
      this.load.audio('sfx_deal',       'assets/sfx/card_deal.wav');
      this.load.audio('sfx_flip',       'assets/sfx/card_flip.wav');
      this.load.audio('sfx_shuffle',    'assets/sfx/card_shuffle.wav');
      this.load.audio('sfx_win',        'assets/sfx/blackjack_win.wav');
      this.load.audio('sfx_lose',       'assets/sfx/round_lose.wav');

      // 啟動第二階段
      this.load.start();
    }
    startMain() {
      // 注册偶像动画
      OPPONENTS.forEach(op => {
        this.anims.create({ key: `${op.id}_win_anim`,
          frames: this.anims.generateFrameNumbers(`${op.id}_win`,  { start: 0, end: 5 }),
          frameRate: 10, repeat: 0 });
        this.anims.create({ key: `${op.id}_lose_anim`,
          frames: this.anims.generateFrameNumbers(`${op.id}_lose`, { start: 0, end: 5 }),
          frameRate: 8, repeat: 0 });
      });
      this.scene.start('Menu');
    }
  }

  // ===== 通用霓虹按钮 =====
  function neonButton(scene, x, y, label, color, w = 520, h = 110, opts = {}) {
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    const draw = () => {
      g.clear();
      g.fillStyle(0x0d0820, 0.78);
      g.fillRoundedRect(-w/2, -h/2, w, h, 18);
      g.lineStyle(3, color, 1);
      g.strokeRoundedRect(-w/2, -h/2, w, h, 18);
    };
    draw();
    const txt = scene.add.text(0, 0, label, {
      fontFamily: opts.font || FONT_BODY,
      fontSize: (opts.fontSize || 38) + 'px', fontStyle: '900',
      color: '#ffffff',
    }).setOrigin(0.5);
    c.add([g, txt]);
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => txt.setScale(1.04));
    c.on('pointerout',  () => txt.setScale(1.0));
    c.on('pointerdown', () => c.setScale(0.96));
    c.on('pointerup',   () => {
      c.setScale(1); txt.setScale(1.0);
      SfxMgr.play(scene, 'sfx_button', 0.5);
    });
    c.setLabel = (s) => txt.setText(s);
    return c;
  }

  // ===== 文字输入框 (Phaser DOMElement) =====
  function showNameDialog(scene, currentName, onOk) {
    // 半透明遮罩
    const overlay = scene.add.rectangle(W/2, H/2, W, H, 0x000000, 0.65)
      .setInteractive().setDepth(200);
    const panel = scene.add.graphics().setDepth(201);
    const pw = 880, ph = 540;
    panel.fillStyle(0x0d0820, 0.95);
    panel.fillRoundedRect(W/2 - pw/2, H/2 - ph/2, pw, ph, 24);
    panel.lineStyle(4, 0x6FE0FF, 1);
    panel.strokeRoundedRect(W/2 - pw/2, H/2 - ph/2, pw, ph, 24);

    const title = scene.add.text(W/2, H/2 - 180, '输入昵称', {
      fontFamily: FONT_BODY, fontSize: '54px', fontStyle: '900',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(202);

    // 用 Phaser DOM 元素呈現输入框
    const style = `width: 600px; height: 90px; font: 700 36px 'Noto Sans SC', 'Orbitron', sans-serif;
      text-align: center; color: #ffffff; background: rgba(255,255,255,0.06);
      border: 2px solid #6FE0FF; border-radius: 14px; outline: none; padding: 0 16px;
      caret-color: #FF53C7;`;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.maxLength = 12;
    inp.value = currentName || '';
    inp.style.cssText = style;
    const dom = scene.add.dom(W/2, H/2 - 30, inp).setDepth(203);
    setTimeout(() => inp.focus(), 30);

    const btnOk = neonButton(scene, W/2 - 180, H/2 + 140, '确定', 0x6FE0FF, 320, 110);
    btnOk.setDepth(204);
    const btnCancel = neonButton(scene, W/2 + 180, H/2 + 140, '取消', 0xFF53C7, 320, 110);
    btnCancel.setDepth(204);

    const close = (val) => {
      overlay.destroy(); panel.destroy(); title.destroy();
      dom.destroy(); btnOk.destroy(); btnCancel.destroy();
      if (val !== undefined && onOk) onOk(val);
    };
    btnOk.on('pointerup',     () => close((inp.value || '').trim().slice(0, 12) || '玩家'));
    btnCancel.on('pointerup', () => close(undefined));
    overlay.on('pointerup',   () => {}); // 阻挡背景点击
  }

  // ===== Menu Scene =====
  class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }
    create() {
      this.profile = loadProfile() || defaultProfile();
      saveProfile(this.profile);

      this.add.image(W/2, H/2, 'bg_menu').setDisplaySize(W, H);
      // 仅在顶部与底部加轻微渐变, 中段完整露出 4 位偶像
      const topMask = this.add.graphics();
      topMask.fillGradientStyle(0x05030d, 0x05030d, 0x05030d, 0x05030d, 0.7, 0.7, 0, 0);
      topMask.fillRect(0, 0, W, 200);
      const botMask = this.add.graphics();
      botMask.fillGradientStyle(0x05030d, 0x05030d, 0x05030d, 0x05030d, 0, 0, 0.95, 0.95);
      botMask.fillRect(0, 1080, W, 840);

      // ===== 顶部精简 HUD: 昵称 + 筹码 =====
      const hudY = 110;
      const hud = this.add.graphics();
      hud.fillStyle(0x0d0820, 0.7);
      hud.fillRoundedRect(40, hudY - 48, W - 80, 96, 18);
      hud.lineStyle(2, 0x6FE0FF, 0.55);
      hud.strokeRoundedRect(40, hudY - 48, W - 80, 96, 18);
      this.add.text(80, hudY, '昵称', {
        fontFamily: FONT_BODY, fontSize: '24px', color: '#6FE0FF',
      }).setOrigin(0, 0.5).setAlpha(0.85);
      this.nameText = this.add.text(180, hudY, this.profile.playerName, {
        fontFamily: FONT_BODY, fontSize: '34px', fontStyle: '700',
        color: '#ffffff',
      }).setOrigin(0, 0.5);
      this.chipsText = this.add.text(W - 80, hudY, fmt(this.profile.currentChips), {
        fontFamily: FONT_TITLE, fontSize: '36px', fontStyle: '900',
        color: '#FFE57F',
      }).setOrigin(1, 0.5);
      this.add.text(W - 240, hudY, '筹码', {
        fontFamily: FONT_BODY, fontSize: '24px', color: '#FFE57F',
      }).setOrigin(1, 0.5).setAlpha(0.85);

      // ===== 中段完全露出偶像背景 (180 ~ 1080) =====

      // ===== 偶像选择列 (位于底部上方) =====
      this.makeIdolPicker(1260);

      // ===== 标题移至下方 =====
      const title = this.add.text(W/2, 1530, '黑杰克 21点', {
        fontFamily: FONT_BODY, fontSize: '96px', fontStyle: '900',
        color: '#ffffff',
      }).setOrigin(0.5);
      title.setStroke('#0a0420', 6);
      this.tweens.add({ targets: title, scale: { from: 1, to: 1.03 }, yoyo: true, duration: 1400, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.text(W/2, 1610, 'aespa × VIP 牌桌', {
        fontFamily: FONT_TITLE, fontSize: '32px', fontStyle: '700',
        color: '#6FE0FF', stroke: '#0a0420', strokeThickness: 3,
      }).setOrigin(0.5).setAlpha(0.9);

      // ===== 底部三按钮 =====
      const btnRename = neonButton(this, W/2 - 320, H - 170, '修改昵称', 0x6FE0FF, 280, 90, { fontSize: 28 });
      btnRename.on('pointerup', () => showNameDialog(this, this.profile.playerName, (val) => {
        this.profile.playerName = val; saveProfile(this.profile);
        this.nameText.setText(val);
      }));
      const btnBoard = neonButton(this, W/2, H - 170, '排行榜', 0xFF53C7, 280, 90, { fontSize: 28 });
      btnBoard.on('pointerup', () => this.scene.start('Leaderboard'));
      const btnReset = neonButton(this, W/2 + 320, H - 170, '重置筹码', 0xB388FF, 280, 90, { fontSize: 28 });
      btnReset.on('pointerup', () => {
        this.profile.currentChips = START_CHIPS;
        saveProfile(this.profile);
        this.chipsText.setText(fmt(this.profile.currentChips));
      });

      // 选择提示 (位于偶像选择列上方)
      this.add.text(W/2, 1050, '选择你的偶像庄家', {
        fontFamily: FONT_BODY, fontSize: '30px', fontStyle: '700',
        color: '#cbd5ff', stroke: '#0a0420', strokeThickness: 3,
      }).setOrigin(0.5).setAlpha(0.9);
    }

    makeIdolPicker(centerY) {
      const y = centerY;
      const slotW = 220, slotH = 290, gap = 240;
      const startX = W/2 - (OPPONENTS.length - 1) * gap / 2;
      OPPONENTS.forEach((op, i) => {
        const x = startX + i * gap;
        const c = this.add.container(x, y);
        const g = this.add.graphics();
        g.fillStyle(0x0d0820, 0.62);
        g.fillRoundedRect(-slotW/2, -slotH/2, slotW, slotH, 18);
        g.lineStyle(3, op.color, 1);
        g.strokeRoundedRect(-slotW/2, -slotH/2, slotW, slotH, 18);

        const portrait = this.add.image(0, -50, op.key).setDisplaySize(190, 190);
        const m = this.make.graphics({x:x, y:y-50}, false);
        m.fillCircle(0, 0, 95);
        portrait.setMask(m.createGeometryMask());

        const nm = this.add.text(0, 75, op.name, {
          fontFamily: FONT_TITLE, fontSize: '26px', fontStyle: '900',
          color: '#ffffff', stroke: '#0a0420', strokeThickness: 3,
        }).setOrigin(0.5);
        const sub = this.add.text(0, 112, op.sub, {
          fontFamily: FONT_BODY, fontSize: '20px', color: op.hex,
        }).setOrigin(0.5);

        c.add([g, portrait, nm, sub]);
        c.setSize(slotW, slotH).setInteractive({ useHandCursor: true });
        c.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.06, duration: 160 }));
        c.on('pointerout',  () => this.tweens.add({ targets: c, scale: 1.0,  duration: 160 }));
        c.on('pointerdown', () => c.setScale(0.96));
        c.on('pointerup', () => {
          c.setScale(1);
          SfxMgr.play(this, 'sfx_button', 0.6);
          this.scene.start('Game', { opponent: op });
        });
      });
    }
  }

  // ===== Game Scene =====
  class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    init(data) {
      this.opponent = data.opponent || OPPONENTS[0];
      this.profile = loadProfile() || defaultProfile();
      this.chips = (this.profile.currentChips != null) ? this.profile.currentChips : START_CHIPS;
      if (this.chips < 100) this.chips = START_CHIPS;
      // 牌位 / 籌碼圈座標 (對應 bg_table 上的標記)
      this.SLOT_DEALER_Y = 800;   // 庄家牌放在头像下方
      this.SLOT_PLAYER_Y = 1200;
      this.CHIP_CIRCLE_Y = 1370;
      this.bet = 0;
      this.dealerCards = []; this.playerCards = [];
      this.dealerSprites = []; this.playerSprites = [];
      this.stackChips = []; // 下注堆叠的筹码精灵
      this.dealerHiddenIdx = -1;
      this.phase = 'bet';
      this.canDouble = false;
    }

    create() {
      this.add.image(W/2, H/2, 'bg_table').setDisplaySize(W, H);
      this.add.rectangle(W/2, H/2, W, H, 0x05030d, 0.30);

      // 庄家立绘 / 反应动画 (大头像, 下移)
      const portraitY = 360;
      const portraitSize = 380;
      const maskR = 185;
      this.dealerSprite = this.add.image(W/2, portraitY, this.opponent.key).setDisplaySize(portraitSize, portraitSize);
      const oppMaskG = this.make.graphics({ x: W/2, y: portraitY }, false);
      oppMaskG.fillCircle(0, 0, maskR);
      this.dealerSprite.setMask(oppMaskG.createGeometryMask());
      const halo = this.add.graphics();
      halo.lineStyle(5, this.opponent.color, 0.95);
      halo.strokeCircle(W/2, portraitY, maskR + 12);
      this.tweens.add({ targets: halo, alpha: { from: 0.55, to: 1 }, yoyo: true, duration: 1200, repeat: -1 });
      this.dealerHalo = halo;
      this.dealerAnim = this.add.sprite(W/2, portraitY, `${this.opponent.id}_win`, 0)
        .setDisplaySize(portraitSize, portraitSize).setMask(oppMaskG.createGeometryMask()).setVisible(false);

      // 头像下方的名字 / 庄家标签
      this.add.text(W/2, portraitY + maskR + 35, this.opponent.name, {
        fontFamily: FONT_TITLE, fontSize: '46px', fontStyle: '900',
        color: '#ffffff', stroke: '#0a0420', strokeThickness: 4,
      }).setOrigin(0.5);
      this.add.text(W/2, portraitY + maskR + 80, '庄家', {
        fontFamily: FONT_BODY, fontSize: '24px', fontStyle: '700',
        color: this.opponent.hex, stroke: '#0a0420', strokeThickness: 2,
      }).setOrigin(0.5).setAlpha(0.9);

      // 玩家蓝色标签放在状态栏中央 (筹码/下注 之间)
      this.add.text(W/2, 80, this.profile.playerName, {
        fontFamily: FONT_BODY, fontSize: '32px', fontStyle: '700',
        color: '#6FE0FF', stroke: '#0a0420', strokeThickness: 3,
      }).setOrigin(0.5).setAlpha(0.95);

      // 黃色分数不再显示 (依用户要求隐藏)
      this.dealerScoreText = { setText: () => {} };
      this.playerScoreText = { setText: () => {} };

      // 顶部状态条
      this.add.image(W/2, 80, 'panel_status').setDisplaySize(940, 130);
      this.chipsText = this.add.text(W/2 - 360, 80, '', {
        fontFamily: FONT_TITLE, fontSize: '36px', fontStyle: '900',
        color: '#FFE57F',
      }).setOrigin(0, 0.5);
      this.betText = this.add.text(W/2 + 360, 80, '', {
        fontFamily: FONT_TITLE, fontSize: '36px', fontStyle: '900',
        color: '#FF53C7',
      }).setOrigin(1, 0.5);
      this.updateHud();

      // 返回
      const back = this.add.text(60, 80, '←', {
        fontFamily: FONT_TITLE, fontSize: '60px', fontStyle: '900', color: '#ffffff',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      back.on('pointerup', () => {
        SfxMgr.play(this, 'sfx_button', 0.5);
        this.saveCurrentChips();
        this.scene.start('Menu');
      });

      // 下注筹码堆叠区 (位于牌桌主玩家筹码圈内)
      this.betStackPos = { x: W/2, y: this.CHIP_CIRCLE_Y };
      this.betStackLayer = this.add.container(0, 0).setDepth(5);

      this.makeChipsRow();
      this.makeActionButtons();
      this.resultPanel = this.add.container(W/2, H/2).setVisible(false).setDepth(50);
      this.enterPhase('bet');
    }

    saveCurrentChips() {
      this.profile.currentChips = this.chips;
      if (this.chips > this.profile.bestChips) this.profile.bestChips = this.chips;
      saveProfile(this.profile);
    }

    updateHud() {
      this.chipsText.setText(`筹码  ${fmt(this.chips)}`);
      this.betText.setText(`下注  ${fmt(this.bet)}`);
    }

    makeChipsRow() {
      this.chipRow = this.add.container(0, 0);
      const baseY = 1600;
      const chipSize = 120;
      const gap = 160;
      const total = CHIPS.length * gap;
      const startX = W/2 - total/2 + gap/2;
      this.chipSourcePos = {}; // 記錄每種面額按鈕位置 (堆疊動畫起點)
      CHIPS.forEach((v) => {
        const x = startX + (CHIPS.indexOf(v)) * gap;
        this.chipSourcePos[v] = { x, y: baseY };
        const img = this.add.image(x, baseY, `chip_${v}`).setDisplaySize(chipSize, chipSize);
        img.setInteractive({ useHandCursor: true });
        img.on('pointerover', () => img.setDisplaySize(chipSize * 1.06, chipSize * 1.06));
        img.on('pointerout',  () => img.setDisplaySize(chipSize, chipSize));
        img.on('pointerup',   () => this.addBet(v));
        this.chipRow.add(img);
      });

      this.btnClear = neonButton(this, W/2 - 260, 1730, '清空', 0xB388FF, 440, 100, { fontSize: 34 });
      this.btnClear.on('pointerup', () => { if (this.phase==='bet' && this.bet > 0) {
        this.chips += this.bet; this.bet = 0; this.updateHud();
        SfxMgr.play(this,'sfx_chip_push',0.5);
        this.clearStackChips(true);
      }});
      this.btnDeal = this.add.image(W/2 + 260, 1730, 'btn_deal').setDisplaySize(420, 120)
        .setInteractive({useHandCursor:true});
      this.btnDeal.on('pointerover', () => this.btnDeal.setDisplaySize(436, 124));
      this.btnDeal.on('pointerout',  () => this.btnDeal.setDisplaySize(420, 120));
      this.btnDeal.on('pointerup', () => this.startDeal());

      this.betHint = this.add.text(W/2, 1810, '点击筹码下注', {
        fontFamily: FONT_BODY, fontSize: '22px', color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0.7);
    }

    makeActionButtons() {
      this.actionRow = this.add.container(0, 0).setVisible(false);
      const y = 1720;
      const btn = (key, x, w=280, h=120) => {
        const im = this.add.image(x, y, key).setDisplaySize(w, h).setInteractive({useHandCursor:true});
        im.on('pointerover', () => im.setDisplaySize(w*1.04, h*1.04));
        im.on('pointerout',  () => im.setDisplaySize(w, h));
        return im;
      };
      this.btnHit    = btn('btn_hit',    W/2 - 360);
      this.btnStand  = btn('btn_stand',  W/2);
      this.btnDouble = btn('btn_double', W/2 + 360);
      this.btnHit.on('pointerup', () => this.playerHit());
      this.btnStand.on('pointerup', () => this.playerStand());
      this.btnDouble.on('pointerup', () => this.playerDouble());
      this.actionRow.add([this.btnHit, this.btnStand, this.btnDouble]);
    }

    addBet(v) {
      if (this.phase !== 'bet') return;
      if (this.chips < v) { this.flashHint('筹码不足'); return; }
      this.chips -= v; this.bet += v; this.updateHud();
      SfxMgr.play(this, 'sfx_chip_click', 0.6);
      this.spawnStackChip(v);
    }

    spawnStackChip(v) {
      const src = this.chipSourcePos[v] || { x: W/2, y: 1560 };
      const stackIdx = this.stackChips.length;
      // 隨機微偏移讓堆叠自然
      const jitterX = Phaser.Math.Between(-14, 14);
      const baseY = this.betStackPos.y - stackIdx * 5; // 每片往上疊 5px
      const targetX = this.betStackPos.x + jitterX;
      const targetY = baseY;
      const chip = this.add.image(src.x, src.y, `chip_${v}`)
        .setDisplaySize(80, 80).setDepth(5 + stackIdx);
      this.betStackLayer.add(chip);
      chip._value = v;
      this.stackChips.push(chip);

      // 飛行動畫: 弧線移動 + 落下時輕微縮放
      this.tweens.add({
        targets: chip, x: targetX, y: targetY,
        duration: 320, ease: 'Cubic.easeOut',
        onComplete: () => {
          SfxMgr.play(this, 'sfx_chip_stack', 0.4);
          // 落地彈一下
          this.tweens.add({
            targets: chip, scaleX: chip.scaleX * 1.15, scaleY: chip.scaleY * 0.85,
            duration: 70, yoyo: true, ease: 'Sine.easeOut',
          });
        }
      });
    }

    clearStackChips(animate = true) {
      if (!this.stackChips || this.stackChips.length === 0) return;
      const chips = this.stackChips.slice();
      this.stackChips.length = 0;
      if (!animate) { chips.forEach(c => c.destroy()); return; }
      chips.forEach((c, i) => {
        const src = this.chipSourcePos[c._value] || { x: W/2, y: 1560 };
        this.tweens.add({
          targets: c, x: src.x, y: src.y, alpha: 0.2,
          duration: 280 + i * 20, ease: 'Cubic.easeIn',
          onComplete: () => c.destroy(),
        });
      });
    }

    sweepStackChipsToDealer(onDone) {
      // 結算: 將堆叠籌碼掃向莊家方向後消失
      if (!this.stackChips || this.stackChips.length === 0) { onDone && onDone(); return; }
      const chips = this.stackChips.slice();
      this.stackChips.length = 0;
      SfxMgr.play(this, 'sfx_chip_push', 0.5);
      let completed = 0;
      chips.forEach((c, i) => {
        this.tweens.add({
          targets: c, x: W/2, y: 200, alpha: 0,
          scaleX: c.scaleX * 0.6, scaleY: c.scaleY * 0.6,
          duration: 320, delay: i * 30, ease: 'Cubic.easeIn',
          onComplete: () => { c.destroy(); if (++completed >= chips.length) onDone && onDone(); },
        });
      });
    }

    sweepStackChipsToPlayer(onDone) {
      // 玩家贏: 將堆叠籌碼掃到玩家方向 (底部)
      if (!this.stackChips || this.stackChips.length === 0) { onDone && onDone(); return; }
      const chips = this.stackChips.slice();
      this.stackChips.length = 0;
      SfxMgr.play(this, 'sfx_chip_push', 0.5);
      let completed = 0;
      chips.forEach((c, i) => {
        this.tweens.add({
          targets: c, y: c.y + 380, alpha: 0,
          duration: 360, delay: i * 30, ease: 'Cubic.easeIn',
          onComplete: () => { c.destroy(); if (++completed >= chips.length) onDone && onDone(); },
        });
      });
    }

    flashHint(t) {
      this.betHint.setText(t);
      this.tweens.add({ targets: this.betHint, alpha: { from: 1, to: 0.5 }, yoyo: true, duration: 240, repeat: 1 });
    }

    enterPhase(p) {
      this.phase = p;
      if (p === 'bet') {
        this.chipRow.setVisible(true);
        this.btnClear.setVisible(true);
        this.btnDeal.setVisible(true);
        this.betHint.setVisible(true);
        this.actionRow.setVisible(false);
        this.dealerScoreText.setText('');
        this.playerScoreText.setText('');
        this.resultPanel.setVisible(false);
      }
      if (p === 'player') {
        this.chipRow.setVisible(false);
        this.btnClear.setVisible(false);
        this.btnDeal.setVisible(false);
        this.betHint.setVisible(false);
        this.actionRow.setVisible(true);
        this.btnDouble.setAlpha(this.canDouble && this.chips >= this.bet ? 1 : 0.35);
      }
      if (p === 'dealer' || p === 'result') {
        this.actionRow.setVisible(false);
        this.chipRow.setVisible(false);
        this.btnClear.setVisible(false);
        this.btnDeal.setVisible(false);
        this.betHint.setVisible(false);
      }
    }

    drawCard() {
      const r = RANKS[Phaser.Math.Between(0, RANKS.length - 1)];
      const s = SUITS[Phaser.Math.Between(0, SUITS.length - 1)];
      return { rank: r, suit: s, key: `card_${r}_${s}` };
    }

    startDeal() {
      if (this.phase !== 'bet') return;
      if (this.bet <= 0) { this.flashHint('请先下注'); return; }
      SfxMgr.play(this, 'sfx_shuffle', 0.7);
      SfxMgr.play(this, 'sfx_bet', 0.5);

      this.dealerCards = []; this.playerCards = [];
      this.dealerSprites.forEach(s => s.destroy()); this.dealerSprites = [];
      this.playerSprites.forEach(s => s.destroy()); this.playerSprites = [];

      this.enterPhase('deal');
      this.canDouble = true;
      // 隐藏反应动画, 显示静态立绘
      this.dealerAnim.setVisible(false);
      this.dealerSprite.setVisible(true);

      const seq = [{who:'p'},{who:'d'},{who:'p'},{who:'d',hidden:true}];
      let i = 0;
      const next = () => {
        if (i >= seq.length) { this.afterInitialDeal(); return; }
        const step = seq[i++];
        const card = this.drawCard();
        SfxMgr.play(this, 'sfx_deal', 0.55);
        if (step.who === 'p') {
          this.playerCards.push(card);
          this.spawnCard(card, 'p', this.playerCards.length - 1, false, () => {
            this.updateScores(); this.time.delayedCall(180, next);
          });
        } else {
          this.dealerCards.push(card);
          const hidden = !!step.hidden;
          if (hidden) this.dealerHiddenIdx = this.dealerCards.length - 1;
          this.spawnCard(card, 'd', this.dealerCards.length - 1, hidden, () => {
            this.updateScores(); this.time.delayedCall(180, next);
          });
        }
      };
      next();
    }

    cardPos(side, idx) {
      if (side === 'p') {
        const baseY = this.SLOT_PLAYER_Y;
        const slot1 = W/2 - 78, slot2 = W/2 + 78;
        if (idx === 0) return { x: slot1, y: baseY };
        if (idx === 1) return { x: slot2, y: baseY };
        return { x: slot2 + (idx - 1) * 38, y: baseY };
      } else {
        const baseY = this.SLOT_DEALER_Y;
        const startX = W/2 - 78;
        if (idx === 0) return { x: startX, y: baseY };
        if (idx === 1) return { x: startX + 156, y: baseY };
        return { x: startX + 156 + (idx - 1) * 55, y: baseY };
      }
    }

    relayoutCards(side) {
      const arr = side === 'p' ? this.playerSprites : this.dealerSprites;
      arr.forEach((sp, i) => {
        const p = this.cardPos(side, i);
        this.tweens.add({ targets: sp, x: p.x, y: p.y, duration: 180, ease: 'Sine.easeOut' });
      });
    }

    spawnCard(card, side, idx, hidden, onDone) {
      const fromX = W - 140, fromY = 80;
      const tex = hidden ? 'card_back' : card.key;
      const sp = this.add.image(fromX, fromY, tex).setDisplaySize(140, 196).setDepth(10);
      sp.cardData = card; sp.isHidden = hidden;
      if (side === 'p') this.playerSprites.push(sp); else this.dealerSprites.push(sp);
      const pos = this.cardPos(side, idx);
      this.relayoutCards(side);
      this.tweens.add({
        targets: sp, x: pos.x, y: pos.y, duration: 360, ease: 'Cubic.easeOut',
        onComplete: () => { if (onDone) onDone(); },
      });
    }

    flipDealerHidden(onDone) {
      const idx = this.dealerHiddenIdx;
      if (idx < 0) { onDone && onDone(); return; }
      const sp = this.dealerSprites[idx];
      if (!sp) { onDone && onDone(); return; }
      SfxMgr.play(this, 'sfx_flip', 0.6);
      this.tweens.add({
        targets: sp, scaleX: 0, duration: 160, ease: 'Cubic.easeIn',
        onComplete: () => {
          sp.setTexture(sp.cardData.key);
          sp.isHidden = false;
          this.tweens.add({
            targets: sp, scaleX: sp.scaleY, duration: 160, ease: 'Cubic.easeOut',
            onComplete: () => { this.dealerHiddenIdx = -1; onDone && onDone(); },
          });
        }
      });
    }

    updateScores() {
      const pv = handValue(this.playerCards);
      this.playerScoreText.setText(this.playerCards.length ? `${pv}` : '');
      if (this.dealerHiddenIdx >= 0) {
        const visible = this.dealerCards.filter((_,i) => i !== this.dealerHiddenIdx);
        const v = visible.length ? handValue(visible) : 0;
        this.dealerScoreText.setText(v ? `${v} + ?` : '');
      } else {
        const dv = handValue(this.dealerCards);
        this.dealerScoreText.setText(this.dealerCards.length ? `${dv}` : '');
      }
    }

    afterInitialDeal() {
      const pBJ = isBlackjack(this.playerCards);
      const dBJ = isBlackjack(this.dealerCards);
      if (pBJ || dBJ) {
        this.flipDealerHidden(() => {
          this.updateScores();
          if (pBJ && dBJ) this.resolve('push', this.bet);
          else if (pBJ) this.resolve('blackjack', Math.floor(this.bet * 2.5));
          else this.resolve('lose', 0);
        });
        return;
      }
      this.enterPhase('player');
    }

    playerHit() {
      if (this.phase !== 'player') return;
      this.canDouble = false; this.btnDouble.setAlpha(0.35);
      const card = this.drawCard();
      this.playerCards.push(card);
      SfxMgr.play(this, 'sfx_deal', 0.55);
      this.spawnCard(card, 'p', this.playerCards.length - 1, false, () => {
        this.updateScores();
        const v = handValue(this.playerCards);
        if (v > 21) this.time.delayedCall(420, () => this.flipDealerHidden(() => this.resolve('bust', 0)));
        else if (v === 21) this.time.delayedCall(380, () => this.playerStand());
      });
    }

    playerStand() {
      if (this.phase !== 'player') return;
      this.enterPhase('dealer');
      this.flipDealerHidden(() => this.dealerTurn());
    }

    playerDouble() {
      if (this.phase !== 'player') return;
      if (!this.canDouble) { this.flashHint('只能在首动加倍'); return; }
      if (this.chips < this.bet) { this.flashHint('筹码不足'); return; }
      const doubleAmount = this.bet;
      this.chips -= this.bet; this.bet *= 2; this.updateHud();
      this.canDouble = false; this.btnDouble.setAlpha(0.35);
      SfxMgr.play(this, 'sfx_chip_stack', 0.6);
      // 加倍時補一筆等額籌碼到堆叠
      [100, 500, 1000, 5000].slice().reverse().reduce((rem, denom) => {
        while (rem >= denom) { this.spawnStackChip(denom); rem -= denom; }
        return rem;
      }, doubleAmount);
      const card = this.drawCard();
      this.playerCards.push(card);
      SfxMgr.play(this, 'sfx_deal', 0.55);
      this.spawnCard(card, 'p', this.playerCards.length - 1, false, () => {
        this.updateScores();
        const v = handValue(this.playerCards);
        this.time.delayedCall(420, () => {
          if (v > 21) this.flipDealerHidden(() => this.resolve('bust', 0));
          else { this.enterPhase('dealer'); this.flipDealerHidden(() => this.dealerTurn()); }
        });
      });
    }

    dealerTurn() {
      const step = () => {
        this.updateScores();
        const v = handValue(this.dealerCards);
        if (v < 17) {
          const card = this.drawCard();
          this.dealerCards.push(card);
          SfxMgr.play(this, 'sfx_deal', 0.55);
          this.spawnCard(card, 'd', this.dealerCards.length - 1, false, () => {
            this.time.delayedCall(360, step);
          });
        } else {
          this.time.delayedCall(280, () => this.settle());
        }
      };
      step();
    }

    settle() {
      const pv = handValue(this.playerCards);
      const dv = handValue(this.dealerCards);
      if (dv > 21 || pv > dv) this.resolve('win', this.bet * 2);
      else if (pv < dv) this.resolve('lose', 0);
      else this.resolve('push', this.bet);
    }

    resolve(outcome, payback) {
      this.enterPhase('result');
      const earned = payback - this.bet;
      this.chips += payback;
      if (outcome === 'win' || outcome === 'blackjack') this.profile.wins++;
      else if (outcome === 'push') this.profile.pushes++;
      else this.profile.losses++;
      if (outcome === 'blackjack') this.profile.blackjacks++;
      if (this.chips > this.profile.bestChips) this.profile.bestChips = this.chips;
      this.profile.currentChips = this.chips;
      this.tryInsertLeaderboard();
      saveProfile(this.profile);

      this.bet = 0; this.updateHud();
      this.playReactionAnim(outcome);

      // 籌碼堆叠掃除動畫
      if (outcome === 'win' || outcome === 'blackjack') this.sweepStackChipsToPlayer();
      else if (outcome === 'push') this.clearStackChips(true);
      else this.sweepStackChipsToDealer();

      this.showResultPanel(outcome, earned);

      if (outcome === 'win' || outcome === 'blackjack') SfxMgr.play(this, 'sfx_win', 0.7);
      else if (outcome !== 'push') SfxMgr.play(this, 'sfx_lose', 0.6);
    }

    playReactionAnim(outcome) {
      // 玩家赢 → 庄家 lose 动画; 玩家输 → 庄家 win 动画; push → 不切换
      let animKey = null;
      if (outcome === 'win' || outcome === 'blackjack') animKey = `${this.opponent.id}_lose_anim`;
      else if (outcome === 'lose' || outcome === 'bust') animKey = `${this.opponent.id}_win_anim`;
      if (!animKey) return;
      this.dealerSprite.setVisible(false);
      this.dealerAnim.setVisible(true).play(animKey);
      this.dealerAnim.once('animationcomplete', () => {
        // 停在最后一帧
      });
    }

    tryInsertLeaderboard() {
      const entry = {
        name: this.profile.playerName, chips: this.chips,
        opponent: this.opponent.name,
        date: new Date().toISOString().slice(0, 10),
      };
      const list = (this.profile.leaderboard || []).slice();
      list.push(entry);
      list.sort((a, b) => b.chips - a.chips);
      this.profile.leaderboard = list.slice(0, 10);
    }

    showResultPanel(outcome, earned) {
      this.resultPanel.removeAll(true);
      this.resultPanel.setVisible(true);

      const panel = this.add.image(0, 0, 'panel_result').setDisplaySize(840, 520);
      const titleMap = {
        blackjack: { t: '黑杰克!', c: '#FFE57F' },
        win:       { t: '你赢了',   c: '#6FE0FF' },
        push:      { t: '平局',     c: '#B388FF' },
        lose:      { t: '你输了',   c: '#FF53C7' },
        bust:      { t: '爆牌',     c: '#FF53C7' },
      };
      const info = titleMap[outcome] || titleMap.lose;
      const title = this.add.text(0, -130, info.t, {
        fontFamily: FONT_BODY, fontSize: '92px', fontStyle: '900',
        color: info.c, stroke: '#0a0420', strokeThickness: 5,
      }).setOrigin(0.5);
      const sign = earned > 0 ? '+' : '';
      const earnedText = this.add.text(0, -20, `${sign}${fmt(earned)} 筹码`, {
        fontFamily: FONT_BODY, fontSize: '52px', fontStyle: '900',
        color: earned >= 0 ? '#FFE57F' : '#ffaab8',
      }).setOrigin(0.5);
      const sub = this.add.text(0, 50,
        `玩家 ${handValue(this.playerCards)}   ·   庄家 ${handValue(this.dealerCards)}`, {
        fontFamily: FONT_BODY, fontSize: '30px', fontStyle: '700',
        color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0.85);

      const again = neonButton(this, 0, 170, '下一局', 0x6FE0FF, 360, 120);
      again.on('pointerup', () => {
        if (this.chips < 100) {
          this.chips = START_CHIPS;
          this.profile.currentChips = this.chips; saveProfile(this.profile);
          this.updateHud(); this.flashGameOver();
        }
        this.resetTableForNext();
      });

      this.resultPanel.add([panel, title, earnedText, sub, again]);
      this.resultPanel.setAlpha(0).setScale(0.9);
      this.tweens.add({ targets: this.resultPanel, alpha: 1, scale: 1, duration: 280, ease: 'Back.easeOut' });
    }

    flashGameOver() {
      const t = this.add.text(W/2, H/2 - 480, '已补充初始筹码', {
        fontFamily: FONT_BODY, fontSize: '36px', fontStyle: '900',
        color: '#FFE57F', stroke: '#0a0420', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({ targets: t, alpha: { from: 1, to: 0 }, duration: 1600, onComplete: () => t.destroy() });
    }

    resetTableForNext() {
      this.dealerSprites.forEach(s => s.destroy()); this.dealerSprites = [];
      this.playerSprites.forEach(s => s.destroy()); this.playerSprites = [];
      this.dealerCards = []; this.playerCards = [];
      this.dealerHiddenIdx = -1;
      this.clearStackChips(false);
      this.dealerAnim.setVisible(false);
      this.dealerSprite.setVisible(true);
      this.resultPanel.setVisible(false);
      this.enterPhase('bet');
    }
  }

  // ===== Leaderboard Scene =====
  class LeaderboardScene extends Phaser.Scene {
    constructor() { super('Leaderboard'); }
    create() {
      this.profile = loadProfile() || defaultProfile();
      this.add.image(W/2, H/2, 'bg_menu').setDisplaySize(W, H);
      this.add.rectangle(W/2, H/2, W, H, 0x05030d, 0.65);

      this.add.text(W/2, 180, '排行榜', {
        fontFamily: FONT_BODY, fontSize: '96px', fontStyle: '900',
        color: '#ffffff', stroke: '#0a0420', strokeThickness: 5,
      }).setOrigin(0.5);
      this.add.text(W/2, 270, '前 10 名 · 按最高筹码', {
        fontFamily: FONT_BODY, fontSize: '30px', fontStyle: '700',
        color: '#6FE0FF',
      }).setOrigin(0.5).setAlpha(0.9);

      const list = this.profile.leaderboard || [];
      if (list.length === 0) {
        this.add.text(W/2, H/2, '暂无记录 — 来玩一局吧!', {
          fontFamily: FONT_BODY, fontSize: '36px', color: '#ffffff',
        }).setOrigin(0.5).setAlpha(0.7);
      } else {
        const startY = 400, rowH = 110;
        list.forEach((e, i) => {
          const y = startY + i * rowH;
          const g = this.add.graphics();
          g.fillStyle(0x0d0820, 0.7);
          g.fillRoundedRect(W/2 - 460, y - 42, 920, 84, 16);
          g.lineStyle(2, i < 3 ? 0xFFE57F : 0x6FE0FF, 0.9);
          g.strokeRoundedRect(W/2 - 460, y - 42, 920, 84, 16);
          this.add.text(W/2 - 430, y, `#${i+1}`, {
            fontFamily: FONT_TITLE, fontSize: '36px', fontStyle: '900',
            color: i < 3 ? '#FFE57F' : '#ffffff',
          }).setOrigin(0, 0.5);
          this.add.text(W/2 - 320, y, e.name, {
            fontFamily: FONT_BODY, fontSize: '32px', fontStyle: '700', color: '#ffffff',
          }).setOrigin(0, 0.5);
          this.add.text(W/2 + 60, y, `vs ${e.opponent}`, {
            fontFamily: FONT_BODY, fontSize: '24px', color: '#B388FF',
          }).setOrigin(0, 0.5);
          this.add.text(W/2 + 430, y, fmt(e.chips), {
            fontFamily: FONT_TITLE, fontSize: '36px', fontStyle: '900', color: '#FFE57F',
          }).setOrigin(1, 0.5);
        });
      }

      const stats = `胜 ${this.profile.wins}   负 ${this.profile.losses}   和 ${this.profile.pushes}   BJ ${this.profile.blackjacks}`;
      this.add.text(W/2, H - 360, stats, {
        fontFamily: FONT_BODY, fontSize: '30px', fontStyle: '700', color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0.85);

      const back = neonButton(this, W/2 - 260, H - 200, '返回', 0x6FE0FF, 460, 120);
      back.on('pointerup', () => this.scene.start('Menu'));
      const clear = neonButton(this, W/2 + 260, H - 200, '清除记录', 0xFF53C7, 460, 120);
      clear.on('pointerup', () => {
        this.showConfirm('确定清除排行榜?', () => {
          this.profile.leaderboard = []; saveProfile(this.profile);
          this.scene.restart();
        });
      });
    }

    showConfirm(text, onYes) {
      const o = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.65).setInteractive().setDepth(200);
      const g = this.add.graphics().setDepth(201);
      g.fillStyle(0x0d0820, 0.95); g.fillRoundedRect(W/2-400, H/2-180, 800, 360, 24);
      g.lineStyle(4, 0xFF53C7, 1); g.strokeRoundedRect(W/2-400, H/2-180, 800, 360, 24);
      const tx = this.add.text(W/2, H/2 - 60, text, {
        fontFamily: FONT_BODY, fontSize: '42px', fontStyle: '700', color: '#ffffff',
      }).setOrigin(0.5).setDepth(202);
      const yes = neonButton(this, W/2 - 160, H/2 + 80, '确定', 0xFF53C7, 280, 100); yes.setDepth(202);
      const no  = neonButton(this, W/2 + 160, H/2 + 80, '取消', 0x6FE0FF, 280, 100); no.setDepth(202);
      const close = () => { o.destroy(); g.destroy(); tx.destroy(); yes.destroy(); no.destroy(); };
      yes.on('pointerup', () => { close(); onYes && onYes(); });
      no.on('pointerup', close);
    }
  }

  // ===== Phaser Config =====
  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#05030d',
    width: W, height: H,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    dom: { createContainer: true },
    scene: [BootScene, MenuScene, GameScene, LeaderboardScene],
  };

  window.addEventListener('load', () => { window.game = new Phaser.Game(config); });
})();
