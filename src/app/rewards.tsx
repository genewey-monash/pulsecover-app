import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Pressable, Switch, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { Avatar, Badge, Button, Card, Chip, Gap, Icon, Row, Screen, ScreenHeader, Txt, tap } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useDash } from '../lib/data';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/overlays';
import { C, codeFor, compute, denseOf, isActive, lvIdx, monday, periodKey, questProgress, reqMet, resetIn, sampleRecords, today, ymd, type BadgeState, type Model, type RState, type Rec, type VaultDef } from '../lib/rewardsLogic';
import { PartnerTile, SampleTag } from '../components/partner';
import { kv } from '../lib/storage';
import { useTheme } from '../lib/theme';

interface ServerRewards { streak: number; best: number; coupons: { id: string; code: string | null }[] }
type IconName = React.ComponentProps<typeof Icon>['name'];
const BADGE_ICON: Record<string, IconName> = { steps: 'footsteps-outline', bolt: 'flash-outline', moon: 'moon-outline', heart: 'heart-outline', flame: 'flame-outline', plug: 'watch-outline', users: 'people-outline', star: 'star-outline' };
const BRONZE = '#B8733A', SILVER = '#8E98A6', GOLD = '#E8A317';

function Ring({ frac, size = 60, color, label }: { frac: number; size?: number; color: string; label: string }) {
  const { c } = useTheme(); const r = size / 2 - 5; const circ = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.line} strokeWidth={6} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, frac)))} />
      </Svg>
      <Txt v="caption" w="800">{label}</Txt>
    </View>
  );
}
function Bar({ frac, color }: { frac: number; color?: string }) {
  const { c } = useTheme();
  return <View style={{ height: 10, borderRadius: 5, backgroundColor: c.line, overflow: 'hidden' }}><View style={{ height: 10, width: `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`, backgroundColor: color ?? c.red }} /></View>;
}
function Tag({ label }: { label: string }) { return <SampleTag label={label} />; }
function H({ title, sub }: { title: string; sub?: string }) {
  const { c } = useTheme();
  return <View style={{ marginTop: 30, marginBottom: 12 }}><Txt v="h2">{title}</Txt>{sub ? <Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{sub}</Txt> : null}</View>;
}
const fmt = (n: number, d = 0) => Number(n).toLocaleString('en-MY', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Confetti plus an optional badge pop-in. Confetti is skipped when the phone asks to reduce motion. */
function Celebration({ show, badge, onDone }: { show: number; badge: { name: string; tier: string; icon: IconName; color: string } | null; onDone: () => void }) {
  const { c } = useTheme(); const [visible, setVisible] = useState(false); const [reduced, setReduced] = useState(false);
  const parts = useRef(Array.from({ length: 26 }, (_, i) => ({ v: new Animated.Value(0), a: Math.random() * Math.PI * 2, d: 90 + Math.random() * 150, col: ['#B71234', '#E8A317', '#1B8A5A', '#4C7DF0', '#F2C561'][i % 5], rot: Math.random() * 6 - 3 }))).current;
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {}); }, []);
  useEffect(() => {
    if (!show) return;
    setVisible(true); pop.setValue(0);
    if (!reduced) { Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }).start(); parts.forEach((p) => { p.v.setValue(0); Animated.timing(p.v, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }); } else pop.setValue(1);
    const id = setTimeout(() => { setVisible(false); onDone(); }, badge ? 2800 : 1500);
    return () => clearTimeout(id);
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => { setVisible(false); onDone(); }}>
      <Pressable style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => { setVisible(false); onDone(); }} accessibilityLabel="close">
        {!reduced ? parts.map((p, i) => (
          <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', width: 8, height: 11, borderRadius: 2, backgroundColor: p.col, opacity: p.v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [{ translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.a) * p.d] }) }, { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.a) * p.d + 150] }) }, { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot * 180}deg`] }) }] }} />
        )) : null}
        {badge ? (
          <Animated.View accessibilityRole="alert" style={{ alignItems: 'center', backgroundColor: c.surface, borderRadius: 24, borderWidth: 2, borderColor: badge.color, paddingVertical: 26, paddingHorizontal: 40, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }], opacity: pop, shadowColor: badge.color, shadowOpacity: 0.6, shadowRadius: 30, elevation: 10 }}>
            <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: badge.color, alignItems: 'center', justifyContent: 'center' }}><Icon name={badge.icon} size={40} color="#fff" /></View>
            <Txt v="h3" style={{ marginTop: 10 }}>{badge.name}</Txt>
            <Txt w="800" color={badge.color}>{badge.tier}</Txt>
          </Animated.View>
        ) : null}
      </Pressable>
    </Modal>
  );
}

/** Rewards: XP and levels, quests, streaks, badges, reward vault, referral. Mirrors /rewards on the website. */
export default function RewardsScreen() {
  const router = useRouter(); const { t, lang } = useI18n(); const { c, isDark } = useTheme(); const { user } = useAuth(); const { dash } = useDash(); const toast = useToast();
  const [server, setServer] = useState<ServerRewards | null>(null);
  const [demoPrem, setDemoPrem] = useState(false); const [fc, setFc] = useState(false);
  const [st, setSt] = useState<RState>({ ledger: {}, seen: {}, freeze: null }); const [claims, setClaims] = useState<Record<string, string>>({}); const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<7 | 30>(7); const [bf, setBf] = useState<'all' | 'earned' | 'progress' | 'locked'>('all'); const [vt, setVt] = useState<'all' | 'unlocked' | 'locked' | 'events'>('all');
  const [openBadge, setOpenBadge] = useState<string | null>(null); const [freezeOpen, setFreezeOpen] = useState(false); const [xpOpen, setXpOpen] = useState(false); const [tick, setTick] = useState(0);
  const [celeb, setCeleb] = useState<{ n: number; badge: { name: string; tier: string; icon: IconName; color: string } | null }>({ n: 0, badge: null });
  const celebrated = useRef('');
  const tierColor = (i: number) => (i === 1 ? BRONZE : i === 2 ? (isDark ? '#B5BECB' : SILVER) : GOLD);
  const locale = lang === 'zh' ? 'zh-CN' : lang === 'ms' ? 'ms-MY' : lang === 'ta' ? 'ta-IN' : 'en-MY';
  const fdate = (iso: string) => { const p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }); };
  const levelName = (i: number) => t(`rw2.level.${C.levels[i].id}`);
  const tierName = (i: number) => t(`rw2.t.${i}`);

  // data source: linked wearable (account or guest) when there are 7+ days, otherwise clearly labelled SAMPLE progress
  const recs = useMemo<Rec[] | null>(() => {
    const ms = dash?.metrics ?? [];
    return ms.length >= 7 ? ms.map((m) => ({ day: m.day, steps: m.steps, exerciseMin: m.exerciseMin ?? 0, sleepHours: m.sleepHours ?? 0, restingHr: m.restingHr ?? 0 })) : null;
  }, [dash]);
  const src: 'real' | 'sample' = recs ? 'real' : 'sample';
  const data = useMemo(() => denseOf(recs ?? sampleRecords()), [recs]);
  const friends = recs ? (dash?.referrals ?? 0) : 1;
  const realPremium = !!(recs && dash?.policy && dash.policy.app_sub);
  const premium = realPremium || demoPrem;
  const k = (name: string) => `pc_rw_${name}_${src}`;

  useFocusEffect(useCallback(() => { if (user) api<ServerRewards>('/rewards').then(setServer).catch(() => {}); else setServer(null); }, [user]));
  useEffect(() => {
    let live = true; setLoaded(false);
    (async () => {
      const read = async <T,>(key: string, d: T): Promise<T> => { try { const v = await kv.get(key); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
      const [ledger, seen, freeze, cl] = await Promise.all([read<Record<string, number>>(k('q'), {}), read<Record<string, string>>(k('seen'), {}), read<RState['freeze']>(k('freeze'), null), read<Record<string, string>>(k('claims'), {})]);
      const dp = await read<boolean>('pc_rw_demo_prem', false); const f = await read<boolean>('pc_rw_fc', false);
      if (live) { setSt({ ledger, seen, freeze }); setClaims(cl); setDemoPrem(dp); setFc(f); setLoaded(true); }
    })();
    return () => { live = false; };
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const id = setInterval(() => setTick((x) => x + 1), 30000); return () => clearInterval(id); }, []);

  const m: Model = useMemo(() => compute(data.days, data.dates, friends, server ? { streak: server.streak, best: server.best } : null, st), [data, friends, server, st]);

  // award quest XP once per period and celebrate new badge tiers (first visit celebrates only the best one)
  useEffect(() => {
    if (!loaded) return; const id = `${src}:${data.dates[data.dates.length - 1]}`; if (celebrated.current === id) return; celebrated.current = id;
    (async () => {
      const ledger = { ...st.ledger }; const msgs: string[] = [];
      C.quests.forEach((q) => { if (q.minLevel && lvIdx(q.minLevel) > m.li) return; const key = periodKey(q); if (!ledger[key] && questProgress(q, m) >= q.goal) { ledger[key] = q.xp; msgs.push(t('rw2.q.done', { q: t(`rw2.q.${q.id}`, { n: fmt(q.goal) }), n: q.xp })); } });
      const seen = { ...st.seen }; const fresh: { b: BadgeState; tier: number }[] = [];
      m.badges.forEach((b) => { for (let i = 0; i < b.tier; i++) { const key = `${b.def.id}:${i + 1}`; if (!seen[key]) { fresh.push({ b, tier: i + 1 }); seen[key] = b.dates[i] ?? ymd(today()); } } });
      const first = !(await kv.get(k('init'))); await kv.set(k('init'), '1');
      if (msgs.length) await kv.set(k('q'), JSON.stringify(ledger));
      if (fresh.length) await kv.set(k('seen'), JSON.stringify(seen));
      if (msgs.length || fresh.length) setSt((s) => ({ ...s, ledger, seen }));
      const top = [...fresh].sort((a, b) => b.tier - a.tier)[0]; const shown = first && top ? top : fresh[0];
      if (shown) { const extra = fresh.length - 1; setCeleb({ n: Date.now(), badge: { name: t(`rw2.b.${shown.b.def.id}.n`), tier: tierName(shown.tier), icon: BADGE_ICON[shown.b.def.icon] ?? 'star-outline', color: tierColor(shown.tier) } }); toast(`${t('rw2.b.unlocked', { b: t(`rw2.b.${shown.b.def.id}.n`), t: tierName(shown.tier) })}${extra > 0 ? ' · ' + t('rw2.b.more', { n: extra }) : ''}`); }
      else if (msgs.length) { setCeleb({ n: Date.now(), badge: null }); toast(msgs[0]); }
    })();
  }, [loaded, src, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextLvl = C.levels[m.li + 1]; const curLvl = C.levels[m.li];
  const earnedTiers = m.badges.reduce((s, b) => s + b.tier, 0); const allTiers = C.badges.length * 3;
  const missed: string[] = []; for (let j = m.days.length - 7; j < m.days.length - 1; j++) if (!isActive(m.days[j]) && m.freezeDay !== m.dates[j]) missed.push(m.dates[j]);
  const nextFrac = (b: BadgeState) => (b.tier < 3 ? Math.min(1, b.vals[b.tier] / b.def.tiers[b.tier].need) : 1);
  const cand = [...m.badges].filter((b) => b.tier < 3).sort((a, b) => nextFrac(b) - nextFrac(a))[0];
  const list = m.badges.filter((b) => bf === 'all' || (bf === 'earned' && b.tier > 0) || (bf === 'progress' && b.tier < 3 && nextFrac(b) > 0) || (bf === 'locked' && b.tier === 0 && nextFrac(b) === 0));
  const hist: { b: BadgeState; tier: number; date: string; xp: number }[] = [];
  m.badges.forEach((b) => { for (let i = 0; i < b.tier; i++) hist.push({ b, tier: i + 1, date: b.dates[i] ?? '', xp: b.def.tiers[i].xp }); });
  hist.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.tier - a.tier));
  const who = user?.email ?? 'guest';

  const applyFreeze = async (day: string) => { const f = { week: ymd(monday(today())), day }; await kv.set(k('freeze'), JSON.stringify(f)); setSt((s) => ({ ...s, freeze: f })); setFreezeOpen(false); toast(t('rw2.s.freeze.used', { d: fdate(day) })); };
  const claim = async (it: VaultDef) => {
    tap(); const sc = server?.coupons.find((x) => x.id === it.id)?.code; const a = { ...claims, [it.id]: it.kind === 'event' ? 'joined' : codeFor(it, who, sc) };
    setClaims(a); await kv.set(k('claims'), JSON.stringify(a)); setCeleb({ n: Date.now(), badge: null });
  };
  const reqText = (it: VaultDef) => { const r = it.req; if (!r) return null; if (r.level) return t('rw2.v.byLevel', { l: levelName(lvIdx(r.level)) }); return t('rw2.v.byBadge', { b: t(`rw2.b.${r.badge}.n`), t: tierName(r.tier ?? 1) }); };
  const vaultItems = C.vault.map((it) => { const met = reqMet(it, m); const premOk = !it.premium || premium; const claimed = claims[it.id]; return { it, met, premOk, claimed, state: claimed ? 'claimed' : met && premOk ? 'open' : 'locked' }; })
    .filter((x) => vt === 'all' || (vt === 'unlocked' && x.state !== 'locked') || (vt === 'locked' && x.state === 'locked') || (vt === 'events' && x.it.kind === 'event'));
  const dateOff = (n: number) => new Date(Date.now() + n * 86400000).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const sampleTag = src === 'sample' ? <Tag label={t('rw2.sample')} /> : null;
  void tick;

  const questCard = (q: (typeof C.quests)[number]) => {
    const locked = !!q.minLevel && lvIdx(q.minLevel) > m.li; const v = questProgress(q, m); const done = !locked && v >= q.goal; const status = locked ? 'locked' : done ? 'done' : 'progress'; const frac = locked ? 0 : Math.min(1, v / q.goal);
    const shown = q.unit === 'h' ? Math.min(v, q.goal) : Math.min(Math.round(v), q.goal);
    return (
      <Card key={q.id} pad={16} style={{ marginBottom: 10, opacity: locked ? 0.85 : 1 }}>
        <Row gap={14}>
          <Ring frac={frac} color={done ? c.ok : c.red} label={done ? '✓' : `${Math.round(frac * 100)}%`} />
          <View style={{ flex: 1 }}>
            <Txt w="800">{t(`rw2.q.${q.id}`, { n: fmt(q.goal) })}</Txt>
            <Txt v="small" color={c.mute}>{locked ? t('rw2.q.locked', { l: levelName(lvIdx(q.minLevel!)) }) : `${fmt(shown, q.unit === 'h' ? 1 : 0)} / ${fmt(q.goal)} ${t(`rw2.u.${q.unit}`)}`}</Txt>
          </View>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <Badge label={t(`rw2.st.${status}`)} tone={done ? 'ok' : 'mute'} />
          <Txt w="800" color={c.accent}>{t('rw2.q.xp', { n: q.xp })}</Txt>
        </Row>
        {locked ? null : <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('rw2.q.reset', { t: resetIn(q.period) })}</Txt>}
      </Card>
    );
  };

  return (
    <Screen onRefresh={user ? async () => { try { setServer(await api<ServerRewards>('/rewards')); } catch { /* keep previous */ } } : undefined}>
      <ScreenHeader title={t('rw.h1')} subtitle={t('rw.sub')} />
      {src === 'sample' ? (
        <Card tone="soft" pad={14}>
          <Txt w="600">{t('rw2.samplebanner')}</Txt>
          <Row gap={10} style={{ marginTop: 12 }}>
            <Button title={t('nav.connect')} small full={false} onPress={() => router.navigate('/(tabs)/wearable')} />
            {!user ? <Button title={t('nav.login')} small variant="ghost" full={false} onPress={() => router.push('/login')} /> : null}
          </Row>
        </Card>
      ) : null}
      {!realPremium ? (
        <Row gap={10} style={{ marginTop: 12, justifyContent: 'space-between' }}>
          <Txt v="small" color={c.mute} style={{ flex: 1 }}>{t('rw2.demo.premium')}</Txt>
          <Switch value={demoPrem} onValueChange={(v) => { setDemoPrem(v); kv.set('pc_rw_demo_prem', JSON.stringify(v)); }} trackColor={{ true: c.red, false: c.line }} thumbColor="#fff" accessibilityLabel={t('rw2.demo.premium')} />
        </Row>
      ) : null}

      {/* player header */}
      <Card pad={18} style={{ marginTop: 14 }}>
        <Row gap={14}>
          <Avatar name={user?.name || '?'} size={60} />
          <View style={{ flex: 1 }}>
            <Row gap={8} wrap><Txt v="h2">{levelName(m.li)}</Txt><Badge label={t(premium ? 'rw2.premium' : 'rw2.free')} tone={premium ? 'gold' : 'mute'} />{sampleTag}</Row>
            <Txt v="caption" color={c.mute} style={{ marginVertical: 4 }}>{t('rw2.xp')} {fmt(m.total)} · {nextLvl ? t('rw2.toNext', { n: fmt(nextLvl.xp - m.total), l: levelName(m.li + 1) }) : t('rw2.maxlvl')}</Txt>
            <Bar frac={nextLvl ? (m.total - curLvl.xp) / (nextLvl.xp - curLvl.xp) : 1} />
          </View>
        </Row>
        <Row gap={10} style={{ marginTop: 16 }}>
          {([[<Icon key="f" name="flame" size={20} color={c.accent} />, String(m.cur), t('rw2.streakday')], [null, String(m.best), t('rw2.longest')], [null, `${earnedTiers} / ${allTiers}`, t('rw2.badges', { a: earnedTiers, b: allTiers })]] as [React.ReactNode, string, string][]).map(([ic, v, l], i) => (
            <View key={i} style={{ flex: 1, backgroundColor: c.bgAlt, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' }}>
              <Row gap={4}>{ic}<Txt v="h3">{v}</Txt></Row>
              <Txt v="caption" color={c.mute} align="center" style={{ marginTop: 2 }}>{l}</Txt>
            </View>
          ))}
        </Row>
      </Card>
      <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('rw2.note')}</Txt>

      {/* quests */}
      <H title={t('rw2.q.h')} sub={t('rw2.q.p')} />
      <Row gap={8} style={{ marginBottom: 10 }}><Txt v="label" w="800">{t('rw2.q.daily')}</Txt>{sampleTag}</Row>
      {C.quests.filter((q) => q.period === 'day').map(questCard)}
      <Txt v="label" w="800" style={{ marginTop: 8, marginBottom: 10 }}>{t('rw2.q.weekly')}</Txt>
      {C.quests.filter((q) => q.period === 'week').map(questCard)}
      <Txt v="caption" color={c.mute}>{t('rw2.safe')}</Txt>

      {/* streaks */}
      <H title={t('rw2.s.h')} />
      <Card pad={18}>
        <Row gap={14}>
          <Icon name="flame" size={46} color={c.accent} />
          <View><Txt v="display" style={{ fontSize: 44, lineHeight: 48 }}>{m.cur}</Txt><Row gap={8}><Txt v="small" color={c.mute}>{t('rw2.streakday')}</Txt>{sampleTag}</Row></View>
        </Row>
        <Row gap={8} style={{ marginTop: 14 }}><Chip label={t('rw2.s.week')} on={view === 7} onPress={() => setView(7)} /><Chip label={t('rw2.s.month')} on={view === 30} onPress={() => setView(30)} /></Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: view === 7 ? 6 : 5, marginTop: 14 }}>
          {m.days.slice(-view).map((r, idx) => {
            const i = m.days.length - view + idx; const act = isActive(r); const fz = !act && m.dates[i] === m.freezeDay; const isToday = m.dates[i] === ymd(today()); const d = new Date(m.dates[i] + 'T12:00:00');
            return (
              <View key={m.dates[i]} accessible accessibilityLabel={`${fdate(m.dates[i])}: ${t(act ? 'rw2.s.active' : fz ? 'rw2.s.frozen' : 'rw2.s.missed')}`}
                style={{ width: (view === 7 ? '13%' : '15%') as any, flexGrow: 1, minWidth: view === 7 ? 38 : 40, alignItems: 'center', paddingVertical: 8, borderRadius: 12, borderWidth: isToday ? 2 : 1.5, borderColor: isToday ? c.red : act ? c.ok : fz ? SILVER : c.line, backgroundColor: act ? c.ok : fz ? c.bgAlt : 'transparent' }}>
                <Txt v="caption" color={act ? '#fff' : c.mute}>{view === 7 ? d.toLocaleDateString(locale, { weekday: 'short' }) : String(d.getDate())}</Txt>
                <Txt w="800" color={act ? '#fff' : c.mute}>{act ? '✓' : fz ? '❄' : '·'}</Txt>
              </View>
            );
          })}
        </View>
        <Txt v="caption" color={c.mute} style={{ marginTop: 12 }}>{t('rw2.s.p')}</Txt>
      </Card>
      <Card pad={16} style={{ marginTop: 10 }}>
        <Row gap={14} align="flex-start">
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.redT, alignItems: 'center', justifyContent: 'center' }}><Icon name="shield-checkmark" size={24} color={c.accent} /></View>
          <View style={{ flex: 1 }}>
            <Txt w="800">{t('rw2.s.freeze')}</Txt>
            <Txt v="small" color={c.mute} style={{ marginTop: 2 }}>{t('rw2.s.freeze.p')}</Txt>
            {m.freezeDay ? <Txt v="small" w="700" color={c.ok} style={{ marginTop: 10 }}>{t('rw2.s.freeze.used', { d: fdate(m.freezeDay) })}</Txt>
              : !missed.length ? <Txt v="small" color={c.mute} style={{ marginTop: 10 }}>{t('rw2.s.freeze.none')}</Txt>
                : (<><Gap h={10} /><Button title={t('rw2.s.freeze.use')} variant="ghost" small full={false} onPress={() => setFreezeOpen((x) => !x)} />
                  {freezeOpen ? (<><Txt v="caption" color={c.mute} style={{ marginTop: 10, marginBottom: 6 }}>{t('rw2.s.freeze.pick')}</Txt><Row gap={8} wrap>{missed.map((d) => <Chip key={d} label={fdate(d)} onPress={() => applyFreeze(d)} />)}</Row></>) : null}</>)}
          </View>
        </Row>
      </Card>
      <Txt v="label" w="800" style={{ marginTop: 18, marginBottom: 10 }}>{t('rw2.s.ms')}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {C.milestones.map((n) => { const ok = m.best >= n; return (
          <View key={n} style={{ width: '48%', flexGrow: 1, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line, padding: 14 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: ok ? c.ok : c.line, backgroundColor: ok ? c.ok : 'transparent', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Txt w="800" color={ok ? '#fff' : c.mute}>{ok ? '✓' : String(n)}</Txt></View>
            <Txt w="700">{t('rw2.s.ms.n', { n })}</Txt><Txt v="caption" color={c.mute}>{t('rw2.s.ms.bonus', { n: C.xp.streak[String(n)] })}</Txt>
          </View>); })}
      </View>
      <Row wrap gap={8} style={{ marginTop: 14 }}>
        {([['first', m.have >= 1], ['s3', m.best >= 3], ['s7', m.best >= 7], ['s14', m.best >= 14], ['s30', m.best >= 30], ['s60', m.best >= 60]] as [string, boolean][]).map(([id, ok]) => <Badge key={id} label={`${ok ? '✓ ' : ''}${t(`ach.${id}`)}`} tone={ok ? 'solid' : 'mute'} />)}
      </Row>

      {/* badges */}
      <H title={t('rw2.b.h')} sub={t('rw2.b.p')} />
      {cand ? (
        <Card pad={16}>
          <Row gap={14}>
            <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: tierColor(cand.tier + 1), alignItems: 'center', justifyContent: 'center' }}><Icon name={BADGE_ICON[cand.def.icon] ?? 'star-outline'} size={30} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Txt v="caption" color={c.mute}>{t('rw2.b.next')}</Txt>
              <Txt w="800">{t(`rw2.b.${cand.def.id}.n`)} ({tierName(cand.tier + 1)})</Txt>
              <Txt v="small" color={c.mute} style={{ marginBottom: 8 }}>{t(`rw2.b.${cand.def.id}.${cand.tier + 1}`)}</Txt>
              <Bar frac={nextFrac(cand)} />
              <Txt v="caption" color={c.mute} style={{ marginTop: 6 }}>{fmt(Math.min(cand.vals[cand.tier], cand.def.tiers[cand.tier].need), cand.vals[cand.tier] % 1 ? 1 : 0)} / {fmt(cand.def.tiers[cand.tier].need)} {t(`rw2.u.${cand.def.tiers[cand.tier].unit}`)} · {t('rw2.q.xp', { n: cand.def.tiers[cand.tier].xp })}</Txt>
            </View>
          </Row>
        </Card>
      ) : null}
      <Row gap={8} wrap style={{ marginVertical: 14 }}>{(['all', 'earned', 'progress', 'locked'] as const).map((f) => <Chip key={f} label={t(`rw2.f.${f}`)} on={bf === f} onPress={() => setBf(f)} />)}</Row>
      {list.length ? list.map((b) => {
        const tr = b.tier; const next = tr < 3 ? b.def.tiers[tr] : null; const val = next ? b.vals[tr] : b.def.tiers[2].need; const col = tr ? tierColor(tr) : c.mute; const open = openBadge === b.def.id;
        const shown = next ? `${fmt(Math.min(val, next.need), val % 1 ? 1 : 0)} / ${fmt(next.need)} ${t(`rw2.u.${next.unit}`)}` : t('rw2.b.max');
        return (
          <Card key={b.def.id} pad={16} onPress={() => setOpenBadge(open ? null : b.def.id)} style={{ marginBottom: 10, minHeight: 190, backgroundColor: tr ? undefined : c.bgAlt }}>
            <Row gap={14} align="flex-start">
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: tr ? col : 'transparent', borderWidth: 2, borderColor: tr ? col : c.mute, borderStyle: tr ? 'solid' : 'dashed', alignItems: 'center', justifyContent: 'center' }}><Icon name={BADGE_ICON[b.def.icon] ?? 'star-outline'} size={26} color={tr ? '#fff' : c.mute} /></View>
              <View style={{ flex: 1 }}>
                <Txt v="caption" w="700" color={c.mute}>{t(`rw2.cat.${b.def.category}`)}</Txt>
                <Txt w="800">{t(`rw2.b.${b.def.id}.n`)}</Txt>
                <Txt v="small" w="800" color={tr ? col : c.mute}>{tr ? tierName(tr) : t('rw2.t.none')}</Txt>
              </View>
              <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.mute} />
            </Row>
            <View style={{ marginTop: 12 }}><Bar frac={nextFrac(b)} color={tr ? col : c.mute} /></View>
            <Txt v="small" w="700" style={{ marginTop: 8 }}>{shown}</Txt>
            {next ? <Txt v="caption" color={c.mute}>{t('rw2.b.nexttier', { t: t(`rw2.b.${b.def.id}.${tr + 1}`) })}</Txt> : null}
            {tr ? <Txt v="caption" color={c.mute} style={{ marginTop: 4 }}>{t('rw2.b.earned', { d: fdate(b.dates[tr - 1] ?? '') })}</Txt> : null}
            {open ? (
              <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line, gap: 6 }}>
                {b.def.tiers.map((x, i) => (
                  <Txt key={i} v="small">
                    <Txt v="small" w="800" color={tierColor(i + 1)}>{tierName(i + 1)} </Txt>{t(`rw2.b.${b.def.id}.${i + 1}`)}
                    <Txt v="caption" color={c.mute}>{i < tr ? `  ✓ ${t('rw2.b.earned', { d: fdate(b.dates[i] ?? '') })}` : i === tr ? `  (${shown})` : `  (${t('rw2.st.locked')})`}</Txt>
                  </Txt>
                ))}
              </View>
            ) : null}
          </Card>
        );
      }) : <Txt color={c.mute}>{t('rw2.v.empty')}</Txt>}
      <Txt v="label" w="800" style={{ marginTop: 14, marginBottom: 10 }}>{t('rw2.b.hist')}</Txt>
      <Card pad={14}>
        {hist.length ? hist.map((h, i) => (
          <Row key={`${h.b.def.id}${h.tier}`} gap={12} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: tierColor(h.tier), alignItems: 'center', justifyContent: 'center' }}><Icon name={BADGE_ICON[h.b.def.icon] ?? 'star-outline'} size={18} color="#fff" /></View>
            <View style={{ flex: 1 }}><Txt w="700">{t(`rw2.b.${h.b.def.id}.n`)} <Txt v="small" w="800" color={tierColor(h.tier)}>{tierName(h.tier)}</Txt></Txt><Txt v="caption" color={c.mute}>{h.date ? fdate(h.date) : ''}</Txt></View>
            <Txt w="800" color={c.ok}>{t('rw2.q.xp', { n: h.xp })}</Txt>
          </Row>
        )) : <Txt color={c.mute}>{t('rw2.b.hist.none')}</Txt>}
      </Card>

      {/* levels and XP */}
      <H title={t('rw2.l.h')} />
      <Card pad={16}>
        {C.levels.map((l, i) => (
          <Row key={l.id} gap={14} align="flex-start" style={{ paddingBottom: i < C.levels.length - 1 ? 16 : 0 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: i <= m.li ? (i === m.li ? c.red : c.ok) : c.line, backgroundColor: i < m.li ? c.ok : c.surface, alignItems: 'center', justifyContent: 'center' }}><Txt w="800" color={i < m.li ? '#fff' : i === m.li ? c.accent : c.mute}>{i < m.li ? '✓' : String(i + 1)}</Txt></View>
            <View style={{ flex: 1 }}>
              <Txt w="800">{levelName(i)} <Txt v="caption" color={c.mute}>{t('rw2.l.at', { n: fmt(l.xp) })}{i === m.li ? ` · ${t('rw2.l.you')}` : ''}</Txt></Txt>
              <Txt v="small" color={c.mute}>{t(`rw2.l.u.${l.id}`)}</Txt>
            </View>
          </Row>
        ))}
      </Card>
      <Card pad={0} onPress={() => setXpOpen((x) => !x)} style={{ marginTop: 10 }}>
        <View style={{ padding: 16 }}>
          <Row style={{ justifyContent: 'space-between' }}><Txt w="800">{t('rw2.xp.h')}</Txt><Icon name={xpOpen ? 'chevron-up' : 'chevron-down'} size={18} color={c.mute} /></Row>
          {xpOpen ? (
            <View style={{ marginTop: 10, gap: 8 }}>
              {[t('rw2.xp.daily', { n: C.xp.activeDay }), t('rw2.xp.quest'), t('rw2.xp.badge'), t('rw2.xp.streak', { a: C.xp.streak['7'], b: C.xp.streak['14'], c: C.xp.streak['30'], d: C.xp.streak['60'] }), t('rw2.xp.wear', { n: C.xp.wearDay }), t('rw2.xp.ref', { n: C.xp.referral })].map((x) => <Row key={x} gap={8} align="flex-start"><Txt color={c.accent}>•</Txt><Txt v="small" style={{ flex: 1 }}>{x}</Txt></Row>)}
            </View>
          ) : null}
        </View>
      </Card>

      {/* reward vault */}
      <H title={t('rw2.v.h')} sub={t('rw2.v.p')} />
      <Row gap={8} wrap style={{ marginBottom: 12 }}>{(['all', 'unlocked', 'locked', 'events'] as const).map((f) => <Chip key={f} label={t(`rw2.v.${f}`)} on={vt === f} onPress={() => setVt(f)} />)}</Row>
      {vaultItems.length ? vaultItems.map(({ it, met, premOk, claimed, state }) => {
        const ev = it.kind === 'event'; const rt = reqText(it);
        return (
          <Card key={it.id} pad={14} style={{ marginBottom: 10, minHeight: 215, backgroundColor: state === 'locked' ? c.bgAlt : undefined }}>
            <Row gap={12} align="flex-start">
              <PartnerTile icon={it.icon} locked={state === 'locked'} />
              <View style={{ flex: 1 }}><Txt w="800">{t(`${it.k}.h`)}</Txt><Txt v="small" color={c.mute} style={{ marginTop: 2 }} numberOfLines={2}>{t(`${it.k}.p`)}</Txt></View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>{it.premium ? <Badge label={t('rw2.v.premium')} tone="gold" /> : null}<SampleTag label={t('rw2.sample')} /></View>
            </Row>
            <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{ev ? `${dateOff(it.off ?? 0)} · ${t(it.loc ?? '')}` : t('rw2.v.exp', { d: dateOff(60) })}</Txt>
            <Txt v="caption" w="700" color={c.mute} style={{ marginTop: 4 }}>{t('rw2.v.by', { x: rt ?? t('rw2.v.premium') })}</Txt>
            <View style={{ marginTop: 12, gap: 8, alignItems: 'flex-start' }}>
              {state === 'claimed' ? (ev ? <Txt w="800" color={c.ok}>✓ {t('rw2.v.joined')}</Txt> : <View><Txt w="800" color={c.ok}>✓ {t('rw2.v.claimed')}</Txt><Row gap={8} style={{ marginTop: 6 }}><Txt v="caption" color={c.mute}>{t('rw.code')}</Txt><Txt w="800" color={c.accent} style={{ letterSpacing: 1 }}>{claimed}</Txt></Row></View>)
                : state === 'open' ? <Button title={t(ev ? 'rw2.v.join' : 'rw2.v.claim')} small full={false} onPress={() => claim(it)} />
                  : (<>{!premOk ? <Button title={t('rw2.v.go')} small full={false} onPress={() => router.push('/premium-quote')} /> : null}{!met ? <Txt v="caption" color={c.mute}>{t('rw2.v.need', { x: rt ?? '' })}</Txt> : null}</>)}
            </View>
          </Card>
        );
      }) : <Txt color={c.mute}>{t('rw2.v.empty')}</Txt>}
      <Txt v="caption" color={c.mute}>{t('rw.note')}</Txt>
      <Txt v="caption" color={c.mute} style={{ marginTop: 4 }}>{t('rw.demo')}</Txt>

      {/* referral and friends */}
      <Card pad={16} style={{ marginTop: 24 }}>
        <Txt v="h3">{t('rw2.r.h')}</Txt>
        <Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t('rw2.r.p')}</Txt>
        {user?.refcode ? (
          <>
            <Row gap={10} style={{ marginTop: 12 }} wrap><Txt v="caption" color={c.mute}>{t('rw2.r.code')}</Txt><Txt w="800" color={c.accent} style={{ letterSpacing: 1 }}>{user.refcode}</Txt><Button title={t('rw.copy')} variant="soft" small full={false} onPress={async () => { tap(); await Clipboard.setStringAsync(user.refcode); toast(t('rw.copied')); }} /></Row>
            <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('rw2.r.count', { n: friends })}</Txt>
          </>
        ) : <><Gap h={12} /><Button title={t('rw2.r.login')} small full={false} onPress={() => router.push('/login')} /></>}
      </Card>
      <Card pad={16} style={{ marginTop: 10 }}>
        <Txt v="h3">{t('rw2.fc.h')}</Txt>
        <Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t('rw2.fc.p')}</Txt>
        <Row gap={10} style={{ marginTop: 12, justifyContent: 'space-between' }}><Txt w="600" style={{ flex: 1 }}>{t('rw2.fc.opt')}</Txt><Switch value={fc} onValueChange={(v) => { setFc(v); kv.set('pc_rw_fc', JSON.stringify(v)); }} trackColor={{ true: c.red, false: c.line }} thumbColor="#fff" accessibilityLabel={t('rw2.fc.opt')} /></Row>
        {fc ? (
          <View style={{ marginTop: 10 }}>
            {([[t('rw2.fc.you'), m.total], ...[1, 2, 3].map((n, i) => [t('rw2.fc.friend', { n }), [420, 180, 640][i]])] as [string, number][]).map(([name, xp], i) => (
              <Row key={name} gap={12} style={{ paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: i === 0 ? c.red : c.bgAlt, alignItems: 'center', justifyContent: 'center' }}><Txt w="800" color={i === 0 ? '#fff' : c.mute}>{name.charAt(0)}</Txt></View>
                <Txt w="700" style={{ flex: 1 }}>{name}</Txt><Txt w="700" color={c.mute}>{fmt(xp)} {t('rw2.xp')}</Txt>
              </Row>
            ))}
            <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('rw2.fc.note')}</Txt>
          </View>
        ) : null}
      </Card>
      {!premium ? (
        <Card tone="red" pad={16} style={{ marginTop: 10 }}>
          <Txt v="h3">{t('rw2.up.h')}</Txt>
          <Txt v="small" color={c.mute} style={{ marginTop: 4, marginBottom: 14 }}>{t('rw2.up.p')}</Txt>
          <Button title={t('rw2.up.cta')} icon="star" onPress={() => router.push('/premium-quote')} />
        </Card>
      ) : null}
      <Txt v="caption" color={c.mute} style={{ marginTop: 14 }}>{t('rw2.noprem')}</Txt>

      <Celebration show={celeb.n} badge={celeb.badge} onDone={() => setCeleb((x) => ({ ...x, n: 0 }))} />
    </Screen>
  );
}
