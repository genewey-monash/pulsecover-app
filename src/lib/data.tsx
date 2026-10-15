import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from './api';
import { useAuth, User } from './auth';
import type { Quote } from './pricing';
import { GuestState, guestDash, newSeed } from './guest';
import { kv } from './storage';

export interface Policy { id: number; plan: string; number: string; status: string; device: string; cover: number; base: number; premium: number; app_sub: number; guardian: string; beneficiary: string; start_date: string; renewal_date: string; paused_until?: string | null }
export interface Week { start: string; days: number; steps: number; exerciseMin: number; sleepHours: number; restingHr: number; score: number; grade: string }
export interface Claim { id: number; number: string; type: string; amount: number; description: string; incident_date: string; status: string; created: string; events: { status: string; note: string; created: string }[] }
export interface Dashboard {
  user: User; policy: Policy | null; metrics: { day: string; steps: number; score: number }[]; projected: Quote; score30: number | null; grade: string | null;
  weekly: Week[]; connections: { provider: string; connected_at: string; last_sync: string }[]; paused: string | null; claims: Claim[]; referrals: number; ranking: { name: string; count: number }[];
}
interface Ctx {
  dash: Dashboard | null; loading: boolean; error: string | null; refresh: () => Promise<void>;
  /** Guests can connect a wearable on the phone; it is saved to the account after they log in. */
  guestConnect: (provider: string) => Promise<void>; guestDisconnect: (provider: string) => Promise<void>;
}
const DataCtx = createContext<Ctx>({ dash: null, loading: false, error: null, refresh: async () => {}, guestConnect: async () => {}, guestDisconnect: async () => {} });

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const [guest, setGuest] = useState<GuestState | null>(null);
  useEffect(() => { kv.get('pc_guest_conn').then((v) => { try { if (v) setGuest(JSON.parse(v)); } catch { /* ignore bad data */ } }); }, []);
  const saveGuest = useCallback(async (g: GuestState | null) => { setGuest(g); if (g) await kv.set('pc_guest_conn', JSON.stringify(g)); else await kv.del('pc_guest_conn'); }, []);
  const guestConnect = useCallback(async (provider: string) => {
    const cur = guest ?? { providers: [], seed: newSeed() };
    if (!cur.providers.includes(provider)) await saveGuest({ ...cur, providers: [...cur.providers, provider] });
  }, [guest, saveGuest]);
  const guestDisconnect = useCallback(async (provider: string) => {
    if (!guest) return; const left = guest.providers.filter((p) => p !== provider);
    await saveGuest(left.length ? { ...guest, providers: left } : null);
  }, [guest, saveGuest]);
  const refresh = useCallback(async () => {
    if (!user) { setDash(null); return; }
    const my = ++seq.current; setLoading(true);
    try { const d = await api<Dashboard>('/dashboard'); if (my === seq.current) { setDash(d); setError(null); } }
    catch (e) { if (my === seq.current) setError(e instanceof ApiError ? e.message : 'error'); }
    finally { if (my === seq.current) setLoading(false); }
  }, [user]);
  useEffect(() => {
    if (!user) { seq.current++; setDash(null); setError(null); return; }
    (async () => { // a wearable connected as a guest is saved to the new account on first login
      if (guest && guest.providers.length) {
        for (const p of guest.providers) { try { await api('/connect', { provider: p, consent: true }); } catch { /* connect again later from Wearable */ } }
        await saveGuest(null);
      }
      refresh();
    })();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const guestView = useMemo(() => (!user && guest && guest.providers.length ? guestDash(guest) : null), [user, guest]);
  const value = useMemo(() => ({ dash: user ? dash : guestView, loading, error, refresh, guestConnect, guestDisconnect }), [user, dash, guestView, loading, error, refresh, guestConnect, guestDisconnect]);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}
export const useDash = () => useContext(DataCtx);

export const fmt = (n: number, d = 2) => Number(n).toLocaleString('en-MY', { minimumFractionDigits: d, maximumFractionDigits: d });
export const rm = (n: number, d = 2) => `RM\u00A0${fmt(n, d)}`; // non-breaking space keeps the amount on one line
export const PROVIDERS: Record<string, string> = { healthconnect: 'Google Health Connect', fitbit: 'Fitbit', garmin: 'Garmin', whoop: 'Whoop' };
export const PROVIDER_ICON: Record<string, string> = { healthconnect: 'logo-google', fitbit: 'watch', garmin: 'navigate-circle', whoop: 'fitness' };
