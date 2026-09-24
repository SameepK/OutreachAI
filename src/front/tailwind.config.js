/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        headline: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        ink: '#1a1a1a',
        paper: '#f5f0e8',
        card: '#faf7f2',
        yellow: '#ffcc00',
        red: '#e63b2e',
        blue: '#0055ff',

        // M3-style surface scale layered on the same brutalist palette (Stitch tokens)
        surface: '#f5f0e8',
        'surface-bright': '#faf7f2',
        'surface-dim': '#d6d1c9',
        'surface-variant': '#e8e3da',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2ede5',
        'surface-container': '#eee9e0',
        'surface-container-high': '#e8e3da',
        'surface-container-highest': '#e2ddd4',
        'on-surface': '#1a1a1a',
        'on-surface-variant': '#4a4a4a',
        outline: '#1a1a1a',
        'outline-variant': '#d0cbc3',

        primary: '#1a1a1a',
        'on-primary': '#ffffff',
        'primary-container': '#ffcc00',
        'on-primary-container': '#1a1a1a',

        secondary: '#e63b2e',
        'on-secondary': '#1a1a1a',
        'secondary-container': '#ffdad6',
        'on-secondary-container': '#1a1a1a',

        tertiary: '#0055ff',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#d6e3ff',
        'on-tertiary-container': '#1a1a1a',
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        none: '0px',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem',
      },
      boxShadow: {
        brutal: '6px 6px 0px #1a1a1a',
        'brutal-sm': '4px 4px 0px #1a1a1a',
        'brutal-xs': '2px 2px 0px #1a1a1a',
      },
    },
  },
  plugins: [],
}
