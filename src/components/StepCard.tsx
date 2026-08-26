import { StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from '../theme';

type Props = {
  stepNumber: number;
  totalSteps: number;
  text: string;
};

export function StepCard({ stepNumber, totalSteps, text }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>
        Step {stepNumber} of {totalSteps}
      </Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  eyebrow: {
    fontSize: font.label,
    fontWeight: '800',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  text: { fontSize: font.title, color: colors.text, lineHeight: font.title * 1.35, fontWeight: '600' },
});
