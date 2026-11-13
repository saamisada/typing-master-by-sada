import { DifficultyMode } from '../types';

const WORD_POOLS: Record<DifficultyMode, string[]> = {
  easy: [
    'star', 'fast', 'moon', 'blue', 'fire', 'wind', 'rock', 'gold', 'jump', 'play',
    'type', 'ship', 'glow', 'wave', 'bolt', 'beam', 'dash', 'zoom', 'mint', 'neon',
    'echo', 'hope', 'peak', 'dawn', 'sky', 'fly', 'ace', 'win', 'jet', 'sun',
    'cool', 'loop', 'sync', 'core', 'grid', 'ring', 'gate', 'zero', 'flow', 'path',
    'home', 'time', 'game', 'word', 'hero', 'leap', 'ring', 'drop', 'pass', 'song',
  ],
  normal: [
    'planet', 'rocket', 'silver', 'stream', 'future', 'launch', 'bright', 'vector',
    'shadow', 'signal', 'energy', 'galaxy', 'fusion', 'sprint', 'target', 'shield',
    'flight', 'beacon', 'chrome', 'matrix', 'sprint', 'window', 'motion', 'impact',
    'speedy', 'portal', 'charge', 'sparkle', 'horizon', 'flight', 'turbo', 'pilot',
    'rhythm', 'bounce', 'glider', 'bridge', 'summit', 'cosmos', 'laser', 'pulse',
  ],
  fast: [
    'velocity', 'spectrum', 'hyperdrive', 'starlight', 'navigator', 'lightning',
    'trajectory', 'interceptor', 'atmosphere', 'constellation', 'accelerator',
    'telemetry', 'cybernetic', 'challenger', 'scoreboard', 'champion', 'afterburner',
    'multiverse', 'supernova', 'shockwave', 'precision', 'commander', 'chronicle',
    'momentum', 'turbulence', 'wavelength', 'hypersonic', 'reflection', 'stratosphere',
  ],
};

export function pickWord(difficulty: DifficultyMode, activeWords: string[]): string {
  const pool = WORD_POOLS[difficulty];
  const usedFirstChars = new Set(activeWords.map((w) => w[0]?.toLowerCase()));
  const usedWords = new Set(activeWords);

  const distinctStart = pool.filter(
    (w) => !usedWords.has(w) && !usedFirstChars.has(w[0].toLowerCase()),
  );
  if (distinctStart.length > 0) {
    return distinctStart[Math.floor(Math.random() * distinctStart.length)];
  }

  const unused = pool.filter((w) => !usedWords.has(w));
  if (unused.length > 0) {
    return unused[Math.floor(Math.random() * unused.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

export function getDifficultyConfig(difficulty: DifficultyMode) {
  switch (difficulty) {
    case 'easy':
      return {
        label: 'Easy',
        baseSpeed: 3.1,
        speedRamp: 0.22,
        spawnInterval: 2.6,
        maxConcurrent: 3,
        targetWords: 12,
        maxShield: 5,
      };
    case 'normal':
      return {
        label: 'Normal',
        baseSpeed: 4.5,
        speedRamp: 0.34,
        spawnInterval: 2.1,
        maxConcurrent: 4,
        targetWords: 16,
        maxShield: 4,
      };
    case 'fast':
      return {
        label: 'Fast',
        baseSpeed: 5.9,
        speedRamp: 0.45,
        spawnInterval: 1.75,
        maxConcurrent: 5,
        targetWords: 20,
        maxShield: 3,
      };
  }
}
