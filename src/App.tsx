import { useCallback, useEffect, useState } from 'react';
import { TypingArena3D } from './components/TypingArena3D';
import { LeaderboardEntry } from './types';

const STORAGE_KEY = 'typing_master_sada_leaderboard';

const SEED_SCORES: LeaderboardEntry[] = [
  {
    id: 'seed-1',
    player: 'Sada',
    wpm: 58,
    accuracy: 98,
    score: 2150,
    mode: 'solo',
    difficulty: 'easy',
    date: '2026-11-12',
  },
  {
    id: 'seed-2',
    player: 'Aarav',
    wpm: 46,
    accuracy: 96,
    score: 1680,
    mode: 'versus',
    difficulty: 'easy',
    date: '2026-11-12',
  },
  {
    id: 'seed-3',
    player: 'Maya',
    wpm: 64,
    accuracy: 97,
    score: 2640,
    mode: 'solo',
    difficulty: 'normal',
    date: '2026-11-11',
  },
];

export default function App() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LeaderboardEntry[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return SEED_SCORES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));
    } catch {
      // Ignore storage errors
    }
  }, [leaderboard]);

  const handleRecordRun = useCallback(
    (entry: Omit<LeaderboardEntry, 'id' | 'date'>) => {
      const next: LeaderboardEntry = {
        ...entry,
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: new Date().toISOString().slice(0, 10),
      };
      setLeaderboard((prev) => [next, ...prev].slice(0, 40));
    },
    [],
  );

  const handleClearLeaderboard = useCallback(() => {
    setLeaderboard([]);
  }, []);

  return (
    <TypingArena3D
      leaderboard={leaderboard}
      onRecordRun={handleRecordRun}
      onClearLeaderboard={handleClearLeaderboard}
    />
  );
}
