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
          DEFAULT: '#1A1F45',
          dark: '#0A0F1D',
          navy: '#131B35',
          fixed: '#E7E9F4'
        },
        secondary: {
          DEFAULT: '#E97F29',
          light: '#F7A65E',
          hover: '#D46F1E',
          container: '#FFF3EA',
          fixed: '#FDE8D7',
          'on-container': '#9A4603'
        },
        surface: {
          DEFAULT: '#F8FAFC',
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
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
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
