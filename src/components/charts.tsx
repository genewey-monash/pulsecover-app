import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../lib/theme';
import { Txt } from './ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function gradeColor(g: string | null | undefined, ok: string, gold: string, bad: string) {
  if (!g) return gold;
  if (g === 'A+' || g === 'A') return ok;
  if (g === 'B') return '#6BAA2E';
  if (g === 'C') return gold;
  return bad;
}

/** Animated circular score ring with the grade in the middle. */
export function ScoreRing({ score, grade, size = 150, label }: { score: number | null; grade: string | null; size?: number; label?: string }) {
  const { c } = useTheme();
  const stroke = Math.round(size * 0.085); const r = (size - stroke) / 2; const circ = 2 * Math.PI * r;
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: (score ?? 0) / 100, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const id = anim.addListener(({ value }) => setShown(Math.round(value * 100)));
    return () => anim.removeListener(id);
  }, [score, anim]);
  const col = gradeColor(grade, c.ok, c.gold, c.bad);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`${label ?? ''} ${score ?? '-'} / 100 ${grade ?? ''}`}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.line} strokeWidth={stroke} fill="none" />
          <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={`${circ} ${circ}`} strokeDashoffset={anim.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] }) as any} />
        </G>
      </Svg>
      <Txt w="800" color={col} style={{ fontSize: size * 0.3, lineHeight: size * 0.36 }}>{grade ?? '–'}</Txt>
      <Txt v="small" w="600" color={c.mute}>{score == null ? '–' : shown}/100</Txt>
    </View>
  );
}

/** Weekly score line chart. */
export function LineChart({ points, height = 170, width }: { points: { label: string; value: number }[]; height?: number; width: number }) {
  const { c } = useTheme();
  if (!points.length) return null;
  const padL = 30, padR = 10, padT = 12, padB = 26; const W = width, H = height;
  const x = (i: number) => padL + (W - padL - padR) * (points.length === 1 ? 0.5 : i / (points.length - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - Math.max(0, Math.min(100, v)) / 100);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L${x(0).toFixed(1)},${(H - padB).toFixed(1)} Z`;
  return (
    <Svg width={W} height={H}>
      <Defs><SvgGradient id="lg" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={c.red} stopOpacity="0.28" /><Stop offset="1" stopColor={c.red} stopOpacity="0" /></SvgGradient></Defs>
      {[0, 25, 50, 75, 100].map((g) => (
        <G key={g}>
          <Line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke={c.line} strokeWidth={1} />
          <SvgText x={padL - 6} y={y(g) + 4} fontSize={10} fill={c.mute} textAnchor="end">{g}</SvgText>
        </G>
      ))}
      {points.length > 1 ? <Path d={area} fill="url(#lg)" /> : null}
      {points.length > 1 ? <Path d={line} stroke={c.red} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
      {points.map((p, i) => (
        <G key={i}>
          <Circle cx={x(i)} cy={y(p.value)} r={5} fill={c.surface} stroke={c.red} strokeWidth={3} />
          {points.length <= 8 || i % 2 === 0 ? <SvgText x={x(i)} y={H - 8} fontSize={10} fill={c.mute} textAnchor="middle">{p.label}</SvgText> : null}
        </G>
      ))}
    </Svg>
  );
}

/** Horizontal metric bar (steps / exercise / sleep / heart). */
export function MetricBar({ label, value, right }: { label: string; value: number; right?: string }) {
  const { c } = useTheme(); const w = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(w, { toValue: Math.max(0, Math.min(100, value)), duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [value, w]);
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}><Txt v="small" w="600">{label}</Txt><Txt v="small" w="700" color={c.mute}>{right ?? `${Math.round(value)}`}</Txt></View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: 'hidden' }}>
        <Animated.View style={{ height: 8, borderRadius: 4, backgroundColor: c.red, width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
      </View>
    </View>
  );
}
