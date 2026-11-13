import React, { useState, useEffect } from 'react';
import { X, LogOut } from 'lucide-react';
import { PlanTier, UserAccount } from '../types';

interface AuthModalProps {
  open: boolean;
  initialTab: 'signup' | 'signin';
  initialPlan: PlanTier;
  currentUser: UserAccount | null;
  onClose: () => void;
  onSuccess: (account: UserAccount) => void;
  onSignOut: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  initialTab,
  initialPlan,
  currentUser,
  onClose,
  onSuccess,
  onSignOut,
}) => {
  const [tab, setTab] = useState<'signup' | 'signin'>(initialTab);
  const [plan, setPlan] = useState<PlanTier>(initialPlan);
  const [callsign, setCallsign] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setPlan(initialPlan);
      setError(null);
    }
  }, [open, initialTab, initialPlan]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    const resolvedCallsign =
      tab === 'signup'
        ? callsign.trim() || trimmedEmail.split('@')[0]
        : trimmedEmail.split('@')[0];

    onSuccess({
      callsign: resolvedCallsign,
      email: trimmedEmail,
      plan,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 id="auth-modal-title" className="text-lg font-bold text-white">
            {currentUser ? 'Pilot Account' : 'TypeVeloce 3D Account'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {currentUser ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Pilot Callsign</span>
                <span className="font-semibold text-white">
                  {currentUser.callsign}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email</span>
                <span className="text-slate-200">{currentUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Plan</span>
                <span className="font-semibold text-indigo-400">
                  {currentUser.plan === 'pro' ? 'Pro Pilot ($9/mo)' : 'Starter (Free)'}
                </span>
              </div>
            </div>

            {currentUser.plan === 'free' && (
              <button
                type="button"
                onClick={() => {
                  onSuccess({ ...currentUser, plan: 'pro' });
                  onClose();
                }}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 cursor-pointer"
              >
                Upgrade to Pro Pilot ($9/mo)
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-950 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mode Switch */}
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setTab('signup')}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  tab === 'signup'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => setTab('signin')}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  tab === 'signin'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {tab === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Pilot Callsign
                  </label>
                  <input
                    type="text"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder="e.g. NovaStrike"
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Work or Personal Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pilot@company.com"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {tab === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Selected Plan
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPlan('free')}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer ${
                        plan === 'free'
                          ? 'border-indigo-500 bg-indigo-950/50 text-white'
                          : 'border-white/10 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Starter · Free
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlan('pro')}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer ${
                        plan === 'pro'
                          ? 'border-indigo-500 bg-indigo-950/50 text-white'
                          : 'border-white/10 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Pro Pilot · $9/mo
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs font-medium text-rose-400">{error}</p>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 cursor-pointer"
              >
                {tab === 'signup' ? 'Create Account & Launch' : 'Sign In'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
