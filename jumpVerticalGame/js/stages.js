// 6 套關卡設定：背景 + 難度參數
// 乘數 0 代表此關不出現對應跳板/怪物
window.STAGES = [
  // 第 1 關：幾乎純練習，但仍有少量蝙蝠讓玩家認識
  { id:1, name:'森林黎明', bg:'01', basePlat:'platMove', enemyMul:0.25, breakMul:0,   moveMul:0.2, iceMul:0,   flashMul:0.1, autoScrollMul:0.5 },
  // 第 2 關：加入移動跳板與易碎跳板
  { id:2, name:'北方雪境', bg:'02', basePlat:'platIce', enemyMul:0.7,  breakMul:0.6, moveMul:0.9, iceMul:0,   flashMul:0.2, autoScrollMul:0.8 },
  // 第 3 關：解鎖冰面打滑
  { id:3, name:'紫夢花園', bg:'03', basePlat:'platFlash', enemyMul:1.0,  breakMul:0.9, moveMul:1.0, iceMul:0.6, flashMul:0.3, autoScrollMul:1.0 },
  // 第 4 關：易碎跳板變多，冰面持續
  { id:4, name:'火山灰燼', bg:'04', basePlat:'platBreak', enemyMul:1.2,  breakMul:1.2, moveMul:1.1, iceMul:0.5, flashMul:0.5, autoScrollMul:1.05 },
  // 第 5 關：解鎖閃爍跳板
  { id:5, name:'叢林沼澤', bg:'05', basePlat:'plat',     enemyMul:1.4,  breakMul:1.2, moveMul:1.2, iceMul:0.4, flashMul:0.7, autoScrollMul:1.15 },
  // 第 6 關：全部拉滿
  { id:6, name:'終極試煉', bg:'06', enemyMul:1.7,  breakMul:1.4, moveMul:1.3, iceMul:0.7, flashMul:1.0, autoScrollMul:1.3 },
];
