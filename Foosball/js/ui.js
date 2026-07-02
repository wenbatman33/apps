// HTML overlay UI：主選單、選隊、HUD 記分、進球演出、結算
import { TEAMS, flagCanvas } from './teams.js';
import { CONFIG } from './config.js';

export class UI {
  constructor() {
    this.$ = id => document.getElementById(id);
    this.pTeam = null; this.aTeam = null;
    this.difficulty = 'normal';
    this.pickingFor = 'P';
    this.onStart = null; this.onMenu = null; this.onRematch = null;
    this._build();
  }

  _build() {
    // 主選單
    this.$('btn-play').addEventListener('click', () => {
      this.pickingFor = 'P'; this.pTeam = null; this.aTeam = null;
      this._renderPicker();
      this._show('screen-teams');
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
      if (!this.pTeam || !this.aTeam) return;
      this._show(null);
      this.$('hud').classList.remove('hidden');
      this._updateScore(0, 0);
      this.onStart && this.onStart({ pTeam: this.pTeam, aTeam: this.aTeam, difficulty: this.difficulty });
    });
    // HUD 選單鍵
    this.$('btn-quit').addEventListener('click', () => {
      this.$('hud').classList.add('hidden');
      this._show('screen-menu');
      this.onMenu && this.onMenu();
    });
    // 結算
    this.$('btn-rematch').addEventListener('click', () => {
      this._show(null);
      this.$('hud').classList.remove('hidden');
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

  showMenu() { this.$('hud').classList.add('hidden'); this._show('screen-menu'); }

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
    const grid = this.$('team-grid');
    grid.innerHTML = '';
    const forP = this.pickingFor === 'P';
    this.$('pick-title').textContent = forP ? '選擇你的隊伍' : '選擇對手隊伍';
    this.$('btn-random-opp').classList.toggle('hidden', forP);
    for (const t of TEAMS) {
      const disabled = !forP && t === this.pTeam;
      const card = this._teamCard(t, forP ? t === this.pTeam : t === this.aTeam, () => {
        if (disabled) return;
        if (forP) { this.pTeam = t; this.pickingFor = 'A'; }
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
    info.appendChild(mk('對手：', this.aTeam));
    this.$('btn-kickoff').disabled = !(this.pTeam && this.aTeam);
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
    this.$('hud').classList.add('hidden');
    const won = winner === 'P';
    this.$('result-title').textContent = won ? '🏆 你贏了！' : '😢 你輸了';
    this.$('result-score').textContent =
      `${this.pTeam ? this.pTeam.zh : '我方'} ${game.scoreP} : ${game.scoreA} ${this.aTeam ? this.aTeam.zh : '對手'}`;
    this._show('screen-result');
  }
}
