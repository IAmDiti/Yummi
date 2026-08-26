/**
 * Voice service — text-to-speech (read steps aloud) and speech-to-text
 * (hands-free "Done" and dictated questions).
 *
 * TTS uses expo-speech (first-party, works everywhere including Expo Go).
 * STT uses expo-speech-recognition, which needs a dev build. Every entry point
 * degrades gracefully: if recognition is unavailable the screens keep their
 * touch controls and this module reports `available: false`.
 */

import * as Speech from 'expo-speech';

// ---- Text to speech -------------------------------------------------------

let speaking = false;

export function speak(text: string) {
  if (!text) return;
  try {
    Speech.stop();
    speaking = true;
    Speech.speak(text, {
      rate: 1.0,
      pitch: 1.0,
      onDone: () => {
        speaking = false;
      },
      onStopped: () => {
        speaking = false;
      },
      onError: () => {
        speaking = false;
      },
    });
  } catch {
    speaking = false;
  }
}

export function stopSpeaking() {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
  speaking = false;
}

export function isSpeaking() {
  return speaking;
}

// ---- Speech recognition -------------------------------------------------

type RecognitionModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: Record<string, unknown>) => void;
  stop: () => void;
  addListener: (event: string, handler: (payload: any) => void) => { remove: () => void };
};

let recognition: RecognitionModule | null = null;
try {
  // Lazy require so a missing native module (Expo Go) doesn't crash the bundle.
  recognition = require('expo-speech-recognition').ExpoSpeechRecognitionModule ?? null;
} catch {
  recognition = null;
}

export const speechRecognitionAvailable = recognition !== null;

export type ListenHandlers = {
  /** fired for every (interim + final) transcript */
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
};

let activeSubs: { remove: () => void }[] = [];
let listening = false;

export async function startListening(
  handlers: ListenHandlers,
  opts: { continuous?: boolean } = {},
): Promise<boolean> {
  if (!recognition) {
    handlers.onError?.('Voice input needs the full app build.');
    return false;
  }
  if (listening) return true;

  try {
    const perm = await recognition.requestPermissionsAsync();
    if (!perm.granted) {
      handlers.onError?.('Microphone permission is off. Turn it on in Settings to use voice.');
      return false;
    }

    activeSubs.push(
      recognition.addListener('result', (e: any) => {
        const transcript: string = e?.results?.[0]?.transcript ?? '';
        handlers.onTranscript(transcript, Boolean(e?.isFinal));
      }),
    );
    activeSubs.push(
      recognition.addListener('error', (e: any) => {
        handlers.onError?.(e?.message ?? "Didn't catch that. Try again or use the buttons.");
      }),
    );
    activeSubs.push(
      recognition.addListener('end', () => {
        listening = false;
        handlers.onEnd?.();
      }),
    );

    recognition.start({
      lang: 'en-US',
      interimResults: true,
      continuous: opts.continuous ?? false,
      // keep it snappy for kitchen use
      androidIntentOptions: { EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1200 },
    });
    listening = true;
    return true;
  } catch (err) {
    listening = false;
    handlers.onError?.("Couldn't start voice input. Use the buttons instead.");
    return false;
  }
}

export function stopListening() {
  try {
    recognition?.stop();
  } catch {
    // ignore
  }
  activeSubs.forEach((s) => {
    try {
      s.remove();
    } catch {
      // ignore
    }
  });
  activeSubs = [];
  listening = false;
}

export function isListening() {
  return listening;
}

// ---- Intent helpers ----------------------------------------------------

const DONE_RE = /\b(done|next|continue|finished|ready|go on|keep going)\b/i;

/** True when a transcript means "advance to the next step". */
export function isAdvanceCommand(text: string): boolean {
  return DONE_RE.test(text.trim());
}
