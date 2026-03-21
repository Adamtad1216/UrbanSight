import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

const roleHomePath: Record<string, string> = {
  citizen: "/citizen/dashboard",
  director: "/director/dashboard",
  coordinator: "/coordinator/dashboard",
  surveyor: "/surveyor/dashboard",
  technician: "/technician/dashboard",
  meter_reader: "/meter-reader/dashboard",
  finance: "/finance/dashboard",
  admin: "/admin/dashboard",
};

export function RoleHome() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={roleHomePath[user.role] || "/"} replace />;
}
