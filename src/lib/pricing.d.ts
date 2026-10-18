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
export function clamp(v: number, a: number, b: number): number;
export function num(v: unknown, d: number): number;

export interface Config { subscription: { monthly: number; yearly: number }; base: { individual: number; family: number }; discountFromScore: number; maxDiscount: number; familyMaxMembers: number }
export const CONFIG: Config;
export const SUB: { monthly: number; yearly: number; monthlyTotal: number; saving: number; savingPct: number; effectiveMonthly: number };
export type Billing = 'monthly' | 'yearly';
export function subscriptionPrice(b: Billing): number;
export function subscriptionAnnualCost(b: Billing): number;
export function tokens(): Record<string, string>;
export interface ImprovementRow { f: 'steps' | 'exercise' | 'sleep' | 'heart'; from: number; to: number | null; fscore: number; score: number; annual: number; saving: number }
export function fullTarget(f: 'steps' | 'exercise' | 'sleep' | 'heart', c: Metrics): number | null;
export function improvementPlan(m: Partial<Metrics>, planId?: string): { rows: ImprovementRow[]; base: Quote; best: { factors: string[]; score: number; annual: number; saving: number; totalSaving: number } };
