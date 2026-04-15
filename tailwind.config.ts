import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#07101f',
          card: '#0d1b2e',
          elevated: '#122236',
          hover: '#162840',
        },
        border: {
          DEFAULT: '#1a2d45',
          light: '#243d57',
          bright: '#2e5070',
        },
        accent: {
          cyan: '#00d4ff',
          dim: '#00a0c0',
          glow: 'rgba(0,212,255,0.15)',
        },
        text: {
          primary: '#e8f4fd',
          secondary: '#a8c5da',
          muted: '#6b8fa8',
          dim: '#3d5a73',
        },
        status: {
          occupied: '#00ff88',
          'occupied-dim': 'rgba(0,255,136,0.15)',
          vacant: '#ff4444',
          'vacant-dim': 'rgba(255,68,68,0.15)',
          bartawi: '#ffa500',
          'bartawi-dim': 'rgba(255,165,0,0.15)',
          legal: '#ff6b00',
          'legal-dim': 'rgba(255,107,0,0.15)',
          maintenance: '#ffcc00',
        },
      },
      fontFamily: {
        heading: ['Syne', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-up': 'fadeUp 0.3s ease-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
}
export default config
