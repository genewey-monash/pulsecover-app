'use strict';
// PulseCover pricing engine (shared by server). Source: BMC workbook + report.
// Base premium RM600/yr, annual wearable-linked repricing within +/-15%.
const BASE_PREMIUM = 600;
const BAND = 0.15;
const COMMISSION = 0.25;
// Placeholder plans (names/coverage are example values to be replaced). Plan A matches the report: RM600 base, term life + health rider.
const PLANS = {
  A: { id: 'A', base: 600, cover: 100000, type: 'individual', buy: ['online'], isNew: true },
  B: { id: 'B', base: 900, cover: 250000, type: 'individual', buy: ['online', 'advisor'], isNew: false },
  C: { id: 'C', base: 1500, cover: 500000, type: 'family', buy: ['advisor'], isNew: false },
  D: { id: 'D', base: 2400, cover: 1000000, type: 'family', buy: ['advisor'], isNew: true }
};
const planOf = (id) => PLANS[id] || PLANS.A;
const APP_SUB_MONTHLY = 5;

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
const WEIGHTS = { steps: 0.35, exercise: 0.30, sleep: 0.20, heart: 0.15 };

function score(m) {
  const c = components(m);
  const s = c.steps * WEIGHTS.steps + c.exercise * WEIGHTS.exercise + c.sleep * WEIGHTS.sleep + c.heart * WEIGHTS.heart;
  return { score: Math.round(s), components: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v)])) };
}

// Score 50 = neutral (0%). 100 = -15%. 0 = +15%.
function adjustment(sc) {
  return clamp(-((sc - 50) / 50) * BAND, -BAND, BAND);
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

// SME group: per-employee base, discount tied to aggregate activity score (max 15% like individuals)
function smeQuote(employees, avgScore) {
  const n = Math.max(1, Math.floor(num(employees, 1)));
  const sc = clamp(num(avgScore, 50), 0, 100);
  const adj = adjustment(sc);
  const bulk = n >= 100 ? 0.05 : n >= 50 ? 0.03 : n >= 10 ? 0.02 : 0;
  const perEmp = BASE_PREMIUM * (1 + adj) * (1 - bulk);
  return {
    employees: n, avgScore: sc, adjustmentPct: Math.round(adj * 1000) / 10, bulkDiscountPct: bulk * 100,
    perEmployeeAnnual: Math.round(perEmp * 100) / 100, totalAnnual: Math.round(perEmp * n * 100) / 100,
    savingsVsFlat: Math.round((BASE_PREMIUM * n - perEmp * n) * 100) / 100
  };
}

// Financial model from the BMC workbook (for the investor page)
function financials() {
  const fixedMonthly = 8000 + 9000 + 9000 + 6000 + 6000 + 3500 + 6000 + 7000 + 1500 + 4000 + 3000 + 800 + 700 + 500 + 300 + 2000 + 3000;
  const variableMonthly = 100 * 417 + 5 * 417 + 0.42 * 5000 + 2 * 417 + 0.6 * 5000 + 50 * 16.7 + 5 * 417;
  const revenue = 5000 * 600 * 0.25 + 5000 * 0.2 * 60;
  const cost = fixedMonthly * 12 + variableMonthly * 12;
  const revPer = 600 * 0.25 + 0.2 * 60;
  const varPer = 100 + 5 + 5 + (0.42 + 0.6) * 12 + 2 + 0.04 * 50;
  const cm = revPer - varPer;
  return {
    fixedMonthly, variableMonthly: Math.round(variableMonthly), fixedAnnual: fixedMonthly * 12, revenue,
    totalCost: Math.round(cost), profit: Math.round(revenue - cost), revPerPolicy: revPer, varPerPolicy: Math.round(varPer * 100) / 100,
    contributionMargin: Math.round(cm * 100) / 100, breakevenPolicies: Math.round((fixedMonthly * 12) / cm)
  };
}

module.exports = { GRADES, gradeOf, PLANS, planOf, BASE_PREMIUM, BAND, COMMISSION, APP_SUB_MONTHLY, score, adjustment, quote, averageMetrics, smeQuote, financials, clamp, num };
