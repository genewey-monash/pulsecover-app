import React, { useMemo, useRef, useEffect, useState } from 'react';
import { TextInput, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Chip, EmptyState, Icon, IconName, Row, Screen, Tile, Txt, fontFor, tap } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

interface Item { href: string; params?: Record<string, string>; icon: IconName; title: string; sub: string; group: string; kw: string }

export default function Search() {
  const router = useRouter(); const { t, lang } = useI18n(); const { c } = useTheme(); const { user } = useAuth();
  const [q, setQ] = useState(''); const input = useRef<TextInput>(null);
  useEffect(() => { const id = setTimeout(() => input.current?.focus(), 350); return () => clearTimeout(id); }, []);

  const items = useMemo<Item[]>(() => {
    const pg = t('search.g.page'), tl = t('search.g.tool'), pl = t('search.g.plan'), fq = t('search.g.faq');
    const list: Item[] = [
      { href: '/(tabs)', icon: 'home', title: t('app.tab.home'), sub: t('home.sub'), group: pg, kw: 'home dashboard overview rating' },
      { href: '/(tabs)/plans', icon: 'shield-checkmark', title: t('plans.h1'), sub: t('plans.sub'), group: pg, kw: 'plans products cover insurance a b c d' },
      { href: '/(tabs)/wearable', icon: 'pulse', title: t('connect.h1'), sub: t('connect.sub'), group: tl, kw: 'connect wearable fitbit garmin whoop google health sync device' },
      { href: '/(tabs)/claims', icon: 'document-text', title: t('cl.h1'), sub: t('cl.sub'), group: tl, kw: 'claim claims hospital accident track file' },
      { href: '/calculator', icon: 'calculator', title: t('calc.h1'), sub: t('calc.sub'), group: tl, kw: 'calculator premium price quote slider steps sleep' },
      { href: '/compare', icon: 'git-compare', title: t('nav.compare'), sub: t('cmpt.h'), group: tl, kw: 'compare plans table' },
      { href: '/apply', icon: 'shield-checkmark', title: t('apply.h1'), sub: t('apply.sub'), group: tl, kw: 'apply get covered buy policy join' },
      { href: '/callback', icon: 'call', title: t('cb.h'), sub: t('cb.sub'), group: tl, kw: 'call back talk phone request' },
      { href: '/contact', icon: 'mail', title: t('ct.h1'), sub: t('ct.sub'), group: pg, kw: 'contact email message support' },
      { href: '/business', icon: 'briefcase', title: t('sme.h1'), sub: t('sme.sub'), group: pg, kw: 'business sme company group employees' },
      { href: '/how', icon: 'school', title: t('how.h1'), sub: t('how.sub'), group: pg, kw: 'how pricing works rules rating grade' },
      { href: '/privacy', icon: 'lock-closed', title: t('prv.h1'), sub: t('prv.sub'), group: pg, kw: 'privacy data security' },
      { href: '/investors', icon: 'stats-chart', title: t('inv.h1'), sub: t('inv.sub'), group: pg, kw: 'investors market financial numbers' },
      { href: '/faq', icon: 'help-circle', title: t('faq.h1'), sub: '', group: pg, kw: 'faq help questions' },
      { href: user ? '/profile' : '/login', icon: 'person', title: user ? t('pf.h1') : t('nav.login'), sub: t('pf.sub'), group: pg, kw: 'profile account login register password logout' },
      { href: '/referral', icon: 'gift', title: t('ref.h'), sub: t('ref.p'), group: tl, kw: 'referral refer friend code' },
    ];
    for (const id of ['A', 'B', 'C', 'D']) list.push({ href: '/plan-result', params: { plan: id }, icon: 'shield', title: `${t('plan.word')} ${id}`, sub: t(`cov.${id}`), group: pl, kw: `plan ${id} cover` });
    for (let i = 1; i <= 9; i++) list.push({ href: '/faq', params: { open: String(i) }, icon: 'help-circle-outline', title: t(`faq.q${i}`), sub: t(`faq.a${i}`), group: fq, kw: t(`faq.a${i}`) });
    return list;
  }, [t, user]);

  const res = useMemo(() => {
    const s = q.trim().toLowerCase(); if (!s) return [];
    const words = s.split(/\s+/);
    return items.map((it) => {
      const title = it.title.toLowerCase(), kw = (it.kw + ' ' + it.sub).toLowerCase(); let sc = 0;
      for (const w of words) { if (title.startsWith(w)) sc += 6; else if (title.includes(w)) sc += 4; else if (kw.includes(w)) sc += 1; else { sc = -1; break; } }
      return { it, sc };
    }).filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 25).map((x) => x.it);
  }, [q, items]);

  const popular: [string, string][] = [['nav.calc', '/calculator'], ['nav.connect', '/(tabs)/wearable'], ['nav.claims', '/(tabs)/claims'], ['nav.faq', '/faq'], ['nav.plans', '/(tabs)/plans']];
  const go = (it: Item) => router.push((it.params ? { pathname: it.href, params: it.params } : it.href) as any);
  return (
    <Screen keyboard>
      <Row gap={10} style={{ paddingTop: 8, paddingBottom: 14 }}>
        <Pressable onPress={() => { tap(); router.back(); }} hitSlop={10} accessibilityLabel="Back" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.bgAlt, alignItems: 'center', justifyContent: 'center' }}><Icon name="chevron-back" /></Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.bgAlt, borderRadius: 24, paddingHorizontal: 16, minHeight: 48 }}>
          <Icon name="search" size={20} color={c.mute} />
          <TextInput ref={input} value={q} onChangeText={setQ} placeholder={t('search.ph')} placeholderTextColor={c.mute} autoCorrect={false} returnKeyType="search" selectionColor={c.red}
            style={[{ flex: 1, color: c.ink, fontSize: 16, paddingVertical: 10 }, fontFor(lang, '400')]} />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel={t('search.clear')}><Icon name="close-circle" size={20} color={c.mute} /></Pressable> : null}
        </View>
      </Row>
      {!q.trim() ? (
        <>
          <Txt v="label" color={c.mute} style={{ marginBottom: 10 }}>{t('search.popular')}</Txt>
          <Row wrap gap={10}>{popular.map(([k, h]) => <Chip key={k} label={t(k)} onPress={() => router.push(h as any)} />)}</Row>
        </>
      ) : res.length === 0 ? <EmptyState icon="search" title={t('search.none')} /> : res.map((it, i) => (
        <View key={i}>
          {i === 0 || res[i - 1].group !== it.group ? <Txt v="caption" w="700" color={c.mute} style={{ marginTop: 14, marginBottom: 6, textTransform: 'uppercase' }}>{it.group}</Txt> : null}
          <Card pad={12} onPress={() => go(it)} style={{ marginBottom: 8 }}>
            <Row gap={12}><Tile icon={it.icon} size="sm" />
              <View style={{ flex: 1 }}><Txt w="700" numberOfLines={2}>{it.title}</Txt>{it.sub ? <Txt v="caption" color={c.mute} numberOfLines={1}>{it.sub}</Txt> : null}</View></Row>
          </Card>
        </View>
      ))}
    </Screen>
  );
}
