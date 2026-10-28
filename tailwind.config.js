/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#58B9F7',
        deep: '#287FC1',
        sunshine: '#FFE083',
        orange: '#FFAE8B',
        mint: '#83DDB4',
        lavender: '#C9B6F5',
        bg: '#F5F9FF',
        ink: '#243B53',
      },
      fontFamily: {
        sans: ['Nunito', '"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(40, 127, 193, 0.25)',
        card: '0 6px 20px -8px rgba(36, 59, 83, 0.18)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
