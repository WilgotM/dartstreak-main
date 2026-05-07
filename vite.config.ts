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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react") || id.includes("scheduler")) return "react";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@sentry")) return "sentry";
          if (id.includes("i18next")) return "i18n";
          if (id.includes("recharts")) return "charts";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("three") || id.includes("@react-three")) return "three";
          if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("cmdk") || id.includes("vaul")) return "ui";
          if (id.includes("date-fns")) return "date";
          return "vendor";
        },
      },
    },
  },
}));
