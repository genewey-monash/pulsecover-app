import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Gap, Icon, Row, Screen, ScreenHeader, Txt } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

const ROWS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'] as const;

/** Free vs Premium Quote: what is included at each level. */
export default function PremiumScreen() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme();
  const Mark = ({ yes }: { yes: boolean }) => yes
    ? <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.ok, alignItems: 'center', justifyContent: 'center' }}><Icon name="checkmark" size={16} color="#fff" /></View>
    : <Txt color={c.mute} style={{ fontSize: 20, lineHeight: 24 }}>–</Txt>;
  return (
    <Screen>
      <ScreenHeader title={t('pq.page.h')} subtitle={t('pq.page.sub')} />
      <Card tone="red" pad={18}>
        <Txt v="h3">{t('pq.h')}</Txt>
        <Txt v="small" color={c.mute} style={{ marginTop: 6 }}>{t('pq.p')}</Txt>
      </Card>
      <Gap h={14} />
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Row gap={0} style={{ backgroundColor: c.bgAlt, paddingVertical: 12, paddingHorizontal: 14 }}>
          <View style={{ flex: 1 }}><Txt v="caption" w="800" color={c.mute}>{t('pq.col.feature')}</Txt></View>
          <View style={{ width: 62, alignItems: 'center' }}><Txt v="caption" w="800">{t('pq.col.free')}</Txt></View>
          <View style={{ width: 86, alignItems: 'center', backgroundColor: c.red, borderRadius: 10, paddingVertical: 6 }}><Txt v="caption" w="800" color="#fff" align="center" numberOfLines={2}>{t('pq.col.premium')}</Txt></View>
        </Row>
        <Row gap={0} style={{ paddingVertical: 14, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: c.line }}>
          <View style={{ flex: 1 }}><Txt w="700">{t('pq.r.price')}</Txt></View>
          <View style={{ width: 62, alignItems: 'center' }}><Txt w="800">{t('pq.v.free')}</Txt></View>
          <View style={{ width: 86, alignItems: 'center' }}><Txt v="caption" w="800" color={c.accent} align="center">{t('pq.v.premium')}</Txt></View>
        </Row>
        {ROWS.map((r, i) => (
          <Row key={r} gap={0} style={{ paddingVertical: 14, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: i % 2 ? 'transparent' : c.bgAlt }}>
            <View style={{ flex: 1, paddingRight: 8 }}><Txt v="small" w="600">{t(`pq.${r}`)}</Txt></View>
            <View style={{ width: 62, alignItems: 'center' }}><Mark yes={i < 4} /></View>
            <View style={{ width: 86, alignItems: 'center' }}><Mark yes /></View>
          </Row>
        ))}
      </Card>
      <Gap h={18} />
      <Button title={t('pq.premium.cta')} icon="star" onPress={() => router.push('/calculator')} />
      <Gap h={10} />
      <Button title={t('pq.free.cta')} variant="ghost" onPress={() => router.navigate('/(tabs)/wearable')} />
      <Txt v="caption" color={c.mute} style={{ marginTop: 14 }}>{t('pq.note')}</Txt>
    </Screen>
  );
}
