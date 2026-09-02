/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        serene: {
          dark: '#E8E8E8',       // Light gray background
          card: '#C2FFF0',       // Light cyan for cards
          accent: '#0E7C7B',     // Teal secondary accent
          primary: '#1B98E0',    // Bright blue primary accent
          text: '#0D1B2A',       // Dark navy text
          muted: '#3D5A80'       // Muted blue-gray for secondary text
        },
        // Landing page tokens mapped to new palette
        land: {
          bg: '#E8E8E8',         // Light gray background
          ink: '#0D1B2A',        // Dark navy text
          primary: '#1B98E0',    // Bright blue
          secondary: '#0E7C7B',  // Teal
          teal: '#0E7C7B',       // Teal accent
          muted: '#3D5A80',      // Muted text
          border: '#0E7C7B20',   // Teal border (transparent)
          surface: '#ffffff',    // White surface
          soft: '#C2FFF0',       // Light cyan soft bg
        }
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
