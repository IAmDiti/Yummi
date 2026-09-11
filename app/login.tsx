import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../src/components/Button';
import { Body, Heading } from '../src/components/Heading';
import { Screen } from '../src/components/Screen';
import { useAuth } from '../src/store/auth';
import { colors, font, radius, spacing } from '../src/theme';

type Mode = 'signin' | 'signup';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

export default function Login() {
  const router = useRouter();
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
    if (!EMAIL_RE.test(cleanEmail)) return 'Enter a valid email address.';
    if (password.length < MIN_PASSWORD) {
      return `Password must be at least ${MIN_PASSWORD} characters.`;
    }
    if (isSignup && password !== confirm) return 'Passwords don’t match.';
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
          <Heading level="title">Confirm your email</Heading>
          <Body muted style={styles.centerText}>
            We sent a confirmation link to {cleanEmail}. Tap it to finish setting up
            your account, then come back and sign in.
          </Body>
          <Button label="Back to sign in" onPress={() => { setCheckEmail(false); setMode('signin'); }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.hero}>
          <Heading level="title">{isSignup ? 'Create your account' : 'Welcome back'}</Heading>
          <Body muted>
            {isSignup
              ? 'Sign up to post dishes, rate meals, and save dietary preferences.'
              : 'Sign in to Yummi.'}
          </Body>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
              accessibilityLabel="Email address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.passwordInput]}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                secureTextEntry={!showPassword}
                returnKeyType={isSignup ? 'next' : 'go'}
                onSubmitEditing={isSignup ? undefined : submit}
                accessibilityLabel="Password"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                style={styles.reveal}
              >
                <Text style={styles.revealText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
          </View>

          {isSignup && (
            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={submit}
                accessibilityLabel="Confirm password"
              />
            </View>
          )}

          {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

          <Button
            label={isSignup ? 'Create account' : 'Sign in'}
            onPress={submit}
            loading={busy}
            disabled={!cleanEmail || !password || (isSignup && !confirm)}
          />
        </View>

        <Pressable onPress={switchMode} hitSlop={8} accessibilityRole="button">
          <Text style={styles.switch}>
            {isSignup ? 'Already have an account? ' : 'New to Yummi? '}
            <Text style={styles.switchStrong}>{isSignup ? 'Sign in' : 'Create one'}</Text>
          </Text>
        </Pressable>

        <Button label="Continue without an account" variant="ghost" onPress={() => router.back()} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

function authMessage(err: unknown, isSignup: boolean): string {
  const raw = err instanceof Error ? err.message : '';
  const lower = raw.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'That email already has an account. Try signing in instead.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Wrong email or password.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirm your email first — check your inbox for the link.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  return raw || (isSignup ? 'Could not create the account. Try again.' : 'Could not sign in. Try again.');
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'center', gap: spacing.xl },
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'stretch', gap: spacing.md },
  centerText: { textAlign: 'center' },
});
