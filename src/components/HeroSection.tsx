import React, { useState } from 'react';
import { ArrowRight, Play, TrendingUp } from 'lucide-react';

interface HeroSectionProps {
  onLaunchArena: () => void;
  onOpenSignIn: () => void;
  bestWpm: number;
}

const CHART_SERIES: Record<'7d' | '30d' | 'team', number[]> = {
  '7d': [68, 74, 79, 83, 88, 94, 102],
  '30d': [54, 61, 66, 72, 78, 89, 102],
  team: [62, 65, 70, 74, 81, 86, 93],
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  onLaunchArena,
  onOpenSignIn,
  bestWpm,
}) => {
  const [chartRange, setChartRange] = useState<'7d' | '30d' | 'team'>('7d');
  const [warmupInput, setWarmupInput] = useState('');
  const warmupTarget = 'velocity';

  const points = CHART_SERIES[chartRange];
  const maxVal = 115;
  const minVal = 40;

  const svgPoints = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * 320;
      const y = 110 - ((val - minVal) / (maxVal - minVal)) * 90;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaPoints = `0,115 ${svgPoints} 320,115`;

  return (
    <section
      id="top"
      className="border-b border-white/10 bg-slate-950 pt-12 pb-14 lg:pt-16 lg:pb-18"
    >
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
          {/* Left Column: Value Proposition & Dual CTAs */}
          <div className="flex flex-col justify-center lg:col-span-6">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>WebGL 2.0 Typing Engine</span>
              <span aria-hidden="true">·</span>
              <span>Desktop &amp; Samsung DeX Ready</span>
            </div>

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08] text-balance">
              Master Your Speed in 3D
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Pilot an interceptor through live typographic gauntlets in real
              time. Measure WPM, keystroke accuracy, and team skill benchmarks
              inside one unified workspace portal.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onLaunchArena}
                className="inline-flex items-center gap-2.5 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Play 3D Typing Game</span>
              </button>

              <button
                type="button"
                onClick={onOpenSignIn}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-5 py-3.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Sign In to Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Embedded Visual Product Dashboard Mockup */}
          <div className="lg:col-span-6 flex">
            <div className="flex w-full flex-col justify-between rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6">
              {/* Mockup Header & Segmented Time Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Telemetry Preview
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-white">
                    Cadence &amp; Accuracy Trend
                  </p>
                </div>

                <div className="flex items-center gap-1 rounded-lg bg-slate-950 p-1">
                  {(
                    [
                      { id: '7d', label: '7 Days' },
                      { id: '30d', label: '30 Days' },
                      { id: 'team', label: 'Team Avg' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setChartRange(tab.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        chartRange === tab.id
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Velocity Curve SVG Chart */}
              <div className="my-5">
                <div className="mb-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-bold text-white tabular-nums">
                      {Math.max(bestWpm, points[points.length - 1])}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      WPM peak
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 tabular-nums">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>+18.4% over baseline</span>
                  </div>
                </div>

                <svg
                  viewBox="0 0 320 120"
                  className="h-32 w-full overflow-visible"
                  role="img"
                  aria-label="Typing speed progression chart"
                >
                  <defs>
                    <linearGradient
                      id="heroChartFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#6366f1"
                        stopOpacity="0.35"
                      />
                      <stop
                        offset="100%"
                        stopColor="#6366f1"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>
                  <line
                    x1="0"
                    y1="30"
                    x2="320"
                    y2="30"
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="0"
                    y1="70"
                    x2="320"
                    y2="70"
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="4 4"
                  />
                  <polygon points={areaPoints} fill="url(#heroChartFill)" />
                  <polyline
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={svgPoints}
                  />
                </svg>
              </div>

              {/* Interactive Micro Warmup Strip */}
              <div className="rounded-xl border border-white/10 bg-slate-950 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-400">
                    Quick check — type{' '}
                    <span className="font-mono font-semibold text-white">
                      {warmupTarget.split('').map((ch, idx) => {
                        const typed = warmupInput[idx];
                        const color =
                          typed === undefined
                            ? 'text-slate-200'
                            : typed.toLowerCase() === ch
                              ? 'text-emerald-400'
                              : 'text-rose-400';
                        return (
                          <span key={idx} className={color}>
                            {ch}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={warmupInput}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, warmupTarget.length);
                      setWarmupInput(val);
                      if (val.toLowerCase() === warmupTarget) {
                        setTimeout(() => setWarmupInput(''), 350);
                      }
                    }}
                    placeholder="Type word..."
                    aria-label="Quick warmup typing check"
                    className="w-32 rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1 font-mono text-xs text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Summary Strip below Hero Split */}
        <div className="mt-12 grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-4">
          <div>
            <div className="font-mono text-2xl font-bold text-white tabular-nums">
              +34 WPM
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Median gain after 14 sessions
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-white tabular-nums">
              60 FPS
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Hardware-accelerated WebGL loop
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-white tabular-nums">
              Zero Build
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Runs in desktop &amp; DeX browsers
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-white tabular-nums">
              8 Modules
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Training, analytics &amp; team portal
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
