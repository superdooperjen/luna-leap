// Local top-5 leaderboard stored in localStorage.
// Swap these functions for API calls later (e.g. Supabase) without
// touching game code — the interface stays the same.

const KEY = "luna-leap-scores";
const MAX = 5;

export interface Entry {
  name: string;
  score: number;
  date: string;
}

export function loadScores(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is Entry =>
          e && typeof e.name === "string" && typeof e.score === "number"
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function qualifies(score: number): boolean {
  if (score <= 0) return false;
  const scores = loadScores();
  return scores.length < MAX || score > scores[scores.length - 1].score;
}

/** Saves the score and returns its rank index (0-based), or -1 if it didn't place. */
export function saveScore(name: string, score: number): number {
  const scores = loadScores();
  const entry: Entry = {
    name: name.trim().slice(0, 8).toUpperCase() || "LUNA",
    score,
    date: new Date().toISOString().slice(0, 10),
  };
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(top));
  } catch {
    // storage full/unavailable — leaderboard just won't persist
  }
  return top.indexOf(entry);
}
