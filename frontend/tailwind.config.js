/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        lemon: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
          800: "#854d0e",
          900: "#713f12",
        },
        navy: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          200: "#bac8ff",
          300: "#91a7ff",
          400: "#748ffc",
          500: "#4c6ef5",
          600: "#3b5bdb",
          700: "#2c3e9e",
          800: "#1e2a6e",
          900: "#0f1a4a",
          950: "#060d2e",
        },
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        playfair: ['"Playfair Display"', "serif"],
        cardo: ["Cardo", "serif"],
      },
    },
  },
  plugins: [],
};
