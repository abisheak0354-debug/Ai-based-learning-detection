/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#3525cd',
        secondary: '#712ae2',
        surface: '#faf8ff',
        'surface-container': '#f2f3ff',
        'surface-container-high': '#eaedff',
        'surface-container-lowest': '#ffffff',
        'on-surface': '#131b2e',
        'on-surface-variant': '#464555',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}