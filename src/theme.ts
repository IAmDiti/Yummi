/**
 * Yummi design tokens. Kept deliberately tiny: one accent colour, big type,
 * generous spacing. The UI should read at a glance while someone is hungry.
 */

export const colors = {
  bg: '#FFFFFF',
  surface: '#F5F3EF',
  surfaceAlt: '#ECE8E1',
  text: '#1C1B1A',
  textMuted: '#6B6862',
  border: '#DED9D0',
  accent: '#FF5A1F', // warm orange – appetite
  accentPressed: '#E24A12',
  onAccent: '#FFFFFF',
  danger: '#C0392B',
  success: '#2E7D32',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const font = {
  display: 40,
  title: 28,
  heading: 22,
  body: 18,
  label: 16,
  small: 14,
} as const;
