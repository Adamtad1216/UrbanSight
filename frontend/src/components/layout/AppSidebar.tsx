import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Droplets,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { getNavItemsForRole } from "@/components/layout/nav-config";

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const location = useLocation();

  const navItems = getNavItemsForRole(user?.role);

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: t("common.signedOut", "Signed out") });
    } catch (error) {
      toast({
        title: t("common.logoutFailed", "Logout failed"),
        description:
          error instanceof Error
            ? error.message
            : t("common.tryAgain", "Try again"),
        variant: "destructive",
      });
    }
  };

  const navLabelMap: Record<string, string> = {
    Dashboard: t("nav.dashboard", "Dashboard"),
    "My Requests": t("nav.myRequests", "My Requests"),
    "New Connection": t("nav.newConnection", "New Connection"),
    "Report Issue": t("nav.reportIssue", "Report Issue"),
    Profile: t("common.profile", "Profile"),
    Notifications: t("common.notifications", "Notifications"),
    Settings: t("common.settings", "Settings"),
    "Service Requests": t("nav.serviceRequests", "Service Requests"),
    "Inspection Requests": t("nav.inspection", "Inspection"),
    "Completed Requests": t("status.completed", "Completed"),
    Predictions: "Predictions",
    Inspection: t("nav.inspection", "Inspection"),
    Payments: t("nav.payments", "Payments"),
    Configuration: "Configuration",
    "Tools Management": "Tools Management",
    "Users & Roles": t("nav.usersRoles", "Users & Roles"),
    "Issue Reports": t("nav.issueReports", "Issue Reports"),
    General: t("nav.general", "General"),
    Services: t("nav.services", "Services"),
    Tracking: t("nav.tracking", "Tracking"),
    Account: t("nav.account", "Account"),
    Management: t("nav.management", "Management"),
    System: t("nav.system", "System"),
    Operations: t("nav.operations", "Operations"),
    "Field Work": t("nav.fieldWork", "Field Work"),
    Readings: t("nav.readings", "Readings"),
    Finance: t("nav.finance", "Finance"),
    Administration: t("nav.administration", "Administration"),
  };

  const normalizeTargetPath = (path: string) => {
    const [pathname, search = ""] = path.split("?");
    return {
      pathname: pathname || "/",
      search: search ? `?${search}` : "",
    };
  };

  const isExactNavItemActive = (path: string) => {
    const target = normalizeTargetPath(path);
    return (
      location.pathname === target.pathname && location.search === target.search
    );
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed top-0 left-0 h-screen z-40 bg-sidebar border-r border-sidebar-border flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Droplets className="h-5 w-5 text-primary-foreground" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="text-lg font-bold text-sidebar-accent-foreground tracking-tight">
                UrbanSight
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto scrollbar-thin">
        {navItems.map((group) => (
          <div key={group.label} className="space-y-2">
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.h3
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider"
                >
                  {navLabelMap[group.label] || group.label}
                </motion.h3>
              )}
            </AnimatePresence>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={`${item.path}-${item.title}`}
                  to={item.path}
                  onClick={onNavigate}
                  className={
                    isExactNavItemActive(item.path)
                      ? "sidebar-item-active"
                      : "sidebar-item-inactive"
                  }
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {navLabelMap[item.title] || item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="sidebar-item-inactive w-full mb-2"
        >
          <LogOut className="h-5 w-5" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                {t("common.logout", "Log out")}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-item-inactive w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                {t("nav.collapse", "Collapse")}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
