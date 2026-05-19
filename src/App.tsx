import { lazy, Suspense } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { BuildingProvider } from "./context/BuildingContext";
import ProtectedRoute from "./components/ProtectedRoute";

const LoginPage = lazy(() => import("./pages/loginpage"));
const HomePage = lazy(() => import("./pages/homepage"));
const UserPage = lazy(() => import("./pages/userpage"));
const InventoryPage = lazy(() => import("./pages/inventorypage"));
const UsersPage = lazy(() => import("./pages/userspage"));
const AirHandlersPage = lazy(() => import("./pages/airhandlers"));
const AirHandlerDetailPage = lazy(() => import("./pages/airhandlerdetail"));
const ReportingPage = lazy(() => import("./pages/ReportingPage"));
const BuildingsPage = lazy(() => import("./pages/BuildingsPage"));
const AreasPage = lazy(() => import("./pages/AreasPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ReportBuilderPage = lazy(() => import("./pages/ReportBuilderPage"));

function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "var(--text-secondary)" }}>
      Loading...
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BuildingProvider>
          <Router>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
                <Route path="/usermanagement" element={<ProtectedRoute><UserPage /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
                <Route path="/airhandlers" element={<ProtectedRoute><AirHandlersPage /></ProtectedRoute>} />
                <Route path="/airhandlers/:guid" element={<ProtectedRoute><AirHandlerDetailPage /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><ReportingPage /></ProtectedRoute>} />
                <Route path="/buildings" element={<ProtectedRoute requireRole="SuperAdmin"><BuildingsPage /></ProtectedRoute>} />
                <Route path="/areas" element={<ProtectedRoute><AreasPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/report-builder" element={<ProtectedRoute><ReportBuilderPage /></ProtectedRoute>} />
              </Routes>
            </Suspense>
          </Router>
        </BuildingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
