import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { t, useT } from '../i18n';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, useLocale, type LanguageCode } from '../store/locale';
import { colors, font, radius, spacing } from '../theme';

function LanguageModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  useT();
  const language = useLocale((s) => s.language);
  const setLanguage = useLocale((s) => s.setLanguage);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('language.chooseLanguage')}</Text>
          {SUPPORTED_LANGUAGES.map((code: LanguageCode) => {
            const selected = code === language;
            return (
              <Pressable
                key={code}
                onPress={() => {
                  setLanguage(code);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.row, selected && styles.rowSelected]}
              >
                <Text style={[styles.rowText, selected && styles.rowTextSelected]}>
                  {LANGUAGE_NAMES[code]}
                </Text>
                {selected && <Text style={styles.check}>✓</Text>}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Circular globe button for the home screen top bar. */
export function LanguagePickerButton() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('language.chooseLanguage')}
        style={styles.circle}
      >
        <Text style={styles.circleIcon}>🌐</Text>
      </Pressable>
      <LanguageModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

/** Settings-style row for the profile screen. */
export function LanguageRow() {
  useT();
  const language = useLocale((s) => s.language);
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        style={styles.settingsRow}
      >
        <Text style={styles.cardLabel}>{t('profile.language')}</Text>
        <Text style={styles.settingsValue}>{LANGUAGE_NAMES[language]}</Text>
      </Pressable>
      <LanguageModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleIcon: { fontSize: 18 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    fontSize: font.label,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowSelected: { backgroundColor: colors.surfaceAlt },
  rowText: { fontSize: font.body, color: colors.text },
  rowTextSelected: { fontWeight: '700' },
  check: { fontSize: font.body, color: colors.accent, fontWeight: '800' },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: { fontSize: font.label, fontWeight: '800', color: colors.text },
  settingsValue: { fontSize: font.body, color: colors.textMuted },
});
