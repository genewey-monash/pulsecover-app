import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, Gap, Icon, Row, Screen, ScreenHeader, Tile, Txt } from '../components/ui';
import { CONFIG, GRADES, SUB, adjustment, type Billing } from '../lib/pricing';
import { priceLabel, SubscribeSheet } from '../components/subscription';
import { useSub } from '../lib/subscription';
import { rm } from '../lib/data';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { gradeColor } from '../components/charts';

export default function How() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { isPremium } = useSub();
  const [sheet, setSheet] = useState<Billing | null>(null);
  const icons = ['cash', 'pulse', 'swap-vertical', 'calendar', 'analytics', 'lock-closed'] as const;
  const pct = (sc: number) => { const v = Math.round(adjustment(sc) * 1000) / 10; return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`; };
  const effect = (i: number) => `${pct(i === 0 ? 100 : GRADES[i - 1].min - 1)} → ${pct(GRADES[i].min)}`;
  return (
    <Screen>
      <ScreenHeader title={t('how.h1')} subtitle={t('how.sub')} />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <Row gap={14} align="flex-start">
            <Tile icon={icons[i - 1]} />
            <View style={{ flex: 1 }}><Txt v="h3">{t(`how.r${i}.h`)}</Txt><Txt v="small" color={c.mute} style={{ marginTop: 3 }}>{t(`how.r${i}.p`)}</Txt></View>
          </Row>
        </Card>
      ))}
      <Txt v="h3" style={{ marginTop: 18, marginBottom: 10 }}>{t('rate.bands')}</Txt>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        {GRADES.map((g, i) => (
          <Row key={g.g} gap={12} style={{ padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            <Txt v="h2" color={gradeColor(g.g, c.ok, c.gold, c.bad)} style={{ width: 40 }}>{g.g}</Txt>
            <View style={{ flex: 1 }}><Txt w="600">{t(`grade.${g.g}`)}</Txt><Txt v="caption" color={c.mute}>≥ {g.min}</Txt></View>
            <Txt v="small" w="700">{effect(i)}</Txt>
          </Row>
        ))}
      </Card>
      <Card tone="gold" style={{ marginTop: 14 }}><Txt v="h3">{t('how.sum.h')}</Txt><Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t('how.sum.p')}</Txt><Txt v="h3" style={{ marginTop: 12 }}>{t('how.never.h')}</Txt><Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t('how.never.p')}</Txt></Card>
      <Txt v="h3" style={{ marginTop: 22, marginBottom: 4 }}>{t('pp.base.h')}</Txt>
      <Txt v="small" color={c.mute} style={{ marginBottom: 10 }}>{t('pp.base.p')}</Txt>
      {([['pp.base.ind', rm(CONFIG.base.individual, 0), 'A'], ['pp.base.fam', rm(CONFIG.base.family, 0), 'C'], ['pp.base.biz', t('pp.base.custom'), 'business']] as const).map(([k, v, plan]) => (
        <Card key={k} pad={14} style={{ marginBottom: 8 }}><Row style={{ justifyContent: 'space-between' }} gap={10}><Txt v="small" style={{ flex: 1 }}>{t(k)}</Txt><Txt v="h3" color={c.accent}>{v}</Txt></Row>
          <Gap h={12} /><Button title={t('plan.quote')} variant="ghost" small onPress={() => router.push({ pathname: '/plan-result', params: { plan } })} /></Card>
      ))}
      <Txt v="h3" style={{ marginTop: 22, marginBottom: 4 }}>{t('pp.h')}</Txt>
      <Txt v="small" color={c.mute} style={{ marginBottom: 10 }}>{t('pp.sub')}</Txt>
      {(['yearly', 'monthly'] as Billing[]).map((b) => (
        <Card key={b} pad={18} style={{ marginBottom: 12, ...(b === 'yearly' ? { borderColor: c.gold, borderWidth: 1.5, shadowColor: c.red, shadowOpacity: 0.3, shadowRadius: 16, elevation: 3 } : {}) }}>
          {b === 'yearly' ? <Row gap={8} wrap style={{ marginBottom: 8 }}><Badge label={t('sb.save')} tone="ok" /><Badge label={t('sb.best')} tone="gold" /></Row> : null}
          <Txt v="h3">{t(b === 'yearly' ? 'sb.yearly' : 'sb.monthly')}</Txt>
          <Row gap={8} wrap align="flex-end" style={{ marginTop: 6 }}>
            <Txt v="display" style={{ fontSize: 30, lineHeight: 34 }}>{b === 'yearly' ? rm(SUB.yearly, 0) : rm(SUB.monthly)}</Txt><Txt color={c.mute} w="600">/{t(b === 'yearly' ? 'sb.yr' : 'sb.mo')}</Txt>
            {b === 'yearly' ? <Txt color={c.mute} style={{ textDecorationLine: 'line-through' }}>{rm(SUB.monthlyTotal)}/{t('sb.yr')}</Txt> : null}
          </Row>
          <Txt v="small" color={c.mute} style={{ marginTop: 6 }}>{t(b === 'yearly' ? 'sb.eff' : 'sb.hint')}</Txt>
          <View style={{ marginVertical: 12, gap: 6 }}>{['sb.f1', 'sb.f2', 'sb.f3', 'sb.f4'].map((k) => <Row key={k} gap={8} align="flex-start"><Icon name="checkmark-circle" size={18} color={c.ok} /><Txt v="small" style={{ flex: 1 }}>{t(k)}</Txt></Row>)}</View>
          {isPremium ? <Button title={t('sb.mg.h')} variant="ghost" onPress={() => router.push('/subscription')} /> : <Button title={`${t('pp.sub.btn')} - ${priceLabel(b, t)}`} variant={b === 'yearly' ? 'primary' : 'ghost'} onPress={() => setSheet(b)} />}
        </Card>
      ))}
      <Txt v="caption" color={c.mute}>{t('pp.cancel')}</Txt>
      <SubscribeSheet visible={sheet !== null} billing={sheet ?? 'yearly'} onBilling={setSheet} onClose={() => setSheet(null)} />
      <Gap h={18} /><Button title={t('how.try')} icon="calculator" onPress={() => router.push('/calculator')} />
    </Screen>
  );
}
