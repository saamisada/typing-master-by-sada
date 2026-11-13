import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome !== 'unavailable') return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-4 w-4 text-indigo-400" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3
                id="pwa-install-title"
                className="text-base font-bold text-white"
              >
                Add to Home Screen
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-4 space-y-2.5 text-sm text-slate-300">
                <li>
                  1. Tap the <strong className="text-white">Share</strong> icon
                  in your browser toolbar.
                </li>
                <li>
                  2. Scroll down and tap{' '}
                  <strong className="text-white">Add to Home Screen</strong>.
                </li>
                <li>
                  3. Tap <strong className="text-white">Add</strong> to launch
                  full-screen from your home screen.
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2.5 text-sm text-slate-300">
                <li>
                  1. Open your browser menu (three dots or address bar install
                  icon).
                </li>
                <li>
                  2. Select{' '}
                  <strong className="text-white">
                    Install TYPING MASTER By Sada
                  </strong>{' '}
                  or <strong className="text-white">Add to Home Screen</strong>.
                </li>
                <li>
                  3. Confirm to pin the game directly to your home screen for
                  offline play.
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
