export interface GameSave {
  version: 1;
  unlockedYear: number;
  highScores: Record<string, number>;
}

const SAVE_KEY = "troy-rush-pve-v1-save";

const DEFAULT_SAVE: GameSave = {
  version: 1,
  unlockedYear: 1,
  highScores: {},
};

export function loadSave(): GameSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE, highScores: {} };
    const parsed = JSON.parse(raw) as Partial<GameSave>;
    return {
      version: 1,
      unlockedYear: Math.max(1, Math.min(10, Number(parsed.unlockedYear ?? 1))),
      highScores: parsed.highScores ?? {},
    };
  } catch {
    return { ...DEFAULT_SAVE, highScores: {} };
  }
}

export function writeSave(save: GameSave): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function recordVictory(year: number, score: number): void {
  const save = loadSave();
  save.unlockedYear = Math.max(save.unlockedYear, Math.min(10, year + 1));
  save.highScores[String(year)] = Math.max(save.highScores[String(year)] ?? 0, score);
  writeSave(save);
}
