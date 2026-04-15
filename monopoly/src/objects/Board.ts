import Phaser from 'phaser';
import { BOARD, BOARD_LAYOUT, COLORS } from '../config';
import { Tile } from './Tile';

export class Board {
  scene: Phaser.Scene;
  tiles: Tile[] = [];
  pathGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.pathGraphics = scene.add.graphics();
    this.createTiles();
    this.createPath(); // 先建格子再畫路徑（路徑在格子下方）
  }

  // 計算格子在橢圓上的位置
  private calcTilePosition(index: number): { x: number; y: number } {
    const angle = (index / BOARD.tileCount) * Math.PI * 2 - Math.PI / 2;
    const x = BOARD.centerX + Math.cos(angle) * BOARD.radiusX;
    const y = BOARD.centerY + Math.sin(angle) * BOARD.radiusY;
    return { x, y };
  }

  // 繪製格子間的連接虛線（菱形風格的箭頭路徑）
  private createPath() {
    this.pathGraphics.setDepth(-1);

    for (let i = 0; i < BOARD.tileCount; i++) {
      const from = this.calcTilePosition(i);
      const to = this.calcTilePosition((i + 1) % BOARD.tileCount);

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / dist;
      const ny = dy / dist;

      // 從格子邊緣開始（跳過格子中心部分）
      const skipDist = 28;
      const dashLen = 5;
      const gapLen = 5;
      const drawDist = dist - skipDist * 2;
      const steps = Math.floor(drawDist / (dashLen + gapLen));

      this.pathGraphics.lineStyle(1.5, COLORS.lightGray, 0.35);

      for (let s = 0; s < steps; s++) {
        const startX = from.x + nx * (skipDist + s * (dashLen + gapLen));
        const startY = from.y + ny * (skipDist + s * (dashLen + gapLen));
        const endX = startX + nx * dashLen;
        const endY = startY + ny * dashLen;
        this.pathGraphics.beginPath();
        this.pathGraphics.moveTo(startX, startY);
        this.pathGraphics.lineTo(endX, endY);
        this.pathGraphics.strokePath();
      }
    }
  }

  // 建立所有格子
  private createTiles() {
    for (let i = 0; i < BOARD.tileCount; i++) {
      const pos = this.calcTilePosition(i);
      const tileType = BOARD_LAYOUT[i];
      const tile = new Tile(this.scene, i, tileType, pos.x, pos.y);
      this.tiles.push(tile);
    }
  }

  getTile(index: number): Tile {
    return this.tiles[index % BOARD.tileCount];
  }

  getTilePosition(index: number): { x: number; y: number } {
    const wrappedIndex = index % BOARD.tileCount;
    return this.tiles[wrappedIndex].getPosition();
  }
}
