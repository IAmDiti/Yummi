import { StyleSheet, Text, View } from 'react-native';

import { colors, font, spacing } from '../theme';
import { Button } from './Button';

type Action = { label: string; onPress: () => void; variant?: 'primary' | 'secondary' };

type Props = {
  title?: string;
  message: string;
  actions?: Action[];
};

export function ErrorState({ title = 'That didn’t work', message, actions = [] }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{'\u{1F615}'}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        {actions.map((a) => (
          <Button
            key={a.label}
            label={a.label}
            onPress={a.onPress}
            variant={a.variant ?? 'primary'}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  emoji: { fontSize: 44 },
  title: { fontSize: font.heading, fontWeight: '800', color: colors.text, textAlign: 'center' },
  message: {
    fontSize: font.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: font.body * 1.4,
  },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
});
