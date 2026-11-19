/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kaliber: {
          primary: '#E5383B',
          secondary: '#C83338',
          hover: '#a8262b',
          darkBg: '#101316',
          darkSurface: '#1d2226',
          darkAlt: '#161a1d',
          gradientStart: '#C83338',
          gradientEnd: '#291C33',
          textPrimary: '#FFFFFF',
          textSecondary: '#b8bec4',
          textTertiary: '#9ea5ad',
          error: '#ff6b6d',
          borderDefault: 'rgba(255, 255, 255, 0.15)',
          borderFocus: 'rgba(255, 255, 255, 0.40)',
        },
      },
      fontFamily: {
        agencyfb: ['AgencyFB', 'sans-serif'],
        hack: ['Hack-Regular', 'monospace'],
        'hack-bold': ['Hack-Bold', 'monospace'],
        'pt-sans': ['PTSans-Regular', 'sans-serif'],
        'pt-sans-bold': ['PTSans-Bold', 'sans-serif'],
        stop: ['Stop', 'monospace'],
      },
      boxShadow: {
        'kaliber-glow': '0 0 50px 5px rgba(229, 56, 59, 0.35)',
      },
    },
  },
  plugins: [],
}
