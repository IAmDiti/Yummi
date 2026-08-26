import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from '../theme';

type Props = {
  listening: boolean;
  onPress: () => void;
  /** shown under the button (interim transcript, hint, or error) */
  caption?: string;
  disabled?: boolean;
  label?: string;
};

export function MicButton({ listening, onPress, caption, disabled, label = 'Hold to speak' }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop listening' : label}
        accessibilityState={{ disabled: !!disabled, selected: listening }}
        style={({ pressed }) => [
          styles.button,
          listening && styles.listening,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text style={styles.icon}>{listening ? '■' : '\u{1F3A4}'}</Text>
      </Pressable>
      <Text style={[styles.caption, listening && styles.captionActive]} numberOfLines={2}>
        {caption ?? (listening ? 'Listening…' : label)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  button: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listening: { backgroundColor: colors.accent, borderColor: colors.accent },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
  icon: { fontSize: 34 },
  caption: { fontSize: font.small, color: colors.textMuted, textAlign: 'center', minHeight: 34 },
  captionActive: { color: colors.accent, fontWeight: '700' },
});
