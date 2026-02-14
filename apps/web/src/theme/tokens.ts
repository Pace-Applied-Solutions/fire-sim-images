/**
 * Design tokens for the Fire Sim application.
 * Defines colors, typography, spacing, and other design primitives.
 */

export const colors = {
  // Background colors - dark theme
  background: {
    primary: '#0f1419',
    secondary: '#1a1f26',
    tertiary: '#242a33',
    elevated: '#2d3440',
  },

  // Text colors
  text: {
    primary: '#e4e6eb',
    secondary: '#b0b3b8',
    tertiary: '#8a8d91',
    disabled: '#5a5d62',
  },

  // Brand/accent colors - warm amber/orange for fire context
  accent: {
    primary: '#ff9500',
    secondary: '#ffb340',
    tertiary: '#ffc670',
    dark: '#cc7700',
  },

  // Semantic colors for status states
  status: {
    idle: '#8a8d91',
    loading: '#3b82f6',
    generating: '#ff9500',
    ready: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
  },

  // Border colors
  border: {
    default: '#3a3f4a',
    focus: '#ff9500',
    hover: '#4a5160',
  },

  // Interactive states
  interactive: {
    hover: 'rgba(255, 149, 0, 0.1)',
    active: 'rgba(255, 149, 0, 0.2)',
    disabled: '#3a3f4a',
  },
} as const;

export const typography = {
  fontFamily: {
    base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", "Droid Sans Mono", "Source Code Pro", monospace',
  },

  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    base: 1.5,
    relaxed: 1.75,
  },
} as const;

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
} as const;

export const radius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
} as const;

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  training: 1920, // Training room displays
} as const;

export const zIndex = {
  base: 1,
  elevated: 10,
  dropdown: 100,
  modal: 1000,
  toast: 2000,
  tooltip: 3000,
} as const;
