import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Card, CardGrid, Row, Screen, ScreenHeader, SectionTitle, Skeleton, Txt } from '../components/ui';
import { api } from '../lib/api';
import { fmt } from '../lib/data';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

interface Fin { revenue: number; totalCost: number; profit: number; breakevenPolicies: number; fixedAnnual: number; contributionMargin: number }

export default function Investors() {
  const { t } = useI18n(); const { c } = useTheme(); const [f, setF] = useState<Fin | null>(null); const [err, setErr] = useState(false);
  useEffect(() => { api<Fin>('/financials').then(setF).catch(() => setErr(true)); }, []);
  const market = [['USD 41.2m', 'inv.m1'], ['USD 556.0m', 'inv.m2'], ['32.5%', 'inv.m3'], ['30,000 / 3m+', 'inv.m4']];
  return (
    <Screen>
      <ScreenHeader title={t('inv.h1')} subtitle={t('inv.sub')} />
      <SectionTitle>{t('inv.market')}</SectionTitle>
      <CardGrid cols={2}>{market.map(([v, k]) => <Card key={k} pad={14}><Txt v="h2" color={c.accent}>{v}</Txt><Txt v="caption" color={c.mute} style={{ marginTop: 2 }}>{t(k)}</Txt></Card>)}</CardGrid>
      <SectionTitle>{t('inv.seg')}</SectionTitle>
      <Card><Txt>{t('inv.seg1')}</Txt><Txt style={{ marginTop: 10 }}>{t('inv.seg2')}</Txt></Card>
      <SectionTitle>{t('inv.model')}</SectionTitle>
      <Card><Txt>{t('inv.model.p')}</Txt></Card>
      <SectionTitle>{t('inv.fin')}</SectionTitle>
      {f ? (
        <Card>
          {([['inv.rev', f.revenue], ['inv.fixed', f.fixedAnnual], ['inv.cost', f.totalCost], ['inv.profit', f.profit], ['inv.cm', f.contributionMargin], ['inv.be', f.breakevenPolicies]] as const).map(([k, v], i) => (
            <Row key={k} style={{ justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Txt style={{ flex: 1 }}>{t(k)}</Txt><Txt w="700" color={v < 0 ? c.bad : c.ink}>{k === 'inv.be' ? fmt(v, 0) : `RM ${fmt(v, k === 'inv.cm' ? 2 : 0)}`}</Txt>
            </Row>
          ))}
          <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('inv.be.p')}</Txt>
        </Card>
      ) : err ? <Txt color={c.mute}>{t('app.err.network')}</Txt> : <View><Skeleton h={150} r={18} /></View>}
      <SectionTitle>{t('inv.risks')}</SectionTitle>
      {[1, 2, 3].map((i) => <Card key={i} style={{ marginBottom: 10 }}><Txt>{t(`inv.risk${i}`)}</Txt></Card>)}
      <Txt v="caption" color={c.mute} style={{ marginTop: 6 }}>{t('inv.sub')}</Txt>
    </Screen>
  );
}
