/* 存檔：關卡進度、星星、最高分 */
window.TD = window.TD || {};

TD.Save = class Save {
  constructor() {
    this.key = 'troyDefense.save.v1';
    this.data = this.load();
  }
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { levels: {}, heroes: ['hector', 'paris'], unlocked: 1, sound: true };
  }
  flush() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {}
  }
  record(levelId, stars, score) {
    const L = this.data.levels[levelId] || { stars: 0, best: 0 };
    L.stars = Math.max(L.stars, stars);
    L.best = Math.max(L.best, score);
    this.data.levels[levelId] = L;
    if (stars > 0) this.data.unlocked = Math.max(this.data.unlocked, Math.min(10, levelId + 1));
    this.flush();
  }
  starsOf(id) { return (this.data.levels[id] || {}).stars || 0; }
  bestOf(id) { return (this.data.levels[id] || {}).best || 0; }
  totalStars() {
    return Object.values(this.data.levels).reduce((a, l) => a + (l.stars || 0), 0);
  }
  setHeroes(h) { this.data.heroes = h; this.flush(); }
  heroUnlocked(key) {
    const H = TD.HEROES[key];
    return this.data.unlocked >= (H.unlock || 1);
  }
};

TD.save = new TD.Save();
