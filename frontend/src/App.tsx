import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import { AboutPlatform, TechnologyPage, HowItWorksPage } from "@/pages/PublicPages";
import { LoginPage, RegisterPage, ForgotPasswordPage } from "@/pages/AuthPages";
import AppLayout from "@/components/layout/AppLayout";
import { AccessRestricted, ProtectedRoute, RoleBasedRoute } from "@/components/routing/Guards";
import { DashboardPage, GISMonitoringPage, EnvironmentalMonitoringPage, AnalyticsPage } from "@/pages/DashboardPages";
import {
  AlertsPage, DigitalTwinPage, ProfilePage, ReportsPage, RiskAssessmentPage,
  SensorManagementPage, SettingsPage, UserManagementPage,
} from "@/pages/OpsPages";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutPlatform />} />
        <Route path="/technology" element={<TechnologyPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/gis" element={<GISMonitoringPage />} />
          <Route path="/digital-twin" element={<RoleBasedRoute allow={["admin", "gov_officer"]}><DigitalTwinPage /></RoleBasedRoute>} />
          <Route path="/environmental" element={<RoleBasedRoute allow={["admin", "gov_officer", "field_officer"]}><EnvironmentalMonitoringPage /></RoleBasedRoute>} />
          <Route path="/risk" element={<RoleBasedRoute allow={["admin", "gov_officer"]}><RiskAssessmentPage /></RoleBasedRoute>} />
          <Route path="/alerts" element={<RoleBasedRoute allow={["admin", "gov_officer", "field_officer"]}><AlertsPage /></RoleBasedRoute>} />
          <Route path="/analytics" element={<RoleBasedRoute allow={["admin", "gov_officer"]}><AnalyticsPage /></RoleBasedRoute>} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/sensors" element={<RoleBasedRoute allow={["admin"]}><SensorManagementPage /></RoleBasedRoute>} />
          <Route path="/users" element={<RoleBasedRoute allow={["admin"]}><UserManagementPage /></RoleBasedRoute>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/403" element={<AccessRestricted />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* bottom-right: top-right would overlay the notification bell and profile menu in the app header */}
      <Toaster position="bottom-right" richColors />
    </>
  );
}
