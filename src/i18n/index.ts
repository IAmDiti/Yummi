/**
 * Tiny in-house i18n layer — no i18next dependency, just a flat dictionary
 * per language plus `{{var}}` interpolation, which is all this app's copy
 * needs. `t()` reads the language straight from the zustand locale store, so
 * it works both inside components and in plain service modules (e.g.
 * src/services/ai/voice.ts) that can't use hooks.
 *
 * `useT()` is the component-facing entry point: it subscribes to the locale
 * store so the screen re-renders immediately when the language changes.
 */

import { useLocale, type LanguageCode } from '../store/locale';
import { de } from './locales/de';
import { en } from './locales/en';
import { mk } from './locales/mk';
import { sq } from './locales/sq';
import { sr } from './locales/sr';

export type TranslationKey = keyof typeof en;

const DICTS: Record<LanguageCode, Record<TranslationKey, string>> = { en, de, sq, mk, sr };

type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}

/** Translate a key in the current language, falling back to English then the raw key. */
export function t(key: TranslationKey, vars?: Vars): string {
  const lang = useLocale.getState().language;
  const template = DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
  return interpolate(template, vars);
}

/**
 * Pluralize on `count`: looks up `${base}_one` for exactly 1, `${base}_other`
 * otherwise (matches how e.g. `recommendCard.pan_one` / `pan_other` are named).
 */
export function tPlural(base: string, count: number, vars?: Vars): string {
  const key = `${base}_${count === 1 ? 'one' : 'other'}` as TranslationKey;
  return t(key, { count, ...vars });
}

/** Hook form for components: subscribes so the screen re-renders on language change. */
export function useT() {
  useLocale((s) => s.language);
  return t;
}
