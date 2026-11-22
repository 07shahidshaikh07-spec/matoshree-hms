import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        matoshree: {
          primary: "#258B7C",       // Teal green (Primary)
          primaryDark: "#1C6B5F",   // Darker teal for active/hover states
          primaryLight: "#319F8F",  // Slightly lighter teal
          secondary: "#70CFBA",     // Light mint green (Secondary)
          mint: "#E6F7F4",          // Soft mint background highlight
          bg: "#F7F9FA",            // Background
          card: "#FFFFFF",          // White card surface
          charcoal: "#1A202C",      // Main dark charcoal text
          muted: "#718096",         // Secondary muted gray text
          border: "#E2E8F0",        // Very light gray borders
          success: "#38A169",       // Soft green
          warning: "#D69E2E",       // Soft amber
          danger: "#E53E3E"         // Soft red
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
