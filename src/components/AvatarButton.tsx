import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, radius } from '../theme';

type Props = {
  name?: string | null;
  onPress: () => void;
};

export function AvatarButton({ name, onPress }: Props) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
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
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: { fontSize: font.label, fontWeight: '800', color: colors.text },
});
