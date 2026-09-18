import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ErrorState } from '../src/components/ErrorState';
import { LoadingState } from '../src/components/LoadingState';
import { Screen } from '../src/components/Screen';
import { useT } from '../src/i18n';
import { supabase } from '../src/services/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const t = useT();
  const url = Linking.useURL();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!url || !supabase) return;
    const code = Linking.parse(url).queryParams?.code;

    if (typeof code !== 'string') {
      setErrorMsg(t('authCallback.linkFailed'));
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) setErrorMsg(t('authCallback.linkFailed'));
        else router.replace('/');
      })
      .catch(() => setErrorMsg(t('authCallback.linkFailed')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, router]);

  if (errorMsg) {
    return (
      <Screen>
        <ErrorState
          message={errorMsg}
          actions={[{ label: t('authCallback.backToSignIn'), onPress: () => router.replace('/login') }]}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <LoadingState message={t('authCallback.signingIn')} />
    </Screen>
  );
}
