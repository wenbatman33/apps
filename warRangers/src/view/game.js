/*
 * 畫面層：只負責「畫」與「收輸入」，規則一律呼叫 core/。
 * 場景：Boot（載素材）→ Home（首頁與選關）→ Battle（對局）→ Result（結算）。
 */

const PROGRESS_KEY='warRangersV2';
const LAYOUT=Layout.compute(window.innerWidth,window.innerHeight);
const SIDE_COLOR={0:0x35e0b6,1:0xff566a,'-1':0xffd667};
const SIDE_TEXT={0:'#8dffe4',1:'#ff9aa8','-1':'#ffe9a3'};

function loadProgress(){
  try{
    const saved=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'null');
    return{unlocked:Math.max(1,Math.min(5,Number(saved?.unlocked)||1)),wins:Number(saved?.wins)||0,losses:Number(saved?.losses)||0};
  }catch(_error){return{unlocked:1,wins:0,losses:0};}
}
function saveProgress(progress){localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}

/* 共用的按鈕：素材 + 文字 + 按下回饋，三個場景都用同一顆。 */
function makeButton(scene,x,y,width,height,label,handler,{fontSize='26px',texture='button_modern_v10',tint=null}={}){
  const frame=scene.add.image(x,y,texture).setDisplaySize(width,height).setInteractive({useHandCursor:true});
  if(tint!==null)frame.setTint(tint);
  const text=scene.add.text(x,y,label,{fontSize,fontStyle:'bold',color:'#ffffff',stroke:'#07131f',strokeThickness:6}).setOrigin(.5);
  frame.on('pointerover',()=>frame.setScale(frame.scaleX*1.04,frame.scaleY*1.04));
  frame.on('pointerout',()=>frame.setDisplaySize(width,height));
  frame.on('pointerdown',()=>{frame.setDisplaySize(width*.96,height*.96);});
  frame.on('pointerup',()=>{frame.setDisplaySize(width,height);handler();});
  return{frame,text,setLabel:value=>text.setText(value)};
}

/* 點到線段的距離：道路是折線，命中判定要逐段算。 */
function distanceToSegment(px,py,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,lengthSq=dx*dx+dy*dy;
  const t=lengthSq?Math.max(0,Math.min(1,((px-a.x)*dx+(py-a.y)*dy)/lengthSq)):0;
  return Math.hypot(px-(a.x+dx*t),py-(a.y+dy*t));
}

class BootScene extends Phaser.Scene{
  constructor(){super('Boot');}
  preload(){
    const loading=this.add.text(LAYOUT.width/2,LAYOUT.height/2,'整軍中…',{fontSize:'30px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5);
    this.load.on('progress',value=>loading.setText(`整軍中… ${Math.round(value*100)}%`));

    this.load.image('home_art','assets/concepts/home_direction_v1.png');
    this.load.image('result_win','assets/ui/screens/result_win_v1.png');
    this.load.image('result_lose','assets/ui/screens/result_lose_v1.png');
    for(const [id,meta] of Object.entries(MapData.LEVEL_META))this.load.image(`map_${id}`,`assets/backgrounds/campaign/${meta.art}.png`);

    this.load.image('keep_shu','assets/structures/keep_shu_v2.png');
    this.load.image('keep_wei','assets/structures/keep_wei_v2.png');
    this.load.image('keep_fallen','assets/structures/keep_fallen_v7.png');
    this.load.image('outpost_neutral','assets/structures/outpost_neutral_v5.png');
    this.load.image('outpost_shu','assets/structures/outpost_shu_v5.png');
    this.load.image('outpost_wei','assets/structures/outpost_wei_v5.png');
    for(const key of ['button_modern_v10','status_modern_v10','command_modern_v10','primary_v3','secondary_v3','result_v3','energy_trough','energy_fill','deploy_friendly_v2'])
      this.load.image(key,`assets/ui/${key}.png`);
    for(const side of ['shu','wei'])for(const kind of ['guard','archer','cavalry'])
      this.load.spritesheet(`${kind}_${side}`,`assets/characters/${kind}_${side}.png`,{frameWidth:384,frameHeight:512});
    for(const [key,file] of Object.entries({guanyu:'guanyu_v1',zhangfei:'zhangfei_v1',machao:'machao_v1',huangzhong:'huangzhong_v1',zhaoyun:'zhaoyun'}))
      this.load.spritesheet(`hero_${key}`,`assets/characters/${file}.png`,{frameWidth:384,frameHeight:512});
  }
  create(){
    for(const side of ['shu','wei'])for(const kind of ['guard','archer','cavalry']){
      const key=`${kind}_${side}`;
      if(!this.anims.exists(`${key}_walk`))this.anims.create({key:`${key}_walk`,frames:[2,3].map(frame=>({key,frame})),frameRate:8,repeat:-1});
    }
    this.scene.start('Home');
  }
}

class HomeScene extends Phaser.Scene{
  constructor(){super('Home');}
  create(){
    const {width,height}=LAYOUT;
    const art=this.add.image(width/2,height/2,'home_art');
    const cover=Math.max(width/art.width,height/art.height);
    art.setScale(cover).setAlpha(.96);
    this.add.rectangle(width/2,height/2,width,height,0x03121f,.32);

    const titleY=LAYOUT.landscape?96:150;
    this.add.text(width/2,titleY,'三 國 爭 鋒',{fontSize:LAYOUT.landscape?'64px':'72px',fontStyle:'bold',color:'#ffe9a8',stroke:'#2b1405',strokeThickness:12}).setOrigin(.5);
    this.add.text(width/2,titleY+(LAYOUT.landscape?52:62),'拖曳出兵・攻城掠寨',{fontSize:'24px',fontStyle:'bold',color:'#ffffff',stroke:'#07131f',strokeThickness:6}).setOrigin(.5);

    const progress=loadProgress();
    const panelY=LAYOUT.landscape?height-190:height-390;
    this.add.text(width/2,panelY-46,'選 擇 戰 場',{fontSize:'26px',fontStyle:'bold',color:'#ffffff',stroke:'#07131f',strokeThickness:6}).setOrigin(.5);

    const ids=MapData.levelIds();
    const buttonW=LAYOUT.landscape?196:132,gap=LAYOUT.landscape?14:10;
    const columns=LAYOUT.landscape?5:3;
    const rows=Math.ceil(ids.length/columns);
    ids.forEach((id,index)=>{
      const meta=MapData.LEVEL_META[id];
      const column=index%columns,row=Math.floor(index/columns);
      const perRow=Math.min(columns,ids.length-row*columns);
      const totalW=perRow*buttonW+(perRow-1)*gap;
      const x=width/2-totalW/2+buttonW/2+column*(buttonW+gap);
      const y=panelY+row*88;
      const locked=id>progress.unlocked;
      const button=makeButton(this,x,y,buttonW,74,'',()=>{
        if(locked){this.flash(`先攻下第 ${id-1} 關才能出兵此地`);return;}
        this.scene.start('Battle',{level:id});
      },{tint:locked?0x6a7f8f:null});
      button.text.destroy();
      this.add.text(x,y-13,`第 ${id} 關`,{fontSize:'21px',fontStyle:'bold',color:locked?'#c9d6de':'#ffe9a8',stroke:'#07131f',strokeThickness:5}).setOrigin(.5);
      this.add.text(x,y+13,locked?'🔒 未解鎖':meta.name,{fontSize:'18px',fontStyle:'bold',color:'#ffffff',stroke:'#07131f',strokeThickness:5}).setOrigin(.5);
    });

    const footerY=panelY+rows*88+14;
    this.add.text(width/2,footerY,`戰績　勝 ${progress.wins}　敗 ${progress.losses}`,{fontSize:'19px',fontStyle:'bold',color:'#d8fff4',stroke:'#07131f',strokeThickness:5}).setOrigin(.5);
    this.hint=this.add.text(width/2,footerY+30,'',{fontSize:'18px',fontStyle:'bold',color:'#ffd2d2',stroke:'#07131f',strokeThickness:5}).setOrigin(.5);

    if(location.search.includes('level=')){
      const level=Number(new URLSearchParams(location.search).get('level'));
      if(MapData.LEVEL_META[level])this.scene.start('Battle',{level});
    }
  }
  flash(text){
    this.hint.setText(text);
    this.time.delayedCall(2200,()=>this.hint?.setText(''));
  }
}

class BattleScene extends Phaser.Scene{
  constructor(){super('Battle');}
  init(data){this.level=data?.level||1;}

  create(){
    this.selected=new Set();
    this.soldierSprites=new Map();
    this.lastTapNode=null;this.lastTapTime=0;
    this.add.rectangle(LAYOUT.width/2,LAYOUT.height/2,LAYOUT.width,LAYOUT.height,0x061421).setDepth(-500);

    MapData.loadLevelInBrowser(this.level).then(map=>{
      this.map=map;
      this.match=MatchState.create(map,{seed:Date.now()%100000,heroSides:[0]});
      this.match.tactics[0]=Tactics.createState(0,this.match.rng);
      this.match.tactics[1]=Tactics.createState(1,this.match.rng);
      this.ai=MatchAI.attach(this.match,MatchAI.create(1,map.difficulty));
      this.buildMapView();
      this.buildHud();
      this.buildCommandPanel();
      this.installInput();
      this.ready=true;
    }).catch(error=>{
      this.add.text(LAYOUT.width/2,LAYOUT.height/2,`地圖讀取失敗\n${error.message}`,{fontSize:'22px',color:'#ff9aa8',align:'center'}).setOrigin(.5);
    });
  }

  buildMapView(){
    this.add.image(LAYOUT.toScreenX(360),LAYOUT.toScreenY(640),`map_${this.level}`)
      .setDisplaySize(LAYOUT.mapW,LAYOUT.mapH).setDepth(-400);
    this.routeLayer=this.add.graphics().setDepth(-300);
    this.dragLayer=this.add.graphics().setDepth(600);
    this.nodeViews={};
    for(const node of Object.values(this.match.nodes)){
      const x=LAYOUT.toScreenX(node.x),y=LAYOUT.toScreenY(node.y);
      const isBase=node.type==='base';
      const sprite=this.add.image(x,y,'outpost_neutral').setDepth(y).setScale(LAYOUT.scale(isBase?.42:.3));
      const ring=this.add.circle(x,y,LAYOUT.scale(isBase?62:52),0xffffff,0).setStrokeStyle(LAYOUT.scale(5),0x75ffd8,0).setDepth(y+1);
      const badge=this.add.circle(x,LAYOUT.toScreenY(node.y+46),LAYOUT.scale(25),0x07131f,.78).setDepth(y+2);
      const count=this.add.text(x,LAYOUT.toScreenY(node.y+46),'0',{fontSize:`${Math.round(LAYOUT.scale(30))}px`,fontStyle:'bold',color:'#ffffff',stroke:'#07131f',strokeThickness:5}).setOrigin(.5).setDepth(y+3);
      const pips=this.add.text(x,LAYOUT.toScreenY(node.y-52),'',{fontSize:`${Math.round(LAYOUT.scale(20))}px`,fontStyle:'bold',color:'#ffe9a8',stroke:'#07131f',strokeThickness:4}).setOrigin(.5).setDepth(y+3);
      this.nodeViews[node.id]={sprite,ring,badge,count,pips,x,y};
    }
    this.drawRoads();
    this.buildHeroSprites();
  }

  /*
   * 武將必須在戰場上看得見：原本只有下方按鈕，玩家根本看不出「武將」是什麼、人在哪。
   * 駐守時站在城寨旁邊並掛名牌，移防時沿著道路實際走過去。
   */
  buildHeroSprites(){
    this.heroSprites={};
    for(const hero of this.match.heroes){
      const def=Heroes.HEROES[hero.id];
      const glow=this.add.ellipse(0,0,LAYOUT.scale(46),LAYOUT.scale(20),0xffe36f,.42).setDepth(1);
      const sprite=this.add.sprite(0,0,`hero_${hero.id}`,0).setScale(LAYOUT.scale(.098)).setDepth(2);
      const label=this.add.text(0,0,def.name,{fontSize:`${Math.round(LAYOUT.scale(16))}px`,fontStyle:'bold',
        color:'#ffe9a8',stroke:'#07131f',strokeThickness:5,backgroundColor:'#03121f99',padding:{x:4,y:1}}).setOrigin(.5).setDepth(3);
      this.heroSprites[hero.id]={glow,sprite,label};
    }
  }
  /* 武將只在領兵出征時出現在戰場上，位置就是他那支部隊的最前方。 */
  renderHeroes(){
    for(const hero of this.match.heroes){
      const view=this.heroSprites[hero.id];if(!view)continue;
      const spot=Heroes.positionOf(this.match,hero);
      if(!spot){
        view.sprite.setVisible(false);view.glow.setVisible(false);view.label.setVisible(false);
        continue;
      }
      const x=LAYOUT.toScreenX(spot.x),y=LAYOUT.toScreenY(spot.y);
      view.sprite.setVisible(true).setPosition(x,y-LAYOUT.scale(16)).setDepth(y+5);
      view.glow.setVisible(true).setPosition(x,y+LAYOUT.scale(10)).setDepth(y+3);
      view.label.setVisible(true).setPosition(x,y+LAYOUT.scale(26)).setDepth(y+6);
    }
  }

  /* 道路命中判定：計謀打的是路，必須點得到路。 */
  edgeAtPointer(pointer){
    const px=LAYOUT.toMapX(pointer.x),py=LAYOUT.toMapY(pointer.y);
    let best=null,bestDistance=34;
    for(const edge of this.map.edges){
      const points=edge.line.points;
      for(let i=1;i<points.length;i++){
        const distance=distanceToSegment(px,py,points[i-1],points[i]);
        if(distance<bestDistance){bestDistance=distance;best=edge;}
      }
    }
    return best;
  }
  highlightRoads(hovered){
    this.dragLayer.clear();
    for(const edge of this.map.edges){
      const active=hovered&&edge.key===hovered.key;
      this.dragLayer.lineStyle(LAYOUT.scale(active?11:5),active?0xffe36f:0x9fd7e8,active?.95:.45);
      const points=edge.line.points;
      this.dragLayer.beginPath();
      this.dragLayer.moveTo(LAYOUT.toScreenX(points[0].x),LAYOUT.toScreenY(points[0].y));
      for(const point of points.slice(1))this.dragLayer.lineTo(LAYOUT.toScreenX(point.x),LAYOUT.toScreenY(point.y));
      this.dragLayer.strokePath();
    }
  }
  drawRoads(){
    this.routeLayer.clear();
    for(const edge of this.map.edges){
      this.routeLayer.lineStyle(LAYOUT.scale(4),0xffffff,.10);
      const points=edge.line.points;
      this.routeLayer.beginPath();
      this.routeLayer.moveTo(LAYOUT.toScreenX(points[0].x),LAYOUT.toScreenY(points[0].y));
      for(const point of points.slice(1))this.routeLayer.lineTo(LAYOUT.toScreenX(point.x),LAYOUT.toScreenY(point.y));
      this.routeLayer.strokePath();
    }
  }

  buildHud(){
    const {width,height,landscape}=LAYOUT;
    const barY=landscape?34:44;
    this.add.image(width/2,barY,'status_modern_v10').setDisplaySize(landscape?520:560,landscape?52:58).setDepth(900);
    /*
     * 這裡原本是計時器。沒有時限卻擺個時鐘，只會一直讓玩家以為有期限。
     * 換成真正該盯的東西：勝利條件本身——敵方主城還剩多少兵、要幾人才攻得下。
     */
    this.objectiveText=this.add.text(width/2,barY,'',{fontSize:'21px',fontStyle:'bold',color:'#ffd166',stroke:'#17324a',strokeThickness:6}).setOrigin(.5).setDepth(902);
    this.mineText=this.add.text(width/2-198,barY,'',{fontSize:'20px',fontStyle:'bold',color:'#8dffe4',stroke:'#07131f',strokeThickness:5}).setOrigin(.5).setDepth(902);
    this.theirsText=this.add.text(width/2+198,barY,'',{fontSize:'20px',fontStyle:'bold',color:'#ff9aa8',stroke:'#07131f',strokeThickness:5}).setOrigin(.5).setDepth(902);

    /* 直式時地圖佔滿畫面，關卡名若常駐會壓在敵方主城上；改成開場報幕後淡出。 */
    const meta=MapData.LEVEL_META[this.level];
    const bannerY=landscape?116:height*.42;
    const banner=[
      this.add.text(landscape?LAYOUT.leftPanelX:width/2,bannerY,`第 ${this.level} 關　${meta.name}`,
        {fontSize:'30px',fontStyle:'bold',color:'#ffe9a8',stroke:'#2b1405',strokeThickness:9}).setOrigin(.5).setDepth(950),
      this.add.text(landscape?LAYOUT.leftPanelX:width/2,bannerY+38,meta.subtitle,
        {fontSize:'19px',fontStyle:'bold',color:'#cfe9f5',stroke:'#07131f',strokeThickness:5}).setOrigin(.5).setDepth(950),
    ];
    if(!landscape)this.tweens.add({targets:banner,alpha:0,delay:1900,duration:700});

    /* 底部說明區給一條暗底，否則字會被主城與地景吃掉。 */
    /* 直式的面板區給一塊實底，UI 才不會壓在地圖與主城上。 */
    if(!landscape)this.add.rectangle(width/2,LAYOUT.panelTop+LAYOUT.panel/2,width,LAYOUT.panel,0x03121f,.94).setDepth(880);
    const stripH=landscape?70:0;
    if(landscape)this.add.rectangle(width/2,height-stripH/2,width,stripH,0x03121f,.72).setDepth(898);
    this.hint=this.add.text(width/2,landscape?height-46:96,'',
      {fontSize:'19px',fontStyle:'bold',color:'#ffe9a8',stroke:'#07131f',strokeThickness:6,
       backgroundColor:'#03121fcc',padding:{x:12,y:5}}).setOrigin(.5).setDepth(950);
    this.guide=this.add.text(width/2,landscape?height-20:LAYOUT.panelTop+230,'點武將＝下一波由他帶兵　｜　點我方城寨 → 點目標出兵　｜　城寨「守 N」＝攻方要 N 人換 1 守軍',
      {fontSize:landscape?'17px':'17px',fontStyle:'bold',color:'#9fd7e8',stroke:'#07131f',strokeThickness:4}).setOrigin(.5).setDepth(902);

    this.upgradeButton=makeButton(this,landscape?LAYOUT.rightPanelX:width-62,landscape?height-120:LAYOUT.panelTop+180,112,62,'升級',()=>this.upgradeSelected(),{fontSize:'20px'});
    this.setUpgradeVisible(false);
    makeButton(this,landscape?LAYOUT.leftPanelX:60,landscape?height-46:LAYOUT.panelTop+180,104,52,'放棄',()=>this.finish(1,'主動撤軍'),{fontSize:'19px',texture:'secondary_v3'});
  }
  setUpgradeVisible(visible){
    this.upgradeButton.frame.setVisible(visible);this.upgradeButton.text.setVisible(visible);
  }

  /*
   * 指令面板：橫式放進左右側欄（原本空著的地方），直式排在地圖下方。
   * 武將＝點頭像再點城寨（我方城寨＝移防，敵方城寨＝趙雲突襲）。
   * 策略＝點卡片；需要指定目標的卡會進入選取模式。
   */
  buildCommandPanel(){
    const {landscape,width,height}=LAYOUT;
    this.mode=null;
    this.heroButtons={};
    const heroIds=Heroes.ORDER;
    heroIds.forEach((id,index)=>{
      const def=Heroes.HEROES[id];
      const x=landscape?LAYOUT.leftPanelX:width/2+(index-(heroIds.length-1)/2)*140;
      const y=landscape?200+index*84:LAYOUT.panelTop+44;
      const frame=this.add.image(x,y,'button_modern_v10').setDisplaySize(landscape?200:132,74).setInteractive({useHandCursor:true}).setDepth(900);
      const portrait=this.add.sprite(x-(landscape?68:44),y,`hero_${id}`,0).setScale(landscape?.062:.05).setDepth(901);
      const name=this.add.text(x+(landscape?18:16),y-14,def.name,{fontSize:'21px',fontStyle:'bold',color:'#ffe9a8',stroke:'#07131f',strokeThickness:5}).setOrigin(.5).setDepth(902);
      const status=this.add.text(x+(landscape?18:16),y+14,'',{fontSize:'15px',fontStyle:'bold',color:'#d8fff4',stroke:'#07131f',strokeThickness:4}).setOrigin(.5).setDepth(902);
      frame.on('pointerup',()=>this.toggleHero(id));
      frame.on('pointerover',()=>this.showHint(`${def.name}・${def.title}｜${def.desc}`));
      this.heroButtons[id]={frame,portrait,name,status};
    });

    this.cardButtons=[];
    for(let slot=0;slot<2;slot++){
      const x=landscape?LAYOUT.rightPanelX:(width/2+(slot?1:-1)*118);
      const y=landscape?300+slot*96:LAYOUT.panelTop+180;
      const frame=this.add.image(x,y,'command_modern_v10').setDisplaySize(landscape?210:222,80).setInteractive({useHandCursor:true}).setDepth(900);
      const name=this.add.text(x,y-16,'',{fontSize:'22px',fontStyle:'bold',color:'#ffe9a8',stroke:'#07131f',strokeThickness:5}).setOrigin(.5).setDepth(902);
      const desc=this.add.text(x,y+14,'',{fontSize:'13px',fontStyle:'bold',color:'#cfe9f5',stroke:'#07131f',strokeThickness:4,align:'center',wordWrap:{width:landscape?196:208}}).setOrigin(.5).setDepth(902);
      frame.on('pointerup',()=>this.useCard(slot));
      this.cardButtons.push({frame,name,desc});
    }
    /* 兵糧列 */
    const foodY=landscape?150:LAYOUT.panelTop+92;
    const foodX=landscape?LAYOUT.rightPanelX:262;
    this.add.text(landscape?foodX:36,landscape?foodY-42:foodY,'兵糧',
      {fontSize:'17px',fontStyle:'bold',color:'#c8f7a0',stroke:'#07131f',strokeThickness:4}).setOrigin(landscape?.5:0,.5).setDepth(902);
    this.add.rectangle(foodX,foodY,landscape?200:250,14,0x07131f,.85).setDepth(901);
    this.foodFill=this.add.rectangle(foodX-(landscape?100:125),foodY,4,10,0x8bd94f).setOrigin(0,.5).setDepth(902);
    this.foodLabel=this.add.text(landscape?foodX:396,landscape?foodY-22:foodY,'0/100',
      {fontSize:'16px',fontStyle:'bold',color:'#c8f7a0',stroke:'#07131f',strokeThickness:4}).setOrigin(landscape?.5:0,.5).setDepth(902);

    const gaugeY=landscape?230:LAYOUT.panelTop+128;
    const gaugeX=landscape?LAYOUT.rightPanelX:235;
    /* 直式時「文字—進度條—數字」三段橫排，彼此不重疊。 */
    this.add.text(landscape?gaugeX:36,landscape?gaugeY-42:gaugeY,'孔明計策',
      {fontSize:'17px',fontStyle:'bold',color:'#ffe9a8',stroke:'#07131f',strokeThickness:4}).setOrigin(landscape?.5:0,.5).setDepth(902);
    this.gaugeLabel=this.add.text(landscape?gaugeX:396,landscape?gaugeY-22:gaugeY,'0/100',
      {fontSize:'17px',fontStyle:'bold',color:'#ffe9a8',stroke:'#07131f',strokeThickness:4}).setOrigin(landscape?.5:0,.5).setDepth(902);
    this.gaugeBack=this.add.rectangle(landscape?gaugeX:262,gaugeY,landscape?200:250,14,0x07131f,.85).setDepth(901);
    this.gaugeFill=this.add.rectangle((landscape?gaugeX:262)-(landscape?100:125),gaugeY,4,10,0xffe36f).setOrigin(0,.5).setDepth(902);
    this.warningText=this.add.text(width/2,LAYOUT.landscape?90:150,'',{fontSize:'23px',fontStyle:'bold',color:'#ff9aa8',stroke:'#2a0710',strokeThickness:6}).setOrigin(.5).setDepth(960);
  }

  /* 指派武將帶下一波兵；再點一次取消。 */
  toggleHero(id){
    const hero=Heroes.find(this.match,id),def=Heroes.HEROES[id];
    if(!hero)return;
    if(hero.status==='marching'){this.showHint(`${def.name} 正在領兵作戰`);return;}
    if(hero.status==='down'){this.showHint(`${def.name} 折損中，${Math.ceil(hero.cooldown)} 秒後歸隊`);return;}
    const on=Heroes.lead(this.match,id);
    this.showHint(on?`${def.name} 待命出征｜下一波出兵由他率領（${def.desc}）`:`已取消 ${def.name} 出征`);
    this.refreshCommandPanel();
  }
  setMode(mode){
    this.mode=mode;this.clearSelection();
    if(mode?.type==='tactic'){
      const card=Tactics.TACTICS[mode.card];
      const where=card.target==='road'?'點地圖上任一條道路':card.target==='own'?'點一座我方城寨':'點一座敵方城寨';
      this.showHint(`${card.name}：${where}`);
      if(card.target==='road')this.highlightRoads(null);
    }
    if(!mode)this.dragLayer?.clear();
    this.refreshCommandPanel();
  }
  useCard(slot){
    const state=this.match.tactics[0];
    const card=state.hand[slot];
    if(!card)return;
    if(!Tactics.canCast(state,card)){this.showHint(`計策值不足（${Math.floor(state.points)}／${Tactics.COST}）`);return;}
    const def=Tactics.TACTICS[card];
    if(def.target==='none'){
      Tactics.cast(this.match,state,card,null);
      this.showHint(`${def.name}！${def.desc}`);
      this.refreshCommandPanel();
      return;
    }
    this.setMode({type:'tactic',card});
  }
  applyModeToNode(node){
    if(this.mode?.type==='tactic'){
      const state=this.match.tactics[0],def=Tactics.TACTICS[this.mode.card];
      if(def.target==='road')return false;   /* 道路卡由 pointerup 的道路判定處理 */
      if(Tactics.cast(this.match,state,this.mode.card,node.id))this.showHint(`${def.name}！${this.nodeLabel(node.id)}`);
      else this.showHint(`${def.name} 無法對此處施放`);
      this.setMode(null);return true;
    }
    return false;
  }
  refreshCommandPanel(){
    for(const [id,button] of Object.entries(this.heroButtons)){
      const hero=Heroes.find(this.match,id);
      button.frame.setTint(hero.pending?0x70ffd8:0xffffff);
      button.status.setText(
        hero.status==='down'?`折損 ${Math.ceil(hero.cooldown)}s`
        :hero.status==='marching'?'領兵作戰中'
        :hero.pending?'★ 待命出征':'點我帶兵');
      button.status.setColor(hero.status==='down'?'#ff9aa8':hero.pending?'#70ffd8':'#d8fff4');
      button.frame.setAlpha(hero.status==='ready'?1:.55);
      button.portrait.setAlpha(hero.status==='down'?.35:1);
    }
    const state=this.match.tactics[0];
    this.cardButtons.forEach((button,slot)=>{
      const card=state.hand[slot],def=card&&Tactics.TACTICS[card];
      const ready=card&&Tactics.canCast(state,card);
      button.name.setText(def?(ready?`${def.name}　▶`:def.name):'—');
      button.desc.setText(def?def.desc:'');
      button.frame.setAlpha(ready?1:.45);
      button.frame.setTint(this.mode?.type==='tactic'&&this.mode.card===card?0x70ffd8:0xffffff);
    });
  }
  shortLabel(id){return id==='player'?'主城':id==='enemy'?'敵城':id.slice(0,4);}

  roadMode(){
    const card=this.mode?.type==='tactic'?Tactics.TACTICS[this.mode.card]:null;
    return card&&card.target==='road'?card:null;
  }
  installInput(){
    this.input.on('pointerdown',pointer=>{
      const node=this.nodeAt(pointer);if(!node)return;
      this.pressed={node,x:pointer.x,y:pointer.y};
    });
    this.input.on('pointermove',pointer=>{
      if(this.roadMode()){this.highlightRoads(this.edgeAtPointer(pointer));return;}
      if(!this.pressed||this.pressed.node.owner!==0)return;
      if(Phaser.Math.Distance.Between(this.pressed.x,this.pressed.y,pointer.x,pointer.y)<18)return;
      this.dragging=true;
      this.drawDrag(pointer);
    });
    this.input.on('pointerup',pointer=>{
      const card=this.roadMode();
      if(card){
        this.pressed=null;
        const road=this.edgeAtPointer(pointer);
        if(!road){this.showHint(`${card.name}：請點一條道路`);return;}
        const state=this.match.tactics[0];
        if(Tactics.cast(this.match,state,this.mode.card,road.key))this.showHint(`${card.name}！`);
        else this.showHint(card.id==='fire'?'這條路上沒有敵軍':`${card.name} 無法施放`);
        this.setMode(null);this.dragLayer.clear();
        return;
      }
      const pressed=this.pressed;this.pressed=null;this.dragLayer.clear();
      if(!pressed)return;
      const released=this.nodeAt(pointer);
      if(this.dragging){
        this.dragging=false;
        if(released&&released!==pressed.node)this.order([pressed.node.id],released.id,MatchState.CONFIG.dispatchRatio);
        return;
      }
      if(released)this.tap(released);
    });
    this.input.keyboard.on('keydown-SPACE',()=>this.assaultAll());
    this.input.keyboard.on('keydown-ESC',()=>this.clearSelection());
  }
  nodeAt(pointer){
    const mapX=LAYOUT.toMapX(pointer.x),mapY=LAYOUT.toMapY(pointer.y);
    let best=null,bestScore=Infinity;
    for(const node of Object.values(this.match.nodes)){
      const radius=node.type==='base'?96:82;
      const score=((mapX-node.x)/radius)**2+((mapY-node.y)/radius)**2;
      if(score<=1&&score<bestScore){best=node;bestScore=score;}
    }
    return best;
  }
  drawDrag(pointer){
    this.dragLayer.clear();
    const view=this.nodeViews[this.pressed.node.id];
    const target=this.nodeAt(pointer);
    this.dragLayer.lineStyle(LAYOUT.scale(6),target&&target!==this.pressed.node?0xffe36f:0x75ffd8,.85);
    this.dragLayer.beginPath();
    this.dragLayer.moveTo(view.x,view.y);
    this.dragLayer.lineTo(pointer.x,pointer.y);
    this.dragLayer.strokePath();
  }

  tap(node){
    if(this.applyModeToNode(node))return;
    const now=this.time.now;
    const doubleTap=this.lastTapNode===node.id&&now-this.lastTapTime<320;
    this.lastTapNode=node.id;this.lastTapTime=now;

    if(node.owner===0&&!this.selected.size){this.select(node);return;}
    if(node.owner===0&&this.selected.has(node.id)){
      if(doubleTap)return;
      this.selected.delete(node.id);this.refreshSelection();
      if(!this.selected.size)this.showHint('已取消選取');
      return;
    }
    if(node.owner===0&&this.selected.size){
      /* 我方城寨：預設加入多選；已選過的目標則視為增援。 */
      this.select(node,true);return;
    }
    if(!this.selected.size){this.showHint('先點一座我方（綠色）城寨');return;}
    this.order([...this.selected],node.id,doubleTap?MatchState.CONFIG.dispatchAllRatio:MatchState.CONFIG.dispatchRatio);
  }
  select(node,append=false){
    if(!append)this.selected.clear();
    this.selected.add(node.id);
    this.refreshSelection();
    this.showHint(this.selected.size>1?`已選 ${this.selected.size} 座城寨｜點目標一次全出`:'點任一城寨出兵｜再點我方城寨可多選');
  }
  clearSelection(){this.selected.clear();this.refreshSelection();}
  refreshSelection(){
    for(const [id,view] of Object.entries(this.nodeViews))view.ring.setStrokeStyle(LAYOUT.scale(5),0x75ffd8,this.selected.has(id)?.95:0);
    this.renderAssaultCost();
    const single=this.selected.size===1?this.match.nodes[[...this.selected][0]]:null;
    const canUpgrade=single&&single.owner===0&&single.level<MatchState.CONFIG.levels.length;
    this.setUpgradeVisible(!!canUpgrade);
    if(canUpgrade)this.upgradeButton.setLabel(`升級\n${MatchState.levelOf(this.match.config,single.level+1).cost}兵`);
  }
  /* 選好出兵起點後，直接在每座敵城旁標出「要幾人才打得下」。 */
  renderAssaultCost(){
    const active=this.selected.size>0;
    for(const node of Object.values(this.match.nodes)){
      const view=this.nodeViews[node.id];if(!view)continue;
      if(!view.need){
        view.need=this.add.text(view.x,LAYOUT.toScreenY(node.y+78),'',
          {fontSize:`${Math.round(LAYOUT.scale(19))}px`,fontStyle:'bold',color:'#ffd166',
           stroke:'#07131f',strokeThickness:5}).setOrigin(.5).setDepth(view.y+4);
      }
      if(!active||node.owner===0){view.need.setText('');continue;}
      const need=Math.ceil(node.troops*MatchState.defenseOf(this.match.config,node,MatchState.deficitOf(this.match,node.owner)))+1;
      view.need.setText(`需 ${need} 人`);
    }
  }
  upgradeSelected(){
    const id=[...this.selected][0];if(!id)return;
    if(MatchState.upgrade(this.match,id))this.showHint('城寨升級｜產能與上限提升');
    else this.showHint('駐軍不足，無法升級');
    this.refreshSelection();
  }
  order(sourceIds,targetId,ratio){
    const before=this.match.food[0];
    const sent=MatchState.dispatch(this.match,sourceIds,targetId,ratio);
    if(!sent){
      const regroup=this.match.events.find(event=>event.type==='regrouping');
      const noFood=this.match.events.some(event=>event.type==='noFood');
      this.showHint(regroup?`整隊中　${regroup.remain.toFixed(1)} 秒後才能再出兵`
        :noFood?'兵糧見底，等屯糧或攻下城寨再出兵'
        :'駐軍不足，至少要 2 名才能出兵');
      return;
    }
    const cost=Math.round(before-this.match.food[0]);
    const short=this.match.events.some(event=>event.type==='dispatch'&&event.short);
    this.showHint(`出兵 ${sent} 人 → ${this.nodeLabel(targetId)}　耗糧 ${cost}${short?'（兵糧只夠這些）':''}`);
    this.clearSelection();
  }
  assaultAll(){
    const mine=MatchState.ownedNodes(this.match,0).map(node=>node.id);
    if(!mine.length)return;
    const target=Object.values(this.match.nodes)
      .filter(node=>node.owner!==0)
      .map(node=>({node,steps:this.map.shortestPath('player',node.id).length}))
      .sort((a,b)=>a.steps-b.steps||a.node.troops-b.node.troops)[0];
    if(target)this.order(mine,target.node.id,MatchState.CONFIG.dispatchRatio);
  }
  nodeLabel(id){return id==='player'?'我方主城':id==='enemy'?'敵方主城':`城寨 ${id}`;}
  showHint(text){
    this.hint.setText(text);
    this.hintTimer?.remove(false);
    this.hintTimer=this.time.delayedCall(2400,()=>this.hint?.setText(''));
  }

  update(_time,deltaMs){
    if(!this.ready||this.match.over)return;
    const dt=Math.min(deltaMs/1000,.05);
    MatchAI.update(this.match,this.ai,dt);
    Tactics.gain(this.match,this.match.tactics[0],dt,MatchState.ownedNodes(this.match,0).length);
    Tactics.updateEnemy(this.match,this.match.tactics[1],dt,MatchState.ownedNodes(this.match,1).length);
    MatchState.step(this.match,dt);
    this.renderNodes();
    this.renderSoldiers();
    this.renderHeroes();
    this.renderHud();
    if(this.selected.size)this.renderAssaultCost();
    this.refreshCommandPanel();
    this.renderTacticGauge();
    for(const event of this.match.events){
      if(event.type==='capture')this.popCapture(event);
      if(event.type==='capacityFull'&&event.side===0)this.showHint(`${this.nodeLabel(event.node)} 已滿員｜再長的兵會浪費掉，該出擊了`);
      if(event.type==='tacticWarning'&&event.side===1)this.showWarning(event);
      if(event.type==='tactic'&&event.x!==undefined)this.popCapture({node:event.node,side:event.side});
      if(event.type==='heroStrike')this.popCapture({node:event.node,side:0});
      if(event.type==='heroDown'&&event.side===0)this.showHint(`${Heroes.HEROES[event.hero].name} 部隊全滅，${Heroes.DOWN_SECONDS} 秒後歸隊`);
      if(event.type==='heroReturn'&&event.side===0)this.showHint(`${Heroes.HEROES[event.hero].name} 歸隊待命`);
      if(event.type==='finish')this.finish(event.winner,event.reason);
    }
  }
  renderNodes(){
    for(const node of Object.values(this.match.nodes)){
      const view=this.nodeViews[node.id];
      const texture=node.type==='base'
        ?(node.owner===0?'keep_shu':'keep_wei')
        :(node.owner===0?'outpost_shu':node.owner===1?'outpost_wei':'outpost_neutral');
      if(view.sprite.texture.key!==texture)view.sprite.setTexture(texture);
      /*
       * 顯示「現有/上限」：只有一個數字時，城寨停止長兵會讓玩家覺得莫名其妙。
       * 上限存在的理由是擋龜縮流——沒有上限時最強打法就是什麼都不做等兵長滿。
       */
      const capacity=Math.floor(MatchState.capacityOf(this.match.config,node));
      const full=node.owner>=0&&node.troops>=capacity;
      view.count.setText(node.owner<0?String(node.troops):`${node.troops}/${capacity}`);
      view.count.setColor(full?'#ffd166':(SIDE_TEXT[node.owner]||'#ffffff'));
      view.badge.setFillStyle(full?0x4a3410:0x07131f,.82);
      /* 整隊中的我方城寨要看得出來，否則玩家會以為點擊沒反應。 */
      view.sprite.setAlpha(node.owner===0&&(node.cooldown||0)>0?.55:1);
      view.badge.setFillStyle(0x07131f,.78);
      /* 守城倍率必須看得見，否則玩家不會知道「為什麼 31 人打不下 30 人的城」。 */
      const defense=MatchState.defenseOf(this.match.config,node);
      view.pips.setText(node.owner<0?'無人守備':`${'★'.repeat(node.level)} 守${defense.toFixed(1)}`);
      view.pips.setColor(node.owner<0?'#ffe9a3':defense>=2?'#ffd166':'#ffe9a8');
    }
  }
  renderSoldiers(){
    const alive=new Set();
    for(const soldier of this.match.soldiers){
      alive.add(soldier.id);
      let sprite=this.soldierSprites.get(soldier.id);
      if(!sprite){
        const key=`${soldier.kind}_${soldier.side===0?'shu':'wei'}`;
        sprite=this.add.sprite(0,0,key,2).setScale(LAYOUT.scale(.075));
        sprite.play(`${key}_walk`);
        this.soldierSprites.set(soldier.id,sprite);
      }
      const x=LAYOUT.toScreenX(soldier.x),y=LAYOUT.toScreenY(soldier.y);
      sprite.setPosition(x,y).setDepth(y).setFlipX(Math.cos(soldier.heading)<0);
    }
    for(const [id,sprite] of this.soldierSprites){
      if(alive.has(id))continue;
      sprite.destroy();this.soldierSprites.delete(id);
    }
  }
  renderHud(){
    /* 沒有倒數：改成經過時間，決戰階段才會變色提醒。 */

    const enemyBase=this.match.nodes.enemy;
    /* 「需 N 人」在選好出兵起點時會直接標在敵城旁，頂欄只留目標本身。 */
    this.objectiveText.setText(`⚑ 敵主城 ${enemyBase.troops}`);
    const mine=MatchState.ownedNodes(this.match,0),theirs=MatchState.ownedNodes(this.match,1);
    this.mineText.setText(`我 ${mine.length}寨 ${MatchState.totalTroops(this.match,0)}`);
    this.theirsText.setText(`敵 ${theirs.length}寨 ${MatchState.totalTroops(this.match,1)}`);
    const cap=MatchState.foodCapOf(this.match.config,mine.length);
    const rate=mine.reduce((sum,node)=>sum+MatchState.foodRateOf(this.match.config,node),0);
    this.foodLabel.setText(`${Math.floor(this.match.food[0])}/${Math.round(cap)}　+${rate.toFixed(1)}/秒`);
    this.foodFill.width=Math.max(4,(LAYOUT.landscape?200:250)*Math.min(1,this.match.food[0]/cap));
  }
  renderTacticGauge(){
    const state=this.match.tactics[0];
    const ready=state.points>=Tactics.COST;
    const full=LAYOUT.landscape?200:250;
    this.gaugeFill.width=Math.max(4,full*(state.points/Tactics.COST));
    this.gaugeFill.fillColor=ready?0x70ffd8:0xffe36f;
    /* 用數字講清楚還差多少，玩家才知道計謀不是壞掉而是還沒集滿。 */
    this.gaugeLabel.setText(ready?'可施放！':`${Math.floor(state.points)}/${Tactics.COST}`);
    this.gaugeLabel.setColor(ready?'#70ffd8':'#ffe9a8');
    if(ready&&!this.tacticReadyNotified){
      this.tacticReadyNotified=true;
      this.showHint('計策已滿！點下方策略卡施放');
    }
    if(!ready)this.tacticReadyNotified=false;
  }
  showWarning(event){
    const def=Tactics.TACTICS[event.card];
    this.warningText.setText(`⚠ 司馬懿・${def.name}`);
    this.warningTimer?.remove(false);
    this.warningTimer=this.time.delayedCall(2200,()=>this.warningText?.setText(''));
  }
  popCapture(event){
    const view=this.nodeViews[event.node];if(!view)return;
    const flash=this.add.circle(view.x,view.y,LAYOUT.scale(70),SIDE_COLOR[event.side]??0xffffff,.55).setDepth(view.y+5);
    this.tweens.add({targets:flash,scale:1.8,alpha:0,duration:420,onComplete:()=>flash.destroy()});
  }
  finish(winner,reason){
    if(this.finished)return;this.finished=true;
    const progress=loadProgress();
    if(winner===0){progress.wins++;progress.unlocked=Math.max(progress.unlocked,Math.min(5,this.level+1));}
    else progress.losses++;
    saveProgress(progress);
    this.time.delayedCall(700,()=>this.scene.start('Result',{
      win:winner===0,reason,level:this.level,
      stats:{captured:this.match.stats.captured,lost:this.match.stats.lost,seconds:Math.round(this.match.time)},
    }));
  }
}

class ResultScene extends Phaser.Scene{
  constructor(){super('Result');}
  init(data){this.result=data;}
  create(){
    const {width,height}=LAYOUT;
    const {win,reason,level,stats}=this.result;
    const art=this.add.image(width/2,height/2,win?'result_win':'result_lose');
    art.setScale(Math.max(width/art.width,height/art.height));
    this.add.rectangle(width/2,height/2,width,height,0x03121f,.28);

    const centerY=LAYOUT.landscape?height*.52:height*.58;
    this.add.text(width/2,centerY-120,win?'勝  利':'敗  北',
      {fontSize:'70px',fontStyle:'bold',color:win?'#ffe9a8':'#ffc0c8',stroke:'#2b1405',strokeThickness:12}).setOrigin(.5);
    this.add.text(width/2,centerY-58,`第 ${level} 關　${MapData.LEVEL_META[level].name}　｜　${reason}`,
      {fontSize:'21px',fontStyle:'bold',color:'#ffffff',stroke:'#07131f',strokeThickness:6}).setOrigin(.5);
    this.add.text(width/2,centerY-12,`攻下城寨 ${stats.captured[0]}　折損 ${stats.lost[0]}　歷時 ${stats.seconds} 秒`,
      {fontSize:'20px',fontStyle:'bold',color:'#d8fff4',stroke:'#07131f',strokeThickness:5}).setOrigin(.5);

    const nextLevel=win&&level<5?level+1:null;
    makeButton(this,width/2,centerY+62,300,72,nextLevel?`前進第 ${nextLevel} 關`:'再 戰 一 場',()=>{
      this.scene.start('Battle',{level:nextLevel||level});
    },{texture:'primary_v3',fontSize:'27px'});
    makeButton(this,width/2,centerY+150,220,58,'回 首 頁',()=>this.scene.start('Home'),{texture:'secondary_v3',fontSize:'22px'});
  }
}

globalThis.game=new Phaser.Game({
  type:Phaser.AUTO,parent:'game',backgroundColor:'#061421',
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:LAYOUT.width,height:LAYOUT.height},
  scene:[BootScene,HomeScene,BattleScene,ResultScene],
});
