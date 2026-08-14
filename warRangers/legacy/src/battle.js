class BattleScene extends Phaser.Scene{
  constructor(){super('Battle');}
  preload(){ART.preload(this);}

  create(){
    ART.animations(this);
    this.params=new URLSearchParams(location.search);
    this.progress=this.loadProgress();
    this.mapIndex=Phaser.Math.Clamp((Number(this.params.get('level'))||this.progress.stage||1)-1,0,CampaignRules.maps.length-1);
    const navigation=this.mapIndex===0?Level1Navigation:CampaignNavigation.scenes[String(this.mapIndex+1)];
    this.map=CampaignRules.fromNavigation(navigation,this.mapIndex+1);this.graph=CampaignRules.adjacency(this.map);
    this.units=[];this.nodes=[];this.blockades=[];this.gameOver=false;this.battleEnding=false;this.paused=false;this.commandMode=null;this.selectedSource=null;this.nodeDrag=null;
    this.heroRoster={
      zhaoyun:{id:'zhaoyun',name:'趙雲',unit:null,cooldown:0},
      guanyu:{id:'guanyu',name:'關羽',unit:null,cooldown:0},
      zhangfei:{id:'zhangfei',name:'張飛',unit:null,cooldown:0},
      machao:{id:'machao',name:'馬超',unit:null,cooldown:0},
      huangzhong:{id:'huangzhong',name:'黃忠',unit:null,cooldown:0},
    };
    this.tacticCooldown=0;this.enemyTacticCooldown=12;this.enemyDecisionClock=RULES.aiOpeningDelay;this.recruitBudget=[0,0];this.recruitCursor=[0,0];this.auditMode=this.params.has('test-audit');this.fastMode=this.params.has('test-fast');this.soloTest=this.params.has('test-solo');
    this.timeLeft=this.fastMode?45:RULES.matchSeconds;this.overtime=false;this.spawnMultiplier=this.fastMode?3.2:1;
    this.createGridMap();
    this.createNodes();this.installBattlefieldPointerInput();this.applyAuditOwnership();this.createHud();this.createControls();
    this.showHint('點我方綠色城寨 →　再點任一目標城寨即可出兵（空白鍵＝全軍出擊）');
    if(this.auditMode&&this.params.has('test-paused'))this.paused=true;
    if(this.auditMode&&this.params.has('test-collapse'))this.time.delayedCall(1500,()=>this.collapseBase(this.enemyBase));
    if(this.auditMode)this.time.delayedCall(0,()=>{if(document.title==='三國爭鋒')document.title=`READY|L${this.mapIndex+1}|nodes${this.nodes.length}`;});
  }

  loadProgress(){
    const fallback={level:1,merit:0,wins:0,losses:0,stage:1};
    if(new URLSearchParams(location.search).has('test-reset')){localStorage.removeItem('warRangersProgressV3');return fallback;}
    try{
      const saved=JSON.parse(localStorage.getItem('warRangersProgressV3')||'null');
      return saved?{level:Phaser.Math.Clamp(Number(saved.level)||1,1,10),merit:Math.max(0,Number(saved.merit)||0),wins:Math.max(0,Number(saved.wins)||0),losses:Math.max(0,Number(saved.losses)||0),stage:Phaser.Math.Clamp(Number(saved.stage)||1,1,3)}:fallback;
    }catch(_error){return fallback;}
  }
  saveProgress(){localStorage.setItem('warRangersProgressV3',JSON.stringify(this.progress));}
  commanderBonus(){return(this.progress.level-1)*RULES.commanderPerLevel;}
  upgradeCost(){return this.progress.level>=10?Infinity:this.progress.level;}

  createGridMap(){
    this.mapLayer=this.add.container(0,BATTLE_Y).setDepth(-100);this.unitLayer=this.add.container(0,BATTLE_Y).setDepth(50);this.nodeLayer=this.add.container(0,BATTLE_Y).setDepth(100);
    if(this.map.authored){
      const key=this.mapIndex===0?'jingzhou_level1_master_v1':`campaign_scene_${this.mapIndex+1}_master_v1`;
      const background=this.add.image(W/2,640,key).setDisplaySize(720,1280).setDepth(-110);this.mapLayer.add(background);return;
    }
    const {cols,rows,tile}=CampaignRules.GRID;
    if(this.map.theme.groundSheet){
      /* 一張連續地景作底；透明格狀道路仍是唯一可行走與顯示來源。 */
      const ground=this.add.image(W/2,630,'map_plains_ground_v10').setDepth(-110);ground.setDisplaySize(W,1260);this.mapLayer.add(ground);
      const riverRows=[...new Set([...this.map.obstacleTiles].map(cell=>Number(cell.split(',')[1])))].sort((a,b)=>a-b);
      const upperRiver=riverRows[0],lowerRiver=riverRows.at(-1);
      for(const cell of this.map.obstacleTiles){
        const[c,r]=cell.split(',').map(Number),bridge=this.map.walkable.has(cell);
        const frame=bridge?(r===upperRiver?2:3):(r===upperRiver?0:1);
        const riverTile=this.add.sprite((c+.5)*tile,(r+.5)*tile,this.map.theme.riverSheet,frame).setDepth(bridge?-99:-105);this.mapLayer.add(riverTile);
        riverTile.setDisplaySize(bridge?58:tile+1,bridge?58:tile+1);
      }
      for(const cell of this.map.walkable){
        if(this.map.obstacleTiles.has(cell))continue;
        const[c,r]=cell.split(',').map(Number),frame=CampaignRules.roadFrameAt(this.map,c,r);
        const road=this.add.sprite((c+.5)*tile,(r+.5)*tile,this.map.theme.roadSheet,frame).setDisplaySize(58,58).setDepth(-100+r*.001);this.mapLayer.add(road);
      }
      return;
    }
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const mapTile=this.add.image((c+.5)*tile,(r+.5)*tile,CampaignRules.tileKeyAt(this.map,c,r)).setDisplaySize(tile+1,tile+1).setDepth(-100);this.mapLayer.add(mapTile);
    }
    /* 格狀邏輯止於 1260；以同一地表 PNG 延伸到 1370，避免產生假的額外道路或巨大 UI 空白。 */
    for(let r=rows;r<43;r++)for(let c=0;c<cols;c++){const groundTile=this.add.image((c+.5)*tile,(r+.5)*tile,this.map.theme.ground).setDisplaySize(tile+1,tile+1).setDepth(-100);this.mapLayer.add(groundTile);}
  }
  terrainFrame(c,r){
    const mirrorRow=Math.min(r,41-r),band=mirrorRow<6?0:mirrorRow<12?1:mirrorRow<18?2:3,sector=Math.min(3,Math.floor(c/6));
    const zones=[
      [1,5,5,1],
      [0,0,3,3],
      [0,0,3,3],
      [8,8,10,10],
    ];
    return zones[band][sector];
  }

  createNodes(){
    for(const spec of this.map.nodes){
      const maxHp=spec.type==='base'?(this.fastMode?3600:RULES.baseHp):0;
      const key=spec.type==='base'?(spec.owner===0?'keep_shu':'keep_wei'):'outpost_neutral_v5';
      const sprite=ART.fit(this.add.image(spec.x,spec.y,key),spec.type==='base'?135:88,spec.type==='base'?118:88).setDepth(spec.y+50);this.nodeLayer.add(sprite);
      const frame=this.add.image(spec.x,spec.y-(spec.type==='base'?68:54),spec.owner===0?'health_friendly_v2':spec.owner===1?'health_enemy_v2':'energy_trough').setDepth(3900);
      this.nodeLayer.add(frame);
      ART.width(frame,spec.type==='base'?126:76);
      const fill=this.add.image(frame.x-(spec.type==='base'?51:30),frame.y,'energy_fill').setOrigin(0,.5).setTint(spec.owner===0?0x35e0b6:spec.owner===1?0xff566a:0xffd667).setDepth(3901);
      this.nodeLayer.add(fill);
      ART.width(fill,spec.type==='base'?102:60);
      const initialGarrison=spec.type==='base'?RULES.baseStartGarrison:RULES.neutralGarrison;
      const garrisonText=this.add.text(spec.x,spec.y+(spec.type==='base'?55:39),String(initialGarrison),{fontSize:spec.type==='base'?'24px':'21px',fontStyle:'bold',color:'#ffffff',stroke:'#07131f',strokeThickness:6}).setOrigin(.5).setDepth(3902);
      const repairText=this.add.text(spec.x,frame.y-18,'',{fontSize:'14px',fontStyle:'bold',color:'#fff1a3',stroke:'#07131f',strokeThickness:4}).setOrigin(.5).setDepth(3902);
      this.nodeLayer.add([garrisonText,repairText]);
      const node={...spec,maxHp,hp:maxHp,garrison:initialGarrison,condition:1,sprite,frame,fill,fillW:fill.width,garrisonText,repairText,spawnClock:1,preferred:null,hero:false,dispatchCooldown:0,defenseClock:Phaser.Math.FloatBetween(.2,1),aiClock:RULES.aiOpeningDelay+Phaser.Math.FloatBetween(0,.55)};
      this.nodes.push(node);this.updateNodeVisual(node);
    }
    this.playerBase=this.nodeById('player');this.enemyBase=this.nodeById('enemy');
  }
  nodeById(id){return this.nodes.find(n=>n.id===id);}

  /*
   * PC 輸入不依賴 Phaser 的 Sprite hit-test 與 drag 系統：
   * 畫布在 PC 會被 FIT 縮到很小，透明像素與 drag 門檻都會讓點擊失準。
   * 這裡一律用「戰場座標 + 橢圓命中範圍」自己判定，滑鼠與觸控走同一條路徑。
   */
  nodeAtPointer(pointer){
    const mapY=pointer.y-BATTLE_Y;
    return this.nodes.map(node=>{
      const radiusX=node.type==='base'?102:88,radiusY=node.type==='base'?88:78;
      return{node,score:((pointer.x-node.x)/radiusX)**2+((mapY-node.y)/radiusY)**2};
    }).filter(hit=>hit.score<=1).sort((a,b)=>a.score-b.score)[0]?.node||null;
  }
  installBattlefieldPointerInput(){
    this.input.on('pointerdown',pointer=>{
      const node=this.nodeAtPointer(pointer);if(!node)return;
      this.pointerCommand={node,startX:pointer.x,startY:pointer.y-BATTLE_Y};
    });
    this.input.on('pointermove',pointer=>{
      const command=this.pointerCommand;if(!command||command.node.owner!==0||this.commandMode?.startsWith('hero:')||this.commandMode==='blockade')return;
      if(Phaser.Math.Distance.Between(command.startX,command.startY,pointer.x,pointer.y-BATTLE_Y)<22)return;
      if(!this.nodeDrag)this.startNodeDrag(command.node,pointer);
      this.moveNodeDrag(pointer);
    });
    this.input.on('pointerup',pointer=>{
      const command=this.pointerCommand;this.pointerCommand=null;if(!command)return;
      if(this.nodeDrag){this.endNodeDrag(command.node,pointer);return;}
      const released=this.nodeAtPointer(pointer);if(released)this.onNodePressed(released);
    });
    this.input.on('gameout',()=>{this.pointerCommand=null;if(this.nodeDrag){this.clearSelection();this.nodeDrag=null;}});
    /* 休閒向一鍵操作：空白鍵＝全軍出擊，所有我方城同時朝最近的敵／中立城派兵。 */
    this.input.keyboard?.on('keydown-SPACE',()=>this.allOutAssault());
    this.input.keyboard?.on('keydown-A',()=>this.allOutAssault());
  }
  allOutAssault(){
    if(this.gameOver)return;
    const sources=this.nodes.filter(node=>node.owner===0&&!node.destroyed&&CampaignRules.dispatchCount(node.garrison)>=2);
    let waves=0;
    for(const source of sources){
      const target=this.nearestHostile(source);if(!target)continue;
      if(this.dispatchGarrison(source,target,0))waves++;
    }
    this.clearSelection();this.commandMode=null;this.tintControls();
    this.showHint(waves?`全軍出擊｜${waves} 座城寨同時進攻`:'目前沒有城寨湊得出兩人以上的部隊');
  }
  nearestHostile(source){
    const ranked=this.nodes.filter(node=>node.owner!==0&&!node.destroyed)
      .map(node=>({node,steps:CampaignRules.shortestPath(this.map,source.id,node.id).length||99}))
      .filter(entry=>entry.steps>1).sort((a,b)=>a.steps-b.steps||a.node.garrison-b.node.garrison);
    return ranked[0]?.node||null;
  }
  heroIsStationed(hero){
    const unit=hero?.unit;return !!(unit&&!unit.dead&&unit.currentNode&&unit.mission==='station'&&unit.assignment===unit.currentNode);
  }
  shortNodeName(id){
    const labels={player:'主城',enemy:'敵主城',northwest:'西北寨',northeast:'東北寨',southwest:'西南寨',southcenter:'南中寨',southeast:'東南寨',center:'中寨',upperwest:'西北寨',uppereast:'東北寨',middlewest:'西中寨',middleeast:'東中寨',lowercenter:'南中寨',uppercenter:'北中寨'};
    return labels[id]||'城寨';
  }
  applyAuditOwnership(){
    const garrison=Number(this.params.get('test-garrison'));if(this.auditMode&&Number.isFinite(garrison)&&garrison>0){this.playerBase.garrison=Math.floor(garrison);this.updateNodeVisual(this.playerBase);}
    const id=this.params.get('test-own');if(!id)return;const node=this.nodeById(id);if(!node||node.type!=='outpost')return;
    node.owner=0;node.garrison=12;node.condition=1;node.spawnClock=999;this.updateNodeVisual(node);
  }
  startNodeDrag(node,pointer){
    if(this.gameOver||node.owner!==0||this.commandMode?.startsWith('hero:')||this.commandMode==='blockade')return;
    if(this.selectedSource===node)this.selectedSource=null;
    this.commandMode=null;this.tintControls();
    this.nodeDrag={source:node,startX:pointer.x,startY:pointer.y-BATTLE_Y};
    node.sprite.setTint(0x75ffd8);this.highlightAdjacentRoutes(node);this.showHint(`由 ${this.nodeName(node)} 拖向高亮城寨派兵`);
  }
  moveNodeDrag(pointer){
    if(!this.nodeDrag)return;const source=this.nodeDrag.source,target=this.dragDirectionTarget(source,pointer);
    for(const id of this.graph[source.id]){const candidate=this.nodeById(id);candidate.sprite.setTint(candidate===target?0xffeb72:0x75ffd8);}
  }
  endNodeDrag(node,pointer){
    if(!this.nodeDrag)return;const source=this.nodeDrag.source;this.nodeDrag=null;this.dragGuide?.destroy(true);this.dragGuide=null;source.sprite.clearTint();
    for(const id of this.graph[source.id])this.nodeById(id).sprite.clearTint();
    const target=this.dragDirectionTarget(source,pointer);
    if(!target){this.showHint('由城寨沿著其中一條道路拖一小段即可出兵');return;}
    this.manualDispatch(source,target);
  }
  dragDirectionTarget(source,pointer){
    /* 直接拖到某座城寨上就以那座為準，不再靠角度猜；猜錯目標是最惱人的操作失誤。 */
    const direct=this.nodeAtPointer(pointer);if(direct&&direct!==source)return direct;
    const mapY=pointer.y-BATTLE_Y,dx=pointer.x-source.x,dy=mapY-source.y,distance=Math.hypot(dx,dy);
    /* PC 只需沿道路拉約 30 個戰場像素，不必一路拖到遠方建築。 */
    if(distance<28)return null;
    const dragX=dx/distance,dragY=dy/distance;
    let best=null,bestDot=.34;
    for(const id of this.graph[source.id]){
      const target=this.nodeById(id),points=CampaignRules.routePoints(this.map,source.id,id);
      const first=points.find(point=>Phaser.Math.Distance.Between(source.x,source.y,point.x,point.y)>=18)||points.at(-1);
      if(!first)continue;
      const roadDx=first.x-source.x,roadDy=first.y-source.y,roadLength=Math.max(1,Math.hypot(roadDx,roadDy));
      const dot=dragX*roadDx/roadLength+dragY*roadDy/roadLength;
      if(dot>bestDot){best=target;bestDot=dot;}
    }
    return best;
  }
  highlightAdjacentRoutes(source){
    this.dragGuide?.destroy(true);this.dragGuide=this.add.container(0,BATTLE_Y).setDepth(3800);
    for(const id of this.graph[source.id]){
      const target=this.nodeById(id);target.sprite.setTint(0x75ffd8);
      const points=CampaignRules.routePoints(this.map,source.id,id);
      for(let i=0;i<points.length;i+=2){const mark=this.add.image(points[i].x,points[i].y,'deploy_friendly_v2').setAlpha(.45);ART.fit(mark,26,18);this.dragGuide.add(mark);}
    }
  }
  manualDispatch(source,target){
    if(source.owner!==0||source===target)return false;
    const path=CampaignRules.shortestPath(this.map,source.id,target.id);
    if(path.length<2){this.showHint('這兩座城寨之間沒有連通的道路');return false;}
    if((source.dispatchCooldown||0)>0){this.showHint(`${this.nodeName(source)} 整隊中 ${source.dispatchCooldown.toFixed(1)} 秒`);if(this.auditMode)document.title=`DISPATCH_BLOCKED|${source.id}|${source.dispatchCooldown.toFixed(1)}`;return false;}
    const sent=this.dispatchGarrison(source,target,0);if(!sent){this.showHint(`${this.nodeName(source)} 只有 ${source.garrison} 名駐軍，至少需要 2 名才能派兵`);return false;}
    this.showRoute(source,target);
    const via=path.length>2?`｜途經 ${path.length-2} 座城寨`:'';
    this.showHint(`${this.nodeName(source)} 派出 ${sent} 人 → ${this.nodeName(target)}${via}`);
    if(this.auditMode)document.title=`DISPATCH|${source.id}>${target.id}|sent${sent}|remain${source.garrison}`;return true;
  }

  createHud(){
    this.hudBar=ART.fit(this.add.image(W/2,48,'status_modern_v10'),450,52).setDepth(6000);
    this.zhouYu=ART.fit(this.add.image(55,49,'zhouyu_v11'),96,105).setDepth(6001);
    this.simaYi=ART.fit(this.add.image(665,49,'simayi_v11'),96,105).setDepth(6001);
    this.enemyText=this.add.text(105,47,'周瑜 12000',{fontSize:'22px',fontStyle:'bold',color:'#fff0ed',stroke:'#321822',strokeThickness:6}).setOrigin(0,.5).setDepth(6002);
    this.timerText=this.add.text(W/2,47,'03:00',{fontSize:'26px',fontStyle:'bold',color:'#fff',stroke:'#172b42',strokeThickness:5}).setOrigin(.5).setDepth(6002);
    this.playerText=this.add.text(615,47,'司馬懿 12000',{fontSize:'22px',fontStyle:'bold',color:'#d8fff6',stroke:'#102e2a',strokeThickness:6}).setOrigin(1,.5).setDepth(6002);
    this.levelButton=ART.fit(this.add.image(72,93,'button_modern_v10'),116,38).setDepth(6000).setInteractive({useHandCursor:true});
    this.levelText=this.add.text(72,93,`第 ${this.mapIndex+1} 關`,{fontSize:'20px',fontStyle:'bold',color:'#fff',stroke:'#07131f',strokeThickness:6}).setOrigin(.5).setDepth(6002);
    this.levelButton.on('pointerdown',()=>this.cycleLevel());
    this.pauseButton=ART.fit(this.add.image(648,93,'button_modern_v10'),108,38).setDepth(6000).setInteractive({useHandCursor:true});
    this.pauseText=this.add.text(648,93,'暫 停',{fontSize:'20px',fontStyle:'bold',color:'#fff',stroke:'#07131f',strokeThickness:6}).setOrigin(.5).setDepth(6002);
    this.pauseButton.on('pointerdown',()=>this.togglePause());
    this.mapTitle=this.add.text(W/2,94,this.map.name,{fontSize:'22px',fontStyle:'bold',color:'#e8fff9',stroke:'#07131f',strokeThickness:6}).setOrigin(.5).setDepth(6002);
    this.tacticAlertFrame=ART.fit(this.add.image(W/2,174,'button_modern_v10'),410,78).setDepth(7000).setVisible(false);
    this.tacticAlertPortrait=ART.fit(this.add.image(210,174,'simayi_v11'),72,80).setDepth(7001).setVisible(false);
    this.tacticAlertText=this.add.text(380,174,'',{fontSize:'22px',fontStyle:'bold',color:'#fff2f2',stroke:'#2a0710',strokeThickness:6,align:'center'}).setOrigin(.5).setDepth(7002).setVisible(false);
  }

  createControls(){
    this.summaryTray=ART.fit(this.add.image(W/2,1398,'strategist_dock_v11'),710,126).setDepth(5899);
    this.commandTray=ART.fit(this.add.image(W/2,1500,'command_modern_v10'),710,96).setDepth(5900);
    this.supplyText=this.add.text(28,1358,'我方 0寨｜0/96｜0.74/秒',{fontSize:'22px',fontStyle:'bold',color:'#d9fff7',stroke:'#07131f',strokeThickness:7}).setDepth(6002);
    this.enemySupplyText=this.add.text(692,1358,'敵方 0寨｜0/96｜0.74/秒',{fontSize:'22px',fontStyle:'bold',color:'#ffd8dc',stroke:'#1b0910',strokeThickness:7}).setOrigin(1,0).setDepth(6002);
    this.tacticStatusText=this.add.text(W/2,1392,'我方孔明 可用　｜　敵策 12秒',{fontSize:'19px',fontStyle:'bold',color:'#ffe99a',stroke:'#07131f',strokeThickness:6}).setOrigin(.5).setDepth(6002);
    this.controlGuide=this.add.text(W/2,1422,'點我方城 →　點任一目標城寨　｜　空白鍵＝全軍出擊',{fontSize:'21px',fontStyle:'bold',color:'#ffffff',stroke:'#07131f',strokeThickness:7}).setOrigin(.5).setDepth(6002);
    this.hintText=this.add.text(W/2,1318,'',{fontSize:'18px',fontStyle:'bold',color:'#fff',backgroundColor:'#0a1f33ee',padding:{x:14,y:8},stroke:'#07131f',strokeThickness:5,align:'center'}).setOrigin(.5).setDepth(6003).setVisible(false);
    this.heroControls={
      guanyu:this.makeControl(64,1500,'guanyu','關羽','派駐／進攻',()=>this.setMode('hero:guanyu'),true,108),
      zhangfei:this.makeControl(182,1500,'zhangfei','張飛','派駐／進攻',()=>this.setMode('hero:zhangfei'),true,108),
      zhaoyun:this.makeControl(300,1500,'zhaoyun','趙雲','派駐／進攻',()=>this.setMode('hero:zhaoyun'),true,108),
      machao:this.makeControl(418,1500,'machao','馬超','派駐／進攻',()=>this.setMode('hero:machao'),true,108),
      huangzhong:this.makeControl(536,1500,'huangzhong','黃忠','派駐／進攻',()=>this.setMode('hero:huangzhong'),true,108),
    };
    this.tacticControl=this.makeControl(654,1500,'blockade_v12','孔明','拒馬陣',()=>this.setMode('blockade'),false,108);
    this.pausePanel=ART.fit(this.add.image(W/2,650,'result_v3'),360,230).setDepth(8500).setVisible(false);
    this.pauseLabel=this.add.text(W/2,620,'戰局暫停',{fontSize:'38px',fontStyle:'bold',color:'#fff',stroke:'#17324a',strokeThickness:6}).setOrigin(.5).setDepth(8501).setVisible(false);
    this.pauseHelp=this.add.text(W/2,675,'可以觀察據點與重新規劃路線',{fontSize:'16px',color:'#d8fff4',stroke:'#17324a',strokeThickness:3}).setOrigin(.5).setDepth(8501).setVisible(false);
  }
  makeControl(x,y,iconKey,title,subtitle,handler,isSprite=false,width=174){
    const frame=ART.fit(this.add.image(x,y,'button_modern_v10'),width,72).setDepth(6000).setInteractive({useHandCursor:true});
    const compact=width<130,iconX=x-width*(compact?.3:.31),textX=x+(compact?13:20);
    const icon=isSprite?this.add.sprite(iconX,y,iconKey,0):this.add.image(iconX,y,iconKey);
    if(isSprite)icon.setScale(compact?.05:.061);else ART.fit(icon,compact?27:34,compact?27:34);icon.setDepth(6001);
    const titleText=this.add.text(textX,y-13,title,{fontSize:compact?'20px':'24px',fontStyle:'bold',color:'#fff',stroke:'#07131f',strokeThickness:compact?6:7}).setOrigin(.5).setDepth(6002);
    const subText=this.add.text(textX,y+17,subtitle,{fontSize:compact?'13px':'18px',fontStyle:'bold',color:'#ffffff',stroke:'#07131f',strokeThickness:compact?5:6}).setOrigin(.5).setDepth(6002);
    frame.on('pointerdown',handler);return{frame,icon,titleText,subText};
  }

  setMode(mode){
    if(this.gameOver)return;
    if(mode.startsWith('hero:')){
      const hero=this.heroRoster[mode.split(':')[1]];if(!hero)return;
      if(hero.cooldown>0){this.showHint(`${hero.name}整備中 ${Math.ceil(hero.cooldown)} 秒`);return;}
      if(hero.unit&&!this.heroIsStationed(hero)){this.showHint(`${hero.name}正在行軍或作戰，抵達後才能再次下令`);return;}
    }
    if(mode==='blockade'&&this.tacticCooldown>0){this.showHint(`拒馬陣冷卻 ${Math.ceil(this.tacticCooldown)} 秒`);if(this.auditMode)document.title=`BLOCKADE_COOLDOWN|${Math.ceil(this.tacticCooldown)}`;return;}
    this.clearSelection();this.commandMode=mode;
    if(mode.startsWith('hero:')){const hero=this.heroRoster[mode.split(':')[1]];this.controlGuide.setText(`${hero.name}已選取｜點我方城派駐，點敵方／中立城進攻`);this.showHint(`${hero.name}：我方城＝派駐｜敵方或中立城＝直接進攻`);}
    if(mode==='blockade'){this.controlGuide.setText('孔明拒馬｜點任一城寨，封鎖敵軍來路');this.showHint('孔明已待命：所有城寨皆可點擊施放拒馬');for(const node of this.nodes)node.sprite.setTint(0xffe56f);}
    if(this.auditMode)document.title=`MODE|${mode}`;
    this.tintControls();
  }
  tintControls(){
    const pairs=[...Object.entries(this.heroControls).map(([id,c])=>[`hero:${id}`,c]),['blockade',this.tacticControl]];
    for(const [mode,c] of pairs)c.frame.clearTint().setTint(this.commandMode===mode?0x70ffd8:0xffffff);
  }
  clearSelection(){
    for(const node of this.nodes)node.sprite.clearTint();this.selectedSource=null;
    this.routeMarker?.destroy();this.routeMarker=null;this.dragGuide?.destroy(true);this.dragGuide=null;
  }
  showHint(text){
    if(!this.hintText)return;this.hintText.setText(text).setVisible(true);this.hintTimer?.remove(false);
    this.hintTimer=this.time.delayedCall(2600,()=>this.hintText?.setVisible(false));
  }

  onNodePressed(node){
    if(this.gameOver)return;
    if(this.paused)this.showHint('暫停中仍可規劃出兵、武將與計略');
    if(this.commandMode?.startsWith('hero:')){this.assignHero(node,this.commandMode.split(':')[1]);return;}
    if(this.commandMode==='blockade'){this.castBlockade(node);return;}
    /* PC 滑鼠以「點我方城 → 點發亮目標」為主要操作；拖曳仍完整保留。 */
    if(!this.selectedSource){
      if(node.owner!==0){this.showHint('只能從綠色的我方據點下令');return;}
      this.commandMode='route';this.selectedSource=node;node.sprite.setTint(0x75ffd8);this.highlightAdjacentRoutes(node);this.controlGuide.setText(`已選 ${this.nodeName(node)}｜點任一城寨即刻出兵`);this.showHint(`已選 ${this.nodeName(node)}｜可派往任一連通城寨，遠方會自動行軍`);if(this.auditMode)document.title=`SOURCE|${node.id}`;return;
    }
    if(node===this.selectedSource){this.clearSelection();this.commandMode=null;this.controlGuide.setText('點我方城再點目標｜也可直接拖曳出兵');this.showHint('已取消派兵');this.tintControls();return;}
    /* 目標不限相鄰：遠方城寨會自動沿最短路徑行軍，友軍城寨則是增援。 */
    const source=this.selectedSource;if(!this.manualDispatch(source,node))return;
    if(this.auditMode)document.title=`ROUTE|${source.id}>${node.id}`;
    this.clearSelection();this.commandMode=null;this.controlGuide.setText('整隊已出發｜再點我方城即可繼續派兵');this.tintControls();
  }
  nodeName(node){return node.type==='base'?(node.owner===0?'我方主城':'敵方主城'):`城寨 ${node.id.toUpperCase()}`;}
  pathPoints(fromId,toId){
    const path=CampaignRules.shortestPath(this.map,fromId,toId),out=[];
    for(let i=1;i<path.length;i++)out.push(...CampaignRules.routePoints(this.map,path[i-1],path[i]));
    return out;
  }
  showRoute(from,to){
    this.routeMarker?.destroy(true);this.routeMarker=this.add.container(0,BATTLE_Y).setDepth(80);
    const points=this.pathPoints(from.id,to.id);
    for(let i=0;i<points.length;i+=2){const mark=this.add.image(points[i].x,points[i].y,'deploy_friendly_v2').setAlpha(.55);ART.fit(mark,28,20);this.routeMarker.add(mark);}
    this.time.delayedCall(1300,()=>{this.routeMarker?.destroy(true);this.routeMarker=null;});
  }

  assignHero(node,heroId){
    const hero=this.heroRoster[heroId];if(!hero||hero.cooldown>0)return;
    const fromId=hero.unit?.currentNode||'player',path=CampaignRules.shortestPath(this.map,fromId,node.id);if(path.length<2){this.showHint(`${hero.name}已在這座城寨`);return;}
    const mission=node.owner===0?'station':'attack';
    if(hero.unit){const old=this.nodeById(fromId);hero.unit.currentNode=null;hero.unit.wait=0;hero.unit.assignment=node.id;hero.unit.mission=mission;hero.unit.sprite.setScale(UNITS.hero.visualScale);hero.unit.ring?.setVisible(true);if(old)old.hero=Object.values(this.heroRoster).some(record=>record.unit&&record.unit!==hero.unit&&!record.unit.dead&&record.unit.currentNode===old.id);this.setUnitRoute(hero.unit,fromId,path[1]);}
    else{hero.unit=this.spawnUnit(0,'hero',this.playerBase,path,true,0,0,heroId);hero.unit.assignment=node.id;hero.unit.mission=mission;}
    this.commandMode=null;this.tintControls();this.showHint(`${hero.name}正在前往 ${this.nodeName(node)}｜${mission==='station'?'派駐增援':'直接攻城'}`);
    if(this.auditMode)document.title=`HERO|${heroId}|${mission}|to:${node.id}`;
  }

  castTactic(node){
    const victims=this.units.filter(u=>!u.dead&&u.side===1&&Phaser.Math.Distance.Between(u.x,u.y,node.x,node.y)<=165);
    for(const u of victims){u.hp-=RULES.tacticDamage;if(u.hp<=0)this.killUnit(u);}
    this.playFire(node.x,node.y);this.tacticCooldown=RULES.tacticCooldown;this.commandMode=null;this.tintControls();
    this.showHint(`軍師火計命中 ${victims.length} 名敵軍｜冷卻 ${RULES.tacticCooldown} 秒`);
    if(this.auditMode)document.title=`TACTIC|hits${victims.length}`;
  }
  castBlockade(node){
    const adjacent=this.graph[node.id].map(id=>this.nodeById(id));
    if(!adjacent.length){this.showHint('這座城寨沒有可封鎖的道路');return;}
    const towardEnemy=adjacent.sort((a,b)=>{
      const pathA=CampaignRules.shortestPath(this.map,a.id,'enemy').length||99;
      const pathB=CampaignRules.shortestPath(this.map,b.id,'enemy').length||99;
      return pathA-pathB;
    })[0];
    const road=CampaignRules.routePoints(this.map,node.id,towardEnemy.id),point=road[Math.min(3,road.length-1)];
    if(!point){this.showHint('這條道路無法布陣');return;}
    for(const old of this.blockades)old.sprite?.destroy();
    const sprite=ART.fit(this.add.image(point.x,point.y,'blockade_v12'),92,64).setDepth(point.y+180);this.unitLayer.add(sprite);
    this.blockades=[{x:point.x,y:point.y,side:0,remaining:RULES.blockadeDuration,sprite}];
    this.tacticCooldown=RULES.tacticCooldown;this.commandMode=null;this.tintControls();
    this.showHint(`孔明布下拒馬陣｜敵軍經過此路將被阻擋 ${RULES.blockadeDuration} 秒`);
    if(this.auditMode)document.title=`BLOCKADE|${node.id}>${towardEnemy.id}`;
  }
  playFire(x,y){
    const fx=ART.fit(this.add.image(x,y,'fire_1_v5'),150,120).setDepth(5000);this.unitLayer.add(fx);
    this.time.delayedCall(120,()=>fx.active&&fx.setTexture('fire_2_v5'));
    this.time.delayedCall(260,()=>fx.active&&fx.setTexture('fire_3_v5'));
    this.time.delayedCall(540,()=>fx.destroy());
  }

  togglePause(){
    if(this.gameOver)return;this.paused=!this.paused;this.pauseText.setText(this.paused?'繼 續':'暫 停');this.pausePanel.setVisible(this.paused);this.pauseLabel.setVisible(this.paused);this.pauseHelp.setVisible(this.paused);
    this.showHint(this.paused?'戰局已暫停｜仍可按「派兵」規劃路線':'戰局繼續');
    if(this.auditMode)document.title=this.paused?'PAUSED':'RUNNING';
  }
  cycleLevel(){
    if(this.gameOver||this.units.length>0){this.showHint('開戰後不可更換關卡');return;}
    const next=(this.mapIndex+1)%CampaignRules.maps.length+1;location.search=`?level=${next}`;
  }

  update(_time,deltaMs){
    if(this.gameOver)return;const dt=Math.min(deltaMs/1000,.05);this.renderHud();if(this.paused)return;
    this.timeLeft-=dt;for(const hero of Object.values(this.heroRoster))hero.cooldown=Math.max(0,hero.cooldown-dt);this.tacticCooldown=Math.max(0,this.tacticCooldown-dt);this.enemyTacticCooldown=Math.max(0,this.enemyTacticCooldown-dt);
    this.updateGarrisons(dt);this.updateAI(dt);this.updateBlockades(dt);this.updateUnits(dt);this.updateBaseDefense();this.updateEnemyTactic();this.renderHud();
    if(this.timeLeft<=0)this.beginOvertime();
  }

  updateGarrisons(dt){
    const owned=[0,1].map(side=>this.nodes.filter(n=>n.type==='outpost'&&n.owner===side).length);
    for(const node of this.nodes){
      node.dispatchCooldown=Math.max(0,(node.dispatchCooldown||0)-dt);
      if(node.owner<0||node.destroyed){this.updateNodeVisual(node);continue;}
      if(node.type==='outpost'&&node.condition<1)node.condition=CampaignRules.repairIntegrity(node.condition,dt,node.hero);
      this.updateNodeVisual(node);
    }
    for(const side of [0,1]){
      if(this.soloTest&&side===1)continue;
      const stationedHeroes=side===0?Object.values(this.heroRoster).filter(hero=>this.heroIsStationed(hero)).length:0;
      this.recruitBudget[side]+=dt*this.spawnMultiplier*CampaignRules.totalRecruitRate(owned[side],stationedHeroes);
      let safety=12;
      while(this.recruitBudget[side]>=1&&safety-->0){
        const eligible=this.nodes.filter(node=>node.owner===side&&!node.destroyed&&node.garrison<CampaignRules.garrisonCapacity(node.type));
        if(!eligible.length){this.recruitBudget[side]=Math.min(this.recruitBudget[side],.999);break;}
        eligible.sort((a,b)=>{
          const fillA=a.garrison/CampaignRules.garrisonCapacity(a.type),fillB=b.garrison/CampaignRules.garrisonCapacity(b.type);
          if(Math.abs(fillA-fillB)>.001)return fillA-fillB;
          const distanceA=CampaignRules.shortestPath(this.map,a.id,side===0?'enemy':'player').length||99;
          const distanceB=CampaignRules.shortestPath(this.map,b.id,side===0?'enemy':'player').length||99;
          return distanceA-distanceB;
        });
        const node=eligible[this.recruitCursor[side]%eligible.length];this.recruitCursor[side]++;
        node.garrison++;this.recruitBudget[side]-=1;this.updateNodeVisual(node);
      }
    }
  }

  dispatchGarrison(source,target,side){
    if(source.owner!==side||source.destroyed||source===target)return 0;
    /* 可派往圖上任一連通城寨；部隊沿最短路徑行軍，只在目的地結算。 */
    const path=CampaignRules.shortestPath(this.map,source.id,target.id);if(path.length<2)return 0;
    if((source.dispatchCooldown||0)>0)return 0;
    const fieldCount=this.units.filter(u=>!u.dead&&!u.isHero&&u.side===side).length;
    const qty=Math.min(CampaignRules.dispatchCount(source.garrison),Math.max(0,RULES.fieldUnitCap-fieldCount));if(!qty)return 0;
    source.garrison-=qty;source.dispatchCooldown=RULES.manualDispatchCooldown;this.updateNodeVisual(source);
    const kind=Phaser.Utils.Array.GetRandom(CampaignRules.unitTypes),columns=kind==='cavalry'?5:6;
    for(let i=0;i<qty;i++){
      const column=i%columns,row=Math.floor(i/columns),rows=Math.ceil(qty/columns);
      this.spawnUnit(side,kind,source,path,false,(column-(columns-1)/2)*9,(row-(rows-1)/2)*9,null,source.id);
    }
    /* 畫面標籤與兵力資料在同一幀結算：駐軍 8 → 駐 4｜行 4。 */
    this.updateNodeVisual(source);
    return qty;
  }
  updateAI(dt){
    if(this.soloTest)return;
    this.enemyDecisionClock-=dt;if(this.enemyDecisionClock>0)return;
    this.enemyDecisionClock=RULES.aiDecisionInterval+Phaser.Math.FloatBetween(.15,.75);
    const candidates=this.nodes.filter(n=>n.owner===1&&!n.destroyed&&(n.dispatchCooldown||0)<=0&&CampaignRules.dispatchCount(n.garrison)>=2)
      .sort((a,b)=>b.garrison-a.garrison);
    for(const source of candidates){
      const send=CampaignRules.dispatchCount(source.garrison);if(send<2)continue;
      const neighbors=this.graph[source.id].map(id=>this.nodeById(id)),hostile=neighbors.filter(n=>n.owner!==1);
      let target=null;
      if(hostile.length&&source.garrison>=6){
        const attackable=hostile.filter(n=>n.owner<0||send>=Math.ceil(n.garrison*.55)||source.garrison>CampaignRules.garrisonCapacity(source.type)*.72);
        attackable.sort((a,b)=>{
          const score=n=>(n.owner<0?46:32)+(n.type==='base'?28:0)-n.garrison-CampaignRules.shortestPath(this.map,n.id,'player').length*2;
          return score(b)-score(a);
        });
        target=attackable[0]||null;
      }
      if(!target&&source.garrison>CampaignRules.garrisonCapacity(source.type)*.62){
        const sourceDistance=CampaignRules.shortestPath(this.map,source.id,'player').length||99;
        target=neighbors.filter(n=>n.owner===1&&(CampaignRules.shortestPath(this.map,n.id,'player').length||99)<sourceDistance)
          .sort((a,b)=>CampaignRules.shortestPath(this.map,a.id,'player').length-CampaignRules.shortestPath(this.map,b.id,'player').length)[0]||null;
      }
      if(target){const sent=this.dispatchGarrison(source,target,1);if(sent&&this.auditMode)document.title=`AI_DISPATCH|${source.id}>${target.id}|${sent}`;return;}
    }
  }
  chooseTarget(source,side){
    const neighbors=this.graph[source.id].map(id=>this.nodeById(id));
    if(source.preferred&&neighbors.some(n=>n.id===source.preferred))return this.nodeById(source.preferred);
    const hostile=neighbors.filter(n=>n.owner!==side);if(hostile.length)return Phaser.Utils.Array.GetRandom(hostile);
    const goal=side===0?'enemy':'player',ranked=neighbors.map(n=>({n,len:CampaignRules.shortestPath(this.map,n.id,goal).length}));
    const min=Math.min(...ranked.map(x=>x.len));return Phaser.Utils.Array.GetRandom(ranked.filter(x=>x.len===min).map(x=>x.n));
  }
  spawnUnit(side,kind,source,path,isHero=false,lateral=0,longitudinal=0,heroId=null,originId=null){
    const data=UNITS[kind],key=isHero?(heroId||'zhaoyun'):`${kind}_${side===0?'shu':'wei'}`;
    const sprite=this.add.sprite(source.x+lateral,source.y+longitudinal,key,0).setScale(data.visualScale).setDepth(source.y+100);this.unitLayer.add(sprite);
    const sourceBonus=side===0?(1+this.commanderBonus()+(source.hero?.18:0)):1;
    const unit={id:Phaser.Utils.String.UUID(),side,kind,hp:Math.round(data.hp*sourceBonus),atk:Math.round(data.atk*sourceBonus),speed:data.speed,range:data.range,cooldown:data.cooldown,cd:0,pendingDamage:0,x:source.x+lateral,y:source.y+longitudinal,sprite,dead:false,path,pathIndex:1,targetNode:path[1],routePoints:[],routePointIndex:1,currentNode:null,wait:0,isHero,heroId,originId:originId||source.id,mission:null,chargeReady:isHero,assignment:null,lateral,longitudinal};
    this.setUnitRoute(unit,source.id,path[1]);
    if(isHero){unit.ring=ART.fit(this.add.image(unit.x,unit.y+17,'deploy_friendly_v2'),76,30).setTint(0xffdc62).setAlpha(.72).setDepth(unit.y+60);this.unitLayer.add(unit.ring);}
    this.units.push(unit);return unit;
  }

  updateUnits(dt){
    const active=this.units.filter(u=>!u.dead);for(const u of active){u.pendingDamage=0;u.frameX=u.x;u.frameY=u.y;u.cd=Math.max(0,u.cd-dt);}
    this.updateNodeDefense(active,dt);
    for(const u of active){
      const enemy=this.nearestEnemy(u);
      if(enemy&&enemy.distance<=u.range+12){if(u.cd<=0){u.cd=u.cooldown;enemy.unit.pendingDamage+=CombatRules.damage(u.kind,enemy.unit.kind,u.atk,u.isHero&&u.chargeReady?UNITS.hero.chargeMultiplier:1);u.chargeReady=false;}}
      else if(u.currentNode){
        u.wait-=dt;if(u.wait<=0)this.routeFromNode(u);
      }else if(!this.isBlocked(u))this.moveAlongPath(u,dt);
      if(u.dead)continue;
      u.sprite.setPosition(u.x,u.y).setDepth(u.y+100);if(u.ring)u.ring.setPosition(u.x,u.y+17).setDepth(u.y+60);
    }
    for(const u of active)if(!u.dead&&u.pendingDamage>0){u.hp-=u.pendingDamage;this.tweens.add({targets:u.sprite,alpha:.42,duration:50,yoyo:true});}
    for(const u of active)if(!u.dead&&u.hp<=0)this.killUnit(u);
    this.units=this.units.filter(u=>!u.dead);
  }
  updateNodeDefense(active,dt){
    for(const node of this.nodes){
      if(node.owner<0||node.destroyed||node.garrison<=0)continue;
      node.defenseClock=Math.max(0,(node.defenseClock||0)-dt);if(node.defenseClock>0)continue;
      let target=null,distance=Infinity;for(const unit of active){
        if(unit.dead||unit.side===node.owner)continue;const d=Phaser.Math.Distance.Between(node.x,node.y,unit.x,unit.y);
        if(d<=RULES.defenseRange&&d<distance){target=unit;distance=d;}
      }
      if(!target)continue;node.defenseClock=RULES.defenseCooldown;
      target.pendingDamage+=(node.type==='base'?RULES.baseArrowDamage:RULES.outpostArrowDamage);
      this.fireDefenseArrow(node,target);
    }
  }
  fireDefenseArrow(node,target){
    const arrow=ART.fit(this.add.image(node.x,node.y-12,'arrow_v1'),58,22).setDepth(node.y+220);this.unitLayer.add(arrow);
    arrow.setRotation(Phaser.Math.Angle.Between(node.x,node.y,target.x,target.y));
    this.tweens.add({targets:arrow,x:target.x,y:target.y,duration:180,onComplete:()=>arrow.destroy()});
  }
  updateBlockades(dt){
    for(const blockade of this.blockades)blockade.remaining-=dt;
    const expired=this.blockades.filter(blockade=>blockade.remaining<=0);for(const blockade of expired)blockade.sprite?.destroy();
    this.blockades=this.blockades.filter(blockade=>blockade.remaining>0);
  }
  isBlocked(unit){return !unit.isHero&&this.blockades.some(blockade=>blockade.side!==unit.side&&Phaser.Math.Distance.Between(unit.x,unit.y,blockade.x,blockade.y)<=RULES.blockadeRadius);}
  nearestEnemy(u){
    let best=null,distance=Infinity;for(const e of this.units){if(e.dead||e.side===u.side)continue;const d=Phaser.Math.Distance.Between(u.frameX,u.frameY,e.frameX,e.frameY);if(d<distance){best=e;distance=d;}}
    return best?{unit:best,distance}:null;
  }
  moveAlongPath(u,dt){
    const target=this.nodeById(u.targetNode),waypoint=u.routePoints[u.routePointIndex];if(!target||!waypoint)return;
    const previous=u.routePoints[Math.max(0,u.routePointIndex-1)],segmentX=waypoint.x-previous.x,segmentY=waypoint.y-previous.y,segmentLength=Math.max(1,Math.hypot(segmentX,segmentY));
    const forwardX=segmentX/segmentLength,forwardY=segmentY/segmentLength,sideX=-forwardY,sideY=forwardX;
    const atEnd=u.routePointIndex===u.routePoints.length-1,goalX=waypoint.x+sideX*u.lateral-forwardX*u.longitudinal,goalY=waypoint.y+sideY*u.lateral-forwardY*u.longitudinal,dx=goalX-u.x,dy=goalY-u.y,len=Math.hypot(dx,dy);
    if(len<5){u.x=goalX;u.y=goalY;if(!atEnd){u.routePointIndex++;return;}this.arriveAtNode(u,target);return;}
    const step=Math.min(u.speed*dt,len);u.x+=dx/len*step;u.y+=dy/len*step;
  }
  arriveAtNode(u,target){
    u.currentNode=target.id;u.targetNode=null;
    if(u.isHero){u.wait=0;this.routeFromNode(u);return;}
    if(target.owner===u.side){
      /* 友軍城寨只是中繼站：還沒到目的地就繼續行軍，不再被吸收。 */
      if(this.advanceAlongPath(u,target))return;
      target.garrison=Math.min(CampaignRules.garrisonCapacity(target.type),target.garrison+1);this.updateNodeVisual(target);this.absorbUnit(u);return;
    }
    if(target.garrison>0){
      target.garrison--;if(target.type==='outpost')target.condition=Math.max(.08,target.condition-RULES.attackWear);this.updateNodeVisual(target);this.killUnit(u);return;
    }
    if(target.type==='base'){
      target.hp=Math.max(0,target.hp-RULES.siegeDamage);this.cropFill(target.fill,target.hp/target.maxHp,target.fillW);this.killUnit(u);if(target.hp<=0)this.collapseBase(target);return;
    }
    this.changeOwner(target,u.side);target.garrison=1;this.updateNodeVisual(target);this.absorbUnit(u);
  }
  advanceAlongPath(u,node){
    const next=u.path.indexOf(node.id)+1;if(!next||next>=u.path.length)return false;
    u.pathIndex=next;u.currentNode=null;this.setUnitRoute(u,node.id,u.path[next]);return true;
  }
  setUnitRoute(u,fromId,toId){
    u.routePoints=CampaignRules.routePoints(this.map,fromId,toId);u.routePointIndex=1;u.targetNode=toId;
    if(!u.routePoints.length)throw new Error(`missing grid route ${fromId}>${toId}`);
  }
  routeFromNode(u){
    const source=this.nodeById(u.currentNode);if(!source){u.wait=999;return;}
    if(u.isHero&&u.assignment===source.id){this.resolveHeroMission(u,source);return;}
    if(u.isHero&&u.assignment){
      const route=CampaignRules.shortestPath(this.map,source.id,u.assignment);
      if(route.length>1){u.currentNode=null;this.setUnitRoute(u,source.id,route[1]);return;}
    }
    if(source.owner!==u.side){u.wait=999;return;}
    u.wait=999;
  }
  resolveHeroMission(u,node){
    const hero=this.heroRoster[u.heroId];if(!hero)return;
    if(u.mission==='station'&&node.owner===u.side){
      node.hero=true;u.wait=Infinity;u.x=node.x+38;u.y=node.y+4;u.sprite.setScale(UNITS.hero.stationScale);u.ring?.setVisible(false);
      this.showHint(`${hero.name}已進駐 ${this.nodeName(node)}｜募兵與新兵能力提升`);if(this.auditMode)document.title=`HERO_STATIONED|${u.heroId}|${node.id}`;return;
    }
    if(node.owner===u.side){u.mission='station';this.resolveHeroMission(u,node);return;}
    if(node.garrison>0){
      node.garrison=Math.max(0,node.garrison-RULES.heroGarrisonDamage);if(node.type==='outpost')node.condition=Math.max(.08,node.condition-RULES.attackWear*2);this.updateNodeVisual(node);
      u.wait=RULES.heroAssaultInterval;u.sprite.play(`${u.heroId}_attack`,true);return;
    }
    if(node.type==='base'){
      node.hp=Math.max(0,node.hp-RULES.heroSiegeDamage);this.cropFill(node.fill,node.hp/node.maxHp,node.fillW);u.wait=RULES.heroAssaultInterval;u.sprite.play(`${u.heroId}_attack`,true);
      if(node.hp<=0)this.collapseBase(node);return;
    }
    this.changeOwner(node,u.side);node.garrison=1;u.mission='station';this.updateNodeVisual(node);this.resolveHeroMission(u,node);
  }
  absorbUnit(u){
    if(u.dead)return;u.dead=true;u.ring?.destroy();u.sprite.destroy();
  }
  killUnit(u){
    if(u.dead)return;u.dead=true;if(u.isHero){const station=u.currentNode&&this.nodeById(u.currentNode);const hero=this.heroRoster[u.heroId];if(hero){hero.unit=null;hero.cooldown=RULES.heroRespawnCooldown;}if(station)station.hero=Object.values(this.heroRoster).some(record=>record.unit&&!record.unit.dead&&record.unit.currentNode===station.id);u.ring?.destroy();}
    u.sprite.stop().setFrame(7);this.tweens.add({targets:u.sprite,alpha:0,y:u.y+8,duration:180,onComplete:()=>u.sprite.destroy()});
  }

  changeOwner(node,owner){
    if(node.hero&&owner!==0){node.hero=false;for(const hero of Object.values(this.heroRoster))if(hero.unit?.currentNode===node.id)this.killUnit(hero.unit);}
    node.owner=owner;node.condition=RULES.capturedIntegrity;
    this.updateNodeVisual(node);this.showHint(`${owner===0?'我軍':'敵軍'}攻下 ${this.nodeName(node)}｜城寨受損，正在修復`);if(this.auditMode)document.title=`CAPTURE|s${owner}|${node.id}`;
  }
  updateNodeVisual(node){
    const capacity=CampaignRules.garrisonCapacity(node.type);node.garrison=Math.max(0,Math.min(capacity,Math.floor(node.garrison||0)));
    const marching=this.units?.filter(unit=>!unit.dead&&!unit.isHero&&unit.originId===node.id).length||0;
    node.garrisonText?.setText(marching?`駐 ${node.garrison}｜行 ${marching}`:`駐 ${node.garrison}`);
    if(node.type==='base'){
      this.cropFill(node.fill,node.hp/node.maxHp,node.fillW);node.repairText?.setText('');return;
    }
    const texture=node.owner===0?'outpost_shu_v5':node.owner===1?'outpost_wei_v5':'outpost_neutral_v5';
    node.sprite.setTexture(texture).setAlpha(node.owner<0?1:.72+.28*node.condition);
    node.fill.setTint(node.owner===0?0x35e0b6:node.owner===1?0xff566a:0xffd667);
    this.cropFill(node.fill,node.owner<0?node.garrison/capacity:node.condition,node.fillW);
    node.repairText?.setText(node.owner>=0&&node.condition<.995?`修復 ${Math.round(node.condition*100)}%`:'');
  }

  updateBaseDefense(){
    for(const base of [this.playerBase,this.enemyBase]){
      if(base.destroyed)continue;
      this.cropFill(base.fill,base.hp/base.maxHp,base.fillW);if(base.hp<=0)this.collapseBase(base);
    }
  }
  collapseBase(base){
    if(base.destroyed||this.battleEnding)return;
    base.destroyed=true;base.hp=0;this.battleEnding=true;base.sprite.clearTint().setTexture('keep_fallen_v7');ART.fit(base.sprite,135,118);base.frame.setVisible(false);base.fill.setVisible(false);
    for(const unit of this.units)if(!unit.dead)unit.sprite.stop();
    this.showHint(`${base.owner===1?'敵方':'我方'}主城已陷落`);
    if(this.auditMode)document.title=`BASE_FALLEN|${base.id}`;
    this.time.delayedCall(650,()=>this.endBattle(base.owner===1,'主城攻破'));
  }
  updateEnemyTactic(){
    if(this.soloTest||this.enemyTacticCooldown>0)return;
    let best=null,count=0;for(const node of this.nodes){const here=this.units.filter(u=>!u.dead&&u.side===0&&Phaser.Math.Distance.Between(u.x,u.y,node.x,node.y)<=145).length;if(here>count){best=node;count=here;}}
    if(!best||count<4){this.enemyTacticCooldown=3;return;}
    const victims=this.units.filter(u=>!u.dead&&u.side===0&&Phaser.Math.Distance.Between(u.x,u.y,best.x,best.y)<=165);let losses=0;for(const u of victims){u.hp-=RULES.tacticDamage*.72;if(u.hp<=0){losses++;this.killUnit(u);}}
    this.playFire(best.x,best.y);this.enemyTacticCooldown=RULES.enemyTacticCooldown;this.showTacticAlert(`敵軍司馬懿・火計\n${this.nodeName(best)}｜我軍損失 ${losses} 人`);
  }
  showTacticAlert(text){
    this.tacticAlertFrame.setVisible(true).setTint(0xff7080);this.tacticAlertPortrait.setVisible(true);this.tacticAlertText.setText(text).setVisible(true);
    this.tacticAlertTimer?.remove(false);this.tacticAlertTimer=this.time.delayedCall(2600,()=>{this.tacticAlertFrame.setVisible(false);this.tacticAlertPortrait.setVisible(false);this.tacticAlertText.setVisible(false);});
  }
  cropFill(image,fraction,width=image.width,height=image.height){const f=Phaser.Math.Clamp(fraction,.001,1);image.setCrop(0,0,Math.max(1,width*f),height);}

  renderHud(){
    const sec=Math.max(0,Math.ceil(this.timeLeft));this.timerText.setText(this.overtime?'決 戰':`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`);
    this.enemyText.setText(`周瑜 ${Math.max(0,Math.ceil(this.enemyBase.hp))}`);this.playerText.setText(`司馬懿 ${Math.max(0,Math.ceil(this.playerBase.hp))}`);
    const mine=this.nodes.filter(n=>n.type==='outpost'&&n.owner===0).length,theirs=this.nodes.filter(n=>n.type==='outpost'&&n.owner===1).length;
    const field=[0,1].map(side=>this.units.filter(unit=>!unit.dead&&!unit.isHero&&unit.side===side).length);
    const playerHeroes=Object.values(this.heroRoster).filter(hero=>this.heroIsStationed(hero)).length;
    const rates=[CampaignRules.totalRecruitRate(mine,playerHeroes),CampaignRules.totalRecruitRate(theirs,0)];
    this.supplyText.setText(`我方 ${mine}寨｜${field[0]}/${RULES.fieldUnitCap}｜${rates[0].toFixed(2)}/秒`);this.enemySupplyText.setText(`敵方 ${theirs}寨｜${field[1]}/${RULES.fieldUnitCap}｜${rates[1].toFixed(2)}/秒`);
    this.tacticStatusText.setText(`我方孔明 ${this.tacticCooldown>0?Math.ceil(this.tacticCooldown)+'秒':'可用'}　｜　敵策 ${Math.ceil(this.enemyTacticCooldown)}秒`);
    for(const [id,control] of Object.entries(this.heroControls)){
      const hero=this.heroRoster[id],unit=hero.unit;
      const status=hero.cooldown>0?`整備 ${Math.ceil(hero.cooldown)}秒`:this.heroIsStationed(hero)?`駐守 ${this.shortNodeName(unit.currentNode)}`:unit?.assignment?`進攻 ${this.shortNodeName(unit.assignment)}`:'派駐／進攻';
      control.subText.setText(status);control.frame.setAlpha(unit||hero.cooldown>0?.72:1);
    }
    this.tacticControl.subText.setText(this.tacticCooldown>0?`冷卻 ${Math.ceil(this.tacticCooldown)}秒`:`可施放・阻軍`);
    this.tacticControl.frame.setAlpha(this.tacticCooldown>0?.58:1);
  }

  beginOvertime(){
    if(this.overtime)return;this.overtime=true;this.timeLeft=0;this.spawnMultiplier*=1.35;
    this.showHint('決戰延長｜必須攻破敵方主城才會獲勝');if(this.auditMode)document.title='OVERTIME';
  }
  endBattle(win,reason){
    if(this.gameOver)return;this.gameOver=true;this.paused=false;
    const reward=CampaignRules.reward(win);this.progress.merit+=reward;if(win){this.progress.wins++;this.progress.stage=Math.max(this.progress.stage,Math.min(3,this.mapIndex+2));}else this.progress.losses++;this.saveProgress();
    if(this.auditMode)document.title=`RESULT|${win?'win':'loss'}|L${this.mapIndex+1}|Lv${this.progress.level}|merit${this.progress.merit}`;
    ART.fit(this.add.image(W/2,660,'result_v3'),470,410).setDepth(9000);
    this.add.text(W/2,505,win?'勝 利':'敗 北',{fontSize:'48px',fontStyle:'bold',color:'#fff',stroke:'#17324a',strokeThickness:6}).setOrigin(.5).setDepth(9001);
    this.add.text(W/2,552,reason,{fontSize:'18px',fontStyle:'bold',color:'#cfe9f5',stroke:'#17324a',strokeThickness:3}).setOrigin(.5).setDepth(9001);
    this.resultReward=this.add.text(W/2,594,`軍功 +${reward}`,{fontSize:'27px',fontStyle:'bold',color:'#ffe56f',stroke:'#46360a',strokeThickness:5}).setOrigin(.5).setDepth(9001);
    this.resultLevel=this.add.text(W/2,636,'',{fontSize:'21px',fontStyle:'bold',color:'#fff',stroke:'#17324a',strokeThickness:4}).setOrigin(.5).setDepth(9001);
    this.resultBonus=this.add.text(W/2,671,'',{fontSize:'15px',color:'#d8fff4',stroke:'#17324a',strokeThickness:3}).setOrigin(.5).setDepth(9001);
    this.upgradeButton=ART.fit(this.add.image(W/2,724,'primary_v3'),310,68).setDepth(9002).setInteractive({useHandCursor:true});
    this.upgradeLabel=this.add.text(W/2,724,'',{fontSize:'19px',fontStyle:'bold',color:'#fff',stroke:'#17324a',strokeThickness:4}).setOrigin(.5).setDepth(9003);this.upgradeButton.on('pointerdown',()=>this.tryUpgradeCommander());
    const restart=ART.fit(this.add.image(W/2,794,'secondary_v3'),210,52).setDepth(9002).setInteractive({useHandCursor:true});
    this.add.text(W/2,794,win&&this.mapIndex<2?'下一關':'再戰',{fontSize:'21px',fontStyle:'bold',color:'#fff',stroke:'#17324a',strokeThickness:4}).setOrigin(.5).setDepth(9003);
    restart.on('pointerdown',()=>{if(win&&this.mapIndex<2)location.search=`?level=${this.mapIndex+2}`;else this.scene.restart();});this.updateUpgradePanel();
  }
  tryUpgradeCommander(){
    const cost=this.upgradeCost();if(!Number.isFinite(cost)||this.progress.merit<cost)return;this.progress.merit-=cost;this.progress.level++;this.saveProgress();this.resultReward.setText('趙雲升級成功・新兵統率提升');this.updateUpgradePanel();
    if(this.auditMode)document.title=`UPGRADE|Lv${this.progress.level}|merit${this.progress.merit}`;
  }
  updateUpgradePanel(){
    const cost=this.upgradeCost(),bonus=Math.round(this.commanderBonus()*100);this.resultLevel.setText(`趙雲 Lv.${this.progress.level}　軍功 ${this.progress.merit}`);this.resultBonus.setText(`統率：我方新兵生命與攻擊 +${bonus}%`);
    if(!Number.isFinite(cost)){this.upgradeLabel.setText('已達最高等級');this.upgradeButton.setAlpha(.6);return;}this.upgradeLabel.setText(`升級至 Lv.${this.progress.level+1}　需要 ${cost} 軍功`);this.upgradeButton.setAlpha(this.progress.merit>=cost?1:.58);
  }
}
