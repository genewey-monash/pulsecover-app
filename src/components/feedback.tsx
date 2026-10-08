import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { Button, Chip, ErrorBox, Field, Gap, Icon, Notice, Row, Sheet, Txt, success, tap } from './ui';
import { api } from '../lib/api';
import { errorText } from '../lib/errors';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

const PURPOSES = ['research', 'buy', 'policy', 'claim', 'other'] as const;
const KEY: Record<string, string> = { research: 'fb.p1', buy: 'fb.p2', policy: 'fb.p3', claim: 'fb.p4', other: 'fb.p5' };

export function FeedbackSheet({ visible, onClose, page }: { visible: boolean; onClose: () => void; page: string }) {
  const { t } = useI18n(); const { c } = useTheme();
  const [rating, setRating] = useState(0); const [purpose, setPurpose] = useState<typeof PURPOSES[number]>('research'); const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [ok, setOk] = useState(false);
  const close = () => { onClose(); setTimeout(() => { setOk(false); setRating(0); setComment(''); setErr(null); }, 300); };
  const send = async () => {
    if (!rating) { setErr(t('fb.need')); return; }
    setBusy(true); setErr(null);
    try { await api('/feedback', { rating, purpose, comment, page }); success(); setOk(true); } catch (e) { setErr(errorText(e, t)); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={close} title={t('fb.h')}>
      {ok ? (
        <>
          <Notice text={t('fb.thanks')} />
          <Gap h={16} /><Button title={t('connect.cancel')} variant="ghost" onPress={close} />
        </>
      ) : (
        <>
          <Txt v="label">{t('fb.q')}</Txt>
          <Row wrap gap={8} style={{ marginTop: 10 }}>{PURPOSES.map((p) => <Chip key={p} label={t(KEY[p])} on={purpose === p} onPress={() => setPurpose(p)} />)}</Row>
          <Txt v="label" style={{ marginTop: 18 }}>{t('fb.rate')}</Txt>
          <Row gap={6} style={{ marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => { tap(); setRating(n); setErr(null); }} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${n}`}>
                <Icon name={n <= rating ? 'star' : 'star-outline'} size={38} color={n <= rating ? c.gold : c.mute} />
              </Pressable>
            ))}
          </Row>
          <Field label={t('fb.comment')} value={comment} onChangeText={setComment} multiline maxLength={1000} />
          <ErrorBox text={err} />
          <Gap h={18} />
          <Button title={t('fb.submit')} loading={busy} onPress={send} />
        </>
      )}
    </Sheet>
  );
}
