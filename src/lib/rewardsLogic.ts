import catalog from './rewards-catalog.json';

/** Rewards maths (XP, levels, quests, streaks, badges, vault). Same rules as public/js/rewards.js on the website;
 *  every threshold comes from rewards-catalog.json, which is copied from the website's data/rewards-catalog.json. */
export interface Rec { day: string; steps: number; exerciseMin: number; sleepHours: number; restingHr: number }
export interface Tier { metric: string; param: number; need: number; unit: string; xp: number }
export interface BadgeDef { id: string; category: string; icon: string; tiers: Tier[] }
export interface QuestDef { id: string; period: 'day' | 'week'; metric: string; goal: number; unit: string; xp: number; minLevel?: string }
export interface VaultDef { id: string; kind: 'coupon' | 'exclusive' | 'event'; premium?: boolean; brand: string; ic: string; k: string; loc?: string; off?: number; req: { badge?: string; tier?: number; level?: string } | null }
export const C = catalog as unknown as {
  activeRule: { steps: number; exerciseMin: number }; levels: { id: string; xp: number }[];
  xp: { activeDay: number; wearDay: number; referral: number; streak: Record<string, number> }; milestones: number[];
  badges: BadgeDef[]; quests: QuestDef[]; vault: VaultDef[];
};

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addD = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
export const monday = (d: Date) => addD(d, -((d.getDay() + 6) % 7));
const hashS = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed: number) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** Clearly labelled SAMPLE history: 90 days, modest habits, a recent active run, today partly done. */
export function sampleRecords(): Rec[] {
  const r = rng(20260317); const out: Rec[] = []; const t = today();
  for (let i = 89; i >= 0; i--) {
    const d = addD(t, -i);
    if (i > 0 && r() < 0.07) continue;
    const f = (89 - i) / 89; const wk = d.getDay() % 6 === 0 ? 0.8 : 1.05;
    const rec: Rec = { day: ymd(d), steps: Math.round((5300 + 1500 * f) * wk * (0.72 + r() * 0.56)), exerciseMin: Math.round((11 + 5 * f) * wk * (0.5 + r() * 1.0)), sleepHours: Math.round((6.2 + 0.5 * f + (r() - 0.5) * 1.4) * 10) / 10, restingHr: Math.round(70 - 4 * f + (r() - 0.5) * 4) };
    if (i >= 1 && i <= 5) rec.steps = Math.max(rec.steps, 8100 + Math.round(r() * 1500));
    if (i === 0) { rec.steps = Math.round(rec.steps * 0.6); rec.exerciseMin = Math.round(rec.exerciseMin * 0.5); }
    out.push(rec);
  }
  return out;
}
export function denseOf(recs: Rec[]) {
  const map: Record<string, Rec> = {}; recs.forEach((m) => { map[m.day] = m; });
  const t = today(); const days: (Rec | null)[] = []; const dates: string[] = [];
  for (let i = 89; i >= 0; i--) { const k = ymd(addD(t, -i)); dates.push(k); days.push(map[k] ?? null); }
  return { days, dates };
}

export const isActive = (r: Rec | null) => !!r && (r.steps >= C.activeRule.steps || r.exerciseMin >= C.activeRule.exerciseMin);
export function streaks(days: (Rec | null)[], dates: string[], freezeDay: string | null) {
  const act = days.map((r, i) => isActive(r) || (!!freezeDay && dates[i] === freezeDay));
  let best = 0, run = 0; act.forEach((a) => { run = a ? run + 1 : 0; if (run > best) best = run; });
  let i = act.length - 1; if (!act[i]) i--; let cur = 0; while (i >= 0 && act[i]) { cur++; i--; }
  return { cur, best, act };
}
const blocks = (days: (Rec | null)[]) => { const out: (Rec | null)[][] = []; for (let end = days.length; end - 7 >= 0; end -= 7) out.unshift(days.slice(end - 7, end)); return out; };
const bestRun = <T,>(arr: T[], ok: (x: T) => boolean) => { let b = 0, r = 0; arr.forEach((x) => { r = ok(x) ? r + 1 : 0; if (r > b) b = r; }); return b; };
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const exSum = (b: (Rec | null)[]) => b.reduce((s, r) => s + (r ? r.exerciseMin : 0), 0);
interface Ctx { days: (Rec | null)[]; dates: string[]; friends: number; freeze: string | null; streakBest: number; xpBase: number }
function metricValue(m: string, param: number, ctx: Ctx): number {
  const days = ctx.days; const have = days.filter((r): r is Rec => !!r);
  switch (m) {
    case 'daysSteps': return have.filter((r) => r.steps >= param).length;
    case 'daysSleep': return have.filter((r) => r.sleepHours >= param).length;
    case 'hrDays': return have.filter((r) => r.restingHr > 0).length;
    case 'daysConnected': return have.length;
    case 'weekExerciseBest': return Math.max(0, ...blocks(days).map(exSum));
    case 'weeksExerciseRun': return bestRun(blocks(days), (b) => exSum(b) >= param);
    case 'weekWearBest': return Math.max(0, ...blocks(days).map((b) => b.filter(Boolean).length));
    case 'weeksWearRun': return bestRun(blocks(days), (b) => b.filter(Boolean).length >= param);
    case 'hrImprove': {
      if (days.length < param - 2) return 0;
      const seg = days.slice(-param).filter((r): r is Rec => !!r && r.restingHr > 0).map((r) => r.restingHr);
      if (seg.length < 14) return 0;
      return Math.max(0, Math.round((avg(seg.slice(0, 7)) - avg(seg.slice(-7))) * 10) / 10);
    }
    case 'streakBest': return Math.max(ctx.streakBest || 0, streaks(days, ctx.dates, ctx.freeze).best);
    case 'friends': return ctx.friends;
    case 'xpBase': return ctx.xpBase;
  }
  return 0;
}
const REPLAYABLE = new Set(['daysSteps', 'daysSleep', 'hrDays', 'daysConnected', 'weekExerciseBest', 'weeksExerciseRun', 'weekWearBest', 'weeksWearRun', 'hrImprove', 'streakBest']);

export interface RState { ledger: Record<string, number>; seen: Record<string, string>; freeze: { week: string; day: string } | null }
export interface BadgeState { def: BadgeDef; vals: number[]; tier: number; dates: (string | null)[] }
export interface Model {
  cur: number; best: number; activeDays: number; have: number; total: number; li: number; badges: BadgeState[];
  xp: { daily: number; wear: number; streak: number; ref: number; quest: number; badge: number }; freezeDay: string | null;
  days: (Rec | null)[]; dates: string[];
}
export const freezeDayOf = (f: RState['freeze']) => (f && f.week === ymd(monday(today())) ? f.day : null);
export const lvIdx = (id: string) => C.levels.findIndex((l) => l.id === id);

export function compute(days: (Rec | null)[], dates: string[], friends: number, serverStreak: { streak: number; best: number } | null, st: RState): Model {
  const fz = freezeDayOf(st.freeze);
  const ctx0: Ctx = { days, dates, friends, freeze: fz, streakBest: serverStreak?.best ?? 0, xpBase: 0 };
  const s = streaks(days, dates, fz); const have = days.filter(Boolean).length;
  const best = Math.max(s.best, ctx0.streakBest); const cur = Math.max(s.cur, serverStreak?.streak ?? 0);
  const activeDays = days.filter(isActive).length;
  const xp = { daily: activeDays * C.xp.activeDay, wear: have * C.xp.wearDay, streak: 0, ref: friends * C.xp.referral, quest: 0, badge: 0 };
  C.milestones.forEach((n) => { if (best >= n) xp.streak += C.xp.streak[String(n)]; });
  Object.values(st.ledger).forEach((v) => { xp.quest += v; });
  const badges: BadgeState[] = C.badges.map((b) => {
    const vals: number[] = []; let earned = 0; let prevOk = true;
    b.tiers.forEach((t, i) => {
      if (b.id === 'lvl') { vals.push(0); return; }
      const v = metricValue(t.metric, t.param, ctx0); vals.push(v);
      if (prevOk && v >= t.need) earned = i + 1; else prevOk = false;
    });
    return { def: b, vals, tier: earned, dates: [] };
  });
  badges.forEach((b) => { if (b.def.id !== 'lvl') for (let i = 0; i < b.tier; i++) xp.badge += b.def.tiers[i].xp; });
  const xpBase = xp.daily + xp.wear + xp.streak + xp.ref + xp.quest + xp.badge;
  const lvl = badges.find((b) => b.def.id === 'lvl')!;
  let pv = true; lvl.def.tiers.forEach((t, i) => { lvl.vals[i] = xpBase; if (pv && xpBase >= t.need) lvl.tier = i + 1; else pv = false; });
  const lvXp = lvl.def.tiers.slice(0, lvl.tier).reduce((a, t) => a + t.xp, 0); xp.badge += lvXp;
  const total = xpBase + lvXp; let li = 0; C.levels.forEach((l, i) => { if (total >= l.xp) li = i; });
  badges.forEach((b) => {
    b.def.tiers.forEach((t, i) => {
      if (i >= b.tier) { b.dates.push(null); return; }
      let d: string | null = null;
      if (REPLAYABLE.has(t.metric)) {
        for (let k = 1; k <= days.length; k++) {
          if (metricValue(t.metric, t.param, { days: days.slice(0, k), dates: dates.slice(0, k), friends: 0, freeze: fz, streakBest: 0, xpBase: 0 }) >= t.need) { d = dates[k - 1]; break; }
        }
      }
      b.dates.push(d ?? st.seen[`${b.def.id}:${i + 1}`] ?? ymd(today()));
    });
  });
  return { cur, best, activeDays, have, total, li, badges, xp, freezeDay: fz, days, dates };
}

export function questProgress(q: QuestDef, m: Model): number {
  const t = today(); const tk = ymd(t); const mk = ymd(monday(t)); let todayRec: Rec | null = null; const week: (Rec | null)[] = [];
  m.days.forEach((r, i) => { if (m.dates[i] === tk) todayRec = r; if (m.dates[i] >= mk) week.push(r); });
  switch (q.metric) {
    case 'stepsToday': return todayRec ? (todayRec as Rec).steps : 0;
    case 'sleepToday': return todayRec ? (todayRec as Rec).sleepHours : 0;
    case 'exerciseWeek': return exSum(week);
    case 'sleepNightsWeek': return week.filter((r) => r && r.sleepHours >= 7).length;
    case 'wearDaysWeek': return week.filter(Boolean).length;
  }
  return 0;
}
export const periodKey = (q: QuestDef) => { const t = today(); return `${q.id}@${q.period === 'day' ? ymd(t) : ymd(monday(t))}`; };
export function resetIn(period: 'day' | 'week') {
  const now = new Date(); const end = period === 'day' ? addD(today(), 1) : addD(monday(today()), 7); const ms = Math.max(0, end.getTime() - now.getTime());
  const m = Math.floor(ms / 60000); const d = Math.floor(m / 1440); const h = Math.floor((m % 1440) / 60);
  return d ? `${d}d ${h}h` : `${h}h ${m % 60}m`;
}
export function reqMet(it: VaultDef, m: Model) {
  const r = it.req; if (!r) return true;
  if (r.level) return m.li >= lvIdx(r.level);
  const b = m.badges.find((x) => x.def.id === r.badge)!; return b.tier >= (r.tier ?? 1);
}
export const codeFor = (it: VaultDef, who: string, serverCode?: string | null) => serverCode || `PC-${it.id.toUpperCase().slice(0, 4)}-${('000000' + (hashS(who + it.id) % 1679616).toString(36)).slice(-6).toUpperCase()}`;
