import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, ErrorBox, Field, Gap, Notice, Screen, ScreenHeader, Txt, success } from '../components/ui';
import { strength } from '../components/forms';
import { api } from '../lib/api';
import { errorText } from '../lib/errors';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

export default function Password() {
  const { t } = useI18n(); const { c } = useTheme();
  const [f, setF] = useState({ cur: '', pw: '', pw2: '' }); const [e, setE] = useState<Record<string, string | null>>({}); const [top, setTop] = useState<string | null>(null); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setE((p) => ({ ...p, [k]: null })); setOk(false); };
  const s = strength(f.pw); const colors = [c.bad, '#E8590C', c.gold, '#6BAA2E', c.ok];
  const save = async () => {
    setTop(null); setOk(false);
    const err = { cur: f.cur ? null : t('common.required'), pw: f.pw.length >= 8 ? null : t('acc.err.pwlen'), pw2: f.pw === f.pw2 ? null : t('acc.err.match') };
    setE(err); if (Object.values(err).some(Boolean)) { setTop(t('pf.fix')); return; }
    setBusy(true);
    try { await api('/password', { current: f.cur, password: f.pw, password2: f.pw2 }); setOk(true); success(); setF({ cur: '', pw: '', pw2: '' }); }
    catch (x) { const m = errorText(x, t); if (/incorrect|login|password/i.test(String((x as Error).message))) { setE({ cur: t('pf.pw.wrong') }); setTop(t('pf.pw.wrong')); } else setTop(m); }
    finally { setBusy(false); }
  };
  return (
    <Screen keyboard>
      <ScreenHeader title={t('pf.pw.h')} />
      <Field label={t('pf.pw.cur')} value={f.cur} onChangeText={set('cur')} error={e.cur} secure autoCapitalize="none" left="key-outline" />
      <Field label={t('pf.pw.new')} value={f.pw} onChangeText={set('pw')} error={e.pw} secure autoCapitalize="none" left="lock-closed-outline" />
      {f.pw ? <View style={{ marginTop: 10 }}><View style={{ height: 6, borderRadius: 3, backgroundColor: c.line, overflow: 'hidden' }}><View style={{ height: 6, width: `${[12, 30, 55, 80, 100][s]}%`, backgroundColor: colors[s] }} /></View><Txt v="caption" w="700" color={colors[s]} style={{ marginTop: 4 }}>{t(`acc.pw.${s}`)}</Txt></View> : null}
      <Field label={t('field.password2')} value={f.pw2} onChangeText={set('pw2')} error={e.pw2} secure autoCapitalize="none" left="lock-closed-outline" />
      <ErrorBox text={top} />
      {ok ? <Notice text={t('pf.pw.done')} /> : null}
      <Gap h={22} />
      <Button title={t('pf.pw.btn')} loading={busy} icon="save" onPress={save} />
    </Screen>
  );
}
