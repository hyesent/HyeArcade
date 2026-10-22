/**
 * Hye Arcade Layer 1: local profile, match history, statistics, achievements and titles.
 * Storage is device-local and intentionally works without an account or internet connection.
 */
export const PROFILE_LIBRARY_KEY = 'hye:profile-library:v1';
export const PROFILE_SCHEMA_VERSION = 1;
export const MAX_MATCH_HISTORY = 500;

export interface GameMetadata {
  id: string;
  name: string;
  title: string;
  titleDescription: string;
}

export const GAME_CATALOG: GameMetadata[] = [
  { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', title: 'Grid Tactician', titleDescription: 'Win 5 Tic-Tac-Toe matches.' },
  { id: 'connect-four', name: 'Connect Four', title: 'Column Commander', titleDescription: 'Win 5 Connect Four matches.' },
  { id: 'gomoku', name: 'Gomoku', title: 'Five-in-a-Row', titleDescription: 'Win 5 Gomoku matches.' },
  { id: 'snake-ladder', name: 'Snake & Ladder', title: 'Lucky Climber', titleDescription: 'Win 5 Snake & Ladder matches.' },
  { id: 'ludo', name: 'Ludo', title: 'Ludo Captain', titleDescription: 'Win 5 Ludo matches.' },
  { id: 'drafts', name: 'Drafts', title: 'Draughts Tactician', titleDescription: 'Win 5 Drafts matches.' },
  { id: 'checkers', name: 'Checkers', title: 'King Maker', titleDescription: 'Win 5 Checkers matches.' },
  { id: 'crazy-eights', name: 'Crazy Eights', title: 'Eight-Card Ace', titleDescription: 'Win 5 Crazy Eights matches.' },
  { id: 'uno', name: 'UNO', title: 'UNO Specialist', titleDescription: 'Win 5 UNO matches.' },
  { id: 'whot', name: 'Whot', title: 'Shape Master', titleDescription: 'Win 5 Whot matches.' },
  { id: 'solitaire', name: 'Solitaire', title: 'Patience Master', titleDescription: 'Complete 5 Solitaire games.' },
  { id: 'mahjong-solitaire', name: 'Mahjong Solitaire', title: 'Tile Match Expert', titleDescription: 'Complete 5 Mahjong Solitaire boards.' },
  { id: 'monopoly', name: 'Monopoly', title: 'Property Mogul', titleDescription: 'Win 5 Monopoly matches.' },
  { id: 'monopoly-deal', name: 'Monopoly Deal', title: 'Deal Maker', titleDescription: 'Win 5 Monopoly Deal matches.' },
  { id: 'scramble', name: 'Scramble', title: 'Word Shuffler', titleDescription: 'Win 5 Scramble matches.' },
  { id: 'treasure-hunt', name: 'Treasure Hunt', title: 'Treasure Seeker', titleDescription: 'Win 5 Treasure Hunt matches.' },
  { id: 'chess', name: 'Chess', title: 'Grand Strategist', titleDescription: 'Win 5 Chess matches.' },
  { id: 'pirate-go', name: 'Pirate Go', title: 'Sea Strategist', titleDescription: 'Win 5 Pirate Go matches.' },
  { id: 'scrabble', name: 'Scrabble', title: 'Wordsmith', titleDescription: 'Win 5 Scrabble matches.' },
  { id: 'mahjong', name: 'Mahjong', title: 'Tile Strategist', titleDescription: 'Win 5 Mahjong matches.' },
  { id: 'vita-mahjong', name: 'Vita Mahjong', title: 'Vita Solver', titleDescription: 'Clear 5 Vita Mahjong boards.' },
  { id: 'ayo', name: 'Ayo Ọlọ́pọ́n', title: 'Ọlọ́pọ́n Champion', titleDescription: 'Win 5 Ayo Ọlọ́pọ́n matches.' },
  { id: 'dominoes', name: 'Dominoes', title: 'Chain Builder', titleDescription: 'Win 5 Dominoes matches.' },
  { id: 'othello', name: 'Othello / Reversi', title: 'Reversal Expert', titleDescription: 'Win 5 Othello matches.' },
  { id: 'backgammon', name: 'Backgammon', title: 'Dice Tactician', titleDescription: 'Win 5 Backgammon matches.' },
  { id: 'battleship', name: 'Battleship', title: 'Fleet Admiral', titleDescription: 'Win 5 Battleship matches.' },
  { id: '2048', name: '2048', title: 'Merge Master', titleDescription: 'Reach 2048 five times.' },
  { id: 'minesweeper', name: 'Minesweeper', title: 'Mine Detective', titleDescription: 'Clear 5 Minesweeper fields.' },
  { id: 'sudoku', name: 'Sudoku', title: 'Number Sage', titleDescription: 'Solve 5 Sudoku puzzles.' },
  { id: 'memory-match', name: 'Memory Match', title: 'Memory Ace', titleDescription: 'Win 5 Memory Match games.' },
  { id: 'hearts', name: 'Hearts', title: 'Heart Tactician', titleDescription: 'Win 5 Hearts matches.' },
  { id: 'hangman', name: 'Hangman', title: 'Word Sleuth', titleDescription: 'Guess 5 Hangman words.' },
];

export type MatchOutcome = 'win' | 'loss' | 'draw' | 'solo-success' | 'solo-failure';

export interface GameMetricDefinition { key: string; label: string; aggregation: 'sum' | 'max'; }

export const GAME_METRICS: Record<string, GameMetricDefinition[]> = {
  'tic-tac-toe': [{ key: 'movesTaken', label: 'Moves taken', aggregation: 'sum' }],
  'connect-four': [{ key: 'piecesDropped', label: 'Pieces dropped', aggregation: 'sum' }],
  'gomoku': [{ key: 'stonesPlaced', label: 'Stones placed', aggregation: 'sum' }],
  'snake-ladder': [{ key: 'diceRolls', label: 'Dice rolls', aggregation: 'sum' }],
  'ludo': [{ key: 'pawnsFinished', label: 'Pawns finished', aggregation: 'sum' }, { key: 'diceRolls', label: 'Dice rolls', aggregation: 'sum' }],
  'drafts': [{ key: 'captures', label: 'Captures', aggregation: 'sum' }, { key: 'promotions', label: 'Promotions', aggregation: 'sum' }],
  'checkers': [{ key: 'captures', label: 'Captures', aggregation: 'sum' }, { key: 'promotions', label: 'Promotions', aggregation: 'sum' }],
  'crazy-eights': [{ key: 'cardsPlayed', label: 'Cards played', aggregation: 'sum' }, { key: 'cardsDrawn', label: 'Cards drawn', aggregation: 'sum' }],
  'uno': [{ key: 'cardsPlayed', label: 'Cards played', aggregation: 'sum' }, { key: 'cardsDrawn', label: 'Cards drawn', aggregation: 'sum' }],
  'whot': [{ key: 'cardsPlayed', label: 'Cards played', aggregation: 'sum' }, { key: 'marketDraws', label: 'Market draws', aggregation: 'sum' }],
  'solitaire': [{ key: 'foundationCards', label: 'Most foundation cards', aggregation: 'max' }, { key: 'stockDraws', label: 'Stock draws', aggregation: 'sum' }],
  'mahjong-solitaire': [{ key: 'pairsCleared', label: 'Pairs cleared', aggregation: 'sum' }],
  'monopoly': [{ key: 'propertiesOwned', label: 'Most properties owned', aggregation: 'max' }, { key: 'cashAtFinish', label: 'Highest ending cash', aggregation: 'max' }],
  'monopoly-deal': [{ key: 'propertyCardsOwned', label: 'Most property cards held', aggregation: 'max' }, { key: 'bankedCards', label: 'Most banked cards', aggregation: 'max' }, { key: 'cardsPlayed', label: 'Cards played', aggregation: 'sum' }],
  'scramble': [{ key: 'correctAnswers', label: 'Correct answers', aggregation: 'sum' }],
  'treasure-hunt': [{ key: 'digAttempts', label: 'Dig attempts', aggregation: 'sum' }, { key: 'score', label: 'Total score', aggregation: 'sum' }],
  'chess': [{ key: 'piecesCaptured', label: 'Opponent pieces captured', aggregation: 'sum' }, { key: 'promotions', label: 'Promotions', aggregation: 'sum' }],
  'pirate-go': [{ key: 'captures', label: 'Stones captured', aggregation: 'sum' }, { key: 'stonesPlaced', label: 'Stones placed', aggregation: 'sum' }],
  'scrabble': [{ key: 'wordsPlayed', label: 'Words played', aggregation: 'sum' }, { key: 'longestWord', label: 'Longest word', aggregation: 'max' }],
  'mahjong': [{ key: 'selfDrawFinishes', label: 'Self-draw finishes', aggregation: 'sum' }, { key: 'handScore', label: 'Best hand score', aggregation: 'max' }],
  'vita-mahjong': [{ key: 'pairsCleared', label: 'Pairs cleared', aggregation: 'sum' }, { key: 'bestCombo', label: 'Best combo', aggregation: 'max' }, { key: 'hintsUsed', label: 'Hints used', aggregation: 'sum' }],
  'ayo': [{ key: 'seedsCaptured', label: 'Seeds captured', aggregation: 'sum' }, { key: 'movesPlayed', label: 'Moves played', aggregation: 'sum' }],
  'dominoes': [{ key: 'tilesPlayed', label: 'Tiles played', aggregation: 'sum' }, { key: 'remainingPips', label: 'Remaining pips', aggregation: 'max' }],
  'othello': [{ key: 'discsAtEnd', label: 'Discs at end', aggregation: 'max' }, { key: 'discsPlaced', label: 'Discs placed', aggregation: 'sum' }],
  'backgammon': [{ key: 'checkersBorneOff', label: 'Checkers borne off', aggregation: 'max' }, { key: 'diceRolls', label: 'Dice rolls', aggregation: 'sum' }],
  'battleship': [{ key: 'shotsFired', label: 'Shots fired', aggregation: 'sum' }, { key: 'hits', label: 'Hits', aggregation: 'sum' }, { key: 'shipsSunk', label: 'Ships sunk', aggregation: 'sum' }],
  '2048': [{ key: 'score', label: 'Final score', aggregation: 'max' }, { key: 'bestTile', label: 'Highest tile', aggregation: 'max' }, { key: 'totalMerges', label: 'Tiles merged', aggregation: 'sum' }, { key: 'bestCombo', label: 'Best merge combo', aggregation: 'max' }],
  'minesweeper': [{ key: 'safeSquares', label: 'Safe squares revealed', aggregation: 'max' }, { key: 'flagsPlaced', label: 'Flags left on field', aggregation: 'max' }],
  'sudoku': [{ key: 'correctCells', label: 'Correct cells', aggregation: 'max' }, { key: 'mistakes', label: 'Mistakes', aggregation: 'sum' }, { key: 'hintsUsed', label: 'Hints used', aggregation: 'sum' }],
  'memory-match': [{ key: 'pairsFound', label: 'Pairs found', aggregation: 'max' }, { key: 'cardsFlipped', label: 'Cards flipped', aggregation: 'sum' }],
  'hearts': [{ key: 'penaltyPoints', label: 'Penalty points', aggregation: 'sum' }, { key: 'tricksWon', label: 'Tricks won', aggregation: 'sum' }],
  'hangman': [{ key: 'wrongGuesses', label: 'Wrong guesses', aggregation: 'sum' }, { key: 'hintsUsed', label: 'Hints used', aggregation: 'sum' }, { key: 'wordLength', label: 'Word length', aggregation: 'max' }],
};

export interface GameStatistics {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  soloSuccesses: number;
  soloFailures: number;
  totalMoves: number;
  totalXp: number;
  bestScore: number;
  totalScore: number;
  currentWinStreak: number;
  bestWinStreak: number;
  currentLossStreak: number;
  lastPlayedAt: number;
  fastestWinMs: number | null;
  metrics: Record<string, number>;
  bestMetrics: Record<string, number>;
}

export interface MatchRecord {
  id: string;
  gameId: string;
  gameName: string;
  boardId?: string;
  outcome: MatchOutcome;
  playerId: string;
  playerName: string;
  opponentNames: string[];
  score: number;
  moves: number;
  durationMs: number;
  xpEarned: number;
  reason: string;
  startedAt: number;
  endedAt: number;
  achievementIds: string[];
  metrics: Record<string, number>;
  /** Ordered accepted actions and original setup snapshot for match history/replay. */
  moveHistory?: Array<{ player?: string; type?: string; payload?: unknown; ts?: number }>;
  playerRoster?: Array<{ id: string; name: string; kind?: string }>;
  initialState?: unknown;
}

export interface UnlockedItem {
  id: string;
  unlockedAt: number;
}

export interface PlayerProfile {
  schemaVersion: number;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  activeTitleId: string;
  unlockedTitleIds: string[];
  unlockedAchievements: UnlockedItem[];
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  soloSuccesses: number;
  soloFailures: number;
  totalXp: number;
  currentWinStreak: number;
  bestWinStreak: number;
  currentLossStreak: number;
  lastPlayedAt: number | null;
  gameStats: Record<string, GameStatistics>;
  matchHistory: MatchRecord[];
}

export interface ProfileLibrary {
  schemaVersion: number;
  activeProfileId: string;
  profiles: PlayerProfile[];
}

export interface FinishedMatchInput {
  sessionId: string;
  gameId: string;
  gameName: string;
  boardId?: string;
  players: Array<{ id: string; profileId?: string; name: string; kind?: string; seat?: number }>;
  playerId: string;
  winnerId: string | null;
  reason: string;
  scores?: Record<string, number>;
  pointsEarned?: Record<string, number>;
  hyeEarned?: Record<string, number>;
  state?: unknown;
  moves: Array<{ player?: string; type?: string; payload?: unknown; ts?: number }>;
  initialState?: unknown;
  startedAt: number;
  endedAt: number;
}

export interface MatchAward {
  record: MatchRecord;
  unlockedAchievements: AchievementDefinition[];
  unlockedTitles: TitleDefinition[];
  totalXp: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: 'Arcade' | 'Game milestones' | 'Game mastery' | 'Special feats';
  xpReward: number;
}

export interface TitleDefinition {
  id: string;
  name: string;
  description: string;
}

const GENERAL_ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first-match', title: 'Insert Coin', description: 'Complete your first match.', category: 'Arcade', xpReward: 15 },
  { id: 'first-win', title: 'First Victory', description: 'Win your first match.', category: 'Arcade', xpReward: 25 },
  { id: 'first-draw', title: 'Dead Even', description: 'Finish your first draw.', category: 'Arcade', xpReward: 10 },
  { id: 'matches-10', title: 'Getting Started', description: 'Complete 10 matches.', category: 'Arcade', xpReward: 20 },
  { id: 'matches-25', title: 'Arcade Regular', description: 'Complete 25 matches.', category: 'Arcade', xpReward: 35 },
  { id: 'matches-50', title: 'Known Player', description: 'Complete 50 matches.', category: 'Arcade', xpReward: 50 },
  { id: 'matches-100', title: 'Veteran Player', description: 'Complete 100 matches.', category: 'Arcade', xpReward: 100 },
  { id: 'matches-250', title: 'Arcade Legend', description: 'Complete 250 matches.', category: 'Arcade', xpReward: 200 },
  { id: 'wins-10', title: 'Ten on the Board', description: 'Win 10 matches.', category: 'Arcade', xpReward: 40 },
  { id: 'wins-25', title: 'Winning Habit', description: 'Win 25 matches.', category: 'Arcade', xpReward: 70 },
  { id: 'wins-50', title: 'Fifty Victories', description: 'Win 50 matches.', category: 'Arcade', xpReward: 100 },
  { id: 'wins-100', title: 'Century Club', description: 'Win 100 matches.', category: 'Arcade', xpReward: 200 },
  { id: 'streak-3', title: 'Three in a Row', description: 'Win 3 matches consecutively.', category: 'Arcade', xpReward: 30 },
  { id: 'streak-5', title: 'On a Roll', description: 'Win 5 matches consecutively.', category: 'Arcade', xpReward: 60 },
  { id: 'streak-10', title: 'Unstoppable', description: 'Win 10 matches consecutively.', category: 'Arcade', xpReward: 150 },
  { id: 'games-5', title: 'Curious Player', description: 'Complete matches in 5 different games.', category: 'Arcade', xpReward: 25 },
  { id: 'games-10', title: 'Arcade Explorer', description: 'Complete matches in 10 different games.', category: 'Arcade', xpReward: 50 },
  { id: 'games-all', title: 'Full Cabinet', description: 'Complete at least one match in every registered game.', category: 'Arcade', xpReward: 250 },
  { id: 'xp-100', title: 'Momentum', description: 'Earn 100 XP.', category: 'Arcade', xpReward: 15 },
  { id: 'xp-500', title: 'Building Steam', description: 'Earn 500 XP.', category: 'Arcade', xpReward: 35 },
  { id: 'xp-1000', title: 'High Score Energy', description: 'Earn 1,000 XP.', category: 'Arcade', xpReward: 60 },
  { id: 'xp-5000', title: 'Arcade Institution', description: 'Earn 5,000 XP.', category: 'Arcade', xpReward: 150 },
];

const GAME_ACHIEVEMENTS: AchievementDefinition[] = GAME_CATALOG.flatMap((game) => [
  { id: `played-${game.id}`, title: `${game.name} Debut`, description: `Complete your first ${game.name} match.`, category: 'Game milestones' as const, xpReward: 12 },
  { id: `won-${game.id}`, title: `${game.name} Victor`, description: `Win your first ${game.name} match.`, category: 'Game milestones' as const, xpReward: 20 },
  { id: `mastered-${game.id}`, title: `${game.name} Specialist`, description: `Win 10 ${game.name} matches.`, category: 'Game mastery' as const, xpReward: 45 },
]);

export const SPECIAL_ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'checkmate', title: 'Checkmate', description: 'Finish a Chess match with checkmate.', category: 'Special feats', xpReward: 25 },
  { id: 'ayo-50-seeds', title: 'Seed Collector', description: 'Finish an Ayo match with at least 50 seeds credited to your score.', category: 'Special feats', xpReward: 30 },
  { id: 'vita-combo-5', title: 'Perfect Rhythm', description: 'Reach a combo of 5 in Vita Mahjong.', category: 'Special feats', xpReward: 25 },
  { id: '2048-reached', title: 'Merge Master', description: 'Reach a tile of 2048 or higher.', category: 'Special feats', xpReward: 35 },
  { id: '2048-beyond', title: 'Beyond the Target', description: 'Merge beyond 2048 and create a 4096 tile.', category: 'Special feats', xpReward: 60 },
  { id: '2048-combo-5', title: 'Chain Reaction', description: 'Make merges on five consecutive turns in 2048.', category: 'Special feats', xpReward: 30 },
  { id: 'hangman-perfect', title: 'Perfect Guess', description: 'Solve a Hangman word without a wrong guess or hint.', category: 'Special feats', xpReward: 35 },
  { id: 'minesweeper-clear', title: 'Minefield Master', description: 'Clear a Minesweeper field without triggering a mine.', category: 'Special feats', xpReward: 30 },
  { id: 'sudoku-clean', title: 'Clean Solve', description: 'Solve Sudoku without mistakes or hints.', category: 'Special feats', xpReward: 35 },
  { id: 'memory-complete', title: 'Photographic Memory', description: 'Match every card in a Memory Match board.', category: 'Special feats', xpReward: 25 },
  { id: 'othello-reversal', title: 'Grand Reversal', description: 'Win an Othello game.', category: 'Special feats', xpReward: 30 },
  { id: 'battleship-fleet', title: 'Fleet Breaker', description: 'Win a Battleship match by destroying the enemy fleet.', category: 'Special feats', xpReward: 30 },
  { id: 'dominoes-chain', title: 'Perfect Chain', description: 'Win Dominoes by playing every tile in your hand.', category: 'Special feats', xpReward: 25 },
  { id: 'backgammon-home', title: 'Homeward Bound', description: 'Win Backgammon after bearing off all your checkers.', category: 'Special feats', xpReward: 35 },
  { id: 'hearts-keeper', title: 'Heart Keeper', description: 'Win a Hearts match with the lowest penalty score.', category: 'Special feats', xpReward: 30 },
  { id: 'scrabble-100', title: 'Triple-Digit Wordsmith', description: 'Finish a Scrabble match with at least 100 points.', category: 'Special feats', xpReward: 30 },
  { id: 'solitaire-under-100', title: 'Efficient Patience', description: 'Complete Solitaire in fewer than 100 moves.', category: 'Special feats', xpReward: 35 },
  { id: 'pirate-captain', title: 'Pirate Captain', description: 'Finish Pirate Go with at least 10 captures credited to you.', category: 'Special feats', xpReward: 30 },
  { id: 'long-match', title: 'Marathon Session', description: 'Complete a match with at least 150 moves.', category: 'Special feats', xpReward: 25 },
];

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  ...GENERAL_ACHIEVEMENTS,
  ...GAME_ACHIEVEMENTS,
  ...SPECIAL_ACHIEVEMENTS,
];

const GAME_TITLES: TitleDefinition[] = GAME_CATALOG.map((game) => ({
  id: `title-${game.id}`,
  name: game.title,
  description: game.titleDescription,
}));

export const TITLE_CATALOG: TitleDefinition[] = [
  { id: 'arcade-newcomer', name: 'Arcade Newcomer', description: 'Your first profile title.' },
  { id: 'arcade-regular', name: 'Arcade Regular', description: 'Complete 25 matches.' },
  { id: 'arcade-veteran', name: 'Arcade Veteran', description: 'Complete 100 matches.' },
  { id: 'arcade-legend', name: 'Arcade Legend', description: 'Complete 250 matches.' },
  { id: 'arcade-champion', name: 'Arcade Champion', description: 'Win 50 matches.' },
  { id: 'arcade-all-rounder', name: 'Arcade All-Rounder', description: 'Complete matches in 10 different games.' },
  { id: 'arcade-completionist', name: 'Arcade Completionist', description: 'Play every game in the registered catalogue.' },
  { id: 'arcade-unstoppable', name: 'Unstoppable', description: 'Reach a 10-match winning streak.' },
  ...GAME_TITLES,
];

const zeroGameStats = (): GameStatistics => ({
  matchesPlayed: 0, wins: 0, losses: 0, draws: 0, soloSuccesses: 0, soloFailures: 0,
  totalMoves: 0, totalXp: 0, bestScore: 0, totalScore: 0, currentWinStreak: 0,
  bestWinStreak: 0, currentLossStreak: 0, lastPlayedAt: 0, fastestWinMs: null, metrics: {}, bestMetrics: {},
});

function newId(prefix: string): string {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${id}`;
}

export function createProfile(name = 'Hye Player', now = Date.now()): PlayerProfile {
  const cleanName = cleanProfileName(name) || 'Hye Player';
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: newId('profile'), name: cleanName, createdAt: now, updatedAt: now,
    activeTitleId: 'arcade-newcomer', unlockedTitleIds: ['arcade-newcomer'],
    unlockedAchievements: [], matchesPlayed: 0, wins: 0, losses: 0, draws: 0,
    soloSuccesses: 0, soloFailures: 0, totalXp: 0, currentWinStreak: 0,
    bestWinStreak: 0, currentLossStreak: 0, lastPlayedAt: null, gameStats: {}, matchHistory: [],
  };
}

export function cleanProfileName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f]/g, '').trim().replace(/\s+/g, ' ').slice(0, 24);
}

export function createInitialLibrary(now = Date.now()): ProfileLibrary {
  const profile = createProfile('Hye Player', now);
  return { schemaVersion: PROFILE_SCHEMA_VERSION, activeProfileId: profile.id, profiles: [profile] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeProfile(value: unknown): PlayerProfile | null {
  if (!isRecord(value) || value.schemaVersion !== PROFILE_SCHEMA_VERSION || typeof value.id !== 'string' || typeof value.name !== 'string') return null;
  const profile = createProfile(value.name, Number(value.createdAt) || Date.now());
  profile.id = value.id;
  profile.updatedAt = Number(value.updatedAt) || profile.createdAt;
  profile.activeTitleId = typeof value.activeTitleId === 'string' ? value.activeTitleId : 'arcade-newcomer';
  profile.unlockedTitleIds = Array.isArray(value.unlockedTitleIds) ? [...new Set(value.unlockedTitleIds.filter((id): id is string => typeof id === 'string' && TITLE_CATALOG.some((t) => t.id === id)))] : ['arcade-newcomer'];
  if (!profile.unlockedTitleIds.includes('arcade-newcomer')) profile.unlockedTitleIds.push('arcade-newcomer');
  if (!profile.unlockedTitleIds.includes(profile.activeTitleId)) profile.activeTitleId = 'arcade-newcomer';
  profile.unlockedAchievements = Array.isArray(value.unlockedAchievements)
    ? value.unlockedAchievements.filter((item): item is UnlockedItem => isRecord(item) && typeof item.id === 'string' && ACHIEVEMENT_CATALOG.some((a) => a.id === item.id)).map((item) => ({ id: item.id, unlockedAt: Number(item.unlockedAt) || profile.createdAt }))
    : [];
  const numericKeys: Array<keyof Pick<PlayerProfile, 'matchesPlayed' | 'wins' | 'losses' | 'draws' | 'soloSuccesses' | 'soloFailures' | 'totalXp' | 'currentWinStreak' | 'bestWinStreak' | 'currentLossStreak'>> = ['matchesPlayed', 'wins', 'losses', 'draws', 'soloSuccesses', 'soloFailures', 'totalXp', 'currentWinStreak', 'bestWinStreak', 'currentLossStreak'];
  for (const key of numericKeys) profile[key] = Math.max(0, Math.floor(Number(value[key]) || 0));
  profile.lastPlayedAt = typeof value.lastPlayedAt === 'number' ? value.lastPlayedAt : null;
  if (isRecord(value.gameStats)) {
    for (const [gameId, raw] of Object.entries(value.gameStats)) {
      if (!GAME_CATALOG.some((game) => game.id === gameId) || !isRecord(raw)) continue;
      const game = zeroGameStats();
      for (const key of Object.keys(game) as Array<keyof GameStatistics>) {
        const rawValue = raw[key];
        if (key === 'fastestWinMs') game.fastestWinMs = typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue >= 0 ? rawValue : null;
        else if (key === 'metrics' || key === 'bestMetrics') {
          const target = key === 'metrics' ? game.metrics : game.bestMetrics;
          if (isRecord(rawValue)) for (const [metricId, metricValue] of Object.entries(rawValue)) {
            if (GAME_METRICS[gameId]?.some((metric) => metric.key === metricId) && typeof metricValue === 'number' && Number.isFinite(metricValue)) target[metricId] = Math.max(0, metricValue);
          }
        } else game[key] = Math.max(0, Number(rawValue) || 0) as never;
      }
      profile.gameStats[gameId] = game;
    }
  }
  if (Array.isArray(value.matchHistory)) {
    profile.matchHistory = value.matchHistory
      .filter((row) => isRecord(row)
        && typeof row.id === 'string'
        && typeof row.gameId === 'string'
        && GAME_CATALOG.some((game) => game.id === row.gameId)
        && typeof row.outcome === 'string'
        && ['win', 'loss', 'draw', 'solo-success', 'solo-failure'].includes(row.outcome)
        && typeof row.playerId === 'string')
      .slice(0, MAX_MATCH_HISTORY)
      .map((row) => {
        const raw = row as Record<string, unknown>;
        const metrics: Record<string, number> = {};
        if (isRecord(raw.metrics)) {
          for (const [key, metricValue] of Object.entries(raw.metrics)) {
            if (GAME_METRICS[String(raw.gameId)]?.some((definition) => definition.key === key)
              && typeof metricValue === 'number' && Number.isFinite(metricValue) && metricValue >= 0) metrics[key] = metricValue;
          }
        }
        return {
          id: String(raw.id), gameId: String(raw.gameId),
          gameName: typeof raw.gameName === 'string' ? raw.gameName.slice(0, 80) : String(raw.gameId),
          ...(typeof raw.boardId === 'string' ? { boardId: raw.boardId.slice(0, 80) } : {}),
          outcome: raw.outcome as MatchOutcome,
          playerId: String(raw.playerId),
          playerName: typeof raw.playerName === 'string' ? raw.playerName.slice(0, 24) : profile.name,
          opponentNames: Array.isArray(raw.opponentNames) ? raw.opponentNames.filter((name): name is string => typeof name === 'string').slice(0, 8).map((name) => name.slice(0, 24)) : [],
          score: typeof raw.score === 'number' && Number.isFinite(raw.score) ? raw.score : 0,
          moves: Math.max(0, Math.floor(Number(raw.moves) || 0)),
          durationMs: Math.max(0, Math.floor(Number(raw.durationMs) || 0)),
          xpEarned: Math.max(0, Math.floor(Number(raw.xpEarned) || 0)),
          reason: typeof raw.reason === 'string' ? raw.reason.slice(0, 120) : 'Match completed',
          startedAt: Math.max(0, Number(raw.startedAt) || profile.createdAt),
          endedAt: Math.max(0, Number(raw.endedAt) || profile.createdAt),
          achievementIds: Array.isArray(raw.achievementIds) ? raw.achievementIds.filter((id): id is string => typeof id === 'string' && ACHIEVEMENT_CATALOG.some((item) => item.id === id)) : [],
          metrics,
          ...(Array.isArray(raw.moveHistory) ? { moveHistory: raw.moveHistory.slice(0, 2000).filter(isRecord).map((move) => ({ ...(typeof move.player === 'string' ? { player: move.player.slice(0, 80) } : {}), ...(typeof move.type === 'string' ? { type: move.type.slice(0, 80) } : {}), ...(typeof move.ts === 'number' && Number.isFinite(move.ts) ? { ts: move.ts } : {}), ...(Object.prototype.hasOwnProperty.call(move, 'payload') ? { payload: move.payload } : {}) })) } : {}),
          ...(Array.isArray(raw.playerRoster) ? { playerRoster: raw.playerRoster.slice(0, 8).filter(isRecord).filter((p) => typeof p.id === 'string' && typeof p.name === 'string').map((p) => ({ id: String(p.id).slice(0,80), name: String(p.name).slice(0,24), ...(typeof p.kind === 'string' ? { kind: p.kind.slice(0,20) } : {}) })) } : {}),
          ...(Object.prototype.hasOwnProperty.call(raw, 'initialState') ? { initialState: raw.initialState } : {}),
        };
      });
  }
  return profile;
}

export function normalizeLibrary(value: unknown): ProfileLibrary | null {
  if (!isRecord(value) || value.schemaVersion !== PROFILE_SCHEMA_VERSION || !Array.isArray(value.profiles)) return null;
  const profiles = value.profiles.map(normalizeProfile).filter((profile): profile is PlayerProfile => profile !== null);
  if (!profiles.length) return null;
  const activeProfileId = profiles.some((profile) => profile.id === value.activeProfileId) ? String(value.activeProfileId) : profiles[0].id;
  return { schemaVersion: PROFILE_SCHEMA_VERSION, activeProfileId, profiles };
}

function storageAvailable(): boolean {
  return typeof globalThis.localStorage !== 'undefined';
}

export function loadLibrary(): ProfileLibrary {
  if (!storageAvailable()) return createInitialLibrary();
  try {
    const raw = localStorage.getItem(PROFILE_LIBRARY_KEY);
    if (!raw) {
      const initial = createInitialLibrary();
      saveLibrary(initial);
      return initial;
    }
    const normalized = normalizeLibrary(JSON.parse(raw));
    if (normalized) return normalized;
  } catch { /* Recover from unavailable/corrupted browser storage. */ }
  const recovered = createInitialLibrary();
  saveLibrary(recovered);
  return recovered;
}

export function saveLibrary(library: ProfileLibrary): void {
  if (!storageAvailable()) return;
  try { localStorage.setItem(PROFILE_LIBRARY_KEY, JSON.stringify(library)); }
  catch { /* UI remains usable if storage is temporarily unavailable or full. */ }
}

export function getActiveProfile(): PlayerProfile {
  const library = loadLibrary();
  return library.profiles.find((profile) => profile.id === library.activeProfileId) ?? library.profiles[0] ?? createProfile();
}

export function selectProfile(profileId: string): ProfileLibrary {
  const library = loadLibrary();
  if (library.profiles.some((profile) => profile.id === profileId)) library.activeProfileId = profileId;
  saveLibrary(library);
  return library;
}

export function addProfile(name: string): ProfileLibrary {
  const library = loadLibrary();
  const cleanName = cleanProfileName(name);
  if (!cleanName) throw new Error('Enter a profile name first.');
  if (library.profiles.length >= 12) throw new Error('This device can keep up to 12 local profiles.');
  const profile = createProfile(cleanName);
  library.profiles.push(profile);
  library.activeProfileId = profile.id;
  saveLibrary(library);
  return library;
}

export function renameProfile(profileId: string, name: string): ProfileLibrary {
  const cleanName = cleanProfileName(name);
  if (!cleanName) throw new Error('Profile name cannot be empty.');
  const library = loadLibrary();
  const profile = library.profiles.find((item) => item.id === profileId);
  if (!profile) throw new Error('That profile is no longer available.');
  profile.name = cleanName;
  profile.updatedAt = Date.now();
  saveLibrary(library);
  return library;
}

export function setActiveTitle(profileId: string, titleId: string): ProfileLibrary {
  const library = loadLibrary();
  const profile = library.profiles.find((item) => item.id === profileId);
  if (!profile) throw new Error('That profile is no longer available.');
  if (!profile.unlockedTitleIds.includes(titleId)) throw new Error('Earn this title before equipping it.');
  profile.activeTitleId = titleId;
  profile.updatedAt = Date.now();
  saveLibrary(library);
  return library;
}

export function getActiveTitle(profile: PlayerProfile): TitleDefinition {
  return TITLE_CATALOG.find((title) => title.id === profile.activeTitleId) ?? TITLE_CATALOG[0];
}

function numberAt(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) return undefined;
  const field = value[key];
  return typeof field === 'number' && Number.isFinite(field) ? field : undefined;
}

function recordAt(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function playerScore(input: FinishedMatchInput): number {
  const fromResult = input.scores?.[input.playerId];
  if (typeof fromResult === 'number' && Number.isFinite(fromResult)) return fromResult;
  const stateScores = recordAt(input.state, 'scores');
  const fromState = isRecord(stateScores) ? stateScores[input.playerId] : undefined;
  if (typeof fromState === 'number' && Number.isFinite(fromState)) return fromState;
  if (input.gameId === 'ayo' && Array.isArray(recordAt(input.state, 'playerIds'))) {
    const playerIds = recordAt(input.state, 'playerIds') as unknown[];
    const captured = recordAt(input.state, 'captured');
    if (Array.isArray(captured)) {
      const index = playerIds.findIndex((id) => id === input.playerId);
      if (index >= 0 && typeof captured[index] === 'number') return captured[index];
    }
  }
  const directScore = numberAt(input.state, 'score');
  if (directScore !== undefined) return directScore;
  const points = input.pointsEarned?.[input.playerId];
  if (typeof points === 'number' && Number.isFinite(points)) return points;
  const hye = input.hyeEarned?.[input.playerId];
  return typeof hye === 'number' && Number.isFinite(hye) ? hye : 0;
}

function deriveSpecialAchievementIds(input: FinishedMatchInput, outcome: MatchOutcome, score: number, moves: number): string[] {
  const ids: string[] = [];
  const state = input.state;
  if (input.gameId === 'chess' && outcome === 'win' && input.reason.toLowerCase().includes('checkmate')) ids.push('checkmate');
  if (input.gameId === 'ayo' && score >= 50) ids.push('ayo-50-seeds');
  if (input.gameId === 'vita-mahjong' && (numberAt(state, 'bestCombo') ?? 0) >= 5) ids.push('vita-combo-5');
  if (input.gameId === '2048') {
    const board = recordAt(state, 'board');
    const tiles = Array.isArray(board) ? board.filter((v): v is number => typeof v === 'number') : [];
    const highest = Math.max(0, ...tiles);
    if (highest >= 2048) ids.push('2048-reached');
    if (highest >= 4096) ids.push('2048-beyond');
    if ((numberAt(state, 'bestCombo') ?? 0) >= 5) ids.push('2048-combo-5');
  }
  if (input.gameId === 'hangman' && outcome === 'solo-success' && recordAt(state, 'won') === true && recordAt(state, 'hintUsed') === false && (numberAt(state, 'mistakes') ?? 1) === 0) ids.push('hangman-perfect');
  if (input.gameId === 'minesweeper' && outcome === 'solo-success' && recordAt(state, 'won') === true) ids.push('minesweeper-clear');
  if (input.gameId === 'sudoku' && outcome === 'solo-success' && recordAt(state, 'over') === true && (numberAt(state, 'mistakes') ?? 1) === 0 && (numberAt(state, 'hints') ?? 1) === 0) ids.push('sudoku-clean');
  if (input.gameId === 'memory-match' && outcome === 'win') {
    const cards = recordAt(state, 'cards'); const matched = recordAt(state, 'matched');
    if (Array.isArray(cards) && Array.isArray(matched) && cards.length > 0 && matched.length === cards.length) ids.push('memory-complete');
  }
  if (input.gameId === 'othello' && outcome === 'win') ids.push('othello-reversal');
  if (input.gameId === 'battleship' && outcome === 'win') ids.push('battleship-fleet');
  if (input.gameId === 'dominoes' && outcome === 'win') {
    const playerIds = recordAt(state, 'playerIds'); const hands = recordAt(state, 'hands');
    const index = Array.isArray(playerIds) ? playerIds.indexOf(input.playerId) : -1;
    if (Array.isArray(hands) && index >= 0 && Array.isArray(hands[index]) && hands[index].length === 0) ids.push('dominoes-chain');
  }
  if (input.gameId === 'backgammon' && outcome === 'win') {
    const playerIds = recordAt(state, 'playerIds'); const off = recordAt(state, 'off');
    const index = Array.isArray(playerIds) ? playerIds.indexOf(input.playerId) : -1;
    if (Array.isArray(off) && index >= 0 && off[index] >= 15) ids.push('backgammon-home');
  }
  if (input.gameId === 'hearts' && outcome === 'win') ids.push('hearts-keeper');
  if (input.gameId === 'scrabble' && score >= 100) ids.push('scrabble-100');
  if (input.gameId === 'solitaire' && outcome === 'solo-success' && moves < 100) ids.push('solitaire-under-100');
  if (input.gameId === 'pirate-go') {
    const captures = recordAt(state, 'captures');
    if (isRecord(captures) && Number(captures[input.playerId]) >= 10) ids.push('pirate-captain');
  }
  if (moves >= 150) ids.push('long-match');
  return ids;
}

function payloadMap(move: FinishedMatchInput['moves'][number]): Record<string, unknown> {
  return isRecord(move.payload) ? move.payload : {};
}

function countPlayerMoves(input: FinishedMatchInput, predicate: (move: FinishedMatchInput['moves'][number]) => boolean): number {
  return input.moves.filter((move) => move.player === input.playerId && predicate(move)).length;
}

function collectGameMetrics(input: FinishedMatchInput, score: number, playerMoves: number): Record<string, number> {
  const state = input.state;
  const metrics: Record<string, number> = {};
  const playerMoveTypeCount = (matcher: (type: string, payload: Record<string, unknown>) => boolean) =>
    countPlayerMoves(input, (move) => matcher((move.type ?? '').toLowerCase(), payloadMap(move)));
  const stateMap = (key: string) => recordAt(state, key);
  const setMetric = (key: string, value: number | undefined) => {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) metrics[key] = value;
  };

  switch (input.gameId) {
    case 'tic-tac-toe': setMetric('movesTaken', playerMoves); break;
    case 'connect-four': setMetric('piecesDropped', playerMoves); break;
    case 'gomoku': setMetric('stonesPlaced', playerMoves); break;
    case 'snake-ladder': {
      const players = stateMap('players');
      if (Array.isArray(players)) setMetric('diceRolls', numberAt(players.find((p) => recordAt(p, 'id') === input.playerId), 'rolls'));
      break;
    }
    case 'ludo': {
      const pawns = stateMap('pawns');
      const playerIds = stateMap('playerIds');
      if (Array.isArray(pawns) && isRecord(playerIds)) {
        const color = Object.entries(playerIds).find(([, id]) => id === input.playerId)?.[0];
        setMetric('pawnsFinished', pawns.filter((pawn) => recordAt(pawn, 'color') === color && (recordAt(pawn, 'state') === 'finished' || numberAt(pawn, 'step') === 57)).length);
      }
      setMetric('diceRolls', playerMoveTypeCount((type) => type.includes('roll')));
      break;
    }
    case 'drafts':
    case 'checkers': {
      setMetric('captures', playerMoveTypeCount((_type, payload) => payload.captured !== null && payload.captured !== undefined));
      setMetric('promotions', playerMoveTypeCount((_type, payload) => payload.promoted === true || ['q', 'r', 'b', 'n'].includes(String(payload.promotion ?? ''))));
      break;
    }
    case 'crazy-eights':
    case 'uno': {
      setMetric('cardsPlayed', playerMoveTypeCount((_type, payload) => typeof payload.cardId === 'string' && payload.type !== 'draw'));
      setMetric('cardsDrawn', playerMoveTypeCount((type, payload) => type.includes('draw') || payload.type === 'draw' || payload.action === 'draw'));
      break;
    }
    case 'whot': {
      setMetric('cardsPlayed', playerMoveTypeCount((_type, payload) => payload.type !== 'market' && typeof payload.cardId === 'string'));
      setMetric('marketDraws', playerMoveTypeCount((_type, payload) => payload.type === 'market'));
      break;
    }
    case 'solitaire': {
      const foundations = stateMap('foundations');
      if (Array.isArray(foundations)) setMetric('foundationCards', foundations.reduce((sum, pile) => sum + (Array.isArray(pile) ? pile.length : 0), 0));
      setMetric('stockDraws', playerMoveTypeCount((_type, payload) => payload.type === 'draw' || payload.action === 'draw'));
      break;
    }
    case 'mahjong-solitaire': setMetric('pairsCleared', numberAt(state, 'matches')); break;
    case 'monopoly': {
      const owners = stateMap('owned');
      const money = stateMap('money');
      if (isRecord(owners)) setMetric('propertiesOwned', Object.values(owners).filter((owner) => owner === input.playerId).length);
      if (isRecord(money)) setMetric('cashAtFinish', numberAt(money, input.playerId));
      break;
    }
    case 'monopoly-deal': {
      const properties = stateMap('properties');
      const bank = stateMap('bank');
      if (isRecord(properties)) {
        const value = properties[input.playerId];
        setMetric('propertyCardsOwned', Array.isArray(value) ? value.length : 0);
      }
      if (isRecord(bank)) {
        const value = bank[input.playerId];
        setMetric('bankedCards', Array.isArray(value) ? value.length : 0);
      }
      setMetric('cardsPlayed', playerMoveTypeCount((_type, payload) => ['playMoney', 'playProperty', 'moveWild', 'playAction'].includes(String(payload.action))));
      break;
    }
    case 'scramble': {
      const solved = stateMap('solved');
      if (isRecord(solved)) setMetric('correctAnswers', numberAt(solved, input.playerId));
      break;
    }
    case 'treasure-hunt': {
      setMetric('digAttempts', playerMoves);
      setMetric('score', score);
      break;
    }
    case 'chess': {
      const board = stateMap('board');
      const playerIds = stateMap('playerIds');
      if (Array.isArray(board) && Array.isArray(playerIds)) {
        const playerIndex = playerIds.findIndex((id) => id === input.playerId);
        if (playerIndex >= 0) {
          const opponentColor = playerIndex === 0 ? 'b' : 'w';
          setMetric('piecesCaptured', Math.max(0, 16 - board.filter((piece) => recordAt(piece, 'c') === opponentColor).length));
        }
      }
      setMetric('promotions', playerMoveTypeCount((_type, payload) => ['q', 'r', 'b', 'n'].includes(String(payload.promotion ?? ''))));
      break;
    }
    case 'pirate-go': {
      const captures = stateMap('captures');
      if (isRecord(captures)) setMetric('captures', numberAt(captures, input.playerId));
      setMetric('stonesPlaced', playerMoveTypeCount((_type, payload) => payload.action === 'place'));
      break;
    }
    case 'scrabble': {
      const wordMoves = input.moves.filter((move) => move.player === input.playerId && ((move.type ?? '').toLowerCase().includes('word') || typeof payloadMap(move).word === 'string'));
      setMetric('wordsPlayed', wordMoves.length);
      setMetric('longestWord', wordMoves.reduce((best, move) => Math.max(best, String(payloadMap(move).word ?? '').length), 0));
      break;
    }
    case 'mahjong': {
      const winnerBy = recordAt(state, 'winnerBy');
      setMetric('selfDrawFinishes', input.winnerId === input.playerId && winnerBy === 'self-draw' ? 1 : 0);
      const handScore = numberAt(state, 'handScore');
      if (input.winnerId === input.playerId) setMetric('handScore', handScore);
      break;
    }
    case 'vita-mahjong': {
      setMetric('pairsCleared', numberAt(state, 'matches'));
      setMetric('bestCombo', numberAt(state, 'bestCombo'));
      const hintsLeft = numberAt(state, 'hints');
      if (hintsLeft !== undefined) setMetric('hintsUsed', Math.max(0, 3 - hintsLeft));
      break;
    }
    case 'ayo': {
      const captured = stateMap('captured');
      const playerIds = stateMap('playerIds');
      if (Array.isArray(captured) && Array.isArray(playerIds)) {
        const index = playerIds.findIndex((id) => id === input.playerId);
        if (index >= 0) setMetric('seedsCaptured', Number(captured[index]));
      }
      setMetric('movesPlayed', playerMoves);
      break;
    }
    case 'dominoes': {
      setMetric('tilesPlayed', playerMoveTypeCount((type) => type === 'place'));
      const playerIds = recordAt(state, 'playerIds');
      const hands = recordAt(state, 'hands');
      if (Array.isArray(playerIds) && Array.isArray(hands)) {
        const index = playerIds.findIndex((id) => id === input.playerId);
        const hand = index >= 0 ? hands[index] : undefined;
        if (Array.isArray(hand)) setMetric('remainingPips', hand.reduce((sum, tile) => sum + (Array.isArray(tile) ? Number(tile[0] ?? 0) + Number(tile[1] ?? 0) : 0), 0));
      }
      break;
    }
    case 'othello': {
      const board = recordAt(state, 'board');
      const playerIds = recordAt(state, 'playerIds');
      if (Array.isArray(board) && Array.isArray(playerIds)) {
        const index = playerIds.findIndex((id) => id === input.playerId);
        const mark = index === 0 ? 'B' : 'W';
        setMetric('discsAtEnd', board.filter((disc) => disc === mark).length);
      }
      setMetric('discsPlaced', playerMoveTypeCount((type) => type === 'place'));
      break;
    }
    case 'backgammon': {
      const off = recordAt(state, 'off');
      const playerIds = recordAt(state, 'playerIds');
      if (Array.isArray(off) && Array.isArray(playerIds)) {
        const index = playerIds.findIndex((id) => id === input.playerId);
        if (index >= 0) setMetric('checkersBorneOff', Number(off[index]));
      }
      setMetric('diceRolls', playerMoveTypeCount((type) => type === 'roll'));
      break;
    }
    case 'battleship': {
      const shots = recordAt(state, 'shots'), hits = recordAt(state, 'hits'), ships = recordAt(state, 'ships'), playerIds = recordAt(state, 'playerIds');
      if (Array.isArray(playerIds)) {
        const index = playerIds.findIndex((id) => id === input.playerId);
        if (index >= 0) {
          if (Array.isArray(shots) && Array.isArray(shots[index])) setMetric('shotsFired', shots[index].length);
          if (Array.isArray(hits) && Array.isArray(hits[index])) setMetric('hits', hits[index].length);
          if (Array.isArray(ships) && Array.isArray(ships[1 - index]) && Array.isArray(shots) && Array.isArray(shots[index])) {
            const ownShots = shots[index] as unknown[];
            setMetric('shipsSunk', (ships[1 - index] as unknown[]).filter(ship => Array.isArray(recordAt(ship, 'cells')) && (recordAt(ship, 'cells') as unknown[]).length > 0 && (recordAt(ship, 'cells') as unknown[]).every(cell => ownShots.includes(cell))).length);
          }
        }
      }
      break;
    }
    case '2048': {
      setMetric('score', numberAt(state, 'score'));
      const board = recordAt(state, 'board');
      if (Array.isArray(board)) setMetric('bestTile', Math.max(0, ...board.map(Number).filter(Number.isFinite)));
      setMetric('totalMerges', numberAt(state, 'totalMerges'));
      setMetric('bestCombo', numberAt(state, 'bestCombo'));
      break;
    }
    case 'minesweeper': {
      const revealed = recordAt(state, 'revealed'), flags = recordAt(state, 'flags');
      if (Array.isArray(revealed)) setMetric('safeSquares', revealed.length);
      if (Array.isArray(flags)) setMetric('flagsPlaced', flags.length);
      break;
    }
    case 'sudoku': {
      const board = recordAt(state, 'board'), solution = recordAt(state, 'solution');
      if (Array.isArray(board) && Array.isArray(solution)) setMetric('correctCells', board.filter((value, index) => value !== 0 && value === solution[index]).length);
      setMetric('mistakes', numberAt(state, 'mistakes'));
      setMetric('hintsUsed', numberAt(state, 'hints'));
      break;
    }
    case 'memory-match': {
      const scores = recordAt(state, 'scores'), playerIds = recordAt(state, 'playerIds');
      if (Array.isArray(scores) && Array.isArray(playerIds)) { const index = playerIds.findIndex(id => id === input.playerId); if (index >= 0) setMetric('pairsFound', Number(scores[index])); }
      setMetric('cardsFlipped', playerMoveTypeCount((type) => type === 'flip'));
      break;
    }
    case 'hearts': {
      const points = recordAt(state, 'points'), playerIds = recordAt(state, 'playerIds'), log = recordAt(state, 'log');
      if (Array.isArray(points) && Array.isArray(playerIds)) { const index = playerIds.findIndex(id => id === input.playerId); if (index >= 0) setMetric('penaltyPoints', Number(points[index])); }
      if (Array.isArray(log)) setMetric('tricksWon', log.filter(entry => typeof entry === 'string' && entry.startsWith(`${input.playerId} took the trick`)).length);
      break;
    }
    case 'hangman': {
      setMetric('wrongGuesses', numberAt(state, 'mistakes'));
      setMetric('hintsUsed', recordAt(state, 'hintUsed') === true ? 1 : 0);
      setMetric('wordLength', typeof recordAt(state, 'word') === 'string' ? (recordAt(state, 'word') as string).length : undefined);
      break;
    }
  }
  return metrics;
}

function matchBaseXp(outcome: MatchOutcome, moves: number): number {
  const activityBonus = Math.min(20, Math.floor(Math.max(0, moves) / 10));
  if (outcome === 'win') return 35 + activityBonus;
  if (outcome === 'loss') return 12 + Math.min(8, activityBonus);
  if (outcome === 'draw') return 18 + Math.min(10, activityBonus);
  if (outcome === 'solo-success') return 40 + activityBonus;
  return 8 + Math.min(5, activityBonus);
}

function unlockTitleIds(profile: PlayerProfile): string[] {
  const ids = new Set(profile.unlockedTitleIds);
  ids.add('arcade-newcomer');
  if (profile.matchesPlayed >= 25) ids.add('arcade-regular');
  if (profile.matchesPlayed >= 100) ids.add('arcade-veteran');
  if (profile.matchesPlayed >= 250) ids.add('arcade-legend');
  if (profile.wins >= 50) ids.add('arcade-champion');
  const gamesPlayed = Object.values(profile.gameStats).filter((stats) => stats.matchesPlayed > 0).length;
  if (gamesPlayed >= 10) ids.add('arcade-all-rounder');
  if (gamesPlayed >= GAME_CATALOG.length) ids.add('arcade-completionist');
  if (profile.bestWinStreak >= 10) ids.add('arcade-unstoppable');
  for (const game of GAME_CATALOG) if ((profile.gameStats[game.id]?.wins ?? 0) >= 5) ids.add(`title-${game.id}`);
  return [...ids];
}

function unlockAchievementIds(profile: PlayerProfile, match: MatchRecord, specialIds: string[]): string[] {
  const ids = new Set(profile.unlockedAchievements.map((item) => item.id));
  const gamesPlayed = Object.values(profile.gameStats).filter((stats) => stats.matchesPlayed > 0).length;
  const conditions: Array<[string, boolean]> = [
    ['first-match', profile.matchesPlayed >= 1], ['first-win', profile.wins >= 1], ['first-draw', profile.draws >= 1],
    ['matches-10', profile.matchesPlayed >= 10], ['matches-25', profile.matchesPlayed >= 25], ['matches-50', profile.matchesPlayed >= 50], ['matches-100', profile.matchesPlayed >= 100], ['matches-250', profile.matchesPlayed >= 250],
    ['wins-10', profile.wins >= 10], ['wins-25', profile.wins >= 25], ['wins-50', profile.wins >= 50], ['wins-100', profile.wins >= 100],
    ['streak-3', profile.bestWinStreak >= 3], ['streak-5', profile.bestWinStreak >= 5], ['streak-10', profile.bestWinStreak >= 10],
    ['games-5', gamesPlayed >= 5], ['games-10', gamesPlayed >= 10], ['games-all', gamesPlayed >= GAME_CATALOG.length],
    ['xp-100', profile.totalXp >= 100], ['xp-500', profile.totalXp >= 500], ['xp-1000', profile.totalXp >= 1000], ['xp-5000', profile.totalXp >= 5000],
  ];
  for (const [id, condition] of conditions) if (condition) ids.add(id);
  const gameStats = profile.gameStats[match.gameId];
  if (gameStats) {
    if (gameStats.matchesPlayed >= 1) ids.add(`played-${match.gameId}`);
    if (gameStats.wins >= 1) ids.add(`won-${match.gameId}`);
    if (gameStats.wins >= 10) ids.add(`mastered-${match.gameId}`);
  }
  for (const id of specialIds) ids.add(id);
  return [...ids];
}

function outcomeFor(input: FinishedMatchInput): MatchOutcome {
  if (input.winnerId === input.playerId) return input.players.length === 1 ? 'solo-success' : 'win';
  if (input.winnerId !== null) return 'loss';
  if (input.players.length === 1) return 'solo-failure';
  return 'draw';
}

function updateGameStats(previous: GameStatistics | undefined, outcome: MatchOutcome, score: number, moves: number, xp: number, endedAt: number, durationMs: number, matchMetrics: Record<string, number>, gameId: string): GameStatistics {
  const stats = { ...(previous ?? zeroGameStats()) };
  stats.matchesPlayed += 1;
  stats.totalMoves += moves;
  stats.totalScore += score;
  stats.bestScore = Math.max(stats.bestScore, score);
  stats.totalXp += xp;
  stats.lastPlayedAt = endedAt;
  for (const [key, value] of Object.entries(matchMetrics)) {
    const definition = GAME_METRICS[gameId]?.find((metric) => metric.key === key);
    if (definition?.aggregation === 'max') stats.metrics[key] = Math.max(stats.metrics[key] ?? 0, value);
    else stats.metrics[key] = (stats.metrics[key] ?? 0) + value;
    stats.bestMetrics[key] = Math.max(stats.bestMetrics[key] ?? 0, value);
  }
  if (outcome === 'win' || outcome === 'solo-success') {
    stats.wins += 1;
    if (outcome === 'solo-success') stats.soloSuccesses += 1;
    stats.currentWinStreak += 1;
    stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.currentWinStreak);
    stats.currentLossStreak = 0;
    if (stats.fastestWinMs === null || durationMs < stats.fastestWinMs) stats.fastestWinMs = durationMs;
  } else if (outcome === 'loss') {
    stats.losses += 1;
    stats.currentLossStreak += 1;
    stats.currentWinStreak = 0;
  } else if (outcome === 'draw') {
    stats.draws += 1;
    stats.currentWinStreak = 0;
    stats.currentLossStreak = 0;
  } else {
    stats.soloFailures += 1;
    stats.currentWinStreak = 0;
  }
  return stats;
}

export function applyFinishedMatch(original: PlayerProfile, input: FinishedMatchInput): { profile: PlayerProfile; award: MatchAward | null } {
  if (original.matchHistory.some((match) => match.id === input.sessionId)) return { profile: original, award: null };
  const player = input.players.find((item) => item.id === input.playerId);
  if (!player) return { profile: original, award: null };
  const outcome = outcomeFor(input);
  const endedAt = Math.max(input.startedAt, input.endedAt || Date.now());
  const durationMs = Math.max(0, Math.min(7 * 24 * 60 * 60 * 1000, endedAt - input.startedAt));
  const moveCount = input.moves.length;
  const playerMoves = input.moves.filter((move) => move.player === input.playerId).length;
  const score = playerScore(input);
  const matchMetrics = collectGameMetrics(input, score, playerMoves);
  const baseXp = matchBaseXp(outcome, playerMoves);
  const specialIds = deriveSpecialAchievementIds(input, outcome, score, moveCount);
  const gameName = input.gameName || GAME_CATALOG.find((game) => game.id === input.gameId)?.name || input.gameId;
  const match: MatchRecord = {
    id: input.sessionId, gameId: input.gameId, gameName, boardId: input.boardId, outcome,
    playerId: input.playerId, playerName: player.name,
    opponentNames: input.players.filter((item) => item.id !== input.playerId).map((item) => item.name),
    score, moves: moveCount, durationMs, xpEarned: baseXp, reason: input.reason || 'Match completed',
    startedAt: input.startedAt, endedAt, achievementIds: [], metrics: matchMetrics,
    moveHistory: input.moves.slice(0, 2000), playerRoster: input.players.map(p => ({ id:p.id, name:p.name, ...(p.kind ? {kind:p.kind} : {}) })).slice(0,8), initialState: input.initialState,
  };
  const profile: PlayerProfile = {
    ...original,
    unlockedTitleIds: [...original.unlockedTitleIds],
    unlockedAchievements: [...original.unlockedAchievements],
    updatedAt: endedAt,
    matchesPlayed: original.matchesPlayed + 1,
    wins: original.wins + ((outcome === 'win' || outcome === 'solo-success') ? 1 : 0),
    losses: original.losses + (outcome === 'loss' ? 1 : 0),
    draws: original.draws + (outcome === 'draw' ? 1 : 0),
    soloSuccesses: original.soloSuccesses + (outcome === 'solo-success' ? 1 : 0),
    soloFailures: original.soloFailures + (outcome === 'solo-failure' ? 1 : 0),
    totalXp: original.totalXp + baseXp,
    currentWinStreak: (outcome === 'win' || outcome === 'solo-success') ? original.currentWinStreak + 1 : 0,
    bestWinStreak: Math.max(original.bestWinStreak, (outcome === 'win' || outcome === 'solo-success') ? original.currentWinStreak + 1 : 0),
    currentLossStreak: outcome === 'loss' ? original.currentLossStreak + 1 : 0,
    lastPlayedAt: endedAt,
    gameStats: {
      ...original.gameStats,
      [input.gameId]: updateGameStats(original.gameStats[input.gameId], outcome, score, moveCount, baseXp, endedAt, durationMs, matchMetrics, input.gameId),
    },
    matchHistory: [match, ...original.matchHistory].slice(0, MAX_MATCH_HISTORY),
  };

  const beforeAchievementIds = new Set(original.unlockedAchievements.map((item) => item.id));
  let afterIds = unlockAchievementIds(profile, match, specialIds);
  let unlocked = afterIds.filter((id) => !beforeAchievementIds.has(id));
  let bonusXp = 0;
  for (const id of unlocked) bonusXp += ACHIEVEMENT_CATALOG.find((item) => item.id === id)?.xpReward ?? 0;
  profile.totalXp += bonusXp;
  profile.gameStats[input.gameId].totalXp += bonusXp;
  // XP-reward achievements (for example XP 100) can cross their threshold after another achievement reward.
  for (let pass = 0; pass < 3; pass += 1) {
    afterIds = unlockAchievementIds(profile, match, specialIds);
    const extra = afterIds.filter((id) => !beforeAchievementIds.has(id) && !unlocked.includes(id));
    if (!extra.length) break;
    unlocked.push(...extra);
    const extraXp = extra.reduce((sum, id) => sum + (ACHIEVEMENT_CATALOG.find((item) => item.id === id)?.xpReward ?? 0), 0);
    bonusXp += extraXp;
    profile.totalXp += extraXp;
    profile.gameStats[input.gameId].totalXp += extraXp;
  }
  const nowUnlocked = new Set(profile.unlockedAchievements.map((item) => item.id));
  const unlockTime = endedAt;
  for (const id of unlocked) if (!nowUnlocked.has(id)) profile.unlockedAchievements.push({ id, unlockedAt: unlockTime });
  // unlockAchievementIds includes existing IDs; only the new ones are appended above.
  const finalUnlockedAchievementIds = unlockAchievementIds(profile, match, specialIds);
  const allUnlocked = new Set(profile.unlockedAchievements.map((item) => item.id));
  for (const id of finalUnlockedAchievementIds) if (!allUnlocked.has(id)) profile.unlockedAchievements.push({ id, unlockedAt: unlockTime });

  const oldTitleIds = new Set(original.unlockedTitleIds);
  profile.unlockedTitleIds = unlockTitleIds(profile);
  if (!profile.unlockedTitleIds.includes(profile.activeTitleId)) profile.activeTitleId = 'arcade-newcomer';
  const newAchievementIds = unlocked;
  const newTitleIds = profile.unlockedTitleIds.filter((id) => !oldTitleIds.has(id));
  match.xpEarned = baseXp + bonusXp;
  match.achievementIds = newAchievementIds;
  profile.matchHistory[0] = match;
  const award: MatchAward = {
    record: match,
    unlockedAchievements: newAchievementIds.map((id) => ACHIEVEMENT_CATALOG.find((item) => item.id === id)).filter((item): item is AchievementDefinition => !!item),
    unlockedTitles: newTitleIds.map((id) => TITLE_CATALOG.find((item) => item.id === id)).filter((item): item is TitleDefinition => !!item),
    totalXp: profile.totalXp,
  };
  return { profile, award };
}

export function recordFinishedMatch(input: FinishedMatchInput): MatchAward | null {
  const library = loadLibrary();
  const player = input.players.find((item) => item.id === input.playerId);
  const profileId = player?.profileId;
  if (!profileId) return null;
  const index = library.profiles.findIndex((profile) => profile.id === profileId);
  if (index < 0) return null;
  const result = applyFinishedMatch(library.profiles[index], input);
  if (!result.award) return null;
  library.profiles[index] = result.profile;
  saveLibrary(library);
  return result.award;
}

export function exportProfileBackup(profile: PlayerProfile): string {
  return JSON.stringify({ product: 'Hye Arcade', schemaVersion: PROFILE_SCHEMA_VERSION, exportedAt: new Date().toISOString(), profile }, null, 2);
}

export function importProfileBackup(raw: string): ProfileLibrary {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('This file is not valid JSON.'); }
  if (!isRecord(parsed) || parsed.product !== 'Hye Arcade' || parsed.schemaVersion !== PROFILE_SCHEMA_VERSION) throw new Error('This is not a supported Hye Arcade Layer 1 profile backup.');
  const profile = normalizeProfile(parsed.profile);
  if (!profile) throw new Error('The backup profile is incomplete or unsupported.');
  const library = loadLibrary();
  const foundIndex = library.profiles.findIndex((item) => item.id === profile.id);
  if (foundIndex >= 0) library.profiles[foundIndex] = profile;
  else if (library.profiles.length < 12) library.profiles.push(profile);
  else throw new Error('This device already has 12 profiles. Remove a profile before importing another.');
  library.activeProfileId = profile.id;
  saveLibrary(library);
  return library;
}

export function toFinishedMatchInput(options: {
  session: { id: string; gameId: string; boardId?: string; players: FinishedMatchInput['players']; history: FinishedMatchInput['moves']; state: unknown; initialState?: unknown; createdAt: number; updatedAt: number; result: { winner: string | null; reason: string; scores?: Record<string, number>; pointsEarned?: Record<string, number>; hyeEarned?: Record<string, number> } | null };
  gameName: string;
  playerId: string;
}): FinishedMatchInput | null {
  const { session } = options;
  if (!session.result) return null;
  return {
    sessionId: session.id, gameId: session.gameId, gameName: options.gameName, boardId: session.boardId,
    players: session.players, playerId: options.playerId, winnerId: session.result.winner,
    reason: session.result.reason, scores: session.result.scores,
    pointsEarned: session.result.pointsEarned, hyeEarned: session.result.hyeEarned,
    state: session.state, moves: session.history, initialState: session.initialState,
    startedAt: session.createdAt, endedAt: session.updatedAt,
  };
}
