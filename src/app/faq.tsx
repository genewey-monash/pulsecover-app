import React, { useState } from 'react';
import { LayoutAnimation } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card, Icon, Row, Screen, ScreenHeader, Txt, tap } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

export default function Faq() {
  const { t } = useI18n(); const { c } = useTheme(); const { open: o } = useLocalSearchParams<{ open?: string }>();
  const [open, setOpen] = useState<number | null>(o ? Number(o) : null);
  return (
    <Screen>
      <ScreenHeader title={t('faq.h1')} />
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <Card key={i} style={{ marginBottom: 10 }} pad={16} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen(open === i ? null : i); tap(); }}>
          <Row gap={12} style={{ justifyContent: 'space-between' }}><Txt v="h3" style={{ flex: 1 }}>{t(`faq.q${i}`)}</Txt><Icon name={open === i ? 'remove-circle' : 'add-circle'} size={24} color={c.accent} /></Row>
          {open === i ? <Txt color={c.mute} style={{ marginTop: 10 }}>{t(`faq.a${i}`)}</Txt> : null}
        </Card>
      ))}
    </Screen>
  );
}
