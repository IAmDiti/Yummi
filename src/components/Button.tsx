import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, font, radius, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  accessibilityHint,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        variantStyle[variant],
        pressed && !isDisabled && pressedStyle[variant],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.inner}>
        {loading && (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' || variant === 'danger' ? colors.onAccent : colors.text}
          />
        )}
        <Text style={[styles.label, labelStyle[variant]]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 60,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: font.body, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});

const variantStyle: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
};

const pressedStyle: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.accentPressed },
  secondary: { backgroundColor: colors.surfaceAlt },
  ghost: { backgroundColor: colors.surface },
  danger: { backgroundColor: '#9E2E22' },
};

const labelStyle: Record<Variant, { color: string }> = {
  primary: { color: colors.onAccent },
  secondary: { color: colors.text },
  ghost: { color: colors.textMuted },
  danger: { color: colors.onAccent },
};
