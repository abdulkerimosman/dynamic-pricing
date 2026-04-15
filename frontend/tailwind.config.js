/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        brand: {
          400: '#FF5247',
          500: '#EF3B36',
          600: '#DC3428',
        },
        gray: {
          50:  '#F9F9F9',
          100: '#F2F2F2',
          200: '#E8E8E8',
          300: '#D9D9D9',
          400: '#CCCCCC',
          500: '#999999',
          600: '#666666',
          700: '#333333',
          800: '#1a1a1a',
        },
        success: {
          50:  '#E8F5E9',
          500: '#28A745',
          700: '#1B7A2D',
        },
        warning: {
          50:  '#FFF3CD',
          500: '#FFC107',
          700: '#E0A800',
        },
        danger: {
          50:  '#F8D7DA',
          500: '#DC3545',
          700: '#A02622',
        },
      },
    },
  },
  plugins: [],
};
