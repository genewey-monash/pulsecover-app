import React, { useState } from 'react';
import { Linking, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Chip, ErrorBox, Field, Gap, Icon, Row, Screen, ScreenHeader, Txt } from '../components/ui';
import { validEmail } from '../components/forms';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { errorText } from '../lib/errors';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

const TOPICS = ['General', 'Claims', 'Business', 'Partnerships', 'Press'];

export default function Contact() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { user } = useAuth();
  const [f, setF] = useState({ name: user?.name ?? '', email: user?.email ?? '', topic: 'General', message: '' });
  const [e, setE] = useState<Record<string, string | null>>({}); const [top, setTop] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setE((p) => ({ ...p, [k]: null })); };
  const submit = async () => {
    setTop(null);
    const err = { name: f.name.trim().length >= 2 ? null : t('acc.err.name'), email: validEmail(f.email) ? null : t('acc.err.email'), message: f.message.trim().length >= 5 ? null : t('common.required') + ': ' + t('field.message') };
    setE(err); if (Object.values(err).some(Boolean)) { setTop(t('pf.fix')); return; }
    setBusy(true);
    try { await api('/contact', { name: f.name.trim(), email: f.email.trim(), topic: f.topic, message: f.message.trim() }); router.replace({ pathname: '/thanks', params: { kind: 'ct', email: f.email.trim() } }); }
    catch (x) { setTop(errorText(x, t)); } finally { setBusy(false); }
  };
  return (
    <Screen keyboard>
      <ScreenHeader title={t('ct.h1')} subtitle={t('ct.sub')} />
      <Card tone="gold">
        <Txt v="h3">{t('ct.details')}</Txt>
        <Row gap={10} style={{ marginTop: 10 }}><Icon name="mail" size={20} color={c.accent} /><Pressable onPress={() => Linking.openURL('mailto:hello@pulsecover.example').catch(() => {})}><Txt color={c.accent}>hello@pulsecover.example</Txt></Pressable></Row>
        <Row gap={10} style={{ marginTop: 8 }}><Icon name="call" size={20} color={c.accent} /><Txt>+60 3-0000 0000</Txt></Row>
        <Row gap={10} style={{ marginTop: 8 }} align="flex-start"><Icon name="location" size={20} color={c.accent} /><Txt style={{ flex: 1 }}>{t('ct.address')}</Txt></Row>
      </Card>
      <Field label={t('field.name')} value={f.name} onChangeText={set('name')} error={e.name} left="person-outline" maxLength={100} />
      <Field label={t('field.email')} value={f.email} onChangeText={set('email')} error={e.email} autoCapitalize="none" keyboardType="email-address" left="mail-outline" />
      <Txt v="label" style={{ marginTop: 18, marginBottom: 8 }}>{t('ct.topic')}</Txt>
      <Row wrap gap={10}>{TOPICS.map((k, i) => <Chip key={k} label={t(`ct.t${i + 1}`)} on={f.topic === k} onPress={() => set('topic')(k)} />)}</Row>
      <Field label={t('field.message')} value={f.message} onChangeText={set('message')} error={e.message} multiline maxLength={2000} />
      <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('ct.ack')}</Txt>
      <ErrorBox text={top} />
      <Gap h={20} />
      <Button title={t('ct.send')} icon="send" loading={busy} onPress={submit} />
    </Screen>
  );
}
