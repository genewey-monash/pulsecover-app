import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Chip, ErrorBox, Field, Gap, Icon, Row, Screen, ScreenHeader, Txt, success } from '../components/ui';
import { DateField, iso } from '../components/forms';
import { api } from '../lib/api';
import { rm, useDash } from '../lib/data';
import { errorText } from '../lib/errors';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

const TYPES = ['hospitalisation', 'outpatient', 'critical_illness', 'accident', 'death'] as const;

export default function ClaimNew() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { dash, refresh } = useDash();
  const [type, setType] = useState<typeof TYPES[number]>('hospitalisation'); const [amount, setAmount] = useState(''); const [date, setDate] = useState(''); const [desc, setDesc] = useState('');
  const [e, setE] = useState<Record<string, string | null>>({}); const [top, setTop] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [done, setDone] = useState<string | null>(null);
  const cover = dash?.policy?.cover ?? 0;
  const submit = async () => {
    setTop(null);
    const amt = parseFloat(amount.replace(/,/g, ''));
    const err = {
      amount: amt > 0 && (!cover || amt <= cover) ? null : t('app.claim.err.amount', { cover: rm(cover, 0) }),
      date: date && date <= iso(new Date()) ? null : t('app.claim.err.date'),
      desc: desc.trim().length >= 10 ? null : t('app.claim.err.desc'),
    };
    setE(err); if (Object.values(err).some(Boolean)) { setTop(t('pf.fix')); return; }
    setBusy(true);
    try { const r = await api<{ number: string }>('/claims', { type, amount: amt, incidentDate: date, description: desc.trim() }); success(); setDone(r.number); await refresh(); }
    catch (x) { setTop(errorText(x, t)); } finally { setBusy(false); }
  };
  if (done) return (
    <Screen><View style={{ alignItems: 'center', paddingTop: 50 }}>
      <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: c.ok, alignItems: 'center', justifyContent: 'center' }}><Icon name="checkmark" size={54} color="#fff" /></View>
      <Txt v="h1" style={{ marginTop: 22 }}>{t('cl.done')}</Txt><Txt v="display" color={c.accent} selectable>{done}</Txt>
      <Txt color={c.mute} align="center" style={{ marginTop: 10 }}>{t('cl.email')}</Txt>
      <Gap h={26} /><Button title={t('cl.track')} onPress={() => router.replace('/(tabs)/claims')} />
    </View></Screen>
  );
  return (
    <Screen keyboard>
      <ScreenHeader title={t('dash.newclaim')} subtitle={t('cl.sub')} />
      <Txt v="label" style={{ marginBottom: 8 }}>{t('cl.type')}</Txt>
      <Row wrap gap={8}>{TYPES.map((k) => <Chip key={k} label={t(`cl.t.${k}`)} on={type === k} onPress={() => setType(k)} />)}</Row>
      <Field label={t('cl.amount')} value={amount} onChangeText={(v) => { setAmount(v.replace(/[^0-9.]/g, '')); setE((p) => ({ ...p, amount: null })); }} error={e.amount} keyboardType="decimal-pad" left="cash-outline" help={cover ? `${t('dash.cover')}: ${rm(cover, 0)}` : undefined} />
      <DateField label={t('cl.date')} value={date} onChange={(v) => { setDate(v); setE((p) => ({ ...p, date: null })); }} error={e.date} max={new Date()} initial={new Date()} />
      <Field label={t('cl.desc')} value={desc} onChangeText={(v) => { setDesc(v); setE((p) => ({ ...p, desc: null })); }} error={e.desc} multiline maxLength={2000} />
      <ErrorBox text={top} />
      <Gap h={20} />
      <Button title={t('cl.submit')} icon="send" loading={busy} onPress={submit} />
    </Screen>
  );
}
