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
          blue: '#1a73e8',
          blueHover: '#1557b0',
          darkBg: '#131314',
          darkSurface: '#1e1f20',
          darkBorder: '#333537',
          darkHover: '#282a2c',
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
