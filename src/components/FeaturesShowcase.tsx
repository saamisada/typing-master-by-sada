import React, { useState } from 'react';
import {
  Activity,
  Box,
  Cpu,
  Globe,
  Layers,
  ShoppingBag,
  Users,
  Sliders,
} from 'lucide-react';

interface ModuleItem {
  id: string;
  index: string;
  title: string;
  category: 'typing' | 'suite';
  summary: string;
  metric: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  spanWide?: boolean;
}

const MODULES: ModuleItem[] = [
  {
    id: 'speed-training',
    index: '01',
    title: '3D Speed Training',
    category: 'typing',
    summary:
      'Adaptive word drones scale approach velocity to your real-time cadence and accuracy.',
    metric: 'Sub-16ms input response',
    detail:
      'Procedural target spawning avoids first-letter ambiguity so your fingers flow without pause across Cadet, Velocity, and Hyperdrive tiers.',
    icon: Cpu,
    spanWide: true,
  },
  {
    id: 'analytics',
    index: '02',
    title: 'Analytics Dashboard',
    category: 'typing',
    summary:
      'Track WPM progression, error clusters, and key-to-key transition timing across runs.',
    metric: 'Per-session local & cloud logs',
    detail:
      'Every completed run logs net WPM, raw accuracy percentage, max streak multiplier, and difficulty tier for immediate trend visibility.',
    icon: Activity,
  },
  {
    id: 'multiplayer',
    index: '03',
    title: 'Multiplayer Gauntlets',
    category: 'typing',
    summary:
      'Compete against ranked sector benchmarks and squad ghosts inside shared lobbies.',
    metric: 'Ranked global & team ladders',
    detail:
      'Challenge colleagues or beat your personal ghost trajectory with synchronized wave seeds and verified score submissions.',
    icon: Users,
  },
  {
    id: 'custom-lessons',
    index: '04',
    title: 'Custom Lesson Builder',
    category: 'typing',
    summary:
      'Train on domain terminology, TypeScript syntax, or specialized operational glossaries.',
    metric: '3 curated vocabulary tiers',
    detail:
      'Switch seamlessly between short tactical tokens, engineering vocabulary, and compound architectural terminology.',
    icon: Sliders,
  },
  {
    id: 'website-builder',
    index: '05',
    title: 'Team Portal & Website Builder',
    category: 'suite',
    summary:
      'Publish branded typing certifications and onboarding hubs for engineering teams.',
    metric: 'Custom domain & SSO ready',
    detail:
      'Assemble clean cohort landing pages, publish verified WPM leaderboards, and share public skill badges with external partners.',
    icon: Globe,
  },
  {
    id: 'crm',
    index: '06',
    title: 'Roster CRM & Cohort Tracking',
    category: 'suite',
    summary:
      'Organize trainees, assign weekly velocity milestones, and monitor completion rates.',
    metric: 'Role-based cohort views',
    detail:
      'Filter squads by target WPM threshold, review recent drill accuracy, and schedule automated readiness check-ins.',
    icon: Layers,
  },
  {
    id: 'ecommerce',
    index: '07',
    title: 'Seat Licensing & Billing',
    category: 'suite',
    summary:
      'Provision Free or Pro seats instantly with transparent per-seat subscription tiers.',
    metric: 'Instant tier activation',
    detail:
      'Scale from solo Free training to Pro ($9/mo) team licenses with custom 3D themes and exported telemetry reports.',
    icon: ShoppingBag,
  },
  {
    id: 'inventory',
    index: '08',
    title: 'Hardware & Peripheral Sync',
    category: 'suite',
    summary:
      'Store keyboard layout presets, audio synth profiles, and Samsung DeX display mappings.',
    metric: 'Cross-device JSON profiles',
    detail:
      'Keep mechanical switch audio curves, QWERTY/Dvorak/Colemak layouts, and ultrawide HUD scales aligned across stations.',
    icon: Box,
  },
];

export const FeaturesShowcase: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'typing' | 'suite'>('all');
  const [selectedId, setSelectedId] = useState<string>('speed-training');

  const visibleModules = MODULES.filter((m) =>
    filter === 'all' ? true : m.category === filter,
  );
  const selected =
    MODULES.find((m) => m.id === selectedId) || visibleModules[0];

  return (
    <section
      id="features"
      className="border-b border-white/10 bg-slate-950 py-16 lg:py-20"
    >
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {/* Section Header + Interactive Filter Tabs */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-indigo-400">
              Modular Architecture
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
              Built for solo speed and team operations
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Filter platform modules"
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900 p-1"
          >
            {(
              [
                { id: 'all', label: 'All Modules' },
                { id: 'typing', label: '3D Typing Engine' },
                { id: 'suite', label: 'Workspace Suite' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                onClick={() => setFilter(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            const isSelected = selected.id === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setSelectedId(mod.id)}
                className={`group flex flex-col justify-between rounded-2xl border p-6 text-left transition-colors cursor-pointer ${
                  mod.spanWide && filter === 'all' ? 'lg:col-span-2' : ''
                } ${
                  isSelected
                    ? 'border-indigo-500/70 bg-slate-900'
                    : 'border-white/10 bg-slate-900/50 hover:border-white/20 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-xs font-medium text-indigo-400">
                      {mod.index}. {mod.category === 'typing' ? 'Typing Engine' : 'Workspace App'}
                    </span>
                    <Icon className="h-5 w-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-white">
                    {mod.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {mod.summary}
                  </p>
                </div>

                <div className="mt-5 border-t border-white/10 pt-3 text-xs font-medium text-slate-300">
                  {mod.metric}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Module Specification Strip */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-medium text-indigo-400">
                Selected Module · {selected.index}
              </div>
              <h4 className="mt-1 text-xl font-bold text-white">
                {selected.title}
              </h4>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-300">
                {selected.detail}
              </p>
            </div>
            <a
              href="#arena"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Test in 3D Arena
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
