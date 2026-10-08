import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, loadApiConfig, setOnUnauthorized, setToken, getToken } from './api';
import { kv } from './storage';
import { useI18n } from './i18n';

export interface User { id: number; name: string; email: string; dob: string; lang: string; refcode: string; phone: string; address: string }
interface AuthCtx {
  user: User | null; ready: boolean; sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (p: { name: string; email: string; dob: string; password: string; password2: string; referral?: string }) => Promise<void>;
  logout: (expired?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
  clearExpired: () => void;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useI18n();
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionExpired, setExpired] = useState(false);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const logout = useCallback(async (expired = false) => {
    try { if (getToken()) await api('/logout', {}, { silent401: true, timeout: 8000 }); } catch { /* offline: still sign out locally */ }
    await setToken(null);
    setUserState(null);
    if (expired) setExpired(true);
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => { if (userRef.current) { setToken(null); setUserState(null); setExpired(true); } });
    return () => setOnUnauthorized(null);
  }, []);

  useEffect(() => {
    (async () => {
      await loadApiConfig();
      if (getToken()) {
        try { const r = await api<{ user: User | null }>('/me', undefined, { silent401: true, timeout: 45000 }); setUserState(r.user); if (!r.user) await setToken(null); }
        catch (e) {
          // offline or server asleep: keep the token so the visitor is not signed out by a network blip
          const cached = await kv.get('pc_user'); if (cached) { try { setUserState(JSON.parse(cached)); } catch { /* ignore */ } }
        }
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (user) kv.set('pc_user', JSON.stringify(user)); else kv.del('pc_user'); }, [user]);

  const applyAuth = useCallback(async (r: any) => {
    if (!r?.token) throw new Error('No token');
    await setToken(r.token);
    const { token: _t, ...u } = r;
    setUserState(u as User); setExpired(false);
  }, []);
  const login = useCallback(async (email: string, password: string) => { await applyAuth(await api('/login', { email, password })); }, [applyAuth]);
  const register = useCallback(async (p: Parameters<AuthCtx['register']>[0]) => { await applyAuth(await api('/register', { ...p, lang })); }, [applyAuth, lang]);
  const refreshUser = useCallback(async () => { try { const r = await api<{ user: User | null }>('/me'); if (r.user) setUserState(r.user); } catch { /* ignore */ } }, []);

  const value = useMemo<AuthCtx>(() => ({ user, ready, sessionExpired, login, register, logout, refreshUser, setUser: setUserState, clearExpired: () => setExpired(false) }), [user, ready, sessionExpired, login, register, logout, refreshUser]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth() { const c = useContext(Ctx); if (!c) throw new Error('useAuth outside AuthProvider'); return c; }
