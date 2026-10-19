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
        glass: {
          surface: 'rgba(38, 34, 36, 0.68)',
          elevated: 'rgba(48, 40, 43, 0.78)',
          subtle: 'rgba(30, 26, 28, 0.55)',
          border: 'rgba(239, 223, 197, 0.13)',
          'border-hover': 'rgba(220, 32, 17, 0.45)',
          sidebar: 'rgba(22, 18, 20, 0.88)',
          input: 'rgba(20, 16, 18, 0.75)',
        },
        theme: {
          bg: '#100D0E',          // Base background
          sidebar: 'rgba(22, 18, 20, 0.88)',
          card: 'rgba(38, 34, 36, 0.68)',
          elevated: 'rgba(48, 40, 43, 0.78)',
          border: 'rgba(239, 223, 197, 0.13)',
          burgundy: '#380F17',
          crimson: '#8F0B13',
          signal: '#DC2011',
          ivory: '#EFDFC5',
          muted: '#B7B7BA',
        },
        app: {
          bg: '#100D0E',
          sidebar: 'rgba(22, 18, 20, 0.88)',
          card: 'rgba(38, 34, 36, 0.68)',
          elevated: 'rgba(48, 40, 43, 0.78)',
          border: 'rgba(239, 223, 197, 0.13)',
          burgundy: '#380F17',
          crimson: '#8F0B13',
          signal: '#DC2011',
          ivory: '#EFDFC5',
          muted: '#B7B7BA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glass-sm': 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 16px rgba(0, 0, 0, 0.18)',
        'glass-md': 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.22)',
        'glass-lg': 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 12px 36px rgba(0, 0, 0, 0.35)',
        'subtle-crimson': '0 2px 12px -2px rgba(143, 11, 19, 0.45)',
        'subtle-signal': '0 2px 14px -2px rgba(220, 32, 17, 0.5)',
      },
    },
  },
  plugins: [],
}
