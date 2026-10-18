import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Gap, Screen, ScreenHeader, Txt } from '../components/ui';
import { ManageSubscription } from '../components/subscription';
import { useSub } from '../lib/subscription';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';

/** Manage the (demo) Premium subscription: plan, price, status, renewal, upgrade, switch at renewal, cancel. Mirrors the Premium tab on the website dashboard,
 *  including the list of what Premium unlocks, each linking to its page. */
export default function SubscriptionScreen() {
  const { t } = useI18n(); const { c } = useTheme(); const router = useRouter(); const { isPremium } = useSub();
  const feats: [string, string, string][] = [['sb.f1', 'db.pf1.p', '/premium-quote'], ['sb.f2', 'db.pf2.p', '/premium-quote'], ['sb.f3', 'db.pf3.p', '/premium-quote'], ['sb.f4', 'db.pf4.p', '/rewards']];
  return (
    <Screen>
      <ScreenHeader title={t('db.prem.h')} subtitle={t('sb.mg.h')} />
      <ManageSubscription />
      {isPremium ? (
        <View>
          <Txt v="h3" style={{ marginTop: 24, marginBottom: 10 }}>{t('db.pf.h')}</Txt>
          {feats.map(([title, body, path]) => (
            <Card key={title} pad={16} style={{ marginBottom: 10 }}>
              <Txt v="h3">{t(title)}</Txt>
              <Txt v="small" color={c.mute} style={{ marginTop: 4 }}>{t(body)}</Txt>
              <Gap h={12} />
              <Button title={t('db.pf.open')} variant="ghost" small onPress={() => router.push(path as never)} />
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
