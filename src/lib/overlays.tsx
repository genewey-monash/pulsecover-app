import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { Button, Icon, Sheet, Txt, Row } from '../components/ui';
import { api, getToken } from './api';
import { useAuth } from './auth';
import { useI18n } from './i18n';
import { kv } from './storage';
import { radius, useTheme } from './theme';

/* ---------------- toast ---------------- */
const ToastCtx = createContext<(msg: string, tone?: 'ok' | 'err') => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { c } = useTheme(); const ins = useSafeAreaInsets();
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);
  const a = useRef(new Animated.Value(0)).current; const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ text, tone });
    Animated.timing(a, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    timer.current = setTimeout(() => Animated.timing(a, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setMsg(null)), 2600);
  }, [a]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 18, right: 18, bottom: ins.bottom + 92, alignItems: 'center', opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: msg.tone === 'ok' ? '#26242F' : c.bad, paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.pill, maxWidth: 520 }}>
            <Icon name={msg.tone === 'ok' ? 'checkmark-circle' : 'alert-circle'} size={20} color="#fff" />
            <Txt v="small" w="600" color="#fff" style={{ flexShrink: 1 }}>{msg.text}</Txt>
          </View>
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

/* ---------------- offline banner ---------------- */
export function OfflineBanner() {
  const net = useNetInfo(); const { t } = useI18n(); const ins = useSafeAreaInsets(); const { c } = useTheme();
  if (net.isConnected !== false || net.isInternetReachable === true) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: ins.top + 6, paddingBottom: 8, backgroundColor: c.bad, alignItems: 'center', zIndex: 50 }}>
      <Row gap={8}><Icon name="cloud-offline" size={16} color="#fff" /><Txt v="caption" w="700" color="#fff">{t('app.offline')}</Txt></Row>
    </View>
  );
}

/* ---------------- 30 minute idle logout ---------------- */
export const activity = { last: Date.now(), pinged: Date.now() };
export const touchActivity = () => { activity.last = Date.now(); };

const LIMIT = 30 * 60e3, WARN = 28 * 60e3;
export function IdleGuard() {
  const { user, logout } = useAuth(); const { t } = useI18n(); const router = useRouter(); const { c } = useTheme();
  const [warn, setWarn] = useState(false);
  useEffect(() => {
    if (!user) { setWarn(false); return; }
    activity.last = Date.now();
    const expire = async () => { setWarn(false); await logout(true); router.replace('/login'); };
    const check = () => {
      const idle = Date.now() - activity.last;
      if (idle >= LIMIT) expire();
      else if (idle >= WARN) setWarn(true);
      else {
        setWarn(false);
        if (Date.now() - activity.pinged > 4 * 60e3 && getToken()) { activity.pinged = Date.now(); api('/me', undefined, { silent401: true }).catch(() => {}); } // renews the server session
      }
    };
    const iv = setInterval(check, 15000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => { clearInterval(iv); sub.remove(); };
  }, [user, logout, router]);
  return (
    <Sheet visible={warn && !!user} onClose={() => {}} dismissable={false} title={t('idle.title')}>
      <Txt color={c.mute}>{t('idle.p')}</Txt>
      <View style={{ height: 18 }} />
      <Button title={t('idle.stay')} onPress={() => { activity.last = Date.now(); setWarn(false); api('/me', undefined, { silent401: true }).catch(() => {}); }} />
      <View style={{ height: 10 }} />
      <Button title={t('nav.logout')} variant="ghost" onPress={async () => { setWarn(false); await logout(); router.replace('/login'); }} />
    </Sheet>
  );
}

/* ---------------- biometric lock ---------------- */
export async function biometricAvailable() {
  try { return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync()); } catch { return false; }
}
export function BiometricLock() {
  const { user, logout } = useAuth(); const { t } = useI18n(); const { c } = useTheme(); const ins = useSafeAreaInsets();
  const [locked, setLocked] = useState(false); const [busy, setBusy] = useState(false);
  const bgAt = useRef<number | null>(null); const checked = useRef(false);
  const unlock = useCallback(async () => {
    if (busy) return; setBusy(true);
    try {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: t('app.bio.prompt'), cancelLabel: t('connect.cancel'), disableDeviceFallback: false });
      if (r.success) setLocked(false);
    } catch { /* stay locked */ } finally { setBusy(false); }
  }, [busy, t]);
  useEffect(() => { // cold start
    if (!user || checked.current) return; checked.current = true;
    kv.get('pc_bio').then(async (v) => { if (v === '1' && (await biometricAvailable())) { setLocked(true); } });
  }, [user]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (s) => {
      if (s === 'background') bgAt.current = Date.now();
      if (s === 'active' && bgAt.current && user && Date.now() - bgAt.current > 5 * 60e3 && (await kv.get('pc_bio')) === '1' && (await biometricAvailable())) setLocked(true);
      if (s === 'active') bgAt.current = null;
    });
    return () => sub.remove();
  }, [user]);
  useEffect(() => { if (locked) unlock(); }, [locked]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!user) setLocked(false); }, [user]);
  if (!locked || !user || Platform.OS === 'web') return null;
  return (
    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: c.bg, zIndex: 100, alignItems: 'center', justifyContent: 'center', padding: 28, paddingTop: ins.top }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.redT, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><Icon name="finger-print" size={44} color={c.accent} /></View>
      <Txt v="h1" align="center">PulseCover</Txt>
      <Txt color={c.mute} align="center" style={{ marginTop: 8, marginBottom: 28 }}>{t('app.bio.locked')}</Txt>
      <Button title={t('app.bio.unlock')} onPress={unlock} loading={busy} full={false} icon="lock-open" />
      <View style={{ height: 12 }} />
      <Button title={t('nav.logout')} variant="ghost" full={false} onPress={async () => { await logout(); setLocked(false); }} />
    </View>
  );
}

export const useStableValue = <T,>(v: T) => useMemo(() => v, [v]);
