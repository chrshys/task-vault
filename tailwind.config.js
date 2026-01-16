/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'

export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          50: '#f8f9fb',
          100: '#e5e9f0',
          200: '#c8ccd4',
          300: '#abb2bf',
          400: '#7f848e',
          500: '#5c6370',
          600: '#3e4452',
          700: '#2c313c',
          800: '#282c34',
          900: '#21252b',
          950: '#181a1f',
        },
      },
    },
  },
  plugins: [typography],
}
