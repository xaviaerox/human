import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Mira palette — warm, calm, accessible
        stone: {
          50: '#faf9f7',
          100: '#f2f0eb',
          200: '#e5e1d8',
          300: '#d2ccc0',
          400: '#b5ada0',
          500: '#988f80',
          600: '#7d7468',
          700: '#655e53',
          800: '#524e45',
          900: '#45413a',
        },
        bloom: {
          50: '#fdf6f0',
          100: '#fae8d8',
          200: '#f5cfaf',
          300: '#eeae7e',
          400: '#e6884a',
          500: '#df6b28',
          600: '#d1541d',
          700: '#ad4019',
          800: '#8b351a',
          900: '#712d18',
        },
        moss: {
          50: '#f4f7f0',
          100: '#e5ecda',
          200: '#cddab8',
          300: '#aec18e',
          400: '#8fa56a',
          500: '#748b52',
          600: '#5b6f3f',
          700: '#475735',
          800: '#3a462c',
          900: '#313c26',
        },
        sky: {
          50: '#f0f7fa',
          100: '#d8ecf3',
          200: '#b5d8e9',
          300: '#84bdd8',
          400: '#4f9dc3',
          500: '#3081ab',
          600: '#246690',
          700: '#1e5275',
          800: '#1c4562',
          900: '#1b3a52',
        },
        lavender: {
          50: '#f5f3fa',
          100: '#ede8f5',
          200: '#ddd4ed',
          300: '#c5b5e0',
          400: '#a88fce',
          500: '#8e6dbc',
          600: '#7a56a9',
          700: '#664590',
          800: '#553b77',
          900: '#473263',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'pulse-gentle': 'pulse-gentle 3s ease-in-out infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'sway': 'sway 5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'bloom': 'bloom 0.6s ease-out',
      },
      keyframes: {
        'pulse-gentle': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.04)', opacity: '1' },
        },
        'breathe': {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.06) translateY(-4px)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'sway': {
          '0%, 100%': { transform: 'rotate(-2deg) scale(1)' },
          '50%': { transform: 'rotate(2deg) scale(1.03)' },
        },
        'glow-pulse': {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.08)', filter: 'brightness(1.15)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'bloom': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'soft': '0 2px 16px -4px rgba(0,0,0,0.08), 0 1px 4px -2px rgba(0,0,0,0.04)',
        'card': '0 4px 24px -8px rgba(0,0,0,0.10), 0 2px 8px -4px rgba(0,0,0,0.06)',
        'glow-bloom': '0 0 32px -4px rgba(223,107,40,0.25)',
        'glow-moss': '0 0 32px -4px rgba(116,139,82,0.25)',
        'glow-lavender': '0 0 32px -4px rgba(142,109,188,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
