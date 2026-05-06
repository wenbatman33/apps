// 6 套关卡设置：背景 + 难度参数
// 乘数 0 代表此关不出现对应跳板/怪物
window.STAGES = [
  // 第 1 关：几乎纯练习，但仍有少量蝙蝠让玩家认识
  { id:1, name:'森林黎明', bg:'01', basePlat:'platMove', enemyMul:0.25, breakMul:0,   moveMul:0.2, iceMul:0,   flashMul:0.1, autoScrollMul:0.5 },
  // 第 2 关：加入移动跳板与易碎跳板
  { id:2, name:'北方雪境', bg:'02', basePlat:'platIce', enemyMul:0.7,  breakMul:0.6, moveMul:0.9, iceMul:0,   flashMul:0.2, autoScrollMul:0.8 },
  // 第 3 关：解锁冰面打滑
  { id:3, name:'紫梦花园', bg:'03', basePlat:'platFlash', enemyMul:1.0,  breakMul:0.9, moveMul:1.0, iceMul:0.6, flashMul:0.3, autoScrollMul:1.0 },
  // 第 4 关：易碎跳板变多，冰面持续
  { id:4, name:'火山灰烬', bg:'04', basePlat:'platBreak', enemyMul:1.2,  breakMul:1.2, moveMul:1.1, iceMul:0.5, flashMul:0.5, autoScrollMul:1.05 },
  // 第 5 关：解锁闪烁跳板
  { id:5, name:'丛林沼泽', bg:'05', basePlat:'plat',     enemyMul:1.4,  breakMul:1.2, moveMul:1.2, iceMul:0.4, flashMul:0.7, autoScrollMul:1.15 },
  // 第 6 关：全部拉满
  { id:6, name:'终极试炼', bg:'06', enemyMul:1.7,  breakMul:1.4, moveMul:1.3, iceMul:0.7, flashMul:1.0, autoScrollMul:1.3 },
];
