import Phaser from 'phaser';
import { TileType, TILE_CONFIGS, BOARD } from '../config';

// 將 hex 色碼拆成 RGB 分量
function hexToRgb(hex: number) {
  return { r: (hex >> 16) & 0xFF, g: (hex >> 8) & 0xFF, b: hex & 0xFF };
}

// RGB 轉回 hex
function rgbToHex(r: number, g: number, b: number) {
  return (Math.min(255, Math.max(0, r)) << 16) | (Math.min(255, Math.max(0, g)) << 8) | Math.min(255, Math.max(0, b));
}

// 調整亮度（正值變亮，負值變暗）
function adjustBrightness(hex: number, amount: number): number {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

export class Tile {
  scene: Phaser.Scene;
  index: number;
  type: TileType;
  x: number;
  y: number;
  container: Phaser.GameObjects.Container;
  emojiText: Phaser.GameObjects.Text;

  // 等角菱形參數
  private tileW: number;   // 菱形寬度（水平跨度）
  private tileH: number;   // 菱形高度（垂直跨度）
  private depth3D: number; // 3D 側面厚度

  // 下陷動畫用
  private topFace: Phaser.GameObjects.Graphics;
  private sideFaceLeft: Phaser.GameObjects.Graphics;
  private sideFaceRight: Phaser.GameObjects.Graphics;
  private baseColor: number;

  constructor(scene: Phaser.Scene, index: number, type: TileType, x: number, y: number) {
    this.scene = scene;
    this.index = index;
    this.type = type;
    this.x = x;
    this.y = y;

    const config = TILE_CONFIGS[type];
    this.baseColor = config.color;

    // 等角菱形尺寸
    this.tileW = BOARD.tileSize * 1.3;  // 水平寬
    this.tileH = BOARD.tileSize * 0.75; // 垂直高（壓扁成45度視角）
    this.depth3D = 8;                    // 側面厚度

    // 左側面（深色）
    this.sideFaceLeft = scene.add.graphics();
    this.drawSideLeft(this.sideFaceLeft, adjustBrightness(this.baseColor, -50), 0);

    // 右側面（中間色）
    this.sideFaceRight = scene.add.graphics();
    this.drawSideRight(this.sideFaceRight, adjustBrightness(this.baseColor, -30), 0);

    // 頂面（亮色）
    this.topFace = scene.add.graphics();
    this.drawTopFace(this.topFace, this.baseColor, 0);

    // emoji 圖示（放在頂面上）
    this.emojiText = scene.add.text(0, -this.depth3D / 2, config.emoji, {
      fontSize: '18px',
    }).setOrigin(0.5);

    // 白色高光（頂面左上角）
    const highlight = scene.add.graphics();
    highlight.fillStyle(0xFFFFFF, 0.25);
    highlight.fillTriangle(
      0, -this.tileH / 2 - this.depth3D / 2,
      -this.tileW / 2 + 6, -this.depth3D / 2,
      0, -this.depth3D / 2 + 4
    );

    // 容器
    this.container = scene.add.container(x, y, [
      this.sideFaceLeft,
      this.sideFaceRight,
      this.topFace,
      highlight,
      this.emojiText,
    ]);
    this.container.setSize(this.tileW, this.tileH + this.depth3D);

    // 閒置微幅呼吸動畫
    const baseY = y;
    scene.tweens.addCounter({
      from: 0, to: Math.PI * 2,
      duration: 2500 + index * 80,
      repeat: -1,
      delay: index * 120,
      onUpdate: (tw) => {
        const offset = Math.sin(tw.getValue()) * 1.5;
        this.container.y = baseY + offset;
      },
    });
  }

  // 繪製等角菱形頂面
  private drawTopFace(g: Phaser.GameObjects.Graphics, color: number, sinkOffset: number) {
    const w = this.tileW / 2;
    const h = this.tileH / 2;
    const yOff = -this.depth3D / 2 + sinkOffset;

    g.clear();
    g.fillStyle(color, 0.92);
    g.beginPath();
    g.moveTo(0, -h + yOff);        // 上頂點
    g.lineTo(w, yOff);              // 右頂點
    g.lineTo(0, h + yOff);          // 下頂點
    g.lineTo(-w, yOff);             // 左頂點
    g.closePath();
    g.fillPath();

    // 頂面邊框
    g.lineStyle(1.5, 0xFFFFFF, 0.6);
    g.beginPath();
    g.moveTo(0, -h + yOff);
    g.lineTo(w, yOff);
    g.lineTo(0, h + yOff);
    g.lineTo(-w, yOff);
    g.closePath();
    g.strokePath();
  }

  // 繪製左側面
  private drawSideLeft(g: Phaser.GameObjects.Graphics, color: number, sinkOffset: number) {
    const w = this.tileW / 2;
    const h = this.tileH / 2;
    const d = this.depth3D;
    const yOff = -d / 2 + sinkOffset;

    g.clear();
    g.fillStyle(color, 0.9);
    g.beginPath();
    g.moveTo(-w, yOff);              // 左頂面頂點
    g.lineTo(0, h + yOff);           // 下頂面頂點
    g.lineTo(0, h + yOff + d);       // 下底面頂點
    g.lineTo(-w, yOff + d);          // 左底面頂點
    g.closePath();
    g.fillPath();
  }

  // 繪製右側面
  private drawSideRight(g: Phaser.GameObjects.Graphics, color: number, sinkOffset: number) {
    const w = this.tileW / 2;
    const h = this.tileH / 2;
    const d = this.depth3D;
    const yOff = -d / 2 + sinkOffset;

    g.clear();
    g.fillStyle(color, 0.9);
    g.beginPath();
    g.moveTo(w, yOff);               // 右頂面頂點
    g.lineTo(0, h + yOff);           // 下頂面頂點
    g.lineTo(0, h + yOff + d);       // 下底面頂點
    g.lineTo(w, yOff + d);           // 右底面頂點
    g.closePath();
    g.fillPath();
  }

  // 角色踩踏時的下陷→彈起效果
  playLandEffect() {
    const sinkDepth = 5;  // 下陷距離
    const sinkDur = 120;  // 下陷時間
    const bounceDur = 300; // 彈起時間

    // 下陷動畫
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: sinkDur, ease: 'Quad.easeIn',
      onUpdate: (tw) => {
        const t = tw.getValue();
        const offset = t * sinkDepth;
        this.drawTopFace(this.topFace, this.baseColor, offset);
        this.drawSideLeft(this.sideFaceLeft, adjustBrightness(this.baseColor, -50), offset);
        this.drawSideRight(this.sideFaceRight, adjustBrightness(this.baseColor, -30), offset);
        this.emojiText.y = -this.depth3D / 2 + offset;
      },
    });

    // 彈起動畫（下陷結束後）
    setTimeout(() => {
      this.scene.tweens.addCounter({
        from: 1, to: 0, duration: bounceDur, ease: 'Bounce.easeOut',
        onUpdate: (tw) => {
          const t = tw.getValue();
          const offset = t * sinkDepth;
          this.drawTopFace(this.topFace, this.baseColor, offset);
          this.drawSideLeft(this.sideFaceLeft, adjustBrightness(this.baseColor, -50), offset);
          this.drawSideRight(this.sideFaceRight, adjustBrightness(this.baseColor, -30), offset);
          this.emojiText.y = -this.depth3D / 2 + offset;
        },
      });

      // 漣漪波紋
      const ripple = this.scene.add.graphics();
      ripple.lineStyle(2, this.baseColor, 0.5);
      // 用菱形漣漪取代圓形
      const rw = this.tileW * 0.6, rh = this.tileH * 0.6;
      ripple.beginPath();
      ripple.moveTo(0, -rh / 2);
      ripple.lineTo(rw / 2, 0);
      ripple.lineTo(0, rh / 2);
      ripple.lineTo(-rw / 2, 0);
      ripple.closePath();
      ripple.strokePath();
      ripple.setPosition(this.x, this.y);

      this.scene.tweens.addCounter({
        from: 0, to: 1, duration: 500, ease: 'Cubic.easeOut',
        onUpdate: (tw) => {
          const t = tw.getValue();
          ripple.setScale(1 + t * 2);
          ripple.setAlpha(0.5 * (1 - t));
        },
      });
      setTimeout(() => ripple.destroy(), 550);
    }, sinkDur + 10);
  }

  // 角色經過時的輕微下壓
  playPassEffect() {
    const sinkDepth = 2;
    const dur = 100;

    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: dur,
      onUpdate: (tw) => {
        const t = tw.getValue();
        // 先下去再回來（sin 曲線）
        const offset = Math.sin(t * Math.PI) * sinkDepth;
        this.drawTopFace(this.topFace, this.baseColor, offset);
        this.drawSideLeft(this.sideFaceLeft, adjustBrightness(this.baseColor, -50), offset);
        this.drawSideRight(this.sideFaceRight, adjustBrightness(this.baseColor, -30), offset);
        this.emojiText.y = -this.depth3D / 2 + offset;
      },
    });
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
