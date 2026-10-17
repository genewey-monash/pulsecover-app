import { WEIGHTS, quote, score as scoreOf, type Metrics, type Quote } from './pricing';

/** Premium Quote Results: scenario and coaching maths on top of the shared scoring engine (same rules as the website page). */
export type Factor = 'steps' | 'exercise' | 'sleep' | 'heart';
export const FACTORS: Factor[] = ['steps', 'exercise', 'sleep', 'heart'];
export const KEY: Record<Factor, keyof Metrics> = { steps: 'steps', exercise: 'exerciseMin', sleep: 'sleepHours', heart: 'restingHr' };
export const SAMPLE: Metrics = { steps: 6500, exerciseMin: 100, sleepHours: 6.5, restingHr: 68 };
export const BANDS = [{ g: 'A+', min: 90 }, { g: 'A', min: 75 }, { g: 'B', min: 60 }, { g: 'C', min: 40 }, { g: 'D', min: 25 }, { g: 'E', min: 0 }];

/** In-memory hand-over from the calculator (not in the URL), like sessionStorage on the website. */
export const pqHandoff: { value: (Metrics & { plan: string; from?: string }) | null } = { value: null };

const round = (v: number, step: number) => Math.round(v / step) * step;
export const withVal = (c: Metrics, f: Factor, v: number): Metrics => ({ ...c, [KEY[f]]: v });
export const calc = (c: Metrics, plan: string): Quote => quote(c, { plan });
export const fscore = (f: Factor, c: Metrics) => scoreOf(c).components[f];
export const status = (v: number): 'good' | 'ok' | 'low' => (v >= 80 ? 'good' : v >= 50 ? 'ok' : 'low');

/** Realistic, capped improvement target for a factor (null = already at the top of the score). */
export function fullTarget(f: Factor, c: Metrics): number | null {
  if (f === 'steps') return c.steps >= 8000 ? null : Math.min(8000, round(c.steps + 3000, 250));
  if (f === 'exercise') return c.exerciseMin >= 150 ? null : Math.min(150, round(c.exerciseMin + 60, 5));
  if (f === 'sleep') { if (c.sleepHours >= 7 && c.sleepHours <= 9) return null; return c.sleepHours < 7 ? Math.min(7.5, round(c.sleepHours + 1, 0.25)) : 8.5; }
  return c.restingHr <= 55 ? null : Math.max(55, c.restingHr - 5);
}

export interface Row { f: Factor; from: number; to: number | null; fscore: number; score: number; annual: number; saving: number }
export function scenarios(c: Metrics, plan: string) {
  const base = calc(c, plan); const rows: Row[] = [];
  for (const f of FACTORS) {
    const to = fullTarget(f, c);
    if (to === null) { rows.push({ f, from: c[KEY[f]], to: null, fscore: fscore(f, c), score: base.score, annual: base.annualPremium, saving: 0 }); continue; }
    const n = withVal(c, f, to); const q = calc(n, plan);
    rows.push({ f, from: c[KEY[f]], to, fscore: fscore(f, n), score: q.score, annual: q.annualPremium, saving: Math.max(0, Math.round((base.annualPremium - q.annualPremium) * 100) / 100) });
  }
  const top = rows.filter((r) => r.to !== null && r.saving > 0).sort((a, b) => b.saving - a.saving).slice(0, 3);
  let n = c; top.forEach((r) => { n = withVal(n, r.f, r.to as number); });
  const q = calc(n, plan);
  return { rows, base, best: { factors: top.map((r) => r.f), score: q.score, annual: q.annualPremium, saving: Math.max(0, Math.round((base.annualPremium - q.annualPremium) * 100) / 100) } };
}

export interface Goal { week: number; f: Factor; from: number; to: number; gain: number }
export function planGoals(c: Metrics, plan: string): Goal[] {
  const q = calc(c, plan);
  const gaps = FACTORS.map((f) => ({ f, gap: (100 - q.components[f]) * WEIGHTS[f] })).filter((g) => g.gap > 0 && fullTarget(g.f, c) !== null).sort((a, b) => b.gap - a.gap).slice(0, 2);
  if (!gaps.length) return [];
  const order = gaps.length === 2 ? [0, 1, 0, 1] : [0, 0, 0, 0]; const goals: Goal[] = []; let cum = { ...c }; const seen: Partial<Record<Factor, number>> = {};
  order.forEach((gi, i) => {
    const f = gaps[gi].f; const lvl = (seen[f] = (seen[f] ?? 0) + 1); const full = fullTarget(f, c) as number; const from = cum[KEY[f]]; let to: number;
    if (gaps.length === 1) to = from + ((full - from) * (i + 1)) / 4; else to = lvl === 1 ? from + (full - from) / 2 : full;
    const st = f === 'steps' ? 250 : f === 'exercise' ? 5 : f === 'sleep' ? 0.25 : 1;
    to = round(to, st); if ((full > from && to > full) || (full < from && to < full)) to = full;
    if (to === from) to = full;
    const before = scoreOf(cum).score; cum = withVal(cum, f, to); const after = scoreOf(cum).score;
    goals.push({ week: i + 1, f, from, to, gain: Math.max(0, after - before) });
  });
  return goals;
}

function mulberry(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Deterministic SAMPLE history of daily scores around the inputs (null = no wearable data that day). */
export function sampleSeries(c: Metrics): (number | null)[] {
  const r = mulberry(Math.round(c.steps + c.exerciseMin * 3 + c.sleepHours * 100 + c.restingHr * 7)); const out: (number | null)[] = [];
  for (let i = 0; i < 90; i++) {
    const drift = ((i - 90) / 90) * 0.05;
    const m = { steps: c.steps * (0.82 + r() * 0.36 + drift), exerciseMin: c.exerciseMin * (0.8 + r() * 0.4 + drift), sleepHours: c.sleepHours + (r() - 0.5) * 1.2, restingHr: c.restingHr + (r() - 0.5) * 6 - drift * 40 };
    out.push(r() < 0.13 ? null : scoreOf(m).score);
  }
  return out;
}
