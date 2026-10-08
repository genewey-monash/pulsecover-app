import React from 'react';
import { Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { ButtonRow, Button, Card, Gap, Hero, NumDot, Row, Screen, ScreenHeader, SectionTitle, Txt } from '../components/ui';
import { IMG } from '../components/common';
import { useAuth } from '../lib/auth';
import { useDash } from '../lib/data';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/overlays';
import { useTheme } from '../lib/theme';

export default function Referral() {
  const router = useRouter(); const { t } = useI18n(); const { c } = useTheme(); const { user } = useAuth(); const { dash } = useDash(); const toast = useToast();
  if (!user) return <Screen><ScreenHeader title={t('ref.h')} /><Button title={t('nav.login')} onPress={() => router.replace('/login')} /></Screen>;
  const n = dash?.referrals ?? 0; const medal = n >= 25 ? 'gold' : n >= 10 ? 'silver' : n >= 3 ? 'bronze' : '';
  const msg = `${t('ref.p')}\n${t('dash.ref.code')}: ${user.refcode}`;
  return (
    <Screen>
      <ScreenHeader title={t('ref.h')} />
      <Hero source={IMG.referral} height={170}><Txt color="#fff" w="600">{t('ref.p')}</Txt></Hero>
      <Gap h={16} />
      <Card tone="gold">
        <Row style={{ justifyContent: 'space-between' }}>
          <View><Txt v="caption" color={c.mute}>{t('dash.ref.code')}</Txt><Txt v="display" style={{ letterSpacing: 2 }} selectable>{user.refcode}</Txt></View>
          <View style={{ alignItems: 'flex-end' }}><Txt v="caption" color={c.mute}>{t('dash.ref.count')}</Txt><Txt v="display">{n}</Txt>{medal ? <Txt v="caption" w="700" color={c.accent}>{medal.toUpperCase()}</Txt> : null}</View>
        </Row>
        <Gap h={14} />
        <ButtonRow>
          <Button title={t('app.copycode')} variant="ghost" icon="copy" small style={{ flex: 1 }} onPress={async () => { await Clipboard.setStringAsync(user.refcode); toast(t('dash.ref.copied')); }} />
          <Button title={t('app.share')} icon="share-social" small style={{ flex: 1 }} onPress={async () => { try { await Share.share({ message: msg }); } catch { /* cancelled */ } }} />
        </ButtonRow>
      </Card>
      <SectionTitle>{t('ref.h')}</SectionTitle>
      {[1, 2, 3].map((i) => <Row key={i} gap={12} style={{ marginBottom: 12 }}><NumDot n={i} /><Txt style={{ flex: 1 }}>{t(`ref.s${i}`)}</Txt></Row>)}
      <SectionTitle>{t('dash.board')}</SectionTitle>
      <Card pad={0}>
        {(dash?.ranking?.length ? dash.ranking : []).map((r, i) => (
          <Row key={i} style={{ justifyContent: 'space-between', padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}><Txt w="600">{i + 1}. {r.name}</Txt><Txt w="800" color={c.accent}>{r.count}</Txt></Row>
        ))}
        {!dash?.ranking?.length ? <Txt color={c.mute} align="center" style={{ padding: 18 }}>–</Txt> : null}
      </Card>
      <Txt v="caption" color={c.mute} style={{ marginTop: 10 }}>{t('dash.milestone')}</Txt>
    </Screen>
  );
}
