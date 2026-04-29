import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mustard: {
          DEFAULT: "#D4A53A",
          bright: "#E8B84A",
          deep: "#B08825",
          soft: "#F0D58F",
        },
        brown: {
          950: "#1A0F05",
          900: "#2B1810",
          700: "#5C3A22",
        },
        cream: {
          DEFAULT: "#F5E9D0",
          warm: "#EDD9B0",
        },
        paper: "#FAF3E3",
        success: "#6B8E4E",
        danger: "#A63D2A",
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Cormorant Garamond", "serif"],
        playfair: ["var(--font-playfair)", "Playfair Display", "serif"],
        heading: ["var(--font-oswald)", "Oswald", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sharp: "2px",
      },
      letterSpacing: {
        "wide-08": "0.08em",
        "wide-12": "0.12em",
        "wide-18": "0.18em",
      },
    },
  },
  plugins: [],
};
export default config;
