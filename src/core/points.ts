export const HYE_POINTS = {
  name: 'Hye Points',
  symbol: '✦',
  short: 'HP',
  color: '#8B7FE8',
  sound: 'point-earn',
  format: (n: number) => `${n.toLocaleString()} HP`,
  formatShort: (n: number) => `${n.toLocaleString()}✦`,
};

export function computeHighScorePoints(
  basePoints: number,
  difficultyBonus: number,
  playerCount: number,
): number {
  const difficultyMult = 1 + difficultyBonus * 0.5;
  const playerMult = 1 + (playerCount - 2) * 0.15;
  return Math.round(basePoints * difficultyMult * playerMult);
}