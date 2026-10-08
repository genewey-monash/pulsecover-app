import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, ErrorBox, Field, Gap, Hero, Icon, Row, Screen, ScreenHeader, SectionTitle, Txt } from '../components/ui';
import { IMG } from '../components/common';
import { validEmail } from '../components/forms';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rm } from '../lib/data';
import { errorText } from '../lib/errors';
import { useI18n } from '../lib/i18n';
import { smeQuote } from '../lib/pricing';
import { useTheme } from '../lib/theme';

export default function Business() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { user } = useAuth();
  const [emp, setEmp] = useState(25); const [avg, setAvg] = useState(60);
  const q = useMemo(() => smeQuote(emp, avg), [emp, avg]);
  const [f, setF] = useState({ company: '', contact: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', message: '' });
  const [e, setE] = useState<Record<string, string | null>>({}); const [top, setTop] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setE((p) => ({ ...p, [k]: null })); };
  const send = async () => {
    setTop(null);
    const err = { company: f.company.trim().length >= 2 ? null : t('common.required') + ': ' + t('sme.company'), contact: f.contact.trim().length >= 2 ? null : t('acc.err.name'), email: validEmail(f.email) ? null : t('acc.err.email') };
    setE(err); if (Object.values(err).some(Boolean)) { setTop(t('pf.fix')); return; }
    setBusy(true);
    try { await api('/sme/enquiry', { company: f.company.trim(), contact: f.contact.trim(), email: f.email.trim(), phone: f.phone.trim(), employees: emp, avgScore: avg, message: f.message.trim() }); router.replace({ pathname: '/thanks', params: { kind: 'sme', email: f.email.trim() } }); }
    catch (x) { setTop(errorText(x, t)); } finally { setBusy(false); }
  };
  return (
    <Screen keyboard>
      <ScreenHeader title={t('sme.h1')} subtitle={t('sme.sub')} />
      <Hero source={IMG.team} height={170} />
      <SectionTitle>{t('sme.calc.h')}</SectionTitle>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><Txt v="label" style={{ flex: 1 }}>{t('sme.employees')}</Txt><Txt v="h3" color={c.accent}>{emp}</Txt></Row>
        <Slider style={{ height: 40 }} minimumValue={1} maximumValue={500} step={1} value={emp} onValueChange={(v) => setEmp(Math.round(v))} minimumTrackTintColor={c.red} maximumTrackTintColor={c.track} thumbTintColor={c.red} />
        <Row style={{ justifyContent: 'space-between', marginTop: 8 }}><Txt v="label" style={{ flex: 1 }}>{t('sme.avg')}</Txt><Txt v="h3" color={c.accent}>{avg}</Txt></Row>
        <Slider style={{ height: 40 }} minimumValue={0} maximumValue={100} step={1} value={avg} onValueChange={(v) => setAvg(Math.round(v))} minimumTrackTintColor={c.red} maximumTrackTintColor={c.track} thumbTintColor={c.red} />
        <View style={{ height: 1, backgroundColor: c.line, marginVertical: 12 }} />
        <Row style={{ justifyContent: 'space-between' }}><Txt color={c.mute}>{t('sme.per')}</Txt><Txt v="h3">{rm(q.perEmployeeAnnual)}</Txt></Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 6 }}><Txt color={c.mute}>{t('sme.total')}</Txt><Txt v="h2" color={c.accent}>{rm(q.totalAnnual)}</Txt></Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 6 }}><Txt color={c.mute}>{t('sme.save')}</Txt><Txt w="700" color={q.savingsVsFlat >= 0 ? c.ok : c.bad}>{rm(q.savingsVsFlat)}</Txt></Row>
        {q.bulkDiscountPct ? <View style={{ marginTop: 10 }}><Badge label={`${t('sme.bulk')} ${q.bulkDiscountPct}%`} tone="gold" /></View> : null}
      </Card>
      {[1, 2, 3].map((i) => <Row key={i} gap={12} align="flex-start" style={{ marginTop: 14 }}><Icon name="checkmark-circle" size={22} color={c.ok} /><View style={{ flex: 1 }}><Txt w="700">{t(`sme.b${i}.h`)}</Txt><Txt v="small" color={c.mute}>{t(`sme.b${i}.p`)}</Txt></View></Row>)}
      <SectionTitle>{t('sme.enquiry.h')}</SectionTitle>
      <Field label={t('sme.company')} value={f.company} onChangeText={set('company')} error={e.company} left="business-outline" maxLength={150} />
      <Field label={t('sme.contact')} value={f.contact} onChangeText={set('contact')} error={e.contact} left="person-outline" maxLength={100} />
      <Field label={t('field.email')} value={f.email} onChangeText={set('email')} error={e.email} autoCapitalize="none" keyboardType="email-address" left="mail-outline" />
      <Field label={t('field.phone')} value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" left="call-outline" maxLength={30} />
      <Field label={t('field.message')} value={f.message} onChangeText={set('message')} multiline maxLength={1000} />
      <ErrorBox text={top} />
      <Gap h={20} />
      <Button title={t('sme.send')} icon="send" loading={busy} onPress={send} />
      <Txt v="caption" color={c.mute} style={{ marginTop: 14 }}>{t('sme.assoc')}</Txt>
    </Screen>
  );
}
