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
    port: 5174,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  define: {
    "import.meta.env.VITE_PORTAL": JSON.stringify("citizen"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist/citizen",
    rollupOptions: {
      input: path.resolve(__dirname, "index.citizen.html"),
    },
  },
});
