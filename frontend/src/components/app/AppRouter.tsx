import { BrowserRouter, HashRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

interface AppRouterProps {
  children: React.ReactNode;
}

export function AppRouter({ children }: AppRouterProps) {
  if (Capacitor.isNativePlatform()) {
    return <HashRouter>{children}</HashRouter>;
  }

  return <BrowserRouter>{children}</BrowserRouter>;
}
