import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, Button, Card, Gap, Row, Screen, ScreenHeader, Skeleton, Txt } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

interface Campaign { id: string; kind: 'insurer' | 'brand' | 'watch'; days: number; target: number; joined: boolean; progress: number; completed: boolean; ended: boolean }
const KIND: Record<string, string> = { insurer: 'cm.insurer', brand: 'cm.brand', watch: 'cm.watch' };

/** Opt-in challenges: insurer-sponsored step challenge, brand promotions, and the smartwatch partner offer. */
export default function CampaignsScreen() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { user } = useAuth();
  const [list, setList] = useState<Campaign[] | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => { try { setList(await api<Campaign[]>('/campaigns')); } catch { /* keep previous */ } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load, user?.id]));
  const act = async (path: string, id: string) => {
    setBusy(id);
    try { const r = await api<{ campaigns: Campaign[] }>(path, { id }); setList(r.campaigns); } catch { /* ignore */ } finally { setBusy(null); }
  };
  return (
    <Screen onRefresh={load}>
      <ScreenHeader title={t('cm.h1')} subtitle={t('cm.sub')} />
      {!list ? <Skeleton h={160} r={20} /> : list.map((cm) => (
        <Card key={cm.id} style={{ marginBottom: 12 }}>
          <Badge label={t(KIND[cm.kind])} tone="red" />
          <Txt v="h3" style={{ marginTop: 10 }}>{t(`cm.${cm.id}.h`)}</Txt>
          <Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t(`cm.${cm.id}.p`)}</Txt>
          {cm.joined && cm.target ? (
            <View style={{ marginTop: 12 }}>
              <Txt v="caption" color={c.mute}>{cm.progress} / {cm.target} {t('cm.progress')}</Txt>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: c.line, marginTop: 6, overflow: 'hidden' }}><View style={{ height: 8, width: `${Math.max(4, (cm.progress / cm.target) * 100)}%`, backgroundColor: c.red }} /></View>
            </View>
          ) : null}
          <Gap h={14} />
          {cm.kind === 'watch' ? <Badge label={t('cm.soon')} tone="mute" />
            : !user ? <Button title={t('cm.login')} small onPress={() => router.push('/login')} />
            : cm.completed ? <Badge label={`✓ ${t('cm.done')}`} tone="ok" />
            : cm.joined ? <Row gap={10}><Badge label={t('cm.joined')} tone="ok" /><Button title={t('cm.leave')} variant="ghost" small full={false} loading={busy === cm.id} onPress={() => act('/campaigns/leave', cm.id)} /></Row>
            : <Button title={t('cm.join')} small loading={busy === cm.id} onPress={() => act('/campaigns/join', cm.id)} />}
        </Card>
      ))}
      <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('cm.privacy')}</Txt>
      <Txt v="caption" color={c.mute} style={{ marginTop: 4 }}>{t('rw.demo')}</Txt>
    </Screen>
  );
}
