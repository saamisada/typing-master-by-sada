export type GameMode = 'solo' | 'versus';

export type DifficultyMode = 'easy' | 'normal' | 'fast';

export type ArenaTheme = 'cyber' | 'obsidian' | 'arctic';

export type GamePhase =
  | 'title'
  | 'playing'
  | 'paused'
  | 'handoff'
  | 'results';

export interface PlayerRunResult {
  name: string;
  wpm: number;
  accuracy: number;
  score: number;
  maxCombo: number;
  wordsCleared: number;
  targetWords: number;
  survived: boolean;
}

export interface GameTelemetry {
  phase: GamePhase;
  mode: GameMode;
  activePlayerIndex: 1 | 2;
  activePlayerName: string;
  wpm: number;
  accuracy: number;
  score: number;
  combo: number;
  maxCombo: number;
  wave: number;
  shield: number;
  maxShield: number;
  wordsCleared: number;
  targetWords: number;
  activeTargetWord: string | null;
  typedBuffer: string;
  lastEventText: string;
}

export interface LeaderboardEntry {
  id: string;
  player: string;
  wpm: number;
  accuracy: number;
  score: number;
  mode: GameMode;
  difficulty: DifficultyMode;
  date: string;
}
