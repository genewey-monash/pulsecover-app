import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { BackHandler, Keyboard, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
  PublicSans_400Regular, PublicSans_500Medium, PublicSans_600SemiBold, PublicSans_700Bold, PublicSans_800ExtraBold, useFonts,
} from '@expo-google-fonts/public-sans';
import { ThemeProvider, useTheme } from '../lib/theme';
import { I18nProvider, useI18n } from '../lib/i18n';
import { AuthProvider, useAuth } from '../lib/auth';
import { DataProvider } from '../lib/data';
import { setLangGetter } from '../lib/api';
import { BiometricLock, IdleGuard, OfflineBanner, ToastProvider, touchActivity } from '../lib/overlays';
import { DrawerProvider } from '../lib/drawer';
import { SubscriptionProvider } from '../lib/subscription';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { c, isDark } = useTheme(); const { lang, ready: langReady } = useI18n(); const { ready: authReady } = useAuth();
  const [fontsLoaded, fontError] = useFonts({ PublicSans_400Regular, PublicSans_500Medium, PublicSans_600SemiBold, PublicSans_700Bold, PublicSans_800ExtraBold });
  setLangGetter(() => lang);
  const ready = (fontsLoaded || !!fontError) && langReady && authReady;
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  // Android: the first Back press closes the keyboard instead of leaving the screen (and losing what was typed).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (Keyboard.isVisible()) { Keyboard.dismiss(); return true; } return false; });
    return () => sub.remove();
  }, [ready]);
  if (!ready) return null;
  const nav = isDark ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: c.bg, card: c.bg, primary: c.red } } : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: c.bg, card: c.bg, primary: c.red } };
  return (
    <NavThemeProvider value={nav}>
      <View style={{ flex: 1, backgroundColor: c.bg }} onStartShouldSetResponderCapture={() => { touchActivity(); return false; }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <DrawerProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="thanks" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack>
        <OfflineBanner />
        <IdleGuard />
        <BiometricLock />
        </DrawerProvider>
      </View>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <DataProvider>
                <ToastProvider>
                  <SubscriptionProvider>
                    <Shell />
                  </SubscriptionProvider>
                </ToastProvider>
              </DataProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
