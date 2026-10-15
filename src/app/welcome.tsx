import React, { useRef, useState } from 'react';
import { Animated, FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Row, Txt, useTC } from '../components/ui';
import { IMG, LangButton, Logo } from '../components/common';
import { useI18n } from '../lib/i18n';
import { kv } from '../lib/storage';

const SLIDES = [
  { img: IMG.hero, h: 'home.s1.h', p: 'home.s1.p' },
  { img: IMG.wrist, h: 'home.s2.h', p: 'home.s2.p' },
  { img: IMG.three, h: 'home.s3.h', p: 'home.s3.p' },
  { img: IMG.senior, h: 'home.s4.h', p: 'home.s4.p' },
];

export default function Welcome() {
  const router = useRouter(); const { t } = useI18n(); const tc = useTC(); const ins = useSafeAreaInsets(); const { width, height } = useWindowDimensions();
  const [idx, setIdx] = useState(0); const x = useRef(new Animated.Value(0)).current; const list = useRef<FlatList>(null);
  const enter = async (to: string) => { await kv.set('pc_seen', '1'); router.replace(to as any); };
  const tall = height > 640;
  return (
    <View style={{ flex: 1, backgroundColor: '#121016' }}>
      <StatusBar style="light" />
      <Animated.FlatList ref={list as any} data={SLIDES} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(_, i) => String(i)}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: false })} scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <Image source={item.img} style={{ width, height: tall ? height * 0.66 : height }} contentFit="cover" />
            <LinearGradient colors={['rgba(18,16,22,0.15)', 'rgba(18,16,22,0.0)', '#121016']} locations={[0, 0.35, 0.78]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: tall ? height * 0.7 : height }} />
          </View>
        )} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })} />
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: ins.top + 10, paddingHorizontal: 18 }}>
        <Row style={{ justifyContent: 'space-between' }}><View style={{ backgroundColor: 'rgba(255,255,255,0.94)', paddingVertical: 6, paddingLeft: 6, paddingRight: 14, borderRadius: 16 }}><Logo size={34} color="#26242F" /></View><LangButton /></Row>
      </View>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingBottom: ins.bottom + 22, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 520 }}>
          <Txt v="h1" color="#fff" align="center" style={{ fontSize: 27 }}>{t(SLIDES[idx].h).replace(/^\d\.\s*/, '')}</Txt>
          <Txt color="rgba(255,255,255,0.78)" align="center" style={{ marginTop: 8, minHeight: 72 }}>{t(SLIDES[idx].p)}</Txt>
          <Row gap={8} style={{ justifyContent: 'center', marginVertical: 14 }}>
            {SLIDES.map((_, i) => (
              <Animated.View key={i} style={{ height: 8, borderRadius: 4, backgroundColor: '#E8A317',
                width: x.interpolate({ inputRange: [(i - 1) * width, i * width, (i + 1) * width], outputRange: [8, 26, 8], extrapolate: 'clamp' }),
                opacity: x.interpolate({ inputRange: [(i - 1) * width, i * width, (i + 1) * width], outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' }) }} />
            ))}
          </Row>
          <Button title={t('acc.register')} onPress={() => enter('/register')} />
          <View style={{ height: 10 }} />
          <Button title={t('nav.login')} variant="light" onPress={() => enter('/login')} />
          <Pressable onPress={() => enter('/(tabs)')} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'center', marginTop: 16, paddingVertical: 6 }}>
            <Txt w="700" color="rgba(255,255,255,0.86)">{tc(t('app.guest'))}</Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
