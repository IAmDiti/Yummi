import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, font, spacing } from '../theme';

export function LoadingState({ message }: { message: string }) {
  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  text: { fontSize: font.body, color: colors.textMuted, textAlign: 'center' },
});
