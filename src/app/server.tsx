import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Button, ErrorBox, Field, Gap, Notice, Screen, ScreenHeader, Txt } from '../components/ui';
import { ApiError, api, getBaseUrl, getDefaultUrl, normalise, setBaseUrl } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

/** Lets the group point the app at the lecturer's server without rebuilding it. */
export default function ServerSettings() {
  const { t } = useI18n(); const { c } = useTheme();
  const params = useLocalSearchParams<{ url?: string; apply?: string }>();
  const [url, setUrl] = useState(params.url ? String(params.url) : getBaseUrl()); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false);
  const test = async (save: boolean) => {
    setBusy(true); setMsg(null);
    const target = normalise(url);
    const prev = getBaseUrl();
    try {
      await setBaseUrl(target);
      const r = await api<{ ok: boolean; accounts?: number }>('/health', undefined, { timeout: 40000 });
      if (!r.ok) throw new ApiError('bad');
      if (!save) await setBaseUrl(prev === getDefaultUrl() ? null : prev);
      setMsg({ ok: true, text: `${t('app.server.ok')} ${target}` });
    } catch { await setBaseUrl(prev === getDefaultUrl() ? null : prev); setUrl(prev); setMsg({ ok: false, text: t('app.server.fail') }); } finally { setBusy(false); }
  };
  // pulsecover:///server?url=https://host&apply=1 configures the app in one tap (handy for a QR code or link on the download page)
  useEffect(() => { if (params.url && params.apply === '1') test(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen keyboard>
      <ScreenHeader title={t('app.server.h')} subtitle={t('app.server.p')} />
      <Field label="URL" value={url} onChangeText={(v) => { setUrl(v); setMsg(null); }} autoCapitalize="none" autoCorrect={false} keyboardType="url" left="server-outline" placeholder="https://" />
      <Txt v="caption" color={c.mute} style={{ marginTop: 8 }}>{t('app.server.default')}: {getDefaultUrl()}</Txt>
      {msg ? (msg.ok ? <Notice text={msg.text} /> : <ErrorBox text={msg.text} />) : null}
      <Gap h={20} />
      <Button title={t('app.server.test')} variant="ghost" icon="pulse" loading={busy} onPress={() => test(false)} />
      <Gap h={10} />
      <Button title={t('pf.save')} icon="save" disabled={busy} onPress={() => test(true)} />
      <Gap h={10} />
      <Button title={t('app.server.reset')} variant="soft" disabled={busy} onPress={async () => { await setBaseUrl(null); setUrl(getBaseUrl()); setMsg({ ok: true, text: getBaseUrl() }); }} />
    </Screen>
  );
}
