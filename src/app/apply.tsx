import React, { useEffect, useMemo, useState } from 'react';
import { Switch, View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ButtonRow, Badge, Button, Card, ErrorBox, Field, Gap, Icon, Row, Screen, ScreenHeader, ProgressDots, Txt, success } from '../components/ui';
import { MetricBar, ScoreRing } from '../components/charts';
import { PlanChips } from '../components/common';
import { ageOf } from '../components/forms';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PROVIDERS, rm, useDash } from '../lib/data';
import { errorText } from '../lib/errors';
import { useI18n } from '../lib/i18n';
import { Quote, quote as localQuote } from '../lib/pricing';
import { tap } from '../components/ui';
import { useTheme } from '../lib/theme';

export default function Apply() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { user } = useAuth(); const { dash, refresh } = useDash();
  const p = useLocalSearchParams<{ plan?: string; steps?: string; exerciseMin?: string; sleepHours?: string; restingHr?: string; sub?: string }>();
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState(['A', 'B', 'C', 'D'].includes(String(p.plan)) ? String(p.plan) : 'A');
  const [sub, setSub] = useState(p.sub === '1');
  const [ben, setBen] = useState(''); const [c1, setC1] = useState(false); const [c2, setC2] = useState(false);
  const [errs, setErrs] = useState<Record<string, string | null>>({}); const [top, setTop] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [q, setQ] = useState<Quote | null>(null); const [qBusy, setQBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const conn = dash?.connections ?? [];
  const hasData = (dash?.metrics.length ?? 0) >= 7;
  const device = conn[0]?.provider ?? 'manual';
  const metrics = useMemo(() => ({ steps: Number(p.steps ?? 7500), exerciseMin: Number(p.exerciseMin ?? 100), sleepHours: Number(p.sleepHours ?? 7.5), restingHr: Number(p.restingHr ?? 66) }), [p.steps, p.exerciseMin, p.sleepHours, p.restingHr]);

  useEffect(() => { if (user && !dash) refresh(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadQuote = async () => {
    setQBusy(true); setTop(null);
    try {
      if (hasData) { const r = await api<{ quote: Quote }>('/my-quote', { plan, appSubscription: sub }); setQ(r.quote); }
      else setQ(localQuote(metrics, { plan, appSubscription: sub }));
    } catch (e) { setQ(localQuote(metrics, { plan, appSubscription: sub })); setTop(errorText(e, t)); } finally { setQBusy(false); }
  };
  useEffect(() => { if (step === 2) loadQuote(); }, [step, plan, sub, hasData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return (
    <Screen><ScreenHeader title={t('apply.h1')} />
      <Card><Txt v="h3">{t('apply.login.first')}</Txt><Gap h={14} /><Button title={t('nav.login')} onPress={() => router.push('/login')} /><Gap h={10} /><Button title={t('acc.register')} variant="ghost" onPress={() => router.push('/register')} /></Card></Screen>
  );
  if (dash?.policy && !done) return (
    <Screen><ScreenHeader title={t('apply.h1')} />
      <Card tone="gold"><Row gap={12}><Icon name="shield-checkmark" size={28} color={c.ok} /><Txt v="h3" style={{ flex: 1 }}>{t('apply.have')}</Txt></Row><Gap h={14} /><Button title={t('apply.done.go')} onPress={() => router.replace('/(tabs)')} /></Card></Screen>
  );

  const next = () => {
    setTop(null);
    if (step === 3) {
      const e = { ben: ben.trim().length >= 2 ? null : t('common.required') + ': ' + t('apply.ben') };
      setErrs(e); if (e.ben) return;
    }
    setStep((s) => s + 1);
  };
  const submit = async () => {
    if (!c1 || !c2) { setTop(t('common.required')); return; }
    setBusy(true); setTop(null);
    try {
      const r = await api<{ number: string }>('/apply', { ...metrics, plan, device, beneficiary: ben.trim(), consentData: true, consentTerms: true, appSubscription: sub });
      success(); setDone(r.number); await refresh();
    } catch (e) { setTop(errorText(e, t)); } finally { setBusy(false); }
  };

  if (done) return (
    <Screen><View style={{ alignItems: 'center', paddingTop: 56 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.ok, alignItems: 'center', justifyContent: 'center' }}><Icon name="shield-checkmark" size={52} color="#fff" /></View>
      <Txt v="h1" style={{ marginTop: 24 }}>{t('apply.done.h')}</Txt>
      <Txt color={c.mute} style={{ marginTop: 6 }}>{t('apply.done.p')}</Txt>
      <Txt v="display" color={c.accent} style={{ marginTop: 4 }} selectable>{done}</Txt>
      <Txt v="small" color={c.mute} align="center" style={{ marginTop: 16 }}>{t('apply.sendins')}</Txt>
      <Gap h={26} /><Button title={t('apply.done.go')} onPress={() => router.replace('/(tabs)')} />
    </View></Screen>
  );

  const check = (on: boolean, set: (v: boolean) => void, label: string) => (
    <Pressable onPress={() => { tap(); set(!on); }} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 14 }}>
      <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: on ? c.red : c.line, backgroundColor: on ? c.red : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{on ? <Icon name="checkmark" size={18} color="#fff" /> : null}</View>
      <Txt style={{ flex: 1 }}>{label}</Txt>
    </Pressable>
  );

  return (
    <Screen keyboard>
      <ScreenHeader title={t('apply.h1')} subtitle={t('apply.sub')} />
      <ProgressDots step={step} total={4} />
      <Txt v="label" color={c.accent} style={{ marginTop: 10, marginBottom: 14 }}>{t(`apply.step${step}`)}</Txt>

      {step === 1 ? (
        <>
          <Card>
            <Txt v="h3">{t('apply.connect.h')}</Txt>
            <Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t('apply.connect.p')}</Txt>
            {conn.length ? conn.map((cn) => <Row key={cn.provider} gap={10} style={{ marginTop: 12 }}><Icon name="checkmark-circle" size={22} color={c.ok} /><Txt w="600">{PROVIDERS[cn.provider]}</Txt></Row>) : null}
            {conn.length ? <Txt v="small" color={c.ok} w="700" style={{ marginTop: 10 }}>{dash?.metrics.length ?? 0} {t('apply.connected.n')}</Txt> : null}
            <Gap h={14} />
            <Button title={t('calc.connect.btn')} variant={conn.length ? 'ghost' : 'primary'} icon="pulse" onPress={() => router.push('/(tabs)/wearable')} />
          </Card>
          {!conn.length ? <Card tone="soft" style={{ marginTop: 12 }}><Txt v="label">{t('apply.manual.h')}</Txt><Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t('apply.dev.note')}</Txt></Card> : null}
          <Gap h={20} /><Button title={t('apply.next')} onPress={next} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Txt v="label" color={c.mute} style={{ marginBottom: 8 }}>{t('apply.plan')}</Txt>
          <PlanChips value={plan} onChange={setPlan} />
          <Gap h={14} />
          <Card pad={20}>
            {q ? (
              <>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Txt v="caption" color={c.mute}>{t('apply.quote.rating')}</Txt>
                    <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('calc.yours')}</Txt>
                    <Txt v="display" color={c.accent} style={{ fontSize: 28 }}>{rm(q.annualPremium)}</Txt>
                    <Txt v="small" color={c.mute}>{t('calc.permonth')} {rm(q.monthlyPremium)}</Txt>
                    <View style={{ marginTop: 8 }}><Badge label={`${q.adjustmentPct > 0 ? '+' : ''}${q.adjustmentPct}%`} tone={q.adjustmentPct <= 0 ? 'ok' : 'red'} /></View>
                  </View>
                  <ScoreRing score={q.score} grade={q.grade} size={110} />
                </Row>
                <MetricBar label={t('calc.steps')} value={q.components.steps} /><MetricBar label={t('calc.exercise')} value={q.components.exercise} /><MetricBar label={t('calc.sleep')} value={q.components.sleep} /><MetricBar label={t('calc.hr')} value={q.components.heart} />
              </>
            ) : <Txt color={c.mute}>…</Txt>}
          </Card>
          <Row style={{ justifyContent: 'space-between', marginTop: 14 }}><Txt style={{ flex: 1, paddingRight: 10 }}>{t('calc.sub.opt')}</Txt><Switch value={sub} onValueChange={setSub} trackColor={{ true: c.red, false: c.line }} thumbColor="#fff" /></Row>
          <ErrorBox text={top} />
          <Txt v="caption" color={c.mute} style={{ marginTop: 12 }}>{t('apply.sendins')}</Txt>
          <Gap h={18} />
          <ButtonRow><Button title={t('apply.back')} variant="ghost" style={{ flex: 1 }} onPress={() => setStep(1)} /><Button title={t('apply.next')} loading={qBusy} style={{ flex: 2 }} onPress={next} /></ButtonRow>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Field label={t('apply.ben')} value={ben} onChangeText={(v) => { setBen(v); setErrs((e) => ({ ...e, ben: null })); }} error={errs.ben} left="person-outline" maxLength={100} />
          <Gap h={20} />
          <ButtonRow><Button title={t('apply.back')} variant="ghost" style={{ flex: 1 }} onPress={() => setStep(2)} /><Button title={t('apply.next')} style={{ flex: 2 }} onPress={next} /></ButtonRow>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}><Txt v="h3">{t('plan.word')} {plan}</Txt>{q ? <Txt v="h3" color={c.accent}>{rm(q.annualPremium)}{t('common.year')}</Txt> : null}</Row>
            <Txt v="small" color={c.mute} style={{ marginTop: 6 }}>{t('pf.ben')}: {ben}</Txt>
            <Txt v="small" color={c.mute}>{device === 'manual' ? t('apply.dev.manual') : PROVIDERS[device]}</Txt>
          </Card>
          {check(c1, setC1, t('apply.consent1'))}
          {check(c2, setC2, t('apply.consent2'))}
          <ErrorBox text={top} />
          <Gap h={20} />
          <Button title={t('apply.confirm')} icon="shield-checkmark" loading={busy} onPress={submit} /><Gap h={10} /><Button title={t('apply.back')} variant="ghost" onPress={() => setStep(3)} />
        </>
      ) : null}
    </Screen>
  );
}
