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
          DEFAULT: "#9E1B1B",
          bright: "#C62828",
          deep: "#6B1414",
          soft: "#E0A8A0",
        },
        brown: {
          950: "#0A0A0A",
          900: "#181818",
          700: "#3A3A3A",
        },
        cream: {
          DEFAULT: "#F5F0E8",
          warm: "#EDE6D8",
        },
        paper: "#FAF7F0",
        success: "#6B8E4E",
        danger: "#7A1414",
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
