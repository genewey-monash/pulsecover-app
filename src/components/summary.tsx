import React from 'react';
import { View } from 'react-native';
import { Badge, Card, CardGrid, Icon, Row, Txt, useLayout } from './ui';
import { LineChart, ScoreRing } from './charts';
import { Dashboard, rm } from '../lib/data';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

/** Rating ring, projected premium, weekly trend and latest-week stats. Used on Home and right after a wearable connects. */
export function StatsSummary({ dash }: { dash: Dashboard }) {
  const { t } = useI18n(); const { c } = useTheme(); const { width, cols } = useLayout();
  const weeks = (dash.weekly ?? []).slice(-8); const latest = dash.weekly?.[dash.weekly.length - 1];
  const chartW = Math.min(width, 760) - 36 - 36;
  return (
    <>
      <Card pad={20}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Txt v="label" color={c.mute}>{t('dash.rating')}</Txt>
            {dash.grade ? <Txt v="h2" style={{ marginTop: 4 }}>{t(`grade.${dash.grade}`)}</Txt> : <Txt v="small" color={c.mute} style={{ marginTop: 6 }}>{t('dash.nodata')}</Txt>}
            {dash.score30 != null ? (
              <>
                <Txt v="caption" color={c.mute} style={{ marginTop: 14 }}>{t('dash.projected')}</Txt>
                <Txt v="h1" color={c.accent}>{rm(dash.projected.annualPremium)}</Txt>
                <View style={{ marginTop: 6 }}><Badge label={`${dash.projected.adjustmentPct > 0 ? '+' : ''}${dash.projected.adjustmentPct}%`} tone={dash.projected.adjustmentPct <= 0 ? 'ok' : 'red'} /></View>
              </>
            ) : null}
          </View>
          <ScoreRing score={dash.score30} grade={dash.grade} size={width > 380 ? 132 : 112} label={t('dash.score30')} />
        </Row>
      </Card>
      {latest ? (
        <View style={{ marginTop: 14 }}>
          <CardGrid cols={cols > 1 ? 4 : 2}>
            {([['footsteps', 'dash.steps', latest.steps.toLocaleString()], ['barbell', 'dash.exercise', String(latest.exerciseMin)], ['moon', 'dash.sleep', String(latest.sleepHours)], ['heart', 'dash.hr', String(latest.restingHr)]] as const).map(([ic, k, v]) => (
              <Card key={k} pad={14}><Icon name={ic} size={20} color={c.accent} /><Txt v="h3" style={{ marginTop: 6 }}>{v}</Txt><Txt v="caption" color={c.mute}>{t(k)}</Txt></Card>
            ))}
          </CardGrid>
        </View>
      ) : null}
      {weeks.length ? (
        <Card style={{ marginTop: 14 }}>
          <Txt v="h3">{t('dash.weekly')}</Txt>
          <Txt v="caption" color={c.mute} style={{ marginBottom: 6 }}>{t('dash.trend8')}</Txt>
          <LineChart width={chartW} points={weeks.map((w) => ({ label: w.start.slice(5), value: w.score }))} />
        </Card>
      ) : null}
    </>
  );
}
