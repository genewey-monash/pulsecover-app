import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router/js-tabs';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Txt, tap, useLayout, useTC } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';

const TABS: { name: string; key: string; icon: React.ComponentProps<typeof Ionicons>['name']; iconOn: React.ComponentProps<typeof Ionicons>['name']; center?: boolean }[] = [
  { name: 'index', key: 'app.tab.home', icon: 'home-outline', iconOn: 'home' },
  { name: 'plans', key: 'nav.plans', icon: 'shield-checkmark-outline', iconOn: 'shield-checkmark' },
  { name: 'wearable', key: 'app.tab.wearable', icon: 'pulse', iconOn: 'pulse', center: true },
  { name: 'claims', key: 'nav.claims', icon: 'document-text-outline', iconOn: 'document-text' },
  { name: 'account', key: 'app.tab.account', icon: 'person-outline', iconOn: 'person' },
];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const { c, isDark } = useTheme(); const { t } = useI18n(); const tc = useTC(); const ins = useSafeAreaInsets(); const { maxW } = useLayout();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', backgroundColor: 'transparent' }} pointerEvents="box-none">
      <View style={{ width: '100%', maxWidth: maxW ? maxW + 40 : undefined, backgroundColor: c.tabBg, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', paddingTop: 8, paddingBottom: Math.max(ins.bottom, 10),
        borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: c.shadow, shadowOpacity: isDark ? 0 : 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: -6 }, elevation: 14 }}>
        {state.routes.map((route, i) => {
          const def = TABS.find((x) => x.name === route.name); if (!def) return null;
          const focused = state.index === i; const label = tc(t(def.key));
          const press = () => {
            tap();
            const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !ev.defaultPrevented) navigation.navigate(route.name as never);
          };
          if (def.center) {
            return (
              <Pressable key={route.key} testID={`tab-${route.name}`} onPress={press} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: focused }} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ marginTop: -30, width: 64, height: 64, borderRadius: 32, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: c.tabBg,
                  shadowColor: c.red, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10 }}>
                  <Ionicons name="pulse" size={30} color="#fff" />
                </View>
                <Txt v="caption" w={focused ? '700' : '500'} color={focused ? c.accent : c.mute} style={{ marginTop: 0 }} numberOfLines={1} fit>{label}</Txt>
              </Pressable>
            );
          }
          return (
            <Pressable key={route.key} testID={`tab-${route.name}`} onPress={press} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: focused }} style={{ flex: 1, alignItems: 'center', paddingTop: 2, minHeight: 50 }}>
              <View style={{ height: 30, width: 56, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? c.redT : 'transparent' }}>
                <Ionicons name={focused ? def.iconOn : def.icon} size={23} color={focused ? c.accent : c.mute} />
              </View>
              <Txt v="caption" w={focused ? '700' : '500'} color={focused ? c.accent : c.mute} numberOfLines={1} fit style={{ marginTop: 2 }}>{label}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg }, animation: 'fade' }}>
      {TABS.map((tb) => <Tabs.Screen key={tb.name} name={tb.name} />)}
    </Tabs>
  );
}
