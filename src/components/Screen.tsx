import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

type Props = {
  children?: ReactNode;
  /** vertically center content (used by Home) */
  center?: boolean;
  style?: ViewStyle;
  /** remove default horizontal padding (full-bleed camera etc.) */
  bleed?: boolean;
};

export function Screen({ children, center, style, bleed }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View
        style={[
          styles.body,
          !bleed && styles.padded,
          center && styles.center,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  center: { justifyContent: 'center', alignItems: 'stretch' },
});
