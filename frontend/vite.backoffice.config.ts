import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

function ensureSpaEntryHtml(outDir: string, sourceHtmlName: string) {
  return {
    name: "ensure-spa-entry-html",
    writeBundle() {
      const sourcePath = path.resolve(__dirname, outDir, sourceHtmlName);
      const targetPath = path.resolve(__dirname, outDir, "index.html");

      if (!fs.existsSync(sourcePath)) {
        return;
      }

      fs.copyFileSync(sourcePath, targetPath);
    },
  };
}

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
  plugins: [
    react(),
    ensureSpaEntryHtml("dist/backoffice", "index.backoffice.html"),
  ],
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
      input: {
        index: path.resolve(__dirname, "index.backoffice.html"),
      },
    },
  },
});
