import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Gap, Screen, ScreenHeader, Txt, Row, useLayout } from '../components/ui';
import { rm } from '../lib/data';
import { useI18n } from '../lib/i18n';
import { PLANS } from '../lib/pricing';
import { useCompare } from '../lib/compare';
import { useTheme } from '../lib/theme';

const covs = (id: string) => 'ABCDEF'.slice(0, ({ A: 3, B: 4, C: 5, D: 6 } as Record<string, number>)[id] || 3).split('');

export default function Compare() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const cmp = useCompare(); const { width } = useLayout();
  const ids = cmp.selected.length >= 2 ? cmp.selected : ['A', 'B', 'C', 'D'];
  const plans = ids.map((id) => PLANS[id as keyof typeof PLANS]);
  const rows: [string, (p: typeof plans[number]) => string][] = [
    ['cmpt.price', (p) => rm(p.base, 0)], ['cmpt.best', (p) => rm(p.base * 0.85, 0)], ['cmpt.worst', (p) => rm(p.base * 1.15, 0)], ['cmpt.cover', (p) => rm(p.cover, 0)],
    ['cmpt.type', (p) => t(`type.${p.type}`)], ['cmpt.cov', (p) => covs(p.id).map((k) => `• ${t(`cov.${k}`)}`).join('\n')],
  ];
  const labelW = 112, colW = Math.max(112, Math.floor((Math.min(width, 760) - 36 - labelW) / 2.3)); // third column peeks in so it is clear the table scrolls
  return (
    <Screen>
      <ScreenHeader title={t('cmpt.h')} subtitle={t('plans.note')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 18, overflow: 'hidden', backgroundColor: c.surface }}>
          <Row gap={0} align="stretch" style={{ backgroundColor: c.redT }}>
            <View style={{ width: labelW, padding: 12 }} />
            {plans.map((p) => <View key={p.id} style={{ width: colW, padding: 12 }}><Txt v="h3" color={c.accent}>{t('plan.word')} {p.id}</Txt></View>)}
          </Row>
          {rows.map(([k, f], i) => (
            <Row key={k} gap={0} align="stretch" style={{ borderTopWidth: 1, borderTopColor: c.line, backgroundColor: i % 2 ? c.bgAlt : c.surface }}>
              <View style={{ width: labelW, padding: 12 }}><Txt v="small" w="700" color={c.mute}>{t(k)}</Txt></View>
              {plans.map((p) => (
                <View key={p.id} style={{ width: colW, padding: 12 }}>
                  {k === 'cmpt.cov'
                    ? covs(p.id).map((kk) => <Txt key={kk} v="small" style={{ marginBottom: 10 }}>• {t(`cov.${kk}`)}</Txt>)
                    : <Txt v="small" w={i < 4 ? '700' : '400'}>{f(p)}</Txt>}
                </View>
              ))}
            </Row>
          ))}
          {/* each plan's own buttons sit under its column */}
          <Row gap={0} align="flex-start" style={{ borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.surface }}>
            <View style={{ width: labelW }} />
            {plans.map((p) => (
              <View key={p.id} style={{ width: colW, padding: 10, gap: 8 }}>
                <Button title={t('plan.quote')} variant="ghost" small onPress={() => router.push({ pathname: '/calculator', params: { plan: p.id } })} />
                <Button title={t('plan.apply')} small onPress={() => router.push({ pathname: '/apply', params: { plan: p.id } })} />
              </View>
            ))}
          </Row>
        </View>
      </ScrollView>
      {cmp.selected.length ? <><Gap h={10} /><Button title={t('cmpbar.clear')} variant="ghost" small onPress={() => { cmp.clear(); router.back(); }} /></> : null}
    </Screen>
  );
}
