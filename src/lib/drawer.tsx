import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Txt, tap, useTC } from '../components/ui';
import { IMG } from '../components/common';
import { DrawerContext, useDrawer } from './drawerCtx';
import { useAuth } from './auth';
import { useI18n } from './i18n';
import { useTheme } from './theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
export { useDrawer };
const Ctx = DrawerContext;

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, show: () => setOpen(true), hide: () => setOpen(false) }), [open]);
  return <Ctx.Provider value={value}>{children}<DrawerHost /></Ctx.Provider>;
}

/** Hamburger button for the app bar. */
export function MenuButton() {
  const { c } = useTheme(); const { show } = useDrawer(); const { t } = useI18n();
  return (
    <Pressable testID="menu-btn" onPress={() => { tap(); show(); }} accessibilityRole="button" accessibilityLabel={t('app.menu')} hitSlop={8}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.line : c.bgAlt })}>
      <Ionicons name="menu" size={26} color={c.ink} />
    </Pressable>
  );
}

interface Item { icon: IconName; key: string; to: string; tab?: boolean; home?: boolean; guestOnly?: boolean; native?: boolean }
const MAIN: Item[] = [
  { icon: 'home', key: 'app.tab.home', to: '/(tabs)', home: true },
  { icon: 'person', key: 'app.tab.account', to: '/(tabs)/account', tab: true, guestOnly: true },
  { icon: 'pulse', key: 'nav.connect', to: '/(tabs)/wearable', tab: true },
  { icon: 'shield-checkmark', key: 'nav.plans', to: '/(tabs)/plans', tab: true },
  { icon: 'calculator', key: 'nav.calc', to: '/calculator' },
  { icon: 'git-compare', key: 'nav.compare', to: '/compare' },
  { icon: 'document-text', key: 'nav.claims', to: '/(tabs)/claims', tab: true },
  { icon: 'gift', key: 'app.refer', to: '/referral' },
];
const MORE: Item[] = [
  { icon: 'chatbubble-ellipses', key: 'app.help', to: '/faq' },
  { icon: 'call', key: 'nav.talk', to: '/callback' },
  { icon: 'lock-closed', key: 'footer.privacy', to: '/privacy' },
  { icon: 'information-circle', key: 'app.about', to: '/how' },
  { icon: 'business', key: 'nav.sme', to: '/business' },
  { icon: 'server', key: 'app.server.h', to: '/server', native: true },
];

function DrawerHost() {
  const { open, hide } = useDrawer();
  const { c, isDark } = useTheme(); const { t } = useI18n(); const tc = useTC(); const { user, logout } = useAuth(); const router = useRouter();
  const ins = useSafeAreaInsets(); const { width } = useWindowDimensions();
  const W = Math.min(Math.round(width * 0.84), 340);
  const x = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
    Animated.timing(x, { toValue: open ? 1 : 0, duration: open ? 260 : 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => { if (finished && !open) setMounted(false); });
  }, [open, x]);
  const go = useCallback((it: Item) => {
    tap(); hide();
    setTimeout(() => { if (it.home) router.replace('/(tabs)' as never); else if (it.tab) router.navigate(it.to as never); else router.push(it.to as never); }, 120);
  }, [hide, router]);
  if (!mounted && !open) return null;
  const panelBg = isDark ? '#181520' : '#FFFFFF';
  const Row = ({ it }: { it: Item }) => (
    <Pressable onPress={() => go(it)} accessibilityRole="button" accessibilityLabel={tc(t(it.key))}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 22, backgroundColor: pressed ? c.bgAlt : 'transparent' })}>
      <Ionicons name={it.icon} size={21} color={c.mute} style={{ width: 34 }} />
      <Txt w="600" style={{ flex: 1 }} numberOfLines={1}>{tc(t(it.key))}</Txt>
      <Ionicons name="chevron-forward" size={18} color={c.mute} />
    </Pressable>
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: x }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={hide} accessibilityLabel="Close menu" />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: W, backgroundColor: panelBg, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-W, 0] }) }],
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 6, height: 0 }, elevation: 24 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: ins.bottom + 16 }} showsVerticalScrollIndicator={false}>
          {/* banner */}
          <Pressable onPress={() => go(user ? { icon: 'person', key: '', to: '/(tabs)/account', tab: true } : { icon: 'person', key: '', to: '/login' })}
            style={{ backgroundColor: c.red, paddingTop: ins.top + 22, paddingBottom: 22, paddingHorizontal: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={IMG.logo as number} style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: '#fff' }} resizeMode="contain" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Txt v="h3" color="#fff" numberOfLines={1}>{user ? user.name : 'PulseCover'}</Txt>
                <Txt v="small" color="rgba(255,255,255,0.88)" numberOfLines={2}>{user ? user.email : t('app.drawer.tag')}</Txt>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </View>
            {!user ? <Txt w="700" color="#fff" style={{ marginTop: 14 }}>{tc(t('nav.login'))} / {tc(t('acc.register'))}</Txt> : null}
          </Pressable>
          <View style={{ paddingTop: 6 }}>{MAIN.filter((it) => !(it.guestOnly && user)).map((it) => <Row key={it.key} it={it} />)}</View>
          <View style={{ height: 1, backgroundColor: c.line, marginVertical: 8, marginHorizontal: 22 }} />
          <View>{MORE.filter((it) => !(it.native && Platform.OS === 'web')).map((it) => <Row key={it.key} it={it} />)}</View>
          {user ? (
            <>
              <View style={{ height: 1, backgroundColor: c.line, marginVertical: 8, marginHorizontal: 22 }} />
              <Pressable onPress={async () => { hide(); await logout(); router.replace('/welcome'); }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 22, backgroundColor: pressed ? c.bgAlt : 'transparent' })}>
                <Ionicons name="log-out-outline" size={21} color={c.bad} style={{ width: 34 }} />
                <Txt w="600" color={c.bad}>{tc(t('nav.logout'))}</Txt>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
