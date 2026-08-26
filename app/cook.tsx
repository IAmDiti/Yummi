import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../src/components/Button';
import { Body, Heading } from '../src/components/Heading';
import { MicButton } from '../src/components/MicButton';
import { Screen } from '../src/components/Screen';
import { StepCard } from '../src/components/StepCard';
import { askCookingAssistant } from '../src/services/ai/cooking';
import {
  isAdvanceCommand,
  speak,
  speechRecognitionAvailable,
  startListening,
  stopListening,
  stopSpeaking,
} from '../src/services/ai/voice';
import { AiError } from '../src/services/types';
import { useSession } from '../src/store/session';
import { colors, font, radius, spacing } from '../src/theme';

export default function Cook() {
  const router = useRouter();
  const cooking = useSession((s) => s.cooking);
  const nextStep = useSession((s) => s.nextStep);
  const addChatTurn = useSession((s) => s.addChatTurn);
  const applyRevisedSteps = useSession((s) => s.applyRevisedSteps);
  const addSubstitution = useSession((s) => s.addSubstitution);
  const endCooking = useSession((s) => s.endCooking);

  const [ttsOn, setTtsOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [micCaption, setMicCaption] = useState<string | undefined>();
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [, forceRerender] = useReducer((x) => x + 1, 0);
  const lastSpokenStep = useRef<number>(-1);

  const steps = cooking?.recommendation.steps ?? [];
  const current = cooking?.currentStep ?? 0;
  const finished = !!cooking && current >= steps.length;

  // Guard: no active session -> go home.
  useEffect(() => {
    if (!cooking) router.replace('/');
  }, [cooking, router]);

  // Auto-speak each new step.
  useEffect(() => {
    if (!cooking || finished) return;
    if (ttsOn && lastSpokenStep.current !== current) {
      lastSpokenStep.current = current;
      speak(`Step ${current + 1}. ${steps[current]}`);
    }
  }, [current, ttsOn, cooking, finished, steps]);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      stopListening();
      stopSpeaking();
    },
    [],
  );

  const advance = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    nextStep();
  }, [nextStep]);

  const submitQuestion = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || asking) return;
      const session = useSession.getState().cooking;
      if (!session) return;

      setQuestion('');
      setAsking(true);
      addChatTurn({ role: 'user', content: q });
      if (/\b(don['’]?t have|no more|out of|instead of|ran out)\b/i.test(q)) {
        addSubstitution(q);
      }

      try {
        const reply = await askCookingAssistant(useSession.getState().cooking!, q);
        addChatTurn({ role: 'assistant', content: reply.answer });
        if (reply.revisedSteps && reply.revisedSteps.length) {
          applyRevisedSteps(reply.revisedSteps);
        }
        if (ttsOn) speak(reply.answer);
      } catch (err) {
        const msg =
          err instanceof AiError
            ? err.message
            : "I couldn't reach the assistant. Check your connection and try again.";
        addChatTurn({ role: 'assistant', content: msg });
      } finally {
        setAsking(false);
        forceRerender();
      }
    },
    [asking, addChatTurn, addSubstitution, applyRevisedSteps, ttsOn],
  );

  const toggleMic = useCallback(async () => {
    if (listening) {
      stopListening();
      setListening(false);
      setMicCaption(undefined);
      return;
    }
    setMicCaption('Listening… say “done” or ask a question');
    const ok = await startListening(
      {
        onTranscript: (t, isFinal) => {
          setMicCaption(t || 'Listening…');
          if (!isFinal) return;
          if (isAdvanceCommand(t)) {
            setMicCaption('Next step');
            advance();
          } else if (t.trim().length > 2) {
            submitQuestion(t);
          }
        },
        onError: (m) => {
          setMicCaption(m);
          setListening(false);
        },
        onEnd: () => setListening(false),
      },
      { continuous: true },
    );
    setListening(ok);
  }, [listening, advance, submitQuestion]);

  const leaveHome = () => {
    stopListening();
    stopSpeaking();
    endCooking();
    router.replace('/');
  };

  if (!cooking) return <Screen />;

  const history = cooking.history;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.headerRow}>
          <Text style={styles.recipeName} numberOfLines={1}>
            {cooking.recommendation.name}
          </Text>
          <Pressable
            onPress={() => {
              if (ttsOn) stopSpeaking();
              setTtsOn((v) => !v);
            }}
            hitSlop={10}
            accessibilityRole="switch"
            accessibilityState={{ checked: ttsOn }}
            accessibilityLabel="Read steps aloud"
          >
            <Text style={styles.ttsToggle}>{ttsOn ? '🔊 Voice on' : '🔇 Voice off'}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {finished ? (
            <View style={styles.done}>
              <Text style={styles.doneEmoji}>🍽️</Text>
              <Heading level="title">Enjoy your meal!</Heading>
              <Body muted style={styles.doneText}>
                That’s every step for {cooking.recommendation.name}.
              </Body>
            </View>
          ) : (
            <StepCard stepNumber={current + 1} totalSteps={steps.length} text={steps[current]} />
          )}

          {history.length > 0 && (
            <View style={styles.chat}>
              {history.map((t, i) => (
                <View
                  key={i}
                  style={[styles.bubble, t.role === 'user' ? styles.userBubble : styles.aiBubble]}
                >
                  <Text style={styles.bubbleRole}>{t.role === 'user' ? 'You' : 'Assistant'}</Text>
                  <Text style={styles.bubbleText}>{t.content}</Text>
                </View>
              ))}
              {asking && <Text style={styles.thinking}>Assistant is thinking…</Text>}
            </View>
          )}
        </ScrollView>

        {!finished && (
          <View style={styles.controls}>
            <View style={styles.askRow}>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask anything (e.g. “no olive oil”)"
                placeholderTextColor={colors.textMuted}
                style={styles.askInput}
                returnKeyType="send"
                onSubmitEditing={() => submitQuestion(question)}
              />
              <Pressable
                onPress={() => submitQuestion(question)}
                disabled={asking || !question.trim()}
                style={[styles.sendBtn, (asking || !question.trim()) && styles.sendBtnOff]}
                accessibilityRole="button"
                accessibilityLabel="Send question"
              >
                <Text style={styles.sendText}>↑</Text>
              </Pressable>
            </View>

            <View style={styles.bottomRow}>
              {speechRecognitionAvailable && (
                <MicButton
                  listening={listening}
                  onPress={toggleMic}
                  caption={micCaption}
                  label="Say “done”"
                />
              )}
              <View style={styles.doneBtnWrap}>
                <Button label="Done" onPress={advance} accessibilityHint="Go to the next step" />
              </View>
            </View>
          </View>
        )}

        {finished && <Button label="Back to home" onPress={leaveHome} />}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  recipeName: { flex: 1, fontSize: font.label, fontWeight: '700', color: colors.textMuted },
  ttsToggle: { fontSize: font.small, color: colors.accent, fontWeight: '700' },
  scroll: { gap: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.xl },
  done: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  doneEmoji: { fontSize: 56 },
  doneText: { textAlign: 'center' },
  chat: { gap: spacing.sm },
  bubble: { borderRadius: radius.md, padding: spacing.md, gap: 2 },
  userBubble: { backgroundColor: colors.surfaceAlt, alignSelf: 'flex-end', maxWidth: '90%' },
  aiBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, maxWidth: '95%' },
  bubbleRole: { fontSize: font.small - 2, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  bubbleText: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.35 },
  thinking: { fontSize: font.small, color: colors.textMuted, fontStyle: 'italic' },
  controls: { gap: spacing.md, paddingTop: spacing.sm },
  askRow: { flexDirection: 'row', gap: spacing.sm },
  askInput: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: font.label,
    color: colors.text,
  },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnOff: { opacity: 0.4 },
  sendText: { color: colors.onAccent, fontSize: 24, fontWeight: '800' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  doneBtnWrap: { flex: 1 },
});
