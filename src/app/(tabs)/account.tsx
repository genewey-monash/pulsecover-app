import React, { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { Avatar, Badge, Button, Card, Chip, Gap, Group, Icon, ListRow, Row, Screen, SectionTitle, Sheet, Tile, Txt } from '../../components/ui';
import { LanguageSheet, Logo } from '../../components/common';
import { FeedbackSheet } from '../../components/feedback';
import { useAuth } from '../../lib/auth';
import { useDash } from '../../lib/data';
import { LANGS, useI18n } from '../../lib/i18n';
import { biometricAvailable, useToast } from '../../lib/overlays';
import { kv } from '../../lib/storage';
import { ThemePref, useTheme } from '../../lib/theme';

export default function AccountTab() {
  const router = useRouter(); const { t, lang } = useI18n(); const { c, pref, setPref } = useTheme(); const { user, logout } = useAuth(); const { dash } = useDash(); const toast = useToast();
  const [langOpen, setLangOpen] = useState(false); const [fb, setFb] = useState(false); const [out, setOut] = useState(false);
  const [bio, setBio] = useState(false); const [bioOk, setBioOk] = useState(false);
  useEffect(() => { kv.get('pc_bio').then((v) => setBio(v === '1')); biometricAvailable().then(setBioOk); }, []);
  const toggleBio = async (on: boolean) => { setBio(on); await kv.set('pc_bio', on ? '1' : '0'); toast(on ? t('app.bio.on') : t('app.bio.off')); };
  const themes: [ThemePref, string][] = [['system', t('app.theme.system')], ['light', t('app.theme.light')], ['dark', t('app.theme.dark')]];
  const go = (p: string) => () => router.push(p as any);
  const curLang = LANGS.find((l) => l.code === lang)?.label ?? '';

  return (
    <Screen bottomPad={32}>
      <View style={{ paddingTop: 14, paddingBottom: 14 }}><Txt v="h2" fit>{t('acc.h1')}</Txt></View>

      {user ? (
        <Card tone="red" onPress={go('/profile')}>
          <Row gap={14}>
            <Avatar name={user.name} size={60} />
            <View style={{ flex: 1 }}>
              <Txt v="h2" numberOfLines={1}>{user.name}</Txt>
              <Txt v="small" color={c.mute} numberOfLines={1}>{user.email}</Txt>
              <View style={{ marginTop: 6 }}><Badge label={dash?.policy ? `${t('plan.word')} ${dash.policy.plan}` : t('app.nopolicy')} tone={dash?.policy ? 'ok' : 'gold'} /></View>
            </View>
            <Icon name="chevron-forward" size={20} color={c.mute} />
          </Row>
        </Card>
      ) : (
        <Card tone="red">
          <Logo />
          <Txt color={c.mute} style={{ marginTop: 12 }}>{t('acc.register.sub')}</Txt>
          <Gap h={14} />
          <Button title={t('acc.register')} onPress={go('/register')} />
          <Gap h={10} />
          <Button title={t('nav.login')} variant="ghost" onPress={go('/login')} />
        </Card>
      )}

      {user ? (
        <>
          <SectionTitle>{t('app.sec.account')}</SectionTitle>
          <Group>
            <ListRow icon="person" title={t('pf.personal')} onPress={go('/profile')} />
            <ListRow icon="shield-checkmark" title={t('pf.plan.h')} subtitle={dash?.policy ? `${t('plan.word')} ${dash.policy.plan} · ${dash.policy.number}` : undefined} onPress={go('/plan-manage')} />
            <ListRow icon="key" title={t('pf.pw.h')} onPress={go('/password')} />
            <ListRow icon="gift" title={t('ref.h')} onPress={go('/referral')} last />
          </Group>
        </>
      ) : null}

      <SectionTitle>{t('app.sec.prefs')}</SectionTitle>
      <Group>
        <ListRow icon="globe" title={t('nav.language')} subtitle={curLang} onPress={() => setLangOpen(true)} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <Row gap={14}><Tile icon="contrast" size="sm" /><Txt w="600">{t('app.theme.h')}</Txt></Row>
          <Row wrap gap={8} style={{ marginTop: 12 }}>{themes.map(([k, label]) => <Chip key={k} label={label} on={pref === k} onPress={() => setPref(k)} />)}</Row>
        </View>
        {user && bioOk ? <ListRow icon="finger-print" title={t('app.bio.h')} subtitle={t('app.bio.sub')} right={<Switch value={bio} onValueChange={toggleBio} trackColor={{ true: c.red, false: c.line }} thumbColor="#fff" />} /> : null}
        <ListRow icon="server" title={t('app.server.h')} onPress={go('/server')} last />
      </Group>

      <SectionTitle>{t('footer.support')}</SectionTitle>
      <Group>
        <ListRow icon="help-circle" title={t('nav.faq')} onPress={go('/faq')} />
        <ListRow icon="call" title={t('cb.h')} onPress={go('/callback')} />
        <ListRow icon="chatbubble-ellipses" title={t('fb.h')} onPress={() => setFb(true)} last />
      </Group>

      {user ? <><Gap h={22} /><Button title={t('nav.logout')} variant="danger" icon="log-out" onPress={() => setOut(true)} /></> : null}
      <Gap h={18} />
      <Txt v="caption" color={c.mute} align="center">PulseCover {Application.nativeApplicationVersion ?? '1.0.0'} ({Application.nativeBuildVersion ?? '1'})</Txt>
      <Txt v="caption" color={c.mute} align="center" style={{ marginTop: 4 }}>{t('footer.group')}</Txt>

      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
      <FeedbackSheet visible={fb} onClose={() => setFb(false)} page="app/account" />
      <Sheet visible={out} onClose={() => setOut(false)} title={t('nav.logout')}>
        <Txt color={c.mute}>{user?.email}</Txt>
        <Gap h={18} />
        <Button title={t('nav.logout')} variant="danger" icon="log-out" onPress={async () => { setOut(false); await logout(); router.replace('/'); }} />
        <Gap h={10} />
        <Button title={t('connect.cancel')} variant="ghost" onPress={() => setOut(false)} />
      </Sheet>
    </Screen>
  );
}
