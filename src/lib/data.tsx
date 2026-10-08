import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from './api';
import { useAuth, User } from './auth';
import type { Quote } from './pricing';

export interface Policy { id: number; plan: string; number: string; status: string; device: string; cover: number; base: number; premium: number; app_sub: number; guardian: string; beneficiary: string; start_date: string; renewal_date: string; paused_until?: string | null }
export interface Week { start: string; days: number; steps: number; exerciseMin: number; sleepHours: number; restingHr: number; score: number; grade: string }
export interface Claim { id: number; number: string; type: string; amount: number; description: string; incident_date: string; status: string; created: string; events: { status: string; note: string; created: string }[] }
export interface Dashboard {
  user: User; policy: Policy | null; metrics: { day: string; steps: number; score: number }[]; projected: Quote; score30: number | null; grade: string | null;
  weekly: Week[]; connections: { provider: string; connected_at: string; last_sync: string }[]; paused: string | null; claims: Claim[]; referrals: number; ranking: { name: string; count: number }[];
}
interface Ctx { dash: Dashboard | null; loading: boolean; error: string | null; refresh: () => Promise<void> }
const DataCtx = createContext<Ctx>({ dash: null, loading: false, error: null, refresh: async () => {} });

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const refresh = useCallback(async () => {
    if (!user) { setDash(null); return; }
    const my = ++seq.current; setLoading(true);
    try { const d = await api<Dashboard>('/dashboard'); if (my === seq.current) { setDash(d); setError(null); } }
    catch (e) { if (my === seq.current) setError(e instanceof ApiError ? e.message : 'error'); }
    finally { if (my === seq.current) setLoading(false); }
  }, [user]);
  useEffect(() => { if (user) refresh(); else { seq.current++; setDash(null); setError(null); } }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ dash, loading, error, refresh }), [dash, loading, error, refresh]);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}
export const useDash = () => useContext(DataCtx);

export const fmt = (n: number, d = 2) => Number(n).toLocaleString('en-MY', { minimumFractionDigits: d, maximumFractionDigits: d });
export const rm = (n: number, d = 2) => `RM\u00A0${fmt(n, d)}`; // non-breaking space keeps the amount on one line
export const PROVIDERS: Record<string, string> = { healthconnect: 'Google Health Connect', fitbit: 'Fitbit', garmin: 'Garmin', whoop: 'Whoop' };
export const PROVIDER_ICON: Record<string, string> = { healthconnect: 'logo-google', fitbit: 'watch', garmin: 'navigate-circle', whoop: 'fitness' };
