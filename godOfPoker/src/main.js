// 進入點：Boot（動態繪製全部 UI 素材）→ Menu → Game
// 所有貼圖以 2x 解析度繪製、顯示時縮小，確保平滑無鋸齒
const CARD_W = 140, CARD_H = 196;   // 卡牌邏輯尺寸
const CARD_PAD = 18;                // 陰影留白（邏輯 px）
const TEX_SCALE = 2;                // 貼圖解析度倍數

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const chars = ['char_dusheng_toon', 'char_long5_toon', 'char_duxia_toon', 'char_dushen_toon'];
    for (const id of chars) this.load.image(id, `assets/chars/${id}.png`);
    this.load.image('chips_pile', 'assets/props/chips_pile.png');
    this.load.on('loaderror', (file) => console.warn('素材缺少（將使用替代顯示）:', file.key));
  }

  create() {
    this._makeBackground();
    this._makeCardTextures();
    this._makeChip();
    this._makePlayerBadge();
    this.scene.start('Menu');
  }

  // ---- 背景：徑向漸層 + 暗角 ----
  _makeBackground() {
    const W = GAME_W, H = GAME_H;
    const tex = this.textures.createCanvas('bg', W, H);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 80, W / 2, H * 0.42, H * 0.75);
    g.addColorStop(0, COLORS.bgLight);
    g.addColorStop(1, COLORS.bgDark);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    tex.refresh();
  }

  // ---- 卡牌（含柔和陰影、雙角標、置中花色） ----
  _makeCardTextures() {
    const TS = TEX_SCALE;
    const W = (CARD_W + CARD_PAD * 2) * TS, H = (CARD_H + CARD_PAD * 2) * TS;
    const P = CARD_PAD * TS, CW = CARD_W * TS, CH = CARD_H * TS, R = 14 * TS;

    const cardPath = (ctx) => {
      ctx.beginPath();
      ctx.moveTo(P + R, P);
      ctx.lineTo(P + CW - R, P); ctx.arcTo(P + CW, P, P + CW, P + R, R);
      ctx.lineTo(P + CW, P + CH - R); ctx.arcTo(P + CW, P + CH, P + CW - R, P + CH, R);
      ctx.lineTo(P + R, P + CH); ctx.arcTo(P, P + CH, P, P + CH - R, R);
      ctx.lineTo(P, P + R); ctx.arcTo(P, P, P + R, P, R);
      ctx.closePath();
    };

    const drawBody = (ctx, fill) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.38)';
      ctx.shadowBlur = 12 * TS;
      ctx.shadowOffsetY = 5 * TS;
      cardPath(ctx);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    };

    // 牌背：暗紅漸層 + 金色雙框 + 中央「神」印
    const back = this.textures.createCanvas('card_back', W, H);
    const bctx = back.getContext();
    const bg = bctx.createLinearGradient(0, P, 0, P + CH);
    bg.addColorStop(0, '#7a2727');
    bg.addColorStop(1, '#571a1a');
    drawBody(bctx, bg);
    bctx.strokeStyle = 'rgba(233,199,102,0.85)';
    bctx.lineWidth = 2 * TS;
    bctx.strokeRect(P + 8 * TS, P + 8 * TS, CW - 16 * TS, CH - 16 * TS);
    bctx.strokeStyle = 'rgba(233,199,102,0.35)';
    bctx.lineWidth = 1 * TS;
    bctx.strokeRect(P + 13 * TS, P + 13 * TS, CW - 26 * TS, CH - 26 * TS);
    bctx.fillStyle = 'rgba(233,199,102,0.9)';
    bctx.font = `${34 * TS}px ${FONT_TITLE.replace(/"/g, '')}`;
    bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
    bctx.beginPath();
    bctx.arc(W / 2, H / 2, 26 * TS, 0, Math.PI * 2);
    bctx.strokeStyle = 'rgba(233,199,102,0.6)';
    bctx.stroke();
    bctx.fillText('神', W / 2, H / 2 + 2 * TS);
    back.refresh();

    // 52 張牌面
    for (let s = 0; s < 4; s++) {
      for (let r = 2; r <= 14; r++) {
        const key = `c_${r}_${s}`;
        const tex = this.textures.createCanvas(key, W, H);
        const ctx = tex.getContext();
        drawBody(ctx, '#fdfcf6');
        cardPath(ctx);
        ctx.strokeStyle = '#e2dccb';
        ctx.lineWidth = 1.5 * TS;
        ctx.stroke();

        const color = SUIT_RED[s] ? '#c23a2b' : '#1e2430';
        ctx.fillStyle = color;
        // 左上角：點數 + 花色
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${40 * TS}px "Helvetica Neue", Arial, sans-serif`;
        const rx = P + 26 * TS;
        ctx.fillText(RANK_CHARS[r], rx, P + 28 * TS);
        ctx.font = `${26 * TS}px serif`;
        ctx.fillText(SUIT_CHARS[s], rx, P + 60 * TS);
        // 右下角：倒置角標
        ctx.save();
        ctx.translate(P + CW - 26 * TS, P + CH - 44 * TS);
        ctx.rotate(Math.PI);
        ctx.font = `bold ${40 * TS}px "Helvetica Neue", Arial, sans-serif`;
        ctx.fillText(RANK_CHARS[r], 0, -16 * TS);
        ctx.restore();
        // 中央大花色
        ctx.font = `${86 * TS}px serif`;
        ctx.fillText(SUIT_CHARS[s], W / 2, H / 2 + 8 * TS);
        tex.refresh();
      }
    }
  }

  // ---- 籌碼小圖示 ----
  _makeChip() {
    const TS = TEX_SCALE, S = 34 * TS;
    const tex = this.textures.createCanvas('chip', S, S);
    const ctx = tex.getContext();
    const c = S / 2, r = S / 2 - 2 * TS;
    ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fillStyle = '#e8c766'; ctx.fill();
    // 邊緣刻紋
    ctx.strokeStyle = '#fdf6dd'; ctx.lineWidth = 3 * TS;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(c, c, r - 1.5 * TS, a - 0.16, a + 0.16);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(c, c, r * 0.62, 0, Math.PI * 2);
    ctx.strokeStyle = '#b8923a'; ctx.lineWidth = 1.5 * TS; ctx.stroke();
    ctx.fillStyle = '#9a7726';
    ctx.font = `bold ${13 * TS}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', c, c + 0.5 * TS);
    tex.refresh();
  }

  // ---- 玩家「你」徽章 ----
  _makePlayerBadge() {
    const TS = TEX_SCALE, S = 120 * TS;
    const tex = this.textures.createCanvas('char_you', S, S);
    const ctx = tex.getContext();
    const c = S / 2;
    const g = ctx.createRadialGradient(c, c * 0.8, 6 * TS, c, c, c);
    g.addColorStop(0, '#1d4534');
    g.addColorStop(1, '#0d251b');
    ctx.beginPath(); ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(c, c, c - 5 * TS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(233,199,102,0.75)'; ctx.lineWidth = 2 * TS; ctx.stroke();
    ctx.fillStyle = '#e8c766';
    ctx.font = `${46 * TS}px ${FONT_TITLE.replace(/"/g, '')}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('你', c, c + 2 * TS);
    tex.refresh();
  }
}

const config = {
  type: Phaser.CANVAS,           // Canvas 渲染：向量圖形抗鋸齒較佳
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: COLORS.bgDark,
  render: { antialias: true, roundPixels: false },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene],
};

const game = new Phaser.Game(config);

// 首次觸碰時解鎖音效（行動裝置需求）
window.addEventListener('pointerdown', () => Sound._ensure && Sound._ensure(), { once: true });
