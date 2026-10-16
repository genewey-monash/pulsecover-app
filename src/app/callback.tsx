import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Chip, ErrorBox, Field, Gap, Icon, Row, Screen, ScreenHeader, Sheet, Txt, tap } from '../components/ui';
import { validEmail } from '../components/forms';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { errorText } from '../lib/errors';
import { LANGS, Lang, useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

export const STATES = ['Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'];
const NEEDS = ['info', 'plan', 'claims', 'business', 'other'] as const; const NEED_KEY = { info: 'cb.n1', plan: 'cb.n2', claims: 'cb.n3', business: 'cb.n4', other: 'cb.n5' };
const TIMES = ['morning', 'afternoon', 'evening'] as const; const TIME_KEY = { morning: 'cb.t1', afternoon: 'cb.t2', evening: 'cb.t3' };

export default function Callback() {
  const router = useRouter(); const { t, lang } = useI18n(); const { c } = useTheme(); const { user } = useAuth();
  const [f, setF] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', email: user?.email ?? '', state: '', need: 'info' as typeof NEEDS[number], time: 'morning' as typeof TIMES[number], clang: lang as Lang, consent: false });
  const [e, setE] = useState<Record<string, string | null>>({}); const [top, setTop] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [pick, setPick] = useState(false);
  const set = <K extends keyof typeof f>(k: K) => (v: typeof f[K]) => { setF((p) => ({ ...p, [k]: v })); setE((p) => ({ ...p, [k]: null })); };
  const submit = async () => {
    setTop(null);
    const err = {
      name: f.name.trim().length >= 2 ? null : t('acc.err.name'), phone: f.phone.replace(/\D/g, '').length >= 8 ? null : t('cb.err.phone'), email: validEmail(f.email) ? null : t('acc.err.email'),
      state: f.state ? null : t('cb.err.state'), consent: f.consent ? null : t('cb.err.consent'),
    };
    setE(err); if (Object.values(err).some(Boolean)) { setTop(t('pf.fix')); return; }
    setBusy(true);
    try {
      await api('/callback', { name: f.name.trim(), phone: f.phone, email: f.email.trim(), state: f.state, need: f.need, time: f.time, lang: f.clang, consent: true });
      router.replace({ pathname: '/thanks', params: { kind: 'cb', email: f.email.trim() } });
    } catch (x) { setTop(errorText(x, t)); } finally { setBusy(false); }
  };
  return (
    <Screen keyboard>
      <ScreenHeader title={t('cb.h')} subtitle={t('cb.sub')} />
      <Field label={t('field.name')} value={f.name} onChangeText={set('name')} error={e.name} left="person-outline" maxLength={100} />
      <Field label={t('cb.phone')} value={f.phone} onChangeText={set('phone')} error={e.phone} keyboardType="phone-pad" placeholder="+60" left="call-outline" maxLength={25} />
      <Field label={t('field.email')} value={f.email} onChangeText={set('email')} error={e.email} autoCapitalize="none" keyboardType="email-address" left="mail-outline" help={t('cb.email.note')} />
      <Field label={t('cb.state')} onPress={() => setPick(true)} valueText={f.state} placeholder={t('cb.select')} error={e.state} left="location-outline" />
      <Txt v="label" style={{ marginTop: 24, marginBottom: 10 }}>{t('cb.need')}</Txt>
      <Row wrap gap={12}>{NEEDS.map((k) => <Chip key={k} label={t(NEED_KEY[k])} on={f.need === k} onPress={() => set('need')(k)} />)}</Row>
      <Txt v="label" style={{ marginTop: 24, marginBottom: 10 }}>{t('cb.time')}</Txt>
      <Row wrap gap={12}>{TIMES.map((k) => <Chip key={k} label={t(TIME_KEY[k])} on={f.time === k} onPress={() => set('time')(k)} />)}</Row>
      <Txt v="label" style={{ marginTop: 24, marginBottom: 10 }}>{t('cb.lang')}</Txt>
      <Row wrap gap={12}>{LANGS.map((l) => <Chip key={l.code} label={l.label} on={f.clang === l.code} onPress={() => set('clang')(l.code)} />)}</Row>
      <Pressable onPress={() => { tap(); set('consent')(!f.consent); }} accessibilityRole="checkbox" accessibilityState={{ checked: f.consent }} style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: e.consent ? c.bad : f.consent ? c.red : c.line, backgroundColor: f.consent ? c.red : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{f.consent ? <Icon name="checkmark" size={18} color="#fff" /> : null}</View>
        <Txt style={{ flex: 1 }}>{t('cb.consent')}</Txt>
      </Pressable>
      <ErrorBox text={e.consent} />
      <ErrorBox text={top} />
      <Gap h={20} />
      <Button title={t('cb.submit')} icon="call" loading={busy} onPress={submit} />
      <Sheet visible={pick} onClose={() => setPick(false)} title={t('cb.state')}>
        <Row wrap gap={10}>{STATES.map((s) => <Chip key={s} label={s} on={f.state === s} onPress={() => { set('state')(s); setPick(false); }} />)}</Row>
        <Gap h={10} />
      </Sheet>
    </Screen>
  );
}
