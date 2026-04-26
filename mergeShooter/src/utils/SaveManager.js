// 存檔 — 帶 schema version,版本不符自動 reset
const KEY = 'mergeShooter.save';
const VERSION = 6; // 改 schema 時遞增即可強制重置舊檔

const DEFAULT = () => ({
  version: VERSION,
  currentStage: 1,
  currentWave: 1,
  gold: 800,                  // 起始 800 金 — 玩家可立刻買 8 隻 Lv1 砲塔填滿前線/備用
  wall: { currentHP: 1000, maxHP: 1000, upgradeLevel: 0 },
  cannons: [],
  highestUnlockedCannonLevel: 1,
  settings: { sound: true }
});

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    const obj = JSON.parse(raw);
    if (obj.version !== VERSION) return DEFAULT();
    return Object.assign(DEFAULT(), obj);
  } catch (e) {
    return DEFAULT();
  }
}

export function saveSave(state) {
  try {
    state.version = VERSION;
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {}
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}
