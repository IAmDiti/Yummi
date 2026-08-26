import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, font } from '../src/theme';

export default function RootLayout() {
  return (
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
      </Stack>
    </SafeAreaProvider>
  );
}
