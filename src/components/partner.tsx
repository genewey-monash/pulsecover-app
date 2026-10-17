import React from 'react';
import { View } from 'react-native';
import { Icon, Txt, type IconName } from './ui';
import { useTheme } from '../lib/theme';

/** One icon tile for every voucher, perk, event and policy card: solid crimson when available, dashed outline plus a lock when not. */
export function PartnerTile({ icon, locked, size = 46 }: { icon: string; locked?: boolean; size?: number }) {
  const { c } = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: locked ? 'transparent' : c.red, borderWidth: 2, borderColor: locked ? c.mute : c.red, borderStyle: locked ? 'dashed' : 'solid' }}>
      <Icon name={`${icon}-outline` as IconName} size={size * 0.5} color={locked ? c.mute : '#fff'} />
      {locked ? <View style={{ position: 'absolute', right: -6, bottom: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: c.mute, borderWidth: 2, borderColor: c.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name="lock-closed" size={10} color={c.surface} /></View> : null}
    </View>
  );
}

/** The single "SAMPLE" label used on every placeholder card. */
export function SampleTag({ label }: { label: string }) {
  const { c } = useTheme();
  return <View style={{ borderWidth: 1, borderColor: c.mute, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}><Txt v="caption" w="800" color={c.mute}>{label}</Txt></View>;
}
