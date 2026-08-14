globalThis.game=new Phaser.Game({
  type:Phaser.AUTO,parent:'game',transparent:true,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:W,height:H},
  scene:BATTLE_MODE?[BattleScene]:[LayoutPreviewScene],
});
