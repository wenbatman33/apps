/* v2 關卡（十年）— M1 先做 1~3 關，其餘為佔位
 * wave 事件：{ at: 秒, lane: 0|1|2|-1(隨機), type, n: 數量, gap: 間隔ms }
 */
window.TD = window.TD || {};

TD.LEVELS = [
  {
    id: 1, name: '黑船臨岸', sub: '第一年 · 教學',
    gateHp: 1000, startGold: 180, dayTint: 'day',
    waves: [
      { label: 'WAVE 1', events: [ { at: 0, lane: 1, type: 'soldier', n: 4, gap: 900 } ] },
      { label: 'WAVE 2', events: [
        { at: 0, lane: 0, type: 'soldier', n: 3, gap: 800 },
        { at: 2, lane: 2, type: 'soldier', n: 3, gap: 800 } ] },
      { label: 'WAVE 3', events: [
        { at: 0, lane: 1, type: 'runner', n: 4, gap: 550 },
        { at: 3, lane: -1, type: 'soldier', n: 4, gap: 700 } ] },
      { label: 'WAVE 4', events: [
        { at: 0, lane: 0, type: 'torch', n: 2, gap: 1400 },
        { at: 1, lane: 2, type: 'soldier', n: 5, gap: 650 } ] },
      { label: 'WAVE 5', events: [
        { at: 0, lane: 1, type: 'shield', n: 1, gap: 0 },
        { at: 1, lane: -1, type: 'soldier', n: 6, gap: 550 },
        { at: 6, lane: -1, type: 'runner', n: 4, gap: 450 } ] },
    ],
  },
  {
    id: 2, name: '城下之圍', sub: '第二年 · 雲梯登牆',
    gateHp: 1150, startGold: 200, dayTint: 'day',
    waves: [
      { label: 'WAVE 1', events: [
        { at: 0, lane: -1, type: 'soldier', n: 5, gap: 700 },
        { at: 3, lane: 1, type: 'torch', n: 2, gap: 1500 } ] },
      { label: 'WAVE 2', events: [
        { at: 0, lane: 0, type: 'ladder', n: 2, gap: 1600 },
        { at: 2, lane: -1, type: 'soldier', n: 5, gap: 600 } ] },
      { label: 'WAVE 3', events: [
        { at: 0, lane: 1, type: 'shield', n: 2, gap: 1800 },
        { at: 2, lane: -1, type: 'runner', n: 6, gap: 480 } ] },
      { label: 'WAVE 4', events: [
        { at: 0, lane: 0, type: 'ladder', n: 2, gap: 1500 },
        { at: 0, lane: 2, type: 'ladder', n: 2, gap: 1500 },
        { at: 3, lane: 1, type: 'torch', n: 3, gap: 1200 } ] },
      { label: 'WAVE 5', events: [
        { at: 0, lane: 1, type: 'ram', n: 1, gap: 0 },
        { at: 2, lane: -1, type: 'soldier', n: 8, gap: 520 },
        { at: 8, lane: -1, type: 'runner', n: 5, gap: 420 } ] },
      { label: 'WAVE 6', events: [
        { at: 0, lane: -1, type: 'shield', n: 2, gap: 1600 },
        { at: 2, lane: 0, type: 'ladder', n: 3, gap: 1300 },
        { at: 5, lane: 2, type: 'torch', n: 3, gap: 1100 } ] },
    ],
  },
  {
    id: 3, name: '呂卡翁的哀嚎', sub: '第三年 · BOSS 狄俄墨得斯',
    gateHp: 1300, startGold: 220, dayTint: 'dusk',
    waves: [
      { label: 'WAVE 1', events: [
        { at: 0, lane: -1, type: 'runner', n: 6, gap: 500 },
        { at: 3, lane: 1, type: 'soldier', n: 5, gap: 650 } ] },
      { label: 'WAVE 2', events: [
        { at: 0, lane: 1, type: 'ram', n: 1, gap: 0 },
        { at: 1, lane: -1, type: 'ladder', n: 3, gap: 1400 },
        { at: 5, lane: -1, type: 'torch', n: 3, gap: 1200 } ] },
      { label: 'WAVE 3', events: [
        { at: 0, lane: 0, type: 'catapult', n: 1, gap: 0 },
        { at: 1, lane: -1, type: 'soldier', n: 8, gap: 520 },
        { at: 6, lane: 2, type: 'shield', n: 2, gap: 1500 } ] },
      { label: 'WAVE 4', events: [
        { at: 0, lane: 2, type: 'catapult', n: 1, gap: 0 },
        { at: 1, lane: 0, type: 'ladder', n: 3, gap: 1200 },
        { at: 4, lane: -1, type: 'runner', n: 8, gap: 400 } ] },
      { label: 'BOSS', boss: true, events: [
        { at: 0, lane: 1, type: 'diomedes', n: 1, gap: 0 },
        { at: 3, lane: -1, type: 'soldier', n: 6, gap: 700 },
        { at: 9, lane: -1, type: 'runner', n: 6, gap: 500 } ] },
    ],
  },
];

TD.getLevel = (id) => TD.LEVELS.find(l => l.id === id) || TD.LEVELS[0];
