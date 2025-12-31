import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0d1117',
          secondary: '#161b22',
        },
        card: {
          DEFAULT: '#1c2128',
          hover: '#252c35',
        },
        border: '#30363d',
        text: {
          primary: '#f0f6fc',
          secondary: '#8b949e',
          muted: '#6e7681',
        },
        accent: {
          DEFAULT: '#00d4aa',
          glow: 'rgba(0, 212, 170, 0.3)',
          secondary: '#58a6ff',
        },
        warning: {
          DEFAULT: '#f0b429',
          bg: 'rgba(240, 180, 41, 0.1)',
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 212, 170, 0.3)',
        'glow-sm': '0 0 10px rgba(0, 212, 170, 0.3)',
        'glow-lg': '0 0 30px rgba(0, 212, 170, 0.4)',
      },
    },
  },
  plugins: [],
}
export default config
