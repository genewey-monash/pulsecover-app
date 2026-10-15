import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Button, Field, Gap, Sheet } from './ui';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

export const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;
export const validEmail = (s: string) => EMAIL.test(s.trim()) && !s.includes('..');
export const adultCutoff = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d; };
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseIso = (s: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
export function ageOf(dob: string) {
  const d = parseIso(dob); if (!d) return -1; const t = new Date();
  let a = t.getFullYear() - d.getFullYear(); const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--; return a;
}
export function strength(v: string) {
  let s = 0; if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v) || v.length >= 14) s++;
  return v.length < 8 ? 0 : Math.max(1, s);
}

const LOCALE: Record<string, string> = { en: 'en-GB', zh: 'zh-CN', ms: 'ms-MY', ta: 'ta-IN' };

/** Web: three native <select>s (day / month / year). On a phone browser they open the system wheel picker. */
function WebDate({ value, onChange, max, min, lang }: { value: Date; onChange: (d: Date) => void; max?: Date; min?: Date; lang: string }) {
  const { c } = useTheme();
  const top = (max ?? new Date()).getFullYear();
  const bottom = (min ?? new Date(top - 110, 0, 1)).getFullYear();
  const years: number[] = []; for (let y = top; y >= bottom; y--) years.push(y);
  const y = value.getFullYear(), m = value.getMonth(), d = value.getDate();
  const dim = (yy: number, mm: number) => new Date(yy, mm + 1, 0).getDate();
  const set = (yy: number, mm: number, dd: number) => {
    let n = new Date(yy, mm, Math.min(dd, dim(yy, mm)));
    if (max && n > max) n = new Date(max);
    if (min && n < min) n = new Date(min);
    onChange(n);
  };
  const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(LOCALE[lang] ?? 'en-GB', { month: 'long' }));
  const style: any = { flex: 1, minWidth: 0, fontSize: 17, padding: '13px 10px', borderRadius: 12, border: `1px solid ${c.line}`, background: c.input, color: c.ink, appearance: 'auto', fontFamily: 'inherit' };
  const sel = (val: number, onSel: (n: number) => void, opts: { v: number; l: string }[], label: string, flex: number) =>
    React.createElement('select', { 'aria-label': label, value: val, style: { ...style, flex }, onChange: (e: any) => onSel(Number(e.target.value)) },
      opts.map((o) => React.createElement('option', { key: o.v, value: o.v }, o.l)));
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
      {sel(d, (n) => set(y, m, n), Array.from({ length: dim(y, m) }, (_, i) => ({ v: i + 1, l: String(i + 1) })), 'Day', 0.8)}
      {sel(m, (n) => set(y, n, d), months.map((l, i) => ({ v: i, l })), 'Month', 1.5)}
      {sel(y, (n) => set(n, m, d), years.map((v) => ({ v, l: String(v) })), 'Year', 1)}
    </View>
  );
}

/** Native date picker: dialog on Android, spinner sheet on iOS, day/month/year selects on the web. */
export function DateField({ label, value, onChange, error, max, min, placeholder, initial }: { label: string; value: string; onChange: (iso: string) => void; error?: string | null; max?: Date; min?: Date; placeholder?: string; initial?: Date }) {
  const { t, lang } = useI18n(); const { isDark } = useTheme();
  const [open, setOpen] = useState(false); const [tmp, setTmp] = useState<Date>(parseIso(value) ?? initial ?? new Date(2000, 0, 1));
  const shown = parseIso(value);
  const text = shown ? shown.toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'ta' ? 'ta-IN' : lang === 'ms' ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const openIt = () => {
    const start = parseIso(value) ?? initial ?? new Date(2000, 0, 1);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: start, mode: 'date', maximumDate: max, minimumDate: min, onValueChange: (_e, d) => { if (d) onChange(iso(d)); } });
    } else { setTmp(start); setOpen(true); }
  };
  return (
    <>
      <Field label={label} onPress={openIt} valueText={text} placeholder={placeholder ?? 'DD / MM / YYYY'} error={error} left="calendar-outline" />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        {Platform.OS === 'web'
          ? <WebDate value={tmp} onChange={setTmp} max={max} min={min} lang={lang} />
          : <DateTimePicker value={tmp} mode="date" display="spinner" themeVariant={isDark ? 'dark' : 'light'} maximumDate={max} minimumDate={min} onValueChange={(_e, d) => { if (d) setTmp(d); }} />}
        <Gap h={10} />
        <Button title={t('common.submit')} onPress={() => { onChange(iso(tmp)); setOpen(false); }} />
      </Sheet>
    </>
  );
}
