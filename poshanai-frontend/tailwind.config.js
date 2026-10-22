/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/pixel-retroui/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: { leaf: '#176b4d', cream: '#f7faf7' },
      fontFamily: { minecraft: ['Minecraft', 'monospace'] },
    },
  },
  plugins: [],
};
