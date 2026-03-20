import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F8F7F4",
        ink: "#1A1A1A",
        border: "#E4E2DC",
        muted: "#8A8880",
        tag: {
          commit: "#2D6A4F",
          "commit-bg": "#D8F3DC",
          discard: "#9E9E9E",
          "discard-bg": "#F5F5F5",
          hold: "#B45309",
          "hold-bg": "#FEF3C7",
          reference: "#1E40AF",
          "reference-bg": "#DBEAFE",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": "0.625rem",
      },
    },
  },
  plugins: [],
};

export default config;
