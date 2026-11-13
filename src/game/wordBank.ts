import { DifficultyMode } from '../types';

const WORD_POOLS: Record<DifficultyMode, string[]> = {
  cadet: [
    'node', 'flux', 'grid', 'core', 'byte', 'sync', 'dash', 'beam', 'warp', 'dock',
    'code', 'loop', 'apex', 'bolt', 'wing', 'scan', 'hull', 'link', 'gate', 'zero',
    'fast', 'type', 'mint', 'neon', 'echo', 'zoom', 'lock', 'task', 'data', 'mesh',
    'void', 'star', 'flow', 'view', 'unit', 'port', 'axis', 'rail', 'peak', 'chip',
    'wave', 'disk', 'form', 'cast', 'drop', 'jump', 'lane', 'mode', 'path', 'ring',
  ],
  velocity: [
    'velocity', 'throttle', 'spectrum', 'compiler', 'protocol', 'pipeline', 'vector',
    'quantum', 'telemetry', 'kinetic', 'matrix', 'horizon', 'catalyst', 'manifold',
    'altitude', 'terminal', 'sequence', 'navigate', 'reactor', 'circuit', 'modular',
    'platform', 'rendered', 'workflow', 'snapshot', 'dynamic', 'freight', 'beacon',
    'phantom', 'turbine', 'optical', 'payload', 'cluster', 'vertex', 'compute',
    'command', 'dispatch', 'latency', 'horizon', 'kinetic', 'impulse', 'orbital',
  ],
  hyperdrive: [
    'synchronization', 'hypervelocity', 'architecture', 'orchestration', 'accelerometer',
    'authentication', 'microarchitecture', 'interstellar', 'transformation', 'configuration',
    'observability', 'parallelism', 'visualization', 'optimization', 'infrastructure',
    'deterministic', 'cryptographic', 'asynchronous', 'constellation', 'virtualization',
    'cybernetics', 'thermodynamic', 'photogrammetry', 'decomposition', 'spectroscopy',
    'nanostructure', 'encapsulation', 'polymorphism', 'interoperability', 'bioluminescence',
  ],
};

export function pickWord(difficulty: DifficultyMode, activeWords: string[]): string {
  const pool = WORD_POOLS[difficulty];
  const usedFirstChars = new Set(activeWords.map((w) => w[0]?.toLowerCase()));
  const usedWords = new Set(activeWords);

  // Prefer words with unique starting character and not currently on screen
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
    case 'cadet':
      return {
        label: 'Cadet',
        baseSpeed: 4.8,
        speedRamp: 0.35,
        spawnInterval: 2.3,
        maxConcurrent: 4,
        targetWords: 18,
      };
    case 'velocity':
      return {
        label: 'Velocity',
        baseSpeed: 6.4,
        speedRamp: 0.48,
        spawnInterval: 1.85,
        maxConcurrent: 5,
        targetWords: 24,
      };
    case 'hyperdrive':
      return {
        label: 'Hyperdrive',
        baseSpeed: 7.8,
        speedRamp: 0.62,
        spawnInterval: 1.65,
        maxConcurrent: 6,
        targetWords: 30,
      };
  }
}
