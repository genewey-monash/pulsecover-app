import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, Button, Card, CardGrid, Gap, Icon, Row, Screen, ScreenHeader, Skeleton, Txt, tap } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/overlays';
import { useTheme } from '../lib/theme';

interface Rewards {
  streak: number; best: number; activeDays: number; level: string;
  next: { id: string; min: number; left: number } | null;
  coupons: { id: string; min: number; unlocked: boolean; code: string | null }[];
  achievements: { id: string; done: boolean }[];
}
const COUPON_ICON: Record<string, React.ComponentProps<typeof Icon>['name']> = { pharm: 'medkit', cafe: 'cafe', super: 'cart', gym: 'barbell' };

function Bar({ value, max }: { value: number; max: number }) {
  const { c } = useTheme();
  return <View style={{ height: 8, borderRadius: 4, backgroundColor: c.line, marginTop: 10, overflow: 'hidden' }}><View style={{ height: 8, width: `${Math.max(4, Math.min(100, (value / max) * 100))}%`, backgroundColor: c.red }} /></View>;
}

/** Gamified progress: streak, level, achievements and anonymous coupons that unlock at streak milestones. */
export default function RewardsScreen() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { user } = useAuth(); const toast = useToast();
  const [r, setR] = useState<Rewards | null>(null);
  const load = useCallback(async () => { try { setR(await api<Rewards>('/rewards')); } catch { /* keep previous */ } }, []);
  useFocusEffect(useCallback(() => { if (user) load(); }, [user, load]));
  return (
    <Screen onRefresh={user ? load : undefined}>
      <ScreenHeader title={t('rw.h1')} subtitle={t('rw.sub')} />
      {!user ? (
        <Card><Txt v="h3">{t('rw.login')}</Txt><Gap h={14} /><Button title={t('nav.login')} onPress={() => router.push('/login')} /><Gap h={10} /><Button title={t('nav.connect')} variant="ghost" onPress={() => router.navigate('/(tabs)/wearable')} /></Card>
      ) : !r ? <Skeleton h={160} r={20} /> : (
        <>
          <CardGrid cols={2} gap={12}>
            <Card pad={16}><Icon name="flame" size={22} color={c.accent} /><Txt v="h1" color={c.accent} style={{ marginTop: 4 }}>{r.streak}</Txt><Txt v="caption" color={c.mute}>{t('rw.streak')} · {t('rw.days')}</Txt></Card>
            <Card pad={16}><Icon name="trophy" size={22} color={c.gold} /><Txt v="h1" style={{ marginTop: 4 }}>{r.best}</Txt><Txt v="caption" color={c.mute}>{t('rw.best')} · {t('rw.days')}</Txt></Card>
          </CardGrid>
          <Card pad={16} style={{ marginTop: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}><Txt v="label" color={c.mute}>{t('rw.level')}</Txt><Badge label={t(`lv.${r.level}`)} tone="gold" /></Row>
            {r.next ? (<><Txt style={{ marginTop: 10 }} w="700">{t('rw.next')}: {t(`cp.${r.next.id}.h`)} · {r.next.left} {t('rw.left')}</Txt><Bar value={r.best} max={r.next.min} /></>) : <Txt style={{ marginTop: 10 }} w="700">✓ {t('rw.unlocked')}</Txt>}
          </Card>
          <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('rw.rule')}</Txt>

          <Txt v="h3" style={{ marginTop: 22, marginBottom: 10 }}>{t('rw.coupons')}</Txt>
          {r.coupons.map((cp) => (
            <Card key={cp.id} pad={14} style={{ marginBottom: 10, opacity: cp.unlocked ? 1 : 0.8 }}>
              <Row gap={12} align="flex-start">
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: c.redT, alignItems: 'center', justifyContent: 'center' }}><Icon name={COUPON_ICON[cp.id]} size={22} color={c.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Txt w="800">{t(`cp.${cp.id}.h`)}</Txt>
                  <Txt v="small" color={c.mute}>{t(`cp.${cp.id}.p`)}</Txt>
                </View>
                <Badge label={cp.unlocked ? t('rw.unlocked') : `${cp.min} ${t('rw.days')}`} tone={cp.unlocked ? 'ok' : 'mute'} />
              </Row>
              {cp.unlocked && cp.code ? (
                <Row gap={10} style={{ marginTop: 12, justifyContent: 'space-between' }}>
                  <View><Txt v="caption" color={c.mute}>{t('rw.code')}</Txt><Txt w="800" color={c.accent} style={{ letterSpacing: 1 }}>{cp.code}</Txt></View>
                  <Button title={t('rw.copy')} variant="soft" small full={false} onPress={async () => { tap(); await Clipboard.setStringAsync(cp.code!); toast(t('rw.copied')); }} />
                </Row>
              ) : (<><Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('rw.locked')} {cp.min} {t('rw.days')}</Txt><Bar value={r.best} max={cp.min} /></>)}
            </Card>
          ))}

          <Txt v="h3" style={{ marginTop: 14, marginBottom: 10 }}>{t('rw.ach')}</Txt>
          <Row wrap gap={8}>
            {r.achievements.map((a) => <Badge key={a.id} label={`${a.done ? '✓ ' : ''}${t(`ach.${a.id}`)}`} tone={a.done ? 'solid' : 'mute'} />)}
          </Row>
          <Txt v="caption" color={c.mute} style={{ marginTop: 18 }}>{t('rw.note')}</Txt>
          <Txt v="caption" color={c.mute} style={{ marginTop: 4 }}>{t('rw.demo')}</Txt>
        </>
      )}
    </Screen>
  );
}
