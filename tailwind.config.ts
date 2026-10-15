import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/index.html', './src/renderer/student.html', './src/renderer/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pulse: {
          50: '#f0f5ff',
          100: '#dbe7ff',
          200: '#b8d0ff',
          300: '#8ab0ff',
          400: '#5c8bff',
          500: '#3563ff',
          600: '#2245e6',
          700: '#1c37b4',
          800: '#1a308f',
          900: '#182c72'
        },
        ink: {
          950: '#0a0e1a'
        },
        // Theme-driven slide colors — values come from CSS variables set by
        // themeStyleVars() (src/shared/theme.ts), so the same markup works on
        // every theme, light or dark, with opacity modifiers (bg-slide-fg/10).
        slide: {
          fg: 'rgb(var(--slide-fg, 255 255 255) / <alpha-value>)',
          muted: 'rgb(var(--slide-muted, 203 213 225) / <alpha-value>)',
          accent: 'rgb(var(--slide-accent, 92 139 255) / <alpha-value>)'
        }
      },
      fontFamily: {
        sans: ['"Inter Variable"', '"Inter"', 'system-ui', 'sans-serif'],
        heading: ['var(--slide-font-heading)'],
        body: ['var(--slide-font-body)']
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '70%': { transform: 'scale(1.4)', opacity: '0' },
          '100%': { transform: 'scale(1.4)', opacity: '0' }
        }
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.2, 0.6, 0.4, 1) infinite'
      }
    }
  },
  plugins: []
} satisfies Config
