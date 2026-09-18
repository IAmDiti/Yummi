import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../src/components/Button';
import { Body, Heading } from '../src/components/Heading';
import { Screen } from '../src/components/Screen';
import { useAndroidKeyboardHeight } from '../src/hooks/useAndroidKeyboardHeight';
import { t as translate, useT } from '../src/i18n';
import { PRIVACY_POLICY_URL } from '../src/services/legal';
import { useAuth } from '../src/store/auth';
import { colors, font, radius, spacing } from '../src/theme';

type Mode = 'signin' | 'signup';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

export default function Login() {
  const router = useRouter();
  const t = useT();
  const androidKbHeight = useAndroidKeyboardHeight();
  const signIn = useAuth((s) => s.signIn);
  const signUp = useAuth((s) => s.signUp);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [checkEmail, setCheckEmail] = useState(false);

  const isSignup = mode === 'signup';
  const cleanEmail = email.trim();

  const validate = (): string | null => {
    if (!EMAIL_RE.test(cleanEmail)) return t('login.enterValidEmail');
    if (password.length < MIN_PASSWORD) {
      return t('login.passwordMinLength', { min: MIN_PASSWORD });
    }
    if (isSignup && password !== confirm) return t('login.passwordsDontMatch');
    return null;
  };

  const submit = async () => {
    if (busy) return;
    const problem = validate();
    if (problem) {
      setErrorMsg(problem);
      return;
    }
    setErrorMsg('');
    setBusy(true);
    try {
      if (isSignup) {
        const { needsConfirmation } = await signUp(cleanEmail, password);
        if (needsConfirmation) {
          setCheckEmail(true);
          return;
        }
      } else {
        await signIn(cleanEmail, password);
      }
      router.replace('/');
    } catch (err) {
      setErrorMsg(authMessage(err, isSignup));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(isSignup ? 'signin' : 'signup');
    setErrorMsg('');
    setConfirm('');
  };

  if (checkEmail) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Heading level="title">{t('login.confirmEmailTitle')}</Heading>
          <Body muted style={styles.centerText}>
            {t('login.confirmEmailBody', { email: cleanEmail })}
          </Body>
          <Button label={t('login.backToSignIn')} onPress={() => { setCheckEmail(false); setMode('signin'); }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={[styles.flex, androidKbHeight ? { paddingBottom: androidKbHeight } : null]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Heading level="title">{isSignup ? t('login.createAccount') : t('login.welcomeBack')}</Heading>
            <Body muted>{isSignup ? t('login.signUpSubtitle') : t('login.signInSubtitle')}</Body>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('login.email')}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
                accessibilityLabel={t('login.email')}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('login.password')}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isSignup ? t('login.passwordPlaceholderSignup') : t('login.passwordPlaceholderSignin')}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.passwordInput]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  secureTextEntry={!showPassword}
                  returnKeyType={isSignup ? 'next' : 'go'}
                  onSubmitEditing={isSignup ? undefined : submit}
                  accessibilityLabel={t('login.password')}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  style={styles.reveal}
                >
                  <Text style={styles.revealText}>{showPassword ? t('login.hide') : t('login.show')}</Text>
                </Pressable>
              </View>
            </View>

            {isSignup && (
              <View style={styles.field}>
                <Text style={styles.label}>{t('login.confirmPassword')}</Text>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder={t('login.confirmPasswordPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  accessibilityLabel={t('login.confirmPassword')}
                />
              </View>
            )}

            {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

            <Button
              label={isSignup ? t('login.createAccountBtn') : t('login.signIn')}
              onPress={submit}
              loading={busy}
              disabled={!cleanEmail || !password || (isSignup && !confirm)}
            />
          </View>

          <Pressable onPress={switchMode} hitSlop={8} accessibilityRole="button">
            <Text style={styles.switch}>
              {isSignup ? t('login.alreadyHaveAccount') : t('login.newToYummi')}
              <Text style={styles.switchStrong}>{isSignup ? t('login.signIn') : t('login.createOne')}</Text>
            </Text>
          </Pressable>

          <Button label={t('login.continueWithoutAccount')} variant="ghost" onPress={() => router.back()} />

          <Pressable
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            hitSlop={8}
            accessibilityRole="link"
          >
            <Text style={styles.privacyLink}>{t('login.privacyPolicy')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function authMessage(err: unknown, isSignup: boolean): string {
  const raw = err instanceof Error ? err.message : '';
  const lower = raw.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return translate('login.errAlreadyRegistered');
  }
  if (lower.includes('invalid login credentials')) {
    return translate('login.errWrongCredentials');
  }
  if (lower.includes('email not confirmed')) {
    return translate('login.errEmailNotConfirmed');
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return translate('login.errRateLimit');
  }
  return raw || (isSignup ? translate('login.errCreateFailed') : translate('login.errSignInFailed'));
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  hero: { gap: spacing.sm },
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { fontSize: font.small, fontWeight: '700', color: colors.textMuted },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: font.label,
    color: colors.text,
  },
  passwordRow: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 64 },
  reveal: { position: 'absolute', right: spacing.md },
  revealText: { fontSize: font.small, fontWeight: '700', color: colors.accent },
  error: { color: colors.danger, fontSize: font.small },
  switch: { textAlign: 'center', fontSize: font.small, color: colors.textMuted },
  switchStrong: { color: colors.accent, fontWeight: '800' },
  privacyLink: {
    textAlign: 'center',
    fontSize: font.small,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'stretch', gap: spacing.md },
  centerText: { textAlign: 'center' },
});
