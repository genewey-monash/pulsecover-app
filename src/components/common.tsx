import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Chip, Icon, Row, Sheet, TopInsetCtx, Txt, tap } from './ui';
import { LANGS, useI18n } from '../lib/i18n';
import { radius, useTheme } from '../lib/theme';

export const IMG = {
  hero: require('../../assets/img/hero-family.jpg'),
  three: require('../../assets/img/three-ages.jpg'),
  advisor: require('../../assets/img/advisor.jpg'),
  senior: require('../../assets/img/senior-walk.jpg'),
  teen: require('../../assets/img/teen-guardian.jpg'),
  referral: require('../../assets/img/referral-friends.jpg'),
  wrist: require('../../assets/img/connect-wrist.jpg'),
  claims: require('../../assets/img/claims-relief.jpg'),
  team: require('../../assets/img/team-meeting.jpg'),
  cafe: require('../../assets/img/cafe-phone.jpg'),
  logo: require('../../assets/img/logo-mark.png'),
};

export function Logo({ size = 40, text = true }: { size?: number; text?: boolean }) {
  return (
    <Row gap={10}>
      <Image source={IMG.logo} style={{ width: size, height: size, borderRadius: size * 0.22 }} contentFit="contain" />
      {text ? <Txt v="h2" w="800">PulseCover</Txt> : null}
    </Row>
  );
}

export function IconButton({ name, onPress, label, badge }: { name: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void; label: string; badge?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.line : c.bgAlt })}>
      <Ionicons name={name} size={22} color={c.ink} />
      {badge ? <View style={{ position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: c.red, borderWidth: 1.5, borderColor: c.bgAlt }} /> : null}
    </Pressable>
  );
}

export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { lang, setLang, t } = useI18n(); const { c } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('nav.language')}>
      {LANGS.map((l) => (
        <Pressable key={l.code} testID={`lang-${l.code}`} onPress={() => { tap(); setLang(l.code); onClose(); }} accessibilityRole="radio" accessibilityState={{ selected: lang === l.code }}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16, marginBottom: 8, borderRadius: radius.md, borderWidth: 1.5,
            borderColor: lang === l.code ? c.red : c.line, backgroundColor: lang === l.code ? c.redT : pressed ? c.bgAlt : 'transparent' })}>
          <Txt w="700" color={lang === l.code ? c.accent : c.ink} style={{ fontSize: 17 }}>{l.label}</Txt>
          {lang === l.code ? <Icon name="checkmark-circle" size={24} color={c.accent} /> : <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.line }} />}
        </Pressable>
      ))}
    </Sheet>
  );
}

export const LANG_CODE: Record<string, string> = { en: 'EN', zh: 'CN', ms: 'MY', ta: 'TM' };
export function LangButton({ force }: { force?: boolean } = {}) {
  const { lang } = useI18n(); const { c } = useTheme(); const [open, setOpen] = useState(false);
  const underBar = !React.useContext(TopInsetCtx);
  if (underBar && !force) return null; // the app bar already has the language button
  return (
    <>
      <Pressable testID="lang-btn" onPress={() => { tap(); setOpen(true); }} accessibilityRole="button" accessibilityLabel="Language" hitSlop={6}
        style={({ pressed }) => ({ height: 44, paddingHorizontal: 12, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: pressed ? c.line : c.bgAlt })}>
        <Ionicons name="globe-outline" size={20} color={c.ink} />
        <Txt v="label" w="700">{LANG_CODE[lang]}</Txt>
      </Pressable>
      <LanguageSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Small "login first" gate used by tabs that need an account. */
export function PlanChips({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useI18n();
  return <Row gap={8} wrap>{['A', 'B', 'C', 'D'].map((id) => <Chip key={id} label={`${t('plan.word')} ${id}`} on={value === id} onPress={() => onChange(id)} />)}</Row>;
}
