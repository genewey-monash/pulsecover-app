import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ErrorBox, Field, Gap, Row, Screen, ScreenHeader, Txt, success } from '../components/ui';
import { DateField, ageOf, strength, validEmail } from '../components/forms';
import { useAuth } from '../lib/auth';
import { errorText } from '../lib/errors';
import { useI18n } from '../lib/i18n';
import { kv } from '../lib/storage';
import { useTheme } from '../lib/theme';

export default function Register() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { register } = useAuth(); const { ref } = useLocalSearchParams<{ ref?: string }>();
  const [f, setF] = useState({ name: '', email: '', dob: '', pw: '', pw2: '', ref: ref ?? '' });
  const [e, setE] = useState<Record<string, string | null>>({}); const [top, setTop] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setE((p) => ({ ...p, [k]: null })); };
  const s = strength(f.pw); const colors = [c.bad, '#E8590C', c.gold, '#6BAA2E', c.ok];
  const emailRef = useRef(null);
  const submit = async () => {
    setTop(null);
    const err = {
      name: f.name.trim().length >= 2 ? null : t('acc.err.name'),
      email: validEmail(f.email) ? null : t('acc.err.email'),
      dob: f.dob && ageOf(f.dob) >= 16 ? null : t('acc.err.dob'),
      pw: f.pw.length >= 8 ? null : t('acc.err.pwlen'),
      pw2: f.pw === f.pw2 ? null : t('acc.err.match'),
    };
    setE(err); if (Object.values(err).some(Boolean)) { setTop(t('pf.fix')); return; }
    setBusy(true);
    try {
      await register({ name: f.name.trim(), email: f.email.trim().toLowerCase(), dob: f.dob, password: f.pw, password2: f.pw2, referral: f.ref.trim() || undefined });
      await kv.set('pc_seen', '1'); success(); router.replace('/(tabs)');
    } catch (x) { setTop(errorText(x, t)); } finally { setBusy(false); }
  };
  return (
    <Screen keyboard>
      <ScreenHeader title={t('acc.register')} subtitle={t('acc.register.sub')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <Field label={t('field.name')} value={f.name} onChangeText={set('name')} error={e.name} autoComplete="name" textContentType="name" left="person-outline" maxLength={100} />
      <Field ref={emailRef} label={t('field.email')} value={f.email} onChangeText={set('email')} error={e.email} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" left="mail-outline" />
      <DateField label={t('field.dob')} value={f.dob} onChange={set('dob')} error={e.dob} max={new Date()} />
      <Field label={t('field.password')} value={f.pw} onChangeText={set('pw')} error={e.pw} secure autoCapitalize="none" textContentType="oneTimeCode" autoComplete="off" left="lock-closed-outline" />
      {f.pw ? (
        <View style={{ marginTop: 10 }}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.line, overflow: 'hidden' }}><View style={{ height: 6, width: `${[12, 30, 55, 80, 100][s]}%`, backgroundColor: colors[s] }} /></View>
          <Txt v="caption" w="700" color={colors[s]} style={{ marginTop: 4 }}>{t(`acc.pw.${s}`)}</Txt>
        </View>
      ) : null}
      <Field label={t('field.password2')} value={f.pw2} onChangeText={set('pw2')} error={e.pw2} secure autoCapitalize="none" textContentType="oneTimeCode" autoComplete="off" left="lock-closed-outline" />
      <Field label={t('field.referral')} value={f.ref} onChangeText={(v) => set('ref')(v.toUpperCase())} autoCapitalize="characters" maxLength={20} left="gift-outline" />
      <Txt v="small" color={c.mute} style={{ marginTop: 14 }}>{t('acc.welcome.note')}</Txt>
      <ErrorBox text={top} />
      <Gap h={20} />
      <Button title={t('acc.register')} onPress={submit} loading={busy} />
      <Row style={{ justifyContent: 'center', marginTop: 20 }} gap={6}>
        <Txt color={c.mute}>{t('acc.have')}</Txt>
        <Link href="/login" replace><Txt w="700" color={c.accent}>{t('acc.login')}</Txt></Link>
      </Row>
    </Screen>
  );
}
