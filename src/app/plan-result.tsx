import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, Card, Chip, Field, Gap, Icon, Row, Screen, ScreenHeader, Txt } from '../components/ui';
import { MetricBar, ScoreRing } from '../components/charts';
import { SampleTag } from '../components/partner';
import { SavingsCard, SubscribeCard } from '../components/subscription';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rm, useDash } from '../lib/data';
import { errorText } from '../lib/errors';
import { useI18n } from '../lib/i18n';
import { pqHandoff } from '../lib/pqLogic';
import { CONFIG, PLANS, quote, smeQuote, type Metrics, type PlanId } from '../lib/pricing';
import { useTheme } from '../lib/theme';

interface FamilyMember { id: number; email: string; relationship: string; status: string; display: string; expiresAt: string; canResendAt: string; error: string | null; label?: string; score?: number; grade?: string; adjustmentPct?: number; components?: { steps: number; exercise: number; sleep: number; heart: number }; annualPremium?: number; base?: number }
interface FamilyApi { max: number; used: number; remaining: number; members: FamilyMember[] }
interface Card1 { key: string; label: string; sample: boolean; score?: number; grade?: string; adj?: number; prem?: number; base?: number; comps?: { steps: number; exercise: number; sleep: number; heart: number }; m?: FamilyMember }
const SAMPLE_MEMBERS: [string, Metrics][] = [['fm.m1', { steps: 8200, exerciseMin: 130, sleepHours: 7.4, restingHr: 62 }], ['fm.m2', { steps: 6800, exerciseMin: 90, sleepHours: 7.0, restingHr: 68 }], ['fm.m3', { steps: 11000, exerciseMin: 200, sleepHours: 8.8, restingHr: 60 }], ['fm.m4', { steps: 4500, exerciseMin: 70, sleepHours: 7.2, restingHr: 72 }]];
const RELS = ['spouse', 'child', 'parent', 'other'] as const;

/** Plan result: the plan chosen on the Plans tab with a fixed, wearable-adjusted quote. Stands alone: it never reads or writes the Premium Calculator.
 *  Mirrors /plan-result on the website (Individual, Family with email invites, Business). */
export default function PlanResultScreen() {
  const router = useRouter(); const { t, lang } = useI18n(); const { c } = useTheme(); const { dash } = useDash(); const { user } = useAuth();
  const p = useLocalSearchParams<{ plan?: string }>();
  const raw = String(p.plan ?? 'A').toUpperCase(); const biz = raw === 'BUSINESS'; const id: PlanId = biz ? 'A' : ((PLANS as Record<string, unknown>)[raw] ? (raw as PlanId) : 'A');
  const plan = PLANS[id]; const fam = !biz && plan.type === 'family';
  const [heads, setHeads] = useState(25);

  // linked wearable (account or guest) when there is data, otherwise the SAMPLE values from the calculator's defaults
  const real = !!(dash && dash.weekly.length);
  const m: Metrics = useMemo(() => {
    if (dash && dash.weekly.length) {
      const w = dash.weekly.slice(-4); const n = w.length;
      return { steps: Math.round(w.reduce((a, x) => a + x.steps, 0) / n), exerciseMin: Math.round(w.reduce((a, x) => a + x.exerciseMin, 0) / n), sleepHours: Math.round((w.reduce((a, x) => a + x.sleepHours, 0) / n) * 4) / 4, restingHr: Math.round(w.reduce((a, x) => a + x.restingHr, 0) / n) };
    }
    return { steps: 7500, exerciseMin: 100, sleepHours: 7.5, restingHr: 66 };
  }, [dash]);
  const q = useMemo(() => quote(m, { plan: id }), [m, id]);
  const sme = useMemo(() => smeQuote(heads, q.score), [heads, q.score]);
  const annual = biz ? sme.perEmployeeAnnual : q.annualPremium; const adj = biz ? sme.adjustmentPct : q.adjustmentPct; const saved = biz ? q.base - sme.perEmployeeAnnual : q.savings;
  // numbers travel to /premium-quote in memory (not in the address) once the upsell is used
  useEffect(() => { pqHandoff.value = { plan: id, ...m, from: biz ? 'business' : id }; }, [m, id, biz]);

  const KV = ({ k, v, big, last }: { k: string; v: string; big?: boolean; last?: boolean }) => (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }} gap={10}><Txt v="small" color={c.mute} style={{ flex: 1 }}>{k}</Txt><Txt w="800" style={big ? { fontSize: 20 } : undefined}>{v}</Txt></Row>
  );

  /* ---------- family: member cards, summary, email invites ---------- */
  const [famApi, setFamApi] = useState<FamilyApi | null>(null); const [email, setEmail] = useState(''); const [rel, setRel] = useState<(typeof RELS)[number]>('spouse');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false); const [confirmId, setConfirmId] = useState<number | null>(null); const [fieldErr, setFieldErr] = useState<string | null>(null);
  const famLoad = useCallback(async () => { if (!user || !fam) { setFamApi(null); return; } try { setFamApi(await api<FamilyApi>('/family')); } catch { setFamApi(null); } }, [user, fam]);
  useFocusEffect(useCallback(() => { famLoad(); }, [famLoad]));
  const realFam = !!(user && famApi && famApi.members.length);
  const cards: Card1[] = useMemo(() => {
    if (!fam) return [];
    if (!realFam) return SAMPLE_MEMBERS.map(([k, mm]) => { const r = quote(mm, { plan: id }); return { key: k, label: t(k), sample: true, score: r.score, grade: r.grade, adj: r.adjustmentPct, prem: r.annualPremium, base: r.base, comps: r.components }; });
    const out: Card1[] = [{ key: 'you', label: t('fm.you'), sample: !real, score: q.score, grade: q.grade, adj: q.adjustmentPct, prem: q.annualPremium, base: q.base, comps: q.components }];
    famApi!.members.forEach((x) => out.push({ key: `m${x.id}`, label: x.label || t(`fm.rel.${x.relationship}`), sample: false, m: x, ...(x.display === 'connected' ? { score: x.score, grade: x.grade, adj: x.adjustmentPct, prem: x.annualPremium, base: x.base, comps: x.components } : {}) }));
    return out;
  }, [fam, realFam, famApi, id, q, real, t]);
  const scored = cards.filter((x) => x.score != null); const pending = cards.length - scored.length;
  const combined = scored.reduce((a, x) => a + (x.prem ?? 0), 0); const flat = scored.reduce((a, x) => a + (x.base ?? 0), 0);
  const left = Math.max(0, (famApi?.max ?? CONFIG.familyMaxMembers) - (famApi?.used ?? 1));
  const loc = lang === 'zh' ? 'zh-CN' : lang === 'ms' ? 'ms-MY' : lang === 'ta' ? 'ta-IN' : 'en-MY';
  const shortDate = (iso: string) => new Date(iso).toLocaleDateString(loc, { day: 'numeric', month: 'short' });
  const waitLeft = (iso: string) => { const ms = new Date(iso).getTime() - Date.now(); return ms > 0 ? `${Math.ceil(ms / 3600000)}h` : null; };

  const send = async () => {
    const em = email.trim().toLowerCase(); setMsg(null); setFieldErr(null);
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(em) || em.includes('..')) { setFieldErr(t('fm.add.err.email')); return; }
    if (user && em === user.email.toLowerCase()) { setFieldErr(t('fm.add.err.self')); return; }
    if (famApi?.members.some((x) => x.email === em && x.display !== 'declined')) { setFieldErr(t('fm.add.err.dup')); return; }
    setBusy(true);
    try { const r = await api<{ ok: boolean; member: FamilyMember }>('/family/invite', { email: em, relationship: rel }); setMsg(r.ok ? { ok: true, text: t('fm.add.ok', { e: em }) } : { ok: false, text: t('fm.add.fail', { e: em }) }); if (r.ok) setEmail(''); }
    catch (e) { setMsg({ ok: false, text: errorText(e, t) }); }
    finally { setBusy(false); await famLoad(); }
  };
  const act = async (kind: 'resend' | 'cancel' | 'remove', mid: number) => {
    setMsg(null);
    try {
      if (kind === 'resend') { const r = await api<{ ok: boolean; member: FamilyMember }>('/family/resend', { id: mid }); setMsg(r.ok ? { ok: true, text: t('fm.add.ok', { e: r.member.email }) } : { ok: false, text: t('fm.add.fail', { e: r.member.email }) }); }
      else if (kind === 'cancel') await api('/family/cancel', { id: mid });
      else { await api('/family/remove', { id: mid }); setConfirmId(null); }
    } catch (e) { setMsg({ ok: false, text: errorText(e, t) }); }
    await famLoad();
  };

  const chipFor = (x: Card1) => (x.sample ? <SampleTag label={t('pqr.sample')} /> : x.m ? <Badge label={t(`fm.st.${x.m.display}`)} tone={x.m.display === 'connected' ? 'ok' : x.m.display === 'pending' || x.m.display === 'nolink' ? 'gold' : 'red'} /> : null);
  const memberCard = (x: Card1) => (
    <Card key={x.key} pad={16} style={{ marginBottom: 12, minHeight: x.score != null ? 0 : 150 }}>
      <Row gap={12} align="flex-start">
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center' }}><Txt w="800" color="#fff">{x.label.charAt(0).toUpperCase()}</Txt></View>
        <View style={{ flex: 1 }}><Txt w="800">{x.label}</Txt>{x.m ? <Txt v="caption" color={c.mute}>{t(`fm.rel.${x.m.relationship}`)} · {x.m.email}</Txt> : null}</View>
        {chipFor(x)}
      </Row>
      {x.score != null ? (
        <>
          <Row gap={10} wrap style={{ marginTop: 12 }}><Txt v="h2">{x.score} / 100 ({x.grade})</Txt><Badge label={`${(x.adj ?? 0) > 0 ? '+' : ''}${x.adj}%`} tone={(x.adj ?? 0) <= 0 ? 'ok' : 'red'} /></Row>
          <KV k={t('fm.prem')} v={rm(x.prem ?? 0)} last />
          <MetricBar label={t('comp.steps')} value={x.comps!.steps} right={String(x.comps!.steps)} />
          <MetricBar label={t('comp.exercise')} value={x.comps!.exercise} right={String(x.comps!.exercise)} />
          <MetricBar label={t('comp.sleep')} value={x.comps!.sleep} right={String(x.comps!.sleep)} />
          <MetricBar label={t('comp.heart')} value={x.comps!.heart} right={String(x.comps!.heart)} />
        </>
      ) : x.m ? (
        <Txt v="small" color={c.mute} style={{ marginTop: 10 }}>{x.m.display === 'pending' ? `${t('fm.pend.p')} ${t('fm.pend.exp', { d: shortDate(x.m.expiresAt) })}` : x.m.display === 'nolink' ? t('fm.nolink.p') : x.m.display === 'failed' ? (x.m.error ?? '') : ''}</Txt>
      ) : null}
      {x.m ? (
        confirmId === x.m.id ? (
          <View style={{ marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: c.red }}>
            <Txt w="800">{t('fm.a.remove.h')}</Txt><Txt v="small" color={c.mute} style={{ marginVertical: 4 }}>{t('fm.a.remove.p')}</Txt>
            <Row gap={8}><Button title={t('fm.a.remove.yes')} small full={false} onPress={() => act('remove', x.m!.id)} /><Button title={t('fm.a.keep')} variant="ghost" small full={false} onPress={() => setConfirmId(null)} /></Row>
          </View>
        ) : (
          <Row gap={8} wrap style={{ marginTop: 12 }}>
            {(x.m.display === 'pending' || x.m.display === 'expired') ? <Button title={t('fm.a.resend')} variant="ghost" small full={false} disabled={x.m.display === 'pending' && !!waitLeft(x.m.canResendAt)} onPress={() => act('resend', x.m!.id)} /> : null}
            {x.m.display === 'failed' ? <Button title={t('fm.a.retry')} small full={false} onPress={() => act('resend', x.m!.id)} /> : null}
            {['pending', 'failed', 'expired'].includes(x.m.display) ? <Button title={t('fm.a.cancel')} variant="ghost" small full={false} onPress={() => act('cancel', x.m!.id)} /> : <Button title={t('fm.a.remove')} variant="ghost" small full={false} onPress={() => setConfirmId(x.m!.id)} />}
            {x.m.display === 'pending' && waitLeft(x.m.canResendAt) ? <Txt v="caption" color={c.mute}>{t('fm.a.wait', { t: waitLeft(x.m.canResendAt) ?? '' })}</Txt> : null}
          </Row>
        )
      ) : null}
    </Card>
  );

  return (
    <Screen>
      <ScreenHeader title={t('pl2.h1', { p: biz ? t('pl2.biz') : `${t('plan.word')} ${id}` })} subtitle={t('pl2.sub')} />
      {!real ? (
        <Card tone="soft" pad={14}>
          <Txt w="600">{t('pl2.sample')}</Txt>
          <Gap h={10} /><Button title={t('nav.connect')} small full={false} onPress={() => router.navigate('/(tabs)/wearable')} />
        </Card>
      ) : <Txt v="caption" color={c.mute}>{t(biz ? 'pl2.biz.team' : 'pl2.src.real')}</Txt>}
      {!real && biz ? <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('pl2.biz.team')}</Txt> : null}

      {fam ? (
        <>
          <Row gap={8} style={{ marginTop: 18, marginBottom: 4 }}><Txt v="h2">{t('fm.h')}</Txt>{!realFam ? <SampleTag label={t('pqr.sample')} /> : null}</Row>
          <Txt v="small" color={c.mute}>{t('fm.sub')}</Txt>
          {!realFam ? <Txt v="caption" color={c.mute} style={{ marginTop: 6 }}>{t('fm.sample.note')}</Txt> : null}
          <View style={{ marginTop: 14 }}>{cards.map(memberCard)}</View>
          <Card tone="red" pad={18}>
            <Txt v="h3">{t('fm.sum.h')}</Txt>
            <KV k={t('fm.sum.combined')} v={rm(combined)} big /><KV k={t('fm.sum.monthly')} v={rm(combined / 12)} /><KV k={t('fm.sum.saving')} v={rm(flat - combined)} last />
            <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('fm.sum.n', { n: scored.length })}{pending ? ` · ${t('fm.sum.pending', { n: pending })}` : ''}</Txt>
            <Gap h={14} />
            <Button title={t('calc.cta')} icon="shield-checkmark" onPress={() => router.push({ pathname: '/apply', params: { plan: id, steps: String(m.steps), exerciseMin: String(m.exerciseMin), sleepHours: String(m.sleepHours), restingHr: String(m.restingHr), sub: '0' } })} />
            <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('pl2.disc')}</Txt>
          </Card>
          <Card pad={18} style={{ marginTop: 12 }}>
            <Txt v="h3">{t('fm.add.h')}</Txt>
            {!user ? (<><Txt v="small" color={c.mute} style={{ marginTop: 4, marginBottom: 12 }}>{t('fm.add.login')}</Txt><Button title={`${t('iv.login')} / ${t('iv.signup')}`} onPress={() => router.push('/login')} /></>)
              : left <= 0 ? <Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t('fm.add.full')}</Txt> : (
                <>
                  <Txt v="small" color={c.mute} style={{ marginTop: 4, marginBottom: 12 }}>{t('fm.add.slots', { n: left, max: famApi?.max ?? CONFIG.familyMaxMembers })}</Txt>
                  <Field label={t('fm.add.email')} value={email} onChangeText={(v) => { setEmail(v); setFieldErr(null); }} autoCapitalize="none" keyboardType="email-address" left="mail-outline" error={fieldErr} />
                  <Txt v="label" color={c.mute} style={{ marginTop: 12, marginBottom: 8 }}>{t('fm.add.rel')}</Txt>
                  <Row gap={8} wrap>{RELS.map((r) => <Chip key={r} label={t(`fm.rel.${r}`)} on={rel === r} onPress={() => setRel(r)} />)}</Row>
                  {rel === 'child' ? <Txt v="caption" w="700" color={c.gold} style={{ marginTop: 10 }}>{t('fm.add.minor')}</Txt> : null}
                  <Gap h={14} /><Button title={t(busy ? 'fm.add.sending' : 'fm.add.send')} icon="send" loading={busy} onPress={send} />
                </>
              )}
            {msg ? <Txt w="700" color={msg.ok ? c.ok : c.bad} style={{ marginTop: 12 }}>{msg.text}</Txt> : null}
            <Txt v="caption" color={c.mute} style={{ marginTop: 12 }}>{t('fm.add.note')}</Txt>
          </Card>
        </>
      ) : (
        <Card pad={20} style={{ marginTop: 14 }}>
          <Row gap={8} style={{ marginBottom: 6 }}><Txt v="label" w="800">{t('calc.score')}</Txt>{!real ? <SampleTag label={t('pqr.sample')} /> : null}</Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Txt v="display" style={{ fontSize: 34, lineHeight: 40 }}>{q.score} / 100</Txt>
              <View style={{ marginTop: 8 }}><Badge label={`${adj > 0 ? '+' : ''}${adj}%`} tone={adj <= 0 ? 'ok' : 'red'} /></View>
            </View>
            <ScoreRing score={q.score} grade={q.grade} size={104} label={t('calc.score')} />
          </Row>
          <View style={{ marginTop: 14 }}>
            <KV k={`${t('calc.base')}${biz ? ' / ' + t('pl2.biz.per').toLowerCase() : ''}`} v={rm(q.base)} />
            <KV k={t('calc.adj')} v={`${adj > 0 ? '+' : ''}${adj}%`} />
            <KV k={`${t('calc.yours')}${biz ? ' / ' + t('pl2.biz.per').toLowerCase() : ''}`} v={rm(annual)} big />
            <KV k={t('calc.permonth')} v={rm(annual / 12)} />
            <KV k={t(saved >= 0 ? 'calc.saved' : 'calc.extra')} v={rm(Math.abs(saved))} last />
          </View>
          <Txt v="label" w="800" style={{ marginTop: 16 }}>{t('calc.breakdown')}</Txt>
          <MetricBar label={t('comp.steps')} value={q.components.steps} right={String(q.components.steps)} />
          <MetricBar label={t('comp.exercise')} value={q.components.exercise} right={String(q.components.exercise)} />
          <MetricBar label={t('comp.sleep')} value={q.components.sleep} right={String(q.components.sleep)} />
          <MetricBar label={t('comp.heart')} value={q.components.heart} right={String(q.components.heart)} />
          {biz ? (
            <View style={{ marginTop: 18 }}>
              <Txt v="label" w="800">{t('pl2.biz.h')}</Txt>
              <Txt v="caption" color={c.mute} style={{ marginTop: 8, marginBottom: 6 }}>{t('pl2.biz.heads')}</Txt>
              <Row gap={8} wrap>{[5, 10, 25, 50, 100, 250, 500].map((n) => <Chip key={n} label={String(n)} on={heads === n} onPress={() => setHeads(n)} />)}</Row>
              <View style={{ marginTop: 8 }}>
                <KV k={t('pl2.biz.per')} v={rm(sme.perEmployeeAnnual)} /><KV k={t('pl2.biz.total')} v={rm(sme.totalAnnual)} /><KV k={t('pl2.biz.disc')} v={`${sme.bulkDiscountPct}%`} last />
              </View>
              <Txt v="caption" color={c.mute}>{t('pl2.biz.note')}</Txt>
            </View>
          ) : null}
          <Gap h={18} />
          {biz ? <Button title={t('pl2.biz.cta')} onPress={() => router.push('/business')} />
            : <Button title={t('calc.cta')} icon="shield-checkmark" onPress={() => router.push({ pathname: '/apply', params: { plan: id, steps: String(m.steps), exerciseMin: String(m.exerciseMin), sleepHours: String(m.sleepHours), restingHr: String(m.restingHr), sub: '0' } })} />}
          <Txt v="caption" color={c.mute} style={{ marginTop: 12 }}>{t('pl2.disc')}</Txt>
        </Card>
      )}

      <SavingsCard kind={fam ? 'family' : biz ? 'biz' : 'ind'} metrics={m} plan={id} members={Math.max(1, scored.length)} heads={heads} sample={!real} />

      {/* highlighted Premium upsell */}
      <Card pad={20} style={{ marginTop: 18, borderColor: c.gold, borderWidth: 1.5, shadowColor: c.red, shadowOpacity: 0.3, shadowRadius: 18, elevation: 4 }}>
        <Badge label={t('pl2.up.badge')} tone="gold" />
        <Txt v="h2" style={{ marginTop: 10 }}>{t('pl2.up.h')}</Txt>
        <Txt v="small" color={c.mute} style={{ marginTop: 6 }}>{t('pl2.up.p')}</Txt>
        <View style={{ marginTop: 16, gap: 12 }}>
          {([['shield-checkmark', 'pl2.up.b1'], ['document-text', 'pl2.up.b2'], ['gift', 'pl2.up.b3']] as const).map(([ic, k]) => (
            <Row key={k} gap={12}><View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={18} color="#fff" /></View><Txt w="600" style={{ flex: 1 }}>{t(k)}</Txt></Row>
          ))}
        </View>
        <View style={{ marginTop: 16 }}><SubscribeCard bare nextHref="/premium-quote" /></View>
        <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('pl2.up.note')}</Txt>
      </Card>
    </Screen>
  );
}
