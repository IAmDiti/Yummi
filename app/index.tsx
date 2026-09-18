import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AvatarButton } from '../src/components/AvatarButton';
import { Button } from '../src/components/Button';
import { Body, Heading } from '../src/components/Heading';
import { LanguagePickerButton } from '../src/components/LanguagePicker';
import { Screen } from '../src/components/Screen';
import { useT } from '../src/i18n';
import { IS_MOCK } from '../src/services/ai/client';
import { useAuth } from '../src/store/auth';
import { colors, spacing } from '../src/theme';

export default function Home() {
  const router = useRouter();
  const status = useAuth((s) => s.status);
  const profile = useAuth((s) => s.profile);
  const email = useAuth((s) => s.email);
  const t = useT();

  return (
    <Screen center>
      <View style={styles.topBar}>
        <LanguagePickerButton />
        <AvatarButton
          name={profile?.displayName}
          email={email}
          onPress={() => router.push(status === 'signedIn' ? '/profile' : '/login')}
        />
      </View>

      <View style={styles.hero}>
        <Heading level="display">{t('home.title')}</Heading>
        <Body muted style={styles.sub}>
          {t('home.subtitle')}
        </Body>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('home.scanFridge')}
          onPress={() => router.push('/scan')}
          accessibilityHint={t('home.scanFridgeHint')}
        />
        <Button
          label={t('home.addManually')}
          variant="ghost"
          onPress={() => router.push('/ingredients')}
        />
        <Button
          label={t('home.seeDiscover')}
          variant="ghost"
          onPress={() => router.push('/discover')}
        />
      </View>

      {IS_MOCK && (
        <Body muted style={styles.mock}>
          {t('home.demoMode')}
        </Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.lg,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
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
