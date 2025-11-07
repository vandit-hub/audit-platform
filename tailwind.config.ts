import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          100: '#fcfbfb',
          200: '#f6f5f4',
          300: '#dfdcd9',
          400: '#a39e98',
          500: '#78736f',
          600: '#615d59',
          700: '#494744',
          800: '#31302e',
          900: '#191918',
        },
        notion: {
          bacPri: '#ffffff',
          bacSec: '#f7f6f3',
          bacHov: '#f1f0ee',
          texPri: '#37352f',
          texSec: '#787774',
          texTer: '#9b9a97',
          borPri: 'rgba(0, 0, 0, 0.09)',
        },
        blue: {
          600: '#2383e2',
          700: '#105fad',
          100: 'rgba(35, 131, 226, 0.07)',
          200: 'rgba(35, 131, 226, 0.14)',
        },
        green: {
          500: '#448361',
          100: 'rgba(123, 183, 129, 0.27)',
        },
        pink: {
          500: '#c14c8a',
          100: 'rgba(225, 136, 179, 0.27)',
        },
        purple: {
          500: '#9065b0',
          100: 'rgba(168, 129, 197, 0.27)',
        },
        border: {
          regular: 'rgba(0, 0, 0, 0.08)',
        },
        text: {
          extraLight: 'rgba(0, 0, 0, 0.2)',
          light: 'rgba(0, 0, 0, 0.4)',
          medium: 'rgba(0, 0, 0, 0.6)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.05rem' }],
        sm: ['0.875rem', { lineHeight: '1.225rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.8rem' }],
        xl: ['1.25rem', { lineHeight: '1.625rem' }],
        '2xl': ['2rem', { lineHeight: '2.4rem' }],
        '3xl': ['3rem', { lineHeight: '3.3rem' }],
        '4xl': ['4rem', { lineHeight: '4rem' }],
      },
      letterSpacing: {
        tight: '-0.02em',
        normal: '0',
        wide: '0.5px',
      },
      fontWeight: {
        // Usage: Body text, descriptions
        'normal': '400',
        // Usage: Subsections, intermediate emphasis
        'medium': '500',
        // Usage: Section headings, buttons
        'semibold': '600',
        // Usage: Page titles, primary headings
        'bold': '700',
      },
      spacing: {
        '5': '20px',
        '10': '40px',
        '15': '60px',
        '18': '72px',
        '20': '80px',
        '22': '88px',
        '26': '104px',
        '30': '120px',
        '40': '160px',
      },
      borderRadius: {
        '200': '0.25rem',
        '300': '0.3125rem',
        '400': '0.375rem',
        '500': '0.5rem',
        '600': '0.625rem',
        '700': '0.75rem',
        round: '624.9375rem',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0, 0, 0, 0.04)',
        raised: '0 2px 4px rgba(0, 0, 0, 0.06)',
        floating: '0 4px 8px rgba(0, 0, 0, 0.08)',
        modal: '0 8px 16px rgba(0, 0, 0, 0.12)',
        dropdown: '0 12px 24px rgba(0, 0, 0, 0.15)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        // Standard easing for most interactions
        'out': 'cubic-bezier(0, 0, 0.2, 1)',
        // Smooth deceleration
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        // Slide in from right (toasts, notifications)
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        // Fade in (modals, overlays)
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Shake (error states)
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        // Scale up (button press feedback)
        'scale-up': {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 250ms ease-out',
        'fade-in': 'fade-in 150ms ease-out',
        'shake': 'shake 350ms ease-in-out',
        'scale-up': 'scale-up 150ms ease-out',
      },
    },
  },
  plugins: []
} satisfies Config;