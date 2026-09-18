import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Body, Heading } from '../src/components/Heading';
import { LanguageRow } from '../src/components/LanguagePicker';
import { Screen } from '../src/components/Screen';
import { useT } from '../src/i18n';
import { DIETARY_TAGS } from '../src/services/dietary';
import { PRIVACY_POLICY_URL } from '../src/services/legal';
import type { DietaryTag } from '../src/services/types';
import { useAuth } from '../src/store/auth';
import { colors, font, radius, spacing } from '../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const t = useT();
  const status = useAuth((s) => s.status);
  const profile = useAuth((s) => s.profile);
  const email = useAuth((s) => s.email);
  const updateProfile = useAuth((s) => s.updateProfile);
  const signOut = useAuth((s) => s.signOut);
  const deleteAccount = useAuth((s) => s.deleteAccount);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [tags, setTags] = useState<DietaryTag[]>(profile?.dietaryTags ?? []);
  const [hideUsername, setHideUsername] = useState(profile?.hideUsername ?? false);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
    setTags(profile?.dietaryTags ?? []);
    setHideUsername(profile?.hideUsername ?? false);
  }, [profile]);

  useEffect(() => {
    if (status === 'signedOut') router.replace('/login');
  }, [status, router]);

  const initial = useMemo(() => {
    const source = (displayName || profile?.displayName || email || '?').trim();
    return (source[0] ?? '?').toUpperCase();
  }, [displayName, profile?.displayName, email]);

  const toggleTag = (tag: DietaryTag) => {
    setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag]));
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim(), dietaryTags: tags, hideUsername });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const doSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const doDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
      router.replace('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('profile.deleteFailed'));
      setDeleting(false);
    }
  };

  if (status !== 'signedIn' || !profile) return <Screen />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Heading level="heading" style={styles.name}>
            {displayName.trim() || profile.displayName || t('profile.addYourName')}
          </Heading>
          {!!email && <Body muted style={styles.email}>{email}</Body>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('profile.displayName')}</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('profile.displayNamePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            returnKeyType="done"
            accessibilityLabel={t('profile.displayName')}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('profile.dietaryPreferences')}</Text>
          <Body muted style={styles.hint}>
            {t('profile.dietaryHint')}
          </Body>
          <View style={styles.chips}>
            {DIETARY_TAGS.map((tag) => {
              const selected = tags.includes(tag);
              const label = t(`dietary.${tag}`);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <LanguageRow />
        </View>

        <View style={styles.card}>
          <View style={styles.privacyRow}>
            <View style={styles.privacyText}>
              <Text style={styles.cardLabel}>{t('profile.postAnonymously')}</Text>
              <Body muted style={styles.hint}>
                {hideUsername ? t('profile.hideUsernameOn') : t('profile.hideUsernameOff')}
              </Body>
            </View>
            <Switch
              value={hideUsername}
              onValueChange={setHideUsername}
              trackColor={{ false: colors.surfaceAlt, true: colors.accent }}
              thumbColor={colors.bg}
              accessibilityLabel={t('profile.hideUsernameAria')}
            />
          </View>
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.cardLabel}>{t('profile.deleteAccount')}</Text>
          {confirmingDelete ? (
            <>
              <Body style={styles.dangerText}>{t('profile.deleteWarning')}</Body>
              {!!deleteError && <Text style={styles.error}>{deleteError}</Text>}
              <Button
                label={t('profile.yesDelete')}
                variant="danger"
                onPress={doDeleteAccount}
                loading={deleting}
              />
              <Button
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => {
                  setConfirmingDelete(false);
                  setDeleteError('');
                }}
                disabled={deleting}
              />
            </>
          ) : (
            <>
              <Body muted style={styles.hint}>
                {t('profile.deleteHint')}
              </Body>
              <Button
                label={t('profile.deleteMyAccount')}
                variant="danger"
                onPress={() => setConfirmingDelete(true)}
              />
            </>
          )}
        </View>

        <Pressable
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          hitSlop={8}
          accessibilityRole="link"
          style={styles.privacyLink}
        >
          <Text style={styles.privacyLinkText}>{t('profile.privacyPolicy')}</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.actions}>
        <Button label={t('profile.save')} onPress={save} loading={saving} />
        <Button label={t('profile.signOut')} variant="danger" onPress={doSignOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  avatarText: { fontSize: 40, fontWeight: '800', color: colors.onAccent },
  name: { textAlign: 'center' },
  email: { fontSize: font.small },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardLabel: { fontSize: font.label, fontWeight: '800', color: colors.text },
  hint: { fontSize: font.small },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    fontSize: font.label,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.accent },
  chipText: { fontSize: font.small, color: colors.text },
  chipTextSelected: { color: colors.onAccent, fontWeight: '700' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  privacyText: { flex: 1, gap: spacing.xs },
  dangerCard: { borderColor: colors.danger },
  dangerText: { color: colors.text },
  error: { color: colors.danger, fontSize: font.small },
  privacyLink: { alignItems: 'center', paddingTop: spacing.sm },
  privacyLinkText: {
    fontSize: font.small,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  actions: { gap: spacing.sm, paddingTop: spacing.sm },
});
