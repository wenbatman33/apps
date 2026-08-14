// 主游戏场景：座位、手牌、底牌、叫分、出牌区、按钮、AI 节奏

(function () {
  const C = window.DdzCards;
  const SEAT_NAMES = ['你', '电脑 A', '电脑 B'];

  class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    init(data) {
      this.difficulty = (data && data.difficulty) || 'normal';
    }

    preload() {
      window.DdzAssets.load(this);
    }

    create() {
      const L = window.LAYOUT, T = window.THEME;
      this.L = L;

      this.cameras.main.setBackgroundColor(T.bg);
      this.drawTable();

      // 分层：出牌区 → 座位 → 手牌 → HUD
      this.playLayer = this.add.container(0, 0);
      this.seatLayer = this.add.container(0, 0);
      this.handLayer = this.add.container(0, 0);
      this.hudLayer = this.add.container(0, 0);

      this.handViews = [];       // 玩家手牌的 CardView
      this.selected = new Set(); // 已选取的牌 id
      this.hintIndex = 0;
      this.playViews = [];
      this.bottomViews = [];     // 底牌展示

      // 限时计分赛：session 存在 registry，跨每局重发牌持续累计
      this.session = this.registry.get('session');
      if (!this.session) {
        this.session = new window.DdzSession({ difficulty: this.difficulty });
        this.registry.set('session', this.session);
      }
      this.difficulty = this.session.difficulty;

      this.buildSeats();
      this.buildTopBar();
      this.buildHint();
      this.buildButtons();
      this.buildBidButtons();

      // DEV 微调会重启场景套用新版面，这里把原本的牌局接回来，不中断对局
      const resume = this.registry.get('resumeGame');
      if (resume) {
        this.registry.remove('resumeGame');
        this.game_ = resume;
        this.game_.handlers = {};   // 旧场景的事件监听已失效，重新绑定
        this.bindGameEvents();
        this.restoreView();
      } else {
        this.game_ = new window.DdzGame({
          difficulty: this.difficulty,
          firstBidder: this.session.nextFirstBidder
        });
        this.bindGameEvents();
        this.game_.start();
      }

      // DEV 面板：按 D 开启
      this.input.keyboard.on('keydown-D', () => window.DevPanel && window.DevPanel.toggle(this));

      this.makeMuteButton();

      // 每局开始先检查时间是否已到
      if (this.session.isTimeUp() && !this.session.ended) this.showSessionEnd();
    }

    // 右上角静音切换，高 depth 让结算画面也能切
    makeMuteButton() {
      const L = this.L;
      const btn = this.add.text(L.width - 46, 40, window.SFX.isMuted() ? '🔇' : '🔊', {
        fontSize: '38px'
      }).setOrigin(0.5).setDepth(3000).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        const m = window.SFX.toggle();
        btn.setText(m ? '🔇' : '🔊');
        if (!m) window.SFX.play('sfx_button');
      });
    }

    // ---------- 顶部计分列 ----------
    buildTopBar() {
      const L = this.L, T = window.THEME;
      const y = L.topbar.y;
      const bar = this.add.container(0, 0);

      // 四栏：计时 · 点数 · 局数 · 倍数
      const mk = (x, label, val, valColor) => {
        const lab = this.add.text(x, y - 18, label, {
          fontFamily: 'system-ui, "PingFang TC", sans-serif',
          fontSize: L.topbar.fontLabel + 'px', color: T.textDim
        }).setOrigin(0.5);
        const value = this.add.text(x, y + 16, val, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: L.topbar.font + 'px', color: valColor || T.text, fontStyle: 'bold'
        }).setOrigin(0.5);
        bar.add([lab, value]);
        return value;
      };

      this.timeText = mk(L.width * 0.14, '剩余时间', '10:00');
      this.chipText = mk(L.width * 0.395, '点数', String(this.session.chips), T.accentHex);
      this.handText = mk(L.width * 0.63, '局数', String(this.session.hands + 1));
      this.multText = mk(L.width * 0.86, '倍数', '×1', T.gold);

      this.hudLayer.add(bar);
      this.updateTopBar();

      // 每 250ms 更新倒数
      this.timerEvent = this.time.addEvent({
        delay: 250, loop: true, callback: () => this.updateTopBar()
      });
    }

    updateTopBar() {
      if (!this.timeText) return;
      const ms = this.session.remainingMs();
      const s = Math.ceil(ms / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      this.timeText.setText(`${mm}:${ss}`);
      // 最后一分钟转红提醒
      this.timeText.setColor(ms <= 60000 ? window.THEME.danger : window.THEME.text);
      this.chipText.setText(String(this.session.chips));
      this.handText.setText(String(this.session.hands + (this.game_ && this.game_.phase === 'over' ? 0 : 1)));
      if (this.game_) this.multText.setText('×' + this.game_.mult);
    }

    // ---------- 静态底图 ----------
    drawTable() {
      const L = window.LAYOUT, T = window.THEME;
      const g = this.add.graphics();
      // 中央一块略亮的桌面区，界定出牌范围，其余留白保持极简
      const t = L.table;
      g.fillStyle(T.table, 1);
      g.fillRoundedRect(t.x, t.y, t.w, t.h, t.radius);
    }

    // ---------- 座位 ----------
    buildSeats() {
      const L = this.L, T = window.THEME;
      const r = L.seatAvatar.r;
      this.seats = [];
      const AV = window.DdzAssets.SEAT_AVATAR;

      for (let i = 0; i < 3; i++) {
        const cfg = L.seats[i];
        const c = this.add.container(cfg.x, cfg.y);

        const ringBg = this.add.graphics();      // 圆底（头像底下）
        ringBg.fillStyle(T.bgAccent, 1).fillCircle(0, 0, r);

        // 头像图：缩到圆内，缺图则不放（退回纯圆圈 + 张数）
        let avatar = null;
        if (AV[i] && this.textures.exists(AV[i])) {
          avatar = this.add.image(0, 0, AV[i]).setOrigin(0.5);
          const d = (r - 3) * 2;
          avatar.setScale(d / Math.max(avatar.width, avatar.height));
        }

        const ring = this.add.graphics();        // 高亮边框（画在头像上层）

        const name = this.add.text(0, -r - 20, SEAT_NAMES[i], {
          fontFamily: 'system-ui, "PingFang TC", sans-serif',
          fontSize: L.seatAvatar.fontName + 'px', color: T.textDim
        }).setOrigin(0.5);

        // 地主/农民 角色标签（叫分结束后显示）
        const role = this.add.text(0, -r - 48, '', {
          fontFamily: 'system-ui, "PingFang TC", sans-serif',
          fontSize: '22px', color: T.gold, fontStyle: 'bold'
        }).setOrigin(0.5);

        // 张数徽章：头像下缘的小药丸，不挡脸
        const badge = this.add.container(0, r - 2);
        const badgeBg = this.add.graphics();
        const bw = 46, bh = 30;
        badgeBg.fillStyle(0x0f1115, 1).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
        badgeBg.lineStyle(2, 0x333a48, 1).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
        const count = this.add.text(0, 0, '17', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px', color: T.text, fontStyle: 'bold'
        }).setOrigin(0.5);
        badge.add([badgeBg, count]);

        // 不要 / 牌型 / 叫分 提示气泡
        const bubble = this.add.text(0, r + 30, '', {
          fontFamily: 'system-ui, "PingFang TC", sans-serif',
          fontSize: 24 + 'px', color: T.accentHex
        }).setOrigin(0.5).setAlpha(0);

        const parts = [ringBg];
        if (avatar) parts.push(avatar);
        parts.push(ring, name, role, badge, bubble);
        c.add(parts);
        this.seatLayer.add(c);
        this.seats.push({ c, ring, ringBg, avatar, name, role, count, badge, bubble });
        this.drawSeatRing(i, false);
      }
      // 自己的座位不画头像：手牌就在下方，只保留讯息气泡与角色标签
      const me = this.seats[0];
      me.ring.setVisible(false);
      me.ringBg.setVisible(false);
      me.name.setVisible(false);
      me.badge.setVisible(false);
      me.bubble.setY(0);
      // 自己的角色标签放手牌左上方，避开气泡与两排手牌
      me.role.setPosition(-256, -60);
    }

    drawSeatRing(i, active) {
      const T = window.THEME, r = this.L.seatAvatar.r;
      const g = this.seats[i].ring;
      g.clear();
      // 只画边框（底色与头像已在下层），轮到该家时用主题绿加粗高亮
      g.lineStyle(active ? 5 : 2, active ? T.accent : 0x333a48, 1).strokeCircle(0, 0, r);
    }

    // 地主确定后更新角色标签
    refreshRoles() {
      const lord = this.game_.landlord;
      for (let i = 0; i < 3; i++) {
        if (lord < 0) { this.seats[i].role.setText(''); continue; }
        const isLord = i === lord;
        this.seats[i].role
          .setText(isLord ? '👑 地主' : '农民')
          .setColor(isLord ? window.THEME.gold : window.THEME.textDim);
      }
    }

    // ---------- 底牌展示 ----------
    renderBottomCards(faceUp) {
      const L = this.L;
      this.bottomViews.forEach(v => v.destroy());
      this.bottomViews = [];
      const cards = this.game_.bottom;
      if (!cards || !cards.length) return;
      const gap = L.bottomCards.gap;
      const startX = L.width / 2 - gap;
      cards.forEach((card, i) => {
        const v = new window.CardView(this, card, faceUp);
        v.setScale(L.bottomCards.scale);
        v.x = startX + i * gap;
        v.y = L.bottomCards.y;
        this.add.existing(v);
        this.hudLayer.add(v);
        this.bottomViews.push(v);
      });
    }

    // ---------- 中央提示 ----------
    buildHint() {
      const L = this.L, T = window.THEME;
      this.hintText = this.add.text(L.width / 2, L.hint.y, '', {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: L.hint.font + 'px', color: T.textDim
      }).setOrigin(0.5);
      this.toastText = this.add.text(L.width / 2, L.toast.y, '', {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: L.toast.font + 'px', color: T.accentHex, fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0);
      this.hudLayer.add([this.hintText, this.toastText]);
    }

    toast(msg, color) {
      this.toastText.setText(msg).setColor(color || window.THEME.accentHex).setAlpha(1);
      this.tweens.killTweensOf(this.toastText);
      this.toastText.y = this.L.toast.y;
      this.tweens.add({
        targets: this.toastText, y: this.L.toast.y - 40, alpha: 0,
        duration: 900, delay: 500, ease: 'Quad.easeIn'
      });
    }

    // ---------- 出牌按钮 ----------
    buildButtons() {
      const L = this.L;
      const total = L.buttons.w * 3 + L.buttons.gap * 2;
      const startX = (L.width - total) / 2 + L.buttons.w / 2;

      this.btnPass = this.makeButton(startX, L.buttons.y, L.buttons.w, '不要', () => this.onPass());
      this.btnHint = this.makeButton(startX + L.buttons.w + L.buttons.gap, L.buttons.y, L.buttons.w, '提示', () => this.onHint());
      this.btnPlay = this.makeButton(startX + (L.buttons.w + L.buttons.gap) * 2, L.buttons.y, L.buttons.w, '出牌', () => this.onPlay());
      this.playBtns = [this.btnPass, this.btnHint, this.btnPlay];
      this.setPlayButtonsVisible(false);
    }

    // ---------- 叫分按钮 ----------
    buildBidButtons() {
      const L = this.L, B = L.bidButtons;
      const labels = ['不叫', '1 分', '2 分', '3 分'];
      const total = B.w * 4 + B.gap * 3;
      const startX = (L.width - total) / 2 + B.w / 2;
      this.bidBtns = labels.map((label, i) =>
        this.makeButton(startX + i * (B.w + B.gap), L.buttons.y, B.w, label, () => this.onBid(i))
      );
      this.setBidButtonsVisible(false);
    }

    setPlayButtonsVisible(v) {
      this.playBtns.forEach(b => b.c.setVisible(v));
    }

    setBidButtonsVisible(v) {
      this.bidBtns.forEach(b => b.c.setVisible(v));
    }

    makeButton(x, y, w, label, onClick) {
      const L = this.L.buttons, T = window.THEME;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      const t = this.add.text(0, 0, label, {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: L.font + 'px', color: T.text, fontStyle: 'bold'
      }).setOrigin(0.5);
      c.add([g, t]);
      c.setSize(w, L.h).setInteractive(
        new Phaser.Geom.Rectangle(0, 0, w, L.h),
        Phaser.Geom.Rectangle.Contains
      );
      c.on('pointerdown', () => {
        if (c.getData('disabled')) return;
        window.SFX.play('sfx_button');
        // 只缩放内容物：若缩放 container 本身，点击判定区会跟著缩小，边缘会点不到
        this.tweens.add({ targets: [g, t], scale: 0.94, duration: 70, yoyo: true });
        onClick();
      });

      const btn = { c, g, t, w, primary: false };
      this.hudLayer.add(c);
      this.styleButton(btn, true);
      return btn;
    }

    styleButton(btn, enabled, primary) {
      const L = this.L.buttons, T = window.THEME;
      btn.c.setData('disabled', !enabled);
      const g = btn.g, w = btn.w;
      g.clear();
      if (primary && enabled) {
        g.fillStyle(T.accent, 1).fillRoundedRect(-w / 2, -L.h / 2, w, L.h, L.radius);
        btn.t.setColor('#0f1115');
      } else {
        g.fillStyle(T.bgAccent, enabled ? 1 : 0.5).fillRoundedRect(-w / 2, -L.h / 2, w, L.h, L.radius);
        g.lineStyle(2, 0x333a48, enabled ? 1 : 0.4).strokeRoundedRect(-w / 2, -L.h / 2, w, L.h, L.radius);
        btn.t.setColor(enabled ? T.text : T.textDim);
      }
      btn.c.setAlpha(enabled ? 1 : 0.55);
    }

    // ---------- 游戏事件绑定 ----------
    bindGameEvents() {
      const g = this.game_;

      g.on('start', () => {
        window.SFX.play('sfx_deal');
        this.clearPlayArea();
        this.selected.clear();
        // 重发牌（全不叫）时清掉旧的叫分气泡
        this.seats.forEach(seat => {
          this.tweens.killTweensOf(seat.bubble);
          seat.bubble.setAlpha(0);
        });
        this.renderHand(true);
        this.updateCounts();
        this.renderBottomCards(false);
        this.refreshRoles();
        this.updateTopBar();
      });

      g.on('bidTurn', ({ player }) => {
        for (let i = 0; i < 3; i++) this.drawSeatRing(i, i === player);
        const bid = g.bid;
        this.hintText.setText(bid > 0
          ? `叫地主 · 目前最高 ${bid} 分`
          : '叫地主 · 谁先叫分谁优先');
        if (player === 0) {
          window.SFX.play('sfx_turn');
          this.showBidChoices();
        } else {
          this.setBidButtonsVisible(false);
          this.scheduleAIBid(player);
        }
      });

      g.on('bid', ({ player, score }) => {
        window.SFX.play(score > 0 ? 'sfx_play' : 'sfx_pass');
        // 叫分结果持续挂在座位旁（不淡出），地主确定后才清掉
        const b = this.seats[player].bubble;
        this.tweens.killTweensOf(b);
        b.setText(score > 0 ? `叫 ${score} 分！` : '不叫')
          .setColor(score > 0 ? window.THEME.gold : window.THEME.textDim)
          .setAlpha(1);
      });

      g.on('redeal', () => {
        this.toast('都不叫，重新发牌', window.THEME.textDim);
      });

      g.on('landlord', ({ player, bid }) => {
        this.setBidButtonsVisible(false);
        // 清掉叫分阶段留在座位旁的「不叫 / 叫 x 分」
        this.seats.forEach(seat => {
          this.tweens.killTweensOf(seat.bubble);
          seat.bubble.setAlpha(0);
        });
        window.SFX.play('sfx_coin');
        this.toast(`${SEAT_NAMES[player]} 当地主（${bid} 分）`, window.THEME.gold);
        this.refreshRoles();
        this.renderBottomCards(true);
        if (player === 0) this.renderHand(false);
        this.updateCounts();
      });

      g.on('turn', ({ player }) => {
        for (let i = 0; i < 3; i++) this.drawSeatRing(i, i === player);
        if (player === 0) { window.SFX.play('sfx_turn'); this.beginPlayerTurn(); }
        else { this.setPlayButtonsVisible(false); this.scheduleAI(player); }
      });

      g.on('play', ({ player, cards, name, remaining }) => {
        window.SFX.play('sfx_play');
        this.showPlay(player, cards, name);
        this.updateCounts();
        if (player === 0) {
          this.selected.clear();
          this.renderHand();
        }
        if (remaining === 1) this.bubble(player, '剩一张！', window.THEME.danger);
        if (remaining === 2) this.bubble(player, '剩两张', window.THEME.danger);
      });

      g.on('bomb', ({ mult }) => {
        this.updateTopBar();
        this.toast(`💥 倍数 ×${mult}`, window.THEME.gold);
      });

      // 炸弹 / 王炸 的视觉特效
      g.on('play', ({ ev }) => {
        if (ev.type === 'rocket') this.rocketEffect();
        else if (ev.type === 'bomb') this.bombEffect();
      });

      g.on('pass', ({ player }) => { window.SFX.play('sfx_pass'); this.bubble(player, '不要'); });
      g.on('trickEnd', () => {
        // 一轮结束：清掉台面，换人自由出牌
        this.clearPlayArea();
        this.hintText.setText('');
      });
      g.on('invalid', ({ player, reason }) => {
        if (player === 0) this.toast(reason, window.THEME.danger);
      });
      g.on('over', payload => this.showResult(payload));
    }

    // ---------- 叫分互动 ----------
    showBidChoices() {
      this.setPlayButtonsVisible(false);
      this.setBidButtonsVisible(true);
      const bid = this.game_.bid;
      this.bidBtns.forEach((btn, score) => {
        const enabled = score === 0 || score > bid;
        this.styleButton(btn, enabled, score === 3);
      });
      this.hintText.setText(bid > 0
        ? `轮到你 · 要抢地主吗？（目前 ${bid} 分）`
        : '轮到你 · 要叫地主吗？');
    }

    onBid(score) {
      if (this.game_.phase !== 'bidding' || this.game_.turn !== 0) return;
      this.setBidButtonsVisible(false);
      this.game_.callBid(0, score);
    }

    scheduleAIBid(player) {
      const delay = this.L.ai.bidDelay + Phaser.Math.Between(0, 300);
      this.time.delayedCall(delay, () => {
        if (this.game_.phase !== 'bidding' || this.game_.turn !== player) return;
        this.game_.callBid(player, this.game_.aiBid(player));
      });
    }

    // ---------- 手牌 ----------
    renderHand(animate) {
      const L = this.L;
      const hand = this.game_.hands[0];

      // 重建（张数变动时最单纯可靠）
      this.handViews.forEach(v => v.destroy());
      this.handViews = [];

      // 张数多时分两排（上排在前、下排在后），每排间距各自拉到最大
      const twoRows = hand.length >= (L.hand.twoRowMin || 12);
      const half = Math.ceil(hand.length / 2);
      const rows = twoRows ? [hand.slice(0, half), hand.slice(half)] : [hand];
      const rowGap = L.hand.rowGap || 80;

      let idx = 0;
      rows.forEach((row, r) => {
        const rowY = L.hand.y - (rows.length - 1 - r) * rowGap;
        const fit = (L.hand.maxWidth - L.card.w) / Math.max(1, row.length - 1);
        const step = Math.max(20, Math.min(L.card.w - L.hand.overlap, fit));
        const totalW = L.card.w + step * (row.length - 1);
        const startX = (L.width - totalW) / 2 + L.card.w / 2;

        row.forEach((card, i) => {
          const v = new window.CardView(this, card, true);
          v.setCompact(true);
          v.x = startX + step * i;
          v.y = rowY;
          v.baseY = rowY;           // 选取上移/复位的基准
          v.setDepth(idx);
          v.enableInput(view => this.onCardTap(view));
          this.add.existing(v);
          this.handLayer.add(v);
          this.handViews.push(v);

          if (animate) {
            v.y = rowY + 220;
            v.alpha = 0;
            this.tweens.add({
              targets: v, y: rowY, alpha: 1,
              duration: 320, delay: idx * 22, ease: 'Cubic.easeOut'
            });
          }
          idx++;
        });
      });

      this.refreshSelection();
    }

    onCardTap(view) {
      if (this.game_.turn !== 0 || this.game_.phase !== 'playing') return;
      window.SFX.play('sfx_select');
      const id = view.card.id;
      if (this.selected.has(id)) this.selected.delete(id);
      else this.selected.add(id);
      this.hintIndex = 0;
      this.refreshSelection();
    }

    refreshSelection() {
      const L = this.L;
      this.handViews.forEach(v => {
        const on = this.selected.has(v.card.id);
        v.setSelected(on);
        const baseY = v.baseY != null ? v.baseY : L.hand.y;
        const targetY = baseY - (on ? L.hand.liftY : 0);
        if (v.y !== targetY) {
          this.tweens.add({ targets: v, y: targetY, duration: 110, ease: 'Quad.easeOut' });
        }
      });
      this.updateButtons();
    }

    selectedCards() {
      return this.game_.hands[0].filter(c => this.selected.has(c.id));
    }

    // ---------- 玩家回合 ----------
    beginPlayerTurn() {
      this.selected.clear();
      this.hintIndex = 0;
      this.setBidButtonsVisible(false);
      this.setPlayButtonsVisible(true);
      const moves = this.game_.legalMoves(0);
      this.playerMoves = moves;

      // 标示哪些牌完全出不掉，淡化处理
      // 用「点数」判定：同点数的牌可互换，避免两张一样的牌一亮一暗
      const usableRanks = new Set();
      moves.forEach(m => m.cards.forEach(c => usableRanks.add(c.rank)));
      this.handViews.forEach(v => v.setPlayable(usableRanks.has(v.card.rank)));

      if (moves.length === 0) {
        // 没牌可出：自动不要，维持节奏不卡顿
        this.hintText.setText('你没有能压过的牌');
        this.updateButtons();
        this.time.delayedCall(750, () => {
          if (this.game_.turn === 0 && this.game_.phase === 'playing') this.game_.pass(0);
        });
        return;
      }

      const last = this.game_.last;
      const meLord = this.game_.landlord === 0;
      this.hintText.setText(last
        ? `轮到你 · 需压过 ${C.comboName(last.ev)}`
        : `轮到你 · 自由出牌${meLord ? '（你是地主）' : ''}`);
      this.refreshSelection();
    }

    updateButtons() {
      const myTurn = this.game_.turn === 0 && this.game_.phase === 'playing';
      const sel = this.selectedCards();
      const check = myTurn && sel.length ? this.game_.validate(0, sel) : { ok: false };
      const canPass = myTurn && !this.game_.isFreeLead();
      const hasMoves = myTurn && this.playerMoves && this.playerMoves.length > 0;

      this.styleButton(this.btnPlay, !!check.ok, true);
      this.styleButton(this.btnPass, canPass, false);
      this.styleButton(this.btnHint, hasMoves, false);

      // 选了牌但组不成合法牌型时，按钮上直接显示牌型名称
      const ev = sel.length ? C.evaluate(sel) : null;
      this.btnPlay.t.setText(check.ok ? `出 ${C.comboName(ev)}` : '出牌');
    }

    onPlay() {
      const sel = this.selectedCards();
      if (!sel.length) return;
      this.game_.play(0, sel);
    }

    onPass() {
      this.game_.pass(0);
    }

    // 提示：循环套用所有可出的牌
    onHint() {
      const moves = this.playerMoves || [];
      if (!moves.length) return;
      const m = moves[this.hintIndex % moves.length];
      this.hintIndex++;
      this.selected = new Set(m.cards.map(c => c.id));
      this.refreshSelection();
    }

    // ---------- AI ----------
    scheduleAI(player) {
      const L = this.L.ai;
      const delay = Phaser.Math.Between(L.thinkMin, L.thinkMax);
      this.time.delayedCall(delay, () => {
        if (this.game_.phase !== 'playing' || this.game_.turn !== player) return;
        const cards = this.game_.aiMove(player);
        if (cards) this.game_.play(player, cards);
        else this.game_.pass(player);
      });
    }

    // ---------- 出牌区 ----------
    showPlay(player, cards, name) {
      const L = this.L;
      this.clearPlayArea();

      // 张数多（飞机/顺子）时自动加大重叠，塞进出牌区
      const fit = (L.play.maxWidth - L.card.w) / Math.max(1, cards.length - 1);
      const step = Math.max(24, Math.min(L.card.w - L.play.overlap, fit));
      const totalW = L.card.w + step * (cards.length - 1);
      const startX = (L.width - totalW) / 2 + L.card.w / 2;
      const from = L.seats[player];

      cards.forEach((card, i) => {
        const v = new window.CardView(this, card, true);
        v.setScale(L.play.scale);
        if (cards.length > 6) v.setCompact(true);
        // 从出牌者的座位飞到中央，方向感清楚
        v.x = from.x; v.y = from.y;
        v.alpha = 0.2;
        v.setDepth(i);
        this.add.existing(v);
        this.playLayer.add(v);
        this.playViews.push(v);

        this.tweens.add({
          targets: v,
          x: startX + step * i, y: L.play.y, alpha: 1,
          duration: L.ai.playAnim, delay: i * 30, ease: 'Cubic.easeOut'
        });
      });

      this.hintText.setText(`${SEAT_NAMES[player]} · ${name}`);
      this.bubble(player, name);
    }

    // ---------- 炸弹 / 王炸 特效 ----------
    // 炸弹：中央爆炸图（缺图退回 💥）爆开 + 火花四射 + 震屏
    bombEffect() {
      const L = this.L;
      const x = L.width / 2, y = L.play.y;
      this.cameras.main.shake(250, 0.012);

      let boom;
      if (this.textures.exists('fx_boom')) {
        boom = this.add.image(x, y, 'fx_boom').setOrigin(0.5).setDepth(900);
        boom.setScale((L.width * 0.24) / boom.width);
        this.tweens.add({
          targets: boom, scale: (L.width * 0.9) / boom.width, alpha: 0,
          duration: 680, ease: 'Cubic.easeOut', onComplete: () => boom.destroy()
        });
      } else {
        boom = this.add.text(x, y, '💥', { fontSize: '96px' })
          .setOrigin(0.5).setDepth(900).setScale(0.3);
        this.tweens.add({
          targets: boom, scale: 3.2, alpha: 0, duration: 620,
          ease: 'Cubic.easeOut', onComplete: () => boom.destroy()
        });
      }

      for (let i = 0; i < 12; i++) {
        const p = this.add.text(x, y, i % 3 === 0 ? '🔥' : '✦', {
          fontSize: '34px', color: '#fbbf24'
        }).setOrigin(0.5).setDepth(899);
        const ang = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 130 + Math.random() * 170;
        this.tweens.add({
          targets: p,
          x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist,
          alpha: 0, angle: Phaser.Math.Between(-180, 180),
          duration: 480 + Math.random() * 260,
          ease: 'Quad.easeOut', onComplete: () => p.destroy()
        });
      }
    }

    // 王炸：大火箭图从画面下方点火升空冲出顶端（缺图退回 🚀）+ 尾焰烟雾 + 震屏
    rocketEffect() {
      const L = this.L;
      const x = L.width / 2;
      this.cameras.main.shake(420, 0.009);

      let rocket, rocketH;
      if (this.textures.exists('fx_rocket')) {
        rocket = this.add.image(x, 0, 'fx_rocket').setOrigin(0.5).setDepth(900);
        rocket.setScale((L.width * 0.42) / rocket.width);
        rocketH = rocket.height * rocket.scaleY;
        rocket.y = L.height + rocketH / 2;          // 从画面底下整支升起
        // 先缓慢点火抬升，再加速冲出画面顶端
        this.tweens.chain({
          targets: rocket,
          tweens: [
            { y: L.play.y + rocketH * 0.1, duration: 700, ease: 'Quad.easeOut' },
            { y: -rocketH, duration: 820, ease: 'Cubic.easeIn' }
          ],
          onComplete: () => rocket.destroy()
        });
        // 升空时左右微晃，像引擎在抖
        this.tweens.add({
          targets: rocket, x: x + 6, duration: 60,
          yoyo: true, repeat: 20
        });
      } else {
        rocket = this.add.text(x, L.play.y + 130, '🚀', { fontSize: '84px' })
          .setOrigin(0.5).setDepth(900).setAngle(-45);
        rocketH = 100;
        this.tweens.add({
          targets: rocket, y: -140, duration: 950,
          ease: 'Cubic.easeIn', onComplete: () => rocket.destroy()
        });
      }

      // 尾焰与烟雾：跟著火箭尾部一路喷
      this.time.addEvent({
        delay: 45, repeat: 30,
        callback: () => {
          if (!rocket.active) return;
          const tailY = rocket.y + (rocketH ? rocketH * 0.42 : 46);
          const f = this.add.text(
            rocket.x + Phaser.Math.Between(-22, 22), tailY,
            Math.random() < 0.45 ? '🔥' : (Math.random() < 0.5 ? '💨' : '✨'),
            { fontSize: Math.round(26 + Math.random() * 16) + 'px' }
          ).setOrigin(0.5).setDepth(899);
          this.tweens.add({
            targets: f,
            y: f.y + 90 + Math.random() * 60,
            x: f.x + Phaser.Math.Between(-30, 30),
            alpha: 0, scale: 0.4,
            duration: 420, onComplete: () => f.destroy()
          });
        }
      });
    }

    clearPlayArea() {
      this.playViews.forEach(v => {
        this.tweens.add({
          targets: v, alpha: 0, scale: v.scale * 0.9, duration: 180,
          onComplete: () => v.destroy()
        });
      });
      this.playViews = [];
    }

    bubble(player, text, color) {
      const b = this.seats[player].bubble;
      b.setText(text).setColor(color || window.THEME.accentHex).setAlpha(1);
      this.tweens.killTweensOf(b);
      this.tweens.add({ targets: b, alpha: 0, duration: 600, delay: 700 });
    }

    updateCounts() {
      for (let i = 1; i < 3; i++) {
        this.seats[i].count.setText(String(this.game_.hands[i].length));
      }
    }

    // ---------- 单局结算 ----------
    showResult({ winner, landlordWin, spring, mult }) {
      const L = this.L, T = window.THEME;
      const settled = this.game_.settle();
      const net = this.session.applyResult(settled);
      this.updateTopBar();
      this.setPlayButtonsVisible(false);

      // 胜负音效；净赚再补一个金币声
      window.SFX.play(net >= 0 ? 'sfx_win' : 'sfx_lose');
      if (net > 0) this.time.delayedCall(260, () => window.SFX.play('sfx_coin'));

      const overlay = this.add.container(0, 0).setDepth(1000);
      const bg = this.add.graphics();
      bg.fillStyle(0x0b0d12, 0.94).fillRect(0, 0, L.width, L.height);
      overlay.add(bg);

      // 胜方小动画：地主赢下金币皇冠雨、农民赢下彩带庆祝雨
      this.winAnimation(overlay, landlordWin);

      // 胜方庆祝图（生图素材，缺图时只显示文字标题）
      this.addWinImage(overlay, landlordWin, 218);

      const title = landlordWin ? '👑 地主获胜' : '🌾 农民获胜';
      const titleText = this.add.text(L.width / 2, 380, title, {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '60px', color: net > 0 ? T.accentHex : T.text, fontStyle: 'bold'
      }).setOrigin(0.5).setScale(0.2);
      overlay.add(titleText);
      // 标题弹跳进场
      this.tweens.add({ targets: titleText, scale: 1, duration: 420, ease: 'Back.easeOut' });

      if (spring) {
        overlay.add(this.add.text(L.width / 2, 452, '🌸 春天！倍数再 ×2', {
          fontFamily: 'system-ui, "PingFang TC", sans-serif',
          fontSize: '30px', color: T.gold, fontStyle: 'bold'
        }).setOrigin(0.5));
      }

      // 本局净得分（大字，正绿负红）
      const sign = net > 0 ? '+' : (net < 0 ? '' : '±');
      overlay.add(this.add.text(L.width / 2, 545, `${sign}${net}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '76px', fontStyle: 'bold',
        color: net > 0 ? T.accentHex : (net < 0 ? T.danger : T.textDim)
      }).setOrigin(0.5));

      // 计分明细：叫分 × 倍数 × 10
      overlay.add(this.add.text(L.width / 2, 625,
        `叫分 ${settled.bid} × 倍数 ${mult} × 10 = 每家 ${settled.pts} 点`, {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '26px', color: T.textDim
      }).setOrigin(0.5));

      // 各家明细
      for (let i = 0; i < 3; i++) {
        const isLord = i === this.game_.landlord;
        const iWin = isLord ? landlordWin : !landlordWin;
        const delta = (isLord ? 2 : 1) * settled.pts * (iWin ? 1 : -1);
        const n = this.game_.hands[i].length;
        const roleTxt = isLord ? '地主' : '农民';
        const midTxt = n === 0 ? '出完' : `剩 ${n} 张`;
        overlay.add(this.add.text(L.width / 2, 700 + i * 54,
          `${SEAT_NAMES[i]}（${roleTxt}）　${midTxt}　${delta > 0 ? '+' : ''}${delta}`, {
          fontFamily: 'system-ui, "PingFang TC", sans-serif',
          fontSize: '28px', color: iWin ? T.accentHex : T.textDim
        }).setOrigin(0.5));
      }

      // 遮罩立即不透明（可见性不依赖 tween 完成），内容小幅上浮做点缀
      overlay.setAlpha(1);
      overlay.y = 20;
      this.tweens.add({ targets: overlay, y: 0, duration: 220, ease: 'Quad.easeOut' });

      // 时间到就直接结算整场；否则自动接下一局（也可点画面立刻开始）
      if (this.session.isTimeUp()) {
        this.time.delayedCall(1400, () => this.showSessionEnd());
        return;
      }

      const cont = this.add.text(L.width / 2, 960, '下一局 ▸', {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '34px', color: T.text, fontStyle: 'bold'
      }).setOrigin(0.5);
      overlay.add(cont);

      let advanced = false;
      const next = () => {
        if (advanced) return;
        advanced = true;
        this.scene.restart({ difficulty: this.difficulty });
      };
      // 自动 2.8 秒后发下一局，保持流畅；也可点整个画面立即继续
      const auto = this.time.delayedCall(2800, next);
      bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, L.width, L.height),
        Phaser.Geom.Rectangle.Contains);
      bg.on('pointerdown', () => { auto.remove(); next(); });
    }

    // DEV 面板展示用：只播胜利动画与标题，不动计分，3.5 秒后自动收掉
    demoWin(landlordWin) {
      const L = this.L, T = window.THEME;
      const ov = this.add.container(0, 0).setDepth(1500);
      const bg = this.add.graphics();
      bg.fillStyle(0x0b0d12, 0.9).fillRect(0, 0, L.width, L.height);
      ov.add(bg);
      this.winAnimation(ov, landlordWin);
      this.addWinImage(ov, landlordWin, 240);
      const t = this.add.text(L.width / 2, 420,
        landlordWin ? '👑 地主获胜' : '🌾 农民获胜', {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '60px', color: T.accentHex, fontStyle: 'bold'
      }).setOrigin(0.5).setScale(0.2);
      ov.add(t);
      this.tweens.add({ targets: t, scale: 1, duration: 420, ease: 'Back.easeOut' });
      window.SFX.play('sfx_win');
      this.time.delayedCall(3500, () => ov.destroy());
    }

    // 胜方庆祝图：弹跳进场（地主/农民各一张生图素材）
    addWinImage(overlay, landlordWin, y) {
      const key = landlordWin ? 'fx_win_lord' : 'fx_win_farmer';
      if (!this.textures.exists(key)) return;
      const L = this.L;
      const img = this.add.image(L.width / 2, y, key).setOrigin(0.5);
      const target = (L.width * 0.46) / img.width;
      img.setScale(target * 0.2);
      overlay.add(img);
      this.tweens.add({ targets: img, scale: target, duration: 480, ease: 'Back.easeOut' });
    }

    // 胜方庆祝雨：从画面顶端撒下表情符号，旋转飘落
    winAnimation(overlay, landlordWin) {
      const L = this.L;
      const icons = landlordWin ? ['👑', '🪙', '💰', '✨'] : ['🎉', '🎊', '🌾', '✨'];
      for (let i = 0; i < 26; i++) {
        const e = this.add.text(
          Phaser.Math.Between(30, L.width - 30),
          -60 - Math.random() * 320,
          icons[i % icons.length],
          { fontSize: Math.round(26 + Math.random() * 24) + 'px' }
        ).setOrigin(0.5);
        overlay.add(e);
        this.tweens.add({
          targets: e,
          y: L.height + 80,
          angle: Phaser.Math.Between(-240, 240),
          duration: 1700 + Math.random() * 1500,
          delay: Math.random() * 700,
          ease: 'Linear',
          onComplete: () => e.destroy()
        });
      }
    }

    // ---------- 整场（10 分钟）结算 ----------
    showSessionEnd() {
      if (this.session.ended) return;
      this.session.ended = true;
      const L = this.L, T = window.THEME;
      if (this.timerEvent) this.timerEvent.remove();
      window.SFX.play('sfx_finish');
      // 整場有賺就補一段收籌碼聲
      if (this.session.netTotal() > 0) {
        this.time.delayedCall(400, () => window.SFX.play('sfx_chips'));
      }

      // 立即收起牌桌与可能还在的单局 overlay，确保结算画面干净（不依赖 tween）
      [this.handLayer, this.playLayer, this.seatLayer, this.hudLayer].forEach(layer => {
        if (layer) layer.setVisible(false);
      });
      this.children.list.filter(o => o.depth >= 1000 && o.depth < 3000).forEach(o => o.destroy());

      const overlay = this.add.container(0, 0).setDepth(2000);
      const bg = this.add.graphics();
      bg.fillStyle(0x0b0d12, 1).fillRect(0, 0, L.width, L.height);
      overlay.add(bg);

      const net = this.session.netTotal();
      overlay.add(this.add.text(L.width / 2, 360, '10 分钟结算', {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '44px', color: T.textDim
      }).setOrigin(0.5));

      const win = net > 0;
      overlay.add(this.add.text(L.width / 2, 470, win ? '净赚' : (net < 0 ? '净赔' : '打平'), {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '40px', color: win ? T.accentHex : (net < 0 ? T.danger : T.text), fontStyle: 'bold'
      }).setOrigin(0.5));

      overlay.add(this.add.text(L.width / 2, 580, `${net > 0 ? '+' : ''}${net}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '110px', fontStyle: 'bold',
        color: win ? T.accentHex : (net < 0 ? T.danger : T.textDim)
      }).setOrigin(0.5));

      const rows = [
        `最终点数　${this.session.chips}`,
        `完成局数　${this.session.hands} 局`,
        `获胜　${this.session.wins} 局　胜率 ${this.session.hands ? Math.round(this.session.wins / this.session.hands * 100) : 0}%`,
        `当地主　${this.session.landlordCount} 次`,
        `单局最高　+${this.session.best}`
      ];
      rows.forEach((r, i) => {
        overlay.add(this.add.text(L.width / 2, 730 + i * 52, r, {
          fontFamily: 'system-ui, "PingFang TC", sans-serif',
          fontSize: '32px', color: T.textDim
        }).setOrigin(0.5));
      });

      const again = this.add.container(L.width / 2, 1070);
      const ag = this.add.graphics();
      ag.fillStyle(T.accent, 1).fillRoundedRect(-170, -46, 340, 92, 46);
      again.add([ag, this.add.text(0, 0, '再玩 10 分钟', {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '34px', color: '#0f1115', fontStyle: 'bold'
      }).setOrigin(0.5)]);
      again.setSize(340, 92).setInteractive(
        new Phaser.Geom.Rectangle(0, 0, 340, 92), Phaser.Geom.Rectangle.Contains);
      again.on('pointerdown', () => {
        this.registry.remove('session');
        this.scene.restart({ difficulty: this.difficulty });
      });
      overlay.add(again);

      const menu = this.add.text(L.width / 2, 1180, '回主选单', {
        fontFamily: 'system-ui, "PingFang TC", sans-serif',
        fontSize: '28px', color: T.textDim
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      menu.on('pointerdown', () => {
        this.registry.remove('session');
        this.scene.start('Menu');
      });
      overlay.add(menu);

      overlay.y = 24;
      this.tweens.add({ targets: overlay, y: 0, duration: 260, ease: 'Quad.easeOut' });
    }

    // 依目前局面把画面重建（DEV 微调重启场景后接续用）
    restoreView() {
      const g = this.game_;
      this.renderHand(false);
      this.updateCounts();
      this.renderBottomCards(g.phase === 'playing' || g.phase === 'over');
      this.refreshRoles();
      for (let i = 0; i < 3; i++) this.drawSeatRing(i, i === g.turn);

      if (g.phase === 'bidding') {
        if (g.turn === 0) this.showBidChoices();
        else this.scheduleAIBid(g.turn);
        return;
      }
      if (g.last) {
        this.showPlay(g.last.player, g.last.cards, C.comboName(g.last.ev));
      }
      if (g.phase !== 'playing') return;
      if (g.turn === 0) this.beginPlayerTurn();
      else this.scheduleAI(g.turn);
    }

    // 给 DEV 面板呼叫：套用新版面数值，但保留目前牌局
    relayout() {
      this.registry.set('resumeGame', this.game_);
      this.scene.restart({ difficulty: this.difficulty });
    }
  }

  window.GameScene = GameScene;
})();
