import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Chip, ErrorBox, Field, Gap, Hero, Icon, Notice, Row, Screen, SectionTitle, Sheet, Tile, Txt, success } from '../../components/ui';
import { IMG, LangButton } from '../../components/common';
import { StatsSummary } from '../../components/summary';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { PROVIDERS, useDash } from '../../lib/data';
import { errorText } from '../../lib/errors';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../lib/overlays';
import { useTheme } from '../../lib/theme';
import type { Quote } from '../../lib/pricing';

const ICON: Record<string, React.ComponentProps<typeof Icon>['name']> = { healthconnect: 'logo-google', fitbit: 'watch', garmin: 'navigate-circle', whoop: 'fitness' };
const REASONS = ['illness', 'injury', 'travel', 'pregnancy', 'other'] as const;

export default function WearableTab() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { user } = useAuth(); const { dash, refresh, loading } = useDash(); const toast = useToast();
  const [ask, setAsk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ provider: string; days: number; quote: Quote } | null>(null);
  const [discon, setDiscon] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false); const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [days, setDays] = useState('14'); const [reason, setReason] = useState<typeof REASONS[number]>('illness'); const [pm, setPm] = useState<{ ok: boolean; text: string } | null>(null);
  const conn = new Set((dash?.connections ?? []).map((x) => x.provider));

  const startConnect = (p: string) => { if (!user) { router.push('/login'); return; } setErr(null); setAsk(p); };
  const doConnect = async () => {
    if (!ask) return; setBusy(true); setErr(null);
    try {
      const r = await api<{ provider: string; days: number; quote: Quote }>('/connect', { provider: ask, consent: true });
      success(); setAsk(null); setDone(r); await refresh();
    } catch (e) { setErr(errorText(e, t)); } finally { setBusy(false); }
  };
  const doDisconnect = async () => {
    if (!discon) return; setBusy(true);
    try { await api('/disconnect', { provider: discon }); setDiscon(null); setDone(null); await refresh(); toast(t('connect.disc')); }
    catch (e) { setErr(errorText(e, t)); } finally { setBusy(false); }
  };
  const sync = async () => {
    setSyncing(true); setSyncMsg(null);
    try { await api('/sync', {}); await refresh(); setSyncMsg({ ok: true, text: t('dash.synced') }); success(); }
    catch (e) { setSyncMsg({ ok: false, text: errorText(e, t) }); } finally { setSyncing(false); }
  };
  const pause = async () => {
    const n = parseInt(days, 10);
    if (!(n >= 1 && n <= 60)) { setPm({ ok: false, text: t('dash.pause.days') }); return; }
    try { await api('/pause', { days: n, reason }); await refresh(); setPm({ ok: true, text: t('dash.synced') }); }
    catch (e) { setPm({ ok: false, text: errorText(e, t) }); }
  };

  return (
    <Screen refreshing={loading} onRefresh={user ? refresh : undefined} bottomPad={130}>
      <Row style={{ justifyContent: 'space-between', paddingTop: 10, paddingBottom: 10 }}><View style={{ flex: 1 }}><Txt v="h1" fit>{t('connect.h1')}</Txt></View><LangButton /></Row>
      <Hero source={IMG.wrist} height={170}><Txt color="#fff" w="600">{t('connect.sub')}</Txt></Hero>

      <SectionTitle>{t('connect.dev.h')}</SectionTitle>
      {Object.entries(PROVIDERS).map(([id, name]) => {
        const on = conn.has(id);
        return (
          <Card key={id} style={{ marginBottom: 10 }} pad={14}>
            <Row gap={14}>
              <Tile icon={ICON[id]} tone={on ? 'ok' : 'red'} />
              <View style={{ flex: 1 }}>
                <Txt v="h3" numberOfLines={2}>{name}</Txt>
                <Txt v="caption" color={on ? c.ok : c.mute} w={on ? '700' : '500'}>{on ? t('connect.connected') : t('app.notconnected')}</Txt>
              </View>
            </Row>
            <Gap h={12} />
            {on ? <Button title={t('connect.disc')} variant="danger" small onPress={() => setDiscon(id)} /> : <Button title={t('connect.cta')} small onPress={() => startConnect(id)} />}
          </Card>
        );
      })}
      <Card tone="gold" style={{ marginTop: 6 }} pad={14}><Row gap={10} align="flex-start"><Icon name="information-circle" size={22} color={c.gold} /><Txt v="small" style={{ flex: 1 }}>{t('connect.hc')}</Txt></Row></Card>
      <Txt v="caption" color={c.mute} style={{ marginTop: 12 }}>{t('connect.demo')}</Txt>

      {user && dash && conn.size > 0 ? (
        <>
          <SectionTitle>{t('dash.rating')}</SectionTitle>
          {done ? <Notice text={`${t('connect.done')} ${done.days}`} /> : null}
          <Gap h={done ? 12 : 0} />
          <StatsSummary dash={dash} />
          {!dash.policy ? <><Gap h={14} /><Button title={t('nav.apply')} icon="shield-checkmark" onPress={() => router.push('/apply')} /></> : null}
        </>
      ) : null}

      {user && dash?.policy ? (
        <>
          <SectionTitle>{t('dash.refresh')}</SectionTitle>
          <Card>
            <Txt v="small" color={c.mute}>{t('dash.summ.note')}</Txt>
            <Gap h={12} />
            <Button title={t('dash.sync')} icon="sync" loading={syncing} onPress={sync} disabled={conn.size === 0} />
            {syncMsg ? (syncMsg.ok ? <Notice text={syncMsg.text} /> : <ErrorBox text={syncMsg.text} />) : null}
          </Card>

          <SectionTitle>{t('dash.pause.h')}</SectionTitle>
          <Card>
            <Txt v="small" color={c.mute}>{t('dash.pause.p')}</Txt>
            {dash.paused ? <Notice tone="info" text={`${t('dash.paused')} ${dash.paused}`} /> : null}
            <Field label={t('dash.pause.days')} value={days} onChangeText={(v) => setDays(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
            <Row wrap gap={8} style={{ marginTop: 12 }}>{REASONS.map((r) => <Chip key={r} label={t(`app.reason.${r}`)} on={reason === r} onPress={() => setReason(r)} />)}</Row>
            <Gap h={14} />
            <Button title={t('dash.pause.btn')} variant="ghost" icon="pause" onPress={pause} />
            {pm ? (pm.ok ? <Notice text={pm.text} /> : <ErrorBox text={pm.text} />) : null}
          </Card>
        </>
      ) : null}

      <SectionTitle>{`${t('connect.allow.h')} / ${t('connect.never.h')}`}</SectionTitle>
      <Card>
        <Txt v="h3">{t('connect.allow.h')}</Txt>
        {['a1', 'a2', 'a3', 'a4'].map((k) => <Row key={k} gap={10} style={{ marginTop: 8 }}><Icon name="checkmark-circle" size={20} color={c.ok} /><Txt>{t(`connect.${k}`)}</Txt></Row>)}
        <View style={{ height: 1, backgroundColor: c.line, marginVertical: 14 }} />
        <Txt v="h3">{t('connect.never.h')}</Txt>
        {['n1', 'n2', 'n3'].map((k) => <Row key={k} gap={10} style={{ marginTop: 8 }}><Icon name="close-circle" size={20} color={c.bad} /><Txt>{t(`connect.${k}`)}</Txt></Row>)}
      </Card>

      {/* consent sheet */}
      <Sheet visible={!!ask} onClose={() => !busy && setAsk(null)} title={t('connect.modal.h')}>
        <Txt color={c.mute}>{t('connect.modal.p')}</Txt>
        <View style={{ height: 1, backgroundColor: c.line, marginVertical: 14 }} />
        {['a1', 'a2', 'a3', 'a4'].map((k) => <Row key={k} gap={10} style={{ marginBottom: 8 }}><Icon name="checkmark-circle" size={20} color={c.ok} /><Txt>{t(`connect.${k}`)}</Txt></Row>)}
        <ErrorBox text={err} />
        <Gap h={16} />
        <Button title={t('connect.allow')} icon="lock-open" loading={busy} onPress={doConnect} />
        <Gap h={10} />
        <Button title={t('connect.cancel')} variant="ghost" disabled={busy} onPress={() => setAsk(null)} />
      </Sheet>
      {/* disconnect sheet */}
      <Sheet visible={!!discon} onClose={() => setDiscon(null)} title={t('connect.disc')}>
        <Txt color={c.mute}>{discon ? PROVIDERS[discon] : ''}</Txt>
        <Gap h={16} />
        <Button title={t('connect.disc')} variant="danger" loading={busy} onPress={doDisconnect} />
        <Gap h={10} />
        <Button title={t('connect.cancel')} variant="ghost" onPress={() => setDiscon(null)} />
      </Sheet>
    </Screen>
  );
}
