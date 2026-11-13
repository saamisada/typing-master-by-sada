import React from 'react';

interface FooterProps {
  onOpenAuth: (tab: 'signup' | 'signin') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAuth }) => {
  return (
    <footer className="bg-slate-950 py-12">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <a
              href="#top"
              className="font-display text-lg font-bold tracking-tight text-white"
            >
              TypeVeloce 3D
            </a>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-400">
              WebGL 2.0 3D typing simulator and modular workspace velocity
              platform built for desktop and Samsung DeX.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-white">Platform</h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-400">
              <li>
                <a href="#arena" className="hover:text-white transition-colors">
                  3D Typing Arena
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="hover:text-white transition-colors"
                >
                  Workspace Modules
                </a>
              </li>
              <li>
                <a
                  href="#leaderboard"
                  className="hover:text-white transition-colors"
                >
                  Global Leaderboard
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="hover:text-white transition-colors"
                >
                  Pricing Plans
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-white">Distribution</h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-400">
              <li>
                <a
                  href="#download"
                  className="hover:text-white transition-colors"
                >
                  Desktop Suite
                </a>
              </li>
              <li>
                <a
                  href="#download"
                  className="hover:text-white transition-colors"
                >
                  Android APK
                </a>
              </li>
              <li>
                <a
                  href="#download"
                  className="hover:text-white transition-colors"
                >
                  Samsung DeX Preset
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-white">Account</h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signin')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Create Free Account
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} TypeVeloce 3D. All rights reserved.</p>
          <p>Hardware-accelerated Three.js WebGL · Procedural Web Audio</p>
        </div>
      </div>
    </footer>
  );
};
