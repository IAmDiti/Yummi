import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useT } from '../src/i18n';
import { useAuth } from '../src/store/auth';
import { colors, font } from '../src/theme';

export default function RootLayout() {
  const init = useAuth((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);

  // Subscribes to the language store so every header title below re-renders
  // in the new language the instant it changes.
  const t = useT();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerTitleStyle: { fontSize: font.label, fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
            headerBackTitle: t('nav.back'),
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="scan" options={{ title: t('nav.scan') }} />
          <Stack.Screen name="ingredients" options={{ title: t('nav.ingredients') }} />
          <Stack.Screen name="recommend" options={{ title: t('nav.recommend') }} />
          <Stack.Screen name="cook" options={{ title: t('nav.cook'), headerBackVisible: false }} />
          <Stack.Screen name="login" options={{ title: t('nav.login') }} />
          <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ title: t('nav.profile') }} />
          <Stack.Screen name="post-meal" options={{ title: t('nav.postMeal') }} />
          <Stack.Screen name="discover" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
