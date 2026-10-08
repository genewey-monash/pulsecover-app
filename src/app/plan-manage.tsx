import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, CardGrid, ErrorBox, Field, Gap, Notice, Row, Screen, ScreenHeader, Skeleton, Txt, success, tap } from '../components/ui';
import { api } from '../lib/api';
import { rm, useDash } from '../lib/data';
import { errorText } from '../lib/errors';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

interface Prev { id: string; cover: number; base: number; premium: number }

export default function PlanManage() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { dash, refresh } = useDash();
  const pol = dash?.policy;
  const [prev, setPrev] = useState<Prev[]>([]); const [plan, setPlan] = useState(pol?.plan ?? 'A'); const [ben, setBen] = useState(pol?.beneficiary ?? '');
  const [err, setErr] = useState<string | null>(null); const [bErr, setBErr] = useState<string | null>(null); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (pol) { setPlan(pol.plan); setBen(pol.beneficiary ?? ''); api<Prev[]>('/policy/preview', {}).then(setPrev).catch((e) => setErr(errorText(e, t))); } }, [pol?.id, pol?.plan]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!dash) return <Screen><ScreenHeader title={t('pf.plan.h')} /><Skeleton h={160} r={20} /></Screen>;
  if (!pol) return (
    <Screen><ScreenHeader title={t('pf.plan.h')} /><Card tone="gold"><Txt v="h3">{t('pf.plan.none')}</Txt><Gap h={14} /><Button title={t('nav.apply')} icon="shield-checkmark" onPress={() => router.replace('/apply')} /></Card></Screen>
  );
  const save = async () => {
    setErr(null); setOk(false);
    if (ben.trim().length < 2) { setBErr(t('common.required')); return; }
    setBusy(true);
    try { await api('/policy', { plan, beneficiary: ben.trim() }); await refresh(); setOk(true); success(); } catch (e) { setErr(errorText(e, t)); } finally { setBusy(false); }
  };
  return (
    <Screen keyboard>
      <ScreenHeader title={t('pf.plan.h')} />
      <Card tone="red">
        <Row style={{ justifyContent: 'space-between' }}><Txt v="h2">{t('plan.word')} {pol.plan}</Txt><Badge label={t('app.status.active')} tone="ok" /></Row>
        <View style={{ marginTop: 14 }}><CardGrid cols={2}>
          {([['pf.policyno', pol.number], ['pf.cover', rm(pol.cover, 0)], ['pf.prem', `${rm(pol.premium)}${t('common.year')}`], ['pf.renew', pol.renewal_date]] as const).map(([k, v]) => (
            <View key={k} style={{ backgroundColor: c.surface, borderRadius: 12, padding: 12 }}><Txt v="caption" color={c.mute}>{t(k)}</Txt><Txt v="label">{v}</Txt></View>
          ))}
        </CardGrid></View>
      </Card>
      <Txt v="h3" style={{ marginTop: 22, marginBottom: 10 }}>{t('pf.choose')}</Txt>
      <CardGrid cols={2}>
        {(prev.length ? prev : ['A', 'B', 'C', 'D'].map((id) => ({ id, cover: 0, base: 0, premium: 0 }))).map((p) => {
          const on = plan === p.id;
          return (
            <Pressable key={p.id} onPress={() => { tap(); setPlan(p.id); setOk(false); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ borderRadius: 16, borderWidth: 2, borderColor: on ? c.red : c.line, backgroundColor: on ? c.redT : c.surface, padding: 14 }}>
              <Row style={{ justifyContent: 'space-between' }}><Txt v="h3">{t('plan.word')} {p.id}</Txt>{pol.plan === p.id ? <Badge label={t('pf.current')} tone="gold" /> : null}</Row>
              {p.premium ? <Txt v="h3" color={c.accent} style={{ marginTop: 6 }}>{rm(p.premium, 0)}<Txt v="small" color={c.mute}>{t('common.year')}</Txt></Txt> : <Skeleton h={18} w={80} style={{ marginTop: 8 }} />}
              {p.cover ? <Txt v="caption" color={c.mute}>{t('pf.cover')} {rm(p.cover, 0)}</Txt> : null}
            </Pressable>
          );
        })}
      </CardGrid>
      <Field label={t('pf.ben')} value={ben} onChangeText={(v) => { setBen(v); setBErr(null); setOk(false); }} error={bErr} left="person-outline" maxLength={100} />
      <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('pf.plan.note')}</Txt>
      <ErrorBox text={err} />
      {ok ? <Notice text={t('pf.plan.done')} /> : null}
      <Gap h={20} />
      <Button title={t('pf.plan.save')} icon="save" loading={busy} onPress={save} />
    </Screen>
  );
}
