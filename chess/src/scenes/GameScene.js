import { createInitialBoard, legalMoves, applyMove, owner, isKing, countPieces, gameOver, boardKey, isProgressMove, SIZE, P1, P2, P1K, P2K, EMPTY } from '../game/Board.js';
import { chooseAIMove } from '../game/AI.js';
import { installPieceTextures } from '../game/pieces.js';

// Ember & Slate 配色
const COLOR_LIGHT_SQ = 0xd8c8a3;  // 奶油卡其
const COLOR_DARK_SQ  = 0x5a3520;  // 深胡桃
const COLOR_HINT     = 0xf0c878;  // 金色 hint
const COLOR_SELECT   = 0xffcb6c;  // 金光選中
const COLOR_LAST     = 0x8a5a3a;  // 暖棕最後一步
const COLOR_AMBER    = 0xff6a1a;  // P1 fire orange
const COLOR_SAPPHIRE = 0xe0e4f0;  // P2 pearl white（變數名沿用）
const COLOR_GOLD     = 0xd4a857;
const COLOR_GOLD_HI  = 0xf0c878;
const COLOR_GOLD_DIM = 0x6e5530;

const S = window.__UI_SCALE__ || 1;
const px = (n) => Math.round(n * S);
const GOLD = '#d4a857';
const GOLD_HI = '#f0c878';
const INK = '#f4e8d0';
const MUTED = '#8a7560';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.mode = data.mode || 'ai';
    this.difficulty = data.difficulty || 'normal';
    this.aiPlayer = 2;
    this.firstPlayer = data.firstPlayer || 1;
  }

  preload() {
    const v = '?v=' + (window.__BUILD__ || Date.now());
    this.load.image('bg_wood', 'assets/img/bg_wood.png' + v);
    this.load.image('board_tile_light', 'assets/img/board_tile_light.png' + v);
    this.load.image('board_tile_dark', 'assets/img/board_tile_dark.png' + v);
    this.load.image('piece_p1', 'assets/img/piece_p1.png' + v);
    this.load.image('piece_p2', 'assets/img/piece_p2.png' + v);
    this.load.image('piece_p1_king', 'assets/img/piece_p1_king.png' + v);
    this.load.image('piece_p2_king', 'assets/img/piece_p2_king.png' + v);
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.W = W; this.H = H;

    // codex 圖檔逐顆檢查；缺哪顆才補哪顆，不要覆蓋已載入的
    const need = ['piece_p1', 'piece_p2', 'piece_p1_king', 'piece_p2_king']
      .filter(k => !this.textures.exists(k));
    if (need.length) installPieceTextures(this, 512, need);

    this.board = createInitialBoard();
    this.toMove = this.firstPlayer;
    this.selected = null;
    this.legalForSelected = [];
    this.lastMove = null;
    this.locked = false;
    this.gameOverFlag = false;
    // 反僵持狀態
    this.noProgressPly = 0;
    this.positionCounts = new Map();
    this.positionCounts.set(boardKey(this.board, this.toMove), 1);

    this.drawBackground(W, H);
    this.buildLayout();
    this.drawAll();
    this.refreshStatus();

    // 若電腦先手，自動觸發第一手
    if (this.mode === 'ai' && this.toMove === this.aiPlayer) {
      this.time.delayedCall(600, () => this.runAI());
    }
  }

  drawBackground(W, H) {
    if (this.textures.exists('bg_wood')) {
      const bg = this.add.image(W / 2, H / 2, 'bg_wood');
      const scale = Math.max(W / bg.width, H / bg.height);
      bg.setScale(scale);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x14090a, 1).fillRect(0, 0, W, H);
    }
    const v = this.add.graphics();
    v.fillStyle(0x000000, 0.55).fillRect(0, 0, W, H * 0.12);
    v.fillStyle(0x000000, 0.55).fillRect(0, H * 0.88, W, H * 0.12);
  }

  buildLayout() {
    const W = this.W, H = this.H;
    const topPad = Math.max(120 * S, H * 0.16);
    const botPad = Math.max(70 * S, H * 0.09);
    const sidePad = Math.max(14 * S, W * 0.04);
    const avail = Math.min(W - sidePad * 2, H - topPad - botPad);
    this.boardSize = avail;
    this.cellSize = avail / SIZE;
    this.boardX = (W - avail) / 2;
    this.boardY = topPad + (H - topPad - botPad - avail) / 2;

    this.boardLayer = this.add.container(0, 0);
    this.hintLayer = this.add.container(0, 0);
    this.pieceLayer = this.add.container(0, 0);
    this.fxLayer = this.add.container(0, 0);

    // 標題列
    const titleSize = Math.round(Math.min(W * 0.06, 28 * S));
    this.add.text(sidePad + 2 * S, 26 * S, '西洋跳棋', {
      fontFamily: '"Cinzel", "PingFang TC", serif',
      fontSize: titleSize + 'px',
      color: GOLD,
    }).setOrigin(0, 0.5).setLetterSpacing(Math.round(titleSize * 0.2));
    this.add.text(sidePad + 2 * S, 26 * S + titleSize * 0.85, '灰燼 · 石板', {
      fontFamily: '"Cinzel", "PingFang TC", serif',
      fontSize: Math.round(titleSize * 0.35) + 'px',
      color: MUTED,
    }).setOrigin(0, 0.5).setLetterSpacing(Math.round(titleSize * 0.2));

    // 頂部 icon 列
    this.buildIconRow(W - sidePad, 32 * S);

    // 棋盤外框（金色細邊 + 四角裝飾）
    this.drawBoardFrame();

    // 棋盤格
    this.cellGfx = this.add.graphics();
    this.boardLayer.add(this.cellGfx);
    this.drawCells();

    // 座標
    this.drawCoordinates();

    // HUD 卡片（緊湊）
    const hudY = Math.min(78 * S, topPad - 36 * S);
    const cardW = Math.min((W - sidePad * 2 - 12 * S) / 2, 170 * S);
    const leftX = sidePad;
    const rightX = W - sidePad - cardW;
    this.p1Card = this.makeScoreCard(leftX, hudY, cardW, 1);
    this.p2Card = this.makeScoreCard(rightX, hudY, cardW, 2);

    // 底部狀態列
    this.statusText = this.add.text(W / 2, H - Math.max(36 * S, botPad * 0.45), '', {
      fontFamily: '"Cormorant Garamond", "PingFang TC", serif',
      fontStyle: 'italic',
      fontSize: Math.round(Math.min(W * 0.05, 22 * S)) + 'px',
      color: INK,
    }).setOrigin(0.5);

    this.input.on('pointerdown', (p) => this.handleTap(p.x, p.y));
  }

  buildIconRow(rightX, y) {
    const icons = [
      { glyph: '↺', tip: 'undo',  onClick: () => {} },
      { glyph: '✕', tip: 'exit',  onClick: () => this.scene.start('Menu') },
    ];
    const size = 32 * S;
    const half = size / 2;
    const radius = 6 * S;
    const gap = 38 * S;
    icons.reverse().forEach((it, idx) => {
      const x = rightX - idx * gap;
      const g = this.add.graphics();
      g.lineStyle(1 * S, COLOR_GOLD, 0.5).strokeRoundedRect(x - half, y - half, size, size, radius);
      const t = this.add.text(x, y, it.glyph, {
        fontFamily: 'serif', fontSize: px(18) + 'px', color: GOLD,
      }).setOrigin(0.5);
      const hit = this.add.rectangle(x, y, size, size, 0xffffff, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { t.setColor(GOLD_HI); g.clear(); g.lineStyle(1 * S, COLOR_GOLD_HI, 1).strokeRoundedRect(x - half, y - half, size, size, radius); });
      hit.on('pointerout',  () => { t.setColor(GOLD);    g.clear(); g.lineStyle(1 * S, COLOR_GOLD, 0.5).strokeRoundedRect(x - half, y - half, size, size, radius); });
      hit.on('pointerdown', it.onClick);
    });
  }

  drawBoardFrame() {
    const g = this.add.graphics();
    const pad = 10 * S;
    const x = this.boardX - pad, y = this.boardY - pad;
    const w = this.boardSize + pad * 2, h = this.boardSize + pad * 2;
    g.fillStyle(0x0a0506, 0.85).fillRoundedRect(x, y, w, h, 4 * S);
    g.lineStyle(1 * S, COLOR_GOLD, 0.6).strokeRoundedRect(x, y, w, h, 4 * S);
    // 四角裝飾
    const cor = 16 * S;
    g.lineStyle(2 * S, COLOR_GOLD, 0.9);
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([cx, cy, dx, dy]) => {
      g.beginPath();
      g.moveTo(cx + dx * cor, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + dy * cor);
      g.strokePath();
    });
    this.boardLayer.add(g);
  }

  drawCells() {
    const g = this.cellGfx;
    g.clear();
    const useTiles = this.textures.exists('board_tile_light') && this.textures.exists('board_tile_dark');
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const isDark = (r + c) % 2 === 1;
        if (useTiles) {
          const img = this.add.image(this.boardX + c * this.cellSize + this.cellSize / 2,
                                     this.boardY + r * this.cellSize + this.cellSize / 2,
                                     isDark ? 'board_tile_dark' : 'board_tile_light');
          img.setDisplaySize(this.cellSize, this.cellSize);
          this.boardLayer.add(img);
        } else {
          g.fillStyle(isDark ? COLOR_DARK_SQ : COLOR_LIGHT_SQ, 1);
          g.fillRect(this.boardX + c * this.cellSize, this.boardY + r * this.cellSize, this.cellSize, this.cellSize);
        }
      }
    }
    // 棋盤內細格線
    g.lineStyle(1 * S, 0x000000, 0.15);
    for (let i = 1; i < SIZE; i++) {
      g.beginPath();
      g.moveTo(this.boardX, this.boardY + i * this.cellSize);
      g.lineTo(this.boardX + this.boardSize, this.boardY + i * this.cellSize);
      g.moveTo(this.boardX + i * this.cellSize, this.boardY);
      g.lineTo(this.boardX + i * this.cellSize, this.boardY + this.boardSize);
      g.strokePath();
    }
  }

  drawCoordinates() {
    const fontSize = Math.max(9 * S, Math.round(this.cellSize * 0.16));
    const style = { fontFamily: '"Cinzel", serif', fontSize: fontSize + 'px', color: '#a88f60' };
    for (let r = 0; r < SIZE; r++) {
      const n = SIZE - r;
      if (n % 2 !== 0) continue;
      const t = this.add.text(this.boardX - 6 * S,
                              this.boardY + r * this.cellSize + this.cellSize / 2,
                              String(n), style).setOrigin(1, 0.5);
      this.boardLayer.add(t);
    }
    const letters = 'ABCDEFGH';
    for (let c = 0; c < SIZE; c++) {
      if (c % 2 === 0) continue;
      const t = this.add.text(this.boardX + c * this.cellSize + this.cellSize / 2,
                              this.boardY + this.boardSize + 6 * S,
                              letters[c], style).setOrigin(0.5, 0);
      this.boardLayer.add(t);
    }
  }

  makeScoreCard(x, y, w, player) {
    const h = 56 * S;
    const r = 6 * S;
    const accent = player === 1 ? COLOR_AMBER : COLOR_SAPPHIRE;
    const g = this.add.graphics();
    g.fillStyle(0x1a0c0a, 0.78).fillRoundedRect(x, y - h / 2, w, h, r);
    g.lineStyle(1 * S, COLOR_GOLD, 0.5).strokeRoundedRect(x, y - h / 2, w, h, r);

    const dot = this.add.circle(x + 18 * S, y, 9 * S, accent);
    dot.setStrokeStyle(1 * S, COLOR_GOLD, 0.6);

    const labelText = player === 1 ? '我方' : (this.mode === 'ai' ? '電腦' : '對手');
    const label = this.add.text(x + 34 * S, y - 10 * S, labelText, {
      fontFamily: '"Cinzel", "PingFang TC", serif', fontSize: px(11) + 'px', color: MUTED,
    }).setOrigin(0, 0.5).setLetterSpacing(2 * S);

    const num = this.add.text(x + 34 * S, y + 8 * S, '12', {
      fontFamily: '"Cinzel", serif', fontSize: px(20) + 'px', color: INK, fontStyle: '600',
    }).setOrigin(0, 0.5);

    const sub = this.add.text(x + w - 8 * S, y + 8 * S, '顆', {
      fontFamily: '"Cormorant Garamond", "PingFang TC", serif', fontStyle: 'italic', fontSize: px(11) + 'px', color: MUTED,
    }).setOrigin(1, 0.5);

    const turnRing = this.add.graphics();
    turnRing.lineStyle(1.5 * S, COLOR_GOLD_HI, 0.9).strokeRoundedRect(x - 1, y - h / 2 - 1, w + 2, h + 2, r + 1);
    turnRing.setVisible(false);

    return { g, dot, label, num, sub, turnRing, x, y, w, h };
  }

  drawAll() {
    this.pieceLayer.removeAll(true);
    this.hintLayer.removeAll(true);

    if (this.lastMove) {
      const [fr, fc] = this.lastMove.from;
      const [tr, tc] = this.lastMove.path[this.lastMove.path.length - 1];
      this.drawSquareOverlay(fr, fc, COLOR_LAST, 0.35);
      this.drawSquareOverlay(tr, tc, COLOR_LAST, 0.55);
    }
    if (this.selected) {
      const [sr, sc] = this.selected;
      this.drawSquareOverlay(sr, sc, COLOR_SELECT, 0.45);
      for (const m of this.legalForSelected) {
        const [tr, tc] = m.path[m.path.length - 1];
        const cx = this.cellCenter(tr, tc);
        const isCapture = m.captures.length > 0;
        const dot = this.add.circle(cx.x, cx.y, this.cellSize * (isCapture ? 0.32 : 0.16),
                                    isCapture ? COLOR_HINT : COLOR_HINT, isCapture ? 0.35 : 0.85);
        if (isCapture) {
          const ring = this.add.graphics();
          ring.lineStyle(2, COLOR_HINT, 0.9).strokeCircle(cx.x, cx.y, this.cellSize * 0.36);
          this.hintLayer.add(ring);
        }
        this.hintLayer.add(dot);
      }
    }

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = this.board[r][c];
        if (p === EMPTY) continue;
        this.drawPiece(r, c, p);
      }
    }
  }

  drawSquareOverlay(r, c, color, alpha) {
    const x = this.boardX + c * this.cellSize;
    const y = this.boardY + r * this.cellSize;
    const ov = this.add.graphics();
    ov.fillStyle(color, alpha).fillRect(x, y, this.cellSize, this.cellSize);
    this.hintLayer.add(ov);
  }

  cellCenter(r, c) {
    return {
      x: this.boardX + c * this.cellSize + this.cellSize / 2,
      y: this.boardY + r * this.cellSize + this.cellSize / 2,
    };
  }

  drawPiece(r, c, p) {
    const { x, y } = this.cellCenter(r, c);
    const radius = this.cellSize * 0.42;
    const key = p === P1 ? 'piece_p1'
              : p === P2 ? 'piece_p2'
              : p === P1K ? 'piece_p1_king'
              : 'piece_p2_king';
    if (this.textures.exists(key)) {
      const img = this.add.image(x, y, key);
      const tw = img.width || 1;
      img.setScale((radius * 2.3) / tw);
      this.pieceLayer.add(img);
      return;
    }
    // fallback
    const color = owner(p) === 1 ? COLOR_AMBER : COLOR_SAPPHIRE;
    const shadow = this.add.circle(x + 2, y + 4, radius, 0x000000, 0.45);
    const body = this.add.circle(x, y, radius, color);
    const ring = this.add.graphics();
    ring.lineStyle(2, COLOR_GOLD, 0.55).strokeCircle(x, y, radius - 2);
    const hi = this.add.circle(x - radius * 0.3, y - radius * 0.35, radius * 0.28, 0xffffff, 0.22);
    this.pieceLayer.add([shadow, body, ring, hi]);
    if (isKing(p)) {
      const crown = this.add.text(x, y, '♛', {
        fontFamily: 'serif', fontSize: Math.round(radius * 1.1) + 'px', color: GOLD, fontStyle: 'bold',
      }).setOrigin(0.5);
      this.pieceLayer.add(crown);
    }
  }

  refreshStatus() {
    const { p1, p2 } = countPieces(this.board);
    this.p1Card.num.setText(String(p1));
    this.p2Card.num.setText(String(p2));
    this.p1Card.turnRing.setVisible(this.toMove === 1);
    this.p2Card.turnRing.setVisible(this.toMove === 2);

    const status = gameOver(this.board, this.toMove, {
      noProgressPly: this.noProgressPly,
      positionCounts: this.positionCounts,
    });
    if (status.over) {
      let msg, color;
      if (status.winner === 0) {
        const reason = status.reason === 'threefold' ? '三重複局面'
                     : status.reason === 'forty_move' ? '40 步無進展'
                     : '和棋';
        msg = `— 和棋 · ${reason} · 點任意處返回 —`;
        color = '#a88f60';
      } else {
        const winner = status.winner === 1
          ? '你獲勝了'
          : (this.mode === 'ai' ? '電腦獲勝' : '玩家二獲勝');
        msg = `— ${winner} · 點任意處返回 —`;
        color = status.winner === 1 ? GOLD_HI : '#c9876d';
      }
      this.statusText.setText(msg);
      this.statusText.setColor(color);
      this.gameOverFlag = true;
      return;
    }
    if (this.mode === 'ai' && this.toMove === this.aiPlayer) {
      this.statusText.setText('電腦思考中…');
      this.statusText.setColor(MUTED);
    } else {
      this.statusText.setText(this.toMove === 1 ? '你的回合' : '玩家二的回合');
      this.statusText.setColor(INK);
    }
  }

  hitToCell(x, y) {
    if (x < this.boardX || x > this.boardX + this.boardSize) return null;
    if (y < this.boardY || y > this.boardY + this.boardSize) return null;
    const c = Math.floor((x - this.boardX) / this.cellSize);
    const r = Math.floor((y - this.boardY) / this.cellSize);
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null;
    return [r, c];
  }

  handleTap(x, y) {
    if (this.gameOverFlag) { this.scene.start('Menu'); return; }
    if (this.locked) return;
    if (this.mode === 'ai' && this.toMove === this.aiPlayer) return;

    const cell = this.hitToCell(x, y);
    if (!cell) return;
    const [r, c] = cell;

    if (this.selected) {
      const target = this.legalForSelected.find(m => {
        const [tr, tc] = m.path[m.path.length - 1];
        return tr === r && tc === c;
      });
      if (target) { this.executeMove(target); return; }
    }
    if (owner(this.board[r][c]) === this.toMove) {
      const all = legalMoves(this.board, this.toMove);
      const mine = all.filter(m => m.from[0] === r && m.from[1] === c);
      if (mine.length === 0) {
        this.flashStatus('此回合必須吃子');
        return;
      }
      this.selected = [r, c];
      this.legalForSelected = mine;
      this.drawAll();
      return;
    }
    if (this.selected) {
      this.selected = null;
      this.legalForSelected = [];
      this.drawAll();
    }
  }

  flashStatus(msg) {
    const original = this.statusText.text;
    const originalColor = this.statusText.style.color;
    this.statusText.setText(msg).setColor(GOLD_HI);
    this.time.delayedCall(1400, () => {
      if (this.statusText && !this.gameOverFlag) this.statusText.setText(original).setColor(originalColor);
    });
  }

  executeMove(move) {
    this.locked = true;
    this.selected = null;
    this.legalForSelected = [];
    const finalBoard = applyMove(this.board, move);
    const progress = isProgressMove(this.board, move);
    this.animateMove(move, () => {
      this.board = finalBoard;
      this.lastMove = move;
      this.toMove = (this.toMove === 1) ? 2 : 1;
      this.noProgressPly = progress ? 0 : this.noProgressPly + 1;
      const key = boardKey(this.board, this.toMove);
      this.positionCounts.set(key, (this.positionCounts.get(key) || 0) + 1);
      this.drawAll();
      this.refreshStatus();
      this.locked = false;
      if (!this.gameOverFlag && this.mode === 'ai' && this.toMove === this.aiPlayer) {
        this.time.delayedCall(220, () => this.runAI());
      }
    });
  }

  animateMove(move, onDone) {
    const [fr, fc] = move.from;
    const piece = this.board[fr][fc];
    const start = this.cellCenter(fr, fc);
    const radius = this.cellSize * 0.42;
    const color = owner(piece) === 1 ? COLOR_AMBER : COLOR_SAPPHIRE;

    this.board[fr][fc] = EMPTY;
    this.drawAll();

    const key = piece === P1 ? 'piece_p1' : piece === P2 ? 'piece_p2'
              : piece === P1K ? 'piece_p1_king' : 'piece_p2_king';
    let ghost, ghostKing = null;
    if (this.textures.exists(key)) {
      ghost = this.add.image(start.x, start.y, key);
      ghost.setScale((radius * 2.3) / (ghost.width || 1));
    } else {
      ghost = this.add.circle(start.x, start.y, radius, color);
      if (isKing(piece)) {
        ghostKing = this.add.text(start.x, start.y, '♛', {
          fontFamily: 'serif', fontSize: Math.round(radius * 1.1) + 'px', color: GOLD, fontStyle: 'bold',
        }).setOrigin(0.5);
        this.fxLayer.add(ghostKing);
      }
    }
    this.fxLayer.add(ghost);

    const steps = move.path;
    let idx = 0;
    const stepFn = () => {
      if (idx >= steps.length) {
        ghost.destroy();
        if (ghostKing) ghostKing.destroy();
        onDone();
        return;
      }
      const [tr, tc] = steps[idx];
      const prev = idx === 0 ? move.from : steps[idx - 1];
      const end = this.cellCenter(tr, tc);
      const tweenTargets = ghostKing ? [ghost, ghostKing] : [ghost];
      this.tweens.add({
        targets: tweenTargets,
        x: end.x, y: end.y,
        duration: 180,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          const midR = (prev[0] + tr) / 2;
          const midC = (prev[1] + tc) / 2;
          if (Math.abs(tr - prev[0]) === 2 && this.board[midR] && this.board[midR][midC] !== EMPTY) {
            this.board[midR][midC] = EMPTY;
            this.drawAll();
            this.fxLayer.bringToTop(ghost);
            if (ghostKing) this.fxLayer.bringToTop(ghostKing);
            ghost.setPosition(end.x, end.y);
            if (ghostKing) ghostKing.setPosition(end.x, end.y);
          }
          idx++;
          stepFn();
        }
      });
    };
    stepFn();
  }

  runAI() {
    if (this.gameOverFlag) return;
    this.time.delayedCall(20, () => {
      const move = chooseAIMove(this.board, this.aiPlayer, this.difficulty, {
        positionCounts: this.positionCounts,
      });
      if (!move) { this.refreshStatus(); return; }
      this.executeMove(move);
    });
  }
}
