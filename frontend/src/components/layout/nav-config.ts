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

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navConfig: Record<string, NavGroup[]> = {
  citizen: [
    {
      label: "General",
      items: [
        {
          title: "Dashboard",
          icon: LayoutDashboard,
          path: "/citizen/dashboard",
        },
      ],
    },
    {
      label: "Services",
      items: [
        {
          title: "New Connection",
          icon: FileText,
          path: "/citizen/new-connection",
        },
        {
          title: "Report Issue",
          icon: ListChecks,
          path: "/citizen/report-issue",
        },
      ],
    },
    {
      label: "Tracking",
      items: [
        { title: "My Requests", icon: FileText, path: "/citizen/my-requests" },
        { title: "Payments", icon: CreditCard, path: "/citizen/payments" },
      ],
    },
    {
      label: "Account",
      items: [
        { title: "Notifications", icon: Bell, path: "/citizen/notifications" },
        { title: "Profile", icon: User, path: "/citizen/profile" },
        { title: "Settings", icon: Settings, path: "/citizen/settings" },
      ],
    },
  ],
  director: [
    {
      label: "Management",
      items: [
        {
          title: "Dashboard",
          icon: LayoutDashboard,
          path: "/director/dashboard",
        },
        { title: "Configuration", icon: Settings, path: "/configuration" },
        { title: "Service Requests", icon: FileText, path: "/requests" },
        {
          title: "Inspection Requests",
          icon: ListChecks,
          path: "/requests?status=inspection",
        },
        { title: "Predictions", icon: Droplets, path: "/leakage" },
        { title: "Issue Reports", icon: ListChecks, path: "/issues" },
      ],
    },
    {
      label: "System",
      items: [
        { title: "Notifications", icon: Bell, path: "/notifications" },
        { title: "Settings", icon: Settings, path: "/settings" },
      ],
    },
  ],
  coordinator: [
    {
      label: "Operations",
      items: [
        {
          title: "Dashboard",
          icon: LayoutDashboard,
          path: "/coordinator/dashboard",
        },
        { title: "Service Requests", icon: FileText, path: "/requests" },
        {
          title: "Branch Staff",
          icon: Users,
          path: "/coordinator/branch-staff",
        },
        {
          title: "Inspection Requests",
          icon: ListChecks,
          path: "/requests?status=inspection",
        },
        { title: "Predictions", icon: Droplets, path: "/leakage" },
        { title: "Issue Reports", icon: ListChecks, path: "/issues" },
      ],
    },
    {
      label: "System",
      items: [
        { title: "Notifications", icon: Bell, path: "/notifications" },
        { title: "Settings", icon: Settings, path: "/settings" },
      ],
    },
  ],
  surveyor: [
    {
      label: "Field Work",
      items: [
        {
          title: "Dashboard",
          icon: LayoutDashboard,
          path: "/surveyor/dashboard",
        },
        { title: "Service Requests", icon: FileText, path: "/requests" },
        {
          title: "Inspection Requests",
          icon: ListChecks,
          path: "/requests?status=inspection",
        },
      ],
    },
    {
      label: "System",
      items: [
        { title: "Notifications", icon: Bell, path: "/notifications" },
        { title: "Settings", icon: Settings, path: "/settings" },
      ],
    },
  ],
  technician: [
    {
      label: "Operations",
      items: [
        {
          title: "Dashboard",
          icon: LayoutDashboard,
          path: "/technician/dashboard",
        },
        { title: "Service Requests", icon: FileText, path: "/requests" },
        {
          title: "Inspection Requests",
          icon: ListChecks,
          path: "/requests?status=inspection",
        },
        { title: "Issue Reports", icon: FileText, path: "/issues" },
      ],
    },
    {
      label: "System",
      items: [
        { title: "Notifications", icon: Bell, path: "/notifications" },
        { title: "Settings", icon: Settings, path: "/settings" },
      ],
    },
  ],
  meter_reader: [
    {
      label: "Readings",
      items: [
        {
          title: "Dashboard",
          icon: LayoutDashboard,
          path: "/meter-reader/dashboard",
        },
        { title: "Service Requests", icon: FileText, path: "/requests" },
        {
          title: "Inspection Requests",
          icon: ListChecks,
          path: "/requests?status=inspection",
        },
      ],
    },
    {
      label: "System",
      items: [
        { title: "Notifications", icon: Bell, path: "/notifications" },
        { title: "Settings", icon: Settings, path: "/settings" },
      ],
    },
  ],
  finance: [
    {
      label: "Finance",
      items: [
        {
          title: "Dashboard",
          icon: LayoutDashboard,
          path: "/finance/dashboard",
        },
        { title: "Service Requests", icon: FileText, path: "/requests" },
        {
          title: "Inspection Requests",
          icon: ListChecks,
          path: "/requests?status=inspection",
        },
        { title: "Issue Reports", icon: ListChecks, path: "/issues" },
        { title: "Payments", icon: CreditCard, path: "/payments" },
      ],
    },
    {
      label: "System",
      items: [
        { title: "Notifications", icon: Bell, path: "/notifications" },
        { title: "Settings", icon: Settings, path: "/settings" },
      ],
    },
  ],
  admin: [
    {
      label: "Administration",
      items: [
        { title: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
        { title: "Configuration", icon: Settings, path: "/configuration" },
        { title: "Users & Roles", icon: Users, path: "/users" },
        { title: "Tools Management", icon: Wrench, path: "/admin/tools" },
      ],
    },
    {
      label: "Operations",
      items: [
        { title: "Service Requests", icon: FileText, path: "/requests" },
        {
          title: "Inspection Requests",
          icon: ListChecks,
          path: "/requests?status=inspection",
        },
        { title: "Predictions", icon: Droplets, path: "/leakage" },
        { title: "Issue Reports", icon: ListChecks, path: "/issues" },
        { title: "Payments", icon: CreditCard, path: "/payments" },
      ],
    },
    {
      label: "System",
      items: [
        { title: "Notifications", icon: Bell, path: "/notifications" },
        { title: "Settings", icon: Settings, path: "/settings" },
      ],
    },
  ],
};

export function getNavItemsForRole(role?: string | null): NavGroup[] {
  if (!role) {
    return [];
  }

  return navConfig[role] || [];
}
