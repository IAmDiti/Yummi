import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Body, Heading } from '../src/components/Heading';
import { Screen } from '../src/components/Screen';
import { DIETARY_TAGS, DIETARY_TAG_LABEL } from '../src/services/dietary';
import { PRIVACY_POLICY_URL } from '../src/services/legal';
import type { DietaryTag } from '../src/services/types';
import { useAuth } from '../src/store/auth';
import { colors, font, radius, spacing } from '../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const status = useAuth((s) => s.status);
  const profile = useAuth((s) => s.profile);
  const email = useAuth((s) => s.email);
  const updateProfile = useAuth((s) => s.updateProfile);
  const signOut = useAuth((s) => s.signOut);
  const deleteAccount = useAuth((s) => s.deleteAccount);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [tags, setTags] = useState<DietaryTag[]>(profile?.dietaryTags ?? []);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
    setTags(profile?.dietaryTags ?? []);
  }, [profile]);

  useEffect(() => {
    if (status === 'signedOut') router.replace('/login');
  }, [status, router]);

  const initial = useMemo(() => {
    const source = (displayName || profile?.displayName || email || '?').trim();
    return (source[0] ?? '?').toUpperCase();
  }, [displayName, profile?.displayName, email]);

  const toggleTag = (tag: DietaryTag) => {
    setTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim(), dietaryTags: tags });
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
      setDeleteError(err instanceof Error ? err.message : 'Could not delete your account. Try again.');
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
            {displayName.trim() || profile.displayName || 'Add your name'}
          </Heading>
          {!!email && <Body muted style={styles.email}>{email}</Body>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="What should we call you?"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            returnKeyType="done"
            accessibilityLabel="Display name"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Dietary preferences</Text>
          <Body muted style={styles.hint}>
            We’ll only recommend meals that fit these.
          </Body>
          <View style={styles.chips}>
            {DIETARY_TAGS.map((tag) => {
              const selected = tags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={DIETARY_TAG_LABEL[tag]}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {DIETARY_TAG_LABEL[tag]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.cardLabel}>Delete account</Text>
          {confirmingDelete ? (
            <>
              <Body style={styles.dangerText}>
                This permanently deletes your account, profile, dish posts, photos, and ratings.
                There’s no undo.
              </Body>
              {!!deleteError && <Text style={styles.error}>{deleteError}</Text>}
              <Button
                label="Yes, delete my account"
                variant="danger"
                onPress={doDeleteAccount}
                loading={deleting}
              />
              <Button
                label="Cancel"
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
                Permanently deletes your account and everything tied to it. This can’t be undone.
              </Body>
              <Button
                label="Delete my account"
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
          <Text style={styles.privacyLinkText}>Privacy Policy</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.actions}>
        <Button label="Save" onPress={save} loading={saving} />
        <Button label="Sign out" variant="danger" onPress={doSignOut} />
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
