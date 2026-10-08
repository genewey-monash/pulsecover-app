import React from 'react';
import { View } from 'react-native';
import { Card, NumDot, Row, Screen, ScreenHeader, Txt } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

export default function Privacy() {
  const { t } = useI18n(); const { c } = useTheme();
  return (
    <Screen>
      <ScreenHeader title={t('prv.h1')} subtitle={t('prv.sub')} />
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} style={{ marginBottom: 12 }}>
          <Row gap={12} align="flex-start">
            <NumDot n={i} />
            <View style={{ flex: 1 }}><Txt v="h3">{t(`prv.${i}h`)}</Txt><Txt color={c.mute} style={{ marginTop: 4 }}>{t(`prv.${i}p`)}</Txt></View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
