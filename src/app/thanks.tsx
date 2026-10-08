import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Gap, Icon, NumDot, Row, Screen, Txt, success } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

/** Dedicated thank-you page after a call back, contact message or business enquiry (same as the website). */
export default function Thanks() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme();
  const { kind = 'cb', email = '', ref = '' } = useLocalSearchParams<{ kind?: string; email?: string; ref?: string }>();
  const k = ['cb', 'ct', 'sme'].includes(kind) ? kind : 'cb';
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => { success(); Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 14 }).start(); }, [pop]);
  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingTop: 48 }}>
        <Animated.View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.ok, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pop }], shadowColor: c.ok, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
          <Icon name="checkmark" size={56} color="#fff" />
        </Animated.View>
        <Txt v="h1" align="center" style={{ marginTop: 26 }}>{t(`ty.h.${k}`)}</Txt>
        {email ? (
          <Card tone="gold" style={{ marginTop: 20, alignItems: 'center', width: '100%' }}>
            <Txt align="center">{t('ty.sent')}</Txt>
            <Txt v="h3" align="center" style={{ marginTop: 4 }} selectable>{email}</Txt>
            <Txt v="caption" color={c.mute} align="center" style={{ marginTop: 6 }}>{t('ty.spam')}</Txt>
          </Card>
        ) : null}
        {ref ? <Txt color={c.mute} style={{ marginTop: 12 }}>{t('ty.ref')}: <Txt w="700">{ref}</Txt></Txt> : null}
      </View>
      <Card style={{ marginTop: 26 }}>
        <Txt v="h3" style={{ marginBottom: 10 }}>{t('ty.next')}</Txt>
        {[1, 2, 3].map((i) => (
          <Row key={i} gap={12} align="flex-start" style={{ marginBottom: 12 }}>
            <NumDot n={i} />
            <Txt style={{ flex: 1 }}>{t(`ty.${k}.${i}`)}</Txt>
          </Row>
        ))}
      </Card>
      <Gap h={22} />
      <Button title={t('ty.home')} onPress={() => router.replace('/(tabs)')} />
      <Gap h={10} />
      <Button title={t('ty.explore')} variant="ghost" onPress={() => router.replace('/(tabs)/plans')} />
    </Screen>
  );
}
