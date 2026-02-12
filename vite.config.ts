import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { qrcode } from "vite-plugin-qrcode";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: true,
    port: 8080,
    // Explicitly using HTTP for local testing on devices like iPhone
  },
  plugins: [react(), qrcode()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
