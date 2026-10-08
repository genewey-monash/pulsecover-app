import React, { useMemo, useState } from 'react';
import { Switch, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ButtonRow, Badge, Button, Card, Field, Gap, Notice, Row, Screen, ScreenHeader, Sheet, Txt } from '../components/ui';
import { MetricBar, ScoreRing } from '../components/charts';
import { PlanChips } from '../components/common';
import { validEmail } from '../components/forms';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rm } from '../lib/data';
import { errorText } from '../lib/errors';
import { useI18n } from '../lib/i18n';
import { quote } from '../lib/pricing';
import { useTheme } from '../lib/theme';

export default function Calculator() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { user } = useAuth(); const p = useLocalSearchParams<{ plan?: string }>();
  const [plan, setPlan] = useState(['A', 'B', 'C', 'D'].includes(String(p.plan)) ? String(p.plan) : 'A');
  const [m, setM] = useState({ steps: 7500, exerciseMin: 100, sleepHours: 7.5, restingHr: 66 });
  const [sub, setSub] = useState(false);
  const q = useMemo(() => quote(m, { plan, appSubscription: sub }), [m, plan, sub]);
  const [open, setOpen] = useState(false); const [email, setEmail] = useState(user?.email ?? ''); const [err, setErr] = useState<string | null>(null); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof m) => (v: number) => setM((s) => ({ ...s, [k]: v }));
  const send = async () => {
    if (!validEmail(email)) { setErr(t('acc.err.email')); return; }
    setBusy(true); setErr(null);
    try { await api('/email-quote', { email: email.trim(), plan, ...m, appSubscription: sub }); setOk(true); } catch (e) { setErr(errorText(e, t)); } finally { setBusy(false); }
  };
  const sliders: [keyof typeof m, string, number, number, number, string][] = [
    ['steps', 'calc.steps', 0, 20000, 250, m.steps.toLocaleString()],
    ['exerciseMin', 'calc.exercise', 0, 400, 5, `${m.exerciseMin} min`],
    ['sleepHours', 'calc.sleep', 3, 11, 0.25, `${m.sleepHours} h`],
    ['restingHr', 'calc.hr', 40, 100, 1, `${m.restingHr} bpm`],
  ];
  const diff = q.savings;
  return (
    <Screen>
      <ScreenHeader title={t('calc.h1')} subtitle={t('calc.sub')} />
      <Txt v="label" color={c.mute} style={{ marginBottom: 8 }}>{t('calc.plan')}</Txt>
      <PlanChips value={plan} onChange={setPlan} />
      <Gap h={16} />
      <Card pad={20}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Txt v="caption" color={c.mute}>{t('calc.yours')}</Txt>
            <Txt v="display" color={c.accent} style={{ fontSize: 30 }}>{rm(q.annualPremium)}</Txt>
            <Txt v="small" color={c.mute}>{t('calc.permonth')} {rm(q.monthlyPremium)}</Txt>
            <Row gap={8} style={{ marginTop: 10 }} wrap>
              <Badge label={`${q.adjustmentPct > 0 ? '+' : ''}${q.adjustmentPct}%`} tone={q.adjustmentPct <= 0 ? 'ok' : 'red'} />
              <Badge label={`${t('calc.base')} ${rm(q.base, 0)}`} tone="mute" />
            </Row>
            <Txt v="caption" color={diff >= 0 ? c.ok : c.bad} w="700" style={{ marginTop: 10 }}>{diff >= 0 ? t('calc.saved') : t('calc.extra')}: {rm(Math.abs(diff))}</Txt>
          </View>
          <ScoreRing score={q.score} grade={q.grade} size={118} label={t('calc.score')} />
        </Row>
        <Txt v="label" style={{ marginTop: 18 }}>{t('calc.breakdown')}</Txt>
        <MetricBar label={t('calc.steps')} value={q.components.steps} />
        <MetricBar label={t('calc.exercise')} value={q.components.exercise} />
        <MetricBar label={t('calc.sleep')} value={q.components.sleep} />
        <MetricBar label={t('calc.hr')} value={q.components.heart} />
      </Card>
      <Gap h={16} />
      <Card>
        {sliders.map(([k, label, min, max, step, shown], i) => (
          <View key={k} style={{ marginTop: i ? 14 : 0 }}>
            <Row style={{ justifyContent: 'space-between' }}><Txt v="label" style={{ flex: 1 }}>{t(label)}</Txt><Txt v="h3" color={c.accent}>{shown}</Txt></Row>
            <Slider style={{ height: 40 }} minimumValue={min} maximumValue={max} step={step} value={m[k]} onValueChange={set(k)} minimumTrackTintColor={c.red} maximumTrackTintColor={c.track} thumbTintColor={c.red} accessibilityLabel={t(label)} />
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: c.line, marginVertical: 14 }} />
        <Row style={{ justifyContent: 'space-between' }}><Txt style={{ flex: 1, paddingRight: 10 }}>{t('calc.sub.opt')}</Txt><Switch value={sub} onValueChange={setSub} trackColor={{ true: c.red, false: c.line }} thumbColor="#fff" /></Row>
      </Card>
      <Gap h={16} />
      <Card tone="soft"><Txt v="h3">{t('calc.formula.h')}</Txt><Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t('calc.formula.p')}</Txt></Card>
      <Gap h={16} />
      <Button title={t('calc.cta')} icon="shield-checkmark" onPress={() => router.push({ pathname: '/apply', params: { plan, steps: String(m.steps), exerciseMin: String(m.exerciseMin), sleepHours: String(m.sleepHours), restingHr: String(m.restingHr), sub: sub ? '1' : '0' } })} />
      <Gap h={10} />
      <ButtonRow>
        <Button title={t('eq.h')} variant="ghost" icon="mail" style={{ flex: 1 }} small onPress={() => { setOk(false); setErr(null); setOpen(true); }} />
        <Button title={t('calc.connect.btn')} variant="soft" icon="pulse" style={{ flex: 1 }} small onPress={() => router.push('/(tabs)/wearable')} />
      </ButtonRow>
      <Txt v="caption" color={c.mute} style={{ marginTop: 14 }}>{t('calc.note')}</Txt>

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('eq.h')}>
        {ok ? (<><Notice text={t('eq.ok')} /><Gap h={14} /><Button title={t('connect.cancel')} variant="ghost" onPress={() => setOpen(false)} /></>) : (
          <>
            <Field label={t('eq.ph')} value={email} onChangeText={(v) => { setEmail(v); setErr(null); }} autoCapitalize="none" keyboardType="email-address" left="mail-outline" error={err} />
            <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('eq.note')}</Txt>
            <Gap h={16} />
            <Button title={t('eq.btn')} loading={busy} icon="send" onPress={send} />
          </>
        )}
      </Sheet>
    </Screen>
  );
}
