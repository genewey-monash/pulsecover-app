import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, Button, Chip, ErrorBox, Field, Gap, Notice, Row, Screen, ScreenHeader, Txt, success } from '../components/ui';
import { DateField, adultCutoff, ageOf } from '../components/forms';
import { api } from '../lib/api';
import { User, useAuth } from '../lib/auth';
import { errorText } from '../lib/errors';
import { LANGS, Lang, useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

export default function Profile() {
  const router = useRouter(); const { t, setLang, lang } = useI18n(); const { c } = useTheme(); const { user, setUser } = useAuth();
  const [f, setF] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', dob: user?.dob ?? '', address: user?.address ?? '', lang: (user?.lang ?? lang) as Lang });
  const [e, setE] = useState<Record<string, string | null>>({}); const [top, setTop] = useState<string | null>(null); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  if (!user) return <Screen><ScreenHeader title={t('pf.h1')} /><Button title={t('nav.login')} onPress={() => router.replace('/login')} /></Screen>;
  const set = (k: keyof typeof f) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setE((p) => ({ ...p, [k]: null })); setOk(false); };
  const save = async () => {
    setTop(null); setOk(false);
    const err = {
      name: f.name.trim().length >= 2 ? null : t('acc.err.name'),
      phone: !f.phone.trim() || /^\+?[0-9][0-9 \-]{6,18}$/.test(f.phone.trim()) ? null : t('pf.err.phone'),
      dob: f.dob && ageOf(f.dob) >= 18 ? null : t('acc.err.dob'),
    };
    setE(err); if (Object.values(err).some(Boolean)) { setTop(t('pf.fix')); return; }
    setBusy(true);
    try {
      const u = await api<User>('/profile', { name: f.name.trim(), phone: f.phone.trim(), dob: f.dob, address: f.address.trim(), lang: f.lang });
      setUser(u); if (u.lang !== lang) setLang(u.lang as Lang); setOk(true); success();
    } catch (x) { setTop(errorText(x, t)); } finally { setBusy(false); }
  };
  return (
    <Screen keyboard>
      <ScreenHeader title={t('pf.h1')} subtitle={t('pf.sub')} />
      <View style={{ alignItems: 'center', marginBottom: 6 }}><Avatar name={f.name || user.name} size={84} /></View>
      <Txt v="h3" style={{ marginTop: 10 }}>{t('pf.personal')}</Txt>
      <Field label={t('field.name')} value={f.name} onChangeText={set('name')} error={e.name} left="person-outline" maxLength={100} autoComplete="name" />
      <Field label={t('field.email')} value={user.email} disabled left="mail-outline" help={t('pf.email.note')} editable={false} />
      <Field label={t('field.phone')} value={f.phone} onChangeText={set('phone')} error={e.phone} keyboardType="phone-pad" left="call-outline" maxLength={20} />
      <DateField label={t('field.dob')} value={f.dob} onChange={set('dob')} error={e.dob} max={adultCutoff()} />
      <Field label={t('pf.address')} value={f.address} onChangeText={set('address')} left="location-outline" maxLength={200} />
      <Txt v="label" style={{ marginTop: 16, marginBottom: 8 }}>{t('pf.lang')}</Txt>
      <Row wrap gap={8}>{LANGS.map((l) => <Chip key={l.code} label={l.label} on={f.lang === l.code} onPress={() => { setF((p) => ({ ...p, lang: l.code })); setOk(false); }} />)}</Row>
      <ErrorBox text={top} />
      {ok ? <Notice text={t('pf.saved')} /> : null}
      <Gap h={22} />
      <Button title={t('pf.save')} icon="save" loading={busy} onPress={save} />
    </Screen>
  );
}
