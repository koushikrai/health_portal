/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary, #1A1F45)',
          dark: 'var(--color-primary-dark, #0A0F1D)',
          navy: 'var(--color-primary-dark, #131B35)',
          light: 'var(--color-primary-light, #2C356E)',
          container: 'var(--color-primary-container, #131B35)',
          'on-container': 'var(--color-on-primary-container, #FFFFFF)',
          fixed: '#E7E9F4'
        },
        secondary: {
          DEFAULT: 'var(--color-secondary, #E97F29)',
          light: 'var(--color-secondary, #F7A65E)',
          hover: 'var(--color-secondary-hover, #D46F1E)',
          container: 'var(--color-secondary-container, #FFF3EA)',
          fixed: 'var(--color-secondary-container, #FDE8D7)',
          'on-container': 'var(--color-on-secondary-container, #9A4603)'
        },
        tertiary: {
          DEFAULT: 'var(--color-tertiary, #0284C7)',
          container: 'var(--color-tertiary-container, #E0F2FE)',
          'on-container': 'var(--color-on-tertiary-container, #0369A1)'
        },
        surface: {
          DEFAULT: 'var(--color-surface-canvas, #F8FAFC)',
          container: '#E2E8F0',
          'container-low': '#F1F5F9',
          'container-high': '#E8EDF5',
          'container-highest': '#CBD5E1',
          'container-lowest': '#FFFFFF'
        },
        'on-surface': {
          DEFAULT: '#0F172A',
          variant: '#64748B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      boxShadow: {
        'apple-sm': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        'apple-md': '0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)',
        'apple-lg': '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
      }
    },
  },
  plugins: [],
}
