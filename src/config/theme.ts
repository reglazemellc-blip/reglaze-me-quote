// -------------------------------------------------------------
// Theme Configuration — Gold + Charcoal Black
// -------------------------------------------------------------

export const theme = {
  // Core colors
  colors: {
    gold: '#E8D487',
    goldBright: '#FFD700',
    goldDeep: '#B8860B',
    goldGlow: '#FFF1A8',

    charcoal: '#0B0B0B',
    charcoalLight: '#1A1A1A',
    surface: '#151515',

    border: '#2A2414',
    borderSubtle: '#2A2A2A',

    text: '#F5F3DA',
    textMuted: '#CFCFCF',
  },

  // Default theme settings (used in Settings)
  defaults: {
    primary: '#E8D487',
    secondary: '#151515',
    accent1: '#FFD700',
    accent2: '#B8860B',
    background: '#0B0B0B',
  },
} as const;

export type ThemeColors = typeof theme.colors;
export type ThemeDefaults = typeof theme.defaults;
