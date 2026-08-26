import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../src/components/Button';
import { Body } from '../src/components/Heading';
import { IngredientRow } from '../src/components/IngredientRow';
import { MicButton } from '../src/components/MicButton';
import { Screen } from '../src/components/Screen';
import {
  isAdvanceCommand,
  speechRecognitionAvailable,
  startListening,
  stopListening,
} from '../src/services/ai/voice';
import { parseSpokenIngredients, useSession } from '../src/store/session';
import { colors, font, radius, spacing } from '../src/theme';

export default function Ingredients() {
  const router = useRouter();
  const ingredients = useSession((s) => s.ingredients);
  const addIngredient = useSession((s) => s.addIngredient);
  const addIngredients = useSession((s) => s.addIngredients);
  const updateIngredient = useSession((s) => s.updateIngredient);
  const removeIngredient = useSession((s) => s.removeIngredient);
  const resetRecommendations = useSession((s) => s.resetRecommendations);

  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [micCaption, setMicCaption] = useState<string | undefined>(undefined);
  const heardRef = useRef('');

  useEffect(() => () => stopListening(), []);

  const commitDraft = () => {
    const text = draft.trim();
    if (!text) return;
    // allow "rice, eggs, beef" in one go
    const parts = parseSpokenIngredients(text);
    if (parts.length > 1) addIngredients(parts);
    else addIngredient(text);
    setDraft('');
  };

  const toggleMic = useCallback(async () => {
    if (listening) {
      stopListening();
      setListening(false);
      return;
    }
    heardRef.current = '';
    setMicCaption('Listening… say what else you have');
    const ok = await startListening({
      onTranscript: (text, isFinal) => {
        heardRef.current = text;
        setMicCaption(text || 'Listening…');
        if (isFinal && text.trim() && !isAdvanceCommand(text)) {
          const parts = parseSpokenIngredients(text);
          if (parts.length) {
            addIngredients(parts);
            setMicCaption(`Added: ${parts.join(', ')}`);
          }
        }
      },
      onError: (msg) => {
        setMicCaption(msg);
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
    setListening(ok);
  }, [listening, addIngredients]);

  const findFood = () => {
    resetRecommendations();
    router.push('/recommend');
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Body muted style={styles.intro}>
          {ingredients.length
            ? 'Fix anything that’s wrong, then find something to eat.'
            : 'Add what you’ve got in the kitchen.'}
        </Body>

        <View style={styles.addBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={commitDraft}
            placeholder="Add an ingredient"
            placeholderTextColor={colors.textMuted}
            style={styles.addInput}
            returnKeyType="done"
            autoCorrect={false}
          />
          <Pressable
            onPress={commitDraft}
            accessibilityRole="button"
            accessibilityLabel="Add ingredient"
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>＋</Text>
          </Pressable>
        </View>

        <FlatList
          data={ingredients}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <IngredientRow
              ingredient={item}
              onChange={(name) => updateIngredient(item.id, name)}
              onRemove={() => removeIngredient(item.id)}
            />
          )}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Body muted style={styles.empty}>
              Nothing here yet. Type above{speechRecognitionAvailable ? ', use the mic,' : ''} or go
              back and scan your fridge.
            </Body>
          }
        />

        {speechRecognitionAvailable && (
          <View style={styles.micRow}>
            <MicButton
              listening={listening}
              onPress={toggleMic}
              caption={micCaption}
              label="Say what else you have"
            />
          </View>
        )}

        <Button
          label="Find something to eat"
          onPress={findFood}
          disabled={ingredients.length === 0}
          accessibilityHint="Asks the assistant to recommend a meal"
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { fontSize: 15, marginBottom: spacing.md },
  addBar: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  addInput: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: font.body,
    color: colors.text,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: { color: colors.onAccent, fontSize: 26, fontWeight: '700', lineHeight: 28 },
  list: { flex: 1 },
  empty: { textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  micRow: { alignItems: 'center', paddingVertical: spacing.md },
});
