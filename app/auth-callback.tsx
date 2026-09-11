import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ErrorState } from '../src/components/ErrorState';
import { LoadingState } from '../src/components/LoadingState';
import { Screen } from '../src/components/Screen';
import { supabase } from '../src/services/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const url = Linking.useURL();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!url || !supabase) return;
    const code = Linking.parse(url).queryParams?.code;

    if (typeof code !== 'string') {
      setErrorMsg("That link didn't work. Try requesting a new one.");
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) setErrorMsg("That link didn't work. Try requesting a new one.");
        else router.replace('/');
      })
      .catch(() => setErrorMsg("That link didn't work. Try requesting a new one."));
  }, [url, router]);

  if (errorMsg) {
    return (
      <Screen>
        <ErrorState
          message={errorMsg}
          actions={[{ label: 'Back to sign in', onPress: () => router.replace('/login') }]}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <LoadingState message="Signing you in…" />
    </Screen>
  );
}
