import Phaser from 'phaser';
import { DICE, GAME_WIDTH, COLORS } from '../config';

const DOT_PATTERNS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.4, -0.4], [0.4, 0.4]],
  3: [[-0.4, -0.4], [0, 0], [0.4, 0.4]],
  4: [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]],
  5: [[-0.4, -0.4], [0.4, -0.4], [0, 0], [-0.4, 0.4], [0.4, 0.4]],
  6: [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0], [0.4, 0], [-0.4, 0.4], [0.4, 0.4]],
};

export interface DiceResult {
  value1: number; value2: number; total: number; isDoubles: boolean;
}

export class Dice {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  private d1: Phaser.GameObjects.Graphics;
  private d2: Phaser.GameObjects.Graphics;
  private dc1: Phaser.GameObjects.Container;
  private dc2: Phaser.GameObjects.Container;
  isRolling = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const s = DICE.size, g = DICE.gap;
    this.d1 = scene.add.graphics();
    this.dc1 = scene.add.container(-s/2-g/2, 0, [this.d1]);
    this.d2 = scene.add.graphics();
    this.dc2 = scene.add.container(s/2+g/2, 0, [this.d2]);
    this.container = scene.add.container(GAME_WIDTH/2, DICE.areaY, [this.dc1, this.dc2]);
    this.container.setDepth(18).setAlpha(0).setScale(0);
    this.drawDie(this.d1, 1); this.drawDie(this.d2, 1);
  }

  private drawDie(g: Phaser.GameObjects.Graphics, v: number) {
    const s = DICE.size, h = s/2;
    g.clear();
    g.fillStyle(0x000000, 0.08); g.fillRoundedRect(-h+3,-h+3,s,s,12);
    g.fillStyle(0xFFFFFF, 1); g.fillRoundedRect(-h,-h,s,s,12);
    g.lineStyle(2, COLORS.lightGray, 0.6); g.strokeRoundedRect(-h,-h,s,s,12);
    (DOT_PATTERNS[v]||DOT_PATTERNS[1]).forEach(([dx,dy]) => {
      g.fillStyle(COLORS.darkBrown, 1);
      g.fillCircle(dx*s*0.35, dy*s*0.35, 4.5);
    });
  }

  roll(cb: (r: DiceResult) => void) {
    if (this.isRolling) return;
    this.isRolling = true;
    const v1 = Phaser.Math.Between(1,6), v2 = Phaser.Math.Between(1,6);
    const result: DiceResult = { value1:v1, value2:v2, total:v1+v2, isDoubles:v1===v2 };

    // 彈出
    this.container.setAlpha(1).setScale(0.3).setY(DICE.areaY+60);
    this.scene.tweens.addCounter({ from:0, to:1, duration:250, ease:'Back.easeOut',
      onUpdate:(tw)=>{
        const t=tw.getValue();
        this.container.setY(Phaser.Math.Linear(DICE.areaY+60,DICE.areaY,t));
        this.container.setScale(Phaser.Math.Linear(0.3,1,t));
      }
    });

    // 滾動（setTimeout 控制時序）
    setTimeout(()=>{
      this.scene.tweens.addCounter({ from:0, to:1, duration:700, ease:'Cubic.easeOut',
        onUpdate:(tw)=>{
          const p=tw.getValue();
          if(Math.random()>p*0.7){
            this.drawDie(this.d1,Phaser.Math.Between(1,6));
            this.drawDie(this.d2,Phaser.Math.Between(1,6));
          }
          this.dc1.setRotation(Phaser.Math.FloatBetween(-0.1,0.1)*(1-p));
          this.dc2.setRotation(Phaser.Math.FloatBetween(-0.1,0.1)*(1-p));
        }
      });
    }, 280);

    // 顯示結果
    setTimeout(()=>{
      this.dc1.setRotation(0); this.dc2.setRotation(0);
      this.drawDie(this.d1, v1); this.drawDie(this.d2, v2);
      this.scene.tweens.addCounter({ from:0, to:1, duration:200,
        onUpdate:(tw)=>{ this.container.setScale(1+0.15*Math.sin(tw.getValue()*Math.PI)); }
      });
    }, 1000);

    // 隱藏
    setTimeout(()=>{
      this.container.setScale(1);
      this.scene.tweens.addCounter({ from:0, to:1, duration:200,
        onUpdate:(tw)=>{
          const t=tw.getValue();
          this.container.setAlpha(1-t);
          this.container.setScale(1-t*0.5);
        }
      });
    }, 1500);

    // 回調
    setTimeout(()=>{
      this.isRolling = false;
      cb(result);
    }, 1750);
  }
}
