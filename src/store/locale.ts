/**
 * App language store. Independent of auth/session — this is purely a display
 * preference, available whether or not anyone is signed in.
 *
 * Defaults to the device's language when it's one Yummi supports, otherwise
 * English. Once the user picks a language explicitly (or the detected one
 * loads), it's persisted to AsyncStorage so it sticks across restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const SUPPORTED_LANGUAGES = ['en', 'de', 'sq', 'mk', 'sr'] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

/** Each language's own name for itself, for the picker. */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  de: 'Deutsch',
  sq: 'Shqip',
  mk: 'Македонски',
  sr: 'Srpski',
};

/** BCP-47 tag passed to the speech recognizer for each language. */
export const SPEECH_LOCALE: Record<LanguageCode, string> = {
  en: 'en-US',
  de: 'de-DE',
  sq: 'sq-AL',
  mk: 'mk-MK',
  sr: 'sr-RS',
};

/**
 * English name of each language, sent to the AI edge functions so the model
 * knows what language to reply in (an English name is far more reliable for
 * this than a bare ISO code).
 */
export const LANGUAGE_ENGLISH_NAME: Record<LanguageCode, string> = {
  en: 'English',
  de: 'German',
  sq: 'Albanian',
  mk: 'Macedonian',
  sr: 'Serbian',
};

function isSupported(code: string | null | undefined): code is LanguageCode {
  return !!code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

function detectDefaultLanguage(): LanguageCode {
  try {
    for (const locale of Localization.getLocales()) {
      if (isSupported(locale.languageCode)) return locale.languageCode;
    }
  } catch {
    // Localization unavailable (e.g. some test/web environments) — fall back below.
  }
  return 'en';
}

type LocaleState = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
};

export const useLocale = create<LocaleState>()(
  persist(
    (set) => ({
      language: detectDefaultLanguage(),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'yummi-locale',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
