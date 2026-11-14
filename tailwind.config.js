/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#06080f', panel: '#0b1120', card: '#0e1628', line: '#1c2a48',
        cy: '#35e0ee', g: '#2fe48a', y: '#ffd23f', r: '#ff4d5e', bl: '#5aa8ff',
        t1: '#e8eefc', t2: '#9fb0d0', t3: '#5d6f92',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
