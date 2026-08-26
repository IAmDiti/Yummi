import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Body, Heading } from '../src/components/Heading';
import { Card } from '../src/components/Card';
import { ErrorState } from '../src/components/ErrorState';
import { LoadingState } from '../src/components/LoadingState';
import { Screen } from '../src/components/Screen';
import { getRecommendation } from '../src/services/ai/recommendations';
import { AiError } from '../src/services/types';
import { useSession } from '../src/store/session';
import { colors, font, radius, spacing } from '../src/theme';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  'more effort': 'More effort',
};

export default function Recommend() {
  const router = useRouter();
  const ingredients = useSession((s) => s.ingredients);
  const recommendation = useSession((s) => s.recommendation);
  const rejected = useSession((s) => s.rejected);
  const setRecommendation = useSession((s) => s.setRecommendation);
  const rejectCurrent = useSession((s) => s.rejectCurrent);
  const startCooking = useSession((s) => s.startCooking);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchOne = useCallback(async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const rec = await getRecommendation(
        ingredients,
        useSession.getState().rejected, // freshest rejected list
      );
      setRecommendation(rec);
    } catch (err) {
      setErrorMsg(
        err instanceof AiError ? err.message : 'Could not get a suggestion. Try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [ingredients, setRecommendation]);

  // Fetch on first mount if we don't already have one.
  useEffect(() => {
    if (!recommendation && !loading && !errorMsg) fetchOne();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onReject = () => {
    rejectCurrent(); // clears current + records the name
    fetchOne();
  };

  const onCook = () => {
    if (!recommendation) return;
    startCooking(recommendation);
    router.push('/cook');
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState
          message={rejected.length ? 'Thinking of something else…' : 'Thinking about what you’d like…'}
        />
      </Screen>
    );
  }

  if (errorMsg) {
    return (
      <Screen>
        <ErrorState
          message={errorMsg}
          actions={[
            { label: 'Try again', onPress: fetchOne },
            { label: 'Edit ingredients', onPress: () => router.back(), variant: 'secondary' },
          ]}
        />
      </Screen>
    );
  }

  if (!recommendation) {
    return (
      <Screen>
        <LoadingState message="Thinking about what you’d like…" />
      </Screen>
    );
  }

  const r = recommendation;
  const timeLine = [
    r.prepTime + r.cookTime > 0 ? `${r.prepTime + r.cookTime} minutes` : null,
    DIFFICULTY_LABEL[r.difficulty] ?? r.difficulty,
    r.pans ? `${r.pans} pan${r.pans > 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card>
          <Heading level="title">{r.name}</Heading>
          {!!timeLine && <Text style={styles.meta}>{timeLine}</Text>}
          {!!r.description && <Body style={styles.desc}>{r.description}</Body>}

          {!!r.reason && (
            <View style={styles.why}>
              <Text style={styles.whyLabel}>Why I picked this</Text>
              <Body>{r.reason}</Body>
            </View>
          )}

          {r.missingIngredients.length > 0 && (
            <View style={styles.missing}>
              <Text style={styles.missingLabel}>You may need to grab</Text>
              <View style={styles.chips}>
                {r.missingIngredients.map((m) => (
                  <View key={m} style={styles.chip}>
                    <Text style={styles.chipText}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {rejected.length >= 4 && (
          <Body muted style={styles.hint}>
            Still nothing? Go back and tweak your ingredients — that helps me a lot.
          </Body>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button label="Let’s cook" onPress={onCook} />
        <Button label="Not what I want" variant="secondary" onPress={onReject} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.lg, gap: spacing.md },
  meta: { fontSize: font.label, color: colors.textMuted, marginTop: spacing.xs, fontWeight: '600' },
  desc: { marginTop: spacing.md },
  why: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  whyLabel: {
    fontSize: font.small,
    fontWeight: '800',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  missing: { marginTop: spacing.lg, gap: spacing.sm },
  missingLabel: { fontSize: font.small, fontWeight: '700', color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: { fontSize: font.small, color: colors.text },
  hint: { fontSize: 14, textAlign: 'center', paddingHorizontal: spacing.md },
  actions: { gap: spacing.sm, paddingTop: spacing.sm },
});
