import React, { useState } from 'react';
import { CheckCircle2, Download, Monitor, Smartphone, Tablet } from 'lucide-react';
import { CompanionConfig } from '../types';

interface CompanionSectionProps {
  config: CompanionConfig;
  onChangeConfig: (next: CompanionConfig) => void;
}

const TOGGLE_ITEMS: {
  key: keyof CompanionConfig;
  label: string;
  description: string;
  sizeMb: number;
}[] = [
  {
    key: 'liveWpmOverlay',
    label: 'Live WPM HUD Overlay',
    description: 'Floating cadence readout while working across desktop apps.',
    sizeMb: 4.2,
  },
  {
    key: 'mechanicalAudioPack',
    label: 'Procedural Mechanical Synth',
    description: 'Low-latency Web Audio keystroke acoustics without sample files.',
    sizeMb: 1.8,
  },
  {
    key: 'teamLeaderboardSync',
    label: 'Team Leaderboard Sync',
    description: 'Synchronize verified wave scores with your cohort portal.',
    sizeMb: 3.1,
  },
  {
    key: 'offlineDrillCache',
    label: 'Offline Drill Cache',
    description: 'Pre-bundle Cadet, Velocity, and Hyperdrive word packs locally.',
    sizeMb: 2.4,
  },
  {
    key: 'dexUltrawideMode',
    label: 'Samsung DeX Ultrawide Preset',
    description: 'Auto-scale WebGL FOV and compact command dock on 21:9 monitors.',
    sizeMb: 1.5,
  },
];

export const CompanionSection: React.FC<CompanionSectionProps> = ({
  config,
  onChangeConfig,
}) => {
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const enabledCount = Object.values(config).filter(Boolean).length;
  const bundleSize = TOGGLE_ITEMS.reduce(
    (sum, item) => (config[item.key] ? sum + item.sizeMb : sum),
    18.0,
  );

  const toggleKey = (key: keyof CompanionConfig) => {
    onChangeConfig({
      ...config,
      [key]: !config[key],
    });
  };

  const triggerDownload = (platform: 'Desktop Suite' | 'Android APK' | 'Samsung DeX') => {
    const manifest = {
      application: 'TypeVeloce 3D Companion',
      platform,
      generatedAt: new Date().toISOString(),
      modules: config,
      estimatedFootprintMb: Number(bundleSize.toFixed(1)),
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typeveloce-${platform.toLowerCase().replace(/\s+/g, '-')}-profile.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadNotice(
      `Prepared ${platform} companion manifest (${enabledCount} modules enabled, ${bundleSize.toFixed(1)} MB profile).`,
    );
  };

  return (
    <section
      id="download"
      className="border-b border-white/10 bg-slate-950 py-16 lg:py-20"
    >
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left: Interactive Companion Configurator */}
          <div className="lg:col-span-7">
            <p className="text-sm font-medium text-indigo-400">
              Companion Layer &amp; App Distribution
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
              Configure your desktop &amp; mobile companion
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Toggle the workspace modules you want bundled into your local
              companion profile before downloading for Desktop, Android, or
              Samsung DeX.
            </p>

            <div className="mt-7 divide-y divide-white/10 rounded-2xl border border-white/10 bg-slate-900">
              {TOGGLE_ITEMS.map((item) => {
                const active = config[item.key];
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {item.label}
                        </span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          {item.sizeMb.toFixed(1)} MB
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={active}
                      aria-label={`Toggle ${item.label}`}
                      onClick={() => toggleKey(item.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        active ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Live Bundle Summary & Cross-Platform Download Actions */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs font-medium text-slate-400">
                    Active Configuration
                  </div>
                  <div className="mt-0.5 text-lg font-bold text-white tabular-nums">
                    {enabledCount} of {TOGGLE_ITEMS.length} modules selected
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-400">
                    Package Size
                  </div>
                  <div className="font-mono text-lg font-bold text-indigo-400 tabular-nums">
                    {bundleSize.toFixed(1)} MB
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">HUD Telemetry</span>
                  <span className="font-medium">
                    {config.liveWpmOverlay ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Keystroke Synth</span>
                  <span className="font-medium">
                    {config.mechanicalAudioPack ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Leaderboard Sync</span>
                  <span className="font-medium">
                    {config.teamLeaderboardSync ? 'Enabled' : 'Local Only'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">DeX Ultrawide Scaling</span>
                  <span className="font-medium">
                    {config.dexUltrawideMode ? '21:9 Active' : 'Standard 16:9'}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => triggerDownload('Desktop Suite')}
                  className="flex w-full items-center justify-between rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Monitor className="h-4 w-4" />
                    <span>Download Desktop App</span>
                  </span>
                  <Download className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => triggerDownload('Android APK')}
                  className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Smartphone className="h-4 w-4 text-indigo-400" />
                    <span>Download Android APK</span>
                  </span>
                  <Download className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => triggerDownload('Samsung DeX')}
                  className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Tablet className="h-4 w-4 text-indigo-400" />
                    <span>Export Samsung DeX Preset</span>
                  </span>
                  <Download className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              {downloadNotice && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{downloadNotice}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
