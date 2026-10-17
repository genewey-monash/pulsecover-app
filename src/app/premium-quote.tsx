import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, Button, Card, Chip, Field, Gap, Icon, Notice, Row, Screen, ScreenHeader, Sheet, Txt, tap } from '../components/ui';
import { LineChart, MetricBar, ScoreRing } from '../components/charts';
import { PlanChips } from '../components/common';
import { validEmail } from '../components/forms';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rm, useDash } from '../lib/data';
import { errorText } from '../lib/errors';
import { useI18n } from '../lib/i18n';
import { PLANS, type Metrics, type PlanId } from '../lib/pricing';
import { BANDS, calc, FACTORS, KEY, pqHandoff, planGoals, SAMPLE, sampleSeries, scenarios, status, type Factor } from '../lib/pqLogic';
import { PartnerTile, SampleTag } from '../components/partner';
import { kv } from '../lib/storage';
import { useToast } from '../lib/overlays';
import { useTheme } from '../lib/theme';

const unitOf = (t: (k: string) => string, f: Factor, v: number) =>
  f === 'steps' ? v.toLocaleString() : f === 'exercise' ? `${v} ${t('pqr.u.min')}` : f === 'sleep' ? `${Math.round(v * 100) / 100} ${t('pqr.u.h')}` : `${v} ${t('pqr.u.bpm')}`;
const STAT = { good: 'pqr.st.excellent', ok: 'pqr.st.good', low: 'pqr.st.work' } as const;
const rm0 = (n: number) => rm(n, 0);

interface Perk { id: string; min: number; k: string; icon: string }
const PERKS: Perk[] = [
  { id: 'pharm', min: 3, k: 'cp.pharm', icon: 'medkit' }, { id: 'cafe', min: 7, k: 'cp.cafe', icon: 'cafe' },
  { id: 'super', min: 14, k: 'cp.super', icon: 'cart' }, { id: 'watch', min: 14, k: 'pqr.perk.watch', icon: 'watch' },
  { id: 'gym', min: 30, k: 'cp.gym', icon: 'barbell' }, { id: 'gymtrial', min: 21, k: 'pqr.perk.trial', icon: 'pricetag' },
];
const EVENTS = [{ id: 'run', off: 21, loc: 'pqr.ev.loc.run', icon: 'flag' }, { id: 'steps', off: 10, loc: 'pqr.ev.loc.online', icon: 'footsteps' }, { id: 'talk', off: 35, loc: 'pqr.ev.loc.online', icon: 'mic' }];

function Tag({ label }: { label: string }) { return <SampleTag label={label} />; }
function Cell({ k, v, good }: { k: string; v: string; good?: boolean }) {
  const { c } = useTheme();
  return <View style={{ width: '50%', paddingRight: 8 }}><Txt v="caption" color={c.mute}>{k}</Txt><Txt w="800" color={good ? c.ok : undefined}>{v}</Txt></View>;
}
function H({ title, sub }: { title: string; sub?: string }) {
  const { c } = useTheme();
  return <View style={{ marginTop: 30, marginBottom: 12 }}><Txt v="h2">{title}</Txt>{sub ? <Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{sub}</Txt> : null}</View>;
}

/** Premium Quote Results: detailed assessment, savings scenarios, coaching plan, policy guidance and perks. Mirrors /premium-quote on the website. */
export default function PremiumQuoteScreen() {
  const router = useRouter(); const { t, lang } = useI18n(); const { c } = useTheme(); const { user } = useAuth(); const { dash } = useDash(); const toast = useToast();
  const [plan, setPlan] = useState<PlanId>('A'); const [cur, setCur] = useState<Metrics>(SAMPLE);
  const [from, setFrom] = useState<string | null>(null);
  const [source, setSource] = useState<'sample' | 'calc' | 'wearable'>('sample'); const [series, setSeries] = useState<(number | null)[]>(() => sampleSeries(SAMPLE));
  const [days, setDays] = useState<30 | 90>(30); const [chartW, setChartW] = useState(300);
  const [wi, setWi] = useState<Metrics>(SAMPLE);
  const [checks, setChecks] = useState<boolean[]>([]); const [claims, setClaims] = useState<Record<string, string>>({}); const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState({ best: 8, sample: true });
  const [open, setOpen] = useState(false); const [email, setEmail] = useState(user?.email ?? ''); const [err, setErr] = useState<string | null>(null); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  const [faq, setFaq] = useState<number | null>(null);

  // inputs: calculator hand-over first, then the linked wearable, else sample values
  const init = useCallback(() => {
    const h = pqHandoff.value;
    if (h) {
      const m: Metrics = { steps: h.steps, exerciseMin: h.exerciseMin, sleepHours: h.sleepHours, restingHr: h.restingHr };
      setCur(m); setWi(m); setPlan((PLANS as any)[h.plan] ? (h.plan as PlanId) : 'A'); setSource('calc'); setFrom(h.from ?? null); setSeries(sampleSeries(m)); return;
    }
    if (dash && dash.weekly.length) {
      const w = dash.weekly.slice(-4); const n = w.length;
      const m: Metrics = { steps: Math.round(w.reduce((a, x) => a + x.steps, 0) / n), exerciseMin: Math.round(w.reduce((a, x) => a + x.exerciseMin, 0) / n), sleepHours: Math.round((w.reduce((a, x) => a + x.sleepHours, 0) / n) * 4) / 4, restingHr: Math.round(w.reduce((a, x) => a + x.restingHr, 0) / n) };
      setCur(m); setWi(m); if (dash.policy && (PLANS as any)[dash.policy.plan]) setPlan(dash.policy.plan as PlanId); setSource('wearable');
      const by: Record<string, number> = {}; dash.metrics.forEach((x) => { by[x.day] = x.score; });
      const out: (number | null)[] = []; const now = Date.now();
      for (let i = 89; i >= 0; i--) { const d = new Date(now - i * 86400000).toISOString().slice(0, 10); out.push(by[d] ?? null); }
      setSeries(out); return;
    }
    setFrom(null); setCur(SAMPLE); setWi(SAMPLE); setSource('sample'); setSeries(sampleSeries(SAMPLE));
  }, [dash]);
  useFocusEffect(useCallback(() => { init(); }, [init]));
  useEffect(() => {
    (async () => {
      try { setChecks(JSON.parse((await kv.get('pc_pq_checks')) || '[]')); } catch { /* ignore */ }
      try { setClaims(JSON.parse((await kv.get('pc_pq_claims')) || '{}')); } catch { /* ignore */ }
      try { setJoined(JSON.parse((await kv.get('pc_pq_events')) || '{}')); } catch { /* ignore */ }
    })();
  }, []);
  useEffect(() => { if (!user) { setStreak({ best: 8, sample: true }); return; } api<{ best: number }>('/rewards').then((r) => setStreak({ best: r.best, sample: false })).catch(() => setStreak({ best: 8, sample: true })); }, [user]);

  const q = useMemo(() => calc(cur, plan), [cur, plan]);
  const sc = useMemo(() => scenarios(cur, plan), [cur, plan]);
  const goals = useMemo(() => planGoals(cur, plan), [cur, plan]);
  const wq = useMemo(() => calc(wi, plan), [wi, plan]);
  const band = BANDS.find((b) => q.score >= b.min)!; const bi = BANDS.indexOf(band); const hi = bi > 0 ? BANDS[bi - 1].min - 1 : 100; const nb = bi > 0 ? BANDS[bi - 1] : null;
  const win = series.slice(-30); const have = win.filter((v) => v !== null).length; const pct = Math.round((have / win.length) * 100);
  const plain = PLANS[plan];
  const dateStr = (off: number) => new Date(Date.now() + off * 86400000).toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'ms' ? 'ms-MY' : lang === 'ta' ? 'ta-IN' : 'en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

  const points = useMemo(() => { // bucket the daily scores so the chart stays light
    const data = series.slice(-days); const buckets = Math.min(10, data.length); const size = data.length / buckets; const out: { label: string; value: number }[] = [];
    for (let i = 0; i < buckets; i++) {
      const part = data.slice(Math.round(i * size), Math.round((i + 1) * size)).filter((v): v is number => v !== null);
      if (part.length) out.push({ label: i === buckets - 1 ? t('pqr.tr.today') : `-${Math.round(data.length - (i + 1) * size) + 1}d`, value: Math.round(part.reduce((a, b) => a + b, 0) / part.length) });
    }
    return out;
  }, [series, days, t]);

  const toggleCheck = (i: number) => { tap(); const a = Array.from({ length: 28 }, (_, k) => !!checks[k]); a[i] = !a[i]; setChecks(a); kv.set('pc_pq_checks', JSON.stringify(a)); };
  const total = goals.length * 7; let done = 0; let run = 0; let bestRun = 0;
  for (let i = 0; i < total; i++) { if (checks[i]) { done++; run++; bestRun = Math.max(bestRun, run); } else run = 0; }
  const claim = (p: Perk) => {
    tap(); const code = 'PC-' + p.id.toUpperCase().slice(0, 4) + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const a = { ...claims, [p.id]: code }; setClaims(a); kv.set('pc_pq_claims', JSON.stringify(a));
  };
  const join = (id: string) => { tap(); const a = { ...joined, [id]: !joined[id] }; setJoined(a); kv.set('pc_pq_events', JSON.stringify(a)); };
  const send = async () => {
    if (!validEmail(email)) { setErr(t('acc.err.email')); return; }
    setBusy(true); setErr(null);
    try { await api('/email-quote', { email: email.trim(), plan, ...cur }); setOk(true); } catch (e) { setErr(errorText(e, t)); } finally { setBusy(false); }
  };
  const sliders: [Factor, number, number, number][] = [['steps', 0, 20000, 250], ['exercise', 0, 400, 5], ['sleep', 3, 11, 0.25], ['heart', 40, 100, 1]];
  const wiDiff = Math.round((q.annualPremium - wq.annualPremium) * 100) / 100;
  const maxBar = Math.max(sc.base.base, sc.base.annualPremium, sc.best.annual);
  const bars: [string, number, string][] = [[t('pqr.s.c.flat'), sc.base.base, c.mute], [t('pqr.s.c.now'), sc.base.annualPremium, c.gold], [t('pqr.s.c.best'), sc.best.annual, c.ok]];
  const faqs = [1, 2, 3, 4];

  return (
    <Screen>
      <ScreenHeader title={t('pqr.h1')} subtitle={t('pqr.lead')} />
      <Row style={{ justifyContent: 'space-between' }} wrap>
        <Badge label={t('pqr.badge')} tone="gold" />
        <Pressable onPress={() => (from ? router.push({ pathname: '/plan-result', params: { plan: from } }) : router.push('/calculator'))} accessibilityRole="link" hitSlop={8}><Txt v="small" w="700" color={c.accent}>{t(from ? 'pl2.qback' : 'pqr.back')}</Txt></Pressable>
      </Row>
      {source === 'sample' ? (
        <Card tone="soft" pad={14} style={{ marginTop: 14 }}>
          <Txt w="600">{t('pqr.banner')}</Txt>
          <Row gap={10} style={{ marginTop: 12 }}>
            <Button title={t('nav.connect')} small full={false} onPress={() => router.navigate('/(tabs)/wearable')} />
            <Button title={t('nav.calc')} small variant="ghost" full={false} onPress={() => router.push('/calculator')} />
          </Row>
        </Card>
      ) : null}
      <Txt v="label" color={c.mute} style={{ marginTop: 16, marginBottom: 8 }}>{t('pqr.plan.lbl')}</Txt>
      <PlanChips value={plan} onChange={(id) => setPlan(id as PlanId)} />
      <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t(source === 'wearable' ? 'pqr.src.wearable' : source === 'calc' ? 'pqr.src.calc' : 'pqr.src.sample')}</Txt>

      {/* 1. hero */}
      <Card pad={20} style={{ marginTop: 14 }}>
        <View style={{ alignItems: 'center' }}><ScoreRing score={q.score} grade={q.grade} size={170} label={t('pqr.h.score')} /></View>
        <Txt v="h3" align="center" style={{ marginTop: 10 }}>{t('pqr.h.score')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, rowGap: 14 }}>
          {([['pqr.h.band', `${q.grade} (${band.min}–${hi})`], ['pqr.h.base', rm0(q.base)], ['pqr.h.adj', `${q.adjustmentPct > 0 ? '+' : ''}${q.adjustmentPct}%`], ['pqr.h.annual', rm(q.annualPremium)], ['pqr.h.monthly', rm(q.monthlyPremium)], ['pqr.h.plan', t(`pqr.plan.${plan}`)]] as [string, string][]).map(([k, v]) => (
            <View key={k} style={{ width: '50%', paddingRight: 8 }}><Txt v="caption" color={c.mute}>{t(k)}</Txt><Txt w="800" color={k === 'pqr.h.annual' ? c.accent : undefined}>{v}</Txt></View>
          ))}
        </View>
        <View style={{ marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: c.redT, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center' }}><Icon name="trending-down" size={22} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Txt w="800">{sc.best.saving > 0 ? t('pqr.h.save', { x: rm(sc.best.saving) }) : t('pqr.h.top')}</Txt>
            {sc.best.saving > 0 ? <Txt v="caption" color={c.mute}>{t('pqr.h.save.sub')}</Txt> : null}
          </View>
        </View>
        <Txt v="caption" color={c.mute} style={{ marginTop: 12 }}>{t('pqr.indicative')}</Txt>
      </Card>

      {/* 2. detailed assessment */}
      <H title={t('pqr.s2.h')} sub={t('pqr.s2.p')} />
      {FACTORS.map((f) => {
        const v = q.components[f]; const st = status(v);
        return (
          <Card key={f} pad={16} style={{ marginBottom: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}><Txt w="800">{t(`comp.${f}`)}</Txt><Badge label={t(STAT[st])} tone={st === 'good' ? 'ok' : st === 'ok' ? 'gold' : 'red'} /></Row>
            <Txt v="h2" style={{ marginTop: 6 }}>{unitOf(t, f, cur[KEY[f]])}</Txt>
            <MetricBar label={t('pqr.f.score')} value={v} right={`${v} / 100`} />
            <Txt v="small" color={c.mute} style={{ marginTop: 10 }}>{t(`pqr.f.${f}`)}</Txt>
          </Card>
        );
      })}
      <Card pad={16} style={{ marginBottom: 10 }}>
        <Txt w="800">{t('pqr.next.h')}</Txt>
        {nb ? (<><Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t('pqr.next.pts', { n: nb.min - q.score, g: nb.g })}</Txt><MetricBar label={`${q.score}`} value={Math.round((q.score / nb.min) * 100)} right={`${nb.min} (${t('pqr.h.grade')} ${nb.g})`} /></>) : <Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t('pqr.next.top')}</Txt>}
      </Card>
      <Card pad={16} style={{ marginBottom: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}><Txt w="800">{t('pqr.dq.h')}</Txt>{source === 'wearable' ? null : <Tag label={t('pqr.sample')} />}</Row>
        <MetricBar label={t('pqr.dq.days', { n: have, d: win.length })} value={pct} right={`${pct}%`} />
        <Txt v="small" color={c.mute} style={{ marginTop: 10 }}>{pct < 80 ? t('pqr.dq.low') : t('pqr.dq.ok')}</Txt>
      </Card>
      <Card pad={16}>
        <Row style={{ justifyContent: 'space-between' }} wrap>
          <Row gap={8}><Txt w="800">{t('pqr.tr.h')}</Txt>{source === 'wearable' ? null : <Tag label={t('pqr.sample')} />}</Row>
          <Row gap={6}>{([30, 90] as const).map((d) => <Chip key={d} label={t(`pqr.tr.${d}`)} on={days === d} onPress={() => setDays(d)} />)}</Row>
        </Row>
        <View style={{ marginTop: 10 }} onLayout={(e) => setChartW(Math.max(220, Math.round(e.nativeEvent.layout.width)))}>{points.length ? <LineChart points={points} width={chartW} /> : null}</View>
        <Txt v="caption" color={c.mute}>{t('pqr.tr.note')}</Txt>
      </Card>

      {/* 3. savings */}
      <H title={t('pqr.s3.h')} sub={t('pqr.s3.p')} />
      {sc.rows.map((r) => (
        <Card key={r.f} pad={16} style={{ marginBottom: 10 }}>
          <Txt w="800">{t('pqr.s.col.if')}: {t(`comp.${r.f}`)}</Txt>
          {r.to === null ? <Txt v="small" color={c.mute} style={{ marginTop: 6 }}>{t('pqr.s.at')}</Txt> : (
            <>
              <Txt style={{ marginTop: 6 }}>{unitOf(t, r.f, r.from)} → <Txt w="800">{unitOf(t, r.f, r.to)}</Txt></Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, rowGap: 10 }}>
                <Cell k={t('pqr.s.col.fscore')} v={String(r.fscore)} />
                <Cell k={t('pqr.s.col.score')} v={String(r.score)} />
                <Cell k={t('pqr.s.col.annual')} v={rm(r.annual)} />
                <Cell k={t('pqr.s.col.save')} v={`${r.saving > 0 ? '−' : ''}${rm(r.saving)}`} good />
              </View>
            </>
          )}
        </Card>
      ))}
      <Card tone="red" pad={16}>
        <Txt w="800">{t('pqr.s.best')}</Txt>
        {sc.best.factors.length ? (
          <>
            <Txt v="caption" color={c.mute}>{sc.best.factors.map((f) => t(`comp.${f}`)).join(' + ')} · {sc.best.factors.length} {t('pqr.s.changes')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, rowGap: 10 }}>
              <Cell k={t('pqr.s.col.score')} v={String(sc.best.score)} />
              <Cell k={t('pqr.s.col.annual')} v={rm(sc.best.annual)} />
              <Cell k={t('pqr.s.col.save')} v={`−${rm(sc.best.saving)}`} good />
              <Cell k={t('pqr.h.monthly')} v={t('pqr.s.permonth', { x: rm(sc.best.saving / 12) })} />
            </View>
          </>
        ) : <Txt v="small" color={c.mute} style={{ marginTop: 6 }}>{t('pqr.s.at')}</Txt>}
      </Card>
      <Card pad={16} style={{ marginTop: 10 }}>
        <Txt w="800">{t('pqr.s.chart')}</Txt>
        {bars.map(([label, v, col]) => (
          <View key={label} style={{ marginTop: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}><Txt v="small" w="600" style={{ flex: 1 }}>{label}</Txt><Txt w="800">{rm(v)}</Txt></Row>
            <View style={{ height: 12, borderRadius: 6, backgroundColor: c.line, marginTop: 6, overflow: 'hidden' }}><View style={{ height: 12, width: `${Math.max(6, Math.round((v / maxBar) * 100))}%`, backgroundColor: col, borderRadius: 6 }} /></View>
          </View>
        ))}
      </Card>
      <Card pad={16} style={{ marginTop: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}><Txt w="800">{t('pqr.w.h')}</Txt><Button title={t('pqr.w.reset')} variant="ghost" small full={false} onPress={() => setWi(cur)} /></Row>
        <Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t('pqr.w.p')}</Txt>
        {sliders.map(([f, min, max, step]) => (
          <View key={f} style={{ marginTop: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}><Txt v="label" style={{ flex: 1 }}>{t(`comp.${f}`)}</Txt><Txt w="800" color={c.accent}>{unitOf(t, f, wi[KEY[f]])}</Txt></Row>
            <Slider style={{ height: 40 }} minimumValue={min} maximumValue={max} step={step} value={Math.min(max, Math.max(min, wi[KEY[f]]))} onValueChange={(v) => setWi((s) => ({ ...s, [KEY[f]]: v }))} minimumTrackTintColor={c.red} maximumTrackTintColor={c.track} thumbTintColor={c.red} accessibilityLabel={t(`comp.${f}`)} />
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: c.line, marginVertical: 12 }} />
        <Row style={{ justifyContent: 'space-between' }} gap={6}>
          <View style={{ flex: 1 }}><Txt v="caption" color={c.mute}>{t('pqr.w.score')}</Txt><Txt w="800">{wq.score} <Txt v="caption" color={c.mute}>{wq.score - q.score >= 0 ? '+' : ''}{wq.score - q.score}</Txt></Txt></View>
          <View style={{ flex: 1 }}><Txt v="caption" color={c.mute}>{t('pqr.w.prem')}</Txt><Txt w="800">{rm(wq.annualPremium)}</Txt></View>
          <View style={{ flex: 1 }}><Txt v="caption" color={c.mute}>{t(wiDiff < 0 ? 'pqr.w.extra' : 'pqr.w.save')}</Txt><Txt w="800" color={wiDiff < 0 ? c.red : c.ok}>{rm(Math.abs(wiDiff))}</Txt></View>
        </Row>
      </Card>
      <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('pqr.s3.note')}</Txt>

      {/* 4. coaching */}
      <H title={t('pqr.s4.h')} sub={t('pqr.s4.p')} />
      {goals.length ? (
        <>
          <Card pad={16} style={{ marginBottom: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View><Txt v="h2">{Math.round((done / total) * 100)}%</Txt><Txt v="caption" color={c.mute}>{t('pqr.p.done', { a: done, b: total })}</Txt></View>
              <View style={{ alignItems: 'flex-end' }}><Row gap={6}><Icon name="flame" size={22} color={c.accent} /><Txt v="h2" color={c.accent}>{bestRun}</Txt></Row><Txt v="caption" color={c.mute}>{t('pqr.p.streak')}</Txt></View>
            </Row>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: c.line, marginTop: 12, overflow: 'hidden' }}><View style={{ height: 10, width: `${Math.round((done / total) * 100)}%`, backgroundColor: c.ok }} /></View>
          </Card>
          {goals.map((g, gi) => (
            <Card key={g.week} pad={16} style={{ marginBottom: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}><Txt w="800">{t('pqr.p.week', { n: g.week })}</Txt><Badge label={`+${g.gain} ${t('pqr.p.pts')}`} tone="ok" /></Row>
              <Txt w="700" style={{ marginTop: 8 }}>{t(`pqr.p.${g.f === 'sleep' && g.to < g.from ? 'sleep2' : g.f}.habit`, { t: unitOf(t, g.f, g.to), f: unitOf(t, g.f, g.from) })}</Txt>
              <Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t(`pqr.p.${g.f}.why`)}</Txt>
              <Row gap={6} style={{ marginTop: 12 }}>
                {Array.from({ length: 7 }, (_, d) => { const id = gi * 7 + d; const on = !!checks[id]; return (
                  <Pressable key={d} onPress={() => toggleCheck(id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${t('pqr.p.week', { n: g.week })} ${d + 1}`}
                    style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: on ? c.ok : c.line, backgroundColor: on ? c.ok : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    <Txt w="700" color={on ? '#fff' : c.mute}>{d + 1}</Txt>
                  </Pressable>); })}
              </Row>
            </Card>
          ))}
          <Row style={{ justifyContent: 'space-between' }} gap={10}>
            <Txt v="caption" color={c.mute} style={{ flex: 1 }}>{t('pqr.s4.note')}</Txt>
            <Button title={t('pqr.p.restart')} variant="ghost" small full={false} onPress={() => { setChecks([]); kv.set('pc_pq_checks', '[]'); }} />
          </Row>
        </>
      ) : <Card><Txt>{t('pqr.p.none')}</Txt></Card>}

      {/* 5. policy guidance */}
      <H title={t('pqr.s5.h')} sub={t('pqr.s5.p')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
        {['A', 'B', 'C'].map((n, i) => (
          <Card key={n} pad={16} style={{ width: 270 }}>
            <Row gap={12} align="flex-start"><PartnerTile icon="shield" /><Txt w="800" style={{ flex: 1, paddingTop: 12 }}>{t('pqr.pol.name', { n })}</Txt><Tag label={t('pqr.sample')} /></Row>
            <Txt v="h2" color={c.accent} style={{ marginTop: 8 }}>{rm0(Math.round(q.annualPremium * [1, 1.07, 0.95][i]))}<Txt v="small" color={c.mute}>{t('common.year')}</Txt></Txt>
            <Txt v="caption" color={c.mute}>{t('pqr.pol.ind')}</Txt>
            <View style={{ marginVertical: 12, gap: 6 }}>
              {[t('pqr.pol.cov', { c: rm0(plain.cover) }), t(plain.type === 'family' ? 'pqr.pol.fam' : 'pqr.pol.ci'), t(`pqr.pol.h${i + 1}`)].map((x) => <Row key={x} gap={8} align="flex-start"><Icon name="checkmark-circle" size={18} color={c.ok} /><Txt v="small" style={{ flex: 1 }}>{x}</Txt></Row>)}
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10, gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }} gap={8}><Txt v="caption" color={c.mute}>{t('pqr.pol.wait')}</Txt><Txt v="small" w="700" style={{ flexShrink: 1, textAlign: 'right' }}>{t(`pqr.pol.w${i + 1}`)}</Txt></Row>
              <Row style={{ justifyContent: 'space-between' }} gap={8}><Txt v="caption" color={c.mute}>{t('pqr.pol.panel')}</Txt><Txt v="small" w="700" style={{ flexShrink: 1, textAlign: 'right' }}>{t(`pqr.pol.p${i + 1}`)}</Txt></Row>
            </View>
          </Card>
        ))}
      </ScrollView>
      <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('pqr.s5.note')}</Txt>

      {/* 6. perks and events */}
      <H title={t('pqr.s6.h')} sub={streak.sample ? t('pqr.perk.sample', { n: streak.best }) : t('pqr.perk.yours', { n: streak.best })} />
      {PERKS.map((p) => {
        const unlocked = streak.best >= p.min; const code = claims[p.id];
        return (
          <Card key={p.id} pad={14} style={{ marginBottom: 10, minHeight: 190 }}>
            <Row gap={12} align="flex-start">
              <PartnerTile icon={p.icon} locked={!unlocked} />
              <View style={{ flex: 1 }}>
                <Txt w="800">{t(`${p.k}.h`)}</Txt>
                <Txt v="small" color={c.mute} style={{ marginTop: 2 }}>{t(`${p.k}.p`)}</Txt>
              </View>
              <Tag label={t('pqr.sample')} />
            </Row>
            <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('pqr.perk.exp', { d: dateStr(60) })}</Txt>
            <View style={{ marginTop: 12 }}>
              {code ? <Row gap={10}><Txt v="caption" color={c.mute}>{t('rw.code')}</Txt><Txt w="800" color={c.accent} style={{ letterSpacing: 1 }}>{code}</Txt></Row>
                : unlocked ? <Button title={t('pqr.perk.claim')} small full={false} onPress={() => { claim(p); toast(t('pqr.perk.claim')); }} />
                  : <Row gap={6}><Icon name="lock-closed" size={16} color={c.mute} /><Txt v="small" w="700" color={c.mute}>{t('pqr.perk.need', { n: p.min })}</Txt></Row>}
            </View>
          </Card>
        );
      })}
      <Txt v="h3" style={{ marginTop: 14, marginBottom: 10 }}>{t('pqr.ev.h')}</Txt>
      {EVENTS.map((e) => (
        <Card key={e.id} pad={14} style={{ marginBottom: 10, minHeight: 190 }}>
          <Row gap={12} align="flex-start">
            <PartnerTile icon={e.icon} />
            <View style={{ flex: 1 }}><Txt w="800">{t(`pqr.ev.${e.id}.h`)}</Txt><Txt v="caption" color={c.mute}>{dateStr(e.off)} · {t(e.loc)}</Txt></View>
            <Tag label={t('pqr.sample')} />
          </Row>
          <Txt v="small" color={c.mute} style={{ marginTop: 10, marginBottom: 12 }}>{t(`pqr.ev.${e.id}.p`)}</Txt>
          <Button title={joined[e.id] ? `✓ ${t('pqr.ev.joined')}` : t('pqr.ev.join')} small full={false} variant={joined[e.id] ? 'ghost' : 'primary'} onPress={() => join(e.id)} />
        </Card>
      ))}
      <Txt v="caption" color={c.mute}>{t('rw.demo')}</Txt>

      {/* 7. call to action and FAQ */}
      <H title={t('pqr.s7.h')} />
      <Card pad={18}>
        <Txt v="h3">{t('pqr.cta.h')}</Txt>
        <Txt v="small" color={c.mute} style={{ marginTop: 4, marginBottom: 14 }}>{t('pqr.cta.p')}</Txt>
        <Button title={t('pqr.sticky.apply')} icon="shield-checkmark" onPress={() => router.push({ pathname: '/apply', params: { plan, steps: String(cur.steps), exerciseMin: String(cur.exerciseMin), sleepHours: String(cur.sleepHours), restingHr: String(cur.restingHr), sub: '0' } })} />
        <Gap h={10} />
        <Button title={t('pqr.sticky.mail')} icon="mail" variant="ghost" onPress={() => { setOk(false); setErr(null); setOpen(true); }} />
      </Card>
      <View style={{ marginTop: 14, gap: 10 }}>
        {faqs.map((i) => (
          <Card key={i} pad={0} onPress={() => { tap(); setFaq(faq === i ? null : i); }}>
            <View style={{ padding: 16 }}>
              <Row style={{ justifyContent: 'space-between' }} gap={10}><Txt w="700" style={{ flex: 1 }}>{t(`pqr.faq.q${i}`)}</Txt><Icon name={faq === i ? 'chevron-up' : 'chevron-down'} size={18} color={c.mute} /></Row>
              {faq === i ? <Txt v="small" color={c.mute} style={{ marginTop: 8 }}>{t(`pqr.faq.a${i}`)}</Txt> : null}
            </View>
          </Card>
        ))}
      </View>
      <Txt v="caption" color={c.mute} style={{ marginTop: 14 }}>{t('pqr.disc')}</Txt>

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('eq.h')}>
        {ok ? (<><Notice text={t('eq.ok')} /><Gap h={14} /><Button title={t('connect.cancel')} variant="ghost" onPress={() => setOpen(false)} /></>) : (
          <>
            <Field label={t('eq.ph')} value={email} onChangeText={(v) => { setEmail(v); setErr(null); }} autoCapitalize="none" keyboardType="email-address" left="mail-outline" error={err} />
            <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('eq.note')}</Txt>
            <Gap h={16} />
            <Button title={t('eq.btn')} loading={busy} icon="send" onPress={send} />
          </>
        )}
      </Sheet>
    </Screen>
  );
}
