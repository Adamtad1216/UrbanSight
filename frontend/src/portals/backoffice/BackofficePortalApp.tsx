import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleHome } from "@/components/auth/RoleHome";
import { SuccessModalProvider } from "@/context/success-modal-context";
import { GlobalSuccessModal } from "@/components/feedback/GlobalSuccessModal";
import { LanguageProvider } from "@/context/language-context";
import StaffLoginPage from "@/pages/auth/StaffLogin";
import UnauthorizedPage from "@/pages/auth/Unauthorized";
import NotFound from "@/pages/NotFound";
import Index from "../../pages/Index";
import ServiceRequests from "@/pages/ServiceRequests";
import IssueReports from "@/pages/IssueReports";
import Payments from "@/pages/Payments";
import Notifications from "@/pages/Notifications";
import UsersRoles from "@/pages/UsersRoles";
import ToolsManagement from "@/pages/ToolsManagement";
import Settings from "@/pages/Settings";
import Configuration from "@/pages/Configuration";
import LeakagePrediction from "@/pages/LeakagePrediction";

const queryClient = new QueryClient();

const STAFF_ROLES = [
  "director",
  "coordinator",
  "surveyor",
  "technician",
  "meter_reader",
  "finance",
  "admin",
] as const;

function StaffLayoutRoute({
  allowedRoles,
}: {
  allowedRoles: Array<
    | "director"
    | "coordinator"
    | "surveyor"
    | "technician"
    | "meter_reader"
    | "finance"
    | "admin"
  >;
}) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function BackofficePortalApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider portal="backoffice">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SuccessModalProvider>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute allowedRoles={[...STAFF_ROLES]}>
                        <RoleHome />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/login" element={<StaffLoginPage />} />
                  <Route
                    path="/register"
                    element={<Navigate to="/login" replace />}
                  />
                  <Route
                    path="/register/*"
                    element={<Navigate to="/login" replace />}
                  />
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />

                  <Route
                    path="/admin"
                    element={<StaffLayoutRoute allowedRoles={["admin"]} />}
                  >
                    <Route path="dashboard" element={<Index />} />
                  </Route>
                  <Route
                    path="/director"
                    element={<StaffLayoutRoute allowedRoles={["director"]} />}
                  >
                    <Route path="dashboard" element={<Index />} />
                  </Route>
                  <Route
                    path="/coordinator"
                    element={
                      <StaffLayoutRoute allowedRoles={["coordinator"]} />
                    }
                  >
                    <Route path="dashboard" element={<Index />} />
                  </Route>
                  <Route
                    path="/surveyor"
                    element={<StaffLayoutRoute allowedRoles={["surveyor"]} />}
                  >
                    <Route path="dashboard" element={<Index />} />
                  </Route>
                  <Route
                    path="/technician"
                    element={<StaffLayoutRoute allowedRoles={["technician"]} />}
                  >
                    <Route path="dashboard" element={<Index />} />
                  </Route>
                  <Route
                    path="/meter-reader"
                    element={
                      <StaffLayoutRoute allowedRoles={["meter_reader"]} />
                    }
                  >
                    <Route path="dashboard" element={<ServiceRequests />} />
                  </Route>
                  <Route
                    path="/finance"
                    element={<StaffLayoutRoute allowedRoles={["finance"]} />}
                  >
                    <Route path="dashboard" element={<Index />} />
                  </Route>

                  <Route
                    element={
                      <StaffLayoutRoute allowedRoles={[...STAFF_ROLES]} />
                    }
                  >
                    <Route path="/requests" element={<ServiceRequests />} />
                    <Route path="/issues" element={<IssueReports />} />
                    <Route
                      path="/inspection/:id"
                      element={<ServiceRequests />}
                    />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>

                  <Route
                    element={
                      <StaffLayoutRoute allowedRoles={["admin", "director"]} />
                    }
                  >
                    <Route path="/configuration" element={<Configuration />} />
                  </Route>

                  <Route
                    element={
                      <StaffLayoutRoute
                        allowedRoles={["admin", "director", "coordinator"]}
                      />
                    }
                  >
                    <Route path="/leakage" element={<LeakagePrediction />} />
                  </Route>

                  <Route
                    element={
                      <StaffLayoutRoute allowedRoles={["finance", "admin"]} />
                    }
                  >
                    <Route
                      path="/payment-verification/:id"
                      element={<Payments />}
                    />
                    <Route path="/payments" element={<Payments />} />
                  </Route>

                  <Route
                    element={<StaffLayoutRoute allowedRoles={["admin"]} />}
                  >
                    <Route path="/users" element={<UsersRoles />} />
                    <Route path="/admin/tools" element={<ToolsManagement />} />
                  </Route>

                  <Route
                    path="/dashboard"
                    element={<Navigate to="/" replace />}
                  />
                  <Route
                    path="/user-management"
                    element={<Navigate to="/users" replace />}
                  />

                  <Route path="*" element={<NotFound />} />
                </Routes>
                <GlobalSuccessModal />
              </SuccessModalProvider>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
