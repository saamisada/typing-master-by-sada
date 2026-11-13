import React, { useState } from 'react';
import { Check, Trophy } from 'lucide-react';
import { DifficultyMode, LeaderboardEntry, PlanTier } from '../types';

interface LeaderboardAndPricingProps {
  entries: LeaderboardEntry[];
  activePlan: PlanTier | null;
  onChoosePlan: (plan: PlanTier) => void;
}

export const LeaderboardAndPricing: React.FC<LeaderboardAndPricingProps> = ({
  entries,
  activePlan,
  onChoosePlan,
}) => {
  const [diffFilter, setDiffFilter] = useState<'all' | DifficultyMode>('all');

  const filteredEntries = entries
    .filter((e) => (diffFilter === 'all' ? true : e.difficulty === diffFilter))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return (
    <>
      {/* Live Leaderboard Section */}
      <section
        id="leaderboard"
        className="border-b border-white/10 bg-slate-950 py-16 lg:py-20"
      >
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-indigo-400">
                Verified Telemetry
              </p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
                Global Sector Leaderboard
              </h2>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900 p-1">
              {(
                [
                  { id: 'all', label: 'All Tiers' },
                  { id: 'cadet', label: 'Cadet' },
                  { id: 'velocity', label: 'Velocity' },
                  { id: 'hyperdrive', label: 'Hyperdrive' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDiffFilter(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    diffFilter === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-medium text-slate-400">
                  <th className="py-3.5 pl-6 pr-4">Rank</th>
                  <th className="py-3.5 px-4">Pilot</th>
                  <th className="py-3.5 px-4">Difficulty</th>
                  <th className="py-3.5 px-4 text-right">WPM</th>
                  <th className="py-3.5 px-4 text-right">Accuracy</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredEntries.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={
                      row.isUser
                        ? 'bg-indigo-950/35 text-white'
                        : 'text-slate-300 hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-3.5 pl-6 pr-4 font-mono text-xs font-semibold tabular-nums text-slate-400">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <span className="inline-flex items-center gap-2">
                        {idx === 0 && (
                          <Trophy className="h-4 w-4 text-amber-400" />
                        )}
                        <span>{row.pilot}</span>
                        {row.isUser && (
                          <span className="text-xs font-normal text-indigo-400">
                            (You)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 capitalize text-slate-400">
                      {row.difficulty}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-white tabular-nums">
                      {row.wpm}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400 tabular-nums">
                      {row.accuracy}%
                    </td>
                    <td className="py-3.5 pl-4 pr-6 text-right font-mono font-bold text-indigo-400 tabular-nums">
                      {row.score.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing & Subscription Plans Section */}
      <section
        id="pricing"
        className="border-b border-white/10 bg-slate-950 py-16 lg:py-20"
      >
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-indigo-400">
              Simple Licensing
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
              Train free forever, upgrade for Pro arenas
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Start immediately with the complete WebGL typing engine. Upgrade
              to Pro for custom 3D environments, multiplayer lobbies, and team
              analytics exports.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Free Tier */}
            <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900 p-7">
              <div>
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-xl font-bold text-white">Starter</h3>
                  <span className="font-mono text-3xl font-bold text-white tabular-nums">
                    $0
                    <span className="text-sm font-normal text-slate-400">
                      /mo
                    </span>
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  Full solo 3D typing engine with local performance records.
                </p>

                <ul className="mt-6 space-y-3 border-t border-white/10 pt-6 text-sm text-slate-300">
                  {[
                    'Playable 3D Interceptor Arena (60 FPS WebGL)',
                    'Cadet, Velocity, and Hyperdrive difficulty tiers',
                    'Indigo Cyber-Grid arena theme & procedural synth audio',
                    'Local leaderboard persistence & Samsung DeX layout',
                  ].map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => onChoosePlan('free')}
                className="mt-8 w-full rounded-xl border border-white/15 bg-slate-950 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer"
              >
                {activePlan === 'free' ? 'Current Plan · Free' : 'Choose Free Plan'}
              </button>
            </div>

            {/* Pro Tier */}
            <div className="flex flex-col justify-between rounded-2xl border border-indigo-500/60 bg-slate-900 p-7">
              <div>
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Pro Pilot</h3>
                    <p className="mt-0.5 text-xs font-medium text-indigo-400">
                      Most popular for power typists &amp; squads
                    </p>
                  </div>
                  <span className="font-mono text-3xl font-bold text-white tabular-nums">
                    $9
                    <span className="text-sm font-normal text-slate-400">
                      /mo
                    </span>
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  Unlock custom 3D themes, team gauntlets, and telemetry exports.
                </p>

                <ul className="mt-6 space-y-3 border-t border-white/10 pt-6 text-sm text-slate-300">
                  {[
                    'Everything in Starter Free tier',
                    'Solar Obsidian & Arctic Vector 3D arena themes',
                    'Multiplayer race lobbies & squad roster sync',
                    'Custom code/glossary lesson imports & CSV analytics export',
                  ].map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => onChoosePlan('pro')}
                className="mt-8 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 cursor-pointer"
              >
                {activePlan === 'pro'
                  ? 'Current Plan · Pro Active'
                  : 'Choose Pro Plan — $9/mo'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
