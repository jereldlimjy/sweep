module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    fontFamily: {
      sans: ["Arial", "sans-serif"],
      sfrounded: ["SFRounded, sans-serif"],
      "sfrounded-medium": ["SFRounded-Medium, sans-serif"],
    },
    extend: {},
  },
  // plugins: [require("daisyui")],
};
