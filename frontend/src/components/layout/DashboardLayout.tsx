import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { MaintenanceScreen } from "@/components/layout/MaintenanceScreen";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await apiRequest<{
          settings: { maintenanceMode: boolean };
        }>("/system/status");

        setMaintenanceMode(Boolean(response.settings?.maintenanceMode));
      } catch {
        // Keep UI resilient if status endpoint is temporarily unavailable.
      }
    };

    loadStatus();

    const interval = window.setInterval(loadStatus, 30000);
    return () => window.clearInterval(interval);
  }, []);

  if (maintenanceMode && user?.role !== "admin") {
    return <MaintenanceScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/50 z-30 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <div className="lg:hidden z-50 fixed top-0 left-0">
              <AppSidebar />
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="lg:pl-[260px] transition-all duration-300">
        <TopBar onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="p-4 lg:p-6 max-w-[1600px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
