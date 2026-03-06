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
        ocean:    "#0D3B44",
        "ocean-mid": "#1A535C",
        teal:     "#4ECDC4",
        "teal-light": "#7EDDD7",
        coral:    "#E8604C",
        sand:     "#F5EFE0",
        cream:    "#FAF8F3",
      },
      fontFamily: {
        sans:  ["var(--font-dm-sans)", "sans-serif"],
        serif: ["var(--font-dm-serif)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
