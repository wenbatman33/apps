// 牌桌場景：完整德州撲克流程（發牌→下注→攤牌→結算→下一手）
// 視覺系統：絨布漸層牌桌 / 座位資訊膠囊 / 扇形持牌 / 籌碼圖示 / 漸層膠囊按鈕 / 金色行動光暈
const DEPTH = { bg: -2, table: -1, slot: 1, pill: 2, glow: 3, avatar: 4, card: 6, ui: 8, dealer: 10, bubble: 30, control: 40, raise: 50, banner: 60, overlay: 100 };

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    // 座位順序 = 引擎順序：0 你(下方) → 1 賭聖 → 2 龍五 → 3 賭俠 → 4 賭神（上排由左至右）
    this.chars = [
      { id: 'char_you', name: '你', style: 'human' },
      { id: 'char_dusheng_toon', name: '賭聖', style: 'saint' },
      { id: 'char_long5_toon', name: '龍五', style: 'rock' },
      { id: 'char_duxia_toon', name: '賭俠', style: 'knight' },
      { id: 'char_dushen_toon', name: '賭神', style: 'god' },
    ];
    this.engine = new HoldemGame(this.chars);
    this.queue = [];
    this.processing = false;
    this.uiLocked = true;
    this._aiTimer = null;
    this._nextHandTimer = null;

    this.add.image(GAME_W / 2, GAME_H / 2, 'bg').setDepth(DEPTH.bg);
    this._buildTable();
    this._buildHeader();
    this._buildSeats();
    this._buildCommunity();
    this._buildPot();
    this._buildControls();
    this._buildRaisePanel();
    this._buildBanner();
    this.applyLayout();

    window.__scene = this; // 供 DEV 面板存取
    if (typeof DevPanel !== 'undefined') DevPanel.attach(this);

    // 牌桌環境音（進桌淡入、離開場景停止）
    Sound.startAmbience();
    this.events.once('shutdown', () => Sound.stopAmbience());

    this.time.delayedCall(500, () => this._enqueue(this.engine.startHand()));
  }

  // ================= 質感元件工具 =================

  // 將 graphics 畫成貼合文字的圓角膠囊
  _pill(g, cx, cy, w, h, { fill = 0x0c1a14, fillA = 0.92, border = COLORS.gold, borderA = 0.55, r = null } = {}) {
    const rad = r === null ? h / 2 : r;
    g.clear();
    g.fillStyle(fill, fillA).fillRoundedRect(cx - w / 2, cy - h / 2, w, h, rad);
    g.lineStyle(1.2, border, borderA).strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, rad);
  }

  // ================= UI 建構 =================

  _buildTable() {
    this.tableImg = this.add.image(0, 0, '__DEFAULT').setDepth(DEPTH.table);
    this._tableKey = '';
  }

  _drawTableTexture() {
    const t = LAYOUT.table;
    const key = `tableTex_${t.w}x${t.h}_${t.radius}`;
    if (key !== this._tableKey && this.textures.exists(this._tableKey)) this.textures.remove(this._tableKey);
    if (!this.textures.exists(key)) {
      const PAD = 44;
      const W = t.w + PAD * 2, H = t.h + PAD * 2, R = t.radius;
      const tex = this.textures.createCanvas(key, W, H);
      const ctx = tex.getContext();
      const path = (inset) => {
        const x = PAD + inset, y = PAD + inset, w = t.w - inset * 2, h = t.h - inset * 2, r = Math.max(8, R - inset);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
      };
      // 桌面陰影 + 絨布徑向漸層
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;
      const g = ctx.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.5, H * 0.72);
      g.addColorStop(0, COLORS.feltLight);
      g.addColorStop(1, COLORS.feltDark);
      path(0); ctx.fillStyle = g; ctx.fill();
      ctx.restore();
      // 外緣深色包邊 + 金色飾線
      path(0); ctx.strokeStyle = 'rgba(3,12,8,0.9)'; ctx.lineWidth = 3; ctx.stroke();
      path(10); ctx.strokeStyle = 'rgba(233,199,102,0.4)'; ctx.lineWidth = 1.6; ctx.stroke();
      path(22); ctx.strokeStyle = 'rgba(233,199,102,0.12)'; ctx.lineWidth = 1; ctx.stroke();
      tex.refresh();
    }
    this._tableKey = key;
    this.tableImg.setTexture(key).setPosition(t.x, t.y);
  }

  _buildHeader() {
    this.headerG = this.add.graphics().setDepth(DEPTH.ui);
    this.stageText = this.add.text(GAME_W / 2, 0, '', {
      fontFamily: FONT_UI, fontSize: '20px', color: '#9db8a9', letterSpacing: 6,
    }).setOrigin(0.5).setDepth(DEPTH.ui);
  }

  _drawHeader() {
    const y = LAYOUT.header.y;
    this.stageText.setPosition(GAME_W / 2, y).setFontSize(LAYOUT.header.size);
    const w = this.stageText.width || 80;
    this.headerG.clear();
    this.headerG.lineStyle(1, COLORS.gold, 0.45);
    this.headerG.lineBetween(GAME_W / 2 - w / 2 - 84, y, GAME_W / 2 - w / 2 - 18, y);
    this.headerG.lineBetween(GAME_W / 2 + w / 2 + 18, y, GAME_W / 2 + w / 2 + 84, y);
    this.headerG.fillStyle(COLORS.gold, 0.7);
    this.headerG.fillCircle(GAME_W / 2 - w / 2 - 90, y, 2.2);
    this.headerG.fillCircle(GAME_W / 2 + w / 2 + 90, y, 2.2);
  }

  _buildAvatar(charId, fallbackText) {
    const c = this.add.container(0, 0).setDepth(DEPTH.avatar);
    const bg = this.add.circle(0, 0, 46, 0x112b1f);
    c.add(bg);
    if (this.textures.exists(charId)) {
      const img = this.add.image(0, 0, charId);
      c.add(img);
      c._img = img;
      c._maskG = this.make.graphics();
      img.setMask(c._maskG.createGeometryMask());
    } else {
      c.add(this.add.text(0, 0, fallbackText, {
        fontFamily: FONT_TITLE, fontSize: '38px', color: '#e8c766', fontStyle: 'bold',
      }).setOrigin(0.5));
    }
    const ringDark = this.add.circle(0, 0, 46, 0x000000, 0).setStrokeStyle(4, 0x0a1812, 0.9);
    const ringGold = this.add.circle(0, 0, 46, 0x000000, 0).setStrokeStyle(1.6, COLORS.gold, 0.8);
    c.add([ringDark, ringGold]);
    c._ringDark = ringDark;
    c._ringGold = ringGold;
    c._bg = bg;
    c._r = 46;
    return c;
  }

  _syncAvatar(c, r) {
    c._r = r;
    c._bg.setRadius(r);
    c._ringDark.setRadius(r + 1);
    c._ringGold.setRadius(r + 3);
    if (c._maskG) {
      c._maskG.clear().fillCircle(c.x, c.y, r);
      if (c._img) c._img.setDisplaySize(r * 2, r * 2);
    }
  }

  _buildSeats() {
    this.seats = [];
    for (let i = 0; i < this.chars.length; i++) {
      const ch = this.chars[i];
      const seat = {
        glow: this.add.circle(0, 0, 50, 0x000000, 0).setStrokeStyle(5, 0xffd84d, 0.55).setDepth(DEPTH.glow).setVisible(false),
        avatar: this._buildAvatar(ch.id, ch.name[0]),
        pillG: this.add.graphics().setDepth(DEPTH.pill),
        name: this.add.text(0, 0, ch.name, {
          fontFamily: FONT_UI, fontSize: '20px', color: '#f2f6f0', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH.ui),
        chips: this.add.text(0, 0, '', {
          fontFamily: FONT_UI, fontSize: '15px', color: '#f3d27a', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH.ui),
        betC: this._buildBetTag(),
        bubbleC: this._buildBubble(),
        talkC: this._buildTalk(),
        cards: [],
        handName: this.add.text(0, 0, '', {
          fontFamily: FONT_UI, fontSize: '17px', color: '#9fe6bb', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH.bubble),
        statusMark: this.add.text(0, 0, '淘汰', {
          fontFamily: FONT_UI, fontSize: '22px', color: '#ff8f7d', fontStyle: 'bold',
          backgroundColor: '#160b08', padding: { x: 10, y: 5 },
        }).setOrigin(0.5).setDepth(DEPTH.bubble).setVisible(false),
      };
      for (let k = 0; k < 2; k++) {
        seat.cards.push(this.add.image(0, 0, 'card_back').setVisible(false).setDepth(DEPTH.card));
      }
      this.seats.push(seat);
    }
    // 莊家鈕（金邊小圓章）
    this.dealerBtn = this.add.container(0, 0, [
      this.add.circle(0, 0, 15, 0xf5efd9).setStrokeStyle(2, 0xb99a3f),
      this.add.text(0, 0, 'D', { fontFamily: FONT_UI, fontSize: '14px', color: '#7a5c10', fontStyle: 'bold' }).setOrigin(0.5),
    ]).setVisible(false).setDepth(DEPTH.dealer);
  }

  _buildBetTag() {
    const c = this.add.container(0, 0).setDepth(DEPTH.ui).setVisible(false);
    const g = this.add.graphics();
    const chip = this.add.image(0, 0, 'chip').setDisplaySize(17, 17);
    const t = this.add.text(0, 0, '', {
      fontFamily: FONT_UI, fontSize: '17px', color: '#ffd98f', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    c.add([g, chip, t]);
    c._g = g; c._chip = chip; c._t = t;
    return c;
  }

  _setBetTag(c, amount, size) {
    if (!amount) { c.setVisible(false); return; }
    c._t.setFontSize(size).setText(`$${amount.toLocaleString()}`);
    const chipW = size + 2;
    c._chip.setDisplaySize(chipW, chipW);
    const total = chipW + 6 + c._t.width;
    c._chip.x = -total / 2 + chipW / 2;
    c._t.x = c._chip.x + chipW / 2 + 6;
    // 深色膠囊底板，讓金額在絨布上一眼可讀
    this._pill(c._g, 0, 0, total + 24, size + 16, { fillA: 0.72, borderA: 0.3 });
    c.setVisible(true);
  }

  _buildBubble() {
    const c = this.add.container(0, 0).setDepth(DEPTH.bubble).setAlpha(0);
    const g = this.add.graphics();
    const t = this.add.text(0, 0, '', {
      fontFamily: FONT_UI, fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add([g, t]);
    c._g = g; c._t = t;
    return c;
  }

  // 角色語錄泡泡（頭像上方，白字金框）
  _buildTalk() {
    const c = this.add.container(0, 0).setDepth(DEPTH.bubble + 1).setAlpha(0);
    const g = this.add.graphics();
    const t = this.add.text(0, 0, '', {
      fontFamily: FONT_UI, fontSize: '19px', color: '#fdf6dd',
    }).setOrigin(0.5);
    c.add([g, t]);
    c._g = g; c._t = t;
    return c;
  }

  // 依角色風格與情境講一句台詞
  _say(idx, cat) {
    if (idx === 0 || typeof DIALOGUE === 'undefined') return;
    const style = this.chars[idx].style;
    const pool = DIALOGUE[style] && DIALOGUE[style][cat];
    if (!pool || !pool.length) return;
    if (Math.random() > (DIALOGUE_CHANCE[cat] ?? 0.5)) return;
    const line = pool[(Math.random() * pool.length) | 0];
    const c = this.seats[idx].talkC;
    c._t.setText(`「${line}」`);
    this._pill(c._g, 0, 0, c._t.width + 30, c._t.height + 16, { fillA: 0.93, borderA: 0.55 });
    // 避免超出畫面：靠邊座位往內收
    const anchor = this._seatAnchor(idx);
    const half = (c._t.width + 30) / 2;
    const tx = Phaser.Math.Clamp(anchor.x, half + 10, GAME_W - half - 10);
    const ty = idx === 0 ? anchor.y - LAYOUT.player.avatarR - 44 : LAYOUT.opp.y - LAYOUT.opp.avatarR - 40;
    c.setPosition(tx, ty + 8);
    this.tweens.killTweensOf(c);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, y: ty, duration: 200, ease: 'Cubic.out' });
    this.tweens.add({ targets: c, alpha: 0, delay: 1900, duration: 320 });
  }

  _showBubble(c, text, color) {
    c._t.setText(text).setColor(color);
    this._pill(c._g, 0, 0, c._t.width + 30, c._t.height + 14, { fillA: 0.9, borderA: 0.35 });
    this.tweens.killTweensOf(c);
    c.setAlpha(1);
    this.tweens.add({ targets: c, alpha: 0, delay: 1000, duration: 300 });
  }

  _buildCommunity() {
    this.slotG = this.add.graphics().setDepth(DEPTH.slot);
    this.commCards = [];
    for (let i = 0; i < 5; i++) {
      this.commCards.push(this.add.image(0, 0, 'card_back').setVisible(false).setDepth(DEPTH.card));
    }
  }

  _buildPot() {
    this.potC = this.add.container(0, 0).setDepth(DEPTH.ui).setVisible(false);
    const g = this.add.graphics();
    // 有 AI 生成的籌碼堆就用它，否則用內建金幣
    const chipKey = this.textures.exists('chips_pile') ? 'chips_pile' : 'chip';
    const chip = this.add.image(0, 0, chipKey).setDisplaySize(24, 24);
    this.potC._isPile = chipKey === 'chips_pile';
    const label = this.add.text(0, 0, '彩池', {
      fontFamily: FONT_UI, fontSize: '17px', color: '#a8c3b4',
    }).setOrigin(0, 0.5);
    const amount = this.add.text(0, 0, '', {
      fontFamily: FONT_UI, fontSize: '30px', color: '#f3d27a', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.potC.add([g, chip, label, amount]);
    this.potC._g = g; this.potC._chip = chip; this.potC._label = label; this.potC._amount = amount;
  }

  _setPot(v) {
    if (!v) { this.potC.setVisible(false); return; }
    const P = LAYOUT.pot;
    this.potC._label.setFontSize(P.labelSize);
    this.potC._amount.setFontSize(P.size).setText(`$${v.toLocaleString()}`);
    const chipW = P.size * (this.potC._isPile ? 1.15 : 0.78);
    this.potC._chip.setDisplaySize(chipW, chipW);
    const total = chipW + 9 + this.potC._label.width + 9 + this.potC._amount.width;
    this.potC._chip.x = -total / 2 + chipW / 2;
    this.potC._label.x = this.potC._chip.x + chipW / 2 + 9;
    this.potC._amount.x = this.potC._label.x + this.potC._label.width + 9;
    // 金框底板：彩池是全場焦點
    this._pill(this.potC._g, 0, 0, total + 40, P.size + 24, { fillA: 0.66, borderA: 0.5 });
    this.potC.setVisible(true);
  }

  _buildControls() {
    this.controls = [];
    const defs = [
      { key: 'fold', label: '棄牌', kind: 'fold', textColor: '#ffe9e2' },
      { key: 'call', label: '跟注', kind: 'call', textColor: '#eafff2' },
      { key: 'raise', label: '加注', kind: 'raise', textColor: '#33240a' },
    ];
    defs.forEach((d) => {
      const c = this.add.container(0, 0).setDepth(DEPTH.control);
      const img = this.add.image(0, 0, '__DEFAULT');
      const label = this.add.text(0, 0, d.label, {
        fontFamily: FONT_UI, fontSize: '29px', color: d.textColor, fontStyle: 'bold', align: 'center', lineSpacing: 2,
      }).setOrigin(0.5);
      c.add([img, label]);
      c._img = img; c._label = label; c._kind = d.kind; c._key = d.key; c._textColor = d.textColor;
      c.setInteractive(new Phaser.Geom.Rectangle(0, 0, 10, 10), Phaser.Geom.Rectangle.Contains);
      c.on('pointerdown', () => {
        if (this.uiLocked) return;
        this.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true });
        this._onControl(d.key);
      });
      this.controls.push(c);
    });
    this._setControlsVisible(false);
  }

  _styleControl(c, enabled) {
    const B = LAYOUT.buttons;
    const kind = enabled ? c._kind : 'dim';
    c._img.setTexture(makeBtnTexture(this, kind, B.w, B.h));
    c._img.setDisplaySize(B.w + 28, B.h + 28);
    c._label.setFontSize(B.fontSize).setColor(enabled ? c._textColor : '#7d8a83');
    c.input.hitArea.setTo(-B.w / 2, -B.h / 2, B.w, B.h);
  }

  _buildRaisePanel() {
    this.raisePanel = this.add.container(0, 0).setVisible(false).setDepth(DEPTH.raise);
    const g = this.add.graphics();
    this.raisePanel.add(g);
    this.raisePanel._g = g;
    this.raiseLabel = this.add.text(0, 0, '', {
      fontFamily: FONT_UI, fontSize: '30px', color: '#f3d27a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.raisePanel.add(this.raiseLabel);

    // 快捷鈕（膠囊：深底 + 細金邊）
    this.raiseQuick = [];
    const quicks = [
      { label: '最小', fn: () => this.raiseMin },
      { label: '半池', fn: () => this.engine.currentBet + Math.round(this.engine.potTotal() * 0.5) },
      { label: '滿池', fn: () => this.engine.currentBet + this.engine.potTotal() },
      { label: '全下', fn: () => this.raiseMax },
    ];
    quicks.forEach((q) => {
      const c = this.add.container(0, 0);
      const qg = this.add.graphics();
      const t = this.add.text(0, 0, q.label, {
        fontFamily: FONT_UI, fontSize: '22px', color: '#e8f2ec', fontStyle: 'bold',
      }).setOrigin(0.5);
      c.add([qg, t]);
      c._g = qg; c._t = t;
      c.setSize(132, 56).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        Sound.turn();
        this.tweens.add({ targets: c, scale: 0.92, duration: 60, yoyo: true });
        this._setRaiseValue(q.fn(), true);
      });
      this.raisePanel.add(c);
      this.raiseQuick.push(c);
    });

    // 滑桿（軌道 + 金色進度 + 大旋鈕）
    this.sliderTrack = this.add.rectangle(0, 0, 560, 8, 0x0a1510).setOrigin(0, 0.5).setStrokeStyle(1, 0xe8c766, 0.25);
    this.sliderFill = this.add.rectangle(0, 0, 0, 8, 0xcaa23f).setOrigin(0, 0.5);
    this.sliderKnob = this.add.circle(0, 0, 21, 0xe8c766).setStrokeStyle(3, 0xfdf3d3, 0.9).setInteractive({ draggable: true, useHandCursor: true });
    this.raisePanel.add([this.sliderTrack, this.sliderFill, this.sliderKnob]);
    this.sliderKnob.on('drag', (ptr, dragX) => {
      const left = this.sliderTrack.x, w = this.sliderTrack.width;
      const localX = Phaser.Math.Clamp(dragX, left, left + w);
      this.sliderKnob.x = localX;
      this.sliderFill.width = localX - left;
      const t = (localX - left) / w;
      this._setRaiseValue(Math.round((this.raiseMin + (this.raiseMax - this.raiseMin) * t) / 500) * 500, false);
    });

    // 取消 / 確認（正式漸層膠囊按鈕）
    const mkBtn = (kind, label, textColor, onTap) => {
      const c = this.add.container(0, 0);
      c.add(this.add.image(0, 0, makeBtnTexture(this, kind, 210, 68)).setDisplaySize(238, 96));
      c.add(this.add.text(0, 0, label, {
        fontFamily: FONT_UI, fontSize: '26px', color: textColor, fontStyle: 'bold',
      }).setOrigin(0.5));
      c.setSize(210, 68).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        this.tweens.add({ targets: c, scale: 0.94, duration: 60, yoyo: true });
        onTap();
      });
      this.raisePanel.add(c);
      return c;
    };
    this.raiseCancel = mkBtn('dim', '取消', '#c8d8d0', () => this.raisePanel.setVisible(false));
    this.raiseConfirm = mkBtn('gold', '確認加注', '#33240a', () => {
      Sound.confirm();
      this.raisePanel.setVisible(false);
      this._doAction('raise', this.raiseValue);
    });
  }

  _buildBanner() {
    this.bannerC = this.add.container(0, 0).setDepth(DEPTH.banner).setAlpha(0);
    const g = this.add.graphics();
    const t = this.add.text(0, 0, '', {
      fontFamily: FONT_UI, fontSize: '34px', color: '#f3d27a', fontStyle: 'bold', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5);
    this.bannerC.add([g, t]);
    this.bannerC._g = g; this.bannerC._t = t;
  }

  // ================= 佈局套用（DEV 可即時刷新） =================

  applyLayout() {
    const L = LAYOUT;
    this._drawTableTexture();
    this._drawHeader();
    this.potC.setPosition(L.pot.x, L.pot.y);

    // 對手（seat 1..4 → 版位 0..3）
    for (let i = 1; i < this.seats.length; i++) {
      const s = this.seats[i];
      const x = L.opp.xs[i - 1], y = L.opp.y;
      s.avatar.setPosition(x, y);
      this._syncAvatar(s.avatar, L.opp.avatarR);
      s.glow.setPosition(x, y).setRadius(L.opp.avatarR + 7);
      // 資訊膠囊（名字 + 籌碼）
      const pillCy = y + L.opp.pillDy;
      this._pill(s.pillG, x, pillCy, L.opp.pillW, L.opp.pillH, { fillA: 0.82, borderA: 0.3, r: 14 });
      s.name.setPosition(x, pillCy - 13).setFontSize(L.opp.nameSize);
      s.chips.setPosition(x, pillCy + 14).setFontSize(L.opp.chipsSize);
      s.betC.setPosition(x, y + L.opp.betDy);
      s.bubbleC.setPosition(x, y + L.opp.cardDy - 8);
      s.handName.setPosition(x, y + L.opp.cardDy + 58);
      s.statusMark.setPosition(x, y);
    }

    // 玩家
    const P = L.player, s0 = this.seats[0];
    s0.avatar.setPosition(P.avatarX, P.avatarY);
    this._syncAvatar(s0.avatar, P.avatarR);
    s0.glow.setPosition(P.avatarX, P.avatarY).setRadius(P.avatarR + 7);
    const pillCy = P.avatarY + P.pillDy;
    this._pill(s0.pillG, P.avatarX, pillCy, 150, 60, { fillA: 0.82, borderA: 0.3, r: 14 });
    s0.name.setPosition(P.avatarX, pillCy - 13).setFontSize(P.nameSize);
    s0.chips.setPosition(P.avatarX, pillCy + 13).setFontSize(P.chipsSize);
    this._layoutSeatCards();
    s0.betC.setPosition(GAME_W / 2, P.betY);
    s0.bubbleC.setPosition(GAME_W / 2, P.betY - 52);
    s0.handName.setPosition(P.cardsX, P.handNameY).setFontSize(P.handNameSize);
    s0.statusMark.setPosition(P.avatarX, P.avatarY);

    // 公共牌 + 空位框
    this.slotG.clear();
    const cw = CARD_W * L.community.scale, chh = CARD_H * L.community.scale;
    for (let i = 0; i < 5; i++) {
      const cx = L.community.x + (i - 2) * L.community.gap;
      this.slotG.lineStyle(1.2, 0xffffff, 0.09);
      this.slotG.strokeRoundedRect(cx - cw / 2, L.community.y - chh / 2, cw, chh, 10);
      this.commCards[i].setPosition(cx, L.community.y).setScale(this._cs(L.community.scale));
    }

    // 按鈕
    this.controls.forEach((c, i) => {
      c.setPosition(L.buttons.xs[i], L.buttons.y);
      this._styleControl(c, c._enabled !== false);
    });

    // 加注面板（四行式：標題 / 快捷 / 滑桿 / 按鈕）
    const R = L.raise;
    const rcx = GAME_W / 2, rtop = R.y - R.h / 2;
    this.raisePanel._g.clear();
    this.raisePanel._g.fillStyle(0x0a1611, 0.99).fillRoundedRect(rcx - 340, rtop, 680, R.h, 26);
    this.raisePanel._g.lineStyle(1.4, COLORS.gold, 0.55).strokeRoundedRect(rcx - 340, rtop, 680, R.h, 26);
    this.raiseLabel.setPosition(rcx, rtop + R.titleDy).setFontSize(R.fontSize + 4);
    this.raiseQuick.forEach((c, i) => {
      c.setPosition(rcx - 246 + i * 164, rtop + R.quickDy);
      this._pill(c._g, 0, 0, 132, 54, { fill: 0x152e24, fillA: 1, borderA: 0.4, r: 14 });
      c._t.setFontSize(R.fontSize - 4);
    });
    const trackLeft = rcx - R.trackW / 2, sliderRowY = rtop + R.sliderDy;
    this.sliderTrack.setPosition(trackLeft, sliderRowY).setSize(R.trackW, 8);
    this.sliderFill.setPosition(trackLeft, sliderRowY);
    this.sliderKnob.y = sliderRowY;
    this.raiseCancel.setPosition(rcx - 165, rtop + R.btnDy);
    this.raiseConfirm.setPosition(rcx + 165, rtop + R.btnDy);

    this.bannerC.setPosition(GAME_W / 2, L.banner.y);
    this._refreshTexts();
  }

  // ================= 事件佇列 =================

  _enqueue(events) {
    this.queue.push(...events);
    if (!this.processing) this._processNext();
  }

  _processNext() {
    if (this.queue.length === 0) { this.processing = false; this._onQueueDrained(); return; }
    this.processing = true;
    const e = this.queue.shift();
    const dur = this._handleEvent(e);
    this.time.delayedCall(dur, () => this._processNext());
  }

  _handleEvent(e) {
    const F = LAYOUT.fx;
    switch (e.type) {
      case 'handStart': {
        this.stageText.setText(`第 ${e.hand} 局`);
        this._drawHeader();
        this._clearTableForNewHand();
        this._placeDealerBtn(e.dealerIdx);
        Sound.shuffle();
        return 400;
      }
      case 'blind': {
        Sound.chip();
        this._refreshTexts();
        return 220;
      }
      case 'dealHole': {
        this._animateDealHole();
        return 900;
      }
      case 'turnTo': {
        Sound.turn();
        this._highlightActor(e.idx);
        return 150;
      }
      case 'action': {
        this._showAction(e);
        return F.actionMs;
      }
      case 'street': {
        this._revealCommunity(e.cards);
        this._refreshTexts();
        this._updatePlayerHandName();
        return 350 + e.cards.length * 110;
      }
      case 'showdown': {
        this._revealShowdown(e.results);
        return 1200;
      }
      case 'payout': {
        this._showPayout(e);
        this._setPot(0);
        return F.showdownMs + 600;
      }
      case 'winUncontested': {
        const name = this.chars[e.idx].name;
        this._flashBanner(`${name} 收下彩池 $${e.pot.toLocaleString()}`, e.idx === 0 ? '#9fe6bb' : '#f3d27a');
        if (e.idx === 0) Sound.win();
        this._flyChipsTo(e.idx);
        this._say(e.idx, 'win');
        this._refreshTexts();
        this._setPot(0);
        return 1400;
      }
      case 'eliminated': {
        const s = this.seats[e.idx];
        s.statusMark.setVisible(true);
        s.avatar.setAlpha(0.3);
        s.name.setAlpha(0.35);
        this._flashBanner(`${this.chars[e.idx].name} 破產出局！`, '#ff9d8a');
        return 1200;
      }
      case 'handEnd': {
        return 700;
      }
      case 'gameOver': {
        this._showGameOver(e);
        return 100;
      }
    }
    return 100;
  }

  _onQueueDrained() {
    const st = this.engine.stage;
    if (st === 'over') return;
    if (this._aiTimer) { this._aiTimer.remove(false); this._aiTimer = null; }
    if (st === 'idle') {
      if (this._nextHandTimer) return;
      this._nextHandTimer = this.time.delayedCall(900, () => {
        this._nextHandTimer = null;
        if (this.engine.stage === 'idle') this._enqueue(this.engine.startHand());
      });
      return;
    }
    const idx = this.engine.actorIdx;
    if (idx === 0) {
      this._showControls();
    } else {
      const F = LAYOUT.fx;
      const delay = F.aiThinkMin + Math.random() * (F.aiThinkMax - F.aiThinkMin);
      this._aiTimer = this.time.delayedCall(delay, () => {
        this._aiTimer = null;
        if (!['preflop', 'flop', 'turn', 'river'].includes(this.engine.stage)) return;
        if (this.engine.actorIdx !== idx) return; // 過期回呼直接放棄
        const d = AI.decide(this.engine, idx);
        this._enqueue(this.engine.act(d.action, d.amount || 0));
      });
    }
  }

  // ================= 呈現細節 =================

  // 手牌回到座位定位（applyLayout 與每局開始共用，避免棄牌動畫殘留位移）
  _layoutSeatCards() {
    const L = LAYOUT;
    for (let i = 1; i < this.seats.length; i++) {
      const x = L.opp.xs[i - 1], y = L.opp.y;
      this.seats[i].cards.forEach((cd, k) => {
        cd.setPosition(x + (k === 0 ? -L.opp.cardGap / 2 : L.opp.cardGap / 2), y + L.opp.cardDy);
        cd.setScale(this._cs(L.opp.cardScale));
        cd.setAngle(k === 0 ? -L.opp.cardTilt : L.opp.cardTilt);
      });
    }
    const P = L.player;
    this.seats[0].cards.forEach((cd, k) => {
      cd.setPosition(P.cardsX + (k === 0 ? -P.cardGap / 2 : P.cardGap / 2), P.cardsY);
      cd.setScale(this._cs(P.cardScale));
      cd.setAngle(k === 0 ? -P.cardTilt : P.cardTilt);
    });
  }

  _clearTableForNewHand() {
    this._layoutSeatCards();
    for (const s of this.seats) {
      s.cards.forEach(c => c.setVisible(false).setAlpha(1).setTexture('card_back'));
      s.betC.setVisible(false);
      s.bubbleC.setAlpha(0);
      s.talkC.setAlpha(0);
      s.handName.setText('');
      this._setSeatActive(s, false);
    }
    this.commCards.forEach(c => c.setVisible(false).setTexture('card_back'));
    this._refreshTexts();
  }

  _placeDealerBtn(idx) {
    const pos = this._seatAnchor(idx);
    if (idx === 0) this.dealerBtn.setVisible(true).setPosition(pos.x + 92, pos.y - 34);
    else this.dealerBtn.setVisible(true).setPosition(pos.x + LAYOUT.opp.avatarR + 24, pos.y - LAYOUT.opp.avatarR + 4);
  }

  _seatAnchor(idx) {
    if (idx === 0) return { x: LAYOUT.player.avatarX, y: LAYOUT.player.avatarY };
    return { x: LAYOUT.opp.xs[idx - 1], y: LAYOUT.opp.y };
  }

  _animateDealHole() {
    const c = LAYOUT.community;
    let d = 0;
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < this.seats.length; i++) {
        const p = this.engine.players[i];
        if (p.out) continue;
        const card = this.seats[i].cards[k];
        const tx = card.x, ty = card.y, ta = card.angle;
        card.setPosition(c.x, c.y - 40).setAngle(0).setVisible(true).setAlpha(0);
        if (i === 0) card.setTexture(this._texOf(p.hand[k]));
        this.tweens.add({
          targets: card, x: tx, y: ty, angle: ta, alpha: 1,
          delay: d, duration: LAYOUT.fx.dealMs + 80, ease: 'Cubic.out',
          onStart: () => Sound.deal(),
        });
        d += LAYOUT.fx.dealMs;
      }
    }
    this._updatePlayerHandName();
  }

  _texOf(card) { return `c_${card.r}_${card.s}`; }

  // 卡牌貼圖為 2x 解析度，顯示時換算回邏輯縮放
  _cs(v) { return v / (typeof TEX_SCALE !== 'undefined' ? TEX_SCALE : 1); }

  _setSeatActive(s, active) {
    this.tweens.killTweensOf(s.glow);
    if (active) {
      s.glow.setVisible(true).setAlpha(0.35);
      this.tweens.add({ targets: s.glow, alpha: 0.85, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      s.avatar._ringGold.setStrokeStyle(2.2, 0xffd84d, 1);
    } else {
      s.glow.setVisible(false);
      s.avatar._ringGold.setStrokeStyle(1.6, COLORS.gold, 0.8);
    }
  }

  _highlightActor(idx) {
    this.seats.forEach((s, i) => this._setSeatActive(s, i === idx));
  }

  _showAction(e) {
    const s = this.seats[e.idx];
    const map = {
      fold: ['棄牌', '#ff9d8a', () => Sound.fold()],
      check: ['過牌', '#b9d3c6', () => Sound.check()],
      call: [`跟注 $${(e.amount || 0).toLocaleString()}`, '#9fd0ff', () => Sound.chip()],
      raise: [`加注到 $${(e.amount || 0).toLocaleString()}`, '#ffd98f', () => Sound.raise()],
    };
    const [txt, color, sfx] = map[e.action];
    if (e.allIn) Sound.allin(); else sfx();
    this._showBubble(s.bubbleC, e.allIn ? `全下！${txt}` : txt, color);
    // 角色語錄
    this._say(e.idx, e.allIn ? 'allin' : (e.action === 'check' ? 'call' : e.action));
    if (e.action === 'fold') {
      // 蓋牌入堆：手牌淡出消失，頭像變暗表示已退出本局
      s.cards.forEach(c => this.tweens.add({
        targets: c, alpha: 0, y: c.y - 14, duration: 320, ease: 'Cubic.out',
        onComplete: () => c.setVisible(false),
      }));
      s.avatar.setAlpha(0.45);
    }
    this._refreshTexts();
  }

  _revealCommunity(cards) {
    cards.forEach((cd, i) => {
      const img = this.commCards[i];
      if (img.visible && img.texture.key !== 'card_back') return;
      img.setTexture(this._texOf(cd)).setVisible(true).setAlpha(0).setScale(this._cs(LAYOUT.community.scale * 0.8));
      this.tweens.add({
        targets: img, alpha: 1, scale: this._cs(LAYOUT.community.scale),
        delay: i * 100, duration: 200, ease: 'Cubic.out',
        onStart: () => Sound.deal(),
      });
    });
  }

  _updatePlayerHandName() {
    const p = this.engine.players[0];
    const s = this.seats[0];
    if (p.folded || p.out || p.hand.length < 2) { s.handName.setText(''); return; }
    if (this.engine.community.length >= 3) {
      const ev = evaluate7fill(p.hand, this.engine.community);
      s.handName.setText(`目前牌型 · ${ev.name}`);
    } else {
      s.handName.setText('');
    }
  }

  _revealShowdown(results) {
    for (const r of results) {
      if (r.idx === 0) { this.seats[0].handName.setText(`牌型 · ${r.name}`); continue; }
      const s = this.seats[r.idx];
      s.cards.forEach((c, k) => {
        this.tweens.add({
          targets: c, scaleX: 0, duration: 110, delay: k * 70,
          onComplete: () => {
            c.setTexture(this._texOf(r.hand[k]));
            this.tweens.add({ targets: c, scaleX: this._cs(LAYOUT.opp.cardScale), duration: 110 });
          },
        });
      });
      s.handName.setText(r.name);
    }
    Sound.flip();
  }

  _showPayout(e) {
    // 各池分配「按人加總」，每位贏家只顯示一筆總額（與引擎同樣的餘數分配邏輯）
    const totals = new Map();
    for (const potAward of e.pots) {
      const n = potAward.winners.length;
      const share = Math.floor(potAward.amount / n);
      let rem = potAward.amount - share * n;
      for (const w of potAward.winners) {
        const give = share + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;
        totals.set(w, (totals.get(w) || 0) + give);
      }
    }
    const lines = [];
    let humanWon = false;
    [...totals.entries()].sort((a, b) => b[1] - a[1]).forEach(([w, amt]) => {
      const res = e.results.find(r => r.idx === w);
      lines.push(`${this.chars[w].name} 贏得 $${amt.toLocaleString()}（${res ? res.name : ''}）`);
      if (w === 0) humanWon = true;
      const s = this.seats[w];
      s.avatar._ringGold.setStrokeStyle(2.6, 0x9fe6bb, 1);
      this.tweens.add({ targets: s.avatar, scale: 1.08, duration: 180, yoyo: true });
      this._flyChipsTo(w);
      this._say(w, 'win');
    });
    // 攤牌輸家的不甘台詞
    e.results.forEach(r => { if (!totals.has(r.idx)) this._say(r.idx, 'lose'); });
    if (humanWon) Sound.win(); else Sound.lose();
    this._flashBanner(lines.join('\n'), humanWon ? '#9fe6bb' : '#f3d27a');
    this._refreshTexts();
  }

  // 贏池動畫：一串籌碼從彩池飛向贏家
  _flyChipsTo(idx) {
    const from = { x: LAYOUT.pot.x, y: LAYOUT.pot.y };
    const to = this._seatAnchor(idx);
    for (let i = 0; i < 9; i++) {
      const c = this.add.image(from.x + (Math.random() * 60 - 30), from.y + (Math.random() * 20 - 10), 'chip')
        .setDisplaySize(22, 22).setDepth(DEPTH.banner - 1).setAlpha(0);
      this.tweens.add({
        targets: c, alpha: 1, duration: 90, delay: i * 55,
      });
      this.tweens.add({
        targets: c,
        x: to.x + (Math.random() * 40 - 20),
        y: to.y + (Math.random() * 24 - 12),
        delay: i * 55 + 60,
        duration: 480,
        ease: 'Cubic.in',
        onStart: () => { if (i % 3 === 0) Sound.chip(); },
        onComplete: () => {
          this.tweens.add({ targets: c, alpha: 0, duration: 140, onComplete: () => c.destroy() });
        },
      });
    }
  }

  _flashBanner(text, color = '#f3d27a') {
    const b = this.bannerC;
    b._t.setText(text).setColor(color).setFontSize(LAYOUT.banner.size);
    this._pill(b._g, 0, 0, b._t.width + 64, b._t.height + 34, { fillA: 0.94, borderA: 0.6, r: 20 });
    this.tweens.killTweensOf(b);
    b.setAlpha(0).setScale(0.94);
    this.tweens.add({ targets: b, alpha: 1, scale: 1, duration: 220, ease: 'Cubic.out' });
    this.tweens.add({ targets: b, alpha: 0, delay: 1750, duration: 350 });
  }

  _refreshTexts() {
    this._setPot(this.engine.potTotal());
    this.engine.players.forEach((p, i) => {
      const s = this.seats[i];
      s.chips.setText(`$${p.chips.toLocaleString()}`);
      this._setBetTag(s.betC, p.bet, i === 0 ? LAYOUT.player.betSize : LAYOUT.opp.betSize);
      if (!p.out && !p.folded) s.avatar.setAlpha(1);
    });
  }

  // ================= 玩家操作 =================

  _showControls() {
    this.uiLocked = false;
    const callCost = this.engine.callAmount(0);
    const p = this.engine.players[0];
    const [foldBtn, callBtn, raiseBtn] = this.controls;
    foldBtn._label.setText('棄牌');
    foldBtn._enabled = true;
    callBtn._label.setText(callCost === 0 ? '過牌' : (callCost >= p.chips ? `全下跟注\n$${p.chips.toLocaleString()}` : `跟注\n$${callCost.toLocaleString()}`));
    callBtn._enabled = true;
    const canRaise = p.chips > callCost;
    raiseBtn._label.setText(callCost === 0 ? '下注' : '加注');
    raiseBtn._enabled = canRaise;
    this.controls.forEach(c => this._styleControl(c, c._enabled !== false));
    this._setControlsVisible(true);
  }

  _setControlsVisible(v) {
    this.controls.forEach(c => c.setVisible(v));
    if (!v && this.raisePanel) this.raisePanel.setVisible(false);
  }

  _onControl(key) {
    const callCost = this.engine.callAmount(0);
    if (key === 'fold') return this._doAction('fold');
    if (key === 'call') return this._doAction(callCost === 0 ? 'check' : 'call');
    if (key === 'raise') {
      const p = this.engine.players[0];
      if (p.chips <= callCost) return;
      this.raiseMin = Math.min(this.engine.currentBet + this.engine.minRaise, p.bet + p.chips);
      this.raiseMax = p.bet + p.chips;
      this.raisePanel.setVisible(true);
      this._setRaiseValue(this.raiseMin, true);
    }
  }

  _setRaiseValue(v, syncKnob) {
    this.raiseValue = Phaser.Math.Clamp(Math.round(v / 500) * 500, this.raiseMin, this.raiseMax);
    const isAllIn = this.raiseValue >= this.raiseMax;
    this.raiseLabel.setText(`${isAllIn ? '全下' : '加注到'} $${this.raiseValue.toLocaleString()}`);
    if (syncKnob) {
      // 軌道原點在左端
      const t = this.raiseMax === this.raiseMin ? 1 : (this.raiseValue - this.raiseMin) / (this.raiseMax - this.raiseMin);
      this.sliderKnob.x = this.sliderTrack.x + t * this.sliderTrack.width;
      this.sliderKnob.y = this.sliderTrack.y;
      this.sliderFill.width = this.sliderKnob.x - this.sliderTrack.x;
    }
  }

  _doAction(action, amount = 0) {
    if (this.engine.actorIdx !== 0) return; // 非玩家回合不可出手
    this.uiLocked = true;
    this._setControlsVisible(false);
    this._enqueue(this.engine.act(action, amount));
  }

  // ================= 終局 =================

  _showGameOver(e) {
    const overlay = this.add.container(0, 0).setDepth(DEPTH.overlay);
    overlay.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x030806, 0.82));
    const humanWin = e.winnerIdx === 0;
    const title = humanWin ? '你統一了賭壇' : '你破產出局了';
    const sub = humanWin
      ? '賭神、賭俠、賭聖、龍五全被你打到破產\n新一代賭神就是你'
      : `${e.winnerIdx >= 0 ? this.chars[e.winnerIdx].name + ' 笑到了最後。' : ''}\n江湖再見，東山再起`;
    const g = this.add.graphics();
    g.lineStyle(1, COLORS.gold, 0.5);
    g.lineBetween(GAME_W / 2 - 160, 430, GAME_W / 2 + 160, 430);
    g.lineBetween(GAME_W / 2 - 160, 660, GAME_W / 2 + 160, 660);
    overlay.add(g);
    overlay.add(this.add.text(GAME_W / 2, 512, title, {
      fontFamily: FONT_TITLE, fontSize: '58px', color: humanWin ? '#f3d27a' : '#ff9d8a', fontStyle: 'bold',
    }).setOrigin(0.5));
    overlay.add(this.add.text(GAME_W / 2, 606, sub, {
      fontFamily: FONT_UI, fontSize: '25px', color: '#c8d8d0', align: 'center', lineSpacing: 12,
    }).setOrigin(0.5));
    if (humanWin) Sound.win(); else Sound.lose();

    const btnKey = makeBtnTexture(this, 'gold', 300, 84);
    const btn = this.add.container(GAME_W / 2, 790);
    btn.add(this.add.image(0, 0, btnKey).setDisplaySize(328, 112));
    btn.add(this.add.text(0, 0, '再 來 一 局', { fontFamily: FONT_UI, fontSize: '34px', color: '#33240a', fontStyle: 'bold' }).setOrigin(0.5));
    btn.setSize(300, 84).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.scene.restart());
    overlay.add(btn);
    const menuBtn = this.add.text(GAME_W / 2, 900, '回主選單', {
      fontFamily: FONT_UI, fontSize: '25px', color: '#c8d8d0', backgroundColor: '#1c4536', padding: { x: 30, y: 13 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.scene.start('Menu'));
    overlay.add(menuBtn);
  }
}

// 動態產生（或重用）漸層膠囊按鈕貼圖（Menu / Game 共用）
function makeBtnTexture(scene, kind, w, h) {
  const key = `btn_${kind}_${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const TS = 2, PAD = 14;
  const W = (w + PAD * 2) * TS, H = (h + PAD * 2) * TS, P = PAD * TS, R = (h / 2) * TS;
  const tex = scene.textures.createCanvas(key, W, H);
  const ctx = tex.getContext();
  const grads = {
    fold: ['#b13c3c', '#7c2525'],
    call: ['#2f9d67', '#1d6b46'],
    raise: ['#eccb6f', '#c0983a'],
    dim: ['#37423c', '#242d28'],
    gold: ['#f0d17c', '#c79f3e'],
  };
  const [c1, c2] = grads[kind] || grads.dim;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(P + R, P);
    ctx.lineTo(P + w * TS - R, P); ctx.arcTo(P + w * TS, P, P + w * TS, P + R, R);
    ctx.lineTo(P + w * TS, P + h * TS - R); ctx.arcTo(P + w * TS, P + h * TS, P + w * TS - R, P + h * TS, R);
    ctx.lineTo(P + R, P + h * TS); ctx.arcTo(P, P + h * TS, P, P + h * TS - R, R);
    ctx.lineTo(P, P + R); ctx.arcTo(P, P, P + R, P, R);
    ctx.closePath();
  };
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 10 * TS;
  ctx.shadowOffsetY = 4 * TS;
  const g = ctx.createLinearGradient(0, P, 0, P + h * TS);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  path(); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  // 頂部內光
  ctx.save();
  path(); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2 * TS;
  ctx.beginPath();
  ctx.moveTo(P + R * 0.6, P + 2 * TS);
  ctx.lineTo(P + w * TS - R * 0.6, P + 2 * TS);
  ctx.stroke();
  ctx.restore();
  tex.refresh();
  return key;
}

// 供顯示玩家目前牌型：5~7 張都可評估
function evaluate7fill(hole, community) {
  const cards = hole.concat(community);
  if (cards.length >= 7) return evaluate7(cards.slice(0, 7));
  if (cards.length === 5) {
    const ev = evaluate5(cards);
    return { ...ev, name: HAND_NAMES[ev.cat] };
  }
  let best = null;
  for (let skip = 0; skip < cards.length; skip++) {
    const five = cards.filter((_, i) => i !== skip);
    const ev = evaluate5(five);
    if (!best || ev.score > best.score) best = ev;
  }
  return { ...best, name: HAND_NAMES[best.cat] };
}
