import Phaser from 'phaser';
import { TOKEN, BOARD } from '../config';
import { Board } from './Board';

export class Token {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  currentTileIndex = 0;
  isMoving = false;

  // 子元件（分開以便控制陰影和角色的獨立動畫）
  private shadow: Phaser.GameObjects.Graphics;
  private body: Phaser.GameObjects.Container;  // 角色主體（bg + emoji）

  constructor(scene: Phaser.Scene, board: Board) {
    this.scene = scene;
    const pos = board.getTilePosition(0);

    // 角色陰影（在地面上的橢圓陰影）
    this.shadow = scene.add.graphics();
    this.shadow.fillStyle(0x000000, 0.18);
    this.shadow.fillEllipse(0, 0, TOKEN.size * 0.8, 10);

    // 角色主體容器
    const bg = scene.add.graphics();
    bg.fillStyle(0xFFFFFF, 1);
    bg.fillCircle(0, 0, TOKEN.size / 2 + 2);
    bg.lineStyle(3, 0xF5A623, 1);
    bg.strokeCircle(0, 0, TOKEN.size / 2 + 2);

    const emoji = scene.add.text(0, -1, TOKEN.emoji, { fontSize: '20px' }).setOrigin(0.5);
    this.body = scene.add.container(0, -18, [bg, emoji]);

    this.container = scene.add.container(pos.x, pos.y, [this.shadow, this.body]);
    this.container.setDepth(10);
    this.startIdle();
  }

  private startIdle() {
    const baseBodyY = -18;
    // 角色微幅上下浮動
    this.scene.tweens.addCounter({
      from: 0, to: Math.PI * 2, duration: 2000, repeat: -1,
      onUpdate: (tw) => {
        const t = tw.getValue();
        this.body.y = baseBodyY + Math.sin(t) * 3;
        // 陰影隨角色高度變化縮放
        const shadowScale = 1 - Math.sin(t) * 0.08;
        this.shadow.setScale(shadowScale);
        this.shadow.setAlpha(0.18 - Math.sin(t) * 0.03);
      },
    });
  }

  moveTo(board: Board, steps: number, cb: (idx: number) => void) {
    if (this.isMoving) { cb(this.currentTileIndex); return; }
    this.isMoving = true;
    this.scene.tweens.killTweensOf(this.body);
    this.scene.tweens.killTweensOf(this.shadow);
    this.doHop(board, steps, 0, cb);
  }

  private doHop(board: Board, total: number, step: number, cb: (idx: number) => void) {
    if (step >= total) {
      // 最後落地 — 播放下陷彈起效果
      this.playLandBounce(() => {
        board.getTile(this.currentTileIndex).playLandEffect();
        this.startIdle();
        this.isMoving = false;
        cb(this.currentTileIndex);
      });
      return;
    }

    const next = (this.currentTileIndex + 1) % BOARD.tileCount;
    const pos = board.getTilePosition(next);
    const isLast = step === total - 1;
    if (!isLast) board.getTile(next).playPassEffect();

    const sx = this.container.x, sy = this.container.y;
    const tx = pos.x, ty = pos.y;
    const hh = isLast ? TOKEN.hopHeight * 1.5 : TOKEN.hopHeight;
    const dur = TOKEN.hopDuration;

    // 容器水平+垂直移動
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: dur, ease: 'Linear',
      onUpdate: (tw) => {
        const t = tw.getValue();
        this.container.x = Phaser.Math.Linear(sx, tx, t);
        this.container.y = Phaser.Math.Linear(sy, ty, t);
      },
    });

    // 角色主體的跳躍弧線（相對於容器的 y 偏移）
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: dur, ease: 'Linear',
      onUpdate: (tw) => {
        const t = tw.getValue();
        const arc = -4 * hh * t * (t - 1); // 拋物線
        this.body.y = -18 - arc;
        // 陰影在跳躍高點時變小變淡
        const shadowScale = 1 - (arc / hh) * 0.3;
        this.shadow.setScale(shadowScale, shadowScale * 0.6);
        this.shadow.setAlpha(0.18 - (arc / hh) * 0.08);
      },
    });

    setTimeout(() => {
      this.container.x = tx;
      this.container.y = ty;
      this.currentTileIndex = next;

      if (!isLast) {
        // 經過格子的輕微壓地效果
        this.scene.tweens.addCounter({
          from: 0, to: 1, duration: 60,
          onUpdate: (tw) => {
            const s = Math.sin(tw.getValue() * Math.PI);
            this.body.setScale(1 + s * 0.06, 1 - s * 0.04);
            this.body.y = -18 + s * 2; // 輕微下壓
          },
        });
        setTimeout(() => {
          this.body.setScale(1);
          this.body.y = -18;
          this.shadow.setScale(1);
          this.shadow.setAlpha(0.18);
          this.doHop(board, total, step + 1, cb);
        }, 75);
      } else {
        // 最後一步 — 由 playLandBounce 處理
        this.body.y = -18;
        this.shadow.setScale(1);
        this.shadow.setAlpha(0.18);
        this.doHop(board, total, step + 1, cb);
      }
    }, dur + 15);
  }

  // 下陷→彈起 落地效果
  private playLandBounce(done: () => void) {
    const sinkDepth = 6;    // 下陷深度
    const sinkDur = 100;     // 下陷持續時間
    const bounceDur = 400;   // 彈起持續時間

    // Phase 1: 快速下陷（角色往下壓 + 壓扁）
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: sinkDur, ease: 'Quad.easeIn',
      onUpdate: (tw) => {
        const t = tw.getValue();
        this.body.y = -18 + t * sinkDepth;
        this.body.setScale(1 + t * 0.12, 1 - t * 0.1);
        // 陰影變大（角色更貼近地面）
        this.shadow.setScale(1 + t * 0.2, (1 + t * 0.2) * 0.6);
        this.shadow.setAlpha(0.18 + t * 0.08);
      },
    });

    // Phase 2: 彈起（Bounce 緩動）
    setTimeout(() => {
      this.scene.tweens.addCounter({
        from: 1, to: 0, duration: bounceDur, ease: 'Bounce.easeOut',
        onUpdate: (tw) => {
          const t = tw.getValue();
          this.body.y = -18 + t * sinkDepth;
          this.body.setScale(1 + t * 0.12, 1 - t * 0.1);
          this.shadow.setScale(1 + t * 0.2, (1 + t * 0.2) * 0.6);
          this.shadow.setAlpha(0.18 + t * 0.08);
        },
      });

      setTimeout(() => {
        this.body.y = -18;
        this.body.setScale(1);
        this.shadow.setScale(1);
        this.shadow.setAlpha(0.18);
        done();
      }, bounceDur + 20);
    }, sinkDur + 10);
  }
}
