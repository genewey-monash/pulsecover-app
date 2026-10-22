'use strict';
// PulseCover pricing engine (shared by server, website and app). ONE SOURCE OF TRUTH for every price and discount rule.
// Change numbers in CONFIG only: every page, the API and the app read the values derived from it.
const round2 = (v) => Math.round(v * 100) / 100;
const CONFIG = {
  // Premium subscription (illustrative). Yearly is entered as a price; the monthly total, saving and percentage are derived below.
  subscription: { monthly: 14.9, yearly: 125 },
  // Base premiums per year (illustrative): Individual per person, Family per member (up to familyMaxMembers, slightly cheaper than Individual).
  // Business has NO fixed price: it is custom pricing quoted by the team, so there is nothing to put here.
  base: { individual: 950, family: 900 },
  // Wearable discount: no discount at a score of discountFromScore or below, rising in a straight line to maxDiscount at a score of 100.
  discountFromScore: 50,
  maxDiscount: 0.20,
  familyMaxMembers: 6
};
const SUB = (() => {
  const monthly = CONFIG.subscription.monthly, yearly = CONFIG.subscription.yearly;
  const monthlyTotal = round2(monthly * 12), saving = round2(monthlyTotal - yearly);
  return { monthly, yearly, monthlyTotal, saving, savingPct: Math.round((saving / monthlyTotal) * 100), effectiveMonthly: round2(yearly / 12) };
})();
const subscriptionPrice = (billing) => (billing === 'monthly' ? SUB.monthly : SUB.yearly);   // price charged each period
const subscriptionAnnualCost = (billing) => (billing === 'monthly' ? SUB.monthlyTotal : SUB.yearly); // what a year of Premium costs
const BASE_PREMIUM = CONFIG.base.individual;
const BAND = CONFIG.maxDiscount;
// Placeholder plans (names/coverage are example values to be replaced). Base premium comes from the plan type.
const PLANS = {
  A: { id: 'A', base: CONFIG.base.individual, cover: 100000, type: 'individual', isNew: true },
  B: { id: 'B', base: 1050, cover: 250000, type: 'individual', isNew: false },
  C: { id: 'C', base: CONFIG.base.family, cover: 500000, type: 'family', isNew: false },
  D: { id: 'D', base: 1000, cover: 1000000, type: 'family', isNew: true }
};
const planOf = (id) => PLANS[id] || PLANS.A;
const APP_SUB_MONTHLY = CONFIG.subscription.monthly; // paid Premium Subscription tier (kept for older callers)

const money = (n) => Number(n).toLocaleString('en-US'); // 1000 -> "1,000"
// Values that text strings can use as {tokens}, so wording never hard-codes a price or percentage.
const tokens = () => ({
  maxPct: String(Math.round(CONFIG.maxDiscount * 100)), indBase: money(CONFIG.base.individual), famBase: money(CONFIG.base.family),
  subMonthly: SUB.monthly.toFixed(2), subYearly: String(SUB.yearly), subMonthlyTotal: SUB.monthlyTotal.toFixed(2), subSaving: SUB.saving.toFixed(2), subPct: String(SUB.savingPct), subEff: SUB.effectiveMonthly.toFixed(2),
  famMax: String(CONFIG.familyMaxMembers)
});

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);

// Each component scored 0-100. Moderate sustainable activity (e.g. walking) is rewarded.
function components(m) {
  const steps = clamp(num(m.steps, 0) / 8000, 0, 1) * 100;
  const exercise = clamp(num(m.exerciseMin, 0) / 150, 0, 1) * 100;
  const sleepH = num(m.sleepHours, 0);
  const sleep = sleepH >= 7 && sleepH <= 9 ? 100 : sleepH <= 0 ? 0 : clamp(100 - Math.abs(sleepH - 8) * 25 + 25, 0, 100);
  const hr = num(m.restingHr, 70);
  const heart = clamp(((90 - hr) / (90 - 55)) * 100, 0, 100);
  return { steps, exercise, sleep, heart };
}
const WEIGHTS = { steps: 0.25, exercise: 0.25, sleep: 0.20, heart: 0.30 }; // resting heart rate 30%, steps 25%, exercise 25%, sleep 20%

function score(m) {
  const c = components(m);
  const s = c.steps * WEIGHTS.steps + c.exercise * WEIGHTS.exercise + c.sleep * WEIGHTS.sleep + c.heart * WEIGHTS.heart;
  return { score: Math.round(s), components: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v)])) };
}

// Score at or below discountFromScore (50) = 0% discount, rising in a straight line to -maxDiscount (20%) at a score of 100. Never a surcharge.
function adjustment(sc) {
  const from = CONFIG.discountFromScore;
  if (sc <= from) return 0;
  return -clamp((sc - from) / (100 - from), 0, 1) * CONFIG.maxDiscount;
}

// CTOS-style grade bands for the PulseCover Risk Rating (score 0-100 -> grade).
const GRADES = [
  { g: 'A+', min: 90 }, { g: 'A', min: 75 }, { g: 'B', min: 60 }, { g: 'C', min: 40 }, { g: 'D', min: 25 }, { g: 'E', min: 0 }
];
const gradeOf = (sc) => (GRADES.find((x) => sc >= x.min) || GRADES[GRADES.length - 1]).g;

function quote(m, opts = {}) {
  const { score: sc, components: comp } = score(m);
  const adj = adjustment(sc);
  const base = planOf(opts.plan).base;
  const premium = Math.round(base * (1 + adj) * 100) / 100;
  const sub = opts.appSubscription ? APP_SUB_MONTHLY * 12 : 0;
  return {
    base, band: BAND, score: sc, grade: gradeOf(sc), components: comp, adjustmentPct: Math.round(adj * 1000) / 10,
    annualPremium: premium, monthlyPremium: Math.round((premium / 12) * 100) / 100,
    savings: Math.round((base - premium) * 100) / 100, appSubscriptionAnnual: sub,
    totalAnnual: Math.round((premium + sub) * 100) / 100
  };
}

// Annual renewal uses the average of the last metrics (rolling average) so one bad month cannot spike the premium.
function averageMetrics(list) {
  if (!list.length) return { steps: 0, exerciseMin: 0, sleepHours: 0, restingHr: 70 };
  const sum = list.reduce((a, m) => ({
    steps: a.steps + num(m.steps, 0), exerciseMin: a.exerciseMin + num(m.exerciseMin, 0),
    sleepHours: a.sleepHours + num(m.sleepHours, 0), restingHr: a.restingHr + num(m.restingHr, 70)
  }), { steps: 0, exerciseMin: 0, sleepHours: 0, restingHr: 0 });
  const n = list.length;
  // Stored days hold daily exercise minutes; scoring uses weekly minutes (150/week target), so convert here.
  return { steps: sum.steps / n, exerciseMin: (sum.exerciseMin / n) * 7, sleepHours: sum.sleepHours / n, restingHr: sum.restingHr / n };
}

// ---- Improvement scenarios (shared by the plan results, the Premium Quote page and the app): realistic, capped targets ----
const FACTOR_KEY = { steps: 'steps', exercise: 'exerciseMin', sleep: 'sleepHours', heart: 'restingHr' };
const snap = (v, step) => Math.round(v / step) * step;
function fullTarget(f, c) { // null = already at the top of the score for this habit
  if (f === 'steps') return c.steps >= 8000 ? null : Math.min(8000, snap(c.steps + 3000, 250));
  if (f === 'exercise') return c.exerciseMin >= 150 ? null : Math.min(150, snap(c.exerciseMin + 60, 5));
  if (f === 'sleep') { if (c.sleepHours >= 7 && c.sleepHours <= 9) return null; return c.sleepHours < 7 ? Math.min(7.5, snap(c.sleepHours + 1, 0.25)) : 8.5; }
  return c.restingHr <= 55 ? null : Math.max(55, c.restingHr - 5);
}
function improvementPlan(m, planId) {
  const c = { steps: num(m.steps, 0), exerciseMin: num(m.exerciseMin, 0), sleepHours: num(m.sleepHours, 0), restingHr: num(m.restingHr, 70) };
  const withVal = (o, f, v) => Object.assign({}, o, { [FACTOR_KEY[f]]: v });
  const base = quote(c, { plan: planId }), rows = [];
  for (const f of ['steps', 'exercise', 'sleep', 'heart']) {
    const to = fullTarget(f, c);
    if (to === null) { rows.push({ f, from: c[FACTOR_KEY[f]], to: null, fscore: score(c).components[f], score: base.score, annual: base.annualPremium, saving: 0 }); continue; }
    const n = withVal(c, f, to), q = quote(n, { plan: planId });
    rows.push({ f, from: c[FACTOR_KEY[f]], to, fscore: score(n).components[f], score: q.score, annual: q.annualPremium, saving: Math.max(0, round2(base.annualPremium - q.annualPremium)) });
  }
  const top = rows.filter((r) => r.to !== null && r.saving > 0).sort((a, b) => b.saving - a.saving).slice(0, 3);
  let n = c; top.forEach((r) => { n = withVal(n, r.f, r.to); });
  const q = quote(n, { plan: planId });
  // saving = extra saving from improving; total = everything saved versus the flat base premium after improving (what the net-saving card uses)
  return { rows, base, best: { factors: top.map((r) => r.f), score: q.score, annual: q.annualPremium, saving: Math.max(0, round2(base.annualPremium - q.annualPremium)), totalSaving: Math.max(0, round2(q.base - q.annualPremium)) } };
}

module.exports = { improvementPlan, fullTarget, CONFIG, SUB, subscriptionPrice, subscriptionAnnualCost, tokens, WEIGHTS, GRADES, gradeOf, PLANS, planOf, BASE_PREMIUM, BAND, APP_SUB_MONTHLY, score, adjustment, quote, averageMetrics, clamp, num };
