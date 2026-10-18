import React from 'react';
import { Screen, ScreenHeader } from '../components/ui';
import { ManageSubscription } from '../components/subscription';
import { useI18n } from '../lib/i18n';

/** Manage the (demo) Premium subscription: plan, price, status, renewal, upgrade, switch at renewal, cancel. Mirrors the Premium tab on the website dashboard. */
export default function SubscriptionScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <ScreenHeader title={t('db.prem.h')} subtitle={t('sb.mg.h')} />
      <ManageSubscription />
    </Screen>
  );
}
