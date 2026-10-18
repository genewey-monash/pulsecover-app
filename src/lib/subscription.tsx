import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SUB, type Billing } from './pricing';
import { kv } from './storage';

/** Premium subscription (DEMO): no payment is taken and no card details are collected. One stored object, the same one the website uses
 *  (key pc_sub): tier, billing, startDate, renewalDate, status and pending. Prices all come from the pricing config. */
export interface SubState { tier: 'free' | 'premium'; billing: Billing; startDate: string | null; renewalDate: string | null; status: 'active' | 'cancelling'; pending: 'monthly' | null }
const KEY = 'pc_sub';
const FREE: SubState = { tier: 'free', billing: 'yearly', startDate: null, renewalDate: null, status: 'active', pending: null };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const parse = (s: string) => { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
export const addPeriod = (d: Date, b: Billing) => { const y = d.getFullYear() + (b === 'yearly' ? 1 : 0); const m = d.getMonth() + (b === 'yearly' ? 0 : 1); const last = new Date(y, m + 1, 0).getDate(); return new Date(y, m, Math.min(d.getDate(), last)); };

/** Clean up whatever was stored and roll the demo clock forward: renew, or end a cancelled plan, once the renewal date has passed. */
function normalise(v: Partial<SubState> | null): { st: SubState; changed: boolean } {
  const st: SubState = { tier: v?.tier === 'premium' ? 'premium' : 'free', billing: v?.billing === 'monthly' ? 'monthly' : 'yearly', startDate: v?.startDate ?? null, renewalDate: v?.renewalDate ?? null, status: v?.status === 'cancelling' ? 'cancelling' : 'active', pending: v?.pending === 'monthly' ? 'monthly' : null };
  let changed = false; let guard = 0;
  while (st.tier === 'premium' && st.renewalDate && parse(st.renewalDate) <= today() && guard++ < 60) {
    if (st.status === 'cancelling') { st.tier = 'free'; st.startDate = null; st.renewalDate = null; st.status = 'active'; st.pending = null; }
    else { if (st.pending) { st.billing = st.pending; st.pending = null; } st.startDate = st.renewalDate; st.renewalDate = iso(addPeriod(parse(st.renewalDate), st.billing)); }
    changed = true;
  }
  return { st, changed };
}

interface Ctx {
  sub: SubState; isPremium: boolean; ready: boolean;
  setBilling: (b: Billing) => void; subscribe: (b: Billing) => SubState; cancel: () => void; resume: () => void; upgradeToYearly: () => void; switchAtRenewal: (on: boolean) => void;
}
const SubCtx = createContext<Ctx>({ sub: FREE, isPremium: false, ready: false, setBilling: () => {}, subscribe: () => FREE, cancel: () => {}, resume: () => {}, upgradeToYearly: () => {}, switchAtRenewal: () => {} });

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [sub, setSub] = useState<SubState>(FREE); const [ready, setReady] = useState(false);
  useEffect(() => {
    kv.get(KEY).then((raw) => {
      let v: Partial<SubState> | null = null; try { v = raw ? JSON.parse(raw) : null; } catch { /* ignore bad data */ }
      const { st, changed } = normalise(v); setSub(st); if (changed) kv.set(KEY, JSON.stringify(st)); setReady(true);
    });
  }, []);
  const save = useCallback((fn: (s: SubState) => SubState) => setSub((cur) => { const next = fn({ ...cur }); kv.set(KEY, JSON.stringify(next)); return next; }), []);
  const value = useMemo<Ctx>(() => ({
    sub, ready, isPremium: sub.tier === 'premium',
    setBilling: (b) => save((s) => (s.tier === 'premium' ? s : { ...s, billing: b })),
    subscribe: (b) => { const t = today(); const next: SubState = { tier: 'premium', billing: b, startDate: iso(t), renewalDate: iso(addPeriod(t, b)), status: 'active', pending: null }; setSub(next); kv.set(KEY, JSON.stringify(next)); return next; },
    cancel: () => save((s) => (s.tier === 'premium' ? { ...s, status: 'cancelling', pending: null } : s)),
    resume: () => save((s) => (s.tier === 'premium' ? { ...s, status: 'active' } : s)),
    upgradeToYearly: () => save((s) => { if (s.tier !== 'premium' || s.billing !== 'monthly') return s; const t = today(); return { ...s, billing: 'yearly', startDate: iso(t), renewalDate: iso(addPeriod(t, 'yearly')), pending: null, status: 'active' }; }),
    switchAtRenewal: (on) => save((s) => (s.tier === 'premium' && s.billing === 'yearly' ? { ...s, pending: on ? 'monthly' : null } : s)),
  }), [sub, ready, save]);
  return <SubCtx.Provider value={value}>{children}</SubCtx.Provider>;
}
export const useSub = () => useContext(SubCtx);

export const annualCost = (b: Billing) => (b === 'monthly' ? SUB.monthlyTotal : SUB.yearly);
