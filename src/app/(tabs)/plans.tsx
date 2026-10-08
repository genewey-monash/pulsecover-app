import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, ButtonRow, Card, CardGrid, Chip, EmptyState, Gap, Icon, Row, Screen, Txt, useLayout } from '../../components/ui';
import { LangButton } from '../../components/common';
import { rm } from '../../lib/data';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../lib/overlays';
import { PLANS, Plan } from '../../lib/pricing';
import { useCompare } from '../../lib/compare';
import { useTheme } from '../../lib/theme';

const covs = (p: Plan) => 'ABCDEF'.slice(0, ({ A: 3, B: 4, C: 5, D: 6 } as Record<string, number>)[p.id] || 3).split('');

export default function PlansTab() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const toast = useToast(); const { cols } = useLayout();
  const [type, setType] = useState<'all' | 'individual' | 'family'>('all');
  const [buy, setBuy] = useState<'all' | 'online' | 'advisor'>('all');
  const cmp = useCompare();
  const list = useMemo(() => Object.values(PLANS).filter((p) => (type === 'all' || p.type === type) && (buy === 'all' || p.buy.includes(buy))), [type, buy]);
  return (
    <View style={{ flex: 1 }}>
    <Screen bottomPad={cmp.selected.length ? 210 : 130}>
      <Row style={{ justifyContent: 'space-between', paddingTop: 10, paddingBottom: 6 }}>
        <View style={{ flex: 1 }}><Txt v="h1" fit>{t('plans.h1')}</Txt></View><LangButton />
      </Row>
      <Txt color={c.mute} style={{ marginBottom: 14 }}>{t('plans.sub')}</Txt>
      <Txt v="label" color={c.mute} style={{ marginBottom: 8 }}>{t('filter.type')}</Txt>
      <Row wrap gap={8}>
        <Chip label={t('plans.all')} on={type === 'all'} onPress={() => setType('all')} />
        <Chip label={t('type.individual')} on={type === 'individual'} onPress={() => setType('individual')} icon="person" />
        <Chip label={t('type.family')} on={type === 'family'} onPress={() => setType('family')} icon="people" />
      </Row>
      <Txt v="label" color={c.mute} style={{ marginTop: 14, marginBottom: 8 }}>{t('filter.buy')}</Txt>
      <Row wrap gap={8}>
        <Chip label={t('plans.all')} on={buy === 'all'} onPress={() => setBuy('all')} />
        <Chip label={t('buy.online')} on={buy === 'online'} onPress={() => setBuy('online')} icon="phone-portrait" />
        <Chip label={t('buy.advisor')} on={buy === 'advisor'} onPress={() => setBuy('advisor')} icon="headset" />
      </Row>
      <Gap h={18} />
      {list.length === 0 ? <EmptyState icon="search" title={t('plan.none')} /> : null}
      <CardGrid cols={cols > 1 ? 2 : 1} gap={14}>
        {list.map((p) => {
          const on = cmp.selected.includes(p.id);
          return (
            <Card key={p.id} pad={0} style={{ overflow: 'hidden' }}>
              <View style={{ backgroundColor: c.redT, padding: 18, minHeight: 124 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt v="caption" w="700" color={c.accent}>{t('plan.cat').toUpperCase()}</Txt>
                  {p.isNew ? <Badge label={t('plan.new')} tone="gold" /> : null}
                </Row>
                <Txt v="h1" style={{ marginTop: 4 }}>{t('plan.word')} {p.id}</Txt>
                <Row wrap gap={6} style={{ marginTop: 8 }}>
                  <Badge label={t(`type.${p.type}`)} tone="dark" />
                  {p.buy.map((b) => <Badge key={b} label={t(`buy.${b}`)} tone="solid" />)}
                </Row>
              </View>
              <View style={{ padding: 18, flex: 1 }}>
                <Row style={{ justifyContent: 'space-between' }} align="flex-start">
                  <View><Txt v="caption" color={c.mute}>{t('plan.from')}</Txt><Txt v="h1" color={c.accent}>{rm(p.base, 0)}<Txt v="small" color={c.mute}>{t('common.year')}</Txt></Txt></View>
                  <View style={{ alignItems: 'flex-end' }}><Txt v="caption" color={c.mute}>{t('plan.cover')}</Txt><Txt v="h3">{rm(p.cover, 0)}</Txt></View>
                </Row>
                <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('plan.range')}</Txt>
                <Txt v="label">{rm(Math.round(p.base * 0.85), 0)} – {rm(Math.round(p.base * 1.15), 0)}</Txt>
                <View style={{ height: 1, backgroundColor: c.line, marginVertical: 14 }} />
                {covs(p).map((k) => (
                  <Row key={k} gap={10} style={{ marginBottom: 7 }} align="flex-start"><Icon name="checkmark-circle" size={19} color={c.ok} /><Txt v="small" style={{ flex: 1 }}>{t(`cov.${k}`)}</Txt></Row>
                ))}
                <Txt v="caption" color={c.mute} style={{ marginTop: 6 }}>{t('plan.wear')}</Txt>
                <View style={{ flex: 1, minHeight: 16 }} />
                <ButtonRow>
                  <Button title={t('plan.quote')} variant="ghost" small style={{ flex: 1 }} onPress={() => router.push({ pathname: '/calculator', params: { plan: p.id } })} />
                  <Button title={t('plan.apply')} small style={{ flex: 1 }} onPress={() => router.push({ pathname: '/apply', params: { plan: p.id } })} />
                </ButtonRow>
                <Gap h={10} />
                <Button title={on ? t('plan.added') : t('plan.compare')} variant={on ? 'gold' : 'soft'} small icon={on ? 'checkmark' : 'git-compare'}
                  onPress={() => { if (!cmp.toggle(p.id)) toast(t('cmpbar.t'), 'err'); }} />
              </View>
            </Card>
          );
        })}
      </CardGrid>
      <Gap h={14} />
      <Txt v="caption" color={c.mute} align="center">{t('plans.note')}</Txt>
    </Screen>
    <CompareBar />
    </View>
  );
}

function CompareBar() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const cmp = useCompare(); const ins = useSafeAreaInsets();
  if (!cmp.selected.length) return null;
  return (
    <View style={{ position: 'absolute', left: 14, right: 14, bottom: ins.bottom + 84, alignItems: 'center' }} pointerEvents="box-none">
      <Card pad={12} style={{ width: '100%', maxWidth: 560, backgroundColor: c.ink, borderColor: c.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt v="small" w="700" color={c.bg}>{cmp.selected.length} {t('cmpbar.t')}</Txt>
        <Row gap={8}>
          <Button title={t('cmpbar.clear')} variant="ghost" small full={false} style={{ borderColor: c.bg }} onPress={cmp.clear} />
          <Button title={t('cmpbar.go')} small full={false} disabled={cmp.selected.length < 2} onPress={() => router.push('/compare')} />
        </Row>
      </Card>
    </View>
  );
}
