// ===== 遊戲 UI：標題畫面 / 比賽 HUD / 結算，全部由 UILayer（引擎渲染）產生 =====
import * as THREE from 'three';
import { UILayer, makeText, makeRect, makeButton } from './ui.js';
import { TUNE } from './tune.js';

const DIFF_LABEL = { easy: '簡單', normal: '普通', hard: '困難' };

export class HUD {
  constructor(renderer, canvas, isMobile, cb) {
    this.layer = new UILayer(renderer, canvas);
    this.isMobile = isMobile;
    this.layoutKey = isMobile ? 'mobile' : 'pc';
    this.cb = cb;
    this.difficulty = 'normal';
    this.assist = true;
    this.w = 1; this.h = 1;
    this.toasts = [];
    this._buildTitle();
    this._buildGame();
    this._buildResult();
    this._buildGlobal();
    this.showTitle();
  }

  get L() { return TUNE.hud[this.layoutKey]; }

  // ---------- 標題 ----------
  _buildTitle() {
    const g = new THREE.Group();
    this.title = g;
    this.layer.scene.add(g);
    const big = this.isMobile ? 54 : 78;
    this._bigBase = big;
    g.add(this._t1 = makeText({ text: 'PICKLEBALL', size: big, weight: 900, gradient: ['#fff7d6', '#ffd23f', '#ff9f1c'], letter: 4, stroke: 'rgba(20,20,40,0.9)', strokeW: 6, shadow: { color: 'rgba(0,0,0,.55)', blur: 22, dy: 8 }, order: 5 }));
    g.add(this._t2 = makeText({ text: 'ARENA 3D', size: big * 0.36, weight: 800, color: '#eaf2ff', letter: 10, shadow: { color: 'rgba(0,0,0,.6)', blur: 12, dy: 3 }, order: 5 }));
    g.add(this._t3 = makeText({ text: '室內匹克球・單打對戰', size: this.isMobile ? 15 : 17, weight: 700, color: '#eaf2ff', letter: 4, stroke: 'rgba(10,14,24,.85)', strokeW: 4, order: 5 }));

    // 難度選擇
    this.diffBtns = {};
    const dw = this.isMobile ? 92 : 108;
    ['easy', 'normal', 'hard'].forEach((k, i) => {
      const b = makeButton(this.layer, {
        label: DIFF_LABEL[k], w: dw, h: 44, size: 16, radius: 22,
        fill: ['#3a4a66', '#242f44'], glow: { color: 'rgba(0,0,0,.35)', blur: 10, dy: 3 }, order: 6,
        onTap: () => { this.cb.onUI?.(); this.setDifficulty(k); },
      });
      b.position.x = (i - 1) * (dw + 12);
      g.add(b);
      this.diffBtns[k] = b;
    });
    this._diffLabel = makeText({ text: '對手強度', size: 14, weight: 700, color: '#dfe7f3', letter: 3, stroke: 'rgba(10,14,24,.85)', strokeW: 4, order: 5 });
    g.add(this._diffLabel);

    this.startBtn = makeButton(this.layer, {
      label: '開始比賽', w: this.isMobile ? 240 : 280, h: 60, size: 22, radius: 30,
      fill: ['#4fe08a', '#1f9d4e'], glow: { color: 'rgba(60,220,120,.45)', blur: 18, dy: 4 }, order: 6,
      onTap: () => { this.cb.onUI?.(); this.cb.onStart?.(this.difficulty); },
    });
    g.add(this.startBtn);

    this.assistBtn = makeButton(this.layer, {
      label: '自動跑位：開', w: 170, h: 40, size: 14, radius: 20,
      fill: ['#2b3a55', '#1a2436'], stroke: 'rgba(255,255,255,.18)', glow: { color: 'rgba(0,0,0,.3)', blur: 8, dy: 2 }, order: 6,
      onTap: () => { this.cb.onUI?.(); this.setAssist(!this.assist); },
    });
    g.add(this.assistBtn);

    const ctrl = this.isMobile
      ? '點一下畫面 ＝ 擊球　點左 / 右 ＝ 出球方向\n拖曳 ＝ 手動移動'
      : '點擊 / 空白鍵 ＝ 擊球　點擊左右 ＝ 出球方向\nA D 或 ← → ＝ 手動移動　D 鍵 ＝ 開發者工具';
    g.add(this._ctrl = makeText({ text: ctrl, size: this.isMobile ? 13 : 14, weight: 700, color: '#dfe7f3', lineHeight: 1.7, stroke: 'rgba(10,14,24,.85)', strokeW: 4, order: 5 }));
    this.setDifficulty('normal');
  }

  setDifficulty(k) {
    this.difficulty = k;
    for (const [key, b] of Object.entries(this.diffBtns)) {
      const on = key === k;
      b.userData.bg.material.opacity = on ? 1 : 0.55;
      b.userData.label.material.color.set(on ? '#ffffff' : '#c8d2e0');
      // 選中：換成亮色底
      if (on && !b.userData.hi) {
        const hi = makeRect({ w: b.userData.hitW - 16, h: 44, fill: ['#5f8dff', '#2d55d8'], radius: 22, glow: { color: 'rgba(80,120,255,.5)', blur: 14 }, order: 6, topLight: true });
        hi.renderOrder = 6;
        b.add(hi); b.userData.hi = hi;
        b.userData.label.renderOrder = 7;
      }
      if (b.userData.hi) b.userData.hi.visible = on;
    }
  }

  setAssist(v) {
    this.assist = v;
    this.assistBtn.userData.label.userData.setText(`自動跑位：${v ? '開' : '關'}`);
    this.cb.onAssist?.(v);
  }

  // ---------- 比賽 HUD ----------
  _buildGame() {
    const g = new THREE.Group();
    this.game = g;
    this.layer.scene.add(g);
    // 計分板
    this.score = new THREE.Group();
    const plateW = 250, plateH = 56;
    this.score.add(makeRect({ w: plateW, h: plateH, fill: ['rgba(14,18,28,.88)', 'rgba(8,10,16,.88)'], stroke: 'rgba(255,255,255,.14)', radius: 28, glow: { color: 'rgba(0,0,0,.4)', blur: 12, dy: 4 }, order: 4 }));
    this._youLabel = makeText({ text: '你', size: 14, weight: 700, color: '#8fc4ff', letter: 1, order: 5 });
    this._youLabel.position.x = -plateW / 2 + 40;
    this._cpuLabel = makeText({ text: '電腦', size: 14, weight: 700, color: '#ffb08f', letter: 1, order: 5 });
    this._cpuLabel.position.x = plateW / 2 - 40;
    this._scoreText = makeText({ text: '0 : 0', size: 28, weight: 900, color: '#ffffff', letter: 2, shadow: { color: 'rgba(0,0,0,.5)', blur: 6, dy: 2 }, order: 5 });
    this.score.add(this._youLabel, this._cpuLabel, this._scoreText);
    // 發球指示（小圓點）
    this._serveDot = makeRect({ w: 10, h: 10, fill: '#ffd23f', radius: 5, glow: { color: 'rgba(255,210,63,.8)', blur: 6 }, order: 6 });
    this.score.add(this._serveDot);
    g.add(this.score);
    this.score.userData.devName = 'score';

    // 選單按鈕
    this.menuBtn = makeButton(this.layer, {
      label: '≡', w: 44, h: 44, size: 22, radius: 22, fill: ['rgba(30,36,50,.9)', 'rgba(12,14,22,.9)'],
      stroke: 'rgba(255,255,255,.15)', glow: { color: 'rgba(0,0,0,.35)', blur: 8, dy: 2 }, order: 6,
      onTap: () => { this.cb.onUI?.(); this.cb.onMenu?.(); },
    });
    g.add(this.menuBtn);

    // 提示
    this.hintText = makeText({ text: '', size: this.isMobile ? 15 : 16, weight: 700, color: '#eaf2ff', stroke: 'rgba(0,0,0,.6)', strokeW: 4, order: 5 });
    this.hintText.userData.devName = 'hint';
    g.add(this.hintText);
    this.hintTimer = 0;

    // 中央訊息（toast）
    this.toastGroup = new THREE.Group();
    this.toastGroup.userData.devName = 'toast';
    g.add(this.toastGroup);
    this.toastText = makeText({ text: '', size: this.isMobile ? 36 : 44, weight: 900, color: '#fff', letter: 3, stroke: 'rgba(0,0,0,.75)', strokeW: 7, shadow: { color: 'rgba(0,0,0,.5)', blur: 14, dy: 4 }, order: 7 });
    this.toastSub = makeText({ text: '', size: this.isMobile ? 15 : 17, weight: 700, color: '#ffe8b0', stroke: 'rgba(0,0,0,.7)', strokeW: 4, order: 7 });
    this.toastSub.position.y = -38;
    this.toastGroup.add(this.toastText, this.toastSub);
    this.toastTimer = 0;
    this.toastGroup.visible = false;

    // 發球提示（大字，閃爍）
    this.serveText = makeText({ text: '點擊發球', size: this.isMobile ? 22 : 24, weight: 800, color: '#ffd23f', stroke: 'rgba(0,0,0,.7)', strokeW: 5, letter: 2, order: 6 });
    this.serveText.visible = false;
    g.add(this.serveText);
  }

  setScore(p, a, server) {
    this._scoreText.userData.setText(`${p} : ${a}`);
    this._serveDot.position.x = server === 'p' ? -250 / 2 + 14 : 250 / 2 - 14;
  }

  toast(text, sub = '', color = '#ffffff', dur = 1.4) {
    this.toastText.userData.setText(text);
    this.toastText.material.color.set('#ffffff');
    this.toastSub.userData.setText(sub);
    this.toastSub.visible = !!sub;
    this.toastGroup.visible = true;
    this.toastGroup.scale.setScalar(0.6);
    this.toastTimer = dur;
    this._toastColor = color;
    // 顏色：用 material.color 乘上白字
    this.toastText.material.color.set(color);
  }

  hint(text, dur = 4) {
    this.hintText.userData.setText(text);
    this.hintText.visible = true;
    this.hintText.material.opacity = 1;
    this.hintTimer = dur;
  }

  showServePrompt(v) { this.serveText.visible = v; }

  // ---------- 全域按鈕：靜音（所有畫面都看得到） ----------
  _buildGlobal() {
    this.muted = false;
    this.muteBtn = makeButton(this.layer, {
      label: '🔊', w: 44, h: 44, size: 20, radius: 22, fill: ['rgba(30,36,50,.9)', 'rgba(12,14,22,.9)'],
      stroke: 'rgba(255,255,255,.15)', glow: { color: 'rgba(0,0,0,.35)', blur: 8, dy: 2 }, order: 12,
      onTap: () => { this.setMuted(!this.muted); this.cb.onMute?.(this.muted); if (!this.muted) this.cb.onUI?.(); },
    });
    this.layer.scene.add(this.muteBtn);
  }
  setMuted(v) {
    this.muted = v;
    this.muteBtn.userData.label.userData.setText(v ? '🔇' : '🔊');
    this.muteBtn.userData.bg.material.opacity = v ? 0.7 : 1;
  }

  // ---------- 結算 ----------
  _buildResult() {
    const g = new THREE.Group();
    this.result = g;
    this.layer.scene.add(g);
    const w = this.isMobile ? 300 : 380, h = this.isMobile ? 300 : 320;
    g.add(makeRect({ w, h, fill: ['rgba(18,24,38,.94)', 'rgba(8,10,18,.96)'], stroke: 'rgba(255,255,255,.16)', radius: 24, glow: { color: 'rgba(0,0,0,.5)', blur: 30, dy: 10 }, order: 8 }));
    this._resTitle = makeText({ text: '你贏了！', size: this.isMobile ? 36 : 42, weight: 900, gradient: ['#fff7d6', '#ffd23f'], letter: 3, shadow: { color: 'rgba(0,0,0,.5)', blur: 10, dy: 3 }, order: 9 });
    this._resTitle.position.y = h / 2 - 62;
    this._resScore = makeText({ text: '11 : 7', size: this.isMobile ? 46 : 54, weight: 900, color: '#fff', letter: 4, order: 9 });
    this._resScore.position.y = h / 2 - 130;
    this._resSub = makeText({ text: '', size: 15, weight: 600, color: '#9fb0c8', order: 9 });
    this._resSub.position.y = h / 2 - 175;
    this.againBtn = makeButton(this.layer, {
      label: '再來一局', w: w - 80, h: 52, size: 19, radius: 26, fill: ['#4fe08a', '#1f9d4e'], glow: { color: 'rgba(60,220,120,.4)', blur: 14, dy: 3 }, order: 10,
      onTap: () => { this.cb.onUI?.(); this.cb.onStart?.(this.difficulty); },
    });
    this.againBtn.position.y = -h / 2 + 108;
    this.homeBtn = makeButton(this.layer, {
      label: '回主選單', w: w - 80, h: 46, size: 16, radius: 23, fill: ['#3a4a66', '#242f44'], glow: { color: 'rgba(0,0,0,.3)', blur: 10, dy: 3 }, order: 10,
      onTap: () => { this.cb.onUI?.(); this.cb.onMenu?.(); },
    });
    this.homeBtn.position.y = -h / 2 + 46;
    g.add(this._resTitle, this._resScore, this._resSub, this.againBtn, this.homeBtn);
    g.visible = false;
  }

  showTitle() { this.title.visible = true; this.game.visible = false; this.result.visible = false; }
  showGame() { this.title.visible = false; this.game.visible = true; this.result.visible = false; this.toastGroup.visible = false; }
  showResult(win, p, a) {
    this.result.visible = true;
    this.game.visible = true;
    this._resTitle.userData.setText(win ? '你贏了！' : '再接再厲');
    this._resScore.userData.setText(`${p} : ${a}`);
    this._resSub.userData.setText(win ? `擊敗${DIFF_LABEL[this.difficulty]}對手` : `對手強度：${DIFF_LABEL[this.difficulty]}`);
    this.serveText.visible = false;
  }

  // ---------- 版面 ----------
  resize(w, h) {
    this.w = w; this.h = h;
    this.layer.resize(w, h);
    this.layout();
  }

  layout() {
    const L = this.L, w = this.w, h = this.h;
    const top = h / 2, left = -w / 2;
    // 標題畫面：以 640 高的虛擬版面排版，整組依視窗縮放（矮/窄視窗不重疊）
    const ts = Math.min(1, h / 640, w / 600);
    this.title.scale.setScalar(ts);
    const vTop = (h / 2) / ts;                 // 縮放後座標系的上緣
    const vBot = -vTop;
    this._t1.position.y = vTop - 118;
    this._t2.position.y = vTop - 176;
    this._t3.position.y = vTop - 214;
    const dY = vTop - 300;
    this._diffLabel.position.y = dY + 40;
    for (const b of Object.values(this.diffBtns)) b.position.y = dY;
    this.startBtn.position.y = dY - 88;
    this.assistBtn.position.y = dY - 150;
    this._ctrl.position.y = Math.min(dY - 214, vBot + 52);
    const titleScale = Math.min(1, (w / ts - 40) / (this._bigBase * 8.2));
    this._t1.scale.setScalar(titleScale);
    this._t2.scale.setScalar(Math.max(0.7, titleScale));
    // HUD
    this.score.position.set(0, top + L.scoreY, 0);
    this.score.scale.setScalar(L.scoreScale);
    this.menuBtn.position.set(left + L.menuX, top + L.menuY, 0);
    this.muteBtn.position.set(-left - L.menuX, top + L.menuY, 0);
    this.hintText.position.set(0, -top + L.hintY, 0);
    this.toastGroup.position.set(0, L.toastY, 0);
    this.serveText.position.set(0, -top + L.hintY + 48, 0);
  }

  update(dt) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      const s = this.toastGroup.scale.x;
      this.toastGroup.scale.setScalar(s + (1 - s) * Math.min(1, dt * 14));
      const fade = Math.min(1, this.toastTimer / 0.3);
      this.toastText.material.opacity = fade;
      this.toastSub.material.opacity = fade;
      if (this.toastTimer <= 0) this.toastGroup.visible = false;
    }
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      this.hintText.material.opacity = Math.min(1, this.hintTimer / 0.5);
      if (this.hintTimer <= 0) this.hintText.visible = false;
    }
    if (this.serveText.visible) {
      this.serveText.material.opacity = 0.7 + 0.3 * Math.sin(performance.now() / 180);
    }
    // 標題微動
    if (this.title.visible) {
      this._t1.rotation.z = Math.sin(performance.now() / 900) * 0.01;
    }
  }

  pointerDown(x, y) { return this.layer.pointerDown(x, y); }
  pointerUp(x, y) { return this.layer.pointerUp(x, y); }
  render() { this.layer.render(); }
}
