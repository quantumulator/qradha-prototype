import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Qradha Design System
        navy: {
          DEFAULT: '#0A1929',
          50: '#1e3a5f',
          100: '#1a3250',
          200: '#152a42',
          300: '#112233',
          400: '#0d1a26',
          500: '#0A1929',
          600: '#08141f',
          700: '#060f17',
          800: '#040a0f',
          900: '#020508',
        },
        accent: {
          orange: '#FF6B35',
          cyan: '#00D9FF',
          red: '#FF2E63',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00D9FF, 0 0 10px #00D9FF' },
          '100%': { boxShadow: '0 0 20px #00D9FF, 0 0 30px #00D9FF' },
        },
      },
    },
  },
  plugins: [],
}
export default config
