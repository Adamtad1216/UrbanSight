import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.urbansight.app",
  appName: "UrbanSight",
  webDir: "frontend/dist-mobile",
  server: {
    androidScheme: "https",
  },
};

export default config;

