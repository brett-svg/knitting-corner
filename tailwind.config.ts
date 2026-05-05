import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FAFAFB",
        surface: "#FFFFFF",
        tint: "#F4F2F8",
        border: "#E6E3EC",
        ink: "#1F1F24",
        muted: "#6B6B76",
        accent: {
          pink: "#F472B6",
          rose: "#FB7185",
          peach: "#FDBA74",
          violet: "#A78BFA",
          lavender: "#C084FC",
          blue: "#60A5FA",
          teal: "#2DD4BF",
          mint: "#5EEAD4",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "grad-signature":
          "linear-gradient(135deg, #FF7AD9 0%, #C084FC 50%, #60A5FA 100%)",
        "grad-warm":
          "linear-gradient(135deg, #FDBA74 0%, #FB7185 50%, #C084FC 100%)",
        "grad-cool":
          "linear-gradient(135deg, #5EEAD4 0%, #60A5FA 50%, #A78BFA 100%)",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(31,31,36,0.04), 0 8px 24px rgba(31,31,36,0.06)",
        glow: "0 10px 40px -10px rgba(192,132,252,0.45)",
        ring: "0 0 0 1px #E6E3EC",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite",
        rise: "rise .5s cubic-bezier(.2,.7,.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
