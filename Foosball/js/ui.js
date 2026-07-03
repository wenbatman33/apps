// HTML overlay UI：主選單、選隊、HUD 記分、進球演出、結算
import { TEAMS, getTeam, flagCanvas } from './teams.js';
import { CONFIG } from './config.js';

export class UI {
  constructor() {
    this.$ = id => document.getElementById(id);
    this.pTeam = null; this.aTeam = null;
    this.difficulty = 'normal';
    this.pickingFor = 'P';
    this.mode = 'quick'; // quick 快速對戰 | cup 錦標賽
    this.onStart = null; this.onMenu = null; this.onRematch = null;
    this.onCupBegin = null; this.onBracketNext = null; this.onCupAgain = null;
    this._bracketState = 'preview';
    this._build();
  }

  _build() {
    // 主選單：快速對戰
    this.$('btn-play').addEventListener('click', () => {
      this.mode = 'quick';
      this.pickingFor = 'P'; this.pTeam = null; this.aTeam = null;
      this._renderPicker();
      this._show('screen-teams');
    });
    // 主選單：世界盃錦標賽
    this.$('btn-cup').addEventListener('click', () => {
      this.mode = 'cup';
      this.pickingFor = 'P'; this.pTeam = null; this.aTeam = null;
      this._renderPicker();
      this._show('screen-teams');
    });
    // 賽程表按鈕（開始比賽 / 進入下一輪）
    this.$('btn-bracket-next').addEventListener('click', () => {
      this.onBracketNext && this.onBracketNext(this._bracketState);
    });
    // 冠軍畫面
    this.$('btn-champ-again').addEventListener('click', () => this.onCupAgain && this.onCupAgain());
    this.$('btn-champ-menu').addEventListener('click', () => {
      this._show('screen-menu');
      this.onMenu && this.onMenu();
    });
    // 難度
    document.querySelectorAll('#diff-row button').forEach(b => {
      b.addEventListener('click', () => {
        this.difficulty = b.dataset.d;
        document.querySelectorAll('#diff-row button').forEach(x => x.classList.toggle('on', x === b));
      });
    });
    // 隨機對手
    this.$('btn-random-opp').addEventListener('click', () => {
      const pool = TEAMS.filter(t => t !== this.pTeam);
      this.aTeam = pool[Math.floor(Math.random() * pool.length)];
      this._renderPicker();
    });
    this.$('btn-back-menu').addEventListener('click', () => this._show('screen-menu'));
    this.$('btn-kickoff').addEventListener('click', () => {
      if (this.mode === 'cup') {
        if (!this.pTeam) return;
        this.onCupBegin && this.onCupBegin({ pTeam: this.pTeam, difficulty: this.difficulty });
        return;
      }
      if (!this.pTeam || !this.aTeam) return;
      this._show(null);
      this._hud(true);
      this._updateScore(0, 0);
      this.onStart && this.onStart({ pTeam: this.pTeam, aTeam: this.aTeam, difficulty: this.difficulty });
    });
    // HUD 選單鍵
    this.$('btn-quit').addEventListener('click', () => {
      this._hud(false);
      this._show('screen-menu');
      this.onMenu && this.onMenu();
    });
    // 結算
    this.$('btn-rematch').addEventListener('click', () => {
      this._show(null);
      this._hud(true);
      this._updateScore(0, 0);
      this.onRematch && this.onRematch();
    });
    this.$('btn-result-menu').addEventListener('click', () => {
      this._show('screen-menu');
      this.onMenu && this.onMenu();
    });
  }

  _show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    if (id) this.$(id).classList.remove('hidden');
  }

  // HUD 與一鍵揮桿列同步顯示/隱藏
  _hud(on) {
    this.$('hud').classList.toggle('hidden', !on);
    this.$('kick-bar').classList.toggle('hidden', !on);
  }

  showMenu() { this._hud(false); this._show('screen-menu'); }

  _teamCard(t, selected, onClick) {
    const div = document.createElement('div');
    div.className = 'team-card' + (selected ? ' sel' : '');
    const flag = flagCanvas(t, 96, 64);
    const img = document.createElement('canvas');
    img.width = 96; img.height = 64;
    img.getContext('2d').drawImage(flag, 0, 0);
    img.className = 'flag';
    div.appendChild(img);
    const name = document.createElement('div');
    name.className = 'tname'; name.textContent = t.zh;
    div.appendChild(name);
    div.addEventListener('click', onClick);
    return div;
  }

  _renderPicker() {
    const cup = this.mode === 'cup';
    const grid = this.$('team-grid');
    grid.innerHTML = '';
    const forP = this.pickingFor === 'P';
    this.$('pick-title').textContent = cup ? '選擇你的國家隊 🏆' : (forP ? '選擇你的隊伍' : '選擇對手隊伍');
    this.$('btn-random-opp').classList.toggle('hidden', cup || forP);
    for (const t of TEAMS) {
      const disabled = !cup && !forP && t === this.pTeam;
      const card = this._teamCard(t, forP || cup ? t === this.pTeam : t === this.aTeam, () => {
        if (disabled) return;
        if (cup) { this.pTeam = t; }
        else if (forP) { this.pTeam = t; this.pickingFor = 'A'; }
        else this.aTeam = t;
        this._renderPicker();
      });
      if (disabled) card.classList.add('dis');
      grid.appendChild(card);
    }
    // 已選提示 + 開賽鍵
    const info = this.$('pick-info');
    info.innerHTML = '';
    const mk = (label, t) => {
      const s = document.createElement('span');
      s.className = 'pick-chip';
      if (t) {
        const f = document.createElement('canvas'); f.width = 36; f.height = 24;
        f.getContext('2d').drawImage(flagCanvas(t, 96, 64), 0, 0, 36, 24);
        s.appendChild(f);
        s.appendChild(document.createTextNode(label + t.zh));
      } else s.textContent = label + '—';
      return s;
    };
    info.appendChild(mk('我方：', this.pTeam));
    if (!cup) info.appendChild(mk('對手：', this.aTeam));
    const btn = this.$('btn-kickoff');
    btn.textContent = cup ? '進入賽程 🏆' : '開賽！';
    btn.disabled = cup ? !this.pTeam : !(this.pTeam && this.aTeam);
  }

  _updateScore(p, a) {
    this.$('score-p').textContent = p;
    this.$('score-a').textContent = a;
  }

  setMatchTeams(pTeam, aTeam) {
    const setSide = (side, t) => {
      this.$('name-' + side).textContent = t.zh;
      const c = this.$('flag-' + side);
      c.getContext('2d').clearRect(0, 0, c.width, c.height);
      c.getContext('2d').drawImage(flagCanvas(t, 96, 64), 0, 0, c.width, c.height);
    };
    setSide('p', pTeam); setSide('a', aTeam);
  }

  goalFlash(scorer, game) {
    this._updateScore(game.scoreP, game.scoreA);
    const t = scorer === 'P' ? this.pTeam : this.aTeam;
    const el = this.$('goal-overlay');
    this.$('goal-team').textContent = t ? t.zh + ' 進球！' : '';
    el.classList.remove('hidden');
    el.classList.toggle('opp', scorer === 'A');
    clearTimeout(this._goalTimer);
    this._goalTimer = setTimeout(() => el.classList.add('hidden'), 1500);
  }

  showResult(winner, game) {
    this._hud(false);
    const won = winner === 'P';
    this.$('result-title').textContent = won ? '🏆 你贏了！' : '😢 你輸了';
    this.$('result-score').textContent =
      `${this.pTeam ? this.pTeam.zh : '我方'} ${game.scoreP} : ${game.scoreA} ${this.aTeam ? this.aTeam.zh : '對手'}`;
    this.$('btn-rematch').textContent = '再來一場';
    this._show('screen-result');
  }

  // ---- 錦標賽 ----
  _bkRow(aId, bId, res) {
    const row = document.createElement('div');
    row.className = 'bk-row' + ((aId === this._cupPlayerId || bId === this._cupPlayerId) ? ' me' : '');
    const flag = id => {
      const c = document.createElement('canvas'); c.width = 28; c.height = 19;
      c.getContext('2d').drawImage(flagCanvas(getTeam(id), 96, 64), 0, 0, 28, 19);
      return c;
    };
    const name = (id, right, winner) => {
      const s = document.createElement('span');
      s.className = 'bk-n' + (right ? ' right' : '') + (winner === id ? ' win' : '');
      s.textContent = getTeam(id).zh;
      return s;
    };
    row.appendChild(flag(aId));
    row.appendChild(name(aId, false, res && res.winner));
    const sc = document.createElement('span'); sc.className = 'bk-s';
    sc.textContent = res ? `${res.sa} : ${res.sb}` : 'vs';
    row.appendChild(sc);
    row.appendChild(name(bId, true, res && res.winner));
    row.appendChild(flag(bId));
    return row;
  }

  // state: 'preview' 本輪對戰表（按鈕=開始比賽）| 'results' 本輪賽果（按鈕=進下一輪）
  showBracket(tour, state) {
    this._bracketState = state;
    this._cupPlayerId = tour.playerId;
    this._hud(false);
    const list = this.$('bracket-list');
    list.innerHTML = '';
    if (state === 'preview') {
      this.$('bracket-title').textContent = `🏆 ${tour.roundName()}`;
      this.$('bracket-sub').textContent = `你的隊伍：${getTeam(tour.playerId).zh}・每場 ${Math.round(CONFIG.rules.matchTime / 60)} 分鐘・平手黃金進球`;
      for (const [a, b] of tour.pairs()) list.appendChild(this._bkRow(a, b, null));
      this.$('btn-bracket-next').textContent = tour.roundName() === '決賽' ? '⚽ 開始決賽！' : '⚽ 開始比賽';
    } else {
      this.$('bracket-title').textContent = `${tour.lastRoundName()} 賽果`;
      this.$('bracket-sub').textContent = '獲勝隊伍晉級，休息一下再出發';
      for (const r of tour.lastResults()) list.appendChild(this._bkRow(r.a, r.b, r));
      this.$('btn-bracket-next').textContent = '進入下一輪 ▶';
    }
    this._show('screen-bracket');
  }

  showChampion(team) {
    this._hud(false);
    const c = this.$('champ-flag');
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(flagCanvas(team, 96, 64), 0, 0, c.width, c.height);
    this.$('champ-team').textContent = team.zh;
    this._show('screen-champion');
  }

  showEliminated(roundName, game) {
    this._hud(false);
    this.$('result-title').textContent = `😢 止步 ${roundName}`;
    this.$('result-score').textContent =
      `${this.pTeam.zh} ${game.scoreP} : ${game.scoreA} ${this.aTeam.zh}`;
    this.$('btn-rematch').textContent = '再戰一屆 🏆';
    this._show('screen-result');
  }

  // HUD 計時器（null = 隱藏）
  setTimer(text, golden) {
    const el = this.$('hud-timer');
    if (text === null) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.classList.toggle('golden', !!golden);
    el.textContent = text;
  }
}
