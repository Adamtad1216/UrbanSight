import path from "path";
import { fileURLToPath } from "url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);

export default {
  plugins: {
    tailwindcss: {
      config: path.join(currentDir, "tailwind.config.ts"),
    },
    autoprefixer: {},
  },
};
