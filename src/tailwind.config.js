/** @type {import('tailwindcss').Config} */
// npx tailwindcss -i ./utils/tailwindHelper.css -o ./public/css/tailwind.css --minify
module.exports = {
  content: ["./views/**/*.ejs"],
  theme: {
    extend: {},
  },
  plugins: [],
}