import { ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type { Recommendation } from '../services/types';
import { colors, font, radius, spacing } from '../theme';
import { Card } from './Card';
import { Body, Heading } from './Heading';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  extra_hard: 'Extra hard',
};

// Escalating warmth from easy to extra-hard, reusing the existing palette.
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: colors.success,
  medium: colors.accent,
  hard: colors.accentPressed,
  extra_hard: colors.danger,
};

type Props = {
  recommendation: Recommendation;
  style?: ViewStyle;
  /**
   * Exact pixel height this card must render at, measured by the caller from
   * the swipe deck (a plain, reliably-flexed container) and passed down. The
   * deck stacks several of these cards absolutely on top of each other with
   * Reanimated transforms, and on Android a `flex: 1` card in that chain
   * doesn't reliably resolve to a uniform size — it sizes to its own content
   * instead. Two recipes with different amounts of text then render as
   * different-height boxes, so a longer card behind shows through below a
   * shorter one in front. An explicit height isn't subject to that ambiguity:
   * every card ends up exactly deck-sized regardless of its own content.
   */
  height?: number;
};

export function RecommendationCard({ recommendation: r, style, height }: Props) {
  const timeLine = [
    r.prepTime + r.cookTime > 0 ? `${r.prepTime + r.cookTime} minutes` : null,
    r.pans ? `${r.pans} pan${r.pans > 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Card style={[styles.card, height ? { height } : null, style]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        // Let the outer Pan gesture (horizontal swipe) win on the slightest
        // vertical wobble; only a clear vertical drag scrolls this list.
        scrollEventThrottle={16}
      >
        <View
          style={[styles.badge, { backgroundColor: DIFFICULTY_COLOR[r.difficulty] ?? colors.accent }]}
        >
          <Text style={styles.badgeText}>{DIFFICULTY_LABEL[r.difficulty] ?? r.difficulty}</Text>
        </View>

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
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  // Fixed-size card (it sits in an absolutely-positioned swipe deck) — padding
  // and overflow move to the inner ScrollView so content taller than the card
  // scrolls inside its rounded bounds instead of spilling past them.
  card: { flex: 1, padding: 0, overflow: 'hidden' },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  badgeText: {
    color: colors.onAccent,
    fontSize: font.small - 1,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
});
