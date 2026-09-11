import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, spacing } from '../theme';

type Props = {
  /** average rating, or null if nobody has rated yet */
  value: number | null;
  count?: number;
  /** presence makes the stars tappable; omit for read-only display */
  onRate?: (n: number) => void;
  size?: number;
};

const STARS = [1, 2, 3, 4, 5];

export function RatingStars({ value, count, onRate, size = 22 }: Props) {
  const filled = Math.round(value ?? 0);

  return (
    <View style={styles.row}>
      {STARS.map((n) =>
        onRate ? (
          <Pressable
            key={n}
            onPress={() => onRate(n)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${n} out of 5 stars`}
          >
            <Text style={[styles.star, { fontSize: size, color: n <= filled ? colors.accent : colors.border }]}>
              ★
            </Text>
          </Pressable>
        ) : (
          <Text
            key={n}
            style={[styles.star, { fontSize: size, color: n <= filled ? colors.accent : colors.border }]}
          >
            ★
          </Text>
        ),
      )}
      {value !== null && (
        <Text style={styles.label}>
          {value.toFixed(1)}
          {typeof count === 'number' ? ` (${count})` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  star: { marginRight: 1 },
  label: { marginLeft: spacing.xs, fontSize: font.small, color: colors.textMuted, fontWeight: '600' },
});
