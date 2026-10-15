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

const covs = (p: Plan) => 'ABCDEF'.slice(0, ({ A: 3, B: 4, C: 5, D: 6 } as Record<string, number>)[p.id] || 3).split('');

export default function PlansTab() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const toast = useToast(); const { width } = useLayout();
  const [type, setType] = useState<'all' | 'individual' | 'family'>('all');
  const [buy, setBuy] = useState<'all' | 'online' | 'advisor'>('all');
  const [idx, setIdx] = useState(0);
  const [help, setHelp] = useState(false);
  const listRef = useRef<FlatList<Plan>>(null);
  const cmp = useCompare();
  const list = useMemo(() => Object.values(PLANS).filter((p) => (type === 'all' || p.type === type) && (buy === 'all' || p.buy.includes(buy))), [type, buy]);
  const cardW = Math.min(width, 520) - 56;
  const step = cardW + 12;
  const pick = (fn: () => void) => { fn(); setIdx(0); listRef.current?.scrollToOffset({ offset: 0, animated: false }); };
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
        <Txt v="h2" fit>{t('plans.h1')}</Txt>
        <Txt v="small" color={c.mute} style={{ marginTop: 2 }} numberOfLines={2}>{t('plans.sub')}</Txt>
        <Pressable onPress={() => setHelp(true)} accessibilityRole="button" hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 12, alignSelf: 'flex-start' }}>
          <Icon name="information-circle" size={20} color={c.accent} />
          <Txt w="700" color={c.accent}>{t('app.diff.h')}</Txt>
        </Pressable>
      </View>
      {/* one compact, swipeable filter strip instead of two stacked rows */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 8, alignItems: 'center' }} style={{ flexGrow: 0 }}>
        <Chip label={t('plans.all')} on={type === 'all' && buy === 'all'} onPress={() => pick(() => { setType('all'); setBuy('all'); })} />
        <Chip label={t('type.individual')} on={type === 'individual'} onPress={() => pick(() => setType(type === 'individual' ? 'all' : 'individual'))} icon="person" />
        <Chip label={t('type.family')} on={type === 'family'} onPress={() => pick(() => setType(type === 'family' ? 'all' : 'family'))} icon="people" />
        <Chip label={t('buy.online')} on={buy === 'online'} onPress={() => pick(() => setBuy(buy === 'online' ? 'all' : 'online'))} icon="phone-portrait" />
        <Chip label={t('buy.advisor')} on={buy === 'advisor'} onPress={() => pick(() => setBuy(buy === 'advisor' ? 'all' : 'advisor'))} icon="headset" />
      </ScrollView>
      {list.length === 0 ? <View style={{ padding: 18 }}><EmptyState icon="search" title={t('plan.none')} /></View> : (
        <FlatList
          ref={listRef} data={list} horizontal keyExtractor={(p) => p.id} showsHorizontalScrollIndicator={false}
          snapToInterval={step} decelerationRate="fast" disableIntervalMomentum
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8, gap: 12 }}
          style={{ flexGrow: 0 }}
          onScroll={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / step))} scrollEventThrottle={32}
          renderItem={({ item: p }) => {
            const on = cmp.selected.includes(p.id);
            return (
              <Card pad={0} style={{ width: cardW, overflow: 'hidden' }}>
                <View style={{ backgroundColor: c.redT, paddingHorizontal: 16, paddingVertical: 14 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt v="h1">{t('plan.word')} {p.id}</Txt>
                    {p.isNew ? <Badge label={t('plan.new')} tone="gold" /> : null}
                  </Row>
                  <Row wrap gap={6} style={{ marginTop: 8 }}>
                    <Badge label={t(`type.${p.type}`)} tone="dark" />
                    {p.buy.map((b) => <Badge key={b} label={t(`buy.${b}`)} tone="solid" />)}
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
                    <Button title={t('plan.quote')} variant="ghost" small style={{ flex: 1 }} onPress={() => router.push({ pathname: '/calculator', params: { plan: p.id } })} />
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
      <Txt v="caption" color={c.mute} align="center" style={{ marginTop: 10, paddingHorizontal: 24 }} numberOfLines={2}>{t('plans.note')}</Txt>
      <CompareBar />
      <Sheet visible={help} onClose={() => setHelp(false)} title={t('app.diff.h')}>
        {([['person', 'type.individual', 'app.diff.individual'], ['people', 'type.family', 'app.diff.family'], ['phone-portrait', 'buy.online', 'app.diff.online'], ['headset', 'buy.advisor', 'app.diff.advisor']] as const).map(([ic, k, d]) => (
          <Row key={k} gap={12} align="flex-start" style={{ marginBottom: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.redT, alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={20} color={c.accent} /></View>
            <View style={{ flex: 1 }}><Txt w="800">{t(k)}</Txt><Txt v="small" color={c.mute}>{t(d)}</Txt></View>
          </Row>
        ))}
        <Txt v="caption" color={c.mute}>{t('app.diff.note')}</Txt>
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
