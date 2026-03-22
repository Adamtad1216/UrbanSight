import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  ListChecks,
  CreditCard,
  Wrench,
  Bell,
  Users,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Droplets,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

const navConfig: Record<
  string,
  { title: string; icon: LucideIcon; path: string }[]
> = {
  citizen: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/citizen/dashboard" },
    {
      title: "New Connection",
      icon: FileText,
      path: "/citizen/new-connection",
    },
    { title: "Report Issue", icon: ListChecks, path: "/citizen/report-issue" },
    { title: "My Requests", icon: FileText, path: "/citizen/my-requests" },
    { title: "Payments", icon: CreditCard, path: "/citizen/payments" },
    { title: "Notifications", icon: Bell, path: "/citizen/notifications" },
    { title: "Profile", icon: User, path: "/citizen/profile" },
    { title: "Settings", icon: Settings, path: "/citizen/settings" },
  ],
  director: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/director/dashboard" },
    { title: "Configuration", icon: Settings, path: "/configuration" },
    { title: "Service Requests", icon: FileText, path: "/requests" },
    { title: "Issue Reports", icon: ListChecks, path: "/issues" },
    { title: "Notifications", icon: Bell, path: "/notifications" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ],
  coordinator: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/coordinator/dashboard",
    },
    { title: "Service Requests", icon: FileText, path: "/requests" },
    { title: "Issue Reports", icon: ListChecks, path: "/issues" },
    { title: "Notifications", icon: Bell, path: "/notifications" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ],
  surveyor: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/surveyor/dashboard" },
    { title: "New Requests", icon: FileText, path: "/requests" },
    { title: "Notifications", icon: Bell, path: "/notifications" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ],
  technician: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/technician/dashboard",
    },
    { title: "New Requests", icon: FileText, path: "/requests" },
    { title: "Issue Reports", icon: ListChecks, path: "/issues" },
    { title: "Notifications", icon: Bell, path: "/notifications" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ],
  meter_reader: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/meter-reader/dashboard",
    },
    {
      title: "New Connections",
      icon: FileText,
      path: "/meter-reader/connections",
    },
    { title: "Issue Reports", icon: ListChecks, path: "/issues" },
    { title: "Notifications", icon: Bell, path: "/notifications" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ],
  finance: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/finance/dashboard" },
    { title: "Service Requests", icon: FileText, path: "/requests" },
    { title: "Issue Reports", icon: ListChecks, path: "/issues" },
    { title: "Payments", icon: CreditCard, path: "/payments" },
    { title: "Notifications", icon: Bell, path: "/notifications" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ],
  admin: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    { title: "Configuration", icon: Settings, path: "/configuration" },
    { title: "Users & Roles", icon: Users, path: "/users" },
    { title: "Tools Management", icon: Wrench, path: "/admin/tools" },
    { title: "Service Requests", icon: FileText, path: "/requests" },
    { title: "Issue Reports", icon: ListChecks, path: "/issues" },
    { title: "Payments", icon: CreditCard, path: "/payments" },
    { title: "Notifications", icon: Bell, path: "/notifications" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ],
};

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const navItems = user ? navConfig[user.role] || [] : [];

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
    "New Requests": "New Requests",
    "New Connections": "New Connections",
    "New Connection": t("nav.newConnection", "New Connection"),
    "Report Issue": t("nav.reportIssue", "Report Issue"),
    Profile: t("common.profile", "Profile"),
    Notifications: t("common.notifications", "Notifications"),
    Settings: t("common.settings", "Settings"),
    "Service Requests": t("nav.serviceRequests", "Service Requests"),
    Inspection: t("nav.inspection", "Inspection"),
    Payments: t("nav.payments", "Payments"),
    Configuration: "Configuration",
    "Tools Management": "Tools Management",
    "Users & Roles": t("nav.usersRoles", "Users & Roles"),
    "Issue Reports": t("nav.issueReports", "Issue Reports"),
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
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={`${item.path}-${item.title}`}
            to={item.path}
            className={({ isActive }) =>
              isActive ? "sidebar-item-active" : "sidebar-item-inactive"
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
