// 單張牌的顯示物件（用 Graphics 繪製，不需要美術素材，改尺寸即時重繪）
// 支援大小王：左上顯示「小/大」，中央畫「王」字

(function () {
  const C = window.DdzCards;

  class CardView extends Phaser.GameObjects.Container {
    constructor(scene, card, faceUp = true) {
      super(scene, 0, 0);
      this.card = card;
      this.faceUp = faceUp;
      this.selected = false;
      this.playable = true;
      // compact：手牌因為互相重疊，只顯示左上角點數，避免中央花色被蓋住變雜亂
      this.compact = false;

      this.gfx = scene.add.graphics();
      this.add(this.gfx);

      const L = window.LAYOUT.card;
      this.txtRank = scene.add.text(0, 0, '', {
        fontFamily: 'system-ui, -apple-system, "PingFang TC", sans-serif',
        fontSize: L.fontRank + 'px', fontStyle: 'bold'
      }).setOrigin(0, 0);
      this.txtSuit = scene.add.text(0, 0, '', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: L.fontSuit + 'px'
      }).setOrigin(0, 0);
      this.txtCenter = scene.add.text(0, 0, '', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: L.fontCenter + 'px'
      }).setOrigin(0.5, 0.5);
      this.add([this.txtRank, this.txtSuit, this.txtCenter]);

      this.redraw();
    }

    isJoker() { return this.card.rank >= C.RANK_SJ; }

    setFaceUp(v) { this.faceUp = v; this.redraw(); return this; }

    setCompact(v) { this.compact = v; this.redraw(); return this; }

    setSelected(v) {
      if (this.selected === v) return this;
      this.selected = v;
      this.redraw();
      return this;
    }

    // 標記這張牌在目前局面下是否可能出得掉（不可出時淡化）
    setPlayable(v) {
      if (this.playable === v) return this;
      this.playable = v;
      this.redraw();
      return this;
    }

    redraw() {
      const L = window.LAYOUT.card;
      const T = window.THEME;
      const w = L.w, h = L.h, r = L.radius;
      const g = this.gfx;
      g.clear();

      if (!this.faceUp) {
        // 牌背：極簡雙色圓角 + 一條斜線
        g.fillStyle(T.cardBack, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
        g.lineStyle(2, T.cardBackLine, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
        g.lineStyle(3, T.cardBackLine, 0.9)
          .lineBetween(-w / 2 + 16, h / 2 - 16, w / 2 - 16, -h / 2 + 16);
        this.txtRank.setVisible(false);
        this.txtSuit.setVisible(false);
        this.txtCenter.setVisible(false);
        return;
      }

      // 出不掉的牌改用「不透明」灰階卡面：半透明卡面會透出下層牌、疊出奇怪的條紋
      const textAlpha = 1;
      g.fillStyle(this.playable ? T.cardFace : T.cardFaceDim, 1)
        .fillRoundedRect(-w / 2, -h / 2, w, h, r);
      // 每張牌描一圈細框，重疊與上下兩排時才有層次、看得出一張一張
      if (this.selected) {
        g.lineStyle(5, T.selected, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
      } else {
        g.lineStyle(2, this.playable ? 0xb9bfca : 0x7e8592, 1)
          .strokeRoundedRect(-w / 2, -h / 2, w, h, r);
      }

      if (this.isJoker()) {
        const big = this.card.rank === C.RANK_BJ;
        const color = big ? window.THEME.suitRed : window.THEME.suitDark;
        this.txtRank.setVisible(true)
          .setFontSize(Math.round(L.fontRank * 0.8))
          .setColor(color)
          .setAlpha(textAlpha)
          .setText(big ? '大' : '小')
          .setPosition(-w / 2 + 10, -h / 2 + 8);
        this.txtSuit.setVisible(true)
          .setFontSize(Math.round(L.fontRank * 0.8))
          .setColor(color)
          .setAlpha(textAlpha)
          .setText('王')
          .setPosition(-w / 2 + 10, -h / 2 + 8 + L.fontRank * 0.8);
        this.txtCenter.setVisible(!this.compact)
          .setFontSize(L.fontCenter)
          .setColor(color)
          .setAlpha(textAlpha * 0.9)
          .setText('🃏')
          .setPosition(0, h * 0.16);
        return;
      }

      const red = this.card.suit === 1 || this.card.suit === 2; // ♦ ♥
      const color = red ? window.THEME.suitRed : window.THEME.suitDark;

      this.txtRank.setVisible(true)
        .setFontSize(L.fontRank)
        .setColor(color)
        .setAlpha(textAlpha)
        .setText(C.RANKS[this.card.rank])
        .setPosition(-w / 2 + 10, -h / 2 + 8);

      this.txtSuit.setVisible(true)
        .setFontSize(L.fontSuit)
        .setColor(color)
        .setAlpha(textAlpha)
        .setText(C.SUITS[this.card.suit])
        .setPosition(-w / 2 + 10, -h / 2 + 8 + L.fontRank * 0.95);

      this.txtCenter.setVisible(!this.compact)
        .setFontSize(L.fontCenter)
        .setColor(color)
        .setAlpha(textAlpha * 0.9)
        .setText(C.SUITS[this.card.suit])
        .setPosition(0, h * 0.16);
    }

    // 讓整張牌可點。點擊區往下延伸 liftY：牌被選取而上移後，
    // 原本的位置仍然點得到，取消選取時不會點空
    enableInput(handler) {
      const L = window.LAYOUT.card;
      const lift = window.LAYOUT.hand.liftY;
      this.setSize(L.w, L.h);
      // 注意：Phaser 判定 Container 命中時會先把座標加上 displayOrigin（= 寬高的一半），
      // 所以 hitArea 要從 (0,0) 起算，不能寫成 (-w/2, -h/2)，否則整個判定區會偏掉半張牌
      this.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, L.w, L.h + lift),
        Phaser.Geom.Rectangle.Contains
      );
      this.input.cursor = 'pointer';
      this.on('pointerdown', () => handler(this));
      return this;
    }
  }

  window.CardView = CardView;
})();
