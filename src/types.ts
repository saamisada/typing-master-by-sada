export type DifficultyMode = 'cadet' | 'velocity' | 'hyperdrive';

export type ArenaTheme = 'cyber' | 'obsidian' | 'arctic';

export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export interface GameTelemetry {
  phase: GamePhase;
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
  pilot: string;
  wpm: number;
  accuracy: number;
  score: number;
  difficulty: DifficultyMode;
  date: string;
  isUser?: boolean;
}

export interface CompanionConfig {
  liveWpmOverlay: boolean;
  mechanicalAudioPack: boolean;
  teamLeaderboardSync: boolean;
  offlineDrillCache: boolean;
  dexUltrawideMode: boolean;
}

export type PlanTier = 'free' | 'pro';

export interface UserAccount {
  callsign: string;
  email: string;
  plan: PlanTier;
}
