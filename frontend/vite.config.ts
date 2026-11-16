import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The frontend runs on 5174. Every request to /api is forwarded to the backend on 5000.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: { "/api": "http://localhost:5000" },
  },
});
