import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0e14",
        panel: "#141925",
        panelHover: "#1b2230",
        border: "#222a3a",
        muted: "#8b95a8",
        text: "#e6eaf2",
        accent: "#4f8cff",
        bull: "#2ecc71",
        bear: "#ff5d6c",
        warn: "#ffb648",
      },
    },
  },
  plugins: [],
};

export default config;
