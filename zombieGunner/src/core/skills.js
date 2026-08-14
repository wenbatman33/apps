/* ============================================================
 * 三選一技能池（弓箭傳說式 roguelike buff）
 * apply(st) 直接修改本場戰鬥狀態 st
 * ============================================================ */
(function (H) {
  'use strict';

  var S = function (id, name, desc, icon, color, max, apply, weight) {
    return { id: id, name: name, desc: desc, icon: icon, color: color, max: max || 99, apply: apply, weight: weight || 10 };
  };

  H.SKILLS = [
    // ---- 攻擊 ----
    S('atk', '火力強化', '攻擊力 +25%', '▲', 0xff6b3d, 99, function (s) { s.damage *= 1.25; }, 14),
    S('rate', '射速提升', '攻擊速度 +18%', '≫', 0xffc93d, 99, function (s) { s.fireRate *= 0.845; }, 14),
    S('multi', '雙管齊發', '額外射出 1 發子彈', '⁝⁝', 0xff3d6b, 4, function (s) { s.shots += 1; }, 8),
    S('pierce', '穿甲彈', '子彈可貫穿 +1 名敵人', '→', 0x7dd3ff, 4, function (s) { s.pierce += 1; }, 9),
    S('bounce', '跳彈', '子彈彈射 +1 次', '↗', 0x9d7dff, 4, function (s) { s.bounce += 1; }, 9),
    S('rear', '後方射擊', '同時往後方射擊', '↕', 0xff9d3d, 1, function (s) { s.rear = true; }, 6),
    S('side', '側翼射擊', '同時往左右射擊', '↔', 0xff9d3d, 1, function (s) { s.side = true; }, 6),
    S('diag', '斜向射擊', '同時往斜前方射擊', '✳', 0xff9d3d, 1, function (s) { s.diag = true; }, 6),
    S('crit', '致命瞄準', '暴擊率 +8%', '✦', 0xffe14d, 8, function (s) { s.critRate += 0.08; }, 10),
    S('critx', '致命一擊', '暴擊傷害 +50%', '✸', 0xffe14d, 4, function (s) { s.critMul += 0.5; }, 7),
    S('range', '長槍管', '射程與子彈速度 +20%', '⌁', 0x7dd3ff, 3, function (s) { s.range *= 1.2; s.bulletSpeed *= 1.2; }, 7),
    S('fire', '燃燒彈', '命中後造成持續燃燒', '🔥', 0xff5a1f, 3, function (s) { s.fire += 1; }, 8),
    S('ice', '冷凍彈', '命中後減速敵人 35%', '❄', 0x6fd8ff, 3, function (s) { s.ice += 1; }, 8),
    S('blast', '爆裂彈', '命中產生小範圍爆炸', '✹', 0xff8a3d, 3, function (s) { s.blast += 1; }, 7),
    S('homing', '追蹤彈', '子彈會自動追蹤敵人', '◎', 0x7dffb0, 2, function (s) { s.homing += 1; }, 6),

    // ---- 生存 ----
    S('hp', '強化體質', '最大生命 +30 並回復', '♥', 0x4dff7d, 99, function (s) { s.maxHp += 30; s.hp += 30; }, 14),
    S('heal', '急救包', '立即回復 60% 生命', '✚', 0x4dff7d, 99, function (s) { s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.6); }, 10),
    S('regen', '再生', '每 3 秒回復 4 點生命', '❃', 0x4dff7d, 4, function (s) { s.regen += 4; }, 7),
    S('lifesteal', '嗜血', '攻擊吸血 4%', '❤', 0xff3d6b, 4, function (s) { s.lifesteal += 0.04; }, 7),
    S('shield', '防彈衣', '受到傷害 -12%', '◈', 0x7dd3ff, 5, function (s) { s.dr += 0.12; }, 9),
    S('dodge', '閃避', '10% 機率完全閃避', '↺', 0xb0ffb0, 5, function (s) { s.dodge += 0.10; }, 7),
    S('thorns', '反傷', '近戰受擊反彈 50% 傷害', '✜', 0xff9d3d, 3, function (s) { s.thorns += 0.5; }, 6),

    // ---- 機動 ----
    S('spd', '疾行', '移動速度 +12%', '»', 0x7dd3ff, 6, function (s) { s.speed *= 1.12; }, 12),
    S('magnet', '磁力', '自動吸取更遠的掉落物', '◉', 0xffe14d, 3, function (s) { s.magnet += 90; }, 6),

    // ---- 特殊 ----
    S('drone', '戰術無人機', '召喚無人機協同開火', '✈', 0x7dffb0, 3, function (s) { s.drones += 1; }, 6),
    S('aura', '電磁力場', '對周圍敵人持續放電', '⊛', 0x7dd3ff, 3, function (s) { s.aura += 1; }, 6),
    S('mine', '詭雷', '定期在腳下佈置地雷', '◇', 0xff8a3d, 3, function (s) { s.mine += 1; }, 5),
  ];

  /** 建立本場戰鬥的玩家狀態（含永久強化） */
  H.newRunStats = function (perm) {
    perm = perm || {};
    var P = H.PLAYER;
    return {
      maxHp: P.hp + (perm.hp || 0) * 12,
      hp: P.hp + (perm.hp || 0) * 12,
      damage: P.damage * (1 + (perm.atk || 0) * 0.06),
      fireRate: P.fireRate * Math.pow(0.975, perm.rate || 0),
      speed: P.speed * (1 + (perm.spd || 0) * 0.02),
      bulletSpeed: P.bulletSpeed,
      range: P.range,
      critRate: P.critRate + (perm.crit || 0) * 0.01,
      critMul: P.critMul,
      shots: 1, pierce: 0, bounce: 0,
      rear: false, side: false, diag: false,
      fire: 0, ice: 0, blast: 0, homing: 0,
      regen: 0, lifesteal: (perm.ls || 0) * 0.01, dr: 0, dodge: 0, thorns: 0,
      magnet: 0, drones: 0, aura: 0, mine: 0,
      taken: {},   // 已取得技能次數
    };
  };

  /** 抽 3 個可選技能 */
  H.rollSkills = function (stats, n) {
    n = n || 3;
    var pool = H.SKILLS.filter(function (sk) {
      return (stats.taken[sk.id] || 0) < sk.max;
    });
    var out = [];
    var total = pool.reduce(function (a, b) { return a + b.weight; }, 0);
    for (var i = 0; i < n && pool.length; i++) {
      var r = Math.random() * total, acc = 0, pick = pool[0], pi = 0;
      for (var j = 0; j < pool.length; j++) {
        acc += pool[j].weight;
        if (r <= acc) { pick = pool[j]; pi = j; break; }
      }
      out.push(pick);
      total -= pick.weight;
      pool.splice(pi, 1);
    }
    return out;
  };
})(window.HABBY);
