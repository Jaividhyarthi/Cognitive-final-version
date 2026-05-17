/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F5F0',
        surface: '#FFFFFF',
        'surface-elevated': '#F0ECE6',
        'surface-dark': '#E8E2DA',
        primary: {
          DEFAULT: '#2A7C6F',
          hover: '#1F5C52',
          light: '#EAF4F2',
          glow: '#4DB6A8',
        },
        accent: {
          DEFAULT: '#E8A838',
          hover: '#C98D1E',
          light: '#FEF3DC',
        },
        text: {
          primary: '#1C1C2E',
          secondary: '#4A4A68',
          muted: '#9494A8',
        },
        border: {
          DEFAULT: '#E2DDD6',
          strong: '#C8C2BA',
        },
        alert: {
          low: '#2D9B6B',
          'low-bg': '#EAFAF3',
          moderate: '#D97706',
          'moderate-bg': '#FEF9EE',
          crisis: '#DC2626',
          'crisis-bg': '#FEF2F2',
        },
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px 0 rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)',
        soft: '0 2px 8px 0 rgba(42,124,111,0.12)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}