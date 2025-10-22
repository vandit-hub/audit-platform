import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand color - audit blue
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Neutrals - refined gray scale
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Semantic colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Caption/Meta - 12px
        'xs': ['0.75rem', { lineHeight: '1.125rem' }],      // line-height: 1.5
        // Body Secondary - 14px
        'sm': ['0.875rem', { lineHeight: '1.313rem' }],     // line-height: 1.5
        // Body Primary - 16px (DEFAULT)
        'base': ['1rem', { lineHeight: '1.625rem' }],       // line-height: 1.625
        // Subsection - 18px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],      // line-height: 1.556
        // Section Heading - 20px
        'xl': ['1.25rem', { lineHeight: '1.875rem' }],      // line-height: 1.5
        // Section Heading - 24px
        '2xl': ['1.5rem', { lineHeight: '2.25rem' }],       // line-height: 1.5
        // Page Subtitle - 30px
        '3xl': ['1.875rem', { lineHeight: '2.813rem' }],    // line-height: 1.5
        // Page Title - 36px
        '4xl': ['2.25rem', { lineHeight: '3.375rem' }],     // line-height: 1.5
        // Display - 48px
        '5xl': ['3rem', { lineHeight: '4.5rem' }],          // line-height: 1.5
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
        '4.5': '1.125rem',  // 18px
        '18': '4.5rem',     // 72px
        // Extended spacing for generous white space
        '22': '5.5rem',     // 88px
        '26': '6.5rem',     // 104px
        '30': '7.5rem',     // 120px
      },
      borderRadius: {
        'sm': '0.375rem',  // 6px
        'md': '0.5rem',    // 8px
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
      },
      boxShadow: {
        // Subtle shadow for cards, inputs
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        // Medium depth for dropdowns, hover states
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        // Elevated elements, modals
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        // Maximum elevation, dialogs
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        // Special: Focus ring shadow
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
      transitionDuration: {
        // Quick micro-interactions (button press, input focus)
        '150': '150ms',
        // Standard transitions (hover states, color changes)
        '250': '250ms',
        // Slower animations (slide-ins, modals)
        '350': '350ms',
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