// 单张牌的显示物件（用 Graphics 绘制，不需要美术素材，改尺寸即时重绘）

(function () {
  const C = window.BigTwoCards;

  class CardView extends Phaser.GameObjects.Container {
    constructor(scene, card, faceUp = true) {
      super(scene, 0, 0);
      this.card = card;
      this.faceUp = faceUp;
      this.selected = false;
      this.playable = true;
      // compact：手牌因为互相重叠，只显示左上角点数，避免中央花色被盖住变杂乱
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

    setFaceUp(v) { this.faceUp = v; this.redraw(); return this; }

    setCompact(v) { this.compact = v; this.redraw(); return this; }

    setSelected(v) {
      if (this.selected === v) return this;
      this.selected = v;
      this.redraw();
      return this;
    }

    // 标记这张牌在目前局面下是否可能出得掉（不可出时淡化）
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
        // 牌背：极简双色圆角 + 一条斜线
        g.fillStyle(T.cardBack, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
        g.lineStyle(2, T.cardBackLine, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
        g.lineStyle(3, T.cardBackLine, 0.9)
          .lineBetween(-w / 2 + 16, h / 2 - 16, w / 2 - 16, -h / 2 + 16);
        this.txtRank.setVisible(false);
        this.txtSuit.setVisible(false);
        this.txtCenter.setVisible(false);
        return;
      }

      // 出不掉的牌把卡面压暗，但文字保持足够对比，仍要看得清是什么牌
      const alpha = this.playable ? 1 : 0.5;
      const textAlpha = this.playable ? 1 : 0.85;
      g.fillStyle(T.cardFace, alpha).fillRoundedRect(-w / 2, -h / 2, w, h, r);
      if (this.selected) {
        g.lineStyle(5, T.selected, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
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

    // 让整张牌可点。点击区往下延伸 liftY：牌被选取而上移后，
    // 原本的位置仍然点得到，取消选取时不会点空
    enableInput(handler) {
      const L = window.LAYOUT.card;
      const lift = window.LAYOUT.hand.liftY;
      this.setSize(L.w, L.h);
      // 注意：Phaser 判定 Container 命中时会先把座标加上 displayOrigin（= 宽高的一半），
      // 所以 hitArea 要从 (0,0) 起算，不能写成 (-w/2, -h/2)，否则整个判定区会偏掉半张牌
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
