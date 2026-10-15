import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ErrorBox, Gap, Icon, Row, Screen, Sheet, Txt, success, tap, useTC } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { PROVIDERS, rm, useDash } from '../../lib/data';
import { errorText } from '../../lib/errors';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Home = one status, one big action, a few shortcuts. Everything else is one tap away in the menu. */
export default function Home() {
  const router = useRouter(); const { t } = useI18n(); const tc = useTC(); const { c, isDark } = useTheme();
  const { user } = useAuth(); const { dash, refresh, loading } = useDash();
  const { width, height } = useWindowDimensions();
  const [ask, setAsk] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);

  const conn = dash?.connections ?? [];
  const on = !!user && conn.length > 0;
  const provider = conn[0]?.provider;
  const grade = dash?.grade ?? null; const score = dash?.score30 ?? null;
  const ring = Math.min(200, Math.max(150, Math.round(Math.min(width * 0.5, height * 0.25))));

  // soft "breathing" glow while connected, slow spin while connecting
  const pulse = useRef(new Animated.Value(0)).current; const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) { pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [on, pulse]);
  useEffect(() => {
    if (!busy) { spin.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    loop.start(); return () => loop.stop();
  }, [busy, spin]);

  const press = () => {
    tap();
    if (!user) { router.push('/login'); return; }
    if (on) { router.navigate('/(tabs)/wearable'); return; }
    setErr(null); setAsk(true);
  };
  const connect = async () => {
    setBusy(true); setErr(null);
    try { await api('/connect', { provider: 'healthconnect', consent: true }); success(); setAsk(false); await refresh(); }
    catch (e) { setErr(errorText(e, t)); }
    finally { setBusy(false); }
  };

  const accent = on ? c.ok : c.red;
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });

  const tiles: { icon: IconName; key: string; to: string; tab?: boolean }[] = [
    { icon: 'shield-checkmark', key: 'nav.plans', to: '/(tabs)/plans', tab: true },
    { icon: 'calculator', key: 'nav.calc', to: '/calculator' },
    { icon: 'ribbon', key: 'nav.apply', to: '/apply' },
    { icon: 'document-text', key: 'nav.claims', to: '/(tabs)/claims', tab: true },
    { icon: 'git-compare', key: 'nav.compare', to: '/compare' },
    { icon: 'gift', key: 'app.refer', to: '/referral' },
  ];
  const tileW = (Math.min(width, 760) - 18 * 2 - 10 * 2) / 3;

  return (
    <Screen refreshing={loading} onRefresh={user ? refresh : undefined} bottomPad={24}>
      {/* status line, like a VPN app's "protected / exposed" strip */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 14, paddingBottom: 6 }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: accent }} />
        <Txt w="800" color={accent}>{on ? t('app.on.title') : t('app.off.title')}</Txt>
      </View>
      <Txt v="small" color={c.mute} align="center">{on ? t('app.on.sub') : t('app.off.sub')}</Txt>

      {/* the big connect control */}
      <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 12, height: ring + 36 }}>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', width: ring + 36, height: ring + 36, borderRadius: (ring + 36) / 2, backgroundColor: accent, opacity: on ? glow : 0.08, transform: [{ scale: on ? scale : 1 }] }} />
        <Pressable onPress={press} testID="connect-btn" accessibilityRole="button" accessibilityLabel={on ? t('app.tapmanage') : t('app.tap')}
          style={({ pressed }) => ({ width: ring, height: ring, borderRadius: ring / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#1C1924' : '#FFFFFF',
            borderWidth: 5, borderColor: accent, transform: [{ scale: pressed ? 0.97 : 1 }], shadowColor: accent, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 10 })}>
          {on && grade ? (
            <>
              <Txt style={{ fontSize: ring * 0.34, lineHeight: ring * 0.4 }} w="800" color={c.ok}>{grade}</Txt>
              <Txt w="700" color={c.mute}>{score != null ? `${score}/100` : ''}</Txt>
            </>
          ) : (
            <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
              <Ionicons name={busy ? 'sync' : 'power'} size={ring * 0.38} color={c.red} />
            </Animated.View>
          )}
        </Pressable>
      </View>

      <View style={{ alignItems: 'center' }}>
        <Pressable onPress={press} style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 28, borderRadius: 999, borderWidth: 2, borderColor: on ? c.ok : c.line, backgroundColor: pressed ? c.bgAlt : 'transparent' })}>
          <Txt w="700" color={on ? c.ok : c.ink}>{busy ? t('app.connecting') : on ? t('app.tapmanage') : t('app.tap')}</Txt>
        </Pressable>
      </View>

      {/* device / premium row (like "selected server") */}
      <Pressable onPress={() => router.navigate((on ? '/(tabs)/wearable' : '/(tabs)/plans') as never)} style={{ marginTop: 16 }}>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 5, alignSelf: 'stretch', backgroundColor: accent }} />
            <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 14 }}>
              <Txt v="caption" color={c.mute} numberOfLines={1}>{on ? t('app.premium.est') : user ? t('app.device') : t('app.from.cap')}</Txt>
              <Txt v="h3" numberOfLines={1}>
                {on && dash ? `${rm(dash.projected.annualPremium, 0)}` : user ? t('app.off.title') : t('app.from')}
              </Txt>
              {on && provider ? <Txt v="caption" color={c.mute} numberOfLines={1}>{PROVIDERS[provider] ?? provider}</Txt> : null}
            </View>
            <Icon name="chevron-forward" size={20} color={c.mute} style={{ marginRight: 14 }} />
          </View>
        </Card>
      </Pressable>

      {/* shortcuts */}
      <Row gap={10} wrap style={{ marginTop: 14 }}>
        {tiles.map((x) => (
          <Pressable key={x.key} onPress={() => { tap(); if (x.tab) router.navigate(x.to as never); else router.push(x.to as never); }} accessibilityRole="button" accessibilityLabel={tc(t(x.key))}
            style={({ pressed }) => ({ width: tileW, paddingVertical: 10, borderRadius: 18, alignItems: 'center', gap: 6, backgroundColor: pressed ? c.line : c.bgAlt })}>
            <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.redT }}>
              <Ionicons name={x.icon} size={20} color={isDark ? '#FF7C95' : c.red} />
            </View>
            <Txt v="caption" w="700" align="center" numberOfLines={2} style={{ paddingHorizontal: 4 }}>{tc(t(x.key))}</Txt>
          </Pressable>
        ))}
      </Row>

      <Sheet visible={ask} onClose={() => !busy && setAsk(false)} title={t('connect.modal.h')}>
        <Txt color={c.mute}>{t('connect.modal.p')}</Txt>
        <View style={{ height: 1, backgroundColor: c.line, marginVertical: 14 }} />
        {['a1', 'a2', 'a3', 'a4'].map((k) => <Row key={k} gap={10} style={{ marginBottom: 8 }}><Icon name="checkmark-circle" size={20} color={c.ok} /><Txt>{t(`connect.${k}`)}</Txt></Row>)}
        <ErrorBox text={err} />
        <Gap h={16} />
        <Button title={t('connect.allow')} icon="lock-open" loading={busy} onPress={connect} />
        <Gap h={10} />
        <Button title={t('connect.cancel')} variant="ghost" disabled={busy} onPress={() => setAsk(false)} />
      </Sheet>
    </Screen>
  );
}
