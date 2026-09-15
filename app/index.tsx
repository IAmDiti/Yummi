import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AvatarButton } from '../src/components/AvatarButton';
import { Button } from '../src/components/Button';
import { Body, Heading } from '../src/components/Heading';
import { Screen } from '../src/components/Screen';
import { IS_MOCK } from '../src/services/ai/client';
import { useAuth } from '../src/store/auth';
import { colors, spacing } from '../src/theme';

export default function Home() {
  const router = useRouter();
  const status = useAuth((s) => s.status);
  const profile = useAuth((s) => s.profile);
  const email = useAuth((s) => s.email);

  return (
    <Screen center>
      <View style={styles.topBar}>
        <AvatarButton
          name={profile?.displayName}
          email={email}
          onPress={() => router.push(status === 'signedIn' ? '/profile' : '/login')}
        />
      </View>

      <View style={styles.hero}>
        <Heading level="display">What are we eating?</Heading>
        <Body muted style={styles.sub}>
          Take a photo of your fridge and I’ll figure it out.
        </Body>
      </View>

      <View style={styles.actions}>
        <Button
          label="Scan my fridge"
          onPress={() => router.push('/scan')}
          accessibilityHint="Opens the camera to photograph your fridge"
        />
        <Button
          label="Add ingredients manually"
          variant="ghost"
          onPress={() => router.push('/ingredients')}
        />
        <Button
          label="See what others are cooking →"
          variant="ghost"
          onPress={() => router.push('/discover')}
        />
      </View>

      {IS_MOCK && (
        <Body muted style={styles.mock}>
          Demo mode — no backend connected yet. Responses are canned.
        </Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: spacing.md, right: spacing.lg, zIndex: 1 },
  hero: { gap: spacing.md, marginBottom: spacing.xxl },
  sub: { fontSize: 18 },
  actions: { gap: spacing.md },
  mock: {
    marginTop: spacing.xl,
    fontSize: 13,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
