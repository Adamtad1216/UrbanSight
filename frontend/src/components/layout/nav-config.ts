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
  Droplets,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  icon: LucideIcon;
  path: string;
}

export const navConfig: Record<string, NavItem[]> = {
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
    { title: "Predictions", icon: Droplets, path: "/leakage" },
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
    { title: "Predictions", icon: Droplets, path: "/leakage" },
    { title: "Issue Reports", icon: ListChecks, path: "/issues" },
    { title: "Notifications", icon: Bell, path: "/notifications" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ],
  surveyor: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/surveyor/dashboard" },
    { title: "Service Requests", icon: FileText, path: "/requests" },
    { title: "Inspection", icon: ListChecks, path: "/requests" },
    { title: "Notifications", icon: Bell, path: "/notifications" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ],
  technician: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/technician/dashboard",
    },
    { title: "Service Requests", icon: FileText, path: "/requests" },
    { title: "Inspection", icon: ListChecks, path: "/requests" },
    { title: "Issue Reports", icon: FileText, path: "/issues" },
    { title: "Notifications", icon: Bell, path: "/notifications" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ],
  meter_reader: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/meter-reader/dashboard",
    },
    { title: "Service Requests", icon: FileText, path: "/requests" },
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
    { title: "Predictions", icon: Droplets, path: "/leakage" },
    { title: "Issue Reports", icon: ListChecks, path: "/issues" },
    { title: "Payments", icon: CreditCard, path: "/payments" },
    { title: "Notifications", icon: Bell, path: "/notifications" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ],
};

export function getNavItemsForRole(role?: string | null): NavItem[] {
  if (!role) {
    return [];
  }

  return navConfig[role] || [];
}
