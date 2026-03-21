import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  root: __dirname,
  appType: "spa",
  optimizeDeps: {
    include: ["leaflet", "react-leaflet"],
    force: true,
  },
  server: {
    host: "::",
    port: 5175,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  define: {
    "import.meta.env.VITE_PORTAL": JSON.stringify("backoffice"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist/backoffice",
    rollupOptions: {
      input: path.resolve(__dirname, "index.backoffice.html"),
    },
  },
});
