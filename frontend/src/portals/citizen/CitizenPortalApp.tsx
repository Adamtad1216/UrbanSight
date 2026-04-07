import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SuccessModalProvider } from "@/context/success-modal-context";
import { GlobalSuccessModal } from "@/components/feedback/GlobalSuccessModal";
import { LanguageProvider } from "@/context/language-context";
import { AppRouter } from "@/components/app/AppRouter";
import { NativeAppBridge } from "@/components/app/NativeAppBridge";
import LoginPage from "@/pages/auth/Login";
import RegisterPage from "@/pages/auth/Register";
import UnauthorizedPage from "@/pages/auth/Unauthorized";
import NotFound from "@/pages/NotFound";
import CitizenDashboardPage from "@/pages/citizen/Dashboard";
import CitizenLandingPage from "@/pages/citizen/Landing";
import CitizenNewConnectionPage from "@/pages/citizen/NewConnection";
import CitizenMyRequestsPage from "@/pages/citizen/MyRequests";
import CitizenRequestDetailsPage from "@/pages/citizen/RequestDetails";
import CitizenPaymentPage from "@/pages/citizen/Payment";
import CitizenPaymentsPage from "@/pages/citizen/Payments";
import CitizenProfilePage from "@/pages/citizen/Profile";
import CitizenReportIssuePage from "@/pages/citizen/ReportIssue";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient();

function CitizenLayoutRoute() {
  return (
    <ProtectedRoute allowedRoles={["citizen"]}>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function CitizenPortalApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider portal="citizen">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRouter>
              <NativeAppBridge />
              <SuccessModalProvider>
                <Routes>
                  <Route path="/" element={<CitizenLandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />

                  <Route path="/citizen" element={<CitizenLayoutRoute />}>
                    <Route
                      path="dashboard"
                      element={<CitizenDashboardPage />}
                    />
                    <Route
                      path="new-connection"
                      element={<CitizenNewConnectionPage />}
                    />
                    <Route
                      path="report-issue"
                      element={<CitizenReportIssuePage />}
                    />
                    <Route
                      path="my-requests"
                      element={<CitizenMyRequestsPage />}
                    />
                    <Route
                      path="my-requests/:id"
                      element={<CitizenRequestDetailsPage />}
                    />
                    <Route
                      path="requests/:id"
                      element={<CitizenRequestDetailsPage />}
                    />
                    <Route
                      path="payment/:id"
                      element={<CitizenPaymentPage />}
                    />
                    <Route path="payments" element={<CitizenPaymentsPage />} />
                    <Route path="profile" element={<CitizenProfilePage />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  <Route
                    path="/dashboard"
                    element={<Navigate to="/citizen/dashboard" replace />}
                  />
                  <Route
                    path="/new-connection"
                    element={<Navigate to="/citizen/new-connection" replace />}
                  />
                  <Route
                    path="/report-issue"
                    element={<Navigate to="/citizen/report-issue" replace />}
                  />
                  <Route
                    path="/my-requests"
                    element={<Navigate to="/citizen/my-requests" replace />}
                  />
                  <Route
                    path="/payments"
                    element={<Navigate to="/citizen/payments" replace />}
                  />
                  <Route
                    path="/profile"
                    element={<Navigate to="/citizen/profile" replace />}
                  />
                  <Route
                    path="/notifications"
                    element={<Navigate to="/citizen/notifications" replace />}
                  />
                  <Route
                    path="/settings"
                    element={<Navigate to="/citizen/settings" replace />}
                  />

                  <Route path="*" element={<NotFound />} />
                </Routes>
                <GlobalSuccessModal />
              </SuccessModalProvider>
            </AppRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
