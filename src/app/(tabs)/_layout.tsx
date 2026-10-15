import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { IconButton, LangButton, Logo } from '../../components/common';
import { TopInsetCtx } from '../../components/ui';
import { MenuButton } from '../../lib/drawer';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';

const SCREENS = ['index', 'plans', 'wearable', 'claims', 'account'];

/** App bar shared by the main screens: menu (opens the left drawer), logo, language, search. */
function AppBar() {
  const { c } = useTheme(); const ins = useSafeAreaInsets(); const router = useRouter(); const { t } = useI18n();
  return (
    <View style={{ paddingTop: ins.top, backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <View style={{ height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 }}>
        <MenuButton />
        <Logo size={32} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <LangButton force />
          <IconButton name="search" label={t('search.g.page')} onPress={() => router.push('/search' as never)} />
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppBar />
      <TopInsetCtx.Provider value={false}>
        <Tabs tabBar={() => null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg }, animation: 'fade' }}>
          {SCREENS.map((name) => <Tabs.Screen key={name} name={name} />)}
        </Tabs>
      </TopInsetCtx.Provider>
    </View>
  );
}
