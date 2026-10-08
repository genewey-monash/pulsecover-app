import React, { useCallback } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { ButtonRow, Avatar, Badge, Button, Card, CardGrid, Gap, Hero, Icon, Row, Tile, Screen, SectionTitle, Txt, useLayout, Skeleton, EmptyState } from '../../components/ui';
import { IMG, IconButton, LangButton, Logo } from '../../components/common';
import { LineChart, ScoreRing } from '../../components/charts';
import { StatsSummary } from '../../components/summary';
import { useAuth } from '../../lib/auth';
import { PROVIDERS, rm, useDash } from '../../lib/data';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../lib/overlays';
import { PLANS } from '../../lib/pricing';
import { useTheme } from '../../lib/theme';

const TAB_PAD = 130;

export default function Home() {
  const { user } = useAuth();
  return user ? <MemberHome /> : <GuestHome />;
}

function TopBar({ left }: { left: React.ReactNode }) {
  const router = useRouter(); const { t } = useI18n();
  return (
    <Row style={{ justifyContent: 'space-between', paddingTop: 10, paddingBottom: 16 }}>
      {left}
      <Row gap={8}><LangButton /><IconButton name="search" label={t('search.g.page')} onPress={() => router.push('/search')} /></Row>
    </Row>
  );
}

/* ------------------------------------------------------------------ guests */
function GuestHome() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { cols, width } = useLayout();
  const stats: [string, string][] = [['RM600', 'home.stat1'], ['±15%', 'home.stat2'], ['3', 'home.stat3'], ['16+', 'home.stat4']];
  const steps = [['link', 'home.s1'], ['calculator', 'home.s2'], ['pulse', 'home.s3'], ['refresh-circle', 'home.s4']] as const;
  const bens = [['trending-down', 'home.ben1'], ['lock-closed', 'home.ben2'], ['document-text', 'home.ben3'], ['flash', 'home.ben4'], ['shield-checkmark', 'home.ben5'], ['gift', 'home.ben6']] as const;
  return (
    <Screen bottomPad={TAB_PAD}>
      <TopBar left={<Logo />} />
      <Hero source={IMG.hero} height={width > 700 ? 300 : 360} radiusPx={28}>
        <Badge label={t('home.eyebrow')} tone="gold" />
        <Txt v="h1" color="#fff" style={{ marginTop: 10, fontSize: 25, lineHeight: 33 }}>{t('home.h1')}</Txt>
      </Hero>
      <Gap h={16} />
      <Txt color={c.mute}>{t('home.sub')}</Txt>
      <Gap h={18} />
      <Button title={t('home.cta1')} icon="pulse" onPress={() => router.push('/(tabs)/wearable')} />
      <Gap h={10} />
      <ButtonRow>
        <Button title={t('acc.register')} variant="ghost" onPress={() => router.push('/register')} style={{ flex: 1 }} />
        <Button title={t('nav.login')} variant="soft" onPress={() => router.push('/login')} style={{ flex: 1 }} />
      </ButtonRow>
      <Gap h={20} />
      <CardGrid cols={cols > 1 ? 4 : 2}>
        {stats.map(([v, k]) => (
          <Card key={k} pad={14}>
            <Txt v="h1" color={c.accent} style={{ fontSize: 24 }}>{v}</Txt>
            <Txt v="caption" color={c.mute} style={{ marginTop: 2 }}>{t(k)}</Txt>
          </Card>
        ))}
      </CardGrid>

      <SectionTitle>{t('home.steps.h')}</SectionTitle>
      {steps.map(([ic, k], i) => (
        <Card key={k} style={{ marginBottom: 10 }}>
          <Row align="flex-start" gap={14}>
            <Tile icon={ic} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{t(`${k}.h`)}</Txt>
              <Txt v="small" color={c.mute} style={{ marginTop: 2 }}>{t(`${k}.p`)}</Txt>
            </View>
          </Row>
        </Card>
      ))}

      <SectionTitle action={t('home.viewall')} onAction={() => router.push('/(tabs)/plans')}>{t('home.plans.h')}</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
        {Object.values(PLANS).map((p) => (
          <Card key={p.id} onPress={() => router.push({ pathname: '/calculator', params: { plan: p.id } })} style={{ width: 200 }}>
            <Row style={{ justifyContent: 'space-between' }}><Txt v="h2">{t('plan.word')} {p.id}</Txt>{p.isNew ? <Badge label={t('plan.new')} tone="gold" /> : null}</Row>
            <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('plan.from')}</Txt>
            <Txt v="h1" color={c.accent} style={{ fontSize: 24 }}>{rm(p.base, 0)}<Txt v="small" color={c.mute}>{t('common.year')}</Txt></Txt>
            <Txt v="caption" color={c.mute} style={{ marginTop: 6 }}>{t('plan.cover')} {rm(p.cover, 0)}</Txt>
          </Card>
        ))}
      </ScrollView>

      <SectionTitle>{t('home.ben.h')}</SectionTitle>
      <CardGrid cols={cols > 1 ? 3 : 2}>
        {bens.map(([ic, k]) => (
          <Card key={k} pad={14}>
            <Icon name={ic} size={24} color={c.accent} />
            <Txt v="label" style={{ marginTop: 8 }}>{t(`${k}.h`)}</Txt>
            <Txt v="caption" color={c.mute} style={{ marginTop: 2 }}>{t(`${k}.p`)}</Txt>
          </Card>
        ))}
      </CardGrid>

      <SectionTitle>{t('home.tools.h')}</SectionTitle>
      <CardGrid cols={3}>
        {([['calculator', 'nav.calc', '/calculator'], ['git-compare', 'nav.compare', '/compare'], ['help-circle', 'nav.how', '/how']] as const).map(([ic, k, href]) => (
          <Card key={k} pad={14} onPress={() => router.push(href as any)} style={{ minHeight: 112 }}>
            <Icon name={ic} size={26} color={c.accent} />
            <Txt v="label" style={{ marginTop: 10 }} numberOfLines={3}>{t(k)}</Txt>
          </Card>
        ))}
      </CardGrid>

      <Gap h={20} />
      <Card tone="gold">
        <Row align="flex-start" gap={14}>
          <Image source={IMG.advisor} style={{ width: 84, height: 84, borderRadius: 18 }} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Txt v="h3">{t('home.adv.h')}</Txt>
            <Txt v="small" color={c.mute} style={{ marginTop: 3 }}>{t('home.adv.p')}</Txt>
          </View>
        </Row>
        <Gap h={14} />
        <Button title={t('cb.submit')} icon="call" onPress={() => router.push('/callback')} />
      </Card>
      <Gap h={18} />
      <Txt v="caption" color={c.mute} align="center">{t('home.disc')}</Txt>
    </Screen>
  );
}

/* ----------------------------------------------------------------- members */
function MemberHome() {
  const router = useRouter(); const { t, lang } = useI18n(); const { c } = useTheme(); const { user } = useAuth(); const { dash, loading, error, refresh } = useDash();
  const toast = useToast(); const { width, cols } = useLayout();
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const first = (user?.name || '').trim().split(/\s+/)[0] || '';
  const chartW = Math.min(width, 760) - 36 - 36;

  const conn = dash?.connections.length ?? 0, hasData = (dash?.metrics.length ?? 0) >= 7;
  const pipe = ['dash.p1', 'dash.p2', 'dash.p3', 'dash.p4', 'dash.p5'].map((k, i) => ({ k, done: i < 2 ? conn > 0 : i < 3 ? hasData : i < 4 ? !!dash?.policy : !!dash?.policy }));
  const weeks = (dash?.weekly ?? []).slice(-8);
  const latest = dash?.weekly?.[dash.weekly.length - 1];

  const copyCode = async () => { if (user) { await Clipboard.setStringAsync(user.refcode); toast(t('dash.ref.copied')); } };
  const share = async () => { if (user) { try { await Share.share({ message: `${t('dash.ref.p')} ${t('dash.ref.code')}: ${user.refcode}` }); } catch { /* cancelled */ } } };

  return (
    <Screen refreshing={loading} onRefresh={refresh} bottomPad={TAB_PAD}>
      <TopBar left={
        <Row gap={12}>
          <Avatar name={user?.name ?? ''} size={48} />
          <View><Txt v="caption" color={c.mute}>{t('dash.h1')}</Txt><Txt v="h2" numberOfLines={1} style={{ maxWidth: 190 }}>{first}</Txt></View>
        </Row>} />

      {error && !dash ? <EmptyState icon="cloud-offline" title={t('app.err.network')} text={error} action={t('app.retry')} onAction={refresh} /> : null}
      {!dash && !error ? <View><Skeleton h={230} r={24} /><Gap h={14} /><Skeleton h={120} r={20} /><Gap h={14} /><Skeleton h={160} r={20} /></View> : null}

      {dash ? (
        <>
          {/* rating */}
          <Card pad={20}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Txt v="label" color={c.mute}>{t('dash.rating')}</Txt>
                {dash.grade ? <Txt v="h2" style={{ marginTop: 4 }}>{t(`grade.${dash.grade}`)}</Txt> : <Txt v="small" color={c.mute} style={{ marginTop: 6 }}>{t('dash.nodata')}</Txt>}
                {dash.score30 != null ? (
                  <>
                    <Txt v="caption" color={c.mute} style={{ marginTop: 14 }}>{t('dash.projected')}</Txt>
                    <Txt v="h1" color={c.accent}>{rm(dash.projected.annualPremium)}</Txt>
                    <View style={{ marginTop: 6 }}><Badge label={`${dash.projected.adjustmentPct > 0 ? '+' : ''}${dash.projected.adjustmentPct}%`} tone={dash.projected.adjustmentPct <= 0 ? 'ok' : 'red'} /></View>
                  </>
                ) : <Txt v="small" color={c.mute} style={{ marginTop: 10 }}>{t('dash.nodev')}</Txt>}
              </View>
              <ScoreRing score={dash.score30} grade={dash.grade} size={width > 380 ? 132 : 112} label={t('dash.score30')} />
            </Row>
            {conn === 0 ? <><Gap h={16} /><Button title={t('nav.connect')} icon="pulse" onPress={() => router.push('/(tabs)/wearable')} /></> : null}
            <Txt v="caption" color={c.mute} style={{ marginTop: 14 }}>{t('dash.summ.note')}</Txt>
          </Card>

          {/* policy */}
          <Gap h={14} />
          {dash.policy ? (
            <Card tone="red" onPress={() => router.push('/plan-manage')}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={10}><Icon name="shield-checkmark" size={24} color={c.accent} /><Txt v="h3">{t('plan.word')} {dash.policy.plan}</Txt></Row>
                <Badge label={dash.paused ? t('dash.paused') : t('app.status.active')} tone={dash.paused ? 'gold' : 'ok'} />
              </Row>
              <Txt v="small" color={c.mute} style={{ marginTop: 8 }}>{dash.policy.number}</Txt>
              <Row style={{ marginTop: 14 }} align="flex-start" gap={18}>
                <View style={{ flex: 1.25 }}><Txt v="caption" color={c.mute} numberOfLines={1} fit>{t('dash.premium')}</Txt><Txt v="h3" numberOfLines={1} fit>{rm(dash.policy.premium)}{t('common.year')}</Txt></View>
                <View style={{ flex: 1 }}><Txt v="caption" color={c.mute} numberOfLines={1} fit>{t('dash.cover')}</Txt><Txt v="h3" numberOfLines={1} fit>{rm(dash.policy.cover, 0)}</Txt></View>
                <View style={{ flex: 0.8 }}><Txt v="caption" color={c.mute} numberOfLines={1} fit>{t('dash.renewal')}</Txt><Txt v="h3" numberOfLines={1} fit>{dash.policy.renewal_date.slice(5)}</Txt></View>
              </Row>
            </Card>
          ) : (
            <Card tone="gold">
              <Txt v="h3">{t('ds.h')}</Txt>
              <Txt v="small" color={c.mute} style={{ marginTop: 4, marginBottom: 14 }}>{t('ds.p')}</Txt>
              <Button title={t('nav.apply')} icon="shield-checkmark" onPress={() => router.push('/apply')} />
            </Card>
          )}

          {/* pipeline */}
          <SectionTitle>{t('dash.pipe.h')}</SectionTitle>
          <Card pad={14}>
            {pipe.map((p, i) => (
              <Row key={p.k} gap={12} style={{ paddingVertical: 7 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: p.done ? c.ok : c.bgAlt, borderWidth: p.done ? 0 : 1.5, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                  {p.done ? <Icon name="checkmark" size={16} color="#fff" /> : <Txt v="caption" w="700" color={c.mute}>{i + 1}</Txt>}
                </View>
                <Txt v="body" w={p.done ? '600' : '400'} color={p.done ? c.ink : c.mute}>{t(p.k)}</Txt>
              </Row>
            ))}
          </Card>

          {/* weekly */}
          <SectionTitle>{t('dash.weekly')}</SectionTitle>
          <Card>
            {weeks.length ? (
              <>
                <Txt v="caption" color={c.mute} style={{ marginBottom: 6 }}>{t('dash.trend8')}</Txt>
                <LineChart width={chartW} points={weeks.map((w) => ({ label: w.start.slice(5), value: w.score }))} />
                {latest ? (
                  <View style={{ marginTop: 14 }}><CardGrid cols={cols > 1 ? 4 : 2}>
                    {([['footsteps', 'dash.steps', latest.steps.toLocaleString()], ['barbell', 'dash.exercise', String(latest.exerciseMin)], ['moon', 'dash.sleep', String(latest.sleepHours)], ['heart', 'dash.hr', String(latest.restingHr)]] as const).map(([ic, k, v]) => (
                      <View key={k} style={{ backgroundColor: c.bgAlt, borderRadius: 14, padding: 12 }}>
                        <Icon name={ic} size={18} color={c.accent} />
                        <Txt v="h3" style={{ marginTop: 4 }}>{v}</Txt><Txt v="caption" color={c.mute}>{t(k)}</Txt>
                      </View>
                    ))}
                  </CardGrid></View>
                ) : null}
              </>
            ) : <Txt color={c.mute} align="center" style={{ paddingVertical: 24 }}>{t('dash.nodata')}</Txt>}
          </Card>

          {/* devices */}
          <SectionTitle action={t('app.manage')} onAction={() => router.push('/(tabs)/wearable')}>{t('dash.devices')}</SectionTitle>
          <Card>
            {conn ? dash.connections.map((cn) => (
              <Row key={cn.provider} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                <Row gap={10}><Icon name="watch" size={22} color={c.accent} /><Txt w="600">{PROVIDERS[cn.provider] ?? cn.provider}</Txt></Row>
                <Txt v="caption" color={c.mute}>{t('dash.lastsync')}: {(cn.last_sync || '').slice(0, 10)}</Txt>
              </Row>
            )) : <Txt color={c.mute}>{t('dash.nodev')}</Txt>}
          </Card>

          {/* quick actions */}
          <SectionTitle>{t('ds.q.h')}</SectionTitle>
          <CardGrid cols={cols > 1 ? 4 : 2}>
            {([['calculator', 'nav.calc', '/calculator'], ['document-text', 'nav.claims', '/(tabs)/claims'], ['call', 'nav.talk', '/callback'], ['people', 'dash.ref.h', '/referral']] as const).map(([ic, k, href]) => (
              <Card key={k} onPress={() => router.push(href as any)} pad={14} style={{ minHeight: 100 }}>
                <Icon name={ic} size={24} color={c.accent} /><Txt v="label" style={{ marginTop: 8 }} numberOfLines={2}>{t(k)}</Txt>
              </Card>
            ))}
          </CardGrid>

          {/* referral */}
          <SectionTitle>{t('dash.ref.h')}</SectionTitle>
          <Card tone="gold">
            <Txt v="small" color={c.mute}>{t('dash.ref.p')}</Txt>
            <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
              <View><Txt v="caption" color={c.mute}>{t('dash.ref.code')}</Txt><Txt v="h1" style={{ letterSpacing: 1.5 }}>{user?.refcode}</Txt></View>
              <View style={{ alignItems: 'flex-end' }}><Txt v="caption" color={c.mute}>{t('dash.ref.count')}</Txt><Txt v="h1">{dash.referrals}</Txt></View>
            </Row>
            <Gap h={12} />
            <ButtonRow><Button title={t('app.copycode')} variant="ghost" icon="copy" onPress={copyCode} style={{ flex: 1 }} small /><Button title={t('app.share')} icon="share-social" onPress={share} style={{ flex: 1 }} small /></ButtonRow>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
