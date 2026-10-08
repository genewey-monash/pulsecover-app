import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { kv } from '../lib/storage';

/** Entry gate: first launch shows the welcome carousel; afterwards guests and members both land on the tabs. */
export default function Index() {
  const { user } = useAuth();
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => { kv.get('pc_seen').then((v) => setSeen(v === '1')); }, []);
  if (seen === null) return null;
  if (!seen && !user) return <Redirect href="/welcome" />;
  return <Redirect href="/(tabs)" />;
}
