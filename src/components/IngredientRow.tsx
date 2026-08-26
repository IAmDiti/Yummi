import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Ingredient } from '../services/types';
import { colors, font, radius, spacing } from '../theme';

type Props = {
  ingredient: Ingredient;
  onChange: (name: string) => void;
  onRemove: () => void;
};

export function IngredientRow({ ingredient, onChange, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ingredient.name);

  const commit = () => {
    setEditing(false);
    const clean = draft.trim();
    if (clean && clean !== ingredient.name) onChange(clean);
    else setDraft(ingredient.name);
  };

  return (
    <View style={styles.row}>
      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          autoFocus
          selectTextOnFocus
          style={styles.input}
          returnKeyType="done"
        />
      ) : (
        <Pressable
          style={styles.nameWrap}
          onPress={() => {
            setDraft(ingredient.name);
            setEditing(true);
          }}
          accessibilityLabel={`Edit ${ingredient.name}`}
          accessibilityHint="Opens an editable text field"
        >
          <Text style={styles.name}>{ingredient.name}</Text>
          {ingredient.confidence === 'uncertain' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>not sure</Text>
            </View>
          )}
        </Pressable>
      )}

      <Pressable
        onPress={onRemove}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${ingredient.name}`}
        style={styles.remove}
      >
        <Text style={styles.removeIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  nameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: font.body, color: colors.text, flexShrink: 1 },
  input: {
    flex: 1,
    fontSize: font.body,
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingVertical: spacing.xs,
  },
  badge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: font.small - 1, color: colors.textMuted, fontWeight: '600' },
  remove: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  removeIcon: { fontSize: font.body, color: colors.textMuted },
});
