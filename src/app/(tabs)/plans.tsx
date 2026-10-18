import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, ButtonRow, Card, Chip, EmptyState, Gap, Icon, Row, Sheet, Txt, useLayout } from '../../components/ui';
import { rm } from '../../lib/data';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../lib/overlays';
import { PLANS, Plan } from '../../lib/pricing';
import { useCompare } from '../../lib/compare';
import { useTheme } from '../../lib/theme';

const BIZ = { id: 'business', base: 600, cover: 0, type: 'business', isNew: false } as unknown as Plan;
const covs = (p: Plan) => 'ABCDEF'.slice(0, ({ A: 3, B: 4, C: 5, D: 6 } as Record<string, number>)[p.id] || 3).split('');

export default function PlansTab() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const toast = useToast(); const { width } = useLayout();
  const [type, setType] = useState<'all' | 'individual' | 'family' | 'business'>('all');
  const [idx, setIdx] = useState(0);
  const [help, setHelp] = useState(false);
  const listRef = useRef<FlatList<Plan>>(null);
  const cmp = useCompare();
  const list = useMemo(() => [...Object.values(PLANS), BIZ].filter((p) => type === 'all' || p.type === type), [type]);
  const cardW = Math.min(width, 520) - 56;
  const step = cardW + 12;
  const pick = (fn: () => void) => { fn(); setIdx(0); listRef.current?.scrollToOffset({ offset: 0, animated: false }); };
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: cmp.selected.length ? 140 : 48 }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
        <Txt v="h2" fit>{t('plans.h1')}</Txt>
        <Txt v="small" color={c.mute} style={{ marginTop: 2 }} numberOfLines={2}>{t('plans.sub')}</Txt>
        <Pressable onPress={() => setHelp(true)} accessibilityRole="button" hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 12, alignSelf: 'flex-start' }}>
          <Icon name="information-circle" size={20} color={c.accent} />
          <Txt w="700" color={c.accent}>{t('diff.h')}</Txt>
        </Pressable>
      </View>
      {/* one compact, swipeable filter strip instead of two stacked rows */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 4, gap: 8, alignItems: 'center' }} style={{ flexGrow: 0 }}>
        <Chip label={t('plans.all')} on={type === 'all'} onPress={() => pick(() => setType('all'))} />
        <Chip label={t('type.individual')} on={type === 'individual'} onPress={() => pick(() => setType(type === 'individual' ? 'all' : 'individual'))} icon="person" />
        <Chip label={t('type.family')} on={type === 'family'} onPress={() => pick(() => setType(type === 'family' ? 'all' : 'family'))} icon="people" />
        <Chip label={t('pl2.type.biz')} on={type === 'business'} onPress={() => pick(() => setType(type === 'business' ? 'all' : 'business'))} icon="business" />
      </ScrollView>
      {list.length === 0 ? <View style={{ padding: 18 }}><EmptyState icon="search" title={t('plan.none')} /></View> : (
        <FlatList
          ref={listRef} data={list} horizontal keyExtractor={(p) => p.id} showsHorizontalScrollIndicator={false}
          snapToInterval={step} decelerationRate="fast" disableIntervalMomentum
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, gap: 12, alignItems: 'flex-start' }}
          style={{ flexGrow: 0 }}
          onScroll={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / step))} scrollEventThrottle={32}
          renderItem={({ item: p }) => {
            const on = cmp.selected.includes(p.id);
            if ((p.id as string) === 'business') return (
              <Card pad={0} style={{ width: cardW, overflow: 'hidden' }}>
                <View style={{ backgroundColor: c.redT, paddingHorizontal: 16, paddingVertical: 14 }}>
                  <Txt v="h1">{t('pl2.biz')}</Txt>
                  <Row wrap gap={6} style={{ marginTop: 8 }}><Badge label={t('pl2.type.biz')} tone="dark" /></Row>
                </View>
                <View style={{ padding: 16 }}>
                  <View><Txt v="h1" color={c.accent}>{t('pl2.biz.custom')}</Txt></View>
                  <View style={{ height: 1, backgroundColor: c.line, marginVertical: 12 }} />
                  {['pl2.biz.c1', 'pl2.biz.c2', 'pl2.biz.c3'].map((k) => (
                    <Row key={k} gap={10} style={{ marginBottom: 6 }} align="flex-start"><Icon name="checkmark-circle" size={18} color={c.ok} /><Txt v="small" style={{ flex: 1 }}>{t(k)}</Txt></Row>
                  ))}
                  <Gap h={10} />
                  <ButtonRow>
                    <Button title={t('plan.quote')} variant="ghost" small style={{ flex: 1 }} onPress={() => router.push({ pathname: '/plan-result', params: { plan: 'business' } })} />
                    <Button title={t('pl2.biz.enquire')} small style={{ flex: 1 }} onPress={() => router.push('/business')} />
                  </ButtonRow>
                </View>
              </Card>
            );
            return (
              <Card pad={0} style={{ width: cardW, overflow: 'hidden' }}>
                <View style={{ backgroundColor: c.redT, paddingHorizontal: 16, paddingVertical: 14 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt v="h1">{t('plan.word')} {p.id}</Txt>
                    {p.isNew ? <Badge label={t('plan.new')} tone="gold" /> : null}
                  </Row>
                  <Row wrap gap={6} style={{ marginTop: 8 }}>
                    <Badge label={t(`type.${p.type}`)} tone="dark" />
                  </Row>
                </View>
                <View style={{ padding: 16 }}>
                  <Row style={{ justifyContent: 'space-between' }} align="flex-start">
                    <View><Txt v="caption" color={c.mute}>{t('plan.from')}</Txt><Txt v="h1" color={c.accent}>{rm(p.base, 0)}<Txt v="small" color={c.mute}>{t('common.year')}</Txt></Txt></View>
                    <View style={{ alignItems: 'flex-end' }}><Txt v="caption" color={c.mute}>{t('plan.cover')}</Txt><Txt v="h3">{rm(p.cover, 0)}</Txt></View>
                  </Row>
                  <View style={{ height: 1, backgroundColor: c.line, marginVertical: 12 }} />
                  {covs(p).map((k) => (
                    <Row key={k} gap={10} style={{ marginBottom: 6 }} align="flex-start"><Icon name="checkmark-circle" size={18} color={c.ok} /><Txt v="small" style={{ flex: 1 }}>{t(`cov.${k}`)}</Txt></Row>
                  ))}
                  <Gap h={10} />
                  <ButtonRow>
                    <Button title={t('plan.quote')} variant="ghost" small style={{ flex: 1 }} onPress={() => router.push({ pathname: '/plan-result', params: { plan: p.id } })} />
                    <Button title={t('plan.apply')} small style={{ flex: 1 }} onPress={() => router.push({ pathname: '/apply', params: { plan: p.id } })} />
                  </ButtonRow>
                  <Gap h={8} />
                  <Button title={on ? t('plan.added') : t('plan.compare')} variant={on ? 'gold' : 'soft'} small icon={on ? 'checkmark' : 'git-compare'}
                    onPress={() => { if (!cmp.toggle(p.id)) toast(t('cmpbar.t'), 'err'); }} />
                </View>
              </Card>
            );
          }}
        />
      )}
      {list.length > 1 ? (
        <Row gap={6} style={{ justifyContent: 'center', marginTop: 8 }}>
          {list.map((p, i) => <View key={p.id} style={{ width: i === Math.min(idx, list.length - 1) ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: i === Math.min(idx, list.length - 1) ? c.red : c.line }} />)}
        </Row>
      ) : null}
      <Txt v="caption" color={c.mute} align="center" style={{ marginTop: 12, paddingHorizontal: 24 }}>{t('plans.note')}</Txt>
      <Card style={{ marginHorizontal: 18, marginTop: 16 }} pad={14}>
        <Txt w="800">{t('plans.uw')}</Txt>
        <Txt v="small" color={c.mute} style={{ marginTop: 6 }}>{t('plans.consent')}</Txt>
      </Card>
      </ScrollView>
      <CompareBar />
      <Sheet visible={help} onClose={() => setHelp(false)} title={t('diff.h')}>
        {([['person', 'diff.ind.h', ['diff.ind.1', 'diff.ind.2', 'diff.ind.3']], ['people', 'diff.fam.h', ['diff.fam.1', 'diff.fam.2', 'diff.fam.3']]] as const).map(([ic, h, pts]) => (
          <View key={h} style={{ marginBottom: 16 }}>
            <Row gap={10} style={{ marginBottom: 6 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.redT, alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={19} color={c.accent} /></View>
              <Txt v="h3">{t(h)}</Txt>
            </Row>
            {pts.map((k) => <Row key={k} gap={10} align="flex-start" style={{ marginTop: 6, paddingLeft: 4 }}><Icon name="ellipse" size={8} color={c.accent} style={{ marginTop: 8 }} /><Txt style={{ flex: 1 }}>{t(k)}</Txt></Row>)}
          </View>
        ))}
        <Txt v="small" color={c.mute}>{t('diff.same')}</Txt>
      </Sheet>
    </View>
  );
}

function CompareBar() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const cmp = useCompare(); const ins = useSafeAreaInsets();
  if (!cmp.selected.length) return null;
  return (
    <View style={{ position: 'absolute', left: 14, right: 14, bottom: ins.bottom + 16, alignItems: 'center' }} pointerEvents="box-none">
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
