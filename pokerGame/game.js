// ============================================================
// 德州撲克九人遊戲 — PixiJS 直式手機版（PokerKing 風格）
// ============================================================

const W = 450, H = 950;
const SUITS = ['Hearts','Diamonds','Club','Spades'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const AI_NAMES = ['PANTHOR','ROSE','PETER','WILLIAM','ANTHONY','ANON','LISA','TIGER','SHADOW'];
const STARTING_CHIPS = 25658;
const SMALL_BLIND = 50, BIG_BLIND = 100, TURN_TIME = 30;

// 左4 右4 上1 + YOU底部 = 10人
const NUM_PLAYERS = 10;
const SEAT_POS = [
    {x:225, y:780},  // 0 YOU 底部（靠近牌桌）
    {x:62,  y:680},  // 1 左4（最下）
    {x:45,  y:540},  // 2 左3
    {x:45,  y:400},  // 3 左2
    {x:62,  y:265},  // 4 左1（最上）
    {x:225, y:150},  // 5 頂部
    {x:388, y:265},  // 6 右1（最上）
    {x:405, y:400},  // 7 右2
    {x:405, y:540},  // 8 右3
    {x:388, y:680},  // 9 右4（最下）
];

// 下注偏移（朝桌心方向）
const BET_OFFSET = [
    {x:0,   y:-40},   // 0 YOU
    {x:50,  y:-12},   // 1 左4
    {x:50,  y:0},     // 2 左3
    {x:50,  y:0},     // 3 左2
    {x:50,  y:12},    // 4 左1
    {x:0,   y:35},    // 5 頂部
    {x:-50, y:12},    // 6 右1
    {x:-50, y:0},     // 7 右2
    {x:-50, y:0},     // 8 右3
    {x:-50, y:-12},   // 9 右4
];

// ============================================================
// 音效
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
let gameState={deck:[],communityCards:[],players:[],pot:0,dealerIndex:0,currentPlayerIndex:0,phase:'preflop',currentBet:0,minRaise:BIG_BLIND,isRunning:false,isPaused:false,actionLock:false,turnTimer:null,turnTimeLeft:TURN_TIME,actedThisRound:new Set(),lastRaiserIndex:-1,handNumber:1};

// ============================================================
// PixiJS 全域
// ============================================================
let app,tex={};
let screens={};
let seatUI=[],communityUI=[];
let potText,msgC,msgT,timerText,timerBar,actionBar,raisePanel;
let topBarTexts={};

async function init(){
    app=new PIXI.Application({width:W,height:H,backgroundColor:0x1a0808,antialias:true,resolution:window.devicePixelRatio||1,autoDensity:true});
    document.body.appendChild(app.view);
    const resize=()=>{
        const s=Math.min(window.innerWidth/W,window.innerHeight/H);
        app.view.style.width=W*s+'px';app.view.style.height=H*s+'px';
        app.view.style.position='absolute';
        app.view.style.left=(window.innerWidth-W*s)/2+'px';
        app.view.style.top=(window.innerHeight-H*s)/2+'px';
    };
    window.addEventListener('resize',resize);resize();
    await loadAssets();
    buildMenuScreen();buildGameScreen();buildResultOverlay();buildPauseOverlay();
    showScreen('menu');
    app.ticker.add(dt=>updateTweens(dt));
}

async function loadAssets(){
    const p={
        bg_violet:'assets/Interface_game/png/background_violet.png',
        table:'assets/Interface_game/png/table-green.png',
        dealer_menu:'assets/Croupier/png/woman_menu.png',
        dealer_game:'assets/Croupier/png/woman_ingame.png',
        avatar_frame:'assets/Interface_game/png/avatar_player.png',
        default_avatar:'assets/Interface_game/png/default_avatar.png',
        empty_card:'assets/Interface_game/png/empty_card_field.png',
        btn_play_menu:'assets/Menu/png/button_play.png',
        btn_fold:'assets/Interface_game/png/button_fold.png',
        btn_check:'assets/Interface_game/png/button_check.png',
        btn_call:'assets/Interface_game/png/button_call.png',
        btn_raise:'assets/Interface_game/png/button_raise.png',
        btn_ok:'assets/Win/png/button_ok.png',
        btn_resume:'assets/Pause/png/button_resume.png',
        btn_lobby_pause:'assets/Pause/png/button_lobby.png',
        icon_coin:'assets/Menu/png/icon_coin.png',
        icon_chip:'assets/Menu/png/icon_chip.png',
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

// 工具
function mkText(str,opts){const t=new PIXI.Text(str,{fontFamily:'Arial, Helvetica',fill:'#fff',fontWeight:'700',...opts});t.anchor.set(0.5);return t;}

// 極簡撲克牌繪製（白底 + 數字 + 花色符號）
const SUIT_SYMBOLS={Hearts:'♥',Diamonds:'♦',Club:'♣',Spades:'♠'};
const SUIT_COLORS={Hearts:'#cc1111',Diamonds:'#cc1111',Club:'#111111',Spades:'#111111'};

function drawCardSprite(suit,rank,w,h){
    const c=new PIXI.Container();
    const bg=new PIXI.Graphics();
    bg.beginFill(0xffffff);bg.drawRoundedRect(-w/2,-h/2,w,h,3);bg.endFill();
    bg.lineStyle(1,0xdddddd);bg.drawRoundedRect(-w/2,-h/2,w,h,3);
    c.addChild(bg);
    const color=SUIT_COLORS[suit];
    const sym=SUIT_SYMBOLS[suit];
    const isSmall=w<40;
    // 左上 rank
    const topRank=new PIXI.Text(rank,{fontFamily:'Arial Black',fontSize:isSmall?11:18,fontWeight:'900',fill:color});
    topRank.anchor.set(0.5);topRank.x=-w/2+(isSmall?9:14);topRank.y=-h/2+(isSmall?9:13);
    c.addChild(topRank);
    // 左上 suit（緊貼 rank 下方）
    const topSuit=new PIXI.Text(sym,{fontSize:isSmall?9:14,fill:color});
    topSuit.anchor.set(0.5);topSuit.x=topRank.x;topSuit.y=topRank.y+(isSmall?10:14);
    c.addChild(topSuit);
    // 中央大花色（稍微偏上，減少底部留白）
    const centerSuit=new PIXI.Text(sym,{fontSize:isSmall?14:24,fill:color});
    centerSuit.anchor.set(0.5);centerSuit.y=isSmall?2:3;
    c.addChild(centerSuit);
    return c;
}

// 虛擬頭像（每個玩家獨特配色）
const AVATAR_COLORS=[
    0x4488cc, // 0 YOU 藍
    0xcc4444, // 1 紅
    0x44aa44, // 2 綠
    0xcc8844, // 3 橙
    0x8844cc, // 4 紫
    0xcc4488, // 5 粉
    0x44ccaa, // 6 青
    0xaaaa44, // 7 黃
    0x6666aa, // 8 灰藍
    0xaa6644, // 9 棕
];
function drawAvatar(size,playerIndex){
    const c=new PIXI.Container();
    const color=AVATAR_COLORS[playerIndex%AVATAR_COLORS.length];
    // 背景
    const bg=new PIXI.Graphics();bg.beginFill(color,0.3);bg.drawRoundedRect(-size,-size,size*2,size*2,4);bg.endFill();c.addChild(bg);
    // 頭（圓）
    const head=new PIXI.Graphics();head.beginFill(color);head.drawCircle(0,-size*0.25,size*0.32);head.endFill();c.addChild(head);
    // 身體（半橢圓）
    const body=new PIXI.Graphics();body.beginFill(color);body.drawEllipse(0,size*0.4,size*0.5,size*0.4);body.endFill();c.addChild(body);
    return c;
}

function drawCardBack(w,h){
    const c=new PIXI.Container();
    const bg=new PIXI.Graphics();
    bg.beginFill(0xcc2222);bg.drawRoundedRect(-w/2,-h/2,w,h,4);bg.endFill();
    bg.lineStyle(1,0x991111);bg.drawRoundedRect(-w/2,-h/2,w,h,4);
    c.addChild(bg);
    // 菱形圖案
    const pattern=new PIXI.Graphics();pattern.lineStyle(1,0xffffff,0.3);
    for(let x=-w/2+6;x<w/2;x+=8)for(let y=-h/2+6;y<h/2;y+=8){pattern.drawRect(x,y,4,4);}
    c.addChild(pattern);
    return c;
}
function mkIconBtn(icon,x,y,size,cb){
    const c=new PIXI.Container();c.x=x;c.y=y;
    const bg=new PIXI.Graphics();bg.lineStyle(2,0x8a7a30);bg.beginFill(0x2a2a20,0.8);bg.drawCircle(0,0,size);bg.endFill();c.addChild(bg);
    const t=mkText(icon,{fontSize:size*0.8,fill:'#c8b830'});c.addChild(t);
    c.eventMode='static';c.cursor='pointer';c.on('pointerdown',()=>{playSound('button');cb();});
    return c;
}

// ============================================================
// 背景繪製（深紅棕漸層 + 光暈）
// ============================================================
function drawDarkBg(container){
    const bg=new PIXI.Graphics();
    // 深紅棕色底
    bg.beginFill(0x1a0808);bg.drawRect(0,0,W,H);bg.endFill();
    container.addChild(bg);
    // 光暈效果
    const glow=new PIXI.Graphics();
    glow.beginFill(0x4a1515,0.4);glow.drawEllipse(W/2,H*0.3,W*0.6,H*0.3);glow.endFill();
    glow.beginFill(0x3a1010,0.3);glow.drawEllipse(W*0.2,H*0.15,100,80);glow.endFill();
    glow.beginFill(0x3a1010,0.2);glow.drawEllipse(W*0.8,H*0.6,80,60);glow.endFill();
    container.addChild(glow);
}

// ============================================================
// 垂直橢圓牌桌
// ============================================================
function drawVerticalTable(container){
    const cx=W/2, cy=430, rx=185, ry=240;
    // 外框（深灰邊）
    const outer=new PIXI.Graphics();
    outer.beginFill(0x333333);outer.drawEllipse(cx,cy,rx+12,ry+12);outer.endFill();
    container.addChild(outer);
    // 木邊框
    const wood=new PIXI.Graphics();
    wood.beginFill(0x5a3a1a);wood.drawEllipse(cx,cy,rx+8,ry+8);wood.endFill();
    container.addChild(wood);
    // 綠色桌面
    const felt=new PIXI.Graphics();
    felt.beginFill(0x1a7a2a);felt.drawEllipse(cx,cy,rx,ry);felt.endFill();
    container.addChild(felt);
    // 內圈線
    const inner=new PIXI.Graphics();
    inner.lineStyle(1,0x2a9a3a,0.4);inner.drawEllipse(cx,cy,rx-15,ry-18);inner.endFill();
    container.addChild(inner);
}

// ============================================================
// 選單畫面（直式）
// ============================================================
function buildMenuScreen(){
    const c=new PIXI.Container();app.stage.addChild(c);screens.menu=c;
    drawDarkBg(c);

    // 荷官已移除

    // 標題
    const title=mkText('POKER\nKING',{fontSize:52,fill:'#ffd700',fontWeight:'900',stroke:'#000',strokeThickness:5,align:'center',lineHeight:58});
    title.x=W/2;title.y=H*0.35;c.addChild(title);

    // PLAY 按鈕
    const playC=new PIXI.Container();playC.x=W/2;playC.y=H*0.55;
    const playBg=new PIXI.Graphics();playBg.beginFill(0xcc2222);playBg.drawRoundedRect(-100,-28,200,56,12);playBg.endFill();
    playC.addChild(playBg);playC.addChild(mkText('PLAY',{fontSize:28,fill:'#fff'}));
    playC.eventMode='static';playC.cursor='pointer';
    playC.on('pointerdown',()=>{playSound('button');showScreen('game');startGame();});
    playC.on('pointerover',()=>playC.scale.set(1.05));playC.on('pointerout',()=>playC.scale.set(1));
    c.addChild(playC);

    // 玩家資訊
    const pi=new PIXI.Container();pi.x=W/2;pi.y=H*0.78;c.addChild(pi);
    const piBg=new PIXI.Graphics();piBg.beginFill(0x1a2a3a,0.8);piBg.drawRoundedRect(-120,-40,240,80,12);piBg.endFill();pi.addChild(piBg);
    if(tex.default_avatar){const av=new PIXI.Sprite(tex.default_avatar);av.anchor.set(0.5);av.x=-80;av.y=0;av.scale.set(0.3);pi.addChild(av);}
    pi.addChild(Object.assign(mkText('PLAYER',{fontSize:14,fill:'#fff'}),{x:10,y:-14}));
    pi.addChild(Object.assign(mkText('$ 25,658',{fontSize:16,fill:'#ffd700'}),{x:10,y:10}));
}

// ============================================================
// 遊戲畫面（直式 PokerKing 風格）
// ============================================================
function buildGameScreen(){
    const c=new PIXI.Container();c.visible=false;app.stage.addChild(c);screens.game=c;

    // 深紅背景
    drawDarkBg(c);

    // 頂部工具列
    const topBar=new PIXI.Container();topBar.y=15;c.addChild(topBar);
    // 左側圖標
    topBar.addChild(mkIconBtn('≡',30,18,18,()=>backToMenu()));
    topBar.addChild(mkIconBtn('+',75,18,18,()=>{}));
    // 中間綠色膠囊
    const pill=new PIXI.Graphics();pill.beginFill(0x2a6a3a);pill.drawRoundedRect(W/2-40,4,80,28,14);pill.endFill();topBar.addChild(pill);
    // 右側圖標
    topBar.addChild(mkIconBtn('?',W-110,18,18,()=>{}));
    topBar.addChild(mkIconBtn('i',W-70,18,18,()=>{}));
    topBar.addChild(mkIconBtn('⚙',W-30,18,18,()=>pauseGame()));
    // Hand #
    topBarTexts.hand=mkText('Hand #1',{fontSize:11,fill:'#888'});topBarTexts.hand.anchor.set(0,0.5);topBarTexts.hand.x=15;topBarTexts.hand.y=50;c.addChild(topBarTexts.hand);

    // 垂直牌桌
    drawVerticalTable(c);

    // 荷官（小，在牌桌上方凹口）
    // 不顯示荷官在直式版，設計稿沒有

    // 公共牌（牌桌中央，水平排列）
    communityUI=[];
    for(let i=0;i<5;i++){
        const slot=new PIXI.Container();
        slot.x=W/2-88+i*44;slot.y=430;c.addChild(slot);
        const ph=new PIXI.Graphics();ph.lineStyle(1,0xffffff,0.25);ph.beginFill(0x1a6a2a,0.2);
        ph.drawRoundedRect(-16,-23,32,46,3);ph.endFill();
        slot.addChild(ph);communityUI.push({container:slot,placeholder:ph,cardSprite:null});
    }

    // 底池
    const potC=new PIXI.Container();potC.x=W/2;potC.y=530;c.addChild(potC);
    const potLabel=mkText('Pot Amt.',{fontSize:11,fill:'#aaa'});potLabel.y=-12;potC.addChild(potLabel);
    const potRow=new PIXI.Container();potRow.y=6;potC.addChild(potRow);
    // 金幣圖標
    const coinDot=new PIXI.Graphics();coinDot.beginFill(0xffcc00);coinDot.drawCircle(-50,0,6);coinDot.endFill();potRow.addChild(coinDot);
    potText=mkText('$ 0',{fontSize:16,fill:'#fff',fontWeight:'900'});potText.x=5;potRow.addChild(potText);

    // 計時器
    const timerC=new PIXI.Container();timerC.x=W/2;timerC.y=490;timerC.visible=false;c.addChild(timerC);
    timerText=mkText('TIME LEFT: 30 SEC',{fontSize:14,fill:'#fff',fontWeight:'900',stroke:'#000',strokeThickness:2});timerC.addChild(timerText);
    const tBg=new PIXI.Graphics();tBg.beginFill(0x003333);tBg.drawRoundedRect(-100,14,200,10,5);tBg.endFill();timerC.addChild(tBg);
    timerBar=new PIXI.Graphics();timerC.addChild(timerBar);
    c._timerC=timerC;

    // 訊息
    msgC=new PIXI.Container();msgC.x=W/2;msgC.y=490;msgC.visible=false;c.addChild(msgC);
    msgC._bg=new PIXI.Graphics();msgC.addChild(msgC._bg);
    msgT=mkText('',{fontSize:16,fill:'#fff',fontWeight:'900',stroke:'#000',strokeThickness:2});msgC.addChild(msgT);

    // 座位（在牌桌之後加入，z-order 更高）
    seatUI=[];for(let i=0;i<NUM_PLAYERS;i++){const s=buildSeat(i);c.addChild(s.container);seatUI.push(s);}

    // 操作列
    buildActionBar(c);
}

// ============================================================
// 座位（PokerKing 風格：方形金邊頭像）
// ============================================================
function buildSeat(i){
    const c=new PIXI.Container();c.x=SEAT_POS[i].x;c.y=SEAT_POS[i].y;
    const isMe=i===0;
    const avSize=isMe?32:24; // 頭像方框大小（更小更精緻）

    // 高亮
    const glow=new PIXI.Graphics();glow.lineStyle(3,0xffd700,0.9);glow.drawRoundedRect(-avSize-2,-avSize-2,avSize*2+4,avSize*2+4,6);
    glow.visible=false;c.addChild(glow);

    // 方形頭像框（金邊）+ 虛擬角色頭像
    const avatarC=new PIXI.Container();
    const frameBg=new PIXI.Graphics();frameBg.lineStyle(2,0xc8a82e);frameBg.beginFill(0x1a1a2a,0.9);
    frameBg.drawRoundedRect(-avSize,-avSize,avSize*2,avSize*2,4);frameBg.endFill();
    avatarC.addChild(frameBg);
    // 虛擬頭像
    const avatar=drawAvatar(avSize*0.7,i);avatarC.addChild(avatar);
    // Rank 圖標（右下角⚜️）
    const rankIcon=new PIXI.Container();rankIcon.x=avSize-4;rankIcon.y=avSize-4;
    const rBg=new PIXI.Graphics();rBg.beginFill(0x2a2a40,0.9);rBg.drawRoundedRect(-8,-8,16,16,3);rBg.endFill();rankIcon.addChild(rBg);
    const rT=mkText('⚜',{fontSize:10,fill:'#c8a82e'});rankIcon.addChild(rT);
    avatarC.addChild(rankIcon);
    c.addChild(avatarC);

    // 名字（頭像上方）
    const isLeft=i>=1&&i<=4;
    const isRight=i>=6&&i<=9;
    const nameT=mkText('',{fontSize:9,fill:'#ccc',fontWeight:'600'});
    nameT.y=-avSize-10;
    c.addChild(nameT);

    // 金額（頭像下方，金幣+$）
    const moneyC=new PIXI.Container();
    moneyC.y=avSize+12;
    const coinDot=new PIXI.Graphics();coinDot.beginFill(0xffcc00);coinDot.drawCircle(-22,0,4);coinDot.endFill();moneyC.addChild(coinDot);
    const chipsT=mkText('',{fontSize:10,fill:'#fff',fontWeight:'700'});
    chipsT.x=2;
    moneyC.addChild(chipsT);
    c.addChild(moneyC);

    // 莊家
    const dc=new PIXI.Container();dc.x=avSize+5;dc.y=-avSize-5;dc.visible=false;
    const dcBg=new PIXI.Graphics();dcBg.beginFill(0xffffff);dcBg.drawCircle(0,0,9);dcBg.endFill();dcBg.lineStyle(1,0x333);dcBg.drawCircle(0,0,9);dc.addChild(dcBg);
    dc.addChild(mkText('D',{fontSize:9,fill:'#333',fontWeight:'900'}));
    c.addChild(dc);

    // 手牌容器
    const cardsC=new PIXI.Container();
    if(isMe){cardsC.y=-42;}                                // YOU: 牌在上方
    else if(i===5){cardsC.y=-avSize-18;}                   // 頂部: 牌在上方
    else if(isLeft){cardsC.x=avSize+10;cardsC.y=-avSize+3;} // 左側4位: 牌在右邊
    else{cardsC.x=-avSize-10;cardsC.y=-avSize+3;}         // 右側4位: 牌在左邊
    c.addChild(cardsC);

    // 下注
    const betC=new PIXI.Container();betC.x=BET_OFFSET[i].x;betC.y=BET_OFFSET[i].y;betC.visible=false;c.addChild(betC);

    return{container:c,nameT,chipsT,dc,cardsC,betC,glow,cardSprites:[]};
}

// ============================================================
// 操作列（底部三按鈕 + RAISE 下拉）
// ============================================================
function buildActionBar(parent){
    actionBar=new PIXI.Container();actionBar.y=H-60;actionBar.alpha=0.4;actionBar._enabled=false;parent.addChild(actionBar);

    // 底部背景
    const bar=new PIXI.Graphics();bar.beginFill(0x1a1a20,0.95);bar.drawRect(0,-8,W,65);bar.endFill();actionBar.addChild(bar);

    // FOLD（紅色圓角按鈕）
    const foldBtn=new PIXI.Container();foldBtn.x=75;foldBtn.y=22;
    const fBg=new PIXI.Graphics();fBg.beginFill(0xaa1111);fBg.drawRoundedRect(-60,-22,120,44,22);fBg.endFill();foldBtn.addChild(fBg);
    foldBtn.addChild(mkText('FOLD',{fontSize:15,fill:'#fff',fontWeight:'900'}));
    foldBtn.eventMode='static';foldBtn.cursor='pointer';foldBtn.on('pointerdown',()=>onAction('fold'));
    actionBar.addChild(foldBtn);

    // CHECK（綠色）
    const checkBtn=new PIXI.Container();checkBtn.x=W/2;checkBtn.y=22;
    const cBg=new PIXI.Graphics();cBg.beginFill(0x228822);cBg.drawRoundedRect(-60,-22,120,44,22);cBg.endFill();checkBtn.addChild(cBg);
    const checkT=mkText('CHECK',{fontSize:15,fill:'#fff',fontWeight:'900'});checkBtn.addChild(checkT);
    checkBtn.eventMode='static';checkBtn.cursor='pointer';checkBtn.on('pointerdown',()=>onAction('check'));
    actionBar.addChild(checkBtn);actionBar._checkBtn=checkBtn;actionBar._checkText=checkT;

    // CALL（綠色，與 CHECK 共用位置）
    const callBtn=new PIXI.Container();callBtn.x=W/2;callBtn.y=22;callBtn.visible=false;
    const clBg=new PIXI.Graphics();clBg.beginFill(0x228822);clBg.drawRoundedRect(-60,-22,120,44,22);clBg.endFill();callBtn.addChild(clBg);
    const callT=mkText('CALL',{fontSize:15,fill:'#fff',fontWeight:'900'});callBtn.addChild(callT);
    actionBar._callAmount=mkText('',{fontSize:10,fill:'#afa'});actionBar._callAmount.y=14;callBtn.addChild(actionBar._callAmount);
    callBtn.eventMode='static';callBtn.cursor='pointer';callBtn.on('pointerdown',()=>onAction('call'));
    actionBar.addChild(callBtn);actionBar._callBtn=callBtn;

    // RAISE ▼（深藍色）
    const raiseBtn=new PIXI.Container();raiseBtn.x=W-75;raiseBtn.y=22;
    const rBg=new PIXI.Graphics();rBg.beginFill(0x2a3a5a);rBg.drawRoundedRect(-60,-22,120,44,22);rBg.endFill();raiseBtn.addChild(rBg);
    raiseBtn.addChild(mkText('RAISE ▼',{fontSize:15,fill:'#fff',fontWeight:'900'}));
    raiseBtn.eventMode='static';raiseBtn.cursor='pointer';raiseBtn.on('pointerdown',()=>toggleRaisePanel());
    actionBar.addChild(raiseBtn);

    // RAISE 下拉面板
    buildRaisePanel(parent);
}

function buildRaisePanel(parent){
    raisePanel=new PIXI.Container();raisePanel.x=W/2+30;raisePanel.y=H-130;raisePanel.visible=false;parent.addChild(raisePanel);

    // 背景面板
    const bg=new PIXI.Graphics();bg.beginFill(0x1a2a3a,0.95);bg.drawRoundedRect(-110,-180,220,320,12);bg.endFill();
    bg.lineStyle(1,0x3a5a7a);bg.drawRoundedRect(-110,-180,220,320,12);
    raisePanel.addChild(bg);

    // 選項按鈕
    const options=['ALL IN','Pot','3/4 Pot','1/2 Pot','4x','2x'];
    options.forEach((label,idx)=>{
        const btn=new PIXI.Container();btn.y=-150+idx*42;
        const bBg=new PIXI.Graphics();bBg.beginFill(0x2a3a4a);bBg.drawRoundedRect(-90,-16,180,32,6);bBg.endFill();btn.addChild(bBg);
        btn.addChild(mkText(label,{fontSize:14,fill:'#fff'}));
        btn.eventMode='static';btn.cursor='pointer';
        btn.on('pointerdown',()=>{
            const gs=gameState,p=gs.players[0];
            let val;
            if(label==='ALL IN')val=p.chips+p.bet;
            else if(label==='Pot')val=gs.pot+gs.currentBet;
            else if(label==='3/4 Pot')val=Math.round((gs.pot+gs.currentBet)*0.75);
            else if(label==='1/2 Pot')val=Math.round((gs.pot+gs.currentBet)*0.5);
            else if(label==='4x')val=gs.currentBet*4||BIG_BLIND*4;
            else val=gs.currentBet*2||BIG_BLIND*2;
            val=Math.max(val,gs.currentBet+gs.minRaise);
            val=Math.min(val,p.chips+p.bet);
            raisePanel._currentValue=val;
            raisePanel._vt.text='Raise $ '+val.toLocaleString();
            // 更新滑桿
            const mn=-90,mx=90,t2=(val-raisePanel._min)/(raisePanel._max-raisePanel._min);
            raisePanel._handle.x=mn+t2*(mx-mn);
            updateRaiseSlider();
        });
        raisePanel.addChild(btn);
    });

    // 滑桿
    const sliderY=108;
    const track=new PIXI.Graphics();track.beginFill(0x3a4a5a);track.drawRoundedRect(-90,sliderY-3,180,6,3);track.endFill();raisePanel.addChild(track);
    raisePanel._sliderFill=new PIXI.Graphics();raisePanel.addChild(raisePanel._sliderFill);
    const handle=new PIXI.Graphics();handle.beginFill(0x4a9aca);handle.drawRoundedRect(-8,-12,16,24,8);handle.endFill();
    handle.x=-90;handle.y=sliderY;handle.eventMode='static';handle.cursor='grab';raisePanel.addChild(handle);raisePanel._handle=handle;
    let drag=false;
    handle.on('pointerdown',()=>{drag=true;});
    app.stage.on('pointermove',e=>{if(!drag)return;const l=raisePanel.toLocal(e.global);handle.x=Math.max(-90,Math.min(90,l.x));updateRaiseSlider();});
    app.stage.on('pointerup',()=>{drag=false;});
    app.stage.eventMode='static';

    // Raise 確認按鈕（金色）
    const confirmBtn=new PIXI.Container();confirmBtn.y=140;
    const cfBg=new PIXI.Graphics();cfBg.beginFill(0xccaa22);cfBg.drawRoundedRect(-90,-18,180,36,8);cfBg.endFill();confirmBtn.addChild(cfBg);
    raisePanel._vt=mkText('Raise $ 0',{fontSize:14,fill:'#000',fontWeight:'900'});confirmBtn.addChild(raisePanel._vt);
    confirmBtn.eventMode='static';confirmBtn.cursor='pointer';confirmBtn.on('pointerdown',()=>confirmRaise());
    raisePanel.addChild(confirmBtn);

    raisePanel._min=0;raisePanel._max=10000;raisePanel._currentValue=0;
}

function updateRaiseSlider(){
    const mn=-90,mx=90;
    const t=(raisePanel._handle.x-mn)/(mx-mn);
    const v=Math.round((raisePanel._min+t*(raisePanel._max-raisePanel._min))/BIG_BLIND)*BIG_BLIND;
    raisePanel._currentValue=Math.max(raisePanel._min,Math.min(raisePanel._max,v));
    raisePanel._vt.text='Raise $ '+raisePanel._currentValue.toLocaleString();
    raisePanel._sliderFill.clear();raisePanel._sliderFill.beginFill(0x4a9aca,0.6);
    raisePanel._sliderFill.drawRoundedRect(mn,105,raisePanel._handle.x-mn,6,3);raisePanel._sliderFill.endFill();
}

function toggleRaisePanel(){
    if(raisePanel.visible){raisePanel.visible=false;return;}
    const gs=gameState,p=gs.players[0];
    raisePanel._min=gs.currentBet+gs.minRaise;raisePanel._max=p.chips+p.bet;
    raisePanel._handle.x=-90;raisePanel._currentValue=raisePanel._min;
    raisePanel._vt.text='Raise $ '+raisePanel._min.toLocaleString();
    updateRaiseSlider();
    raisePanel.visible=true;playSound('button');
}

// ============================================================
// 結果 / 暫停
// ============================================================
function buildResultOverlay(){
    screens.result=new PIXI.Container();screens.result.visible=false;app.stage.addChild(screens.result);
    const ov=new PIXI.Graphics();ov.beginFill(0,0.7);ov.drawRect(0,0,W,H);ov.endFill();ov.eventMode='static';screens.result.addChild(ov);
    const pb=new PIXI.Graphics();pb.beginFill(0x1a3a2a,.95);pb.drawRoundedRect(W/2-140,H/2-120,280,260,16);pb.endFill();pb.lineStyle(3,0xffd700,.5);pb.drawRoundedRect(W/2-140,H/2-120,280,260,16);screens.result.addChild(pb);
    screens.result._ts=new PIXI.Sprite();screens.result._ts.anchor.set(0.5);screens.result._ts.x=W/2;screens.result._ts.y=H/2-70;screens.result._ts.scale.set(0.35);screens.result.addChild(screens.result._ts);
    screens.result._ht=mkText('',{fontSize:20,fill:'#fff'});screens.result._ht.x=W/2;screens.result._ht.y=H/2;screens.result.addChild(screens.result._ht);
    screens.result._at=mkText('',{fontSize:28,fill:'#ffd700',fontWeight:'900'});screens.result._at.x=W/2;screens.result._at.y=H/2+40;screens.result.addChild(screens.result._at);
    const okC=new PIXI.Container();okC.x=W/2;okC.y=H/2+95;okC.eventMode='static';okC.cursor='pointer';
    const okBg=new PIXI.Graphics();okBg.beginFill(0xccaa22);okBg.drawRoundedRect(-60,-18,120,36,8);okBg.endFill();okC.addChild(okBg);
    okC.addChild(mkText('OK',{fontSize:16,fill:'#000',fontWeight:'900'}));
    okC.on('pointerdown',()=>nextRound());screens.result.addChild(okC);
}

function buildPauseOverlay(){
    screens.pause=new PIXI.Container();screens.pause.visible=false;app.stage.addChild(screens.pause);
    const ov=new PIXI.Graphics();ov.beginFill(0,0.7);ov.drawRect(0,0,W,H);ov.endFill();ov.eventMode='static';screens.pause.addChild(ov);
    const pb=new PIXI.Graphics();pb.beginFill(0x1a2a3a,.95);pb.drawRoundedRect(W/2-120,H/2-80,240,180,16);pb.endFill();screens.pause.addChild(pb);
    screens.pause.addChild(Object.assign(mkText('PAUSED',{fontSize:24,fill:'#ffd700',fontWeight:'900'}),{x:W/2,y:H/2-40}));
    // Resume
    const rC=new PIXI.Container();rC.x=W/2;rC.y=H/2+15;rC.eventMode='static';rC.cursor='pointer';
    rC.addChild(Object.assign(new PIXI.Graphics(),{}).tap??(()=>{const g=new PIXI.Graphics();g.beginFill(0x228822);g.drawRoundedRect(-70,-18,140,36,8);g.endFill();return g;})());
    rC.addChild(mkText('RESUME',{fontSize:14,fill:'#fff',fontWeight:'900'}));
    rC.on('pointerdown',()=>resumeGame());screens.pause.addChild(rC);
    // Lobby
    const lC=new PIXI.Container();lC.x=W/2;lC.y=H/2+60;lC.eventMode='static';lC.cursor='pointer';
    const lBg=new PIXI.Graphics();lBg.beginFill(0xaa1111);lBg.drawRoundedRect(-70,-18,140,36,8);lBg.endFill();lC.addChild(lBg);
    lC.addChild(mkText('LOBBY',{fontSize:14,fill:'#fff',fontWeight:'900'}));
    lC.on('pointerdown',()=>backToMenu());screens.pause.addChild(lC);
}

// 切換
function showScreen(name){for(const k in screens)screens[k].visible=(k===name);}

// ============================================================
// 遊戲邏輯
// ============================================================
function createDeck(){const d=[];for(const s of SUITS)for(const r of RANKS)d.push({suit:s,rank:r});return d;}
function shuffleDeck(d){for(let i=d.length-1;i>0;i--){const j=0|Math.random()*(i+1);[d[i],d[j]]=[d[j],d[i]];}return d;}
function initPlayers(){const p=[{id:0,name:'YOU',chips:STARTING_CHIPS,hand:[],bet:0,totalBet:0,folded:false,allIn:false,isHuman:true,isActive:true}];for(let i=1;i<NUM_PLAYERS;i++)p.push({id:i,name:AI_NAMES[i-1],chips:STARTING_CHIPS,hand:[],bet:0,totalBet:0,folded:false,allIn:false,isHuman:false,isActive:true});return p;}

function startGame(){gameState.players=initPlayers();gameState.dealerIndex=0|Math.random()*9;startNewRound();}
function startNewRound(){const gs=gameState;gs.deck=shuffleDeck(createDeck());gs.communityCards=[];gs.pot=0;gs.currentBet=0;gs.minRaise=BIG_BLIND;gs.phase='preflop';gs.actedThisRound=new Set();gs.lastRaiserIndex=-1;gs.isRunning=true;gs.actionLock=false;gs.handNumber++;
for(const p of gs.players){p.hand=[];p.bet=0;p.totalBet=0;p.folded=false;p.allIn=false;p.isActive=p.chips>0;}
gs.dealerIndex=nextAP(gs.dealerIndex);clearUI();updateSeats();showDealer();
if(topBarTexts.hand)topBarTexts.hand.text='Hand #'+gs.handNumber;
const sb=nextAP(gs.dealerIndex),bb=nextAP(sb);
bet(sb,Math.min(SMALL_BLIND,gs.players[sb].chips));bet(bb,Math.min(BIG_BLIND,gs.players[bb].chips));
gs.currentBet=BIG_BLIND;playSound('chip');updatePot();updateBets();
dealCards().then(()=>{gs.currentPlayerIndex=nextAP(bb);schedule(300);});}

async function dealCards(){const gs=gameState;for(let cn=0;cn<2;cn++)for(let i=0;i<NUM_PLAYERS;i++){const pi=(gs.dealerIndex+1+i)%NUM_PLAYERS,p=gs.players[pi];if(!p.isActive)continue;const card=gs.deck.pop();p.hand.push(card);const s=seatUI[pi];
const cw=pi===0?48:22,ch=pi===0?68:32;
const sp=pi===0?drawCardSprite(card.suit,card.rank,cw,ch):drawCardBack(cw,ch);
const idx=s.cardSprites.length;
const ox=pi===0?(idx-0.5)*(cw+6):(idx-0.5)*(cw-4);
const rot=pi===0?0:(idx===0?-0.15:0.15);
const sx=W/2-s.container.x-s.cardsC.x,sy=430-s.container.y-s.cardsC.y;
sp.x=sx;sp.y=sy;sp.alpha=0;sp.rotation=0;
s.cardsC.addChild(sp);s.cardSprites.push(sp);
tweenTo(sp,{x:ox,y:0,alpha:1,rotation:rot},250,'easeOut');
playSound('card-deal');await sleep(40);}}

async function revealCC(n){const gs=gameState;gs.deck.pop();for(let i=0;i<n;i++){const card=gs.deck.pop();gs.communityCards.push(card);const si=gs.communityCards.length-1,slot=communityUI[si];slot.placeholder.visible=false;const sp=drawCardSprite(card.suit,card.rank,32,46);sp.scale.x=0;slot.container.addChild(sp);slot.cardSprite=sp;playSound('card-flip');await tweenTo(sp.scale,{x:1},250,'easeOut');await sleep(80);}}

function showdown(){const gs=gameState;collectBets();const cont=gs.players.filter(p=>p.isActive&&!p.folded);for(const p of cont)if(!p.isHuman){const s=seatUI[p.id];s.cardsC.removeChildren();s.cardSprites=[];for(let i=0;i<p.hand.length;i++){const sp=drawCardSprite(p.hand[i].suit,p.hand[i].rank,22,32);sp.x=(i-0.5)*24;sp.rotation=0;s.cardsC.addChild(sp);s.cardSprites.push(sp);}}playSound('card-flip');let bs=-1,wi=-1,wn='';for(const p of cont){const r=evalHand([...p.hand,...gs.communityCards]);if(r.score>bs){bs=r.score;wi=p.id;wn=r.name;}}setTimeout(()=>endRound(wi,wn),1500);}

function endRound(wi,hn=''){const gs=gameState;gs.isRunning=false;gs.actionLock=false;clearTimer();hideAB();gs.players[wi].chips+=gs.pot;seatUI[wi].glow.visible=true;updateSeats();playSound(wi===0?'win':'lose');screens.result._ts.texture=tex[wi===0?'win_title':'lose_title'];screens.result._ht.text=hn;screens.result._at.text='$ '+gs.pot.toLocaleString();screens.result.visible=true;}
function nextRound(){playSound('button');screens.result.visible=false;if(gameState.players[0].chips<=0){backToMenu();return;}startNewRound();}

// 操作
function onAction(a){const gs=gameState;if(!actionBar._enabled||!gs.isRunning||gs.isPaused||gs.actionLock||gs.currentPlayerIndex!==0)return;
if(a==='raise'){toggleRaisePanel();return;}
gs.actionLock=true;clearTimer();hideAB();const p=gs.players[0];
if(a==='fold'){p.folded=true;playSound('fold');seatUI[0].container.alpha=0.4;}
else if(a==='check'||a==='checkfold')playSound('check');
else if(a==='call'){bet(0,Math.min(gs.currentBet-p.bet,p.chips));playSound('chip');}
gs.actedThisRound.add(0);updateBets();updateSeats();gs.currentPlayerIndex=nextAP(0);gs.actionLock=false;schedule(300);}

function confirmRaise(){const gs=gameState;if(gs.actionLock)return;gs.actionLock=true;const p=gs.players[0],tot=raisePanel._currentValue,nd=tot-p.bet;
if(nd>=p.chips){bet(0,p.chips);p.allIn=true;playSound('allin');}else{bet(0,nd);playSound('chip');}
gs.minRaise=Math.max(tot-gs.currentBet,BIG_BLIND);gs.currentBet=Math.max(tot,gs.currentBet);gs.lastRaiserIndex=0;gs.actedThisRound=new Set([0]);
raisePanel.visible=false;hideAB();clearTimer();updateBets();updateSeats();gs.currentPlayerIndex=nextAP(0);gs.actionLock=false;schedule(300);}

function showAB(){const gs=gameState,p=gs.players[0],ca=gs.currentBet-p.bet;
actionBar._checkBtn.visible=ca<=0;actionBar._callBtn.visible=ca>0;
if(ca>0)actionBar._callAmount.text='$'+ca.toLocaleString();
actionBar.alpha=1;actionBar._enabled=true;}
function hideAB(){actionBar.alpha=0.4;actionBar._enabled=false;raisePanel.visible=false;}

// 流程
function schedule(d){setTimeout(()=>{if(gameState.isRunning&&!gameState.isPaused)process();},d);}
function process(){const gs=gameState;if(!gs.isRunning||gs.isPaused)return;const ap=gs.players.filter(p=>p.isActive&&!p.folded);if(ap.length===1){endRound(ap[0].id);return;}if(roundDone()){nextPhase();return;}const p=gs.players[gs.currentPlayerIndex];if(!p.isActive||p.folded||p.allIn){gs.currentPlayerIndex=nextAP(gs.currentPlayerIndex);process();return;}setGlow(gs.currentPlayerIndex);if(p.isHuman){showAB();startTimer();playSound('turn-alert');}else{const ai=gs.currentPlayerIndex;setTimeout(()=>{if(gs.isRunning&&!gs.isPaused&&gs.currentPlayerIndex===ai)aiAction(ai);},500+Math.random()*700);}}
function roundDone(){const gs=gameState,ca=gs.players.filter(p=>p.isActive&&!p.folded&&!p.allIn);if(!ca.length)return true;for(const p of ca){if(!gs.actedThisRound.has(p.id)||p.bet<gs.currentBet)return false;}return true;}
function nextPhase(){const gs=gameState;collectBets();gs.actedThisRound=new Set();gs.lastRaiserIndex=-1;gs.currentBet=0;for(const p of gs.players)p.bet=0;updateBets();const ca=gs.players.filter(p=>p.isActive&&!p.folded&&!p.allIn);const adv=()=>{if(ca.length<=1){if(gs.phase==='river'||gs.phase==='showdown'){gs.phase='showdown';showdown();}else nextPhase();}else{gs.currentPlayerIndex=firstAP();schedule(300);}};if(gs.phase==='preflop'){gs.phase='flop';revealCC(3).then(adv);}else if(gs.phase==='flop'){gs.phase='turn';revealCC(1).then(adv);}else if(gs.phase==='turn'){gs.phase='river';revealCC(1).then(adv);}else{gs.phase='showdown';showdown();}}

// AI
function aiAction(pi){const gs=gameState,p=gs.players[pi];if(!gs.isRunning||p.folded||!p.isActive||p.allIn){gs.currentPlayerIndex=nextAP(pi);schedule(200);return;}const ca=gs.currentBet-p.bet,hs=evalHS(p.hand,gs.communityCards),po=ca>0?ca/(gs.pot+ca):0,r=Math.random();let act='fold',ra=0;if(hs>.85){act=r<.3?'allin':'raise';ra=Math.min(gs.pot*2,p.chips+p.bet);}else if(hs>.65){if(r<.4){act='raise';ra=Math.min(gs.currentBet+gs.minRaise*2,p.chips+p.bet);}else act=ca>0?'call':'check';}else if(hs>.45){if(ca===0){act=r<.25?'raise':'check';ra=gs.currentBet+gs.minRaise;}else act=po<.3?'call':(r<.3?'call':'fold');}else if(hs>.25){if(ca===0){act=r<.12?'raise':'check';ra=gs.currentBet+gs.minRaise;}else act=(ca<=BIG_BLIND*2&&r<.25)?'call':'fold';}else{act=ca===0?'check':(r<.06?'raise':'fold');ra=gs.currentBet+gs.minRaise;}if(act==='raise'){ra=Math.max(ra,gs.currentBet+gs.minRaise);ra=Math.min(ra,p.chips+p.bet);}execAI(pi,act,ra);}
function execAI(pi,act,ra){const gs=gameState,p=gs.players[pi];switch(act){case'fold':p.folded=true;seatUI[pi].container.alpha=0.4;showMsg(p.name+' FOLD');playSound('fold');break;case'check':showMsg(p.name+' CHECK');playSound('check');break;case'call':{const c=Math.min(gs.currentBet-p.bet,p.chips);if(c>=p.chips){bet(pi,p.chips);p.allIn=true;showMsg(p.name+' ALL-IN!');playSound('allin');}else{bet(pi,c);showMsg(p.name+' CALL');playSound('chip');}break;}case'raise':{const nd=ra-p.bet;if(nd>=p.chips){bet(pi,p.chips);p.allIn=true;showMsg(p.name+' ALL-IN!');playSound('allin');}else{bet(pi,nd);const old=gs.currentBet;gs.currentBet=ra;gs.minRaise=Math.max(ra-old,BIG_BLIND);gs.lastRaiserIndex=pi;gs.actedThisRound=new Set([pi]);showMsg(p.name+' RAISE');playSound('chip');}break;}case'allin':{bet(pi,p.chips);p.allIn=true;if(p.bet>gs.currentBet){const old=gs.currentBet;gs.currentBet=p.bet;gs.minRaise=Math.max(p.bet-old,BIG_BLIND);gs.lastRaiserIndex=pi;gs.actedThisRound=new Set([pi]);}showMsg(p.name+' ALL-IN!');playSound('allin');break;}}gs.actedThisRound.add(p.id);updateBets();updateSeats();gs.currentPlayerIndex=nextAP(pi);schedule(400);}

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
function nextAP(f){for(let i=1;i<=NUM_PLAYERS;i++){const x=(f+i)%NUM_PLAYERS;if(gameState.players[x].isActive&&!gameState.players[x].folded&&!gameState.players[x].allIn)return x;}for(let i=1;i<=NUM_PLAYERS;i++){const x=(f+i)%NUM_PLAYERS;if(gameState.players[x].isActive&&!gameState.players[x].folded)return x;}return f;}
function firstAP(){return nextAP(gameState.dealerIndex);}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

// 計時
function startTimer(){const gs=gameState;gs.turnTimeLeft=TURN_TIME;screens.game._timerC.visible=true;gs.turnTimer=setInterval(()=>{gs.turnTimeLeft-=0.1;const pct=Math.max(0,gs.turnTimeLeft/TURN_TIME);timerText.text='TIME LEFT: '+Math.ceil(gs.turnTimeLeft)+' SEC';timerBar.clear();timerBar.beginFill(pct>.3?0x00cccc:0xff4444);timerBar.drawRoundedRect(-98,14,196*pct,6,3);timerBar.endFill();if(gs.turnTimeLeft<=0){clearTimer();if(gs.currentBet>gs.players[0].bet)onAction('fold');else onAction('check');}},100);}
function clearTimer(){if(gameState.turnTimer){clearInterval(gameState.turnTimer);gameState.turnTimer=null;}if(screens.game?._timerC)screens.game._timerC.visible=false;}

// UI
function clearUI(){for(const s of seatUI){s.cardsC.removeChildren();s.cardSprites=[];s.betC.visible=false;s.betC.removeChildren();s.glow.visible=false;s.container.alpha=1;}for(const c of communityUI){if(c.cardSprite){c.container.removeChild(c.cardSprite);c.cardSprite=null;}c.placeholder.visible=true;}hideAB();msgC.visible=false;}
function updateSeats(){for(let i=0;i<NUM_PLAYERS;i++){const p=gameState.players[i],s=seatUI[i];s.nameT.text=p.name;s.chipsT.text='$ '+p.chips.toLocaleString();if(!p.isActive)s.container.alpha=0.3;else if(p.folded)s.container.alpha=0.4;}}
function updatePot(){potText.text='$ '+gameState.pot.toLocaleString();}
function updateBets(){updatePot();for(let i=0;i<NUM_PLAYERS;i++){const p=gameState.players[i],s=seatUI[i];s.betC.removeChildren();if(p.bet>0){s.betC.visible=true;const ck=chipKey(p.bet);if(tex[ck]){const c=new PIXI.Sprite(tex[ck]);c.anchor.set(0.5);c.width=18;c.height=18;c.x=-12;s.betC.addChild(c);}s.betC.addChild(Object.assign(mkText('$'+p.bet.toLocaleString(),{fontSize:10,fill:'#fff'}),{x:8}));}else s.betC.visible=false;}}
function chipKey(a){if(a>=10000)return'chip_10000';if(a>=5000)return'chip_5000';if(a>=1000)return'chip_1000';if(a>=500)return'chip_500';if(a>=100)return'chip_100';if(a>=50)return'chip_50';if(a>=25)return'chip_25';if(a>=10)return'chip_10';return'chip_1';}
function showDealer(){for(let i=0;i<NUM_PLAYERS;i++)seatUI[i].dc.visible=(i===gameState.dealerIndex);}
function setGlow(i){for(let j=0;j<NUM_PLAYERS;j++)seatUI[j].glow.visible=(j===i);}
function showMsg(t){msgT.text=t;msgC._bg.clear();const w=Math.max(140,msgT.width+40);msgC._bg.beginFill(0,.85);msgC._bg.drawRoundedRect(-w/2,-18,w,36,10);msgC._bg.endFill();msgC.visible=true;setTimeout(()=>{msgC.visible=false;},800);}
function pauseGame(){gameState.isPaused=true;clearTimer();screens.pause.visible=true;playSound('button');}
function resumeGame(){gameState.isPaused=false;screens.pause.visible=false;playSound('button');if(gameState.isRunning&&gameState.currentPlayerIndex===0){showAB();startTimer();}else if(gameState.isRunning)schedule(300);}
function backToMenu(){gameState.isRunning=false;gameState.isPaused=false;clearTimer();screens.pause.visible=false;screens.result.visible=false;showScreen('menu');playSound('button');}

init();
