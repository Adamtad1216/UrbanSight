import { UserRole } from "@/types/auth";

export const roleDashboardPath: Record<UserRole, string> = {
  citizen: "/citizen/dashboard",
  director: "/director/dashboard",
  coordinator: "/coordinator/dashboard",
  surveyor: "/surveyor/dashboard",
  technician: "/technician/dashboard",
  meter_reader: "/meter-reader/dashboard",
  finance: "/finance/dashboard",
  admin: "/admin/dashboard",
};

export function getDashboardPathByRole(role?: UserRole | null) {
  if (!role) {
    return "/";
  }

  return roleDashboardPath[role] || "/";
}
