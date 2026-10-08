import React, { useState } from 'react';
import { View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, ErrorBox, Field, Gap, Notice, Row, Screen, ScreenHeader, Txt, success } from '../components/ui';
import { Logo } from '../components/common';
import { validEmail } from '../components/forms';
import { useAuth } from '../lib/auth';
import { errorText } from '../lib/errors';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { kv } from '../lib/storage';

export default function Login() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { login, sessionExpired, clearExpired } = useAuth();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [eErr, setEErr] = useState<string | null>(null); const [pErr, setPErr] = useState<string | null>(null); const [top, setTop] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setTop(null);
    const e1 = validEmail(email) ? null : t('acc.err.email'); const p1 = pw ? null : t('acc.err.pwlen');
    setEErr(e1); setPErr(p1); if (e1 || p1) return;
    setBusy(true);
    try { await login(email.trim().toLowerCase(), pw); await kv.set('pc_seen', '1'); success(); clearExpired(); router.replace('/(tabs)'); }
    catch (e) { setTop(errorText(e, t)); } finally { setBusy(false); }
  };
  return (
    <Screen keyboard>
      <ScreenHeader title={t('acc.login')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <View style={{ alignItems: 'center', marginVertical: 8 }}><Logo size={64} text={false} /></View>
      <Txt v="h1" align="center">PulseCover</Txt>
      <Txt color={c.mute} align="center" style={{ marginTop: 4, marginBottom: 6 }}>{t('acc.sub')}</Txt>
      {sessionExpired ? <Notice tone="info" text={t('idle.out')} /> : null}
      <Field label={t('field.email')} value={email} onChangeText={(v) => { setEmail(v); setEErr(null); }} error={eErr} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" left="mail-outline" returnKeyType="next" />
      <Field label={t('field.password.login')} value={pw} onChangeText={(v) => { setPw(v); setPErr(null); }} error={pErr} secure autoCapitalize="none" autoComplete="password" textContentType="password" left="lock-closed-outline" returnKeyType="go" onSubmitEditing={submit} />
      <ErrorBox text={top} />
      <Gap h={22} />
      <Button title={t('acc.login')} onPress={submit} loading={busy} />
      <Row style={{ justifyContent: 'center', marginTop: 22 }} gap={6}>
        <Txt color={c.mute}>{t('acc.new')}</Txt>
        <Link href="/register" replace><Txt w="700" color={c.accent}>{t('acc.register')}</Txt></Link>
      </Row>
      <Gap h={8} />
      <Button title={t('app.guest')} variant="soft" onPress={async () => { await kv.set('pc_seen', '1'); router.replace('/(tabs)'); }} />
    </Screen>
  );
}
