import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Black Diamond Gold Theme
        blackdiamond: {
          background: '#0b0b0b',
          surface: '#151515',
          text: '#e8d487',
          gold: '#ffd700',        // accent bright
          goldDeep: '#b8860b',    // accent hover
          glow: '#fff1a8',
          link: '#ffd700',
          border: '#2a2a2a'
        },
        // Flat aliases to avoid refactors in existing classes
        background: '#0b0b0b',
        surface: '#151515',
        text: '#e8d487',
        primary: '#e8d487',
        accent1: '#ffd700',
        accent2: '#b8860b',
        hoverglow: '#fff1a8',
        link: '#ffd700',
        border: '#2a2a2a'
      },
      boxShadow: {
        // Neutral gray base shadow with optional gold glow on hover
        card: '0 8px 16px rgba(34,34,34,0.6)',
        gold: '0 0 8px rgba(255,215,0,0.15)'
      },
      borderRadius: {
        xl: '14px'
      }
    },
  },
  plugins: [],
} satisfies Config
