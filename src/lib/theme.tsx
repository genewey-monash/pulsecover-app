import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { kv } from './storage';

export const light = {
  bg: '#FFFFFF', bgAlt: '#F6F4F7', surface: '#FFFFFF', ink: '#26242F', mute: '#646273', line: '#E6E3E8',
  red: '#B71234', redD: '#8E0E28', redT: '#FCEBEF', accent: '#B71234', gold: '#E8A317', goldT: '#FFF5DE', goldLine: '#F2DDA6',
  ok: '#2B9348', okT: '#E8F7ED', bad: '#C92A2A', errBg: '#FEECEB', errLine: '#F2B8B5', errText: '#B42318',
  overlay: 'rgba(38,36,47,0.55)', track: '#D6D1DB', shadow: '#26242F', onRed: '#FFFFFF', tabBg: '#FFFFFF', input: '#FFFFFF',
};
export type Colors = typeof light;
export const dark: Colors = {
  bg: '#121016', bgAlt: '#17151C', surface: '#1F1C26', ink: '#F3F1F6', mute: '#A8A5B3', line: '#34303C',
  red: '#C21A3E', redD: '#8E0E28', redT: 'rgba(255,124,149,0.14)', accent: '#FF7C95', gold: '#E8A317', goldT: 'rgba(232,163,23,0.13)', goldLine: 'rgba(232,163,23,0.35)',
  ok: '#4CC36E', okT: 'rgba(76,195,110,0.14)', bad: '#FF6B6B', errBg: '#3A1519', errLine: '#7A2A30', errText: '#FF9A9A',
  overlay: 'rgba(0,0,0,0.65)', track: '#4A4553', shadow: '#000000', onRed: '#FFFFFF', tabBg: '#1A1720', input: '#1A1720',
};

export type ThemePref = 'system' | 'light' | 'dark';
interface Ctx { c: Colors; isDark: boolean; pref: ThemePref; setPref: (p: ThemePref) => void }
const ThemeCtx = createContext<Ctx>({ c: light, isDark: false, pref: 'system', setPref: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');
  useEffect(() => { kv.get('pc_theme').then((v) => { if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v); }); }, []);
  const setPref = useCallback((p: ThemePref) => { setPrefState(p); kv.set('pc_theme', p); }, []);
  const isDark = pref === 'system' ? system === 'dark' : pref === 'dark';
  const value = useMemo(() => ({ c: isDark ? dark : light, isDark, pref, setPref }), [isDark, pref, setPref]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
export const useTheme = () => useContext(ThemeCtx);

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
