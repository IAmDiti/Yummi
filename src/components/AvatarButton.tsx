import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, radius } from '../theme';

type Props = {
  name?: string | null;
  /** Fallback shown once signed in but before a display name is set. */
  email?: string | null;
  onPress: () => void;
};

export function AvatarButton({ name, email, onPress }: Props) {
  const source = name?.trim() || email?.trim() || '?';
  const initial = source[0].toUpperCase();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Your profile"
      style={styles.circle}
    >
      <Text style={styles.text}>{initial}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    // Solid accent fill so it reads clearly against the white hero
    // background instead of blending into it.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  text: { fontSize: font.label, fontWeight: '800', color: colors.onAccent },
});
