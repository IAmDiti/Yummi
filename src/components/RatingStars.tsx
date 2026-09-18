import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../i18n';
import { colors, font, spacing } from '../theme';

type Props = {
  /** average rating, or null if nobody has rated yet */
  value: number | null;
  count?: number;
  /** presence makes the stars tappable; omit for read-only display */
  onRate?: (n: number) => void;
  size?: number;
  /** use when the stars sit on a photo/dark scrim instead of the app's normal light surfaces */
  onDark?: boolean;
};

const STARS = [1, 2, 3, 4, 5];

export function RatingStars({ value, count, onRate, size = 22, onDark }: Props) {
  const filled = Math.round(value ?? 0);
  const emptyColor = onDark ? 'rgba(255,255,255,0.35)' : colors.border;
  const labelColor = onDark ? 'rgba(255,255,255,0.85)' : colors.textMuted;

  return (
    <View style={styles.row}>
      {STARS.map((n) =>
        onRate ? (
          <Pressable
            key={n}
            onPress={() => onRate(n)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('discover.rateAria', { n })}
          >
            <Text style={[styles.star, { fontSize: size, color: n <= filled ? colors.accent : emptyColor }]}>
              ★
            </Text>
          </Pressable>
        ) : (
          <Text
            key={n}
            style={[styles.star, { fontSize: size, color: n <= filled ? colors.accent : emptyColor }]}
          >
            ★
          </Text>
        ),
      )}
      {value !== null && (
        <Text style={[styles.label, { color: labelColor }]}>
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
  label: { marginLeft: spacing.xs, fontSize: font.small, fontWeight: '600' },
});
