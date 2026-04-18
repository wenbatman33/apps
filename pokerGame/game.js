// ============================================================
// Poker Royale — PixiJS 直式手機版（Poker Royale 設計系統）
// ============================================================

const W = 450, H = 950;
const SUITS = ['Hearts','Diamonds','Club','Spades'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const AI_NAMES = ['PANTHOR','ROSE','PETER','WILLIAM','ANTHONY','ANON','LISA','TIGER','SHADOW'];
const STARTING_CHIPS = 25658;
let SMALL_BLIND = 50, BIG_BLIND = 100;
const TURN_TIME = 30;

// 牌桌等級設定
const TABLE_LEVELS = {
    novice:   {name:'新手場',    sub:'練習用',     blinds:[10,20],     startChips:2000,   buyIns:[500,1000,2000,4000],           aiLevel:'easy',   accent:0x3FA86A},
    standard: {name:'標準場',    sub:'一般競爭',   blinds:[50,100],    startChips:25000,  buyIns:[5000,10000,25000,50000],       aiLevel:'normal', accent:0xD4A24C},
    pro:      {name:'高手場',    sub:'考驗實力',   blinds:[200,400],   startChips:100000, buyIns:[20000,50000,100000,200000],    aiLevel:'hard',   accent:0xE8862A},
    vip:      {name:'VIP 場',    sub:'極限對決',   blinds:[1000,2000], startChips:500000, buyIns:[100000,250000,500000,1000000], aiLevel:'elite',  accent:0xC8453A},
};
let currentTable='standard';  // 當前選定牌桌 key

// ============================================================
// Poker Royale 設計系統 — 顏色 / 字型
// ============================================================
const DS = {
    // 背景
    bgDeep:      0x04060E,
    bgBase:      0x070A14,
    bgRadialCn:  0x14213A,
    // 桌布
    felt:        0x0F4A45,
    feltVignette:0x1B6760,
    feltRim:     0x0A332F,
    // 金屬金（三段）
    gold1:       0x6E4A1A,
    gold2:       0xD4A24C,
    gold3:       0xF2D58A,
    // 動作色
    fold:        0xC8453A,
    foldDark:    0x8B2820,
    foldLight:   0xE2685D,
    call:        0x3FA86A,
    callDark:    0x1F6A3F,
    callLight:   0x5FCB89,
    raise:       0xE8862A,
    raiseDark:   0x9B520F,
    raiseLight:  0xF7A857,
    // 花色
    suitRed:     0xD7263D,
    suitBlack:   0x0B0F1A,
    // 前景 / 文字
    fg1:         0xF4ECD8,   // 暖象牙白
    // 玻璃
    glass:       0x0D1220,
    glassStroke: 0xFFFFFF,
};
const COLOR = {
    fg1:    '#F4ECD8',
    fg2:    '#BDB59D',
    fg3:    '#7C7665',
    gold1:  '#6E4A1A',
    gold2:  '#D4A24C',
    gold3:  '#F2D58A',
    suitRed:'#D7263D',
    suitBlk:'#0B0F1A',
    fold:   '#E89890',
    call:   '#9FE2BB',
    raise:  '#FFD2A0',
};
const FONT_UI    = 'Inter, "Noto Sans TC", system-ui, sans-serif';
const FONT_DISP  = '"Cormorant Garamond", "Noto Sans TC", serif';

// 左4 右4 上1 + YOU底部 = 10人
const NUM_PLAYERS = 10;
// 依據背景圖中橢圓牌桌重新校正：中心 (225, 500)，rx≈155，ry≈360
const SEAT_POS = [
    {x:225, y:745},  // 0 YOU 底部
    {x:80,  y:665},  // 1 左4（最下）
    {x:55,  y:535},  // 2 左3
    {x:55,  y:395},  // 3 左2
    {x:80,  y:255},  // 4 左1（最上）
    {x:225, y:185},  // 5 頂部
    {x:370, y:255},  // 6 右1（最上）
    {x:395, y:395},  // 7 右2
    {x:395, y:535},  // 8 右3
    {x:370, y:665},  // 9 右4（最下）
];

// 下注偏移（朝桌心方向）
const BET_OFFSET = [
    {x:0,   y:-48},   // 0 YOU
    {x:55,  y:-14},   // 1 左4
    {x:55,  y:0},     // 2 左3
    {x:55,  y:0},     // 3 左2
    {x:55,  y:14},    // 4 左1
    {x:0,   y:42},    // 5 頂部
    {x:-55, y:14},    // 6 右1
    {x:-55, y:0},     // 7 右2
    {x:-55, y:0},     // 8 右3
    {x:-55, y:-14},   // 9 右4
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
    app=new PIXI.Application({width:W,height:H,backgroundColor:DS.bgBase,antialias:true,resolution:window.devicePixelRatio||1,autoDensity:true});
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
    buildMenuScreen();buildLobbyScreen();buildGameScreen();buildResultOverlay();buildPauseOverlay();buildBuyInOverlay();
    showScreen('menu');
    app.ticker.add(dt=>updateTweens(dt));
}

async function loadAssets(){
    const p={
        table_royale:'assets/table_royale.jpg',   // 主要牌桌底圖（設計系統）
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

// 工具 — 依設計系統，UI 用 Inter，顯示（標題/牌面）用 Cormorant Garamond
function mkText(str,opts){const t=new PIXI.Text(str,{fontFamily:FONT_UI,fill:COLOR.fg1,fontWeight:'600',...opts});t.anchor.set(0.5);return t;}
function mkDispText(str,opts){const t=new PIXI.Text(str,{fontFamily:FONT_DISP,fill:COLOR.gold3,fontWeight:'700',...opts});t.anchor.set(0.5);return t;}

// 撲克牌 — Poker Royale 風格（白底 + 襯線 rank + 設計系統花色色）
const SUIT_SYMBOLS={Hearts:'♥',Diamonds:'♦',Club:'♣',Spades:'♠'};
const SUIT_COLORS={Hearts:COLOR.suitRed,Diamonds:COLOR.suitRed,Club:COLOR.suitBlk,Spades:COLOR.suitBlk};

function drawCardSprite(suit,rank,w,h){
    const c=new PIXI.Container();
    const bg=new PIXI.Graphics();
    // 陰影
    bg.beginFill(0x000000,0.45);bg.drawRoundedRect(-w/2+1,-h/2+2,w,h,Math.max(4,w*0.12));bg.endFill();
    // 白底 + 極細灰邊
    bg.beginFill(0xFBF6EA);bg.drawRoundedRect(-w/2,-h/2,w,h,Math.max(4,w*0.12));bg.endFill();
    bg.lineStyle(1,0xD4CCB4,0.6);bg.drawRoundedRect(-w/2,-h/2,w,h,Math.max(4,w*0.12));
    c.addChild(bg);
    const color=SUIT_COLORS[suit];
    const sym=SUIT_SYMBOLS[suit];
    const isSmall=w<40;
    // 左上 rank（襯線）
    const topRank=new PIXI.Text(rank,{fontFamily:FONT_DISP,fontSize:isSmall?12:19,fontWeight:'700',fill:color});
    topRank.anchor.set(0.5);topRank.x=-w/2+(isSmall?8:12);topRank.y=-h/2+(isSmall?9:12);
    c.addChild(topRank);
    // 左上 suit（小花色，緊貼 rank 下方）
    const topSuit=new PIXI.Text(sym,{fontSize:isSmall?9:13,fill:color,fontWeight:'700'});
    topSuit.anchor.set(0.5);topSuit.x=topRank.x;topSuit.y=topRank.y+(isSmall?10:13);
    c.addChild(topSuit);
    // 中央大花色
    const centerSuit=new PIXI.Text(sym,{fontSize:isSmall?16:28,fill:color,fontWeight:'700'});
    centerSuit.anchor.set(0.5);centerSuit.y=isSmall?3:4;
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
    const r=Math.max(4,w*0.12);
    const bg=new PIXI.Graphics();
    // 陰影
    bg.beginFill(0x000000,0.45);bg.drawRoundedRect(-w/2+1,-h/2+2,w,h,r);bg.endFill();
    // 深海軍 + 斜紋（使用雙色疊加）
    bg.beginFill(0x1B3D6B);bg.drawRoundedRect(-w/2,-h/2,w,h,r);bg.endFill();
    c.addChild(bg);
    // 45° 斜紋
    const stripes=new PIXI.Graphics();stripes.lineStyle(1,0x14315A,0.9);
    for(let k=-w-h;k<w+h;k+=5){stripes.moveTo(-w/2+k,-h/2);stripes.lineTo(-w/2+k+h,h/2);}
    const mask=new PIXI.Graphics();mask.beginFill(0xffffff);mask.drawRoundedRect(-w/2,-h/2,w,h,r);mask.endFill();
    stripes.mask=mask;c.addChild(mask);c.addChild(stripes);
    // 金邊內框
    const inner=new PIXI.Graphics();inner.lineStyle(1,DS.gold2,0.75);inner.drawRoundedRect(-w/2+3,-h/2+3,w-6,h-6,Math.max(2,r-2));
    c.addChild(inner);
    return c;
}
function mkIconBtn(icon,x,y,size,cb){
    const c=new PIXI.Container();c.x=x;c.y=y;
    const bg=new PIXI.Graphics();
    // 玻璃膠囊圓鈕
    bg.lineStyle(1,0xFFFFFF,0.12);bg.beginFill(DS.glass,0.72);bg.drawCircle(0,0,size);bg.endFill();c.addChild(bg);
    const t=mkText(icon,{fontSize:size*0.85,fill:COLOR.gold3,fontWeight:'700'});c.addChild(t);
    c.eventMode='static';c.cursor='pointer';
    c.on('pointerdown',()=>{playSound('button');cb();c.scale.set(0.94);});
    c.on('pointerup',()=>c.scale.set(1));c.on('pointerupoutside',()=>c.scale.set(1));
    return c;
}

// ============================================================
// 背景（深海軍徑向漸層 + 噪點）— Poker Royale 設計系統
// ============================================================
function drawDarkBg(container){
    // 徑向漸層底
    const bg=new PIXI.Graphics();
    bg.beginFill(DS.bgBase);bg.drawRect(0,0,W,H);bg.endFill();
    container.addChild(bg);
    // 中央亮光（navy 徑向漸層的視覺近似）
    const glow=new PIXI.Graphics();
    glow.beginFill(DS.bgRadialCn,0.55);glow.drawEllipse(W/2,H*0.38,W*0.75,H*0.35);glow.endFill();
    glow.beginFill(DS.bgRadialCn,0.3);glow.drawEllipse(W/2,H*0.5,W*0.55,H*0.28);glow.endFill();
    container.addChild(glow);
    // 深邊暗角
    const vig=new PIXI.Graphics();
    vig.beginFill(DS.bgDeep,0.6);vig.drawRect(0,0,W,H);vig.endFill();
    vig.beginHole();vig.drawEllipse(W/2,H*0.5,W*0.85,H*0.55);vig.endHole();
    container.addChild(vig);
}

// ============================================================
// 牌桌圖（使用使用者提供的背景圖檔）
// ============================================================
function drawVerticalTable(container){
    if(tex.table_royale){
        const sp=new PIXI.Sprite(tex.table_royale);
        sp.anchor.set(0.5,0.5);
        sp.x=W/2;sp.y=H/2;
        // 填滿畫面（保持比例覆蓋）
        const s=Math.max(W/sp.texture.width,H/sp.texture.height);
        sp.scale.set(s);
        container.addChild(sp);
        // 金色裝飾：桌布上方的品牌刻印 "POKER ROYALE"
        const mark=new PIXI.Text('P O K E R   R O Y A L E',{fontFamily:FONT_DISP,fontSize:10,fontWeight:'600',fill:COLOR.gold2,letterSpacing:4});
        mark.anchor.set(0.5);mark.x=W/2;mark.y=310;mark.alpha=0.42;
        container.addChild(mark);
        return;
    }
    // Fallback：沒載到圖時用向量繪製
    const cx=W/2, cy=500, rx=160, ry=340;
    const rail=new PIXI.Graphics();rail.beginFill(0x1A0E08);rail.drawEllipse(cx,cy,rx+24,ry+24);rail.endFill();container.addChild(rail);
    const rim=new PIXI.Graphics();rim.lineStyle(4,DS.gold2,0.9);rim.drawEllipse(cx,cy,rx+10,ry+10);container.addChild(rim);
    const felt=new PIXI.Graphics();felt.beginFill(DS.felt);felt.drawEllipse(cx,cy,rx,ry);felt.endFill();container.addChild(felt);
    const inner=new PIXI.Graphics();inner.lineStyle(1.5,DS.gold2,0.28);inner.drawEllipse(cx,cy,rx-30,ry-40);container.addChild(inner);
}

// ============================================================
// 選單畫面（Poker Royale 風格）
// ============================================================
function buildMenuScreen(){
    const c=new PIXI.Container();app.stage.addChild(c);screens.menu=c;
    drawDarkBg(c);

    // 品牌 wordmark — 襯線金色
    const sub=mkText('德州撲克 · VIP 牌桌',{fontSize:13,fill:COLOR.fg2,fontWeight:'500',letterSpacing:4});
    sub.x=W/2;sub.y=H*0.25;c.addChild(sub);

    const title=new PIXI.Text('POKER ROYALE',{fontFamily:FONT_DISP,fontSize:46,fontWeight:'700',fill:COLOR.gold3,letterSpacing:4});
    title.anchor.set(0.5);title.x=W/2;title.y=H*0.33;c.addChild(title);

    // 金色橫線裝飾
    const hair=new PIXI.Graphics();
    hair.lineStyle(1,DS.gold2,0.8);hair.moveTo(W/2-90,H*0.33+32);hair.lineTo(W/2+90,H*0.33+32);
    hair.beginFill(DS.gold2);hair.drawCircle(W/2,H*0.33+32,2);hair.endFill();
    c.addChild(hair);

    // PLAY 按鈕（金色膠囊 + 內高光）
    const playC=new PIXI.Container();playC.x=W/2;playC.y=H*0.52;
    const playBg=new PIXI.Graphics();
    playBg.beginFill(0x000000,0.5);playBg.drawRoundedRect(-110,-26,220,54,27);playBg.endFill();
    playBg.lineStyle(1.5,DS.gold2,0.95);playBg.drawRoundedRect(-110,-26,220,54,27);
    playBg.beginFill(DS.gold1,0.65);playBg.drawRoundedRect(-108,-24,216,50,25);playBg.endFill();
    playC.addChild(playBg);
    const playT=new PIXI.Text('開始遊戲',{fontFamily:FONT_UI,fontSize:20,fontWeight:'700',fill:COLOR.gold3,letterSpacing:6});
    playT.anchor.set(0.5);playC.addChild(playT);
    playC.eventMode='static';playC.cursor='pointer';
    playC.on('pointerdown',()=>{playSound('button');showScreen('lobby');});
    playC.on('pointerover',()=>playC.scale.set(1.04));playC.on('pointerout',()=>playC.scale.set(1));
    c.addChild(playC);

    // 玩家資訊（玻璃卡）
    const pi=new PIXI.Container();pi.x=W/2;pi.y=H*0.78;c.addChild(pi);
    const piBg=new PIXI.Graphics();
    piBg.beginFill(DS.glass,0.72);piBg.drawRoundedRect(-135,-44,270,88,14);piBg.endFill();
    piBg.lineStyle(1,DS.gold2,0.4);piBg.drawRoundedRect(-135,-44,270,88,14);
    pi.addChild(piBg);
    // 頭像（圓形 + 金框）
    const avC=new PIXI.Container();avC.x=-90;avC.y=0;pi.addChild(avC);
    const avRing=new PIXI.Graphics();avRing.beginFill(DS.gold2);avRing.drawCircle(0,0,28);avRing.endFill();avRing.beginFill(0x2B2112);avRing.drawCircle(0,0,26);avRing.endFill();avC.addChild(avRing);
    const avInner=drawAvatar(22,0);avC.addChild(avInner);
    // 文字
    pi.addChild(Object.assign(mkText('玩家',{fontSize:13,fill:COLOR.fg2,fontWeight:'600',letterSpacing:2}),{x:5,y:-16,anchor:{x:0,y:0.5}}));
    pi.getChildAt(pi.children.length-1).anchor.set(0,0.5);
    const stackT=new PIXI.Text('$ 25,658',{fontFamily:FONT_UI,fontSize:22,fontWeight:'700',fill:COLOR.gold3});
    stackT.anchor.set(0,0.5);stackT.x=5;stackT.y=12;pi.addChild(stackT);
}

// ============================================================
// 大廳（選擇牌桌等級）
// ============================================================
function buildLobbyScreen(){
    const c=new PIXI.Container();c.visible=false;app.stage.addChild(c);screens.lobby=c;
    drawDarkBg(c);
    // 標題
    const title=new PIXI.Text('選擇牌桌',{fontFamily:FONT_DISP,fontSize:34,fontWeight:'700',fill:COLOR.gold3,letterSpacing:4});
    title.anchor.set(0.5);title.x=W/2;title.y=70;c.addChild(title);
    // 返回鍵
    const back=mkIconBtn('‹',28,70,14,()=>{playSound('button');showScreen('menu');});c.addChild(back);

    // 四張牌桌卡
    const keys=Object.keys(TABLE_LEVELS);
    const cardH=160,cardW=W-48,startY=130,gap=16;
    keys.forEach((k,idx)=>{
        const t=TABLE_LEVELS[k];
        const card=new PIXI.Container();card.x=W/2;card.y=startY+idx*(cardH+gap)+cardH/2;c.addChild(card);
        const bg=new PIXI.Graphics();
        bg.beginFill(DS.glass,0.85);bg.drawRoundedRect(-cardW/2,-cardH/2,cardW,cardH,14);bg.endFill();
        bg.lineStyle(1.5,t.accent,0.7);bg.drawRoundedRect(-cardW/2,-cardH/2,cardW,cardH,14);
        card.addChild(bg);
        // 左側大字等級名稱
        const nm=new PIXI.Text(t.name,{fontFamily:FONT_DISP,fontSize:26,fontWeight:'700',fill:t.accent,letterSpacing:2});
        nm.anchor.set(0,0.5);nm.x=-cardW/2+18;nm.y=-cardH/2+28;card.addChild(nm);
        const sub=new PIXI.Text(t.sub,{fontFamily:FONT_UI,fontSize:11,fontWeight:'500',fill:COLOR.fg3,letterSpacing:2});
        sub.anchor.set(0,0.5);sub.x=-cardW/2+18;sub.y=-cardH/2+52;card.addChild(sub);
        // 盲注
        const blLbl=new PIXI.Text('盲注',{fontFamily:FONT_UI,fontSize:10,fontWeight:'500',fill:COLOR.fg3,letterSpacing:2});
        blLbl.anchor.set(0,0.5);blLbl.x=-cardW/2+18;blLbl.y=18;card.addChild(blLbl);
        const blVal=new PIXI.Text(t.blinds[0].toLocaleString()+' / '+t.blinds[1].toLocaleString(),{fontFamily:FONT_UI,fontSize:16,fontWeight:'700',fill:COLOR.fg1});
        blVal.anchor.set(0,0.5);blVal.x=-cardW/2+18;blVal.y=38;card.addChild(blVal);
        // 買入
        const biLbl=new PIXI.Text('起始籌碼',{fontFamily:FONT_UI,fontSize:10,fontWeight:'500',fill:COLOR.fg3,letterSpacing:2});
        biLbl.anchor.set(0,0.5);biLbl.x=cardW/2-130;biLbl.y=18;card.addChild(biLbl);
        const biVal=new PIXI.Text('$ '+t.startChips.toLocaleString(),{fontFamily:FONT_UI,fontSize:15,fontWeight:'700',fill:COLOR.gold3});
        biVal.anchor.set(0,0.5);biVal.x=cardW/2-130;biVal.y=38;card.addChild(biVal);
        // 進入按鈕（小金色膠囊）
        const enter=new PIXI.Container();enter.x=cardW/2-60;enter.y=-cardH/2+30;card.addChild(enter);
        enter.addChild(drawGoldPill(100,30,15));
        const eT=new PIXI.Text('進入',{fontFamily:FONT_UI,fontSize:13,fontWeight:'700',fill:'#1B1408',letterSpacing:2});eT.anchor.set(0.5);enter.addChild(eT);
        card.eventMode='static';card.cursor='pointer';
        card.on('pointerdown',()=>{playSound('button');enterTable(k);});
    });
}

function enterTable(key){
    const t=TABLE_LEVELS[key];
    currentTable=key;
    SMALL_BLIND=t.blinds[0];BIG_BLIND=t.blinds[1];
    gameState.startChips=t.startChips;
    gameState.aiLevel=t.aiLevel;
    showScreen('game');
    startGame();
}

// ============================================================
// 遊戲畫面（直式 PokerKing 風格）
// ============================================================
function buildGameScreen(){
    const c=new PIXI.Container();c.visible=false;app.stage.addChild(c);screens.game=c;

    // 使用牌桌圖檔作為整個遊戲畫面的底圖
    drawVerticalTable(c);

    // 頂部狀態列（玻璃漸層）
    const topBarBg=new PIXI.Graphics();
    topBarBg.beginFill(DS.bgDeep,0.82);topBarBg.drawRect(0,0,W,52);topBarBg.endFill();
    topBarBg.beginFill(DS.bgDeep,0.35);topBarBg.drawRect(0,52,W,16);topBarBg.endFill();
    c.addChild(topBarBg);

    const topBar=new PIXI.Container();topBar.y=10;c.addChild(topBar);
    // 左：選單 / 設置
    topBar.addChild(mkIconBtn('≡',26,16,14,()=>backToMenu()));
    topBar.addChild(mkIconBtn('＋',60,16,14,()=>openBuyIn()));
    // 中：Hand # 膠囊（綠點狀態）
    const pillC=new PIXI.Container();pillC.x=W/2;pillC.y=16;c.addChild(pillC);
    const pill=new PIXI.Graphics();
    pill.beginFill(DS.glass,0.7);pill.drawRoundedRect(-58,-13,116,26,13);pill.endFill();
    pill.lineStyle(1,0xFFFFFF,0.12);pill.drawRoundedRect(-58,-13,116,26,13);
    pillC.addChild(pill);
    const dot=new PIXI.Graphics();dot.beginFill(DS.call);dot.drawCircle(-42,0,3.5);dot.endFill();pillC.addChild(dot);
    topBarTexts.hand=new PIXI.Text('第 1 局',{fontFamily:FONT_UI,fontSize:11,fontWeight:'600',fill:COLOR.fg2,letterSpacing:1.5});
    topBarTexts.hand.anchor.set(0.5);topBarTexts.hand.x=6;topBarTexts.hand.y=0;pillC.addChild(topBarTexts.hand);
    // 右：資訊 / 設定
    topBar.addChild(mkIconBtn('ⓘ',W-60,16,14,()=>{}));
    topBar.addChild(mkIconBtn('⚙',W-26,16,14,()=>pauseGame()));
    // 盲注標籤
    const bl=new PIXI.Text('盲注  50 / 100',{fontFamily:FONT_UI,fontSize:10,fontWeight:'600',fill:COLOR.fg3,letterSpacing:2});
    bl.anchor.set(0.5,0);bl.x=W/2;bl.y=42;c.addChild(bl);

    // 公共牌（牌桌中央）
    communityUI=[];
    for(let i=0;i<5;i++){
        const slot=new PIXI.Container();
        slot.x=W/2-88+i*44;slot.y=450;c.addChild(slot);
        const ph=new PIXI.Graphics();
        ph.lineStyle(1,DS.gold2,0.3);ph.beginFill(0x000000,0.22);
        ph.drawRoundedRect(-16,-23,32,46,4);ph.endFill();
        slot.addChild(ph);communityUI.push({container:slot,placeholder:ph,cardSprite:null});
    }

    // 底池（金邊膠囊）
    const potC=new PIXI.Container();potC.x=W/2;potC.y=540;c.addChild(potC);
    const potBg=new PIXI.Graphics();
    potBg.beginFill(0x000000,0.55);potBg.drawRoundedRect(-75,-18,150,36,18);potBg.endFill();
    potBg.lineStyle(1,DS.gold2,0.55);potBg.drawRoundedRect(-75,-18,150,36,18);
    potC.addChild(potBg);
    const potLabel=new PIXI.Text('底池',{fontFamily:FONT_UI,fontSize:11,fontWeight:'600',fill:COLOR.fg3,letterSpacing:2});
    potLabel.anchor.set(0.5);potLabel.x=-44;potLabel.y=0;potC.addChild(potLabel);
    // 金色分隔線
    const sep=new PIXI.Graphics();sep.lineStyle(1,DS.gold2,0.4);sep.moveTo(-26,-10);sep.lineTo(-26,10);potC.addChild(sep);
    potText=new PIXI.Text('$ 0',{fontFamily:FONT_UI,fontSize:17,fontWeight:'700',fill:COLOR.gold3});
    potText.anchor.set(0.5);potText.x=20;potText.y=0;potC.addChild(potText);

    // 計時器
    const timerC=new PIXI.Container();timerC.x=W/2;timerC.y=500;timerC.visible=false;c.addChild(timerC);
    timerText=new PIXI.Text('你的回合 · 30秒',{fontFamily:FONT_UI,fontSize:13,fontWeight:'700',fill:COLOR.gold3,letterSpacing:2});
    timerText.anchor.set(0.5);timerC.addChild(timerText);
    const tBg=new PIXI.Graphics();tBg.beginFill(0x000000,0.6);tBg.drawRoundedRect(-90,14,180,4,2);tBg.endFill();timerC.addChild(tBg);
    timerBar=new PIXI.Graphics();timerC.addChild(timerBar);
    c._timerC=timerC;

    // 訊息（玻璃）
    msgC=new PIXI.Container();msgC.x=W/2;msgC.y=500;msgC.visible=false;c.addChild(msgC);
    msgC._bg=new PIXI.Graphics();msgC.addChild(msgC._bg);
    msgT=new PIXI.Text('',{fontFamily:FONT_UI,fontSize:13,fontWeight:'700',fill:COLOR.fg1,letterSpacing:1.5});
    msgT.anchor.set(0.5);msgC.addChild(msgT);

    // 觀戰提示之後會加入 actionBar（於 buildActionBar 後設定，這裡只保留 ref 占位）

    // 座位（在牌桌之後加入，z-order 更高）
    seatUI=[];for(let i=0;i<NUM_PLAYERS;i++){const s=buildSeat(i);c.addChild(s.container);seatUI.push(s);}

    // 操作列
    buildActionBar(c);
}

// ============================================================
// 座位（Poker Royale：圓形金邊頭像 + 玻璃名牌）
// ============================================================
function buildSeat(i){
    const c=new PIXI.Container();c.x=SEAT_POS[i].x;c.y=SEAT_POS[i].y;
    const isMe=i===0;
    const avR=isMe?28:22; // 頭像半徑

    // 金色發光環（活躍玩家）
    const glow=new PIXI.Graphics();
    glow.lineStyle(2.5,DS.gold2,0.95);glow.drawCircle(0,0,avR+4);
    glow.visible=false;c.addChild(glow);

    // 頭像（圓 + 金框 + 深底）
    const avatarC=new PIXI.Container();
    const ring=new PIXI.Graphics();
    ring.beginFill(DS.gold2);ring.drawCircle(0,0,avR+1.5);ring.endFill();
    ring.beginFill(0x1B1408);ring.drawCircle(0,0,avR);ring.endFill();
    avatarC.addChild(ring);
    const avatar=drawAvatar(avR*0.78,i);avatarC.addChild(avatar);
    c.addChild(avatarC);

    // 玻璃名牌（頭像下方）
    const plate=new PIXI.Container();plate.y=avR+14;c.addChild(plate);
    const plW=isMe?98:82,plH=28;
    const plBg=new PIXI.Graphics();
    plBg.beginFill(DS.glass,0.78);plBg.drawRoundedRect(-plW/2,-plH/2,plW,plH,8);plBg.endFill();
    plBg.lineStyle(1,isMe?DS.gold2:0xFFFFFF,isMe?0.55:0.12);plBg.drawRoundedRect(-plW/2,-plH/2,plW,plH,8);
    plate.addChild(plBg);
    const nameT=new PIXI.Text('',{fontFamily:FONT_UI,fontSize:9.5,fontWeight:'600',fill:COLOR.fg1,letterSpacing:0.5});
    nameT.anchor.set(0.5);nameT.y=-6;plate.addChild(nameT);
    const chipsT=new PIXI.Text('',{fontFamily:FONT_UI,fontSize:11,fontWeight:'700',fill:COLOR.gold3});
    chipsT.anchor.set(0.5);chipsT.y=6;plate.addChild(chipsT);

    // 莊家按鈕（白色 D）
    const dc=new PIXI.Container();dc.x=avR-2;dc.y=-avR-2;dc.visible=false;
    const dcBg=new PIXI.Graphics();dcBg.beginFill(0xFFFFFF);dcBg.drawCircle(0,0,9);dcBg.endFill();dcBg.lineStyle(1,0x888,0.8);dcBg.drawCircle(0,0,9);dc.addChild(dcBg);
    const dT=new PIXI.Text('D',{fontFamily:FONT_UI,fontSize:10,fontWeight:'900',fill:'#0B0F1A'});dT.anchor.set(0.5);dc.addChild(dT);
    c.addChild(dc);

    // 動作狀態小標（FOLD/CALL/…）
    const statusC=new PIXI.Container();statusC.y=-avR-14;statusC.visible=false;c.addChild(statusC);
    const stBg=new PIXI.Graphics();statusC.addChild(stBg);
    const stT=new PIXI.Text('',{fontFamily:FONT_UI,fontSize:9,fontWeight:'700',fill:COLOR.fg1,letterSpacing:1.2});
    stT.anchor.set(0.5);statusC.addChild(stT);
    statusC._bg=stBg;statusC._t=stT;

    // 手牌容器
    const isLeft=i>=1&&i<=4;
    const cardsC=new PIXI.Container();
    if(isMe){cardsC.y=-58;}                                 // YOU: 牌在上方（大）
    else if(i===5){cardsC.y=-avR-20;}                       // 頂部
    else if(isLeft){cardsC.x=avR+12;cardsC.y=-avR+4;}       // 左側
    else{cardsC.x=-avR-12;cardsC.y=-avR+4;}                 // 右側
    c.addChild(cardsC);

    // 下注籌碼
    const betC=new PIXI.Container();betC.x=BET_OFFSET[i].x;betC.y=BET_OFFSET[i].y;betC.visible=false;c.addChild(betC);

    return{container:c,avatarC,avR,nameT,chipsT,dc,cardsC,betC,glow,statusC,cardSprites:[]};
}

// ============================================================
// 動作區（Poker Royale：圓形漸層按鈕 FOLD / CALL / RAISE）
// ============================================================
// 金色金屬按鈕：用多層同心圓從外暗往內亮來模擬金屬反光
// gold-1 #6E4A1A / gold-2 #D4A24C / gold-3 #F2D58A
const GOLD_N=[0x6E4A1A,0xD4A24C,0xF2D58A];
function _lerpColor(a,b,t){
    const r1=(a>>16)&0xFF,g1=(a>>8)&0xFF,b1=a&0xFF;
    const r2=(b>>16)&0xFF,g2=(b>>8)&0xFF,b2=b&0xFF;
    return (Math.floor(r1+(r2-r1)*t)<<16)|(Math.floor(g1+(g2-g1)*t)<<8)|Math.floor(b1+(b2-b1)*t);
}
function _goldColorAt(t){
    // grad-gold 色段：0% 暗金 / 18% 高光 / 50% 正金 / 100% 暗金
    if(t<0.18)return _lerpColor(GOLD_N[0],GOLD_N[2],t/0.18);
    if(t<0.5)return _lerpColor(GOLD_N[2],GOLD_N[1],(t-0.18)/0.32);
    return _lerpColor(GOLD_N[1],GOLD_N[0],(t-0.5)/0.5);
}
function drawRadialBtn(dark,mid,light,r){
    const g=new PIXI.Graphics();
    // 每條水平帶寬度 = 圓上該 y 的弦長；72 段確保漸層細緻
    const steps=72;
    const bandH=(2*r)/steps;
    for(let i=0;i<steps;i++){
        const t=(i+0.5)/steps;
        const y=-r+i*bandH;
        const yc=y+bandH/2;
        const chord=Math.sqrt(Math.max(0,r*r-yc*yc));
        if(chord<=0.5)continue;
        g.beginFill(_goldColorAt(t));
        g.drawRect(-chord,y,chord*2,bandH+0.5);
        g.endFill();
    }
    g.lineStyle(1,0x000000,0.55);g.drawCircle(0,0,r);
    return g;
}

// 彩色圓形金屬鈕（與 drawRadialBtn 同風格，可傳入任意 3 色）
function drawMetalCircle(r,colors){
    const [cD,cM,cL]=colors;
    const g=new PIXI.Graphics();
    const steps=72;
    const bandH=(2*r)/steps;
    const colorAt=t=>{
        if(t<0.18)return _lerpColor(cD,cL,t/0.18);
        if(t<0.5)return _lerpColor(cL,cM,(t-0.18)/0.32);
        return _lerpColor(cM,cD,(t-0.5)/0.5);
    };
    for(let i=0;i<steps;i++){
        const t=(i+0.5)/steps;
        const y=-r+i*bandH;
        const yc=y+bandH/2;
        const chord=Math.sqrt(Math.max(0,r*r-yc*yc));
        if(chord<=0.5)continue;
        g.beginFill(colorAt(t));
        g.drawRect(-chord,y,chord*2,bandH+0.5);
        g.endFill();
    }
    g.lineStyle(1,0x000000,0.55);g.drawCircle(0,0,r);
    return g;
}

// 彩色刷紋膠囊（垂直線性漸層：dark→light@18%→mid@50%→dark）
function drawMetalPill(w,h,radius,colors){
    const [cD,cM,cL]=colors;
    const g=new PIXI.Graphics();
    const steps=Math.max(48,Math.floor(h*2));
    const bandH=h/steps;
    const rOK=Math.min(radius,h/2,w/2);
    const colorAt=t=>{
        if(t<0.18)return _lerpColor(cD,cL,t/0.18);
        if(t<0.5)return _lerpColor(cL,cM,(t-0.18)/0.32);
        return _lerpColor(cM,cD,(t-0.5)/0.5);
    };
    for(let i=0;i<steps;i++){
        const t=(i+0.5)/steps;
        const y=-h/2+i*bandH;
        const yc=y+bandH/2;
        let dy=0;
        if(yc<-h/2+rOK)dy=(-h/2+rOK)-yc;
        else if(yc>h/2-rOK)dy=yc-(h/2-rOK);
        const arcHalf=Math.sqrt(Math.max(0,rOK*rOK-dy*dy));
        const xHalf=(w/2-rOK)+arcHalf;
        if(xHalf<=0.5)continue;
        g.beginFill(colorAt(t));
        g.drawRect(-xHalf,y,xHalf*2,bandH+0.5);
        g.endFill();
    }
    g.lineStyle(1,0x000000,0.55);
    g.drawRoundedRect(-w/2,-h/2,w,h,rOK);
    return g;
}

// 金色刷紋膠囊（結算/暫停/加注確認等按鈕用）
function drawGoldPill(w,h,radius){
    const g=new PIXI.Graphics();
    const steps=Math.max(48,Math.floor(h*2));
    const bandH=h/steps;
    const rOK=Math.min(radius,h/2,w/2);
    for(let i=0;i<steps;i++){
        const t=(i+0.5)/steps;
        const y=-h/2+i*bandH;
        const yc=y+bandH/2;
        // 計算此 y 到最近圓弧中心的垂直距離；中段為 0（表示全寬）
        let dy=0;
        if(yc<-h/2+rOK)dy=(-h/2+rOK)-yc;           // 上圓角
        else if(yc>h/2-rOK)dy=yc-(h/2-rOK);        // 下圓角
        const arcHalf=Math.sqrt(Math.max(0,rOK*rOK-dy*dy));   // 圓弧部分的半寬貢獻
        const xHalf=(w/2-rOK)+arcHalf;
        if(xHalf<=0.5)continue;
        g.beginFill(_goldColorAt(t));
        g.drawRect(-xHalf,y,xHalf*2,bandH+0.5);
        g.endFill();
    }
    g.lineStyle(1,0x000000,0.55);
    g.drawRoundedRect(-w/2,-h/2,w,h,rOK);
    return g;
}
function mkActBtn(kind,label,r){
    const c=new PIXI.Container();
    c.addChild(drawRadialBtn(null,null,null,r));
    // 動作對應的深色墨（在金底上顯深色）
    const ink=kind==='fold'?'#2A0A07':kind==='call'?'#07210F':'#2A1604';
    const t=new PIXI.Text(label,{fontFamily:FONT_UI,fontSize:12,fontWeight:'700',fill:ink,letterSpacing:1});
    t.anchor.set(0.5);c.addChild(t);
    const sub=new PIXI.Text('',{fontFamily:FONT_UI,fontSize:8,fontWeight:'700',fill:ink,letterSpacing:0.3});
    sub.anchor.set(0.5);sub.y=9;sub.alpha=0.8;c.addChild(sub);
    c.eventMode='static';c.cursor='pointer';
    c._label=t;c._sub=sub;
    c.on('pointerdown',()=>c.scale.set(0.94));
    c.on('pointerup',()=>c.scale.set(1));c.on('pointerupoutside',()=>c.scale.set(1));
    return c;
}
function buildActionBar(parent){
    actionBar=new PIXI.Container();actionBar.y=H-92;actionBar.alpha=0.35;actionBar._enabled=false;parent.addChild(actionBar);

    // 底部漸層遮罩（由上至下從透明到深色，只蓋住按鈕列）
    const bar=new PIXI.Graphics();
    bar.beginFill(DS.bgDeep,0);bar.drawRect(0,-30,W,30);bar.endFill();
    bar.beginFill(DS.bgDeep,0.55);bar.drawRect(0,0,W,30);bar.endFill();
    bar.beginFill(DS.bgDeep,0.88);bar.drawRect(0,30,W,80);bar.endFill();
    actionBar.addChild(bar);

    // 下注顆粒列（¼ ½ ⅔ 底池 2x）— 自己回合用
    const pillsC=new PIXI.Container();pillsC.y=-14;actionBar.addChild(pillsC);actionBar._pillsC=pillsC;
    const pillLabels=['¼','½','⅔','底池','2x','全下'];
    const pillVals=['quarter','half','twothird','pot','double','allin'];
    actionBar._pills=[];
    const pillGap=5,pillW=46,pillH=24,startX=W/2-(pillW*pillLabels.length+pillGap*(pillLabels.length-1))/2+pillW/2;
    pillLabels.forEach((lb,idx)=>{
        const p=new PIXI.Container();p.x=startX+idx*(pillW+pillGap);
        const isAllIn=pillVals[idx]==='allin';
        const bgCol=isAllIn?DS.raise:0x4C80C8;
        const strokeCol=isAllIn?DS.raiseLight:0x78AAE6;
        const textCol=isAllIn?'#FFE4CA':'#CDE0F5';
        const pBg=new PIXI.Graphics();
        pBg.beginFill(bgCol,isAllIn?0.25:0.18);pBg.drawRoundedRect(-pillW/2,-pillH/2,pillW,pillH,12);pBg.endFill();
        pBg.lineStyle(1,strokeCol,isAllIn?0.7:0.45);pBg.drawRoundedRect(-pillW/2,-pillH/2,pillW,pillH,12);
        p.addChild(pBg);
        const pT=new PIXI.Text(lb,{fontFamily:FONT_UI,fontSize:isAllIn?10:11,fontWeight:'700',fill:textCol,letterSpacing:isAllIn?0.5:0});pT.anchor.set(0.5);p.addChild(pT);
        p.eventMode='static';p.cursor='pointer';
        p._kind=pillVals[idx];p._bg=pBg;p._t=pT;
        p.on('pointerdown',()=>onBetPill(p._kind));
        pillsC.addChild(p);actionBar._pills.push(p);
    });

    // 預選列（非自己回合顯示）：4 顆金色圓形按鈕（與動作鈕同尺寸 r=28 並對齊 y=40）
    const preC=new PIXI.Container();preC.y=40;preC.visible=false;actionBar.addChild(preC);actionBar._preC=preC;
    const preItems=[
        {kind:'fold',     lines:['蓋牌'],        ink:'#5A1B17'},
        {kind:'checkfold',lines:['過牌','蓋牌'],  ink:'#1F2430'},
        {kind:'check',    lines:['過牌'],        ink:'#14301E'},
        {kind:'callany',  lines:['無條件','跟注'],ink:'#4A2A0C'},
    ];
    actionBar._preBtns=[];
    const preR=28,preGap=92,preStart=W/2-preGap*(preItems.length-1)/2;
    preItems.forEach((it,idx)=>{
        const b=new PIXI.Container();b.x=preStart+idx*preGap;b.y=0;
        // 選中外環（在最底層；點擊後 visible=true）
        const arm=new PIXI.Graphics();arm.lineStyle(3,0xFFFFFF,0.9);arm.drawCircle(0,0,preR+5);arm.visible=false;b.addChild(arm);
        const arm2=new PIXI.Graphics();arm2.lineStyle(1.5,0xFFFFFF,0.5);arm2.drawCircle(0,0,preR+9);arm2.visible=false;b.addChild(arm2);
        // 金色金屬底（與動作鈕同）
        b.addChild(drawRadialBtn(null,null,null,preR));
        if(it.lines.length===1){
            const t=new PIXI.Text(it.lines[0],{fontFamily:FONT_UI,fontSize:14,fontWeight:'700',fill:it.ink,letterSpacing:1});
            t.anchor.set(0.5);b.addChild(t);
        }else{
            const t1=new PIXI.Text(it.lines[0],{fontFamily:FONT_UI,fontSize:12,fontWeight:'700',fill:it.ink,letterSpacing:0.5});
            t1.anchor.set(0.5);t1.y=-8;b.addChild(t1);
            const t2=new PIXI.Text(it.lines[1],{fontFamily:FONT_UI,fontSize:12,fontWeight:'700',fill:it.ink,letterSpacing:0.5});
            t2.anchor.set(0.5);t2.y=8;b.addChild(t2);
        }
        b.eventMode='static';b.cursor='pointer';
        b._kind=it.kind;b._arm=arm;b._arm2=arm2;
        b.on('pointerdown',()=>onPreSelect(b._kind));
        preC.addChild(b);actionBar._preBtns.push(b);
    });

    // 三個圓形按鈕（包成 group，方便整體顯隱）
    const btnR=28,btnY=40,btnGap=72;
    const btnGroup=new PIXI.Container();actionBar.addChild(btnGroup);actionBar._btnGroup=btnGroup;
    const foldBtn=mkActBtn('fold','棄牌',btnR);foldBtn.x=W/2-btnGap;foldBtn.y=btnY;
    foldBtn.on('pointerdown',()=>onActClick('fold'));
    btnGroup.addChild(foldBtn);

    const checkBtn=mkActBtn('call','過牌',btnR);checkBtn.x=W/2;checkBtn.y=btnY;
    checkBtn.on('pointerdown',()=>onActClick('check'));
    btnGroup.addChild(checkBtn);actionBar._checkBtn=checkBtn;

    const callBtn=mkActBtn('call','跟注',btnR);callBtn.x=W/2;callBtn.y=btnY;callBtn.visible=false;
    callBtn.on('pointerdown',()=>onActClick('call'));
    btnGroup.addChild(callBtn);actionBar._callBtn=callBtn;actionBar._callAmount=callBtn._sub;

    const raiseBtn=mkActBtn('raise','加注',btnR);raiseBtn.x=W/2+btnGap;raiseBtn.y=btnY;
    raiseBtn.on('pointerdown',()=>toggleRaisePanel());
    btnGroup.addChild(raiseBtn);

    // 觀戰提示（放在 actionBar 內，對齊動作鈕位置 y=40）
    const specC=new PIXI.Container();specC.x=W/2;specC.y=40;specC.visible=false;actionBar.addChild(specC);
    const sBg=new PIXI.Graphics();sBg.beginFill(0x000000,0.75);sBg.drawRoundedRect(-150,-18,300,36,18);sBg.endFill();
    sBg.lineStyle(1,DS.gold2,0.55);sBg.drawRoundedRect(-150,-18,300,36,18);specC.addChild(sBg);
    const sT=new PIXI.Text('觀戰中',{fontFamily:FONT_UI,fontSize:12,fontWeight:'600',fill:COLOR.gold3,letterSpacing:1.5});sT.anchor.set(0.5);specC.addChild(sT);
    specC.eventMode='static';specC.cursor='pointer';specC.on('pointerdown',()=>{const me=gameState.players?.[0];if(me&&me.chips<=0)openBuyIn();});
    screens.game._specC=specC;

    buildRaisePanel(parent);
}

// 一鍵加注：直接按指定比例加注，不再跳出滑桿面板
function onBetPill(kind){
    if(!actionBar._enabled)return;
    const gs=gameState,p=gs.players[0];
    let val;
    if(kind==='quarter')val=Math.round((gs.pot+gs.currentBet)*0.25);
    else if(kind==='half')val=Math.round((gs.pot+gs.currentBet)*0.5);
    else if(kind==='twothird')val=Math.round((gs.pot+gs.currentBet)*0.6667);
    else if(kind==='pot')val=gs.pot+gs.currentBet;
    else if(kind==='allin')val=p.chips+p.bet;
    else val=Math.max(gs.currentBet*2,BIG_BLIND*2);
    val=Math.max(val,gs.currentBet+gs.minRaise);
    val=Math.min(val,p.chips+p.bet);
    raisePanel._currentValue=val;
    confirmRaise();
}

function buildRaisePanel(parent){
    raisePanel=new PIXI.Container();raisePanel.x=W/2;raisePanel.y=H-220;raisePanel.visible=false;parent.addChild(raisePanel);

    // 玻璃底板
    const bg=new PIXI.Graphics();
    bg.beginFill(DS.glass,0.94);bg.drawRoundedRect(-160,-110,320,160,16);bg.endFill();
    bg.lineStyle(1,DS.gold2,0.45);bg.drawRoundedRect(-160,-110,320,160,16);
    raisePanel.addChild(bg);

    const tt=new PIXI.Text('加注金額',{fontFamily:FONT_UI,fontSize:11,fontWeight:'600',fill:COLOR.fg3,letterSpacing:3});
    tt.anchor.set(0.5);tt.y=-92;raisePanel.addChild(tt);

    // All In 小按鈕（右上）
    const allin=new PIXI.Container();allin.x=125;allin.y=-92;
    const aBg=new PIXI.Graphics();aBg.beginFill(DS.raise,0.22);aBg.drawRoundedRect(-28,-10,56,20,10);aBg.endFill();
    aBg.lineStyle(1,DS.raise,0.6);aBg.drawRoundedRect(-28,-10,56,20,10);allin.addChild(aBg);
    const aT=new PIXI.Text('全下',{fontFamily:FONT_UI,fontSize:10,fontWeight:'700',fill:COLOR.raise,letterSpacing:1});aT.anchor.set(0.5);allin.addChild(aT);
    allin.eventMode='static';allin.cursor='pointer';
    allin.on('pointerdown',()=>{
        const p=gameState.players[0];
        raisePanel._currentValue=p.chips+p.bet;
        raisePanel._vt.text='加注 $ '+raisePanel._currentValue.toLocaleString();
        raisePanel._handle.x=90;updateRaiseSlider();
    });
    raisePanel.addChild(allin);

    // 滑桿
    const sliderY=-50;
    const track=new PIXI.Graphics();
    track.beginFill(0x000000,0.55);track.drawRoundedRect(-100,sliderY-3,200,6,3);track.endFill();
    raisePanel.addChild(track);
    raisePanel._sliderFill=new PIXI.Graphics();raisePanel.addChild(raisePanel._sliderFill);
    const handle=new PIXI.Graphics();
    handle.beginFill(DS.gold3);handle.drawCircle(0,0,11);handle.endFill();
    handle.beginFill(DS.gold1);handle.drawCircle(0,0,7);handle.endFill();
    handle.x=-100;handle.y=sliderY;handle.eventMode='static';handle.cursor='grab';
    raisePanel.addChild(handle);raisePanel._handle=handle;
    raisePanel._sliderMin=-100;raisePanel._sliderMax=100;
    let drag=false;
    handle.on('pointerdown',()=>{drag=true;});
    app.stage.on('pointermove',e=>{if(!drag)return;const l=raisePanel.toLocal(e.global);handle.x=Math.max(-100,Math.min(100,l.x));updateRaiseSlider();});
    app.stage.on('pointerup',()=>{drag=false;});
    app.stage.eventMode='static';

    // Raise 確認按鈕（金色刷紋膠囊）
    const confirmBtn=new PIXI.Container();confirmBtn.y=20;
    confirmBtn.addChild(drawGoldPill(260,36,18));
    raisePanel._vt=new PIXI.Text('加注 $ 0',{fontFamily:FONT_UI,fontSize:15,fontWeight:'700',fill:'#1B1408',letterSpacing:1});
    raisePanel._vt.anchor.set(0.5);confirmBtn.addChild(raisePanel._vt);
    confirmBtn.eventMode='static';confirmBtn.cursor='pointer';confirmBtn.on('pointerdown',()=>confirmRaise());
    raisePanel.addChild(confirmBtn);

    raisePanel._min=0;raisePanel._max=10000;raisePanel._currentValue=0;
}

function updateRaiseSlider(){
    const mn=-100,mx=100;
    const t=(raisePanel._handle.x-mn)/(mx-mn);
    const v=Math.round((raisePanel._min+t*(raisePanel._max-raisePanel._min))/BIG_BLIND)*BIG_BLIND;
    raisePanel._currentValue=Math.max(raisePanel._min,Math.min(raisePanel._max,v));
    raisePanel._vt.text='加注 $ '+raisePanel._currentValue.toLocaleString();
    raisePanel._sliderFill.clear();
    raisePanel._sliderFill.beginFill(DS.gold2,0.78);
    raisePanel._sliderFill.drawRoundedRect(mn,-53,raisePanel._handle.x-mn,6,3);
    raisePanel._sliderFill.endFill();
}

function toggleRaisePanel(forceOpen){
    if(!forceOpen&&raisePanel.visible){raisePanel.visible=false;return;}
    const gs=gameState,p=gs.players[0];
    raisePanel._min=gs.currentBet+gs.minRaise;raisePanel._max=p.chips+p.bet;
    raisePanel._handle.x=-100;raisePanel._currentValue=raisePanel._min;
    raisePanel._vt.text='加注 $ '+raisePanel._min.toLocaleString();
    updateRaiseSlider();
    raisePanel.visible=true;playSound('button');
}

// ============================================================
// 結果 / 暫停
// ============================================================
function buildResultOverlay(){
    screens.result=new PIXI.Container();screens.result.visible=false;app.stage.addChild(screens.result);
    const ov=new PIXI.Graphics();ov.beginFill(0x04060E,0.8);ov.drawRect(0,0,W,H);ov.endFill();ov.eventMode='static';screens.result.addChild(ov);
    // 玻璃卡
    const pb=new PIXI.Graphics();
    pb.beginFill(DS.glass,0.92);pb.drawRoundedRect(W/2-150,H/2-150,300,300,20);pb.endFill();
    pb.lineStyle(1.5,DS.gold2,0.55);pb.drawRoundedRect(W/2-150,H/2-150,300,300,20);
    screens.result.addChild(pb);
    // 標題（襯線，依勝負變色）
    screens.result._hd=new PIXI.Text('',{fontFamily:FONT_DISP,fontSize:36,fontWeight:'700',fill:COLOR.gold3,letterSpacing:4});
    screens.result._hd.anchor.set(0.5);screens.result._hd.x=W/2;screens.result._hd.y=H/2-95;screens.result.addChild(screens.result._hd);
    // 金色細線
    const hl=new PIXI.Graphics();hl.lineStyle(1,DS.gold2,0.6);hl.moveTo(W/2-70,H/2-70);hl.lineTo(W/2+70,H/2-70);hl.beginFill(DS.gold2);hl.drawCircle(W/2,H/2-70,2);hl.endFill();screens.result.addChild(hl);
    // 手牌名
    screens.result._ht=new PIXI.Text('',{fontFamily:FONT_UI,fontSize:14,fontWeight:'600',fill:COLOR.fg2,letterSpacing:2});
    screens.result._ht.anchor.set(0.5);screens.result._ht.x=W/2;screens.result._ht.y=H/2-40;screens.result.addChild(screens.result._ht);
    // 金額（大，襯線）
    const potLbl=new PIXI.Text('贏得底池',{fontFamily:FONT_UI,fontSize:11,fontWeight:'600',fill:COLOR.fg3,letterSpacing:3});
    potLbl.anchor.set(0.5);potLbl.x=W/2;potLbl.y=H/2+10;screens.result.addChild(potLbl);
    screens.result._at=new PIXI.Text('$ 0',{fontFamily:FONT_UI,fontSize:30,fontWeight:'700',fill:COLOR.gold3});
    screens.result._at.anchor.set(0.5);screens.result._at.x=W/2;screens.result._at.y=H/2+42;screens.result.addChild(screens.result._at);
    // 確認按鈕（金色刷紋膠囊）
    const okC=new PIXI.Container();okC.x=W/2;okC.y=H/2+110;okC.eventMode='static';okC.cursor='pointer';
    okC.addChild(drawGoldPill(160,36,18));
    const okT=new PIXI.Text('下一局',{fontFamily:FONT_UI,fontSize:14,fontWeight:'700',fill:'#1B1408',letterSpacing:2});
    okT.anchor.set(0.5);okC.addChild(okT);
    okC.on('pointerdown',()=>nextRound());screens.result.addChild(okC);
}

function buildPauseOverlay(){
    screens.pause=new PIXI.Container();screens.pause.visible=false;app.stage.addChild(screens.pause);
    const ov=new PIXI.Graphics();ov.beginFill(0x04060E,0.8);ov.drawRect(0,0,W,H);ov.endFill();ov.eventMode='static';screens.pause.addChild(ov);
    const pb=new PIXI.Graphics();
    pb.beginFill(DS.glass,0.94);pb.drawRoundedRect(W/2-130,H/2-100,260,200,20);pb.endFill();
    pb.lineStyle(1,DS.gold2,0.45);pb.drawRoundedRect(W/2-130,H/2-100,260,200,20);
    screens.pause.addChild(pb);
    const ttl=new PIXI.Text('遊戲暫停',{fontFamily:FONT_DISP,fontSize:30,fontWeight:'700',fill:COLOR.gold3,letterSpacing:4});
    ttl.anchor.set(0.5);ttl.x=W/2;ttl.y=H/2-55;screens.pause.addChild(ttl);
    // Resume
    const rC=new PIXI.Container();rC.x=W/2;rC.y=H/2-5;rC.eventMode='static';rC.cursor='pointer';
    const rBg=new PIXI.Graphics();rBg.beginFill(DS.call);rBg.drawRoundedRect(-90,-18,180,36,18);rBg.endFill();
    rBg.beginFill(DS.callLight,0.4);rBg.drawRoundedRect(-88,-16,176,12,10);rBg.endFill();rC.addChild(rBg);
    const rT=new PIXI.Text('繼續遊戲',{fontFamily:FONT_UI,fontSize:14,fontWeight:'700',fill:'#fff',letterSpacing:2});rT.anchor.set(0.5);rC.addChild(rT);
    rC.on('pointerdown',()=>resumeGame());screens.pause.addChild(rC);
    // Lobby
    const lC=new PIXI.Container();lC.x=W/2;lC.y=H/2+50;lC.eventMode='static';lC.cursor='pointer';
    const lBg=new PIXI.Graphics();lBg.beginFill(0x000000,0.5);lBg.drawRoundedRect(-90,-18,180,36,18);lBg.endFill();
    lBg.lineStyle(1,DS.gold2,0.55);lBg.drawRoundedRect(-90,-18,180,36,18);lC.addChild(lBg);
    const lT=new PIXI.Text('返回主畫面',{fontFamily:FONT_UI,fontSize:14,fontWeight:'700',fill:COLOR.gold3,letterSpacing:2});lT.anchor.set(0.5);lC.addChild(lT);
    lC.on('pointerdown',()=>backToMenu());screens.pause.addChild(lC);
}

// ============================================================
// 買入 overlay
// ============================================================
let buyInOverlay;
function buildBuyInOverlay(){
    buyInOverlay=new PIXI.Container();buyInOverlay.visible=false;app.stage.addChild(buyInOverlay);screens.buyIn=buyInOverlay;
    const ov=new PIXI.Graphics();ov.beginFill(0x04060E,0.82);ov.drawRect(0,0,W,H);ov.endFill();ov.eventMode='static';buyInOverlay.addChild(ov);
    const panel=new PIXI.Graphics();
    panel.beginFill(DS.glass,0.95);panel.drawRoundedRect(W/2-160,H/2-200,320,400,20);panel.endFill();
    panel.lineStyle(1,DS.gold2,0.5);panel.drawRoundedRect(W/2-160,H/2-200,320,400,20);
    buyInOverlay.addChild(panel);
    const title=new PIXI.Text('買入籌碼',{fontFamily:FONT_DISP,fontSize:28,fontWeight:'700',fill:COLOR.gold3,letterSpacing:4});
    title.anchor.set(0.5);title.x=W/2;title.y=H/2-160;buyInOverlay.addChild(title);
    const hl=new PIXI.Graphics();hl.lineStyle(1,DS.gold2,0.6);hl.moveTo(W/2-60,H/2-130);hl.lineTo(W/2+60,H/2-130);hl.beginFill(DS.gold2);hl.drawCircle(W/2,H/2-130,2);hl.endFill();buyInOverlay.addChild(hl);
    const sub=new PIXI.Text('選擇買入金額',{fontFamily:FONT_UI,fontSize:12,fontWeight:'500',fill:COLOR.fg3,letterSpacing:3});
    sub.anchor.set(0.5);sub.x=W/2;sub.y=H/2-108;buyInOverlay.addChild(sub);
    // 四個選項容器（內容在 openBuyIn 動態建立）
    buyInOverlay._optC=new PIXI.Container();buyInOverlay._optC.x=W/2;buyInOverlay._optC.y=H/2-80;buyInOverlay.addChild(buyInOverlay._optC);
    // 取消
    const cancel=new PIXI.Container();cancel.x=W/2;cancel.y=H/2+170;cancel.eventMode='static';cancel.cursor='pointer';
    const cBg=new PIXI.Graphics();cBg.beginFill(0x000000,0.5);cBg.drawRoundedRect(-80,-16,160,32,16);cBg.endFill();cBg.lineStyle(1,DS.gold2,0.4);cBg.drawRoundedRect(-80,-16,160,32,16);cancel.addChild(cBg);
    const cT=new PIXI.Text('取消',{fontFamily:FONT_UI,fontSize:12,fontWeight:'700',fill:COLOR.fg2,letterSpacing:3});cT.anchor.set(0.5);cancel.addChild(cT);
    cancel.on('pointerdown',()=>{playSound('button');buyInOverlay.visible=false;});
    buyInOverlay.addChild(cancel);
}

function openBuyIn(){
    playSound('button');
    const t=TABLE_LEVELS[currentTable];
    const opts=t.buyIns;
    const optC=buyInOverlay._optC;optC.removeChildren();
    opts.forEach((amt,i)=>{
        const row=new PIXI.Container();row.y=i*60;optC.addChild(row);
        row.addChild(drawGoldPill(280,46,22));
        const t1=new PIXI.Text('$ '+amt.toLocaleString(),{fontFamily:FONT_UI,fontSize:18,fontWeight:'700',fill:'#1B1408'});t1.anchor.set(0.5);row.addChild(t1);
        row.eventMode='static';row.cursor='pointer';
        row.on('pointerdown',()=>{applyBuyIn(amt);});
    });
    buyInOverlay.visible=true;
}
function applyBuyIn(amt){
    playSound('chip');
    const me=gameState.players[0];
    me.chips+=amt;
    me.broke=false;
    // 不改 isActive — 由 startNewRound 於下局開始時依 chips>0 重新設定，避免中途插隊
    buyInOverlay.visible=false;
    updateSeats();
    // 若在回合進行中 → 呼叫 hideAB 更新狀態（維持觀戰提示到下局）
    if(gameState.isRunning)hideAB();
}

// 切換
function showScreen(name){for(const k in screens)screens[k].visible=(k===name);}

// ============================================================
// 遊戲邏輯
// ============================================================
function createDeck(){const d=[];for(const s of SUITS)for(const r of RANKS)d.push({suit:s,rank:r});return d;}
function shuffleDeck(d){for(let i=d.length-1;i>0;i--){const j=0|Math.random()*(i+1);[d[i],d[j]]=[d[j],d[i]];}return d;}

// 本地頭像池（已下載，無 CORS 問題）
const LOCAL_AVATARS=[
    'm1','m5','m12','m18','m22','m28','m34','m41','m47','m52','m60','m66','m73','m81','m88',
    'w3','w9','w15','w20','w27','w33','w39','w45','w51','w58','w64','w72','w77','w85','w92',
].map(k=>`assets/avatars/${k}.jpg`);

// randomuser.me 僅取姓名（名字 API 走 JSON 沒 CORS 問題），頭像改用本地隨機分配
async function fetchPlayerProfiles(count){
    const shuffled=[...LOCAL_AVATARS].sort(()=>Math.random()-0.5);
    try{
        const r=await fetch(`https://randomuser.me/api/?results=${count}&inc=name&noinfo`);
        if(!r.ok)throw 0;
        const d=await r.json();
        return d.results.map((u,i)=>({
            name:(u.name.first||'PLAYER').toUpperCase(),
            photoUrl:shuffled[i%shuffled.length],
        }));
    }catch(e){
        // 姓名 API 失敗則用 AI_NAMES
        return Array.from({length:count},(_,i)=>({
            name:AI_NAMES[i%AI_NAMES.length],
            photoUrl:shuffled[i%shuffled.length],
        }));
    }
}

function initPlayers(){
    const prof=gameState.profiles||[];
    const chips=gameState.startChips||STARTING_CHIPS;
    // 我：使用虛擬剪影圖案，不套用真人照片
    const p=[{id:0,name:'我',photoUrl:null,chips:chips,hand:[],bet:0,totalBet:0,folded:false,allIn:false,isHuman:true,isActive:true,broke:false}];
    for(let i=1;i<NUM_PLAYERS;i++){
        const pr=prof[i];
        p.push({id:i,name:pr?.name||AI_NAMES[i-1],photoUrl:pr?.photoUrl||null,chips:chips,hand:[],bet:0,totalBet:0,folded:false,allIn:false,isHuman:false,isActive:true});
    }
    return p;
}

async function startGame(){
    gameState.profiles=await fetchPlayerProfiles(NUM_PLAYERS);
    gameState.players=initPlayers();
    gameState.dealerIndex=0|Math.random()*9;
    startNewRound();
    // 本地頭像立即套用（無 CORS）
    applyPhotoAvatars();
}

// 載入遠端頭像並替換；用 HTMLImageElement 確保 CORS 設定正確
function loadImg(url){
    // 不設 crossOrigin：randomuser.me 不送 CORS header，設了會被瀏覽器擋
    return new Promise((res,rej)=>{
        const img=new Image();
        img.onload=()=>res(img);
        img.onerror=rej;
        img.src=url;
    });
}
async function applyPhotoAvatars(){
    const ps=gameState.players;
    for(let i=0;i<ps.length;i++){
        const p=ps[i];if(!p.photoUrl)continue;
        try{
            const img=await loadImg(p.photoUrl);
            const s=seatUI[i];if(!s||!s.avatarC)continue;
            const t=PIXI.Texture.from(img);
            // 保留最外圈金環（child 0），移除內部舊頭像
            while(s.avatarC.children.length>1)s.avatarC.removeChildAt(1);
            const sp=new PIXI.Sprite(t);sp.anchor.set(0.5);
            const r=s.avR,scale=(r*2)/Math.max(img.naturalWidth,img.naturalHeight);
            sp.scale.set(scale);
            const mask=new PIXI.Graphics();mask.beginFill(0xFFFFFF);mask.drawCircle(0,0,r-1);mask.endFill();
            s.avatarC.addChild(mask);sp.mask=mask;s.avatarC.addChild(sp);
        }catch(e){console.warn('avatar load failed',i,e);}
    }
}
function startNewRound(){const gs=gameState;gs.dealing=true;gs.deck=shuffleDeck(createDeck());gs.communityCards=[];gs.pot=0;gs.currentBet=0;gs.minRaise=BIG_BLIND;gs.phase='preflop';gs.actedThisRound=new Set();gs.lastRaiserIndex=-1;gs.isRunning=true;gs.actionLock=false;gs.handNumber++;gs.preAction=null;if(actionBar?._preBtns)for(const b of actionBar._preBtns){if(b._arm)b._arm.visible=false;if(b._arm2)b._arm2.visible=false;}
// AI 自動補倉：破產的電腦玩家以起始籌碼復活，避免牌桌逐局減少玩家
const startChips=gs.startChips||STARTING_CHIPS;
for(let i=1;i<gs.players.length;i++){if(gs.players[i].chips<=0)gs.players[i].chips=startChips;}
for(const p of gs.players){p.hand=[];p.bet=0;p.totalBet=0;p.folded=false;p.allIn=false;p.isActive=p.chips>0;}
gs.dealerIndex=nextAP(gs.dealerIndex);clearUI();updateSeats();showDealer();
if(topBarTexts.hand)topBarTexts.hand.text='第 '+gs.handNumber+' 局';
const sb=nextAP(gs.dealerIndex),bb=nextAP(sb);
bet(sb,Math.min(SMALL_BLIND,gs.players[sb].chips));bet(bb,Math.min(BIG_BLIND,gs.players[bb].chips));
gs.currentBet=BIG_BLIND;playSound('chip');updatePot();updateBets();
gs.dealing=true;dealCards().then(()=>{gs.dealing=false;gs.currentPlayerIndex=nextAP(bb);hideAB();schedule(300);});}

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

// 籌碼飛向贏家頭像（約 800ms）
function flyPotToWinner(wi){
    const stage=screens.game;if(!stage)return;
    const seat=seatUI[wi];if(!seat)return;
    const tx=seat.container.x,ty=seat.container.y;
    const sx=W/2,sy=540;
    const count=8;
    for(let i=0;i<count;i++){
        const chip=new PIXI.Graphics();
        chip.beginFill(0x6E4A1A);chip.drawCircle(0,0,7);chip.endFill();
        chip.beginFill(0xD4A24C);chip.drawCircle(0,0,5.5);chip.endFill();
        chip.beginFill(0xF2D58A,0.6);chip.drawCircle(-1.5,-1.5,2.5);chip.endFill();
        chip.x=sx+(Math.random()-0.5)*26;
        chip.y=sy+(Math.random()-0.5)*14;
        chip.alpha=0;
        stage.addChild(chip);
        const delay=i*30;
        setTimeout(()=>{
            tweenTo(chip,{alpha:1},80);
            tweenTo(chip,{x:tx,y:ty},520,'easeOut').then(()=>{
                tweenTo(chip,{alpha:0},120).then(()=>stage.removeChild(chip));
            });
        },delay);
    }
}

function endRound(wi,hn=''){
    const gs=gameState;gs.isRunning=false;gs.actionLock=false;clearTimer();hideAB();
    gs.players[wi].chips+=gs.pot;seatUI[wi].glow.visible=true;
    playSound(wi===0?'win':'lose');
    // 贏家提示訊息（中央 toast）
    showMsg(gs.players[wi].name+' 獲勝'+(hn?' · '+hn:''));
    // 籌碼飛向贏家
    flyPotToWinner(wi);
    // 0.9 秒後清空底池、更新座位、自動進入下一局
    setTimeout(()=>{
        gs.pot=0;updatePot();updateSeats();
        if(gs.players[0].chips<=0){gs.players[0].broke=true;gs.players[0].isActive=false;}
        startNewRound();
    },900);
}
function nextRound(){/* 已由 endRound 自動銜接，保留函式以防有處呼叫 */startNewRound();}

// 動作鈕 stub（改由預選列處理；自己回合直接執行）
function addArmRing(btn,r){/* 不再需要按鈕外環，預選列另行處理 */}
function onActClick(kind){
    const gs=gameState;
    if(!gs.isRunning)return;
    if(actionBar._enabled&&gs.currentPlayerIndex===0){onAction(kind);return;}
    // 非自己回合直接點動作鈕 → 視為預選（對應到預選列的 kind）
    const mapped=(kind==='call')?'callany':kind;
    onPreSelect(mapped);
}
// 預選列點擊：切換選擇；再點同一個取消
function onPreSelect(kind){
    const gs=gameState;
    const me=gs.players?.[0];
    if(!me||me.chips<=0)return;   // 觀戰中無法預選
    const next=(gs.preAction===kind)?null:kind;
    gs.preAction=next;
    for(const b of (actionBar._preBtns||[])){
        const on=b._kind===next;
        if(b._arm)b._arm.visible=on;
        if(b._arm2)b._arm2.visible=on;
    }
    playSound('button');
}

// 操作
function onAction(a){const gs=gameState;if(!actionBar._enabled||!gs.isRunning||gs.isPaused||gs.actionLock||gs.currentPlayerIndex!==0)return;
if(a==='raise'){toggleRaisePanel();return;}
gs.actionLock=true;clearTimer();const p=gs.players[0];
if(a==='fold'){p.folded=true;playSound('fold');seatUI[0].container.alpha=0.4;}
else if(a==='check'||a==='checkfold')playSound('check');
else if(a==='call'){bet(0,Math.min(gs.currentBet-p.bet,p.chips));playSound('chip');}
gs.actedThisRound.add(0);hideAB();updateBets();updateSeats();gs.currentPlayerIndex=nextAP(0);gs.actionLock=false;schedule(300);}

function confirmRaise(){const gs=gameState;if(gs.actionLock)return;gs.actionLock=true;const p=gs.players[0],tot=raisePanel._currentValue,nd=tot-p.bet;
if(nd>=p.chips){bet(0,p.chips);p.allIn=true;playSound('allin');}else{bet(0,nd);playSound('chip');}
gs.minRaise=Math.max(tot-gs.currentBet,BIG_BLIND);gs.currentBet=Math.max(tot,gs.currentBet);gs.lastRaiserIndex=0;gs.actedThisRound=new Set([0]);
raisePanel.visible=false;hideAB();clearTimer();updateBets();updateSeats();gs.currentPlayerIndex=nextAP(0);gs.actionLock=false;schedule(300);}

function showAB(){
    const gs=gameState,p=gs.players[0],ca=gs.currentBet-p.bet;
    actionBar._checkBtn.visible=ca<=0;actionBar._callBtn.visible=ca>0;
    if(ca>0)actionBar._callAmount.text='$'+ca.toLocaleString();
    actionBar.alpha=1;actionBar._enabled=true;
    // 自己回合：顯示下注顆粒 + 動作鈕，隱藏預選列 / 觀戰提示
    if(actionBar._pillsC)actionBar._pillsC.visible=true;
    if(actionBar._btnGroup)actionBar._btnGroup.visible=true;
    if(actionBar._preC)actionBar._preC.visible=false;
    if(screens.game?._specC)screens.game._specC.visible=false;
    // 檢查預選動作：若有效則立即執行
    const pre=gs.preAction;
    if(pre){
        gs.preAction=null;
        for(const b of (actionBar._preBtns||[])){if(b._arm)b._arm.visible=false;if(b._arm2)b._arm2.visible=false;}
        let act=null;
        if(pre==='fold')act='fold';
        else if(pre==='checkfold')act=ca<=0?'check':'fold';
        else if(pre==='check')act=ca<=0?'check':null;   // 只過牌：要跟注時放棄自動執行
        else if(pre==='callany')act=ca>0?'call':'check';
        if(act)setTimeout(()=>{if(gameState.currentPlayerIndex===0&&actionBar._enabled)onAction(act);},250);
    }
}
function hideAB(){
    actionBar.alpha=1;actionBar._enabled=false;raisePanel.visible=false;
    if(actionBar._pillsC)actionBar._pillsC.visible=false;
    if(actionBar._btnGroup)actionBar._btnGroup.visible=false;
    const gs=gameState,me=gs.players?.[0];
    const inHand=!!(me&&me.hand&&me.hand.length>0);
    const folded=!!(me&&me.folded);
    const allIn=!!(me&&me.allIn);
    // broke：真的沒錢且不在本局（已不持有手牌）才算；all-in 期間仍在本局
    const broke=!!(me&&me.chips<=0&&!inHand);
    const sittingOut=!!(me&&gs.isRunning&&!gs.dealing&&!broke&&!folded&&!inHand);
    // 不能行動：破產 / 蓋牌 / 全下 / 等下局 → 全都不顯示預選
    if(actionBar._preC)actionBar._preC.visible=!(broke||folded||sittingOut||allIn);
    // specC：只在破產 或 等下局兩種情況顯示提示
    const spec=screens.game?._specC;
    if(spec){
        if(broke){
            spec.visible=true;spec.cursor='pointer';
            if(spec.children[1])spec.children[1].text='餘額不足 · 點 ＋ 買入';
        }else if(sittingOut){
            spec.visible=true;spec.cursor='default';
            if(spec.children[1])spec.children[1].text='等待下局';
        }else{
            spec.visible=false;
        }
    }
}

// 流程
function schedule(d){setTimeout(()=>{if(gameState.isRunning&&!gameState.isPaused)process();},d);}
function process(){const gs=gameState;if(!gs.isRunning||gs.isPaused)return;const ap=gs.players.filter(p=>p.isActive&&!p.folded);if(ap.length===1){endRound(ap[0].id);return;}if(roundDone()){nextPhase();return;}const p=gs.players[gs.currentPlayerIndex];if(!p.isActive||p.folded||p.allIn||p.chips<=0||!p.hand||p.hand.length===0){if(p.chips<=0)p.allIn=true;gs.currentPlayerIndex=nextAP(gs.currentPlayerIndex);process();return;}setGlow(gs.currentPlayerIndex);if(p.isHuman){showAB();startTimer();playSound('turn-alert');}else{const ai=gs.currentPlayerIndex;setTimeout(()=>{if(gs.isRunning&&!gs.isPaused&&gs.currentPlayerIndex===ai)aiAction(ai);},500+Math.random()*700);}}
function roundDone(){const gs=gameState,ca=gs.players.filter(p=>p.isActive&&!p.folded&&!p.allIn);if(!ca.length)return true;for(const p of ca){if(!gs.actedThisRound.has(p.id)||p.bet<gs.currentBet)return false;}return true;}
function nextPhase(){const gs=gameState;collectBets();gs.actedThisRound=new Set();gs.lastRaiserIndex=-1;gs.currentBet=0;for(const p of gs.players)p.bet=0;updateBets();gs.preAction=null;if(actionBar?._preBtns)for(const b of actionBar._preBtns){if(b._arm)b._arm.visible=false;if(b._arm2)b._arm2.visible=false;}const ca=gs.players.filter(p=>p.isActive&&!p.folded&&!p.allIn);const adv=()=>{if(ca.length<=1){if(gs.phase==='river'||gs.phase==='showdown'){gs.phase='showdown';showdown();}else nextPhase();}else{gs.currentPlayerIndex=firstAP();schedule(300);}};if(gs.phase==='preflop'){gs.phase='flop';revealCC(3).then(adv);}else if(gs.phase==='flop'){gs.phase='turn';revealCC(1).then(adv);}else if(gs.phase==='turn'){gs.phase='river';revealCC(1).then(adv);}else{gs.phase='showdown';showdown();}}

// AI 難度對應的決策調整（aggr：加注傾向乘數；bluff：弱牌虛張次數；call：跟注閾值寬鬆度）
const AI_TUNE={
    easy:  {aggr:0.5, bluff:0.02, callTol:0.6, raiseMul:1.3},
    normal:{aggr:1.0, bluff:0.06, callTol:1.0, raiseMul:1.0},
    hard:  {aggr:1.3, bluff:0.12, callTol:1.3, raiseMul:0.8},
    elite: {aggr:1.6, bluff:0.20, callTol:1.6, raiseMul:0.65},
};
function aiAction(pi){
    const gs=gameState,p=gs.players[pi];
    if(!gs.isRunning||p.folded||!p.isActive||p.allIn){gs.currentPlayerIndex=nextAP(pi);schedule(200);return;}
    const T=AI_TUNE[gs.aiLevel||'normal'];
    const ca=gs.currentBet-p.bet,hs=evalHS(p.hand,gs.communityCards),po=ca>0?ca/(gs.pot+ca):0,r=Math.random();
    // 偵測大注：遇到大於 3 倍底池或對手全下時，依牌力直接決定
    const human=gs.players[0];
    const humanAllIn=human.allIn||human.chips<=0;
    const isBigRaise=ca>Math.max(BIG_BLIND*8,gs.pot*1.5)||humanAllIn;
    let act='fold',ra=0;
    if(isBigRaise&&ca>0){
        // 面對大注 / 全下：直接按手牌力決定 call / fold
        const callThresh=0.42-T.callTol*0.05;   // easy: 0.39, normal: 0.37, hard: 0.355, elite: 0.34
        if(hs>=callThresh)act='call';
        else act='fold';
        // 若牌力極強也可能反 all-in
        if(hs>.8&&r<0.5*T.aggr){act='allin';}
    }
    else if(hs>.85){act=r<(.3*T.aggr)?'allin':'raise';ra=Math.min(gs.pot*2*T.raiseMul,p.chips+p.bet);}
    else if(hs>.65){if(r<(.4*T.aggr)){act='raise';ra=Math.min(gs.currentBet+gs.minRaise*2*T.raiseMul,p.chips+p.bet);}else act=ca>0?'call':'check';}
    else if(hs>.45){if(ca===0){act=r<(.25*T.aggr)?'raise':'check';ra=gs.currentBet+gs.minRaise;}else act=po<(.3*T.callTol)?'call':(r<(.3*T.aggr)?'call':'fold');}
    else if(hs>.25){if(ca===0){act=r<(.12*T.aggr)?'raise':'check';ra=gs.currentBet+gs.minRaise;}else act=(ca<=BIG_BLIND*2*T.callTol&&r<(.25*T.callTol))?'call':'fold';}
    else{act=ca===0?(r<T.bluff?'raise':'check'):(r<T.bluff?'raise':'fold');ra=gs.currentBet+gs.minRaise;}
    if(act==='raise'){ra=Math.max(ra,gs.currentBet+gs.minRaise);ra=Math.min(ra,p.chips+p.bet);}
    execAI(pi,act,ra);
}
function execAI(pi,act,ra){const gs=gameState,p=gs.players[pi];switch(act){case'fold':p.folded=true;seatUI[pi].container.alpha=0.4;showMsg(p.name+' 棄牌');playSound('fold');break;case'check':showMsg(p.name+' 過牌');playSound('check');break;case'call':{const c=Math.min(gs.currentBet-p.bet,p.chips);if(c>=p.chips){bet(pi,p.chips);p.allIn=true;showMsg(p.name+' 全下！');playSound('allin');}else{bet(pi,c);showMsg(p.name+' 跟注');playSound('chip');}break;}case'raise':{const nd=ra-p.bet;if(nd>=p.chips){bet(pi,p.chips);p.allIn=true;showMsg(p.name+' 全下！');playSound('allin');}else{bet(pi,nd);const old=gs.currentBet;gs.currentBet=ra;gs.minRaise=Math.max(ra-old,BIG_BLIND);gs.lastRaiserIndex=pi;gs.actedThisRound=new Set([pi]);showMsg(p.name+' 加注');playSound('chip');}break;}case'allin':{bet(pi,p.chips);p.allIn=true;if(p.bet>gs.currentBet){const old=gs.currentBet;gs.currentBet=p.bet;gs.minRaise=Math.max(p.bet-old,BIG_BLIND);gs.lastRaiserIndex=pi;gs.actedThisRound=new Set([pi]);}showMsg(p.name+' 全下！');playSound('allin');break;}}gs.actedThisRound.add(p.id);updateBets();updateSeats();gs.currentPlayerIndex=nextAP(pi);schedule(400);}

// 牌型
function evalHS(h,cc){return cc.length?Math.min(evalHand([...h,...cc]).score/5e6,1):pfStr(h);}
function pfStr(h){const r1=RANKS.indexOf(h[0].rank),r2=RANKS.indexOf(h[1].rank),hi=Math.max(r1,r2),lo=Math.min(r1,r2);let s=(hi+lo)/24;if(r1===r2)s+=.3+(hi/12)*.3;if(h[0].suit===h[1].suit)s+=.08;if(Math.abs(r1-r2)===1)s+=.06;if(hi>=10)s+=.1;if(hi===12)s+=.1;return Math.min(s,1);}
function evalHand(cards){const c=combo(cards,5);let bs=0,bn='高牌';for(const co of c){const r=eval5(co);if(r.score>bs){bs=r.score;bn=r.name;}}return{score:bs,name:bn};}
function eval5(cards){const rk=cards.map(c=>RANKS.indexOf(c.rank)).sort((a,b)=>b-a),su=cards.map(c=>c.suit),fl=su.every(s=>s===su[0]),st=chkSt(rk),rc={};for(const r of rk)rc[r]=(rc[r]||0)+1;const ct=Object.entries(rc).map(([r,c])=>({rank:+r,count:c})).sort((a,b)=>b.count-a.count||b.rank-a.rank);if(fl&&st&&rk[0]===12&&rk[4]===8)return{score:9e6,name:'皇家同花順'};if(fl&&st)return{score:8e6+rk[0],name:'同花順'};if(ct[0].count===4)return{score:7e6+ct[0].rank*100+ct[1].rank,name:'四條'};if(ct[0].count===3&&ct[1].count===2)return{score:6e6+ct[0].rank*100+ct[1].rank,name:'葫蘆'};if(fl)return{score:5e6+rk[0]*1e4+rk[1]*1e3+rk[2]*100+rk[3]*10+rk[4],name:'同花'};if(st){const h=(rk[0]===12&&rk[1]===3)?3:rk[0];return{score:4e6+h,name:'順子'};}if(ct[0].count===3)return{score:3e6+ct[0].rank*1e4+ct[1].rank*100+ct[2].rank,name:'三條'};if(ct[0].count===2&&ct[1].count===2){const hp=Math.max(ct[0].rank,ct[1].rank),lp=Math.min(ct[0].rank,ct[1].rank);return{score:2e6+hp*1e4+lp*100+ct[2].rank,name:'兩對'};}if(ct[0].count===2)return{score:1e6+ct[0].rank*1e4+ct[1].rank*100+ct[2].rank*10+ct[3].rank,name:'一對'};return{score:rk[0]*1e4+rk[1]*1e3+rk[2]*100+rk[3]*10+rk[4],name:'高牌'};}
function chkSt(r){const s=[...new Set(r)].sort((a,b)=>b-a);if(s.length<5)return false;return(s[0]-s[4]===4&&s.length===5)||(s[0]===12&&s[1]===3&&s[2]===2&&s[3]===1&&s[4]===0);}
function combo(a,k){const r=[];(function c(s,co){if(co.length===k){r.push([...co]);return;}for(let i=s;i<a.length;i++){co.push(a[i]);c(i+1,co);co.pop();}})(0,[]);return r;}

// 工具
function bet(pi,a){const p=gameState.players[pi],v=Math.min(a,p.chips);p.chips-=v;p.bet+=v;p.totalBet+=v;gameState.pot+=v;if(p.chips<=0)p.allIn=true;}
function collectBets(){for(const p of gameState.players)p.bet=0;}
function nextAP(f){for(let i=1;i<=NUM_PLAYERS;i++){const x=(f+i)%NUM_PLAYERS;if(gameState.players[x].isActive&&!gameState.players[x].folded&&!gameState.players[x].allIn)return x;}for(let i=1;i<=NUM_PLAYERS;i++){const x=(f+i)%NUM_PLAYERS;if(gameState.players[x].isActive&&!gameState.players[x].folded)return x;}return f;}
function firstAP(){return nextAP(gameState.dealerIndex);}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

// 計時
function startTimer(){
    const gs=gameState;gs.turnTimeLeft=TURN_TIME;screens.game._timerC.visible=true;
    gs.turnTimer=setInterval(()=>{
        gs.turnTimeLeft-=0.1;
        const pct=Math.max(0,gs.turnTimeLeft/TURN_TIME);
        timerText.text='你的回合 · '+Math.ceil(gs.turnTimeLeft)+' 秒';
        timerText.style.fill=pct>.3?COLOR.gold3:COLOR.fold;
        timerBar.clear();
        timerBar.beginFill(pct>.3?DS.gold2:DS.fold);
        timerBar.drawRoundedRect(-90,14,180*pct,4,2);timerBar.endFill();
        if(gs.turnTimeLeft<=0){clearTimer();if(gs.currentBet>gs.players[0].bet)onAction('fold');else onAction('check');}
    },100);
}
function clearTimer(){if(gameState.turnTimer){clearInterval(gameState.turnTimer);gameState.turnTimer=null;}if(screens.game?._timerC)screens.game._timerC.visible=false;}

// UI
function clearUI(){
    for(const s of seatUI){
        s.cardsC.removeChildren();s.cardSprites=[];
        s.betC.visible=false;s.betC.removeChildren();
        s.glow.visible=false;s.container.alpha=1;
        if(s.statusC)s.statusC.visible=false;
    }
    for(const c of communityUI){if(c.cardSprite){c.container.removeChild(c.cardSprite);c.cardSprite=null;}c.placeholder.visible=true;}
    hideAB();msgC.visible=false;
}
function updateSeats(){for(let i=0;i<NUM_PLAYERS;i++){const p=gameState.players[i],s=seatUI[i];s.nameT.text=p.name;s.chipsT.text='$ '+p.chips.toLocaleString();if(!p.isActive)s.container.alpha=0.3;else if(p.folded)s.container.alpha=0.4;}}
function updatePot(){potText.text='$ '+gameState.pot.toLocaleString();}
function updateBets(){
    updatePot();
    for(let i=0;i<NUM_PLAYERS;i++){
        const p=gameState.players[i],s=seatUI[i];s.betC.removeChildren();
        if(p.bet>0){
            s.betC.visible=true;
            // 金邊膠囊（bet-stack）
            const txt='$ '+p.bet.toLocaleString();
            const tmp=new PIXI.Text(txt,{fontFamily:FONT_UI,fontSize:10,fontWeight:'700',fill:COLOR.gold3});
            tmp.anchor.set(0.5);
            const w=tmp.width+32,h=18;
            const cap=new PIXI.Graphics();
            cap.beginFill(0x000000,0.6);cap.drawRoundedRect(-w/2,-h/2,w,h,9);cap.endFill();
            cap.lineStyle(1,DS.gold2,0.55);cap.drawRoundedRect(-w/2,-h/2,w,h,9);
            s.betC.addChild(cap);
            // 籌碼小點（設計感）
            const chip=new PIXI.Graphics();
            chip.beginFill(DS.gold2);chip.drawCircle(-w/2+8,0,4);chip.endFill();
            chip.beginFill(0x000000,0.45);chip.drawCircle(-w/2+8,0,2);chip.endFill();
            s.betC.addChild(chip);
            tmp.x=4;s.betC.addChild(tmp);
        }else s.betC.visible=false;
    }
}
function chipKey(a){if(a>=10000)return'chip_10000';if(a>=5000)return'chip_5000';if(a>=1000)return'chip_1000';if(a>=500)return'chip_500';if(a>=100)return'chip_100';if(a>=50)return'chip_50';if(a>=25)return'chip_25';if(a>=10)return'chip_10';return'chip_1';}
function showDealer(){for(let i=0;i<NUM_PLAYERS;i++)seatUI[i].dc.visible=(i===gameState.dealerIndex);}
function setGlow(i){for(let j=0;j<NUM_PLAYERS;j++)seatUI[j].glow.visible=(j===i);}
function showMsg(t){
    msgT.text=t;msgC._bg.clear();
    const w=Math.max(150,msgT.width+40);
    msgC._bg.beginFill(DS.glass,0.92);msgC._bg.drawRoundedRect(-w/2,-16,w,32,16);msgC._bg.endFill();
    msgC._bg.lineStyle(1,DS.gold2,0.5);msgC._bg.drawRoundedRect(-w/2,-16,w,32,16);
    msgC.visible=true;setTimeout(()=>{msgC.visible=false;},800);
}
function pauseGame(){gameState.isPaused=true;clearTimer();screens.pause.visible=true;playSound('button');}
function resumeGame(){gameState.isPaused=false;screens.pause.visible=false;playSound('button');if(gameState.isRunning&&gameState.currentPlayerIndex===0){showAB();startTimer();}else if(gameState.isRunning)schedule(300);}
function backToMenu(){gameState.isRunning=false;gameState.isPaused=false;clearTimer();screens.pause.visible=false;screens.result.visible=false;showScreen('menu');playSound('button');}

init();
