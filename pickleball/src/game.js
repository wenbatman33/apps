// ===== 比賽邏輯：發球 / 回合 / 規則判定 / 玩家操作 / AI 對手 =====
import * as THREE from 'three';
import { COURT, TUNE } from './tune.js';
import { planShot } from './ball.js';

const P_SIDE = 1;   // 玩家在 +z
const A_SIDE = -1;  // AI 在 -z

const rnd = (a, b) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;

export class Game {
  constructor(o) {
    Object.assign(this, o); // scene, arena, ball, player, ai, hud, audio, camera
    this.state = 'title';
    this.score = { p: 0, a: 0 };
    this.server = 'p';
    this.difficulty = 'normal';
    this.assist = true;
    this.timer = 0;
    this.shotIndex = 0;
    this.served = false;
    this.rallyHits = 0;
    this.playerSwing = { timer: 0, aim: 0 };
    this.aiState = { react: 0, target: new THREE.Vector3(), swingCd: 0 };
    this.manual = { x: 0, z: 0, until: 0 };
    this.moveVecP = new THREE.Vector3();
    this.moveVecA = new THREE.Vector3();
    this.hintShown = { rally: false, kitchen: false };
    this.player.pos.set(0, 0, COURT.halfL + 0.6);
    this.ai.pos.set(0, 0, -COURT.halfL - 0.6);
    this.ball.place(0, 0.9, COURT.halfL + 0.2);
    this._tmp = new THREE.Vector3();
  }

  // ---------- 流程 ----------
  startMatch(diff) {
    this.difficulty = diff;
    this.score.p = 0; this.score.a = 0;
    this.server = 'p';
    this.hud.showGame();
    this.hud.setScore(0, 0, 'p');
    this.arena.setScore(0, 0, 'p');
    this.hintShown.rally = false;
    this.setupServe();
  }

  toMenu() {
    this.state = 'title';
    this.hud.showTitle();
    this.hud.showServePrompt(false);
    this.arena.marker.visible = false;
    this.ball.place(0, 0.9, COURT.halfL + 0.2);
  }

  get diffCfg() { return TUNE.ai[this.difficulty]; }

  setupServe() {
    this.state = 'serve';
    this.served = false;
    this.shotIndex = 0;
    this.rallyHits = 0;
    this.timer = 0;
    this.arena.marker.visible = false;
    const sv = this.server;
    const svScore = this.score[sv];
    // 發球者得分為偶數 → 從自己右側發球
    const facing = sv === 'p' ? -1 : 1;
    const rightX = sv === 'p' ? 1 : -1;
    const sx = (svScore % 2 === 0 ? 1 : -1) * rightX;
    this.serveX = sx;
    const svZ = (COURT.halfL + 0.45) * (sv === 'p' ? P_SIDE : A_SIDE);
    const rcZ = (COURT.halfL + 0.35) * (sv === 'p' ? A_SIDE : P_SIDE);
    const serverAth = sv === 'p' ? this.player : this.ai;
    const recvAth = sv === 'p' ? this.ai : this.player;
    serverAth.pos.set(sx * 1.45, 0, svZ);
    recvAth.pos.set(-sx * 1.45, 0, rcZ);
    this.manual.until = 0;
    // 球放在發球者手上
    this._placeBallInHand(serverAth, facing);
    this.hud.showServePrompt(sv === 'p');
    if (sv === 'p') this.hud.hint(this.hintShown.rally ? '' : '點擊畫面發球', 3);
  }

  _placeBallInHand(ath, facing) {
    this.ball.place(ath.pos.x + (ath === this.player ? -0.28 : 0.28), ath.handHeight, ath.pos.z + facing * 0.4);
  }

  // ---------- 輸入 ----------
  /** 點擊（nx: -1..1 螢幕橫向位置） */
  tap(nx) {
    if (this.state === 'serve' && this.server === 'p' && !this.served && this.timer > 0.25) {
      this._serve('p', nx);
      return;
    }
    if (this.state !== 'rally') return;
    if (this.player.swinging && this.playerSwing.timer > 0) return;
    const kind = this.ball.pos.z > this.player.pos.z - 0.2 && this.ball.pos.y > 1.2 ? 'volley' : this.player.pickSwing(this.ball.pos.x);
    this.player.swing(kind);
    this.playerSwing.timer = TUNE.player.swingWindow;
    this.playerSwing.aim = THREE.MathUtils.clamp(nx, -1, 1);
    this.playerSwing.hit = false;
    this.audio.play('swing');
  }

  /** 手動移動（鍵盤/拖曳），dx/dz 為公尺 */
  manualMove(dx, dz) {
    this.manual.x += dx; this.manual.z += dz;
    this.manual.until = 0.6;
  }

  // ---------- 發球 ----------
  _serve(who, nx = 0) {
    this.served = true;
    const ath = who === 'p' ? this.player : this.ai;
    ath.swing('serve');
    this.hud.showServePrompt(false);
    this._pendingServe = { who, nx, t: 0.16 };
  }

  _executeServe(who, nx) {
    const ath = who === 'p' ? this.player : this.ai;
    const sideSign = who === 'p' ? A_SIDE : P_SIDE; // 目標在對面
    const sx = this.serveX;
    // 目標區：對角服務區（x 與發球者相反號），廚房線後
    const boxXmin = 0.5, boxXmax = COURT.halfW - 0.45;
    let tx;
    if (who === 'p') {
      const t = (nx + 1) / 2;                          // 0 左 → 1 右
      const raw = -COURT.halfW + t * COURT.halfW * 2;
      tx = THREE.MathUtils.clamp(raw * -sx, boxXmin, boxXmax) * -sx;
      tx += gauss() * 0.25;
    } else {
      const c = this.diffCfg;
      tx = -sx * rnd(boxXmin + 0.2, boxXmax) + gauss() * c.error * 0.4;
      // 難度越高越常發深
    }
    const depth = who === 'p' ? rnd(0.55, 0.85) : rnd(0.5, 0.92);
    const tz = sideSign * (COURT.kitchen + (COURT.halfL - COURT.kitchen) * depth);
    const from = this.ball.pos.clone();
    from.y = ath.handHeight - 0.05;
    const v = planShot(from, { x: tx, z: tz }, { speed: TUNE.shot.serveSpeed, netClear: 0.3, minFlight: 0.9, maxFlight: 1.5 });
    this.ball.pos.copy(from);
    this.ball.launch(v, who);
    this.state = 'rally';
    this.shotIndex = 0;
    this.timer = 0;
    this.aiState.react = this.diffCfg.react;
    this.audio.play('hit', 0.7);
    if (who === 'p' && !this.hintShown.rally) {
      this.hintShown.rally = true;
      this.hud.hint('球接近時點擊擊球；點畫面左 / 右決定出球方向', 5);
    }
  }

  // ---------- 主更新 ----------
  update(dt) {
    this.timer += dt;
    if (this.state === 'title') {
      this.player.update(dt, null);
      this.ai.update(dt, null);
      return;
    }
    // 發球動作延遲後真正出球
    if (this._pendingServe) {
      this._pendingServe.t -= dt;
      if (this._pendingServe.t <= 0) {
        const s = this._pendingServe; this._pendingServe = null;
        this._executeServe(s.who, s.nx);
      }
    }
    if (this.state === 'serve') {
      if (this.server === 'a' && !this.served && this.timer > TUNE.rules.serveDelay) this._serve('a');
      // 發球前球黏在手上
      if (!this.served || this._pendingServe) {
        const ath = this.server === 'p' ? this.player : this.ai;
        const facing = this.server === 'p' ? -1 : 1;
        this.ball.pos.set(ath.pos.x + (this.server === 'p' ? -0.28 : 0.28), ath.handHeight, ath.pos.z + facing * 0.4);
      }
    }

    // 球物理
    this.ball.step(dt, {
      onBounce: (p, spd) => this._onBounce(p, spd),
      onNet: () => { this.audio.play('net'); },
      onWall: () => { this.audio.play('wall'); },
    });

    if (this.state === 'rally' || this.state === 'serve') {
      this._updatePlayer(dt);
      this._updateAI(dt);
      this._updateMarker();
      this._checkDeadBall(dt);
    } else if (this.state === 'point') {
      this.player.update(dt, null);
      this.ai.update(dt, null);
      if (this.timer > TUNE.rules.pointPause) this._afterPoint();
    } else if (this.state === 'result') {
      this.player.update(dt, null);
      this.ai.update(dt, null);
    }
  }

  // ---------- 落地判定 ----------
  _onBounce(p, spd) {
    this.audio.play('bounce', Math.min(1, spd / 6));
    if (this.state !== 'rally') return;
    const b = this.ball;
    const side = p.z > 0 ? 'p' : 'a';
    const inCourt = Math.abs(p.x) <= COURT.halfW + 0.02 && Math.abs(p.z) <= COURT.halfL + 0.02;
    const hitter = b.lastHitter;
    const other = hitter === 'p' ? 'a' : 'p';
    // (1) 落在擊球者自己那側 → 擊球者失分（含觸網）
    if (side === hitter) {
      this._endPoint(other, b.netHit ? 'NET' : '未過網', b.netHit ? '球觸網' : '');
      return;
    }
    // (2) 第二次落地 → 接球方失分
    if (b.bounces >= 2) {
      this._endPoint(hitter, side === 'p' ? '沒接到' : '得分！', side === 'p' ? '球在你的場地彈了兩次' : '對手來不及回擊');
      return;
    }
    // (3) 出界 → 擊球者失分
    if (!inCourt) {
      this._endPoint(other, 'OUT', hitter === 'p' ? '你的球出界了' : '對手的球出界');
      return;
    }
    // (4) 發球落點檢查
    if (this.shotIndex === 0) {
      const sx = this.serveX;
      if (Math.abs(p.z) < COURT.kitchen + 0.02) { this._endPoint(other, '發球失誤', '發球落入廚房區'); return; }
      if (Math.sign(p.x) === sx && Math.abs(p.x) > 0.06) { this._endPoint(other, '發球失誤', '未落在對角發球區'); return; }
    }
  }

  _checkDeadBall(dt) {
    const b = this.ball;
    if (this.state !== 'rally' || !b.active) { this._deadT = 0; return; }
    if (b.speed < 0.35 && b.pos.y <= TUNE.physics.ballRadius + 0.002) {
      this._deadT = (this._deadT || 0) + dt;
      if (this._deadT > 0.5) {
        const side = b.pos.z > 0 ? 'p' : 'a';
        const loser = side;
        this._endPoint(loser === 'p' ? 'a' : 'p', b.netHit && side === b.lastHitter ? 'NET' : (side === 'p' ? '沒接到' : '得分！'), '');
      }
    } else this._deadT = 0;
    // 球飛太久（保險）
    if (this.timer > 25) this._endPoint(b.lastHitter === 'p' ? 'a' : 'p', '回合結束', '');
  }

  _endPoint(winner, title, sub) {
    if (this.state !== 'rally') return;
    this.state = 'point';
    this.timer = 0;
    this.score[winner]++;
    this.server = winner; // 得分者發球（快節奏規則）
    this.playerSwing.timer = 0;
    this.arena.marker.visible = false;
    this.hud.setScore(this.score.p, this.score.a, this.server);
    this.arena.setScore(this.score.p, this.score.a, this.server);
    const good = winner === 'p';
    this.hud.toast(title, sub, good ? '#7dffb0' : '#ff8a7a', TUNE.rules.pointPause - 0.1);
    this.audio.play('whistle');
  }

  _afterPoint() {
    const R = TUNE.rules;
    const { p, a } = this.score;
    const done = (p >= R.winScore || a >= R.winScore) && Math.abs(p - a) >= R.winBy;
    if (done) {
      this.state = 'result';
      const win = p > a;
      this.hud.showResult(win, p, a);
      this.audio.play(win ? 'win' : 'lose');
      this.ball.active = false;
      return;
    }
    this.setupServe();
  }

  // ---------- 攔截點預測（玩家與 AI 共用） ----------
  /**
   * sideSign: 該選手所在側（+1 玩家 / -1 AI）
   * mustBounce: 依兩彈規則是否必須落地後再打
   * 回傳 { x, z, t, bounced } 或 null
   */
  _intercept(sideSign, mustBounce) {
    const b = this.ball;
    if (!b.active) return null;
    const pred = b.predict(2.8, 1 / 50);
    let volley = null, afterBounce = null, bouncePt = null;
    for (const s of pred.samples) {
      if (s.p.z * sideSign <= 0.15) continue;             // 還沒過網
      const az = Math.abs(s.p.z);
      if (s.bounced === 0) {
        if (!mustBounce && !volley && s.p.y >= 0.55 && s.p.y <= 1.55 && az >= COURT.kitchen + 0.3 && az <= COURT.halfL + 1.6) volley = s;
      } else if (s.bounced === 1) {
        if (!bouncePt) bouncePt = s;
        if (!afterBounce && s.p.y >= 0.5 && s.p.y <= 1.6 && az <= COURT.halfL + 2.2) afterBounce = s;
      }
    }
    // 優先落地後擊球（穩定），若球會直接飛過底線才截擊
    let pick = afterBounce;
    if (!pick && volley) pick = volley;
    if (!pick && bouncePt) pick = bouncePt;
    if (!pick) {
      // 找不到理想點：以底線附近的穿越點為準
      const s = pred.samples.find(s => s.p.z * sideSign >= COURT.halfL - 0.5);
      if (s) pick = s;
    }
    if (!pick) return null;
    return { x: pick.p.x, z: pick.p.z, t: pick.t, bounced: pick.bounced, y: pick.p.y, canVolley: !!volley };
  }

  _mustBounce() { return this.shotIndex < 2; } // 發球與回發球（兩彈規則）

  /** 球尚未落地且預測第一次落點在該側場外 → 值得放掉不接 */
  _willLandOut(sideSign, margin = 0.12) {
    const b = this.ball;
    if (!b.active || b.bounces > 0) return false;
    const fb = b.predict(2.5, 1 / 40).firstBounce;
    if (!fb) return false;
    if (fb.p.z * sideSign <= 0) return false; // 落在對面（會被規則判定）
    return Math.abs(fb.p.x) > COURT.halfW + margin || Math.abs(fb.p.z) > COURT.halfL + margin;
  }

  // ---------- 玩家 ----------
  _updatePlayer(dt) {
    const P = TUNE.player;
    const pl = this.player;
    const b = this.ball;
    const target = this._tmp.set(pl.pos.x, 0, pl.pos.z);
    const incoming = b.active && b.lastHitter === 'a' && this.state === 'rally';
    let assistOn = this.assist && this.manual.until <= 0 && this.state === 'rally';
    if (this.manual.until > 0) this.manual.until -= dt;

    if (this.state === 'rally' && assistOn) {
      if (incoming && this._willLandOut(P_SIDE)) {
        // 預測會出界：不追，退回預備位置（落點標記會顯示紅色）
        target.x = pl.pos.x * 0.8;
        target.z = Math.max(pl.pos.z, P.homeZ);
      } else if (incoming) {
        const ip = this._intercept(P_SIDE, this._mustBounce());
        if (ip) {
          target.x = ip.x - 0.32;                           // 球在身體右側（正手）
          target.z = ip.z + 0.4;
          // 不能提前踏進廚房截擊
          if (ip.bounced === 0) target.z = Math.max(target.z, COURT.kitchen + 0.35);
          else target.z = Math.max(target.z, 0.6);
        }
      } else {
        // 回到預備位置
        target.x = pl.pos.x * 0.6;
        target.z = Math.max(P.homeZ, pl.pos.z - 1.2 * dt); // 慢慢退
        target.z = P.homeZ;
      }
    } else if (this.state === 'rally' || this.state === 'serve') {
      target.x = pl.pos.x + this.manual.x;
      target.z = pl.pos.z + this.manual.z;
    }
    this.manual.x = 0; this.manual.z = 0;
    // 發球狀態：發球者不動、接球者可微調
    if (this.state === 'serve' && this.server === 'p') { target.copy(pl.pos); }

    target.x = THREE.MathUtils.clamp(target.x, -COURT.halfW - 1.6, COURT.halfW + 1.6);
    target.z = THREE.MathUtils.clamp(target.z, 0.45, COURT.halfL + 2.2);
    const dx = target.x - pl.pos.x, dz = target.z - pl.pos.z;
    const d = Math.hypot(dx, dz);
    const step = Math.min(d, P.speed * dt);
    if (d > 0.01) {
      pl.pos.x += dx / d * step; pl.pos.z += dz / d * step;
      this.moveVecP.set(dx / d * step / dt, 0, dz / d * step / dt);
    } else this.moveVecP.set(0, 0, 0);
    pl.update(dt, this.moveVecP);

    // 揮拍命中判定
    if (this.playerSwing.timer > 0) {
      this.playerSwing.timer -= dt;
      if (!this.playerSwing.hit && b.active && b.lastHitter !== 'p' && b.bounces < 2 && this.state === 'rally') {
        const rx = b.pos.x - pl.pos.x, rz = b.pos.z - pl.pos.z;
        const inReach = Math.abs(rx) <= P.reachX && rz >= -(P.reachZ + P.contactAhead) && rz <= 0.55 && b.pos.y < 2.2;
        if (inReach) {
          if (this._mustBounce() && b.bounces === 0) {
            if (!this.hintShown.kitchen) { this.hud.hint('兩彈規則：發球與回發球要先讓球落地再打', 3.5); this.hintShown.kitchen = true; }
          } else if (b.bounces === 0 && pl.pos.z < COURT.kitchen) {
            this.playerSwing.hit = true;
            this._endPoint('a', '廚房違例', '站在非截擊區不能直接截擊');
          } else {
            this.playerSwing.hit = true;
            const quality = 1 - Math.min(1, Math.abs(rz + P.contactAhead) / (P.reachZ + 0.35));
            this._playerHit(quality);
          }
        }
      }
    }
  }

  _playerHit(quality) {
    const S = TUNE.shot, P = TUNE.player;
    const b = this.ball, pl = this.player;
    const aim = this.playerSwing.aim;
    const err = (1 - quality) * P.aimError;
    let tx = aim * S.aimHalfW + gauss() * err;
    let depth = THREE.MathUtils.lerp(S.depthWorst, S.depthPerfect, quality) + gauss() * (0.04 + (1 - quality) * 0.22);
    let speed = S.driveSpeed * (0.82 + 0.28 * quality);
    let netClear = S.netClear;
    // 網前低球 → 小球（dink）
    const dink = pl.pos.z < COURT.kitchen + 0.9 && b.pos.y < 0.7;
    if (dink) { depth = rnd(0.05, 0.3); speed = S.lobSpeed; netClear = 0.12; }
    const tz = A_SIDE * (COURT.kitchen + (COURT.halfL - COURT.kitchen) * depth);
    tx = THREE.MathUtils.clamp(tx, -COURT.halfW - 0.6, COURT.halfW + 0.6);
    const v = planShot(b.pos, { x: tx, z: tz }, { speed, netClear });
    b.launch(v, 'p');
    this.shotIndex++;
    this.rallyHits++;
    this.aiState.react = this.diffCfg.react + rnd(0, 0.08);
    this.aiState.posErr = gauss() * this.diffCfg.posErr + (Math.random() < 0.5 ? -1 : 1) * this.diffCfg.posErr * 0.35;
    this.aiState.hitT = this.timer;
    this.audio.play('hit', 0.6 + quality * 0.5);
    this.arena.marker.visible = false;
    if (quality > 0.85 && !dink) this.hud.toast('完美擊球', '', '#ffd23f', 0.7);
  }

  // ---------- AI ----------
  _updateAI(dt) {
    const c = this.diffCfg;
    const ai = this.ai, b = this.ball;
    const target = this._tmp.set(ai.pos.x, 0, ai.pos.z);
    const incoming = b.active && b.lastHitter === 'p' && this.state === 'rally';
    if (this.aiState.react > 0) this.aiState.react -= dt;
    if (this.aiState.swingCd > 0) this.aiState.swingCd -= dt;

    if (this.state === 'rally') {
      if (incoming && this._willLandOut(A_SIDE, 0.08)) {
        target.x = ai.pos.x * 0.8;
        target.z = Math.min(ai.pos.z, TUNE.ai.homeZ);
      } else if (incoming && this.aiState.react <= 0) {
        const ip = this._intercept(A_SIDE, this._mustBounce());
        if (ip) {
          // 預判誤差：球越接近誤差越小（模擬看球修正）
          const remain = THREE.MathUtils.lerp(TUNE.ai.residual, 1, THREE.MathUtils.clamp(ip.t / 0.9, 0, 1));
          target.x = ip.x + 0.32 + (this.aiState.posErr || 0) * remain * this._fatigue();           // AI 右側為 -x → 身體站在球的 +x 側
          target.z = ip.z - 0.4;
          if (ip.bounced === 0) target.z = Math.min(target.z, -(COURT.kitchen + 0.35));
          else target.z = Math.min(target.z, -0.6);
        }
      } else if (!incoming) {
        target.x = ai.pos.x * 0.7;
        target.z = TUNE.ai.homeZ;
      }
    } else if (this.state === 'serve') {
      target.copy(ai.pos);
    }
    target.x = THREE.MathUtils.clamp(target.x, -COURT.halfW - 1.6, COURT.halfW + 1.6);
    target.z = THREE.MathUtils.clamp(target.z, -COURT.halfL - 2.2, -0.45);
    const dx = target.x - ai.pos.x, dz = target.z - ai.pos.z;
    const d = Math.hypot(dx, dz);
    const step = Math.min(d, c.speed * dt);
    if (d > 0.01) {
      ai.pos.x += dx / d * step; ai.pos.z += dz / d * step;
      this.moveVecA.set(dx / d * step / dt, 0, dz / d * step / dt);
    } else this.moveVecA.set(0, 0, 0);
    ai.update(dt, this.moveVecA);

    // AI 擊球
    if (incoming && b.bounces < 2 && this.aiState.swingCd <= 0) {
      const rx = b.pos.x - ai.pos.x, rz = b.pos.z - ai.pos.z;
      const P = TUNE.player;
      const inReach = Math.abs(rx) <= P.reachX * c.reach && rz <= (P.reachZ + P.contactAhead) && rz >= -0.55 && b.pos.y < 2.2;
      const allowed = !(this._mustBounce() && b.bounces === 0) && !(b.bounces === 0 && ai.pos.z > -COURT.kitchen) && !this._willLandOut(A_SIDE, 0.08);
      if (inReach && allowed) {
        // 時機：球到理想擊球點附近才揮（越接近越好），或球快跑掉
        const ideal = Math.abs(rz - P.contactAhead) < 0.45 || b.vel.z < 0 && rz < 0.1;
        if (ideal) {
          this.aiState.swingCd = 0.5;
          ai.swing(b.pos.y > 1.2 && b.bounces === 0 ? 'volley' : ai.pickSwing(b.pos.x));
          // 擊球品質：離理想位置越遠、跑越快 → 越差
          const posQ = 1 - Math.min(1, Math.abs(rx + 0.32) / (P.reachX * c.reach)); // AI 右手在 -x 側
          const runQ = 1 - Math.min(1, this.moveVecA.length() / 7);
          this._aiHit(THREE.MathUtils.clamp(posQ * 0.6 + runQ * 0.4, 0, 1));
        }
      }
    }
  }

  /** 回合越長 AI 越容易失誤，保證回合會結束 */
  _fatigue() {
    const over = Math.max(0, this.rallyHits - TUNE.ai.fatigueAfter);
    return 1 + over * TUNE.ai.fatigueRate;
  }

  _aiHit(quality = 1) {
    const c = this.diffCfg, S = TUNE.shot;
    const b = this.ball, ai = this.ai, pl = this.player;
    const miss = Math.random() < c.missRate;
    let tx;
    if (Math.random() < c.corner) {
      // 打玩家反方向的角落
      const away = pl.pos.x > 0 ? -1 : 1;
      tx = away * rnd(1.4, S.aimHalfW);
    } else tx = rnd(-1.6, 1.6);
    const fat = this._fatigue();
    tx += gauss() * c.error * (0.6 + (1 - quality) * 1.6) * fat;
    let depth = rnd(0.55, 0.9) + gauss() * (0.04 + (1 - quality) * 0.28) * fat;
    let speed = S.driveSpeed * c.power * rnd(0.85, 1.05) * (0.85 + 0.15 * quality);
    let netClear = S.netClear;
    const dink = ai.pos.z > -(COURT.kitchen + 0.9) && b.pos.y < 0.7;
    if (dink) { depth = rnd(0.05, 0.3); speed = S.lobSpeed; netClear = 0.12; }
    if (miss) {
      if (Math.random() < 0.5) tx += Math.sign(tx || 1) * rnd(1.2, 2.2); // 出界
      else netClear = -0.25;                                            // 掛網
    }
    const tz = P_SIDE * (COURT.kitchen + (COURT.halfL - COURT.kitchen) * depth);
    const v = planShot(b.pos, { x: tx, z: tz }, { speed, netClear });
    b.launch(v, 'a');
    this.shotIndex++;
    this.rallyHits++;
    this.audio.play('hit', 0.8);
  }

  // ---------- 落點標記 ----------
  _updateMarker() {
    const b = this.ball, m = this.arena.marker;
    if (!(this.state === 'rally' && b.active && b.lastHitter === 'a' && b.bounces === 0)) { m.visible = false; return; }
    const pred = b.predict(2.5, 1 / 40);
    const fb = pred.firstBounce;
    if (fb && fb.p.z > 0) {
      m.visible = true;
      m.position.x = fb.p.x; m.position.z = fb.p.z;
      const inC = Math.abs(fb.p.x) <= COURT.halfW && Math.abs(fb.p.z) <= COURT.halfL;
      m.material.color.set(inC ? 0xffd23f : 0xff5a3c);
      const s = 1 + Math.sin(performance.now() / 120) * 0.08;
      m.scale.setScalar(s);
    } else m.visible = false;
  }
}
