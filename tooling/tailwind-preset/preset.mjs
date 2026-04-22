/**
 * Matriz shared Tailwind preset.
 *
 * Baseline visual tokens that every app can extend. The actual design tokens
 * and per-app theme overrides are defined in @matriz/design-system.
 */
/** @type {import('tailwindcss').Config} */
const preset = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
}

export default preset
