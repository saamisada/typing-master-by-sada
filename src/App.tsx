import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { TypingArena3D } from './components/TypingArena3D';
import { FeaturesShowcase } from './components/FeaturesShowcase';
import { CompanionSection } from './components/CompanionSection';
import { LeaderboardAndPricing } from './components/LeaderboardAndPricing';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import {
  CompanionConfig,
  DifficultyMode,
  LeaderboardEntry,
  PlanTier,
  UserAccount,
} from './types';

const BASELINE_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'seed-1',
    pilot: 'K. Takahashi',
    wpm: 138,
    accuracy: 99,
    score: 9420,
    difficulty: 'hyperdrive',
    date: '2026-11-12',
  },
  {
    id: 'seed-2',
    pilot: 'M. Lindqvist',
    wpm: 124,
    accuracy: 98,
    score: 8150,
    difficulty: 'hyperdrive',
    date: '2026-11-11',
  },
  {
    id: 'seed-3',
    pilot: 'R. Alvarez',
    wpm: 112,
    accuracy: 97,
    score: 6480,
    difficulty: 'velocity',
    date: '2026-11-12',
  },
  {
    id: 'seed-4',
    pilot: 'S. Patel',
    wpm: 98,
    accuracy: 99,
    score: 5720,
    difficulty: 'velocity',
    date: '2026-11-10',
  },
  {
    id: 'seed-5',
    pilot: 'E. Moreau',
    wpm: 86,
    accuracy: 96,
    score: 3890,
    difficulty: 'cadet',
    date: '2026-11-12',
  },
];

const DEFAULT_COMPANION: CompanionConfig = {
  liveWpmOverlay: true,
  mechanicalAudioPack: true,
  teamLeaderboardSync: true,
  offlineDrillCache: false,
  dexUltrawideMode: true,
};

export default function App() {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const [autoFocusTrigger, setAutoFocusTrigger] = useState(0);

  const [user, setUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('typeveloce_user');
      return saved ? (JSON.parse(saved) as UserAccount) : null;
    } catch {
      return null;
    }
  });

  const [companionConfig, setCompanionConfig] = useState<CompanionConfig>(() => {
    try {
      const saved = localStorage.getItem('typeveloce_companion');
      return saved ? (JSON.parse(saved) as CompanionConfig) : DEFAULT_COMPANION;
    } catch {
      return DEFAULT_COMPANION;
    }
  });

  const [userScores, setUserScores] = useState<LeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem('typeveloce_scores');
      return saved ? (JSON.parse(saved) as LeaderboardEntry[]) : [];
    } catch {
      return [];
    }
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signup' | 'signin'>('signup');
  const [authModalPlan, setAuthModalPlan] = useState<PlanTier>('free');

  useEffect(() => {
    try {
      if (user) localStorage.setItem('typeveloce_user', JSON.stringify(user));
      else localStorage.removeItem('typeveloce_user');
    } catch {
      // Ignore storage errors
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'typeveloce_companion',
        JSON.stringify(companionConfig),
      );
    } catch {
      // Ignore storage errors
    }
  }, [companionConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('typeveloce_scores', JSON.stringify(userScores));
    } catch {
      // Ignore storage errors
    }
  }, [userScores]);

  const handleOpenAuth = useCallback(
    (tab: 'signup' | 'signin', plan: PlanTier = 'free') => {
      setAuthModalTab(tab);
      setAuthModalPlan(plan);
      setAuthModalOpen(true);
    },
    [],
  );

  const handleLaunchArena = useCallback(() => {
    arenaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      setAutoFocusTrigger((c) => c + 1);
    }, 320);
  }, []);

  const handleScoreRecorded = useCallback(
    (run: {
      wpm: number;
      accuracy: number;
      score: number;
      difficulty: DifficultyMode;
    }) => {
      const entry: LeaderboardEntry = {
        id: `run-${Date.now()}`,
        pilot: user?.callsign || 'Local Pilot',
        wpm: run.wpm,
        accuracy: run.accuracy,
        score: run.score,
        difficulty: run.difficulty,
        date: new Date().toISOString().slice(0, 10),
        isUser: true,
      };
      setUserScores((prev) => [entry, ...prev].slice(0, 20));
    },
    [user?.callsign],
  );

  const allLeaderboardEntries = [...userScores, ...BASELINE_LEADERBOARD];
  const bestUserWpm = userScores.reduce(
    (max, item) => Math.max(max, item.wpm),
    102,
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        user={user}
        onOpenAuth={(tab) => handleOpenAuth(tab, user?.plan || 'free')}
      />

      <main>
        <HeroSection
          onLaunchArena={handleLaunchArena}
          onOpenSignIn={() => handleOpenAuth('signin', 'free')}
          bestWpm={bestUserWpm}
        />

        <TypingArena3D
          arenaRef={arenaRef}
          userCallsign={user?.callsign || 'Local Pilot'}
          userPlan={user?.plan || 'free'}
          onScoreRecorded={handleScoreRecorded}
          autoFocusTrigger={autoFocusTrigger}
        />

        <FeaturesShowcase />

        <CompanionSection
          config={companionConfig}
          onChangeConfig={setCompanionConfig}
        />

        <LeaderboardAndPricing
          entries={allLeaderboardEntries}
          activePlan={user?.plan || null}
          onChoosePlan={(plan) => handleOpenAuth('signup', plan)}
        />
      </main>

      <Footer onOpenAuth={(tab) => handleOpenAuth(tab, 'free')} />

      <AuthModal
        open={authModalOpen}
        initialTab={authModalTab}
        initialPlan={authModalPlan}
        currentUser={user}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(account) => setUser(account)}
        onSignOut={() => setUser(null)}
      />
    </div>
  );
}
