import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['NeueMontreal', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['NeueMontreal', 'system-ui', 'sans-serif'],
        mono: ['NeueMontreal', 'ui-monospace', 'monospace'],
      },
      colors: {
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* ── Solo brand palette ─── */
        solo: {
          orange:  "#FF481E",
          crimson: "#9E2A19",
          yellow:  "#FFC200",
          dark:    "#141414",
          cream:   "#E3E2DD",
          panel:   "#1A1A1A",
          border:  "#292929",
        },
        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background))",
          foreground:           "hsl(var(--sidebar-foreground))",
          primary:              "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:               "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:               "hsl(var(--sidebar-border))",
          ring:                 "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        /* Sharp, precision-engineering aesthetic */
        none: "0px",
        sm:   "2px",
        DEFAULT: "4px",
        md:   "var(--radius)",          /* 4px */
        lg:   "calc(var(--radius) * 2)", /* 8px */
        xl:   "calc(var(--radius) * 3)", /* 12px */
        "2xl": "calc(var(--radius) * 4)", /* 16px */
        full: "9999px",
      },
      backgroundImage: {
        "solo-gradient":         "linear-gradient(135deg, #FF481E 0%, #FFC200 100%)",
        "solo-gradient-v":       "linear-gradient(180deg, #FF481E 0%, #FFC200 100%)",
        "solo-gradient-subtle":  "linear-gradient(135deg, rgb(255 72 30 / 0.12) 0%, rgb(255 194 0 / 0.08) 100%)",
        "solo-gradient-crimson": "linear-gradient(135deg, #FF481E 0%, #9E2A19 100%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 16px -4px rgb(255 72 30 / 0.35)" },
          "50%":       { boxShadow: "0 0 28px -4px rgb(255 72 30 / 0.6)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 0.4s ease-out",
        "scale-in":       "scale-in 0.25s ease-out",
        "slide-up":       "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-glow":     "pulse-glow 2.5s ease-in-out infinite",
      },
      /* Tracking for uppercase labels */
      letterSpacing: {
        tight:    "-0.025em",
        tighter:  "-0.03em",
        label:    "0.07em",
        wide:     "0.08em",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
