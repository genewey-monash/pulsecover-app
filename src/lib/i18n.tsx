import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getLocales } from 'expo-localization';
import webDict from '../i18n/web-dict.json';
import { appStrings } from '../i18n/app-strings';
import { kv } from './storage';

export type Lang = 'en' | 'zh' | 'ms' | 'ta';
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'ms', label: 'Bahasa Malaysia' },
  { code: 'ta', label: 'தமிழ்' },
];
const IDX: Record<Lang, number> = { en: 0, zh: 1, ms: 2, ta: 3 };
const DICT: Record<string, string[]> = { ...(webDict as Record<string, string[]>), ...appStrings };

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (key: string, vars?: Record<string, string | number>) => string; ready: boolean }
const I18nCtx = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (k) => k, ready: false });

function deviceLang(): Lang {
  try {
    const code = (getLocales()[0]?.languageCode || 'en').toLowerCase();
    if (code === 'zh') return 'zh';
    if (code === 'ms' || code === 'id') return 'ms';
    if (code === 'ta') return 'ta';
  } catch { /* fall through */ }
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    kv.get('pc_lang').then((v) => {
      setLangState(v === 'en' || v === 'zh' || v === 'ms' || v === 'ta' ? v : deviceLang());
      setReady(true);
    });
  }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); kv.set('pc_lang', l); }, []);
  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const row = DICT[key];
    let s = row ? (row[IDX[lang]] || row[0] || key) : key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t, ready }), [lang, setLang, t, ready]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}
export const useI18n = () => useContext(I18nCtx);
export const planName = (t: (k: string) => string, id: string) => `${t('plan.word')} ${id}`;
