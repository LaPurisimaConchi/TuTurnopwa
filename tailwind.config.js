/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      // Paleta de la web: terracota principal, mostaza de acento y neutros cálidos
      colors: {
        terracota: { DEFAULT: "#b36a4a", oscuro: "#9a5638", suave: "#f9ece6" },
        mostaza: { DEFAULT: "#f4c542", suave: "#fff6d6", borde: "#e5b92f" },
        crema: "#fdfaf5",
        arena: "#f6efe6",
        linea: "#eadfd2",
        tinta: { DEFAULT: "#3f3128", suave: "#7a6858" },
      },
    },
  },
  plugins: [],
}
