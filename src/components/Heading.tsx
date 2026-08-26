import { StyleSheet, Text, type TextStyle } from 'react-native';

import { colors, font } from '../theme';

type Props = {
  children: string;
  level?: 'display' | 'title' | 'heading';
  muted?: boolean;
  style?: TextStyle;
};

export function Heading({ children, level = 'title', muted, style }: Props) {
  return (
    <Text
      accessibilityRole="header"
      style={[styles[level], muted && styles.muted, style]}
    >
      {children}
    </Text>
  );
}

export function Body({
  children,
  muted,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: TextStyle;
}) {
  return <Text style={[styles.body, muted && styles.muted, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  display: { fontSize: font.display, fontWeight: '800', color: colors.text, lineHeight: font.display * 1.1 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  heading: { fontSize: font.heading, fontWeight: '700', color: colors.text },
  body: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.4 },
  muted: { color: colors.textMuted },
});
