import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuth } from '../src/store/auth';
import { colors, font } from '../src/theme';

export default function RootLayout() {
  const init = useAuth((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);

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
            headerBackTitle: 'Back',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="scan" options={{ title: 'Scan my fridge' }} />
          <Stack.Screen name="ingredients" options={{ title: 'Your ingredients' }} />
          <Stack.Screen name="recommend" options={{ title: 'What to eat' }} />
          <Stack.Screen name="cook" options={{ title: 'Cooking', headerBackVisible: false }} />
          <Stack.Screen name="login" options={{ title: 'Account' }} />
          <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ title: 'Your profile' }} />
          <Stack.Screen name="post-meal" options={{ title: 'Share your dish' }} />
          <Stack.Screen name="discover" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
