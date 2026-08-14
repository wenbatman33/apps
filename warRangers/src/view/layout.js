/*
 * 版面：同一份戰場資料（720×1280 直式座標）要能同時服務手機與 PC。
 *
 * 舊版的致命傷就是把 720×1560 的直式畫布丟給 Phaser FIT，在 16:9 螢幕上被壓成
 * 中間一條 332px 的細長條，字小到看不清、左右各留一大片空白。
 * 這裡改成：畫布比例跟著視窗走，地圖等比置中，多出來的橫向空間拿去放側欄。
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.Layout=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){

  const MAP_W=720,MAP_H=1280;

  function compute(windowWidth,windowHeight){
    const aspect=windowWidth/windowHeight;
    const landscape=aspect>=1.05;
    /*
     * 直式：畫布比地圖高 210px，地圖置頂、下方留一整條乾淨面板區。
     *       （把武將列與策略卡疊在地圖上會直接蓋住我方主城。）
     * 橫式：16:9 畫布，地圖等比置中，多出來的橫向空間就是左右側欄。
     */
    const panel=landscape?0:250;   /* 多一列放兵糧與計策兩條資源 */
    const width=landscape?1280:720;
    const height=landscape?720:MAP_H+panel;
    const mapScale=landscape?720/MAP_H:1;
    const mapW=MAP_W*mapScale,mapH=MAP_H*mapScale;
    const mapX=(width-mapW)/2,mapY=landscape?(height-mapH)/2:0;
    const sideWidth=landscape?mapX:0;
    return{
      landscape,width,height,mapScale,mapX,mapY,mapW,mapH,sideWidth,panel,
      /* 直式面板區的頂端 y；橫式沒有面板區。 */
      panelTop:landscape?height:mapH,
      /* 戰場座標 → 畫布座標 */
      toScreenX:x=>mapX+x*mapScale,
      toScreenY:y=>mapY+y*mapScale,
      /* 畫布座標 → 戰場座標（輸入判定用） */
      toMapX:x=>(x-mapX)/mapScale,
      toMapY:y=>(y-mapY)/mapScale,
      scale:value=>value*mapScale,
      /* 側欄中心；直式時退回畫面上下緣 */
      leftPanelX:landscape?mapX/2:width/2,
      rightPanelX:landscape?width-mapX/2:width/2,
    };
  }

  return{MAP_W,MAP_H,compute};
});
