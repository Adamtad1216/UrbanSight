import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

function renamePortalEntryToIndexHtml(outDir: string, sourceHtmlName: string) {
  return {
    name: "rename-portal-entry-to-index-html",
    writeBundle() {
      const sourcePath = path.resolve(__dirname, outDir, sourceHtmlName);
      const targetPath = path.resolve(__dirname, outDir, "index.html");

      if (!fs.existsSync(sourcePath)) {
        return;
      }

      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }

      fs.renameSync(sourcePath, targetPath);
    },
  };
}

export default defineConfig({
  root: __dirname,
  base: "/",
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
  plugins: [
    react(),
    renamePortalEntryToIndexHtml("dist/citizen", "index.citizen.html"),
  ],
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
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index.citizen.html"),
    },
  },
});
