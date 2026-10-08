import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Gap, Row, Screen, ScreenHeader, Tile, Txt } from '../components/ui';
import { GRADES, adjustment } from '../lib/pricing';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { gradeColor } from '../components/charts';

export default function How() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme();
  const icons = ['cash', 'pulse', 'swap-vertical', 'calendar', 'pause-circle', 'lock-closed'] as const;
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
      <Gap h={18} /><Button title={t('how.try')} icon="calculator" onPress={() => router.push('/calculator')} />
    </Screen>
  );
}
