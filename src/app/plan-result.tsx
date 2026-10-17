import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, Card, Chip, Gap, Icon, Row, Screen, ScreenHeader, Txt } from '../components/ui';
import { MetricBar, ScoreRing } from '../components/charts';
import { rm, useDash } from '../lib/data';
import { useI18n } from '../lib/i18n';
import { pqHandoff, SAMPLE } from '../lib/pqLogic';
import { PLANS, quote, smeQuote, type Metrics, type PlanId } from '../lib/pricing';
import { useTheme } from '../lib/theme';

/** Plan result: the plan chosen on the Plans tab with a fixed, wearable-adjusted quote. Stands alone: it never reads or writes the Premium Calculator.
 *  Mirrors /plan-result on the website. */
export default function PlanResultScreen() {
  const router = useRouter(); const { t } = useI18n(); const { c, isDark } = useTheme(); const { dash } = useDash();
  const p = useLocalSearchParams<{ plan?: string }>();
  const raw = String(p.plan ?? 'A').toUpperCase(); const biz = raw === 'BUSINESS'; const id: PlanId = biz ? 'A' : ((PLANS as Record<string, unknown>)[raw] ? (raw as PlanId) : 'A');
  const plan = PLANS[id]; const fam = !biz && plan.type === 'family';
  const [members, setMembers] = useState(4); const [heads, setHeads] = useState(25);

  // linked wearable (account or guest) when there is data, otherwise the SAMPLE values from the calculator's defaults
  const real = !!(dash && dash.weekly.length);
  const m: Metrics = useMemo(() => {
    if (dash && dash.weekly.length) {
      const w = dash.weekly.slice(-4); const n = w.length;
      return { steps: Math.round(w.reduce((a, x) => a + x.steps, 0) / n), exerciseMin: Math.round(w.reduce((a, x) => a + x.exerciseMin, 0) / n), sleepHours: Math.round((w.reduce((a, x) => a + x.sleepHours, 0) / n) * 4) / 4, restingHr: Math.round(w.reduce((a, x) => a + x.restingHr, 0) / n) };
    }
    return { steps: 7500, exerciseMin: 100, sleepHours: 7.5, restingHr: 66 };
  }, [dash]);
  void SAMPLE;
  const q = useMemo(() => quote(m, { plan: id }), [m, id]);
  const sme = useMemo(() => smeQuote(heads, q.score), [heads, q.score]);
  const annual = biz ? sme.perEmployeeAnnual : q.annualPremium; const adj = biz ? sme.adjustmentPct : q.adjustmentPct; const saved = biz ? q.base - sme.perEmployeeAnnual : q.savings;
  const per = annual / members;
  const Sample = () => (real ? null : <View style={{ borderWidth: 1, borderColor: c.mute, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}><Txt v="caption" w="800" color={c.mute}>{t('pqr.sample')}</Txt></View>);
  const KV = ({ k, v, big, last }: { k: string; v: string; big?: boolean; last?: boolean }) => (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }} gap={10}><Txt v="small" color={c.mute} style={{ flex: 1 }}>{k}</Txt><Txt w="800" style={big ? { fontSize: 20 } : undefined}>{v}</Txt></Row>
  );
  const goPremium = () => { pqHandoff.value = { plan: id, ...m, from: biz ? 'business' : id }; router.push('/premium-quote'); };

  return (
    <Screen>
      <ScreenHeader title={t('pl2.h1', { p: biz ? t('pl2.biz') : `${t('plan.word')} ${id}` })} subtitle={t('pl2.sub')} />
      {!real ? (
        <Card tone="soft" pad={14}>
          <Txt w="600">{t('pl2.sample')}</Txt>
          <Gap h={10} /><Button title={t('nav.connect')} small full={false} onPress={() => router.navigate('/(tabs)/wearable')} />
        </Card>
      ) : <Txt v="caption" color={c.mute}>{t(biz ? 'pl2.biz.team' : 'pl2.src.real')}</Txt>}
      {!real && biz ? <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('pl2.biz.team')}</Txt> : null}

      <Card pad={20} style={{ marginTop: 14 }}>
        <Row gap={8} style={{ marginBottom: 6 }}><Txt v="label" w="800">{t('calc.score')}</Txt><Sample /></Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Txt v="display" style={{ fontSize: 34, lineHeight: 40 }}>{q.score} / 100</Txt>
            <View style={{ marginTop: 8 }}><Badge label={`${adj > 0 ? '+' : ''}${adj}%`} tone={adj <= 0 ? 'ok' : 'red'} /></View>
          </View>
          <ScoreRing score={q.score} grade={q.grade} size={104} label={t('calc.score')} />
        </Row>
        <View style={{ marginTop: 14 }}>
          <KV k={`${t('calc.base')}${biz ? ' / ' + t('pl2.biz.per').toLowerCase() : ''}`} v={rm(q.base)} />
          <KV k={t('calc.adj')} v={`${adj > 0 ? '+' : ''}${adj}%`} />
          <KV k={`${t('calc.yours')}${biz ? ' / ' + t('pl2.biz.per').toLowerCase() : ''}`} v={rm(annual)} big />
          <KV k={t('calc.permonth')} v={rm(annual / 12)} />
          <KV k={t(saved >= 0 ? 'calc.saved' : 'calc.extra')} v={rm(Math.abs(saved))} last />
        </View>
        <Txt v="label" w="800" style={{ marginTop: 16 }}>{t('calc.breakdown')}</Txt>
        <MetricBar label={t('comp.steps')} value={q.components.steps} right={String(q.components.steps)} />
        <MetricBar label={t('comp.exercise')} value={q.components.exercise} right={String(q.components.exercise)} />
        <MetricBar label={t('comp.sleep')} value={q.components.sleep} right={String(q.components.sleep)} />
        <MetricBar label={t('comp.heart')} value={q.components.heart} right={String(q.components.heart)} />

        {fam ? (
          <View style={{ marginTop: 18 }}>
            <Txt v="label" w="800">{t('pl2.fam.h')}</Txt>
            <Txt v="caption" color={c.mute} style={{ marginTop: 8, marginBottom: 6 }}>{t('pl2.fam.members')}</Txt>
            <Row gap={8} wrap>{[2, 3, 4, 5, 6].map((n) => <Chip key={n} label={String(n)} on={members === n} onPress={() => setMembers(n)} />)}</Row>
            <View style={{ marginTop: 8 }}>
              <KV k={t('pl2.fam.combined')} v={rm(q.annualPremium)} />
              <KV k={t('pl2.fam.per')} v={rm(per)} />
              <KV k={`${t('calc.permonth')} / ${t('pl2.fam.per').toLowerCase()}`} v={rm(per / 12)} last />
            </View>
            <Txt v="caption" color={c.mute}>{t('pl2.fam.note')}</Txt>
          </View>
        ) : null}
        {biz ? (
          <View style={{ marginTop: 18 }}>
            <Txt v="label" w="800">{t('pl2.biz.h')}</Txt>
            <Txt v="caption" color={c.mute} style={{ marginTop: 8, marginBottom: 6 }}>{t('pl2.biz.heads')}</Txt>
            <Row gap={8} wrap>{[5, 10, 25, 50, 100, 250, 500].map((n) => <Chip key={n} label={String(n)} on={heads === n} onPress={() => setHeads(n)} />)}</Row>
            <View style={{ marginTop: 8 }}>
              <KV k={t('pl2.biz.per')} v={rm(sme.perEmployeeAnnual)} />
              <KV k={t('pl2.biz.total')} v={rm(sme.totalAnnual)} />
              <KV k={t('pl2.biz.disc')} v={`${sme.bulkDiscountPct}%`} last />
            </View>
            <Txt v="caption" color={c.mute}>{t('pl2.biz.note')}</Txt>
          </View>
        ) : null}

        <Gap h={18} />
        {biz ? <Button title={t('pl2.biz.cta')} onPress={() => router.push('/business')} />
          : <Button title={t('calc.cta')} icon="shield-checkmark" onPress={() => router.push({ pathname: '/apply', params: { plan: id, steps: String(m.steps), exerciseMin: String(m.exerciseMin), sleepHours: String(m.sleepHours), restingHr: String(m.restingHr), sub: '0' } })} />}
        <Txt v="caption" color={c.mute} style={{ marginTop: 12 }}>{t('pl2.disc')}</Txt>
      </Card>

      {/* highlighted Premium upsell */}
      <Card pad={20} style={{ marginTop: 18, borderColor: c.gold, borderWidth: 1.5, shadowColor: c.red, shadowOpacity: isDark ? 0.5 : 0.25, shadowRadius: 18, elevation: 4 }}>
        <Badge label={t('pl2.up.badge')} tone="gold" />
        <Txt v="h2" style={{ marginTop: 10 }}>{t('pl2.up.h')}</Txt>
        <Txt v="small" color={c.mute} style={{ marginTop: 6 }}>{t('pl2.up.p')}</Txt>
        <View style={{ marginVertical: 16, gap: 12 }}>
          {([['shield-checkmark', 'pl2.up.b1'], ['document-text', 'pl2.up.b2'], ['gift', 'pl2.up.b3']] as const).map(([ic, k]) => (
            <Row key={k} gap={12}><View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={18} color="#fff" /></View><Txt w="600" style={{ flex: 1 }}>{t(k)}</Txt></Row>
          ))}
        </View>
        <Txt w="800" color={c.accent} style={{ marginBottom: 12 }}>{t('pl2.up.price')}</Txt>
        <Button title={t('pl2.up.cta')} icon="star" onPress={goPremium} />
        <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('pl2.up.note')}</Txt>
      </Card>
    </Screen>
  );
}
