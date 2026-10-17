import { averageMetrics, gradeOf, quote, score } from './pricing';
import type { Dashboard, Week } from './data';

/** A guest can connect a wearable without an account. The 28 days of readings are simulated on the phone
 *  (same idea as the server's demo connector) and are sent to the server only after the person logs in. */
export interface GuestState { providers: string[]; seed: string }

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed: number) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const newSeed = () => Math.random().toString(36).slice(2, 10);

export function guestDash(g: GuestState): Dashboard {
  const r0 = rng(hash(g.seed));
  const base = { steps: 5500 + r0() * 5500, ex: 60 + r0() * 110, sl: 6.2 + r0() * 2, hr: 54 + r0() * 18 };
  const days: { day: string; steps: number; exerciseMin: number; sleepHours: number; restingHr: number }[] = [];
  const today = new Date(); today.setHours(12, 0, 0, 0);
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const r = rng(hash(g.seed + iso(d)));
    const wk = d.getDay() % 6 === 0 ? 0.85 : 1.05;
    days.push({
      day: iso(d), steps: Math.round(base.steps * wk * (0.75 + r() * 0.5)), exerciseMin: Math.round((base.ex / 7) * wk * (0.6 + r() * 0.9)),
      sleepHours: Math.round((base.sl + (r() - 0.5)) * 10) / 10, restingHr: Math.round(base.hr + (r() - 0.5) * 6),
    });
  }
  const avg = averageMetrics(days);
  const sc = score(avg).score;
  const weeks = new Map<string, typeof days>();
  for (const m of days) {
    const d = new Date(m.day + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = iso(d); if (!weeks.has(k)) weeks.set(k, []); weeks.get(k)!.push(m);
  }
  const weekly: Week[] = [...weeks.entries()].slice(-8).map(([start, list]) => {
    const a = averageMetrics(list); const s = score(a).score;
    return { start, days: list.length, steps: Math.round(a.steps), exerciseMin: Math.round(a.exerciseMin), sleepHours: Math.round(a.sleepHours * 10) / 10, restingHr: Math.round(a.restingHr), score: s, grade: gradeOf(s) };
  });
  const now = new Date().toISOString();
  return {
    user: { id: 0, name: 'Guest', email: '', dob: '', lang: 'en', refcode: '', phone: '', address: '' },
    policy: null,
    metrics: days.map((m) => ({ day: m.day, steps: m.steps, score: score(m).score, exerciseMin: m.exerciseMin, sleepHours: m.sleepHours, restingHr: m.restingHr })),
    projected: quote(avg, {}), score30: sc, grade: gradeOf(sc), weekly,
    connections: g.providers.map((p) => ({ provider: p, connected_at: now, last_sync: now })),
    paused: null, claims: [], referrals: 0, ranking: [],
  };
}
