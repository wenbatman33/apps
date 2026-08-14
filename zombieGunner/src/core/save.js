/* ============================================================
 * 存檔（localStorage）：關卡進度、金幣、永久強化
 * ============================================================ */
(function (H) {
  'use strict';

  var KEY = 'habby_zombie_gunner_v1';

  var DEFAULT = {
    coin: 0,
    progress: { 1: 1, 2: 0, 3: 0 },   // 各章「已解鎖到第幾關」，0 = 尚未解鎖章節
    best: { 1: 0, 2: 0, 3: 0 },       // 各章最高通關數
    perm: { hp: 0, atk: 0, rate: 0, spd: 0, crit: 0, ls: 0 },
    sound: true,
    music: true,
  };

  var data = null;

  H.Save = {
    load: function () {
      if (data) return data;
      try {
        var raw = localStorage.getItem(KEY);
        data = raw ? Object.assign({}, DEFAULT, JSON.parse(raw)) : JSON.parse(JSON.stringify(DEFAULT));
        data.progress = Object.assign({}, DEFAULT.progress, data.progress);
        data.best = Object.assign({}, DEFAULT.best, data.best);
        data.perm = Object.assign({}, DEFAULT.perm, data.perm);
      } catch (e) {
        data = JSON.parse(JSON.stringify(DEFAULT));
      }
      return data;
    },
    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.load())); } catch (e) {}
    },
    get: function () { return this.load(); },

    /** 通關後更新進度 */
    clearLevel: function (ch, lv, coin) {
      var d = this.load();
      d.coin += coin;
      if (lv > d.best[ch]) d.best[ch] = lv;
      if (lv >= d.progress[ch]) d.progress[ch] = Math.min(H.LEVELS_PER_CHAPTER, lv + 1);
      // 打完一章最後一關 → 解鎖下一章
      if (lv >= H.LEVELS_PER_CHAPTER && ch < 3 && d.progress[ch + 1] === 0) d.progress[ch + 1] = 1;
      this.save();
    },

    isUnlocked: function (ch, lv) {
      var d = this.load();
      return d.progress[ch] > 0 && lv <= d.progress[ch];
    },

    /** 永久強化：等級 → 花費 */
    permCost: function (k) {
      var d = this.load();
      return Math.floor(60 * Math.pow(1.35, d.perm[k] || 0));
    },
    buyPerm: function (k) {
      var d = this.load();
      var c = this.permCost(k);
      if (d.coin < c) return false;
      d.coin -= c; d.perm[k] = (d.perm[k] || 0) + 1;
      this.save();
      return true;
    },

    reset: function () {
      data = JSON.parse(JSON.stringify(DEFAULT));
      this.save();
    },
  };

  H.PERM_INFO = [
    { k: 'hp', name: '體質', desc: '最大生命 +12', icon: '♥', color: 0x4dff7d },
    { k: 'atk', name: '火力', desc: '攻擊力 +6%', icon: '▲', color: 0xff6b3d },
    { k: 'rate', name: '射速', desc: '攻速 +2.5%', icon: '≫', color: 0xffc93d },
    { k: 'spd', name: '身法', desc: '移速 +2%', icon: '»', color: 0x7dd3ff },
    { k: 'crit', name: '暴擊', desc: '暴擊率 +1%', icon: '✦', color: 0xffe14d },
    { k: 'ls', name: '吸血', desc: '吸血 +1%', icon: '❤', color: 0xff3d6b },
  ];
})(window.HABBY);
