import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleProp,
  Text, TextInput, TextInputProps, TextStyle, useWindowDimensions, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, useTheme } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { looksLikeSentence, titleCase } from '../lib/titlecase';
import { usePathname, useRouter } from 'expo-router';
import { useDrawer } from '../lib/drawerCtx';

/** Title Case for English UI labels (buttons, tabs, chips, headings). Other languages are left untouched. */
export function useTC() {
  const { lang } = useI18n();
  return (s: string) => (lang === 'en' && typeof s === 'string' && !looksLikeSentence(s) ? titleCase(s) : s);
}

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export const Icon = ({ name, size = 22, color, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) => {
  const { c } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? c.ink} style={style} />;
};

export const tap = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };
export const success = () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };
export const warn = () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); };

/* ---------- typography ---------- */
type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label';
const SIZES: Record<Variant, { size: number; lh: number; w: '400' | '500' | '600' | '700' | '800' }> = {
  display: { size: 32, lh: 40, w: '800' }, h1: { size: 26, lh: 34, w: '800' }, h2: { size: 20, lh: 28, w: '700' }, h3: { size: 16.5, lh: 24, w: '700' },
  body: { size: 15.5, lh: 24, w: '400' }, small: { size: 13.5, lh: 20, w: '400' }, caption: { size: 12, lh: 17, w: '500' }, label: { size: 13.5, lh: 18, w: '600' },
};
const FACE: Record<string, string> = { '400': 'PublicSans_400Regular', '500': 'PublicSans_500Medium', '600': 'PublicSans_600SemiBold', '700': 'PublicSans_700Bold', '800': 'PublicSans_800ExtraBold' };

export function fontFor(lang: string, weight: string) {
  // Public Sans covers Latin text. Chinese and Tamil use the system font so the characters render correctly.
  return lang === 'en' || lang === 'ms' ? { fontFamily: FACE[weight] || FACE['400'] } : { fontWeight: weight as TextStyle['fontWeight'] };
}

export interface TxtProps { v?: Variant; w?: '400' | '500' | '600' | '700' | '800'; color?: string; align?: TextStyle['textAlign']; style?: StyleProp<TextStyle>; children?: React.ReactNode; numberOfLines?: number; selectable?: boolean; fit?: boolean }
export function Txt({ v = 'body', w, color, align, style, children, numberOfLines, selectable, fit }: TxtProps) {
  const { c } = useTheme(); const { lang } = useI18n();
  const s = SIZES[v]; const tc = useTC();
  const shown = (v === 'display' || v === 'h1' || v === 'h2' || v === 'h3') && typeof children === 'string' ? tc(children) : children;
  const tall = lang === 'ta' ? 1.12 : 1; // Tamil glyphs need more line height
  return (
    <Text selectable={selectable} numberOfLines={fit ? (numberOfLines ?? 2) : numberOfLines} adjustsFontSizeToFit={fit} minimumFontScale={fit ? 0.72 : undefined}
      style={[{ fontSize: s.size, lineHeight: s.lh * tall, color: color ?? c.ink, textAlign: align }, fontFor(lang, w ?? s.w), style]}>
      {shown}
    </Text>
  );
}

/* ---------- layout ---------- */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= 700;
  return { width, height, wide, cols: width >= 1000 ? 3 : wide ? 2 : 1, maxW: wide ? 760 : undefined as number | undefined, landscape: width > height };
}

interface ScreenProps {
  children: React.ReactNode; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void; padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>; bottomPad?: number; keyboard?: boolean; bg?: string; noTop?: boolean;
}
/** False inside screens that sit under the app bar (the bar already covers the status-bar area). */
export const TopInsetCtx = React.createContext(true);
export function Screen({ children, scroll = true, refreshing, onRefresh, padded = true, contentStyle, bottomPad = 24, keyboard, bg, noTop: noTopProp }: ScreenProps) {
  const { c } = useTheme(); const ins = useSafeAreaInsets(); const { maxW } = useLayout();
  const topInset = React.useContext(TopInsetCtx); const noTop = noTopProp || !topInset;
  const inner = (
    <View style={[{ width: '100%', maxWidth: maxW, alignSelf: 'center', paddingHorizontal: padded ? 18 : 0 }, contentStyle]}>
      {React.Children.toArray(children).map((ch, i) => (React.isValidElement(ch) && ch.type === Sheet ? ch : <Enter key={(ch as any)?.key ?? i} i={i}>{ch}</Enter>))}
    </View>
  );
  const refresh = onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.red]} /> : undefined;
  const pad = { paddingTop: noTop ? 0 : ins.top, paddingBottom: bottomPad + ins.bottom, flexGrow: 1 };
  const body = !scroll ? <View style={{ flex: 1, paddingTop: noTop ? 0 : ins.top, paddingBottom: ins.bottom }}>{inner}</View>
    : keyboard ? (
      <KeyboardAwareScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={pad} bottomOffset={96} refreshControl={refresh}>{inner}</KeyboardAwareScrollView>
    ) : (
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={pad} refreshControl={refresh}>{inner}</ScrollView>
    );
  return (
    <View style={{ flex: 1, backgroundColor: bg ?? c.bg }}>
      {body}
      {noTop ? null : <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ins.top, backgroundColor: bg ?? c.bg }} />}
    </View>
  );
}

/** Pages opened from the left menu: they show the menu button, not a back arrow. */
const TOP_LEVEL = ['/calculator', '/compare', '/referral', '/faq', '/contact', '/how', '/privacy', '/business', '/callback', '/apply', '/search', '/rewards', '/campaigns', '/premium'];
export function ScreenHeader({ title, subtitle, right, onBack, back = true }: { title: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void; back?: boolean }) {
  const { c } = useTheme(); const { show } = useDrawer(); const path = usePathname(); const router = useRouter();
  // Pages reached from the menu get the menu button; detail pages opened from inside a page get a back arrow.
  const isTop = TOP_LEVEL.includes(path);
  const goBack = () => { if (onBack) onBack(); else if (router.canGoBack()) router.back(); else router.replace('/(tabs)' as never); };
  const button = !isTop || onBack ? { icon: 'chevron-back' as const, label: 'Back', press: goBack } : { icon: 'menu' as const, label: 'Menu', press: show };
  return (
    <View style={{ paddingTop: 8, paddingBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
        {back ? (
          <Pressable accessibilityRole="button" accessibilityLabel={button.label} hitSlop={10}
            onPress={() => { tap(); button.press(); }}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.line : c.bgAlt, marginRight: 12 })}>
            <Icon name={button.icon} size={button.icon === 'menu' ? 26 : 22} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Txt v="h2" numberOfLines={2}>{title}</Txt>
        </View>
        {right}
      </View>
      {subtitle ? <Txt v="small" color={c.mute} style={{ marginTop: 6 }}>{subtitle}</Txt> : null}
    </View>
  );
}

export function Card({ children, style, onPress, tone = 'plain', pad = 18 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: 'plain' | 'gold' | 'red' | 'soft'; pad?: number }) {
  const { c, isDark } = useTheme();
  const bg = tone === 'gold' ? c.goldT : tone === 'red' ? c.redT : tone === 'soft' ? c.bgAlt : c.surface;
  const border = tone === 'gold' ? c.goldLine : c.line;
  const base: ViewStyle = { backgroundColor: bg, borderRadius: radius.lg, borderWidth: 1, borderColor: border, padding: pad,
    shadowColor: c.shadow, shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: isDark || tone !== 'plain' ? 0 : 1 };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [base, pressed && { opacity: 0.86, transform: [{ scale: 0.99 }] }, style]}>{children}</Pressable>;
}

/** Buttons side by side: always the same height, whatever the language. */
export const ButtonRow = ({ children, gap = 10 }: { children: React.ReactNode; gap?: number }) => <View style={{ flexDirection: 'row', gap, alignItems: 'stretch' }}>{children}</View>;

/** Staggered fade + rise entrance. Wrap blocks and give each a rising `i` so a screen builds in smoothly. */
export function Enter({ i = 0, children, style }: { i?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 420, delay: Math.min(i, 8) * 55, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [a, i]);
  return <Animated.View style={[{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>{children}</Animated.View>;
}

/** Equal-width, equal-height cards in a wrapping grid. Always use this for sibling cards so shapes never differ. */
export function CardGrid({ cols = 2, gap = 12, children }: { cols?: number; gap?: number; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean) as React.ReactElement<{ style?: StyleProp<ViewStyle> }>[];
  const pct = `${(100 / cols).toFixed(4)}%` as any;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2, marginVertical: -gap / 2 }}>
      {items.map((child, i) => (
        <View key={child.key ?? i} style={{ width: pct, padding: gap / 2 }}>
          {React.cloneElement(child, { style: [child.props.style, { flex: 1 }] })}
        </View>
      ))}
    </View>
  );
}

/** The one icon tile used everywhere: md for feature cards, sm for list rows. */
export function Tile({ icon, size = 'md', tone = 'red', color }: { icon: IconName; size?: 'sm' | 'md'; tone?: 'red' | 'ok' | 'err' | 'gold'; color?: string }) {
  const { c } = useTheme();
  const d = size === 'md' ? 46 : 38; const bg = { red: c.redT, ok: c.okT, err: c.errBg, gold: c.goldT }[tone]; const fg = { red: c.accent, ok: c.ok, err: c.bad, gold: c.gold }[tone];
  return <View style={{ width: d, height: d, borderRadius: size === 'md' ? 14 : 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={size === 'md' ? 24 : 20} color={color ?? fg} /></View>;
}
/** Numbered circle for steps. */
export function NumDot({ n }: { n: number | string }) {
  const { c } = useTheme();
  return <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.redT, alignItems: 'center', justifyContent: 'center' }}><Txt v="label" w="800" color={c.accent}>{n}</Txt></View>;
}

export const Gap = ({ h = 16, w }: { h?: number; w?: number }) => <View style={{ height: h, width: w }} />;
export const Row = ({ children, style, gap = 12, wrap, align = 'center' }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number; wrap?: boolean; align?: ViewStyle['alignItems'] }) =>
  <View style={[{ flexDirection: 'row', alignItems: align, gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;

export function SectionTitle({ children, action, onAction }: { children: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <Row style={{ marginTop: 26, marginBottom: 12, justifyContent: 'space-between' }}>
      <Txt v="h3" style={{ flex: 1 }}>{children}</Txt>
      {action ? <Pressable onPress={() => { tap(); onAction?.(); }} hitSlop={10}><Txt v="label" color={c.accent}>{action}</Txt></Pressable> : null}
    </Row>
  );
}

/* ---------- buttons ---------- */
interface BtnProps { title: string; onPress?: () => void; variant?: 'primary' | 'ghost' | 'light' | 'soft' | 'danger' | 'gold'; loading?: boolean; disabled?: boolean; icon?: IconName; full?: boolean; small?: boolean; style?: StyleProp<ViewStyle> }
export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, full = true, small, style }: BtnProps) {
  const { c } = useTheme(); const tc = useTC();
  const scale = useRef(new Animated.Value(1)).current;
  const p = {
    primary: { bg: c.red, fg: c.onRed, bd: c.red }, ghost: { bg: 'transparent', fg: c.accent, bd: c.accent }, light: { bg: '#FFFFFF', fg: '#B71234', bd: '#FFFFFF' },
    soft: { bg: c.redT, fg: c.accent, bd: 'transparent' }, danger: { bg: 'transparent', fg: c.bad, bd: c.bad }, gold: { bg: c.gold, fg: '#3B2A00', bd: c.gold },
  }[variant];
  const off = disabled || loading;
  return (
    <Animated.View style={[{ transform: [{ scale }], alignSelf: full ? 'stretch' : 'flex-start', justifyContent: 'center' }, style]}>
      <Pressable testID={'btn-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} accessibilityRole="button" accessibilityState={{ disabled: !!off, busy: !!loading }} disabled={off}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start()}
        onPress={() => { tap(); onPress?.(); }}
        style={{ flexGrow: 1, minHeight: small ? 44 : 52, paddingHorizontal: small ? 18 : 24, borderRadius: radius.pill, backgroundColor: p.bg, borderWidth: 1.5, borderColor: p.bd,
          alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: off && !loading ? 0.5 : 1 }}>
        {loading ? <ActivityIndicator color={p.fg} /> : (
          <>
            {icon ? <Ionicons name={icon} size={small ? 18 : 20} color={p.fg} /> : null}
            <Txt v={small ? 'small' : 'body'} w="700" color={p.fg} align="center" style={{ flexShrink: 1 }}>{tc(title)}</Txt>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ---------- forms ---------- */
export function ErrorBox({ text }: { text?: string | null }) {
  const { c } = useTheme(); const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (text) { a.setValue(0); Animated.timing(a, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start(); warn(); } }, [text, a]);
  if (!text) return null;
  return (
    <Animated.View accessibilityRole="alert" style={{ opacity: a, transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }], marginTop: 8,
      flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: c.errBg, borderColor: c.errLine, borderWidth: 1, borderRadius: radius.md, padding: 12 }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.bad, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        <Txt v="caption" w="800" color="#fff" style={{ lineHeight: 15 }}>!</Txt>
      </View>
      <Txt v="small" w="600" color={c.errText} style={{ flex: 1 }}>{text}</Txt>
    </Animated.View>
  );
}
export function Notice({ text, tone = 'ok' }: { text?: string | null; tone?: 'ok' | 'info' }) {
  const { c } = useTheme();
  if (!text) return null;
  return (
    <View accessibilityRole="alert" style={{ marginTop: 10, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: tone === 'ok' ? c.okT : c.goldT, borderColor: tone === 'ok' ? c.ok : c.goldLine, borderWidth: 1, borderRadius: radius.md, padding: 12 }}>
      <Ionicons name={tone === 'ok' ? 'checkmark-circle' : 'information-circle'} size={20} color={tone === 'ok' ? c.ok : c.gold} />
      <Txt v="small" w="600" style={{ flex: 1 }}>{text}</Txt>
    </View>
  );
}

interface FieldProps extends Omit<TextInputProps, 'style'> { label?: string; error?: string | null; help?: string; secure?: boolean; right?: React.ReactNode; left?: IconName; onPress?: () => void; valueText?: string; multiline?: boolean; disabled?: boolean }
export const Field = React.forwardRef<TextInput, FieldProps>(function Field({ label, error, help, secure, right, left, onPress, valueText, disabled, ...rest }, ref) {
  const { c } = useTheme(); const { lang, t } = useI18n(); const [show, setShow] = useState(false); const [focus, setFocus] = useState(false);
  const border = error ? c.bad : focus ? c.red : c.line;
  const box: ViewStyle = { minHeight: 52, borderRadius: radius.md, borderWidth: 1.5, borderColor: border, backgroundColor: error ? c.errBg : disabled ? c.bgAlt : c.input, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 };
  return (
    <View style={{ marginTop: 16 }}>
      {label ? <Txt v="label" style={{ marginBottom: 7 }}>{label}</Txt> : null}
      {onPress ? (
        <Pressable testID={label ? 'f-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : undefined} onPress={() => { tap(); onPress(); }} style={box} accessibilityRole="button">
          {left ? <Ionicons name={left} size={20} color={c.mute} /> : null}
          <Txt style={{ flex: 1 }} color={valueText ? c.ink : c.mute}>{valueText || rest.placeholder || ''}</Txt>
          <Ionicons name="chevron-down" size={18} color={c.mute} />
        </Pressable>
      ) : (
        <View style={box}>
          {left ? <Ionicons name={left} size={20} color={c.mute} /> : null}
          <TextInput ref={ref} testID={rest.testID ?? (label ? 'f-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : undefined)} editable={!disabled} placeholderTextColor={c.mute} secureTextEntry={secure && !show} selectionColor={c.red}
            onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }} onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
            style={[{ flex: 1, color: disabled ? c.mute : c.ink, fontSize: 16, paddingVertical: 12, textAlignVertical: rest.multiline ? 'top' : 'center', minHeight: rest.multiline ? 96 : undefined }, fontFor(lang, '400')]}
            {...rest} />
          {secure ? <Pressable hitSlop={10} onPress={() => { tap(); setShow((s) => !s); }} accessibilityLabel={show ? t('acc.hide') : t('acc.show')}><Txt v="label" color={c.accent}>{show ? t('acc.hide') : t('acc.show')}</Txt></Pressable> : null}
          {right}
        </View>
      )}
      <ErrorBox text={error} />
      {help && !error ? <Txt v="caption" color={c.mute} style={{ marginTop: 6 }}>{help}</Txt> : null}
    </View>
  );
});

export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName }) {
  const { c } = useTheme(); const tc = useTC();
  return (
    <Pressable onPress={() => { tap(); onPress?.(); }} accessibilityRole="button" accessibilityState={{ selected: !!on }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, minHeight: 40, borderRadius: radius.pill, borderWidth: 1.5, borderColor: on ? c.red : c.track, backgroundColor: on ? c.red : c.surface }}>
      {icon ? <Ionicons name={icon} size={16} color={on ? '#FFFFFF' : c.mute} /> : null}
      <Txt v="label" w={on ? '700' : '600'} color={on ? '#FFFFFF' : c.ink}>{tc(label)}</Txt>
    </Pressable>
  );
}

export function Badge({ label, tone = 'red' }: { label: string; tone?: 'red' | 'gold' | 'ok' | 'mute' | 'dark' | 'solid' }) {
  const { c } = useTheme();
  const m = { red: [c.redT, c.accent], gold: [c.gold, '#3B2A00'], ok: [c.okT, c.ok], mute: [c.bgAlt, c.mute], dark: [c.ink, c.bg], solid: [c.red, '#FFFFFF'] }[tone];
  return <View style={{ backgroundColor: m[0], paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' }}><Txt v="caption" w="700" color={m[1]}>{label}</Txt></View>;
}

export function ListRow({ icon, title, subtitle, onPress, right, danger, last, tint }: { icon?: IconName; title: string; subtitle?: string; onPress?: () => void; right?: React.ReactNode; danger?: boolean; last?: boolean; tint?: string }) {
  const { c } = useTheme(); const tc = useTC();
  return (
    <Pressable onPress={onPress ? () => { tap(); onPress(); } : undefined} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line, backgroundColor: pressed ? c.bgAlt : 'transparent' })}>
      {icon ? <Tile icon={icon} size="sm" tone={danger ? 'err' : 'red'} color={tint} /> : null}
      <View style={{ flex: 1 }}>
        <Txt v="body" w="600" color={danger ? c.bad : c.ink}>{tc(title)}</Txt>
        {subtitle ? <Txt v="small" color={c.mute} style={{ marginTop: 1 }}>{subtitle}</Txt> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={c.mute} /> : null)}
    </Pressable>
  );
}
export const Group = ({ children }: { children: React.ReactNode }) => {
  const { c } = useTheme();
  return <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>{children}</View>;
};

/* ---------- bottom sheet ---------- */
export function Sheet({ visible, onClose, title, children, dismissable = true }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode; dismissable?: boolean }) {
  const { c } = useTheme(); const ins = useSafeAreaInsets(); const { height, maxW } = useLayout();
  const y = useRef(new Animated.Value(0)).current; const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) { setMounted(true); Animated.parallel([Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }), Animated.spring(y, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 3 })]).start(); }
    else if (mounted) Animated.parallel([Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }), Animated.timing(y, { toValue: 0, duration: 200, useNativeDriver: true })]).start(() => setMounted(false));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={() => dismissable && onClose()} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={{ flex: 1, backgroundColor: c.overlay, opacity: fade, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => dismissable && onClose()} accessibilityLabel="Close" />
          <Animated.View style={{ transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }], backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingBottom: ins.bottom + 18, paddingHorizontal: 20, paddingTop: 10, maxHeight: height * 0.92, width: '100%', maxWidth: maxW ?? undefined, alignSelf: 'center' }}>
            <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: c.line, marginBottom: 14 }} />
            {title ? <Txt v="h2" style={{ marginBottom: 12 }}>{title}</Txt> : null}
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------- misc ---------- */
export function Hero({ source, height = 190, children, radiusPx = 24 }: { source: any; height?: number; children?: React.ReactNode; radiusPx?: number }) {
  return (
    <View style={{ height, borderRadius: radiusPx, overflow: 'hidden' }}>
      <ExpoImage source={source} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={250} />
      <LinearGradient colors={['rgba(18,16,22,0.05)', 'rgba(18,16,22,0.72)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ position: 'absolute', left: 18, right: 18, bottom: 16 }}>{children}</View>
    </View>
  );
}

export function EmptyState({ icon, title, text, action, onAction }: { icon: IconName; title: string; text?: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 12 }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: c.redT, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Ionicons name={icon} size={36} color={c.accent} /></View>
      <Txt v="h3" align="center">{title}</Txt>
      {text ? <Txt v="small" color={c.mute} align="center" style={{ marginTop: 6, maxWidth: 320 }}>{text}</Txt> : null}
      {action ? <View style={{ marginTop: 18 }}><Button title={action} onPress={onAction} full={false} small /></View> : null}
    </View>
  );
}

export function Skeleton({ h = 16, w = '100%', r = 8, style }: { h?: number; w?: number | string; r?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme(); const a = useRef(new Animated.Value(0.45)).current;
  useEffect(() => { const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 750, useNativeDriver: true }), Animated.timing(a, { toValue: 0.45, duration: 750, useNativeDriver: true })])); l.start(); return () => l.stop(); }, [a]);
  return <Animated.View style={[{ height: h, width: w as any, borderRadius: r, backgroundColor: c.line, opacity: a }, style]} />;
}

export function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  const ini = (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  return (
    <LinearGradient colors={['#C21A3E', '#8E0E28']} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Txt w="800" color="#fff" style={{ fontSize: size * 0.36, lineHeight: size * 0.5 }}>{ini}</Txt>
    </LinearGradient>
  );
}

export function ProgressDots({ step, total }: { step: number; total: number }) {
  const { c } = useTheme();
  return <Row gap={6}>{Array.from({ length: total }).map((_, i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < step ? c.red : c.line }} />)}</Row>;
}
