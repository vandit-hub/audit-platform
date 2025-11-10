import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette: tie DEFAULT values to CSS variables but retain shade scale for legacy usage
        primary: {
          DEFAULT: "rgb(var(--primary-rgb) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground-rgb) / <alpha-value>)",
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
        secondary: {
          DEFAULT: "rgb(var(--secondary-rgb) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground-rgb) / <alpha-value>)",
        },
        background: "rgb(var(--background-rgb) / <alpha-value>)",
        foreground: "rgb(var(--foreground-rgb) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card-rgb) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground-rgb) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover-rgb) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground-rgb) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted-rgb) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground-rgb) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground-rgb) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive-rgb) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground-rgb) / <alpha-value>)",
        },
        surface: {
          DEFAULT: 'var(--c-bacPri)',
          secondary: 'var(--c-bacSec)',
          hover: 'var(--c-bacHov)',
        },
        text: {
          DEFAULT: 'var(--c-texPri)',
          primary: 'var(--c-texPri)',
          secondary: 'var(--c-texSec)',
          tertiary: 'var(--c-texTer)',
        },
        outline: {
          DEFAULT: 'var(--border-color-regular)',
          strong: 'var(--c-borPri)',
        },
        border: 'var(--border-color-regular)',
        input: 'var(--input)',
        ring: "rgb(var(--ring-rgb) / <alpha-value>)",
        chart: {
          1: "rgb(var(--chart-1-rgb) / <alpha-value>)",
          2: "rgb(var(--chart-2-rgb) / <alpha-value>)",
          3: "rgb(var(--chart-3-rgb) / <alpha-value>)",
          4: "rgb(var(--chart-4-rgb) / <alpha-value>)",
          5: "rgb(var(--chart-5-rgb) / <alpha-value>)",
        },
        brand: {
          blue: 'var(--c-palUiBlu600)',
          "blue-muted": 'var(--ca-palUiBlu100)',
          green: 'var(--c-palUiGre600)',
          "green-muted": 'var(--c-palUiGre100)',
          pink: 'var(--cd-palPin500)',
          "pink-muted": 'var(--cl-palPin100)',
          purple: 'var(--cd-palPur500)',
          "purple-muted": 'var(--cl-palPur100)',
          orange: 'var(--cd-palOra500)',
          "orange-muted": 'var(--cl-palOra100)',
          yellow: 'var(--cd-palYel500)',
          "yellow-muted": 'var(--cl-palYel100)',
        },
        sidebar: {
          DEFAULT: "rgb(var(--sidebar-rgb) / <alpha-value>)",
          foreground: "rgb(var(--sidebar-foreground-rgb) / <alpha-value>)",
          primary: "rgb(var(--sidebar-primary-rgb) / <alpha-value>)",
          "primary-foreground": "rgb(var(--sidebar-primary-foreground-rgb) / <alpha-value>)",
          accent: "rgb(var(--sidebar-accent-rgb) / <alpha-value>)",
          "accent-foreground": "rgb(var(--sidebar-accent-foreground-rgb) / <alpha-value>)",
          border: 'var(--sidebar-border)',
          ring: "rgb(var(--sidebar-ring-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ['var(--font-family-sans)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
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
        sm: 'var(--border-radius-400)',
        md: 'var(--border-radius-500)',
        lg: 'var(--border-radius-600)',
        xl: 'var(--border-radius-700)',
        pill: 'var(--border-radius-round)',
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
        // Card shadow used across Figma components
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
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