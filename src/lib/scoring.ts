export interface ScoreResult {
  totalPoints: number;
  speedBonus: number;
  streakMultiplier: number;
  streak: number;
}

function getStreakMultiplier(streak: number): number {
  if (streak >= 5) return 1.5;
  if (streak === 4) return 1.3;
  if (streak === 3) return 1.2;
  if (streak === 2) return 1.1;
  return 1.0;
}

export function calculatePoints(
  basePoints: number,
  timeLimitMs: number,
  timeTakenMs: number,
  currentStreak: number
): ScoreResult {
  const timeRemaining = Math.max(0, timeLimitMs - timeTakenMs);
  const speedBonus = Math.floor(basePoints * 0.5 * (timeRemaining / timeLimitMs));
  const newStreak = currentStreak + 1;
  const streakMultiplier = getStreakMultiplier(newStreak);
  const totalPoints = Math.floor((basePoints + speedBonus) * streakMultiplier);

  return {
    totalPoints,
    speedBonus,
    streakMultiplier,
    streak: newStreak,
  };
}
