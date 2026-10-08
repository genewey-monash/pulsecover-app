import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, Button, Card, EmptyState, Gap, Hero, Icon, Row, Screen, Skeleton, Txt, tap } from '../../components/ui';
import { IMG, LangButton } from '../../components/common';
import { api } from '../../lib/api';
import { Claim, rm, useDash } from '../../lib/data';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';

export const STEPS = ['received', 'review', 'approved', 'paid'];

export function ClaimCard({ claim }: { claim: Claim }) {
  const { t } = useI18n(); const { c } = useTheme(); const [open, setOpen] = useState(false);
  const idx = Math.max(0, STEPS.indexOf(claim.status));
  return (
    <Card style={{ marginBottom: 12 }} onPress={() => { tap(); setOpen((o) => !o); }}>
      <Row style={{ justifyContent: 'space-between' }} align="flex-start">
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Txt v="h3">{claim.number}</Txt>
          <Txt v="small" color={c.mute}>{t(`cl.t.${claim.type}`)} · {claim.incident_date}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}><Txt v="h3">{rm(claim.amount)}</Txt><Badge label={t(`cl.s.${claim.status}`)} tone={claim.status === 'paid' || claim.status === 'approved' ? 'ok' : 'gold'} /></View>
      </Row>
      <Row gap={6} style={{ marginTop: 14 }}>
        {STEPS.map((s, i) => <View key={s} style={{ flex: 1 }}><View style={{ height: 5, borderRadius: 3, backgroundColor: i <= idx ? c.ok : c.line }} /><Txt v="caption" color={i <= idx ? c.ink : c.mute} style={{ marginTop: 4, fontSize: 10.5 }} numberOfLines={1}>{t(`cl.s.${s}`)}</Txt></View>)}
      </Row>
      {open ? (
        <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 }}>
          <Txt v="small" color={c.mute}>{claim.description}</Txt>
          {claim.events.map((e, i) => (
            <Row key={i} gap={10} style={{ marginTop: 10 }} align="flex-start">
              <Icon name="ellipse" size={10} color={c.accent} style={{ marginTop: 6 }} />
              <View style={{ flex: 1 }}><Txt v="small" w="600">{t(`cl.s.${e.status}`)}</Txt><Txt v="caption" color={c.mute}>{e.created.slice(0, 16).replace('T', ' ')}</Txt></View>
            </Row>
          ))}
        </View>
      ) : null}
      <Row style={{ justifyContent: 'center', marginTop: 8 }}><Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.mute} /></Row>
    </Card>
  );
}

export default function ClaimsTab() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { user } = useAuth(); const { dash, loading, refresh, error } = useDash();
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const load = useCallback(async () => { try { setClaims(await api<Claim[]>('/claims')); } catch { /* keep previous list */ } }, []);
  useFocusEffect(useCallback(() => { if (user) { refresh(); load(); } }, [user, refresh, load]));
  return (
    <Screen refreshing={loading} onRefresh={user ? async () => { await refresh(); await load(); } : undefined} bottomPad={130}>
      <Row style={{ justifyContent: 'space-between', paddingTop: 10, paddingBottom: 8 }}><View style={{ flex: 1 }}><Txt v="h1" fit>{t('cl.h1')}</Txt></View><LangButton /></Row>
      <Txt color={c.mute} style={{ marginBottom: 14 }}>{t('cl.sub')}</Txt>
      <Hero source={IMG.claims} height={150} />
      <Gap h={18} />
      {!user ? (
        <Card><Txt v="h3">{t('apply.login.first')}</Txt><Gap h={14} /><Button title={t('nav.login')} onPress={() => router.push('/login')} /><Gap h={10} /><Button title={t('acc.register')} variant="ghost" onPress={() => router.push('/register')} /></Card>
      ) : !dash ? (
        error ? <EmptyState icon="cloud-offline" title={t('app.err.network')} action={t('app.retry')} onAction={refresh} /> : <Skeleton h={120} r={20} />
      ) : !dash.policy ? (
        <Card><Txt v="h3">{t('cl.need')}</Txt><Gap h={14} /><Button title={t('nav.apply')} icon="shield-checkmark" onPress={() => router.push('/apply')} /></Card>
      ) : (
        <>
          <Button title={t('dash.newclaim')} icon="add-circle" onPress={() => router.push('/claim-new')} />
          <Txt v="h3" style={{ marginTop: 24, marginBottom: 12 }}>{t('cl.track')}</Txt>
          {claims === null ? <Skeleton h={110} r={20} /> : claims.length === 0 ? <EmptyState icon="document-text" title={t('cl.none')} /> : claims.map((cl) => <ClaimCard key={cl.id} claim={cl} />)}
        </>
      )}
    </Screen>
  );
}
