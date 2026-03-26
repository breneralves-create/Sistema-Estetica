/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        sidebar: 'var(--bg-sidebar)',
        card: 'var(--bg-card)',
        'border-card': 'var(--border-card)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          light: 'var(--primary-light)',
        },
        main: 'var(--text-main)',
        muted: 'var(--text-muted)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        'sidebar-active': 'var(--sidebar-active)'
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        modal: 'var(--shadow-modal)',
        dropdown: 'var(--shadow-dropdown)'
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'serif']
      }
    },
  },
  plugins: [],
}
