import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, Gap, Icon, Row, Sheet, Txt, tap } from './ui';
import { useI18n } from '../lib/i18n';
import { improvementPlan, quote, SUB, type Billing, type Metrics } from '../lib/pricing';
import { addPeriod, annualCost, useSub } from '../lib/subscription';
import { rm } from '../lib/data';
import { radius, useTheme } from '../lib/theme';

const rm0 = (n: number) => rm(n, Number.isInteger(n) ? 0 : 2);
const noSpace = (s: string) => s.replace(/ /g, '');
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function useFdate() {
  const { lang } = useI18n(); const loc = lang === 'zh' ? 'zh-CN' : lang === 'ms' ? 'ms-MY' : lang === 'ta' ? 'ta-IN' : 'en-MY';
  return (s: string) => { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' }); };
}
export function priceLabel(b: Billing, t: (k: string) => string) { return b === 'monthly' ? `${noSpace(rm(SUB.monthly))}/${t('sb.mo')}` : `${noSpace(rm0(SUB.yearly))}/${t('sb.yr')}`; }

/** Monthly / Yearly toggle. */
export function BillingToggle({ value, onChange }: { value: Billing; onChange: (b: Billing) => void }) {
  const { t } = useI18n(); const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('sb.toggle.aria')} style={{ flexDirection: 'row', alignSelf: 'flex-start', padding: 3, borderRadius: radius.pill, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.bgAlt, gap: 2 }}>
      {(['monthly', 'yearly'] as Billing[]).map((b) => {
        const on = value === b;
        return (
          <Pressable key={b} onPress={() => { tap(); onChange(b); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, minHeight: 38, borderRadius: radius.pill, backgroundColor: on ? c.red : 'transparent' }}>
            <Txt v="label" w="700" color={on ? '#fff' : c.mute}>{t(b === 'yearly' ? 'sb.yearly' : 'sb.monthly')}</Txt>
            {b === 'yearly' ? <View style={{ backgroundColor: c.gold, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 1 }}><Txt v="caption" w="800" color="#2b2100">{t('sb.save')}</Txt></View> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Price for the chosen billing option: Yearly shows Save 30%, Best value, the monthly total crossed out and the per-month line. */
export function PriceBlock({ billing, onSwitch }: { billing: Billing; onSwitch?: (b: Billing) => void }) {
  const { t } = useI18n(); const { c } = useTheme();
  if (billing === 'yearly') return (
    <View style={{ marginTop: 12 }}>
      <Row gap={8} wrap style={{ marginBottom: 8 }}>
        <View style={{ backgroundColor: c.ok, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 3 }}><Txt v="caption" w="800" color="#fff">{t('sb.save')}</Txt></View>
        <View style={{ backgroundColor: c.gold, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 3 }}><Txt v="caption" w="800" color="#2b2100">{t('sb.best')}</Txt></View>
      </Row>
      <Row gap={8} wrap align="flex-end">
        <Txt v="display" style={{ fontSize: 32, lineHeight: 36 }}>{noSpace(rm0(SUB.yearly))}</Txt><Txt color={c.mute} w="600">/{t('sb.yr')}</Txt>
        <Txt color={c.mute} style={{ textDecorationLine: 'line-through' }}>{noSpace(rm(SUB.monthlyTotal))}/{t('sb.yr')}</Txt>
      </Row>
      <Txt v="small" color={c.mute} style={{ marginTop: 6 }}>{t('sb.eff')}</Txt>
    </View>
  );
  return (
    <View style={{ marginTop: 12 }}>
      <Row gap={8} align="flex-end"><Txt v="display" style={{ fontSize: 32, lineHeight: 36 }}>{noSpace(rm(SUB.monthly))}</Txt><Txt color={c.mute} w="600">/{t('sb.mo')}</Txt></Row>
      <Pressable onPress={() => onSwitch?.('yearly')} accessibilityRole="button" hitSlop={6}><Txt v="small" w="700" color={c.accent} style={{ marginTop: 6, textDecorationLine: 'underline' }}>{t('sb.hint')}</Txt></Pressable>
    </View>
  );
}

/** The demo subscribe step: plan, price, renewal date, what is included, "Demo only" note, Confirm. */
export function SubscribeSheet({ visible, billing, onBilling, onClose, nextHref }: { visible: boolean; billing: Billing; onBilling: (b: Billing) => void; onClose: () => void; nextHref?: string }) {
  const { t } = useI18n(); const { c } = useTheme(); const router = useRouter(); const { subscribe, sub } = useSub(); const fdate = useFdate();
  const [done, setDone] = useState(false);
  const renew = iso(addPeriod(new Date(), billing));
  const close = () => { setDone(false); onClose(); };
  const Row2 = ({ k, v }: { k: string; v: string }) => <Row style={{ justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.line }} gap={10}><Txt v="small" color={c.mute}>{k}</Txt><Txt w="700" style={{ flexShrink: 1, textAlign: 'right' }}>{v}</Txt></Row>;
  return (
    <Sheet visible={visible} onClose={close} title={done ? t('sb.ok.h') : t('sb.m.h')}>
      {done ? (
        <View>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.ok, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Icon name="checkmark" size={30} color="#fff" /></View>
          <Txt>{t('sb.ok.p', { d: sub.renewalDate ? fdate(sub.renewalDate) : '' })}</Txt>
          <Gap h={16} />
          <Button title={t('sb.see')} icon="star" onPress={() => { close(); router.push((nextHref ?? '/premium-quote') as never); }} />
          <Gap h={8} /><Button title={t('sb.close')} variant="ghost" onPress={close} />
        </View>
      ) : (
        <View>
          <BillingToggle value={billing} onChange={onBilling} />
          <View style={{ marginTop: 12 }}>
            <Row2 k={t('sb.m.plan')} v={`${t('sb.m.prem')} ${t(billing === 'yearly' ? 'sb.yearly' : 'sb.monthly')}`} />
            <Row2 k={t('sb.m.price')} v={priceLabel(billing, t) + (billing === 'yearly' ? ` (${t('sb.eff.short')})` : '')} />
            <Row2 k={t('sb.m.renew')} v={fdate(renew)} />
          </View>
          <Txt v="label" w="800" style={{ marginTop: 14, marginBottom: 6 }}>{t('sb.m.incl')}</Txt>
          {['sb.f1', 'sb.f2', 'sb.f3', 'sb.f4'].map((k) => <Row key={k} gap={8} align="flex-start" style={{ marginBottom: 4 }}><Icon name="checkmark-circle" size={18} color={c.ok} /><Txt v="small" style={{ flex: 1 }}>{t(k)}</Txt></Row>)}
          <Txt v="small" w="800" color={c.gold} style={{ marginTop: 12 }}>{t('sb.m.demo')}</Txt>
          <Gap h={14} />
          <Button title={t('sb.m.confirm')} onPress={() => { subscribe(billing); setDone(true); }} />
          <Gap h={8} /><Button title={t('sb.m.cancel')} variant="ghost" onPress={close} />
        </View>
      )}
    </Sheet>
  );
}

/** Toggle + price + "Unlock My Savings Plan - RM125/year". Premium members see their renewal date and a shortcut instead. */
export function SubscribeCard({ nextHref, premiumLabel, onPremium, bare }: { nextHref?: string; premiumLabel?: string; onPremium?: () => void; bare?: boolean }) {
  const { t } = useI18n(); const { c } = useTheme(); const { sub, isPremium, setBilling } = useSub(); const router = useRouter(); const fdate = useFdate();
  const [open, setOpen] = useState(false);
  const body = (
    <View>
      {isPremium ? (
        <Row gap={10}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.ok }} /><Txt w="700" style={{ flex: 1 }}>{t('sb.active', { d: sub.renewalDate ? fdate(sub.renewalDate) : '' })}</Txt></Row>
      ) : (<><BillingToggle value={sub.billing} onChange={setBilling} /><PriceBlock billing={sub.billing} onSwitch={setBilling} /></>)}
      <Gap h={14} />
      <Button title={isPremium ? (premiumLabel ?? t('sb.see')) : `${t('sb.cta')} - ${priceLabel(sub.billing, t)}`} icon="star" onPress={() => { if (isPremium) { if (onPremium) onPremium(); else router.push('/premium-quote'); } else setOpen(true); }} />
      <SubscribeSheet visible={open} billing={sub.billing} onBilling={setBilling} onClose={() => setOpen(false)} nextHref={nextHref} />
    </View>
  );
  return bare ? body : <Card pad={18}>{body}</Card>;
}

/** Manage subscription: current plan, price, status, renewal; upgrade to Yearly; switch at renewal; cancel with confirmation. */
export function ManageSubscription() {
  const { t } = useI18n(); const { c } = useTheme(); const { sub, isPremium, cancel, resume, upgradeToYearly, switchAtRenewal } = useSub(); const fdate = useFdate();
  const [confirm, setConfirm] = useState(false);
  if (!isPremium) return (
    <Card pad={18}><Txt v="h3">{t('sb.mg.free.h')}</Txt><Txt v="small" color={c.mute} style={{ marginTop: 4, marginBottom: 14 }}>{t('sb.mg.free.p')}</Txt><SubscribeCard bare nextHref="/premium-quote" /></Card>
  );
  const cancelling = sub.status === 'cancelling'; const monthly = sub.billing === 'monthly'; const renewal = sub.renewalDate ? fdate(sub.renewalDate) : '';
  const KV = ({ k, v }: { k: string; v: string }) => <Row style={{ justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.line }} gap={10}><Txt v="small" color={c.mute}>{k}</Txt><Txt w="700" style={{ flexShrink: 1, textAlign: 'right' }}>{v}</Txt></Row>;
  return (
    <Card pad={18}>
      <Row style={{ justifyContent: 'space-between' }}><Txt v="h3">{t('sb.mg.h')}</Txt><Badge label={t(cancelling ? 'sb.mg.cancelling' : 'sb.mg.active')} tone={cancelling ? 'gold' : 'ok'} /></Row>
      <View style={{ marginTop: 8 }}>
        <KV k={t('sb.mg.plan')} v={`${t('sb.m.prem')} ${t(monthly ? 'sb.monthly' : 'sb.yearly')}`} />
        <KV k={t('sb.m.price')} v={priceLabel(sub.billing, t)} />
        <KV k={t('sb.mg.status')} v={t(cancelling ? 'sb.mg.cancelling' : 'sb.mg.active')} />
        <KV k={t(cancelling ? 'sb.mg.endson' : 'sb.mg.next')} v={renewal} />
      </View>
      {cancelling ? (<><Txt w="700" color={c.gold} style={{ marginTop: 14 }}>{t('sb.mg.ends', { d: renewal })}</Txt><Gap h={12} /><Button title={t('sb.mg.resume')} onPress={resume} /></>) : null}
      {!cancelling && monthly ? (
        <View style={{ marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: c.redT }}>
          <Txt w="800">{t('sb.mg.upg.h')}</Txt><Txt v="small" color={c.mute} style={{ marginVertical: 4 }}>{t('sb.mg.upg.p', { x: rm(SUB.saving) })}</Txt>
          <Button title={t('sb.mg.upg.btn')} small full={false} onPress={upgradeToYearly} />
        </View>
      ) : null}
      {!cancelling && !monthly ? (
        <View style={{ marginTop: 14 }}>
          {sub.pending ? <Txt w="600" style={{ marginBottom: 8 }}>{t('sb.mg.sw.on', { d: renewal })}</Txt> : null}
          <Button title={t(sub.pending ? 'sb.mg.sw.undo' : 'sb.mg.sw')} variant="ghost" small full={false} onPress={() => switchAtRenewal(!sub.pending)} />
        </View>
      ) : null}
      {!cancelling ? (
        <View style={{ marginTop: 14 }}>
          {confirm ? (
            <View style={{ padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: c.red }}>
              <Txt w="800">{t('sb.mg.cancel.h')}</Txt><Txt v="small" color={c.mute} style={{ marginTop: 4, marginBottom: 12 }}>{t('sb.mg.cancel.p', { d: renewal })}</Txt>
              <Button title={t('sb.mg.cancel.yes')} onPress={() => { cancel(); setConfirm(false); }} /><Gap h={8} /><Button title={t('sb.mg.cancel.no')} variant="ghost" onPress={() => setConfirm(false)} />
            </View>
          ) : <Button title={t('sb.mg.cancel')} variant="ghost" small full={false} onPress={() => setConfirm(true)} />}
        </View>
      ) : null}
      <Txt v="small" w="800" color={c.gold} style={{ marginTop: 14 }}>{t('sb.m.demo')}</Txt>
    </Card>
  );
}

/** Savings vs subscription: current saving, best-case saving, Premium cost, net saving and a small bar chart. */
export function SavingsCard({ kind, metrics, plan, members = 1, sample }: { kind: 'ind' | 'family'; metrics: Metrics; plan: string; members?: number; sample?: boolean }) {
  const { t } = useI18n(); const { c } = useTheme(); const { sub } = useSub();
  const cost = annualCost(sub.billing); const q = quote(metrics, { plan }); const imp = improvementPlan(metrics, plan);
  let now = q.savings; let best = imp.best.totalSaving; let extra: React.ReactNode = null; let note = '';
  if (kind === 'family') { now = q.savings * members; best = imp.best.totalSaving * members; note = t('sv.fam.note'); extra = <Row2 k={t('sv.fam.per')} v={rm(imp.best.totalSaving)} sub={t('sv.now.per', { x: rm(q.savings) })} />; }
  const net = Math.round((best - cost) * 100) / 100; const pos = net > 0; const max = Math.max(cost, best, 1);
  const bar = (label: string, v: number, col: string) => (
    <View style={{ marginTop: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}><Txt v="small" w="600" style={{ flex: 1 }}>{label}</Txt><Txt w="800">{rm(v)}</Txt></Row>
      <View style={{ height: 12, borderRadius: 6, backgroundColor: c.line, marginTop: 6, overflow: 'hidden' }}><View style={{ height: 12, width: `${Math.max(4, Math.round((v / max) * 100))}%`, backgroundColor: col, borderRadius: 6 }} /></View>
    </View>
  );
  return (
    <Card pad={18} style={{ marginTop: 14 }}>
      <Row style={{ justifyContent: 'space-between' }} gap={8}><Txt v="h3" style={{ flex: 1 }}>{t('sv.h')}</Txt><Row gap={6}><Badge label={t('sv.ind')} tone="mute" />{sample ? <Badge label={t('pqr.sample')} tone="mute" /> : null}</Row></Row>
      <View style={{ marginTop: 8 }}>
        <Row2 k={t('sv.now')} v={rm(now)} />{extra}<Row2 k={t('sv.best')} v={rm(best)} />
        <Row2 k={t('sv.cost', { b: t(sub.billing === 'monthly' ? 'sb.monthly' : 'sb.yearly').toLowerCase() })} v={rm(cost)} />
      </View>
      <View style={{ marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: pos ? c.ok : c.line, backgroundColor: pos ? c.okT : c.bgAlt }}>
        <Txt v="caption" w="700" color={c.mute}>{t('sv.net')}</Txt>
        <Txt v="h1" color={pos ? c.ok : undefined}>{net < 0 ? '−' : ''}{rm(Math.abs(net))}</Txt>
        <Txt v="small" style={{ marginTop: 4 }}>{pos ? t('sv.pos', { x: rm(net) }) : t('sv.neg')}</Txt>
      </View>
      {bar(t('sv.chart.cost'), cost, c.mute)}{bar(t('sv.chart.save'), best, pos ? c.ok : c.gold)}
      {note ? <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{note}</Txt> : null}
      <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('sv.disc')}</Txt>
    </Card>
  );
}
function Row2({ k, v, sub }: { k: string; v: string; sub?: string }) {
  const { c } = useTheme();
  return <Row style={{ justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.line }} gap={10}><Txt v="small" color={c.mute} style={{ flex: 1 }}>{k}</Txt><View style={{ alignItems: 'flex-end' }}><Txt w="700">{v}</Txt>{sub ? <Txt v="caption" color={c.mute}>{sub}</Txt> : null}</View></Row>;
}
