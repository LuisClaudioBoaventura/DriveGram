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
        drive: {
          blue: 'rgb(var(--drive-primary, 26 115 232) / <alpha-value>)',
          blueHover: 'rgb(var(--drive-primary-hover, 21 87 176) / <alpha-value>)',
          darkBg: 'rgb(var(--drive-dark-bg, 19 19 20) / <alpha-value>)',
          darkSurface: 'rgb(var(--drive-dark-surface, 30 31 32) / <alpha-value>)',
          darkBorder: 'rgb(var(--drive-dark-border, 51 53 55) / <alpha-value>)',
          darkHover: 'rgb(var(--drive-dark-hover, 40 42 44) / <alpha-value>)',
          lightBg: '#f8fafd',
          lightSurface: '#ffffff',
          lightBorder: '#e0e3e7',
          lightHover: '#f1f3f4',
          telegram: '#24A1DE'
        }
      }
    },
  },
  plugins: [],
}
