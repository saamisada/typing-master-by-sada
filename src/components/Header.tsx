import React from 'react';
import { UserAccount } from '../types';

interface HeaderProps {
  user: UserAccount | null;
  onOpenAuth: (defaultTab: 'signup' | 'signin') => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onOpenAuth }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/92">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          TypeVeloce 3D
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
        >
          <a
            href="#features"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Features
          </a>
          <a
            href="#arena"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            3D Arena
          </a>
          <a
            href="#leaderboard"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Leaderboard
          </a>
          <a
            href="#pricing"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Pricing
          </a>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => onOpenAuth(user ? 'signin' : 'signup')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {user ? `${user.callsign} · ${user.plan === 'pro' ? 'Pro' : 'Free'}` : 'Get Started Free'}
          </button>
        </div>
      </div>
    </header>
  );
};
