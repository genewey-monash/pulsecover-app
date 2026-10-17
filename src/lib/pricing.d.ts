export type PlanId = 'A' | 'B' | 'C' | 'D';
export interface Plan { id: PlanId; base: number; cover: number; type: 'individual' | 'family'; isNew: boolean }
export interface Metrics { steps: number; exerciseMin: number; sleepHours: number; restingHr: number }
export interface Quote {
  base: number; band: number; score: number; grade: string;
  components: { steps: number; exercise: number; sleep: number; heart: number };
  adjustmentPct: number; annualPremium: number; monthlyPremium: number; savings: number;
  appSubscriptionAnnual: number; totalAnnual: number;
}
export const GRADES: { g: string; min: number }[];
export const PLANS: Record<PlanId, Plan>;
export const BAND: number;
export const WEIGHTS: { steps: number; exercise: number; sleep: number; heart: number };
export const APP_SUB_MONTHLY: number;
export function adjustment(score: number): number;
export function score(m: Partial<Metrics>): { score: number; components: Quote['components'] };
export function gradeOf(score: number): string;
export function planOf(id?: string): Plan;
export function quote(m: Partial<Metrics>, opts?: { plan?: string; appSubscription?: boolean }): Quote;
export function averageMetrics(list: Partial<Metrics>[]): Metrics;
export function smeQuote(employees: number, avgScore: number): { employees: number; avgScore: number; adjustmentPct: number; bulkDiscountPct: number; perEmployeeAnnual: number; totalAnnual: number; savingsVsFlat: number };
export function clamp(v: number, a: number, b: number): number;
export function num(v: unknown, d: number): number;
