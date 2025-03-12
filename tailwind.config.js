/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000000', // Black for buttons
          dark: '#000000',
          accent: '#EC8FD0', // Pink for button text (was Gold)
        },
        'primary-accent': '#EC8FD0', // Explicitly define for border and other utilities
      },
      borderRadius: {
        DEFAULT: '0',
        none: '0',
        sm: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
      }
    },
  },
  plugins: [],
};