// ============================================================
// 德州撲克九人遊戲 — PixiJS 版（完整三畫面）
// ============================================================

const W = 1440, H = 900;
const SUITS = ['Hearts','Diamonds','Club','Spades'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const AI_NAMES = ['ALICE','BOB','CHARLIE','DIANA','EVA','FRANK','GRACE','HENRY'];
const STARTING_CHIPS = 10000;
const SMALL_BLIND = 50, BIG_BLIND = 100, TURN_TIME = 30;

// 座位
const SEAT_POS = [
    {x:720,y:730},{x:230,y:640},{x:110,y:440},{x:230,y:240},
    {x:480,y:150},{x:960,y:150},{x:1210,y:240},{x:1330,y:440},{x:1210,y:640}
];
const BET_OFFSET = [
    {x:90,y:-60},{x:100,y:-40},{x:110,y:0},{x:100,y:45},
    {x:0,y:75},{x:0,y:75},{x:-100,y:45},{x:-110,y:0},{x:-100,y:-40}
];

// ============================================================
// 音效（精簡）
// ============================================================
const AudioCtx=window.AudioContext||window.webkitAudioContext;let audioCtx=null;
function ensureAudio(){if(!audioCtx)audioCtx=new AudioCtx();if(audioCtx.state==='suspended')audioCtx.resume();}
function mkNoise(c,d){const n=c.sampleRate*d,b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;const s=c.createBufferSource();s.buffer=b;return s;}
function playSound(t){try{ensureAudio();const c=audioCtx,n=c.currentTime;
if(t==='card-deal'){const s=mkNoise(c,.06),f=c.createBiquadFilter();f.type='highpass';f.frequency.value=3000;const g=c.createGain();g.gain.setValueAtTime(.3,n);g.gain.exponentialRampToValueAtTime(.001,n+.06);s.connect(f).connect(g).connect(c.destination);s.start(n);s.stop(n+.06);}
else if(t==='card-flip'){const s=mkNoise(c,.12),f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=2000;f.Q.value=2;const g=c.createGain();g.gain.setValueAtTime(.25,n);g.gain.exponentialRampToValueAtTime(.001,n+.12);s.connect(f).connect(g).connect(c.destination);s.start(n);s.stop(n+.12);}
else if(t==='chip'){const o=c.createOscillator();o.frequency.setValueAtTime(800,n);o.frequency.exponentialRampToValueAtTime(200,n+.08);const g=c.createGain();g.gain.setValueAtTime(.15,n);g.gain.exponentialRampToValueAtTime(.001,n+.1);o.connect(g).connect(c.destination);o.start(n);o.stop(n+.1);}
else if(t==='check'){const o=c.createOscillator();o.frequency.setValueAtTime(300,n);o.frequency.exponentialRampToValueAtTime(100,n+.05);const g=c.createGain();g.gain.setValueAtTime(.2,n);g.gain.exponentialRampToValueAtTime(.001,n+.08);o.connect(g).connect(c.destination);o.start(n);o.stop(n+.08);}
else if(t==='fold'){const s=mkNoise(c,.15),f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=800;const g=c.createGain();g.gain.setValueAtTime(.15,n);g.gain.exponentialRampToValueAtTime(.001,n+.15);s.connect(f).connect(g).connect(c.destination);s.start(n);s.stop(n+.15);}
else if(t==='win'){[0,.12,.24,.36].forEach((t2,i)=>{const o=c.createOscillator();o.type='triangle';o.frequency.value=[523,659,784,1047][i];const g=c.createGain();g.gain.setValueAtTime(0,n+t2);g.gain.linearRampToValueAtTime(.2,n+t2+.02);g.gain.exponentialRampToValueAtTime(.001,n+t2+.15);o.connect(g).connect(c.destination);o.start(n+t2);o.stop(n+t2+.15);});}
else if(t==='lose'){[0,.15].forEach((t2,i)=>{const o=c.createOscillator();o.type='triangle';o.frequency.value=[400,250][i];const g=c.createGain();g.gain.setValueAtTime(0,n+t2);g.gain.linearRampToValueAtTime(.2,n+t2+.02);g.gain.exponentialRampToValueAtTime(.001,n+t2+.3);o.connect(g).connect(c.destination);o.start(n+t2);o.stop(n+t2+.3);});}
else if(t==='allin'){const o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(440,n);o.frequency.setValueAtTime(880,n+.1);const g=c.createGain();g.gain.setValueAtTime(.1,n);g.gain.exponentialRampToValueAtTime(.001,n+.3);o.connect(g).connect(c.destination);o.start(n);o.stop(n+.3);}
else if(t==='button'){const o=c.createOscillator();o.frequency.value=500;const g=c.createGain();g.gain.setValueAtTime(.1,n);g.gain.exponentialRampToValueAtTime(.001,n+.05);o.connect(g).connect(c.destination);o.start(n);o.stop(n+.05);}
else if(t==='turn-alert'){const o=c.createOscillator();o.frequency.value=660;const g=c.createGain();g.gain.setValueAtTime(.15,n);g.gain.exponentialRampToValueAtTime(.001,n+.2);o.connect(g).connect(c.destination);o.start(n);o.stop(n+.2);}
}catch(e){}}

// ============================================================
// 狀態
// ============================================================
let gameState={deck:[],communityCards:[],players:[],pot:0,dealerIndex:0,currentPlayerIndex:0,phase:'preflop',currentBet:0,minRaise:BIG_BLIND,isRunning:false,isPaused:false,actionLock:false,turnTimer:null,turnTimeLeft:TURN_TIME,actedThisRound:new Set(),lastRaiserIndex:-1};

// ============================================================
// PixiJS 全域
// ============================================================
let app,tex={};
let screens={};// menu,lobby,game
let seatUI=[],communityUI=[];
let potText,msgC,msgT,timerText,timerBar,actionBar,raisePanel;
let topBarTexts={};

async function init(){
    app=new PIXI.Application({width:W,height:H,backgroundColor:0x1a0a2e,antialias:true,resolution:window.devicePixelRatio||1,autoDensity:true});
    document.body.appendChild(app.view);
    const resize=()=>{const s=Math.min(window.innerWidth/W,window.innerHeight/H);app.view.style.width=W*s+'px';app.view.style.height=H*s+'px';app.view.style.position='absolute';app.view.style.left=(window.innerWidth-W*s)/2+'px';app.view.style.top=(window.innerHeight-H*s)/2+'px';};
    window.addEventListener('resize',resize);resize();
    await loadAssets();
    buildMenuScreen();
    buildLobbyScreen();
    buildGameScreen();
    buildResultOverlay();
    buildPauseOverlay();
    showScreen('menu');
    app.ticker.add(dt=>updateTweens(dt));
}

async function loadAssets(){
    const p={
        bg_violet:'assets/Interface_game/png/background_violet.png',
        bg_green:'assets/Interface_game/png/background_green.png',
        bg_elements:'assets/Menu/png/background_elements.png',
        table:'assets/Interface_game/png/table-green.png',
        dealer_menu:'assets/Croupier/png/woman_menu.png',
        dealer_game:'assets/Croupier/png/woman_ingame.png',
        avatar_frame:'assets/Interface_game/png/avatar_player.png',
        default_avatar:'assets/Interface_game/png/default_avatar.png',
        empty_card:'assets/Interface_game/png/empty_card_field.png',
        score_panel:'assets/Interface_game/png/score.png',
        btn_play_menu:'assets/Menu/png/button_play.png',
        btn_lobby_menu:'assets/Menu/png/button_lobby.png',
        btn_chat:'assets/Menu/png/button_chat.png',
        btn_friends:'assets/Menu/png/button_friends.png',
        btn_shop_menu:'assets/Menu/png/button_shop.png',
        btn_setting_menu:'assets/Menu/png/button_setting.png',
        icon_coin:'assets/Menu/png/icon_coin.png',
        icon_chip:'assets/Menu/png/icon_chip.png',
        player_panel:'assets/Menu/png/player_panel.png',
        // Lobby
        lobby_window:'assets/lobby/png/window.png',
        lobby_table_green:'assets/lobby/png/table-green.png',
        lobby_table_blue:'assets/lobby/png/table-blue.png',
        lobby_table_red:'assets/lobby/png/table-red.png',
        lobby_dealer:'assets/lobby/png/woman_ingame.png',
        lobby_avatar:'assets/lobby/png/defaul_avatar.png',
        lobby_left:'assets/lobby/png/button_left.png',
        lobby_right:'assets/lobby/png/button_right.png',
        lobby_play:'assets/lobby/png/button_play.png',
        lobby_watch:'assets/lobby/png/button_whatch.png',
        lobby_bg:'assets/lobby/png/background_violet.png',
        lobby_blinks:'assets/lobby/png/blinks.png',
        lobby_btn_lobby:'assets/lobby/png/button_lobby.png',
        lobby_btn_shop:'assets/lobby/png/button_shop.png',
        lobby_btn_setting:'assets/lobby/png/button_setting.png',
        // Game
        btn_fold:'assets/Interface_game/png/button_fold.png',
        btn_check:'assets/Interface_game/png/button_check.png',
        btn_call:'assets/Interface_game/png/button_call.png',
        btn_raise:'assets/Interface_game/png/button_raise.png',
        btn_check_fold:'assets/Interface_game/png/button_check-fold.png',
        btn_pause:'assets/Interface_game/png/button_pause.png',
        btn_resume:'assets/Pause/png/button_resume.png',
        btn_lobby_pause:'assets/Pause/png/button_lobby.png',
        btn_ok:'assets/Win/png/button_ok.png',
        btn_shop_game:'assets/Interface_game/png/button_shop.png',
        btn_lobby_game:'assets/Interface_game/png/button_lobby.png',
        win_title:'assets/Win/png/win.png',
        lose_title:'assets/Lose/png/you_lose.png',
        card_back:'assets/Cards/png/shirt_blue.png',
        card_back_red:'assets/Cards/png/shirt_red.png',
    };
    for(const v of [1,4,10,25,50,100,500,1000,5000,10000])p[`chip_${v}`]=`assets/Chips/png/${v}.png`;
    for(const s of SUITS)for(const r of RANKS)p[`card_${s}_${r}`]=`assets/Cards/png/${s}_${r}.png`;
    for(const[k,v]of Object.entries(p)){try{tex[k]=await PIXI.Assets.load(v);}catch(e){}}
}

// Tween
const tweens=[];
function tweenTo(o,p,d,e='linear'){return new Promise(r=>{const s={};for(const k in p)s[k]=o[k];tweens.push({obj:o,start:s,end:p,duration:d,elapsed:0,ease:e,resolve:r});});}
function updateTweens(dt){for(let i=tweens.length-1;i>=0;i--){const tw=tweens[i];tw.elapsed+=dt*(1000/60);let t=Math.min(tw.elapsed/tw.duration,1);if(tw.ease==='easeOut')t=1-(1-t)*(1-t);for(const k in tw.end)tw.obj[k]=tw.start[k]+(tw.end[k]-tw.start[k])*t;if(t>=1){tweens.splice(i,1);tw.resolve();}}}

// ============================================================
// 工具：建立按鈕 Sprite
// ============================================================
function mkBtn(texKey,x,y,scale,cb){
    const s=new PIXI.Sprite(tex[texKey]||PIXI.Texture.WHITE);s.anchor.set(0.5);s.x=x;s.y=y;s.scale.set(scale);
    s.eventMode='static';s.cursor='pointer';
    s.on('pointerdown',()=>{playSound('button');cb();});
    s.on('pointerover',()=>{s.scale.set(scale*1.08);});s.on('pointerout',()=>{s.scale.set(scale);});
    return s;
}
function mkText(str,opts){const t=new PIXI.Text(str,{fontFamily:'Arial Black, Arial',fill:'#fff',fontWeight:'900',...opts});t.anchor.set(0.5);return t;}

// ============================================================
// 1. 開始畫面
// ============================================================
function buildMenuScreen(){
    const c=new PIXI.Container();app.stage.addChild(c);screens.menu=c;

    // 紫色背景
    if(tex.bg_violet){const b=new PIXI.Sprite(tex.bg_violet);b.width=W;b.height=H;c.addChild(b);}
    else{const g=new PIXI.Graphics();g.beginFill(0x2a1050);g.drawRect(0,0,W,H);g.endFill();c.addChild(g);}
    if(tex.bg_elements){const e=new PIXI.Sprite(tex.bg_elements);e.width=W;e.height=H;e.alpha=0.3;c.addChild(e);}

    // 荷官（大，偏左）
    if(tex.dealer_menu){const d=new PIXI.Sprite(tex.dealer_menu);d.anchor.set(0.5,1);d.x=W*0.38;d.y=H*0.92;d.scale.set(0.45);c.addChild(d);}

    // 頂部按鈕
    if(tex.btn_chat)c.addChild(mkBtn('btn_chat',60,55,0.4,()=>{}));
    if(tex.btn_friends)c.addChild(mkBtn('btn_friends',160,55,0.4,()=>{}));
    if(tex.btn_shop_menu)c.addChild(mkBtn('btn_shop_menu',W-160,55,0.45,()=>{}));
    if(tex.btn_setting_menu)c.addChild(mkBtn('btn_setting_menu',W-55,55,0.4,()=>{}));

    // PLAY 按鈕（大，右側）
    const playBg=new PIXI.Graphics();
    playBg.beginFill(0xe83030);playBg.drawRoundedRect(0,0,280,80,12);playBg.endFill();
    playBg.lineStyle(3,0xff6666);playBg.drawRoundedRect(0,0,280,80,12);
    const playC=new PIXI.Container();playC.x=W*0.72;playC.y=H*0.35;playC.addChild(playBg);
    const playT=mkText('PLAY',{fontSize:42,fill:'#fff'});playT.x=140;playT.y=40;playC.addChild(playT);
    playC.eventMode='static';playC.cursor='pointer';
    playC.on('pointerdown',()=>{playSound('button');showScreen('game');startGame();});
    playC.on('pointerover',()=>{playC.scale.set(1.05);});playC.on('pointerout',()=>{playC.scale.set(1);});
    c.addChild(playC);

    // LOBBY 按鈕（大，右側）
    const lobbyBg=new PIXI.Graphics();
    lobbyBg.beginFill(0x8bc34a);lobbyBg.drawRoundedRect(0,0,280,80,12);lobbyBg.endFill();
    lobbyBg.lineStyle(3,0xaed581);lobbyBg.drawRoundedRect(0,0,280,80,12);
    const lobbyC=new PIXI.Container();lobbyC.x=W*0.72;lobbyC.y=H*0.5;lobbyC.addChild(lobbyBg);
    const lobbyT=mkText('LOBBY',{fontSize:42,fill:'#000'});lobbyT.x=140;lobbyT.y=40;lobbyC.addChild(lobbyT);
    lobbyC.eventMode='static';lobbyC.cursor='pointer';
    lobbyC.on('pointerdown',()=>{playSound('button');showScreen('lobby');});
    lobbyC.on('pointerover',()=>{lobbyC.scale.set(1.05);});lobbyC.on('pointerout',()=>{lobbyC.scale.set(1);});
    c.addChild(lobbyC);

    // 玩家資訊（右下）
    const pi=new PIXI.Container();pi.x=W*0.73;pi.y=H*0.75;c.addChild(pi);
    const piBg=new PIXI.Graphics();piBg.beginFill(0x1a3a4a,0.85);piBg.drawRoundedRect(0,0,300,100,12);piBg.endFill();pi.addChild(piBg);
    // 頭像
    if(tex.default_avatar){const av=new PIXI.Sprite(tex.default_avatar);av.anchor.set(0.5);av.x=50;av.y=50;av.scale.set(0.5);pi.addChild(av);}
    const nameT=mkText('PLAYER',{fontSize:18,fill:'#fff'});nameT.anchor.set(0,0.5);nameT.x=95;nameT.y=28;pi.addChild(nameT);
    const lvlT=mkText('1 LEVEL',{fontSize:14,fill:'#ffd700'});lvlT.anchor.set(0,0.5);lvlT.x=95;lvlT.y=50;pi.addChild(lvlT);
    // 金幣
    if(tex.icon_coin){const ic=new PIXI.Sprite(tex.icon_coin);ic.anchor.set(0.5);ic.x=110;ic.y=80;ic.width=22;ic.height=22;pi.addChild(ic);}
    const monT=mkText('10,000',{fontSize:14,fill:'#fff'});monT.anchor.set(0,0.5);monT.x=125;monT.y=80;pi.addChild(monT);
    if(tex.icon_chip){const ic2=new PIXI.Sprite(tex.icon_chip);ic2.anchor.set(0.5);ic2.x=220;ic2.y=80;ic2.width=22;ic2.height=22;pi.addChild(ic2);}
    const chipT=mkText('500',{fontSize:14,fill:'#fff'});chipT.anchor.set(0,0.5);chipT.x=235;chipT.y=80;pi.addChild(chipT);
}

// ============================================================
// 2. 大廳選桌畫面
// ============================================================
const LOBBY_TABLES=[
    {name:'Table 1',players:['ALICE','BOB','CHARLIE','DIANA','EVA'],blinds:'50/100',color:'green'},
    {name:'Table 2',players:['FRANK','GRACE','HENRY','LIZA','ROBERT'],blinds:'100/200',color:'blue'},
    {name:'Table 3',players:['MARY','SHADOW','RAIDEN','SWEET','BOSS'],blinds:'200/400',color:'red'},
];
let lobbyIndex=0;

function buildLobbyScreen(){
    const c=new PIXI.Container();c.visible=false;app.stage.addChild(c);screens.lobby=c;

    // 背景
    if(tex.lobby_bg||tex.bg_violet){const b=new PIXI.Sprite(tex.lobby_bg||tex.bg_violet);b.width=W;b.height=H;c.addChild(b);}
    else{const g=new PIXI.Graphics();g.beginFill(0x2a1050);g.drawRect(0,0,W,H);g.endFill();c.addChild(g);}
    if(tex.bg_elements){const e=new PIXI.Sprite(tex.bg_elements);e.width=W;e.height=H;e.alpha=0.2;c.addChild(e);}

    // 標題 LOBBY
    const title=mkText('LOBBY',{fontSize:48,fill:'#fff',stroke:'#000',strokeThickness:4});title.x=W/2;title.y=55;c.addChild(title);

    // 返回按鈕（左上）
    const backBg=new PIXI.Graphics();backBg.beginFill(0xcc2222);backBg.drawRoundedRect(0,0,70,55,10);backBg.endFill();
    const backC=new PIXI.Container();backC.x=25;backC.y=20;backC.addChild(backBg);
    const backT=mkText('◀',{fontSize:30,fill:'#fff'});backT.x=35;backT.y=28;backC.addChild(backT);
    backC.eventMode='static';backC.cursor='pointer';backC.on('pointerdown',()=>{playSound('button');showScreen('menu');});
    c.addChild(backC);

    // 桌卡容器
    const cardArea=new PIXI.Container();cardArea.x=W/2;cardArea.y=H/2+20;c.addChild(cardArea);
    c._cardArea=cardArea;

    // 左右箭頭
    c.addChild(mkBtn('lobby_left',80,H/2+20,0.6,()=>{lobbyIndex=(lobbyIndex-1+LOBBY_TABLES.length)%LOBBY_TABLES.length;updateLobbyCard();}));
    c.addChild(mkBtn('lobby_right',W-80,H/2+20,0.6,()=>{lobbyIndex=(lobbyIndex+1)%LOBBY_TABLES.length;updateLobbyCard();}));

    // 底部資訊列
    const botBar=new PIXI.Container();botBar.y=H-60;c.addChild(botBar);
    const barBg=new PIXI.Graphics();barBg.beginFill(0x002020,0.9);barBg.drawRect(0,-10,W,75);barBg.endFill();botBar.addChild(barBg);
    // 頭像
    if(tex.default_avatar){const av=new PIXI.Sprite(tex.default_avatar);av.anchor.set(0.5);av.x=50;av.y=25;av.scale.set(0.25);botBar.addChild(av);}
    const bName=mkText('PLAYER',{fontSize:14,fill:'#fff'});bName.anchor.set(0,0.5);bName.x=75;bName.y=15;botBar.addChild(bName);
    const bLvl=mkText('1 LEVEL',{fontSize:11,fill:'#ffd700'});bLvl.anchor.set(0,0.5);bLvl.x=75;bLvl.y=35;botBar.addChild(bLvl);
    if(tex.icon_coin){const ic=new PIXI.Sprite(tex.icon_coin);ic.anchor.set(0.5);ic.x=220;ic.y=25;ic.width=28;ic.height=28;botBar.addChild(ic);}
    botBar.addChild(Object.assign(mkText('10,000',{fontSize:16,fill:'#fff'}),{x:280,y:25}));
    if(tex.icon_chip){const ic=new PIXI.Sprite(tex.icon_chip);ic.anchor.set(0.5);ic.x=370;ic.y=25;ic.width=28;ic.height=28;botBar.addChild(ic);}
    botBar.addChild(Object.assign(mkText('500',{fontSize:16,fill:'#fff'}),{x:420,y:25}));
    // SHOP / LOBBY / SETTING
    if(tex.lobby_btn_shop)botBar.addChild(mkBtn('lobby_btn_shop',W-300,25,0.5,()=>{}));
    if(tex.lobby_btn_lobby)botBar.addChild(mkBtn('lobby_btn_lobby',W-180,25,0.5,()=>{}));
    if(tex.lobby_btn_setting)botBar.addChild(mkBtn('lobby_btn_setting',W-60,25,0.5,()=>{}));

    updateLobbyCard();
}

function updateLobbyCard(){
    const area=screens.lobby._cardArea;area.removeChildren();
    const t=LOBBY_TABLES[lobbyIndex];

    // Window frame
    if(tex.lobby_window){const w=new PIXI.Sprite(tex.lobby_window);w.anchor.set(0.5);w.scale.set(0.55);area.addChild(w);}
    else{const bg=new PIXI.Graphics();bg.lineStyle(4,0xff8800);bg.beginFill(0xd0a0e0,0.9);bg.drawRoundedRect(-300,-220,600,440,16);bg.endFill();area.addChild(bg);}

    // 牌桌
    const tableKey=`lobby_table_${t.color}`;
    if(tex[tableKey]){const tb=new PIXI.Sprite(tex[tableKey]);tb.anchor.set(0.5);tb.y=-30;tb.scale.set(0.3);area.addChild(tb);}

    // 荷官
    if(tex.lobby_dealer){const d=new PIXI.Sprite(tex.lobby_dealer);d.anchor.set(0.5,1);d.y=-95;d.scale.set(0.12);area.addChild(d);}

    // 玩家頭像列
    for(let i=0;i<t.players.length;i++){
        const px=-120+i*60,py=10;
        if(tex.lobby_avatar){const av=new PIXI.Sprite(tex.lobby_avatar);av.anchor.set(0.5);av.x=px;av.y=py;av.scale.set(0.22);area.addChild(av);}
        const nt=mkText(t.players[i],{fontSize:10,fill:'#fff'});nt.x=px;nt.y=py+30;area.addChild(nt);
    }

    // 籌碼裝飾
    const chipKeys=['chip_100','chip_50','chip_25','chip_500','chip_1000'];
    for(let i=0;i<6;i++){
        const ck=chipKeys[i%chipKeys.length];
        if(tex[ck]){const cs=new PIXI.Sprite(tex[ck]);cs.anchor.set(0.5);cs.width=24;cs.height=24;cs.x=-150+Math.random()*300;cs.y=55+Math.random()*30;area.addChild(cs);}
    }

    // 桌名
    const tn=mkText(t.name+' ('+t.blinds+')',{fontSize:16,fill:'#fff'});tn.y=-175;area.addChild(tn);

    // WATCH / PLAY 按鈕
    area.addChild(mkBtn('lobby_watch',-80,145,0.55,()=>{}));
    area.addChild(mkBtn('lobby_play',80,145,0.55,()=>{playSound('button');showScreen('game');startGame();}));
}

// ============================================================
// 3. 遊戲畫面
// ============================================================
function buildGameScreen(){
    const c=new PIXI.Container();c.visible=false;app.stage.addChild(c);screens.game=c;

    // 紫色背景
    if(tex.bg_violet){const b=new PIXI.Sprite(tex.bg_violet);b.width=W;b.height=H;c.addChild(b);}
    else{const g=new PIXI.Graphics();g.beginFill(0x2a1050);g.drawRect(0,0,W,H);g.endFill();c.addChild(g);}

    // 牌桌
    if(tex.table){const t=new PIXI.Sprite(tex.table);t.anchor.set(0.5);t.x=W/2;t.y=H/2+10;t.scale.set(0.56);c.addChild(t);}

    // 荷官（anchor 設在中間偏下，讓臉部完整顯示在畫布內）
    if(tex.dealer_game){const d=new PIXI.Sprite(tex.dealer_game);d.anchor.set(0.5,0.35);d.x=W/2;d.y=48;d.scale.set(0.18);c.addChild(d);}

    // 底池
    const potC=new PIXI.Container();potC.x=W/2;potC.y=H/2-40;c.addChild(potC);
    const potBg=new PIXI.Graphics();potBg.lineStyle(2,0x8b4513);potBg.beginFill(0xfff8ee,0.95);potBg.drawRoundedRect(-110,-22,220,44,8);potBg.endFill();potC.addChild(potBg);
    const potL=mkText('$',{fontSize:22,fill:'#000'});potL.anchor.set(1,0.5);potL.x=-65;potC.addChild(potL);
    potText=mkText('0',{fontSize:24,fill:'#000'});potText.anchor.set(0,0.5);potText.x=-52;potC.addChild(potText);

    // 公共牌（更大，有棕色邊框）
    communityUI=[];
    for(let i=0;i<5;i++){
        const slot=new PIXI.Container();slot.x=W/2-170+i*85;slot.y=H/2+25;c.addChild(slot);
        const ph=new PIXI.Graphics();ph.lineStyle(3,0x8b4513,0.6);ph.beginFill(0x3a6a3a,0.25);ph.drawRoundedRect(-30,-42,60,84,5);ph.endFill();
        slot.addChild(ph);communityUI.push({container:slot,placeholder:ph,cardSprite:null});
    }

    // 計時器（先加入，z-order 較低）
    const timerC=new PIXI.Container();timerC.x=W/2;timerC.y=H/2+75;timerC.visible=false;c.addChild(timerC);
    timerText=mkText('TIME LEFT: 30 SEC',{fontSize:22,fill:'#fff',stroke:'#000',strokeThickness:3});timerC.addChild(timerText);
    const tBg=new PIXI.Graphics();tBg.beginFill(0x003333);tBg.drawRoundedRect(-150,18,300,14,7);tBg.endFill();timerC.addChild(tBg);
    timerBar=new PIXI.Graphics();timerC.addChild(timerBar);
    c._timerC=timerC;

    // 訊息
    msgC=new PIXI.Container();msgC.x=W/2;msgC.y=H/2+75;msgC.visible=false;c.addChild(msgC);
    msgC._bg=new PIXI.Graphics();msgC.addChild(msgC._bg);
    msgT=mkText('',{fontSize:22,fill:'#fff',stroke:'#000',strokeThickness:3});msgC.addChild(msgT);

    // 座位（後加入，z-order 較高，手牌不被計時器遮住）
    seatUI=[];for(let i=0;i<9;i++){const s=buildSeat(i);c.addChild(s.container);seatUI.push(s);}

    // 頂部
    buildGameTopBar(c);
    // 底部操作列
    buildActionBar(c);
}

function buildSeat(i){
    const c=new PIXI.Container();c.x=SEAT_POS[i].x;c.y=SEAT_POS[i].y;
    const isMe=i===0;
    const sc=isMe?0.5:0.42;

    // 高亮光圈（最底層）
    const glow=new PIXI.Graphics();glow.lineStyle(4,0xffd700,0.9);
    glow.drawCircle(0,0,isMe?46:38);glow.visible=false;c.addChild(glow);

    // 籌碼堆裝飾（多個不同顏色籌碼疊高）
    const chipStackC=new PIXI.Container();
    const csDir=isMe?{x:-75,y:-40}:i<=2?{x:70,y:8}:i<=5?{x:-45,y:55}:i<=7?{x:-70,y:8}:{x:-70,y:8};
    chipStackC.x=csDir.x;chipStackC.y=csDir.y;
    const chipTypes=['chip_5000','chip_1000','chip_500','chip_100','chip_50','chip_25'];
    for(let ci=0;ci<4;ci++){
        const ck=chipTypes[ci%chipTypes.length];
        if(tex[ck]){const cs=new PIXI.Sprite(tex[ck]);cs.anchor.set(0.5);cs.width=26;cs.height=26;cs.x=ci*12-15;cs.y=-ci*5;chipStackC.addChild(cs);}
    }
    c.addChild(chipStackC);

    // 頭像框（大金色圓框）
    const avatarC=new PIXI.Container();
    if(tex.avatar_frame){const f=new PIXI.Sprite(tex.avatar_frame);f.anchor.set(0.5);f.scale.set(sc);avatarC.addChild(f);}
    if(tex.default_avatar){const a=new PIXI.Sprite(tex.default_avatar);a.anchor.set(0.5);a.scale.set(sc*0.6);a.y=-3;avatarC.addChild(a);}
    c.addChild(avatarC);

    // 名字（頭像下方，大字直接顯示）
    const nameT=mkText('',{fontSize:isMe?16:14,fill:'#fff',fontWeight:'900',stroke:'#000',strokeThickness:2});
    nameT.y=isMe?42:35;c.addChild(nameT);

    // 金額（名字下方，金邊面板）
    const moneyC=new PIXI.Container();moneyC.y=isMe?62:54;
    const mBg=new PIXI.Graphics();mBg.lineStyle(2,0xc8a82e);mBg.beginFill(0x1a1500,0.85);
    mBg.drawRoundedRect(-58,-13,116,26,13);mBg.endFill();moneyC.addChild(mBg);
    const chipsT=mkText('',{fontSize:14,fill:'#ffd700'});moneyC.addChild(chipsT);
    c.addChild(moneyC);

    // 莊家標記
    const dc=new PIXI.Container();dc.x=isMe?40:-35;dc.y=-25;dc.visible=false;
    const dcBg=new PIXI.Graphics();dcBg.beginFill(0xffffff);dcBg.drawCircle(0,0,13);dcBg.endFill();
    dcBg.lineStyle(2,0x333);dcBg.drawCircle(0,0,13);dc.addChild(dcBg);
    dc.addChild(Object.assign(mkText('D',{fontSize:13,fill:'#333'}),{x:0,y:0}));
    c.addChild(dc);

    // 手牌容器
    const cardsC=new PIXI.Container();
    if(isMe){cardsC.y=-85;}        // 底部玩家：牌在上方
    else if(i<=2){cardsC.x=70;cardsC.y=-25;}   // 左側：牌在右邊
    else if(i<=5){cardsC.y=65;}                  // 上方：牌在下方
    else{cardsC.x=-70;cardsC.y=-25;}             // 右側：牌在左邊
    c.addChild(cardsC);

    // 下注顯示
    const betC=new PIXI.Container();betC.x=BET_OFFSET[i].x;betC.y=BET_OFFSET[i].y;betC.visible=false;c.addChild(betC);

    return{container:c,nameT,chipsT,dc,cardsC,betC,glow,cardSprites:[]};
}

function buildGameTopBar(parent){
    // 頂右
    if(tex.btn_pause)parent.addChild(mkBtn('btn_pause',W-35,30,0.45,()=>pauseGame()));
    if(tex.btn_shop_game)parent.addChild(mkBtn('btn_shop_game',W-100,30,0.45,()=>{}));
    if(tex.btn_lobby_game)parent.addChild(mkBtn('btn_lobby_game',W-170,30,0.45,()=>backToMenu()));

    // 頂左
    const topL=new PIXI.Container();topL.x=15;topL.y=10;parent.addChild(topL);
    const cb=new PIXI.Graphics();cb.lineStyle(2,0xc8a82e);cb.beginFill(0x1a1500,0.9);cb.drawRoundedRect(0,0,160,32,16);cb.endFill();topL.addChild(cb);
    if(tex.icon_coin){const ic=new PIXI.Sprite(tex.icon_coin);ic.anchor.set(0.5);ic.x=20;ic.y=16;ic.width=24;ic.height=24;topL.addChild(ic);}
    topBarTexts.money=mkText('10,000',{fontSize:14,fill:'#ffd700'});topBarTexts.money.anchor.set(0,0.5);topBarTexts.money.x=36;topBarTexts.money.y=16;topL.addChild(topBarTexts.money);
    const cb2=new PIXI.Graphics();cb2.lineStyle(2,0xc8a82e);cb2.beginFill(0x1a1500,0.9);cb2.drawRoundedRect(170,0,110,32,16);cb2.endFill();topL.addChild(cb2);
    if(tex.icon_chip){const ic=new PIXI.Sprite(tex.icon_chip);ic.anchor.set(0.5);ic.x=190;ic.y=16;ic.width=24;ic.height=24;topL.addChild(ic);}
    topBarTexts.chips=mkText('500',{fontSize:14,fill:'#ffd700'});topBarTexts.chips.anchor.set(0,0.5);topBarTexts.chips.x=206;topBarTexts.chips.y=16;topL.addChild(topBarTexts.chips);
}

function buildActionBar(parent){
    actionBar=new PIXI.Container();actionBar.y=H-65;actionBar.visible=false;parent.addChild(actionBar);
    const bar=new PIXI.Graphics();bar.beginFill(0x004040,0.95);bar.drawRect(0,-10,W,80);bar.endFill();bar.lineStyle(2,0x00cccc,0.3);bar.moveTo(0,-10);bar.lineTo(W,-10);actionBar.addChild(bar);

    // 左側金幣
    const li=new PIXI.Container();li.x=20;li.y=25;actionBar.addChild(li);
    const mb=new PIXI.Graphics();mb.lineStyle(1,0xc8a82e);mb.beginFill(0x1a2a1a,0.9);mb.drawRoundedRect(0,-16,145,32,16);mb.endFill();li.addChild(mb);
    if(tex.icon_coin){const ic=new PIXI.Sprite(tex.icon_coin);ic.anchor.set(0.5);ic.x=20;ic.y=0;ic.width=26;ic.height=26;li.addChild(ic);}
    actionBar._moneyText=mkText('10,000',{fontSize:15,fill:'#ffd700'});actionBar._moneyText.anchor.set(0,0.5);actionBar._moneyText.x=36;actionBar._moneyText.y=0;li.addChild(actionBar._moneyText);
    const cb=new PIXI.Graphics();cb.lineStyle(1,0xc8a82e);cb.beginFill(0x2a1a1a,0.9);cb.drawRoundedRect(155,-16,95,32,16);cb.endFill();li.addChild(cb);
    if(tex.icon_chip){const ic=new PIXI.Sprite(tex.icon_chip);ic.anchor.set(0.5);ic.x=175;ic.y=0;ic.width=26;ic.height=26;li.addChild(ic);}
    actionBar._chipText=mkText('500',{fontSize:15,fill:'#ffd700'});actionBar._chipText.anchor.set(0,0.5);actionBar._chipText.x=191;actionBar._chipText.y=0;li.addChild(actionBar._chipText);

    // 按鈕
    const bx=[{k:'fold',t:'btn_fold',x:420},{k:'checkfold',t:'btn_check_fold',x:555},{k:'check',t:'btn_check',x:690},{k:'call',t:'btn_call',x:825},{k:'raise',t:'btn_raise',x:960}];
    actionBar._buttons={};
    for(const b of bx){
        const s=new PIXI.Sprite(tex[b.t]||PIXI.Texture.WHITE);s.anchor.set(0.5);s.x=b.x;s.y=25;s.scale.set(0.52);
        s.eventMode='static';s.cursor='pointer';s.on('pointerdown',()=>onAction(b.k));
        s.on('pointerover',()=>s.scale.set(0.57));s.on('pointerout',()=>s.scale.set(0.52));
        actionBar.addChild(s);actionBar._buttons[b.k]=s;
    }
    actionBar._callText=mkText('',{fontSize:11,fill:'#fff'});actionBar._callText.x=825;actionBar._callText.y=50;actionBar.addChild(actionBar._callText);

    // Raise slider
    raisePanel=new PIXI.Container();raisePanel.y=H-130;raisePanel.visible=false;parent.addChild(raisePanel);
    const rbg=new PIXI.Graphics();rbg.beginFill(0,0.85);rbg.drawRoundedRect(W/2-200,-20,400,50,10);rbg.endFill();raisePanel.addChild(rbg);
    const trk=new PIXI.Graphics();trk.beginFill(0x444);trk.drawRoundedRect(W/2-160,-4,200,8,4);trk.endFill();raisePanel.addChild(trk);
    raisePanel._fill=new PIXI.Graphics();raisePanel.addChild(raisePanel._fill);
    const hdl=new PIXI.Graphics();hdl.beginFill(0xffd700);hdl.drawCircle(0,0,10);hdl.endFill();hdl.x=W/2-160;hdl.eventMode='static';hdl.cursor='grab';raisePanel.addChild(hdl);raisePanel._handle=hdl;
    let drag=false;hdl.on('pointerdown',()=>{drag=true;});app.stage.eventMode='static';
    app.stage.on('pointermove',e=>{if(!drag)return;const l=raisePanel.toLocal(e.global);hdl.x=Math.max(W/2-160,Math.min(W/2+40,l.x));updateRV();});
    app.stage.on('pointerup',()=>{drag=false;});
    raisePanel._vt=mkText('$0',{fontSize:20,fill:'#ffd700'});raisePanel._vt.x=W/2+90;raisePanel._vt.y=-6;raisePanel.addChild(raisePanel._vt);
    const okC=new PIXI.Container();okC.x=W/2+150;okC.eventMode='static';okC.cursor='pointer';
    const okBg=new PIXI.Graphics();okBg.beginFill(0x558b2f);okBg.drawRoundedRect(-30,-14,60,28,6);okBg.endFill();okC.addChild(okBg);
    okC.addChild(Object.assign(mkText('OK',{fontSize:13,fill:'#fff'}),{x:0,y:0}));
    okC.on('pointerdown',()=>confirmRaise());raisePanel.addChild(okC);
    const cx=mkText('✕',{fontSize:18,fill:'#aaa'});cx.x=W/2+185;cx.eventMode='static';cx.cursor='pointer';cx.on('pointerdown',()=>{raisePanel.visible=false;});raisePanel.addChild(cx);
    raisePanel._min=0;raisePanel._max=10000;
}
function updateRV(){const mn=W/2-160,mx=W/2+40,t=(raisePanel._handle.x-mn)/(mx-mn),v=Math.round((raisePanel._min+t*(raisePanel._max-raisePanel._min))/BIG_BLIND)*BIG_BLIND;raisePanel._cv=Math.max(raisePanel._min,Math.min(raisePanel._max,v));raisePanel._vt.text='$'+raisePanel._cv.toLocaleString();raisePanel._fill.clear();raisePanel._fill.beginFill(0xffd700,.6);raisePanel._fill.drawRoundedRect(mn,-4,raisePanel._handle.x-mn,8,4);raisePanel._fill.endFill();}

// 結果/暫停
function buildResultOverlay(){
    screens.result=new PIXI.Container();screens.result.visible=false;app.stage.addChild(screens.result);
    const ov=new PIXI.Graphics();ov.beginFill(0,0.7);ov.drawRect(0,0,W,H);ov.endFill();ov.eventMode='static';screens.result.addChild(ov);
    const pb=new PIXI.Graphics();pb.beginFill(0x2a5a2a,.95);pb.drawRoundedRect(W/2-200,H/2-140,400,310,16);pb.endFill();pb.lineStyle(3,0xffd700,.5);pb.drawRoundedRect(W/2-200,H/2-140,400,310,16);screens.result.addChild(pb);
    screens.result._ts=new PIXI.Sprite();screens.result._ts.anchor.set(0.5);screens.result._ts.x=W/2;screens.result._ts.y=H/2-80;screens.result._ts.scale.set(0.45);screens.result.addChild(screens.result._ts);
    screens.result._ht=mkText('',{fontSize:24,fill:'#fff'});screens.result._ht.x=W/2;screens.result._ht.y=H/2-10;screens.result.addChild(screens.result._ht);
    screens.result._at=mkText('',{fontSize:36,fill:'#ffd700'});screens.result._at.x=W/2;screens.result._at.y=H/2+40;screens.result.addChild(screens.result._at);
    screens.result.addChild(mkBtn('btn_ok',W/2,H/2+110,0.6,()=>nextRound()));
}
function buildPauseOverlay(){
    screens.pause=new PIXI.Container();screens.pause.visible=false;app.stage.addChild(screens.pause);
    const ov=new PIXI.Graphics();ov.beginFill(0,0.7);ov.drawRect(0,0,W,H);ov.endFill();ov.eventMode='static';screens.pause.addChild(ov);
    const pb=new PIXI.Graphics();pb.beginFill(0x1a3a5a,.95);pb.drawRoundedRect(W/2-150,H/2-100,300,200,16);pb.endFill();screens.pause.addChild(pb);
    screens.pause.addChild(Object.assign(mkText('GAME PAUSED',{fontSize:26,fill:'#ffd700'}),{x:W/2,y:H/2-50}));
    screens.pause.addChild(mkBtn('btn_resume',W/2,H/2+10,0.55,()=>resumeGame()));
    screens.pause.addChild(mkBtn('btn_lobby_pause',W/2,H/2+65,0.55,()=>backToMenu()));
}

// 切換
function showScreen(name){for(const k in screens)screens[k].visible=(k===name);}

// ============================================================
// 遊戲邏輯（全部沿用）
// ============================================================
function createDeck(){const d=[];for(const s of SUITS)for(const r of RANKS)d.push({suit:s,rank:r});return d;}
function shuffleDeck(d){for(let i=d.length-1;i>0;i--){const j=0|Math.random()*(i+1);[d[i],d[j]]=[d[j],d[i]];}return d;}
function initPlayers(){const p=[{id:0,name:'YOU',chips:STARTING_CHIPS,hand:[],bet:0,totalBet:0,folded:false,allIn:false,isHuman:true,isActive:true}];for(let i=1;i<=8;i++)p.push({id:i,name:AI_NAMES[i-1],chips:STARTING_CHIPS,hand:[],bet:0,totalBet:0,folded:false,allIn:false,isHuman:false,isActive:true});return p;}

function startGame(){gameState.players=initPlayers();gameState.dealerIndex=0|Math.random()*9;startNewRound();}
function startNewRound(){const gs=gameState;gs.deck=shuffleDeck(createDeck());gs.communityCards=[];gs.pot=0;gs.currentBet=0;gs.minRaise=BIG_BLIND;gs.phase='preflop';gs.actedThisRound=new Set();gs.lastRaiserIndex=-1;gs.isRunning=true;gs.actionLock=false;for(const p of gs.players){p.hand=[];p.bet=0;p.totalBet=0;p.folded=false;p.allIn=false;p.isActive=p.chips>0;}gs.dealerIndex=nextAP(gs.dealerIndex);clearUI();updateSeats();showDealer();const sb=nextAP(gs.dealerIndex),bb=nextAP(sb);bet(sb,Math.min(SMALL_BLIND,gs.players[sb].chips));bet(bb,Math.min(BIG_BLIND,gs.players[bb].chips));gs.currentBet=BIG_BLIND;playSound('chip');updatePot();updateBets();dealCards().then(()=>{gs.currentPlayerIndex=nextAP(bb);schedule(300);});}

async function dealCards(){const gs=gameState;for(let cn=0;cn<2;cn++)for(let i=0;i<9;i++){const pi=(gs.dealerIndex+1+i)%9,p=gs.players[pi];if(!p.isActive)continue;const card=gs.deck.pop();p.hand.push(card);const s=seatUI[pi];
    // 玩家超大牌正面、AI 用紅色牌背且有角度
    const tk=pi===0?`card_${card.suit}_${card.rank}`:'card_back_red';
    const sp=new PIXI.Sprite(tex[tk]||tex.card_back);sp.anchor.set(0.5);
    const cw=pi===0?90:46,ch=pi===0?130:66;sp.width=cw;sp.height=ch;
    const idx=s.cardSprites.length;
    const ox=pi===0?(idx-0.5)*(cw+8):(idx-0.5)*(cw-6);
    const rot=pi===0?0:(idx===0?-0.18:0.18);
    const sx=W/2-s.container.x-s.cardsC.x,sy=-s.container.y-s.cardsC.y;
    sp.x=sx;sp.y=sy;sp.alpha=0;sp.rotation=0;
    s.cardsC.addChild(sp);s.cardSprites.push(sp);
    tweenTo(sp,{x:ox,y:0,alpha:1,rotation:rot},280,'easeOut');
    playSound('card-deal');await sleep(50);}}

async function revealCC(n){const gs=gameState;gs.deck.pop();for(let i=0;i<n;i++){const card=gs.deck.pop();gs.communityCards.push(card);const si=gs.communityCards.length-1,slot=communityUI[si];slot.placeholder.visible=false;const sp=new PIXI.Sprite(tex[`card_${card.suit}_${card.rank}`]);sp.anchor.set(0.5);sp.width=60;sp.height=84;sp.scale.x=0;slot.container.addChild(sp);slot.cardSprite=sp;playSound('card-flip');await tweenTo(sp.scale,{x:sp.scale.y/(72/52)},250,'easeOut');await sleep(80);}}

function showdown(){const gs=gameState;collectBets();const cont=gs.players.filter(p=>p.isActive&&!p.folded);for(const p of cont)if(!p.isHuman){const s=seatUI[p.id];s.cardsC.removeChildren();s.cardSprites=[];for(let i=0;i<p.hand.length;i++){const sp=new PIXI.Sprite(tex[`card_${p.hand[i].suit}_${p.hand[i].rank}`]);sp.anchor.set(0.5);sp.width=46;sp.height=66;sp.x=(i-0.5)*48;s.cardsC.addChild(sp);s.cardSprites.push(sp);}}playSound('card-flip');let bs=-1,wi=-1,wn='';for(const p of cont){const r=evalHand([...p.hand,...gs.communityCards]);if(r.score>bs){bs=r.score;wi=p.id;wn=r.name;}}setTimeout(()=>endRound(wi,wn),1500);}

function endRound(wi,hn=''){const gs=gameState;gs.isRunning=false;gs.actionLock=false;clearTimer();hideAB();gs.players[wi].chips+=gs.pot;seatUI[wi].glow.visible=true;updateSeats();playSound(wi===0?'win':'lose');screens.result._ts.texture=tex[wi===0?'win_title':'lose_title'];screens.result._ht.text=hn;screens.result._at.text='$'+gs.pot.toLocaleString();screens.result.visible=true;}
function nextRound(){playSound('button');screens.result.visible=false;if(gameState.players[0].chips<=0){backToMenu();return;}startNewRound();}

// 操作
function onAction(a){const gs=gameState;if(!gs.isRunning||gs.isPaused||gs.actionLock||gs.currentPlayerIndex!==0)return;if(a==='raise'){const p=gs.players[0];raisePanel._min=gs.currentBet+gs.minRaise;raisePanel._max=p.chips+p.bet;raisePanel._handle.x=W/2-160;raisePanel._cv=raisePanel._min;updateRV();raisePanel.visible=true;playSound('button');return;}gs.actionLock=true;clearTimer();hideAB();const p=gs.players[0];if(a==='fold'){p.folded=true;playSound('fold');seatUI[0].container.alpha=0.4;}else if(a==='check'||a==='checkfold')playSound('check');else if(a==='call'){bet(0,Math.min(gs.currentBet-p.bet,p.chips));playSound('chip');}gs.actedThisRound.add(0);updateBets();updateSeats();gs.currentPlayerIndex=nextAP(0);gs.actionLock=false;schedule(300);}
function confirmRaise(){const gs=gameState;if(gs.actionLock)return;gs.actionLock=true;const p=gs.players[0],tot=raisePanel._cv,nd=tot-p.bet;if(nd>=p.chips){bet(0,p.chips);p.allIn=true;playSound('allin');}else{bet(0,nd);playSound('chip');}gs.minRaise=Math.max(tot-gs.currentBet,BIG_BLIND);gs.currentBet=Math.max(tot,gs.currentBet);gs.lastRaiserIndex=0;gs.actedThisRound=new Set([0]);raisePanel.visible=false;hideAB();clearTimer();updateBets();updateSeats();gs.currentPlayerIndex=nextAP(0);gs.actionLock=false;schedule(300);}

function showAB(){const gs=gameState,p=gs.players[0],ca=gs.currentBet-p.bet;actionBar._buttons.check.visible=ca<=0;actionBar._buttons.checkfold.visible=ca<=0;actionBar._buttons.call.visible=ca>0;actionBar._callText.text=ca>0?'$'+ca.toLocaleString():'';actionBar._callText.visible=ca>0;actionBar._moneyText.text=p.chips.toLocaleString();actionBar.visible=true;}
function hideAB(){actionBar.visible=false;raisePanel.visible=false;}

function schedule(d){setTimeout(()=>{if(gameState.isRunning&&!gameState.isPaused)process();},d);}
function process(){const gs=gameState;if(!gs.isRunning||gs.isPaused)return;const ap=gs.players.filter(p=>p.isActive&&!p.folded);if(ap.length===1){endRound(ap[0].id);return;}if(roundDone()){nextPhase();return;}const p=gs.players[gs.currentPlayerIndex];if(!p.isActive||p.folded||p.allIn){gs.currentPlayerIndex=nextAP(gs.currentPlayerIndex);process();return;}setGlow(gs.currentPlayerIndex);if(p.isHuman){showAB();startTimer();playSound('turn-alert');}else{const ai=gs.currentPlayerIndex;setTimeout(()=>{if(gs.isRunning&&!gs.isPaused&&gs.currentPlayerIndex===ai)aiAction(ai);},600+Math.random()*800);}}
function roundDone(){const gs=gameState,ca=gs.players.filter(p=>p.isActive&&!p.folded&&!p.allIn);if(!ca.length)return true;for(const p of ca){if(!gs.actedThisRound.has(p.id)||p.bet<gs.currentBet)return false;}return true;}
function nextPhase(){const gs=gameState;collectBets();gs.actedThisRound=new Set();gs.lastRaiserIndex=-1;gs.currentBet=0;for(const p of gs.players)p.bet=0;updateBets();const ca=gs.players.filter(p=>p.isActive&&!p.folded&&!p.allIn);const adv=()=>{if(ca.length<=1){if(gs.phase==='river'||gs.phase==='showdown'){gs.phase='showdown';showdown();}else nextPhase();}else{gs.currentPlayerIndex=firstAP();schedule(300);}};if(gs.phase==='preflop'){gs.phase='flop';revealCC(3).then(adv);}else if(gs.phase==='flop'){gs.phase='turn';revealCC(1).then(adv);}else if(gs.phase==='turn'){gs.phase='river';revealCC(1).then(adv);}else{gs.phase='showdown';showdown();}}

// AI
function aiAction(pi){const gs=gameState,p=gs.players[pi];if(!gs.isRunning||p.folded||!p.isActive||p.allIn){gs.currentPlayerIndex=nextAP(pi);schedule(200);return;}const ca=gs.currentBet-p.bet,hs=evalHS(p.hand,gs.communityCards),po=ca>0?ca/(gs.pot+ca):0,r=Math.random();let act='fold',ra=0;if(hs>.85){act=r<.3?'allin':'raise';ra=Math.min(gs.pot*2,p.chips+p.bet);}else if(hs>.65){if(r<.4){act='raise';ra=Math.min(gs.currentBet+gs.minRaise*2,p.chips+p.bet);}else act=ca>0?'call':'check';}else if(hs>.45){if(ca===0){act=r<.25?'raise':'check';ra=gs.currentBet+gs.minRaise;}else act=po<.3?'call':(r<.3?'call':'fold');}else if(hs>.25){if(ca===0){act=r<.12?'raise':'check';ra=gs.currentBet+gs.minRaise;}else act=(ca<=BIG_BLIND*2&&r<.25)?'call':'fold';}else{act=ca===0?'check':(r<.06?'raise':'fold');ra=gs.currentBet+gs.minRaise;}if(act==='raise'){ra=Math.max(ra,gs.currentBet+gs.minRaise);ra=Math.min(ra,p.chips+p.bet);}execAI(pi,act,ra);}
function execAI(pi,act,ra){const gs=gameState,p=gs.players[pi];switch(act){case'fold':p.folded=true;seatUI[pi].container.alpha=0.4;showMsg(p.name+' FOLD');playSound('fold');break;case'check':showMsg(p.name+' CHECK');playSound('check');break;case'call':{const c=Math.min(gs.currentBet-p.bet,p.chips);if(c>=p.chips){bet(pi,p.chips);p.allIn=true;showMsg(p.name+' ALL-IN!');playSound('allin');}else{bet(pi,c);showMsg(p.name+' CALL $'+c.toLocaleString());playSound('chip');}break;}case'raise':{const nd=ra-p.bet;if(nd>=p.chips){bet(pi,p.chips);p.allIn=true;showMsg(p.name+' ALL-IN!');playSound('allin');}else{bet(pi,nd);const old=gs.currentBet;gs.currentBet=ra;gs.minRaise=Math.max(ra-old,BIG_BLIND);gs.lastRaiserIndex=pi;gs.actedThisRound=new Set([pi]);showMsg(p.name+' RAISE $'+ra.toLocaleString());playSound('chip');}break;}case'allin':{bet(pi,p.chips);p.allIn=true;if(p.bet>gs.currentBet){const old=gs.currentBet;gs.currentBet=p.bet;gs.minRaise=Math.max(p.bet-old,BIG_BLIND);gs.lastRaiserIndex=pi;gs.actedThisRound=new Set([pi]);}showMsg(p.name+' ALL-IN!');playSound('allin');break;}}gs.actedThisRound.add(p.id);updateBets();updateSeats();gs.currentPlayerIndex=nextAP(pi);schedule(500);}

// 牌型
function evalHS(h,cc){return cc.length?Math.min(evalHand([...h,...cc]).score/5e6,1):pfStr(h);}
function pfStr(h){const r1=RANKS.indexOf(h[0].rank),r2=RANKS.indexOf(h[1].rank),hi=Math.max(r1,r2),lo=Math.min(r1,r2);let s=(hi+lo)/24;if(r1===r2)s+=.3+(hi/12)*.3;if(h[0].suit===h[1].suit)s+=.08;if(Math.abs(r1-r2)===1)s+=.06;if(hi>=10)s+=.1;if(hi===12)s+=.1;return Math.min(s,1);}
function evalHand(cards){const c=combo(cards,5);let bs=0,bn='High Card';for(const co of c){const r=eval5(co);if(r.score>bs){bs=r.score;bn=r.name;}}return{score:bs,name:bn};}
function eval5(cards){const rk=cards.map(c=>RANKS.indexOf(c.rank)).sort((a,b)=>b-a),su=cards.map(c=>c.suit),fl=su.every(s=>s===su[0]),st=chkSt(rk),rc={};for(const r of rk)rc[r]=(rc[r]||0)+1;const ct=Object.entries(rc).map(([r,c])=>({rank:+r,count:c})).sort((a,b)=>b.count-a.count||b.rank-a.rank);if(fl&&st&&rk[0]===12&&rk[4]===8)return{score:9e6,name:'Royal Flush'};if(fl&&st)return{score:8e6+rk[0],name:'Straight Flush'};if(ct[0].count===4)return{score:7e6+ct[0].rank*100+ct[1].rank,name:'Four of a Kind'};if(ct[0].count===3&&ct[1].count===2)return{score:6e6+ct[0].rank*100+ct[1].rank,name:'Full House'};if(fl)return{score:5e6+rk[0]*1e4+rk[1]*1e3+rk[2]*100+rk[3]*10+rk[4],name:'Flush'};if(st){const h=(rk[0]===12&&rk[1]===3)?3:rk[0];return{score:4e6+h,name:'Straight'};}if(ct[0].count===3)return{score:3e6+ct[0].rank*1e4+ct[1].rank*100+ct[2].rank,name:'Three of a Kind'};if(ct[0].count===2&&ct[1].count===2){const hp=Math.max(ct[0].rank,ct[1].rank),lp=Math.min(ct[0].rank,ct[1].rank);return{score:2e6+hp*1e4+lp*100+ct[2].rank,name:'Two Pair'};}if(ct[0].count===2)return{score:1e6+ct[0].rank*1e4+ct[1].rank*100+ct[2].rank*10+ct[3].rank,name:'One Pair'};return{score:rk[0]*1e4+rk[1]*1e3+rk[2]*100+rk[3]*10+rk[4],name:'High Card'};}
function chkSt(r){const s=[...new Set(r)].sort((a,b)=>b-a);if(s.length<5)return false;return(s[0]-s[4]===4&&s.length===5)||(s[0]===12&&s[1]===3&&s[2]===2&&s[3]===1&&s[4]===0);}
function combo(a,k){const r=[];(function c(s,co){if(co.length===k){r.push([...co]);return;}for(let i=s;i<a.length;i++){co.push(a[i]);c(i+1,co);co.pop();}})(0,[]);return r;}

// 工具
function bet(pi,a){const p=gameState.players[pi],v=Math.min(a,p.chips);p.chips-=v;p.bet+=v;p.totalBet+=v;gameState.pot+=v;}
function collectBets(){for(const p of gameState.players)p.bet=0;}
function nextAP(f){for(let i=1;i<=9;i++){const x=(f+i)%9;if(gameState.players[x].isActive&&!gameState.players[x].folded&&!gameState.players[x].allIn)return x;}for(let i=1;i<=9;i++){const x=(f+i)%9;if(gameState.players[x].isActive&&!gameState.players[x].folded)return x;}return f;}
function firstAP(){return nextAP(gameState.dealerIndex);}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

// 計時
function startTimer(){const gs=gameState;gs.turnTimeLeft=TURN_TIME;screens.game._timerC.visible=true;gs.turnTimer=setInterval(()=>{gs.turnTimeLeft-=0.1;const pct=Math.max(0,gs.turnTimeLeft/TURN_TIME);timerText.text='TIME LEFT: '+Math.ceil(gs.turnTimeLeft)+' SEC';timerBar.clear();timerBar.beginFill(pct>.3?0x00e5ff:0xff4444);timerBar.drawRoundedRect(-148,18,296*pct,10,5);timerBar.endFill();if(gs.turnTimeLeft<=0){clearTimer();if(gs.currentBet>gs.players[0].bet)onAction('fold');else onAction('check');}},100);}
function clearTimer(){if(gameState.turnTimer){clearInterval(gameState.turnTimer);gameState.turnTimer=null;}if(screens.game?._timerC)screens.game._timerC.visible=false;}

// UI
function clearUI(){for(const s of seatUI){s.cardsC.removeChildren();s.cardSprites=[];s.betC.visible=false;s.betC.removeChildren();s.glow.visible=false;s.container.alpha=1;}for(const c of communityUI){if(c.cardSprite){c.container.removeChild(c.cardSprite);c.cardSprite=null;}c.placeholder.visible=true;}hideAB();msgC.visible=false;}
function updateSeats(){for(let i=0;i<9;i++){const p=gameState.players[i],s=seatUI[i];s.nameT.text=p.name;s.chipsT.text='$'+p.chips.toLocaleString();if(!p.isActive)s.container.alpha=0.3;else if(p.folded)s.container.alpha=0.4;}topBarTexts.money.text=gameState.players[0].chips.toLocaleString();updatePot();}
function updatePot(){potText.text=gameState.pot.toLocaleString();}
function updateBets(){updatePot();for(let i=0;i<9;i++){const p=gameState.players[i],s=seatUI[i];s.betC.removeChildren();if(p.bet>0){s.betC.visible=true;const ck=chipKey(p.bet);if(tex[ck]){const c=new PIXI.Sprite(tex[ck]);c.anchor.set(0.5);c.width=30;c.height=30;c.x=-20;s.betC.addChild(c);}const t=mkText('$'+p.bet.toLocaleString(),{fontSize:14,fill:'#fff',stroke:'#000',strokeThickness:2});t.x=6;s.betC.addChild(t);}else s.betC.visible=false;}}
function chipKey(a){if(a>=10000)return'chip_10000';if(a>=5000)return'chip_5000';if(a>=1000)return'chip_1000';if(a>=500)return'chip_500';if(a>=100)return'chip_100';if(a>=50)return'chip_50';if(a>=25)return'chip_25';if(a>=10)return'chip_10';return'chip_1';}
function showDealer(){for(let i=0;i<9;i++)seatUI[i].dc.visible=(i===gameState.dealerIndex);}
function setGlow(i){for(let j=0;j<9;j++)seatUI[j].glow.visible=(j===i);}
function showMsg(t){msgT.text=t;msgC._bg.clear();const w=Math.max(200,msgT.width+60);msgC._bg.beginFill(0,.85);msgC._bg.drawRoundedRect(-w/2,-24,w,48,14);msgC._bg.endFill();msgC.visible=true;setTimeout(()=>{msgC.visible=false;},1000);}
function pauseGame(){gameState.isPaused=true;clearTimer();screens.pause.visible=true;playSound('button');}
function resumeGame(){gameState.isPaused=false;screens.pause.visible=false;playSound('button');if(gameState.isRunning&&gameState.currentPlayerIndex===0){showAB();startTimer();}else if(gameState.isRunning)schedule(300);}
function backToMenu(){gameState.isRunning=false;gameState.isPaused=false;clearTimer();screens.pause.visible=false;screens.result.visible=false;showScreen('menu');playSound('button');}

init();
