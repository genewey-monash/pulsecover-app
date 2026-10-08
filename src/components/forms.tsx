import React, { useState } from 'react';
import { Platform } from 'react-native';
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

/** Native date picker: dialog on Android, spinner sheet on iOS. */
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
        <DateTimePicker value={tmp} mode="date" display="spinner" themeVariant={isDark ? 'dark' : 'light'} maximumDate={max} minimumDate={min} onValueChange={(_e, d) => { if (d) setTmp(d); }} />
        <Gap h={10} />
        <Button title={t('common.submit')} onPress={() => { onChange(iso(tmp)); setOpen(false); }} />
      </Sheet>
    </>
  );
}
