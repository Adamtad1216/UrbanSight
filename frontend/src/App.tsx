import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AuthProvider } from "@/context/AuthContext";
import { SuccessModalProvider } from "@/context/success-modal-context";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleHome } from "@/components/auth/RoleHome";
import { GlobalSuccessModal } from "@/components/feedback/GlobalSuccessModal";
import { LanguageProvider } from "@/context/language-context";
import Index from "./pages/Index";
import ServiceRequests from "./pages/ServiceRequests";
import Workflow from "./pages/Workflow";
import MapMonitoring from "./pages/MapMonitoring";
import LeakagePrediction from "./pages/LeakagePrediction";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import UsersRoles from "./pages/UsersRoles";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/Login";
import RegisterPage from "./pages/auth/Register";
import UnauthorizedPage from "./pages/auth/Unauthorized";
import CitizenNewConnectionPage from "./pages/citizen/NewConnection";
import CitizenMyRequestsPage from "./pages/citizen/MyRequests";
import CitizenRequestDetailsPage from "./pages/citizen/RequestDetails";
import CitizenPaymentPage from "./pages/citizen/Payment";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SuccessModalProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <RoleHome />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/index"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Index />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/citizen/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["citizen"]}>
                      <DashboardLayout>
                        <CitizenMyRequestsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/director/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["director"]}>
                      <DashboardLayout>
                        <Index />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["coordinator"]}>
                      <DashboardLayout>
                        <Index />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/surveyor/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["surveyor"]}>
                      <DashboardLayout>
                        <Index />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/technician/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["technician"]}>
                      <DashboardLayout>
                        <Index />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/finance/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["finance"]}>
                      <DashboardLayout>
                        <Index />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <DashboardLayout>
                        <Index />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/requests"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        "director",
                        "coordinator",
                        "surveyor",
                        "technician",
                        "finance",
                        "admin",
                      ]}
                    >
                      <DashboardLayout>
                        <ServiceRequests />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/workflow"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        "director",
                        "coordinator",
                        "surveyor",
                        "technician",
                        "admin",
                      ]}
                    >
                      <DashboardLayout>
                        <Workflow />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/map"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        "coordinator",
                        "surveyor",
                        "technician",
                        "admin",
                      ]}
                    >
                      <DashboardLayout>
                        <MapMonitoring />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leakage"
                  element={
                    <ProtectedRoute
                      allowedRoles={["admin", "director", "coordinator"]}
                    >
                      <DashboardLayout>
                        <LeakagePrediction />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payments"
                  element={
                    <ProtectedRoute allowedRoles={["finance", "admin"]}>
                      <DashboardLayout>
                        <Payments />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute
                      allowedRoles={["director", "finance", "admin"]}
                    >
                      <DashboardLayout>
                        <Reports />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Notifications />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <DashboardLayout>
                        <UsersRoles />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Settings />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/citizen/new-connection"
                  element={
                    <ProtectedRoute allowedRoles={["citizen"]}>
                      <DashboardLayout>
                        <CitizenNewConnectionPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/citizen/my-requests"
                  element={
                    <ProtectedRoute allowedRoles={["citizen"]}>
                      <DashboardLayout>
                        <CitizenMyRequestsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/citizen/requests/:id"
                  element={
                    <ProtectedRoute allowedRoles={["citizen"]}>
                      <DashboardLayout>
                        <CitizenRequestDetailsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/citizen/payment/:requestId"
                  element={
                    <ProtectedRoute allowedRoles={["citizen"]}>
                      <DashboardLayout>
                        <CitizenPaymentPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
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

export default App;
