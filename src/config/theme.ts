/**
 * Theme Configuration
 * 
 * All color tokens used throughout the app.
 * These are applied via CSS variables and can be edited in Settings.
 */

export const defaultTheme = {
  primary: '#e8d487',      // Gold - main brand color
  secondary: '#151515',    // Charcoal black
  accent1: '#ffd700',      // Bright gold
  accent2: '#b8860b',      // Dark gold
  background: '#0b0b0b',   // Deep black
}

export type Theme = typeof defaultTheme

/**
 * Tailwind class mappings for theme colors
 * Use these instead of hardcoded Tailwind colors
 */
export const themeClasses = {
  // Backgrounds
  bgPrimary: 'bg-[var(--color-primary)]',
  bgSecondary: 'bg-[var(--color-secondary)]',
  bgAccent1: 'bg-[var(--color-accent1)]',
  bgAccent2: 'bg-[var(--color-accent2)]',
  bgBackground: 'bg-[var(--color-background)]',

  // Text
  textPrimary: 'text-[var(--color-primary)]',
  textSecondary: 'text-[var(--color-secondary)]',
  textAccent1: 'text-[var(--color-accent1)]',
  textAccent2: 'text-[var(--color-accent2)]',

  // Borders
  borderPrimary: 'border-[var(--color-primary)]',
  borderSecondary: 'border-[var(--color-secondary)]',
  borderAccent1: 'border-[var(--color-accent1)]',

  // Hover states
  hoverBgPrimary: 'hover:bg-[var(--color-primary)]',
  hoverBgAccent1: 'hover:bg-[var(--color-accent1)]',
  hoverTextPrimary: 'hover:text-[var(--color-primary)]',
}
